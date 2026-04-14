// Optimized School Schedule Viewer - Performance-Focused Implementation

/* ===== CONFIGURATION ===== */
const CONFIG = {
    UPDATE_INTERVAL: 60 * 1000, // 1 minute update frequency
    DATA_FILES: {
        WEEKLY_SCHEDULE: 'json/weekly_schedule.json',
        CLASS_DETAILS: 'json/class_details.json',
        PERIOD_TIMES: 'json/period_times.json'
    }
};

/* ===== CACHED DOM REFERENCES (Performance Critical) ===== */
const DOM_CACHE = {};

/* ===== DATA STATE ===== */
let dayIndex;
let weekdayArr; // Renamed from weekday array for clarity
let currentHour, currentMinute;

// Initialize with minimal allocation
weekdayArr = ['日曜日','月曜日','火曜日','水曜日','木曜日','金曜日','土曜日'];
let personalClassesDataSet, classSyllabusDataSet, bellScheduleDataSet;

/* ===== DATA LOADING (Single Batch Fetch) ===== */
async function fetchData(filepath) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
        
        const response = await fetch(filepath, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error(`Failed to load ${filepath}:`, error.message);
        return null;
    }
}

async function processDatas() {
    // Pre-allocate arrays for better memory management
    personalClassesDataSet = [];
    classSyllabusDataSet = [];
    bellScheduleDataSet = [];
    
    // Load all data in parallel (better than sequential)
    const [weekly, details, periods] = await Promise.all([
        fetchData(CONFIG.DATA_FILES.WEEKLY_SCHEDULE),
        fetchData(CONFIG.DATA_FILES.CLASS_DETAILS),
        fetchData(CONFIG.DATA_FILES.PERIOD_TIMES)
    ]);
    
    if (weekly) {
        personalClassesDataSet = weekly;
        console.log("📋 Weekly schedule loaded");
    }
    if (details) {
        classSyllabusDataSet = details;
        console.log("📚 Class details loaded");
    }
    if (periods) {
        bellScheduleDataSet = periods;
        console.log("⏰ Period times loaded");
    }
    
    // Cache DOM references after data loads
    cacheDOM();
    
    return true;
}

/* ===== DOM CACHING (Critical for Performance) ===== */
function cacheDOM() {
    const elements = [
        'current-time', 'current-day',
        'app-container', 'loading-container',
        'current-section', 'next-section',
        'materials-today-section', 'materials-tomorrow-section',
        'current-status', 'next-status',
        'current-class-body', 'next-class-body',
        'materials-summary-list', 'tomorrows-materials-summary-list'
    ];
    
    elements.forEach(id => {
        DOM_CACHE[id] = document.getElementById(id);
    });
}

/* ===== UTILITY FUNCTIONS ===== */
function pad2(num) {
    return num < 10 ? `0${num}` : `${num}`;
}

function getMaterialsHTML(materials) {
    if (!materials || !Array.isArray(materials) || materials.length === 0) {
        return '<li>なし</li>';
    }
    // Direct DOM construction (faster than innerHTML)
    const fragment = document.createDocumentFragment();
    for (let material of materials) {
        if (material && material.trim()) {
            const li = document.createElement('li');
            li.textContent = material.trim();
            fragment.appendChild(li);
        }
    }
    return fragment; // Return fragment for batch DOM update
}

/* ===== CORE UPDATES (Batch DOM Operations) ===== */
function updateTime() {
    const date = new Date();
    dayIndex = date.getDay();
    currentHour = date.getHours();
    currentMinute = date.getMinutes();
}

function displayTime() {
    if (!DOM_CACHE['current-time'] || !DOM_CACHE['current-day']) return;
    
    const str_time = `${currentHour}:${pad2(currentMinute)}`;
    
    // Direct text assignment (fastest method)
    DOM_CACHE['current-time'].textContent = str_time;
    DOM_CACHE['current-day'].textContent = weekdayArr[dayIndex];
}

