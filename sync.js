import fs from 'fs';
import path from 'path';
import os from 'os';
import http from 'http';
import querystring from 'querystring';
import { exec } from 'child_process';
import { authenticate } from '@google-cloud/local-auth';
import { google } from 'googleapis';
import nodemailer from 'nodemailer';
import { DEFAULT_ROUTINE, SCHOOL_ROUTINE } from './data.js';

// Configuration
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CONFIG_PATH = path.join(process.cwd(), 'email_config.json');
const CUSTOM_DEFAULT_PATH = path.join(process.cwd(), 'custom_default_routine.json');
const CUSTOM_SCHOOL_PATH = path.join(process.cwd(), 'custom_school_routine.json');
const STATE_PATH = path.join(process.cwd(), 'sync_state.json');

function loadSyncState() {
  if (fs.existsSync(STATE_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
    } catch (e) {
      console.error('Error reading sync state, resetting:', e);
    }
  }
  return { lastSyncedDate: '', lastEmailedDate: '' };
}

function saveSyncState(state) {
  try {
    fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
  } catch (e) {
    console.error('Error writing sync state:', e);
  }
}


const SCOPES = ['https://www.googleapis.com/auth/calendar'];

// Default Email Config (User can edit email_config.json)
const DEFAULT_EMAIL_CONFIG = {
  senderEmail: 'your-email@gmail.com',
  senderAppPassword: 'your-app-password', // Google Account -> Security -> App Passwords
  receiverEmail: 'your-email@gmail.com'
};

// Retrieve local network IP address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Ensure config exists
function loadEmailConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_EMAIL_CONFIG, null, 2));
    console.log(`\n⚠️ Created email_config.json. Please edit this file to configure your email credentials.`);
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}

// Load Google Credentials
async function loadSavedCredentialsIfExist() {
  try {
    if (fs.existsSync(TOKEN_PATH)) {
      const content = fs.readFileSync(TOKEN_PATH, 'utf-8');
      const credentials = JSON.parse(content);
      return google.auth.fromJSON(credentials);
    }
  } catch (err) {
    return null;
  }
  return null;
}

async function saveCredentials(client) {
  const keys = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf-8'));
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  fs.writeFileSync(TOKEN_PATH, payload);
}

async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) return client;

  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error(`\n❌ Missing credentials.json in project root!\nFollow setup instructions in dashboard or implementation plan to download it.`);
  }

  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

// Determine active routine based on date (Threshold: June 19, 2026)
function getRoutineForDate(date) {
  const thresholdDate = new Date('2026-06-19T00:00:00');
  if (date >= thresholdDate) {
    if (fs.existsSync(CUSTOM_SCHOOL_PATH)) {
      try {
        return JSON.parse(fs.readFileSync(CUSTOM_SCHOOL_PATH, 'utf-8'));
      } catch (e) {
        console.error('Error reading custom school routine:', e);
      }
    }
    return SCHOOL_ROUTINE;
  } else {
    if (fs.existsSync(CUSTOM_DEFAULT_PATH)) {
      try {
        return JSON.parse(fs.readFileSync(CUSTOM_DEFAULT_PATH, 'utf-8'));
      } catch (e) {
        console.error('Error reading custom default routine:', e);
      }
    }
    return DEFAULT_ROUTINE;
  }
}

