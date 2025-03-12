Page({
    data: {
      isLoggedIn: false, // 是否已登录
      userInfo: null,    // 用户信息
    },
  
    // 页面加载时检查用户是否已登录
    onLoad() {
      const token = wx.getStorageSync("token"); 
      if (token) {
        this.fetchUserData();
      }
    },
  
    // 用户点击 "立即登录 / 注册"
    async loginUser() {
      try {
        const res = await wx.getUserProfile({ desc: "用于完善用户资料" });
        console.log("用户信息获取成功：", res);
  
        // 调用后端接口进行注册/登录
        const loginRes = await wx.request({
          url: "https://express-ffi1-145923-5-1348081197.sh.run.tcloudbase.com/api/auth/login", // 如果已部署到云托管，替换为正式地址
          method: "POST",
          header: { "content-type": "application/json" },
          data: { 
            nickname: res.userInfo.nickName,
            avatarUrl: res.userInfo.avatarUrl,
          },
          success: (loginRes) => {
            console.log("后端登录返回：", loginRes);
  
            if (loginRes.data && loginRes.data.token) {
              wx.setStorageSync("token", loginRes.data.token);
              this.fetchUserData();
            } else {
              wx.showToast({ title: "登录失败", icon: "none" });
            }
          },
          fail: (err) => {
            console.error("登录请求失败：", err);
            wx.showToast({ title: "登录失败", icon: "none" });
          },
        });
      } catch (err) {
        console.error("获取用户信息失败：", err);
        wx.showToast({ title: "登录失败", icon: "none" });
      }
    },
  
    // 获取用户信息
    async fetchUserData() {
      try {
        const token = wx.getStorageSync("token");
  
        if (!token) {
          console.log("未找到 token，用户未登录");
          return;
        }
  
        wx.request({
          url: "http://localhost:3000/api/user/info", // 云托管请换成线上地址
          method: "GET",
          header: { 
            "Authorization": `Bearer ${token}`,
            "content-type": "application/json",
          },
          success: (res) => {
            if (res.data) {
              this.setData({ isLoggedIn: true, userInfo: res.data });
            } else {
              wx.showToast({ title: "获取用户数据失败", icon: "none" });
            }
          },
          fail: (err) => {
            console.error("获取用户信息失败：", err);
            wx.showToast({ title: "获取失败", icon: "none" });
          },
        });
      } catch (err) {
        console.error("获取用户信息失败：", err);
        wx.showToast({ title: "获取失败", icon: "none" });
      }
    },
  
    // 退出登录
    logout() {
      wx.removeStorageSync("token");
      this.setData({ isLoggedIn: false, userInfo: null });
      wx.showToast({ title: "已退出", icon: "success" });
    },
  });