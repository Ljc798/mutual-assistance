import { AuthHeader, HttpClient } from 'basic'
import { ChatDTO, ChatListResponse, ChatPreview, NotificationResponse } from '../viewmodels/MessageTypes'

interface QueryParam {
  key: string
  value: string
}

function buildAuthHeader(token: string): AuthHeader {
  return { Authorization: `Bearer ${token}` }
}

function buildQuery(params: QueryParam[]): QueryParam[] {
  return params
}

function parseRoomId(roomId: string, selfId: number): number {
  const parts = roomId.split('_')
  if (parts.length < 3) {
    return selfId
  }
  const firstId = Number(parts[1])
  const secondId = Number(parts[2])
  return firstId === selfId ? secondId : firstId
}

function formatTimestamp(value: string): string {
  const date = new Date(value)
  const pad = (num: number): string => num < 10 ? `0${num}` : `${num}`
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hour = pad(date.getHours())
  const minute = pad(date.getMinutes())
  return `${month}月${day}日 ${hour}:${minute}`
}

export async function fetchChatPreviews(userId: number, token: string): Promise<ChatPreview[]> {
  const params = buildQuery([{ key: 'userId', value: `${userId}` }])
  const response = await HttpClient.get<ChatListResponse>('/messages/list', params, buildAuthHeader(token))
  if (!response.success) {
    return []
  }
  const previews: ChatPreview[] = []
  for (let i = 0; i < response.chats.length; i++) {
    const item: ChatDTO = response.chats[i]
    const preview: ChatPreview = {
      roomId: item.room_id,
      targetId: parseRoomId(item.room_id, userId),
      username: item.username ?? '匿名用户',
      avatarUrl: item.avatar_url ?? '',
      lastMessage: item.content ?? '',
      timestamp: formatTimestamp(item.created_time),
      unread: item.unread_count ?? 0
    }
    previews.push(preview)
  }
  return previews
}

export async function fetchLatestNotification(token: string): Promise<string> {
  const response = await HttpClient.get<NotificationResponse>('/notification/latest', undefined, buildAuthHeader(token))
  if (!response.success || !response.notification) {
    return ''
  }
  return response.notification.content ?? ''
}

export interface ChatReportPayload { room_id: string; reason: string; description?: string }
interface BaseResponse { success: boolean; message?: string }
export async function reportChat(roomId: string, reason: string, description: string | undefined, token: string): Promise<BaseResponse> {
  const payload: ChatReportPayload = { room_id: roomId, reason, description }
  return HttpClient.post<BaseResponse, ChatReportPayload>('/messages/report', payload, buildAuthHeader(token))
}
