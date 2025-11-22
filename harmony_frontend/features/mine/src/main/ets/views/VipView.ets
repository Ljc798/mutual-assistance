import promptAction from '@ohos.promptAction'
import { AppStorageV2 } from '@kit.ArkUI'
import { AppSafeArea, AppUser, PAGE_PATH, NavBar } from 'basic'
import { HMRouter, HMRouterMgr } from '@hadss/hmrouter'
import { VipPlanItem, fetchVipPlans, createVipOrder, PayParams } from '../services/VipService'


@HMRouter({ pageUrl: PAGE_PATH.VIP_PAGE })
@Component
export struct VipView {
  safeArea: AppSafeArea = AppStorageV2.connect(AppSafeArea, () => new AppSafeArea())!
  private appUser: AppUser = AppStorageV2.connect(AppUser, () => new AppUser())!
  @State plans: VipPlanItem[] = []
  @State isLoading: boolean = false
  @State showPayDialog: boolean = false
  @State payParamsText: string = ''
  @State activeTab: string = 'vip'
  @State selectedPlanId: number = 0
  @State showCompare: boolean = false

  aboutToAppear() {
    this.loadPlans()
  }

  async loadPlans() {
    this.isLoading = true
    try {
      const items = await fetchVipPlans()
      this.plans = items
    } catch (_e) {
      promptAction.showToast({ message: '加载失败' })
    } finally {
      this.isLoading = false
    }
  }

  build() {
    Column() {
      NavBar({ title: '会员中心', onLeftClick: () => HMRouterMgr.pop() })
      this.renderHeader()
      this.renderTabBar()
      this.renderPlans()
      this.renderPayDialog()
    }
    .width('100%')
    .height('100%')
    .backgroundColor($r('[basic].color.page_background'))
  }

  @Builder
  private renderHeader() {
    Column({ space: 6 }) {
      Text('尊享会员特权')
        .fontSize(20)
        .fontWeight(FontWeight.Medium)
        .fontColor($r('[basic].color.text_primary'))
      Text('免佣金、发布折扣、优先服务等权益')
        .fontSize(12)
        .fontColor($r('[basic].color.text_secondary'))
      Row() {
        Blank()
        Button('权益对比')
          .height(28)
          .borderRadius(14)
          .backgroundColor($r('[basic].color.white'))
          .fontColor($r('[basic].color.text_primary'))
          .onClick(() => { this.showCompare = true })
      }
    }
    .padding({
      left: 16,
      right: 16,
      top: 12,
      bottom: 8
    })
  }

  @Builder
  private renderTabBar() {
    Row({ space: 12 }) {
      this.renderTabButton('VIP', 'vip')
      this.renderTabButton('SVIP', 'svip')
    }
    .padding({ left: 16, right: 16, top: 8, bottom: 8 })
  }

  @Builder
  private renderTabButton(label: string, key: string) {
    Button(label)
      .height(32)
      .borderRadius(16)
      .backgroundColor(this.activeTab === key ? $r('[basic].color.filter_active_bg') : $r('[basic].color.white'))
      .fontColor(this.activeTab === key ? $r('[basic].color.white') : $r('[basic].color.text_primary'))
      .onClick(() => { this.activeTab = key })
  }

  @Builder
  private renderPlans() {
    if (this.isLoading) {
      Column() {
        Text('加载中...').fontSize(14).fontColor($r('[basic].color.text_secondary'))
      }
      .padding(20)
    } else if (this.plans.length === 0) {
      Column() {
        Text('暂无可用套餐').fontSize(14).fontColor($r('[basic].color.text_secondary'))
      }
      .padding(20)
    } else {
      Column({ space: 10 }) {
        ForEach(this.getTabPlans(), (p: VipPlanItem) => {
          this.renderPlanCard(p)
        }, (p: VipPlanItem) => `${p.id}`)
      }
      .padding({ left: 16, right: 16, bottom: 20 })
    }
  }

