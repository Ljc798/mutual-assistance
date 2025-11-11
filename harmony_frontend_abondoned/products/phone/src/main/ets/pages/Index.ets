import { HomePage } from '../../../../../../features/home1/src/main/ets/pages/HomePage';

@Entry
@Component
struct Index {
  @State pathStack: NavPathStack = new NavPathStack();

  build() {
    Navigation(this.pathStack) {
      HomePage({ pathStack: this.pathStack });
    }
    .mode(NavigationMode.Stack)
    .hideTitleBar(true);
  }
}
