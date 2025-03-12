Page({
    data: {
      isLoggedIn: false,
      userInfo: null,
    },
  
    onLoad() {
      const app = getApp();
      if (app.globalData.token) {
        this.setData({ isLoggedIn: true, userInfo: app.globalData.userInfo });
      }
    },
  
    loginUser() {
      getApp().loginUser(userInfo => {
        this.setData({ isLoggedIn: true, userInfo });
      });
    },
  
    logout() {
      wx.removeStorageSync("token");
      this.setData({ isLoggedIn: false, userInfo: null });
      wx.showToast({ title: "已退出", icon: "success" });
    },
  });