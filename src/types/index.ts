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
  createdAt?: string
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

export type TriggerType = 'card_moved' | 'card_created' | 'checklist_completed'
export type ActionType = 'move_card' | 'add_label' | 'remove_label' | 'assign_member' | 'set_due_date'

export interface TriggerConfig {
  type: TriggerType
  toListId?: string
  listId?: string
}

export interface ActionConfig {
  type: ActionType
  toListId?: string
  labelId?: string
  userId?: string
  daysFromNow?: number
}

export interface Rule {
  id: string
  boardId: string
  name: string
  isActive: boolean
  trigger: TriggerConfig
  actions: ActionConfig[]
  createdAt: string
}

export interface RuleLog {
  id: string
  ruleId: string
  cardId?: string | null
  status: string
  detail?: string | null
  createdAt: string
}

export interface BoardStats {
  byList: { id: string; title: string; count: number }[]
  byMember: { name: string; count: number }[]
  byLabel: { name: string; color: string; count: number }[]
}

export interface ScheduledJob {
  id: string
  boardId: string
  listId: string
  title: string
  scheduledAt?: string | null
  cronExpression?: string | null
  isActive: boolean
  lastRunAt?: string | null
  createdAt: string
}

export interface BackupSettings {
  id: string
  enabled: boolean
  cronExpr: string
  retentionCount: number
  scopeDb: boolean
  scopeUploads: boolean
  rcloneRemote: string
  remoteFolder: string
  gdriveClientId: string
  gdriveClientSecret: string
  gdriveAccountEmail: string
  updatedAt: string
}

export interface BackupRun {
  id: string
  kind: 'manual' | 'scheduled'
  status: 'pending' | 'running' | 'success' | 'failed'
  scopeDb: boolean
  scopeUploads: boolean
  startedAt: string
  finishedAt?: string | null
  sizeBytes: number
  remotePath: string
  error: string
  logTail: string
  triggeredBy?: string | null
}
