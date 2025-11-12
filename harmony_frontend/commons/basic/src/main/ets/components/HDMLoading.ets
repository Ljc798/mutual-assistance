@ComponentV2
export struct HDMLoading {
  @Param
  imgWidth: number = 80

  build() {
    Stack({ alignContent: Alignment.Center }) {
      ImageAnimator()
        .images([
          {
            src: $r("app.media.logo")
          },
          {
            src: $r("app.media.logo")
          },
          {
            src: $r("app.media.logo")
          },
          {
            src: $r("app.media.logo")
          }
        ])
        .state(AnimationStatus.Running)
        .iterations(-1)// 无限运行动画
        .width(this.imgWidth)
        .aspectRatio(3)
    }
    .width("100%")
    .height("100%")
  }
}