import { TaskItem } from 'basic'

@ObservedV2
export class AppCurrentTaskDetail {
  @Trace
  id: number = 0
  @Trace
  task?: TaskItem

  setTask(item: TaskItem): void {
    const idValue: number = Number(item.id)
    this.id = Number.isFinite(idValue) && idValue > 0 ? idValue : 0
    this.task = this.id > 0 ? item : undefined
  }

  reset(): void {
    this.id = 0
    this.task = undefined
  }
}