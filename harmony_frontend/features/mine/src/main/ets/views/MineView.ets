import promptAction from '@ohos.promptAction'
import { AppStorageV2 } from '@kit.ArkUI'
import { AppSafeArea, PAGE_PATH, AppUser, USER_LOGIN_TIME_KEY } from 'basic'
import {
  ActionShortcut,
  ReputationSummary,
  StatisticCard,
  UserProfileSummary,
  VipState
} from '../viewmodels/MyTypes'
import { HMRouterMgr } from '@hadss/hmrouter'

@Component
export struct MineView {
  private scroller: Scroller = new Scroller()
  safeArea: AppSafeArea = AppStorageV2.connect(AppSafeArea, () => new AppSafeArea())!
  private appUser: AppUser = AppStorageV2.connect(AppUser, () => new AppUser())!
  @StorageLink(USER_LOGIN_TIME_KEY) userLoginVersion: number = 0
  private lastUserLoginVersion: number = -1
  private readonly defaultAvatar: ResourceStr = 'https://mutual-campus-1348081197.cos.ap-nanjing.myqcloud.com/avatar/default.png'
  @State profile: UserProfileSummary = this.buildProfileFromStorage()
  @State reputation: ReputationSummary = {
    totalScore: 80,
    weightedScore: 4.0,
    creditLevel: '良好'
  }
  @State statistics: StatisticCard[] = this.buildStatisticsFromStorage()
  // @State vipState: VipState = this.buildVipStateFromStorage()
  @State shortcuts: ActionShortcut[] = [
    { title: '我的订单', action: 'orders' },
    { title: '我的空间', action: 'space' },
    // { title: '商城', action: 'shop' },
    { title: '个人信息', action: 'profile' },
    { title: '意见反馈', action: 'feedback' }
  ]
  @State showFeedbackModal: boolean = false
  @State feedbackTitle: string = ''
  @State feedbackContent: string = ''

  aboutToAppear() {
    this.syncUserState()
  }

  onPageShow() {
    this.syncUserState()
  }

  aboutToRender() {
    if (this.userLoginVersion !== this.lastUserLoginVersion) {
      this.lastUserLoginVersion = this.userLoginVersion
      this.syncUserState()
    }
  }

  build() {
    Stack() {
      Scroll(this.scroller) {
        Column({ space: 10 }) {
          this.renderTitleSection()
          this.renderProfileCard()
          this.renderReputationCard()
          this.renderStatisticBoxes()
          // this.renderVipSection()
          this.renderShortcutsCard()
          this.renderFeedbackHint()
        }
        .height('100%')
        .padding({
          top: 0,
          bottom: 60 + this.safeArea.bottomHeight
        })
      }
      .scrollBar(BarState.Off)

      this.renderFeedbackModal()
    }
    .width('100%')
    .height('100%')
    .backgroundColor($r('[basic].color.page_background'))
  }

  @Builder
  private renderTitleSection() {
    Column({ space: 6 }) {
      Text('我的信息')
        .fontSize(24)
        .fontWeight(FontWeight.Bold)
        .fontColor($r('[basic].color.white'))
    }
    .width('100%')
    .alignItems(HorizontalAlign.Start)
    .padding({
      top: this.safeArea.topHeight + 6,
      bottom: 6,
      left: 20,
      right: 20
    })
    .linearGradient({
      angle: 135,
      colors: [
        [$r('[basic].color.my_linear_begin'), 0],
        [$r('[basic].color.my_linear_end'), 1]
      ]
    })
  }

  @Builder
  private renderProfileCard() {
    Row({ space: 6 }) {
      Image(this.getProfileAvatar())
        .width(60)
        .height(60)
        .borderRadius(28)
        .backgroundColor($r('[basic].color.white'))
        .margin({ right: 12 })
      Column({ space: 10 }) {
        Text(this.getProfileName())
          .fontSize(20)
          .fontWeight(FontWeight.Medium)
          .fontColor($r('[basic].color.text_primary'))
        Text(this.getProfileIdLabel())
          .fontSize(13)
          .fontColor($r('[basic].color.text_secondary'))
      }
      .alignItems(HorizontalAlign.Start)

      Blank()
      Text('›')
        .fontSize(26)
        .fontWeight(FontWeight.Medium)
        .fontColor($r('[basic].color.text_secondary'))
    }
    .onClick(() => this.handleProtectedAction('profile'))
    .width('96%')
    .padding(16)
    .backgroundColor($r('[basic].color.white'))
    .borderRadius(20)
    .shadow({
      radius: 12,
      color: '#12000000',
      offsetX: 0,
      offsetY: 6
    })
  }

