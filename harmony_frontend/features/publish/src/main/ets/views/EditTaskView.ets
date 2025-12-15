import promptAction from '@ohos.promptAction'
import { AppStorageV2 } from '@kit.ArkUI'
import {
  AppSafeArea,
  AppUser,
  PAGE_PATH,
  TaskMode
} from 'basic'
import {
  PublishCategory,
  PublishFormModel,
  PublishUpdatePayload
} from '../viewmodels/PublishTypes'
import { getTaskDetail, updateTask, prepayAliTask, prepayHuaweiTask } from '../services/PublishService'
import { HMRouter, HMRouterMgr } from '@hadss/hmrouter'
import { aggregatedPaymentService, CashierPicker, PaymentType } from 'aggregated_payment'
import { common } from '@kit.AbilityKit'

interface AliPrepayPayload {
  orderInfo?: string;
  orderStr?: string
  paymentUrl?: string
}

interface HuaweiPrepayPayload {
  orderStr?: string
}

@HMRouter({ pageUrl: 'EditTaskView' })
@Component
export struct EditTaskView {
  private readonly scroller: Scroller = new Scroller()
  safeArea: AppSafeArea = AppStorageV2.connect(AppSafeArea, () => new AppSafeArea())!
  private readonly appUser: AppUser = AppStorageV2.connect(AppUser, () => new AppUser())!

  // Imitating PublishView: Use the model without @State
  // This avoids the "type cannot be @ObservedV2" error
  form: PublishFormModel = new PublishFormModel()

  // State variables to drive the UI
  @State isPublishDisabled: boolean = true
  @State showTakeCodeField: boolean = false
  @State showTakeAwayField: boolean = false
  @State isTakeTelValid: boolean = true
  @State isSubmitting: boolean = false
  @State isLoading: boolean = true // Add loading state to trigger re-render after data load
  
  private taskId: number = 0
  private originalOffer: number = 0
  private isPriceIncreased: boolean = false
  
  // Payment related
  private paymentCbId: string = ''
  @State showPayDialog: boolean = false
  @State payAmount: string = ''
  @State outTradeNo: string = ''

  aboutToAppear() {
    const param = HMRouterMgr.getCurrentParam() as Record<string, Object>
    if (param && param.taskId) {
      this.taskId = Number(param.taskId)
      this.loadTask()
    } else {
      this.isLoading = false
    }

    if (!this.paymentCbId) {
      this.paymentCbId = aggregatedPaymentService.registerPaymentCallback((type: PaymentType, ok: boolean) => {
        if (type === PaymentType.ALIPAY || type === PaymentType.HUAWEI) {
          if (ok) {
            promptAction.showToast({ message: '支付成功' })
            AppStorage.setOrCreate('reload_task_detail_now', Date.now())
            AppStorage.setOrCreate('reload_home_now', Date.now())
            HMRouterMgr.pop({ param: { updated: true } })
          } else {
            promptAction.showToast({ message: '支付未完成，修改已撤销' })
            this.revertTaskUpdate()
          }
        }
      })
    }
  }
  
  aboutToDisappear() {
    if (this.paymentCbId) {
      aggregatedPaymentService.unregisterPaymentCallback(this.paymentCbId)
      this.paymentCbId = ''
    }
  }

  async loadTask() {
    if (this.taskId <= 0) return
    try {
      const task = await getTaskDetail(this.taskId, this.appUser.user.token)
      console.info('EditTaskView loaded task:', JSON.stringify(task))
      
      this.originalOffer = Number(task.offer || 0)

      // Update the model properties directly
      this.form.title = task.title
      this.form.detail = task.detail
      this.form.category = task.category as PublishCategory
      this.form.reward = String(task.offer)
      this.form.position = task.position
      this.form.address = task.address
      this.form.mode = (task.mode === 'bidding' ? 'bidding' : 'fixed') as TaskMode
      this.form.takeCode = task.takeaway_code || ''
      this.form.takeName = task.takeaway_name || ''
      this.form.takeTel = task.takeaway_tel ? String(task.takeaway_tel) : ''
      
      if (task.DDL) {
         const date = new Date(task.DDL)
         const y = date.getFullYear()
         const m = String(date.getMonth() + 1).padStart(2, '0')
         const d = String(date.getDate()).padStart(2, '0')
         const h = String(date.getHours()).padStart(2, '0')
         const min = String(date.getMinutes()).padStart(2, '0')
         this.form.deadlineDate = `${y}-${m}-${d}`
         this.form.deadlineTime = `${h}:${min}`
         this.form.deadline = task.DDL
      }
      
      // Update derived state
      this.handleFormUpdated()
      
      // Toggle loading state to force UI re-render with new data
      this.isLoading = false
      
    } catch (e) {
      console.error('EditTaskView load failed:', JSON.stringify(e))
      promptAction.showToast({ message: '加载任务失败' })
      this.isLoading = false
    }
  }

