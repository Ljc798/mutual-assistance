import { AuthHeader, HttpClient } from 'basic'

interface VipPlanDTO {
  id: number
  name: string
  original_price: number
  promo_price?: number | null
  days: number
  level: number
  benefits?: Record<string, string>
}

export interface VipPlanItem {
  id: number
  name: string
  level: number
  price: number
  promoPrice?: number
  days: number
  benefits: Record<string, string>
}

interface PlansResponse { success: boolean; plans: VipPlanDTO[] }
interface CreateOrderPayload { planId: number }
export interface PayParams { timeStamp: string; nonceStr: string; package: string; signType: string; paySign: string }
interface CreateOrderResponse { success: boolean; paymentParams?: PayParams; message?: string }

function auth(token: string): AuthHeader { return { Authorization: `Bearer ${token}` } }

function toItem(dto: VipPlanDTO): VipPlanItem {
  const price = typeof dto.promo_price === 'number' ? dto.promo_price : dto.original_price
  return { id: dto.id, name: dto.name, level: dto.level, price, promoPrice: dto.promo_price ?? undefined, days: dto.days, benefits: dto.benefits ?? {} }
}

export async function fetchVipPlans(): Promise<VipPlanItem[]> {
  const res = await HttpClient.get<PlansResponse>('/vip/plans')
  if (!res.success) { return [] }
  const list = res.plans ?? []
  const items: VipPlanItem[] = []
  for (let i = 0; i < list.length; i++) { items.push(toItem(list[i])) }
  return items
}

export async function createVipOrder(planId: number, token: string): Promise<CreateOrderResponse> {
  const payload: CreateOrderPayload = { planId }
  return HttpClient.post<CreateOrderResponse, CreateOrderPayload>('/vip/create-order', payload, auth(token))
}