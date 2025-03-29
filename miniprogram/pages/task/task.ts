Page({
    data: {
        task: {} as Task,  // 存储任务详细信息
        formattedDDL: "",  // 格式化后的时间
        statusText: "", // 任务状态文本
        showPopup: false,
        commentContent: '',
        commentPrice: '',
        bids: [],
    },

    onLoad(options: any) {
        if (!options.taskId) {
            wx.showToast({ title: "任务 ID 不存在", icon: "none" });
            return;
        }

        console.log("✅ 详情页任务 ID:", options.taskId);
        this.loadTaskDetail(options.taskId);
        this.loadBids(options.taskId);
    },

    async loadTaskDetail(taskId: string) {
        wx.showLoading({ title: "加载任务..." });

        wx.request({
            url: `https://mutualcampus.top/api/task/${taskId}`, // 确保 API 端点正确
            method: "GET",
            success: (res: any) => {
                if (!res.data || !res.data.id) {
                    wx.showToast({ title: "任务不存在", icon: "none" });
                    return;
                }

                // 格式化数据
                const formattedDDL = this.formatTime(res.data.DDL); // 格式化DDL时间
                const statusText = this.getStatusText(res.data.status); // 格式化状态


                this.setData({
                    task: res.data,
                    formattedDDL, // 存储格式化时间
                    statusText,
                });
            },
            fail: (err: any) => {
                console.error("❌ 任务详情加载失败:", err);
                wx.showToast({ title: "加载失败", icon: "none" });
            },
            complete: () => wx.hideLoading(),
        });
    },


    // 返回上一级
    handleBack() {
        wx.navigateBack({ delta: 1 });
    },

    // 处理接单逻辑
    async handleAccept() {
        const { task } = this.data;

        wx.showLoading({ title: "接单中..." });

        try {
            const res = await wx.request({
                url: `https://mutualcampus.top/api/task/${task.id}/accept`, // API 更新任务状态
                method: "POST",
                success: (res: any) => {
                    console.log("✅ 接单成功:", res.data);

                    this.setData({
                        "task.status": 1,  // 更新任务状态
                        statusText: this.getStatusText(1), // 更新状态文本
                    });

                    wx.showToast({ title: '接单成功', icon: 'success' });
                },
                fail: (err: any) => {
                    console.error("❌ 接单失败:", err);
                    wx.showToast({ title: "接单失败", icon: "none" });
                },
                complete: () => wx.hideLoading(),
            });
        } catch (error) {
            console.error("❌ API 请求异常:", error);
            wx.showToast({ title: "网络异常", icon: "none" });
        }
    },

    // 根据任务状态返回对应文本
    getStatusText(status: number) {
        switch (status) {
            case 0: return "待接单";
            case 1: return "进行中";
            case 2: return "已完成";
            default: return "未知状态";
        }
    },

    // 时间格式化，显示为 "月-日 时:分"
    formatTime(DDL: string) {
        if (!DDL) return "时间未知"; // 防止 null/undefined

        const date = new Date(DDL);
        if (isNaN(date.getTime())) return "时间错误"; // 解析失败的处理

        const month = date.getMonth() + 1; // 获取月份（从 0 开始）
        const day = date.getDate(); // 获取日期
        const hours = date.getHours(); // 获取小时
        const minutes = date.getMinutes(); // 获取分钟

        return `${month}-${day} ${hours}:${minutes < 10 ? "0" + minutes : minutes}`; // 保证分钟是两位数
    },

    loadBids(taskId: string) {
        wx.request({
          url: `https://mutualcampus.top/api/task/${taskId}/bids`,
          method: 'GET',
          success: (res) => {
            if (res.data.success) {
              console.log("💬 加载留言成功:", res.data.bids);
              this.setData({ bids: res.data.bids });
            } else {
              wx.showToast({ title: '留言加载失败', icon: 'none' });
            }
          },
          fail: () => {
            wx.showToast({ title: '网络错误', icon: 'none' });
          }
        });
      },


    openPopup() {
        this.setData({ showPopup: true });
    },

    cancelPopup() {
        this.setData({ showPopup: false, commentContent: '', commentPrice: '' });
    },

    handleCommentInput(e) {
        this.setData({ commentContent: e.detail.value });
    },

    handlePriceInput(e) {
        this.setData({ commentPrice: e.detail.value });
    },

    submitMessage() {
        const app = getApp();
        const userId = app.globalData.userInfo?.id;
        const { commentContent, commentPrice, task } = this.data;

        if (!commentContent.trim() || !commentPrice) {
            wx.showToast({ title: '请填写留言和出价', icon: 'none' });
            return;
        }

        // ❗调用的是 /bid 接口
        wx.request({
            url: 'https://mutualcampus.top/api/task/bid',
            method: 'POST',
            data: {
                task_id: task.id,
                user_id: userId,
                price: commentPrice,
                advantage: commentContent,
            },
            success: (res) => {
                if (res.data.success) {
                    wx.showToast({ title: '投标成功', icon: 'success' });
                    this.setData({
                        showPopup: false,
                        commentContent: '',
                        commentPrice: ''
                    });
                    this.loadBids(task.id);
                } else {
                    wx.showToast({ title: res.data.message || '提交失败', icon: 'none' });
                }
            }
        });
    },
});