@ObservedV2
export class AppAvatarCrop {
  @Trace uri: string
  @Trace frameWidth: number
  @Trace frameRatio: number
  constructor() {
    this.uri = ''
    this.frameWidth = 600
    this.frameRatio = 1
  }
  set(uri: string, frameWidth: number, frameRatio: number): void {
    this.uri = uri
    this.frameWidth = frameWidth
    this.frameRatio = frameRatio
  }
  reset(): void {
    this.uri = ''
    this.frameWidth = 600
    this.frameRatio = 1
  }
}
