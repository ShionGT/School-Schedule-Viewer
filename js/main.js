// time and global variables
let dayIndex;
let str_day, str_time;
let currentHour, currentMinute;

const weekday = [
    '日曜日',
    '月曜日',
    '火曜日',
    '水曜日',
    '木曜日',
    '金曜日',
    '土曜日'
];

let personalClassesDataSet, classSyllabusDataSet, bellScheduleDataSet;

// generic fetch function
async function fetchData(filepath) {
    try {
        const response = await fetch(filepath);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        return null;
    }
}

// load all JSON data
async function processDatas() {
    personalClassesDataSet = await fetchData('json/weekly_schedule.json');
    console.log("weekly_schedule.json loaded");

    classSyllabusDataSet = await fetchData('json/class_details.json');
    console.log("class_details.json loaded");

    bellScheduleDataSet = await fetchData('json/period_times.json');
    console.log("period_times.json loaded");
}

// update time
function updateTime() {
    const date = new Date();
    dayIndex = date.getDay();
    str_day = weekday[dayIndex];
    currentHour = date.getHours();
    currentMinute = date.getMinutes();
    str_time = `${currentHour}:${currentMinute < 10 ? '0' + currentMinute : currentMinute}`;
}

// display current day/time
function displayTime() {
    document.getElementById('current-time').innerText = '時刻：' + str_time;
    document.getElementById('current-day').innerText = '曜日：' + str_day;
}

// find current and next classes
function searchProcessedDataAndSetVariables() {
    console.log("Updating class information...");

    updateTime();
    displayTime();

    const timeNowMinutes = currentHour * 60 + currentMinute;
    const currentTimeSlot = bellScheduleDataSet.find(
        t => t.startTimeH * 60 + t.startTimeM <= timeNowMinutes &&
            timeNowMinutes < t.endTimeH * 60 + t.endTimeM
    );

    let currentPeriod = currentTimeSlot ? currentTimeSlot.period : null;
    updateCurrentClass(currentPeriod);
    if (!currentPeriod) {
        // If no current class, determine next period based on time
        const nextTimeSlot = bellScheduleDataSet.find(
            t => timeNowMinutes < t.endTimeH * 60 + t.endTimeM
        );
        currentPeriod = nextTimeSlot ? nextTimeSlot.period - 1 : 6; // set to last period if none found
    }
    updateNextClass(currentPeriod);
    updateTodayMaterialsSummary();
    updateTomorrowMaterialsSummary();

    console.log("Update completed.");
}

// update current class info
function updateCurrentClass(period) {
    const todayData = personalClassesDataSet.filter(w => w.day === weekday[dayIndex]);
    const classData = todayData.find(c => c.period === period);

    if (!classData) {
        document.getElementById('current-subject-title').innerText = "現在授業なし";
        return;
    }

    // extract class info
    const { className, merged, classLocation } = classData;
    const timeData = bellScheduleDataSet.find(t => t.period === period);
    const fixedClass = classSyllabusDataSet.find(c => c.className === className) || {};
    const materials = fixedClass.materials?.length ? fixedClass.materials.join('、') : "なし";
    const teacher = fixedClass.teacher || "なし";

    // remaining time
    let minutesLeft = (timeData.endTimeH * 60 + timeData.endTimeM) - (currentHour * 60 + currentMinute);
    if (minutesLeft < 0) minutesLeft = 0;

    document.getElementById('current-subject-title').innerText =
        `現在${period}限 - ${className}${merged ? " (合同)" : ""}`;
    document.getElementById('current-subject-time-left').innerText =
        `残り：${minutesLeft}分`;

    document.getElementById('current-subject').innerText = className;
    document.getElementById('current-teacher').innerText = teacher;
    document.getElementById('current-classroom').innerText = classLocation;
    document.getElementById('current-class-start').innerText =
        `${timeData.startTimeH}:${timeData.startTimeM.toString().padStart(2, '0')}`;
    document.getElementById('current-class-end').innerText =
        `${timeData.endTimeH}:${timeData.endTimeM.toString().padStart(2, '0')}`;
    document.getElementById('current-materials').innerText = materials;
}