  @Builder
  private renderReputationCard() {
    Row({ space: 8 }) {
      Row({ space: 6 }) {
        Text(`信誉 ${this.reputation.totalScore} 分`)
          .fontSize(16)
          .fontWeight(FontWeight.Medium)
          .fontColor($r('[basic].color.text_primary'))
        Text(this.reputation.creditLevel)
          .fontSize(14)
          .fontColor($r('[basic].color.filter_active_bg'))
      }

      Row({ space: 4 }) {
        ForEach([0, 1, 2, 3, 4], (index: number) => {
          Text(this.getStarSymbol(index))
            .fontSize(18)
            .fontColor(this.getStarColor(index))
        }, (index: number) => `${index}`)
      }
    }
    .onClick(() => this.handleProtectedAction('reputation'))
    .padding({
      top: 3,
      bottom: 3,
      left: 20,
      right: 20
    })
    .backgroundColor($r('[basic].color.white'))
    .borderRadius(20)
    .shadow({
      radius: 12,
      color: '#0A000000',
      offsetX: 0,
      offsetY: 6
    })
  }

  @Builder
  private renderStatisticBoxes() {
    Row() {
      Column({ space: 6 }) {
        Text('免佣金次数')
          .fontSize(13)
          .fontColor($r('[basic].color.text_secondary'))
        Text(`${this.appUser.user?.free_counts ?? 0}`)
          .fontSize(18)
          .fontWeight(FontWeight.Medium)
          .fontColor($r('[basic].color.text_primary'))
      }
      .padding({ top: 16, bottom: 16 })
      .layoutWeight(1)
      .alignItems(HorizontalAlign.Center)
      // .onClick(() => this.handleProtectedAction('shop'))

      // Column({ space: 6 }) {
      //   Text('积分余额')
      //     .fontSize(13)
      //     .fontColor($r('[basic].color.text_secondary'))
      //   Text(`${this.appUser.user?.points ?? 0}`)
      //     .fontSize(18)
      //     .fontWeight(FontWeight.Medium)
      //     .fontColor($r('[basic].color.text_primary'))
      // }
      // .padding({ top: 16, bottom: 16 })
      // .layoutWeight(1)
      // .alignItems(HorizontalAlign.Center)
      // .onClick(() => this.handleProtectedAction('points'))

      Column({ space: 6 }) {
        Text('账户余额')
          .fontSize(13)
          .fontColor($r('[basic].color.text_secondary'))
        Text(this.formatBalance(this.appUser.user?.balance))
          .fontSize(18)
          .fontWeight(FontWeight.Medium)
          .fontColor($r('[basic].color.text_primary'))
      }
      .padding({ top: 16, bottom: 16 })
      .layoutWeight(1)
      .alignItems(HorizontalAlign.Center)
      .onClick(() => this.handleProtectedAction('wallet'))
    }
    .backgroundColor($r('[basic].color.white'))
    .borderRadius(20)
    .shadow({
      radius: 10,
      color: '#10000000',
      offsetX: 0,
      offsetY: 4
    })
  }

  @Builder
  private renderVipSection() {
    if (this.isVipActive()) {
      Row() {
        Image($r('app.media.huiyuan_yes'))
          .width(40)
          .height(40)
          .margin({ right: 10 });
        Column({ space: 4 }) {
          Text('VIP 用户')
            .fontSize(18)
            .fontWeight(FontWeight.Bold)
            .fontColor($r('[basic].color.vip_label'))
          Text(this.getVipExpireText())
            .fontSize(13)
            .fontColor($r('[basic].color.vip_expire'))
        }
        .alignItems(HorizontalAlign.Start)

        Blank()
        Button('续费')
          .fontSize(16)
          .fontWeight(FontWeight.Medium)
          .backgroundColor($r('[basic].color.vip_renew_btn'))
          .fontColor($r('[basic].color.white'))
          .borderRadius(20)
          .padding({ top: 5, bottom: 5, left: 10, right: 10 })
          .onClick(() => {
            HMRouterMgr.push({ pageUrl: PAGE_PATH.VIP_PAGE })
          })
      }
      .width('96%')
      .padding({
        top: 18,
        bottom: 18,
        left: 20,
        right: 20
      })
      .borderColor($r('[basic].color.vip_renew_btn'))
      .borderWidth(1)
      .linearGradient({
        angle: 135,
        colors: [
          [$r('[basic].color.vip_linear_begin'), 0],
          [$r('[basic].color.vip_linear_end'), 1]
        ]
      })
      .borderRadius(24)
    } else {
      Row() {
        Image($r('app.media.huiyuan_no'))
          .width(40)
          .height(40)
          .margin({ right: 10 });
        Column() {
          Text('当前不是 VIP 用户')
            .fontSize(16)
            .fontColor($r('[basic].color.text_primary'))
        }

        Blank()
        Button('立即开通')
          .fontSize(14)
          .borderRadius(20)
          .backgroundColor($r('[basic].color.vip_renew_btn'))
          .fontColor($r('[basic].color.white'))
          .onClick(() => { HMRouterMgr.push({ pageUrl: PAGE_PATH.VIP_PAGE }) })
      }
      .width('96%')
      .padding({
        top: 16,
        bottom: 16,
        left: 20,
        right: 20
      })
      .backgroundColor($r('[basic].color.white'))
      .borderRadius(20)
    }
  }

