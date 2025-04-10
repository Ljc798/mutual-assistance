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
    status: number;  // 任务状态（0: 待接单, 1: 进行中, 2: 已完成）
    formattedDDL?: string; // 格式化后的时间
    formattedStatus?: string; // 格式化后的状态
}

Page({
    data: {
        tasks: [] as Task[], // 存储所有任务
        filteredTasks: [] as Task[], // 当前分类筛选后的任务
        activeCategory: "全部", // 当前选中的分类
        keyword: "",
        searchResults: [],
    },

    onLoad() {
        this.loadTasks(); // 加载任务数据
    },

    onShow() {
        this.loadTasks(); // 加载任务数据
    },

    loadTasks() {
        wx.showLoading({ title: "加载中...", mask: true });

        wx.request({
            url: "https://mutualcampus.top/api/task/tasks",
            method: "GET",
            header: {
                "Accept": "application/json" // ✅ 加上这句
            },
            success: (res: any) => {

                // ✅ 确保是数组才进行 map 处理
                if (Array.isArray(res.data)) {
                    const formattedTasks = res.data.map((task: Task) => ({
                        ...task,
                        formattedDDL: this.formatTime(task.DDL),
                        formattedStatus: this.formatStatus(task.status),
                    }));

                    this.setData({
                        tasks: formattedTasks,
                        filteredTasks: formattedTasks
                    });
                } else {
                    wx.showToast({ title: "任务数据异常", icon: "none" });
                    console.error("❌ 返回的数据不是数组：", res.data);
                }
            },
            fail: (err: any) => {
                console.error("❌ 请求失败:", err);
                wx.showToast({ title: "请求失败", icon: "none" });
            },
            complete: () => {
                wx.hideLoading();
            },
        });
    },

    // 处理分类点击事件
    handleCategoryClick(e: any) {
        const category = e.currentTarget.dataset.category;  // 获取点击的分类
        console.log(category);

        wx.navigateTo({
            url: `/pages/task-list/task-list?category=${encodeURIComponent(category)}`,  // 传递分类信息
        });
    },

    // 课表点击事件
    handleTimetableClick() {
        wx.navigateTo({ url: "/pages/timetable/timetable" });
    },

    // 点击任务项，跳转到详情页（使用 taskId 传递）
    handleTaskClick(e: any) {
        const taskIndex = e.currentTarget.dataset.index;
        const task = this.data.filteredTasks[taskIndex];

        wx.navigateTo({
            url: `/pages/task/task?taskId=${task.id}`, // 传递任务 ID
        });
    },

    // 时间格式化
    formatTime(DDL: string) {
        const date = new Date(DDL);
        date.setHours(date.getHours() - 8);
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

    handleOrderClick() {
        wx.navigateTo({ url: "/pages/order/order" })
    },

    handleSearchInput(e) {
        const value = e.detail.value;
        this.setData({ keyword: value });

        clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(() => {
            this.searchTasks(value);
        }, 800); // ❗️节流搜索请求
    },

    searchTasks(keyword) {
        if (!keyword.trim()) {
            this.setData({ searchResults: [] });
            return;
        }
        console.log(111);
        
        wx.request({
            url: "https://mutualcampus.top/api/task/search",
            method: "GET",
            data: { q: keyword },
            success: (res) => {
                console.log(res);

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