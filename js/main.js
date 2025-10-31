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
var calenderData, classData, scheduleData;


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
        calenderData = await fetchData('json/calendar.json')
        console.log("calendar.json loaded.")

        classData = await fetchData('json/class.json')
        console.log("class.json loaded.")

        scheduleData = await fetchData('json/schedule.json');
        console.log("schedule.json loaded.");
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
    const currentTimeNumericalValue = currentHour * 60 + currentMinute;
    const currentTimeSheetData = scheduleData.find(time => (time.startTimeH * 60 + time.startTimeM) <= (currentTimeNumericalValue) && (currentTimeNumericalValue) < (time.endTimeH * 60 + time.endTimeM));
    // console.log("Current Period Schedule: " + JSON.stringify(currentPeriodScheduleData));

    let todaysClassesData = calenderData.filter(week => week.day == weekday[dayIndex]);
    // console.log("Today's Classes: " + JSON.stringify(currentDayClassData));

    // is student in school time
    isOutSideClassTime = todaysClassesData == undefined || currentTimeSheetData == undefined;
    // console.log("Current Class Data: " + JSON.stringify(currentPeriodScheduleData));

    if (!isOutSideClassTime) {
        let currentPeriod = currentTimeSheetData.period;
        let currentClassSettingData = todaysClassesData.filter(item => item.period == currentPeriod);
        let currentTeacherAndMaterialData = classData.find(cls => cls.className == currentClassSettingData[0].className);
        processAndUpdateCurrent(currentClassSettingData, currentTimeSheetData, currentTeacherAndMaterialData);

        if (currentPeriod >= 6) {
            if (dayIndex != 0 && 5 <= dayIndex) {
                dayIndex = 1;
            } else {
                dayIndex++;
            }
            todaysClassesData = calenderData.filter(week => week.day == weekday[dayIndex]);
        }
        processAndUpdateNext(currentClassSettingData, todaysClassesData);
    }
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

function processAndUpdateCurrent(currentClassSettingData, currentTimeSheetData, currentTeacherAndMaterialData) {
    // current period title
    const currentPeriod = currentClassSettingData[0].period;
    const currentClassName = currentClassSettingData[0]["className"];
    document.getElementById('current-subject-title').innerText = "現在" + currentPeriod + "限 - " + currentClassName;

    // variables
    const startTimeH = currentTimeSheetData.startTimeH;
    const startTimeM = currentTimeSheetData.startTimeM;
    const endTimeH = currentTimeSheetData.endTimeH;
    const endTimeM = currentTimeSheetData.endTimeM;

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
    document.getElementById('current-subject').innerHTML = currentClassName;
    document.getElementById('current-teacher').innerHTML = currentTeacherAndMaterialData.teacher;
    document.getElementById('current-classroom').innerHTML = currentClassSettingData[0].classLocation;
    document.getElementById('current-class-start').innerHTML = startTimeH + ":" + (startTimeM >= 10? startTimeM : ("0" + startTimeM));
    document.getElementById('current-class-end').innerHTML = endTimeH + ":" + (endTimeM >= 10? endTimeM : ("0" + endTimeM));
    let mats = currentTeacherAndMaterialData.materials;
    if (mats == "") {
        mats = "なし";
    }
    document.getElementById('current-materials').innerHTML = mats;

}

// update display function
function processAndUpdateNext(currentClassSettingData, todaysClassesData) {
    // variable
    const currentPeriod = currentClassSettingData[0].period;

    // next period title
    const nextPeriod = (currentPeriod >= 6) ? 1 : (currentPeriod + 1);
    // get next period data as an array to match usage of [0] elsewhere
    const nextPeriodData = todaysClassesData.filter(clses => clses.period == nextPeriod);
    document.getElementById('next-subject-title').innerText = "次は" + nextPeriod + "限 - " + nextPeriodData[0].className;

    const nextTimeSheetData = scheduleData.find(cls => cls.period == nextPeriod);
    // time remaining
    let nextTimeLeftH = nextTimeSheetData.startTimeH - currentHour;
    let nextTimeLeftM = nextTimeSheetData.startTimeM - currentMinute;
    if (nextTimeLeftM < 0) {
        nextTimeLeftM += 60;
        nextTimeLeftH -= 1;
    }
    nextTimeLeftM += nextTimeLeftH * 60;
    document.getElementById('next-subject-time-left').innerText = "残り：" + (nextTimeLeftM > 9 ? nextTimeLeftM : ("0" + nextTimeLeftM)) + "分";

    // data variables for next class
    let nextTeacherAndMaterialData = classData.find(cls => cls.className == nextPeriodData[0].className);
    let nextClassSettingData = todaysClassesData.filter(item => item.period == nextPeriod);

    // next class information table
    document.getElementById('next-subject').innerHTML = nextPeriodData[0].className;
    document.getElementById('next-teacher').innerHTML = nextTeacherAndMaterialData.teacher;
    document.getElementById('next-classroom').innerHTML = nextClassSettingData[0].classLocation;
    // format minutes correctly (check minutes, not hours)
    document.getElementById('next-class-start').innerHTML = nextTimeSheetData.startTimeH + ":" + (nextTimeSheetData.startTimeM >= 10 ? nextTimeSheetData.startTimeM : ("0" + nextTimeSheetData.startTimeM));
    document.getElementById('next-class-end').innerHTML = nextTimeSheetData.endTimeH + ":" + (nextTimeSheetData.endTimeM > 9 ? nextTimeSheetData.endTimeM : ("0" + nextTimeSheetData.endTimeM));
    let nextMats = nextTeacherAndMaterialData.materials;
    if (nextMats == "") {
        nextMats = "なし";
    }
    document.getElementById('next-materials').innerHTML = nextMats;

}


/**
 * RUN EVERYTHING HERE
 */
processDatas().then(() => {
    searchProcessedDataAndSetVariables();
    setInterval(searchProcessedDataAndSetVariables, 1000)
});
