Page({
    data: {
        userInfo: {},
        tempUserInfo: {},
        errorMessage: "",
        avatarFilePath: "",
    },

    onLoad(options: any) {
        this.loadUserData();
        if (options.new === "1") {
            wx.showToast({
                title: "欢迎新用户！请完善你的信息",
                icon: "none",
                duration: 3000
            });
        }
    },

    loadUserData() {
        const app = getApp();
        this.setData({
            userInfo: app.globalData.userInfo || {},
            tempUserInfo: JSON.parse(JSON.stringify(app.globalData.userInfo)),
            avatarFilePath: app.globalData.userInfo.avatar_url
        });
    },

    updateUsername(e: any) {
        this.setData({ "tempUserInfo.username": e.detail.value });
    },

    updateWxid(e: any) {
        this.setData({ "tempUserInfo.wxid": e.detail.value });
    },

    async chooseAvatar() {
        wx.chooseMedia({
            count: 1,
            mediaType: ["image"],
            sourceType: ["album", "camera"],
            success: async (res) => {
                const tempFilePath = res.tempFiles[0].tempFilePath;
                const compressedPath = await this.compressImage(tempFilePath);
                const isSafe = await this.checkImageContent(compressedPath);
                if (!isSafe) return;
                this.setData({ avatarFilePath: tempFilePath });
            }
        });
    },

    async checkUsernameCompliance(name: string): Promise<boolean> {
        return new Promise((resolve) => {
            wx.request({
                url: "https://mutualcampus.top/api/user/check-username",
                method: "POST",
                data: { username: name },
                success: (res: any) => {
                    resolve(res.data.available);
                },
                fail: () => resolve(false)
            });
        });
    },

    async checkWxidCompliance(id: string): Promise<boolean> {
        return new Promise((resolve) => {
            wx.request({
                url: "https://mutualcampus.top/api/user/check-wxid",
                method: "POST",
                data: { wxid: id },
                success: (res: any) => {
                    resolve(res.data.available);
                },
                fail: () => resolve(false)
            });
        });
    },

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

    async saveChanges() {
        if (!this.validateInput()) {
            wx.showToast({ title: this.data.errorMessage, icon: "none" });
            return;
        }

        const usernameOk = await this.checkUsernameCompliance(this.data.tempUserInfo.username);
        if (!usernameOk) {
            wx.showToast({ title: "用户名已被占用，请更换", icon: "none" });
            return;
        }

        const wxidOk = await this.checkWxidCompliance(this.data.tempUserInfo.wxid);
        if (!wxidOk) {
            wx.showToast({ title: "用户ID已被占用，请更换", icon: "none" });
            return;
        }

        wx.showLoading({ title: "保存中..." });

        const token = wx.getStorageSync("token");
        const app = getApp();
        const userId = app.globalData.userInfo?.id;
        const username = app.globalData.userInfo?.username;

        if (!token || !userId) {
            wx.hideLoading();
            wx.showToast({ title: "登录状态失效，请重新登录", icon: "none" });
            wx.redirectTo({ url: "/pages/register/register" });
            return;
        }

        let avatarUrl = this.data.tempUserInfo.avatar_url;
        const filePath = this.data.avatarFilePath;
        const isTempFile = filePath.includes("/tmp/") || filePath.startsWith("wxfile://");
        if (isTempFile) {
            const compressedPath = await this.compressImage(filePath);
            const isSafe = await this.checkImageContent(compressedPath);
            if (!isSafe) {
                wx.hideLoading();
                return;
            }
            avatarUrl = await this.uploadAvatarToCOS(filePath, username);
            if (!avatarUrl) {
                wx.showToast({ title: "头像上传失败，使用原头像", icon: "none" });
                avatarUrl = this.data.tempUserInfo.avatar_url;
            }
        }

        wx.request({
            url: "https://mutualcampus.top/api/user/update",
            method: "POST",
            header: { Authorization: `Bearer ${token}` },
            data: {
                username: this.data.tempUserInfo.username,
                avatar_url: avatarUrl,
                wxid: this.data.tempUserInfo.wxid
            },
            success: (res) => {
                if (res.data.success) {
                    app.globalData.userInfo = res.data.user;
                    wx.setStorageSync("user", res.data.user);
                    wx.showToast({ title: "修改成功", icon: "success" });
                    wx.redirectTo({ url: "/pages/user/user" });
                } else {
                    wx.showToast({ title: res.data.message, icon: "none" });
                }
            },
            fail: () => {
                wx.showToast({ title: "网络错误", icon: "none" });
            },
            complete: () => wx.hideLoading()
        });
    },

    uploadAvatarToCOS(filePath: string, username: string): Promise<string | null> {
        return new Promise((resolve) => {
            wx.uploadFile({
                url: "https://mutualcampus.top/api/uploads/upload-image",
                filePath,
                name: "image",
                formData: {
                    type: "avatar",
                    username: username
                },
                success: (res: any) => {
                    const data = JSON.parse(res.data);
                    if (data.success) {
                        resolve(data.imageUrl);
                    } else {
                        resolve(null);
                    }
                },
                fail: () => resolve(null)
            });
        });
    },

    compressImage(filePath: string): Promise<string> {
        return new Promise((resolve) => {
            wx.getImageInfo({
                src: filePath,
                success: (info) => {
                    const ctx = wx.createCanvasContext("compressCanvas", this);
                    const width = 200;
                    const height = info.height * (200 / info.width);
                    this.setData({ canvasWidth: width, canvasHeight: height }, () => {
                        ctx.drawImage(filePath, 0, 0, width, height);
                        ctx.draw(false, () => {
                            wx.canvasToTempFilePath({
                                canvasId: "compressCanvas",
                                destWidth: width,
                                destHeight: height,
                                success: (res) => resolve(res.tempFilePath),
                                fail: () => resolve(filePath)
                            }, this);
                        });
                    });
                },
                fail: () => resolve(filePath)
            });
        });
    },

    logout() {
        wx.removeStorageSync("user");
        wx.removeStorageSync("token");
        const app = getApp();
        app.globalData.userInfo = null;
        app.globalData.token = null;
        wx.redirectTo({ url: "/pages/register/register" });
    },

    handleBack() {
        wx.navigateBack({ delta: 1 });
    },

    clearWxidInput() {
        this.setData({ "tempUserInfo.wxid": "" });
    },

    checkImageContent(filePath: string): Promise<boolean> {
        const token = wx.getStorageSync("token");
        return new Promise((resolve) => {
            wx.uploadFile({
                url: "https://mutualcampus.top/api/user/check-image",
                filePath,
                name: "image",
                header: { Authorization: `Bearer ${token}` },
                formData: { scene: "avatar" },
                success: (res: any) => {
                    const data = JSON.parse(res.data);
                    resolve(data.success && data.safe);
                },
                fail: () => resolve(false)
            });
        });
    },
});
