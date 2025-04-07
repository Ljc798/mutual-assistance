// ✅ pages/order/order.ts
Page({
    data: {
        filterOptions1: ["全部", "我帮助的", "我发布的"],
        activeFilter1: 0,
        filterOptions2: ["全部", "待接单", "进行中", "已完成"],
        activeFilter2: 0,
        orders: [], // 真实订单数据
        userId: null,
    },

    onLoad() {
        const app = getApp();
        const userId = app.globalData.userInfo?.id;
        if (!userId) {
            wx.showToast({ title: "请先登录", icon: "none" });
            return;
        }
        this.setData({ userId });

        this.fetchOrders();
    },

    // ✅ 返回上一页
    handleBack() {
        wx.navigateBack({ delta: 1 });
    },

    // ✅ 切换一级筛选
    selectFilter1(e) {
        this.setData({ activeFilter1: e.currentTarget.dataset.index }, this.fetchOrders);
    },

    // ✅ 切换二级筛选
    selectFilter2(e) {
        this.setData({ activeFilter2: e.currentTarget.dataset.index }, this.fetchOrders);
    },

    // ✅ 拉取数据 + 筛选
    fetchOrders() {
        const { userId, activeFilter1, activeFilter2 } = this.data;

        wx.request({
            url: `https://mutualcampus.top/api/task/my`,
            method: "GET",
            data: { userId },
            success: (res) => {
                if (res.data.success && Array.isArray(res.data.tasks)) {
                    const filtered = res.data.tasks.filter((task) => {
                        // 一级筛选
                        if (activeFilter1 === 1 && task.employee_id !== userId) return false; // 我帮助的
                        if (activeFilter1 === 2 && task.employer_id !== userId) return false; // 我发布的
                        // 二级筛选
                        if (activeFilter2 === 1 && task.status !== 0) return false; // 待接单
                        if (activeFilter2 === 2 && task.status !== 1) return false; // 进行中
                        if (activeFilter2 === 3 && task.status !== 2) return false; // 已完成
                        return true;
                    });

                    const mapped = filtered.map(task => {
                        let actionText = '';
                        let showDoneButton = false;
                        let role = ''; // 新增字段

                        // 自动判断身份
                        if (task.employer_id === userId) {
                            role = 'employer';
                        } else if (task.employee_id === userId) {
                            role = 'employee';
                        }
                        if (task.status === 0) {
                            actionText = '等待接单中…';
                        } else if (task.status === 1) {
                            actionText = '请确认完成任务';
                            showDoneButton = true;
                        } else if (task.status === 2) {
                            actionText = '订单已完成';
                        }

                        return {
                            orderId: task.id,
                            statusCode: task.status,
                            status: this.translateStatus(task.status),
                            title: task.title,
                            salary: `¥${task.offer}`,
                            time: this.formatTime(task.DDL),
                            actionText,
                            showDoneButton,
                            role
                        };
                    });

                    this.setData({ orders: mapped });
                } else {
                    wx.showToast({ title: "获取任务失败", icon: "none" });
                }
            },
            fail: () => {
                wx.showToast({ title: "网络错误", icon: "none" });
            }
        });
    },

    // ✅ 格式化时间
    formatTime(datetimeStr) {
        const date = new Date(datetimeStr);
        const pad = (n) => n.toString().padStart(2, '0');

        const month = pad(date.getMonth() + 1); // 月份是从 0 开始的
        const day = pad(date.getDate());
        const hour = pad(date.getHours());
        const minute = pad(date.getMinutes());

        return `${month}月${day}日 ${hour}:${minute}`;
    },

    // ✅ 状态转换
    translateStatus(statusCode) {
        return ["待接单", "进行中", "已完成"][statusCode] || "未知";
    },

    handleMarkDone(e) {
        const orderId = e.currentTarget.dataset.orderId;
        const app = getApp();
        const userId = app.globalData.userInfo?.id;
        const role = e.currentTarget.dataset.role;
        const token = wx.getStorageSync("token");


        if (!userId || !role) {
            wx.showToast({ title: "请先登录", icon: "none" });
            return;
        }

        wx.request({
            url: "https://mutualcampus.top/api/task/done",
            method: "POST",
            header: {
                Authorization: `Bearer ${token}`
            },
            data: {
                taskId: orderId,
                userId,
                role
            },
            success: (res) => {
                if (res.data.success) {
                    wx.showToast({ title: "标记完成成功", icon: "success" });
                    // 重新拉订单
                    this.fetchOrders();
                } else {
                    wx.showToast({ title: res.data.message || "操作失败", icon: "none" });
                }
            },
            fail: () => {
                wx.showToast({ title: "网络错误", icon: "none" });
            }
        });
    },
});