export interface ChatMessageDTO {
  id: number
  room_id: string
  sender_id: number
  receiver_id: number
  content: string
  type?: string
  created_time: string
}

export interface ChatMessageItem {
  id: number
  roomId: string
  senderId: number
  receiverId: number
  content: string
  createdTime: string
  isSelf: boolean
}

@ObservedV2
export class AppCurrentChat {
  @Trace
  roomId: string = ''
  @Trace
  targetId: number = 0
  @Trace
  targetName: string = ''
  @Trace
  avatarUrl: string = ''

  set(roomId: string, targetId: number, targetName: string, avatarUrl: string): void {
    this.roomId = roomId
    this.targetId = targetId
    this.targetName = targetName
    this.avatarUrl = avatarUrl
  }

  reset(): void {
    this.roomId = ''
    this.targetId = 0
    this.targetName = ''
    this.avatarUrl = ''
  }
}