import promptAction from '@ohos.promptAction'
import { AppStorageV2 } from '@kit.ArkUI'
import { HMRouter, HMRouterMgr } from '@hadss/hmrouter'
import { AppSafeArea, AppUser, PAGE_PATH } from 'basic'
import { OrderRole, OrderStatusFilter, MyOrderItem, MyOrderQuery, CancelPayload } from '../viewmodels/OrdersTypes'
import { cancelTask, confirmTaskDone, fetchCancelFreeCount, fetchMyOrders } from '../services/OrdersService'

@HMRouter({ pageUrl: PAGE_PATH.MY_ORDERS_PAGE })
@Component
export struct MyOrdersView {
  safeArea: AppSafeArea = AppStorageV2.connect(AppSafeArea, () => new AppSafeArea())!
  private readonly appUser: AppUser = AppStorageV2.connect(AppUser, () => new AppUser())!
  @State roleFilter: OrderRole = 'all'
  @State statusFilter: OrderStatusFilter = 'all'
  @State orders: MyOrderItem[] = []
  @State isRefreshing: boolean = false
  @State isLoading: boolean = false
  @State showCancelDialog: boolean = false
  @State cancelReason: string = ''
  @State targetCancelTaskId: number = 0
  @State freeCancelCountText: string = ''
  private readonly roleOptions: string[] = ['all', 'employer', 'employee']
  private readonly statusOptions: OrderStatusFilter[] = ['all', 0, 1, 2]

  aboutToAppear() {
    this.bootstrap()
  }

  onPageShow() {
    this.bootstrap()
  }

  private async bootstrap() {
    await this.loadOrders()
  }

