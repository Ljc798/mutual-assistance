import promptAction from '@ohos.promptAction'
import { AppStorageV2 } from '@kit.ArkUI'
import { HMRouter, HMRouterMgr } from '@hadss/hmrouter'
import { PAGE_PATH, AppAvatarCrop, AppUser } from 'basic'
import { photoAccessHelper } from '@kit.MediaLibraryKit'
import { fileIo as fs } from '@kit.CoreFileKit'
import image from '@ohos.multimedia.image'
import { uploadSingle, UploadFileItem } from 'basic'
import { updateProfile, UpdatePayload } from '../services/EditProfileService'

interface PinchUpdateEvent { scale: number }
interface PanUpdateEvent { offsetX: number; offsetY: number }

@HMRouter({ pageUrl: PAGE_PATH.AVATAR_CROP_PAGE })
@Component
export struct AvatarCropView {
  private readonly vm: AppAvatarCrop = AppStorageV2.connect(AppAvatarCrop, () => new AppAvatarCrop())!
  private readonly appUser: AppUser = AppStorageV2.connect(AppUser, () => new AppUser())!
  @State imgScale: number = 1
  @State imgOffsetX: number = 0
  @State imgOffsetY: number = 0
  @State componentW: number = 0
  @State componentH: number = 0
  @State imageW: number = 0
  @State imageH: number = 0
  @State adaptScale: number = 1
  private readonly MIN_SCALE: number = 1
  private readonly MAX_SCALE: number = 4
  private readonly renderSettings: RenderingContextSettings = new RenderingContextSettings(true)
  private readonly canvasCtx: CanvasRenderingContext2D = new CanvasRenderingContext2D(this.renderSettings)

  aboutToAppear(): void {
    this.imgScale = 1
    this.imgOffsetX = 0
    this.imgOffsetY = 0
  }

  build(): void {
    Column() {
      Row({ space: 12 }) {
        Button('取消')
          .height(36)
          .borderRadius(16)
          .backgroundColor($r('[basic].color.search_box_bg'))
          .fontColor($r('[basic].color.text_primary'))
          .onClick(() => { HMRouterMgr.pop() })
        Button('保存')
          .height(36)
          .borderRadius(16)
          .backgroundColor($r('[basic].color.filter_active_bg'))
          .fontColor($r('[basic].color.white'))
          .onClick(async () => { await this.handleSave() })
      }
      .width('92%')
      .padding({ top: 12, bottom: 12 })

      Stack() {
        // 图片
        Image(this.vm.uri as ResourceStr)
          .width('100%')
          .height('70%')
          .objectFit(ImageFit.Contain)
          .scale({ x: this.imgScale, y: this.imgScale })
          .translate({ x: this.imgOffsetX, y: this.imgOffsetY })
          .onAreaChange((info: Area) => { this.onAreaReady(info) })
          .gesture(PinchGesture().onActionUpdate((ev: PinchUpdateEvent) => { this.onPinch(ev.scale) }))
          .gesture(PanGesture().onActionUpdate((ev: PanUpdateEvent) => { this.onPan(ev.offsetX, ev.offsetY) }))
          .gesture(TapGesture({ count: 2 }).onAction(() => { this.resetTransform() }))

        // 遮罩（正方形头像框）
        Canvas(this.canvasCtx)
          .width('100%')
          .height('70%')
          .onReady(() => { this.drawMask(this.canvasCtx) })
      }
      .width('100%')
      .height('80%')
    }
    .width('100%')
    .height('100%')
    .backgroundColor($r('[basic].color.page_background'))
  }

  private onAreaReady(info: Area): void {
    const w = Number(info.width)
    const h = Number(info.height)
    this.componentW = w
    this.componentH = h
  }