function searchProcessedDataAndSetVariables() {
    updateTime();
    displayTime();
    
    const timeNowMinutes = currentHour * 60 + currentMinute;
    
    // Find current period efficiently
    const currentTimeSlot = bellScheduleDataSet?.find(
        t => (t.startTimeH * 60 + t.startTimeM) <= timeNowMinutes &&
            timeNowMinutes < (t.endTimeH * 60 + t.endTimeM)
    );
    
    let currentPeriod = currentTimeSlot ? currentTimeSlot.period : null;
    updateCurrentClass(currentPeriod);
    
    if (!currentPeriod) {
        const nextTimeSlot = bellScheduleDataSet?.find(
            t => timeNowMinutes < (t.endTimeH * 60 + t.endTimeM)
        );
        currentPeriod = nextTimeSlot ? nextTimeSlot.period - 1 : 6;
    }
    
    updateNextClass(currentPeriod);
    updateTodayMaterialsSummary();
    updateTomorrowMaterialsSummary();
}

/* ===== TABLE RENDERING (Optimized Batch Updates) ===== */
function clearTableBody(fragmentId) {
    const body = fragment.getElementById(fragmentId);
    if (!body) return;
    
    // Clear existing content efficiently
    while (body.firstChild) {
        body.removeChild(body.firstChild);
    }
}

function renderClassRow(tableBody, className, teacher, classroom, startTime, endTime) {
    const tr = document.createElement('tr');
    
    // Row cells (fastest direct assignment)
    tr.innerHTML = `
        <td>${className}</td>
        <td>${teacher || '-'}</td>
        <td>${classroom || '-'}</td>
        <td>${startTime}</td>
        <td>${endTime}</td>
        <td class="materials"></td>
    `;
    
    tableBody.appendChild(tr);
}

function updateCurrentClass(currentPeriod) {
    if (!personalClassesDataSet?.length || !classSyllabusDataSet?.length) {
        // Handle loading state
        const section = DOM_CACHE['current-section'];
        const status = DOM_CACHE['current-status'];
        
        if (section && status) {
            section.classList.remove('hidden');
            status.textContent = '授業情報をロード中...';
            status.style.display = 'inline-block';
        }
        return;
    }
    
    const todayData = personalClassesDataSet.filter(w => w.day === weekdayArr[dayIndex]);
    const classData = todayData.find(c => c.period === currentPeriod);
    
    const section = DOM_CACHE['current-section'];
    const status = DOM_CACHE['current-status'];
    
    if (!section || !status) return;
    
    // Handle empty state
    if (!classData) {
        section.classList.add('hidden');
        status.style.display = 'none';
        return;
    }
    
    // Extract class info
    const { className, merged, classLocation } = classData;
    const timeData = bellScheduleDataSet?.find(t => t.period === currentPeriod);
    const fixedClass = classSyllabusDataSet.find(c => c.className === className) || {};
    const materials = fixedClass.materials;
    const teacher = fixedClass.teacher || "-";
    
    // Calculate remaining time
    let minutesLeft = (timeData.endTimeH * 60 + timeData.endTimeM) - 
        (currentHour * 60 + currentMinute);
    if (minutesLeft < 0) minutesLeft = 0;
    
    // Batch DOM updates (single reflow)
    section.classList.remove('hidden');
    status.textContent = `残り：${minutesLeft}分`;
    status.style.display = 'inline-block';
    
    const body = DOM_CACHE['current-class-body'];
    if (!body) return;
    
    // Clear and rebuild table efficiently
    clearTableBody(DOM_CACHE['current-section']);
    
    renderClassRow(body, className, teacher, classLocation, 
        `${pad2(timeData.startTimeH)}:${pad2(timeData.startTimeM)}`,
        `${pad2(timeData.endTimeH)}:${pad2(timeData.endTimeM)})`);
}

