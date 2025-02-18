Component({
    methods: {
      // 去除跳转功能，只是为了渲染底部导航栏
      goToPage(e: WechatMiniprogram.BaseEvent) {
        // 这里只是为了渲染页面，不执行跳转
        // const page: string = e.currentTarget.dataset.page;
        // wx.navigateTo({
        //   url: `/${page}/${page}` // 页面跳转被注释掉
        // });
        console.log('Bottom nav item clicked, but no navigation will happen.');
      }
    }
  });