import { HttpClient } from 'basic'
import { BaseResponse, CancelCountResponse, CancelPayload, MyOrderItem, MyOrderQuery } from '../viewmodels/OrdersTypes'

interface QueryParam { key: string, value: string }

function buildQuery(query: MyOrderQuery): QueryParam[] {
  const params: QueryParam[] = []
  params.push({ key: 'userId', value: `${query.userId}` })
  if (query.role && query.role !== 'all') { params.push({ key: 'role', value: query.role }) }
  if (query.status !== undefined && query.status !== 'all') { params.push({ key: 'status', value: `${query.status}` }) }
  return params
}

interface GeneratedTypeLiteralInterface_1 {
  success: boolean;
  tasks: MyOrderItem[];
}

interface GeneratedTypeLiteralInterface_2 {
  success: boolean;
  tasks: MyOrderItem[];
}

export async function fetchMyOrders(query: MyOrderQuery, token: string): Promise<GeneratedTypeLiteralInterface_1> {
  const params = buildQuery(query)
  return HttpClient.get<GeneratedTypeLiteralInterface_2>("/task/my", params, { Authorization: `Bearer ${token}` })
}

export async function confirmTaskDone(taskId: number, token: string): Promise<BaseResponse> {
  return HttpClient.post<BaseResponse, Record<string, never>>(`/task/${taskId}/confirm-done`, {}, { Authorization: `Bearer ${token}` })
}

export async function fetchCancelFreeCount(userId: number): Promise<CancelCountResponse> {
  const params: QueryParam[] = [{ key: 'user_id', value: `${userId}` }]
  return HttpClient.get<CancelCountResponse>("/task/cancel/count", params)
}

export async function cancelTask(payload: CancelPayload, token: string): Promise<BaseResponse> {
  return HttpClient.post<BaseResponse, CancelPayload>("/task/cancel", payload, { Authorization: `Bearer ${token}` })
}