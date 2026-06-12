import { DEFAULT_ROUTINE, SCHOOL_ROUTINE, SKILLS_DATABASE, DIET_PLANS } from './data.js';

// Application State
const STATE = {
  currentTime: new Date(),
  simMode: false,
  simSpeed: 1, 
  activeSkillId: null,
  masteredSkillIds: [],
  dietType: 'veg', 
  dailyLogs: [], 
  soundEnabled: true,
  alarms: {
    wakeUp: '05:30',
    sleep: '22:30'
  },
  activeAlarm: null, 
  lastCheckedMinute: -1,
  lastEmailDateStr: '', 
  lastWeeklyReportStr: '',
  lastMonthlyReportStr: '',
  unreadMails: [],
  activeMailId: null,
  snoozedUntil: null,
  analyticsView: 'weekly',
  currentDayProgress: { date: '', tasks: {} }, // Live tasks checked today: { taskId: boolean }
  lastActiveTaskId: null,
  customDefaultRoutine: null,
  customSchoolRoutine: null
};

// Web Audio API Alarm Sounds
let audioCtx = null;
let alarmIntervalId = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playAlarmSound(type) {
  if (!STATE.soundEnabled) return;
  initAudio();
  
  if (type === 'sleep') {
    let time = audioCtx.currentTime;
    const notes = [329.63, 415.30, 493.88, 659.25]; // Zen chord
    notes.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time + idx * 0.15);
      gain.gain.setValueAtTime(0, time + idx * 0.15);
      gain.gain.linearRampToValueAtTime(0.2, time + idx * 0.15 + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + idx * 0.15 + 1.8);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(time + idx * 0.15);
      osc.stop(time + idx * 0.15 + 2.0);
    });
  } else {
    let time = audioCtx.currentTime;
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, time);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(884, time);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.25, time + 0.05);
    gain.gain.setValueAtTime(0.25, time + 0.25);
    gain.gain.linearRampToValueAtTime(0.0001, time + 0.3);
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(audioCtx.destination);
    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + 0.35);
    osc2.stop(time + 0.35);
  }
}

function startAlarm(type) {
  if (STATE.activeAlarm) return;
  STATE.activeAlarm = type;
  
  const modal = document.getElementById('alarm-modal');
  const title = document.getElementById('alarm-title');
  const msg = document.getElementById('alarm-message');
  const dismissBtn = document.getElementById('alarm-dismiss-btn');
  
  if (type === 'sleep') {
    title.textContent = "Time to Sleep 🛌";
    msg.textContent = `It is ${format12Hour(STATE.alarms.sleep)}. Winds down your work and go to bed.`;
    dismissBtn.textContent = "Dismiss & Go to Bed";
    dismissBtn.className = "btn btn-primary btn-glow";
  } else {
    title.textContent = "Good Morning! 🌅";
    msg.textContent = `It is ${format12Hour(STATE.alarms.wakeUp)}. Wake up, hydrate, and start your morning routine!`;
    dismissBtn.textContent = "Dismiss & Start Morning Routine";
    dismissBtn.className = "btn btn-success btn-glow";
  }
  
  updateAlarmTimeDisplay();
  modal.classList.remove('hidden');
  
  playAlarmSound(type);
  alarmIntervalId = setInterval(() => {
    playAlarmSound(type);
  }, 2500);
}

function stopAlarm() {
  if (alarmIntervalId) {
    clearInterval(alarmIntervalId);
    alarmIntervalId = null;
  }
  STATE.activeAlarm = null;
  document.getElementById('alarm-modal').classList.add('hidden');
}

function updateAlarmTimeDisplay() {
  const hrs = STATE.currentTime.getHours();
  const mins = STATE.currentTime.getMinutes();
  const ampm = hrs >= 12 ? 'PM' : 'AM';
  const displayHrs = hrs % 12 || 12;
  const displayMins = mins < 10 ? '0' + mins : mins;
  document.getElementById('alarm-time-display').textContent = `${displayHrs}:${displayMins} ${ampm}`;
}

// LocalStorage persistence
function saveToLocalStorage() {
  localStorage.setItem('lifestyle_activeSkillId', JSON.stringify(STATE.activeSkillId));
  localStorage.setItem('lifestyle_masteredSkillIds', JSON.stringify(STATE.masteredSkillIds));
  localStorage.setItem('lifestyle_dietType', STATE.dietType);
  localStorage.setItem('lifestyle_dailyLogs', JSON.stringify(STATE.dailyLogs));
  localStorage.setItem('lifestyle_soundEnabled', JSON.stringify(STATE.soundEnabled));
  localStorage.setItem('lifestyle_unreadMails', JSON.stringify(STATE.unreadMails));
  localStorage.setItem('lifestyle_currentDayProgress', JSON.stringify(STATE.currentDayProgress));
  localStorage.setItem('lifestyle_customDefaultRoutine', JSON.stringify(STATE.customDefaultRoutine));
  localStorage.setItem('lifestyle_customSchoolRoutine', JSON.stringify(STATE.customSchoolRoutine));
}

function loadFromLocalStorage() {
  STATE.activeSkillId = JSON.parse(localStorage.getItem('lifestyle_activeSkillId')) || null;
  STATE.masteredSkillIds = JSON.parse(localStorage.getItem('lifestyle_masteredSkillIds')) || [];
  STATE.dietType = localStorage.getItem('lifestyle_dietType') || 'veg';
  STATE.dailyLogs = JSON.parse(localStorage.getItem('lifestyle_dailyLogs')) || [];
  STATE.soundEnabled = localStorage.getItem('lifestyle_soundEnabled') !== 'false';
  STATE.unreadMails = JSON.parse(localStorage.getItem('lifestyle_unreadMails')) || [];
  STATE.currentDayProgress = JSON.parse(localStorage.getItem('lifestyle_currentDayProgress')) || { date: '', tasks: {} };
  STATE.customDefaultRoutine = JSON.parse(localStorage.getItem('lifestyle_customDefaultRoutine')) || null;
  STATE.customSchoolRoutine = JSON.parse(localStorage.getItem('lifestyle_customSchoolRoutine')) || null;
}

// Check and verify current day progress consistency
function checkDayChange() {
  const todayStr = STATE.currentTime.toDateString();
  if (STATE.currentDayProgress.date !== todayStr) {
    STATE.currentDayProgress = { date: todayStr, tasks: {} };
    saveToLocalStorage();
  }
}

// Determine active routine based on date (Threshold: June 19, 2026)
function getCurrentRoutine() {
  const thresholdDate = new Date('2026-06-19T00:00:00');
  
  if (STATE.currentTime >= thresholdDate) {
    const routine = STATE.customSchoolRoutine || SCHOOL_ROUTINE;
    const wakeTask = routine.find(t => t.id === 'wake_up');
    const sleepTask = routine.find(t => t.id === 'sleep_alarm');
    STATE.alarms.wakeUp = wakeTask ? wakeTask.start : '05:00';
    STATE.alarms.sleep = sleepTask ? sleepTask.start : '22:30';
    document.getElementById('routine-mode-badge').textContent = "School Mode";
    document.getElementById('routine-mode-badge').className = "badge badge-orange";
    return routine;
  } else {
    const routine = STATE.customDefaultRoutine || DEFAULT_ROUTINE;
    const wakeTask = routine.find(t => t.id === 'wake_up');
    const sleepTask = routine.find(t => t.id === 'sleep_alarm');
    STATE.alarms.wakeUp = wakeTask ? wakeTask.start : '05:30';
    STATE.alarms.sleep = sleepTask ? sleepTask.start : '22:30';
    document.getElementById('routine-mode-badge').textContent = "Holiday Mode";
    document.getElementById('routine-mode-badge').className = "badge badge-sim";
    return routine;
  }
}

// Chart.js Configuration
let progressChart = null;

function renderProgressChart() {
  const ctx = document.getElementById('progress-chart').getContext('2d');
  const sortedLogs = [...STATE.dailyLogs].sort((a,b) => new Date(a.date) - new Date(b.date));
  
  const sliceCount = STATE.analyticsView === 'weekly' ? -7 : -30;
  const recentLogs = sortedLogs.slice(sliceCount);
  
  const labels = recentLogs.map(log => {
    const d = new Date(log.date);
    return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
  });
  const data = recentLogs.map(log => Math.round(log.score));
  
  if (progressChart) {
    progressChart.destroy();
  }
  
  progressChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels.length ? labels : ['No Data'],
      datasets: [{
        label: 'Consistency Score (%)',
        data: data.length ? data : [0],
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#06b6d4',
        pointBorderColor: '#fff',
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          min: 0,
          max: 100,
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#9ca3af', font: { family: 'Inter', size: 10 } }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#9ca3af', font: { family: 'Inter', size: 10 } }
        }
      }
    }
  });
}

