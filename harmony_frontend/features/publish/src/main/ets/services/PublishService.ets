import { AuthHeader, HttpClient, TaskDTO } from 'basic'
import {
  PublishCreatePayload,
  PublishCreateResponse,
  PublishUpdatePayload,
  PublishUpdateResponse,
  TaskPrepayResponse
} from '../viewmodels/PublishTypes'

function buildAuthHeader(token?: string): AuthHeader | undefined {
  if (!token) {
    return undefined
  }
  return { Authorization: `Bearer ${token}` }
}

export async function createTask(payload: PublishCreatePayload, token: string): Promise<PublishCreateResponse> {
  return HttpClient.post<PublishCreateResponse, PublishCreatePayload>('/harmony/task/create', payload, buildAuthHeader(token))
}

export async function updateTask(payload: PublishUpdatePayload, token: string): Promise<PublishUpdateResponse> {
  return HttpClient.post<PublishUpdateResponse, PublishUpdatePayload>('/task/update', payload, buildAuthHeader(token))
}

export async function getTaskDetail(taskId: number, token?: string): Promise<TaskDTO> {
  return HttpClient.get<TaskDTO>(`/task/${taskId}`, undefined, buildAuthHeader(token))
}

export function calculateCommission(amountYuan: number): number {
  if (Number.isNaN(amountYuan) || amountYuan <= 0) {
    return 1
  }
  const fen = Math.floor(amountYuan * 100 * 0.02)
  return Math.max(fen, 1)
}

interface PrepayFixedPayload { task_id: number; include_commission: boolean }

export async function prepayFixed(taskId: number, includeCommission: boolean, token: string): Promise<TaskPrepayResponse> {
  const payload: PrepayFixedPayload = { task_id: taskId, include_commission: includeCommission }
  return HttpClient.post<TaskPrepayResponse, PrepayFixedPayload>('/taskPayment/prepay-fixed', payload, buildAuthHeader(token))
}

interface AliPrepayPayload { task_id: number, include_commission: boolean, amount?: number }
export interface AliPrepayResponse { success: boolean, out_trade_no?: string, total_amount?: string, data?: Object, responseHttpStatus?: number, traceId?: string, message?: string }

export async function prepayAliTask(taskId: number, includeCommission: boolean, token: string, amount?: number): Promise<AliPrepayResponse> {
  const payload: AliPrepayPayload = { task_id: taskId, include_commission: includeCommission }
  if (amount !== undefined) {
    payload.amount = amount
  }
  return HttpClient.post<AliPrepayResponse, AliPrepayPayload>('/pay/ali/prepay-task', payload, buildAuthHeader(token))
}

interface HuaweiPrepayPayload { task_id: number, include_commission: boolean, amount?: number }
export interface HuaweiPrepayResponse { success: boolean, out_trade_no?: string, total_amount?: string, data?: Object, responseHttpStatus?: number, traceId?: string, message?: string }

export async function prepayHuaweiTask(taskId: number, includeCommission: boolean, token: string, amount?: number): Promise<HuaweiPrepayResponse> {
  const payload: HuaweiPrepayPayload = { task_id: taskId, include_commission: includeCommission }
  if (amount !== undefined) {
    payload.amount = amount
  }
  return HttpClient.post<HuaweiPrepayResponse, HuaweiPrepayPayload>('/pay/huawei/prepay-task', payload, buildAuthHeader(token))
}
