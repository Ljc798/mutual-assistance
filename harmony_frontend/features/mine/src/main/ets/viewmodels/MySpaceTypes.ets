export interface MyPostImage {
  url: string;
  status: string;
}

export interface MyPostItem {
  id: number
  content: string
  category: string
  likes_count: number
  comments_count: number
  created_time: string
  username: string
  avatar_url: string
  vip_expire_time?: string
  isLiked?: boolean
  images?: MyPostImage[]
}

export interface MyPostListResponse {
  success: boolean
  posts: MyPostItem[]
}

interface QueryParam { key: string, value: string }

export interface MyPostQuery {
  userId: number
  viewerId?: number
  page?: number
  pageSize?: number
}
