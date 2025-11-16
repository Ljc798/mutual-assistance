export type OrderRole = 'employer' | 'employee' | 'all'

export type OrderStatusFilter = 'all' | 0 | 1 | 2

export interface MyOrderItem {
  id: number
  title: string
  offer: number
  DDL: string
  status: number
  employer_id: number
  employee_id: number | null
  employer_done?: number
  employee_done?: number
  pay_amount?: number
}

export interface MyOrderQuery {
  userId: number
  role?: OrderRole
  status?: OrderStatusFilter
}

export interface CancelCountResponse {
  success: boolean
  freeCancelCount: number
}

export interface CancelPayload {
  task_id: number
  user_id: number
  role: OrderRole
  cancel_reason: string
}

export interface BaseResponse {
  success: boolean
  message?: string
}