import promptAction from '@ohos.promptAction'
import { AppStorageV2 } from '@kit.ArkUI'
import { AppSafeArea, AppUser, ProgressLoading, PAGE_PATH } from 'basic'
import { HMRouterMgr } from '@hadss/hmrouter'
import { AppCurrentChat } from '../viewmodels/ChatVM'
import { ChatPreview } from '../viewmodels/MessageTypes'
import { fetchChatPreviews, fetchLatestNotification } from '../services/MessageService'
import { GlobalMessageClient } from '../services/ChatService'

@Component
export struct MessageView {
  private readonly scroller: Scroller = new Scroller()
  safeArea: AppSafeArea = AppStorageV2.connect(AppSafeArea, () => new AppSafeArea())!
  private readonly appUser: AppUser = AppStorageV2.connect(AppUser, () => new AppUser())!
  private wsClient?: GlobalMessageClient

  @State chatList: ChatPreview[] = []
  @State latestNotification: string = '暂无新通知'
  @State isRefreshing: boolean = false
  @State refreshText: string = '下拉刷新'
  private pollTimer: number = -1
  @Prop @Watch('onVisibleChange') isVisible: boolean = false

  onVisibleChange() {
    if (this.isVisible) {
      this.onPageShow()
    } else {
      this.onPageHide()
    }
  }

  aboutToAppear(): void {
    // 改为手动调用，而不是直接调用 refreshAll，这样不会触发UI刷新状态，但会加载数据
    this.refreshAll(true)
    this.setupWebSocket()
  }

  aboutToDisappear(): void {
    this.wsClient?.close()
    this.stopPoll()
  }

  onPageShow(): void {
    // 页面显示时，强制静默刷新一次
    this.refreshAll(true)
    this.setupWebSocket()
    this.startPoll()
  }

