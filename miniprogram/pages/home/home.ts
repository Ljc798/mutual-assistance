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

import { BASE_URL } from '../../config/env';

Page({
    data: {
        tasks: [] as Task[], // 存储所有任务
        filteredTasks: [] as Task[], // 当前分类筛选后的任务
        selectedCategory: "全部", // 当前选中的分类
        keyword: "",
        searchResults: [],
        currentPage: 1,
        pageSize: 10,
        hasMore: true,
        selectedSchoolName: '',

        filters: [
            { label: '全部', value: 'all' },
            { label: '待接单', value: 0 },
            { label: '进行中', value: 1 },
            { label: '已完成', value: 2 },
        ],
        activeFilter: 'all',
    },

    onLoad() {
        this.loadTasks(); // 加载任务数据
    },

    onShow() {
        const app = getApp();
        const userSchoolName = app.globalData.selectedTaskSchoolName || app.globalData.userInfo?.school_name || '';
        const userSchoolId = app.globalData.selectedTaskSchoolId || app.globalData.userInfo?.school_id || null;

        this.setData({
            selectedSchoolName: userSchoolName
        });

        app.globalData.selectedTaskSchoolName = userSchoolName;
        app.globalData.selectedTaskSchoolId = userSchoolId;

        this.loadTasks(); // 加载任务
    },

    onPullDownRefresh() {
        this.setData({ currentPage: 1 });
        this.loadTasks();
        wx.stopPullDownRefresh();
    },

    onFilterTap(e: any) {
        const value = e.currentTarget.dataset.value;  // 'all' | 0 | 1 | 2
        // 重置分页并刷新
        this.setData({ activeFilter: value, currentPage: 1, hasMore: true }, () => {
          wx.showLoading({ title: '加载中' });
          this.loadTasks(false);
        });
      },

      loadTasks(isLoadMore = false) {
        const { selectedCategory, currentPage, pageSize, tasks, activeFilter } = this.data;
        const app = getApp();
        let school = app.globalData.selectedTaskSchoolId || app.globalData.userInfo?.school_id || null;
      
        // 触底加载下一页：这里即时计算下一页页码；刷新则用当前 1
        const nextPage = isLoadMore ? currentPage + 1 : 1;
      
        // 将 activeFilter 映射为后端可读的 status：all 传空，0/1/2 传数字
        const statusParam = activeFilter === 'all' ? '' : Number(activeFilter);
      
        wx.request({
          url: `${BASE_URL}/task/tasks`,
          method: "GET",
          data: {
            category: selectedCategory,
            page: nextPage,
            pageSize,
            school_id: school || '',
            status: statusParam,          // ★ 新增：状态筛选
          },
          header: { "Accept": "application/json" },
          success: (res: any) => {
            if (Array.isArray(res.data)) {
              const newTasks = res.data.map((task: Task) => ({
                ...task,
                displayPrice: task.status >= 1
                  ? Number(task.pay_amount || 0).toFixed(2)
                  : Number(task.offer).toFixed(2),
                formattedDDL: this.formatTime(task.DDL),
                formattedStatus: this.formatStatus(task.status),
              }));
      
              this.setData({
                tasks: isLoadMore ? [...tasks, ...newTasks] : newTasks,
                hasMore: newTasks.length === pageSize,
                currentPage: nextPage,     // ★ 成功后再推进页码
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
            wx.stopPullDownRefresh?.();
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

    handleOrderClick() {
        wx.navigateTo({ url: "/pages/order/order" });
    },

    handleSchoolClick() {
        wx.navigateTo({
            url: '/pages/schools/schools?mode=task'
        });
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
        const app = getApp();
        const schoolId = app.globalData?.selectedTaskSchoolId;

        if (!keyword.trim()) {
            this.setData({ searchResults: [] });
            return;
        }

        wx.request({
            url: `${BASE_URL}/task/search`,
            method: "GET",
            data: {
                q: keyword,
                school_id: schoolId // 👈 带上学校id
            },
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