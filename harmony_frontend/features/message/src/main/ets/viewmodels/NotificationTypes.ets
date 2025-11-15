export interface NotificationDTO {
  id: number
  type?: string
  title?: string
  content?: string
  is_read?: number
  created_at: string
}

export interface NotificationItem {
  id: number
  title: string
  content: string
  createdTime: string
  isRead: boolean
}