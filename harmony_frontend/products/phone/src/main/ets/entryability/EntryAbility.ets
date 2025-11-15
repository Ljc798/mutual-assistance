import { AbilityConstant, ConfigurationConstant, UIAbility, Want } from '@kit.AbilityKit';
import { hilog } from '@kit.PerformanceAnalysisKit';
import { display, window } from '@kit.ArkUI';
import { HMRouterMgr } from '@hadss/hmrouter';
import { ScreenManager, schoolPersistence, userPersistence } from 'basic'

const DOMAIN = 0x0000;

export default class EntryAbility extends UIAbility {
  private curBp: string = ''
  screenManager?: ScreenManager
  onCreate(want: Want, launchParam: AbilityConstant.LaunchParam): void {
    // 初始化HmRouter
    HMRouterMgr.init({
      context: this.context,
    });
    try {
      this.context.getApplicationContext().setColorMode(ConfigurationConstant.ColorMode.COLOR_MODE_NOT_SET);
    } catch (err) {
      hilog.error(DOMAIN, 'testTag', 'Failed to set colorMode. Cause: %{public}s', JSON.stringify(err));
    }
    hilog.info(DOMAIN, 'testTag', '%{public}s', 'Ability onCreate');
  }

  onDestroy(): void {
    hilog.info(DOMAIN, 'testTag', '%{public}s', 'Ability onDestroy');
  }

  // 根据当前窗口尺寸更新断点
  private updateBreakpoint(windowWidth: number) :void{
    try {
      //  核心代码1: 将长度的单位由px换算为vp，（px除以像素密度得到vp）
      let windowWidthVp = windowWidth / display.getDefaultDisplaySync().densityPixels
      let newBp: string = ''
      //  核心代码2: 基于窗口宽度vp值，判断当前设备属于哪个断点范围
      if (windowWidthVp < 320) {
        newBp = 'xs'
      } else if (windowWidthVp < 600) {
        newBp = 'sm'
      } else if (windowWidthVp < 840) {
        newBp = 'md'
      } else {
        newBp = 'lg'
      }
      if (this.curBp !== newBp) {
        this.curBp = newBp
        // 核心代码3: 使用状态变量记录当前断点值
        AppStorage.setOrCreate('currentBreakpoint', this.curBp)
      }
    } catch(err) {
      console.log("getDisplayByIdSync failed err" + err.code)
    }
  }

  onWindowStageCreate(windowStage: window.WindowStage): void {
    windowStage.getMainWindow().then((windowObj) => {
      // 获取应用启动时的窗口尺寸
      this.updateBreakpoint(windowObj.getWindowProperties().windowRect.width)
      // 注册回调函数，监听窗口尺寸变化
      windowObj.on('windowSizeChange', (windowSize)=>{
        this.updateBreakpoint(windowSize.width)
      })
    });
    // Main window is created, set main page for this ability
    hilog.info(DOMAIN, 'testTag', '%{public}s', 'Ability onWindowStageCreate');
    windowStage.loadContent('pages/Index', (err) => {
      if (err.code) {
        hilog.error(DOMAIN, 'testTag', 'Failed to load the content. Cause: %{public}s', JSON.stringify(err));
        return;
      }
      hilog.info(DOMAIN, 'testTag', 'Succeeded in loading the content.');
      userPersistence.initialize()
      schoolPersistence.initialize()
      this.screenManager = new ScreenManager(this.context)
      this.screenManager.init()
      this.screenManager.full()
    });
  }

  onWindowStageDestroy(): void {
    // Main window is destroyed, release UI related resources
    hilog.info(DOMAIN, 'testTag', '%{public}s', 'Ability onWindowStageDestroy');
    this.screenManager?.off()
  }

  onForeground(): void {
    // Ability has brought to foreground
    hilog.info(DOMAIN, 'testTag', '%{public}s', 'Ability onForeground');
  }

  onBackground(): void {
    // Ability has back to background
    hilog.info(DOMAIN, 'testTag', '%{public}s', 'Ability onBackground');
  }
}
