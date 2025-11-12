export type TaskFilterValue = 'all' | 0 | 1 | 2

export interface HomeCategoryItem {
  label: string
  icon: ResourceStr
  action: 'category' | 'timetable' | 'orders'
  value?: string
}

export interface TaskFilter {
  label: string
  value: TaskFilterValue
}

export interface PriceInfo {
  label: string
  color: ResourceColor
}

