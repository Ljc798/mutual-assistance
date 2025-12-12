import { HttpClient, AuthHeader } from 'basic'

export interface FeedbackPayload { title: string; content: string }
export interface BaseResponse { success: boolean; message?: string }

export async function submitFeedback(payload: FeedbackPayload, token: string): Promise<BaseResponse> {
  const headers: AuthHeader = { Authorization: `Bearer ${token}` }
  return await HttpClient.post<BaseResponse, FeedbackPayload>('/feedback/submit', payload, headers)
}
