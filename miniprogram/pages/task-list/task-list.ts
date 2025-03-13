Page({
    data: {
      category: "", // 任务分类
      taskList: [], // 所有任务
      filteredTaskList: [], // 筛选后的任务列表
      filterOptions: ["全部", "待接单", "进行中", "已完成"],
      activeFilter: 0, // 当前筛选索引
    },
  
    onLoad(options: any) {
      const category = options.category || "全部";
      this.setData({ category });
      this.loadTasksForCategory(category);
    },
  
    // 加载任务数据（按分类）
    async loadTasksForCategory(category: string) {
      const db = wx.cloud.database();
      try {
        const res = await db.collection("tasks")
          .where(category !== "全部" ? { category } : {}) // 查询当前分类任务
          .orderBy("createTime", "desc") // 按创建时间降序排序
          .get();
  
        console.log("✅ 获取任务:", res.data);
        this.setData({ taskList: res.data });
  
        // 默认筛选
        this.filterTasks();
      } catch (error) {
        console.error("❌ 任务加载失败:", error);
        wx.showToast({ title: "加载失败", icon: "none" });
      }
    },
  
    // 选择筛选条件
    selectFilter(event: any) {
      const index = event.currentTarget.dataset.index;
      this.setData({ activeFilter: index });
      this.filterTasks();
    },
  
    // 筛选任务
    filterTasks() {
      const { activeFilter, filterOptions, taskList } = this.data;
      const selectedStatus = filterOptions[activeFilter];
  
      if (selectedStatus === "全部") {
        this.setData({ filteredTaskList: taskList });
      } else {
        const filtered = taskList.filter(task => task.status === selectedStatus);
        this.setData({ filteredTaskList: filtered });
      }
    },
  
    // 点击任务跳转详情页
    handleTaskClick(event: any) {
      const index = event.currentTarget.dataset.index;
      const task = this.data.filteredTaskList[index];
      wx.navigateTo({
        url: `/pages/task-detail/task-detail?id=${task._id}`
      });
    },
  
    // 返回上一页
    handleBack() {
      wx.navigateBack({ delta: 1 });
    },
  });