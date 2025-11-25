import { HttpClient } from 'basic'
import { ChatMessageDTO, ChatMessageItem } from '../viewmodels/ChatVM'
import webSocket from '@ohos.net.webSocket'
import { BusinessError } from '@ohos.base'
import { GlobalVariable } from 'basic'

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

interface WSInitPayload {
  type: string
  userId: number
}

interface WSChatPayload {
  type: string
  userId: number
  targetId: number
  content: string
}

interface WSIncomingChatMessage {
  type: string
  id: number
  room_id: string
  sender_id: number
  receiver_id: number
  content: string
  created_time: string
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
  private socket?: webSocket.WebSocket
  private connected: boolean = false
  private lastId: number = 0
  constructor(userId: number, roomId: string, targetId: number) {
    this.userId = userId
    this.roomId = roomId
    this.targetId = targetId
  }
  connect(onMessage: (msg: ChatMessageItem) => void): void {
    const url: string = this.buildWsUrl()
    this.socket = webSocket.createWebSocket()
    this.connected = false

    this.socket.on('open', (_err: BusinessError | undefined, _value: Object) => {
      this.connected = true
      const initPayload = this.buildInitPayload()
      try {
        this.socket?.send(JSON.stringify(initPayload), (_e?: BusinessError) => {})
      } catch (_e) {}
    })

    this.socket.on('message', (_err: BusinessError | undefined, value: string | ArrayBuffer) => {
      const text: string = typeof value === 'string' ? value : ''
      if (!text) { return }
      try {
        const data = JSON.parse(text) as WSIncomingChatMessage
        const maybeType: string = data.type
        if (maybeType === 'chat') {
          const dto: ChatMessageDTO = {
            id: data.id,
            room_id: data.room_id,
            sender_id: data.sender_id,
            receiver_id: data.receiver_id,
            content: data.content,
            created_time: data.created_time
          }
          if (dto.id && dto.id > this.lastId) {
            this.lastId = dto.id
            const item = toItem(dto, this.userId)
            onMessage(item)
          }
        }
      } catch (_e) {}
    })

    this.socket.on('close', (_err: BusinessError | undefined, _result: webSocket.CloseResult) => {
      this.connected = false
      this.startPollFallback(onMessage)
    })

    this.socket.on('error', (_err: BusinessError) => {
      this.connected = false
      this.startPollFallback(onMessage)
    })

    this.socket.connect(url, (_err: BusinessError | undefined, _ok: boolean) => {})
  }

  sendText(text: string): void {
    const payload = this.buildChatPayload(text)
    try {
      if (this.socket && this.connected) {
        this.socket.send(JSON.stringify(payload), (_e?: BusinessError) => {})
      }
    } catch (_e) {}
  }

  close(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = undefined }
    try { this.socket?.close() } catch (_e) {}
    this.connected = false
  }

  private startInitialPoll(onMessage: (msg: ChatMessageItem) => void): void {
    const pollOnce = async () => {
      try {
        const list = await fetchHistory(this.roomId, this.userId)
        if (list.length > 0) { onMessage(list[list.length - 1]) }
      } catch (_e) {}
    }
    try { pollOnce() } catch (_e) {}
  }

  private startPollFallback(onMessage: (msg: ChatMessageItem) => void): void {
    if (this.timer) { return }
    const poll = async () => {
      try {
        const list = await fetchHistory(this.roomId, this.userId)
        if (list.length > 0) {
          const last = list[list.length - 1]
          if (last.id > this.lastId) {
            this.lastId = last.id
            onMessage(last)
          }
        }
      } catch (_e) {}
    }
    this.timer = setInterval(poll, 3000)
  }

  private buildWsUrl(): string {
    const apiBase: string = GlobalVariable.BASE_URL
    const isHttps: boolean = apiBase.startsWith('https')
    const scheme: string = isHttps ? 'wss' : 'ws'
    const trimmed: string = apiBase.replace('http://', '').replace('https://', '')
    const slashIndex: number = trimmed.indexOf('/')
    const host: string = slashIndex >= 0 ? trimmed.substring(0, slashIndex) : trimmed
    return `${scheme}://${host}/ws`
  }

  private buildInitPayload(): WSInitPayload {
    const payload: WSInitPayload = { type: 'init', userId: this.userId }
    return payload
  }

  private buildChatPayload(text: string): WSChatPayload {
    const payload: WSChatPayload = { type: 'chat', userId: this.userId, targetId: this.targetId, content: text }
    return payload
  }
}
