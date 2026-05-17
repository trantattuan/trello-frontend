import client from './client'
import type { Rule, RuleLog, TriggerConfig, ActionConfig } from '../types'

export const getBoardRules = (boardId: string) =>
  client.get<Rule[]>(`/boards/${boardId}/rules`).then((r) => r.data)

export const createRule = (boardId: string, data: { name: string; trigger: TriggerConfig; actions: ActionConfig[] }) =>
  client.post<Rule>(`/boards/${boardId}/rules`, data).then((r) => r.data)

export const updateRule = (id: string, data: Partial<{ name: string; isActive: boolean; trigger: TriggerConfig; actions: ActionConfig[] }>) =>
  client.put<Rule>(`/rules/${id}`, data).then((r) => r.data)

export const deleteRule = (id: string) => client.delete(`/rules/${id}`)

export const getRuleLogs = (id: string) =>
  client.get<RuleLog[]>(`/rules/${id}/logs`).then((r) => r.data)
