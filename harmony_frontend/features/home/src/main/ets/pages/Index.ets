import { HomeView } from '../views/HomeView'

@Entry
@Component
struct Index {
  build() {
    Column() {
      HomeView()
    }
  }
}
