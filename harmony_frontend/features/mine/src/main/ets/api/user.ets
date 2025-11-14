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
