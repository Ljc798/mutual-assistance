Page({
    data: {
        task: {},  // 存储任务的详细信息
        showBiddingModal: false,  // 控制出价弹窗显示
        biddingAmount: '',  // 用户输入的出价金额
    },

    onLoad: function (options: any) {
        // 模拟从 options 中接收传递过来的任务数据
        const task = {
            title: options.title,
            category: options.category,  // 任务分类
            DDL: options.DDL,
            location: options.location,
            address: options.address,
            detail: options.detail,
            reward: options.reward,
            takeCode: options.takeCode || '',  // 快递单号（如果是代拿快递）
            takeName: options.takeName || '',  // 姓名（如果是代拿外卖）
            takeTel: options.takeTel || '',  // 手机尾号（如果是代拿外卖）
        };

        // 设置到页面的 data 中
        this.setData({
            task: task
        });
    },

    // 处理返回操作
    handleBack() {
        wx.navigateBack({
            delta: 1  // 返回上一级页面
        });
    },

    // 显示出价输入框
    showBiddingDialog() {
        this.setData({
            showBiddingModal: true  // 显示出价弹窗
        });
    },

    // 隐藏出价输入框
    hideBiddingModal() {
        this.setData({
            showBiddingModal: false,  // 隐藏出价弹窗
            biddingAmount: ''  // 清空输入的金额
        });
    },

    // 处理用户输入的出价金额
    handleBiddingInput(e: any) {
        this.setData({
            biddingAmount: e.detail.value  // 更新出价金额
        });
    },

    // 提交出价
    submitBidding() {
        const { biddingAmount } = this.data;

        if (!biddingAmount || parseFloat(biddingAmount) <= 0) {
            wx.showToast({
                title: '请输入有效的出价金额',
                icon: 'none'
            });
            return;
        }

        // 在这里可以进行出价提交的逻辑，比如调用 API 更新任务状态等
        console.log('提交的出价金额:', biddingAmount);

        // 提交后隐藏弹窗并清空输入
        this.setData({
            showBiddingModal: false,
            biddingAmount: ''  // 清空输入框
        });

        wx.showToast({
            title: '出价成功',
            icon: 'success'
        });
    },


    // 处理接单按钮点击事件
    handleAccept() {
        // 处理接单功能（更新任务状态、记录接单等）
        console.log('接单成功');
    }
});