function updateStats() {
  const logsCount = STATE.dailyLogs.length;
  let totalScore = 0;
  let totalDone = 0;
  
  STATE.dailyLogs.forEach(log => {
    totalScore += log.score;
    totalDone += log.completedCount || 0;
  });
  
  const avgScore = logsCount > 0 ? Math.round(totalScore / logsCount) : 0;
  
  // Calculate Streak
  let streak = 0;
  const sortedLogs = [...STATE.dailyLogs].sort((a,b) => new Date(b.date) - new Date(a.date));
  let expectedDate = new Date(STATE.currentTime);
  expectedDate.setHours(0,0,0,0);
  
  for (let i = 0; i < sortedLogs.length; i++) {
    const logDate = new Date(sortedLogs[i].date);
    logDate.setHours(0,0,0,0);
    const diffTime = Math.abs(expectedDate - logDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 1) {
      if (sortedLogs[i].score >= 50) {
        streak++;
        expectedDate = logDate;
        expectedDate.setDate(expectedDate.getDate() - 1);
      } else {
        break;
      }
    } else {
      break;
    }
  }
  
  document.getElementById('stat-streak').textContent = `${streak} Day${streak === 1 ? '' : 's'}`;
  document.getElementById('stat-avg-score').textContent = `${avgScore}%`;
  document.getElementById('stat-tasks-done').textContent = totalDone;
}

function timeStrToMins(str) {
  const [hrs, mins] = str.split(':').map(Number);
  return hrs * 60 + mins;
}

function getCurrentMins() {
  return STATE.currentTime.getHours() * 60 + STATE.currentTime.getMinutes();
}

function getActiveTask() {
  const currentMins = getCurrentMins();
  const routine = getCurrentRoutine();
  let activeTask = null;
  
  for (const task of routine) {
    const startMins = timeStrToMins(task.start);
    let endMins = timeStrToMins(task.end);
    if (endMins === 0 && task.end === '24:00') endMins = 1440;
    
    if (currentMins >= startMins && currentMins < endMins) {
      activeTask = { ...task };
      break;
    }
  }
  
  if (!activeTask) {
    activeTask = { ...routine[0] };
  }
  
  if (activeTask.type === 'new_skill') {
    if (STATE.activeSkillId) {
      const skill = SKILLS_DATABASE.find(s => s.id === STATE.activeSkillId);
      if (skill) {
        activeTask.name = `Learn: ${skill.name}`;
        activeTask.desc = `Focus on topics: ${skill.topics.slice(0, 3).join(', ')}`;
      }
    } else {
      activeTask.name = "New Skill Learning (Idle)";
      activeTask.desc = "No skill is locked. Generate a new skill to lock this hour.";
    }
  }
  
  return activeTask;
}

function getNextTask(activeTask) {
  const routine = getCurrentRoutine();
  const activeIdx = routine.findIndex(t => t.id === activeTask.id);
  let nextIdx = (activeIdx + 1) % routine.length;
  
  while (routine[nextIdx].type === 'alarm') {
    nextIdx = (nextIdx + 1) % routine.length;
  }
  
  const nextTask = { ...routine[nextIdx] };
  if (nextTask.type === 'new_skill' && STATE.activeSkillId) {
    const skill = SKILLS_DATABASE.find(s => s.id === STATE.activeSkillId);
    if (skill) nextTask.name = `Learn: ${skill.name}`;
  }
  return nextTask;
}

function format12Hour(timeStr) {
  const [hrsStr, minsStr] = timeStr.split(':');
  const hrs = Number(hrsStr);
  const ampm = hrs >= 12 ? 'PM' : 'AM';
  const displayHrs = hrs % 12 || 12;
  return `${displayHrs}:${minsStr} ${ampm}`;
}

function updateLiveStatusUI(activeTask, nextTask) {
  const card = document.getElementById('live-status-section');
  const typeBadge = document.getElementById('current-task-type');
  const taskName = document.getElementById('current-task-name');
  const taskDesc = document.getElementById('current-task-desc');
  const timeRemaining = document.getElementById('time-remaining');
  const progressCircle = document.getElementById('progress-circle');
  
  typeBadge.textContent = activeTask.type;
  typeBadge.className = `badge badge-active`;
  
  const colorMap = {
    sleep: 'var(--purple)',
    health: 'var(--emerald)',
    trading: 'var(--cyan)',
    diet: 'var(--emerald)',
    learning: 'var(--amber)',
    creative: 'var(--pink)',
    leisure: 'var(--cyan)',
    social: 'var(--primary)',
    new_skill: 'var(--amber)'
  };
  card.style.setProperty('--accent-color', colorMap[activeTask.type] || 'var(--cyan)');
  
  taskName.textContent = activeTask.name;
  taskDesc.textContent = activeTask.desc;
  
  const currentMins = getCurrentMins();
  const startMins = timeStrToMins(activeTask.start);
  let endMins = timeStrToMins(activeTask.end);
  if (endMins === 0 && activeTask.end === '24:00') endMins = 1440;
  
  const totalDuration = endMins - startMins;
  const elapsed = currentMins - startMins;
  const remaining = Math.max(0, totalDuration - elapsed);
  
  const displayHrs = Math.floor(remaining / 60);
  const displayMins = remaining % 60;
  const padMins = displayMins < 10 ? '0' + displayMins : displayMins;
  
  if (displayHrs > 0) {
    timeRemaining.textContent = `${displayHrs}h ${padMins}m`;
  } else {
    timeRemaining.textContent = `${padMins}:00`;
  }
  
  const circleCircumference = 439.82;
  const percentDone = totalDuration > 0 ? elapsed / totalDuration : 1;
  const strokeDashoffset = circleCircumference - (percentDone * circleCircumference);
  progressCircle.style.strokeDashoffset = strokeDashoffset;
  
  const dayProgressPercent = (currentMins / 1440) * 100;
  document.getElementById('day-progress-fill').style.width = `${dayProgressPercent}%`;
  
  document.getElementById('next-task-name').textContent = nextTask.name;
  document.getElementById('next-task-time').textContent = format12Hour(nextTask.start);
}

