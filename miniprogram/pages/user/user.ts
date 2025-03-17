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

    // ✅ **从全局数据或本地存储加载用户信息**
    loadUserInfo() {
        const app = getApp();
        
        // ✅ **1. 先检查 `globalData` 是否有数据**
        if (app.globalData.userInfo) {
            console.log("📌 从 globalData 直接获取用户信息:", app.globalData.userInfo);
            this.setData({ userInfo: app.globalData.userInfo });
            return;
        }

        // ✅ **2. 如果 `globalData` 为空，尝试从本地存储读取**
        const storedUser = wx.getStorageSync("user");
        if (storedUser) {
            console.log("📌 从本地存储加载用户信息:", storedUser);
            this.setData({ userInfo: storedUser });

            // **同步到 `globalData`，避免下次重复请求**
            app.globalData.userInfo = storedUser;
            return;
        }

        // ✅ **3. 服务器获取（最后手段）**
        console.warn("⚠️ 用户信息丢失，尝试从服务器获取...");
        this.getUserInfo();
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