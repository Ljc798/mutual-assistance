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
    },

    handleNotificationTap(e) {
      const id = e.currentTarget.dataset.id;
      const token = wx.getStorageSync("token");
  
      // 1. 本地更新
      const updated = this.data.notifications.map(item => {
        return item.id === id ? { ...item, is_read: 1 } : item;
      });
      this.setData({ notifications: updated });
  
      // 2. 通知后端
      wx.request({
        url: "https://mutualcampus.top/api/notification/mark-read",
        method: "POST",
        header: {
          Authorization: `Bearer ${token}`,
        },
        data: { id },
      });
    }
  });