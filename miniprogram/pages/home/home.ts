interface Task {
    title: string;
    category: string;  //  任务分类
    DDL: string;  // 日期和时间
    location: string;  //  进行地点
    address: string;  //  交付地点
    takeCode?: string;  //  取件码
    takeName?: string;  //  外卖名字
    takeTel?: number;  //  手机尾号
    detail: string;  //  任务简介
    reward: string;  //  报酬
}

Page({
    data: {
        tasks: [] as Task[]  // 声明 tasks 数组类型为 Task[]
    },

    onLoad: function () {
        // 模拟从数据库或 API 获取任务数据
        this.setData({
            tasks: [
                {
                    title: '一食堂拿快递',
                    category: '代拿快递',
                    DDL: '2025.1.1 12:00',
                    location: '学生宿舍13栋',
                    takeCode: '12-2321',
                    address: 'xxx',
                    detail: '111',
                    reward: '1.00'
                },
                {
                    title: '北门拿外卖',
                    category: '代拿外卖',
                    DDL: '2025.1.2 14:00',
                    location: '学生宿舍31栋',
                    takeName: '张三',
                    takeTel: 1234,
                    address: 'xxx',
                    detail: '111',
                    reward: '5.00'
                },
                {
                    title: '二手交易',
                    category: '二手交易',
                    DDL: '2025.1.3 16:00',
                    location: '学生宿舍10栋',
                    address: 'xxx',
                    detail: '111',
                    reward: '2.50'
                }
            ]
        });
    },
    // 处理分类点击事件
    handleCategoryClick(e: any) {
        const category = e.currentTarget.dataset.category;  // 获取当前点击的分类
        wx.navigateTo({
            url: `/pages/task-list/task-list?category=${category}`,  // 跳转到任务列表页并传递分类信息
        });
    },

    // 处理点击任务项，跳转到详情页
    handleTaskClick(e: any) {
        const taskIndex = e.currentTarget.dataset.index;  // 获取当前任务的 index
        const task = this.data.tasks[taskIndex];  // 根据 index 获取任务数据

        // 使用 wx.navigateTo 跳转到详情页，并将任务数据传递过去
        wx.navigateTo({
            url: `/pages/task/task?title=${task.title}&category=${task.category}&DDL=${task.DDL}&location=${task.location}&address=${task.address}&detail=${task.detail}&reward=${task.reward}&takeCode=${task.takeCode}&takeName=${task.takeName}&takeTel=${task.takeTel}`
        });
    }
});