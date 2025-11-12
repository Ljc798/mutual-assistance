@ComponentV2
export struct HDMProgressLoading {
  @Param
  pWidth: number = 80
  @Param
  strokeWidth: number = 4
  @Param
  color: ResourceColor = $r("app.color.red")
  @Local
  angle: number = 0
  @Local
  value: number = 40 // 40 -> 80 80 -> 40
  isRight: boolean = true // 是否是正向追加
  timer: number = -1

  aboutToAppear(): void {
    this.beginRun()
  }

  beginRun() {
    this.timer = setInterval(() => {
      if (this.value == 80) {
        this.isRight = false
      }
      if (this.value == 40) {
        this.isRight = true
      }
      if (this.isRight) {
        this.value++
      } else {
        this.value--
      }

    }, 100)
  }

  aboutToDisappear(): void {
    clearInterval(this.timer)
  }

  build() {
    Progress({
      total: 100,
      value: this.value,
      type: ProgressType.Ring
    })
      .color(this.color)
      .rotate({
        angle: this.angle
      })
      .style({
        strokeWidth: this.strokeWidth
      })
      .width(this.pWidth)
      .aspectRatio(1)
      .onAppear(() => {
        animateTo({ iterations: -1, duration: 1500 }, () => {
          this.angle = 360
        })
      })
  }
}