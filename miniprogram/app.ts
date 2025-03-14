App<IAppOption>({
    globalData: {
        userInfo: null, // 全局存储用户信息
        token: null, // 全局存储 token
    },

    async onLaunch() {
        console.log("✅ 小程序启动中...");

        // ✅ 获取本地存储的 token
        const token = wx.getStorageSync("token") || null;

        if (!token) {
            console.warn("⚠️ 未找到 token，跳转到注册页面...");
            wx.redirectTo({ url: "/pages/register/register" });
            return;
        }

        console.log("📡 服务器校验用户是否存在...");
        await this.verifyUserFromServer(token);
    },

    // ✅ 服务器校验用户是否存在
    async verifyUserFromServer(token: string) {
        wx.request({
            url: "http://localhost:3000/api/user/info",
            method: "GET",
            header: { Authorization: `Bearer ${token}` },
            success: (res: any) => {
                if (res.data.success) {
                    console.log("✅ 服务器验证成功，用户存在:", res.data.user);
                    this.globalData.userInfo = res.data.user;
                    wx.setStorageSync("user", res.data.user);
                } else {
                    console.warn("⚠️ 用户已被删除，清除本地数据...");
                    this.clearUserData();
                }
            },
            fail: (err) => {
                console.error("❌ 网络请求失败:", err);
                wx.showToast({ title: "网络错误，请稍后再试", icon: "none" });
            }
        });
    },

    // ✅ 清除本地存储的用户信息
    clearUserData() {
        wx.removeStorageSync("user");
        wx.removeStorageSync("token");
        this.globalData.userInfo = null;
        this.globalData.token = null;
        wx.redirectTo({ url: "/pages/register/register" });
    }
});