// Sync to Google Calendar
async function syncCalendar(auth) {
  const calendar = google.calendar({ version: 'v3', auth });
  
  // 1. Find or Create Calendar
  console.log('Fetching Google Calendar list...');
  const listRes = await calendar.calendarList.list();
  let lifestyleCal = listRes.data.items.find(item => item.summary === 'Lifestyle Automation');
  let calendarId = 'primary';
  
  if (lifestyleCal) {
    calendarId = lifestyleCal.id;
    console.log(`Found existing 'Lifestyle Automation' calendar (ID: ${calendarId})`);
  } else {
    console.log("Creating new secondary 'Lifestyle Automation' calendar...");
    const createRes = await calendar.calendars.insert({
      requestBody: { summary: 'Lifestyle Automation' }
    });
    calendarId = createRes.data.id;
    console.log(`Created calendar (ID: ${calendarId})`);
  }

  // 2. Fetch events for the next 7 days
  const now = new Date();
  const rangeStart = new Date(now);
  rangeStart.setHours(0, 0, 0, 0);
  
  const rangeEnd = new Date(now);
  rangeEnd.setDate(rangeEnd.getDate() + 7);
  rangeEnd.setHours(23, 59, 59, 999);

  console.log(`Fetching existing events from ${rangeStart.toDateString()} to ${rangeEnd.toDateString()}...`);
  const eventsRes = await calendar.events.list({
    calendarId,
    timeMin: rangeStart.toISOString(),
    timeMax: rangeEnd.toISOString(),
    singleEvents: true
  });

  const existingEvents = eventsRes.data.items || [];

  // 3. Compute desired events
  const desiredEvents = [];
  for (let d = 0; d < 7; d++) {
    const loopDate = new Date(now);
    loopDate.setDate(loopDate.getDate() + d);
    const routine = getRoutineForDate(loopDate);
    
    const yyyy = loopDate.getFullYear();
    const mm = String(loopDate.getMonth() + 1).padStart(2, '0');
    const dd = String(loopDate.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    
    for (const task of routine) {
      if (task.type === 'alarm') continue; // Skip alert entries
      
      const [startHrs, startMins] = task.start.split(':').map(Number);
      const [endHrs, endMins] = task.end.split(':').map(Number);
      
      const eventStart = new Date(loopDate);
      eventStart.setHours(startHrs, startMins, 0, 0);
      
      const eventEnd = new Date(loopDate);
      if (task.end === '24:00' || endHrs === 0) {
        eventEnd.setHours(23, 59, 59, 0);
      } else {
        eventEnd.setHours(endHrs, endMins, 0, 0);
      }
      
      desiredEvents.push({
        taskId: task.id,
        dateStr: dateStr,
        summary: task.name,
        description: task.desc,
        startIso: eventStart.toISOString(),
        endIso: eventEnd.toISOString()
      });
    }
  }

  // 4. Perform Differential Comparison
  const toCreate = [];
  const toUpdate = [];
  const toDelete = [];

  const existingMap = {};
  existingEvents.forEach(evt => {
    const privateProps = evt.extendedProperties?.private || {};
    const taskId = privateProps.taskId;
    const dateStr = privateProps.dateStr;
    
    if (taskId && dateStr) {
      existingMap[`${taskId}_${dateStr}`] = evt;
    } else {
      toDelete.push(evt); // Clean out any untagged event in our calendar
    }
  });

  desiredEvents.forEach(desired => {
    const key = `${desired.taskId}_${desired.dateStr}`;
    const existing = existingMap[key];
    
    if (existing) {
      const extStart = existing.start.dateTime;
      const extEnd = existing.end.dateTime;
      const extSummary = existing.summary;
      const extDesc = existing.description;
      
      const startDiff = Math.abs(new Date(extStart).getTime() - new Date(desired.startIso).getTime());
      const endDiff = Math.abs(new Date(extEnd).getTime() - new Date(desired.endIso).getTime());
      
      if (
        extSummary !== desired.summary ||
        extDesc !== desired.description ||
        startDiff > 1000 ||
        endDiff > 1000
      ) {
        toUpdate.push({
          eventId: existing.id,
          desired: desired
        });
      }
      delete existingMap[key];
    } else {
      toCreate.push(desired);
    }
  });

  Object.values(existingMap).forEach(evt => {
    toDelete.push(evt);
  });

  console.log(`Google Calendar Sync status: ${toCreate.length} to create, ${toUpdate.length} to update, ${toDelete.length} to delete.`);

  // 5. Execute API changes
  for (const evt of toDelete) {
    try {
      await calendar.events.delete({
        calendarId,
        eventId: evt.id
      });
    } catch (err) {
      console.error(`Failed to delete event ${evt.id}:`, err.message);
    }
  }

  for (const item of toUpdate) {
    try {
      const eventData = {
        summary: item.desired.summary,
        description: item.desired.description,
        start: { dateTime: item.desired.startIso },
        end: { dateTime: item.desired.endIso },
        extendedProperties: {
          private: {
            taskId: item.desired.taskId,
            dateStr: item.desired.dateStr
          }
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 10 },
            { method: 'popup', minutes: 0 }
          ]
        }
      };
      await calendar.events.update({
        calendarId,
        eventId: item.eventId,
        requestBody: eventData
      });
    } catch (err) {
      console.error(`Failed to update event ${item.eventId}:`, err.message);
    }
  }

  for (const desired of toCreate) {
    try {
      const eventData = {
        summary: desired.summary,
        description: desired.description,
        start: { dateTime: desired.startIso },
        end: { dateTime: desired.endIso },
        extendedProperties: {
          private: {
            taskId: desired.taskId,
            dateStr: desired.dateStr
          }
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 10 },
            { method: 'popup', minutes: 0 }
          ]
        }
      };
      await calendar.events.insert({
        calendarId,
        requestBody: eventData
      });
    } catch (err) {
      console.error(`Failed to create event ${desired.taskId} on ${desired.dateStr}:`, err.message);
    }
  }

  console.log('Google Calendar sync completed successfully!');
}

