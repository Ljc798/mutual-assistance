import { HttpClient, TaskDTO, TaskItem, TaskStatus } from 'basic'
import { TaskFilterValue } from '../viewmodels/HomeTypes'

interface QueryParam {
  key: string
  value: string
}

export interface TaskQuery {
  category?: string
  page?: number
  pageSize?: number
  status?: TaskFilterValue
  schoolId?: number
}

interface TaskSearchResponse {
  success: boolean
  tasks: TaskDTO[]
}

function toTaskItem(item: TaskDTO): TaskItem {
  return {
    id: String(item.id),
    title: item.title,
    category: item.category,
    deadline: item.DDL,
    position: item.position,
    address: item.address,
    status: item.status as TaskStatus,
    mode: item.mode === 'bidding' ? 'bidding' : 'fixed',
    offer: item.offer,
    hasPaid: false,
    formattedDeadline: formatDeadline(item.DDL),
    detail: item.detail,
    employerId: item.employer_id,
    takeawayCode: item.takeaway_code,
    takeawayTel: item.takeaway_tel,
    takeawayName: item.takeaway_name
  }
}

function formatDeadline(value: string): string {
  const date = new Date(value)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const pad = (num: number) => num < 10 ? `0${num}` : `${num}`
  return `${pad(month)}-${pad(day)} ${pad(hours)}:${pad(minutes)}`
}

function buildQueryParams(query?: TaskQuery): QueryParam[] | undefined {
  if (!query) {
    console.info('[TaskService] buildQueryParams: query is undefined')
    return undefined
  }
  console.info('[TaskService] buildQueryParams: input query =', JSON.stringify(query))
  const params: QueryParam[] = []
  params.push({
    key: 'category',
    value: query.category && query.category !== '全部' ? query.category : '全部'
  })
  params.push({
    key: 'page',
    value: `${query.page ?? 1}`
  })
  params.push({
    key: 'pageSize',
    value: `${query.pageSize ?? 10}`
  })
  const statusValue = query.status !== undefined && query.status !== 'all' ? `${query.status}` : ''
  params.push({
    key: 'status',
    value: statusValue
  })
  if (typeof query.schoolId === 'number' && query.schoolId > 0) {
    params.push({
      key: 'school_id',
      value: `${query.schoolId}`
    })
  }
  console.info('[TaskService] buildQueryParams: output params =', JSON.stringify(params))
  return params
}

export async function fetchTasks(query?: TaskQuery, token?: string): Promise<TaskItem[]> {
  const headers: Record<string, string> = token ? {
    "Authorization": `Bearer ${token}`
  } : {};

  const params = buildQueryParams(query)
  console.info('[TaskService] fetchTasks: GET /task/tasks with params =', JSON.stringify(params))
  const t0 = Date.now()
  try {
    const list = await HttpClient.get<TaskDTO[]>('/task/tasks', params, headers)
    const dt = Date.now() - t0
    console.info('[TaskService] fetchTasks: response length =', list.length, 'duration(ms)=', dt)
    return list.map(toTaskItem)
  } catch (error) {
    const msg: string = (error && (error as Error).message) ? (error as Error).message : 'fetchTasks failed'
    console.error('[TaskService] fetchTasks: request failed', msg)
    throw new Error(msg)
  }
}

export async function searchTasks(keyword: string, schoolId?: number, token?: string): Promise<TaskItem[]> {
  const headers: Record<string, string> = token ? { "Authorization": `Bearer ${token}` } : {}
  const params: QueryParam[] = [{ key: 'q', value: keyword.trim() }]
  if (typeof schoolId === 'number' && schoolId > 0) { params.push({ key: 'school_id', value: `${schoolId}` }) }
  console.info('[TaskService] searchTasks: GET /task/search with params =', JSON.stringify(params))
  const t0 = Date.now()
  try {
    const res = await HttpClient.get<TaskSearchResponse>('/task/search', params, headers)
    const dt = Date.now() - t0
    console.info('[TaskService] searchTasks: response.success =', res?.success, 'tasks.length =', (res?.tasks?.length ?? 0), 'duration(ms)=', dt)
    if (!res.success) { return [] }
    return (res.tasks ?? []).map(toTaskItem)
  } catch (error) {
    const msg: string = (error && (error as Error).message) ? (error as Error).message : 'searchTasks failed'
    console.error('[TaskService] searchTasks: request failed', msg)
    throw new Error(msg)
  }
}
