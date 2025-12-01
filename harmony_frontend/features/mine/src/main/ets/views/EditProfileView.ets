import promptAction from '@ohos.promptAction'
import { AppStorageV2 } from '@kit.ArkUI'
import { AppSafeArea, AppUser, PAGE_PATH, userPersistence, AppEditSelectedSchool,
  UserInfo,
  AppSchoolPickerContext} from 'basic'
import { GlobalVariable, readFileAsBytes, uploadSingle, UploadFileItem } from 'basic'
import { photoAccessHelper } from '@kit.MediaLibraryKit'
import { request } from '@kit.BasicServicesKit'
import { fileIo as fs } from '@kit.CoreFileKit'
import { common } from '@kit.AbilityKit'
import { BusinessError } from '@ohos.base'
import { HMRouter, HMRouterMgr } from '@hadss/hmrouter'
import { checkUsername, checkWxid, updateProfile, UpdatePayload, deleteAccount } from '../services/EditProfileService'

@HMRouter({ pageUrl: PAGE_PATH.EDIT_PROFILE_PAGE })
@Component
export struct EditProfileView {
  private readonly scroller: Scroller = new Scroller()
  safeArea: AppSafeArea = AppStorageV2.connect(AppSafeArea, () => new AppSafeArea())!
  private readonly appUser: AppUser = AppStorageV2.connect(AppUser, () => new AppUser())!
  private readonly selectedSchoolVM: AppEditSelectedSchool = AppStorageV2.connect(AppEditSelectedSchool, () => new AppEditSelectedSchool())!
  @State avatarUrl: string = ''
  @State avatarPreviewUrl: string = ''
  @State avatarCacheUri: string = ''
  @State avatarCachePath: string = ''
  @State avatarZoom: number = 1
  @State avatarZoomSlider: number = 50
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
            this.renderDeleteButton()
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
      Text('头像')
        .fontSize(14)
        .fontColor($r('[basic].color.text_secondary'))
      Row({ space: 8 }) {
        Image(this.getAvatarSource(this.getCurrentAvatarUrl()))
          .width(56)
          .height(56)
          .borderRadius(28)
          .objectFit(ImageFit.Cover)
          .backgroundColor('#F2F2F2')
      }
      Row({ space: 10 }) {
        Button('图库选择')
          .height(36)
          .borderRadius(12)
          .backgroundColor($r('[basic].color.filter_active_bg'))
          .fontColor($r('[basic].color.white'))
          .onClick(async () => { await this.handlePickAvatarFromGallery() })
      }
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

