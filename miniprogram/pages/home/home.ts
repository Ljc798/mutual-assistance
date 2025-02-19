interface Task {
    title: string;
    time: string;       // 设置为 string 类型，代表日期和时间
    location: string;   // 设置为 string 类型，代表任务的地点
    reward: string;     // 设置为 string 类型，代表任务的报酬
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
            time: '2025.1.1 12:00前',
            location: '学生宿舍13栋',
            reward: '1.00'
          },
          {
            title: '北门拿外卖',
            time: '2025.1.2 14:00前',
            location: '学生宿舍31栋',
            reward: '5.00'
          },
          {
            title: '二手交易',
            time: '2025.1.3 16:00前',
            location: '学生宿舍10栋',
            reward: '2.50'
          },
          {
            title: '二手交易',
            time: '2025.1.3 16:00前',
            location: '学生宿舍10栋',
            reward: '2.50'
          },
          {
            title: '二手交易',
            time: '2025.1.3 16:00前',
            location: '学生宿舍10栋',
            reward: '2.50'
          },
          {
            title: '二手交易',
            time: '2025.1.3 16:00前',
            location: '学生宿舍10栋',
            reward: '2.50'
          },
          {
            title: '二手交易',
            time: '2025.1.3 16:00前',
            location: '学生宿舍10栋',
            reward: '2.50'
          },
          {
            title: '二手交易',
            time: '2025.1.3 16:00前',
            location: '学生宿舍10栋',
            reward: '2.50'
          }
        ]
      });
    }
  });