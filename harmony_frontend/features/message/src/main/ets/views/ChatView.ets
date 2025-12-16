import promptAction from '@ohos.promptAction'
import { AppStorageV2, window } from '@kit.ArkUI'
import { AppSafeArea, AppUser, PAGE_PATH } from 'basic'
import { HMRouter, HMRouterMgr } from '@hadss/hmrouter'
import { AppCurrentChat, ChatMessageItem } from '../viewmodels/ChatVM'
import { ChatClient, fetchHistory, markRead } from '../services/ChatService'
import { reportChat } from '../services/MessageService'

@HMRouter({ pageUrl: PAGE_PATH.CHAT_PAGE })
@Component
export struct ChatView {
  private readonly scroller: Scroller = new Scroller()
  safeArea: AppSafeArea = AppStorageV2.connect(AppSafeArea, () => new AppSafeArea())!
  private readonly appUser: AppUser = AppStorageV2.connect(AppUser, () => new AppUser())!
  private readonly chatVM: AppCurrentChat = AppStorageV2.connect(AppCurrentChat, () => new AppCurrentChat())!
  @State messages: ChatMessageItem[] = []
  @State inputText: string = ''
  @State showReportModal: boolean = false
  @State reportText: string = ''
  private client?: ChatClient

  aboutToAppear() {
    this.setKeyboardMode()
    const userId = Number(this.appUser.user.id ?? 0)
    
    // 尝试从路由参数获取
    const param = HMRouterMgr.getCurrentParam() as Record<string, Object>
    if (param && param.targetId) {
      const tId = Number(param.targetId)
      const tName = String(param.targetName || '用户')
      const tAvatar = String(param.avatarUrl || '')
      if (tId > 0 && userId > 0) {
         const roomId = `room_${userId < tId ? `${userId}_${tId}` : `${tId}_${userId}`}`
         this.chatVM.set(roomId, tId, tName, tAvatar)
      }
    }

    if (!userId || !this.chatVM.roomId) { return }
    this.bootstrap()
  }

  aboutToDisappear() {
    this.client?.close()
    this.resetKeyboardMode()
  }

  private setKeyboardMode() {
    window.getLastWindow(getContext(this)).then(win => {
      try {
        // KeyboardAvoidMode.RESIZE = 1
        // Avoid import error for KeyboardAvoidMode
        win.getUIContext().setKeyboardAvoidMode(1)
      } catch (_e) {}
    })
  }

  private resetKeyboardMode() {
    window.getLastWindow(getContext(this)).then(win => {
      try {
        // KeyboardAvoidMode.OFFSET = 0
        win.getUIContext().setKeyboardAvoidMode(0)
      } catch (_e) {}
    })
  }

  private async bootstrap() {
    try {
      const userIdNum: number = Number(this.appUser.user.id ?? 0)
      const list = await fetchHistory(this.chatVM.roomId, userIdNum)
      this.messages = list
      this.scrollBottom()
      await markRead(this.chatVM.roomId, userIdNum)
      this.client = new ChatClient(userIdNum, this.chatVM.roomId, this.chatVM.targetId)
      this.client.connect((msg: ChatMessageItem) => {
        const arr = this.messages.slice()
        arr.push(msg)
        this.messages = arr
        this.scrollBottom()
      })
    } catch (_e) {
      promptAction.showToast({ message: '聊天加载失败' })
    }
  }

  private scrollBottom() {
    setTimeout(() => {
      try { this.scroller.scrollEdge(Edge.Bottom) } catch (_e) {}
    }, 100)
  }

  build() {
    Stack() {
      Column() {
        this.renderHeader()
        Stack({ alignContent: Alignment.TopStart }) {
          Scroll(this.scroller) {
            Column({ space: 10 }) {
              ForEach(this.messages, (it: ChatMessageItem) => {
                this.MessageBubble(it)
              }, (it: ChatMessageItem) => `${it.id}`)
            }
            .padding({ left: 6, right: 6, bottom: 20 })
            .justifyContent(FlexAlign.Start)
          }
          .scrollBar(BarState.Off)
        }
        .layoutWeight(1)
        .width('100%')

        Column() {
          this.renderInputBar()
        }
        .width('100%')
        .backgroundColor($r('[basic].color.page_background'))
        .padding({ bottom: this.safeArea.bottomHeight - 20})
      }
      .height('100%')
      .justifyContent(FlexAlign.Start)

      this.renderReportDialog()
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
        .onClick(() => { HMRouterMgr.pop() })
      Text(this.chatVM.targetName || '聊天')
        .fontSize(20)
        .fontWeight(FontWeight.Medium)
        .fontColor($r('[basic].color.white'))
      Blank()
      Text('举报')
        .fontSize(14)
        .fontColor($r('[basic].color.white'))
        .onClick(() => { this.showReportModal = true })
    }
    .padding({ top: this.safeArea.topHeight + 10, bottom: 12, left: 16, right: 16 })
    .margin({bottom: 5})
    .width('100%')
    .backgroundColor($r('[basic].color.home_header_bg'))
  }

