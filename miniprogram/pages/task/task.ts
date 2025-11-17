import { checkTextContent } from "../../utils/security";
import { BASE_URL } from '../../config/env';

Page({
    data: {
        task: {} as Task,  // 存储任务详细信息
        formattedDDL: "",  // 格式化后的时间
        statusText: "", // 任务状态文本
        showPopup: false,
        commentContent: '',
        commentPrice: '',
        bids: [],
        isOwner: false,
        isAuthorizedUser: false,
        canLeaveMessage: false,
        userId: null,
        isSubmitting: false,
    },

    onLoad(options: any) {
        const app = getApp();  // 👈 加上
        const userId = app.globalData.userInfo?.id || null; // 保险一点
        if (!options.taskId) {
            wx.showToast({ title: "任务 ID 不存在", icon: "none" });
            return;
        }
        this.loadTaskDetail(options.taskId);
        this.loadBids(options.taskId);
    },
    onshow(options: any) {
        this.loadTaskDetail(options.taskId);
    },

    onPullDownRefresh() {
        const taskId = this.data.taskId;
        if (!taskId) {
            wx.stopPullDownRefresh();
            return;
        }

        Promise.all([
            this.loadTaskDetail(taskId),
            this.loadBids(taskId)
        ])
            .finally(() => {
                wx.stopPullDownRefresh();
            });
    },

    async loadTaskDetail(taskId: string) {
        wx.showLoading({ title: "加载任务..." });

        wx.request({
            url: `${BASE_URL}/task/${taskId}`,
            method: "GET",
            success: (res: any) => {
                if (!res.data || !res.data.id) {
                    wx.showToast({ title: "任务不存在", icon: "none" });
                    return;
                }

                const task = res.data;
                const formattedDDL = this.formatTime(task.DDL);
                const statusText = this.getStatusText(task.status);

                const app = getApp();
                const currentUserId = app.globalData.userInfo?.id;
                const isOwner = currentUserId === task.employer_id;

                const isAuthorizedUser = (
                    currentUserId === task.employer_id ||
                    currentUserId === task.employee_id
                );

                // ✅ 新增成交价判断逻辑
                const displayPrice = task.status >= 1
                    ? Number(task.pay_amount).toFixed(2)
                    : Number(task.offer).toFixed(2);

                this.setData({
                    task: {
                        ...task,
                        displayPrice,
                    },
                    formattedDDL,
                    statusText,
                    isOwner,
                    isAuthorizedUser,
                    canLeaveMessage: task.status === 0
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
        date.setHours(date.getHours());

        const month = date.getMonth() + 1; // 获取月份（从 0 开始）
        const day = date.getDate(); // 获取日期
        const hours = date.getHours(); // 获取小时
        const minutes = date.getMinutes(); // 获取分钟

        return `${month}-${day} ${hours}:${minutes < 10 ? "0" + minutes : minutes}`; // 保证分钟是两位数
    },

    loadBids(taskId: string) {
        const token = wx.getStorageSync("token");  // 获取 token
        if (!token) {
            wx.showToast({ title: "请先登录", icon: "none" });
            return;
        }

        wx.request({
            url: `${BASE_URL}/task/${taskId}/bids`,
            method: 'GET',
            header: {
                Authorization: `Bearer ${token}`  // 添加 token
            },
            success: (res) => {
                if (res.data.success) {
                    const app = getApp();
                    const myUserId = app.globalData.userInfo?.id;

                    const processedBids = res.data.bids.map(bid => ({
                        ...bid,
                        isMyBid: bid.user_id === myUserId // 👈 自己出的就标记 true
                    }));

                    this.setData({ bids: processedBids });
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
        const token = wx.getStorageSync("token");  // 获取 token
        if (!token) {
            wx.showToast({ title: "请先登录", icon: "none" });
            return;
        }
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

    async submitMessage(e?: any) {
        // 避免事件冒泡带来的重复
        if (e && typeof e.stopPropagation === "function") e.stopPropagation();

        if (this.data.isSubmitting) return; // ✅ 防连点
        this.setData({ isSubmitting: true });

        try {
            const app = getApp();
            const userId = app.globalData.userInfo?.id;
            const { commentContent, commentPrice, task } = this.data;

            if (!commentContent.trim() || !commentPrice) {
                wx.showToast({ title: '请填写留言和出价', icon: 'none' });
                return;
            }

            const token = wx.getStorageSync("token");
            if (!token) {
                wx.showToast({ title: "请先登录", icon: "none" });
                return;
            }

            const isSafe = await checkTextContent(commentContent);
            if (!isSafe) return;

            await new Promise((resolve, reject) => {
                wx.request({
                    url: `${BASE_URL}/task/bid`,
                    method: 'POST',
                    header: { Authorization: `Bearer ${token}` },
                    data: {
                        task_id: task.id,
                        user_id: userId,
                        price: commentPrice,
                        advantage: commentContent,
                    },
                    success: (res) => {
                        if (res.data.success) {
                            wx.showToast({ title: '投标成功', icon: 'success' });
                            this.setData({ showPopup: false, commentContent: '', commentPrice: '' });
                            this.loadBids(task.id);
                            resolve(null);
                        } else {
                            wx.showToast({ title: res.data.message || '提交失败', icon: 'none' });
                            reject(new Error('submit failed'));
                        }
                    },
                    fail: reject
                });
            });
        } catch (err) {
            console.error('提交异常：', err);
            // 这里的 toast 已在 success 分支里处理过失败信息，可保留一个兜底
            // wx.showToast({ title: '网络错误', icon: 'none' });
        } finally {
            this.setData({ isSubmitting: false }); // ✅ 无论成功失败都解锁
        }
    },

    handleCancelBid(e) {
        const bidId = e.currentTarget.dataset.bidid;
        const token = wx.getStorageSync("token");
        const userId = getApp().globalData.userInfo?.id;
        const taskId = this.data.task.id; // 👈补上任务ID

        wx.showModal({
            title: "确认撤回出价",
            content: "撤回后将无法恢复，确定吗？",
            success: (res) => {
                if (res.confirm) {
                    wx.request({
                        url: `${BASE_URL}/task/bid/cancel`,
                        method: "POST",
                        header: { Authorization: `Bearer ${token}` },
                        data: { bid_id: bidId, user_id: userId },
                        success: (res) => {
                            if (res.data.success) {
                                wx.showToast({ title: "撤回成功", icon: "success" });
                                this.loadBids(taskId); // 👈 改成正确的方法！
                            } else {
                                wx.showToast({ title: res.data.message || "撤回失败", icon: "none" });
                            }
                        },
                        fail: () => {
                            wx.showToast({ title: "网络错误", icon: "none" });
                        }
                    });
                }
            }
        });
    },

    goToChat(e) {
        const token = wx.getStorageSync("token");  // 获取 token
        if (!token) {
            wx.showToast({ title: "请先登录", icon: "none" });
            return;
        }
        const targetId = e.currentTarget.dataset.targetid;
        const targetName = e.currentTarget.dataset.username;
        wx.navigateTo({
            url: `/pages/chat/chat?targetId=${targetId}&targetName=${targetName}`
        });
    },

    editTask() {
        const { task } = this.data;
        wx.navigateTo({
            url: `/pages/edit-task/edit-task?taskId=${task.id}`,
        });
    },

    confirmAssign(e) {
        const receiverId = e.currentTarget.dataset.userid;
        const username = e.currentTarget.dataset.username;
        const taskId = this.data.task.id;
        const bidId = e.currentTarget.dataset.bidid;
        const openid = getApp().globalData.userInfo?.openid;
        console.log(bidId);


        wx.showModal({
            title: '确认指派',
            content: `确定将该任务指派给「${username}」吗？`,
            success: (res) => {
                if (!res.confirm) return;

                wx.request({
                    url: `${BASE_URL}/payment/create`,
                    method: 'POST',
                    data: {
                        openid,
                        taskId,
                        bid_id: bidId,
                        receiverId,
                        description: `支付任务 #${taskId}`,
                    },
                    success: (res) => {
                        if (res.data.success) {
                            console.log(res.data);

                            const { timeStamp, nonceStr, paySign, package: pkg } = res.data.paymentParams;
                            console.log(nonceStr);

                            wx.requestPayment({
                                timeStamp,
                                nonceStr,
                                package: pkg, // 注意不是关键字“package”！
                                signType: 'RSA',
                                paySign,
                                success: () => {
                                    wx.showToast({ title: '支付成功', icon: 'success' });
                                    // ✅ 支付成功后重新加载任务和投标列表
                                    const taskId = this.data.task.id;
                                    this.loadTaskDetail(taskId);
                                },
                                fail: () => {
                                    wx.showToast({ title: '支付取消', icon: 'none' });
                                }
                            });
                        } else {
                            wx.showToast({ title: res.data.message || '发起支付失败', icon: 'none' });
                        }
                    }
                });
            }
        });
    },

    async acceptFixedTask() {
        const token = wx.getStorageSync("token");
        if (!token) {
            wx.showToast({ title: "请先登录", icon: "none" });
            return;
        }
        const taskId = this.data.task.id;
        wx.showLoading({ title: "正在接单..." });
        try {
            const res: any = await new Promise((resolve, reject) => {
                wx.request({
                    url: `${BASE_URL}/task/${taskId}/accept`,
                    method: 'POST',
                    header: { Authorization: `Bearer ${token}` },
                    success: resolve,
                    fail: reject
                });
            });
            if (res?.data?.success) {
                wx.showToast({ title: '接单成功', icon: 'success' });
                await this.loadTaskDetail(taskId);
            } else {
                wx.showToast({ title: res?.data?.message || '接单失败', icon: 'none' });
            }
        } catch (err) {
            wx.showToast({ title: '网络错误', icon: 'none' });
        } finally {
            wx.hideLoading();
        }
    }
});