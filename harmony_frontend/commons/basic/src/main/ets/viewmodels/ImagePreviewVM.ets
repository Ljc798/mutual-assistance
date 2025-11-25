@ObservedV2
export class AppImagePreview {
  @Trace images: string[]
  @Trace index: number
  constructor() {
    this.images = []
    this.index = 0
  }
  set(images: string[], index: number): void {
    this.images = images
    this.index = index
  }
  reset(): void {
    this.images = []
    this.index = 0
  }
}
