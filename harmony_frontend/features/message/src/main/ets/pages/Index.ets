import { MessageView } from '../views/MessageView'

@Entry
@Component
struct Index {
  build() {
    Column() {
      MessageView()
    }
    .height('100%')
    .width('100%')
  }
}
