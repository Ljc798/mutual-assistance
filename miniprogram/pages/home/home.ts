interface Task {
    id: string;  // 任务 ID
    title: string;
    category: string;  // 任务分类
    DDL: string;  // 期望完成时间
    position: string;  // 任务地点
    address: string;  // 交付地点
    takeCode?: string;  // 取件码（快递）
    takeName?: string;  // 外卖名字
    takeTel?: number;  // 手机尾号
    detail: string;  // 任务简介
    offer: number | string;  // 报酬
    pay_amount?: number | string; // 实际成交价（新加）
    status: number;  // 任务状态（0: 待接单, 1: 进行中, 2: 已完成）
    formattedDDL?: string; // 格式化后的时间
    formattedStatus?: string; // 格式化后的状态
    displayPrice?: string; // 显示价格字段（新增）
}

Page({
    data: {
        tasks: [] as Task[], // 存储所有任务
        filteredTasks: [] as Task[], // 当前分类筛选后的任务
        selectedCategory: "全部", // 当前选中的分类
        keyword: "",
        searchResults: [],
        currentPage: 1,
        pageSize: 10,
        hasMore: true
    },

    onLoad() {
        this.loadTasks(); // 加载任务数据
    },

    onShow() {
        this.loadTasks(); // 加载任务数据
    },

    onPullDownRefresh() {
        this.setData({ currentPage: 1 });
        this.loadTasks();
        wx.stopPullDownRefresh();
    },

    loadTasks(isLoadMore = false) {
        const { selectedCategory, currentPage, pageSize, tasks } = this.data;

        wx.request({
            url: "https://mutualcampus.top/api/task/tasks",
            method: "GET",
            data: {
                category: selectedCategory,
                page: currentPage,
                pageSize
            },
            header: {
                "Accept": "application/json"
            },
            success: (res: any) => {
                if (Array.isArray(res.data)) {
                    const newTasks = res.data.map((task: Task) => ({
                        ...task,
                        displayPrice: task.status >= 1 ? Number(task.pay_amount || 0).toFixed(2) : Number(task.offer).toFixed(2),
                        formattedDDL: this.formatTime(task.DDL),
                        formattedStatus: this.formatStatus(task.status),
                    }));

                    this.setData({
                        tasks: isLoadMore ? [...tasks, ...newTasks] : newTasks,
                        hasMore: newTasks.length === pageSize
                    });
                } else {
                    wx.showToast({ title: "任务数据异常", icon: "none" });
                    console.error("❌ 返回的数据异常：", res.data);
                }
            },
            fail: (err: any) => {
                console.error("❌ 请求失败:", err);
                wx.showToast({ title: "请求失败", icon: "none" });
            },
            complete: () => {
                wx.hideLoading();
            }
        });
    },

    handleCategoryClick(e: any) {
        const category = e.currentTarget.dataset.category;
        wx.navigateTo({
            url: `/pages/task-list/task-list?category=${encodeURIComponent(category)}`,
        });
    },

    handleTimetableClick() {
        wx.navigateTo({ url: "/pages/timetable/timetable" });
    },

    handleTaskClick(event: any) {
        const taskId = event.currentTarget.dataset.id;
        if (!taskId) {
            wx.showToast({ title: "任务 ID 缺失", icon: "none" });
            return;
        }
        wx.navigateTo({ url: `/pages/task/task?taskId=${taskId}` });
    },

    formatTime(DDL: string) {
        const date = new Date(DDL);
        date.setHours(date.getHours() - 8);
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

    handleOrderClick() {
        wx.navigateTo({ url: "/pages/order/order" });
    },

    handleSearchInput(e) {
        const value = e.detail.value;
        this.setData({ keyword: value });
        clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(() => {
            this.searchTasks(value);
        }, 800);
    },

    searchTasks(keyword) {
        if (!keyword.trim()) {
            this.setData({ searchResults: [] });
            return;
        }

        wx.request({
            url: "https://mutualcampus.top/api/task/search",
            method: "GET",
            data: { q: keyword },
            success: (res) => {
                if (res.data.success) {
                    this.setData({ searchResults: res.data.tasks });
                }
            },
            fail: () => {
                wx.showToast({ title: "搜索失败", icon: "none" });
            }
        });
    },
});