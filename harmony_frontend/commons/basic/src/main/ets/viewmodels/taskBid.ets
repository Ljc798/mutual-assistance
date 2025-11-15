export interface TaskBidDTO {
  id: number
  task_id: number
  bidder_id: number
  bidder_name?: string
  price: number
  advantage: string
  selected?: number
  created_time?: string
}

export interface TaskBidItem {
  id: number
  taskId: number
  bidderId: number
  bidderName: string
  price: number
  advantage: string
  selected: boolean
  createdTime?: string
}

export interface BaseResponse {
  success: boolean
  message?: string
}