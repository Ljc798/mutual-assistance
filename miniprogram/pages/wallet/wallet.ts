Page({
    data: {
        balance: 0.00,
        withdrawAmount: '',
        methods: ['微信', '支付宝'],
        selectedMethod: '微信',
        phone: '',
        isWeChat: true,
    },

    onLoad() {
        const user = getApp().globalData.userInfo;
        this.setData({
            balance: user?.balance || 0,
        });
    },

    onAmountInput(e) {
        this.setData({ withdrawAmount: e.detail.value });
    },

    onMethodChange(e) {
        const method = this.data.methods[e.detail.value];
        this.setData({ selectedMethod: method, isWeChat: method === '微信' });
    },

    onPhoneInput(e) {
        this.setData({ phone: e.detail.value });
    },

    submitWithdraw() {
        const { withdrawAmount, phone, selectedMethod, balance } = this.data;
        const token = wx.getStorageSync("token");
      
        const amountNum = parseFloat(withdrawAmount);
        const withdrawFen = Math.round(amountNum * 100);
        const balanceFen = Math.round(parseFloat(balance) * 100);
      
        if (isNaN(amountNum) || amountNum <= 0) {
          return wx.showToast({ title: '请输入正确的金额', icon: 'none' });
        }
      
        if (withdrawFen > balanceFen) {
          return wx.showToast({ title: '余额不足', icon: 'none' });
        }
      
        if (!/^1\d{10}$/.test(phone)) {
          return wx.showToast({ title: '请输入有效手机号', icon: 'none' });
        }
      
        wx.showModal({
          title: "请确认提现信息",
          content: `提现金额：¥${amountNum.toFixed(2)}\n手机号：${phone}\n到账方式：${selectedMethod}`,
          confirmText: "确认提现",
          cancelText: "取消",
          success: (res) => {
            if (res.confirm) {
              // 用户确认提现
              wx.request({
                url: 'https://mutualcampus.top/api/wallet/withdraw',
                method: 'POST',
                data: {
                  amount: amountNum.toFixed(2),
                  method: selectedMethod,
                  phone,
                },
                header: {
                  Authorization: `Bearer ${token}`,
                },
                success(res) {
                  if (res.data.success) {
                    wx.showToast({ title: '申请成功', icon: 'success' });
                    setTimeout(() => {
                      wx.redirectTo({ url: "/pages/user/user" });
                    }, 1500);
                  } else {
                    wx.showToast({ title: res.data.message || '申请失败', icon: 'none' });
                  }
                },
                fail() {
                  wx.showToast({ title: '网络错误', icon: 'none' });
                }
              });
            } else {
              // 用户点了取消
              wx.showToast({ title: '已取消操作', icon: 'none' });
            }
          }
        });
      },

    handleBack() {
        wx.navigateBack({ delta: 1 });
    }
});