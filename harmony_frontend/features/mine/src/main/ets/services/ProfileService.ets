import { HttpClient, AuthHeader } from 'basic'

interface QueryParam { key: string; value: string }

// 服务端返回结构
interface PublicUserServer { wxid?: string; username: string; avatar_url?: string; school_name?: string; vip_level?: number; vip_expire_time?: string; isVip?: number }
interface PublicUserResponse { success: boolean; data?: PublicUserServer }
export interface PublicUser {
  id: number
  username: string
  wxid?: string
  avatar_url?: string
  school_name?: string
}

interface ReputationServer { total_score: string; completed_tasks: number; canceled_tasks: number; reports_received: number; average_rating: string; reliability_index: string; created_at: string; updated_at: string }
interface ReputationSummary { success: boolean; data?: ReputationServer }
export interface ReputationItem {
  totalScore: number
  completed: number
  canceled: number
  reports: number
  averageRating: number
  reliabilityIndex: number
  updatedAt: string
}

export interface ReviewItem { reviewer_masked_name?: string; comment: string; rating: number; created_time: string; reviewer_avatar?: string }
interface ReviewsResponse { success: boolean; reviews: ReviewItem[] }

export interface SquareImageDTO { url: string; status: string }
export interface SquarePostDTO {
  id: number
  content: string
  created_time: string
  likes_count: number
  images: SquareImageDTO[]
  isLiked?: boolean
  comments_count?: number
}

export interface SquareLikePayload { user_id: number; square_id: number }
export interface SquareReportPayload { post_id: number; reason: string; description?: string }

export async function likeSquarePost(payload: SquareLikePayload, token: string): Promise<void> {
  await HttpClient.post<BaseResponse, SquareLikePayload>('/square/like', payload, { Authorization: `Bearer ${token}` })
}

export async function unlikeSquarePost(payload: SquareLikePayload, token: string): Promise<void> {
  await HttpClient.post<BaseResponse, SquareLikePayload>('/square/unlike', payload, { Authorization: `Bearer ${token}` })
}

export async function reportSquarePost(payload: SquareReportPayload, token: string): Promise<void> {
  await HttpClient.post<BaseResponse, SquareReportPayload>('/square/report', payload, { Authorization: `Bearer ${token}` })
}
interface UserPostsResponse { success: boolean; posts: SquarePostDTO[] }

export async function fetchPublicUser(userId: number): Promise<PublicUser | undefined> {
  const url = `/user/public/${userId}`
  console.info('ProfileApi.FetchPublicUser', JSON.stringify({ url }))
  const res = await HttpClient.get<PublicUserResponse>(url)
  console.info('ProfileApi.FetchPublicUserResp', JSON.stringify(res))
  if (!res.success || !res.data) { return undefined }
  const u: PublicUserServer = res.data
  const user: PublicUser = {
    id: userId,
    username: u.username,
    wxid: u.wxid,
    avatar_url: sanitizeUrl(u.avatar_url),
    school_name: u.school_name
  }
  return user
}

export async function fetchReputation(userId: number): Promise<ReputationItem | undefined> {
  const url = `/user/reputation/${userId}`
  console.info('ProfileApi.FetchReputation', JSON.stringify({ url }))
  const res = await HttpClient.get<ReputationSummary>(url)
  console.info('ProfileApi.FetchReputationResp', JSON.stringify(res))
  if (!res.success || !res.data) { return undefined }
  const d: ReputationServer = res.data
  const item: ReputationItem = {
    totalScore: parseFloat(d.total_score ?? '0'),
    completed: d.completed_tasks ?? 0,
    canceled: d.canceled_tasks ?? 0,
    reports: d.reports_received ?? 0,
    averageRating: parseFloat(d.average_rating ?? '0'),
    reliabilityIndex: parseFloat(d.reliability_index ?? '0'),
    updatedAt: d.updated_at
  }
  return item
}

export async function fetchReviews(userId: number): Promise<ReviewItem[]> {
  const url = `/user/${userId}/reviews`
  console.info('ProfileApi.FetchReviews', JSON.stringify({ url }))
  const res = await HttpClient.get<ReviewsResponse>(url)
  console.info('ProfileApi.FetchReviewsResp', JSON.stringify(res))
  if (!res.success) { return [] }
  return res.reviews || []
}

export async function fetchUserPosts(userId: number, viewerId?: number, page: number = 1, pageSize: number = 10): Promise<SquarePostDTO[]> {
  const params: QueryParam[] = []
  params.push({ key: 'page', value: `${page}` })
  params.push({ key: 'pageSize', value: `${pageSize}` })
  if (viewerId) { params.push({ key: 'viewer_id', value: `${viewerId}` }) }
  params.push({ key: '_t', value: `${Date.now()}` })
  const url = `/square/public/${userId}/posts`
  console.info('ProfileApi.FetchUserPosts', JSON.stringify({ url, params }))
  const res = await HttpClient.get<UserPostsResponse>(url, params)
  console.info('ProfileApi.FetchUserPostsResp', JSON.stringify(res))
  if (!res.success) { return [] }
  const list: SquarePostDTO[] = (res.posts || []).map((p: SquarePostDTO) => {
    const imgs: SquareImageDTO[] = (p.images || []).map((im: SquareImageDTO) => {
      const item: SquareImageDTO = { url: sanitizeUrl(im.url) ?? '', status: im.status }
      return item
    })
    const next: SquarePostDTO = {
      id: p.id,
      content: p.content,
      created_time: p.created_time,
      likes_count: p.likes_count,
      images: imgs,
      isLiked: p.isLiked,
      comments_count: p.comments_count
    }
    return next
  })
  return list
}

function sanitizeUrl(url?: string): string | undefined {
  if (!url) { return undefined }
  // 去除意外的反引号与空格
  const trimmed = url.replace(/`/g, '').trim()
  return trimmed.length > 0 ? trimmed : undefined
}
export interface BaseResponse { success: boolean; message?: string }
