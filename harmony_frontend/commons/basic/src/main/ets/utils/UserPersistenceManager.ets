import { UserInfo } from '../viewmodels/common'
import { auth } from './Auth'

type PersistDefaultValue = string | number | boolean

interface PersistOption {
  key: string
  defaultValue: PersistDefaultValue
}

interface UserSnapshot extends UserInfo {
  token: string
}

interface RawUserSnapshot {
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

const USER_INFO_KEY: string = 'app_user_snapshot'
const USER_LOGIN_STATE_KEY: string = 'app_user_is_logged_in'
const USER_LOGIN_TIME_KEY: string = 'app_user_login_time'
const STORAGE_DEFAULTS: PersistOption[] = [
  { key: USER_INFO_KEY, defaultValue: '' },
  { key: USER_LOGIN_STATE_KEY, defaultValue: false },
  { key: USER_LOGIN_TIME_KEY, defaultValue: 0 }
]

class UserPersistenceManager {
  private persistenceReady: boolean = false

  initialize(): void {
    this.ensurePersistentConfig()
    this.restoreUserFromDisk()
  }

  persistUser(user: UserInfo): void {
    this.ensurePersistentConfig()
    const snapshot: UserSnapshot = this.normalizeSnapshot(user)
    auth.setUser(snapshot)
    this.persistSnapshot(snapshot)
  }

  clearUser(): void {
    this.ensurePersistentConfig()
    AppStorage.setOrCreate(USER_INFO_KEY, '')
    AppStorage.setOrCreate(USER_LOGIN_STATE_KEY, false)
    AppStorage.setOrCreate(USER_LOGIN_TIME_KEY, 0)
    auth.clear()
  }

  private ensurePersistentConfig(): void {
    if (this.persistenceReady) {
      return
    }
    PersistentStorage.persistProps(STORAGE_DEFAULTS)
    this.persistenceReady = true
  }

  private restoreUserFromDisk(): void {
    const isLoggedIn: boolean = this.readBoolean(USER_LOGIN_STATE_KEY)
    const snapshotText: string = this.readString(USER_INFO_KEY)
    if (!isLoggedIn || snapshotText.length === 0) {
      this.clearUser()
      return
    }
    const snapshot: UserSnapshot | undefined = this.decodeSnapshot(snapshotText)
    if (!snapshot) {
      this.clearUser()
      return
    }
    auth.setUser(snapshot)
  }

  private readBoolean(key: string): boolean {
    const value: boolean | undefined = AppStorage.get<boolean>(key)
    return value ?? false
  }

  private readString(key: string): string {
    const value: string | undefined = AppStorage.get<string>(key)
    return value ?? ''
  }

  private decodeSnapshot(payload: string): UserSnapshot | undefined {
    try {
      const rawSnapshot: RawUserSnapshot = JSON.parse(payload) as RawUserSnapshot
      const normalizedSnapshot: UserSnapshot = this.normalizeSnapshot(rawSnapshot)
      if (normalizedSnapshot.token.length === 0) {
        return undefined
      }
      return normalizedSnapshot
    } catch (error) {
      console.error('Failed to restore user snapshot', error.message)
      return undefined
    }
  }

  private normalizeSnapshot(model: RawUserSnapshot | UserInfo): UserSnapshot {
    const tokenValue: string = typeof model.token === 'string' ? model.token : ''
    return {
      id: typeof model.id === 'number' ? model.id : undefined,
      token: tokenValue,
      avatar_url: typeof model.avatar_url === 'string' ? model.avatar_url : '',
      username: typeof model.username === 'string' ? model.username : '',
      wxid: typeof model.wxid === 'string' ? model.wxid : '',
      phone_number: typeof model.phone_number === 'string' ? model.phone_number : '',
      openid: typeof model.openid === 'string' ? model.openid : undefined,
      points: typeof model.points === 'number' ? model.points : 0,
      free_counts: typeof model.free_counts === 'number' ? model.free_counts : 0,
      balance: typeof model.balance === 'number' || typeof model.balance === 'string' ? model.balance : undefined,
      vip_expire_time: typeof model.vip_expire_time === 'string' ? model.vip_expire_time : undefined,
      vip_level: typeof model.vip_level === 'number' ? model.vip_level : undefined
    }
  }

  private persistSnapshot(snapshot: UserSnapshot): void {
    AppStorage.setOrCreate(USER_INFO_KEY, JSON.stringify(snapshot))
    const hasToken: boolean = snapshot.token.length > 0
    AppStorage.setOrCreate(USER_LOGIN_STATE_KEY, hasToken)
    AppStorage.setOrCreate(USER_LOGIN_TIME_KEY, Date.now())
  }
}

export const userPersistence: UserPersistenceManager = new UserPersistenceManager()
