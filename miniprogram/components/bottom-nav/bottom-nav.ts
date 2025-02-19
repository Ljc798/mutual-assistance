Component({
  methods: {
    goToPage(e: WechatMiniprogram.BaseEvent) {
      const page: string = e.currentTarget.dataset.page; // 获取目标页面
      let url: string;
      switch (page) {
        case 'home':
          url = '/pages/home/home';
          break;
        case 'square':
          url = '/pages/square/square';
          break;
        case 'publish':
          url = '/pages/publish/publish';
          break;
        case 'message':
          url = '/pages/message/message';
          break;
        case 'user':
          url = '/pages/user/user';
          break;
        default:
          url = '/pages/home/home';
      }
      wx.redirectTo({
        url: url,  // 跳转到对应页面
      });
      console.log('底部导航项被点击，跳转到: ' + page);
    }
  }
});
