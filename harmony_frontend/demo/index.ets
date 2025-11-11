// index.ets
import { Navigation, NavDestination, NavDestinationContext } from '@kit.ArkUI';

@Entry
@Component
struct Index {
  @State pageStack: Navigation.NavPathStack = new Navigation.NavPathStack();

  build() {
    Column() {
      Button('跳转到详情页')
        .onClick(() => {
          // 正确的跳转方式
          this.pageStack.pushPathByName('task_detail', { id: 123 });
        })
    }
  }
}
