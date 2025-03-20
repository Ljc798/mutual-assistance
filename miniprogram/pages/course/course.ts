const API_BASE_URL = "http://localhost:3000/api/timetable";

Page({
    data: {
        course: {},
        courseId: null,
        userId: null,
        isEditing: false
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
            data: { user_id: this.data.userId, course_id: this.data.courseId },
            success: (res) => {
                if (res.data.success) {
                    this.setData({ course: res.data.data });
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