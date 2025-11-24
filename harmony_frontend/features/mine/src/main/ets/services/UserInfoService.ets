import { HttpClient, AuthHeader } from 'basic'
import { UserInfo } from 'basic'

interface ProfileResponse { success: boolean; user?: UserInfo; message?: string }

function auth(token: string): AuthHeader { return { Authorization: `Bearer ${token}` } }

export async function fetchProfile(token: string): Promise<ProfileResponse> {
  return HttpClient.get<ProfileResponse>('/user/info', undefined, auth(token))
}