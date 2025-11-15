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
        .backgroundColor($r('[basic].color.search_box_bg'))
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
        ForEach(this.list, (item: NotificationItem) => {
          this.renderItem(item)
        }, (item: NotificationItem) => `${item.id}`)
      }
    }
  }

  @Builder
  private renderItem(item: NotificationItem) {
    Row({ space: 12 }) {
      Column({ space: 4 }) {
        Text(item.title)
          .fontSize(15)
          .fontWeight(FontWeight.Medium)
          .fontColor(item.isRead ? $r('[basic].color.text_secondary') : $r('[basic].color.text_primary'))
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
        Text(item.content)
          .fontSize(13)
          .fontColor($r('[basic].color.text_secondary'))
          .maxLines(2)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
        Text(item.createdTime)
          .fontSize(12)
          .fontColor($r('[basic].color.text_secondary'))
      }
      Blank()
      if (!item.isRead) {
        Button('标记已读')
          .height(28)
          .borderRadius(12)
          .backgroundColor($r('[basic].color.search_box_bg'))
          .onClick(() => this.handleMarkRead(item))
      }
    }
    .padding({ left: 16, right: 16, top: 14, bottom: 14 })
    .backgroundColor($r('[basic].color.white'))
    .borderRadius(18)
  }

  private async handleMarkRead(item: NotificationItem) {
    const token = this.appUser.user.token
    if (!token) { return }
    try {
      await markRead(item.id, token)
      const next = this.list.slice()
      for (let i = 0; i < next.length; i++) {
        if (next[i].id === item.id) {
          const updated: NotificationItem = {
            id: next[i].id,
            title: next[i].title,
            content: next[i].content,
            createdTime: next[i].createdTime,
            isRead: true
          }
          next[i] = updated
          break
        }
      }
      this.list = next
    } catch (_e) {
      promptAction.showToast({ message: '操作失败' })
    }
  }

  private async handleMarkAllRead() {
    const token = this.appUser.user.token
    if (!token) { return }
    try {
      await markAllRead(token)
      const next = this.list.slice()
      for (let i = 0; i < next.length; i++) {
        next[i] = {
          id: next[i].id,
          title: next[i].title,
          content: next[i].content,
          createdTime: next[i].createdTime,
          isRead: true
        }
      }
      this.list = next
    } catch (_e) {
      promptAction.showToast({ message: '操作失败' })
    }
  }
}