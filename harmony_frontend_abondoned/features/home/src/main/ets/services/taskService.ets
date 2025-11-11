import { getJson, QueryParamItem } from '../../../../../../commons/basic1/src/main/ets';
import type { Task } from '../../../../../../commons/basic1/src/main/ets';

export interface TaskQuery {
  category?: string;
  page?: number;
  pageSize?: number;
  schoolId?: string | number | null;
  status?: string | number;
}

interface SearchResponse {
  success: boolean;
  tasks: Task[];
}

export async function fetchTasks(params: TaskQuery): Promise<Task[]> {
  const payload: QueryParamItem[] = [
    { key: 'category', value: params.category ? params.category : '全部' },
    { key: 'page', value: params.page ? `${params.page}` : '1' },
    { key: 'pageSize', value: params.pageSize ? `${params.pageSize}` : '10' },
    { key: 'school_id', value: params.schoolId ? `${params.schoolId}` : '' },
    { key: 'status', value: params.status !== undefined ? `${params.status}` : '' }
  ];

  const data = await getJson<Task[]>('/task/tasks', payload);
  if (data && Array.isArray(data)) {
    return data;
  }
  return [];
}

export async function searchTasks(keyword: string, schoolId?: string | number | null): Promise<Task[]> {
  if (!keyword || keyword.trim().length === 0) {
    return [];
  }

  const payload: QueryParamItem[] = [
    { key: 'q', value: keyword },
    { key: 'school_id', value: schoolId ? `${schoolId}` : '' }
  ];

  const response = await getJson<SearchResponse>('/task/search', payload);
  if (response && response.success && response.tasks && Array.isArray(response.tasks)) {
    return response.tasks;
  }
  return [];
}
