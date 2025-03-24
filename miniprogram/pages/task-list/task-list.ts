interface Task {
    id: string; // 任务 ID
    title: string;
    category: string; // 任务分类
    DDL: string; // 期望完成时间
    position: string; // 任务地点
    address: string; // 交付地点
    takeCode?: string; // 取件码（快递）
    takeName?: string; // 外卖名字
    takeTel?: number; // 手机尾号
    detail: string; // 任务简介
    offer: number | string; // 报酬
    status: number; // 任务状态
}

Page({
    data: {
        category: "全部", // 任务分类，默认是 "全部"
        taskList: [] as Task[], // 所有任务
        filteredTaskList: [] as Task[], // 筛选后的任务列表
        filterOptions: ["全部", "待接单", "进行中", "已完成"],
        activeFilter: 0, // 当前筛选状态
    },

    onLoad(options: any) {
        const category = options.category ? decodeURIComponent(options.category) : "全部"; // 解析分类参数
        this.setData({ category });
        this.loadTasksForCategory(category);
    },

    // 从本地 API 加载任务
    loadTasksForCategory(category: string) {
        wx.showLoading({ title: "加载中...", mask: true });

        wx.request({
            url: `http://localhost:3000/api/task/tasks?category=${encodeURIComponent(category)}`,
            method: "GET",
            success: (res: any) => {

                const formattedTasks = res.data.map((task: Task) => ({
                    ...task,
                    formattedDDL: this.formatTime(task.DDL), // 格式化时间
                    formattedStatus: this.formatStatus(task.status), // 格式化状态
                }));

                this.setData({
                    taskList: formattedTasks,
                    filteredTaskList: formattedTasks
                });

                // 默认筛选任务
                this.filterTasks();
            },
            fail: (err: any) => {
                console.error("❌ 任务加载失败:", err);
                wx.showToast({ title: "任务加载失败", icon: "none" });
            },
            complete: () => {
                wx.hideLoading();
            },
        });
    },

    // 选择筛选条件
    selectFilter(event: any) {
        const index = event.currentTarget.dataset.index;
        this.setData({ activeFilter: index });
        this.filterTasks();
    },

    // 任务筛选（按照整数状态进行筛选）
    filterTasks() {
        const { activeFilter, filterOptions, taskList } = this.data;
        const selectedStatus = activeFilter; // 这里 `activeFilter` 是索引

        if (selectedStatus === 0) { // 0 代表 "全部"
            this.setData({ filteredTaskList: taskList });
        } else {
            const filtered = taskList.filter(task => task.status === selectedStatus - 1);
            // activeFilter: 1(待接单) → status: 0
            // activeFilter: 2(进行中) → status: 1
            // activeFilter: 3(已完成) → status: 2
            this.setData({ filteredTaskList: filtered });
        }
    },

    // 点击任务跳转详情页
    handleTaskClick(event: any) {
        const index = event.currentTarget.dataset.index;
        const task = this.data.filteredTaskList[index];

        if (!task || !task.id) {  // 确保 ID 存在
            console.error("❌ 任务 ID 不存在:", task);
            wx.showToast({ title: "任务 ID 不存在", icon: "none" });
            return;
        }

        wx.navigateTo({
            url: `/pages/task/task?taskId=${task.id}`,  // 传递正确的 id
        });
    },

    // 返回上一页
    handleBack() {
        wx.navigateBack({ delta: 1 });
    },

    // 时间格式化
    formatTime(DDL: string) {
        const date = new Date(DDL);
        const month = date.getMonth() + 1; // 获取月份（从 0 开始）
        const day = date.getDate(); // 获取日期
        const hours = date.getHours(); // 获取小时
        const minutes = date.getMinutes(); // 获取分钟

        return `${month}-${day} ${hours}:${minutes < 10 ? "0" + minutes : minutes}`; // 保证分钟是两位数
    },

    // 任务状态格式化
    formatStatus(status: number): string {
        switch (status) {
            case 0:
                return "待接单";
            case 1:
                return "进行中";
            case 2:
                return "已完成";
            default:
                return "未知状态";
        }
    },
});