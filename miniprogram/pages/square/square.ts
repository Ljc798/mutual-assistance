Page({
    data: {
      schoolName: "九江学院", // 默认学校
      categories: ["全部", "校园墙", "吐槽", "失物", "拼车", "二手交易", "拼单", "选课分享", "社团", "好物美景分享"], // 分类列表
      selectedCategory: "全部", // 默认选中
      post: [],
      checkinIcon: "/assets/icons/rili-2.svg", // 默认签到图标
      isCheckedIn: false // 是否已签到
    },

    onLoad() {
        this.fetchPosts("全部"); // 初始加载所有帖子
      },
  
    // 切换分类时，从数据库获取相应的数据
  selectCategory(e: any) {
    const category = e.currentTarget.dataset.category;
    this.setData({ selectedCategory: category });

    this.fetchPosts(category); // 更新数据
  },

  // 从数据库获取帖子
  fetchPosts(category: string) {
    const db = wx.cloud.database();
    let query = db.collection("posts").where({ school_id: wx.getStorageSync("school_id") });

    if (category !== "全部") {
      query = query.where({ category });
    }

    query.orderBy("timestamp", "desc").get({
      success: res => {
        this.setData({ posts: res.data });
      },
      fail: err => {
        wx.showToast({ title: "加载失败", icon: "none" });
        console.error("获取数据失败：", err);
      }
    });
  },
  
    // 处理签到
    handleCheckIn() {
      if (!this.data.isCheckedIn) {
        this.setData({
          checkinIcon: "/assets/icons/daka.svg", // 切换为已签到图标
          isCheckedIn: true
        });
        wx.showToast({
          title: "签到成功！",
          icon: "success"
        });
      } else {
        wx.showToast({
          title: "今天已签到",
          icon: "none"
        });
      }
    }
  });