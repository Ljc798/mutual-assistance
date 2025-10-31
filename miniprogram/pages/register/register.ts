import { BASE_URL } from '../../config/env';

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
        console.log("getPhoneNumber event:", e);
    
        // 检查是否同意协议
        if (!this.data.hasAgreed) {
            wx.showToast({ title: "请先阅读并同意协议", icon: "none" });
            this.setData({ shakeAgreement: true });
            setTimeout(() => this.setData({ shakeAgreement: false }), 500);
            return;
        }
    
        // 判断用户是否允许手机号授权
        if (!e.detail.code) {
            wx.showToast({ title: "获取手机号失败，请重试", icon: "none" });
            console.warn("❌ getPhoneNumber failed:", e.detail.errMsg);
            return;
        }
    
        // 获取微信临时登录 code（换 openid/session_key）
        wx.login({
            success: (loginRes) => {
                if (!loginRes.code) {
                    wx.showToast({ title: "登录失败", icon: "none" });
                    return;
                }
    
                wx.showLoading({ title: "登录中..." });
    
                // 调用你自己的后端 API
                wx.request({
                    url: `${BASE_URL}/user/phone-login`,
                    method: "POST",
                    data: {
                        phoneCode: e.detail.code, // 微信手机号临时code
                        loginCode: loginRes.code  // wx.login code
                    },
                    success: (res: any) => {
                        wx.hideLoading();
                        console.log("✅ login response:", res.data);
    
                        if (res.data.success) {
                            // 保存 token 与用户信息
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
                            wx.showToast({ title: res.data.message || "登录失败", icon: "none" });
                        }
                    },
                    fail: (err) => {
                        wx.hideLoading();
                        console.error("❌ login request error:", err);
                        wx.showToast({ title: "网络错误，请重试", icon: "none" });
                    }
                });
            },
            fail: () => {
                wx.showToast({ title: "登录失败", icon: "none" });
            }
        });
    },
    

    // 替换旧的手机号登录逻辑，改成微信授权登录
    // loginByWeChat() {
    //     if (!this.data.hasAgreed) {
    //         wx.showToast({ title: "请先阅读并同意协议", icon: "none" });
    //         this.setData({ shakeAgreement: true });
    //         setTimeout(() => this.setData({ shakeAgreement: false }), 500);
    //         return;
    //     }

    //     wx.login({
    //         success: (res) => {
    //             const code = res.code;
    //             if (!code) {
    //                 wx.showToast({ title: "登录失败", icon: "none" });
    //                 return;
    //             }

    //             wx.showLoading({ title: "登录中..." });

    //             wx.request({
    //                 url: `${BASE_URL}/user/wx-login`,
    //                 method: "POST",
    //                 data: { code },
    //                 success: (res: any) => {
    //                     wx.hideLoading();
    //                     if (res.data.success) {
    //                         wx.setStorageSync("token", res.data.token);
    //                         wx.setStorageSync("user", res.data.user);
    //                         getApp().setGlobalUserInfo(res.data.user, res.data.token);

    //                         this.setData({
    //                             isLoggedIn: true,
    //                             userInfo: res.data.user
    //                         });

    //                         const targetPage = res.data.isNewUser
    //                             ? "/pages/edit-profile/edit-profile?new=1"
    //                             : "/pages/home/home";

    //                         wx.redirectTo({ url: targetPage });
    //                     } else {
    //                         wx.showToast({ title: res.data.message, icon: "none" });
    //                     }
    //                 },
    //                 fail: () => {
    //                     wx.hideLoading();
    //                     wx.showToast({ title: "登录失败", icon: "none" });
    //                 }
    //             });
    //         }
    //     });
    // },

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
            url: `${BASE_URL}/user/info`,
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
            url: `${BASE_URL}/user/admin-login`,
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