  build() {
    Stack() {
      Column() {
        this.renderHeader()
        this.renderFilters()
        this.renderList()
      }
      .height('100%')
      .width('100%')
      .backgroundColor($r('[basic].color.page_background'))

      this.renderCancelDialog()
    }
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
      Text('我的订单').fontSize(20).fontWeight(FontWeight.Medium).fontColor($r('[basic].color.white'))
      Blank()
    }
    .padding({
      top: this.safeArea.topHeight + 10,
      bottom: 12,
      left: 16,
      right: 16
    })
    .width('100%')
    .backgroundColor($r('[basic].color.home_header_bg'))
  }

  @Builder
  private renderFilters() {
    Column({ space: 10 }) {
      Row({ space: 10 }) {
        ForEach(this.roleOptions, (key: string) => {
          Text(this.getRoleLabel(key as OrderRole))
            .padding({
              left: 12,
              right: 12,
              top: 8,
              bottom: 8
            })
            .backgroundColor(this.roleFilter === (key as OrderRole) ? $r('[basic].color.filter_active_bg') :
              $r('[basic].color.white'))
            .fontColor(this.roleFilter === (key as OrderRole) ? $r('[basic].color.white') :
              $r('[basic].color.text_primary'))
            .borderRadius(16)
            .onClick(() => {
              this.roleFilter = key as OrderRole;
              this.loadOrders()
            })
        }, (key: string) => key)
      }

      Row({ space: 10 }) {
        ForEach(this.statusOptions, (v: OrderStatusFilter) => {
          Text(this.getStatusFilterLabel(v))
            .padding({
              left: 12,
              right: 12,
              top: 8,
              bottom: 8
            })
            .backgroundColor(this.statusFilter === v ? $r('[basic].color.filter_active_bg') : $r('[basic].color.white'))
            .fontColor(this.statusFilter === v ? $r('[basic].color.white') : $r('[basic].color.text_primary'))
            .borderRadius(16)
            .onClick(() => {
              this.statusFilter = v;
              this.loadOrders()
            })
        }, (v: OrderStatusFilter) => `${v}`)
      }
    }
    .padding({
      left: 16,
      right: 16,
      top: 12,
      bottom: 12
    })
  }

  @Builder
  private renderList() {
    if (this.orders.length === 0) {
      Column() {
        Text('暂无订单').fontSize(14).fontColor($r('[basic].color.text_secondary')).textAlign(TextAlign.Center)
      }
      .padding({ top: 40 })
    } else {
      List({ space: 10 }) {
        ForEach(this.orders, (item: MyOrderItem) => {
          ListItem() {
            Column({ space: 12 }) {
              Row() {
                Text('id123')
                Text(this.getStatusText(item.status)).fontSize(13).fontColor($r('[basic].color.text_primary'))
              }
              .width('100%')
              .justifyContent(FlexAlign.SpaceBetween)

              Text(item.title).fontSize(16).fontColor($r('[basic].color.text_primary')).fontWeight(FontWeight.Medium)
                .width('100%')
              Row({ space: 12 }) {
                Text(`截止 ${this.formatDeadline(item.DDL)}`).fontSize(13).fontColor($r('[basic].color.text_secondary'))
                Text(`金额 ¥${Number(item.offer ?? 0).toFixed(2)}`)
                  .fontSize(13)
                  .fontColor($r('[basic].color.text_secondary'))
              }
              .width('100%')
              .justifyContent(FlexAlign.SpaceBetween)

              this.renderOrderActions(item)
            }
            .width('100%')
            .padding({
              left: 16,
              right: 16,
              top: 12,
              bottom: 12
            })
            .backgroundColor($r('[basic].color.white'))
            .borderRadius(16)
          }
        }, (item: MyOrderItem) => `${item.id}`)
      }
      .padding({ left: 16, right: 16, bottom: 20 })
    }
  }

  @Builder
  private renderOrderActions(item: MyOrderItem) {
    Row({ space: 12 }) {
      if (item.status === 1) {
        Button('取消任务')
          .height(36)
          .borderRadius(16)
          .backgroundColor(Color.Red)
          .onClick(async () => {
            await this.openCancelDialog(item.id)
          })
        Button('我已完成')
          .height(36)
          .borderRadius(16)
          .backgroundColor(Color.Green)
          .fontColor($r('[basic].color.white'))
          .onClick(async () => {
            await this.handleConfirmDone(item.id)
          })
      } else {
        Blank()
      }
    }
    .width('100%')
    .justifyContent(FlexAlign.End)
  }

  @Builder
  private renderCancelDialog() {
    if (!this.showCancelDialog) {
      Blank()
    } else {
      Column() {
        Column({ space: 10 }) {
          Text('取消任务').fontSize(18).fontWeight(FontWeight.Medium)
          Text(this.freeCancelCountText).fontSize(12).fontColor($r('[basic].color.text_secondary'))
          TextArea({ placeholder: '请输入取消原因' })
            .height(100)
            .backgroundColor($r('[basic].color.search_box_bg'))
            .padding(12)
            .borderRadius(12)
            .onChange((v: string) => this.cancelReason = v)
          Row({ space: 12 }) {
            Button('关闭')
              .layoutWeight(1)
              .height(40)
              .borderRadius(16)
              .backgroundColor($r('[basic].color.search_box_bg'))
              .onClick(() => {
                this.closeCancelDialog()
              })
            Button('提交')
              .layoutWeight(1)
              .height(40)
              .borderRadius(16)
              .backgroundColor($r('[basic].color.filter_active_bg'))
              .fontColor($r('[basic].color.white'))
              .onClick(async () => {
                await this.submitCancel()
              })
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
      .backgroundColor('rgba(0,0,0,0.45)')
    }
  }

  private async openCancelDialog(taskId: number) {
    const userId = Number(this.appUser.user.id ?? 0)
    if (!userId) {
      this.showToast('请先登录');
      return
    }
    this.targetCancelTaskId = taskId
    const countRes = await fetchCancelFreeCount(userId)
    if (countRes.success) {
      this.freeCancelCountText = `本月剩余免费取消次数：${countRes.freeCancelCount}`
    }
    this.showCancelDialog = true
  }

  private closeCancelDialog() {
    this.showCancelDialog = false
    this.cancelReason = ''
    this.targetCancelTaskId = 0
    this.freeCancelCountText = ''
  }

  private async submitCancel() {
    const token = this.appUser.user.token
    const userId = Number(this.appUser.user.id ?? 0)
    if (!token || !userId) {
      this.showToast('请先登录');
      return
    }
    if (!this.cancelReason || this.cancelReason.trim().length === 0) {
      this.showToast('请输入取消原因');
      return
    }
    const payloadRole: OrderRole = this.roleFilter === 'employee' ? 'employee' : 'employer'
    const payload: CancelPayload = {
      task_id: this.targetCancelTaskId,
      user_id: userId,
      role: payloadRole,
      cancel_reason: this.cancelReason
    }
    const res = await cancelTask(payload, token)
    if (!res.success) {
      this.showToast(res.message ?? '取消失败');
      return
    }
    this.showToast('已取消')
    this.closeCancelDialog()
    await this.loadOrders()
  }

  private async handleConfirmDone(taskId: number) {
    const token = this.appUser.user.token
    if (!token) {
      this.showToast('请先登录');
      return
    }
    const res = await confirmTaskDone(taskId, token)
    if (!res.success) {
      this.showToast(res.message ?? '提交失败');
      return
    }
    this.showToast('已提交完成')
    await this.loadOrders()
  }

  private async loadOrders() {
    const userId = Number(this.appUser.user.id ?? 0)
    const token = this.appUser.user.token
    if (!userId || !token) {
      this.orders = [];
      return
    }
    this.isLoading = true
    const query: MyOrderQuery = { userId, role: this.roleFilter, status: this.statusFilter }
    const res = await fetchMyOrders(query, token)
    this.orders = res.success ? res.tasks : []
    this.isLoading = false
  }

  private formatDeadline(value: string): string {
    const d = new Date(value)
    const mm = (d.getMonth() + 1).toString().padStart(2, '0')
    const dd = d.getDate().toString().padStart(2, '0')
    const hh = d.getHours().toString().padStart(2, '0')
    const mi = d.getMinutes().toString().padStart(2, '0')
    return `${mm}-${dd} ${hh}:${mi}`
  }

  private getStatusText(s: number): string {
    if (s === 0) {
      return '待接单'
    }
    if (s === 1) {
      return '进行中'
    }
    if (s === 2) {
      return '已完成'
    }
    return '其他'
  }

  private getRoleLabel(role: OrderRole): string {
    if (role === 'all') {
      return '全部角色'
    }
    if (role === 'employer') {
      return '我发布的'
    }
    return '我帮助的'
  }

  private getStatusFilterLabel(v: OrderStatusFilter): string {
    if (v === 'all') {
      return '全部状态'
    }
    if (v === 0) {
      return '待接单'
    }
    if (v === 1) {
      return '进行中'
    }
    return '已完成'
  }

  private showToast(message: string) {
    promptAction.showToast({ message, duration: 1500, bottom: 100 })
  }
}