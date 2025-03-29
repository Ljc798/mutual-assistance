Page({
    data: {
        userInfo: null, // 用户信息
        isVip: false,
        vip_expire_time: '', // 显示用的格式化时间
    },

    onLoad() {
        this.loadUserInfo(); // 页面加载时获取用户信息
    },

    onShow() {
        this.loadUserInfo(); // 每次页面显示时获取最新数据
    },

    // ✅ 加载用户信息并判断是否为 VIP
    loadUserInfo() {
        const app = getApp();

        let user = app.globalData.userInfo || wx.getStorageSync("user");

        if (user) {
            console.log("📌 使用已有用户信息:", user);
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
            wx.redirectTo({ url: "/pages/register/register" });
            return;
        }

        wx.request({
            url: "https://mutualcampus.top/api/user/info",
            method: "GET",
            header: { Authorization: `Bearer ${token}` },
            success: (res: any) => {
                if (res.data.success) {
                    const user = res.data.user;
                    console.log("📡 获取到用户信息:", user);

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

    // 跳转到信息修改页面
    goToEditProfile() {
        wx.navigateTo({ url: "/pages/edit-profile/edit-profile" });
    },

    goToShop() {
        wx.navigateTo({ url: "/pages/shop/shop" });
    },

    // 跳转订单页
    handleOrderClick() {
        wx.navigateTo({ url: "/pages/order/order" });
    }
});