  onPageHide(): void {
    this.stopPoll()
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
        .height('100%')
      }
      .height('100%')
    }
    .width('100%')
    .backgroundColor($r('[basic].color.page_background'))
  }

  @Builder
  private renderHeader(): void {
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
  private renderNotificationCard(): void {
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
  private renderChatList(): void {
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
          ChatItemView({ item: item, onTap: () => this.handleChatTap(item) })
        }, (item: ChatPreview) => `${item.roomId}_${item.unread}_${item.lastMessage}_${item.timestamp}`)
      }
    }
  }

  @Builder
  private renderRefreshHeader(): void {
    Row({ space: 10 }) {
      // 加载动画组件
      if (this.isRefreshing) {
        ProgressLoading({ pWidth: 18, strokeWidth: 2, loading: this.isRefreshing && this.isVisible })
      }
      Text(this.refreshText)
        .fontSize(13)
        .fontColor($r('[basic].color.text_secondary'))
    }
    .width('100%')
    .height(60)
    .justifyContent(FlexAlign.Center)
    .backgroundColor(Color.Transparent)
  }

  private async refreshAll(silent: boolean = false): Promise<void> {
    if (!this.ensureLogin(silent)) {
      if (!silent) { this.isRefreshing = false }
      return
    }
    // 如果是后台静默刷新，且当前正在进行UI刷新（用户下拉），则跳过本次后台刷新，避免冲突
    if (silent && this.isRefreshing) {
      return
    }
    
    if (!silent) {
      this.isRefreshing = true
    }
    try {
      const userId = this.appUser.user.id!
      const token = this.appUser.user.token
      const GeneratedDestructArray_1 = await Promise.all([
        fetchChatPreviews(userId, token),
        fetchLatestNotification(token)
      ])
      const chats = GeneratedDestructArray_1[0];
      const notification = GeneratedDestructArray_1[1];
      console.info('MessageView: fetchChatPreviews result:', JSON.stringify(chats))
      
      // 深度更新：比较新旧列表，如果长度不同或内容有变，才替换引用
      // 由于我们现在使用了ObservedV2，直接赋值引用也是可以的，但为了保险，
      // 我们这里直接替换整个数组，因为ChatPreview现在是Class实例，
      // 只要引用变了，MessageView中的@State chatList感知到引用变化，
      // 传递给ChatItemView的@Param item就会更新。
      this.chatList = chats
      
      this.latestNotification = notification || '暂无新通知'
    } catch (error) {
      console.error('加载消息失败', JSON.stringify(error))
      if (!silent) {
        promptAction.showToast({ message: '消息拉取失败' })
      }
    } finally {
      if (!silent) {
        this.isRefreshing = false
      }
    }
  }

  private setupWebSocket(): void {
    const uid = this.appUser.user.id
    if (!uid) return
    // 如果已经连接，就不重复创建
    if (this.wsClient && this.wsClient.isConnectedState()) {
      return
    }
    if (this.wsClient) { this.wsClient.close() }
    this.wsClient = new GlobalMessageClient(uid)
    this.wsClient.connect(() => {
      // 收到WebSocket消息时，触发静默刷新
      // 这里可以优化：如果WebSocket消息包含了完整内容，可以直接更新本地列表而不用全量拉取
      // 但为了数据一致性，目前先采用触发刷新的策略
      this.refreshAll(true)
    })
  }

  private startPoll(): void {
    this.stopPoll()
    this.pollTimer = setInterval(() => {
      this.refreshAll(true)
    }, 5000) // 每5秒自动刷新一次，作为WebSocket的兜底
  }

  private stopPoll(): void {
    if (this.pollTimer !== -1) {
      clearInterval(this.pollTimer)
      this.pollTimer = -1
    }
  }

  private handleRefresh(): void {
    this.refreshAll(false)
  }

  private ensureLogin(silent: boolean = false): boolean {
    if (!this.appUser.user.id || !this.appUser.user.token) {
      if (!silent) {
        promptAction.showToast({ message: '请先登录' })
      }
      return false
    }
    return true
  }

  private handleChatTap(item: ChatPreview): void {
    const vm = AppStorageV2.connect(AppCurrentChat, () => new AppCurrentChat())!
    vm.set(item.roomId, item.targetId, item.username, item.avatarUrl)
    HMRouterMgr.push({ pageUrl: PAGE_PATH.CHAT_PAGE })
  }

  private handleSystemNotification(): void {
    HMRouterMgr.push({ pageUrl: PAGE_PATH.NOTIFICATIONS_PAGE })
  }

  private getAvatarSource(url: string): ResourceStr {
    return url as ResourceStr
  }
}

@ComponentV2
struct ChatItemView {
  @Param item: ChatPreview = new ChatPreview()
  @Event onTap: () => void = () => {}

  build() {
    Row({ space: 12 }) {
      // --- Avatar ---
      Image(this.item.avatarUrl as ResourceStr)
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
          Text(this.item.username)
            .fontSize(15)
            .fontWeight(FontWeight.Medium)
            .maxLines(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
            .layoutWeight(1)
            .constraintSize({ maxWidth: '70%' })

          // 右侧时间
          Text(this.item.timestamp)
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
          Text(this.item.lastMessage)
            .fontSize(13)
            .fontColor($r('[basic].color.text_secondary'))
            .maxLines(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
            .layoutWeight(1)
            .constraintSize({ maxWidth: '80%' })

          // 未读角标
          if (this.item.unread > 0) {
            Text(this.item.unread > 99 ? '99+' : `${this.item.unread}`)
              .fontSize(11)
              .fontColor('#fff')
              .padding({ left: 6, right: 6, top: 2, bottom: 2 })
              .backgroundColor('#FF4D4F')
              .borderRadius(10)
              .constraintSize({ minWidth: 20 })
          }
        }
        .width('75%')
      }
      .flexGrow(1)
    }
    .padding({ left: 16, right: 16, top: 14, bottom: 14 })
    .backgroundColor('#fff')
    .borderRadius(18)
    .onClick(() => this.onTap())
  }
}
