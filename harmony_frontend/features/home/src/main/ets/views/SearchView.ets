import { AppSafeArea, PAGE_PATH, SCHOOL_SELECTION_VERSION_KEY, AppSelectedSchool, schoolPersistence, TaskItem, TaskStatus } from 'basic'
import { AppStorageV2 } from '@kit.ArkUI'
import { HMRouter, HMRouterMgr } from '@hadss/hmrouter'
import { searchTasks } from '../services/TaskService'
import { PriceInfo } from '../viewmodels/HomeTypes'
import { AppCurrentTaskDetail } from '../viewmodels/TaskDetailVM'

@HMRouter({ pageUrl: PAGE_PATH.SEARCH_PAGE })
@Component
export struct SearchView {
  safeArea: AppSafeArea = AppStorageV2.connect(AppSafeArea, () => new AppSafeArea())!
  private readonly schoolSelection: AppSelectedSchool = AppStorageV2.connect(AppSelectedSchool, () => new AppSelectedSchool())!
  @StorageLink('home_search_keyword') keyword: string = ''
  @StorageLink(SCHOOL_SELECTION_VERSION_KEY) schoolVersion: number = 0
  private lastSchoolVersion: number = -1
  @State results: TaskItem[] = []
  @State isRefreshing: boolean = false

  aboutToAppear() { this.loadSearch() }

  aboutToRender() {
    if (this.schoolVersion !== this.lastSchoolVersion) {
      this.lastSchoolVersion = this.schoolVersion
      this.loadSearch()
    }
  }

  build() {
    Stack() {
      Column() {
        this.renderHeader()
        this.renderResultList()
      }
      .width('100%')
      .height('100%')
      .backgroundColor($r('[basic].color.page_background'))
    }
  }

  @Builder
  private renderHeader() {
    Row() {
      Image($r('[basic].media.ic_public_left'))
        .width(28)
        .aspectRatio(1)
        .fillColor($r('[basic].color.white'))
        .onClick(() => { HMRouterMgr.pop() })
      Text(`搜索：${this.keyword || ''}`)
        .fontSize(18)
        .fontColor($r('[basic].color.white'))
      Blank()
    }
    .padding({ top: this.safeArea.topHeight + 10, bottom: 12, left: 16, right: 16 })
    .width('100%')
    .backgroundColor($r('[basic].color.home_header_bg'))
  }

  @Builder
  private renderResultList() {
    if (this.results.length === 0) {
      Column({ space: 6 }) {
        Text('未找到相关任务')
          .fontSize(14)
          .fontColor($r('[basic].color.text_secondary'))
        Text('试试其他关键词或切换学校')
          .fontSize(12)
          .fontColor($r('[basic].color.text_secondary'))
      }
      .padding({ top: 40 })
      .alignItems(HorizontalAlign.Center)
    } else {
      List({ space: 10 }) {
        ForEach(this.results, (task: TaskItem) => {
          ListItem() { this.TaskCard(task) }
            .padding({ left: 16, right: 16, top: 6 })
        }, (task: TaskItem) => task.id)
      }
      .padding({ bottom: 20 })
    }
  }

  @Builder
  private TaskCard(task: TaskItem) {
    Row() {
      Column() {
        Text(task.title)
          .fontSize(18)
          .fontWeight(FontWeight.Medium)
          .fontColor($r('[basic].color.text_primary'))
          .margin({ bottom: 8 })
        Text(`期望完成时间：${task.formattedDeadline ? task.formattedDeadline : '--'}前`)
          .fontSize(13)
          .fontColor($r('[basic].color.text_primary'))
          .margin({ bottom: 4 })
        Text(`交易地点：${task.position ? task.position : '-'}`)
          .fontSize(13)
          .fontColor($r('[basic].color.text_primary'))
          .margin({ bottom: 4 })
        Text(`送达地点：${task.address ? task.address : '-'}`)
          .fontSize(13)
          .fontColor($r('[basic].color.text_primary'))
      }
      .alignItems(HorizontalAlign.Start)

      Column() {
        Text(task.status !== undefined ? this.getStatusLabel(task.status) : '')
          .fontSize(14)
          .fontColor(this.getStatusColor(task.status))
          .margin({ bottom: 12 })
        Text(this.getPriceInfo(task).label)
          .fontSize(16)
          .fontWeight(FontWeight.Bold)
          .fontColor(this.getPriceInfo(task).color)
      }
      .height(80)
      .justifyContent(FlexAlign.SpaceBetween)
      .alignItems(HorizontalAlign.End)
      .padding({ right: 5 })
    }
    .width('100%')
    .justifyContent(FlexAlign.SpaceBetween)
    .alignItems(VerticalAlign.Top)
    .padding({ left: 15, right: 15, top: 15, bottom: 15 })
    .backgroundColor($r('[basic].color.white'))
    .borderRadius(18)
    .shadow({ radius: 12, color: '#0A000000', offsetX: 0, offsetY: 6 })
    .onClick(() => this.handleTaskSelect(task))
  }

  private async loadSearch() {
    const keyword = (this.keyword || '').trim()
    if (!keyword) { this.results = []; return }
    const snapshot = schoolPersistence.getSelection()
    const schoolId = (typeof snapshot.id === 'number' && snapshot.id > 0 && (snapshot.name?.length ?? 0) > 0) ? snapshot.id : undefined
    this.isRefreshing = true
    try {
      const items = await searchTasks(keyword, schoolId)
      this.results = items
    } catch (_e) {
      this.results = []
    } finally {
      this.isRefreshing = false
    }
  }

  private getStatusLabel(status: TaskStatus): string {
    switch (status) {
      case 0: return '待接单'
      case 1: return '进行中'
      case 2: return '已完成'
      default: return '未知状态'
    }
  }

  private getStatusColor(status: TaskStatus): ResourceColor {
    switch (status) {
      case 0: return $r('[basic].color.status_pending')
      case 1: return $r('[basic].color.status_ongoing')
      case 2:
      default: return $r('[basic].color.status_finished')
    }
  }

  private getPriceInfo(task: TaskItem): PriceInfo {
    const offerValue = Number(task.offer ?? 0)
    const fixedLabel = `一口价 ¥${offerValue.toFixed(2)}`
    if (task.mode === 'fixed') {
      if (task.status === 0) { return { label: fixedLabel, color: $r('[basic].color.price_fixed') } as PriceInfo }
      if (task.status === 1) { return { label: fixedLabel, color: $r('[basic].color.price_processing') } as PriceInfo }
      return { label: fixedLabel, color: $r('[basic].color.price_done') } as PriceInfo
    }
    if (!task.hasPaid) { return { label: `参考价 ¥${offerValue.toFixed(2)}`, color: $r('[basic].color.price_bidding') } as PriceInfo }
    if (task.status === 2) {
      const finalAmount = Number(task.payAmount ?? task.offer ?? 0).toFixed(2)
      return { label: `成交价 ¥${finalAmount}`, color: $r('[basic].color.price_done') } as PriceInfo
    }
    const bidAmount = Number(task.payAmount ?? task.offer ?? 0).toFixed(2)
    return { label: `中标价 ¥${bidAmount}`, color: $r('[basic].color.price_deal') } as PriceInfo
  }

  private handleTaskSelect(task: TaskItem) {
    const vm = AppStorageV2.connect(AppCurrentTaskDetail, () => new AppCurrentTaskDetail())!
    vm.setTask(task)
    HMRouterMgr.push({ pageUrl: PAGE_PATH.TASK_DETAIL_PAGE })
  }
}

