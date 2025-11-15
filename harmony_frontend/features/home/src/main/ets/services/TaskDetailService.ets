import { HttpClient, TaskBidDTO, TaskBidItem, TaskBidBaseResponse } from 'basic'

interface QueryParam {
  key: string
  value: string
}

function toBidItem(dto: TaskBidDTO): TaskBidItem {
  return {
    id: dto.id,
    taskId: dto.task_id,
    bidderId: dto.bidder_id,
    bidderName: dto.bidder_name ?? '匿名用户',
    price: dto.price,
    advantage: dto.advantage,
    selected: Boolean(dto.selected),
    createdTime: dto.created_time
  }
}

export async function fetchTaskBids(taskId: number): Promise<TaskBidItem[]> {
  const response = await HttpClient.get<TaskBidDTO[]>(`/task/${taskId}/bids`)
  return (response ?? []).map(toBidItem)
}

export interface SubmitBidPayload {
  task_id: number
  price: number
  advantage: string
}

export async function submitBid(payload: SubmitBidPayload, token: string): Promise<TaskBidBaseResponse> {
  return HttpClient.post<TaskBidBaseResponse, SubmitBidPayload>('/task/bid', payload, { Authorization: `Bearer ${token}` })
}

export interface CancelBidPayload {
  task_id: number
}

export async function cancelBid(payload: CancelBidPayload, token: string): Promise<TaskBidBaseResponse> {
  return HttpClient.post<TaskBidBaseResponse, CancelBidPayload>('/task/bid/cancel', payload, { Authorization: `Bearer ${token}` })
}

export interface SelectBidPayload {
  task_id: number
  bid_id: number
}

export async function selectBid(payload: SelectBidPayload, token: string): Promise<TaskBidBaseResponse> {
  return HttpClient.post<TaskBidBaseResponse, SelectBidPayload>('/task/bid/select', payload, { Authorization: `Bearer ${token}` })
}

export interface TakeTaskPayload {
  task_id: number
}

export async function takeTask(payload: TakeTaskPayload, token: string): Promise<TaskBidBaseResponse> {
  return HttpClient.post<TaskBidBaseResponse, TakeTaskPayload>('/task/take', payload, { Authorization: `Bearer ${token}` })
}