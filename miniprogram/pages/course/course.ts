import { getCourseTime } from '../../utils/courseTimeUtil';

const API_BASE_URL = "https://mutualcampus.top/api/timetable";

Page({
    data: {
        course: {},
        courseId: null,
        userId: null,
        isEditing: false,
        weeksArray: [],
    },

    onLoad(options) {
        this.setData({
            courseId: options.course_id,
            userId: getApp().globalData.userInfo.id
        });

        this.loadCourseDetails();
    },

    loadCourseDetails() {
        wx.request({
            url: `${API_BASE_URL}/course-detail`,
            method: "GET",
            data: {
                user_id: this.data.userId,
                course_id: this.data.courseId
            },
            success: (res) => {
                if (res.data.success) {
                    const course = res.data.data;
                    const config = getApp().globalData.timetableConfig;

                    const { startTime, endTime } = getCourseTime(course.class_period, config);
                    course.time_start = startTime;
                    course.time_end = endTime;

                    const rawWeeks = (course.weeks || "")
                        .split(",")
                        .map((w: string) => parseInt(w))
                        .filter((w: number) => !isNaN(w));
                    
                    const weeksArray = Array.from({ length: 16 }, (_, i) => ({
                        week: i + 1,
                        selected: rawWeeks.includes(i + 1),
                    }));

                    this.setData({ course, weeksArray });
                } else {
                    wx.showToast({ title: "加载失败", icon: "none" });
                }
            }
        });
    },

    // 编辑模式切换
    toggleEdit() {
        this.setData({ isEditing: !this.data.isEditing });
    },

    // 监听输入框修改
    onInputChange(e) {
        const field = e.currentTarget.dataset.field;
        this.setData({
            [`course.${field}`]: e.detail.value
        });
    },

    // 监听时间修改
    onTimeChange(e) {
        const field = e.currentTarget.dataset.field;
        this.setData({
            [`course.${field}`]: e.detail.value
        });
    },

    // 周次按钮切换
    toggleWeek(e: any) {
        if (!this.data.isEditing) return; // 只在编辑模式下允许操作

        const index = e.currentTarget.dataset.index;
        const weeksArray = [...this.data.weeksArray];
        weeksArray[index].selected = !weeksArray[index].selected;

        // 重新生成 weeks 字符串
        const selectedWeeks = weeksArray
            .filter(item => item.selected)
            .map(item => item.week)
            .join(",");

        this.setData({
            weeksArray,
            "course.weeks": selectedWeeks
        });
    },

    // 保存修改
    saveChanges() {
        wx.request({
            url: `${API_BASE_URL}/update-course`,
            method: "POST",
            data: {
                user_id: this.data.userId,
                course_id: this.data.courseId,
                ...this.data.course
            },
            success: (res) => {
                if (res.data.success) {
                    wx.showToast({ title: "保存成功", icon: "success" });
                    this.setData({ isEditing: false });
                } else {
                    wx.showToast({ title: "保存失败", icon: "none" });
                }
            }
        });
    },

    // 删除课程
    deleteCourse() {
        wx.showModal({
            title: "删除课程",
            content: "确定要删除这个课程吗？",
            success: (res) => {
                if (res.confirm) {
                    wx.request({
                        url: `${API_BASE_URL}/delete-course`,
                        method: "POST",
                        data: { user_id: this.data.userId, course_id: this.data.courseId },
                        success: (res) => {
                            if (res.data.success) {
                                wx.showToast({ title: "删除成功", icon: "success" });
                                wx.navigateBack();
                            } else {
                                wx.showToast({ title: "删除失败", icon: "none" });
                            }
                        }
                    });
                }
            }
        });
    },

    handleBack() {
        wx.navigateBack();
    }
});