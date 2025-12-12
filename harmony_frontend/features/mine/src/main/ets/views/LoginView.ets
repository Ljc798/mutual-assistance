import { AppSafeArea, AppUser, NavBar, PAGE_PATH, UserInfo, userPersistence } from 'basic'
import { AppStorageV2, promptAction } from '@kit.ArkUI'
import { inputMethod } from '@kit.IMEKit'
import { emitter } from '@kit.BasicServicesKit'

import { HMRouter, HMRouterMgr } from '@hadss/hmrouter'
import { LoginFormModel, PhoneLoginFormModel } from '../viewmodels/MyTypes'
import {
  passwordLoginAPI,
  PasswordLoginPayload,
  sendSmsCodeAPI,
  PhoneCodeLoginPayload,
  phoneCodeLoginAPI,
  adminLoginAPI,
  AdminLoginPayload
} from '../api/user'


@Extend(Text)
function verifyCodeUnitStyleInline() {
  .fontSize(16)
  .fontWeight(500)
  .textAlign(TextAlign.Center)
  .width(40)
  .height('100%')
  .margin({ left: 6, right: 6 })
  .border({ width: { bottom: 1 }, color: { bottom: Color.Grey }, style: { bottom: BorderStyle.Solid } })
}

@Component
struct VerifyCodeInlineComponent {
  @State codeText: string = ""
  private readonly verifyID: string = "verifyCodeInline"
  private inputController: inputMethod.InputMethodController = inputMethod.getController()
  @State isKeyboardShow: boolean = false
  private verifyCodeLength: number = 6
  private isListen: boolean = false
  private textConfig: inputMethod.TextConfig = {
    inputAttribute: {
      textInputType: inputMethod.TextInputType.NUMBER,
      enterKeyType: inputMethod.EnterKeyType.GO
    },
  }
  private codeIndexArray: Array<number> = Array.from([0, 1, 2, 3, 4, 5])
  onCodeChange: (code: string) => void = (code: string) => {}
  onComplete: (code: string) => void = (code: string) => {}

  aboutToAppear(): void {
    this.listenBackPress()
  }

  listenBackPress() {
    let innerEvent: emitter.InnerEvent = { eventId: 5 }
    emitter.on(innerEvent, () => {
      if (this.isKeyboardShow) {
        this.inputController.hideTextInput()
        this.isKeyboardShow = false
      }
    })
  }

  aboutToDisappear(): void {
    this.off()
    emitter.off(5)
  }

  async attachAndListen(): Promise<void> {
    focusControl.requestFocus(this.verifyID)
    await this.inputController.attach(true, this.textConfig)
    this.listen()
    this.isKeyboardShow = true
  }

  off(): void {
    this.inputController.off("insertText")
    this.inputController.off("deleteLeft")
    this.isListen = false
    this.inputController.hideTextInput()
    this.isKeyboardShow = false
  }

  listen() {
    if (this.isListen) { return }
    this.inputController.on("insertText", (text: string) => {
      if (this.codeText.length >= this.verifyCodeLength || isNaN(Number(text)) || text === ' ') { return }
      this.codeText += text
      this.onCodeChange(this.codeText)
      if (this.codeText.length === this.verifyCodeLength) { this.onComplete(this.codeText) }
    })
    this.inputController.on("deleteLeft", (length: number) => {
      this.codeText = this.codeText.substring(0, this.codeText.length - 1)
      this.onCodeChange(this.codeText)
    })
    this.isListen = true
  }

  @Builder
  buildVerifyCodeComponent() {
    Flex({ direction: FlexDirection.Row, alignItems: ItemAlign.Center, justifyContent: FlexAlign.SpaceBetween }) {
      ForEach(this.codeIndexArray, (item: number, index: number) => {
        Text(this.codeText[item]).verifyCodeUnitStyleInline()
      }, (item: number, index: number) => item.toString())
    }
    .id(this.verifyID)
    .onBlur(() => { this.off() })
    .backgroundColor(Color.Transparent)
    .height(42)
    .defaultFocus(true)
    .onClick(() => { this.attachAndListen() })
  }

  build() {
    Row() {
      this.buildVerifyCodeComponent()
    }
    .height(42)
  }
}