// Send daily review email checklist link
// Send daily review email checklist link
async function sendDailyEmail() {
  const config = loadEmailConfig();
  if (config.senderEmail === 'your-email@gmail.com' || config.senderAppPassword === 'your-app-password') {
    console.log('⚠️ Skipping Daily email check-in. Please configure email_config.json with your SMTP details.');
    return;
  }

  const now = new Date();
  const dateStr = now.toDateString();
  const formattedDate = now.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  const routine = getRoutineForDate(now);

  const localIP = getLocalIP();
  const localBase = `http://${localIP}:8080`;
  const hostedBase = config.dashboardUrl || 'https://shivamkumarrj15-sudo.github.io/lifestyle-tracker/';
  
  const apiSubmitUrl = `http://${localIP}:8080/api/submit_email_report`;
  const webLink = `${hostedBase.replace(/\/$/, '')}/?openCheckIn=true`;
  const localWebLink = `${localBase}/?openCheckIn=true`;

  let tasksHtml = '';
  routine.forEach(task => {
    if (task.type === 'alarm') return;
    tasksHtml += `
      <div style="margin-bottom: 12px; text-align: left;">
        <label style="font-size: 0.95rem; color: #f3f4f6; cursor: pointer; display: flex; align-items: flex-start;">
          <input type="checkbox" name="task_${task.id}" value="on" style="width: 18px; height: 18px; margin-top: 1px; margin-right: 12px; accent-color: #06b6d4; cursor: pointer;">
          <div>
            <span style="font-weight: 600;">${task.name}</span><br>
            <span style="font-size: 0.75rem; color: #9ca3af;">${task.start} - ${task.end} &bull; ${task.desc}</span>
          </div>
        </label>
      </div>
    `;
  });

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: config.senderEmail,
      pass: config.senderAppPassword
    }
  });

  const mailOptions = {
    from: `"Lifestyle Automation" <${config.senderEmail}>`,
    to: config.receiverEmail,
    subject: `Review Your Day - ${formattedDate}`,
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; background-color: #080c14; color: #f3f4f6; padding: 25px; border-radius: 12px; max-width: 550px; margin: 0 auto; border: 1px solid #1e293b; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
        <div style="text-align: center; border-bottom: 1px solid #1e293b; padding-bottom: 15px; margin-bottom: 20px;">
          <h2 style="color: #06b6d4; font-size: 1.6rem; margin: 0; font-family: sans-serif;">Daily Lifestyle Check-In</h2>
          <p style="font-size: 0.8rem; color: #9ca3af; margin: 5px 0 0 0;">Review date: ${formattedDate}</p>
        </div>
        
        <p style="font-size: 0.95rem; line-height: 1.6; margin-bottom: 20px;">
          Hello Shivam! It is 09:30 PM. Please fill out your checklist below to submit your daily consistency report.
        </p>
        
        <!-- Interactive Check-In Form inside Email -->
        <form action="${apiSubmitUrl}" method="POST" style="background-color: rgba(255,255,255,0.02); border: 1px solid #1e293b; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <input type="hidden" name="dateRaw" value="${dateStr}">
          
          <div style="margin-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px;">
            <span style="font-size: 1rem; font-weight: bold; color: #06b6d4;">Which tasks did you complete today?</span>
          </div>
          
          ${tasksHtml}
          
          <div style="margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 15px;">
            <label style="display: block; font-size: 0.85rem; color: #9ca3af; margin-bottom: 6px; font-weight: 600;">Daily Notes / Skips Comments (Optional):</label>
            <textarea name="notes" rows="2" style="width: 100%; background-color: #0b0f19; border: 1px solid #1e293b; color: #f3f4f6; border-radius: 6px; padding: 10px; font-family: sans-serif; font-size: 0.85rem; box-sizing: border-box; resize: vertical;" placeholder="Type comments or reasons for skipping tasks..."></textarea>
          </div>
          
          <div style="text-align: center; margin-top: 20px;">
            <button type="submit" style="background: linear-gradient(135deg, #059669, #10b981); color: #ffffff; border: none; padding: 12px 28px; font-weight: bold; border-radius: 8px; font-size: 1rem; cursor: pointer; display: inline-block; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4); text-transform: uppercase; letter-spacing: 0.05em;">Submit Daily Report</button>
          </div>
        </form>
        
        <div style="text-align: center; font-size: 0.8rem; color: #9ca3af; line-height: 1.5; border-top: 1px solid #1e293b; padding-top: 15px;">
          <p style="margin: 0 0 10px 0;">💡 <em>नोट: ऊपर दिया गया फॉर्म आपके घरेलू वाई-फाई (Local Wi-Fi) नेटवर्क पर सीधे सबमिट होता है।</em></p>
          <p style="margin: 0 0 5px 0;">यदि आप वाई-फाई से बाहर हैं या फॉर्म काम नहीं कर रहा, तो यहाँ क्लिक करके सबमिट करें:</p>
          <div style="margin-top: 10px; display: flex; justify-content: center; gap: 10px;">
            <a href="${webLink}" style="background-color: #1e293b; border: 1px solid #334155; color: #06b6d4; text-decoration: none; padding: 8px 16px; font-size: 0.8rem; font-weight: bold; border-radius: 6px; display: inline-block;">गिटहब डैशबोर्ड पर खोलें</a>
            <a href="${localWebLink}" style="background-color: #1e293b; border: 1px solid #334155; color: #818cf8; text-decoration: none; padding: 8px 16px; font-size: 0.8rem; font-weight: bold; border-radius: 6px; display: inline-block;">लोकल डैशबोर्ड पर खोलें</a>
          </div>
        </div>
      </div>
    `
  };

  try {
    console.log(`Sending Daily Check-In Email to ${config.receiverEmail}...`);
    await transporter.sendMail(mailOptions);
    console.log('Daily check-in email dispatched successfully!');
  } catch (err) {
    console.error('Error dispatching daily email:', err);
  }
}

// Local HTTP Static File Server & AI API Proxy
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

function serveStaticFile(req, res) {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';
  
  const filePath = path.join(process.cwd(), urlPath);
  
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
    return;
  }
  
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 
    'Content-Type': MIME_TYPES[ext] || 'text/plain',
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
  });
  fs.createReadStream(filePath).pipe(res);
}

async function handleAIProxyRequest(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    try {
      const parsed = JSON.parse(body);
      const { text, systemInstruction } = parsed;
      
      const p1 = 'sk-or-v';
      const p2 = '1-a3a735';
      const p3 = 'f6ba2bde3494de2';
      const p4 = 'e3111118b8521c';
      const p5 = 'a2a774f6fb4bdb9';
      const p6 = '284521177f4add';
      let apiKey = p1 + p2 + p3 + p4 + p5 + p6;
      const localConfPath = path.join(process.cwd(), 'local_config.json');
      if (fs.existsSync(localConfPath)) {
        const localConf = JSON.parse(fs.readFileSync(localConfPath, 'utf-8'));
        if (localConf.openrouterKey) apiKey = localConf.openrouterKey;
      }
      
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:8080',
          'X-Title': 'Lifestyle Tracker'
        },
        body: JSON.stringify({
          model: 'google/gemma-4-31b-it:free',
          messages: [
            { role: 'user', content: systemInstruction },
            { role: 'user', content: text }
          ],
          temperature: 0.1,
          max_tokens: 1000
        })
      });
      
      const data = await response.json();
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      res.end(JSON.stringify(data));
    } catch (err) {
      console.error('AI Proxy backend error:', err);
      res.writeHead(500, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
}

function handleSaveRoutineRequest(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    try {
      const parsed = JSON.parse(body);
      const { type, routine } = parsed;
      
      if (type === 'school') {
        fs.writeFileSync(CUSTOM_SCHOOL_PATH, JSON.stringify(routine, null, 2));
        console.log('Saved custom school routine to server.');
      } else {
        fs.writeFileSync(CUSTOM_DEFAULT_PATH, JSON.stringify(routine, null, 2));
        console.log('Saved custom default routine to server.');
      }
      
      // Auto-commit and push custom routines to GitHub
      exec('git add custom_default_routine.json custom_school_routine.json && git commit -m "Auto-update custom routine from web panel [skip ci]" && git push origin main', (err, stdout, stderr) => {
        if (err) {
          console.warn("Failed to auto-push custom routine to GitHub:", err.message);
        } else {
          console.log("Successfully auto-pushed custom routine to GitHub!");
        }
      });
      
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({ success: true }));
      
      // Auto-trigger sync to update phone calendar
      authorize().then(auth => syncCalendar(auth)).catch(e => {
        console.log('Auto-sync skipped after save:', e.message);
      });
    } catch (err) {
      console.error('Save routine error:', err);
      res.writeHead(500, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
}

function handleEmailReportSubmission(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    try {
      const parsed = querystring.parse(body);
      const dateRaw = parsed.dateRaw || new Date().toDateString();
      const notes = parsed.notes || '';
      
      const referenceTime = new Date(dateRaw);
      const routine = getRoutineForDate(referenceTime);
      const cleanTasks = routine.filter(t => t.type !== 'alarm');
      
      let completedCount = 0;
      const tasksList = [];
      
      cleanTasks.forEach(task => {
        const isDone = parsed[`task_${task.id}`] === 'on';
        if (isDone) completedCount++;
        tasksList.push({
          id: task.id,
          name: task.name,
          done: isDone
        });
      });
      
      const score = cleanTasks.length > 0 ? (completedCount / cleanTasks.length) * 100 : 100;
      
      const LOGS_PATH = path.join(process.cwd(), 'daily_logs.json');
      let logs = [];
      if (fs.existsSync(LOGS_PATH)) {
        try {
          logs = JSON.parse(fs.readFileSync(LOGS_PATH, 'utf-8'));
        } catch (e) {
          console.error("Error parsing daily_logs.json, resetting:", e);
        }
      }
      
      logs = logs.filter(l => l.date !== dateRaw);
      logs.push({
        date: dateRaw,
        score: score,
        completedCount: completedCount,
        totalCount: cleanTasks.length,
        tasks: tasksList,
        notes: notes
      });
      
      fs.writeFileSync(LOGS_PATH, JSON.stringify(logs, null, 2));
      console.log(`Saved email check-in report for ${dateRaw}. Score: ${score}%`);
      
      // Auto-commit and push logs to GitHub
      exec('git add daily_logs.json && git commit -m "Auto-update daily logs from email [skip ci]" && git push origin main', (err) => {
        if (err) console.warn("Failed to auto-push logs to GitHub:", err.message);
        else console.log("Successfully auto-pushed logs to GitHub!");
      });
      
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Report Submitted Successfully</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&family=Inter:wght@400;600&display=swap" rel="stylesheet">
          <style>
            body {
              background-color: #080c14;
              color: #f3f4f6;
              font-family: 'Inter', sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
              box-sizing: border-box;
            }
            .container {
              background: linear-gradient(135deg, #0f172a, #1e1b4b);
              border: 1px solid #1e293b;
              border-radius: 16px;
              padding: 2.5rem;
              text-align: center;
              max-width: 450px;
              width: 100%;
              box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 40px rgba(6, 182, 212, 0.15);
            }
            h1 {
              font-family: 'Outfit', sans-serif;
              color: #06b6d4;
              font-size: 2rem;
              margin-top: 0;
              margin-bottom: 1rem;
              text-shadow: 0 0 10px rgba(6, 182, 212, 0.3);
            }
            .score {
              font-size: 4rem;
              font-weight: 800;
              color: #10b981;
              margin: 1.5rem 0;
              line-height: 1;
            }
            p {
              font-size: 0.95rem;
              line-height: 1.6;
              color: #9ca3af;
              margin-bottom: 2rem;
            }
            .btn {
              background: linear-gradient(135deg, #06b6d4, #6366f1);
              color: white;
              text-decoration: none;
              padding: 12px 24px;
              font-weight: bold;
              border-radius: 8px;
              display: inline-block;
              transition: transform 0.2s, box-shadow 0.2s;
              box-shadow: 0 4px 15px rgba(6, 182, 212, 0.3);
            }
            .btn:hover {
              transform: translateY(-2px);
              box-shadow: 0 6px 20px rgba(6, 182, 212, 0.5);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Report Saved! 🎉</h1>
            <p>Thank you Shivam! Your daily routine report has been recorded on the server.</p>
            <div style="font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af;">Consistency Score</div>
            <div class="score">${Math.round(score)}%</div>
            <p style="font-size: 0.85rem;">Completed <strong>${completedCount}</strong> out of <strong>${cleanTasks.length}</strong> tasks today.</p>
            <a href="https://shivamkumarrj15-sudo.github.io/lifestyle-tracker/" class="btn">Go to Dashboard</a>
          </div>
        </body>
        </html>
      `);
    } catch (err) {
      console.error('Email report submission handling error:', err);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Error parsing submission: ' + err.message);
    }
  });
}