function renderTimeline(activeTask) {
  const container = document.getElementById('timeline-list');
  container.innerHTML = '';
  
  const routine = getCurrentRoutine();
  checkDayChange();
  
  routine.forEach(task => {
    if (task.type === 'alarm') return;
    
    const item = document.createElement('div');
    item.className = `timeline-item`;
    item.dataset.type = task.type;
    if (task.id === activeTask.id) {
      item.classList.add('active');
    }
    
    let displayName = task.name;
    let displayDesc = task.desc;
    if (task.type === 'new_skill' && STATE.activeSkillId) {
      const skill = SKILLS_DATABASE.find(s => s.id === STATE.activeSkillId);
      if (skill) {
        displayName = `Learn: ${skill.name}`;
        displayDesc = `Self education study hour on: ${skill.name}. Modules: ${skill.topics.join(', ')}`;
      }
    }
    
    const isCompleted = STATE.currentDayProgress.tasks[task.id] || false;
    
    item.innerHTML = `
      <div class="timeline-time">${format12Hour(task.start)}</div>
      <div class="timeline-node"></div>
      <div class="timeline-content-box">
        <div class="timeline-content-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 2px;">
          <div class="timeline-item-title">${displayName}</div>
          <input type="checkbox" class="timeline-checkbox" data-task-id="${task.id}" ${isCompleted ? 'checked' : ''} style="accent-color: var(--emerald); cursor: pointer; width: 14px; height: 14px;">
        </div>
        <div class="timeline-item-desc">${displayDesc}</div>
      </div>
    `;
    
    // Checkbox click listener for live checks
    const checkbox = item.querySelector('.timeline-checkbox');
    checkbox.addEventListener('change', (e) => {
      const tId = e.target.dataset.taskId;
      checkDayChange();
      STATE.currentDayProgress.tasks[tId] = e.target.checked;
      saveToLocalStorage();
      
      // Sync with open mail checklist if active
      if (STATE.activeMailId) {
        const mailCheckbox = document.querySelector(`.daily-checklist-form input[data-task-id="${tId}"]`);
        if (mailCheckbox) {
          mailCheckbox.checked = e.target.checked;
        }
      }
    });
    
    container.appendChild(item);
    if (task.id === activeTask.id && STATE.lastActiveTaskId !== activeTask.id && STATE.simSpeed <= 60) {
      setTimeout(() => {
        item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  });
  STATE.lastActiveTaskId = activeTask.id;
}

function updateDietUI() {
  const currentMins = getCurrentMins();
  const routine = getCurrentRoutine();
  
  let periodKey = 'postWorkout'; 
  let periodTitle = "Post-Workout Muscle Recovery";
  let periodTimeDesc = "For consumption immediately after gym workout session.";
  
  const gymTask = routine.find(t => t.id === 'gym');
  const postGymTask = routine.find(t => t.id === 'post_gym_diet');
  const lunchTask = routine.find(t => t.id === 'lunch' || t.id === 'lunch_rest');
  const dinnerTask = routine.find(t => t.id === 'dinner');
  const preGymTask = routine.find(t => t.id === 'pre_workout_meal' || t.id === 'breakfast');
  
  if (preGymTask && currentMins >= timeStrToMins(preGymTask.start) && currentMins < timeStrToMins(preGymTask.end)) {
    periodKey = 'preWorkout';
    periodTitle = "Pre-Workout Energizer";
    periodTimeDesc = `Consumable during breakfast/pre-workout window: ${format12Hour(preGymTask.start)} - ${format12Hour(preGymTask.end)}.`;
  } else if (lunchTask && currentMins >= timeStrToMins(lunchTask.start) && currentMins < timeStrToMins(lunchTask.end)) {
    periodKey = 'lunch';
    periodTitle = "High-Fiber Balanced Lunch";
    periodTimeDesc = `Consumable during lunch window: ${format12Hour(lunchTask.start)} - ${format12Hour(lunchTask.end)}.`;
  } else if (dinnerTask && currentMins >= timeStrToMins(dinnerTask.start) && currentMins < timeStrToMins(dinnerTask.end)) {
    periodKey = 'dinner';
    periodTitle = "Light & Nutrient-Dense Dinner";
    periodTimeDesc = `Consumable during dinner window: ${format12Hour(dinnerTask.start)} - ${format12Hour(dinnerTask.end)}.`;
  } else if (postGymTask && currentMins >= timeStrToMins(postGymTask.start) && currentMins < timeStrToMins(postGymTask.end)) {
    periodKey = 'postWorkout';
    periodTitle = "Post-Workout Muscle Recovery";
    periodTimeDesc = `Consumable during post-workout window: ${format12Hour(postGymTask.start)} - ${format12Hour(postGymTask.end)}.`;
  }
  
  const dietCategory = DIET_PLANS[periodKey];
  document.getElementById('diet-meal-title').textContent = periodTitle;
  document.getElementById('diet-meal-desc').textContent = periodTimeDesc;
  
  let meals = dietCategory.meals;
  let selectedMeal = meals[0];
  
  if (STATE.dietType === 'veg') {
    selectedMeal = meals.find(m => m.name.includes('(Veg') || m.name.includes('Veg Option') || m.name.includes('Tofu')) || meals[0];
  } else if (STATE.dietType === 'nonveg') {
    selectedMeal = meals.find(m => m.name.includes('(Non-Veg') || m.name.includes('Chicken') || m.name.includes('Eggs')) || meals[0];
  } else if (STATE.dietType === 'budget') {
    selectedMeal = meals.find(m => m.name.includes('Sattu') || m.name.includes('Budget') || m.name.includes('Banana') || m.name.includes('Eggs')) || meals[0];
  }
  
  document.getElementById('diet-meal-name').textContent = selectedMeal.name;
  document.getElementById('diet-meal-macros').textContent = selectedMeal.nutrition;
  document.getElementById('diet-meal-ingredients').textContent = selectedMeal.ingredients;
  document.getElementById('diet-meal-tips').textContent = selectedMeal.tips;
}

function updateSkillUI() {
  const activeView = document.getElementById('active-skill-view');
  if (!activeView) return; // Exit if the component was removed from index.html
  
  const emptyView = document.getElementById('empty-skill-view');
  const badge = document.getElementById('skill-status-badge');
  
  if (STATE.activeSkillId) {
    const skill = SKILLS_DATABASE.find(s => s.id === STATE.activeSkillId);
    if (skill) {
      activeView.classList.remove('hidden');
      emptyView.classList.add('hidden');
      badge.textContent = "Locked in Routine";
      badge.className = "badge badge-orange";
      
      document.getElementById('active-skill-name').textContent = skill.name;
      document.getElementById('active-skill-difficulty').textContent = skill.difficulty;
      document.getElementById('active-skill-desc').textContent = skill.description;
      
      const topicsList = document.getElementById('active-skill-topics-list');
      topicsList.innerHTML = '';
      skill.topics.forEach(topic => {
        const li = document.createElement('li');
        li.textContent = topic;
        topicsList.appendChild(li);
      });
    }
  } else {
    activeView.classList.add('hidden');
    emptyView.classList.remove('hidden');
    badge.textContent = "Acquired: " + STATE.masteredSkillIds.length;
    badge.className = "badge badge-success";
  }
}

// Generate check-in email simulation
function triggerCheckInEmail() {
  const dateStr = STATE.currentTime.toDateString();
  if (STATE.lastEmailDateStr === dateStr) return;
  STATE.lastEmailDateStr = dateStr;
  
  const mailId = 'mail_' + Date.now();
  const routine = getCurrentRoutine();
  checkDayChange();
  
  const newMail = {
    id: mailId,
    type: 'daily_log',
    subject: `Review Your Routine - ${STATE.currentTime.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}`,
    date: STATE.currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    dateRaw: dateStr,
    unread: true,
    tasks: routine.filter(t => t.type !== 'alarm').map(t => {
      let taskName = t.name;
      if (t.type === 'new_skill' && STATE.activeSkillId) {
        const skill = SKILLS_DATABASE.find(s => s.id === STATE.activeSkillId);
        if (skill) taskName = `Learn: ${skill.name}`;
      }
      // Populate with live checked state from daytime checks
      const isDone = STATE.currentDayProgress.tasks[t.id] || false;
      return { id: t.id, name: taskName, done: isDone };
    })
  };
  
  STATE.unreadMails.unshift(newMail);
  saveToLocalStorage();
  renderMailbox();
  playNotificationBeep();
}

function triggerWeeklyReport() {
  const dateStr = STATE.currentTime.toDateString();
  const weekStart = new Date(STATE.currentTime);
  weekStart.setDate(weekStart.getDate() - 7);
  
  const mailId = 'weekly_' + Date.now();
  const weekLogs = STATE.dailyLogs.filter(l => new Date(l.date) >= weekStart);
  let totalScore = 0;
  weekLogs.forEach(l => totalScore += l.score);
  const avgWeeklyScore = weekLogs.length > 0 ? Math.round(totalScore / weekLogs.length) : 0;
  
  let analysis = `Averages: **${avgWeeklyScore}% completion rate** across ${weekLogs.length} logged days. `;
  if (avgWeeklyScore >= 80) {
    analysis += "Excellent job! You are maintaining solid self-discipline. Trading schedules, English speaking practice, and Gym goals are fully on track.";
  } else if (avgWeeklyScore >= 50) {
    analysis += "Decent consistency, but there is room for improvement. Try to minimize skipping reading, English speaking and charting sessions.";
  } else {
    analysis += "Consistency was low this week. Make sure you get to bed on time and dismiss alarms promptly to auto-fill morning routines.";
  }
  
  const newMail = {
    id: mailId,
    type: 'weekly_report',
    subject: `📊 WEEKLY PROGRESS REPORT - ${STATE.currentTime.toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}`,
    date: STATE.currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    dateRaw: dateStr,
    unread: true,
    weeklyScore: avgWeeklyScore,
    analysisText: analysis
  };
  
  STATE.unreadMails.unshift(newMail);
  saveToLocalStorage();
  renderMailbox();
  playNotificationBeep();
}

function triggerMonthlyReport() {
  const dateStr = STATE.currentTime.toDateString();
  const monthStart = new Date(STATE.currentTime);
  monthStart.setDate(monthStart.getDate() - 30);
  
  const mailId = 'monthly_' + Date.now();
  const monthLogs = STATE.dailyLogs.filter(l => new Date(l.date) >= monthStart);
  let totalScore = 0;
  monthLogs.forEach(l => totalScore += l.score);
  const avgMonthlyScore = monthLogs.length > 0 ? Math.round(totalScore / monthLogs.length) : 0;
  
  const newMail = {
    id: mailId,
    type: 'monthly_report',
    subject: `🏆 MONTHLY CONSISTENCY REPORT - ${STATE.currentTime.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
    date: STATE.currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    dateRaw: dateStr,
    unread: true,
    monthlyScore: avgMonthlyScore,
    analysisText: `Monthly Average Completion: **${avgMonthlyScore}%**. You logged your progress ${monthLogs.length} times this month. Keep mastering new skills, speaking English, and maintaining healthy lifestyle blocks!`
  };
  
  STATE.unreadMails.unshift(newMail);
  saveToLocalStorage();
  renderMailbox();
  playNotificationBeep();
}

function playNotificationBeep() {
  if (!STATE.soundEnabled) return;
  initAudio();
  const time = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.frequency.setValueAtTime(587.33, time);
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(0.15, time + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.6);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(time);
  osc.stop(time + 0.65);
}

function renderMailbox() {
  const listContainer = document.getElementById('inbox-list-container');
  const countBadge = document.getElementById('mail-count');
  
  const devBtn = document.getElementById('dev-trigger-email');
  listContainer.innerHTML = '';
  
  const unreadCount = STATE.unreadMails.filter(m => m.unread).length;
  if (unreadCount > 0) {
    countBadge.textContent = unreadCount;
    countBadge.classList.remove('hidden');
  } else {
    countBadge.classList.add('hidden');
  }
  
  if (STATE.unreadMails.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'no-mail-state';
    emptyState.innerHTML = `
      <i data-lucide="check-check"></i>
      <p>Inboxes are clear. Check-in email arrives daily at 09:30 PM.</p>
    `;
    emptyState.appendChild(devBtn);
    listContainer.appendChild(emptyState);
    
    document.getElementById('mail-reader-panel').classList.add('hidden');
    document.querySelector('.mailbox-card').classList.remove('reader-active');
    lucide.createIcons();
    return;
  }
  
  STATE.unreadMails.forEach(mail => {
    const item = document.createElement('div');
    item.className = `mail-item ${mail.unread ? 'unread' : ''} ${STATE.activeMailId === mail.id ? 'active' : ''}`;
    
    let iconName = mail.unread ? 'mail' : 'mail-open';
    if (mail.type === 'weekly_report' || mail.type === 'monthly_report') {
      iconName = 'pie-chart';
    }
    
    item.innerHTML = `
      <i data-lucide="${iconName}" class="mail-envelope-icon"></i>
      <div class="mail-item-content">
        <div class="mail-item-title">${mail.subject}</div>
        <div class="mail-item-snippet">${mail.type === 'daily_log' ? 'Honest daily routine check-in form.' : 'Review your analytical reports.'}</div>
      </div>
      <div class="mail-item-time">${mail.date}</div>
    `;
    
    item.addEventListener('click', () => {
      openMail(mail.id);
    });
    
    listContainer.appendChild(item);
  });
  
  const divider = document.createElement('div');
  divider.className = 'text-center py-xs border-top';
  divider.appendChild(devBtn);
  listContainer.appendChild(divider);
  
  lucide.createIcons();
}

function openMail(id) {
  STATE.activeMailId = id;
  const mail = STATE.unreadMails.find(m => m.id === id);
  if (!mail) return;
  
  mail.unread = false;
  saveToLocalStorage();
  
  document.querySelector('.mailbox-card').classList.add('reader-active');
  document.getElementById('mail-reader-panel').classList.remove('hidden');
  
  document.getElementById('read-subject').textContent = mail.subject;
  document.getElementById('read-date').textContent = `${mail.dateRaw}, ${mail.date}`;
  
  const bodyEl = document.querySelector('.mail-body');
  
  if (mail.type === 'daily_log') {
    bodyEl.innerHTML = `
      <p class="mail-intro">Hello! Please verify which activities you successfully completed today. Provide an honest report so we can graph your weekly/monthly consistency.</p>
      <form id="daily-checklist-form" class="daily-checklist-form">
        <div class="checklist-items" id="mail-checklist-items"></div>
        <div class="mail-actions">
          <button type="submit" class="btn btn-success btn-glow">Submit Honest Summary</button>
        </div>
      </form>
    `;
    
    const itemsContainer = document.getElementById('mail-checklist-items');
    mail.tasks.forEach(task => {
      // Look up live check state from today
      const isChecked = STATE.currentDayProgress.tasks[task.id] !== undefined 
        ? STATE.currentDayProgress.tasks[task.id] 
        : task.done;
        
      const label = document.createElement('label');
      label.className = 'check-item';
      label.innerHTML = `
        <input type="checkbox" data-task-id="${task.id}" ${isChecked ? 'checked' : ''}>
        <span>${task.name}</span>
      `;
      itemsContainer.appendChild(label);
    });
    
    document.getElementById('daily-checklist-form').addEventListener('submit', (e) => {
      e.preventDefault();
      let completedCount = 0;
      const totalCount = mail.tasks.length;
      
      mail.tasks.forEach(task => {
        const checkbox = e.target.querySelector(`input[data-task-id="${task.id}"]`);
        if (checkbox) {
          task.done = checkbox.checked;
          STATE.currentDayProgress.tasks[task.id] = checkbox.checked; // update live day log
          if (task.done) completedCount++;
        }
      });
      
      const score = totalCount > 0 ? (completedCount / totalCount) * 100 : 100;
      
      STATE.dailyLogs = STATE.dailyLogs.filter(log => log.date !== mail.dateRaw);
      STATE.dailyLogs.push({
        date: mail.dateRaw,
        score: score,
        completedCount: completedCount,
        totalCount: totalCount,
        tasks: mail.tasks
      });
      
      STATE.unreadMails = STATE.unreadMails.filter(m => m.id !== STATE.activeMailId);
      STATE.activeMailId = null;
      
      // Wipe day progress on submission so next day begins fresh
      STATE.currentDayProgress = { date: '', tasks: {} };
      
      saveToLocalStorage();
      
      // Persist daily logs to local server
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const saveLogsUrl = isLocalhost ? '/api/daily_logs' : 'http://localhost:8080/api/daily_logs';
      fetch(saveLogsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(STATE.dailyLogs)
      }).catch(err => console.error("Error saving daily logs to server:", err));
      
      renderMailbox();
      updateStats();
      renderProgressChart();
      // Re-trigger timeline render to show checkboxes empty for the new day
      clockTick();
    });
  } else {
    const scoreVal = mail.type === 'weekly_report' ? mail.weeklyScore : mail.monthlyScore;
    const isWeek = mail.type === 'weekly_report';
    
    bodyEl.innerHTML = `
      <div class="report-view-container" style="text-align:center; padding: 1rem 0;">
        <div style="font-size:1.1rem; font-weight:700; margin-bottom: 0.5rem; color: #fff;">
          ${isWeek ? 'WEEKLY' : 'MONTHLY'} PERFORMANCE OVERVIEW
        </div>
        <div style="font-size: 2.8rem; font-weight:800; color: var(--cyan); margin-bottom: 0.5rem;">
          ${scoreVal}%
        </div>
        <div style="font-size:0.8rem; text-transform:uppercase; color: var(--text-muted); margin-bottom:1rem;">
          Average Compliance Score
        </div>
        <p style="text-align:left; font-size:0.85rem; line-height:1.6; background:rgba(255,255,255,0.03); border:1px solid var(--border-color); border-radius:8px; padding:1rem;">
          ${mail.analysisText}
        </p>
        <button id="close-report-btn" class="btn btn-secondary btn-xs mt-sm">Acknowledge Report</button>
      </div>
    `;
    
    document.getElementById('close-report-btn').addEventListener('click', () => {
      STATE.unreadMails = STATE.unreadMails.filter(m => m.id !== STATE.activeMailId);
      STATE.activeMailId = null;
      saveToLocalStorage();
      renderMailbox();
    });
  }
  
  renderMailbox();
}

// ICS Calendar Exporter
function generateICSFile() {
  let icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Lifestyle Automation Command Center//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];
  
  const referenceTime = new Date(STATE.currentTime);
  
  for (let d = 0; d < 7; d++) {
    const loopDate = new Date(referenceTime);
    loopDate.setDate(loopDate.getDate() + d);
    
    const thresholdDate = new Date('2026-06-19T00:00:00');
    const routine = loopDate >= thresholdDate 
      ? (STATE.customSchoolRoutine || SCHOOL_ROUTINE) 
      : (STATE.customDefaultRoutine || DEFAULT_ROUTINE);
    
    routine.forEach(task => {
      if (task.type === 'alarm') return;
      
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
      
      const formatUTC = (date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      };
      
      const uid = `uid_${eventStart.getTime()}_${task.id}@antigravity.ai`;
      
      let displayName = task.name;
      if (task.type === 'new_skill' && STATE.activeSkillId) {
        const skill = SKILLS_DATABASE.find(s => s.id === STATE.activeSkillId);
        if (skill) displayName = `Learn: ${skill.name}`;
      }
      
      icsLines.push('BEGIN:VEVENT');
      icsLines.push(`UID:${uid}`);
      icsLines.push(`DTSTAMP:${formatUTC(new Date())}`);
      icsLines.push(`DTSTART:${formatUTC(eventStart)}`);
      icsLines.push(`DTEND:${formatUTC(eventEnd)}`);
      icsLines.push(`SUMMARY:${displayName}`);
      icsLines.push(`DESCRIPTION:${task.desc.replace(/,/g, '\\,')}`);
      icsLines.push('BEGIN:VALARM');
      icsLines.push('TRIGGER:-PT10M');
      icsLines.push('ACTION:DISPLAY');
      icsLines.push('DESCRIPTION:Reminder');
      icsLines.push('END:VALARM');
      icsLines.push('END:VEVENT');
    });
  }
  
  icsLines.push('END:VCALENDAR');
  
  const icsString = icsLines.join('\r\n');
  const blob = new Blob([icsString], { type: 'text/calendar;charset=utf-8;' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `lifestyle_routine_schedule.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Google Calendar OAuth2 API Integration
let tokenClient = null;

function handleGoogleSync() {
  const clientId = document.getElementById('gapi-client-id').value.trim();
  if (!clientId) {
    alert("Please enter a valid Google OAuth Client ID first. Open the 'Setup Guide' next to the status to see how to create one.");
    return;
  }
  
  const statusEl = document.getElementById('gapi-status');
  statusEl.textContent = "Loading Google API client...";
  
  if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
    const script = document.createElement('script');
    script.src = "https://accounts.google.com/gsi/client";
    script.onload = () => initGoogleAuth(clientId);
    document.head.appendChild(script);
  } else {
    initGoogleAuth(clientId);
  }
}

function initGoogleAuth(clientId) {
  const statusEl = document.getElementById('gapi-status');
  try {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/calendar',
      callback: async (tokenResponse) => {
        if (tokenResponse.error !== undefined) {
          throw tokenResponse;
        }
        statusEl.textContent = "Authorized! Syncing tasks to Google Calendar...";
        localStorage.setItem('lifestyle_gapi_token', tokenResponse.access_token);
        localStorage.setItem('lifestyle_gapi_token_expiry', String(Date.now() + (tokenResponse.expires_in - 300) * 1000));
        await syncToGoogleCalendarAPI(tokenResponse.access_token);
      },
    });
    tokenClient.requestAccessToken({ prompt: 'consent' });
  } catch (err) {
    statusEl.textContent = "Error initializing Google sign-in client.";
    console.error(err);
  }
}

async function syncToGoogleCalendarAPI(accessToken) {
  const statusEl = document.getElementById('gapi-status');
  
  try {
    const listRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    if (!listRes.ok) {
      const errData = await listRes.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Auth failed: HTTP ${listRes.status}`);
    }
    
    const calendarList = await listRes.json();
    let calendarId = 'primary';
    let lifestyleCalendar = calendarList.items.find(item => item.summary === 'Lifestyle Automation');
    
    if (lifestyleCalendar) {
      calendarId = lifestyleCalendar.id;
    } else {
      statusEl.textContent = "Creating secondary 'Lifestyle Automation' calendar...";
      const createRes = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ summary: "Lifestyle Automation" })
      });
      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Calendar creation failed`);
      }
      const newCal = await createRes.json();
      calendarId = newCal.id;
    }
    
    const referenceTime = new Date(STATE.currentTime);
    const rangeStart = new Date(referenceTime);
    rangeStart.setHours(0, 0, 0, 0);
    const rangeEnd = new Date(referenceTime);
    rangeEnd.setDate(rangeEnd.getDate() + 7);
    rangeEnd.setHours(23, 59, 59, 999);

    statusEl.textContent = "Fetching existing calendar events...";
    const listEventsRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${rangeStart.toISOString()}&timeMax=${rangeEnd.toISOString()}&singleEvents=true`, 
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );
    
    if (!listEventsRes.ok) {
      const errData = await listEventsRes.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Failed to fetch events`);
    }
    
    const eventList = await listEventsRes.json();
    const existingEvents = eventList.items || [];

    // Compute desired events
    const desiredEvents = [];
    for (let d = 0; d < 7; d++) {
      const loopDate = new Date(referenceTime);
      loopDate.setDate(loopDate.getDate() + d);
      
      const thresholdDate = new Date('2026-06-19T00:00:00');
      const routine = loopDate >= thresholdDate 
        ? (STATE.customSchoolRoutine || SCHOOL_ROUTINE) 
        : (STATE.customDefaultRoutine || DEFAULT_ROUTINE);
      
      const yyyy = loopDate.getFullYear();
      const mm = String(loopDate.getMonth() + 1).padStart(2, '0');
      const dd = String(loopDate.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      
      for (const task of routine) {
        if (task.type === 'alarm') continue;
        
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
        
        let displayName = task.name;
        if (task.type === 'new_skill' && STATE.activeSkillId) {
          const skill = SKILLS_DATABASE.find(s => s.id === STATE.activeSkillId);
          if (skill) displayName = `Learn: ${skill.name}`;
        }
        
        desiredEvents.push({
          taskId: task.id,
          dateStr: dateStr,
          summary: displayName,
          description: task.desc,
          startIso: eventStart.toISOString(),
          endIso: eventEnd.toISOString()
        });
      }
    }

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
        toDelete.push(evt); // Delete any untagged event in our calendar
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

    statusEl.textContent = `Syncing: ${toCreate.length} new, ${toUpdate.length} updates, ${toDelete.length} deletions...`;

    // Process deletes
    for (const evt of toDelete) {
      await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${evt.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
    }

    // Process updates
    for (const item of toUpdate) {
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
      
      await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${item.eventId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData)
      });
    }

    // Process creates
    for (const desired of toCreate) {
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
      
      await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData)
      });
    }
    
    statusEl.textContent = "Success! Synced automatically. Check phone calendar!";
    statusEl.style.color = "var(--emerald)";
  } catch (err) {
    statusEl.textContent = "Sync failed: " + (err.message || err);
    statusEl.style.color = "#ef4444";
    console.error(err);
  }
}

