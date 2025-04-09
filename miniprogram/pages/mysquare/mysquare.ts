Page({
    data: {
      posts: []
    },
  
    onLoad() {
      this.fetchMyPosts();
    },
  
    fetchMyPosts() {
      const token = wx.getStorageSync("token");
      wx.request({
        url: "https://mutualcampus.top/api/square/mine",
        method: "GET",
        header: { Authorization: `Bearer ${token}` },
        success: (res) => {
          if (res.data.success) {
            this.setData({ posts: res.data.posts });
          } else {
            wx.showToast({ title: "获取失败", icon: "none" });
          }
        }
      });
    },
  
    handleDelete(e) {
      const id = e.currentTarget.dataset.id;
      const token = wx.getStorageSync("token");
  
      wx.showModal({
        title: "确认删除",
        content: "确定要删除这条动态吗？",
        success: (res) => {
          if (res.confirm) {
            wx.request({
              url: "https://mutualcampus.top/api/square/delete",
              method: "POST",
              header: { Authorization: `Bearer ${token}` },
              data: { post_id: id },
              success: (res) => {
                if (res.data.success) {
                  wx.showToast({ title: "删除成功", icon: "success" });
                  this.fetchMyPosts();
                } else {
                  wx.showToast({ title: "删除失败", icon: "none" });
                }
              }
            });
          }
        }
      });
    },
  
    handleEdit(e) {
      const id = e.currentTarget.dataset.id;
      wx.navigateTo({
        url: `/pages/editPost/editPost?id=${id}`
      });
    }
  });