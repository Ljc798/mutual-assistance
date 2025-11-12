import { media } from "@kit.MediaKit"
import { audio } from "@kit.AudioKit";
import { application } from "@kit.AbilityKit";

export class SoundManager {
  pool: media.SoundPool | null = null

  async initPool() {
    let audioRendererInfo: audio.AudioRendererInfo = {
      usage: audio.StreamUsage.STREAM_USAGE_MUSIC, // 音频流使用类型：音乐。根据业务场景配置，参考StreamUsage。
      rendererFlags: 0 // 音频渲染器标志。
    };
    this.pool = await media.createSoundPool(5, audioRendererInfo)
  }

  async play(fileName: string) {
    if (!this.pool) {
      await this.initPool()
    }
    let soundId: number | undefined
    this.pool?.on("loadComplete", () => {
      // 认为之前load的方法成功了资源加载成功了
      // 这个回调函数当load方法加载完成就会执行
      this.pool?.play(soundId)
    })
    this.pool?.on("playFinished", () => {
      this.pool?.off("loadComplete")
      this.pool?.off("playFinished")
    })
    //   播放 拿到 basic模块的上下文对象
    const basicContext = await application.createModuleContext(getContext(), "basic")
    const des = basicContext.resourceManager.getRawFdSync(fileName)
    // des.fd
    soundId = await this.pool?.load(des.fd, des.offset, des.length)


  }
}

export const soundManager = new SoundManager()