import { HttpClient, AuthHeader } from 'basic'

export interface UpdatePayload {
  username?: string
  avatar_url?: string
  wxid?: string
  school_id?: number
}

interface BaseResponse { success: boolean, message?: string }
interface CheckAvailabilityResponse { success: boolean, available: boolean, message?: string }
interface CheckUsernamePayload { username: string, id?: number }
interface CheckWxidPayload { wxid: string, id?: number }

function auth(token: string): AuthHeader { return { Authorization: `Bearer ${token}` } }

export async function checkUsername(username: string, id?: number): Promise<CheckAvailabilityResponse> {
  const payload: CheckUsernamePayload = { username, id }
  return HttpClient.post<CheckAvailabilityResponse, CheckUsernamePayload>('/user/check-username', payload)
}

export async function checkWxid(wxid: string, id?: number): Promise<CheckAvailabilityResponse> {
  const payload: CheckWxidPayload = { wxid, id }
  return HttpClient.post<CheckAvailabilityResponse, CheckWxidPayload>('/user/check-wxid', payload)
}

export async function updateProfile(payload: UpdatePayload, token: string): Promise<BaseResponse> {
  return HttpClient.post<BaseResponse, UpdatePayload>('/user/update', payload, auth(token))
}

export async function updateProfileBasic(payload: UpdatePayload, token: string): Promise<BaseResponse> {
  return HttpClient.post<BaseResponse, UpdatePayload>('/user/harmony/update-basic', payload, auth(token))
}

export interface DeletePayload { reason: string }
export async function deleteAccount(token: string): Promise<BaseResponse> {
  const payload: DeletePayload = { reason: 'user_request' }
  return HttpClient.post<BaseResponse, DeletePayload>('/user/delete', payload, auth(token))
}

export interface UserInfoSnapshot { avatar_url?: string }
export interface UserInfoResponse { success: boolean; user?: UserInfoSnapshot }
export async function fetchUserInfo(token: string): Promise<UserInfoResponse> {
  return HttpClient.get<UserInfoResponse>('/user/info', undefined, auth(token))
}
