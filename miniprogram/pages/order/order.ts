// ✅ pages/order/order.ts
Page({
    data: {
      filterOptions1: ["全部", "我帮助的", "我发布的"],
      activeFilter1: 0,
      filterOptions2: ["全部", "待接单", "进行中", "已完成"],
      activeFilter2: 0,
      orders: [], // 真实订单数据
      userId: null,
    },
  
    onLoad() {
      const app = getApp();
      const userId = app.globalData.userInfo?.id;
      if (!userId) {
        wx.showToast({ title: "请先登录", icon: "none" });
        return;
      }
      this.setData({ userId });
      this.fetchOrders();
    },
  
    // ✅ 返回上一页
    handleBack() {
      wx.navigateBack({ delta: 1 });
    },
  
    // ✅ 切换一级筛选
    selectFilter1(e) {
      this.setData({ activeFilter1: e.currentTarget.dataset.index }, this.fetchOrders);
    },
  
    // ✅ 切换二级筛选
    selectFilter2(e) {
      this.setData({ activeFilter2: e.currentTarget.dataset.index }, this.fetchOrders);
    },
  
    // ✅ 拉取数据 + 筛选
    fetchOrders() {
      const { userId, activeFilter1, activeFilter2 } = this.data;
  
      wx.request({
        url: `https://mutualcampus.top/api/task/my`,
        method: "GET",
        data: { userId },
        success: (res) => {
          if (res.data.success && Array.isArray(res.data.tasks)) {
            const filtered = res.data.tasks.filter((task) => {
              // 一级筛选
              if (activeFilter1 === 1 && task.employee_id !== userId) return false; // 我帮助的
              if (activeFilter1 === 2 && task.employer_id !== userId) return false; // 我发布的
              // 二级筛选
              if (activeFilter2 === 1 && task.status !== 0) return false; // 待接单
              if (activeFilter2 === 2 && task.status !== 1) return false; // 进行中
              if (activeFilter2 === 3 && task.status !== 2) return false; // 已完成
              return true;
            });
  
            const mapped = filtered.map(task => ({
              orderId: task.id,
              status: this.translateStatus(task.status),
              title: task.title,
              salary: `¥${task.offer}`,
              time: task.DDL
            }));
  
            this.setData({ orders: mapped });
          } else {
            wx.showToast({ title: "获取任务失败", icon: "none" });
          }
        },
        fail: () => {
          wx.showToast({ title: "网络错误", icon: "none" });
        }
      });
    },
  
    // ✅ 状态转换
    translateStatus(statusCode) {
      return ["待接单", "进行中", "已完成"][statusCode] || "未知";
    },
  });