@Preview
@HMRouter({ pageUrl: PAGE_PATH.LOGIN_PAGE })
@ComponentV2
export struct LoginView {
  // @Local account: string = '13200000010' // 13200000010 - 13200000060
  // @Local password: string = '123456'
  loginForm: LoginFormModel = new LoginFormModel({
    account: '',
    password: ''
  })
  @Local agree: boolean = false
  @Local loginType: 'sms' | 'password' = 'sms'
  safeArea: AppSafeArea = AppStorageV2.connect(AppSafeArea, () => new AppSafeArea())!
  private appUser: AppUser = AppStorageV2.connect(AppUser, () => new AppUser())!
  smsForm: PhoneLoginFormModel = new PhoneLoginFormModel({ phone: '', code: '' })
  @Local smsCountdown: number = 0
  @Local smsSending: boolean = false
  private smsTimer: number = -1

  @Monitor("loginForm.account")
  updateAccount(monitor: IMonitor) {
    // promptAction.showToast({ message: monitor.value()?.before as string })
  }

  @Computed
  get btnEnable() {
    return !!(this.loginForm.account && this.loginForm.password)
  }

  @Computed
  get smsBtnEnable() {
    return !!(this.smsForm.phone && this.smsForm.code)
  }

  @Computed
  get canSendCode() {
    const phone = (this.smsForm.phone || '').trim()
    const okPhone = /^\d{11}$/.test(phone)
    return this.agree && okPhone && !this.smsSending && this.smsCountdown === 0
  }

  aboutToAppear(): void {

  }

  async onSubmit() {
    if (!this.agree) {
      return promptAction.showToast({ message: '请先勾选协议' })
    }
    if (!this.loginForm.account || !this.loginForm.password) {
      promptAction.showToast({ message: '请输入账号和密码' })
      return
    }
    const phoneText = this.loginForm.account.trim()
    if (!/^\d{11}$/.test(phoneText)) {
      promptAction.showToast({ message: '手机号格式错误' })
      return
    }
    try {
      // 密码登录
      const payload: PasswordLoginPayload = {
        phone: phoneText,
        password: this.loginForm.password.trim()
      }
      const response = await passwordLoginAPI(payload)
      if (response.success && response.user) {
        // ... (用户信息处理逻辑)
        const userPayload: UserInfo = {
          id: response.user.id,
          username: response.user.username,
          avatar_url: response.user.avatar_url,
          wxid: response.user.wxid,
          phone_number: response.user.phone_number,
          openid: response.user.openid,
          points: response.user.points,
          free_counts: response.user.free_counts,
          balance: response.user.balance,
          vip_expire_time: response.user.vip_expire_time,
          vip_level: response.user.vip_level,
          school_id: response.user.school_id,
          school_name: response.user.school_name,
          token: response.token ?? ''
        }
        userPersistence.persistUser(userPayload)
        
        promptAction.showToast({ message: '登录成功' })
        HMRouterMgr.pop()
      } else {
        promptAction.showToast({ message: response.message ?? '登录失败' })
      }
    } catch (error) {
      let message: string = '登录失败，请检查账号密码'
      const errorMsg = (error instanceof Error) ? error.message : (typeof error === 'string' ? error : JSON.stringify(error))
      console.error('Password login failed', errorMsg)
      if (errorMsg && errorMsg.length > 0) { message = errorMsg }
      promptAction.showToast({ message })
    }
  }

  private startCountdown(): void {
    this.smsCountdown = 60
    if (this.smsTimer !== -1) { clearInterval(this.smsTimer) }
    this.smsTimer = setInterval(() => {
      this.smsCountdown = this.smsCountdown > 0 ? this.smsCountdown - 1 : 0
      if (this.smsCountdown === 0) { clearInterval(this.smsTimer); this.smsTimer = -1 }
    }, 1000)
  }

