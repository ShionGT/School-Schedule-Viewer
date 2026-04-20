// ===== Optimized School Schedule Viewer (Refactored + Fixed Time Logic) =====

/* ===== CONFIG ===== */
const CONFIG = {
  UPDATE_INTERVAL: 60 * 1000,
  DATA_FILES: {
    WEEKLY_SCHEDULE: "json/weekly_schedule.json",
    CLASS_DETAILS: "json/class_details.json",
    PERIOD_TIMES: "json/period_times.json",
  },
};

/* ===== GLOBAL STATE ===== */
const DOM_CACHE = {};
let weekdayArr = [
  "日曜日",
  "月曜日",
  "火曜日",
  "水曜日",
  "木曜日",
  "金曜日",
  "土曜日",
];

let personalClassesDataSet = [];
let classSyllabusDataSet = [];
let bellScheduleDataSet = [];

let currentHour = 0;
let currentMinute = 0;
let dayIndex = 0;

/* ===== FETCH ===== */
async function fetchData(filepath) {
  try {
    const res = await fetch(filepath);
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch (e) {
    console.error(`❌ Failed to load ${filepath}`, e);
    return null;
  }
}

/* ===== INIT ===== */
async function processDatas() {
  const [weekly, details, periods] = await Promise.all([
    fetchData(CONFIG.DATA_FILES.WEEKLY_SCHEDULE),
    fetchData(CONFIG.DATA_FILES.CLASS_DETAILS),
    fetchData(CONFIG.DATA_FILES.PERIOD_TIMES),
  ]);

  personalClassesDataSet = weekly || [];
  classSyllabusDataSet = details || [];
  bellScheduleDataSet = periods || [];

  cacheDOM();
}

/* ===== DOM CACHE ===== */
function cacheDOM() {
  [
    "current-time",
    "current-day",
    "current-section",
    "next-section",
    "current-status",
    "next-status",
    "current-class-body",
    "next-class-body",
    "materials-today-section",
    "materials-tomorrow-section",
    "materials-summary-list",
    "tomorrows-materials-summary-list",
    "loading-container",
    "app-container",
  ].forEach((id) => {
    DOM_CACHE[id] = document.getElementById(id);
  });
}

/* ===== HELPERS ===== */
const pad2 = (n) => n.toString().padStart(2, "0");

function clearTableBody(el) {
  if (!el) return;
  el.replaceChildren();
}

function getClassInfo(name) {
  return classSyllabusDataSet.find((c) => c.className === name) || {};
}

function getTodayClasses(dayName) {
  return personalClassesDataSet.filter((c) => c.day === dayName);
}

/* ===== TIME ===== */
function updateTime() {
  now = new Date();
  dayIndex = now.getDay();
  currentHour = now.getHours();
  currentMinute = now.getMinutes();
}

function displayTime() {
  DOM_CACHE["current-time"].textContent =
    `${currentHour}:${pad2(currentMinute)}`;
  DOM_CACHE["current-day"].textContent = weekdayArr[dayIndex];
}

/* ===== CORE ===== */
function getCurrentPeriod() {
  const nowMin = currentHour * 60 + currentMinute;

  const slot = bellScheduleDataSet.find((t) => {
    const start = t.startTimeH * 60 + t.startTimeM;
    const end = t.endTimeH * 60 + t.endTimeM;
    return start <= nowMin && nowMin < end;
  });

  return slot ? slot.period : null;
}

function getNextPeriod(period) {
  let nextPeriod = 0;
  let nextDay = dayIndex;

  // retrieve period if no period
  if (!period) {
    period = 0;

    for (let i = bellScheduleDataSet.length - 1; 0 <= i; i--) {
      let data = bellScheduleDataSet[i];
      if (data.startTimeH < currentHour) {
        period = data.period;
        break;
      } else if (
        data.startTimeH == currentHour &&
        data.startTimeM < currentMinute
      ) {
        period = data.period;
        break;
      }
    }
  }

  nextPeriod = period + 1;

  if (nextPeriod > 6) {
    nextPeriod = 1;
    nextDay++;
    if (nextDay > 5 || nextDay === 0) nextDay = 1;
  }

  return { nextPeriod, nextDay };
}

/* ===== RENDER ===== */
function renderClassRow(body, data, timeData) {
  const { className, classLocation } = data;
  const { teacher = "-" } = getClassInfo(className);

  const tr = document.createElement("tr");
  tr.innerHTML = `
        <td>${className}</td>
        <td>${teacher}</td>
        <td>${classLocation || "-"}</td>
        <td>${pad2(timeData.startTimeH)}:${pad2(timeData.startTimeM)}</td>
        <td>${pad2(timeData.endTimeH)}:${pad2(timeData.endTimeM)}</td>
    `;

  body.appendChild(tr);
}

/* ===== CURRENT CLASS ===== */
function updateCurrentClass(period) {
  const section = DOM_CACHE["current-section"];
  const status = DOM_CACHE["current-status"];
  const body = DOM_CACHE["current-class-body"];

  if (!period) {
    section.classList.add("hidden");
    return;
  }

  const today = getTodayClasses(weekdayArr[dayIndex]);
  const cls = today.find((c) => c.period === period);
  const timeData = bellScheduleDataSet.find((t) => t.period === period);

  if (!cls || !timeData) {
    section.classList.add("hidden");
    return;
  }

  const nowMin = currentHour * 60 + currentMinute;
  const endMin = timeData.endTimeH * 60 + timeData.endTimeM;

  const remaining = Math.max(0, endMin - nowMin);

  section.classList.remove("hidden");
  status.textContent = `残り：${remaining}分`;

  clearTableBody(body);
  renderClassRow(body, cls, timeData);
}

/* ===== NEXT CLASS (FIXED MULTI-DAY COUNTDOWN) ===== */
function updateNextClass(period) {
  const section = DOM_CACHE["next-section"];
  const status = DOM_CACHE["next-status"];
  const body = DOM_CACHE["next-class-body"];

  let { nextPeriod, nextDay } = getNextPeriod(period);
  let classData = personalClassesDataSet.find(
    (d) => d.period === nextPeriod && d.day === weekdayArr[nextDay],
  );
  // added count for safety
  let count = 0;
  while (!classData) {
    if (500 <= count) {
      console.warn("next class is not found in the next 500 periods!");
      break;
    }
    nextDay = getNextPeriod(nextPeriod).nextDay;
    nextPeriod = getNextPeriod(nextPeriod).nextPeriod;
    classData = personalClassesDataSet.find(
      (d) => d.period === nextPeriod && d.day === weekdayArr[nextDay],
    );
    count++;
  }

  const timeData = bellScheduleDataSet.find((t) => t.period === nextPeriod);
  let totalMinutes =
    (nextDay - dayIndex) * 24 * 60 +
    (timeData.startTimeH - currentHour) * 60 +
    (timeData.startTimeM - currentMinute);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  // ===== DISPLAY =====
  section.classList.remove("hidden");

  if (days > 0) {
    status.textContent = `あと ${days}日 ${hours}時間 ${minutes}分`;
  } else if (hours > 0) {
    status.textContent = `あと ${hours}時間 ${minutes}分`;
  } else {
    status.textContent = `あと ${minutes}分`;
  }

  // Optional: show exact next class time
  status.textContent += ` (${classData.day} ${pad2(timeData.startTimeH)}:${pad2(timeData.startTimeM)})`;

  clearTableBody(body);
  renderClassRow(body, classData, timeData);
}

/* ===== MATERIALS ===== */
function updateMaterialsSummary(sectionId, listId, targetDayIndex) {
  const section = DOM_CACHE[sectionId];
  const list = DOM_CACHE[listId];

  const dayName = weekdayArr[targetDayIndex];
  const classes = getTodayClasses(dayName);

  const set = new Set();

  classes.forEach((cls) => {
    const info = getClassInfo(cls.className);
    (info.materials || []).forEach((m) => {
      if (m?.trim()) set.add(m.trim());
    });
  });

  clearTableBody(list);

  if (set.size === 0) {
    list.innerHTML = "<li>特にありません。</li>";
  } else {
    const frag = document.createDocumentFragment();
    set.forEach((m) => {
      const li = document.createElement("li");
      li.textContent = m;
      frag.appendChild(li);
    });
    list.appendChild(frag);
  }

  section.classList.remove("hidden");
}

function updateTodayMaterialsSummary() {
  updateMaterialsSummary(
    "materials-today-section",
    "materials-summary-list",
    dayIndex,
  );
}

function updateTomorrowMaterialsSummary() {
  let t = (dayIndex + 1) % 7;
  if (dayIndex >= 5 || dayIndex === 0) t = 1;
  updateMaterialsSummary(
    "materials-tomorrow-section",
    "tomorrows-materials-summary-list",
    t,
  );
}

/* ===== MAIN LOOP ===== */
function updateAll() {
  updateTime();
  displayTime();

  const currentPeriod = getCurrentPeriod();

  updateCurrentClass(currentPeriod);
  updateNextClass(currentPeriod);

  updateTodayMaterialsSummary();
  updateTomorrowMaterialsSummary();
}

/* ===== START ===== */
async function initApp() {
  await processDatas();

  DOM_CACHE["loading-container"]?.remove();
  DOM_CACHE["app-container"]?.classList.remove("hidden");

  updateAll();
  setInterval(updateAll, CONFIG.UPDATE_INTERVAL);
}

document.readyState === "loading"
  ? document.addEventListener("DOMContentLoaded", initApp)
  : initApp();
