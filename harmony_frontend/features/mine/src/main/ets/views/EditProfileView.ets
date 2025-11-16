import promptAction from '@ohos.promptAction'
import { AppStorageV2 } from '@kit.ArkUI'
import { AppSafeArea, AppUser, PAGE_PATH, userPersistence, AppEditSelectedSchool,
  UserInfo,
  AppSchoolPickerContext} from 'basic'
import { HMRouter, HMRouterMgr } from '@hadss/hmrouter'
import { checkUsername, checkWxid, updateProfile, UpdatePayload } from '../services/EditProfileService'

@HMRouter({ pageUrl: PAGE_PATH.EDIT_PROFILE_PAGE })
@Component
export struct EditProfileView {
  private readonly scroller: Scroller = new Scroller()
  safeArea: AppSafeArea = AppStorageV2.connect(AppSafeArea, () => new AppSafeArea())!
  private readonly appUser: AppUser = AppStorageV2.connect(AppUser, () => new AppUser())!
  private readonly selectedSchoolVM: AppEditSelectedSchool = AppStorageV2.connect(AppEditSelectedSchool, () => new AppEditSelectedSchool())!
  @State avatarUrl: string = ''
  @State usernameInput: string = ''
  @State wxidInput: string = ''
  @State isSubmitting: boolean = false

  aboutToAppear() {
    const u = this.appUser.user
    this.avatarUrl = u.avatar_url ?? ''
    this.usernameInput = u.username ?? ''
    this.wxidInput = u.wxid ?? ''
    if (typeof u.school_id === 'number' && u.school_id > 0 && (u.school_name?.length ?? 0) > 0) {
      this.selectedSchoolVM.update({ id: u.school_id, name: u.school_name!, province: '', city: '' })
      const log: EditSchoolLogView = { phase: 'appear.user', school_id: this.selectedSchoolVM.id, school_name: this.selectedSchoolVM.name ?? '' }
      console.info('EditProfile.school', JSON.stringify(log))
    } else {
      this.selectedSchoolVM.reset()
      const log: EditSchoolLogView = { phase: 'appear.none', school_id: 0, school_name: '请选择学校' }
      console.info('EditProfile.school', JSON.stringify(log))
    }
  }

