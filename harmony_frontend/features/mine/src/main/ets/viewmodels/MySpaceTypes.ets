export const MY_POST_EDIT_DATA_KEY = 'my_post_edit_data_key'

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

export interface MyPostEditPayload {
  post_id: number
  content: string
  category: string
}

export interface MyPostImageUpdatePayload {
  square_id: number
  images: string[]
}

export interface BaseResponse {
  success: boolean
  message?: string
}
