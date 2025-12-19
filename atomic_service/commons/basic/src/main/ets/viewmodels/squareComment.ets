export interface SquareCommentDTO {
  id: number
  user_id: number
  square_id: number
  content: string
  parent_id?: number
  root_parent_id?: number
  likes_count: number
  created_time: string
  username: string
  avatar_url?: string
  vip_expire_time?: string
  reply_to_username?: string
  isLiked?: boolean
  children?: SquareCommentDTO[]
}

export interface SquareCommentItem {
  id: number
  userId: number
  squareId: number
  content: string
  parentId?: number
  rootParentId?: number
  likesCount: number
  createdTime: string
  username: string
  avatarUrl?: string
  isVip: boolean
  replyToUsername?: string
  isLiked: boolean
  children: SquareCommentItem[]
}

export interface CreateCommentPayload {
  user_id: number
  square_id: number
  content: string
  parent_id?: number
  root_parent_id?: number
}

export interface BaseResponse {
  success: boolean
  message?: string
  comment_id?: number
}