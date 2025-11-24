import promptAction from '@ohos.promptAction'
import { AppStorageV2 } from '@kit.ArkUI'
import { AppSafeArea, AppSelectedSchool, AppUser, PAGE_PATH, SCHOOL_SELECTION_VERSION_KEY, TaskMode, schoolPersistence,
  AppSchoolPickerContext } from 'basic'
import { PublishCategory, PublishFormModel, PublishMethod, PUBLISH_CATEGORIES, PublishCreatePayload } from '../viewmodels/PublishTypes'
import { calculateCommission, createTask, prepayAliTask } from '../services/PublishService'
import { AliPaySDK, AliPayPayResult } from 'basic'
import { HMRouterMgr } from '@hadss/hmrouter'
interface AliPrepayData { orderInfo?: string; orderStr?: string }

@Component
export struct PublishView {
  private readonly scroller: Scroller = new Scroller()
  safeArea: AppSafeArea = AppStorageV2.connect(AppSafeArea, () => new AppSafeArea())!
  private readonly appUser: AppUser = AppStorageV2.connect(AppUser, () => new AppUser())!
  private readonly schoolSelection: AppSelectedSchool = AppStorageV2.connect(AppSelectedSchool, () => new AppSelectedSchool())!
  @StorageLink(SCHOOL_SELECTION_VERSION_KEY) schoolVersion: number = 0
  private lastSyncedVersion: number = 0
  private hasMounted: boolean = false

  form: PublishFormModel = new PublishFormModel()
  @State selectedSchoolId: number = 0
  @State selectedSchoolName: string = '请选择学校'
  @State showCategoryDialog: boolean = false
  @State showCommissionPopup: boolean = false
  @State commissionAmount: string = '0.00'
  @State isPublishDisabled: boolean = true
  @State showTakeCodeField: boolean = false
  @State showTakeAwayField: boolean = false
  @State isTakeTelValid: boolean = true
  @State isSubmittingPublish: boolean = false
  @State showPayDialog: boolean = false
  @State payParamsText: string = ''

  aboutToAppear() {
    this.hasMounted = true
    this.lastSyncedVersion = this.schoolVersion
    this.syncSelectedSchool()
  }

  aboutToRender() {
    this.syncSelectedSchool()
  }

