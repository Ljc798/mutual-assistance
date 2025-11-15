import { SquarePost } from '../viewmodels/SquareTypes'

@ObservedV2
export class AppCurrentSquareDetail {
  @Trace
  id: number = 0
  @Trace
  post?: SquarePost

  setPost(item: SquarePost): void {
    const idValue: number = Number(item.id)
    this.id = Number.isFinite(idValue) && idValue > 0 ? idValue : 0
    this.post = this.id > 0 ? item : undefined
  }

  reset(): void {
    this.id = 0
    this.post = undefined
  }
}