  build() {
    Stack() {
      Column() {
        this.renderHeader()
        Scroll(this.scroller) {
          Column({ space: 12 }) {
            this.renderAvatarField()
            this.renderTextField('姓名', '请输入姓名', this.usernameInput, (v: string) => this.usernameInput = v)
            this.renderTextField('微信号', '请输入微信号', this.wxidInput, (v: string) => this.wxidInput = v)
            this.renderSchoolField()
            this.renderSubmitButton()
            this.renderLogoutButton()
          }
          .padding({ left: 16, right: 16, bottom: 80 })
          .height('100%')
        }
        .height('100%')
        .scrollBar(BarState.Off)
      }
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
      Text('编辑个人信息')
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
  private renderAvatarField() {
    Column({ space: 8 }) {
      Text('头像 URL')
        .fontSize(14)
        .fontColor($r('[basic].color.text_secondary'))
      Row({ space: 8 }) {
        Image(this.getAvatarSource(this.avatarUrl))
          .width(56)
          .height(56)
          .borderRadius(28)
          .objectFit(ImageFit.Cover)
          .backgroundColor('#F2F2F2')
        TextInput({ placeholder: '粘贴头像地址', text: this.avatarUrl })
          .layoutWeight(1)
          .height(40)
          .backgroundColor($r('[basic].color.white'))
          .borderRadius(12)
          .padding({ left: 12, right: 12 })
          .onChange((v: string) => this.avatarUrl = v)
      }
      Text('暂不支持本地上传，请粘贴图片地址')
        .fontSize(12)
        .fontColor($r('[basic].color.text_secondary'))
    }
  }

  @Builder
  private renderTextField(label: string, placeholder: string, value: string, onChange: (v: string) => void) {
    Column({ space: 6 }) {
      Text(label)
        .fontSize(14)
        .fontColor($r('[basic].color.text_secondary'))
      TextInput({ placeholder, text: value })
        .height(40)
        .backgroundColor($r('[basic].color.white'))
        .borderRadius(12)
        .padding({ left: 12, right: 12 })
        .onChange((v: string) => onChange(v))
    }
  }

  @Builder
  private renderSchoolField() {
    Column({ space: 6 }) {
      Text('学校')
        .fontSize(14)
        .fontColor($r('[basic].color.text_secondary'))
      Row() {
        Text(this.selectedSchoolVM.name?.length > 0 ? this.selectedSchoolVM.name : '请选择学校')
          .fontSize(14)
          .fontColor($r('[basic].color.text_primary'))
      }
      .height(40)
      .backgroundColor($r('[basic].color.white'))
      .borderRadius(12)
      .padding({ left: 12, right: 12 })
      .onClick(() => {
        const ctx = AppStorageV2.connect(AppSchoolPickerContext, () => new AppSchoolPickerContext())!
        ctx.target = 'edit'
        HMRouterMgr.push({ pageUrl: PAGE_PATH.SCHOOL_PICKER_PAGE })
      })
    }
  }

  @Builder
  private renderSubmitButton() {
    Button(this.isSubmitting ? '保存中...' : '保存修改')
      .height(44)
      .borderRadius(16)
      .backgroundColor($r('[basic].color.filter_active_bg'))
      .fontColor($r('[basic].color.white'))
      .enabled(!this.isSubmitting)
      .onClick(() => this.handleSubmit())
  }

  @Builder
  private renderLogoutButton() {
    Button('退出登录')
      .height(42)
      .borderRadius(16)
      .backgroundColor('#FF4D4F')
      .fontColor($r('[basic].color.white'))
      .onClick(() => this.handleLogout())
  }

  private async handleSubmit() {
    const token = this.appUser.user.token
    const idNum = Number(this.appUser.user.id ?? 0)
    if (!token || !idNum) { promptAction.showToast({ message: '请先登录' }); return }
    const name = this.usernameInput.trim()
    const wxid = this.wxidInput.trim()
    if (!name || name.length < 2) { promptAction.showToast({ message: '姓名至少2个字符' }); return }
    if (!wxid || wxid.length < 3) { promptAction.showToast({ message: '微信号至少3个字符' }); return }
    const nameCheck = await checkUsername(name, idNum)
    if (!nameCheck.success || !nameCheck.available) { promptAction.showToast({ message: nameCheck.message ?? '用户名已被占用' }); return }
    const wxidCheck = await checkWxid(wxid, idNum)
    if (!wxidCheck.success || !wxidCheck.available) { promptAction.showToast({ message: wxidCheck.message ?? '微信号已被占用' }); return }
    const currentSchoolId: number = Number(this.selectedSchoolVM.id ?? 0)
    const schoolOk = currentSchoolId > 0
    if (!schoolOk) { promptAction.showToast({ message: '请选择学校' }); return }
    this.isSubmitting = true
    try {
      const payload: UpdatePayload = { username: name, avatar_url: this.avatarUrl, wxid, school_id: currentSchoolId }
      const res = await updateProfile(payload, token)
      if (!res.success) { promptAction.showToast({ message: res.message ?? '更新失败' }); return }
      // 本地更新用户快照，避免下次进入用旧学校
      this.appUser.user.school_id = currentSchoolId
      this.appUser.user.school_name = this.selectedSchoolVM.name ?? ''
      const localPersist: UserInfo = {
        id: this.appUser.user.id,
        token: this.appUser.user.token,
        avatar_url: this.appUser.user.avatar_url,
        username: name,
        wxid,
        phone_number: this.appUser.user.phone_number,
        openid: this.appUser.user.openid,
        points: this.appUser.user.points,
        free_counts: this.appUser.user.free_counts,
        balance: this.appUser.user.balance,
        vip_expire_time: this.appUser.user.vip_expire_time,
        vip_level: this.appUser.user.vip_level,
        school_id: currentSchoolId,
        school_name: this.selectedSchoolVM.name ?? ''
      }
      userPersistence.persistUser(localPersist)
      console.info('EditProfile.save.userUpdate', JSON.stringify({ school_id: currentSchoolId, school_name: this.selectedSchoolVM.name ?? '' }))
      promptAction.showToast({ message: '更新成功' })
      HMRouterMgr.pop()
    } catch (_e) { promptAction.showToast({ message: '更新失败' }) } finally { this.isSubmitting = false }
  }

  private handleLogout() {
    userPersistence.clearUser()
    promptAction.showToast({ message: '已退出登录' })
    HMRouterMgr.pop()
  }

  private getAvatarSource(url: string): ResourceStr {
    if (!url) { return $r('[basic].media.ic_public_user') }
    return url as ResourceStr
  }
}
interface EditSchoolLogView {
  phase: string
  school_id: number
  school_name: string
  version?: number
}