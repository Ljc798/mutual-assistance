import { HttpClient, TaskBidDTO, TaskBidItem, TaskBidBaseResponse, TaskDTO, TaskItem, TaskStatus } from 'basic'

interface QueryParam {
  key: string
  value: string
}

interface TaskBidListResponse {
  success: boolean
  bids: TaskBidDTO[]
}

function toBidItem(dto: TaskBidDTO): TaskBidItem {
  return {
    id: dto.id,
    taskId: dto.task_id,
    bidderId: dto.user_id ?? dto.bidder_id ?? 0,
    bidderName: dto.username ?? dto.bidder_name ?? '匿名用户',
    bidderAvatar: dto.avatar_url ?? dto.bidder_avatar,
    price: dto.price,
    advantage: dto.advantage,
    selected: Boolean(dto.selected),
    createdTime: dto.created_time
  }
}

function formatDeadline(value: string): string {
  const date = new Date(value)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const pad = (num: number) => num < 10 ? `0${num}` : `${num}`
  return `${pad(month)}-${pad(day)} ${pad(hours)}:${pad(minutes)}`
}

function toTaskItem(item: TaskDTO): TaskItem {
  return {
    id: String(item.id),
    title: item.title,
    category: item.category,
    deadline: item.DDL,
    position: item.position,
    address: item.address,
    status: item.status as TaskStatus,
    mode: item.mode === 'bidding' ? 'bidding' : 'fixed',
    offer: item.offer,
    hasPaid: false,
    formattedDeadline: formatDeadline(item.DDL),
    detail: item.detail,
    employerId: item.employer_id,
    employeeId: item.employee_id,
    employerName: item.employer_name,
    employerAvatar: item.employer_avatar,
    employeeName: item.employee_name,
    employeeAvatar: item.employee_avatar,
    takeawayCode: item.takeaway_code,
    takeawayTel: item.takeaway_tel,
    takeawayName: item.takeaway_name
  }
}

export async function fetchTaskDetail(taskId: number): Promise<TaskItem> {
  const response = await HttpClient.get<TaskDTO>(`/task/${taskId}`)
  return toTaskItem(response)
}

export async function fetchTaskBids(taskId: number): Promise<TaskBidItem[]> {
  const response = await HttpClient.get<TaskBidListResponse>(`/task/${taskId}/bids`)
  console.info('[TaskDetailService] fetchTaskBids raw:', JSON.stringify(response))
  return (response.bids ?? []).map(toBidItem)
}

export interface SubmitBidPayload {
  task_id: number
  user_id: number
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
  return HttpClient.post<TaskBidBaseResponse, TakeTaskPayload>(`/task/${payload.task_id}/accept`, payload, { Authorization: `Bearer ${token}` })
}

export interface AliPrepayResponse {
  success: boolean
  out_trade_no?: string
  total_amount?: string
  data?: Object
  responseHttpStatus?: number
  traceId?: string
  message?: string
}

export interface AliPrepayBidPayload {
  bid_id: number
}

export async function prepayAliBid(bidId: number, token: string): Promise<AliPrepayResponse> {
  const payload: AliPrepayBidPayload = { bid_id: bidId }
  return HttpClient.post<AliPrepayResponse, AliPrepayBidPayload>('/pay/ali/prepay-bid', payload, { Authorization: `Bearer ${token}` })
}

export interface ReviewPayload {
  rating: number
  comment: string
}

export interface ReviewDetail {
  id: number
  task_id: number
  reviewer_id: number
  target_id: number
  rating: string
  comment: string
  created_at: string
}

export interface ReviewResponse {
  success: boolean
  message?: string
  review?: ReviewDetail
}

export async function submitReview(taskId: number, payload: ReviewPayload, token: string): Promise<ReviewResponse> {
  return HttpClient.post<ReviewResponse, ReviewPayload>(`/task/${taskId}/review`, payload, { Authorization: `Bearer ${token}` })
}

export async function fetchReview(taskId: number, token: string): Promise<ReviewResponse> {
  return HttpClient.get<ReviewResponse>(`/task/${taskId}/review`, undefined, { Authorization: `Bearer ${token}` })
}
