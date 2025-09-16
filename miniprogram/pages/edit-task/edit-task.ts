// pages/edit-task/edit-task.ts
Page({
    data: {
        taskId: null,
        form: {
            title: '',
            offer: '',
            detail: '',
            DDL_date: '',
            DDL_time: '',
            address: '',
            position: '',
        },
    },

    onLoad(options) {
        const taskId = options.taskId;
        if (!taskId) {
            wx.showToast({ title: '无效任务 ID', icon: 'none' });
            return;
        }
        this.setData({ taskId });
        this.loadTaskDetail(taskId);
    },

    loadTaskDetail(taskId) {
        wx.request({
            url: `https://mutualcampus.top/api/task/${taskId}`,
            method: 'GET',
            success: (res) => {
                if (res.data && res.data.id) {
                    const { title, offer, detail, DDL, address, position } = res.data;
                    if (DDL) {
                        const rawDate = new Date(DDL);
                        // 减去 8 小时（转换为本地时间）
                        rawDate.setHours(rawDate.getHours());
                    
                        const year = rawDate.getFullYear();
                        const month = String(rawDate.getMonth() + 1).padStart(2, '0');
                        const day = String(rawDate.getDate()).padStart(2, '0');
                        const hours = String(rawDate.getHours()).padStart(2, '0');
                        const minutes = String(rawDate.getMinutes()).padStart(2, '0');
                    
                        this.setData({
                            form: {
                                title,
                                offer,
                                detail,
                                DDL_date: `${year}-${month}-${day}`,
                                DDL_time: `${hours}:${minutes}`,
                                address,
                                position,
                            },
                        });
                    }
                } else {
                    wx.showToast({ title: '任务加载失败', icon: 'none' });
                }
            },
            fail: () => wx.showToast({ title: '网络错误', icon: 'none' }),
        });
    },

    handleInputChange(e) {
        const field = e.currentTarget.dataset.field;
        this.setData({ [`form.${field}`]: e.detail.value });
    },

    handleDateChange(e) {
        this.setData({ 'form.DDL_date': e.detail.value });
    },

    handleTimeChange(e) {
        this.setData({ 'form.DDL_time': e.detail.value });
    },


    submitEdit() {
        const token = wx.getStorageSync("token");
        if (!token) {
            wx.showToast({ title: '请先登录', icon: 'none' });
            return;
        }

        const { DDL_date, DDL_time, ...restForm } = this.data.form;
        const DDL = `${DDL_date} ${DDL_time}`;

        wx.request({
            url: "https://mutualcampus.top/api/task/update",
            method: "POST",
            header: { Authorization: `Bearer ${token}` },
            data: {
                id: this.data.taskId,
                ...restForm,
                DDL,
            },
            success: (res) => {
                if (res.data.success) {
                    wx.showToast({ title: '更新成功', icon: 'success' });
                    wx.navigateBack();
                } else {
                    wx.showToast({ title: res.data.message || '更新失败', icon: 'none' });
                }
            },
            fail: () => wx.showToast({ title: '网络错误', icon: 'none' }),
        });
    },

    handleBack() {
        wx.navigateBack({ delta: 1 });
    }
});
