import { HttpClient } from 'basic'
import { ReputationDTO, ReputationItem, ReputationLogDTO, ReputationLogItem, ReputationRuleDTO, ReputationRuleItem } from '../viewmodels/ReputationTypes'

interface QueryParam { key: string, value: string }
interface ReputationResponse { success: boolean, data?: ReputationDTO }
interface LogsResponse { success: boolean, data: ReputationLogDTO[] }
interface RulesResponse { success: boolean, data: ReputationRuleDTO[] }

function toItem(dto: ReputationDTO): ReputationItem {
  return {
    totalScore: dto.total_score,
    completed: dto.completed_tasks,
    canceled: dto.canceled_tasks,
    reports: dto.reports_received,
    averageRating: dto.average_rating,
    reliabilityIndex: dto.reliability_index,
    updatedAt: dto.updated_at
  }
}

function defaultSummary(): ReputationItem {
  return {
    totalScore: 0,
    completed: 0,
    canceled: 0,
    reports: 0,
    averageRating: 0,
    reliabilityIndex: 0,
    updatedAt: ''
  }
}

function toLogItem(dto: ReputationLogDTO): ReputationLogItem {
  return { id: dto.id, type: dto.change_type, delta: dto.score_delta, reason: dto.reason, createdTime: dto.created_at }
}

function toRuleItem(dto: ReputationRuleDTO): ReputationRuleItem {
  return { id: dto.id, title: dto.event, delta: dto.score_delta, severity: dto.severity, action: dto.trigger_action, description: dto.description }
}

export async function fetchReputation(userId: number): Promise<ReputationItem> {
  const res = await HttpClient.get<ReputationResponse>(`/user/reputation/${userId}`)
  if (!res.success || !res.data) { return defaultSummary() }
  return toItem(res.data)
}

export async function fetchReputationLogs(token: string): Promise<ReputationLogItem[]> {
  const res = await HttpClient.get<LogsResponse>('/user/reputation/logs', undefined, { Authorization: `Bearer ${token}` })
  if (!res.success) { return [] }
  const list = res.data ?? []
  const items: ReputationLogItem[] = []
  for (let i = 0; i < list.length; i++) { items.push(toLogItem(list[i])) }
  return items
}

export async function fetchReputationRules(): Promise<ReputationRuleItem[]> {
  const res = await HttpClient.get<RulesResponse>('/user/reputation/rules')
  if (!res.success) { return [] }
  const list = res.data ?? []
  const items: ReputationRuleItem[] = []
  for (let i = 0; i < list.length; i++) { items.push(toRuleItem(list[i])) }
  return items
}
