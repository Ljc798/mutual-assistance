Page({
    data: {
        userInfo: {}, // **全局用户信息**
        tempUserInfo: {}, // **临时修改数据**
        errorMessage: "", // **错误提示**
        avatarFilePath: "", // **临时存储头像路径（未上传）**
    },

    onLoad() {
        this.loadUserData();
    },

    // **加载全局用户数据，复制一份到 tempUserInfo**
    loadUserData() {
        const app = getApp();
        this.setData({
            userInfo: app.globalData.userInfo || {},
            tempUserInfo: JSON.parse(JSON.stringify(app.globalData.userInfo)), // **深拷贝**
            avatarFilePath: app.globalData.userInfo.avatar_url
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

    // **选择头像（仅存储路径，不立即上传）**
    chooseAvatar() {
        wx.chooseMedia({
            count: 1,
            mediaType: ["image"],
            sourceType: ["album", "camera"],
            success: (res) => {
                const tempFilePath = res.tempFiles[0].tempFilePath;
                console.log("✅ 选中的头像:", tempFilePath);

                // **更新临时头像路径（仅用于前端展示）**
                this.setData({ avatarFilePath: tempFilePath });
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

    // **保存修改（先上传头像，再保存用户数据）**
    async saveChanges() {
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

        const app = getApp();
        const userId = app.globalData.userInfo?.id;
        const username = app.globalData.userInfo?.username;

        if (!userId) {
            wx.showToast({ title: "用户未登录", icon: "none" });
            wx.hideLoading();
            return;
        }

        let avatarUrl = this.data.tempUserInfo.avatar_url; // **默认使用原头像**

        // **如果用户选择了新头像，则先上传**
        if (this.data.avatarFilePath) {
            const uploadedAvatarUrl = await this.uploadAvatarToCOS(this.data.avatarFilePath, username);
            if (uploadedAvatarUrl) {
                avatarUrl = uploadedAvatarUrl; // **更新头像 URL**
            } else {
                wx.showToast({ title: "头像上传失败，保持原头像", icon: "none" });
            }
        }

        // **保存用户信息**
        wx.request({
            url: "http://localhost:3000/api/user/update",
            method: "POST",
            header: { Authorization: `Bearer ${token}` },
            data: {
                username: this.data.tempUserInfo.username,
                avatar_url: avatarUrl, // **使用上传后的头像 URL**
                wxid: this.data.tempUserInfo.wxid
            },
            success: (res) => {
                if (res.data.success) {
                    // **同步到全局数据**
                    app.globalData.userInfo = res.data.user;
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

    // ✅ **上传头像到 COS**
    uploadAvatarToCOS(filePath: string, username: string): Promise<string | null> {
        return new Promise((resolve) => {
            wx.uploadFile({
                url: "http://localhost:3000/api/uploads/upload-image",
                filePath,
                name: "image",
                formData: {
                    type: "avatar",   // 头像文件夹
                    username: username    // **确保 username 传递成功**
                },
                success: (res: any) => {
                    const data = JSON.parse(res.data);
                    if (data.success) {
                        console.log("✅ 头像上传成功:", data.imageUrl);
                        resolve(data.imageUrl);
                    } else {
                        console.error("❌ 头像上传失败:", data);
                        resolve(null);
                    }
                },
                fail: (err) => {
                    console.error("❌ 头像上传错误:", err);
                    resolve(null);
                }
            });
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