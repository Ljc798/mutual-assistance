export interface TabItem {
  text: string
  normal: ResourceStr
  active: ResourceStr
}

export type TaskStatus = 0 | 1 | 2

export interface TaskDTO {
  id: number
  employer_id: number
  employee_id?: number
  category: string
  status: number
  position: string
  address: string
  DDL: string
  title: string
  offer: number
  detail: string
  takeaway_code: string
  takeaway_tel?: number
  takeaway_name: string
}

export interface TaskItemBase {
  id: string
  title: string
  category: string
  deadline: string
  position: string
  address: string
  status: TaskStatus
  offer: number
  formattedDeadline: string
}

export type TaskMode = 'fixed' | 'bidding'

export interface TaskItem extends TaskItemBase {
  mode: TaskMode
  payAmount?: number
  hasPaid: boolean
}
