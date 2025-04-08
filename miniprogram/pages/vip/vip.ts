Page({
    data: {
        plans: [
            { id: 1, name: 'VIP 月卡', price: 9.9 },
            { id: 2, name: 'VIP 季卡', price: 24.9 },
            { id: 3, name: 'VIP 年卡', price: 79.9 }
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
        const plan = this.data.plans.find(p => p.id === this.data.selectedPlanId);
        if (!plan) {
            return wx.showToast({ title: '请选择套餐', icon: 'none' });
        }
        
        wx.request({
            url: 'https://mutualcampus.top/api/vip/create-order',
            method: 'POST',
            header: {
                Authorization: `Bearer ${wx.getStorageSync('token')}`
            },
            data: {
                price: plan.price,
                plan: plan.name
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
                        },
                        fail: () => {
                            wx.showToast({ title: '支付取消', icon: 'none' });
                        }
                    });
                } else {
                    wx.showToast({ title: '发起支付失败', icon: 'none' });
                }
            }
        });
    },

    handleBack() {
        wx.navigateBack({ delta: 1 });
    }
});