// utils/courseTimeUtil.js

/**
 * 根据课程节次（如 "3-4"）和课表配置计算开始时间和结束时间
 * @param {string} classPeriod - 课程节次，例如 "3-4"
 * @param {object} config - 用户课表配置（包含 period_1 ~ period_10, class_duration）
 * @returns {object} 包含 startTime 和 endTime 字符串（格式为 "HH:mm"）
 */
function getCourseTime(classPeriod, config) {
    if (!classPeriod || !config || !config.class_duration) {
        return { startTime: "未知", endTime: "未知" };
    }

    const [startP, endP] = classPeriod.split("-").map(Number);
    const rawStart = config[`period_${startP}`];
    const rawEnd = config[`period_${endP}`];
    const duration = parseInt(config.class_duration);

    let startTime = "未知";
    let endTime = "未知";

    if (rawStart) {
        startTime = rawStart.slice(0, 5);
    }

    if (rawEnd && !isNaN(duration)) {
        let [hour, minute] = rawEnd.split(":").map(Number);
        let totalMinutes = hour * 60 + minute + duration;
        let endHour = Math.floor(totalMinutes / 60);
        let endMinute = totalMinutes % 60;
        endTime = `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;
    }

    return { startTime, endTime };
}

module.exports = {
    getCourseTime
};