  @Builder
  private MessageBubble(it: ChatMessageItem) {
    Row() {
      if (!it.isSelf) {
        Image(this.getAvatarSource(this.chatVM.avatarUrl))
          .width(40)
          .height(40)
          .borderRadius(16)
          .objectFit(ImageFit.Cover)
          .backgroundColor('#F2F2F2')
      }
      Column() {
        Text(this.formatTime(it.createdTime))
          .fontSize(11)
          .fontColor($r('[basic].color.text_secondary'))
        Text(it.content)
          .fontSize(14)
          .fontColor($r('[basic].color.text_primary'))
          .padding({ left: 10, right: 10, top: 8, bottom: 8 })
          .backgroundColor(it.isSelf ? '#FFE1EB' : $r('[basic].color.white'))
          .borderRadius(14)
      }
      .margin({left:5, right: 5})
      .layoutWeight(1)
      .alignItems(it.isSelf ? HorizontalAlign.End : HorizontalAlign.Start)
      if (it.isSelf) {
        Image(this.getAvatarSource(this.appUser.user.avatar_url ?? ''))
          .width(40)
          .height(40)
          .borderRadius(16)
          .objectFit(ImageFit.Cover)
          .backgroundColor('#F2F2F2')
      }
    }
    .alignItems(VerticalAlign.Center)
    .padding({ left: 8, right: 8 })
  }

  @Builder
  private renderInputBar() {
    Row({ space: 8 }) {
      TextInput({ placeholder: '输入内容', text: this.inputText })
        .layoutWeight(1)
        .height(40)
        .backgroundColor($r('[basic].color.white'))
        .borderRadius(18)
        .padding({ left: 12, right: 12 })
        .onChange((v: string) => this.inputText = v)
      Button('发送')
        .height(40)
        .borderRadius(18)
        .backgroundColor($r('[basic].color.filter_active_bg'))
        .fontColor($r('[basic].color.white'))
        .onClick(() => this.handleSend())
    }
    .padding({ left: 12, right: 12, bottom: 8 })
    .backgroundColor(Color.Transparent)
  }

  private handleSend() {
    const text = this.inputText.trim()
    if (!text) { return }
    const userId = this.appUser.user.id
    if (!userId || !this.chatVM.roomId) { return }
    this.inputText = ''
    this.client?.sendText(text)
    this.scrollBottom()
  }

  private getAvatarSource(url: string): ResourceStr {
    if (!url) { return $r('[basic].media.ic_public_user') }
    return url as ResourceStr
  }

  private formatTime(value: string): string {
    try {
      // 服务端标准：YYYY-MM-DD HH:mm:ss（不含时区）→ 直接切片
      if (value.length >= 16 && value.includes('-') && value.includes(':') && value.indexOf('T') === -1) {
        const mm = value.substring(5, 7)
        const dd = value.substring(8, 10)
        const hh = value.substring(11, 13)
        const mi = value.substring(14, 16)
        return `${mm}月${dd}日 ${hh}:${mi}`
      }
      // ISO 风格（含 T/Z）或其他可被 Date 识别的字符串 → 使用本地时区
      const d = new Date(value)
      const mm = (d.getMonth() + 1).toString().padStart(2, '0')
      const dd = d.getDate().toString().padStart(2, '0')
      const hh = d.getHours().toString().padStart(2, '0')
      const mi = d.getMinutes().toString().padStart(2, '0')
      return `${mm}月${dd}日 ${hh}:${mi}`
    } catch (_e) {
      return value
    }
  }

  @Builder
  private renderReportDialog() {
    if (!this.showReportModal) { Blank() } else {
      Column() {
        Column({ space: 12 }) {
          Text('举报对话')
            .fontSize(18)
            .fontWeight(FontWeight.Medium)
          TextArea({ placeholder: '请输入举报原因（必填）' })
            .height(120)
            .backgroundColor($r('[basic].color.search_box_bg'))
            .borderRadius(12)
            .onChange((v: string) => this.reportText = v)
          Row({ space: 12 }) {
            Button('取消')
              .height(40)
              .borderRadius(16)
              .fontColor('#333')
              .onClick(() => { this.showReportModal = false; this.reportText = '' })
            Button('提交')
              .height(40)
              .borderRadius(16)
              .backgroundColor($r('[basic].color.filter_active_bg'))
              .fontColor($r('[basic].color.white'))
              .onClick(() => { this.handleSubmitReport() })
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
    }
  }

  private async handleSubmitReport() {
    const text = (this.reportText || '').trim()
    if (!text) { promptAction.showToast({ message: '请填写举报原因' }); return }
    const token = this.appUser.user.token
    if (!token) { promptAction.showToast({ message: '请先登录' }); return }
    try {
      const res = await reportChat(this.chatVM.roomId, text, undefined, token)
      if (res.success) { promptAction.showToast({ message: '已提交举报' }); this.showReportModal = false; this.reportText = '' }
      else { promptAction.showToast({ message: res.message ?? '举报失败' }) }
    } catch (_e) { promptAction.showToast({ message: '网络错误' }) }
  }
}
