import { HttpClient } from 'basic'
import { ChatMessageDTO, ChatMessageItem } from '../viewmodels/ChatVM'

interface QueryParam {
  key: string
  value: string
}

interface HistoryResponse {
  success: boolean
  messages: ChatMessageDTO[]
}

interface MarkReadPayload {
  room_id: string
  user_id: number
}

interface BaseResponse {
  success: boolean
  message?: string
}

function toItem(dto: ChatMessageDTO, selfId: number): ChatMessageItem {
  return {
    id: dto.id,
    roomId: dto.room_id,
    senderId: dto.sender_id,
    receiverId: dto.receiver_id,
    content: dto.content,
    createdTime: dto.created_time,
    isSelf: dto.sender_id === selfId
  }
}

export async function fetchHistory(roomId: string, selfId: number): Promise<ChatMessageItem[]> {
  const params: QueryParam[] = [{ key: 'room_id', value: roomId }]
  const res = await HttpClient.get<HistoryResponse>('/messages/history', params)
  if (!res.success) { return [] }
  const list: ChatMessageDTO[] = res.messages ?? []
  const items: ChatMessageItem[] = []
  for (let i = 0; i < list.length; i++) {
    items.push(toItem(list[i], selfId))
  }
  return items
}

export async function markRead(roomId: string, userId: number): Promise<BaseResponse> {
  const body: MarkReadPayload = { room_id: roomId, user_id: userId }
  return HttpClient.post<BaseResponse, MarkReadPayload>('/messages/mark-read', body)
}

export class ChatClient {
  private readonly userId: number
  private readonly roomId: string
  private readonly targetId: number
  private timer?: number
  constructor(userId: number, roomId: string, targetId: number) {
    this.userId = userId
    this.roomId = roomId
    this.targetId = targetId
  }
  connect(onMessage: (msg: ChatMessageItem) => void): void {
    const poll = async () => {
      try {
        const list = await fetchHistory(this.roomId, this.userId)
        if (list.length > 0) {
          onMessage(list[list.length - 1])
        }
      } catch (_e) {}
    }
    this.timer = setInterval(poll, 3000)
  }
  sendText(text: string): void {
    const dto: ChatMessageDTO = {
      id: Date.now(),
      room_id: this.roomId,
      sender_id: this.userId,
      receiver_id: this.targetId,
      content: text,
      created_time: new Date().toISOString()
    }
    const item = toItem(dto, this.userId)
    // 调用方会先本地显示，再由轮询拉取真实消息
  }
  close(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = undefined }
  }
}
