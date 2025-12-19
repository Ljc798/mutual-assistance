import { HomeView } from 'home';
import { SquareView } from 'square';
import { PublishView } from 'publish';
import { MessageView } from 'message';
import { MineView } from 'mine';
import { AppBreakPoint, AppSafeArea, BreakPointType, ProgressLoading, PAGE_PATH, TabItem } from 'basic'
import { AppStorageV2, AttributeUpdater } from '@kit.ArkUI'
import { HMDefaultGlobalAnimator, HMNavigation } from '@hadss/hmrouter'
import { Logger } from 'basic'


class MyModifier extends AttributeUpdater<NavigationAttribute> {
  // 重写原来的方法
  initializeModifier(instance: NavigationAttribute): void {
    // instance就是Navigation实例对象
    instance.mode(NavigationMode.Stack) // 分栏模式去掉
    instance.titleMode(NavigationTitleMode.Mini) // 标题模式全屏
    instance.hideTitleBar(true) // 隐藏标题栏
  }
}

@Entry
@Component
struct Index {
  modifier: MyModifier = new MyModifier() // 专门用来修改Navigation特性对象实例
  safeArea: AppSafeArea = AppStorageV2.connect(AppSafeArea, () => new AppSafeArea())!
  @StorageLink('main_page_active_index') activeIndex: number = 0
  @State isPageShown: boolean = true

  onPageShow(): void {
    this.isPageShown = true
  }

  onPageHide(): void {
    this.isPageShown = false
  }

  list: TabItem[] = [
    // { text: '首页', normal: $r('app.media.icon_nav_home'), active: $r('app.media.icon_nav_home') },
    { text: '广场', normal: $r('app.media.icon_nav_square'), active: $r('app.media.icon_nav_square') },
    // { text: '发布', normal: $r('app.media.icon_nav_publish'), active: $r('app.media.icon_nav_publish') },
    // { text: '消息', normal: $r('app.media.icon_nav_message'), active: $r('app.media.icon_nav_message') },
    { text: '我的', normal: $r('app.media.icon_nav_user'), active: $r('app.media.icon_nav_user') },

  ]

  build() {
    Column() {
      // 使用HMNavigation包裹整个根容器 -坑点-HMNavigation外层必须再包一个容器
      // HMNavigation 是对navigation的封装
      // 坑点 子页面绝不能出现NavDestination
      // homePageUrl 是根页面的地址 想要回来直接写整个地址
      // 想要Navigation的特性
      HMNavigation({
        navigationId: PAGE_PATH.MAIN_PAGE_ID,
        homePageUrl: PAGE_PATH.MAIN_PAGE,
        options: {
          standardAnimator: HMDefaultGlobalAnimator.STANDARD_ANIMATOR,
          dialogAnimator: HMDefaultGlobalAnimator.DIALOG_ANIMATOR,
          modifier: this.modifier,
        }
      }) {
        Tabs({ barPosition: BarPosition.End }) {
          ForEach(this.list, (item: TabItem, index: number) => {
            TabContent() {
              // if (index == 0) {
              //   HomeView({ isVisible: this.isPageShown && this.activeIndex === 0 })
              // } else if (index == 1) {
              //   SquareView({ isVisible: this.isPageShown && this.activeIndex === 1 })
              // } else if (index == 2) {
              //   PublishView()
              // } else if (index == 3) {
              //   MessageView({ isVisible: this.isPageShown && this.activeIndex === 3 })
              // } else {
              //   MineView()
              // }
              if (index == 0) {
                SquareView({ isVisible: this.isPageShown && this.activeIndex === 0 })
              } else {
                MineView()
              }
            }
            .tabBar(this.TabItemBuilder(item, index))
          })
        }
        .padding({
          bottom: this.safeArea.bottomHeight
        })
        .scrollable(false)
        .onTabBarClick(index => {
          this.activeIndex = index
        })
      }
    }
    .height('100%')
  }


  @Builder
  TabItemBuilder(item: TabItem, index: number) {
    Column() {
      Image(this.activeIndex === index ? item.active : item.normal)
        .width(40)
        .aspectRatio(1)
      Text(item.text)
      // 跨 HSP 访问资源，需要在 oh-package.json5中导入
        .fontColor($r('[basic].color.black'))
        .fontSize(12)
    }
    .justifyContent(FlexAlign.SpaceEvenly)
    .height(50)
  }
}