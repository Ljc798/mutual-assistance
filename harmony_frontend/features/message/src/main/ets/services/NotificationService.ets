import { HttpClient, AuthHeader } from 'basic'
import { NotificationDTO, NotificationItem } from '../viewmodels/NotificationTypes'

interface QueryParam { key: string, value: string }

interface ListResponse { success: boolean, notifications: NotificationDTO[] }
interface LatestResponse { success: boolean, notification?: NotificationDTO | null }
interface BaseResponse { success: boolean, message?: string }

function auth(token: string): AuthHeader { return { Authorization: `Bearer ${token}` } }

function toItem(dto: NotificationDTO): NotificationItem {
  return {
    id: dto.id,
    title: dto.title ?? '系统通知',
    content: dto.content ?? '',
    createdTime: dto.created_at,
    isRead: Boolean(dto.is_read)
  }
}

export async function fetchNotifications(token: string): Promise<NotificationItem[]> {
  const res = await HttpClient.get<ListResponse>('/notification/all', undefined, auth(token))
  if (!res.success) { return [] }
  const list: NotificationDTO[] = res.notifications ?? []
  const items: NotificationItem[] = []
  for (let i = 0; i < list.length; i++) { items.push(toItem(list[i])) }
  return items
}

export async function fetchLatest(token: string): Promise<NotificationItem | undefined> {
  const res = await HttpClient.get<LatestResponse>('/notification/latest', undefined, auth(token))
  if (!res.success || !res.notification) { return undefined }
  return toItem(res.notification)
}

interface GeneratedTypeLiteralInterface_1 {
  id: number;
}

export async function markRead(id: number, token: string): Promise<BaseResponse> {
  return HttpClient.post<BaseResponse, GeneratedTypeLiteralInterface_1>('/notification/mark-read', { id }, auth(token))
}

export async function markAllRead(token: string): Promise<BaseResponse> {
  return HttpClient.post<BaseResponse, Record<string, never>>('/notification/mark-all-read', {}, auth(token))
}
