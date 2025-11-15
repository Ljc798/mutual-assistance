import promptAction from '@ohos.promptAction'
import { AppStorageV2 } from '@kit.ArkUI'
import { AppSafeArea, AppUser, PAGE_PATH } from 'basic'
import { HMRouter, HMRouterMgr } from '@hadss/hmrouter'
import { AppCurrentChat, ChatMessageItem } from '../viewmodels/ChatVM'
import { ChatClient, fetchHistory, markRead } from '../services/ChatService'

@HMRouter({ pageUrl: PAGE_PATH.CHAT_PAGE })
@Component
export struct ChatView {
  private readonly scroller: Scroller = new Scroller()
  safeArea: AppSafeArea = AppStorageV2.connect(AppSafeArea, () => new AppSafeArea())!
  private readonly appUser: AppUser = AppStorageV2.connect(AppUser, () => new AppUser())!
  private readonly chatVM: AppCurrentChat = AppStorageV2.connect(AppCurrentChat, () => new AppCurrentChat())!
  @State messages: ChatMessageItem[] = []
  @State inputText: string = ''
  private client?: ChatClient

  aboutToAppear() {
    const userId = this.appUser.user.id
    if (!userId || !this.chatVM.roomId) { return }
    this.bootstrap()
  }

  aboutToDisappear() {
    this.client?.close()
  }

  private async bootstrap() {
    try {
      const userIdNum: number = Number(this.appUser.user.id ?? 0)
      const list = await fetchHistory(this.chatVM.roomId, userIdNum)
      this.messages = list
      await markRead(this.chatVM.roomId, userIdNum)
      this.client = new ChatClient(userIdNum, this.chatVM.roomId, this.chatVM.targetId)
      this.client.connect((msg: ChatMessageItem) => {
        const arr = this.messages.slice()
        arr.push(msg)
        this.messages = arr
        this.scrollBottom()
      })
      this.scrollBottom()
    } catch (_e) {
      promptAction.showToast({ message: '聊天加载失败' })
    }
  }

  private scrollBottom() {
    try { this.scroller.scrollEdge(Edge.Bottom) } catch (_e) {}
  }

  build() {
    Stack() {
      Column() {
        this.renderHeader()
        Scroll(this.scroller) {
          Column({ space: 10 }) {
            ForEach(this.messages, (it: ChatMessageItem) => {
              this.MessageBubble(it)
            }, (it: ChatMessageItem) => `${it.id}`)
          }
          .padding({ left: 12, right: 12, bottom: 80 })
          .height('100%')
        }
        .height('100%')
        .scrollBar(BarState.Off)
      }
      Column() { this.renderInputBar() }
        .position({ left: 0, right: 0, bottom: (this.safeArea.bottomHeight ?? 0) })
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
    }
    .padding({ top: this.safeArea.topHeight + 10, bottom: 12, left: 16, right: 16 })
    .width('100%')
    .backgroundColor($r('[basic].color.home_header_bg'))
  }

  @Builder
  private MessageBubble(it: ChatMessageItem) {
    Row() {
      if (!it.isSelf) {
        Image(this.getAvatarSource(this.chatVM.avatarUrl))
          .width(32)
          .height(32)
          .borderRadius(16)
          .objectFit(ImageFit.Cover)
          .backgroundColor('#F2F2F2')
      }
      Column() {
        Text(it.content)
          .fontSize(14)
          .fontColor($r('[basic].color.text_primary'))
          .padding({ left: 10, right: 10, top: 8, bottom: 8 })
          .backgroundColor(it.isSelf ? '#FFE1EB' : $r('[basic].color.white'))
          .borderRadius(14)
        Text(it.createdTime)
          .fontSize(11)
          .fontColor($r('[basic].color.text_secondary'))
      }
      .layoutWeight(1)
      .alignItems(it.isSelf ? HorizontalAlign.End : HorizontalAlign.Start)
      if (it.isSelf) {
        Image(this.getAvatarSource(this.appUser.user.avatar_url ?? ''))
          .width(32)
          .height(32)
          .borderRadius(16)
          .objectFit(ImageFit.Cover)
          .backgroundColor('#F2F2F2')
      }
    }
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
    const local: ChatMessageItem = {
      id: Date.now(),
      roomId: this.chatVM.roomId,
      senderId: userId,
      receiverId: this.chatVM.targetId,
      content: text,
      createdTime: new Date().toISOString().slice(0, 16).replace('T', ' '),
      isSelf: true
    }
    const arr = this.messages.slice()
    arr.push(local)
    this.messages = arr
    this.inputText = ''
    this.client?.sendText(text)
    this.scrollBottom()
  }

  private getAvatarSource(url: string): ResourceStr {
    if (!url) { return $r('[basic].media.ic_public_user') }
    return url as ResourceStr
  }
}