import promptAction from '@ohos.promptAction'
import { AppStorageV2 } from '@kit.ArkUI'
import { HMRouter, HMRouterMgr } from '@hadss/hmrouter'
import { PAGE_PATH } from '../constants/PAGE_PATH'
import { AppImagePreview } from '../viewmodels/ImagePreviewVM'
import http from '@ohos.net.http'
import { fileIo as fs } from '@kit.CoreFileKit'
import { photoAccessHelper } from '@kit.MediaLibraryKit'
import { common } from '@kit.AbilityKit'
interface PinchUpdateEvent { scale: number }
interface PanUpdateEvent { offsetX: number; offsetY: number }
@HMRouter({ pageUrl: PAGE_PATH.IMAGE_PREVIEW_PAGE })
@Component
export struct ImagePreviewView {
  private readonly vm: AppImagePreview = AppStorageV2.connect(AppImagePreview, () => new AppImagePreview())!
  @State active: number = 0
  @State imgScale: number = 1
  @State imgOffsetX: number = 0
  @State imgOffsetY: number = 0
  @State imgAngle: number = 0

  private readonly MIN_SCALE: number = 1
  private readonly MAX_SCALE: number = 3



  aboutToAppear(): void {
    this.active = this.vm.index
  }

  build(): void {
    Stack() {
      Column() {
        Swiper() {
          ForEach(this.vm.images, (url: string) => {
            Column() {
              Image(url as ResourceStr)
                .width('100%')
                .height('80%')
                .objectFit(ImageFit.Contain)
                .scale({ x: this.imgScale, y: this.imgScale })
                .translate({ x: this.imgOffsetX, y: this.imgOffsetY })
                .rotate({ angle: this.imgAngle })
                .gesture(PinchGesture().onActionUpdate((ev: PinchUpdateEvent) => { this.onPinch(ev.scale) }))
                .gesture(PanGesture().onActionUpdate((ev: PanUpdateEvent) => { this.onPan(ev.offsetX, ev.offsetY) }))
                .gesture(TapGesture({ count: 2 }).onAction(() => { this.resetTransform() }))
            }
          }, (url: string, index: number) => `${index}`)
        }
        .indicator(false)
        .onChange((i: number) => { this.active = i; this.resetTransform() })
        .index(this.active)
      }
      .width('100%')
      .height('100%')

      Row({ space: 12 }) {
        Button('关闭')
          .height(36)
          .borderRadius(16)
          .fontColor($r('[basic].color.text_primary'))
          .onClick(() => { HMRouterMgr.pop() })
        Button('下载')
          .height(36)
          .borderRadius(16)
          .backgroundColor($r('[basic].color.filter_active_bg'))
          .fontColor($r('[basic].color.white'))
          .onClick(() => this.downloadCurrent())
        Button('旋转90°')
          .height(36)
          .borderRadius(16)
          .fontColor($r('[basic].color.text_primary'))
          .onClick(() => { this.imgAngle = (this.imgAngle + 90) % 360 })
      }
      .width('92%')
      .padding({ top: 12 })
      .position({ left: 16, right: 16, top: 16 })

      Column() {
      }
      .width('100%')
      .height('100%')
      .gesture(TapGesture({ count: 1 }).onAction(() => { HMRouterMgr.pop() }))
    }
    .width('100%')
    .height('100%')
    .backgroundColor('rgba(0,0,0,0.85)')
  }

  private async downloadCurrent(): Promise<void> {
    try {
      const idx: number = this.active
      if (idx < 0 || idx >= this.vm.images.length) { return }
      const url: string = this.vm.images[idx]
      const client = http.createHttp()
      const res = await client.request(url, { method: http.RequestMethod.GET, expectDataType: http.HttpDataType.ARRAY_BUFFER })
      const context = (this.getUIContext().getHostContext() as common.UIAbilityContext)
      const cacheDir: string = context.cacheDir
      const fname: string = `preview_${Date.now()}.jpg`
      const target: string = `${cacheDir}/${fname}`
      const file = fs.openSync(target, fs.OpenMode.CREATE | fs.OpenMode.WRITE_ONLY)
      await fs.write(file.fd, res.result as ArrayBuffer)
      fs.closeSync(file.fd)
      const helper = photoAccessHelper.getPhotoAccessHelper(context)
      await helper.createAsset(photoAccessHelper.PhotoType.IMAGE, target)
      promptAction.showToast({ message: '已保存到相册' })
    } catch (_e) {
      promptAction.showToast({ message: '下载失败' })
    }
  }

  private onPinch(delta: number): void {
    const next: number = this.imgScale * delta
    const clamped: number = next < this.MIN_SCALE ? this.MIN_SCALE : (next > this.MAX_SCALE ? this.MAX_SCALE : next)
    this.imgScale = clamped
  }

  private onPan(dx: number, dy: number): void {
    if (this.imgScale <= 1) { this.imgOffsetX = 0; this.imgOffsetY = 0; return }
    this.imgOffsetX = this.imgOffsetX + dx
    this.imgOffsetY = this.imgOffsetY + dy
  }

  private resetTransform(): void {
    this.imgScale = 1
    this.imgOffsetX = 0
    this.imgOffsetY = 0
  }
}
