import http from '@ohos.net.http'
import promptAction from '@ohos.promptAction'
import { GlobalVariable } from '../components/GlobalVariable'
import { userPersistence } from './UserPersistenceManager'

interface QueryParam {
  key: string
  value: string
}

export interface AuthHeader {
  Authorization?: string
}

interface JsonHeader extends AuthHeader {
  'Content-Type': string
}

export class HttpClient {
  private static buildUrl(base: string, params?: QueryParam[]): string {
    if (!params || params.length === 0) {
      return base
    }
    const parts: string[] = []
    for (let i = 0; i < params.length; i++) {
      const p = params[i]
      parts.push(`${encodeURIComponent(p.key)}=${encodeURIComponent(p.value ?? '')}`)
    }
    return `${base}?${parts.join('&')}`
  }

  static async get<T>(path: string, params?: QueryParam[], headers?: AuthHeader): Promise<T> {
    const url = HttpClient.buildUrl(`${GlobalVariable.BASE_URL}${path}`, params)
    const client = http.createHttp()
    let header: AuthHeader | undefined = headers
      ? { Authorization: headers.Authorization }
      : undefined;
    try {
      const config: http.HttpRequestOptions = {
        method: http.RequestMethod.GET,
        header: header,
        connectTimeout: GlobalVariable.TIME_OUT,
        readTimeout: GlobalVariable.TIME_OUT
      }
      const res = await client.request(url, config)
      // 如果是登录接口报 401，说明是账号密码错误，不应该清除本地用户信息，而是抛出错误让业务层处理
      const isLoginPath = path.includes('/login')
      if (res.responseCode === 401) {
        if (!isLoginPath) {
          userPersistence.clearUser()
          promptAction.showToast({ message: '登录已过期，请重新登录' })
        }
        throw new Error('HTTP 401')
      }
      if (res.responseCode >= 200 && res.responseCode < 300) {
        const text = typeof res.result === 'string' ? res.result : JSON.stringify(res.result)
        return JSON.parse(text) as T
      }
      throw new Error(`HTTP ${res.responseCode}`)
    } finally {
      client.destroy()
    }
  }

  static async post<T, B>(path: string, body: B, headers?: AuthHeader): Promise<T> {
    const url = `${GlobalVariable.BASE_URL}${path}`
    const client = http.createHttp()
    try {
      const jsonHeader: JsonHeader = { 'Content-Type': 'application/json', Authorization: headers?.Authorization }
      const config: http.HttpRequestOptions = {
        method: http.RequestMethod.POST,
        header: jsonHeader,
        connectTimeout: GlobalVariable.TIME_OUT,
        readTimeout: GlobalVariable.TIME_OUT,
        extraData: JSON.stringify(body)
      }
      const res = await client.request(url, config)
      const isLoginPath = path.includes('/login')
      if (res.responseCode === 401) {
        if (!isLoginPath) {
          userPersistence.clearUser()
          promptAction.showToast({ message: '登录已过期，请重新登录' })
        }
        const text401 = typeof res.result === 'string' ? res.result : JSON.stringify(res.result)
        try {
          const data = JSON.parse(text401) as ErrorPayload
          const msg: string = data.message ? data.message : (data.error ? data.error : 'HTTP 401')
          throw new Error(msg)
        } catch (_e) {
          throw new Error('HTTP 401')
        }
      }
      const text = typeof res.result === 'string' ? res.result : JSON.stringify(res.result)
      if (res.responseCode >= 200 && res.responseCode < 300) {
        return JSON.parse(text) as T
      }
      try {
        const data = JSON.parse(text) as ErrorPayload
        const msg: string = data.message ? data.message : (data.error ? data.error : `HTTP ${res.responseCode}`)
        throw new Error(msg)
      } catch (_e) {
        throw new Error(`HTTP ${res.responseCode}`)
      }
    } finally {
      client.destroy()
    }
  }
}
interface ErrorPayload { message?: string; error?: string }
