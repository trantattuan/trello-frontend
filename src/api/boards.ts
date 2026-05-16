import client from './client'
import type { Board, Workspace, BoardStats } from '../types'

export const getWorkspaces = () => client.get<Workspace[]>('/workspaces').then((r) => r.data)

export const createWorkspace = (name: string) =>
  client.post<Workspace>('/workspaces', { name }).then((r) => r.data)

export const getWorkspace = (id: string) =>
  client.get<Workspace>(`/workspaces/${id}`).then((r) => r.data)

export const createBoard = (workspaceId: string, title: string) =>
  client.post<Board>('/boards', { workspaceId, title }).then((r) => r.data)

export const getBoard = (id: string) =>
  client.get<Board>(`/boards/${id}`).then((r) => r.data)

export const getBoardStats = (id: string) =>
  client.get<BoardStats>(`/boards/${id}/stats`).then((r) => r.data)

export const createList = (boardId: string, title: string) =>
  client.post('/lists', { boardId, title }).then((r) => r.data)

export const reorderLists = (boardId: string, lists: { id: string; position: number }[]) =>
  client.put('/lists/reorder', { boardId, lists })

export const createLabel = (boardId: string, name: string, color: string) =>
  client.post(`/boards/${boardId}/labels`, { name, color }).then((r) => r.data)
