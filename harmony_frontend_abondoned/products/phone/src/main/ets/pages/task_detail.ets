import { TaskDetailPage } from '../../../../../features/home/src/main/ets/pages/TaskDetailPage';

interface TaskDetailRouteParams {
  id?: string | number;
}

@Component
struct TaskDetailWrapper {
  private pathStack: NavPathStack = new NavPathStack();
  @State taskId: string = '28';

  onReady(context: NavDestinationContext) {
    this.pathStack = context.pathStack;
    const paramList = this.pathStack.getParamByName('task_detail') as Array<TaskDetailRouteParams> | undefined;
    if (paramList && paramList.length > 0) {
      const params = paramList[0];
      if (params && params.id !== undefined) {
        this.taskId = `${params.id}`;
      }
    }
  }

  build() {
    NavDestination() {
      TaskDetailPage({ taskId: this.taskId });
    }
    .title('任务详情');
  }
}

@Builder
export function TaskDetailBuilder() {
  TaskDetailWrapper();
}
