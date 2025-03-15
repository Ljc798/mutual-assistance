Page({
    data: {
        userInfo: null, // 用户信息
    },

    onLoad() {
        this.loadUserInfo(); // 页面加载时获取用户信息
    },

    onShow() {
        this.loadUserInfo(); // **每次页面显示时获取最新数据**
    },

    // ✅ **优化获取用户信息的逻辑**
    loadUserInfo() {
        const app = getApp();
        
        if (app.globalData.userInfo) {
            // ✅ 直接从 `globalData` 读取，避免重复请求
            console.log("📌 从 globalData 获取用户信息:", app.globalData.userInfo);
            this.setData({ userInfo: app.globalData.userInfo });
        } else {
            // ✅ 尝试从本地存储读取
            const storedUser = wx.getStorageSync("user");
            if (storedUser) {
                console.log("📌 从本地存储加载用户信息:", storedUser);
                this.setData({ userInfo: storedUser });
                app.globalData.userInfo = storedUser; // 同步到 `globalData`
            } else {
                console.warn("⚠️ 用户信息丢失，尝试从服务器获取...");
                this.getUserInfo(); // 服务器获取
            }
        }
    },

    // ✅ **从后端获取用户信息**
    getUserInfo() {
        const token = wx.getStorageSync("token");
        if (!token) {
            wx.showToast({ title: "未登录，请重新登录", icon: "none" });
            wx.redirectTo({ url: "/pages/register/register" });
            return;
        }

        wx.request({
            url: "http://localhost:3000/api/user/info",
            method: "GET",
            header: { Authorization: `Bearer ${token}` },
            success: (res: any) => {
                if (res.data.success) {
                    console.log("📡 获取到用户信息:", res.data.user);
                    this.setData({ userInfo: res.data.user });

                    // ✅ 存储到本地 & `globalData`
                    wx.setStorageSync("user", res.data.user);
                    const app = getApp();
                    app.globalData.userInfo = res.data.user;
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

    // 跳转到信息修改页面
    goToEditProfile() {
        wx.navigateTo({
            url: "/pages/edit-profile/edit-profile"
        });
    },

    // ✅ **点击 "我的订单" 事件**
    handleOrderClick() {
        wx.navigateTo({ url: "/pages/order/order" });
    }
});