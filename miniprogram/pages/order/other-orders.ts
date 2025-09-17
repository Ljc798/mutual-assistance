// other-orders.ts
import { BASE_URL } from '../../config/env';

Page({
    data: {
        activeFilter: 'all',
        allOrders: [] as any[],
        filteredOrders: [] as any[],
    },

    onLoad() {
        this.fetchAllOrders();
    },

    fetchAllOrders() {
        const token = wx.getStorageSync("token");
        const user = wx.getStorageSync("user");
        if (!user?.id) return;

        wx.request({
            url: `${BASE_URL}/order/records?userId=${user.id}`,
            method: "GET",
            header: {
                Authorization: `Bearer ${token}`,
            },
            success: (res) => {
                console.log(res);
                
                if (res.data.success) {
                    const allOrders = [
                        ...res.data.vipOrders.map((o: any) => ({
                            id: o.id,
                            title: `${o.plan} VIP`,
                            amount: o.price,
                            type: o.type,
                            paid_at: this.formatTime(o.paid_at)
                        })),
                        ...res.data.shopOrders.map((o: any) => ({
                            id: o.id,
                            title: o.item_name,
                            amount: o.amount,
                            type: o.type,
                            paid_at: this.formatTime(o.paid_at)
                        })),
                        ...res.data.taskPayments.map((o: any) => ({
                            id: o.id,
                            title: o.title,
                            amount: (o.amount / 100).toFixed(2),
                            type: o.type,
                            paid_at: this.formatTime(o.paid_at)
                        }))
                    ];
                    this.setData({ allOrders, filteredOrders: allOrders });
                } else {
                    wx.showToast({ title: "订单获取失败", icon: "none" });
                }
            },
            fail: () => {
                wx.showToast({ title: "请求失败", icon: "none" });
            }
        });
    },
    formatTime(timeStr: string): string {
        const date = new Date(timeStr);
        date.setHours(date.getHours());
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
    },

    onFilterChange(e: any) {
        const type = e.currentTarget.dataset.type;
        this.setData({
            activeFilter: type,
            filteredOrders:
                type === 'all'
                    ? this.data.allOrders
                    : this.data.allOrders.filter(order => order.type === type)
        });
    },

    handleBack() {
        wx.navigateBack();
    },
});