  async onSendCode() {
    if (!this.agree) { promptAction.showToast({ message: '请先阅读并同意权益条款' }); return }
    const phone = (this.smsForm.phone || '').trim()
    if (!/^\d{11}$/.test(phone)) { promptAction.showToast({ message: '手机号格式错误' }); return }
    if (this.smsCountdown > 0 || this.smsSending) { return }
    this.smsSending = true
    try {
      const res = await sendSmsCodeAPI({ phone })
      if (res.success) { promptAction.showToast({ message: '验证码已发送' }); this.startCountdown() }
      else { promptAction.showToast({ message: res.message ?? '发送失败' }) }
    } catch (error) {
      let message: string = '发送失败，请稍后再试'
      if (error instanceof Error && error.message) { message = error.message }
      promptAction.showToast({ message })
    } finally {
      this.smsSending = false
    }
  }

  async onSmsLogin() {
    if (!this.agree) { promptAction.showToast({ message: '请先勾选协议' }); return }
    const phone = (this.smsForm.phone || '').trim()
    const code = (this.smsForm.code || '').trim()
    if (!/^\d{11}$/.test(phone) || !/^\d{4,6}$/.test(code)) { promptAction.showToast({ message: '请输入正确的手机号和验证码' }); return }
    try {
      const payload: PhoneCodeLoginPayload = { phone, code }
      const response = await phoneCodeLoginAPI(payload)
      if (response.success && response.user) {
        const userPayload: UserInfo = {
          id: response.user.id,
          username: response.user.username,
          avatar_url: response.user.avatar_url,
          wxid: response.user.wxid,
          phone_number: response.user.phone_number,
          openid: response.user.openid,
          points: response.user.points,
          free_counts: response.user.free_counts,
          balance: response.user.balance,
          vip_expire_time: response.user.vip_expire_time,
          vip_level: response.user.vip_level,
          school_id: response.user.school_id,
          school_name: response.user.school_name,
          token: response.token ?? ''
        }
        userPersistence.persistUser(userPayload)
        const appUserSnapshot = this.appUser.user
        const afterLoginLog: AfterLoginLogView = {
          id: appUserSnapshot.id,
          username: appUserSnapshot.username,
          wxid: appUserSnapshot.wxid,
          points: appUserSnapshot.points,
          free_counts: appUserSnapshot.free_counts,
          balance: appUserSnapshot.balance,
          school_id: appUserSnapshot.school_id,
          school_name: appUserSnapshot.school_name,
          token_len: appUserSnapshot.token.length
        }
        console.info('AppUserAfterLogin', JSON.stringify(afterLoginLog))
        promptAction.showToast({ message: '登录成功' })
        HMRouterMgr.pop()
      } else {
        promptAction.showToast({ message: response.message ?? '登录失败' })
      }
    } catch (error) {
      let message: string = '登录失败，请稍后再试'
      if (error instanceof Error && error.message) { message = `登录失败：${error.message}` }
      else if (typeof error === 'string' && error.length > 0) { message = `登录失败：${error}` }
      console.error('SMS login failed', JSON.stringify(error))
      promptAction.showToast({ message })
    }
  }

  @Styles
  form() {
    .width('100%')
    .height(42)
    .padding({
      left: 16,
      right: 16,
      top: 0,
      bottom: 0
    })
  }

