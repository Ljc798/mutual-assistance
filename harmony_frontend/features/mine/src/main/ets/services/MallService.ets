import { HttpClient, AuthHeader } from 'basic'

interface MallItemDTO {
  id: number
  title: string
  price: number
  points_cost?: number
  cover_url?: string
  description?: string
}

export interface MallItem {
  id: number
  title: string
  price: number
  pointsCost: number
  coverUrl: string
  description: string
}

interface ItemsResponse { success: boolean, items: MallItemDTO[] }
interface BaseResponse { success: boolean, message?: string }
interface ItemIdPayload { item_id: number }

function toItem(dto: MallItemDTO): MallItem {
  return {
    id: dto.id,
    title: dto.title,
    price: dto.price,
    pointsCost: dto.points_cost ?? 0,
    coverUrl: dto.cover_url ?? '',
    description: dto.description ?? ''
  }
}

function auth(token: string): AuthHeader { return { Authorization: `Bearer ${token}` } }

export async function fetchMallItems(): Promise<MallItem[]> {
  const res = await HttpClient.get<ItemsResponse>('/shop/items')
  if (!res.success) { return [] }
  const list = res.items ?? []
  const items: MallItem[] = []
  for (let i = 0; i < list.length; i++) { items.push(toItem(list[i])) }
  return items
}

export async function redeemPoint(itemId: number, token: string): Promise<BaseResponse> {
  const payload: ItemIdPayload = { item_id: itemId }
  return HttpClient.post<BaseResponse, ItemIdPayload>('/shop/redeem-point', payload, auth(token))
}

export async function createOrder(itemId: number, token: string): Promise<BaseResponse> {
  const payload: ItemIdPayload = { item_id: itemId }
  return HttpClient.post<BaseResponse, ItemIdPayload>('/shop/create-order', payload, auth(token))
}