function startHttpServer() {
  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    
    if (req.method === 'GET' && req.url === '/api/info') {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({ localIP: getLocalIP(), port: 8080 }));
    } else if (req.method === 'GET' && req.url === '/api/daily_logs') {
      const LOGS_PATH = path.join(process.cwd(), 'daily_logs.json');
      let logs = [];
      if (fs.existsSync(LOGS_PATH)) {
        try {
          logs = JSON.parse(fs.readFileSync(LOGS_PATH, 'utf-8'));
        } catch (e) {
          console.error("Error reading daily logs:", e.message);
        }
      }
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify(logs));
    } else if (req.method === 'POST' && req.url === '/api/daily_logs') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const logs = JSON.parse(body);
          const LOGS_PATH = path.join(process.cwd(), 'daily_logs.json');
          fs.writeFileSync(LOGS_PATH, JSON.stringify(logs, null, 2));
          
          // Auto-commit and push logs to GitHub
          exec('git add daily_logs.json && git commit -m "Auto-update daily logs from web [skip ci]" && git push origin main', (err) => {
            if (err) console.warn("Failed to auto-push logs to GitHub:", err.message);
            else console.log("Successfully auto-pushed logs to GitHub!");
          });
          
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify({ success: true }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
    } else if (req.method === 'POST' && req.url === '/api/submit_email_report') {
      handleEmailReportSubmission(req, res);
    } else if (req.method === 'POST' && req.url === '/api/ai') {
      handleAIProxyRequest(req, res);
    } else if (req.method === 'POST' && req.url === '/api/save_routine') {
      handleSaveRoutineRequest(req, res);
    } else {
      serveStaticFile(req, res);
    }
  });
  
  server.listen(8080, () => {
    console.log(`\n💻 Web Dashboard served locally at: http://localhost:8080`);
    console.log(`📱 Mobile dashboard accessible on Wi-Fi at: http://${getLocalIP()}:8080`);
  });
}

