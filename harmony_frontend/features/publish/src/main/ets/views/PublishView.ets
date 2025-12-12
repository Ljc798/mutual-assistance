import promptAction from '@ohos.promptAction'
import { AppStorageV2 } from '@kit.ArkUI'
import {
  AppSafeArea,
  AppSelectedSchool,
  AppUser,
  PAGE_PATH,
  SCHOOL_SELECTION_VERSION_KEY,
  TaskMode,
  schoolPersistence,
  AppSchoolPickerContext
} from 'basic'
import {
  PublishCategory,
  PublishFormModel,
  PublishMethod,
  PUBLISH_CATEGORIES,
  PublishCreatePayload
} from '../viewmodels/PublishTypes'
import { calculateCommission, createTask, prepayAliTask, prepayHuaweiTask } from '../services/PublishService'
import { AliPaySDK, AliPayPayResult } from 'basic'
import { paymentService } from '@kit.PaymentKit'
import { BusinessError } from '@kit.BasicServicesKit'
import { common } from '@kit.AbilityKit'
import { HMRouterMgr } from '@hadss/hmrouter'
import { aggregatedPaymentService, CashierPicker, PaymentType } from 'aggregated_payment';

interface AliPrepayData {
  orderInfo?: string;
  orderStr?: string
}

interface AliPrepayPayload extends AliPrepayData { paymentUrl?: string }

interface HuaweiPrepayPayload {
  orderStr?: string
}

@Component
export struct PublishView {
  private readonly scroller: Scroller = new Scroller()
  safeArea: AppSafeArea = AppStorageV2.connect(AppSafeArea, () => new AppSafeArea())!
  private readonly appUser: AppUser = AppStorageV2.connect(AppUser, () => new AppUser())!
  private readonly schoolSelection: AppSelectedSchool =
    AppStorageV2.connect(AppSelectedSchool, () => new AppSelectedSchool())!
  @StorageLink(SCHOOL_SELECTION_VERSION_KEY) schoolVersion: number = 0
  private lastSyncedVersion: number = 0
  private hasMounted: boolean = false
  form: PublishFormModel = new PublishFormModel()
  @State selectedSchoolId: number = 0
  @State selectedSchoolName: string = '请选择学校'
  @State showCategoryDialog: boolean = false
  @State isPublishDisabled: boolean = true
  @State showTakeCodeField: boolean = false
  @State showTakeAwayField: boolean = false
  @State isTakeTelValid: boolean = true
  @State isSubmittingPublish: boolean = false
  @State showPayDialog: boolean = false
  @State payParamsText: string = ''
  @State payAmount: string = ''
  @State outTradeNo: string = ''
  private readonly abilityCtx: common.UIAbilityContext =
    (this.getUIContext()!.getHostContext() as common.UIAbilityContext)
  private paymentCbId: string = ''

