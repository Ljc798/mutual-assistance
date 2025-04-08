Page({
    data: {
        plans: [
            { id: 1, name: 'VIP 月卡', price: 9.9 },
            { id: 2, name: 'VIP 季卡', price: 24.9 },
            { id: 3, name: 'VIP 年卡', price: 89.9 },
            { id: 4, name: 'VIP 终身卡', price: 168.8 },
        ],
        selectedPlanId: 1
    },

    selectPlan(e) {
        const selectedId = e.currentTarget.dataset.id;
        this.setData({
            selectedPlanId: selectedId
        });
    },

    handlePay() {
        const selectedId = this.data.selectedPlanId;
        if (!selectedId) {
            return wx.showToast({ title: '请选择套餐', icon: 'none' });
        }

        const token = wx.getStorageSync('token');
        if (!token) {
            return wx.showToast({ title: '请先登录', icon: 'none' });
        }

        wx.request({
            url: 'https://mutualcampus.top/api/vip/create-order',
            method: 'POST',
            header: {
                Authorization: `Bearer ${token}`
            },
            data: {
                planId: selectedId // 👈 只传 planId
            },
            success: (res) => {
                if (res.data.success) {
                    const { timeStamp, nonceStr, package: pkg, signType, paySign } = res.data.paymentParams;
                    wx.requestPayment({
                        timeStamp,
                        nonceStr,
                        package: pkg,
                        signType,
                        paySign,
                        success: () => {
                            wx.showToast({ title: '开通成功', icon: 'success' });
                            setTimeout(() => {
                                wx.redirectTo({ url: "/pages/user/user" });
                              }, 1000);
                        },
                        fail: () => {
                            wx.showToast({ title: '支付取消', icon: 'none' });
                        }
                    });
                } else {
                    wx.showToast({ title: res.data.message || '发起支付失败', icon: 'none' });
                }
            },
            fail: () => {
                wx.showToast({ title: '网络错误', icon: 'none' });
            }
        });
    },

    handleBack() {
        wx.navigateBack({ delta: 1 });
    }
});