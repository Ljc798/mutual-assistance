import { AppStorageV2 } from "@kit.ArkUI"
import { AppUser, MutualUser, UserInfo } from "../viewmodels/common"

export class Auth {
  setUser(user: UserInfo) {
    const appUser = AppStorageV2.connect(AppUser, () => new AppUser())!
    appUser.user = new MutualUser(user)
  }

  getUser(): MutualUser {
    const appUser = AppStorageV2.connect(AppUser, () => new AppUser())!
    return appUser.user
  }

  clear() {
    const appUser = AppStorageV2.connect(AppUser, () => new AppUser())!
    appUser.user = new MutualUser()
  }
}

export const auth = new Auth()
