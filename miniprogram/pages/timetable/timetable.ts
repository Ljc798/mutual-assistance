Page({
    data: {
        selectedTab: "daily",
        selectedDate: "2025-03-11",
        dayOfWeek: "周二",
        courses: [] // 课程数据
    },

    handleBack() {
        wx.navigateBack({
            delta: 1  // 返回上一级页面
        });
    },

    // 切换到日课表
    switchToDaily() {
        this.setData({ selectedTab: "daily" });
    },

    // 切换到周课表
    switchToWeekly() {
        wx.navigateTo({ url: "/pages/timetable-weekly/timetable-weekly" });
    },

    // 选择日期
    onDateChange(e: any) {
        const newDate = e.detail.value;
        this.setData({
            selectedDate: newDate,
            dayOfWeek: this.getWeekday(newDate)
        });
        this.loadCourses(newDate);
    },

    // 获取星期几
    getWeekday(dateStr: string) {
        const days = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
        return days[new Date(dateStr).getDay()];
    },

    // 加载课程数据（假数据）
    loadCourses(date: string) {
        const mockCourses = {
            "2025-03-11": [
                { course_name: "大学英语", time_start: "08:00", time_end: "09:35", location: "文友楼603", teacher: "增益", status: "ended" },
                { course_name: "数据结构", time_start: "10:00", time_end: "11:40", location: "信息楼202", teacher: "张三", status: "ongoing" }
            ]
        };
        this.setData({ courses: mockCourses[date] || [] });
    }
});
