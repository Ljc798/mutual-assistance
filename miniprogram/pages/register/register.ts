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
        if (e.detail.errMsg === "getPhoneNumber:ok") {
            wx.showLoading({ title: "登录中..." });

            wx.request({
                url: "http://localhost:3000/api/user/phone-login",
                method: "POST",
                data: { code: e.detail.code },
                success: (res: any) => {
                    wx.hideLoading();

                    if (res.data.success) {
                        wx.setStorageSync("token", res.data.token);
                        wx.setStorageSync("user", res.data.user);  
                        wx.showToast({ title: "登录成功", icon: "success" });

                        this.setData({ 
                            isLoggedIn: true,
                            userInfo: res.data.user 
                        });

                        wx.redirectTo({
                            url: "/pages/home/home",
                            success: () => {
                                console.log("📌 已成功跳转到首页");
                            },
                            fail: (err) => {
                                console.error("❌ 跳转失败", err);
                            }
                        });
                    } else {
                        wx.showToast({ title: res.data.message, icon: "none" });
                    }
                },
                fail: (err) => {
                    wx.hideLoading();
                    console.error("❌ 手机号登录失败:", err);
                    wx.showToast({ title: "登录失败", icon: "none" });
                }
            });
        } else {
            wx.showToast({ title: "用户拒绝授权", icon: "none" });
        }
    },

    getUserInfo() {
        const token = wx.getStorageSync("token");
        if (!token) {
            wx.showToast({ title: "未登录，请重新登录", icon: "none" });
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