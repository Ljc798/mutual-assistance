export interface ReputationDTO {
  total_score: number
  completed_tasks: number
  canceled_tasks: number
  reports_received: number
  average_rating: number
  reliability_index: number
  updated_at?: string
}

export interface ReputationItem {
  totalScore: number
  completed: number
  canceled: number
  reports: number
  averageRating: number
  reliabilityIndex: number
  updatedAt?: string
}

export interface ReputationLogDTO {
  id: number
  change_type: string
  score_delta: number
  reason: string
  created_at: string
}

export interface ReputationLogItem {
  id: number
  type: string
  delta: number
  reason: string
  createdTime: string
}

export interface ReputationRuleDTO {
  id: number
  event: string
  score_delta: number
  severity: string
  trigger_action: string
  description: string
}

export interface ReputationRuleItem {
  id: number
  title: string
  delta: number
  severity: string
  action: string
  description: string
}