  build() {
    Stack() {
      Column() {
        // Header
        Row() {
          Image($r('[basic].media.ic_public_left'))
            .width(24)
            .height(24)
            .fillColor($r('[basic].color.white'))
            .onClick(() => HMRouterMgr.pop())
          Text('编辑任务')
            .fontSize(20)
            .fontWeight(FontWeight.Medium)
            .fontColor($r('[basic].color.white'))
            .margin({ left: 12 })
          Blank()
        }
        .width('100%')
        .padding({
          top: this.safeArea.topHeight + 10,
          bottom: 12,
          left: 16,
          right: 16
        })
        .backgroundColor($r('[basic].color.home_header_bg'))

        if (this.isLoading) {
           // Show loading or just blank while fetching
           Column() {
             LoadingProgress().width(50).height(50).color($r('[basic].color.primary'))
           }
           .width('100%')
           .layoutWeight(1)
           .justifyContent(FlexAlign.Center)
        } else {
          Scroll(this.scroller) {
            Column({ space: 16 }) {
               // Read-only Category
              Column({ space: 6 }) {
                Text('任务分类')
                  .fontSize(15)
                  .fontColor($r('[basic].color.text_primary'))
                  .margin({ top: 10 })
                Row() {
                  Text(this.form.category)
                    .fontSize(14)
                    .fontColor($r('[basic].color.text_secondary'))
                }
                .padding(14)
                .width('100%')
                .backgroundColor($r('[basic].color.search_box_bg')) // Gray background for read-only
                .borderRadius(16)
              }

              // Title
              this.renderTextField('任务标题', '请输入任务标题', this.form.title, (val) => { this.form.title = val; this.handleFormUpdated() })
              
              if (this.showTakeCodeField) {
                 this.renderTextField('快递取件码', '请输入取件码', this.form.takeCode, (val) => { this.form.takeCode = val; this.handleFormUpdated() })
              }
              if (this.showTakeAwayField) {
                 this.renderTextField('外卖姓名', '请输入外卖姓名', this.form.takeName, (val) => { this.form.takeName = val; this.handleFormUpdated() })
                 Column({ space: 6 }) {
                  Row({ space: 4 }) {
                    Text('手机尾号')
                      .fontSize(15)
                      .fontColor($r('[basic].color.text_primary'))
                    if (!this.isTakeTelValid) {
                      Text('请输入4位数字').fontSize(13).fontColor('#FF4D4F')
                    }
                  }
                  TextInput({ placeholder: '请输入手机尾号', text: this.form.takeTel })
                    .height(44)
                    .backgroundColor($r('[basic].color.white'))
                    .borderRadius(14)
                    .padding({ left: 12, right: 12 })
                    .onChange((val: string) => { this.form.takeTel = val; this.isTakeTelValid = val.length === 0 || /^\d{4}$/.test(val); this.handleFormUpdated() })
                }
              }

              this.renderDateRow()
              this.renderTextField('交易地点', '请输入交易地点', this.form.position, (val) => { this.form.position = val; this.handleFormUpdated() })
              this.renderTextField('送达地点', '请输入送达地点', this.form.address, (val) => { this.form.address = val; this.handleFormUpdated() })
              
              // Detail
              Column({ space: 6 }) {
                Text('任务简介')
                  .fontSize(15)
                  .fontColor($r('[basic].color.text_primary'))
                TextArea({ placeholder: '请输入任务简介', text: this.form.detail })
                  .height(120)
                  .backgroundColor($r('[basic].color.white'))
                  .borderRadius(16)
                  .padding(12)
                  .onChange((value: string) => { this.form.detail = value; this.handleFormUpdated() })
              }

              // Read-only Mode
              Column({ space: 8 }) {
                Text('任务模式')
                  .fontSize(15)
                  .fontColor($r('[basic].color.text_primary'))
                Row() {
                   Text(this.form.mode === 'fixed' ? '💰 一口价' : '🏷️ 竞价')
                     .fontSize(14)
                     .fontColor($r('[basic].color.text_secondary'))
                }
                .padding(14)
                .width('100%')
                .backgroundColor($r('[basic].color.search_box_bg'))
                .borderRadius(16)
              }

              this.renderRewardField()

              Button(this.isSubmitting ? '保存中...' : '保存修改')
                .margin({ left: 16, right: 16, bottom: 16 })
                .height(48)
                .backgroundColor(this.isPublishDisabled ? '#FFD9E1' : $r('[basic].color.filter_active_bg'))
                .fontColor($r('[basic].color.white'))
                .borderRadius(24)
                .enabled(!this.isPublishDisabled && !this.isSubmitting)
                .onClick(() => this.handleSave())
            }
            .padding({ left: 16, right: 16, bottom: 80 + this.safeArea.bottomHeight })
          }
        }
      }
    }
    .height('100%')
    .backgroundColor($r('[basic].color.page_background'))
  }

