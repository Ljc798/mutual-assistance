App<IAppOption>({
    globalData: {
      userInfo: null,
      token: wx.getStorageSync("token") || null,
    },
  
    onLaunch() {
      wx.cloud.init({
        env: "prod-3gf6e5aw09a61938", // ⚠️ 替换为你的环境 ID
        traceUser: true,
      });
    },
  });