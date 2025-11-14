import { AuthHeader, HttpClient } from 'basic'
import {
  PublishCreatePayload,
  PublishCreateResponse,
  TaskPrepayResponse
} from '../viewmodels/PublishTypes'

function buildAuthHeader(token?: string): AuthHeader | undefined {
  if (!token) {
    return undefined
  }
  return { Authorization: `Bearer ${token}` }
}

export async function createTask(payload: PublishCreatePayload, token: string): Promise<PublishCreateResponse> {
  return HttpClient.post<PublishCreateResponse, PublishCreatePayload>('/task/create', payload, buildAuthHeader(token))
}

export function calculateCommission(amountYuan: number): number {
  if (Number.isNaN(amountYuan) || amountYuan <= 0) {
    return 1
  }
  const fen = Math.floor(amountYuan * 100 * 0.02)
  return Math.max(fen, 1)
}
