import { initWebSocket, getUnreadCount } from './utils/ws';

App<IAppOption>({
    globalData: {
        userInfo: null,
        token: null,
        // 🏫 各页面独立的学校选择
        selectedTaskSchoolId: null,      // 主页任务用
        selectedTaskSchoolName: '',

        selectedSquareSchoolId: null,    // 广场页帖子用
        selectedSquareSchoolName: '',

        selectedUserSchoolId: null,      // 用户资料页用
        selectedUserSchoolName: '',
    },

    async onLaunch() {
        const token = wx.getStorageSync("token") || null;
        const user = wx.getStorageSync("user") || null;

        if (!token) {
            console.warn("⚠️ 未找到 token，本次启动为游客身份");
            this.globalData.userInfo = null;
            this.globalData.token = null;
            return;
        }

        if (user) {
            this.globalData.userInfo = user;
            this.globalData.token = token;

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
                    this.globalData.userInfo = res.data.user;
                    wx.setStorageSync("user", res.data.user);

                    if (!this.wsInitialized) {
                        initWebSocket(res.data.user.id);
                        this.wsInitialized = true;
                    }
                } else {
                    console.warn("⚠️ token 无效或用户不存在，清除本地用户信息");
                    this.clearUserData(false); // 不跳转
                }
            },
            fail: (err) => {
                console.error("❌ 网络请求失败:", err);
                wx.showToast({ title: "网络错误，请稍后再试", icon: "none" });
            }
        });
    },

    clearUserData(shouldRedirect = true) {
        wx.removeStorageSync("user");
        wx.removeStorageSync("token");
        this.globalData.userInfo = null;
        this.globalData.token = null;

        if (shouldRedirect) {
            wx.redirectTo({ url: "/pages/register/register" });
        }
    },

    setGlobalUserInfo(user: any, token: string) {
        console.log("📌 更新全局用户信息:", user);

        this.globalData.userInfo = user;
        this.globalData.token = token;
        this.globalData.selectedUserSchoolId = user.school_id || null;
        this.globalData.selectedUserSchoolName = user.school_name || '';

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
                    this.globalData.selectedUserSchoolId = res.data.user.school_id || null;
                    this.globalData.selectedUserSchoolName = res.data.user.school_name || '';
                    callback?.(res.data.user);
                }
            }
        });
    }
});