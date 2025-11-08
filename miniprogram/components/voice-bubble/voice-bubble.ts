Component({
    properties: {
      src: {
        type: String,
        value: "",
      },
      duration: {
        type: Number,
        value: 0, // 单位：秒
      },
    },
  
    data: {
      isPlaying: false,
    },
  
    lifetimes: {
      detached() {
        if (this.audioCtx) this.audioCtx.destroy()
      },
    },
  
    methods: {
      togglePlay() {
        if (!this.audioCtx) {
          this.audioCtx = wx.createInnerAudioContext()
          this.audioCtx.src = this.data.src
          this.audioCtx.obeyMuteSwitch = false
  
          this.audioCtx.onEnded(() => {
            this.setData({ isPlaying: false })
          })
        }
  
        if (this.data.isPlaying) {
          this.audioCtx.pause()
          this.setData({ isPlaying: false })
        } else {
          this.audioCtx.play()
          this.setData({ isPlaying: true })
        }
      },
    },
  })
  