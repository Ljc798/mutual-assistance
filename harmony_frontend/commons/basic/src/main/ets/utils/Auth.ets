import { AppStorageV2 } from "@kit.ArkUI"
import { AppUser, MutualUser, UserInfo } from "../viewmodels/common"

export class Auth {
  setUser(user: MutualUser) {
    let appUser = AppStorageV2.connect(AppUser, () => new AppUser())!
    appUser.user = user
  }

  getUser() {
    const appUser = AppStorageV2.connect(AppUser, () => new AppUser())!
    return appUser.user
  }
}

export const auth = new Auth()