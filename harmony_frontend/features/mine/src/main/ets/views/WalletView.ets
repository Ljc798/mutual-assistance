import promptAction from '@ohos.promptAction'
import { AppStorageV2 } from '@kit.ArkUI'
import { HMRouter, HMRouterMgr } from '@hadss/hmrouter'
import { AppSafeArea, AppUser, PAGE_PATH } from 'basic'
import { submitWithdraw, WithdrawPayload } from '../services/WalletService'

@HMRouter({ pageUrl: PAGE_PATH.WALLET_PAGE })
@Component
export struct WalletView {
  safeArea: AppSafeArea = AppStorageV2.connect(AppSafeArea, () => new AppSafeArea())!
  private readonly appUser: AppUser = AppStorageV2.connect(AppUser, () => new AppUser())!
  @State amountText: string = ''
  @State methodText: string = '微信'
  @State phoneText: string = ''
  @State isSubmitting: boolean = false

  build() {
    Stack() {
      Column() {
        this.renderHeader()
        this.renderBalance()
        this.renderForm()
      }
      .height('100%')
      .width('100%')
      .backgroundColor($r('[basic].color.page_background'))
    }
  }

  @Builder
  private renderHeader() {
    Row() {
      Image($r('[basic].media.ic_public_left')).width(28).aspectRatio(1).fillColor($r('[basic].color.white')).onClick(() => { HMRouterMgr.pop() })
      Text('余额提现').fontSize(20).fontWeight(FontWeight.Medium).fontColor($r('[basic].color.white'))
      Blank()
    }
    .padding({ top: this.safeArea.topHeight + 10, bottom: 12, left: 16, right: 16 })
    .width('100%')
    .backgroundColor($r('[basic].color.home_header_bg'))
  }

  @Builder
  private renderBalance() {
    Column({ space: 6 }) {
      Text('当前余额').fontSize(14).fontColor($r('[basic].color.text_secondary'))
      Text(this.getBalanceText()).fontSize(24).fontWeight(FontWeight.Bold).fontColor($r('[basic].color.text_primary'))
    }
    .padding({ left: 20, right: 20, top: 16, bottom: 16 })
    .backgroundColor($r('[basic].color.white'))
    .borderRadius(16)
    .margin({ left: 16, right: 16, top: 12 })
  }

  @Builder
  private renderForm() {
    Column({ space: 10 }) {
      this.renderTextField('提现金额', '请输入金额', this.amountText, (v: string) => this.amountText = v)
      this.renderTextField('收款方式', '微信/支付宝', this.methodText, (v: string) => this.methodText = v)
      this.renderTextField('收款手机号', '请输入手机号', this.phoneText, (v: string) => this.phoneText = v)
      Button(this.isSubmitting ? '提交中...' : '提交提现')
        .height(44)
        .borderRadius(16)
        .backgroundColor($r('[basic].color.filter_active_bg'))
        .fontColor($r('[basic].color.white'))
        .enabled(!this.isSubmitting)
        .onClick(async () => { await this.handleSubmit() })
      Text('微信方式需在微信设置开启手机号收款').fontSize(12).fontColor($r('[basic].color.text_secondary')).textAlign(TextAlign.Center)
    }
    .padding({ left: 16, right: 16, top: 16 })
  }

  @Builder
  private renderTextField(label: string, placeholder: string, value: string, onChange: (v: string) => void) {
    Column({ space: 6 }) {
      Text(label).fontSize(14).fontColor($r('[basic].color.text_secondary'))
      TextInput({ placeholder, text: value })
        .height(44)
        .backgroundColor($r('[basic].color.white'))
        .borderRadius(14)
        .padding({ left: 12, right: 12 })
        .onChange((v: string) => onChange(v))
    }
  }

  private async handleSubmit() {
    const token = this.appUser.user.token
    const amount = Number.parseFloat(this.amountText)
    const method = this.methodText.trim()
    const phone = this.phoneText.trim()
    if (!token) { this.showToast('请先登录'); return }
    if (Number.isNaN(amount) || amount <= 0) { this.showToast('请输入正确的金额'); return }
    if (!(method === '微信' || method === '支付宝')) { this.showToast('请输入微信或支付宝'); return }
    if (!/^\d{11}$/.test(phone)) { this.showToast('请输入11位手机号'); return }
    this.isSubmitting = true
    try {
      const payload: WithdrawPayload = { amount: amount.toFixed(2), method, phone }
      const res = await submitWithdraw(payload, token)
      if (!res.success) { this.showToast(res.message ?? '提现失败'); return }
      this.showToast('提现申请已提交')
      HMRouterMgr.pop()
    } catch (_e) { this.showToast('提现失败') } finally { this.isSubmitting = false }
  }

  private getBalanceText(): string {
    const b = this.appUser.user.balance
    if (typeof b === 'number') { return `¥${b.toFixed(2)}` }
    if (typeof b === 'string') { const n = Number(b); return Number.isFinite(n) ? `¥${n.toFixed(2)}` : b }
    return '¥0.00'
  }

  private showToast(message: string) { promptAction.showToast({ message, duration: 1500, bottom: 100 }) }
}