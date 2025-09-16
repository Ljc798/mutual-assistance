interface Task {
    id: string;
    title: string;
    category: string;
    DDL: string;
    position: string;
    address: string;
    takeCode?: string;
    takeName?: string;
    takeTel?: number;
    detail: string;
    offer: number | string;
    status: number;
    formattedDDL?: string;
    formattedStatus?: string;
}

Page({
    data: {
        category: "全部",
        taskList: [] as Task[],
        filteredTaskList: [] as Task[],
        filterOptions: ["全部", "待接单", "进行中", "已完成"],
        activeFilter: 0,
        page: 1,
        pageSize: 10,
        hasMore: true,
    },

    onLoad(options: any) {
        const category = options.category ? decodeURIComponent(options.category) : "全部";
        this.setData({ category, page: 1 }, () => {
            this.loadTasksForCategory(false);
        });
    },

    onPullDownRefresh() {
        this.setData({ page: 1 }, () => {
            this.loadTasksForCategory(false).finally(() => {
                wx.stopPullDownRefresh();
            });
        });
    },

    onReachBottom() {
        if (!this.data.hasMore) return;
        this.setData({ page: this.data.page + 1 }, () => {
            this.loadTasksForCategory(true);
        });
    },

    loadTasksForCategory(isLoadMore = false) {
        const { category, page, pageSize } = this.data;
        const app = getApp();
        const school = app.globalData.selectedTaskSchoolId;

        wx.request({
            url: `https://mutualcampus.top/api/task/tasks`,
            method: "GET",
            data: {
                category: encodeURIComponent(category),
                page,
                pageSize,
                school_id: school,
            },
            success: (res: any) => {
                const tasks = Array.isArray(res.data) ? res.data : [];
                const formatted = tasks.map((task: Task) => ({
                    ...task,
                    displayPrice: task.status >= 1 
                        ? Number(task.pay_amount).toFixed(2) 
                        : Number(task.offer).toFixed(2),
                    formattedDDL: this.formatTime(task.DDL),
                    formattedStatus: this.formatStatus(task.status),
                }));
            
                this.setData({
                    taskList: isLoadMore ? [...this.data.taskList, ...formatted] : formatted,
                    filteredTaskList: isLoadMore ? [...this.data.taskList, ...formatted] : formatted,
                    hasMore: tasks.length === pageSize,
                });
            
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

    selectFilter(event: any) {
        const index = event.currentTarget.dataset.index;
        this.setData({ activeFilter: index });
        this.filterTasks();
    },

    filterTasks() {
        const { activeFilter, taskList } = this.data;
        if (activeFilter === 0) {
            this.setData({ filteredTaskList: taskList });
        } else {
            const filtered = taskList.filter(task => task.status === activeFilter - 1);
            this.setData({ filteredTaskList: filtered });
        }
    },

    handleTaskClick(event: any) {
        const index = event.currentTarget.dataset.index;
        const task = this.data.filteredTaskList[index];

        if (!task || !task.id) {
            console.error("❌ 任务 ID 不存在:", task);
            wx.showToast({ title: "任务 ID 不存在", icon: "none" });
            return;
        }

        wx.navigateTo({
            url: `/pages/task/task?taskId=${task.id}`,
        });
    },

    handleBack() {
        wx.navigateBack({ delta: 1 });
    },

    formatTime(DDL: string) {
        const date = new Date(DDL);
        date.setHours(date.getHours());
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const hours = date.getHours();
        const minutes = date.getMinutes();

        return `${month}-${day} ${hours}:${minutes < 10 ? "0" + minutes : minutes}`;
    },

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