Page({
    data: {
        phoneNumber: "",
        isLoggedIn: false,
        userInfo: null,
        showAdminLogin: false,
        adminPhone: '',
        adminPwd: '',
        hasAgreed: false,
    },

    onLoad() {
        this.checkLoginStatus();
    },

    checkLoginStatus() {
        const token = wx.getStorageSync("token");
        const user = wx.getStorageSync("user");
        if (token && user) {
            this.setData({ isLoggedIn: true, userInfo: user });
        } else if (token) {
            console.log("⚠️ 用户信息丢失，重新获取...");
            this.getUserInfo();
        }
    },

    getPhoneNumber(e: any) {
        if (!this.data.hasAgreed) {
            // ✨ 未勾选协议时提示并 shake 动画
            wx.showToast({ title: "请先阅读并同意协议", icon: "none" });
            this.setData({ shakeAgreement: true });
            setTimeout(() => this.setData({ shakeAgreement: false }), 500);
            return;
        }

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

    handleAgreementWarning() {
        wx.showToast({
            title: "请先阅读并同意协议",
            icon: "none"
        });

        this.setData({ shakeAgreement: true });
        setTimeout(() => {
            this.setData({ shakeAgreement: false });
        }, 500);
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
            },
            fail: (err) => {
                console.error("❌ 跳转失败", err);
            }
        });
    },
    openAdminLoginModal() {
        this.setData({ showAdminLogin: true });
    },

    onAdminPhoneInput(e) {
        this.setData({ adminPhone: e.detail.value });
    },

    onAdminPwdInput(e) {
        this.setData({ adminPwd: e.detail.value });
    },

    submitAdminLogin() {
        const { adminPhone, adminPwd } = this.data;
        wx.request({
            url: "https://mutualcampus.top/api/user/admin-login",
            method: "POST",
            data: { phone: adminPhone, password: adminPwd },
            success: (res: any) => {
                if (res.data.success) {
                    wx.setStorageSync("token", res.data.token);
                    wx.setStorageSync("user", res.data.user);
                    wx.redirectTo({ url: "/pages/home/home" });
                } else {
                    wx.showToast({ title: res.data.message || "登录失败", icon: "none" });
                }
            }
        })
    },

    closeAdminLoginModal() {
        this.setData({
            showAdminLogin: false,
            adminPhone: '',
            adminPassword: ''
        });
    },

    toggleAgreement() {
        this.setData({
            hasAgreed: !this.data.hasAgreed
        });
    },

    openTerms() {
        wx.navigateTo({
            url: '/pages/agreements/terms', // 👈 创建页面展示协议内容
        });
    },

    openPrivacy() {
        wx.navigateTo({
            url: '/pages/agreements/privacy',
        });
    }
});