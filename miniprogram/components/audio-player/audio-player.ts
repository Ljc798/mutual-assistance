Component({
    properties: {
      src: {
        type: String,
        value: "",
        observer(newVal) {
          if (newVal) {
            this.parseDurationFromUrl(newVal)
          }
        },
      },
      autoplay: {
        type: Boolean,
        value: false,
      },
    },
  
    data: {
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      currentTimeStr: "00:00",
      durationStr: "00:00",
    },
  
    lifetimes: {
      attached() {
        this.initAudio()
      },
      detached() {
        if (this.audioCtx) this.audioCtx.destroy()
      },
    },
  
    methods: {
      initAudio() {
        const audio = wx.createInnerAudioContext()
        audio.obeyMuteSwitch = false
        this.audioCtx = audio
  
        audio.onCanplay(() => {
          if (!this.data.duration) {
            setTimeout(() => {
              this.setData({
                duration: Math.floor(audio.duration),
                durationStr: this.formatTime(audio.duration),
              })
            }, 300)
          }
        })
  
        audio.onTimeUpdate(() => {
          this.setData({
            currentTime: Math.floor(audio.currentTime),
            currentTimeStr: this.formatTime(audio.currentTime),
          })
        })
  
        audio.onEnded(() => {
          this.setData({ isPlaying: false, currentTime: 0, currentTimeStr: "00:00" })
        })
      },
  
      parseDurationFromUrl(url) {
        const match = url.match(/durationTime=(\d+)/)
        if (match) {
          const ms = parseInt(match[1])
          const sec = Math.floor(ms / 1000)
          this.setData({
            duration: sec,
            durationStr: this.formatTime(sec),
          })
        }
        if (this.audioCtx) {
          this.audioCtx.src = url
        }
      },
  
      togglePlay() {
        if (this.data.isPlaying) {
          this.pause()
        } else {
          this.play()
        }
      },
  
      play() {
        if (this.audioCtx && this.data.src) {
          this.audioCtx.src = this.data.src
          this.audioCtx.play()
          this.setData({ isPlaying: true })
        }
      },
  
      pause() {
        this.audioCtx.pause()
        this.setData({ isPlaying: false })
      },
  
      onSliderChange(e) {
        const value = e.detail.value
        this.audioCtx.seek(value)
        this.setData({
          currentTime: value,
          currentTimeStr: this.formatTime(value),
        })
      },
  
      formatTime(sec) {
        const m = Math.floor(sec / 60)
        const s = Math.floor(sec % 60)
        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
      },
    },
  })
  