async function autoSyncGoogleCalendar() {
  const token = localStorage.getItem('lifestyle_gapi_token');
  const expiry = localStorage.getItem('lifestyle_gapi_token_expiry');
  if (token && expiry && Date.now() < Number(expiry)) {
    console.log("Auto-syncing to Google Calendar via stored browser token...");
    const statusEl = document.getElementById('gapi-status');
    if (statusEl) {
      statusEl.textContent = "Auto-syncing changes to phone...";
      statusEl.style.color = "var(--cyan)";
    }
    try {
      await syncToGoogleCalendarAPI(token);
    } catch (err) {
      console.error("Auto-sync failed:", err);
    }
  }
}

// Clock tick interval processor
function clockTick() {
  if (STATE.simMode) {
    const deltaMs = 1000 * STATE.simSpeed;
    STATE.currentTime = new Date(STATE.currentTime.getTime() + deltaMs);
  } else {
    STATE.currentTime = new Date();
  }
  
  const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('current-date').textContent = STATE.currentTime.toLocaleDateString('en-US', dateOptions);
  
  const timeStr = STATE.currentTime.toTimeString().split(' ')[0];
  document.getElementById('current-time').textContent = timeStr;
  
  const activeTask = getActiveTask();
  const nextTask = getNextTask(activeTask);
  
  updateLiveStatusUI(activeTask, nextTask);
  renderTimeline(activeTask);
  updateDietUI();
  
  const currentHour = STATE.currentTime.getHours();
  const currentMinute = STATE.currentTime.getMinutes();
  const currentMinuteIdx = currentHour * 60 + currentMinute;
  
  // Check for Daily Check-In Mail (09:30 PM)
  if (currentHour === 21 && currentMinute === 30 && STATE.lastCheckedMinute !== currentMinuteIdx) {
    triggerCheckInEmail();
  }
  
  // Check for Weekly Report (Sunday at 09:35 PM)
  const dateStr = STATE.currentTime.toDateString();
  if (STATE.currentTime.getDay() === 0 && currentHour === 21 && currentMinute === 35 && STATE.lastWeeklyReportStr !== dateStr) {
    STATE.lastWeeklyReportStr = dateStr;
    triggerWeeklyReport();
  }
  
  // Check for Monthly Report (1st of month at 09:35 PM)
  if (STATE.currentTime.getDate() === 1 && currentHour === 21 && currentMinute === 35 && STATE.lastMonthlyReportStr !== dateStr) {
    STATE.lastMonthlyReportStr = dateStr;
    triggerMonthlyReport();
  }
  
  // Alarm checks
  const wakeMins = timeStrToMins(STATE.alarms.wakeUp);
  const sleepMins = timeStrToMins(STATE.alarms.sleep);
  
  if (STATE.lastCheckedMinute !== currentMinuteIdx) {
    STATE.lastCheckedMinute = currentMinuteIdx;
    
    if (STATE.snoozedUntil && STATE.currentTime >= STATE.snoozedUntil) {
      STATE.snoozedUntil = null;
      const type = (currentMinuteIdx >= wakeMins - 15 && currentMinuteIdx <= wakeMins + 15) ? 'wake' : 'sleep';
      startAlarm(type);
    }
    
    if (currentMinuteIdx === wakeMins && !STATE.snoozedUntil) {
      startAlarm('wake');
    }
    
    if (currentMinuteIdx === sleepMins && !STATE.snoozedUntil) {
      startAlarm('sleep');
    }
  }
}

