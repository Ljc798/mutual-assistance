import { Type } from "@kit.ArkUI";

export interface UserInfo {
  id?: number
  token?: string
  avatar_url?: string
  username?: string
  wxid?: string
  phone_number?: string
  openid?: string
  points?: number
  free_counts?: number
  balance?: number | string
  vip_expire_time?: string
  vip_level?: number
}

// 全局用户类型
@ObservedV2
export class MutualUser implements UserInfo {
  @Trace
  id?: number
  @Trace
  token: string = ''
  @Trace
  avatar_url: string = ''
  @Trace
  username: string = ''
  @Trace
  wxid: string = ''
  @Trace
  phone_number: string = ''
  @Trace
  openid?: string
  @Trace
  points: number = 0
  @Trace
  free_counts: number = 0
  @Trace
  balance?: number | string
  @Trace
  vip_expire_time?: string
  @Trace
  vip_level?: number

  constructor(model?: UserInfo) {
    if (!model) {
      return
    }
    this.id = model.id
    this.token = model.token ?? ''
    this.avatar_url = model.avatar_url ?? ''
    this.username = model.username ?? ''
    this.wxid = model.wxid ?? ''
    this.phone_number = model.phone_number ?? ''
    this.openid = model.openid
    this.points = model.points ?? 0
    this.free_counts = model.free_counts ?? 0
    this.balance = model.balance
    this.vip_expire_time = model.vip_expire_time
    this.vip_level = model.vip_level
  }
}

@ObservedV2
export class AppUser {
  @Type(MutualUser) // 当缓存的对象为复杂数据类型时 需要用@Type装饰器装饰这个类 保证不丢失
  @Trace
  user: MutualUser = new MutualUser()
}
