import { AppStorageV2, display, window } from "@kit.ArkUI"
import { Logger } from "./Logger"
import { AppBreakPoint } from "../viewmodels/AppBreakPoint"
import { deviceInfo } from "@kit.BasicServicesKit"
import { AppSafeArea } from "../viewmodels/AppSafeArea"

export class ScreenManager {
  ctx: Context
  app: AppBreakPoint = AppStorageV2.connect(AppBreakPoint, () => new AppBreakPoint())!

  constructor(ctx: Context) {
    this.ctx = ctx
  }

  async init() {
    try {
      const win = await window.getLastWindow(this.ctx)
      const uiCtx = win.getUIContext()

      // 先计算当前的屏幕宽度-这个api在2in1模拟器上有bug，默认拿到的是设备宽度
      // this.updateBreakpoint(uiCtx.px2vp(display.getDefaultDisplaySync()
      // .width))

      // 换成这个api可以获取窗口宽度，在2in1设备可以正常调用
      this.updateBreakpoint(uiCtx.px2vp(win.getWindowProperties()
        .windowRect
        .width))

      win.on("windowSizeChange", (size) => {
        this.updateBreakpoint(uiCtx.px2vp(size.width))
      })
    } catch (e) {
      Logger.error(e)
    }

  }

  async off() {
    try {
      const win = await window.getLastWindow(this.ctx)
      win.off("windowSizeChange")
    } catch (e) {
      Logger.error(e)
    }

  }

  updateBreakpoint(windowWidth: number): void {
    try {
      // 获取vp尺寸
      let windowWidthVp = windowWidth
      let newBp: BreakPointEnum = BreakPointEnum.XS
      //  核心代码2: 基于窗口宽度vp值，判断当前设备属于哪个断点范围
      if (windowWidthVp < 320) {
        newBp = BreakPointEnum.XS
      } else if (windowWidthVp < 600) {
        newBp = BreakPointEnum.SM
      } else if (windowWidthVp < 840) {
        newBp = BreakPointEnum.MD
      } else if (windowWidthVp < 1440) {
        newBp = BreakPointEnum.LG
      } else {
        newBp = BreakPointEnum.XL
      }
      if (this.app?.breakPoint !== newBp) {
        // 核心代码3: 使用状态变量记录当前断点值
        this.app!.breakPoint = newBp
      }
    } catch (err) {
    }
  }


  async full() {
    try {
      const win = await window.getLastWindow(this.ctx)
      await win.setWindowLayoutFullScreen(true)
      const topArea = win.getWindowAvoidArea(window.AvoidAreaType.TYPE_SYSTEM)
      const bottomArea = win.getWindowAvoidArea(window.AvoidAreaType.TYPE_NAVIGATION_INDICATOR)
      const safeArea = AppStorageV2.connect(AppSafeArea, () => new AppSafeArea())!
      const uiCtx = win.getUIContext()
      safeArea.topHeight = uiCtx.px2vp(topArea.topRect.height)
      safeArea.bottomHeight = uiCtx.px2vp(bottomArea.bottomRect.height)
    } catch (e) {
      Logger.error(e)
    }
  }

  async exitFull() {
    try {
      const win = await window.getLastWindow(this.ctx)
      await win.setWindowLayoutFullScreen(false)
      const safeArea = AppStorageV2.connect(AppSafeArea, () => new AppSafeArea())!
      safeArea.topHeight = 0
      safeArea.bottomHeight = 0
    } catch (e) {
      Logger.error('FullScreen disable', e)
    }
  }
}

export enum BreakPointEnum {
  XS = "xs",
  SM = "sm",
  MD = "md",
  LG = "lg",
  XL = "xl"
}

