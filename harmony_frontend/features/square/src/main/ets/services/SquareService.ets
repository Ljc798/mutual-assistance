import { HttpClient } from 'basic'
import {
  BaseResponse,
  CheckinActionResult,
  CheckinStatusResult,
  SquareCreatePayload,
  SquareCreateResponse,
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
    return undefined
  }
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
  const response = await HttpClient.get<SquarePostListResponse>('/square/posts', params)
  if (!response.success) {
    return []
  }
  const posts: SquarePostDTO[] = response.posts ?? []
  return posts.map((item: SquarePostDTO) => toSquarePost(item))
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
