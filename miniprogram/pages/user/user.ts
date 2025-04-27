Page({
    data: {
        userInfo: null, // 用户信息
        isVip: false,
        vip_expire_time: '', // 显示用的格式化时间
        showFeedbackPopup: false,
        feedbackTitle: '',
        feedbackContent: '',
    },

    onLoad() {
        this.loadUserInfo(); // 页面加载时获取用户信息
    },

    onShow() {
        this.getUserInfo();
    },

    checkLoginAndGo(callback: Function) {
        const { userInfo } = this.data;
        if (!userInfo || !userInfo.id) {
            wx.showToast({
                title: "请先登录",
                icon: "none",
                duration: 1500
            });
            setTimeout(() => {
                this.goToLoginPage();
            }, 1500);
            return;
        }
        callback(); // ✅ 登录过，执行目标函数
    },

    // ✅ 加载用户信息并判断是否为 VIP
    loadUserInfo() {
        const app = getApp();

        let user = app.globalData.userInfo || wx.getStorageSync("user");

        if (user) {
            this.updateUserData(user);
        } else {
            console.warn("⚠️ 用户信息丢失，尝试从服务器获取...");
            this.getUserInfo();
        }
    },

    // ✅ 从服务器获取用户信息
    getUserInfo() {
        const token = wx.getStorageSync("token");
        if (!token) {
            wx.showToast({ title: "未登录，请重新登录", icon: "none" });
            return;
        }

        wx.request({
            url: "https://mutualcampus.top/api/user/info",
            method: "GET",
            header: { Authorization: `Bearer ${token}` },
            success: (res: any) => {
                if (res.data.success) {
                    const user = res.data.user;

                    wx.setStorageSync("user", user);
                    getApp().globalData.userInfo = user;

                    this.updateUserData(user);
                } else {
                    wx.showToast({ title: "获取用户信息失败", icon: "none" });
                }
            },
            fail: (err) => {
                console.error("❌ 获取用户信息失败:", err);
                wx.showToast({ title: "网络错误，请稍后再试", icon: "none" });
            }
        });
    },

    // ✅ 统一更新 data（含 VIP 判断）
    updateUserData(user: any) {
        const now = new Date();
        const expire = user.vip_expire_time ? new Date(user.vip_expire_time) : null;
        const isVip = expire && expire > now;

        this.setData({
            userInfo: user,
            isVip,
            vip_expire_time: isVip ? this.formatDate(expire) : ''
        });
    },

    // ✅ 日期格式化工具函数
    formatDate(date: Date): string {
        const y = date.getFullYear();
        const m = (date.getMonth() + 1).toString().padStart(2, "0");
        const d = date.getDate().toString().padStart(2, "0");
        return `${y}-${m}-${d}`;
    },

    goToEditProfile() {
        this.checkLoginAndGo(() => {
            wx.navigateTo({ url: "/pages/edit-profile/edit-profile" });
        });
    },
    
    goToShop() {
        this.checkLoginAndGo(() => {
            wx.navigateTo({ url: "/pages/shop/shop" });
        });
    },
    
    handleOrderClick() {
        this.checkLoginAndGo(() => {
            wx.navigateTo({ url: "/pages/order/other-orders" });
        });
    },
    
    handleSpaceClick() {
        this.checkLoginAndGo(() => {
            wx.navigateTo({ url: "/pages/mysquare/mysquare" });
        });
    },
    
    goToWallet() {
        this.checkLoginAndGo(() => {
            wx.navigateTo({ url: '/pages/wallet/wallet' });
        });
    },
    
    goToVipPage() {
        this.checkLoginAndGo(() => {
            wx.navigateTo({ url: '/pages/vip/vip' });
        });
    },
    
    onFeedbackClick() {
        this.checkLoginAndGo(() => {
            this.openFeedbackPopup();
        });
    },

    // 显示反馈窗
    openFeedbackPopup() {
        this.setData({ showFeedbackPopup: true });
    },

    // 隐藏反馈窗
    closeFeedbackPopup() {
        this.setData({ showFeedbackPopup: false, feedbackTitle: '', feedbackContent: '' });
    },

    onFeedbackTitleInput(e) {
        this.setData({ feedbackTitle: e.detail.value });
    },

    onFeedbackContentInput(e) {
        this.setData({ feedbackContent: e.detail.value });
    },

    submitFeedback() {
        const { feedbackTitle, feedbackContent } = this.data;
        const token = wx.getStorageSync("token");

        if (!feedbackContent || feedbackContent.length < 3) {
            return wx.showToast({ title: "内容太短", icon: "none" });
        }

        wx.request({
            url: "https://mutualcampus.top/api/feedback/submit",
            method: "POST",
            header: { Authorization: `Bearer ${token}` },
            data: {
                title: feedbackTitle,
                content: feedbackContent
            },
            success: (res) => {
                if (res.data.success) {
                    wx.showToast({ title: "感谢反馈 💌", icon: "success" });
                    this.closeFeedbackPopup();
                } else {
                    wx.showToast({ title: "提交失败", icon: "none" });
                }
            }
        });
    },

    goToLoginPage() {
        wx.navigateTo({
            url: '/pages/register/register',
        });
    },
});