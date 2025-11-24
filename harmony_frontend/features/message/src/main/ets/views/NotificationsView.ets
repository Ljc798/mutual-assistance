import promptAction from '@ohos.promptAction'
import { AppStorageV2 } from '@kit.ArkUI'
import { AppSafeArea, AppUser, PAGE_PATH } from 'basic'
import { HMRouter, HMRouterMgr } from '@hadss/hmrouter'
import { NotificationItem } from '../viewmodels/NotificationTypes'
import { fetchNotifications, markRead, markAllRead } from '../services/NotificationService'

@HMRouter({ pageUrl: PAGE_PATH.NOTIFICATIONS_PAGE })
@Component
export struct NotificationsView {
  private readonly scroller: Scroller = new Scroller()
  safeArea: AppSafeArea = AppStorageV2.connect(AppSafeArea, () => new AppSafeArea())!
  private readonly appUser: AppUser = AppStorageV2.connect(AppUser, () => new AppUser())!
  @State list: NotificationItem[] = []
  @State isRefreshing: boolean = false
  @State models: NotificationItemModel[] = []

  aboutToAppear() {
    this.loadAll()
  }

  private async loadAll() {
    if (this.isRefreshing) { return }
    const token = this.appUser.user.token
    if (!token) { promptAction.showToast({ message: '请先登录' }); return }
    this.isRefreshing = true
    try {
      const items = await fetchNotifications(token)
      this.list = items
      const ms: NotificationItemModel[] = []
      for (let i = 0; i < items.length; i++) { ms.push(new NotificationItemModel(items[i])) }
      this.models = ms
    } catch (_e) {
      promptAction.showToast({ message: '获取通知失败' })
    } finally {
      this.isRefreshing = false
    }
  }

  build() {
    Stack() {
      Column() {
        this.renderHeader()
        Scroll(this.scroller) {
          Column({ space: 12 }) {
            this.renderList()
          }
          .padding({ left: 16, right: 16, bottom: 80 })
        }
        .scrollBar(BarState.Off)
      }
      .width('100%')
      .height('100%')
      .justifyContent(FlexAlign.Start)
    }
    .width('100%')
    .height('100%')
    .backgroundColor($r('[basic].color.page_background'))
  }

  @Builder
  private renderHeader() {
    Row() {
      Image($r('[basic].media.ic_public_left'))
        .width(28)
        .aspectRatio(1)
        .fillColor($r('[basic].color.white'))
        .onClick(() => { HMRouterMgr.pop() })
      Text('系统通知')
        .fontSize(20)
        .fontWeight(FontWeight.Medium)
        .fontColor($r('[basic].color.white'))
      Blank()
      Button('全部已读')
        .height(32)
        .borderRadius(12)
        .backgroundColor($r('[basic].color.price_bidding'))
        .onClick(() => this.handleMarkAllRead())
    }
    .padding({ top: this.safeArea.topHeight + 10, bottom: 12, left: 16, right: 16 })
    .width('100%')
    .backgroundColor($r('[basic].color.home_header_bg'))
  }

  @Builder
  private renderList() {
    if (this.list.length === 0) {
      Column({ space: 8 }) {
        Text('暂无通知')
          .fontSize(14)
          .fontColor($r('[basic].color.text_secondary'))
        Text('当有新的通知时会显示在这里')
          .fontSize(12)
          .fontColor($r('[basic].color.text_secondary'))
      }
      .width('98%')
      .padding(24)
      .alignItems(HorizontalAlign.Center)
      .backgroundColor($r('[basic].color.white'))
      .borderRadius(18)
    } else {
      Column({ space: 10 }) {
        ForEach(this.models, (item: NotificationItemModel) => {
          this.renderItem(item)
        }, (item: NotificationItemModel) => `${item.id}`)
      }
    }
  }

  @Builder
  private renderItem(item: NotificationItemModel) {
    Row({ space: 12 }) {
      Column({ space: 4 }) {
        Row() {
          Text(item.title)
            .fontSize(15)
            .fontWeight(FontWeight.Medium)
            .fontColor(item.isRead ? $r('[basic].color.text_primary') : $r('[basic].color.text_primary'))
            .maxLines(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
            .textAlign(TextAlign.Start)
          if (!item.isRead) {
            Button('标记已读')
              .height(28)
              .borderRadius(12)
              .backgroundColor($r('[basic].color.home_accent'))
              .onClick(() => this.handleMarkRead(item))
          }
        }
        .width('100%')
        .justifyContent(FlexAlign.SpaceBetween)
        Column() {
          Text(item.content)
            .fontSize(13)
            .fontColor(item.isRead ? $r('[basic].color.text_secondary') : $r('[basic].color.text_secondary'))
            .maxLines(2)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
          Text(this.formatTime(item.createdTime))
            .fontSize(12)
            .fontColor($r('[basic].color.text_secondary'))
            .textAlign(TextAlign.End)
        }
        .justifyContent(FlexAlign.SpaceBetween)
        .width('100%')
      }
    }
    .padding({ left: 16, right: 16, top: 14, bottom: 14 })
    .backgroundColor(item.isRead ? $r('[basic].color.search_box_bg') : $r('[basic].color.white'))
    .borderRadius(18)
  }

  private formatTime(value: string): string {
    try {
      const d = new Date(value)
      const yy = d.getFullYear().toString()
      const mm = (d.getMonth() + 1).toString().padStart(2, '0')
      const dd = d.getDate().toString().padStart(2, '0')
      const hh = d.getHours().toString().padStart(2, '0')
      const mi = d.getMinutes().toString().padStart(2, '0')
      return `${yy}-${mm}-${dd} ${hh}:${mi}`
    } catch (_e) { return value }
  }

  private async handleMarkRead(item: NotificationItemModel) {
    const token = this.appUser.user.token
    if (!token) { return }
    const prev = item.isRead
    item.isRead = true
    try { await markRead(item.id, token) } catch (_e) { item.isRead = prev; promptAction.showToast({ message: '操作失败' }) }
  }

  private async handleMarkAllRead() {
    const token = this.appUser.user.token
    if (!token) { return }
    const prev: boolean[] = this.models.map(m => m.isRead)
    for (let i = 0; i < this.models.length; i++) { this.models[i].isRead = true }
    try { await markAllRead(token) } catch (_e) { for (let i = 0; i < this.models.length; i++) { this.models[i].isRead = prev[i] }; promptAction.showToast({ message: '操作失败' }) }
  }
}

@ObservedV2
export class NotificationItemModel implements NotificationItem {
  @Trace id: number
  @Trace title: string
  @Trace content: string
  @Trace createdTime: string
  @Trace isRead: boolean
  constructor(dto: NotificationItem) {
    this.id = dto.id
    this.title = dto.title
    this.content = dto.content
    this.createdTime = dto.createdTime
    this.isRead = dto.isRead
  }
}