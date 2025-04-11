import { initWebSocket, getUnreadCount } from './utils/ws';

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

            console.log(`🌐 初始化 WebSocket for userId: ${user.id}`);
            initWebSocket(user.id);
        }

        // ✅ ✅ ✅ 监听小程序级别的通知消息变化（⚠️ 你需要添加这一部分）
        wx.onAppEvent?.('notifyUnreadChanged', (count: number) => {
            console.log('🔴 全局未读数变更:', count);
            this.globalData.hasUnread = count > 0;
        });

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