  build() {
    Stack() {
      Column() {
        Column() {
          Row() {
            Text('发布任务')
              .fontSize(24)
              .fontWeight(FontWeight.Bold)
              .fontColor($r('[basic].color.white'));
            Blank();
            Row() {
              Image($r('app.media.icon_ditu'))
                .width(18)
                .height(18)
                .margin({ right: 4 });
              Text(this.schoolSelection.name?.length > 0 ? this.schoolSelection.name : '请选择学校')
                .fontSize(16)
                .fontColor($r('[basic].color.white'))
                .fontWeight(FontWeight.Regular)
                .onClick(() => {
                  const ctx = AppStorageV2.connect(AppSchoolPickerContext, () => new AppSchoolPickerContext())!
                  ctx.target = 'browse'
                  this.handleSchoolTap()
                });
            }
            .alignItems(VerticalAlign.Center);
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
        Scroll(this.scroller) {
          Column({ space: 16 }) {
            this.renderCategorySelector()
            this.renderTextField('任务标题', '请输入任务标题(取件请标注大/中/小件)', this.form.title, (value: string) => {
              this.form.title = value
              this.handleFormUpdated()
            })
            if (this.showTakeCodeField) {
              this.renderTextField('快递取件码', '请输入取件码(仅对接单员可见)', this.form.takeCode, (value: string) => {
                this.form.takeCode = value
                this.handleFormUpdated()
              })
            }
            if (this.showTakeAwayField) {
              this.renderTextField('外卖姓名', '请输入外卖姓名(仅对接单员可见)', this.form.takeName, (value: string) => {
                this.form.takeName = value
                this.handleFormUpdated()
              })
              this.renderTextField('手机尾号', '请输入手机尾号(仅对接单员可见)', this.form.takeTel, (value: string) => {
                this.form.takeTel = value
                this.isTakeTelValid = value.length === 0 || /^\d{4}$/.test(value)
                this.handleFormUpdated()
              }, !this.isTakeTelValid ? '请输入4位数字' : undefined)
            }
            this.renderDateRow()
            this.renderTextField('交易地点', '请输入交易地点/线上交易', this.form.position, (value: string) => {
              this.form.position = value
              this.handleFormUpdated()
            })
            this.renderTextField('送达地点', '请输入交付地点/线上交易', this.form.address, (value: string) => {
              this.form.address = value
              this.handleFormUpdated()
            })
            this.renderDetailField()
            this.renderModeSwitch()
            this.renderRewardField()
            this.renderHint()
            this.renderPublishButton()
          }
          .padding({
            left: 16,
            right: 16,
            top: 0,
            bottom: 80 + this.safeArea.bottomHeight
          })
        }
        .scrollBar(BarState.Off)
      }
      this.renderCategoryDialog()
      this.renderCommissionPopup()
      this.renderPayDialog()
    }
    .height('100%')
    .backgroundColor($r('[basic].color.page_background'))
  }

  @Builder
  private renderCategorySelector() {
    Column({ space: 6 }) {
      Text('任务分类')
        .fontSize(15)
        .fontColor($r('[basic].color.text_primary'))
        .margin({top: 10})
      Row() {
        Text(this.form.category || '请选择任务分类')
          .fontSize(14)
          .fontColor(this.form.category ? $r('[basic].color.text_primary') : $r('[basic].color.text_secondary'))
      }
      .padding({ left: 14, right: 14, top: 14, bottom: 14 })
      .width('100%')
      .backgroundColor($r('[basic].color.white'))
      .borderRadius(16)
      .onClick((): void => {
        this.showCategoryDialog = true
      })
    }
  }

  @Builder
  private renderTextField(label: string, placeholder: string, value: string, onChange: (value: string) => void, errorText?: string) {
    Column({ space: 6 }) {
      Row({ space: 4 }) {
        Text(label)
          .fontSize(15)
          .fontColor($r('[basic].color.text_primary'))
        if (errorText) {
          Text(errorText)
            .fontSize(13)
            .fontColor('#FF4D4F')
        }
      }
      TextInput({ placeholder, text: value })
        .placeholderColor($r('[basic].color.text_secondary'))
        .placeholderFont({ size: 13 })
        .caretColor($r('[basic].color.text_primary'))
        .fontColor($r('[basic].color.text_primary'))
        .height(44)
        .backgroundColor($r('[basic].color.white'))
        .borderRadius(14)
        .padding({ left: 12, right: 12 })
        .onChange((val: string) => onChange(val))
    }
  }

  @Builder
  private renderDateRow() {
    Row({ space: 12 }) {
      Column({ space: 6 }) {
        Text('预期完成日期')
          .fontSize(15)
          .fontColor($r('[basic].color.text_primary'))
        Button(this.form.deadlineDate ? this.form.deadlineDate : '请选择日期')
          .height(44)
          .borderRadius(14)
          .backgroundColor($r('[basic].color.white'))
          .fontColor(this.form.deadlineDate ? $r('[basic].color.text_primary') : $r('[basic].color.text_secondary'))
          .onClick((): void => {
            DatePickerDialog.show({
              start: new Date(2024, 0, 1),
              end: new Date(2030, 11, 31),
              selected: this.form.deadlineDate
                ? new Date(
                    Number.parseInt(this.form.deadlineDate.substring(0, 4)),
                    Number.parseInt(this.form.deadlineDate.substring(5, 7)) - 1,
                    Number.parseInt(this.form.deadlineDate.substring(8, 10))
                  )
                : undefined,
              onAccept: (value: DatePickerResult) => {
                const yearValue = value.year ?? 0
                const monthValue = value.month ?? 1
                const dayValue = value.day ?? 1
                const year = yearValue.toString().padStart(4, '0')
                const month = monthValue.toString().padStart(2, '0')
                const day = dayValue.toString().padStart(2, '0')
                this.form.deadlineDate = `${year}-${month}-${day}`
                this.updateDeadline()
                this.handleFormUpdated()
              }
            })
          })
      }
      Column({ space: 6 }) {
        Text('选择时间')
          .fontSize(15)
          .fontColor($r('[basic].color.text_primary'))
        Button(this.form.deadlineTime ? this.form.deadlineTime : '请选择时间')
          .height(44)
          .borderRadius(14)
          .backgroundColor($r('[basic].color.white'))
          .fontColor(this.form.deadlineTime ? $r('[basic].color.text_primary') : $r('[basic].color.text_secondary'))
          .onClick((): void => {
            TimePickerDialog.show({
              selected: this.form.deadlineTime
                ? new Date(0, 0, 0, Number.parseInt(this.form.deadlineTime.substring(0, 2)), Number.parseInt(this.form.deadlineTime.substring(3, 5)))
                : undefined,
              onAccept: (value: TimePickerResult) => {
                const hour = value.hour.toString().padStart(2, '0')
                const minute = value.minute.toString().padStart(2, '0')
                this.form.deadlineTime = `${hour}:${minute}`
                this.updateDeadline()
                this.handleFormUpdated()
              }
            })
          })
      }
    }
  }

  @Builder
  private renderDetailField() {
    Column({ space: 6 }) {
      Text('任务简介')
        .fontSize(15)
        .fontColor($r('[basic].color.text_primary'))
      TextArea({ placeholder: '请输入任务简介并留下联系方式(联系方式仅对接单员可见)', text: this.form.detail })
        .height(120)
        .backgroundColor($r('[basic].color.white'))
        .borderRadius(16)
        .padding(12)
        .fontColor($r('[basic].color.text_primary'))
        .placeholderColor($r('[basic].color.text_secondary'))
        .onChange((value: string) => {
          this.form.detail = value
          this.handleFormUpdated()
        })
    }
  }

  @Builder
  private renderModeSwitch() {
    Column({ space: 8 }) {
      Text('任务模式')
        .fontSize(15)
        .fontColor($r('[basic].color.text_primary'))
      Row({ space: 12 }) {
        this.renderModeButton('💰 一口价', 'fixed')
        this.renderModeButton('🏷️ 竞价', 'bidding')
      }
    }
  }

  @Builder
  private renderModeButton(label: string, mode: TaskMode) {
    Button(label)
      .layoutWeight(1)
      .height(40)
      .fontSize(14)
      .borderRadius(14)
      .backgroundColor(this.form.mode === mode ? $r('[basic].color.filter_active_bg') : $r('[basic].color.white'))
      .fontColor(this.form.mode === mode ? $r('[basic].color.white') : $r('[basic].color.text_primary'))
      .onClick((): void => {
        this.form.mode = mode
        this.handleFormUpdated()
      })
  }

  @Builder
  private renderRewardField() {
    Column({ space: 6 }) {
      Text('任务报价 (元)')
        .fontSize(15)
        .fontColor($r('[basic].color.text_primary'))
      TextInput({ placeholder: '请输入金额', text: this.form.reward })
        .height(44)
        .borderRadius(14)
        .backgroundColor($r('[basic].color.white'))
        .padding({ left: 12, right: 12 })
        .placeholderColor($r('[basic].color.text_secondary'))
        .onChange((value: string) => {
          this.form.reward = value
          this.handleFormUpdated()
        })
    }
  }

  @Builder
  private renderHint() {
    Column({ space: 8 }) {
      Text(`📍 当前发布任务所处学校：${this.getSelectedSchoolName()}`)
        .fontSize(12)
        .fontColor($r('[basic].color.text_secondary'))
    }
  }

  @Builder
  private renderPublishButton() {
    Button(this.isSubmittingPublish ? '发布中...' : '🚀 发布任务')
      .margin({ left: 16, right: 16, bottom: 16 })
      .height(48)
      .backgroundColor(this.isPublishDisabled ? '#FFD9E1' : $r('[basic].color.filter_active_bg'))
      .fontColor($r('[basic].color.white'))
      .borderRadius(24)
      .enabled(!this.isPublishDisabled && !this.isSubmittingPublish)
      .onClick((): void => { this.handlePublish() })
  }

  private updateDeadline() {
    if (this.form.deadlineDate && this.form.deadlineTime) {
      this.form.deadline = `${this.form.deadlineDate} ${this.form.deadlineTime}`
    }
  }

  private handleFormUpdated(): void {
    const hasBasics = Boolean(
      this.form.title &&
      this.form.detail &&
      this.form.category &&
      this.form.reward &&
      this.form.deadline &&
      this.form.position &&
      this.form.address
    )
    const requireTakeCode = this.form.category === '代拿快递'
    const requireTakeAway = this.form.category === '代拿外卖'
    const expressOk = !requireTakeCode || !!this.form.takeCode
    const takeAwayOk = !requireTakeAway || (!!this.form.takeName && this.form.takeTel.length === 4 && this.isTakeTelValid)
    const rewardValue = Number.parseFloat(this.form.reward)
    const isValid = hasBasics && expressOk && takeAwayOk && !Number.isNaN(rewardValue) && rewardValue > 0
    this.isPublishDisabled = !isValid
    this.showTakeCodeField = requireTakeCode
    this.showTakeAwayField = requireTakeAway
  }

  private handlePublish(): void {
    if (this.isPublishDisabled) {
      promptAction.showToast({ message: '请完善任务信息' })
      return
    }
    const userId = this.appUser.user.id
    const token = this.appUser.user.token
    if (!userId || !token) {
      promptAction.showToast({ message: '请先登录' })
      return
    }
    if (this.getSelectedSchoolId() <= 0) {
      promptAction.showToast({ message: '请选择学校后再发布' })
      return
    }
    const rewardValue = Number.parseFloat(this.form.reward)
    const commissionFen = calculateCommission(rewardValue)
    this.commissionAmount = (commissionFen / 100).toFixed(2)
    this.showCommissionPopup = true
  }

  private async submitTask(method: PublishMethod): Promise<void> {
    const userId = this.appUser.user.id
    const token = this.appUser.user.token
    if (!userId || !token) {
      promptAction.showToast({ message: '请先登录' })
      return
    }
    const isPayPublish: boolean = method === 'pay'
    const schoolId = this.getSelectedSchoolId()
    if (schoolId <= 0) {
      promptAction.showToast({ message: '请选择学校后再发布' })
      return
    }
    this.isSubmittingPublish = true
    try {
      const payload: PublishCreatePayload = {
        employer_id: userId,
        school_id: schoolId,
        category: this.form.category,
        position: this.form.position,
        address: this.form.address,
        DDL: this.form.deadline,
        title: this.form.title,
        offer: Number.parseFloat(this.form.reward),
        detail: this.form.detail,
        takeaway_code: this.form.takeCode,
        takeaway_tel: this.form.takeTel || undefined,
        takeaway_name: this.form.takeName,
        publish_method: method,
        mode: this.form.mode,
        status: 0
      }
      const response = await createTask(payload, token)
      if (!response.success) {
        promptAction.showToast({ message: response.message ?? '发布失败' })
        return
      }
      if (isPayPublish && this.form.mode === 'fixed') {
        const taskId: number = Number(response.task_id ?? 0)
        if (!taskId) { promptAction.showToast({ message: '发布成功但任务ID异常' }); return }
        const prepayRes = await prepayAliTask(taskId, true, token)
        if (!prepayRes.success || !prepayRes.data) { promptAction.showToast({ message: prepayRes.message ?? '预下单失败' }); return }
        const objText: string = JSON.stringify(prepayRes.data)
        this.payParamsText = objText
        const parsed: AliPrepayData = JSON.parse(objText) as AliPrepayData
        const orderInfoRaw: string = (parsed.orderInfo ?? parsed.orderStr ?? '')
        if (orderInfoRaw.length > 0) {
          const r: AliPayPayResult = await AliPaySDK.pay({ orderInfo: orderInfoRaw, showLoading: true })
          promptAction.showToast({ message: r.resultStatus === '9000' ? '支付成功' : '支付未完成' })
        } else {
          this.showPayDialog = true
        }
        this.resetForm()
      } else {
        promptAction.showToast({ message: '发布成功' })
        this.resetForm()
      }
    } catch (error) {
      console.error('publish failed', JSON.stringify(error))
      promptAction.showToast({ message: '发布失败，请稍后重试' })
    } finally {
      this.isSubmittingPublish = false
    }
  }

  private resetForm() {
    this.form.category = ''
    this.form.title = ''
    this.form.detail = ''
    this.form.takeCode = ''
    this.form.takeName = ''
    this.form.takeTel = ''
    this.form.position = ''
    this.form.address = ''
    this.form.reward = ''
    this.form.deadlineDate = ''
    this.form.deadlineTime = ''
    this.form.deadline = ''
    this.form.mode = 'fixed'
    this.showTakeCodeField = false
    this.showTakeAwayField = false
    this.isTakeTelValid = true
    this.isPublishDisabled = true
  }

  private handleCategorySelected(category: PublishCategory) {
    this.form.category = category
    this.showCategoryDialog = false
    this.handleFormUpdated()
  }

  private async handleCommissionSelection(method: PublishMethod): Promise<void> {
    this.showCommissionPopup = false
    await this.submitTask(method)
  }

  private syncSelectedSchool(): void {
    const snapshot = schoolPersistence.getSelection()
    const id = snapshot.id
    const name = snapshot.name
    const normalizedId: number = typeof id === 'number' && id > 0 && name.length > 0 ? id : 0
    const normalizedName: string = normalizedId > 0 ? name : '请选择学校'
    this.selectedSchoolId = normalizedId
    this.selectedSchoolName = normalizedName
  }

  private getSelectedSchoolName(): string {
    const idValue: number = this.schoolSelection.id
    const nameValue: string = this.schoolSelection.name
    const normalizedId: number = typeof idValue === 'number' && idValue > 0 && nameValue.length > 0 ? idValue : 0
    return normalizedId > 0 ? nameValue : '请选择学校'
  }

  private getSelectedSchoolId(): number {
    const idValue: number = this.schoolSelection.id
    const nameValue: string = this.schoolSelection.name
    const normalizedId: number = typeof idValue === 'number' && idValue > 0 && nameValue.length > 0 ? idValue : 0
    return normalizedId
  }

  @Builder
  private renderCommissionPopup() {
    if (this.showCommissionPopup) {
      Column() {
        Column({ space: 12 }) {
          Text('请选择发布方式')
            .fontSize(18)
            .fontWeight(FontWeight.Medium)
            .fontColor($r('[basic].color.text_primary'))
          this.renderCommissionOption('🎁 使用免佣金次数', 'free')
          this.renderCommissionOption(`💰 支付佣金 ¥${this.commissionAmount}`, 'pay')
          this.renderCommissionOption('🌟 使用 VIP 免费发布', 'vip')
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
    } else {
      Blank()
    }
  }

  @Builder
  private renderCommissionOption(label: string, method: PublishMethod) {
    Button(label)
      .width('100%')
      .height(46)
      .borderRadius(16)
      .backgroundColor($r('[basic].color.white'))
      .fontColor($r('[basic].color.text_primary'))
      .border({ color: '#FFE1EB', width: 1 })
      .onClick((): void => { this.handleCommissionSelection(method) })
  }

  @Builder
  private renderPayDialog() {
    if (this.showPayDialog) {
      Column() {
        Column({ space: 12 }) {
          Text('预下单成功')
            .fontSize(18)
            .fontWeight(FontWeight.Medium)
          Text('支付参数如下，可用于调用原生支付：')
            .fontSize(13)
            .fontColor($r('[basic].color.text_secondary'))
          Text(this.payParamsText)
            .fontSize(12)
            .fontColor($r('[basic].color.text_primary'))
            .width('100%')
          Row({ space: 12 }) {
            Button('尝试原生支付')
              .height(40)
              .borderRadius(14)
              .backgroundColor($r('[basic].color.filter_active_bg'))
              .fontColor($r('[basic].color.white'))
              .onClick(() => { this.tryNativePay() })
            Button('关闭')
              .height(40)
              .borderRadius(14)
              .backgroundColor($r('[basic].color.search_box_bg'))
              .onClick(() => { this.showPayDialog = false; this.resetForm() })
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
    } else {
      Blank()
    }
  }

  private tryNativePay() {
    try {
      promptAction.showToast({ message: '已尝试调用原生支付（示例占位）' })
    } catch (_e) {
      promptAction.showToast({ message: '原生支付不可用' })
    }
  }

  private handleSchoolTap() {
    HMRouterMgr.push({
      pageUrl: PAGE_PATH.SCHOOL_PICKER_PAGE
    })
  }

  @Builder
  private renderCategoryDialog() {
    if (this.showCategoryDialog) {
      Column() {
        Column({ space: 10 }) {
          Text('选择任务分类')
            .fontSize(18)
            .fontWeight(FontWeight.Medium)
            .fontColor($r('[basic].color.text_primary'))
          ForEach(PUBLISH_CATEGORIES, (item: PublishCategory) => {
            Row() {
              Text(item)
                .fontSize(15)
                .fontColor(this.form.category === item ? $r('[basic].color.filter_active_bg') : $r('[basic].color.text_primary'))
            }
            .width('100%')
            .padding({ left: 16, right: 16, top: 12, bottom: 12 })
            .backgroundColor(this.form.category === item ? '#1AFF6B8B' : $r('[basic].color.white'))
            .borderRadius(12)
            .onClick((): void => { this.handleCategorySelected(item) })
          }, (item: PublishCategory) => item)
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
      .onClick((): void => { this.showCategoryDialog = false })
    } else {
      Blank()
    }
  }
}
