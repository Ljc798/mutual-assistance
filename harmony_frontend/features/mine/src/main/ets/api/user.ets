import { HttpClient, MutualUser } from "basic"

export interface LoginResponse {
  success: boolean
  token?: string
  user?: MutualUser
  isNewUser?: boolean
  message?: string
}

export interface PasswordLoginPayload {
  phone: string
  password: string
}

export async function passwordLoginAPI(payload: PasswordLoginPayload): Promise<LoginResponse> {
  return HttpClient.post<LoginResponse, PasswordLoginPayload>('/user/password-login', payload)
}

export interface AdminLoginPayload {
  phone: string
  password: string
}

export interface AdminLoginResponse {
  token: string
}

export async function adminLoginAPI(payload: AdminLoginPayload): Promise<AdminLoginResponse> {
  return HttpClient.post<AdminLoginResponse, AdminLoginPayload>('/user/admin-login', payload)
}

export interface SendCodePayload { phone: string }
export interface BaseResponse { success: boolean; message?: string }

export async function sendSmsCodeAPI(payload: SendCodePayload): Promise<BaseResponse> {
  return HttpClient.post<BaseResponse, SendCodePayload>('/user/sms/send-code', payload)
}

export interface PhoneCodeLoginPayload { phone: string; code: string }

export async function phoneCodeLoginAPI(payload: PhoneCodeLoginPayload): Promise<LoginResponse> {
  return HttpClient.post<LoginResponse, PhoneCodeLoginPayload>('/user/sms-login', payload)
}
