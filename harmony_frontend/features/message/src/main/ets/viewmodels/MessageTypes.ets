export interface ChatDTO {
  room_id: string
  username?: string
  avatar_url?: string
  content?: string
  created_time: string
  unread_count?: number
}

@ObservedV2
export class ChatPreview {
  @Trace roomId: string = ''
  @Trace targetId: number = 0
  @Trace username: string = ''
  @Trace avatarUrl: string = ''
  @Trace lastMessage: string = ''
  @Trace timestamp: string = ''
  @Trace unread: number = 0
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