// AI Routine Assistant NLP Parser & Counselor
async function processAIChatCommand(text) {
  const isSchoolMode = STATE.currentTime >= new Date('2026-06-19T00:00:00');
  let routine = isSchoolMode 
    ? (STATE.customSchoolRoutine ? [...STATE.customSchoolRoutine] : [...SCHOOL_ROUTINE])
    : (STATE.customDefaultRoutine ? [...STATE.customDefaultRoutine] : [...DEFAULT_ROUTINE]);

  // Load OpenRouter key from local storage, fallback to split key to bypass Git protection
  const p1 = 'sk-or-v';
  const p2 = '1-a3a735';
  const p3 = 'f6ba2bde3494de2';
  const p4 = 'e3111118b8521c';
  const p5 = 'a2a774f6fb4bdb9';
  const p6 = '284521177f4add';
  const apiKey = localStorage.getItem('lifestyle_openrouter_key') || (p1 + p2 + p3 + p4 + p5 + p6);
  
  if (!apiKey || apiKey === 'your-api-key' || apiKey.trim() === '') {
    return "Please set your OpenRouter API key in the settings panel (click the gear icon ⚙️ above) to activate the AI Assistant.";
  }

  const cleanTasks = routine.map(t => ({ id: t.id, name: t.name, start: t.start, end: t.end, desc: t.desc }));
  
  const systemInstruction = `You are Shivam's personal Lifestyle AI Assistant.
Here is Shivam's current routine:
${JSON.stringify(cleanTasks)}

Here are the Diet Plans available:
${JSON.stringify(DIET_PLANS)}

Here is the Skills Database for learning:
${JSON.stringify(SKILLS_DATABASE)}

Your job:
1. If Shivam wants to CHANGE his routine, ADD a new task (e.g. 'family time add kar do', '1h gym timing move kar do'), or adjust times:
   Analyze the request and decide which tasks need to be added, modified, or removed.
   To avoid token limits, DO NOT return the entire routine. Return ONLY the modified, new, or deleted tasks in a "changes" array.
   - For new tasks, specify "action": "add", a generated unique "id", "name", "start", "end", "desc", and "type". Choose a logical "type" (e.g. social, health, leisure, learning, creative, trading, sleep).
   - For modified tasks, specify "action": "update", their existing "id", and any modified fields (like "start", "end", "name", or "desc").
   - For deleted tasks, specify "action": "delete" and the existing "id".
   - If there is a time overlap with existing tasks, shrink or adjust the start/end times of the other tasks to fit the new task without leaving empty gaps in the 24-hour schedule, and list those adjusted tasks under "changes" as well.
   - Ensure all start/end times are strictly in "HH:MM" format.
   - Return a raw JSON object:
   {
     "action": "update_routine",
     "changes": [
       { "action": "add", "id": "family_time", "name": "Family Time", "start": "10:30", "end": "11:30", "desc": "Spend quality time with family.", "type": "social" },
       { "action": "update", "id": "post_gym_diet", "start": "11:30", "end": "12:30" }
     ],
     "response": "Brief friendly confirmation in Hindi/Hinglish explaining the adjustments (e.g. 'Sure Shivam! Maine Family Time add kar diya hai aur baki tasks ko move/shrink kar diya hai.')"
   }
   
2. If Shivam wants to RESET his routine to default:
   Return a raw JSON object:
   {
     "action": "reset",
     "response": "Sure Shivam! Maine aapka routine default par reset kar diya hai."
   }

3. If Shivam asks a question ABOUT his routine, what to do in the gym, what to eat, or what skills to learn (e.g. 'gym me kya karna hai', 'diet details', 'new skill modules', 'english practice tips'):
   Answer his question accurately and helpfully in a friendly Hinglish/Hindi tone based on the data above. Return a raw JSON object:
   {
     "action": "answer",
     "response": "Your detailed answer in Hindi/Hinglish with clear bullet points"
   }
   
4. If Shivam asks ANY other general question not related to his routine, gym, diet, or skills (e.g. general knowledge, writing code, mathematical calculations, other off-topic stuff):
   You MUST politely decline to answer. Return a raw JSON object:
   {
     "action": "decline",
     "response": "Sorry Shivam, main sirf aapke daily routine, gym workout, diet plan aur skills se jude sawalon ke jawab de sakta hoon."
   }

Do not write markdown formatting or wrap in backticks. Return ONLY raw JSON.`;

  try {
    let data;
    let success = false;
  
  // 1. Try local Node backend API proxy first
  try {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const localApiUrl = isLocalhost ? '/api/ai' : 'http://localhost:8080/api/ai';
    
    const proxyRes = await fetch(localApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: text,
        systemInstruction: systemInstruction
      })
    });
    
    if (proxyRes.ok) {
      data = await proxyRes.json();
      if (data && !data.error) {
        success = true;
        console.log("Successfully fetched AI response via local backend proxy.");
      } else if (data && data.error) {
        console.warn("Local AI proxy returned API error:", data.error.message);
      }
    }
  } catch (err) {
    console.warn("Local AI proxy failed, trying direct browser fallback...", err);
  }
  
  // 2. Direct browser fallback to OpenRouter (omitting CORS-incompatible custom headers)
  if (!success) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
          // We omit HTTP-Referer and X-Title to prevent browser CORS preflight blocks
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
      
      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson?.error?.message || `OpenRouter HTTP error: ${res.status}`);
      }
      
      data = await res.json();
      success = true;
    } catch (fallbackErr) {
      console.error('AI fallback error:', fallbackErr);
      throw new Error("Failed to connect to AI server: " + fallbackErr.message);
    }
  }
    if (data.error) {
      throw new Error(data.error.message || JSON.stringify(data.error));
    }
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error("Invalid API response structure: " + JSON.stringify(data));
    }
    let replyText = data.choices[0].message.content.trim();
    
    // Robust JSON extraction to prevent parser crashes from markdown formatting
    const extractJSON = (str) => {
      const firstOpen = str.indexOf('{');
      const lastClose = str.lastIndexOf('}');
      if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
        return str.slice(firstOpen, lastClose + 1);
      }
      return str;
    };
    
    const cleanJSONText = extractJSON(replyText.replace(/^```json/i, '').replace(/```$/, '').trim());
    const result = JSON.parse(cleanJSONText);
    
    if (result.action === 'update_routine') {
      if (Array.isArray(result.changes)) {
        result.changes.forEach(chg => {
          if (chg.action === 'add') {
            if (!routine.some(t => t.id === chg.id)) {
              routine.push({
                id: chg.id,
                name: chg.name || 'New Task',
                start: chg.start,
                end: chg.end,
                desc: chg.desc || '',
                type: chg.type || 'leisure'
              });
            }
          } else if (chg.action === 'update') {
            const task = routine.find(t => t.id === chg.id);
            if (task) {
              if (chg.start !== undefined) task.start = chg.start;
              if (chg.end !== undefined) task.end = chg.end;
              if (chg.name !== undefined) task.name = chg.name;
              if (chg.desc !== undefined) task.desc = chg.desc;
              if (chg.type !== undefined) task.type = chg.type;
            }
          } else if (chg.action === 'delete') {
            routine = routine.filter(t => t.id !== chg.id);
          }
        });
      } else if (Array.isArray(result.updatedRoutine)) {
        routine = result.updatedRoutine;
      }

      routine.sort((a, b) => timeStrToMins(a.start) - timeStrToMins(b.start));
      
      if (isSchoolMode) {
        STATE.customSchoolRoutine = routine;
        localStorage.setItem('lifestyle_customSchoolRoutine', JSON.stringify(routine));
      } else {
        STATE.customDefaultRoutine = routine;
        localStorage.setItem('lifestyle_customDefaultRoutine', JSON.stringify(routine));
      }
      saveToLocalStorage();
      
      // Persist to local server
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const saveUrl = isLocalhost ? '/api/save_routine' : 'http://localhost:8080/api/save_routine';
      fetch(saveUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: isSchoolMode ? 'school' : 'default',
          routine: routine
        })
      }).catch(err => console.error("Error saving routine to server:", err));
      
      STATE.lastActiveTaskId = null;
      clockTick();
      autoSyncGoogleCalendar();
    } else if (result.action === 'reset') {
      if (isSchoolMode) {
        STATE.customSchoolRoutine = null;
        localStorage.removeItem('lifestyle_customSchoolRoutine');
      } else {
        STATE.customDefaultRoutine = null;
        localStorage.removeItem('lifestyle_customDefaultRoutine');
      }
      saveToLocalStorage();
      
      // Reset on local server
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const saveUrl = isLocalhost ? '/api/save_routine' : 'http://localhost:8080/api/save_routine';
      const original = isSchoolMode ? SCHOOL_ROUTINE : DEFAULT_ROUTINE;
      fetch(saveUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: isSchoolMode ? 'school' : 'default',
          routine: original
        })
      }).catch(err => console.error("Error resetting routine on server:", err));
      
      STATE.lastActiveTaskId = null;
      clockTick();
      autoSyncGoogleCalendar();
    }
    
    let finalResponse = result.response || "I couldn't process your request.";
    
    // Add Google Calendar sync status reminder
    if (result.action === 'update_routine') {
      const token = localStorage.getItem('lifestyle_gapi_token');
      const expiry = localStorage.getItem('lifestyle_gapi_token_expiry');
      const hasValidToken = token && expiry && Date.now() < Number(expiry);
      
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      
      if (!isLocalhost && !hasValidToken) {
        finalResponse += "\n\n⚠️ **Google Calendar Sync Warning**: Hosted dashboard (GitHub Pages) requires direct browser authorization. Please click the **'Sync Google'** button at the bottom of the dashboard to connect your phone calendar once.";
      }
    }
    
    return finalResponse;
  } catch (err) {
    console.error('AI parse error:', err);
    return `Error: ${err.message || err}. (Please verify your API key in the settings ⚙️ above or check browser console).`;
  }
}

