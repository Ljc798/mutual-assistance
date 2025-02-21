Page({
    data: {
      category: '',  // 分类名称
      taskList: [],  // 存储任务列表
    },

    onLoad: function (options: any) {
      const category = options.category;  // 获取传递过来的分类
      this.setData({
        category: category,
      });
  
      // 根据分类来加载相应的任务数据
      this.loadTasksForCategory(category);
    },
    // 处理返回操作
    handleBack() {
        wx.navigateBack({
            delta: 1  // 返回上一级页面
        });
    },
  
    // 根据分类加载任务数据
    loadTasksForCategory(category: string) {
      // 假设有一个任务数据对象，这里直接模拟数据
      const tasks = {
        '代拿快递': [
          { title: '快递任务1', detail: '帮我拿快递' },
          { title: '快递任务2', detail: '代取快递' },
        ],
        '代拿外卖': [
          { title: '外卖任务1', detail: '代拿外卖' },
          { title: '外卖任务2', detail: '取外卖' },
        ],
        '兼职发布': [
          { title: '兼职任务1', detail: '寻找兼职工作' },
          { title: '兼职任务2', detail: '招聘兼职人员' },
        ],
        '作业协助': [
          { title: '作业任务1', detail: '作业辅导' },
          { title: '作业任务2', detail: '帮助完成作业' },
        ],
        '二手交易': [
          { title: '二手任务1', detail: '出售二手物品' },
          { title: '二手任务2', detail: '二手交易' },
        ],
        '寻物启事': [
          { title: '寻物任务1', detail: '帮忙找丢失物品' },
          { title: '寻物任务2', detail: '寻找丢失物品' },
        ]
      };
  
      // 获取分类对应的任务列表
      this.setData({
        taskList: tasks[category] || [],
      });
    },
    
    
  });