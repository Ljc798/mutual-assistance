import { HuaweiLoginParams } from "../viewmodels/user";
import { MutualUser, HttpClient } from "basic";

export interface LoginResponse {
  success: boolean
  token?: string
  user?: MutualUser
  isNewUser?: boolean
  message?: string
}

export interface PhoneLoginPayload {
  phoneNumber?: string
  phoneCode?: string
  loginCode?: string
}

export async function loginAPI(data: PhoneLoginPayload): Promise<LoginResponse> {
  return HttpClient.post<LoginResponse, PhoneLoginPayload>("/user/phone-login", data)
}

export async function huaweiLoginAPI(data: HuaweiLoginParams): Promise<LoginResponse> {
  return loginAPI({ loginCode: data.code })
}
