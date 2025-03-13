Page({
    data: {
      tasks: [], // 存储所有任务数据
    },
  
    onLoad() {
      this.loadAllTasks();
    },
  
    // 从数据库加载所有任务
    async loadAllTasks() {
      wx.showLoading({ title: '加载中...', mask: true });
  
      try {
        const db = wx.cloud.database();
        const res = await db.collection('tasks').get();
        console.log("获取任务数据:", res);
  
        this.setData({ tasks: res.data || [] });
      } catch (err) {
        console.error("任务加载失败:", err);
        wx.showToast({ title: "加载失败", icon: "none" });
      } finally {
        wx.hideLoading();
      }
    },
  
    // 点击任务，跳转到任务详情页面
    handleTaskClick(event: any) {
      const index = event.currentTarget.dataset.index;
      console.log("点击任务", this.data.tasks[index]);
  
      wx.navigateTo({
        url: `/pages/task-detail/task-detail?taskId=${this.data.tasks[index]._id}`
      });
    }
  });