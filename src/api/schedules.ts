import client from './client'
import type { ScheduledJob } from '../types'

export const getBoardSchedules = (boardId: string) =>
  client.get<ScheduledJob[]>(`/boards/${boardId}/schedules`).then((r) => r.data)

export const createSchedule = (boardId: string, data: { listId: string; title: string; scheduledAt?: string | null; cronExpression?: string | null }) =>
  client.post<ScheduledJob>(`/boards/${boardId}/schedules`, data).then((r) => r.data)

export const updateSchedule = (id: string, data: Partial<{ listId: string; title: string; scheduledAt: string | null; cronExpression: string | null; isActive: boolean }>) =>
  client.put<ScheduledJob>(`/schedules/${id}`, data).then((r) => r.data)

export const deleteSchedule = (id: string) => client.delete(`/schedules/${id}`)
