import { checkTextContent } from "../../utils/security";

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

    chooseAvatar() {
        const token = wx.getStorageSync("token");
        if (!token) {
            wx.showToast({ title: "未登录", icon: "none" });
            return;
        }
    
        wx.chooseMedia({
            count: 1,
            mediaType: ["image"],
            sourceType: ["album", "camera"],
            success: async (res) => {
                const tempFilePath = res.tempFiles[0].tempFilePath;
    
                wx.compressImage({
                    src: tempFilePath,
                    quality: 30,
                    success: async (compressed) => {
                        const compressedPath = compressed.tempFilePath;
    
                        // ✅ 审核图片（提交审核）
                        wx.uploadFile({
                            url: "https://mutualcampus.top/api/uploads/upload-image",
                            filePath: compressedPath,
                            name: "image",
                            header: {
                                Authorization: `Bearer ${token}`
                            },
                            formData: {
                                type: "avatar",
                                username: this.data.tempUserInfo.username || "anonymous"
                            },
                            success: async (res: any) => {
                                try {
                                    const data = JSON.parse(res.data);
                                    const jobId = data.auditJob?.JobId;
                                    const objectKey = data.objectKey;
    
                                    if (!jobId || !objectKey) {
                                        wx.showToast({ title: "审核任务提交失败", icon: "none" });
                                        return;
                                    }
    
                                    wx.showLoading({ title: "头像审核中…" });
    
                                    // ✅ 轮询审核状态（每2秒查一次）
                                    let tries = 0;
                                    const poll = async () => {
                                        if (tries++ > 10) {
                                            wx.hideLoading();
                                            wx.showToast({ title: "审核超时", icon: "none" });
                                            return;
                                        }
    
                                        wx.request({
                                            url: "https://mutualcampus.top/api/uploads/audit-result",
                                            method: "GET",
                                            data: { jobId },
                                            success: (res) => {
                                                if (res.data.success) {
                                                    const status = res.data.status;
                                                    const result = res.data.result;
    
                                                    if (status === "Success") {
                                                        if (result?.Suggestion === "Pass") {
                                                            // ✅ 审核通过，拼接真实地址
                                                            const imageUrl = `https://${result.Bucket}.cos.${result.Region}.myqcloud.com/${result.Key}`;
                                                            this.setData({
                                                                avatarFilePath: imageUrl,
                                                                "tempUserInfo.avatar_url": imageUrl
                                                            });
                                                            wx.hideLoading();
                                                            wx.showToast({ title: "头像审核通过", icon: "success" });
                                                        } else {
                                                            wx.hideLoading();
                                                            wx.showToast({ title: "头像不合规，请更换", icon: "none" });
                                                        }
                                                    } else if (status === "Failed") {
                                                        wx.hideLoading();
                                                        wx.showToast({ title: "审核失败", icon: "none" });
                                                    } else {
                                                        // 审核中，继续轮询
                                                        setTimeout(poll, 2000);
                                                    }
                                                } else {
                                                    setTimeout(poll, 2000);
                                                }
                                            },
                                            fail: () => {
                                                setTimeout(poll, 2000);
                                            }
                                        });
                                    };
    
                                    poll();
    
                                } catch (err) {
                                    console.warn("❌ 上传/审核返回异常:", res.data);
                                    wx.showToast({ title: "上传失败", icon: "none" });
                                }
                            },
                            fail: () => {
                                wx.showToast({ title: "头像上传失败", icon: "none" });
                            }
                        });
                    },
                    fail: () => {
                        this.setData({ avatarFilePath: tempFilePath });
                        wx.showToast({ title: "压缩失败，使用原图", icon: "none" });
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

        const { username, wxid } = this.data.tempUserInfo;

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
                wx.showToast({ title: "头像上传失败", icon: "none" });
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
                            const freshUrl = data.imageUrl + "?t=" + Date.now();
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
        return Promise.resolve(true);
    }
});