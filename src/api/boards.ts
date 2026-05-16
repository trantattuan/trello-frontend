import client from './client'
import type { Board, Workspace, BoardStats, Label } from '../types'

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

export const renameWorkspace = (id: string, name: string) =>
  client.put(`/workspaces/${id}`, { name }).then((r) => r.data)

export const createList = (boardId: string, title: string) =>
  client.post('/lists', { boardId, title }).then((r) => r.data)

export const renameList = (id: string, title: string) =>
  client.put(`/lists/${id}`, { title }).then((r) => r.data)

export const deleteList = (id: string) => client.delete(`/lists/${id}`)

export const deleteWorkspace = (id: string) => client.delete(`/workspaces/${id}`)

export const searchCards = (q: string) =>
  client.get<SearchResult[]>('/search', { params: { q } }).then((r) => r.data)

export interface SearchResult {
  id: string
  title: string
  description?: string | null
  labels: { id: string; name: string; color: string }[]
  list: { id: string; title: string }
  board: { id: string; title: string; workspaceId: string }
}

export const reorderLists = (boardId: string, lists: { id: string; position: number }[]) =>
  client.put('/lists/reorder', { boardId, lists })

export const createLabel = (boardId: string, name: string, color: string) =>
  client.post(`/boards/${boardId}/labels`, { name, color }).then((r) => r.data)

export const updateLabel = (id: string, data: { name?: string; color?: string }) =>
  client.put<Label>(`/labels/${id}`, data).then((r) => r.data)

export const deleteLabel = (id: string) => client.delete(`/labels/${id}`)

export const updateBoard = (id: string, data: { title?: string; visibility?: string; backgroundUrl?: string }) =>
  client.put<Board>(`/boards/${id}`, data).then((r) => r.data)

export const deleteBoard = (id: string) => client.delete(`/boards/${id}`)

export const addWorkspaceMember = (wsId: string, email: string) =>
  client.post<void>(`/workspaces/${wsId}/members`, { email }).then((r) => r.data)

export const removeWorkspaceMember = (wsId: string, userId: string) =>
  client.delete(`/workspaces/${wsId}/members/${userId}`)
