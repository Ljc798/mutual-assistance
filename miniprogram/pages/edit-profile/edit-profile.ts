import { checkTextContent } from "../../utils/security";
Page({
    data: {
        userInfo: {}, // 全局用户信息
        tempUserInfo: {}, // 临时修改数据
        errorMessage: "", // 错误提示
        avatarFilePath: "", // 临时存储头像路径（未上传）
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
            avatarFilePath: app.globalData.userInfo.avatar_url,
            school_id: this.data.tempUserInfo.school_id
        });
    },

    updateUsername(e: any) {
        this.setData({ "tempUserInfo.username": e.detail.value });
    },

    updateWxid(e: any) {
        this.setData({ "tempUserInfo.wxid": e.detail.value });
    },

    chooseAvatar() {
        const token = wx.getStorageSync("token");
        const username = this.data.tempUserInfo.username || "anonymous";
    
        wx.chooseMedia({
            count: 1,
            mediaType: ["image"],
            sourceType: ["album", "camera"],
            success: (res) => {
                const tempFilePath = res.tempFiles[0].tempFilePath;
    
                wx.compressImage({
                    src: tempFilePath,
                    quality: 30,
                    success: (compressed) => {
                        const compressedPath = compressed.tempFilePath;
    
                        wx.uploadFile({
                            url: "https://mutualcampus.top/api/uploads/upload-image",
                            filePath: compressedPath,
                            name: "image",
                            formData: {
                                type: "avatar",
                                username
                            },
                            header: {
                                Authorization: `Bearer ${token}`
                            },
                            success: (res: any) => {
                                try {
                                    const data = JSON.parse(res.data);
                                    if (data.success) {
                                        const freshUrl = data.imageUrl + "?t=" + Date.now();
                                        this.setData({
                                            avatarFilePath: freshUrl,
                                            "tempUserInfo.avatar_url": freshUrl
                                        });
                                    } else {
                                        wx.showToast({ title: "头像上传失败", icon: "none" });
                                    }
                                } catch {
                                    wx.showToast({ title: "上传响应异常", icon: "none" });
                                }
                            },
                            fail: () => {
                                wx.showToast({ title: "头像上传失败", icon: "none" });
                            }
                        });
                    },
                    fail: () => {
                        wx.showToast({ title: "压缩失败", icon: "none" });
                    }
                });
            }
        });
    },

    checkUsername() {
        const newUsername = this.data.tempUserInfo.username;
        const oldUsername = this.data.userInfo.username;

        if (!newUsername || newUsername === oldUsername) return;

        wx.request({
            url: "https://mutualcampus.top/api/user/check-username",
            method: "POST",
            data: { username: newUsername },
            success: (res: any) => {
                console.log(res.data);
                if (!res.data.available) {
                    wx.showToast({ title: "用户名已存在，请更换", icon: "none" });
                }
            }
        });
    },

    checkWxid() {
        const newWxid = this.data.tempUserInfo.wxid;
        const oldWxid = this.data.userInfo.wxid;

        if (!newWxid || newWxid === oldWxid) return;

        wx.request({
            url: "https://mutualcampus.top/api/user/check-wxid",
            method: "POST",
            data: { wxid: newWxid },
            success: (res: any) => {
                if (!res.data.available) {
                    wx.showToast({ title: "用户ID已存在，请更换", icon: "none" });
                }
            }
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

        const { username, wxid, school_id } = this.data.tempUserInfo;

        const isUsernameSafe = await checkTextContent(username);
        if (!isUsernameSafe) return;

        const isWxidSafe = await checkTextContent(wxid);
        if (!isWxidSafe) return;

        wx.showLoading({ title: "保存中..." });

        const token = wx.getStorageSync("token");
        const app = getApp();
        const userId = app.globalData.userInfo?.id;

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
            avatarUrl = await this.uploadAvatarToCOS(filePath, username);
            if (!avatarUrl) {
                console.error("❌ 头像上传失败，返回空 URL");
                wx.showToast({ title: "头像上传失败，使用原头像", icon: "none" });
                avatarUrl = this.data.tempUserInfo.avatar_url;
            }
        }

        wx.request({
            url: "https://mutualcampus.top/api/user/update",
            method: "POST",
            header: { Authorization: `Bearer ${token}` },
            data: {
                username,
                avatar_url: avatarUrl,
                wxid,
                school_id: school_id || 1  // 👈 保底，如果没选学校就传 null
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
            complete: () => {
                wx.hideLoading();
            }
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
                    username
                },
                success: (res: any) => {
                    try {
                        const data = JSON.parse(res.data);

                        if (data.success) {
                            const freshUrl = data.imageUrl + "?t=" + Date.now(); // 防缓存
                            this.setData({
                                avatarFilePath: freshUrl,
                                "tempUserInfo.avatar_url": freshUrl
                            });
                            resolve(freshUrl);
                        } else {
                            console.error("❌ 头像上传失败:", data);
                            resolve(null);
                        }
                    } catch (err) {
                        console.error("❌ 头像上传返回不是 JSON:", res.data);
                        wx.showToast({ title: "上传失败（非预期响应）", icon: "none" });
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
        return Promise.resolve(true); // ✅ 使用腾讯云 COS 自动审核，无需客户端再调微信 API 审核
    },

    goChooseSchool() {
        wx.navigateTo({
            url: '/pages/schools/schools?mode=user',
            events: {
                schoolSelected: (data) => {
                    this.setData({
                        'tempUserInfo.school_id': data.id,
                        'tempUserInfo.school_name': data.name
                    });
                }
            }
        });
    }
});