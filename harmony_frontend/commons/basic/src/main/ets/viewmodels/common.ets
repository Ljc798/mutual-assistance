import { Type } from "@kit.ArkUI";

export interface UserInfo {
  token: string
  avatar_url: string
  username: string
  wxid: string
}

// 全局用户类型
@ObservedV2
export class MutualUser implements UserInfo {
  @Trace
  token: string = ''
  @Trace
  avatar_url: string = ''
  @Trace
  username: string = ''
  @Trace
  wxid: string = ''
  // constructor(model: UserInfo) {
  //   this.token = model.token
  //   this.avatar = model.avatar
  //   this.nickname = model.nickname
  //   this.account = model.account
  // }
}

@ObservedV2
export class AppUser {
  @Type(MutualUser) // 当缓存的对象为复杂数据类型时 需要用@Type装饰器装饰这个类 保证不丢失
  @Trace
  user: MutualUser = new MutualUser()
}
