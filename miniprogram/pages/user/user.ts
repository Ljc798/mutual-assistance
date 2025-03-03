Page({
    data: {
      // 页面数据
    },
    onLoad: function(options) {
      // 页面加载时的逻辑
    },
    // 其他页面方法

     // 处理点击任务项，跳转到详情页
     handleOrderClick() {

        // 使用 wx.navigateTo 跳转到详情页，并将任务数据传递过去
        wx.navigateTo({
            url: '/pages/order/order'
        });
    }
  })