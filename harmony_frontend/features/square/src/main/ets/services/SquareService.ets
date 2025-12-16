import { HttpClient } from 'basic'
import {
  BaseResponse,
  CheckinActionResult,
  CheckinStatusResult,
  SquareCreatePayload,
  SquareCreateResponse,
  SquareEditPayload,
  SquareImageDTO,
  SquareImageUpdatePayload,
  SquareLikePayload,
  SquarePost,
  SquarePostDTO,
  SquarePostListResponse,
  SquareQuery,
  SquareReportPayload
} from '../viewmodels/SquareTypes'

interface QueryParam {
  key: string
  value: string
}

function buildQueryParams(query?: SquareQuery): QueryParam[] | undefined {
  if (!query) {
    console.info('[SquareService] buildQueryParams: query is undefined')
    return undefined
  }
  console.info('[SquareService] buildQueryParams: input query =', JSON.stringify(query))
  const params: QueryParam[] = []
  if (query.category && query.category !== '全部') {
    params.push({ key: 'category', value: query.category })
  }
  if (query.userId) {
    params.push({ key: 'user_id', value: `${query.userId}` })
  }
  if (query.schoolId) {
    params.push({ key: 'school_id', value: `${query.schoolId}` })
  }
  params.push({ key: 'page', value: `${query.page ?? 1}` })
  params.push({ key: 'pageSize', value: `${query.pageSize ?? 10}` })
  params.push({ key: '_t', value: `${Date.now()}` })
  console.info('[SquareService] buildQueryParams: output params =', JSON.stringify(params))
  return params
}

function formatSquareTime(value: string): string {
  const date = new Date(value)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}

function isVip(vipExpire?: string): boolean {
  if (!vipExpire) {
    return false
  }
  const expireDate = new Date(vipExpire).getTime()
  return expireDate > Date.now()
}

function toSquarePost(dto: SquarePostDTO): SquarePost {
  const images: SquareImageDTO[] = dto.images ?? []
  const approvedImages = images.filter((item: SquareImageDTO) => item.status === 'pass')
  return {
    id: dto.id,
    userId: dto.user_id,
    username: dto.username ?? '匿名用户',
    avatarUrl: dto.avatar_url ?? '',
    content: dto.content,
    category: dto.category,
    likesCount: dto.likes_count,
    commentsCount: dto.comments_count,
    createdTime: dto.created_time,
    formattedTime: formatSquareTime(dto.created_time),
    isLiked: Boolean(dto.isLiked),
    isVip: isVip(dto.vip_expire_time),
    pinned: Boolean(dto.is_pinned),
    schoolId: dto.school_id,
    images,
    approvedImages
  }
}

export async function fetchSquarePosts(query?: SquareQuery): Promise<SquarePost[]> {
  const params = buildQueryParams(query)
  console.info('[SquareService] fetchSquarePosts: GET /square/posts with params =', JSON.stringify(params))
  const t0 = Date.now()
  try {
    const response = await HttpClient.get<SquarePostListResponse>('/square/posts', params)
    const dt = Date.now() - t0
    console.info('[SquareService] fetchSquarePosts: response.success =', response?.success, 'duration(ms)=', dt)
    if (!response.success) {
      console.warn('[SquareService] fetchSquarePosts: request failed, response =', JSON.stringify(response))
      return []
    }
    const posts: SquarePostDTO[] = response.posts ?? []
    console.info('[SquareService] fetchSquarePosts: posts.length =', posts.length)
    return posts.map((item: SquarePostDTO) => toSquarePost(item))
  } catch (error) {
    const msg: string = (error && (error as Error).message) ? (error as Error).message : 'fetchSquarePosts failed'
    console.error('[SquareService] fetchSquarePosts: request failed', msg)
    throw new Error(msg)
  }
}

export async function likeSquarePost(payload: SquareLikePayload, token: string): Promise<BaseResponse> {
  return HttpClient.post<BaseResponse, SquareLikePayload>('/square/like', payload, {
    Authorization: `Bearer ${token}`
  })
}

export async function unlikeSquarePost(payload: SquareLikePayload, token: string): Promise<BaseResponse> {
  return HttpClient.post<BaseResponse, SquareLikePayload>('/square/unlike', payload, {
    Authorization: `Bearer ${token}`
  })
}

export async function createSquarePost(payload: SquareCreatePayload, token: string): Promise<SquareCreateResponse> {
  return HttpClient.post<SquareCreateResponse, SquareCreatePayload>('/square/create', payload, {
    Authorization: `Bearer ${token}`
  })
}

export async function updateSquareImages(payload: SquareImageUpdatePayload, token: string): Promise<BaseResponse> {
  return HttpClient.post<BaseResponse, SquareImageUpdatePayload>('/square/update-images', payload, {
    Authorization: `Bearer ${token}`
  })
}

export async function editSquarePost(payload: SquareEditPayload, token: string): Promise<BaseResponse> {
  return HttpClient.post<BaseResponse, SquareEditPayload>('/square/edit', payload, {
    Authorization: `Bearer ${token}`
  })
}

export async function reportSquarePost(payload: SquareReportPayload, token: string): Promise<BaseResponse> {
  return HttpClient.post<BaseResponse, SquareReportPayload>('/square/report', payload, {
    Authorization: `Bearer ${token}`
  })
}

export async function fetchCheckinStatus(userId: number, token: string): Promise<CheckinStatusResult> {
  const params: QueryParam[] = [{ key: 'user_id', value: `${userId}` }]
  return HttpClient.get<CheckinStatusResult>('/checkins/status', params, {
    Authorization: `Bearer ${token}`
  })
}

interface CheckinPayload {
  user_id: number
}

export async function submitCheckin(userId: number, token: string): Promise<CheckinActionResult> {
  const body: CheckinPayload = { user_id: userId }
  return HttpClient.post<CheckinActionResult, CheckinPayload>('/checkins/checkin', body, {
    Authorization: `Bearer ${token}`
  })
}