  @Builder
  private renderShortcutsCard() {
    Column() {
      ForEach(this.shortcuts, (item: ActionShortcut, index: number) => {
        Column() {
          Text(item.title)
            .fontSize(16)
            .fontColor($r('[basic].color.text_primary'))
          if (index < this.shortcuts.length - 1) {
            Divider()
              .color($r('[basic].color.status_finished'))
              .strokeWidth(0.5)
              .margin({ top: 16, bottom: 16 })
          }
        }
        .width('80%')
        .alignItems(HorizontalAlign.Center)
        .onClick(() => this.handleProtectedAction(item.action))
      }, (item: ActionShortcut) => item.title)
    }
    .padding({
      left: 16,
      right: 16,
      top: 16,
      bottom: 16
    })
    .backgroundColor($r('[basic].color.white'))
    .borderRadius(20)

  }

  @Builder
  private renderFeedbackHint() {
    Column({ space: 6 }) {
      Text('您的意见对我们真的真的很重要')
        .fontSize(13)
        .fontColor($r('[basic].color.text_secondary'))
        .textAlign(TextAlign.Center)
      Text('客服电话：18679297267，邮箱：1345017151@qq.com')
        .fontSize(13)
        .fontColor($r('[basic].color.text_secondary'))
        .textAlign(TextAlign.Center)
    }
    .alignItems(HorizontalAlign.Center)
    .padding({ top: 12, bottom: 12 })
  }

  @Builder
  private renderFeedbackModal() {
    if (!this.showFeedbackModal) {
      Blank()
    } else {
      Column() {
        Column({ space: 12 }) {
          Text('意见反馈')
            .fontSize(18)
            .fontWeight(FontWeight.Medium)
            .fontColor($r('[basic].color.text_primary'))
          TextInput({ placeholder: '标题' })
            .onChange((value: string) => this.feedbackTitle = value)
            .backgroundColor($r('[basic].color.search_box_bg'))
            .padding({ left: 12, right: 12 })
            .borderRadius(12)
          TextArea({ placeholder: '请写下您的反馈...' })
            .onChange((value: string) => this.feedbackContent = value)
            .backgroundColor($r('[basic].color.search_box_bg'))
            .padding(12)
            .borderRadius(12)
            .height(120)
          Row({ space: 12 }) {
            Button('取消')
              .layoutWeight(1)
              .borderRadius(16)
              .onClick(() => this.closeFeedbackModal())
            Button('提交')
              .layoutWeight(1)
              .borderRadius(16)
              .backgroundColor($r('[basic].color.filter_active_bg'))
              .fontColor($r('[basic].color.white'))
              .onClick(() => this.submitFeedback())
          }
        }
        .width('90%')
        .padding(20)
        .backgroundColor($r('[basic].color.white'))
        .borderRadius(24)
      }
      .width('100%')
      .height('100%')
      .justifyContent(FlexAlign.Center)
      .alignItems(HorizontalAlign.Center)
      .backgroundColor('rgba(0,0,0,0.5)')
    }
  }

  private getStarSymbol(index: number): string {
    if (this.reputation.weightedScore >= index + 1) {
      return '★'
    }
    if (this.reputation.weightedScore > index) {
      return '☆'
    }
    return '☆'
  }

  private getStarColor(index: number): ResourceColor | string {
    return this.reputation.weightedScore > index ? '#FFB400' : $r('[basic].color.text_secondary')
  }

  private handleProtectedAction(action: string) {
    const user = this.appUser.user
    if (!user?.token) {
      HMRouterMgr.push({ pageUrl: PAGE_PATH.LOGIN_PAGE })
      return
    }
    this.syncUserState()
    if (action === 'feedback') {
      this.showFeedbackModal = true
      return
    }
    if (action === 'reputation') {
      HMRouterMgr.push({ pageUrl: PAGE_PATH.REPUTATION_PAGE })
      return
    }
    if (action === 'shop' || action === 'points') {
      HMRouterMgr.push({ pageUrl: PAGE_PATH.MALL_PAGE })
      return
    }
    if (action === 'profile') {
      HMRouterMgr.push({ pageUrl: PAGE_PATH.EDIT_PROFILE_PAGE })
      return
    }
    if (action === 'orders') {
      HMRouterMgr.push({ pageUrl: PAGE_PATH.MY_ORDERS_PAGE })
      return
    }
    if (action === 'space') {
      HMRouterMgr.push({ pageUrl: PAGE_PATH.MY_SPACE_PAGE })
      return
    }
    if (action === 'wallet') {
      HMRouterMgr.push({ pageUrl: PAGE_PATH.WALLET_PAGE })
      return
    }
    this.showToast('功能开发中')
  }
  private closeFeedbackModal() {
    this.showFeedbackModal = false
    this.feedbackTitle = ''
    this.feedbackContent = ''
  }

