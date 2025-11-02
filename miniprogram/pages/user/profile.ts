import { BASE_URL } from '../../config/env';

Page({
  data: {
    user: {},
    tabs: ['帖子', '评价'],
    activeTab: 0,
    posts: [],
    reviews: []
  },

  onLoad() {
    this.loadUserInfo();
    this.loadPosts();
  },

  switchTab(e: any) {
    const index = e.currentTarget.dataset.index;
    this.setData({ activeTab: index });

    if (index === 1 && this.data.reviews.length === 0) {
      this.loadReviews();
    }
  },

  async loadUserInfo() {
    const token = wx.getStorageSync('token');
    wx.request({
      url: `${BASE_URL}/user/profile`,
      header: { Authorization: `Bearer ${token}` },
      success: (res: any) => {
        if (res.data.success) {
          this.setData({ user: res.data.data });
        }
      }
    });
  },

  async loadPosts() {
    const token = wx.getStorageSync('token');
    wx.request({
      url: `${BASE_URL}/user/posts`,
      header: { Authorization: `Bearer ${token}` },
      success: (res: any) => {
        if (res.data.success) {
          this.setData({ posts: res.data.data });
        }
      }
    });
  },

  async loadReviews() {
    const token = wx.getStorageSync('token');
    wx.request({
      url: `${BASE_URL}/user/reviews`,
      header: { Authorization: `Bearer ${token}` },
      success: (res: any) => {
        if (res.data.success) {
          this.setData({ reviews: res.data.data });
        }
      }
    });
  },

  goPostDetail(e: any) {
    const postId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/post-detail/post-detail?id=${postId}`
    });
  }
});
