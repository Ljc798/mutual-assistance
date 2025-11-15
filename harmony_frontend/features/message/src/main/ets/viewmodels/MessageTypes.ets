export interface ChatDTO {
  room_id: string
  username?: string
  avatar_url?: string
  content?: string
  created_time: string
  unread_count?: number
}

export interface ChatPreview {
  roomId: string
  targetId: number
  username: string
  avatarUrl: string
  lastMessage: string
  timestamp: string
  unread: number
}

export interface ChatListResponse {
  success: boolean
  chats: ChatDTO[]
}

export interface NotificationDTO {
  content: string
}

export interface NotificationResponse {
  success: boolean
  notification?: NotificationDTO
}