  @Builder
  private renderPayButton() {
    Button('立即支付')
      .height(44)
      .borderRadius(22)
      .backgroundColor(this.selectedPlanId > 0 ? $r('[basic].color.filter_active_bg') : '#FFD9E1')
      .fontColor($r('[basic].color.white'))
      .enabled(this.selectedPlanId > 0)
      .onClick(async () => { await this.tryCreateOrder() })
      .margin({ left: 20, right: 20 })
  }

  @Builder
  private renderBenefits() {
    Column({ space: 8 }) {
      Text('会员特权').fontSize(15).fontWeight(FontWeight.Medium).fontColor($r('[basic].color.text_primary')).textAlign(TextAlign.Center)
      Row({ space: 14 }) {
        this.renderBenefitItem('免佣发布')
        this.renderBenefitItem('AI额度提升')
        this.renderBenefitItem('激励金奖励')
        this.renderBenefitItem('商城折扣')
      }
      .width('100%')
      .justifyContent(FlexAlign.SpaceAround)
      Text('更多功能推出中，敬请期待～').fontSize(12).fontColor($r('[basic].color.text_secondary')).textAlign(TextAlign.Center)
    }
    .padding({ left: 16, right: 16, top: 10, bottom: 16 })
  }

  @Builder
  private renderBenefitItem(label: string) {
    Column({ space: 6 }) {
      Text('★').fontSize(20).fontColor($r('[basic].color.vip_renew_btn')).textAlign(TextAlign.Center)
      Text(label).fontSize(12).fontColor($r('[basic].color.text_secondary')).textAlign(TextAlign.Center)
    }
  }

  @Builder
  private renderPlanCard(p: VipPlanItem) {
    Column({ space: 8 }) {
      Row({ space: 8 }) {
        Text(p.name)
          .fontSize(16)
          .fontWeight(FontWeight.Medium)
          .fontColor($r('[basic].color.text_primary'))
        Text(`${p.days}天`)
          .fontSize(12)
          .fontColor($r('[basic].color.text_secondary'))
        Blank()
        Text(`¥${(p.price).toFixed(2)}`)
          .fontSize(16)
          .fontColor($r('[basic].color.filter_active_bg'))
      }

      Column({ space: 4 }) {
        if (this.getBenefitKeys(p).length === 0) {
          Text('包含基础权益').fontSize(12).fontColor($r('[basic].color.text_secondary'))
        } else {
          ForEach(this.getBenefitKeys(p), (k: string) => {
            Row({ space: 6 }) {
              Text('•').fontSize(12).fontColor($r('[basic].color.text_secondary'))
              Text(`${p.benefits[k]}`)
                .fontSize(12)
                .fontColor($r('[basic].color.text_secondary'))
            }
          }, (k: string) => k)
        }
      }

      Row({ space: 12 }) {
        Button(this.selectedPlanId === p.id ? '已选择' : '开通')
          .height(40)
          .borderRadius(14)
          .backgroundColor($r('[basic].color.filter_active_bg'))
          .fontColor($r('[basic].color.white'))
          .onClick(() => { this.selectedPlanId = p.id })
      }
    }
    .padding({
      left: 16,
      right: 16,
      top: 12,
      bottom: 12
    })
    .backgroundColor($r('[basic].color.white'))
    .borderRadius(16)
  }

  private async handleCreateOrder(planId: number) {
    const token = this.appUser.user.token
    if (!token) {
      promptAction.showToast({ message: '请先登录' });
      HMRouterMgr.push({ pageUrl: PAGE_PATH.LOGIN_PAGE });
      return
    }
    try {
      const res = await createVipOrder(planId, token)
      if (!res.success || !res.paymentParams) {
        promptAction.showToast({ message: res.message ?? '创建订单失败' });
        return
      }
      const params: PayParams = res.paymentParams
      this.payParamsText = JSON.stringify(params)
      this.showPayDialog = true
    } catch (_e) {
      promptAction.showToast({ message: '创建订单失败' })
    }
  }

