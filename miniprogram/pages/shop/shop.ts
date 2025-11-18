import { BASE_URL } from '../../config/env';

Page({
    data: {
        items: [],
        isLoggedIn: false,
    },

    onLoad() {
        this.fetchItems();
    },

    onShow() {
        // ✅ 每次回到页面刷新登录态
        const app = getApp();
        const token = wx.getStorageSync("token");
        const hasUser = !!app?.globalData?.userInfo?.id;
        this.setData({ isLoggedIn: !!token && hasUser });
    },

    goBack() {
        wx.navigateBack({ delta: 1 });
    },

    ensureLoggedIn(): boolean {
        const app = getApp();
        const token = wx.getStorageSync("token");
        const userId = app?.globalData?.userInfo?.id;

        if (!token || !userId) {
            wx.showToast({ title: "请先登录", icon: "none" });
            // 这里按你的项目跳转逻辑改路径
            // wx.navigateTo({ url: "/pages/login/login" });
            return false;
        }
        return true;
    },

    fetchItems() {
        wx.request({
            url: `${BASE_URL}/shop/items`,
            method: 'GET',
            success: (res) => {
                if (res.data.success) {
                    const app = getApp();
                    const level = Number(app?.globalData?.userInfo?.vip_level || 0);
                    const discount = level === 2 ? 0.90 : level === 1 ? 0.95 : 1.0;
                    const items = (res.data.items || []).map((it: any) => ({
                        ...it,
                        memberPrice: it.price ? (Math.floor(it.price * 100 * discount) / 100).toFixed(2) : null,
                        discountLabel: level === 2 ? '已享受9折' : level === 1 ? '已享受95折' : ''
                    }));
                    this.setData({ items });
                } else {
                    wx.showToast({ title: '获取商品失败', icon: 'none' });
                }
            }
        });
    },

    // ✅ 积分兑换
    redeemByPoint(itemId: number) {
        if (!this.ensureLoggedIn()) return;
        const app = getApp();
        const token = wx.getStorageSync("token");

        wx.request({
            url: `${BASE_URL}/shop/redeem-point`,
            method: 'POST',
            header: {
                Authorization: `Bearer ${token}`,
            },
            data: {
                user_id: app.globalData.userInfo.id,
                item_id: itemId
            },
            success: (res) => {
                if (res.data.success) {
                    wx.showToast({ title: '兑换成功', icon: 'success' });

                    // ✅ 刷新商品数据
                    this.fetchItems();

                    // ✅ 刷新用户积分
                    app.globalData.userInfo.points -= res.data.cost || 0;
                    wx.setStorageSync("user", app.globalData.userInfo);
                    app.refreshUserInfo();
                } else {
                    wx.showToast({ title: res.data.message || '兑换失败', icon: 'none' });
                }
            },
            fail: () => {
                wx.showToast({ title: '网络错误', icon: 'none' });
            }
        });
    },

    // ✅ 微信支付兑换（安全模式）
    redeemByMoney(itemId: number) {
        if (!this.ensureLoggedIn()) return;
        const app = getApp();
        const user = app.globalData.userInfo;
        const token = wx.getStorageSync("token");

        wx.request({
            url: `${BASE_URL}/shop/create-order`,
            method: "POST",
            header: {
                Authorization: `Bearer ${token}`,
            },
            data: {
                item_id: itemId, // ✅ 只传 ID，不传金额
            },
            success: (res: any) => {
                if (res.data.success) {
                    const payData = res.data.paymentParams;
                    wx.requestPayment({
                        timeStamp: payData.timeStamp,
                        nonceStr: payData.nonceStr,
                        package: payData.package,
                        signType: payData.signType,
                        paySign: payData.paySign,
                        success: () => {
                            wx.showToast({ title: "支付成功", icon: "success" });
                            // ✅ 支付成功后刷新商品
                            this.fetchItems();
                            app.refreshUserInfo?.();
                        },
                        fail: () => {
                            wx.showToast({ title: "支付取消或失败", icon: "none" });
                        }
                    });
                } else {
                    wx.showToast({ title: res.data.message || "支付失败", icon: "none" });
                }
            },
            fail: () => {
                wx.showToast({ title: "网络错误", icon: "none" });
            }
        });
    },

    // ✅ 点击统一处理兑换逻辑
    handleRedeem(e: any) {
        if (!this.ensureLoggedIn()) return;
        const itemId = e.currentTarget.dataset.id;
        const type = e.currentTarget.dataset.type;

        if (type === 'point') {
            this.confirmRedeemByPoint(itemId);
        } else if (type === 'money') {
            this.redeemByMoney(itemId);
        } else if (type === 'both') {
            wx.showActionSheet({
                itemList: ['积分兑换', '微信支付购买'],
                success: (res) => {
                    if (res.tapIndex === 0) {
                        this.confirmRedeemByPoint(itemId); // ✅ 加确认弹窗
                    } else if (res.tapIndex === 1) {
                        this.redeemByMoney(itemId); // ✅ 直接支付
                    }
                },
                fail: () => {
                    console.log("❌ 用户取消兑换选择");
                }
            });
        }
    },
    confirmRedeemByPoint(itemId: number) {
        wx.showModal({
            title: "确认兑换",
            content: "你确定要使用积分兑换该商品吗？",
            confirmColor: "#ff416c",
            success: (res) => {
                if (res.confirm) {
                    this.redeemByPoint(itemId);
                }
            }
        });
    }
});