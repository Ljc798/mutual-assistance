import promptAction from '@ohos.promptAction'
import { AppStorageV2 } from '@kit.ArkUI'
import { AppSafeArea, AppUser, PAGE_PATH } from 'basic'
import { HMRouter, HMRouterMgr } from '@hadss/hmrouter'
import { MallItem, fetchMallItems, redeemPoint, createOrder } from '../services/MallService'

@HMRouter({ pageUrl: PAGE_PATH.MALL_PAGE })
@Component
export struct MallView {
  private readonly scroller: Scroller = new Scroller()
  safeArea: AppSafeArea = AppStorageV2.connect(AppSafeArea, () => new AppSafeArea())!
  private readonly appUser: AppUser = AppStorageV2.connect(AppUser, () => new AppUser())!
  @State items: MallItem[] = []
  @State isRefreshing: boolean = false

  aboutToAppear() { this.loadItems() }

  private async loadItems() {
    if (this.isRefreshing) { return }
    this.isRefreshing = true
    try {
      const list = await fetchMallItems()
      this.items = list
    } catch (_e) { promptAction.showToast({ message: '加载失败' }) } finally { this.isRefreshing = false }
  }

  build() {
    Stack() {
      Column() {
        this.renderHeader()
        Scroll(this.scroller) {
          Column({ space: 12 }) {
            this.renderList()
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
      Text('积分商城')
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
  private renderList() {
    if (this.items.length === 0) {
      Column({ space: 8 }) {
        Text('暂无商品')
          .fontSize(14)
          .fontColor($r('[basic].color.text_secondary'))
      }
      .width('98%')
      .padding(24)
      .alignItems(HorizontalAlign.Center)
      .backgroundColor($r('[basic].color.white'))
      .borderRadius(18)
    } else {
      Column({ space: 10 }) {
        ForEach(this.items, (item: MallItem) => {
          this.renderItem(item)
        }, (item: MallItem) => `${item.id}`)
      }
    }
  }

  @Builder
  private renderItem(item: MallItem) {
    Column({ space: 8 }) {
      Row({ space: 12 }) {
        Image(this.getCover(item.coverUrl))
          .width(64)
          .height(64)
          .borderRadius(16)
          .objectFit(ImageFit.Cover)
          .backgroundColor('#F2F2F2')
        Column({ space: 6 }) {
          Text(item.title)
            .fontSize(15)
            .fontWeight(FontWeight.Medium)
          Text(item.description)
            .fontSize(12)
            .fontColor($r('[basic].color.text_secondary'))
          Row({ space: 12 }) {
            Text(`¥${item.price.toFixed(2)}`)
              .fontSize(14)
              .fontColor($r('[basic].color.text_primary'))
            Text(`积分 ${item.pointsCost}`)
              .fontSize(13)
              .fontColor($r('[basic].color.text_secondary'))
          }
        }
        .layoutWeight(1)
      }
      Row({ space: 10 }) {
        Button('积分兑换')
          .height(36)
          .borderRadius(12)
          .backgroundColor($r('[basic].color.filter_active_bg'))
          .fontColor($r('[basic].color.white'))
          .onClick(() => this.handleRedeem(item))
        Button('购买')
          .height(36)
          .borderRadius(12)
          .backgroundColor($r('[basic].color.search_box_bg'))
          .onClick(() => this.handleBuy(item))
      }
    }
    .padding({ left: 16, right: 16, top: 14, bottom: 14 })
    .backgroundColor($r('[basic].color.white'))
    .borderRadius(18)
  }

  private async handleRedeem(item: MallItem) {
    const token = this.appUser.user.token
    if (!token) { promptAction.showToast({ message: '请先登录' }); return }
    try { await redeemPoint(item.id, token); promptAction.showToast({ message: '兑换成功' }) } catch (_e) { promptAction.showToast({ message: '兑换失败' }) }
  }

  private async handleBuy(item: MallItem) {
    const token = this.appUser.user.token
    if (!token) { promptAction.showToast({ message: '请先登录' }); return }
    try { await createOrder(item.id, token); promptAction.showToast({ message: '下单成功，支付能力稍后接入' }) } catch (_e) { promptAction.showToast({ message: '下单失败' }) }
  }

  private getCover(url: string): ResourceStr { return (url || '') as ResourceStr }
}