  @Builder
  private renderDeleteButton() {
    Button('注销账号')
      .height(42)
      .borderRadius(16)
      .backgroundColor('#D4D2D9')
      .fontColor($r('[basic].color.text_primary'))
      .onClick(async () => { await this.handleDeleteAccount() })
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
      const payload: UpdatePayload = { username: name, wxid, school_id: currentSchoolId }
      const res = await updateProfile(payload, token)
      if (!res.success) { promptAction.showToast({ message: res.message ?? '更新失败' }); return }
      // 本地更新用户快照，避免下次进入用旧学校
      this.appUser.user.school_id = currentSchoolId
      this.appUser.user.school_name = this.selectedSchoolVM.name ?? ''
      const avatarNow: string = typeof this.appUser.user.avatar_url === 'string' ? this.appUser.user.avatar_url as string : ''
      const localPersist: UserInfo = {
        id: this.appUser.user.id,
        token: this.appUser.user.token,
        avatar_url: avatarNow,
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

  private async handleDeleteAccount() {
    const token = this.appUser.user.token
    if (!token) { promptAction.showToast({ message: '请先登录' }); return }
    try {
      const res = await deleteAccount(token)
      if (!res.success) { promptAction.showToast({ message: res.message ?? '注销失败' }); return }
      userPersistence.clearUser()
      promptAction.showToast({ message: '已注销' })
      HMRouterMgr.push({ pageUrl: PAGE_PATH.LOGIN_PAGE })
    } catch (_e) { promptAction.showToast({ message: '网络错误' }) }
  }

  private async handleUploadAvatar() {
    promptAction.showToast({ message: '请使用“图库选择”按钮选择头像' })
  }

  private async handlePickAvatarFromGallery() {
    const picker = new photoAccessHelper.PhotoViewPicker()
    const options = { MIMEType: photoAccessHelper.PhotoViewMIMETypes.IMAGE_TYPE, maxSelectNumber: 1 } as photoAccessHelper.PhotoSelectOptions
    const context = (this.getUIContext().getHostContext() as common.UIAbilityContext)
    const cacheDir: string = context.cacheDir
    picker.select(options, async (_err: BusinessError | undefined, result: photoAccessHelper.PhotoSelectResult) => {
      const uri = (result?.photoUris && result.photoUris.length > 0) ? result.photoUris[0] : ''
      if (!uri) { return }
      try {
        const file = fs.openSync(uri, fs.OpenMode.READ_ONLY)
        const target: string = `${cacheDir}/avatar_${Date.now()}.jpeg`
        fs.copyFileSync(file.fd, target)
        fs.closeSync(file.fd)
        this.avatarCachePath = target
        this.avatarCacheUri = `internal://cache/${target.split('/').pop()}`
        // 不再使用原始 URI 作为预览，等待 COS 返回的正式 URL
        // 使用系统 request.uploadFile 上传到 COS（与原始实现一致）
        const token = this.appUser.user.token
        if (token) {
          const imageUrl = await this.uploadAvatarAndGetUrl(this.avatarCacheUri)
          if (imageUrl && imageUrl.length > 0 && imageUrl !== this.getCurrentAvatarUrl()) {
            const payload: UpdatePayload = {
              username: this.appUser.user.username ?? '',
              avatar_url: imageUrl,
              wxid: this.appUser.user.wxid ?? '',
              school_id: Number(this.appUser.user.school_id ?? 1)
            }
            const saved = await updateProfile(payload, token)
            if (saved.success) { this.appUser.user.avatar_url = imageUrl; this.avatarPreviewUrl = imageUrl; promptAction.showToast({ message: '头像已更新' }) }
            else { promptAction.showToast({ message: saved.message ?? '头像更新失败' }) }
          } else {
            promptAction.showToast({ message: '头像上传失败' })
          }
        }
      } catch (_e) {
        promptAction.showToast({ message: '复制失败' })
      }
    })
  }

  private getCurrentAvatarUrl(): string {
    const prev = this.avatarPreviewUrl
    if (prev && prev.length > 0) { return prev }
    const raw = this.appUser.user.avatar_url ?? ''
    return typeof raw === 'string' ? raw : ''
  }

  private handleLogout() {
    userPersistence.clearUser()
    const nowTick: number = Date.now()
    AppStorage.setOrCreate('reload_home_now', nowTick)
    promptAction.showToast({ message: '已退出登录' })
    HMRouterMgr.push({ pageUrl: PAGE_PATH.LOGIN_PAGE })
  }

  private getAvatarSource(url: string): ResourceStr {
    if (!url) { return $r('[basic].media.ic_public_user') }
    return url as ResourceStr
  }
  private async uploadAvatarAndGetUrl(cacheUri: string): Promise<string> {
    return new Promise<string>((resolve) => {
      const header = new Map<Object, string>()
      header.set('Content-Type', 'multipart/form-data')
      const files: Array<request.File> = [{ name: 'image0.jpeg', filename: 'image0.jpeg', uri: cacheUri, type: 'image' }]
      const data: Array<request.RequestData> = [{ name: 'type', value: 'avatar' }, { name: 'username', value: this.appUser.user.username ?? 'user' }]
      const uploadConfig: request.UploadConfig = { url: `${GlobalVariable.BASE_URL}/uploads/upload-image`, header, method: 'POST', files, data }
      try {
        request.uploadFile((this.getUIContext().getHostContext() as common.UIAbilityContext), uploadConfig, (error: Error | undefined, task) => {
          if (task) {
            task.on('complete', (states: Object) => {
              const arr = states as Array<UploadTaskState>
              for (let i = 0; i < arr.length; i++) {
                const dataStr = (arr[i].data as string) ?? ''
                try {
                  const parsed = JSON.parse(dataStr) as UploadImageResponse
                  if (parsed.success && parsed.imageUrl) { resolve(parsed.imageUrl); return }
                } catch (_e) {}
              }
              resolve(this.getCurrentAvatarUrl())
            })
          } else { resolve(this.getCurrentAvatarUrl()) }
        })
      } catch (_e) { resolve(this.getCurrentAvatarUrl()) }
    })
  }

}

interface EditSchoolLogView {
  phase: string
  school_id: number
  school_name: string
  version?: number
}

interface UploadImageResponse { success: boolean; imageUrl?: string }
interface UploadTaskState { data?: string }
