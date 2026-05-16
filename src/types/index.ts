export interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string | null
}

export interface Workspace {
  id: string
  name: string
  ownerId: string
  boards?: Board[]
  members?: WorkspaceMember[]
  _count?: { boards: number; members: number }
}

export interface WorkspaceMember {
  userId: string
  role: 'ADMIN' | 'MEMBER'
  user: User
}

export interface Board {
  id: string
  workspaceId: string
  title: string
  backgroundUrl?: string | null
  visibility: 'PRIVATE' | 'WORKSPACE' | 'PUBLIC'
  labels?: Label[]
  lists?: List[]
}

export interface List {
  id: string
  boardId: string
  title: string
  position: number
  cards?: Card[]
}

export interface Card {
  id: string
  listId: string
  title: string
  description?: string | null
  position: number
  dueDate?: string | null
  coverColor?: string | null
  members?: { user: User }[]
  labels?: { label: Label }[]
  checklists?: Checklist[]
  _count?: { attachments: number; comments: number }
}

export interface Label {
  id: string
  boardId: string
  name: string
  color: string
}

export interface Checklist {
  id: string
  cardId: string
  title: string
  items: ChecklistItem[]
}

export interface ChecklistItem {
  id: string
  checklistId: string
  text: string
  isDone: boolean
}

export interface Comment {
  id: string
  cardId: string
  body: string
  createdAt: string
  user: User
}

export interface Attachment {
  id: string
  cardId: string
  filename: string
  size: number
  mimeType: string
  createdAt: string
  user: User
}

export interface BoardStats {
  byList: { id: string; title: string; count: number }[]
  byMember: { name: string; count: number }[]
  byLabel: { name: string; color: string; count: number }[]
}