  private onPinch(delta: number): void {
    const next = this.imgScale * delta
    const clamped = next < this.MIN_SCALE ? this.MIN_SCALE : (next > this.MAX_SCALE ? this.MAX_SCALE : next)
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

  private drawMask(ctx: CanvasRenderingContext2D): void {
    const w = ctx.width
    const h = ctx.height
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    ctx.fillRect(0, 0, w, h)
    const fw = Math.min(w, h) * 0.6
    const fx = (w - fw) / 2
    const fy = (h - fw) / 2
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillRect(fx, fy, fw, fw)
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 2
    ctx.strokeRect(fx, fy, fw, fw)
  }

  private async handleSave(): Promise<void> {
    try {
      const src = this.vm.uri
      if (!src) { promptAction.showToast({ message: '未选择图片' }); return }
      const file = fs.openSync(src, fs.OpenMode.READ_ONLY)
      const source = await image.createImageSource(file.fd)
      const info = await source.getImageInfo()
      this.imageW = info.size.width
      this.imageH = info.size.height
      const pm = await source.createPixelMap()

      // 计算取景框与反推源图裁剪区域
      const frameW = Math.min(this.componentW, this.componentH) * 0.6
      const frameX = (this.componentW - frameW) / 2
      const frameY = (this.componentH - frameW) / 2

      const adapt = Math.min(this.componentW / this.imageW, this.componentH / this.imageH)
      const totalScale = adapt * this.imgScale
      const showW = this.imageW * totalScale
      const showH = this.imageH * totalScale
      const imageX = (this.componentW - showW) / 2
      const imageY = (this.componentH - showH) / 2
      const showX = imageX + this.imgOffsetX * this.imgScale
      const showY = imageY + this.imgOffsetY * this.imgScale

      const cropX = Math.max(0, Math.floor((frameX - showX) / totalScale))
      const cropY = Math.max(0, Math.floor((frameY - showY) / totalScale))
      const cropW = Math.min(this.imageW, Math.floor(frameW / totalScale))
      const cropH = Math.min(this.imageH, Math.floor(frameW / totalScale))

      const region: image.Region = { x: cropX, y: cropY, size: { width: cropW, height: cropH } }
      const cropped = await this.cropPixelMap(pm, region)

      const packer: image.ImagePacker = image.createImagePacker()
      const opts: image.PackingOption = { format: 'image/jpeg', quality: 92 }
      const packed: ArrayBuffer = await packer.packToData(cropped, opts)
      const buff: Uint8Array = new Uint8Array(packed)

      const fname: string = `avatar_${Date.now()}.jpg`
      const item: UploadFileItem = { filename: fname, mime: 'image/jpeg', data: buff, extra: { type: 'avatar', username: this.appUser.user.username ?? 'user' } }
      const res = await uploadSingle(item)
      if (!res.success || !res.url) { promptAction.showToast({ message: '上传失败' }); return }

      const token = this.appUser.user.token
      const payload: UpdatePayload = { username: this.appUser.user.username ?? '', avatar_url: res.url, wxid: this.appUser.user.wxid ?? '', school_id: Number(this.appUser.user.school_id ?? 1) }
      const saved = await updateProfile(payload, token)
      if (saved.success) {
        this.appUser.user.avatar_url = res.url
        promptAction.showToast({ message: '头像已更新' })
        HMRouterMgr.pop()
      } else {
        promptAction.showToast({ message: saved.message ?? '头像更新失败' })
      }
    } catch (_e) { promptAction.showToast({ message: '处理失败' }) }
  }

  private async cropPixelMap(pm: image.PixelMap, region: image.Region): Promise<image.PixelMap> {
    const info: image.ImageInfo = await pm.getImageInfo()
    const srcW: number = info.size.width
    const srcH: number = info.size.height
    const bytesPerPixel: number = 4
    const srcBuf: ArrayBuffer = new ArrayBuffer(pm.getPixelBytesNumber())
    await pm.readPixelsToBuffer(srcBuf)
    const srcArr = new Uint8Array(srcBuf)
    const dstBuf: ArrayBuffer = new ArrayBuffer(region.size.width * region.size.height * bytesPerPixel)
    const dstArr = new Uint8Array(dstBuf)
    for (let y = 0; y < region.size.height; y++) {
      const srcStart: number = ((region.y + y) * srcW + region.x) * bytesPerPixel
      const srcEnd: number = srcStart + region.size.width * bytesPerPixel
      const dstStart: number = y * region.size.width * bytesPerPixel
      dstArr.set(srcArr.subarray(srcStart, srcEnd), dstStart)
    }
    const init: image.InitializationOptions = { editable: true, pixelFormat: image.PixelMapFormat.RGBA_8888, size: { width: region.size.width, height: region.size.height } }
    const cropped: image.PixelMap = await image.createPixelMap(dstBuf, init)
    return cropped
  }
}
