import promptAction from '@ohos.promptAction'
import { AppStorageV2 } from '@kit.ArkUI'
import { AppSafeArea, AppUser, ProgressLoading, PAGE_PATH } from 'basic'
import { HMRouterMgr } from '@hadss/hmrouter'
import { AppCurrentChat } from '../viewmodels/ChatVM'
import { ChatPreview } from '../viewmodels/MessageTypes'
import { fetchChatPreviews, fetchLatestNotification } from '../services/MessageService'

@Component
export struct MessageView {
  private readonly scroller: Scroller = new Scroller()
  safeArea: AppSafeArea = AppStorageV2.connect(AppSafeArea, () => new AppSafeArea())!
  private readonly appUser: AppUser = AppStorageV2.connect(AppUser, () => new AppUser())!

  @State chatList: ChatPreview[] = []
  @State latestNotification: string = '暂无新通知'
  @State isRefreshing: boolean = false
  @State refreshText: string = '下拉刷新'

  aboutToAppear() {
    this.refreshAll()
  }

  build() {
    Stack() {
      Column() {
        this.renderHeader()
        Refresh({
          refreshing: this.isRefreshing,
          builder: this.renderRefreshHeader
        }) {
          Scroll(this.scroller) {
            Column({ space: 12 }) {
              this.renderNotificationCard()
              this.renderChatList()
            }
            .padding({ left: 16, right: 16, bottom: 80 + this.safeArea.bottomHeight })
          }
          .scrollBar(BarState.Off)
        }
        .onStateChange((state: RefreshStatus) => {
          switch (state) {
            case RefreshStatus.Inactive:
              this.refreshText = '下拉刷新'
              break
            case RefreshStatus.Drag:
              this.refreshText = '继续下拉'
              break
            case RefreshStatus.OverDrag:
              this.refreshText = '松手刷新'
              break
            case RefreshStatus.Refresh:
              this.refreshText = '刷新中...'
              break
            case RefreshStatus.Done:
              this.refreshText = '刷新完成'
              break
          }
        })
        .onRefreshing(() => this.handleRefresh())
      }
      .height('100%')
    }
    .width('100%')
    .backgroundColor($r('[basic].color.page_background'))
  }

  @Builder
  private renderHeader() {
    Column() {
      Row() {
        Text('消息列表')
          .fontSize(24)
          .fontWeight(FontWeight.Bold)
          .fontColor($r('[basic].color.white'));
        Blank();
      }
      .width('100%')
      .alignItems(VerticalAlign.Center)
      .justifyContent(FlexAlign.Start)
      .margin({ bottom: 8 });
    }
    .width('100%')
    .margin({ left: 0, right: 0 })
    .padding({
      top: this.safeArea.topHeight + 6,
      bottom: 6,
      left: 20,
      right: 20
    })
    .backgroundColor($r('[basic].color.home_header_bg'));
  }


