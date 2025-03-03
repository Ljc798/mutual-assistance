Page({
    data: {
        // 一级筛选
        filterOptions1: ["全部", "我帮助的", "我发布的"],
        activeFilter1: 0, // 默认选中第一个

        // 二级筛选
        filterOptions2: ["全部", "待接单", "进行中", "已完成"],
        activeFilter2: 0, // 默认选中第一个

        // 订单数据（示例）
        orders: [
            { orderId: "13211321", status: "已完成", title: "帮忙取快递", salary: "¥50", time: "2025-1-16 23:59" },
            { orderId: "13211322", status: "进行中", title: "兼职家教", salary: "¥100", time: "2025-1-16 23:59" },
            { orderId: "13211323", status: "待接单", title: "帮忙修电脑", salary: "¥200", time: "2025-1-16 23:59" }
        ]
    },

    // 处理返回操作
    handleBack() {
        wx.navigateBack({
            delta: 1  // 返回上一级页面
        });
    },

    // 切换一级筛选
    selectFilter1(event: any) {
        const index = event.currentTarget.dataset.index;
        this.setData({ activeFilter1: index });
        this.filterOrders();
    },

    // 切换二级筛选
    selectFilter2(event: any) {
        const index = event.currentTarget.dataset.index;
        this.setData({ activeFilter2: index });
        this.filterOrders();
    },

    // 订单过滤逻辑（简单示例）
    filterOrders() {
        // 这里可以加入真实的过滤逻辑，根据 activeFilter1 和 activeFilter2 来筛选数据
        console.log("筛选订单：", this.data.activeFilter1, this.data.activeFilter2);
    },


})