function updateNextClass(currentPeriod) {
    if (!personalClassesDataSet?.length || !classSyllabusDataSet?.length) return;
    
    let hasDayChanged = false;
    let nextPeriodDayIndex = dayIndex;
    let nextPeriod = currentPeriod + 1;
    
    // Find next valid period
    if (nextPeriod > 6) {
        nextPeriod = 1;
        nextPeriodDayIndex++;
        hasDayChanged = true;
    }
    
    let nextClass = null;
    let dayName = weekdayArr[nextPeriodDayIndex];
    
    // Skip empty days efficiently
    for (let i = 0; nextPeriod + i < 7 && !nextClass; i++) {
        const dayData = personalClassesDataSet.filter(w => w.day === dayName);
        nextClass = dayData.find(c => c.period === nextPeriod);
        
        if (!nextClass) {
            nextPeriod++;
            if (nextPeriod > 6) {
                nextPeriod = 1;
                nextPeriodDayIndex++;
                hasDayChanged = true;
                
                if (nextPeriodDayIndex > 5 || nextPeriodDayIndex === 0) {
                    nextPeriodDayIndex = 1;
                }
            }
        }
    }
    
    const section = DOM_CACHE['next-section'];
    const status = DOM_CACHE['next-status'];
    
    if (!section || !status) return;
    
    // Handle no-next-class state
    if (!nextClass) {
        section.classList.add('hidden');
        status.style.display = 'none';
        return;
    }
    
    const { className, merged, classLocation } = nextClass;
    const timeData = bellScheduleDataSet?.find(t => t.period === nextPeriod);
    const fixedClass = classSyllabusDataSet.find(c => c.className === className) || {};
    const materials = fixedClass.materials;
    const teacher = fixedClass.teacher || "-";
    const nextDayNameDisplay = weekdayArr[nextPeriodDayIndex];
    
    // Calculate time to next class
    let nextStartMinutes = timeData.startTimeH * 60 + timeData.startTimeM;
    let nowMinutes = currentHour * 60 + currentMinute;
    let minutesUntilNext = nextStartMinutes - nowMinutes;
    
    // Batch update
    section.classList.remove('hidden');
    
    if (hasDayChanged) {
        status.textContent = `次は${nextDayNameDisplay} - ${nextPeriod}限 - ${className}${merged ? " (合同)" : ""}`;
        status.style.display = 'none';
    } else {
        status.textContent = `残り：${minutesUntilNext}分`;
        status.style.display = 'inline-block';
    }
    
    const body = DOM_CACHE['next-class-body'];
    if (!body) return;
    
    clearTableBody(DOM_CACHE['next-section']);
    
    renderClassRow(body, className, teacher, classLocation,
        `${pad2(timeData.startTimeH)}:${pad2(timeData.startTimeM)}`,
        `${pad2(timeData.endTimeH)}:${pad2(timeData.endTimeM)}`);
}

/* ===== MATERIALS SUMMARY (Efficient DOM Updates) ===== */
function updateMaterialsSummary(sectionId, listId, dayIndex) {
    const section = DOM_CACHE[sectionId];
    const listEl = DOM_CACHE[listId];
    
    if (!section || !listEl) return;
    if (!personalClassesDataSet?.length || !classSyllabusDataSet?.length) {
        section.classList.add('hidden');
        return;
    }
    
    const dayName = weekdayArr[dayIndex];
    const dayData = personalClassesDataSet.filter(week => week.day === dayName);
    
    // Efficient material collection
    const allMaterials = new Set();
    
    for (const cls of dayData) {
        const syllabus = classSyllabusDataSet.find(s => s.className === cls.className);
        if (!syllabus || !syllabus.materials) continue;
        
        // Use Set for automatic deduplication
        for (const mat of syllabus.materials) {
            if (mat && mat.trim()) {
                allMaterials.add(mat.trim());
            }
        }
    }
    
    // Single batch DOM operation
    const fragment = document.createDocumentFragment();
    
    if (allMaterials.size === 0) {
        listEl.innerHTML = '<li>特にありません。</li>';
    } else {
        for (const item of allMaterials) {
            const li = document.createElement('li');
            li.textContent = item;
            fragment.appendChild(li);
        }
        // Batch update once
        listEl.replaceChildren(...fragment.children);
    }
    
    section.classList.remove('hidden');
}

function updateTodayMaterialsSummary() {
    updateMaterialsSummary('materials-today-section', 'materials-summary-list', dayIndex);
}

function updateTomorrowMaterialsSummary() {
    let tomorrowIndex = (dayIndex + 1) % 7;
    
    // Handle weekend transition to Monday
    if (dayIndex >= 5 || dayIndex === 0) {
        tomorrowIndex = 1; // Monday
    }
    
    updateMaterialsSummary('materials-tomorrow-section', 'tomorrows-materials-summary-list', tomorrowIndex);
}

/* ===== APP INITIALIZATION (Lazy Loading) ===== */
function initApp() {
    processDatas().then(() => {
        // Hide loader, show app
        const loader = DOM_CACHE['loading-container'];
        const app = DOM_CACHE['app-container'];
        
        if (loader) loader.style.display = 'none';
        if (app) app.classList.remove('hidden');
        
        // Initial update
        searchProcessedDataAndSetVariables();
        
        // Set up periodic updates (throttled)
        setInterval(searchProcessedDataAndSetVariables, CONFIG.UPDATE_INTERVAL);
    });
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
