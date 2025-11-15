import { HttpClient } from 'basic'
import {
  CityResponse,
  ProvinceResponse,
  SchoolFeedbackPayload,
  SchoolFeedbackResponse,
  SchoolListItem,
  SchoolListQuery,
  SchoolListResponse,
  SchoolSearchResponse
} from '../viewmodels/SchoolPickerTypes'

interface QueryParam {
  key: string
  value: string
}

export async function fetchProvinces(): Promise<string[]> {
  const response = await HttpClient.get<ProvinceResponse>('/school/provinces')
  if (!response.success) {
    return []
  }
  return response.provinces ?? []
}

export async function fetchCities(province: string): Promise<string[]> {
  const params: QueryParam[] = [{ key: 'province', value: province }]
  const response = await HttpClient.get<CityResponse>('/school/cities', params)
  if (!response.success) {
    return []
  }
  return response.cities ?? []
}

export async function fetchSchoolsByCity(query: SchoolListQuery): Promise<SchoolListItem[]> {
  const params: QueryParam[] = [
    { key: 'city', value: query.city },
    { key: 'page', value: `${query.page}` },
    { key: 'pageSize', value: `${query.pageSize}` }
  ]
  const response = await HttpClient.get<SchoolListResponse>('/school/list', params)
  if (!response.success) {
    return []
  }
  return response.schools ?? []
}

export async function searchSchools(keyword: string): Promise<SchoolListItem[]> {
  const params: QueryParam[] = [{ key: 'keyword', value: keyword }]
  const response = await HttpClient.get<SchoolSearchResponse>('/school/search', params)
  if (!response.success) {
    return []
  }
  return response.schools ?? []
}

export async function submitSchoolFeedback(payload: SchoolFeedbackPayload, token: string): Promise<SchoolFeedbackResponse> {
  return HttpClient.post<SchoolFeedbackResponse, SchoolFeedbackPayload>('/school/feedback', payload, {
    Authorization: `Bearer ${token}`
  })
}