function updateNextClass(currentPeriod) {
    let hasDayChanged = false;
    let nextPeriodDayIndex = dayIndex;
    let nextPeriod = currentPeriod + 1;

    // if next period is out of regular period times start from 1st period
    if (nextPeriod > 6) {
        nextPeriod = 1;
        // also move to next day
        nextPeriodDayIndex++;
        hasDayChanged = true;
    }

    // Try finding the next valid class
    let nextClass = null;
    let dayName = weekday[nextPeriodDayIndex];

    // If no class found for that period (e.g., day off), keep advancing
    for (let i = 0; nextPeriod+i < 7 && !nextClass; i++) {
        const dayData = personalClassesDataSet.filter(w => w.day === dayName);
        nextClass = dayData.find(c => c.period === nextPeriod);

        // Move to next period/day if not found
        if (!nextClass) {
            nextPeriod++;
            if (nextPeriod > 6) {
                nextPeriod = 1;
                nextPeriodDayIndex++;
                hasDayChanged = true;
                // Skip Saturday/Sunday -> next Monday
                if (nextPeriodDayIndex > 5 || nextPeriodDayIndex === 0) nextPeriodDayIndex = 1;
            }
        }
    }

    // If still not found, show fallback
    if (!nextClass) {
        document.getElementById('next-subject-title').innerText = "次の授業はありません";
        return;
    }

    // extract class info
    const { className, merged, classLocation } = nextClass;
    const timeData = bellScheduleDataSet.find(t => t.period === nextPeriod);
    const fixedClass = classSyllabusDataSet.find(c => c.className === className) || {};
    const materials = fixedClass.materials?.length ? fixedClass.materials.join('、') : "なし";
    const teacher = fixedClass.teacher || "なし";
    const nextDayNameDisplay = weekday[nextPeriodDayIndex];

    // calculate time difference safely
    let nextStartMinutes = timeData.startTimeH * 60 + timeData.startTimeM;
    let nowMinutes = currentHour * 60 + currentMinute;
    let minutesUntilNext = nextStartMinutes - nowMinutes;

    // --- UI update ---
    if (hasDayChanged) {
        document.getElementById('next-subject-title').innerText =
            `次は${nextDayNameDisplay} - ${nextPeriod}限 - ${className}${merged ? " (合同)" : ""}`;
        document.getElementById('next-subject-time-left').innerText = "";
    } else {
        document.getElementById('next-subject-title').innerText =
            `次は${nextPeriod}限 - ${className}${merged ? " (合同)" : ""}`;
        document.getElementById('next-subject-time-left').innerText =
            `残り：${minutesUntilNext}分`;
    }

    document.getElementById('next-subject').innerText = className;
    document.getElementById('next-teacher').innerText = teacher;
    document.getElementById('next-classroom').innerText = classLocation;
    document.getElementById('next-class-start').innerText =
        `${timeData.startTimeH}:${String(timeData.startTimeM).padStart(2, '0')}`;
    document.getElementById('next-class-end').innerText =
        `${timeData.endTimeH}:${String(timeData.endTimeM).padStart(2, '0')}`;
    document.getElementById('next-materials').innerText = materials;
}

function updateTodayMaterialsSummary() {
    // --- Determine today's data ---
    const todayData = personalClassesDataSet.filter(week => week.day === str_day);

    let allMaterials = [];

    // collect materials from all classes
    todayData.forEach(cls => {
        const syllabus = classSyllabusDataSet.find(s => s.className === cls.className);
        if (!syllabus) return;

        const mats = syllabus.materials;

        // Handle both array and string cases safely
        if (Array.isArray(mats)) {
            allMaterials.push(...mats.filter(m => m && m.trim() !== ""));
        } else if (typeof mats === "string" && mats.trim() !== "") {
            // Split string into multiple materials if separated
            allMaterials.push(
                ...mats.split(/[、・,]/).map(m => m.trim()).filter(m => m)
            );
        }

        // Remove any duplicates
        const uniqueMaterials = [...new Set(allMaterials)];

        // update display
        const listEl = document.getElementById("materials-summary-list");

        listEl.innerHTML = "";

        if (uniqueMaterials.length === 0) {
            listEl.innerHTML = "<li>特にありません。</li>";
        } else {
            uniqueMaterials.forEach(item => {
                const li = document.createElement("li");
                li.textContent = item;
                listEl.appendChild(li);
            });
        }
    });
}


function updateTomorrowMaterialsSummary() {
    // target new dayIndex to tomorrow
    let tomorrowIndex = dayIndex + 1;

    // If today is Friday (5), Saturday (6), or Sunday (0) → show Monday (1)
    if (dayIndex >= 5 || dayIndex === 0) {
        tomorrowIndex = 1; // Monday
    } else if (tomorrowIndex > 6) {
        tomorrowIndex = 1; // wrap around from Sunday to Monday
    }

    const upcomingDay = weekday[tomorrowIndex];
    const dayData = personalClassesDataSet.filter(week => week.day === upcomingDay);

    let allMaterials = [];

    // Collect materials from all classes
    dayData.forEach(cls => {
        const syllabus = classSyllabusDataSet.find(s => s.className === cls.className);
        if (!syllabus) return;

        const mats = syllabus.materials;

        // Handle both array and string cases safely
        if (Array.isArray(mats)) {
            allMaterials.push(...mats.filter(m => m && m.trim() !== ""));
        } else if (typeof mats === "string" && mats.trim() !== "") {
            // Split string into multiple materials if separated
            allMaterials.push(
                ...mats.split(/[、・,]/).map(m => m.trim()).filter(m => m)
            );
        }
    });

    // Remove any duplicates
    const uniqueMaterials = [...new Set(allMaterials)];

    // Update display
    document.getElementById("tomorrows-materials-summary-title").innerText = `${upcomingDay}の持ち物一覧`;
    const listEl = document.getElementById("tomorrows-materials-summary-list");

    listEl.innerHTML = "";

    if (uniqueMaterials.length === 0) {
        listEl.innerHTML = "<li>特にありません。</li>";
    } else {
        uniqueMaterials.forEach(item => {
            const li = document.createElement("li");
            li.textContent = item;
            listEl.appendChild(li);
        });
    }
}



// initialize everything
processDatas().then(() => {
    searchProcessedDataAndSetVariables();
    setInterval(searchProcessedDataAndSetVariables, 1000 * 60); // update every minute
});
