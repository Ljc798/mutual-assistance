App<IAppOption>({
    globalData: {
        userInfo: null, // 全局存储用户信息
        token: null, // 全局存储 token
    },

    async onLaunch() {
        console.log("✅ 小程序启动中...");
    
        const token = wx.getStorageSync("token") || null;
    
        if (!token) {
            console.warn("⚠️ 未找到 token，跳转注册页...");
            wx.redirectTo({ url: "/pages/register/register" });
            return;
        }
    
        const user = wx.getStorageSync("user") || null;
    
        if (user) {
            this.globalData.userInfo = user;
            this.globalData.token = token;
        }
    
        // ✅ 无论是否有 user，都要验证 token 的有效性
        this.verifyUserFromServer(token);
    },

    // ✅ 服务器校验用户是否存在（仅在用户信息丢失时调用）
    verifyUserFromServer(token: string) {
        wx.request({
            url: "https://mutualcampus.top/api/user/info",
            method: "GET",
            header: { Authorization: `Bearer ${token}` },
            success: (res: any) => {
                if (res.data.success) {
                    console.log("✅ 服务器验证成功，用户存在:", res.data.user);
                    this.globalData.userInfo = res.data.user;
                    wx.setStorageSync("user", res.data.user);
                } else {
                    console.warn("⚠️ token 无效或用户不存在，清除数据并跳转注册页");
                    this.clearUserData();
                }
            },
            fail: (err) => {
                console.error("❌ 网络请求失败:", err);
                wx.showToast({ title: "网络错误，请稍后再试", icon: "none" });
            }
        });
    },

    // ✅ 清除本地存储的用户信息（用户主动退出时调用）
    clearUserData() {
        wx.removeStorageSync("user");
        wx.removeStorageSync("token");
        this.globalData.userInfo = null;
        this.globalData.token = null;
        wx.redirectTo({ url: "/pages/register/register" });
    },

    // ✅ 用户登录成功后，存储 token 和用户信息
    setGlobalUserInfo(user: any, token: string) {
        console.log("📌 更新全局用户信息:", user);

        this.globalData.userInfo = user;
        this.globalData.token = token;

        wx.setStorageSync("user", user);
        wx.setStorageSync("token", token);
    },

    // 在 app.ts 中定义
    refreshUserInfo(callback?: Function) {
        const token = wx.getStorageSync("token");
        if (!token) return;

        wx.request({
            url: "https://mutualcampus.top/api/user/info",
            method: "GET",
            header: { Authorization: `Bearer ${token}` },
            success: (res: any) => {
                if (res.data.success) {
                    this.globalData.userInfo = res.data.user;
                    wx.setStorageSync("user", res.data.user);
                    callback?.(res.data.user);
                }
            }
        });
    }
}); 