  @Builder
  private renderTextField(label: string, placeholder: string, value: string, onChange: (value: string) => void) {
    Column({ space: 6 }) {
      Text(label).fontSize(15).fontColor($r('[basic].color.text_primary'))
      TextInput({ placeholder, text: value })
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
        Text('预期完成日期').fontSize(15).fontColor($r('[basic].color.text_primary'))
        Button(this.form.deadlineDate ? this.form.deadlineDate : '请选择日期')
          .height(44).borderRadius(14).backgroundColor($r('[basic].color.white'))
          .fontColor($r('[basic].color.text_primary'))
          .onClick(() => {
            DatePickerDialog.show({
              start: new Date(),
              end: new Date(2030, 11, 31),
              selected: this.form.deadlineDate ? new Date(this.form.deadlineDate) : undefined,
              onAccept: (value: DatePickerResult) => {
                const year = value.year?.toString().padStart(4, '0')
                const month = ((value.month ?? 0) + 1).toString().padStart(2, '0')
                const day = value.day?.toString().padStart(2, '0')
                this.form.deadlineDate = `${year}-${month}-${day}`
                this.updateDeadline()
                this.handleFormUpdated()
              }
            })
          })
      }
      Column({ space: 6 }) {
        Text('选择时间').fontSize(15).fontColor($r('[basic].color.text_primary'))
        Button(this.form.deadlineTime ? this.form.deadlineTime : '请选择时间')
          .height(44).borderRadius(14).backgroundColor($r('[basic].color.white'))
          .fontColor($r('[basic].color.text_primary'))
          .onClick(() => {
            TimePickerDialog.show({
              selected: this.form.deadlineTime ? new Date(`2000-01-01 ${this.form.deadlineTime}`) : undefined,
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
  private renderRewardField() {
    Column({ space: 6 }) {
      Text('任务报价 (元)').fontSize(15).fontColor($r('[basic].color.text_primary'))
      TextInput({ placeholder: '请输入金额', text: this.form.reward })
        .height(44).borderRadius(14).backgroundColor($r('[basic].color.white'))
        .padding({ left: 12, right: 12 })
        .type(InputType.NUMBER_DECIMAL)
        .onChange((value: string) => { this.form.reward = value; this.handleFormUpdated() })
    }
  }

  private updateDeadline() {
    if (this.form.deadlineDate && this.form.deadlineTime) {
      this.form.deadline = `${this.form.deadlineDate} ${this.form.deadlineTime}`
    }
  }

  private handleFormUpdated() {
    const hasBasics = Boolean(this.form.title && this.form.detail && this.form.reward && this.form.deadline && this.form.position && this.form.address)
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

  private async revertTaskUpdate() {
    if (!this.isPriceIncreased) return
    
    this.isLoading = true
    try {
       const payload: PublishUpdatePayload = {
         id: this.taskId,
         title: this.form.title,
         offer: this.originalOffer, // Revert to original
         detail: this.form.detail,
         DDL: this.form.deadline,
         address: this.form.address,
         position: this.form.position,
         takeaway_code: this.form.takeCode,
         takeaway_name: this.form.takeName,
         takeaway_tel: this.form.takeTel
       }
       await updateTask(payload, this.appUser.user.token)
       this.form.reward = String(this.originalOffer)
       this.isPriceIncreased = false
    } catch (e) {
       console.error('Revert failed:', JSON.stringify(e))
    } finally {
       this.isLoading = false
    }
  }

  private async handleSave() {
    if (this.isPublishDisabled) return
    this.isSubmitting = true
    this.isPriceIncreased = false
    
    try {
       const newOffer = Number(this.form.reward)
       const isFixedMode = this.form.mode === 'fixed'
       const priceIncreased = isFixedMode && newOffer > this.originalOffer
       
       if (priceIncreased) {
          this.isPriceIncreased = true
       }

       const payload: PublishUpdatePayload = {
         id: this.taskId,
         title: this.form.title,
         offer: newOffer,
         detail: this.form.detail,
         DDL: this.form.deadline,
         address: this.form.address,
         position: this.form.position,
         takeaway_code: this.form.takeCode,
         takeaway_name: this.form.takeName,
         takeaway_tel: this.form.takeTel
       }
       const res = await updateTask(payload, this.appUser.user.token)
       if (res.success) {
         if (priceIncreased) {
            const diff = newOffer - this.originalOffer
            const amountFen = Math.round(diff * 100)
            
            const ui = this.getUIContext()!
            const picker = new CashierPicker(ui)
            
            await picker
              .reset()
              .setAmount(amountFen)
              .setTradeSummary('补差价支付')
              .onWillDismiss(() => {
                 // User cancelled the picker
                 promptAction.showToast({ message: '支付取消，修改已撤销' })
                 this.revertTaskUpdate()
                 picker.close()
              })
              .onRealPayment(async (type: PaymentType) => {
                if (type === PaymentType.ALIPAY) {
                   const payRes = await prepayAliTask(this.taskId, false, this.appUser.user.token, diff)
                   if (!payRes.success || !payRes.data) { 
                      promptAction.showToast({ message: payRes.message ?? '预下单失败' })
                      this.revertTaskUpdate()
                      return 
                   }
                   
                   const objText: string = JSON.stringify(payRes.data)
                   const data: AliPrepayPayload = JSON.parse(objText) as AliPrepayPayload
                   const orderInfo: string = String((data.orderInfo ?? data.orderStr ?? ''))
                   
                   if (!orderInfo) { 
                      promptAction.showToast({ message: '支付参数缺失' })
                      this.revertTaskUpdate()
                      return 
                   }
                   aggregatedPaymentService.requestPaymentByAliPay({ orderInfo })
                   picker.close()
                } else if (type === PaymentType.HUAWEI) {
                   const payRes = await prepayHuaweiTask(this.taskId, false, this.appUser.user.token, diff)
                   if (!payRes.success || !payRes.data) { 
                      promptAction.showToast({ message: payRes.message ?? '预下单失败' })
                      this.revertTaskUpdate()
                      return 
                   }
                   
                   const objText: string = JSON.stringify(payRes.data)
                   const data: HuaweiPrepayPayload = JSON.parse(objText) as HuaweiPrepayPayload
                   const orderStr: string = String(data.orderStr ?? '')
                   
                   if (!orderStr) { 
                      promptAction.showToast({ message: '支付参数缺失' })
                      this.revertTaskUpdate()
                      return 
                   }
                   aggregatedPaymentService.requestPaymentByHuawei(this.getUIContext(), { orderStr })
                   picker.close()
                } else {
                   promptAction.showToast({ message: '当前仅支持支付宝支付' })
                }
              })
              .open()
         } else {
           promptAction.showToast({ message: '保存成功' })
           AppStorage.setOrCreate('reload_task_detail_now', Date.now())
           AppStorage.setOrCreate('reload_home_now', Date.now())
           HMRouterMgr.pop({ param: { updated: true } })
         }
       } else {
         promptAction.showToast({ message: res.message || '保存失败' })
       }
    } catch (e) {
       promptAction.showToast({ message: '保存失败' })
    } finally {
       this.isSubmitting = false
    }
  }
}
