export interface SchoolListItem {
  id: number
  name: string
  province?: string
  city?: string
}

export interface SchoolListQuery {
  city: string
  page: number
  pageSize: number
}

export interface ProvinceResponse {
  success: boolean
  provinces: string[]
}

export interface CityResponse {
  success: boolean
  cities: string[]
}

export interface SchoolListResponse {
  success: boolean
  schools: SchoolListItem[]
}

export interface SchoolSearchResponse {
  success: boolean
  schools: SchoolListItem[]
}

export interface SchoolFeedbackPayload {
  name: string
  province: string
  city: string
}

export interface SchoolFeedbackResponse {
  success: boolean
  message?: string
}
