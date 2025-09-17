import { BASE_URL } from '../../config/env';

Page({
    data: {
      postId: null,
      content: '',
      category: '',
      images: [],
    },
  
    onLoad(options) {
      const { postId } = options;
      if (!postId) return wx.showToast({ title: '参数错误', icon: 'none' });
  
      this.setData({ postId });
      this.fetchPostDetail(postId);
    },
  
    fetchPostDetail(postId) {
      const token = wx.getStorageSync('token');
      wx.request({
        url: `${BASE_URL}/square/detail?post_id=${postId}`,
        method: 'GET',
        header: {
          Authorization: `Bearer ${token}`,
        },
        success: (res) => {
          if (res.data.success) {
            const post = res.data.post;
            this.setData({
              content: post.content,
              category: post.category,
              images: post.images || [],
            });
          } else {
            wx.showToast({ title: '获取失败', icon: 'none' });
          }
        },
      });
    },
  
    handleContentInput(e) {
      this.setData({ content: e.detail.value });
    },
  
    handleCategoryChange(e) {
      this.setData({ category: e.detail.value });
    },
  
    handleSubmit() {
      const { postId, content, category } = this.data;
      const token = wx.getStorageSync('token');
  
      if (!content || !category) {
        return wx.showToast({ title: '内容或分类不能为空', icon: 'none' });
      }
  
      wx.request({
        url: `${BASE_URL}/square/edit`,
        method: 'POST',
        header: {
          Authorization: `Bearer ${token}`,
        },
        data: {
          post_id: postId,
          content,
          category,
        },
        success: (res) => {
          if (res.data.success) {
            wx.showToast({ title: '更新成功', icon: 'success' });
            wx.navigateBack();
          } else {
            wx.showToast({ title: res.data.message || '更新失败', icon: 'none' });
          }
        },
      });
    },

    handleBack() {
        wx.navigateBack({delta: 1});
    }
  });