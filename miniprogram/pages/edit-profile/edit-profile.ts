Page({
    data: {
        userInfo: {}, // **全局用户信息**
        tempUserInfo: {}, // **临时修改数据**
        errorMessage: "" // **错误提示**
    },

    onLoad() {
        this.loadUserData();
    },

    // **加载全局用户数据，复制一份到 tempUserInfo**
    loadUserData() {
        const app = getApp();
        this.setData({
            userInfo: app.globalData.userInfo || {},
            tempUserInfo: JSON.parse(JSON.stringify(app.globalData.userInfo)) // **深拷贝，避免修改原数据**
        });
    },

    // **修改用户名**
    updateUsername(e: any) {
        this.setData({ "tempUserInfo.username": e.detail.value });
    },

    // **修改 wxid**
    updateWxid(e: any) {
        this.setData({ "tempUserInfo.wxid": e.detail.value });
    },

    // **选择头像**
    chooseAvatar() {
        wx.chooseMedia({
            count: 1,
            mediaType: ["image"],
            sourceType: ["album", "camera"],
            success: (res) => {
                this.setData({ "tempUserInfo.avatar_url": res.tempFiles[0].tempFilePath });
            }
        });
    },

    // **校验输入**
    validateInput() {
        const { username, wxid } = this.data.tempUserInfo;

        if (!username || username.length < 3 || username.length > 10) {
            this.setData({ errorMessage: "用户名必须为 3-10 个字符" });
            return false;
        }

        const wxidRegex = /^[a-zA-Z0-9]{8,15}$/;
        if (!wxid || !wxidRegex.test(wxid)) {
            this.setData({ errorMessage: "用户 ID 必须为 8-15 位字母和数字" });
            return false;
        }

        this.setData({ errorMessage: "" });
        return true;
    },

    // **保存修改**
    saveChanges() {
        if (!this.validateInput()) {
            wx.showToast({ title: this.data.errorMessage, icon: "none" });
            return;
        }

        wx.showLoading({ title: "保存中..." });

        const token = wx.getStorageSync("token");
        if (!token) {
            wx.showToast({ title: "登录状态失效，请重新登录", icon: "none" });
            wx.redirectTo({ url: "/pages/register/register" });
            return;
        }

        wx.request({
            url: "http://localhost:3000/api/user/update",
            method: "POST",
            header: { Authorization: `Bearer ${token}` },
            data: {
                username: this.data.tempUserInfo.username,
                avatar_url: this.data.tempUserInfo.avatar_url,
                wxid: this.data.tempUserInfo.wxid
            },
            success: (res) => {
                if (res.data.success) {
                    const app = getApp();
                    app.globalData.userInfo = res.data.user; // **同步到全局数据**
                    wx.setStorageSync("user", res.data.user);

                    wx.showToast({ title: "修改成功", icon: "success" });

                    // ✅ **返回 `user` 页面，刷新数据**
                    wx.navigateBack();
                } else {
                    wx.showToast({ title: res.data.message, icon: "none" });
                }
            },
            fail: (err) => {
                wx.showToast({ title: "网络错误", icon: "none" });
            },
            complete: () => wx.hideLoading()
        });
    },

    // **退出登录**
    logout() {
        wx.removeStorageSync("user");
        wx.removeStorageSync("token");

        const app = getApp();
        app.globalData.userInfo = null;
        app.globalData.token = null;

        wx.redirectTo({ url: "/pages/register/register" });
    },

    handleBack() {
        wx.navigateBack({
            delta: 1  // 返回上一级页面
        });
    },
});