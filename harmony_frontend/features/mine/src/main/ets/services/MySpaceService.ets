import { HttpClient } from 'basic'
import { BaseResponse } from '../viewmodels/OrdersTypes'
import { MyPostListResponse, MyPostQuery } from '../viewmodels/MySpaceTypes'

interface QueryParam { key: string, value: string }

function buildQuery(query: MyPostQuery): QueryParam[] {
  const params: QueryParam[] = []
  if (query.viewerId) { params.push({ key: 'viewer_id', value: `${query.viewerId}` }) }
  params.push({ key: 'page', value: `${query.page ?? 1}` })
  params.push({ key: 'pageSize', value: `${query.pageSize ?? 10}` })
  return params
}

export async function fetchMyPosts(query: MyPostQuery): Promise<MyPostListResponse> {
  const params = buildQuery(query)
  return HttpClient.get<MyPostListResponse>(`/square/public/${query.userId}/posts`, params)
}

interface GeneratedTypeLiteralInterface_1 {
  post_id: number;
}

export async function deletePost(postId: number, token: string): Promise<BaseResponse> {
  return HttpClient.post<BaseResponse, GeneratedTypeLiteralInterface_1>("/square/delete", { post_id: postId }, { Authorization: `Bearer ${token}` })
}