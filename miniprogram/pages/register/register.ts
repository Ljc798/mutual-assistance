Page({
    data: {
        phoneNumber: "",
        isLoggedIn: false,
        userInfo: null
    },

    onLoad() {
        this.checkLoginStatus();
    },

    checkLoginStatus() {
        const token = wx.getStorageSync("token");
        const user = wx.getStorageSync("user");
        if (token && user) {
            console.log("✅ 读取到本地用户数据:", user);
            this.setData({ isLoggedIn: true, userInfo: user });
        } else if (token) {
            console.log("⚠️ 用户信息丢失，重新获取...");
            this.getUserInfo();
        }
    },

    getPhoneNumber(e: any) {
        if (e.detail.errMsg !== "getPhoneNumber:ok") {
            wx.showToast({ title: "用户拒绝授权", icon: "none" });
            return;
        }

        wx.login({
            success: (loginRes) => {
                if (!loginRes.code) {
                    wx.showToast({ title: "登录失败", icon: "none" });
                    return;
                }

                wx.showLoading({ title: "登录中..." });

                wx.request({
                    url: "https://mutualcampus.top/api/user/phone-login",
                    method: "POST",
                    data: {
                        phoneCode: e.detail.code, // 手机号授权的 code
                        loginCode: loginRes.code  // wx.login 拿到的 code，用来换 openid
                    },
                    success: (res: any) => {
                        wx.hideLoading();
                        if (res.data.success) {
                            wx.setStorageSync("token", res.data.token);
                            wx.setStorageSync("user", res.data.user);

                            getApp().setGlobalUserInfo(res.data.user, res.data.token);

                            this.setData({
                                isLoggedIn: true,
                                userInfo: res.data.user
                            });

                            const targetPage = res.data.isNewUser
                                ? "/pages/edit-profile/edit-profile?new=1"
                                : "/pages/home/home";

                            wx.redirectTo({ url: targetPage });
                        } else {
                            wx.showToast({ title: res.data.message, icon: "none" });
                        }
                    },
                    fail: () => {
                        wx.hideLoading();
                        wx.showToast({ title: "登录失败", icon: "none" });
                    }
                });
            }
        });
    },

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
                    console.log("📡 获取到用户信息:", res.data.user);
                    this.setData({ userInfo: res.data.user });
                    wx.setStorageSync("user", res.data.user); // 存储到本地
                } else {
                    wx.showToast({ title: "获取用户信息失败", icon: "none" });
                }
            },
            fail: (err) => {
                console.error("❌ 获取用户信息失败", err);
                wx.showToast({ title: "网络错误，请稍后再试", icon: "none" });
            }
        });
    },

    logout() {
        wx.removeStorageSync("token");
        wx.removeStorageSync("user"); // 清除用户信息
        this.setData({ isLoggedIn: false, userInfo: null });
    },
    goToHome() {
        wx.redirectTo({
            url: "/pages/home/home",
            success: () => {
                console.log("📌 已跳转到首页");
            },
            fail: (err) => {
                console.error("❌ 跳转失败", err);
            }
        });
    }
});