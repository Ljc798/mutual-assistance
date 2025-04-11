import { initWebSocket } from './utils/ws'; // 👈 引入你的 ws 封装模块

App<IAppOption>({
    globalData: {
        userInfo: null,
        token: null,
    },

    async onLaunch() {
        console.log("✅ 小程序启动中...");

        const token = wx.getStorageSync("token") || null;
        const user = wx.getStorageSync("user") || null;

        if (!token) {
            console.warn("⚠️ 未找到 token，跳转注册页...");
            wx.redirectTo({ url: "/pages/register/register" });
            return;
        }

        if (user) {
            this.globalData.userInfo = user;
            this.globalData.token = token;

            // ✅ 一旦 user 存在，就初始化 WebSocket 连接
            console.log(`🌐 初始化 WebSocket for userId: ${user.id}`);
            initWebSocket(user.id);
        }

        // 无论有无 user，本地 token 都要校验一次
        this.verifyUserFromServer(token);
    },

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

                    // 👇 防止因 onLaunch 先触发验证，user 未初始化导致 WS 没连上
                    if (!this.wsInitialized) {
                        initWebSocket(res.data.user.id);
                        this.wsInitialized = true;
                    }

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

    clearUserData() {
        wx.removeStorageSync("user");
        wx.removeStorageSync("token");
        this.globalData.userInfo = null;
        this.globalData.token = null;
        wx.redirectTo({ url: "/pages/register/register" });
    },

    setGlobalUserInfo(user: any, token: string) {
        console.log("📌 更新全局用户信息:", user);

        this.globalData.userInfo = user;
        this.globalData.token = token;

        wx.setStorageSync("user", user);
        wx.setStorageSync("token", token);

        // ✅ 确保新登录用户也能自动建立 WS 连接
        initWebSocket(user.id);
        this.wsInitialized = true;
    },

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