  @Builder
  private renderPayDialog() {
    if (!this.showPayDialog) {
      Blank()
    } else {
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
              .onClick(() => {
                this.tryNativePay()
              })
            Button('关闭')
              .height(40)
              .borderRadius(14)
              .backgroundColor($r('[basic].color.search_box_bg'))
              .onClick(() => {
                this.showPayDialog = false
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
    }
  }

  @Builder
  private renderCompareDialog() {
    if (!this.showCompare) { Blank() } else {
      Column() {
        Column({ space: 10 }) {
          Text('权益对比')
            .fontSize(18)
            .fontWeight(FontWeight.Medium)
          this.renderCompareRow('免佣金次数', '共5次', '10/月', '无限')
          this.renderCompareRow('展示优先级', '普通', '高', '最高')
          this.renderCompareRow('商城折扣', '—', '95折', '9折')
          this.renderCompareRow('AI调用额度', '5/天', '25/天', '无限')
          this.renderCompareRow('AI响应速度', '标准', '快速', '极速')
          this.renderCompareRow('任务保障金', '0', '50%', '100%')
          this.renderCompareRow('任务激励', '3%', '8%', '8%')
          this.renderCompareRow('积分加倍', '—', '1.5倍', '2倍')
          Row({ space: 12 }) {
            Button('我知道了')
              .height(44)
              .borderRadius(22)
              .backgroundColor($r('[basic].color.filter_active_bg'))
              .fontColor($r('[basic].color.white'))
              .onClick(() => { this.showCompare = false })
          }
        }
        .width('92%')
        .padding(20)
        .backgroundColor($r('[basic].color.white'))
        .borderRadius(20)
      }
      .width('100%')
      .height('100%')
      .justifyContent(FlexAlign.Center)
      .alignItems(HorizontalAlign.Center)
      .backgroundColor('rgba(0,0,0,0.35)')
    }
  }

  @Builder
  private renderCompareRow(label: string, normal: string, vip: string, svip: string) {
    Row({ space: 8 }) {
      Text(label)
        .fontSize(13)
        .fontColor($r('[basic].color.text_primary'))
        .layoutWeight(1)
      Text(normal)
        .fontSize(13)
        .fontColor($r('[basic].color.text_secondary'))
        .layoutWeight(1)
        .textAlign(TextAlign.End)
      Text(vip)
        .fontSize(13)
        .fontColor($r('[basic].color.text_primary'))
        .layoutWeight(1)
        .textAlign(TextAlign.End)
      Text(svip)
        .fontSize(13)
        .fontColor($r('[basic].color.text_primary'))
        .layoutWeight(1)
        .textAlign(TextAlign.End)
    }
  }

  private getBenefitKeys(p: VipPlanItem): string[] {
    const b = p.benefits
    if (!b) {
      return []
    }
    return Object.keys(b)
  }

  private getTabPlans(): VipPlanItem[] {
    const level = this.activeTab === 'svip' ? 2 : 1
    const out: VipPlanItem[] = []
    for (let i = 0; i < this.plans.length; i++) { const p = this.plans[i]; if (Number(p.level) === level) { out.push(p) } }
    return out
  }

  private async tryCreateOrder() {
    if (this.selectedPlanId <= 0) { return }
    const token = this.appUser.user.token
    if (!token) {
      promptAction.showToast({ message: '请先登录' })
      HMRouterMgr.push({ pageUrl: PAGE_PATH.LOGIN_PAGE })
      return
    }
    const res = await createVipOrder(this.selectedPlanId, token)
    if (!res.success || !res.paymentParams) {
      promptAction.showToast({ message: res.message ?? '创建订单失败' })
      return
    }
    this.payParamsText = JSON.stringify(res.paymentParams)
    this.showPayDialog = true
  }

  private tryNativePay() {
    try {
      promptAction.showToast({ message: '已尝试调用原生支付（示例占位）' })
    } catch (_e) {
      promptAction.showToast({ message: '原生支付不可用' })
    }
  }
}