  build() {
    Column() {
      NavBar({
        title: '登录',
        showRightIcon: false,
        onLeftClick: () => {
          HMRouterMgr.pop()
        }
      })

      if (this.loginType === 'password') {
        Column({ space: 16 }) {
          Text('账号密码登录')
            .fontSize(18)
            .fontColor($r('[basic].color.text_primary'))
            .width('100%')
            .fontWeight(500)
            .margin({ bottom: 10 })
          TextInput({ placeholder: '请输入账号', text: $$this.loginForm.account })
            .placeholderColor($r('[basic].color.gray'))
            .placeholderFont({ size: 14 })
            .form()
          TextInput({ placeholder: '请输入密码', text: $$this.loginForm.password })
            .type(InputType.Password)
            .showPasswordIcon(false)
            .placeholderColor($r('[basic].color.gray'))
            .placeholderFont({ size: 14 })
            .form()

          Row({ space: 4 }) {
            Checkbox()
              .select($$this.agree)
              .width(12)
              .aspectRatio(1)
              .selectedColor($r('[basic].color.black'))
              .mark({ size: 10, strokeWidth: 1 })
            Text('我已阅读并同意')
              .fontSize(12)
              .fontColor($r('[basic].color.gray'))
            Column() {
              Text('《隐私说明》')
                .fontSize(12)
                .fontColor('#007DFB')
                .onClick(() => {
                  HMRouterMgr.push({ pageUrl: PAGE_PATH.PRIVACY_PAGE })
                })
            }
          }

          Button('登录')
            .backgroundColor(this.btnEnable ? $r('[basic].color.black') : '#D4D2D9')
            .fontColor(this.btnEnable ? $r('[basic].color.white') : $r('[basic].color.black'))
            .form()
            .enabled(this.btnEnable)
            .onClick(() => {
              this.onSubmit()
            })

          Row() {
            Blank()
            Text('切换到验证码登录')
              .fontColor('#007DFB')
              .fontSize(14)
              .onClick(() => {
                this.loginType = 'sms'
              })
          }
          .width('100%')
          .padding({ top: 10 })
        }
        .padding(30)
      } else {
        // --- 手机号验证码登录 ---
        Column({ space: 16 }) {
          Text('手机号验证码登录')
            .fontSize(18)
            .fontColor($r('[basic].color.text_primary'))
            .width('100%')
            .fontWeight(500)
            .margin({ bottom: 10 })
          Row({ space: 8 }) {
            Text('+86')
              .fontSize(14)
              .fontColor($r('[basic].color.text_primary'))
              .height(42)
              .backgroundColor($r('[basic].color.white'))
              .borderRadius(8)
              .padding({ left: 12, right: 12 })
            TextInput({ placeholder: '请输入手机号', text: $$this.smsForm.phone })
              .placeholderColor($r('[basic].color.gray'))
              .placeholderFont({ size: 14 })
              .layoutWeight(1)
              .type(InputType.PhoneNumber)
              .form()
          }
          Row({ space: 8 }) {
            VerifyCodeInlineComponent({
              onCodeChange: (code: string) => { this.smsForm.code = code },
              onComplete: (code: string) => { this.smsForm.code = code }
            })
              .layoutWeight(1)
            Button(this.smsCountdown > 0 ? `${this.smsCountdown}s` : (this.smsSending ? '发送中...' : '发送验证码'))
              .height(42)
              .borderRadius(12)
              .backgroundColor(this.canSendCode ? $r('[basic].color.filter_active_bg') : $r('[basic].color.search_box_bg'))
              .fontColor(this.canSendCode ? $r('[basic].color.white') : $r('[basic].color.text_primary'))
              .enabled(this.canSendCode)
              .onClick(() => { this.onSendCode() })
          }
          Row({ space: 6 }) {
            Checkbox()
              .select($$this.agree)
              .width(12)
              .aspectRatio(1)
              .selectedColor($r('[basic].color.black'))
              .mark({ size: 10, strokeWidth: 1 })
            Text('我已阅读并同意')
              .fontSize(12)
              .fontColor($r('[basic].color.gray'))
            Column() {
              Text('《隐私说明》')
                .fontSize(12)
                .fontColor('#007DFB')
                .onClick(() => { HMRouterMgr.push({ pageUrl: PAGE_PATH.PRIVACY_PAGE }) })
              Row() { Blank() }
                .width(60)
                .height(1)
                .backgroundColor('#007DFB')
            }
          }
          Button('登录')
            .backgroundColor(this.smsBtnEnable && this.agree ? $r('[basic].color.black') : '#D4D2D9')
            .fontColor(this.smsBtnEnable && this.agree ? $r('[basic].color.white') : $r('[basic].color.black'))
            .form()
            .enabled(this.smsBtnEnable && this.agree)
            .onClick(() => { this.onSmsLogin() })
            
          Row() {
            Blank()
            Text('切换到管理员登录')
              .fontColor('#007DFB')
              .fontSize(14)
              .onClick(() => {
                this.loginType = 'password'
              })
          }
          .width('100%')
          .padding({ top: 10 })
        }
        .padding(30)
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor($r('[basic].color.page_background'))

  }
}
interface AfterLoginLogView {
  id?: number
  username: string
  wxid: string
  points: number
  free_counts: number
  balance?: number | string
  school_id?: number
  school_name?: string
  token_len: number
}