  @Builder
  private renderNotificationCard() {
    Column() {
      Row({ space: 12 }) {
        Column({ space: 4 }) {
          Text('系统通知')
            .fontSize(16)
            .fontWeight(FontWeight.Medium)
          Text(this.latestNotification || '暂无新通知')
            .fontSize(13)
            .fontColor($r('[basic].color.text_secondary'))
            .maxLines(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
        }
        .alignItems(HorizontalAlign.Start)
      }
      .width('98%')
      .margin({top: 10})
      .padding({ left: 16, right: 16, top: 16, bottom: 16 })
      .backgroundColor($r('[basic].color.white'))
      .borderRadius(18)
      .onClick((): void => { this.handleSystemNotification() })
    }
  }

  @Builder
  private renderChatList() {
    if (this.chatList.length === 0) {
      Column({ space: 8 }) {
        Text('暂无会话')
          .fontSize(14)
          .fontColor($r('[basic].color.text_secondary'))
        Text('当有新的聊天时会出现在这里')
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
        ForEach(this.chatList, (item: ChatPreview) => {
          this.renderChatItem(item)
        }, (item: ChatPreview) => item.roomId)
      }
    }
  }

  @Builder
  private renderChatItem(item: ChatPreview) {
    Row({ space: 12 }) {

      // --- Avatar ---
      Image(this.getAvatarSource(item.avatarUrl))
        .width(48).height(48).borderRadius(24)
        .objectFit(ImageFit.Cover)
        .backgroundColor('#F2F2F2')

      // --- 文本内容区 ---
      Column({ space: 6 }) {

        // ========== 第一行：用户名 + 时间 ==========
        Flex({
          justifyContent: FlexAlign.SpaceBetween,
          alignItems: ItemAlign.Center
        }) {

          // 左侧用户名
          Text(item.username)
            .fontSize(15)
            .fontWeight(FontWeight.Medium)
            .maxLines(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
            .layoutWeight(1)
            .constraintSize({ maxWidth: '70%' }) // ⭐ 防止文本过长

          // 右侧时间
          Text(item.timestamp)
            .fontSize(12)
            .fontColor($r('[basic].color.text_secondary'))
            .margin({ left: 8 })
        }
        .width('75%')

        // ========== 第二行：消息 + 未读 ==========
        Flex({
          justifyContent: FlexAlign.SpaceBetween,
          alignItems: ItemAlign.Center
        }) {

          // 左侧最新消息
          Text(item.lastMessage)
            .fontSize(13)
            .fontColor($r('[basic].color.text_secondary'))
            .maxLines(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
            .layoutWeight(1)
            .constraintSize({ maxWidth: '80%' }) // ⭐ 为角标留出空间

          // 未读角标
          if (item.unread > 0) {
            Text(item.unread > 99 ? '99+' : `${item.unread}`)
              .fontSize(11)
              .fontColor('#fff')
              .padding({ left: 6, right: 6, top: 2, bottom: 2 })
              .backgroundColor('#FF4D4F')
              .borderRadius(10)
              .constraintSize({ minWidth: 20 }) // ⭐ 确保角标有最小宽度
          }
        }
        .width('75%')
      }
      .flexGrow(1)
    }
    .padding({ left: 16, right: 16, top: 14, bottom: 14 })
    .backgroundColor('#fff')
    .borderRadius(18)
    .onClick(() => this.handleChatTap(item))
  }


  @Builder
  private renderRefreshHeader() {
    Row({ space: 10 }) {
      Text(this.refreshText)
        .fontSize(13)
        .fontColor($r('[basic].color.text_secondary'))
      // 加载动画组件
      ProgressLoading({ pWidth: 18, strokeWidth: 2 })
    }
    .width('100%')
    .height(60)
    .justifyContent(FlexAlign.Center)
    .backgroundColor(Color.Transparent)
  }

  private async refreshAll() {
    if (!this.ensureLogin()) {
      return
    }
    if (this.isRefreshing) {
      return
    }
    this.isRefreshing = true
    try {
      const userId = this.appUser.user.id!
      const token = this.appUser.user.token
      const GeneratedDestructArray_1 = await Promise.all([
        fetchChatPreviews(userId, token),
        fetchLatestNotification(token)
      ])
      const chats = GeneratedDestructArray_1[0];
      const notification = GeneratedDestructArray_1[1];
      this.chatList = chats
      this.latestNotification = notification || '暂无新通知'
    } catch (error) {
      console.error('加载消息失败', JSON.stringify(error))
      promptAction.showToast({ message: '消息拉取失败' })
    } finally {
      this.isRefreshing = false
    }
  }

  private handleRefresh() {
    this.refreshAll()
  }

  private ensureLogin(): boolean {
    if (!this.appUser.user.id || !this.appUser.user.token) {
      promptAction.showToast({ message: '请先登录' })
      return false
    }
    return true
  }

  private handleChatTap(item: ChatPreview) {
    const vm = AppStorageV2.connect(AppCurrentChat, () => new AppCurrentChat())!
    vm.set(item.roomId, item.targetId, item.username, item.avatarUrl)
    HMRouterMgr.push({ pageUrl: PAGE_PATH.CHAT_PAGE })
  }

  private handleSystemNotification() {
    HMRouterMgr.push({ pageUrl: PAGE_PATH.NOTIFICATIONS_PAGE })
  }

  private getAvatarSource(url: string): ResourceStr {
    return url as ResourceStr
  }
}
