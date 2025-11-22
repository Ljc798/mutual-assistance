import promptAction from '@ohos.promptAction'
import { AppStorageV2 } from '@kit.ArkUI'
import { AppSafeArea, PAGE_PATH, AppUser, TaskBidItem } from 'basic'
import { HMRouter, HMRouterMgr } from '@hadss/hmrouter'
import { AppCurrentTaskDetail } from '../viewmodels/TaskDetailVM'
import { fetchTaskBids, submitBid, selectBid, takeTask } from '../services/TaskDetailService'

@HMRouter({ pageUrl: PAGE_PATH.TASK_DETAIL_PAGE })
@Component
export struct TaskDetailView {
  safeArea: AppSafeArea = AppStorageV2.connect(AppSafeArea, () => new AppSafeArea())!
  private readonly detailVM: AppCurrentTaskDetail = AppStorageV2.connect(AppCurrentTaskDetail, () => new AppCurrentTaskDetail())!
  private readonly appUser: AppUser = AppStorageV2.connect(AppUser, () => new AppUser())!
  @State bids: TaskBidItem[] = []
  @State showBidDialog: boolean = false
  @State isSubmittingBid: boolean = false
  @State bidPriceInput: string = ''
  @State bidAdvantageInput: string = ''

  build() {
    Column() {
      this.renderHeader()
      this.renderBody()
      this.renderBidDialog()
    }
    .height('100%')
    .width('100%')
    .backgroundColor($r('[basic].color.page_background'))
  }

  @Builder
  private renderHeader() {
    Row() {
      Image($r('[basic].media.ic_public_left'))
        .width(28)
        .aspectRatio(1)
        .fillColor($r('[basic].color.white'))
        .onClick(() => {
          HMRouterMgr.pop()
        })
      Text('任务详情')
        .fontSize(20)
        .fontWeight(FontWeight.Medium)
        .fontColor($r('[basic].color.white'))
      Blank()
    }
    .justifyContent(FlexAlign.SpaceBetween)
    .alignItems(VerticalAlign.Center)
    .width('100%')
    .padding({ top: this.safeArea.topHeight + 10, bottom: 12, left: 16, right: 16 })
    .backgroundColor($r('[basic].color.home_header_bg'))
  }

