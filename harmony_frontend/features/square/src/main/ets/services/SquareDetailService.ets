import { HttpClient, SquareCommentDTO, SquareCommentItem, SquareCommentBaseResponse, CreateCommentPayload } from 'basic'
import { SquarePost, SquarePostDTO, SquareImageDTO } from '../viewmodels/SquareTypes'

interface QueryParam {
  key: string
  value: string
}

interface SquareDetailResponse {
  success: boolean
  post?: SquarePostDTO
}

interface SquareCommentsResponse {
  success: boolean
  comments: SquareCommentDTO[]
}

interface CommentLikePayload {
  user_id: number
  comment_id: number
}

function toSquarePost(dto: SquarePostDTO): SquarePost {
  const images: SquareImageDTO[] = dto.images ?? []
  const approvedImages: SquareImageDTO[] = images.filter((img: SquareImageDTO) => img.status === 'pass')
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

function formatSquareTime(value: string): string {
  const date = new Date(value)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}

function isVip(vipExpire?: string): boolean {
  if (!vipExpire) { return false }
  return new Date(vipExpire).getTime() > Date.now()
}

function toCommentItem(dto: SquareCommentDTO): SquareCommentItem {
  return {
    id: dto.id,
    userId: dto.user_id,
    squareId: dto.square_id,
    content: dto.content,
    parentId: dto.parent_id,
    rootParentId: dto.root_parent_id,
    likesCount: dto.likes_count ?? 0,
    createdTime: dto.created_time,
    username: dto.username ?? '匿名用户',
    avatarUrl: dto.avatar_url ?? '',
    isVip: dto.vip_expire_time ? new Date(dto.vip_expire_time).getTime() > Date.now() : false,
    replyToUsername: dto.reply_to_username,
    isLiked: Boolean(dto.isLiked),
    children: (dto.children ?? []).map(toCommentItem)
  }
}

export async function fetchSquareDetail(postId: number, viewerId?: number): Promise<SquarePost | undefined> {
  const params: QueryParam[] = [
    { key: 'post_id', value: `${postId}` },
  ]
  if (viewerId) { params.push({ key: 'user_id', value: `${viewerId}` }) }
  const res = await HttpClient.get<SquareDetailResponse>(`/square/detail`, params)
  if (!res.success || !res.post) { return undefined }
  return toSquarePost(res.post)
}

export async function fetchSquareComments(squareId: number, viewerId?: number): Promise<SquareCommentItem[]> {
  const params: QueryParam[] = [
    { key: 'square_id', value: `${squareId}` },
  ]
  if (viewerId) { params.push({ key: 'user_id', value: `${viewerId}` }) }
  const res = await HttpClient.get<SquareCommentsResponse>(`/square/comments`, params)
  if (!res.success) { return [] }
  return (res.comments ?? []).map(toCommentItem)
}

export async function createSquareComment(payload: CreateCommentPayload, token: string): Promise<SquareCommentBaseResponse> {
  return HttpClient.post<SquareCommentBaseResponse, CreateCommentPayload>('/square/comments/create', payload, { Authorization: `Bearer ${token}` })
}

export async function likeSquareComment(commentId: number, userId: number): Promise<SquareCommentBaseResponse> {
  const payload: CommentLikePayload = { user_id: userId, comment_id: commentId }
  return HttpClient.post<SquareCommentBaseResponse, CommentLikePayload>(
    '/square/comments/like',
    payload
  )
}

export async function unlikeSquareComment(commentId: number, userId: number): Promise<SquareCommentBaseResponse> {
  const payload: CommentLikePayload = { user_id: userId, comment_id: commentId }
  return HttpClient.post<SquareCommentBaseResponse, CommentLikePayload>(
    '/square/comments/unlike',
    payload
  )
}