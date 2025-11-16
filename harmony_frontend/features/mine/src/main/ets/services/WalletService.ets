import { HttpClient } from 'basic'

export interface WithdrawPayload {
  amount: string
  method: string
  phone: string
}

export interface WithdrawResponse {
  success: boolean
  message?: string
}

export async function submitWithdraw(payload: WithdrawPayload, token: string): Promise<WithdrawResponse> {
  return HttpClient.post<WithdrawResponse, WithdrawPayload>("/wallet/withdraw", payload, { Authorization: `Bearer ${token}` })
}