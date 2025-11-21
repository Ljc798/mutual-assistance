import { AppSafeArea, AppUser, NavBar, PAGE_PATH, UserInfo, userPersistence } from 'basic'
import { AppStorageV2, promptAction } from '@kit.ArkUI'

import { HMRouter, HMRouterMgr } from '@hadss/hmrouter'
import { LoginFormModel, PhoneLoginFormModel } from '../viewmodels/MyTypes'
import { passwordLoginAPI, PasswordLoginPayload, sendSmsCodeAPI, PhoneCodeLoginPayload, phoneCodeLoginAPI } from '../api/user'


@Preview
@HMRouter({ pageUrl: PAGE_PATH.LOGIN_PAGE })
@ComponentV2
export struct LoginView {
  // @Local account: string = '13200000010' // 13200000010 - 13200000060
  // @Local password: string = '123456'
  loginForm: LoginFormModel = new LoginFormModel({
    account: '16607923402',
    password: '12345678'
  })
  @Local agree: boolean = false
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
    try {
      const payload: PasswordLoginPayload = {
        phone: this.loginForm.account.trim(),
        password: this.loginForm.password.trim()
      }
      const response = await passwordLoginAPI(payload)
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
      if (error instanceof Error && error.message) {
        message = `登录失败：${error.message}`
      } else if (typeof error === 'string' && error.length > 0) {
        message = `登录失败：${error}`
      }
      console.error('Password login failed', JSON.stringify(error))
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
        onLeftClick: () => {
          HMRouterMgr.pop()
        }
      })
      // Column({ space: 16 }) {
        // Text('账号密码登录')
        //   .fontSize(18)
        //   .fontColor($r('[basic].color.black'))
        //   .width('100%')
        //   .fontWeight(500)
        //   .margin({ bottom: 10 })
        // TextInput({ placeholder: '请输入账号', text: $$this.loginForm.account })
        //   .placeholderColor($r('[basic].color.gray'))
        //   .placeholderFont({ size: 14 })
        //   .form()
        // TextInput({ placeholder: '请输入密码', text: $$this.loginForm.password })
        //   .type(InputType.Password)
        //   .showPasswordIcon(false)
        //   .placeholderColor($r('[basic].color.gray'))
        //   .placeholderFont({ size: 14 })
        //   .form()

        // Row({ space: 4 }) {
        //   Checkbox()
        //     .select($$this.agree)
        //     .width(12)
        //     .aspectRatio(1)
        //     .selectedColor($r('[basic].color.black'))
        //     .mark({ size: 10, strokeWidth: 1 })
        //   Text() {
        //     Span('查看并同意')
        //     Span('《隐私条款》')
        //       .fontColor('#007DFB')
        //     Span('和')
        //     Span('《用户协议》')
        //       .fontColor('#007DFB')
        //   }
        //   .width('100%')
        //   .fontSize(12)
        //   .fontColor($r('[basic].color.gray'))
        // }
        //
        // Button('登录')
        //   .backgroundColor(this.btnEnable ? $r('[basic].color.black') : '#D4D2D9')
        //   .fontColor(this.btnEnable ? $r('[basic].color.white') : $r('[basic].color.black'))
        //   .form()
        //   .enabled(this.btnEnable)
        //   .onClick(() => {
        //     this.onSubmit()
        //   })
        //
        // Row() {
        //   Blank()
        //   Text('忘记密码')
        //     .fontColor('#007DFB')
        //     .fontSize(12)
        // }
        // .width('100%')
        // Column({ space: 16 }) {


          // 华为login无法使用
          // Stack() {
          //   Text()
          //     .width(200)
          //     .height(1)
          //     .backgroundColor($r('[basic].color.under'))
          //   Text('其他登录方式')
          //     .width(100)
          //     .fontSize(12)
          //     .backgroundColor($r('[basic].color.white'))
          //     .fontColor($r('[basic].color.text'))
          //     .textAlign(TextAlign.Center)
          // }
          // Row() {
          //   Image($r("app.media.huawei"))
          //     .width(60)
          //     .height(60)
          //     .onClick(async () => {
          //       const code = (await huaweiAuthManager.launchAuth())! // 拉起华为登录
          //       const result: LoginResponse = await huaweiLoginAPI({
          //         code,
          //         clientId: '6917589220426632079',
          //         clientSecret: 'a7901edd60ce814769a9e90006cef64976682001b9597450e11589c8498a66a9'
          //       })
          //       console.info("后端返回:", JSON.stringify(result))
          //       if (result.success && result.user) {
          //         auth.setUser(result.user)
          //         HMRouterMgr.pop()
          //       } else {
          //         promptAction.showToast({ message: result.message ?? '登录失败' })
          //       }
          //     })
          // }


      //   }
      //   .margin({ top: 200 })
      // }
      // .padding(30)
      Column({ space: 16 }) {
        Text('手机号验证码登录')
          .fontSize(18)
          .fontColor($r('[basic].color.black'))
          .width('100%')
          .fontWeight(500)
          .margin({ bottom: 10 })
        TextInput({ placeholder: '请输入手机号', text: $$this.smsForm.phone })
          .placeholderColor($r('[basic].color.gray'))
          .placeholderFont({ size: 14 })
          .form()
        Row({ space: 8 }) {
          TextInput({ placeholder: '请输入验证码', text: $$this.smsForm.code })
            .placeholderColor($r('[basic].color.gray'))
            .placeholderFont({ size: 14 })
            .layoutWeight(1)
            .form()
          Button(this.smsCountdown > 0 ? `${this.smsCountdown}s` : (this.smsSending ? '发送中...' : '发送验证码'))
            .height(42)
            .borderRadius(12)
            .backgroundColor($r('[basic].color.search_box_bg'))
            .enabled(!this.smsSending && this.smsCountdown === 0)
            .onClick(() => { this.onSendCode() })
        }
        Row({ space: 4 }) {
          Checkbox()
            .select($$this.agree)
            .width(12)
            .aspectRatio(1)
            .selectedColor($r('[basic].color.black'))
            .mark({ size: 10, strokeWidth: 1 })
          Text() {
            Span('查看并同意')
            Span('《隐私条款》')
              .fontColor('#007DFB')
            Span('和')
            Span('《用户协议》')
              .fontColor('#007DFB')
          }
          .width('100%')
          .fontSize(12)
          .fontColor($r('[basic].color.gray'))
        }
        Button('登录')
          .backgroundColor(this.smsBtnEnable ? $r('[basic].color.black') : '#D4D2D9')
          .fontColor(this.smsBtnEnable ? $r('[basic].color.white') : $r('[basic].color.black'))
          .form()
          .enabled(this.smsBtnEnable)
          .onClick(() => { this.onSmsLogin() })
      }
      .padding(30)
    }
    .width('100%')
    .height('100%')

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
