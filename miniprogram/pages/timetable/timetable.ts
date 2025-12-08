const TMP_CLASS_REMINDER = 'ftmEuFBPPKO2R6cX121BzQEcN2uom-iGy4pdKYPhqB0';
import { BASE_URL } from '../../config/env';

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
        touchStartX: 0,
        touchEndX: 0,
        term: "2025-1"
    },

    onLoad() {
        const app = getApp();
        const userId = app.globalData.userInfo.id;
        this.setData({ userId });

        wx.request({
            url: `${BASE_URL}/timetable/get-timetable-config`,
            method: "GET",
            data: { user_id: userId },
            success: (res) => {
                if (res.data.success && res.data.data) {
                    const config = res.data.data;
                    getApp().globalData.timetableConfig = config;

                    const totalWeeks = config.total_weeks;
                    const weeksRange = Array.from({ length: totalWeeks }, (_, i) => `第${i + 1}周`);

                    this.setData({ weeksRange }, () => {
                        this.computeDateInfo(new Date(), () => {
                            this.loadCourses();
                            this.loadPracticeCourses();
                        });
                        this.getWeekDates(this.data.currentWeek);
                        this.loadWeeklyCourses();
                    });

                } else {
                    // ✅ 用户未配置，弹窗提示
                    wx.showModal({
                        title: "首次使用提醒",
                        content: "请先点击右上角三个点中的【设置】进行课表配置，再点击【导入课表】进行导入哦～",
                        showCancel: false
                    });
                }
                this.setData({ timetableConfigLoaded: true });
            },
            fail: (err) => {
                console.error("❌ 网络请求失败", err);
                wx.showModal({
                    title: "网络错误",
                    content: "获取课表配置失败，请检查网络连接",
                    showCancel: false
                });
            }
        });
    },

    onShow() {
        const hasWeekly = Array.isArray(this.data.weeklyCourses) && this.data.weeklyCourses.length > 0;
        if (hasWeekly) {
            this.processWeeklyCourses();
        } else if (this.data.timetableConfigLoaded) {
            this.loadWeeklyCourses();
        }
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
            url: `${BASE_URL}/timetable/daily`,
            method: "GET",
            data: {
                user_id: this.data.userId,
                week: this.data.currentWeek,
                weekday: dayMap[this.data.dayOfWeek]
            },
            success: (res) => {
                wx.hideLoading();

                if (!res.data?.success) {
                    wx.showToast({ title: "暂无课程", icon: "none" });
                    this.setData({ courses: [] });
                    return;
                }

                // 工具：把 "HH:mm" / "HH:mm:ss" 统一成 "HH:mm"
                const norm = (t?: string) => {
                    if (!t) return "未知";
                    const s = String(t);
                    // 可能是 "10:05" / "10:05:00"
                    const m = s.match(/^(\d{1,2}:\d{2})/);
                    return m ? m[1] : "未知";
                };

                // 工具：把日期 + "HH:mm" 合成 Date
                const toDateTime = (dateStr: string, hhmm: string) => {
                    if (!hhmm || hhmm === "未知") return null;
                    // 兼容 iOS：用 "YYYY/MM/DD HH:mm"
                    return new Date(`${dateStr.replace(/-/g, "/")} ${hhmm}:00`);
                };

                const today = new Date();
                const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
                const courseDay = new Date(this.data.selectedDate || todayStr);
                const courseDateStr = (this.data.selectedDate || todayStr);

                const updatedCourses = (res.data.data || []).map((course: any) => {
                    const startTime = norm(course.time_start);
                    const endTime = norm(course.time_end);

                    // 计算状态
                    let status: "upcoming" | "ongoing" | "ended" = "upcoming";
                    const startDT = toDateTime(courseDateStr, startTime);
                    const endDT = toDateTime(courseDateStr, endTime);

                    // 比较只看日期部分
                    const isPastDay =
                        courseDay.getFullYear() < today.getFullYear() ||
                        (courseDay.getFullYear() === today.getFullYear() && (
                            courseDay.getMonth() < today.getMonth() ||
                            (courseDay.getMonth() === today.getMonth() && courseDay.getDate() < today.getDate())
                        ));

                    if (isPastDay) {
                        status = "ended";
                    } else if (courseDateStr === todayStr && startDT && endDT) {
                        if (today >= startDT && today < endDT) status = "ongoing";
                        else if (today >= endDT) status = "ended";
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
            url: `${BASE_URL}/timetable/practice`,
            method: "GET",
            data: {
                user_id: this.data.userId, week: this.data.currentWeek, term: this.data.term
            },
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

        // 重新计算今天是第几周、周几，再加载对应课程
        this.computeDateInfo(new Date(), () => {
            this.loadCourses();
            this.loadPracticeCourses();
        });
    },

    // 切换到周课表
    switchToWeekly() {
        this.setData({ selectedTab: "weekly" });

        // 重新计算当前是第几周，刷新周课表数据
        this.computeDateInfo(new Date(), () => {
            this.getWeekDates(this.data.currentWeek);  // 计算这周的 7 天
            this.loadWeeklyCourses();                  // 拉取这周课程
        });
    },


    // 打开菜单
    openMenu() {
        const token = wx.getStorageSync("token");  // 获取 token
        if (!token) {
            wx.showToast({ title: "请先登录", icon: "none" });
            return;
        }
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
            url: `https://admin.mutualcampus.top/schedule/get_schedule`,
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
            url: `${BASE_URL}/timetable/weekly`,
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
    },

    handleTouchStart(e: any) {
        this.setData({
            touchStartX: e.touches[0].clientX,
        });
    },

    handleTouchEnd(e: any) {
        const touchEndX = e.changedTouches[0].clientX;
        const deltaX = touchEndX - this.data.touchStartX;

        // 滑动阈值，避免误触
        if (Math.abs(deltaX) < 50) return;

        if (deltaX > 0) {
            // 👉 右滑
            if (this.data.selectedTab === "daily") {
                this.changeDateByOffset(-1);
            } else if (this.data.selectedTab === "weekly") {
                this.changeWeekByOffset(-1);
            }
        } else {
            // 👈 左滑
            if (this.data.selectedTab === "daily") {
                this.changeDateByOffset(1);
            } else if (this.data.selectedTab === "weekly") {
                this.changeWeekByOffset(1);
            }
        }
    },

    changeDateByOffset(offset: number) {
        const currentDate = new Date(this.data.selectedDate);
        currentDate.setDate(currentDate.getDate() + offset);

        const nextDateStr = currentDate.toISOString().split("T")[0];

        // ✅ 计算日期对应的周次和周几
        this.computeDateInfo(nextDateStr, () => {
            this.loadCourses();
            this.loadPracticeCourses();
        });
    },

    changeWeekByOffset(offset: number) {
        let newWeek = this.data.currentWeek + offset;

        const maxWeeks = getApp().globalData.timetableConfig?.total_weeks || 20;

        // 防御，限制范围
        if (newWeek < 1) newWeek = 1;
        if (newWeek > maxWeeks) newWeek = maxWeeks;

        if (newWeek === 1 && offset < 0) {
            wx.showToast({ title: "已经是第一周啦", icon: "none" });
        }
        if (newWeek === maxWeeks && offset > 0) {
            wx.showToast({ title: "已经是最后一周啦", icon: "none" });
        }

        this.setData({
            currentWeek: newWeek
        }, () => {
            this.getWeekDates(newWeek);
            this.loadWeeklyCourses();
        });
    },

    async subscribeClassReminder() {
        try {
          const subRes = await new Promise<WechatMiniprogram.RequestSubscribeMessageSuccessCallbackResult>((resolve, reject) => {
            wx.requestSubscribeMessage({
              tmplIds: [TMP_CLASS_REMINDER],
              success: resolve,
              fail: reject
            });
          });
      
          const result = subRes[TMP_CLASS_REMINDER]; // 'accept' | 'reject' | 'ban'
      
          if (result === 'accept') {
            // ✅ 正常逻辑：保存到后端
            const app = getApp();
            const token = wx.getStorageSync('token');
            const userId = app?.globalData?.userInfo?.id;
      
            if (token && userId) {
              await new Promise((resolve, reject) => {
                wx.request({
                  url: `${BASE_URL}/notify/subscribe`,
                  method: 'POST',
                  header: { Authorization: `Bearer ${token}` },
                  data: { user_id: userId, tmpl_id: TMP_CLASS_REMINDER, scene: 'class_reminder' },
                  success: resolve,
                  fail: reject
                });
              });
            }
      
            wx.showToast({ title: '订阅成功', icon: 'success' });
            return;
          }
      
          // ❌ 被拒绝或禁用
          if (result === 'reject') {
            wx.showModal({
              title: '订阅未开启',
              content: '您拒绝了订阅提醒。如需重新开启，请到小程序右上角「… → 设置 → 订阅消息」里开启。',
              showCancel: false,
              confirmText: '知道了'
            });
          } else if (result === 'ban') {
            wx.showModal({
              title: '订阅被禁用',
              content: '您已在小程序里关闭了消息订阅。可在「微信 → 我 → 设置 → 订阅消息」里重新开启。',
              showCancel: false,
              confirmText: '去设置',
              success: (res) => {
                if (res.confirm) {
                  wx.openSetting({});
                }
              }
            });
          }
        } catch (err) {
          console.error('订阅失败：', err);
          wx.showToast({ title: '订阅失败', icon: 'none' });
        }
      }
});
