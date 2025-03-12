Page({
    data: {
      isLoggedIn: false,
      userInfo: null,
    },
  
    onLoad() {
      const token = wx.getStorageSync("token");
      if (token) {
        // 验证 token 是否有效
        wx.request({
          url: "https://express-ffi1-145923-5-1348081197.sh.run.tcloudbase.com/api/wechat/verifyToken",
          method: "POST",
          header: { Authorization: `Bearer ${token}` },
          success: res => {
            if (res.data.valid) {
              this.setData({
                isLoggedIn: true,
                userInfo: res.data.user,
              });
            } else {
              wx.removeStorageSync("token");
            }
          },
          fail: () => wx.removeStorageSync("token"),
        });
      }
    },
  
    loginUser() {
      wx.login({
        success: res => {
          if (res.code) {
            wx.request({
              url: "https://express-ffi1-145923-5-1348081197.sh.run.tcloudbase.com/api/wechat/login",
              method: "POST",
              data: { code: res.code },
              success: loginRes => {
                if (loginRes.data.success) {
                  wx.setStorageSync("token", loginRes.data.token);
                  this.setData({
                    isLoggedIn: true,
                    userInfo: loginRes.data.user,
                  });
                } else {
                  wx.showToast({ title: "登录失败", icon: "none" });
                }
              },
            });
          } else {
            wx.showToast({ title: "微信登录失败", icon: "none" });
          }
        },
      });
    },
  
    logout() {
      wx.removeStorageSync("token");
      this.setData({ isLoggedIn: false, userInfo: null });
      wx.showToast({ title: "已退出", icon: "success" });
    },
  });