  @Builder
  private renderBody() {
    if (!this.detailVM.task || this.detailVM.id <= 0) {
      Column() {
        Text('未找到任务数据')
          .fontSize(14)
          .fontColor($r('[basic].color.text_secondary'))
        Button('返回')
          .height(40)
          .borderRadius(16)
          .backgroundColor($r('[basic].color.search_box_bg'))
          .onClick(() => HMRouterMgr.pop())
      }
      .width('100%')
      .alignItems(HorizontalAlign.Center)
      .padding({ top: 60 })
    } else {
      Column({ space: 12 }) {
        Column({ space: 8 }) {
          Text(this.detailVM.task!.title)
            .fontSize(18)
            .fontWeight(FontWeight.Medium)
            .fontColor($r('[basic].color.text_primary'))
          Text(`分类：${this.detailVM.task!.category}`)
            .fontSize(13)
            .fontColor($r('[basic].color.text_secondary'))
          Text(`截止：${this.detailVM.task!.formattedDeadline}`)
            .fontSize(13)
            .fontColor($r('[basic].color.text_secondary'))
          Text(`状态：${this.getStatusLabel(this.detailVM.task!.status)}`)
            .fontSize(13)
            .fontColor($r('[basic].color.text_secondary'))
          Text(`报价：¥${Number(this.detailVM.task!.offer ?? 0).toFixed(2)}`)
            .fontSize(13)
            .fontColor($r('[basic].color.text_secondary'))
        }
        .alignItems(HorizontalAlign.Start)
        .width('100%')
        .padding(16)
        .backgroundColor($r('[basic].color.white'))
        .borderRadius(16)

        Column({ space: 6 }) {
          Text('任务描述')
            .fontSize(15)
            .fontColor($r('[basic].color.text_primary'))
          Text(this.detailVM.task!.detail ?? '暂无描述')
            .fontSize(14)
            .fontColor($r('[basic].color.text_primary'))
        }
        .alignItems(HorizontalAlign.Start)
        .width('100%')
        .padding(16)
        .backgroundColor($r('[basic].color.white'))
        .borderRadius(16)

        if (this.detailVM.task!.category === '代拿快递') {
          Column({ space: 6 }) {
            Text('快递信息')
              .fontSize(15)
              .fontColor($r('[basic].color.text_primary'))
            Text(`取件码：${this.detailVM.task!.takeawayCode ?? '-'}`)
              .fontSize(14)
              .fontColor($r('[basic].color.text_primary'))
          }
          .alignItems(HorizontalAlign.Start)
          .width('100%')
          .padding(16)
          .backgroundColor($r('[basic].color.white'))
          .borderRadius(16)
        } else if (this.detailVM.task!.category === '代拿外卖') {
          Column({ space: 6 }) {
            Text('外卖信息')
              .fontSize(15)
              .fontColor($r('[basic].color.text_primary'))
            Text(`姓名：${this.detailVM.task!.takeawayName ?? '-'}`)
              .fontSize(14)
              .fontColor($r('[basic].color.text_primary'))
            Text(`手机尾号：${this.detailVM.task!.takeawayTel ?? '-'}`)
              .fontSize(14)
              .fontColor($r('[basic].color.text_primary'))
          }
          .width('100%')
          .padding(16)
          .backgroundColor($r('[basic].color.white'))
          .borderRadius(16)
        }

        if (this.detailVM.task!.mode === 'bidding') {
          Column({ space: 10 }) {
            Text('留言区（竞价）')
              .fontSize(15)
              .fontColor($r('[basic].color.text_primary'))
            Column({ space: 8 }) {
              ForEach(this.bids, (bid: TaskBidItem) => {
                Row({ space: 10 }) {
                  Column() {
                    Text(`${bid.bidderName}`)
                      .fontSize(14)
                      .fontColor($r('[basic].color.text_primary'))
                    Text(`价格：¥${bid.price.toFixed(2)} · 优势：${bid.advantage}`)
                      .fontSize(13)
                      .fontColor($r('[basic].color.text_secondary'))
                  }
                  .layoutWeight(1)
                  if (this.isEmployer()) {
                    Button(bid.selected ? '已选择' : '选择')
                      .height(32)
                      .borderRadius(12)
                      .enabled(!bid.selected)
                      .onClick(() => this.handleSelectBid(bid))
                  } else {
                    Button('聊一聊')
                      .height(32)
                      .borderRadius(12)
                      .onClick(() => this.handleChat())
                  }
                }
                .padding({ left: 12, right: 12 })
              }, (bid: TaskBidItem) => `bid-${bid.id}`)
            }
            .backgroundColor($r('[basic].color.white'))
            .borderRadius(16)
            .padding(8)
          }
          .width('100%')
          .padding(16)
          .backgroundColor(Color.Transparent)
        }

        this.renderBottomActions()
      }
      .padding({ left: 16, right: 16, top: 16, bottom: 16 })
    }
  }

  @Builder
  private renderBottomActions() {
    Row({ space: 10 }) {
      Blank().layoutWeight(1)
      if (!this.isEmployer()) {
        if (this.detailVM.task!.mode === 'bidding') {
          Button('出价')
            .height(44)
            .borderRadius(16)
            .backgroundColor($r('[basic].color.filter_active_bg'))
            .fontColor($r('[basic].color.white'))
            .onClick(() => this.openBidDialog())
          Button('聊一聊')
            .height(44)
            .borderRadius(16)
            .backgroundColor($r('[basic].color.home_accent'))
            .onClick(() => this.handleChat())
        } else {
          Button('接单')
            .height(44)
            .borderRadius(16)
            .backgroundColor($r('[basic].color.filter_active_bg'))
            .fontColor($r('[basic].color.white'))
            .onClick(() => this.handleTakeTask())
          Button('聊一聊')
            .height(44)
            .borderRadius(16)
            .backgroundColor($r('[basic].color.home_accent'))
            .onClick(() => this.handleChat())
        }
      } else {
        Button('编辑任务')
          .height(44)
          .borderRadius(16)
          .backgroundColor($r('[basic].color.home_accent'))
          .onClick(() => this.handleEditTask())
      }
    }
    .width('100%')
  }

