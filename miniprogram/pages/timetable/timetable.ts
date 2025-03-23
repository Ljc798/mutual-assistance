const API_BASE_URL = "http://localhost:3000/api/timetable";

const dayMap = {
    "周一": 1,
    "周二": 2,
    "周三": 3,
    "周四": 4,
    "周五": 5,
    "周六": 6,
    "周日": 7
};

Page({
    data: {
        selectedTab: "daily", // 默认日课表
        showMenu: false,
        showImportModal: false,
        username: "",
        password: "",
        userId: null,
        dayOfWeek: "周一", // UI展示
        currentWeek: 1, // 当前周数
        selectedDate: "", // 选中的日期
        currentDate: "", // UI显示
        courses: [],
        weeksRange: [],
        hasPractice: false, // 是否有实践课
        practiceInfo: "", // 实践课信息
        weekDays: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
        periods: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        weeklyTimetable: {}, // 课程数据
        weekDates: [],  // 日期数组
    },

    onLoad() {
        const app = getApp();
        this.setData({
            userId: app.globalData.userInfo.id
        });

        wx.request({
            url: `${API_BASE_URL}/get-timetable-config`,
            method: "GET",
            data: { user_id: this.data.userId },
            success: (res) => {
                if (res.data.success) {
                    getApp().globalData.timetableConfig = res.data.data; // ✅ 存入全局                    
                    const totalWeeks = res.data.data.total_weeks; // 获取总周数
                    const weeksRange = Array.from({ length: totalWeeks }, (_, i) => `第${i + 1}周`);
                    this.setData({
                        weeksRange
                    });
                }
            }
        });

        // 计算当前周数和星期几，并获取课表
        this.computeDateInfo(new Date(), () => {
            this.loadCourses();
            this.loadPracticeCourses(); // ✅ 额外获取实践课信息
        });
        this.getWeekDates(this.data.currentWeek);
        this.loadWeeklyCourses();
    },
    onShow() {
        this.processWeeklyCourses();
    },

    // 计算选中日期是第几周，周几
    computeDateInfo(selectedDate, callback) {
        const weekDays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
        const app = getApp();
        const startDate = new Date(app.globalData.timetableConfig.start_date); // 学期开始日期
        const currentDate = new Date(selectedDate); // 选中的日期

        // 1. 获取本天是周几（0=周日，7=周日）
        const currentWeekday = currentDate.getDay() || 7;

        // 2. 计算这个日期所在周的周一
        const monday = new Date(currentDate);
        monday.setDate(currentDate.getDate() - currentWeekday + 1);

        // 3. 计算这周一距开学多少天
        const weekDiffDays = Math.floor((monday - startDate) / (1000 * 60 * 60 * 24));

        // 4. 计算这是第几周
        const selectedWeek = Math.floor(weekDiffDays / 7) + 1;

        // 5. 最终渲染
        const selectedDayText = weekDays[currentDate.getDay()];
        const finalWeek = selectedWeek > 0 ? selectedWeek : 1;

        this.setData({
            selectedDate: currentDate.toISOString().split("T")[0],
            currentWeek: finalWeek,
            dayOfWeek: selectedDayText,
            currentDate: `${currentDate.getMonth() + 1}.${currentDate.getDate()}`
        }, callback);
    },

    // 获取日课表
    loadCourses() {
        if (!this.data.userId) return;

        wx.request({
            url: `${API_BASE_URL}/daily`,
            method: "GET",
            data: {
                user_id: this.data.userId,
                week: this.data.currentWeek,
                weekday: dayMap[this.data.dayOfWeek]
            },
            success: (res) => {
                wx.hideLoading();

                if (res.data.success) {

                    const now = new Date();
                    const app = getApp();
                    const config = app.globalData.timetableConfig; // 从全局获取课程设置

                    if (!config) {
                        wx.showToast({ title: "课表配置未加载", icon: "none" });
                        return;
                    }

                    const updatedCourses = res.data.data.map((course) => {
                        const periods = course.class_period.split("-").map(p => parseInt(p));


                        // ✅ 获取课程开始时间
                        let startTime = config[`period_${periods[0]}`] || "未知";
                        if (startTime !== "未知") {
                            startTime = startTime.substring(0, 5); // 只保留 HH:mm
                        }

                        // ✅ 获取课程结束时间
                        let endTime = "未知";
                        if (config[`period_${periods[1]}`]) {
                            let [endHour, endMinute] = config[`period_${periods[1]}`].split(":").map(Number);

                            // 结束时间 = 下一节课的开始时间 + 课程时长
                            endMinute += config.class_duration;

                            if (endMinute >= 60) {
                                endHour += Math.floor(endMinute / 60);
                                endMinute %= 60;
                            }

                            endTime = `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;
                        }

                        // 计算课程状态
                        let status = "upcoming";
                        const now = new Date();
                        const courseDate = new Date(this.data.selectedDate); // 课程对应的日期

                        if (courseDate < now.setHours(0, 0, 0, 0)) {
                            status = "ended"; // 过去的课程
                        } else if (courseDate.toDateString() === now.toDateString()) {
                            // 如果是今天的课程，按照时间计算
                            if (startTime !== "未知" && now >= new Date(`2025-01-01T${startTime}`) && now < new Date(`2025-01-01T${endTime}`)) {
                                status = "ongoing";
                            } else if (startTime !== "未知" && now >= new Date(`2025-01-01T${endTime}`)) {
                                status = "ended";
                            }
                        } else {
                            status = "upcoming"; // 未来的课程
                        }

                        return {
                            id: course.id,
                            course_name: course.course_name,
                            teacher: course.teacher_name,
                            location: course.location,
                            time_start: startTime,
                            time_end: endTime,
                            status
                        };
                    });

                    this.setData({ courses: updatedCourses });
                    this.checkIfNoCourses();

                } else {
                    wx.showToast({ title: "暂无课程", icon: "none" });
                    this.setData({ courses: [] });
                }
            },
            fail: () => {
                wx.hideLoading();
                wx.showToast({ title: "网络错误", icon: "none" });
            }
        });
    },

    // 日期选择
    onDateChange(e) {
        const selectedDate = new Date(e.detail.value);
        this.computeDateInfo(selectedDate, () => {
            this.loadCourses();
            this.loadPracticeCourses();
        });
    },

    onWeekChange(e) {
        const selectedWeekIndex = Number(e.detail.value); // 获取 picker 选中的索引（0-based）

        const selectedWeek = selectedWeekIndex + 1; // picker 的索引是从 0 开始的，所以 +1 变成周数

        // 获取全局存储的学期开始日期
        const app = getApp();
        const startDateISO = new Date(app.globalData.timetableConfig.start_date); // 获取开学日期
        const startDate = new Date(startDateISO);

        // 计算当前周的周一
        const weekStartDate = new Date(startDate);
        weekStartDate.setDate(startDate.getDate() + (selectedWeek - 1) * 7); // 计算这周的周一

        // 格式化日期 YYYY-MM-DD
        const formattedDate = `${weekStartDate.getFullYear()}-${String(weekStartDate.getMonth() + 1).padStart(2, "0")}-${String(weekStartDate.getDate()).padStart(2, "0")}`;

        this.setData({
            currentWeek: selectedWeek,
            selectedDate: formattedDate,
            dayOfWeek: "周一" // 直接切换到周一
        });

        // ✅ 重新获取课程
        this.loadCourses();
        this.loadPracticeCourses();
        this.getWeekDates(this.data.currentWeek);
        this.loadWeeklyCourses();
    },

    // 获取实践课
    loadPracticeCourses() {
        wx.request({
            url: `${API_BASE_URL}/practice`,
            method: "GET",
            data: { user_id: this.data.userId, week: this.data.currentWeek },
            success: (res) => {

                if (res.data.success && res.data.has_practice) {
                    // ✅ 只在周一到周五显示实践课
                    const today = new Date(this.data.selectedDate);
                    const todayWeekday = today.getDay(); // 0 = 周日, 1 = 周一, ..., 6 = 周六

                    if (todayWeekday >= 1 && todayWeekday <= 5) {
                        this.setData({
                            hasPractice: true,
                            practiceInfo: res.data.practice_info
                        });
                    } else {
                        this.setData({
                            hasPractice: false,
                            practiceInfo: []
                        });
                    }
                } else {
                    this.setData({ hasPractice: false, practiceInfo: [] });
                }

                // ✅ 重新判断今天是否真的有课
                this.checkIfNoCourses();
            },
            fail: (err) => {
                console.error("❌ 请求失败:", err);
                this.setData({ hasPractice: false, practiceInfo: [] });
                this.checkIfNoCourses();
            }
        });
    },

    checkIfNoCourses() {
        const noTheoryCourses = this.data.courses.length === 0;
        const noPracticeCourses = !this.data.hasPractice;

        this.setData({
            noClassesToday: noTheoryCourses && noPracticeCourses // ✅ 如果都没有，就显示休息 UI
        });
    },

    viewPracticeDetails() {
        if (!this.data.practiceInfo || this.data.practiceInfo.length === 0) {
            wx.showToast({ title: "没有实践课信息", icon: "none" });
            return;
        }

        const practiceDetails = this.data.practiceInfo.map(p =>
            `📌 课程: ${p.course_name}
    👨‍🏫 教师: ${p.teacher_name}
    📍 地点: ${p.location || "待定"}
    📅 周次: ${p.weeks}`
        ).join("\n\n");

        wx.showModal({
            title: "实践课详情",
            content: practiceDetails,
            showCancel: false
        });
    },

    // 切换到日课表
    switchToDaily() {
        this.setData({ selectedTab: "daily" });
        // 重新加载日课表数据（必要时）
        this.loadCourses();
        this.loadPracticeCourses();
    },

    // 切换到周课表
    switchToWeekly() {
        this.setData({ selectedTab: "weekly" });
        this.getWeekDates(this.data.currentWeek);  // 计算这周日期
        this.loadWeeklyCourses();                  // 加载这周所有课程
    },


    // 打开菜单
    openMenu() {
        this.setData({
            showMenu: true
        });
    },

    // 关闭菜单
    closeMenu() {
        this.setData({
            showMenu: false
        });
    },

    // 打开导入课表弹窗
    openImportModal() {
        this.setData({
            showMenu: false,
            showImportModal: true
        });
    },

    // 关闭导入课表弹窗
    closeImportModal() {
        this.setData({
            showImportModal: false
        });
    },

    // 监听输入框输入
    onUsernameInput(e) {
        this.setData({
            username: e.detail.value
        });
    },

    onPasswordInput(e) {
        this.setData({
            password: e.detail.value
        });
    },

    // 导入课表
    importSchedule() {
        if (!this.data.username || !this.data.password) {
            wx.showToast({
                title: "账号和密码不能为空",
                icon: "none"
            });
            return;
        }

        // 从本地存储中获取user_id
        const app = getApp();
        const userId = app.globalData.userInfo.id;
        if (!userId) {
            wx.showToast({
                title: "未找到用户信息，请重新登录",
                icon: "none"
            });
            return;
        }

        wx.showLoading({ title: "导入中..." });

        wx.request({
            url: `http://175.27.170.220:8000/get_schedule/`,
            method: "POST",
            data: {
                username: this.data.username,
                password: this.data.password,
                user_id: userId  // 直接放在 JSON 根级别
            },
            header: {
                "Content-Type": "application/json"
            },
            success: (res) => {
                wx.hideLoading();
                if (res.statusCode === 200) {
                    wx.showToast({
                        title: "课表导入成功！",
                        icon: "success"
                    });
                    this.closeImportModal();
                } else {
                    wx.showToast({
                        title: res.data.detail || "导入失败",
                        icon: "none"
                    });
                }
            },
            fail: () => {
                wx.hideLoading();
                wx.showToast({
                    title: "网络错误，请检查连接",
                    icon: "none"
                });
            }
        });
    },
    handleBack() {
        wx.navigateBack({ delta: 1 });
    },
    // 进入设置页面
    openSettings() {
        wx.navigateTo({ url: "/pages/timetable-config/timetable-config" });
    },

    // 课程详情跳转
    goToCourseDetail(e) {
        const courseId = e.currentTarget.dataset.courseId; // 获取课程 ID
        if (!courseId) {
            wx.showToast({ title: "课程 ID 获取失败", icon: "none" });
            return;
        }

        wx.navigateTo({
            url: `/pages/course/course?course_id=${courseId}`
        });
    },

    //周课表
    // 计算当前周的每一天
    getWeekDates(selectedWeek) {
        const weekDays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
        const app = getApp();
        const startDate = new Date(app.globalData.timetableConfig.start_date);

        // 计算周一日期
        const monday = new Date(startDate);
        monday.setDate(startDate.getDate() + (selectedWeek - 1) * 7);

        let weekDates = [];
        for (let i = 0; i < 7; i++) {
            let currentDate = new Date(monday);
            currentDate.setDate(monday.getDate() + i);

            weekDates.push({
                weekday: weekDays[i],
                date: `${currentDate.getMonth() + 1}.${currentDate.getDate()}`
            });
        }

        this.setData({ weekDates });
    },

    // 加载周课表数据
    loadWeeklyCourses() {
        wx.request({
            url: `${API_BASE_URL}/weekly`,
            method: "GET",
            data: {
                user_id: this.data.userId,
                week: this.data.currentWeek
            },
            success: (res) => {
                if (res.data.success && typeof res.data.data === "object") {
                    const weeklyCourses = res.data.data;  // 这是一个对象，key 是星期几
    
                    // ✅ 处理成数组结构
                    let formattedCourses = [];
                    for (let day in weeklyCourses) {
                        if (Array.isArray(weeklyCourses[day])) {
                            weeklyCourses[day].forEach(course => {
                                formattedCourses.push({
                                    ...course,
                                    weekday: Number(day) // 把 key (字符串) 转成数字
                                });
                            });
                        }
                    }
    
                    this.setData({ weeklyCourses: formattedCourses }, () => {
                        this.processWeeklyCourses(); // **数据加载完毕后再处理**
                    });
                } else {
                    console.error("❌ weeklyCourses 数据格式错误:", res.data.data);
                    wx.showToast({ title: "获取周课表失败", icon: "none" });
                }
            },
            fail: () => {
                wx.showToast({ title: "网络错误", icon: "none" });
            }
        });
    },

    // 解析 weeklyCourses 并填充表格
    processWeeklyCourses() {
        if (!this.data.weeklyCourses || !Array.isArray(this.data.weeklyCourses)) {
            console.error("❌ weeklyCourses 数据为空或格式错误，无法处理周课表:", this.data.weeklyCourses);
            return;
        }
    
        const MAX_PERIODS = 10;
        const weekDays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
        
        // ✅ 初始化周课表结构
        let weeklyTimetable = {};
        for (let i = 1; i <= MAX_PERIODS; i++) {
            weeklyTimetable[i] = {};
            weekDays.forEach(day => {
                weeklyTimetable[i][day] = [];
            });
        }
    
        // ✅ 解析 weeklyCourses 并填充表格
        this.data.weeklyCourses.forEach(course => {
            const { class_period, course_name, teacher_name, location, weekday } = course;
    
            if (!class_period || !weekday) {
                console.warn("⚠️ 课程缺少 class_period 或 weekday，跳过:", course);
                return;
            }
    
            const [startPeriod, endPeriod] = class_period.split("-").map(Number);
            const weekdayName = weekDays[weekday - 1]; // `weekday` 是数字，需要转换为 "周一"
    
            weeklyTimetable[startPeriod][weekdayName].push({
                id: course.id,
                course_name: course.course_name,
                teacher_name: course.teacher_name,
                location: course.location,
                startPeriod,
                endPeriod,
                rowSpan: endPeriod - startPeriod + 1,
              });
        });
    
        this.setData({ weeklyTimetable });
    }

});