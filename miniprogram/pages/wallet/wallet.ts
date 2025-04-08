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
        const withdrawFen = Math.round(parseFloat(withdrawAmount) * 100);
        const balanceFen = Math.round(balance * 100);
        if (!withdrawAmount || isNaN(withdrawAmount) || parseFloat(withdrawAmount) <= 0) {
            return wx.showToast({ title: '请输入正确的金额', icon: 'none' });
        }
        console.log(withdrawFen > balanceFen);
        
        if (withdrawFen > balanceFen) {
            return wx.showToast({ title: '余额不足', icon: 'none' });
        }
        if (!/^1\d{10}$/.test(phone)) {
            return wx.showToast({ title: '请输入有效手机号', icon: 'none' });
        }

        // 发送请求
        wx.request({
            url: 'https://mutualcampus.top/api/wallet/withdraw',
            method: 'POST',
            data: {
                amount: withdrawAmount,
                method: selectedMethod,
                phone,
            },
            header: { Authorization: `Bearer ${token}` }, // 添加 token

            success(res) {
                if (res.data.success) {
                    wx.showToast({ title: '申请成功', icon: 'success' });
                } else {
                    wx.showToast({ title: res.data.message || '申请失败', icon: 'none' });
                }
            }
        });
    },

    handleBack() {
        wx.navigateBack({ delta: 1 });
    }
});