  @Builder
  private renderBidDialog() {
    if (this.showBidDialog) {
      Column() {
        Column({ space: 10 }) {
          Text('提交出价')
            .fontSize(18)
            .fontWeight(FontWeight.Medium)
          TextInput({ placeholder: '请输入价格', text: this.bidPriceInput })
            .height(40)
            .backgroundColor($r('[basic].color.white'))
            .borderRadius(12)
            .padding({ left: 12, right: 12 })
            .onChange((v: string) => this.bidPriceInput = v)
          TextArea({ placeholder: '优势说明', text: this.bidAdvantageInput })
            .height(100)
            .backgroundColor($r('[basic].color.white'))
            .borderRadius(12)
            .padding(12)
            .onChange((v: string) => this.bidAdvantageInput = v)
          Row({ space: 12 }) {
            Button('取消')
              .layoutWeight(1)
              .height(44)
              .borderRadius(12)
              .backgroundColor($r('[basic].color.search_box_bg'))
              .onClick(() => this.closeBidDialog())
            Button(this.isSubmittingBid ? '提交中...' : '提交')
              .layoutWeight(1)
              .height(44)
              .borderRadius(12)
              .backgroundColor($r('[basic].color.filter_active_bg'))
              .fontColor($r('[basic].color.white'))
              .enabled(!this.isSubmittingBid)
              .onClick(() => this.handleSubmitBid())
          }
        }
        .width('90%')
        .padding(20)
        .backgroundColor($r('[basic].color.white'))
        .borderRadius(20)
      }
      .width('100%')
      .height('100%')
      .justifyContent(FlexAlign.Center)
      .alignItems(HorizontalAlign.Center)
      .backgroundColor('rgba(0,0,0,0.35)')
    } else {
      Blank()
    }
  }

  private isEmployer(): boolean {
    const employerId = this.detailVM.task?.employerId ?? 0
    return employerId > 0 && employerId === this.appUser.user.id
  }

  private getStatusLabel(value: number): string {
    switch (value) {
      case 0: return '待接单'
      case 1: return '进行中'
      case 2: return '已完成'
      default: return '未知'
    }
  }

  aboutToAppear() {
    if (this.detailVM.task && this.detailVM.task.mode === 'bidding') {
      this.loadBids()
    }
  }

  private async loadBids() {
    try {
      const taskId = Number(this.detailVM.task?.id ?? 0)
      if (!taskId) { return }
      const list = await fetchTaskBids(taskId)
      this.bids = list
    } catch (error) {
      promptAction.showToast({ message: '加载出价失败' })
    }
  }

  private openBidDialog() { this.showBidDialog = true }
  private closeBidDialog() { if (!this.isSubmittingBid) { this.showBidDialog = false } }

  private async handleSubmitBid() {
    const price = Number.parseFloat(this.bidPriceInput.trim())
    const advantage = this.bidAdvantageInput.trim()
    const taskId = Number(this.detailVM.task?.id ?? 0)
    const token = this.appUser.user.token
    if (!token) { promptAction.showToast({ message: '请先登录' }); return }
    if (!taskId || Number.isNaN(price) || price <= 0 || !advantage) {
      promptAction.showToast({ message: '请输入有效价格与优势' }); return
    }
    this.isSubmittingBid = true
    try {
      await submitBid({ task_id: taskId, price, advantage }, token)
      this.showBidDialog = false
      this.bidPriceInput = ''
      this.bidAdvantageInput = ''
      await this.loadBids()
      promptAction.showToast({ message: '出价成功' })
    } catch (error) {
      promptAction.showToast({ message: '出价失败' })
    } finally {
      this.isSubmittingBid = false
    }
  }

  private async handleSelectBid(bid: TaskBidItem) {
    const token = this.appUser.user.token
    if (!token) { promptAction.showToast({ message: '请先登录' }); return }
    const taskId = Number(this.detailVM.task?.id ?? 0)
    try {
      await selectBid({ task_id: taskId, bid_id: bid.id }, token)
      await this.loadBids()
      promptAction.showToast({ message: '已选择该出价' })
    } catch (error) {
      promptAction.showToast({ message: '选择失败' })
    }
  }

  private async handleTakeTask() {
    const token = this.appUser.user.token
    if (!token) { promptAction.showToast({ message: '请先登录' }); return }
    const taskId = Number(this.detailVM.task?.id ?? 0)
    try {
      await takeTask({ task_id: taskId }, token)
      promptAction.showToast({ message: '接单成功' })
    } catch (error) {
      promptAction.showToast({ message: '接单失败' })
    }
  }

  private handleChat() {
    promptAction.showToast({ message: '聊天功能开发中' })
  }

  private handleEditTask() {
    promptAction.showToast({ message: '编辑任务开发中' })
  }
}