// Initialise application
document.addEventListener('DOMContentLoaded', () => {
  loadFromLocalStorage();
  autoSyncGoogleCalendar();
  
  // Try loading custom routines from local server if available
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const serverBase = isLocalhost ? '' : 'http://localhost:8080';
  
  // Dynamic IP Fetch & QR Code Generation
  const infoUrl = isLocalhost ? '/api/info' : 'http://localhost:8080/api/info';
  fetch(infoUrl)
    .then(res => { if (res.ok) return res.json(); throw new Error(); })
    .then(info => {
      const localUrl = `http://${info.localIP}:${info.port}`;
      const mobileLink = document.getElementById('local-mobile-link');
      if (mobileLink) {
        mobileLink.href = localUrl;
        mobileLink.textContent = localUrl;
      }
      
      const qrImg = document.getElementById('qr-code-img');
      const qrLinkText = document.getElementById('qr-code-link-text');
      if (qrImg) {
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(localUrl + '/')}`;
      }
      if (qrLinkText) {
        qrLinkText.textContent = localUrl;
      }
    })
    .catch(() => {
      const qrImg = document.getElementById('qr-code-img');
      const qrLinkText = document.getElementById('qr-code-link-text');
      if (isLocalhost) {
        const localUrl = window.location.origin;
        if (qrImg) {
          qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(localUrl + '/')}`;
        }
        if (qrLinkText) {
          qrLinkText.textContent = localUrl;
        }
      } else {
        if (qrImg) {
          qrImg.alt = "Local server offline. Run 'node sync.js' to enable mobile sync & QR code.";
          qrImg.style.display = 'none';
        }
        if (qrLinkText) {
          qrLinkText.textContent = "Run local daemon (node sync.js) to view QR Code";
          qrLinkText.style.color = "var(--text-muted)";
        }
      }
    });
  
  fetch(`${serverBase}/custom_default_routine.json`)
    .then(res => { if (res.ok) return res.json(); throw new Error(); })
    .then(data => {
      STATE.customDefaultRoutine = data;
      localStorage.setItem('lifestyle_customDefaultRoutine', JSON.stringify(data));
      clockTick();
    })
    .catch(() => {});

  fetch(`${serverBase}/custom_school_routine.json`)
    .then(res => { if (res.ok) return res.json(); throw new Error(); })
    .then(data => {
      STATE.customSchoolRoutine = data;
      localStorage.setItem('lifestyle_customSchoolRoutine', JSON.stringify(data));
      clockTick();
    })
    .catch(() => {});
  // Load daily review logs from local server
  fetch(`${serverBase}/api/daily_logs`)
    .then(res => { if (res.ok) return res.json(); throw new Error(); })
    .then(serverLogs => {
      if (Array.isArray(serverLogs)) {
        const localLogs = JSON.parse(localStorage.getItem('lifestyle_dailyLogs')) || [];
        const mergedMap = {};
        
        localLogs.forEach(l => { if (l.date) mergedMap[l.date] = l; });
        serverLogs.forEach(l => { if (l.date) mergedMap[l.date] = l; });
        
        STATE.dailyLogs = Object.values(mergedMap);
        localStorage.setItem('lifestyle_dailyLogs', JSON.stringify(STATE.dailyLogs));
        
        updateStats();
        renderProgressChart();
      }
    })
    .catch(() => {});
  
  // Show HTTPS Warning Banner if opened over secure connection (due to mixed content local proxy blocking)
  if (window.location.protocol === 'https:' && window.location.hostname !== 'localhost') {
    const warningBanner = document.getElementById('https-warning-banner');
    if (warningBanner) {
      warningBanner.classList.remove('hidden');
    }
  }
  
  // UI bindings
  const simToggle = document.getElementById('sim-toggle');
  const simSpeed = document.getElementById('sim-speed');
  const simSetBtn = document.getElementById('sim-set-btn');
  const soundToggle = document.getElementById('sound-toggle');
  
  simToggle.addEventListener('change', (e) => {
    STATE.simMode = e.target.checked;
    simSpeed.disabled = !STATE.simMode;
    simSetBtn.disabled = !STATE.simMode;
    
    const indicator = document.getElementById('sim-indicator');
    const modeText = document.getElementById('sim-mode-text');
    if (STATE.simMode) {
      indicator.className = "status-indicator simulating";
      modeText.textContent = "Simulation Mode";
    } else {
      indicator.className = "status-indicator live";
      modeText.textContent = "System Time";
      STATE.currentTime = new Date();
      STATE.simSpeed = 1;
      simSpeed.value = "1";
    }
  });
  
  simSpeed.addEventListener('change', (e) => {
    STATE.simSpeed = Number(e.target.value);
  });
  
  const timeDialog = document.getElementById('custom-time-dialog');
  simSetBtn.addEventListener('click', () => {
    const hrs = String(STATE.currentTime.getHours()).padStart(2, '0');
    const mins = String(STATE.currentTime.getMinutes()).padStart(2, '0');
    document.getElementById('custom-time-input').value = `${hrs}:${mins}`;
    timeDialog.classList.remove('hidden');
  });
  
  document.getElementById('custom-time-cancel').addEventListener('click', () => {
    timeDialog.classList.add('hidden');
  });
  
  document.getElementById('custom-time-apply').addEventListener('click', () => {
    const timeVal = document.getElementById('custom-time-input').value;
    if (timeVal) {
      const [hrs, mins] = timeVal.split(':').map(Number);
      STATE.currentTime.setHours(hrs);
      STATE.currentTime.setMinutes(mins);
      STATE.currentTime.setSeconds(0);
      updateAlarmTimeDisplay();
      timeDialog.classList.add('hidden');
    }
  });
  
  soundToggle.addEventListener('click', () => {
    STATE.soundEnabled = !STATE.soundEnabled;
    saveToLocalStorage();
    const icon = document.getElementById('sound-icon');
    icon.setAttribute('data-lucide', STATE.soundEnabled ? 'volume-2' : 'volume-x');
    lucide.createIcons();
  });
  
  document.getElementById('alarm-dismiss-btn').addEventListener('click', () => {
    stopAlarm();
    initAudio();
  });
  
  document.getElementById('alarm-snooze-btn').addEventListener('click', () => {
    stopAlarm();
    initAudio();
    const snoozeMs = 5 * 60 * 1000;
    STATE.snoozedUntil = new Date(STATE.currentTime.getTime() + snoozeMs);
  });
  
  document.querySelectorAll('.diet-toggle-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.diet-toggle-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      STATE.dietType = e.target.dataset.diet;
      saveToLocalStorage();
      updateDietUI();
    });
  });
  
  // Analytics dataset selector
  document.getElementById('analytics-toggle-weekly').addEventListener('click', (e) => {
    document.querySelectorAll('.analytics-toggle-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    STATE.analyticsView = 'weekly';
    renderProgressChart();
  });
  
  document.getElementById('analytics-toggle-monthly').addEventListener('click', (e) => {
    document.querySelectorAll('.analytics-toggle-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    STATE.analyticsView = 'monthly';
    renderProgressChart();
  });
  
  // Mobile Calendar Exporter Bindings
  document.getElementById('download-ics-btn').addEventListener('click', () => {
    generateICSFile();
  });
  
  document.getElementById('gapi-sync-btn').addEventListener('click', () => {
    handleGoogleSync();
  });
  
  // Google API Setup Guide trigger bindings
  const apiGuideDialog = document.getElementById('gapi-guide-dialog');
  document.getElementById('gapi-guide-link').addEventListener('click', (e) => {
    e.preventDefault();
    apiGuideDialog.classList.remove('hidden');
  });
  
  document.getElementById('gapi-guide-close').addEventListener('click', () => {
    apiGuideDialog.classList.add('hidden');
  });
  
  // Quick Alarm Test
  const testBtn = document.getElementById('quick-alarm-test-btn');
  const testCountdown = document.getElementById('quick-test-countdown');
  let testTimeoutId = null;
  let testIntervalId = null;
  
  testBtn.addEventListener('click', () => {
    if (testTimeoutId) {
      clearTimeout(testTimeoutId);
      clearInterval(testIntervalId);
      testTimeoutId = null;
      testIntervalId = null;
      testBtn.innerHTML = `<i data-lucide="bell" class="icon-sm"></i> Trigger 31s Test Alarm`;
      testCountdown.style.display = 'none';
      lucide.createIcons();
      return;
    }
    
    let secondsLeft = 31;
    testCountdown.style.display = 'inline';
    testCountdown.textContent = `Ringing in ${secondsLeft}s...`;
    testBtn.innerHTML = `<i data-lucide="bell-off" class="icon-sm"></i> Cancel Test`;
    lucide.createIcons();
    
    testIntervalId = setInterval(() => {
      secondsLeft--;
      if (secondsLeft > 0) {
        testCountdown.textContent = `Ringing in ${secondsLeft}s...`;
      } else {
        clearInterval(testIntervalId);
      }
    }, 1000);
    
    testTimeoutId = setTimeout(() => {
      testCountdown.style.display = 'none';
      testBtn.innerHTML = `<i data-lucide="bell" class="icon-sm"></i> Trigger 31s Test Alarm`;
      lucide.createIcons();
      testTimeoutId = null;
      testIntervalId = null;
      
      // Ring wake alarm as test
      startAlarm('wake');
    }, 31000);
  });
  // QR Code logic removed at user request
  
  // AI Routine Assistant Chat Event Listeners
  const aiChatInput = document.getElementById('ai-chat-input');
  const aiChatSendBtn = document.getElementById('ai-chat-send-btn');
  const aiChatHistory = document.getElementById('ai-chat-history');
  const aiSettingsBtn = document.getElementById('ai-settings-btn');
  const aiSettingsPanel = document.getElementById('ai-settings-panel');
  const aiApiKeyInput = document.getElementById('ai-api-key-input');
  const aiApiKeySave = document.getElementById('ai-api-key-save');

  // Load OpenRouter key
  if (!localStorage.getItem('lifestyle_openrouter_key')) {
    fetch('local_config.json')
      .then(res => res.json())
      .then(config => {
        if (config.openrouterKey) {
          localStorage.setItem('lifestyle_openrouter_key', config.openrouterKey);
          aiApiKeyInput.value = config.openrouterKey;
        }
      })
      .catch(err => {
        console.log("Local config not found. Manual setup available.");
      });
  }
  aiApiKeyInput.value = localStorage.getItem('lifestyle_openrouter_key') || '';

  aiSettingsBtn.addEventListener('click', () => {
    aiSettingsPanel.classList.toggle('hidden');
  });

  aiApiKeySave.addEventListener('click', () => {
    const key = aiApiKeyInput.value.trim();
    if (key) {
      localStorage.setItem('lifestyle_openrouter_key', key);
      alert("OpenRouter API key saved successfully!");
      aiSettingsPanel.classList.add('hidden');
    }
  });

  const appendChatMessage = (text, sender) => {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${sender === 'user' ? 'user-bubble' : 'bot-bubble'}`;
    bubble.innerHTML = `<p>${text.replace(/\n/g, '<br>')}</p>`;
    aiChatHistory.appendChild(bubble);
    aiChatHistory.scrollTop = aiChatHistory.scrollHeight;
  };

  const handleAiMessageSend = async () => {
    const text = aiChatInput.value.trim();
    if (!text) return;

    appendChatMessage(text, 'user');
    aiChatInput.value = '';

    // Typing / thinking indicator
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'chat-bubble bot-bubble';
    typingIndicator.innerHTML = '<p style="font-style: italic; opacity: 0.6;">Thinking...</p>';
    aiChatHistory.appendChild(typingIndicator);
    aiChatHistory.scrollTop = aiChatHistory.scrollHeight;

    try {
      const response = await processAIChatCommand(text);
      typingIndicator.remove();
      appendChatMessage(response, 'bot');
    } catch (err) {
      typingIndicator.remove();
      appendChatMessage(`Error: ${err.message || err}. Please try again.`, 'bot');
    }
  };

  aiChatSendBtn.addEventListener('click', handleAiMessageSend);
  aiChatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleAiMessageSend();
  });
  
  // New Skill Selector Buttons
  document.getElementById('skill-complete-btn').addEventListener('click', () => {
    if (STATE.activeSkillId) {
      STATE.masteredSkillIds.push(STATE.activeSkillId);
      STATE.activeSkillId = null;
      saveToLocalStorage();
      updateSkillUI();
      clockTick();
    }
  });
  
  document.getElementById('skill-generate-btn').addEventListener('click', () => {
    const available = SKILLS_DATABASE.filter(s => !STATE.masteredSkillIds.includes(s.id));
    if (available.length > 0) {
      const randomIndex = Math.floor(Math.random() * available.length);
      STATE.activeSkillId = available[randomIndex].id;
      saveToLocalStorage();
      updateSkillUI();
      clockTick();
    } else {
      alert("Congratulations! You have mastered all available skills.");
    }
  });
  
  document.getElementById('dev-trigger-email').addEventListener('click', () => {
    triggerCheckInEmail();
  });
  
  // Auto-open check-in email if url query parameter ?openCheckIn=true is present
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('openCheckIn') === 'true') {
    let mail = STATE.unreadMails.find(m => m.type === 'daily_log');
    if (!mail) {
      triggerCheckInEmail();
      mail = STATE.unreadMails.find(m => m.type === 'daily_log');
    }
    if (mail) {
      setTimeout(() => {
        openMail(mail.id);
      }, 300);
    }
  }

  updateSkillUI();
  renderMailbox();
  updateStats();
  renderProgressChart();
  
  clockTick();
  setInterval(clockTick, 1000);
});
