// task_detail.ets
@Component
struct TaskDetail {
  private pathStack: NavPathStack = new NavPathStack();
  @State id: number = 0;

  onReady(context: NavDestinationContext) {
    this.pathStack = context.pathStack;
    // 获取传递的参数
    const params = this.pathStack.getParamByName('task_detail');
    if (params?.id) {
      this.id = params.id;
    }
  }

  build() {
    NavDestination() {
      Text(`任务ID: ${this.id}`)
    }
    .title('详情页')
  }
}

// 导出Builder函数（需与route_map.json中的buildFunction一致）
@Builder
export function TaskDetailBuilder() {
  TaskDetail();
}
