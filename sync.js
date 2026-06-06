import fs from 'fs';
import path from 'path';
import os from 'os';
import { authenticate } from '@google-cloud/local-auth';
import { google } from 'googleapis';
import nodemailer from 'nodemailer';
import { DEFAULT_ROUTINE, SCHOOL_ROUTINE } from './data.js';

// Configuration
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CONFIG_PATH = path.join(process.cwd(), 'email_config.json');

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
  return date >= thresholdDate ? SCHOOL_ROUTINE : DEFAULT_ROUTINE;
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

  // 2. Clear events for next 7 days to avoid duplicates and handle routine shifts
  const now = new Date();
  const rangeStart = new Date(now);
  rangeStart.setHours(0, 0, 0, 0);
  
  const rangeEnd = new Date(now);
  rangeEnd.setDate(rangeEnd.getDate() + 7);
  rangeEnd.setHours(23, 59, 59, 999);

  console.log(`Clearing events from ${rangeStart.toDateString()} to ${rangeEnd.toDateString()}...`);
  const eventsRes = await calendar.events.list({
    calendarId,
    timeMin: rangeStart.toISOString(),
    timeMax: rangeEnd.toISOString(),
    singleEvents: true
  });

  const events = eventsRes.data.items || [];
  for (const event of events) {
    await calendar.events.delete({
      calendarId,
      eventId: event.id
    });
  }
  console.log(`Deleted ${events.length} existing events.`);

  // 3. Write routine events for the next 7 days
  console.log('Writing new routine events into Google Calendar...');
  for (let d = 0; d < 7; d++) {
    const loopDate = new Date(now);
    loopDate.setDate(loopDate.getDate() + d);
    const routine = getRoutineForDate(loopDate);
    
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
      
      const eventData = {
        summary: task.name,
        description: task.desc,
        start: { dateTime: eventStart.toISOString() },
        end: { dateTime: eventEnd.toISOString() },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 10 },
            { method: 'popup', minutes: 0 } // Ring alarm/notification at event time
          ]
        }
      };

      await calendar.events.insert({
        calendarId,
        requestBody: eventData
      });
    }
  }
  console.log('Google Calendar sync completed successfully!');
}

// Send daily review email checklist link
async function sendDailyEmail() {
  const config = loadEmailConfig();
  if (config.senderEmail === 'your-email@gmail.com' || config.senderAppPassword === 'your-app-password') {
    console.log('⚠️ Skipping Daily email check-in. Please configure email_config.json with your SMTP details.');
    return;
  }

  const localIP = getLocalIP();
  const checkInUrl = config.dashboardUrl 
    ? `${config.dashboardUrl.replace(/\/$/, '')}/?openCheckIn=true`
    : `http://${localIP}:8080/?openCheckIn=true`;

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
    subject: `Review Your Day - ${new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}`,
    html: `
      <div style="font-family: Arial, sans-serif; background: #080c14; color: #f3f4f6; padding: 20px; border-radius: 10px; max-width: 500px; margin: 0 auto; border: 1px solid #1e293b;">
        <h2 style="color: #06b6d4; font-size: 1.5rem; border-bottom: 1px solid #1e293b; padding-bottom: 10px; margin-top: 0;">Daily Lifestyle Check-In</h2>
        <p style="font-size: 0.95rem; line-height: 1.6;">Hello! It is 09:30 PM. Please submit your daily completion checklist honestly to track your consistency.</p>
        <div style="text-align: center; margin: 25px 0;">
          <a href="${checkInUrl}" style="background: linear-gradient(135deg, #06b6d4, #6366f1); color: #ffffff; text-decoration: none; padding: 12px 24px; font-weight: bold; border-radius: 8px; font-size: 1rem; box-shadow: 0 4px 15px rgba(6, 182, 212, 0.4); display: inline-block;">Open Mobile Log Sheet</a>
        </div>
        <p style="font-size: 0.8rem; color: #9ca3af; text-align: center; margin-bottom: 0;">Link works on your local Wi-Fi network. Make sure your phone is connected.</p>
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

// Background Daemon mode
async function runDaemon(auth) {
  console.log('\n🟢 Lifestyle Automation Daemon running in background...');
  console.log(`Open http://${getLocalIP()}:8080 on your mobile phone to review dashboard.`);
  
  let lastSyncedDate = '';
  let lastEmailedDate = '';
  
  // Tick every 30 seconds
  setInterval(async () => {
    try {
      const now = new Date();
      const dateStr = now.toDateString();
      const hrs = now.getHours();
      const mins = now.getMinutes();
      
      // 1. Sync Calendar once a day at 06:00 AM (or on startup)
      if (auth && lastSyncedDate !== dateStr && hrs === 6 && mins === 0) {
        lastSyncedDate = dateStr;
        await syncCalendar(auth);
      }
      
      // 2. Dispatch Daily Check-In Mail at 09:30 PM (21:30)
      if (lastEmailedDate !== dateStr && hrs === 21 && mins === 30) {
        lastEmailedDate = dateStr;
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
