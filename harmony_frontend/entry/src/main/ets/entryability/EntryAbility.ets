import { AbilityConstant, ConfigurationConstant, UIAbility, Want } from '@kit.AbilityKit';
import { hilog } from '@kit.PerformanceAnalysisKit';
import { window } from '@kit.ArkUI';

const DOMAIN = 0x0000;

export default class EntryAbility extends UIAbility {
  onCreate(want: Want, launchParam: AbilityConstant.LaunchParam): void {
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

  onWindowStageCreate(windowStage: window.WindowStage): void {
    // Main window is created, set main page for this ability
    hilog.info(DOMAIN, 'testTag', '%{public}s', 'Ability onWindowStageCreate');

    windowStage.loadContent('pages/Index', (err) => {
      if (err.code) {
        hilog.error(DOMAIN, 'testTag', 'Failed to load the content. Cause: %{public}s', JSON.stringify(err));
        return;
      }
      hilog.info(DOMAIN, 'testTag', 'Succeeded in loading the content.');
    });
  }

  // onWindowStageCreate(windowStage: window.WindowStage): void {
  //   // Main window is created, set main page for this ability
  //   hilog.info(DOMAIN, 'testTag', 'Ability onWindowStageCreate');
  //
  //   // ✅ 获取主窗口实例
  //   windowStage.getMainWindow().then((win) => {
  //     if (!win) {
  //       hilog.error(DOMAIN, 'testTag', 'Get main window failed');
  //       return;
  //     }
  //
  //     // ✅ 开启沉浸式全屏布局（关键！）
  //     win.setWindowLayoutFullScreen(true);
  //
  //     // ✅ 设置状态栏为透明 & 内容可穿透
  //     win.setWindowSystemBarProperties({
  //       statusBarColor: '#00000000',        // 透明状态栏背景
  //       navigationBarColor: '#00000000',    // 透明导航栏（可选）
  //       statusBarContentColor: '#FFFFFFFF', // 状态栏字体颜色为白色
  //     });
  //
  //     hilog.info(DOMAIN, 'testTag', 'Immersive window enabled successfully.');
  //   }).catch((err: Error) => {
  //     hilog.error(DOMAIN, 'testTag', 'Failed to get window: %{public}s', JSON.stringify(err));
  //   });


    onWindowStageDestroy(): void {
    // Main window is destroyed, release UI related resources
    hilog.info(DOMAIN, 'testTag', '%{public}s', 'Ability onWindowStageDestroy');
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