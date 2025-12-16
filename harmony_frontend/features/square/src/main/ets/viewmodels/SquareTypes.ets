export type SquareCategory =
  | '全部'
  | '校园墙'
  | '吐槽'
  | '失物'
  | '拼车'
  | '二手交易'
  | '拼单'
  | '选课分享'
  | '社团'
  | '好物美景分享'
  | '其他'

export type ImageAuditStatus = 'pending' | 'pass' | 'fail'

export const DEFAULT_SQUARE_CATEGORIES: SquareCategory[] = [
  '全部',
  '校园墙',
  '吐槽',
  '失物',
  '拼车',
  '二手交易',
  '拼单',
  '选课分享',
  '社团',
  '好物美景分享'
]

export const POST_CATEGORIES: SquareCategory[] = [
  '校园墙',
  '吐槽',
  '失物',
  '拼车',
  '二手交易',
  '拼单',
  '选课分享',
  '社团',
  '好物美景分享',
  '其他'
]

export const REPORT_REASONS: string[] = [
  '骚扰辱骂',
  '不实信息',
  '违规广告',
  '违法内容',
  '色情低俗',
  '其他'
]

export interface SquareImageDTO {
  url: string
  status: ImageAuditStatus
}

export interface SquarePostDTO {
  id: number
  content: string
  category: string
  user_id: number
  likes_count: number
  comments_count: number
  school_id?: number
  created_time: string
  is_pinned?: number
  username?: string
  avatar_url?: string
  vip_expire_time?: string
  isLiked?: boolean
  images?: SquareImageDTO[]
}

export interface SquarePost {
  id: number
  userId: number
  username: string
  avatarUrl: string
  content: string
  category: string
  likesCount: number
  commentsCount: number
  createdTime: string
  formattedTime: string
  isLiked: boolean
  isVip: boolean
  pinned: boolean
  schoolId?: number
  images: SquareImageDTO[]
  approvedImages: SquareImageDTO[]
}

export interface SquarePostListResponse {
  success: boolean
  posts: SquarePostDTO[]
}

export interface SquareQuery {
  category?: string
  page?: number
  pageSize?: number
  userId?: number
  schoolId?: number
}

export interface SquareLikePayload {
  user_id: number
  square_id: number
}

export interface SquareCreatePayload {
  user_id: number
  category: string
  content: string
  school_id: number
}

export interface SquareEditPayload {
  post_id: number
  content: string
  category: string
}

export interface SquareCreateResponse {
  success: boolean
  square_id: number
}

export interface SquareImageUpdatePayload {
  square_id: number
  images: string[]
}

export interface BaseResponse {
  success: boolean
  message?: string
}

export interface SquareReportPayload {
  post_id: number
  reason: string
  description: string
}

export interface CheckinStatusResult {
  success: boolean
  checked_in: boolean
  consecutive_days: number
  total_days: number
}

export interface CheckinActionResult extends CheckinStatusResult {
  message: string
  earned_points: number
  is_vip: boolean
}

export interface SquareFormState {
  category: string
  content: string
  images: string[]
}

export interface ReportFormState {
  postId?: number
  reason: string
  description: string
}
