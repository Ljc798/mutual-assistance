import { PublishView } from '../views/PublishView'

@Entry
@Component
struct Index {
  build() {
    Column() {
      PublishView()
    }
    .height('100%')
    .width('100%')
  }
}