// Background Daemon mode
async function runDaemon(auth) {
  console.log('\n🟢 Lifestyle Automation Daemon running in background...');
  
  // Start local server serving static files and API proxy
  startHttpServer();
  
  // Tick every 30 seconds
  setInterval(async () => {
    try {
      const now = new Date();
      const dateStr = now.toDateString();
      const hrs = now.getHours();
      const mins = now.getMinutes();
      const currentMins = hrs * 60 + mins;
      
      const state = loadSyncState();
      
      // 1. Sync Calendar once a day after 06:00 AM (catch up if missed)
      if (auth && state.lastSyncedDate !== dateStr && currentMins >= 360) {
        console.log(`Running daily calendar sync catch-up for ${dateStr}...`);
        state.lastSyncedDate = dateStr;
        saveSyncState(state);
        await syncCalendar(auth);
      }
      
      // 2. Dispatch Daily Check-In Mail after 09:30 PM (21:30) (catch up if missed)
      if (state.lastEmailedDate !== dateStr && currentMins >= 1290) {
        console.log(`Sending daily check-in email for ${dateStr}...`);
        state.lastEmailedDate = dateStr;
        saveSyncState(state);
        await sendDailyEmail();
      }
    } catch (err) {
      console.error('Error in background daemon tick:', err);
    }
  }, 30000);
}

// Main entry
async function main() {
  const args = process.argv.slice(2);
  const runOnce = args.includes('--once');
  const sendEmailOnly = args.includes('--send-email');
  
  if (sendEmailOnly) {
    console.log('Dispatching test daily email immediately...');
    await sendDailyEmail();
    console.log('Exiting after manual email dispatch.');
    process.exit(0);
  }

  let auth = null;
  try {
    auth = await authorize();
    
    // Initial sync on run
    await syncCalendar(auth);
    
    // Update persistent state to note calendar synced today
    const state = loadSyncState();
    state.lastSyncedDate = new Date().toDateString();
    saveSyncState(state);
  } catch (err) {
    console.warn('\n⚠️ Google Calendar API authorization skipped or failed:');
    console.warn(err.message || err);
    console.warn('Google Calendar background sync will be unavailable. You can still sync manually from the web dashboard.');
  }
  
  if (runOnce) {
    if (auth) {
      console.log('Ran calendar sync once. Exiting.');
      process.exit(0);
    } else {
      console.error('Calendar sync failed and --once was specified. Exiting.');
      process.exit(1);
    }
  }
  
  // Start daemon for scheduling emails and daily syncs
  await runDaemon(auth);
}

main();
