// ✅ pages/order/order.ts
Page({
    data: {
        filterOptions1: ["全部", "我帮助的", "我发布的"],
        activeFilter1: 0,
        filterOptions2: ["全部", "待接单", "进行中", "已完成"],
        activeFilter2: 0,
        orders: [], // 真实订单数据
        userId: null,
        hasConfirmed: false,
        showDoneButton: false,
        showCancelModal: false,
        cancelReason: "",
        currentOrderId: null,
        freeCancelCount: 3, // 后端接口返回用户本月剩余取消次数
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

    onPullDownRefresh() {
        const app = getApp();
        const userId = app.globalData.userInfo?.id;
        if (!userId) {
            wx.showToast({ title: "请先登录", icon: "none" });
            return;
        }
        this.setData({ userId });

        this.fetchOrders();

        wx.stopPullDownRefresh();
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
        const token = wx.getStorageSync("token");
        wx.request({
            url: `https://mutualcampus.top/api/task/my`,
            method: "GET",
            header: { Authorization: `Bearer ${token}`, },
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
                    console.log(res.data);


                    const mapped = filtered.map(task => {
                        let actionText = '';
                        let showDoneButton = false;
                        let role = '';

                        // 👤 自动判断当前身份
                        if (task.employer_id === userId) {
                            role = 'employer';
                        } else if (task.employee_id === userId) {
                            role = 'employee';
                        }

                        // ✅ 确认状态
                        const employerDone = task.employer_done === 1;
                        const employeeDone = task.employee_done === 1;
                        const hasConfirmed = (role === 'employer') ? employerDone : employeeDone;
                        const otherConfirmed = (role === 'employer') ? employeeDone : employerDone;

                        // 🧠 状态文本和按钮显示逻辑
                        if (task.status === 0) {
                            actionText = '等待接单中…';
                        } else if (task.status === 1) {
                            if (hasConfirmed && otherConfirmed) {
                                actionText = '任务已完成 ✅';
                                showDoneButton = false;
                            } else if (hasConfirmed && !otherConfirmed) {
                                actionText = '待对方确认...';
                                showDoneButton = false;
                            } else {
                                actionText = '请确认完成任务';
                                showDoneButton = true;
                            }
                        } else if (task.status === 2) {
                            actionText = '订单已完成';
                        }

                        return {
                            orderId: task.id,
                            statusCode: task.status,
                            status: this.translateStatus(task.status),
                            title: task.title,
                            salary: `¥${task.status >= 1 ? task.pay_amount : task.offer}`,
                            time: this.formatTime(task.DDL),
                            actionText,
                            showDoneButton,
                            role,
                            employer_done: employerDone,  // 👈 加这个
                            employee_done: employeeDone,  // 👈 还有这个
                            hasConfirmed                // 👈 这个你已经加了，保留
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
        date.setHours(date.getHours() - 8);
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
        const taskId = e.currentTarget.dataset.orderId;
        const token = wx.getStorageSync("token");

        if (!token) {
            wx.showToast({ title: "请先登录", icon: "none" });
            return;
        }

        wx.request({
            url: `https://mutualcampus.top/api/task/${taskId}/confirm-done`,
            method: "POST",
            header: {
                Authorization: `Bearer ${token}`
            },
            success: (res) => {
                if (res.data.success) {
                    wx.showToast({ title: res.data.message || "操作成功", icon: "success" });
                    // 重新拉订单或更新页面
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

    // 点击取消按钮
    handleCancelTask(e) {
        const orderId = e.currentTarget.dataset.orderId;
        const app = getApp();
        const userId = app.globalData.userInfo?.id;
        const token = wx.getStorageSync('token');
      
        if (!userId) {
          wx.showToast({ title: "请先登录", icon: "none" });
          return;
        }
      
        // 1. 先打开弹窗
        this.setData({
          currentOrderId: orderId,
          showCancelModal: true,
          cancelReason: "",
          freeCancelCount: 0 // 新增字段
        });
      
        // 2. 调用后端查剩余免费取消次数
        wx.request({
          url: `https://mutualcampus.top/api/task/cancel/count`,
          method: "GET",
          header: {
            Authorization: `Bearer ${token}`
          },
          data: {
            user_id: userId
          },
          success: (res) => {
            if (res.data.success) {
              this.setData({
                freeCancelCount: res.data.freeCancelCount
              });
            } else {
              console.error('❌ 查询取消次数失败:', res.data.message);
            }
          },
          fail: (err) => {
            console.error('❌ 查询取消次数失败:', err);
          }
        });
      },

    // 关闭弹窗
    closeCancelModal() {
        this.setData({
            showCancelModal: false,
            cancelReason: "",
            currentOrderId: null
        });
    },

    // 绑定输入取消原因
    handleCancelReasonInput(e) {
        this.setData({
            cancelReason: e.detail.value
        });
    },

    // 确认取消任务
    confirmCancelTask() {
        const app = getApp();
        const { cancelReason, currentOrderId, orders } = this.data;
        const token = wx.getStorageSync("token");
    
        if (!cancelReason.trim()) {
            wx.showToast({ title: "请输入取消原因", icon: "none" });
            return;
        }
    
        const currentOrder = orders.find(order => order.orderId === currentOrderId);
        if (!currentOrder) {
            wx.showToast({ title: "订单不存在", icon: "none" });
            return;
        }
    
        const role = currentOrder.role; // 直接用你之前映射好的role
    
        wx.showLoading({ title: "取消中..." });
    
        wx.request({
            url: "https://mutualcampus.top/api/task/cancel",
            method: "POST",
            header: {
                Authorization: `Bearer ${token}`
            },
            data: {
                task_id: currentOrderId,
                user_id: app.globalData.userInfo?.id,
                role,
                cancel_reason: cancelReason
            },
            success: (res) => {
                wx.hideLoading();
                if (res.data.success) {
                    wx.showToast({ title: "取消成功", icon: "success" });
                    this.setData({ showCancelModal: false });
                    this.fetchOrders(); // 重新拉取订单列表，别忘了！
                } else {
                    wx.showToast({ title: res.data.message || "取消失败", icon: "none" });
                }
            },
            fail: (err) => {
                wx.hideLoading();
                console.error("❌ 取消失败:", err);
                wx.showToast({ title: "网络错误", icon: "none" });
            }
        });
    },

});