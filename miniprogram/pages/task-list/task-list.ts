Page({
    data: {
      category: '',  // 分类名称
      taskList: [],  // 存储任务列表
      filteredTaskList: [], // 筛选后的任务列表
  
      // 筛选选项
      filterOptions: ["全部", "待接单", "进行中", "已完成"],
      activeFilter: 0, // 当前筛选索引
    },
  
    onLoad: function (options: any) {
      const category = options.category || "全部";  // 获取传递的分类，默认为"全部"
      this.setData({ category });
      
      // 加载该分类下的任务数据
      this.loadTasksForCategory(category);
    },
  
    // 处理返回操作
    handleBack() {
      wx.navigateBack({
        delta: 1  // 返回上一级页面
      });
    },
  
    // 加载任务数据（按分类）
    loadTasksForCategory(category: string) {
      const tasks = {
        '代拿快递': [
          { title: '快递任务1', detail: '帮我拿快递', status: "待接单", reward: "5" },
          { title: '快递任务2', detail: '代取快递', status: "进行中", reward: "10" },
        ],
        '代拿外卖': [
          { title: '外卖任务1', detail: '代拿外卖', status: "待接单", reward: "8" },
          { title: '外卖任务2', detail: '取外卖', status: "已完成", reward: "15" },
        ],
        '兼职发布': [
          { title: '兼职任务1', detail: '寻找兼职工作', status: "进行中", reward: "50" },
          { title: '兼职任务2', detail: '招聘兼职人员', status: "待接单", reward: "80" },
        ],
        '作业协助': [
          { title: '作业任务1', detail: '作业辅导', status: "已完成", reward: "20" },
          { title: '作业任务2', detail: '帮助完成作业', status: "待接单", reward: "25" },
        ],
        '二手交易': [
          { title: '二手任务1', detail: '出售二手物品', status: "待接单", reward: "100" },
          { title: '二手任务2', detail: '二手交易', status: "进行中", reward: "120" },
        ],
        '寻物启事': [
          { title: '寻物任务1', detail: '帮忙找丢失物品', status: "已完成", reward: "30" },
          { title: '寻物任务2', detail: '寻找丢失物品', status: "待接单", reward: "40" },
        ]
      };
  
      const taskList = tasks[category] || [];
      this.setData({ taskList });
  
      // 默认按筛选条件（全部）进行筛选
      this.filterTasks();
    },
  
    // 选择筛选项
    selectFilter(event: any) {
      const index = event.currentTarget.dataset.index;
      this.setData({ activeFilter: index });
      this.filterTasks();
    },
  
    // 任务筛选
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
  
    // 任务点击事件（可跳转详情页）
    handleTaskClick(event: any) {
      const index = event.currentTarget.dataset.index;
      console.log("点击任务", this.data.filteredTaskList[index]);
  
      wx.navigateTo({
        url: `/pages/task-detail/task-detail?title=${this.data.filteredTaskList[index].title}`
      });
    },
  });