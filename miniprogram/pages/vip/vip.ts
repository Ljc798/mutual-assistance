import { BASE_URL } from '../../config/env';

Page({
    data: {
        activeTab: 'vip', // 当前选中的tab
        selectedPlanId: null,
        user: [],
        showCompareModal: false,
        plans: [], // 当前tab下的套餐
        allPlans: { vip: [], svip: [] }, // 分类缓存
    },

    onLoad() {
        this.fetchPlans();
        const app = getApp();
        let expire = app.globalData.userInfo.vip_expire_time;
        if (expire) {
            const date = new Date(expire);
            expire = `${date.getFullYear()}年${(date.getMonth() + 1)
                .toString()
                .padStart(2, '0')}月${date
                    .getDate()
                    .toString()
                    .padStart(2, '0')}日`;
        } else {
            expire = '未开通';
        }
        this.setData({
            user: {
                username: app.globalData.userInfo.username,
                avatar_url: app.globalData.userInfo.avatar_url,
                vip_expire_time: expire,
                vip_level: app.globalData.userInfo.vip_level,
            }
        })
    },

    /** 加载VIP和SVIP套餐 */
    fetchPlans() {
        const token = wx.getStorageSync("token");
        wx.request({
            url: `${BASE_URL}/vip/plans`,
            method: "GET",
            header: { Authorization: `Bearer ${token}` },
            success: (res) => {
                if (res.data.success) {
                    const all = res.data.plans || [];

                    // 按 level 分类：1=VIP, 2=SVIP
                    const vipPlans = all.filter(p => p.level === 1);
                    const svipPlans = all.filter(p => p.level === 2);

                    this.setData({
                        allPlans: { vip: vipPlans, svip: svipPlans },
                        plans: vipPlans,
                        selectedPlanId: vipPlans[0]?.id || null,
                    });
                } else {
                    wx.showToast({ title: "加载套餐失败", icon: "none" });
                }
            },
            fail: () => {
                wx.showToast({ title: "网络错误", icon: "none" });
            }
        });
    },

    /** 切换 tab */
    switchTab(e) {
        const tab = e.currentTarget.dataset.tab;
        const plans = this.data.allPlans[tab] || [];
        this.setData({
            activeTab: tab,
            plans,
            selectedPlanId: plans[0]?.id || null,
        });
    },

    /** 选择套餐 */
    selectPlan(e) {
        const selectedId = e.currentTarget.dataset.id;
        this.setData({ selectedPlanId: selectedId });
    },

    /** 发起支付 */
    handlePay() {
        const { selectedPlanId } = this.data;
        if (!selectedPlanId) {
            return wx.showToast({ title: '请选择套餐', icon: 'none' });
        }

        const token = wx.getStorageSync('token');
        if (!token) {
            return wx.showToast({ title: '请先登录', icon: 'none' });
        }

        wx.request({
            url: `${BASE_URL}/vip/create-order`,
            method: 'POST',
            header: { Authorization: `Bearer ${token}` },
            data: { planId: selectedPlanId },
            success: (res) => {
                if (res.data.success) {
                    // ⚙️ 模拟支付或真实微信支付
                    const params = res.data.paymentParams;
                    if (!params) {
                        // 如果是模拟支付
                        wx.showToast({ title: '开通成功', icon: 'success' });
                        setTimeout(() => {
                            wx.redirectTo({ url: "/pages/user/user" });
                        }, 1000);
                        return;
                    }

                    const { timeStamp, nonceStr, package: pkg, signType, paySign } = params;
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
                        },
                    });
                } else {
                    wx.showToast({ title: res.data.message || '发起支付失败', icon: 'none' });
                }
            },
            fail: () => {
                wx.showToast({ title: '网络错误', icon: 'none' });
            },
        });
    },

    goBack() {
        wx.navigateBack({ delta: 1 });
    },
});