  aboutToAppear() {
    this.hasMounted = true
    this.lastSyncedVersion = this.schoolVersion
    this.syncSelectedSchool()
    if (!this.paymentCbId) {
      this.paymentCbId = aggregatedPaymentService.registerPaymentCallback((type: PaymentType, ok: boolean) => {
        if (type === PaymentType.ALIPAY || type === PaymentType.HUAWEI) {
          if (ok) {
            promptAction.showToast({ message: '发布成功' })
            this.resetForm()
            const nowTick: number = Date.now()
            // 触发首页刷新
            AppStorage.setOrCreate('reload_home_now', nowTick)
            HMRouterMgr.push({ pageUrl: PAGE_PATH.MAIN_PAGE })
          } else {
            promptAction.showToast({ message: '支付未完成' })
          }
        }
      })
    }
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
            Column({ space: 6 }) {
              Row({ space: 4 }) {
                Text('任务标题')
                  .fontSize(15)
                  .fontColor($r('[basic].color.text_primary'))
              }
              TextInput({ placeholder: '请输入任务标题(取件请标注大/中/小件)', text: this.form.title })
                .placeholderColor($r('[basic].color.text_secondary'))
                .placeholderFont({ size: 13 })
                .caretColor($r('[basic].color.text_primary'))
                .fontColor($r('[basic].color.text_primary'))
                .height(44)
                .backgroundColor($r('[basic].color.white'))
                .borderRadius(14)
                .padding({ left: 12, right: 12 })
                .onChange((val: string) => { this.form.title = val; this.handleFormUpdated() })
            }
            if (this.showTakeCodeField) {
              Column({ space: 6 }) {
                Row({ space: 4 }) {
                  Text('快递取件码')
                    .fontSize(15)
                    .fontColor($r('[basic].color.text_primary'))
                }
                TextInput({ placeholder: '请输入取件码(仅对接单员可见)', text: this.form.takeCode })
                  .placeholderColor($r('[basic].color.text_secondary'))
                  .placeholderFont({ size: 13 })
                  .caretColor($r('[basic].color.text_primary'))
                  .fontColor($r('[basic].color.text_primary'))
                  .height(44)
                  .backgroundColor($r('[basic].color.white'))
                  .borderRadius(14)
                  .padding({ left: 12, right: 12 })
                  .onChange((val: string) => { this.form.takeCode = val; this.handleFormUpdated() })
              }
            }
            if (this.showTakeAwayField) {
              Column({ space: 6 }) {
                Row({ space: 4 }) {
                  Text('外卖姓名')
                    .fontSize(15)
                    .fontColor($r('[basic].color.text_primary'))
                }
                TextInput({ placeholder: '请输入外卖姓名(仅对接单员可见)', text: this.form.takeName })
                  .placeholderColor($r('[basic].color.text_secondary'))
                  .placeholderFont({ size: 13 })
                  .caretColor($r('[basic].color.text_primary'))
                  .fontColor($r('[basic].color.text_primary'))
                  .height(44)
                  .backgroundColor($r('[basic].color.white'))
                  .borderRadius(14)
                  .padding({ left: 12, right: 12 })
                  .onChange((val: string) => { this.form.takeName = val; this.handleFormUpdated() })
              }
              Column({ space: 6 }) {
                Row({ space: 4 }) {
                  Text('手机尾号')
                    .fontSize(15)
                    .fontColor($r('[basic].color.text_primary'))
                  if (!this.isTakeTelValid) {
                    Text('请输入4位数字')
                      .fontSize(13)
                      .fontColor('#FF4D4F')
                  }
                }
                TextInput({ placeholder: '请输入手机尾号(仅对接单员可见)', text: this.form.takeTel })
                  .placeholderColor($r('[basic].color.text_secondary'))
                  .placeholderFont({ size: 13 })
                  .caretColor($r('[basic].color.text_primary'))
                  .fontColor($r('[basic].color.text_primary'))
                  .height(44)
                  .backgroundColor($r('[basic].color.white'))
                  .borderRadius(14)
                  .padding({ left: 12, right: 12 })
                  .onChange((val: string) => { this.form.takeTel = val; this.isTakeTelValid = val.length === 0 || /^\d{4}$/.test(val); this.handleFormUpdated() })
              }
            }
            this.renderDateRow()
            Column({ space: 6 }) {
              Row({ space: 4 }) {
                Text('交易地点')
                  .fontSize(15)
                  .fontColor($r('[basic].color.text_primary'))
              }
              TextInput({ placeholder: '请输入交易地点/线上交易', text: this.form.position })
                .placeholderColor($r('[basic].color.text_secondary'))
                .placeholderFont({ size: 13 })
                .caretColor($r('[basic].color.text_primary'))
                .fontColor($r('[basic].color.text_primary'))
                .height(44)
                .backgroundColor($r('[basic].color.white'))
                .borderRadius(14)
                .padding({ left: 12, right: 12 })
                .onChange((val: string) => { this.form.position = val; this.handleFormUpdated() })
            }
            Column({ space: 6 }) {
              Row({ space: 4 }) {
                Text('送达地点')
                  .fontSize(15)
                  .fontColor($r('[basic].color.text_primary'))
              }
              TextInput({ placeholder: '请输入交付地点/线上交易', text: this.form.address })
                .placeholderColor($r('[basic].color.text_secondary'))
                .placeholderFont({ size: 13 })
                .caretColor($r('[basic].color.text_primary'))
                .fontColor($r('[basic].color.text_primary'))
                .height(44)
                .backgroundColor($r('[basic].color.white'))
                .borderRadius(14)
                .padding({ left: 12, right: 12 })
                .onChange((val: string) => { this.form.address = val; this.handleFormUpdated() })
            }
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
      this.renderPayDialog()
    }
    .height('100%')
    .backgroundColor($r('[basic].color.page_background'))
  }

  aboutToDisappear() {
    if (this.paymentCbId) {
      aggregatedPaymentService.unregisterPaymentCallback(this.paymentCbId)
      this.paymentCbId = ''
    }
  }

  @Builder
  private renderCategorySelector() {
    Column({ space: 6 }) {
      Text('任务分类')
        .fontSize(15)
        .fontColor($r('[basic].color.text_primary'))
        .margin({ top: 10 })
      Row() {
        Text(this.form.category || '请选择任务分类')
          .fontSize(14)
          .fontColor(this.form.category ? $r('[basic].color.text_primary') : $r('[basic].color.text_secondary'))
      }
      .padding({
        left: 14,
        right: 14,
        top: 14,
        bottom: 14
      })
      .width('100%')
      .backgroundColor($r('[basic].color.white'))
      .borderRadius(16)
      .onClick((): void => {
        this.showCategoryDialog = true
      })
    }
  }

  @Builder
  private renderTextField(label: string, placeholder: string, value: string, onChange: (value: string) => void,
    errorText?: string) {
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
                const yearValue: number = value.year ?? 0
                const monthValue: number = (value.month ?? 0) + 1;
                const dayValue: number = value.day ?? 1
                const year: string = yearValue.toString().padStart(4, '0')
                const month: string = monthValue.toString().padStart(2, '0')
                const day: string = dayValue.toString().padStart(2, '0')
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
                ? new Date(0, 0, 0, Number.parseInt(this.form.deadlineTime.substring(0, 2)),
                  Number.parseInt(this.form.deadlineTime.substring(3, 5)))
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
        .type(InputType.NUMBER_DECIMAL)
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
      .onClick((): void => {
        this.handlePublish()
      })
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
    const takeAwayOk =
      !requireTakeAway || (!!this.form.takeName && this.form.takeTel.length === 4 && this.isTakeTelValid)
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
    this.submitTask('vip')
  }

  private async submitTask(method: PublishMethod): Promise<void> {
    const userId = this.appUser.user.id
    const token = this.appUser.user.token
    if (!userId || !token) {
      promptAction.showToast({ message: '请先登录' })
      return
    }
    const isPayPublish: boolean = false
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
      if (this.form.mode === 'fixed') {
        const taskId: number = Number(response.task_id ?? 0)
        if (!taskId) { promptAction.showToast({ message: '发布成功但任务ID异常' }); return }
        const ui = this.getUIContext()!
        const picker = new CashierPicker(ui)
        const amountFen: number = Math.round(Number(this.form.reward) * 100)
        await picker
          .reset()
          .setAmount(amountFen)
          .setTradeSummary('任务发布支付')
          .onRealPayment(async (type: PaymentType) => {
            if (type === PaymentType.ALIPAY) {
              const res = await prepayAliTask(taskId, false, token)
              if (!res.success || !res.data) { promptAction.showToast({ message: res.message ?? '预下单失败' }); return }
              const objText: string = JSON.stringify(res.data)
              const data: AliPrepayPayload = JSON.parse(objText) as AliPrepayPayload
              const orderInfo: string = String((data.orderInfo ?? data.orderStr ?? ''))
              if (!orderInfo) { promptAction.showToast({ message: '支付参数缺失: orderInfo' }); return }
              aggregatedPaymentService.requestPaymentByAliPay({ orderInfo })
              picker.close()
            } else if (type === PaymentType.HUAWEI) {
              const res = await prepayHuaweiTask(taskId, false, token)
              if (!res.success || !res.data) { promptAction.showToast({ message: res.message ?? '预下单失败' }); return }
              const objText: string = JSON.stringify(res.data)
              const data: HuaweiPrepayPayload = JSON.parse(objText) as HuaweiPrepayPayload
              const orderStr: string = String(data.orderStr ?? '')
              if (!orderStr) { promptAction.showToast({ message: '支付参数缺失: orderStr' }); return }
              aggregatedPaymentService.requestPaymentByHuawei(ui, { orderStr })
              picker.close()
            } else {
              promptAction.showToast({ message: '当前仅支持支付宝和华为支付' })
            }
          })
          .open()
      } else {
        promptAction.showToast({ message: '发布成功' })
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
    this.showPayDialog = false
    this.handleFormUpdated()
  }

  private handleCategorySelected(category: PublishCategory) {
    this.form.category = category
    this.showCategoryDialog = false
    this.handleFormUpdated()
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
  private renderPayDialog() {
    if (this.showPayDialog) {
      Column() {
        Column({ space: 12 }) {
          Text('预下单成功：打开支付台完成支付')
            .fontSize(18)
            .fontWeight(FontWeight.Medium)
          Text(`订单号：${this.outTradeNo}`)
            .fontSize(13)
            .fontColor($r('[basic].color.text_secondary'))
          Text(`支付金额：¥${this.payAmount}`)
            .fontSize(16)
            .fontWeight(FontWeight.Medium)
            .fontColor($r('[basic].color.text_primary'))
          Row({ space: 12 }) {
            Button('支付宝支付')
              .height(40)
              .borderRadius(14)
              .backgroundColor($r('[basic].color.filter_active_bg'))
              .fontColor($r('[basic].color.white'))
              .onClick(() => {
                this.tryNativePay()
              })
            Button('关闭')
              .height(40)
              .borderRadius(14)
              .backgroundColor($r('[basic].color.search_box_bg'))
              .onClick(() => {
                this.showPayDialog = false;
                this.resetForm()
              })
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
      const data: AliPrepayPayload = JSON.parse(this.payParamsText) as AliPrepayPayload
      const paymentUrl: string = String(data.paymentUrl ?? '')
      const info: paymentService.PaymentInfo =
        { tradeSummary: '任务发布支付', amount: Math.round(Number(this.payAmount || '0') * 100), currency: 'CNY' }
      paymentService.cashierPicker(this.abilityCtx, info).then(() => {
        const orderStr = JSON.stringify({
          nextAction: 'L',
          linkUrl: paymentUrl,
          scheme: 'alipays://platformapi/startapp?appId=20000067&url=',
          clientToken: ''
        })
        paymentService.requestPayment(this.abilityCtx, orderStr, 'AP').then(() => {
          this.showPayDialog = false
        }).catch(() => {
        })
      }).catch(() => {
      })
    } catch (_e) {
      promptAction.showToast({ message: '支付参数解析失败' })
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
                .fontColor(this.form.category === item ? $r('[basic].color.filter_active_bg') :
                  $r('[basic].color.text_primary'))
            }
            .width('100%')
            .padding({
              left: 16,
              right: 16,
              top: 12,
              bottom: 12
            })
            .backgroundColor(this.form.category === item ? '#1AFF6B8B' : $r('[basic].color.white'))
            .borderRadius(12)
            .onClick((): void => {
              this.handleCategorySelected(item)
            })
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
      .onClick((): void => {
        this.showCategoryDialog = false
      })

    } else {
      Blank()
    }
  }
}
