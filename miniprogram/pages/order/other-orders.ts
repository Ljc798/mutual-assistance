Page({
    data: {
      allOrders: [],
      filteredOrders: [],
      activeFilter: 'all'
    },
  
    onLoad() {
      this.fetchOrders();
    },
  
    fetchOrders() {
      const token = wx.getStorageSync('token');
      const user = wx.getStorageSync('user');
  
      if (!token || !user?.id) {
        wx.showToast({ title: "未登录", icon: "none" });
        return;
      }
  
      wx.request({
        url: `https://mutualcampus.top/api/order/all?user_id=${user.id}`,
        method: "GET",
        header: { Authorization: `Bearer ${token}` },
        success: (res) => {
          if (res.data.success) {
            const all = res.data.orders.map(order => {
              let displayType = '';
              let title = '';
              if (order.type === 'task') {
                displayType = '佣金订单';
                title = `任务：${order.title}`;
              } else if (order.type === 'shop') {
                displayType = '积分订单';
                title = `商品：${order.title}`;
              } else if (order.type === 'vip') {
                displayType = 'VIP订单';
                title = `VIP：${order.title}`;
              }
  
              return {
                ...order,
                displayType,
                title,
                amount: Number(order.amount).toFixed(2),
              };
            });
  
            this.setData({
              allOrders: all,
              filteredOrders: all
            });
          } else {
            wx.showToast({ title: "获取订单失败", icon: "none" });
          }
        },
        fail: () => {
          wx.showToast({ title: "网络错误", icon: "none" });
        }
      });
    },
  
    onFilterChange(e: any) {
      const filter = e.currentTarget.dataset.type;
      const all = this.data.allOrders;
  
      const filtered = filter === 'all' ? all : all.filter(order => order.type === filter);
  
      this.setData({
        activeFilter: filter,
        filteredOrders: filtered
      });
    }
  });