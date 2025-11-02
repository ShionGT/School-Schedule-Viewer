// time variables
var dayIndex;
var str_day, str_time;
var currentHour, currentMinute;
var weekday = [
    '日曜日',
    '月曜日',
    '火曜日',
    '水曜日',
    '木曜日',
    '金曜日',
    '土曜日'
]
var isOutSideClassTime = false;

// varibales to store json data
var personalClassesDataSet, classSyllabusDataSet, bellScheduleDataSet;


// fetch data function
async function fetchData(filepath) {
    try {
        const response = await fetch(filepath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const jsonData = await response.json(); // Parse the JSON data
        // returns the data
        return jsonData;
    } catch (error) {
        console.error('Error fetching data:', error);
        return null;
    }
}


// process all json files function
async function processDatas() {
    try {
        personalClassesDataSet = await fetchData('json/weekly_schedule.json')
        console.log("weekly_schedule.json loaded.")

        classSyllabusDataSet = await fetchData('json/class_details.json')
        console.log("class_details.json loaded.")

        bellScheduleDataSet = await fetchData('json/period-times.json');
        console.log("period-times.json loaded.");
    } catch (error) {
        console.error('An error occurred during data processing:', error);
    }
}

// search datas and set variables
function searchProcessedDataAndSetVariables() {
    // get live time
    updateTime();
    // displays time here
    displayTime();

    let currentPeriod = 0;
    const timeNowMinutes = currentHour * 60 + currentMinute;
    const currentTimeSheetData = bellScheduleDataSet.find(time => (time.startTimeH * 60 + time.startTimeM) <= (timeNowMinutes) && (timeNowMinutes) < (time.endTimeH * 60 + time.endTimeM));

    if (currentTimeSheetData != undefined) {
        currentPeriod = currentTimeSheetData.period;
        updateCurrentClass(currentPeriod);
    }
    updateNextClass(currentPeriod);
}


// update time function
function updateTime() {
    let date = new Date();
    dayIndex = date.getDay();
    str_day = weekday[dayIndex]

    // get hours and minutes
    currentHour = date.getHours();
    currentMinute = date.getMinutes();
    str_time = currentHour + ':' + ((currentMinute < 10) ? ('0' + currentMinute) : (String)(currentMinute));
}

// display time
function displayTime() {
    // display time
    document.getElementById('current-time').innerText = '時刻：' + str_time;
    document.getElementById('current-day').innerText = '曜日：' + str_day;
}

function updateCurrentClass(period) {

    // calendar.json datas
    let dayData = personalClassesDataSet.filter(week => week.day == weekday[dayIndex]);
    let classData = dayData.find(cls => cls.period == period);

    const currentPeriod = period;
    const className = classData.className;
    const isMerged = classData.isMerged;
    const classLocation = classData.classLocation;

    // schedule.json datas
    const timeSheetData = bellScheduleDataSet.find(cls => cls.period == currentPeriod);

    const startTimeH = timeSheetData.startTimeH;
    const startTimeM = timeSheetData.startTimeM;
    const endTimeH = timeSheetData.endTimeH;
    const endTimeM = timeSheetData.endTimeM;

    // class.json datas
    let fixedClassData = classSyllabusDataSet.find(cls => cls.className == className);

    const materials = fixedClassData.materials;
    const teacher = fixedClassData.teacher;

    // current period title
    document.getElementById('current-subject-title').innerText = "現在" + currentPeriod + "限 - " + className + (isMerged ? " (合同)" : "");

    // current time left text
    let timeLeftH = endTimeH - currentHour;
    let timeLeftM = endTimeM - currentMinute;
    if (timeLeftM < 0) {
        timeLeftM += 60;
        timeLeftH -= 1;
    }
    timeLeftM += timeLeftH * 60;
    document.getElementById('current-subject-time-left').innerText = "残り：" + (timeLeftM > 9 ? timeLeftM : ("0" + timeLeftM)) + "分";


    // current class information table
    document.getElementById('current-subject').innerHTML = className;
    document.getElementById('current-teacher').innerHTML = teacher
    document.getElementById('current-classroom').innerHTML = classLocation
    document.getElementById('current-class-start').innerHTML = startTimeH + ":" + (startTimeM >= 10 ? startTimeM : ("0" + startTimeM));
    document.getElementById('current-class-end').innerHTML = endTimeH + ":" + (endTimeM >= 10 ? endTimeM : ("0" + endTimeM));
    let mats = materials;
    if (mats == "") {
        mats = "なし";
    }
    document.getElementById('current-materials').innerHTML = mats;

}

// update display function
function updateNextClass(period) {

    // format dayIndex
    if (dayIndex > 1 || 5 <= dayIndex && period >= 6 || period <= 0) {
        dayIndex = 1;
    } else {
        dayIndex++;
    }
    let nextPeriod = period + 1;
    if (period > 6) {
        nextPeriod = 1;
    }

    // calendar.json datas
    let dayData = personalClassesDataSet.filter(week => week.day == weekday[dayIndex]);
    let classData = dayData.find(cls => cls.period == nextPeriod);

    const className = classData.className;
    const isMerged = classData.isMerged;
    const classLocation = classData.classLocation;

    // schedule.json datas
    const timeSheetData = bellScheduleDataSet.find(cls => cls.period == nextPeriod);

    const startTimeH = timeSheetData.startTimeH;
    const startTimeM = timeSheetData.startTimeM;
    const endTimeH = timeSheetData.endTimeH;
    const endTimeM = timeSheetData.endTimeM;

    // class.json datas
    let fixedClassData = classSyllabusDataSet.find(cls => cls.className == className);

    const materials = fixedClassData.materials;
    const teacher = fixedClassData.teacher;

    document.getElementById('next-subject-title').innerText = "次は" + nextPeriod + "限 - " + className + (isMerged ? " (合同)" : "");

    // time remaining
    let timeLeftH = startTimeH - currentHour;
    let timeLeftM = startTimeM - currentMinute;
    if (timeLeftM < 0) {
        timeLeftM += 60;
        timeLeftH -= 1;
    }
    timeLeftM += timeLeftH * 60;
    document.getElementById('next-subject-time-left').innerText = "残り：" + (timeLeftM > 9 ? timeLeftM : ("0" + timeLeftM)) + "分";

    // next class information table
    document.getElementById('next-subject').innerHTML = className;
    document.getElementById('next-teacher').innerHTML = teacher;
    document.getElementById('next-classroom').innerHTML = classLocation;
    // format minutes correctly (check minutes, not hours)
    document.getElementById('next-class-start').innerHTML = startTimeH + ":" + (startTimeM >= 10 ? startTimeM : ("0" + startTimeM));
    document.getElementById('next-class-end').innerHTML = endTimeH + ":" + (endTimeM > 9 ? endTimeM : ("0" + endTimeM));
    let nextMats = materials;
    if (nextMats == "") {
        nextMats = "なし";
    }
    document.getElementById('next-materials').innerHTML = nextMats;
}


/**
 * RUNS EVERYTHING HERE
 */
processDatas().then(() => {
    searchProcessedDataAndSetVariables();
    setInterval(searchProcessedDataAndSetVariables, 1000)
});