  private submitFeedback() {
    this.showToast('反馈提交功能稍后接入')
    this.closeFeedbackModal()
  }

  private showToast(message: string) {
    promptAction.showToast({
      message,
      duration: 1500,
      bottom: 120
    })
  }

  private buildProfileFromStorage(): UserProfileSummary {
    const user = this.appUser.user
    if (!user?.token) {
      return {
        name: '立即登录',
        idLabel: '登录以体验完整功能',
        avatar: this.defaultAvatar,
        freeCounts: 0,
        points: 0,
        balance: '¥0.00'
      }
    }
    const idLabel = user.wxid?.length
      ? `ID: ${user.wxid}`
      : user.phone_number?.length
        ? `手机号：${user.phone_number}`
        : '欢迎回来'
    const balanceValue = user.balance !== undefined ? `¥${Number(user.balance).toFixed(2)}` : '¥0.00'
    return {
      name: user.username?.length ? user.username : '校园用户',
      idLabel,
      avatar: user.avatar_url?.length ? user.avatar_url : this.defaultAvatar,
      freeCounts: user.free_counts ?? 0,
      points: user.points ?? 0,
      balance: balanceValue
    }
  }

  private buildStatisticsFromStorage(): StatisticCard[] {
    const user = this.appUser.user
    const freeCounts = user?.free_counts ?? 0
    const points = user?.points ?? 0
    const balanceValue = user?.balance !== undefined ? `¥${Number(user.balance).toFixed(2)}` : '¥0.00'
    return [
      { label: '免佣金次数', value: `${freeCounts}`, action: 'shop' },
      { label: '积分余额', value: `${points}`, action: 'points' },
      { label: '账户余额', value: balanceValue, action: 'wallet' }
    ]
  }

  private buildVipStateFromStorage(): VipState {
    const user = this.appUser.user
    const expireText = user?.vip_expire_time
    if (!expireText) {
      return { isVip: false, expireText: '未开通' }
    }
    const expireDate = new Date(expireText)
    const isVip = !Number.isNaN(expireDate.getTime()) && expireDate.getTime() > Date.now()
    return {
      isVip,
      expireText: isVip ? `到期时间：${expireText}` : '未开通'
    }
  }

  private syncUserState() {
    this.profile = this.buildProfileFromStorage()
    this.statistics = this.buildStatisticsFromStorage()
    // this.vipState = this.buildVipStateFromStorage()
  }
  private getProfileAvatar(): ResourceStr {
    const u = this.appUser.user
    return (u?.avatar_url && u.avatar_url.length > 0 ? u.avatar_url : this.defaultAvatar) as ResourceStr
  }

  private getProfileName(): string {
    const u = this.appUser.user
    if (!u?.token) { return '立即登录' }
    return u.username?.length ? u.username : '校园用户'
  }

  private getProfileIdLabel(): string {
    const u = this.appUser.user
    if (!u?.token) { return '登录以体验完整功能' }
    if (u.wxid?.length) { return `ID: ${u.wxid}` }
    if (u.phone_number?.length) { return `手机号：${u.phone_number}` }
    return '欢迎回来'
  }

  private getStatistics(): StatisticCard[] {
    const u = this.appUser.user
    const freeCounts = u?.free_counts ?? 0
    const points = u?.points ?? 0
    const balanceValue = u?.balance !== undefined ? `¥${Number(u.balance).toFixed(2)}` : '¥0.00'
    return [
      { label: '免佣金次数', value: `${freeCounts}`, action: 'shop' },
      { label: '积分余额', value: `${points}`, action: 'points' },
      { label: '账户余额', value: balanceValue, action: 'wallet' }
    ]
  }

  private isVipActive(): boolean {
    const exp = this.appUser.user?.vip_expire_time
    if (!exp) { return false }
    const t = new Date(exp).getTime()
    return !Number.isNaN(t) && t > Date.now()
  }

  private getVipExpireText(): string {
    const exp = this.appUser.user?.vip_expire_time
    if (!exp) { return '未开通' }
    return this.isVipActive() ? `到期时间：${exp}` : '未开通'
  }

  private formatBalance(b: number | string | undefined): string {
    if (typeof b === 'number') { return `¥${b.toFixed(2)}` }
    if (typeof b === 'string') {
      const n = Number(b)
      return Number.isFinite(n) ? `¥${n.toFixed(2)}` : b
    }
    return '¥0.00'
  }
}
