Page({
    data: {
      notifications: []
    },
  
    onLoad() {
      this.fetchNotifications();
    },
  
    fetchNotifications() {
      const token = wx.getStorageSync("token");
  
      wx.request({
        url: "https://mutualcampus.top/api/notification/all",
        method: "GET",
        header: {
          Authorization: `Bearer ${token}`
        },
        success: (res) => {
          if (res.data.success) {
            this.setData({ notifications: res.data.notifications });
          } else {
            wx.showToast({ title: "加载失败", icon: "none" });
          }
        },
        fail: () => {
          wx.showToast({ title: "网络错误", icon: "none" });
        }
      });
    },

    handleBack() {
        wx.navigateBack({delta: 1});
    }
  });