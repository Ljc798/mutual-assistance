const API_BASE_URL = "https://mutualcampus.top/api/timetableConfig"; // 本地调试模式

Page({
    data: {
        userId: null, // **从全局存储获取用户ID**
        totalWeeks: 16, // 默认教学周
        weeksRange: Array.from({ length: 25 }, (_, i) => i + 1), // 1~25
        startDate: "2025-02-17",
        classSchedule: [
            { startTime: "08:00" },
            { startTime: "08:50" },
            { startTime: "10:15" },
            { startTime: "11:05" },
            { startTime: "14:00" },
            { startTime: "14:50" },
            { startTime: "15:55" },
            { startTime: "16:45" },
            { startTime: "19:00" },
            { startTime: "19:50" }
        ],
        durationOptions: [35, 40, 45, 50], // 可选课时长
        classDuration: 45 // 统一的课程时长，默认45分钟
    },

    /** 🔍 **页面加载时获取已有的课表设置** */
    onLoad() {
        const app = getApp();
        if (!app.globalData.userInfo || !app.globalData.userInfo.id) {
            wx.showToast({
                title: "请先登录",
                icon: "none"
            });
            return;
        }

        this.setData({ userId: app.globalData.userInfo.id });

        wx.showLoading({ title: "加载中..." });

        this.fetchTimetableConfig(this.data.userId);
    },

    /** **🔄 获取用户的课表设置** */
    fetchTimetableConfig(userId) {
        wx.request({
            url: `${API_BASE_URL}/get-timetable-config`,
            method: "GET",
            data: { user_id: userId },
            success: (res) => {
                wx.hideLoading();
                if (res.data.success) {
                    const data = res.data.data;

                    // **转换后端数据到前端格式**
                    const classSchedule = [
                        { startTime: data.period_1 || "08:00" },
                        { startTime: data.period_2 || "08:50" },
                        { startTime: data.period_3 || "10:15" },
                        { startTime: data.period_4 || "11:05" },
                        { startTime: data.period_5 || "14:00" },
                        { startTime: data.period_6 || "14:50" },
                        { startTime: data.period_7 || "15:55" },
                        { startTime: data.period_8 || "16:45" },
                        { startTime: data.period_9 || "19:00" },
                        { startTime: data.period_10 || "19:50" }
                    ];

                    this.setData({
                        totalWeeks: data.total_weeks || 16,
                        startDate: data.start_date || "2025-02-17",
                        classSchedule: classSchedule,
                        classDuration: data.classDuration || 45
                    });
                } else {
                    wx.showToast({
                        title: "未找到课表设置",
                        icon: "none"
                    });
                }
            },
            fail: () => {
                wx.hideLoading();
                wx.showToast({
                    title: "网络错误，请检查本地服务器",
                    icon: "none"
                });
            }
        });
    },

    // 修改总教学周
    onWeeksChange(e) {
        this.setData({ totalWeeks: this.data.weeksRange[e.detail.value] });
    },

    // 修改开学日期
    onDateChange(e) {
        this.setData({ startDate: e.detail.value });
    },

    // 选择统一课程时长
    onDurationChange(e) {
        this.setData({
            classDuration: this.data.durationOptions[e.detail.value]
        });
    },

    // 选择单节课的上课时间
    onTimeChange(e) {
        const index = e.currentTarget.dataset.index;
        let newSchedule = [...this.data.classSchedule];
        newSchedule[index].startTime = e.detail.value;
        this.setData({
            classSchedule: newSchedule
        });
    },

    // **💾 保存设置**
    saveSettings() {
        if (!this.data.userId) {
            wx.showToast({
                title: "用户未登录，无法保存",
                icon: "none"
            });
            return;
        }

        wx.showLoading({ title: "保存中..." });

        // **转换前端数据为后端 API 需要的格式**
        const requestData = {
            user_id: this.data.userId,
            total_weeks: this.data.totalWeeks,
            start_date: this.data.startDate,
            period_1: this.data.classSchedule[0].startTime,
            period_2: this.data.classSchedule[1].startTime,
            period_3: this.data.classSchedule[2].startTime,
            period_4: this.data.classSchedule[3].startTime,
            period_5: this.data.classSchedule[4].startTime,
            period_6: this.data.classSchedule[5].startTime,
            period_7: this.data.classSchedule[6].startTime,
            period_8: this.data.classSchedule[7].startTime,
            period_9: this.data.classSchedule[8].startTime,
            period_10: this.data.classSchedule[9].startTime
        };

        wx.request({
            url: `${API_BASE_URL}/save-timetable-config`,
            method: "POST",
            data: requestData,
            header: {
                "Content-Type": "application/json"
            },
            success: (res) => {
                wx.hideLoading();
                if (res.data.success) {
                    wx.showToast({
                        title: "保存成功！",
                        icon: "success"
                    });
                } else {
                    wx.showToast({ title: "保存失败", icon: "none" });
                }
            },
            fail: () => {
                wx.hideLoading();
                wx.showToast({ title: "网络错误，请检查本地服务器", icon: "none" });
            }
        });
    },

    handleBack() {
        wx.navigateBack({ delta: 1 });
    }
}); 