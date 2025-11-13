import promptAction from '@ohos.promptAction'
import { AppStorageV2 } from '@kit.ArkUI'
import { AppSafeArea } from 'basic'
import {
  ActionShortcut,
  ReputationSummary,
  StatisticCard,
  UserProfileSummary,
  VipState
} from '../viewmodels/MyTypes'

@Component
export struct MyView {
  private scroller: Scroller = new Scroller()
  safeArea: AppSafeArea = AppStorageV2.connect(AppSafeArea, () => new AppSafeArea())!
  @State profile: UserProfileSummary = {
    name: '立即登录',
    idLabel: '登录以体验完整功能',
    avatar: 'https://mutual-campus-1348081197.cos.ap-nanjing.myqcloud.com/avatar/default.png',
    freeCounts: 3,
    points: 120,
    balance: '56.80'
  }
  @State reputation: ReputationSummary = {
    totalScore: 480,
    weightedScore: 4.3,
    creditLevel: '良好'
  }
  @State statistics: StatisticCard[] = [
    { label: '免佣金次数', value: '3', action: 'shop' },
    { label: '积分余额', value: '120', action: 'points' },
    { label: '账户余额', value: '¥56.80', action: 'wallet' }
  ]
  @State vipState: VipState = {
    isVip: true,
    expireText: '到期时间：2025-03-01'
  }
  @State shortcuts: ActionShortcut[] = [
    { title: '我的订单', action: 'orders' },
    { title: '我的空间', action: 'space' },
    { title: '商城', action: 'shop' },
    { title: '个人信息', action: 'profile' },
    { title: '意见反馈', action: 'feedback' }
  ]
  @State showFeedbackModal: boolean = false
  @State feedbackTitle: string = ''
  @State feedbackContent: string = ''

  build() {
    Stack() {
      Scroll(this.scroller) {
        Column({ space: 10 }) {
          this.renderTitleSection()
          this.renderProfileCard()
          this.renderReputationCard()
          this.renderStatisticBoxes()
          this.renderVipSection()
          this.renderShortcutsCard()
          this.renderFeedbackHint()
        }
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
    Row({space: 6}) {
      Image(this.profile.avatar)
        .width(60)
        .height(60)
        .borderRadius(28)
        .backgroundColor($r('[basic].color.white'))
        .margin({ right: 12 })
      Column({ space: 10 }) {
        Text(this.profile.name)
          .fontSize(20)
          .fontWeight(FontWeight.Medium)
          .fontColor($r('[basic].color.text_primary'))
        Text(this.profile.idLabel)
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
      ForEach(this.statistics, (item: StatisticCard) => {
        Column({ space: 6 }) {
          Text(item.label)
            .fontSize(13)
            .fontColor($r('[basic].color.text_secondary'))
          Text(item.value)
            .fontSize(18)
            .fontWeight(FontWeight.Medium)
            .fontColor($r('[basic].color.text_primary'))
        }
        .padding({ top: 16, bottom: 16 })
        .layoutWeight(1)
        .alignItems(HorizontalAlign.Center)
        .onClick(() => this.showToast('功能稍后开放'))
      }, (item: StatisticCard) => item.label)
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
    if (this.vipState.isVip) {
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
          Text(this.vipState.expireText)
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
          .onClick(() => this.handleShortcutTap(item))
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
      Text('您的意见真的真的对我们很重要')
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

  private handleShortcutTap(item: ActionShortcut) {
    if (item.action === 'feedback') {
      this.showFeedbackModal = true
      return
    }
    this.showToast(`${item.title} 页面开发中`)
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
}
