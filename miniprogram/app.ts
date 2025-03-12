App<IAppOption>({
    globalData: {
      apiBaseUrl: "https://express-ffi1-145923-5-1348081197.sh.run.tcloudbase.com/api", // 你的云托管 API 地址
      userInfo: null, // 存储用户信息
      token: "", // 存储用户 token
    },
  
    onLaunch() {
      console.log("🚀 小程序启动")
  
      // 读取本地缓存
      const logs = wx.getStorageSync("logs") || [];
      logs.unshift(Date.now());
      wx.setStorageSync("logs", logs);
  
      // 登录并获取 code
      wx.login({
        success: res => {
          console.log("✅ wx.login() 获取 code:", res.code);
          wx.setStorageSync("wx_code", res.code); // 将 code 存入缓存
        },
        fail: err => {
          console.error("❌ wx.login 失败:", err);
        },
      });
  
      // 尝试自动登录
      this.autoLogin();
    },
  
    /**
     * 尝试自动登录
     */
    autoLogin() {
      const token = wx.getStorageSync("token");
      if (token) {
        this.globalData.token = token;
        console.log("✅ 发现本地 Token，自动登录成功");
      } else {
        console.log("🔄 需要手动登录");
      }
    },
  
    /**
     * 处理登录逻辑
     */
    loginUser(callback?: Function) {
      const storedCode = wx.getStorageSync("wx_code");
  
      if (!storedCode) {
        console.error("❌ 未获取到 wx.login code");
        wx.showToast({
          title: "登录失败，请重试",
          icon: "none",
        });
        return;
      }
  
      wx.getUserProfile({
        desc: "用于完善个人信息",
        success: res => {
          console.log("✅ 用户授权成功:", res.userInfo);
  
          wx.request({
            url: this.globalData.apiBaseUrl + "/auth/login",
            method: "POST",
            header: { "Content-Type": "application/json" },
            data: {
              code: storedCode, // 发送 wx.login 获取的 code
              nickname: res.userInfo.nickName,
              avatarUrl: res.userInfo.avatarUrl,
            },
            success: response => {
              console.log("✅ 登录成功:", response.data);
              if (response.data.token) {
                wx.setStorageSync("token", response.data.token);
                this.globalData.token = response.data.token;
                this.globalData.userInfo = response.data.user;
  
                wx.showToast({ title: "登录成功", icon: "success" });
  
                // 执行回调
                if (callback) callback(response.data.user);
              }
            },
            fail: err => {
              console.error("❌ 登录请求失败:", err);
              wx.showToast({ title: "登录失败", icon: "none" });
            },
          });
        },
        fail: err => {
          console.error("❌ 用户拒绝授权:", err);
          wx.showToast({ title: "请授权登录", icon: "none" });
        },
      });
    },
  });