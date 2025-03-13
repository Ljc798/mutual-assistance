Page({
    data: {
      userInfo: {
        avatarUrl: "/assets/icons/default-avatar.png", // 默认头像
        nickName: ""
      },
      isLoggedIn: false,
    },
  
    onLoad() {
      const token = wx.getStorageSync("token");
      if (token) {
        this.setData({ isLoggedIn: true });
        wx.redirectTo({ url: "/pages/home/home" }); // 已登录直接跳主页
      }
    },
  
    // 微信一键获取头像 & 昵称
    getUserProfile() {
      wx.getUserProfile({
        desc: "用于完善会员资料",
        success: (res) => {
          this.setData({
            userInfo: {
              avatarUrl: res.userInfo.avatarUrl,
              nickName: res.userInfo.nickName
            }
          });
        },
        fail: () => {
          wx.showToast({ title: "获取失败", icon: "none" });
        }
      });
    },
  
    // 手动选择头像
    chooseAvatar() {
      wx.chooseMedia({
        count: 1,
        mediaType: ["image"],
        sourceType: ["album", "camera"],
        success: (res) => {
          this.setData({ "userInfo.avatarUrl": res.tempFiles[0].tempFilePath });
        }
      });
    },
  
    // 输入昵称
    handleNameInput(e) {
      this.setData({ "userInfo.nickName": e.detail.value });
    },
  
    // 注册并登录（手动头像 & 昵称）
    handleManualRegister() {
      if (!this.data.userInfo.nickName) {
        wx.showToast({ title: "请填写昵称", icon: "none" });
        return;
      }
      wx.login({
        success: (loginRes) => {
          wx.request({
            url: "https://你的服务器.com/register",
            method: "POST",
            data: {
              openid: loginRes.code,
              avatarUrl: this.data.userInfo.avatarUrl,
              nickName: this.data.userInfo.nickName
            },
            success: (response) => {
              if (response.data.token) {
                wx.setStorageSync("token", response.data.token);
                wx.setStorageSync("userInfo", response.data.user);
                this.setData({ isLoggedIn: true });
                wx.redirectTo({ url: "/pages/home/home" });
              } else {
                wx.showToast({ title: "注册失败", icon: "none" });
              }
            }
          });
        }
      });
    },
  
    // 直接微信登录（已有账号）
    handleWeChatLogin() {
      wx.login({
        success: (loginRes) => {
          wx.request({
            url: "https://你的服务器.com/wechat/login",
            method: "POST",
            data: { code: loginRes.code },
            success: (response) => {
              if (response.data.token) {
                wx.setStorageSync("token", response.data.token);
                wx.setStorageSync("userInfo", response.data.user);
                this.setData({ isLoggedIn: true });
                wx.redirectTo({ url: "/pages/home/home" });
              } else {
                wx.showToast({ title: "登录失败", icon: "none" });
              }
            }
          });
        }
      });
    }
  });