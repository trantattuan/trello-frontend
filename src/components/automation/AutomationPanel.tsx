import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { getBoardRules, createRule, updateRule, deleteRule, getRuleLogs } from '../../api/rules'
import type { Rule, RuleLog, List, Label, WorkspaceMember, TriggerConfig, ActionConfig } from '../../types'
import RuleForm from './RuleForm'

interface Props {
  boardId: string
  lists: List[]
  labels: Label[]
  wsMembers: WorkspaceMember[]
  onClose: () => void
}

const TRIGGER_SUMMARY: Record<string, string> = {
  card_moved: 'Card moved',
  card_created: 'Card created',
  checklist_completed: 'Checklist completed',
}

const ACTION_SUMMARY: Record<string, string> = {
  move_card: 'Move to list',
  add_label: 'Add label',
  remove_label: 'Remove label',
  assign_member: 'Assign member',
  set_due_date: 'Set due date',
}

function summarizeTrigger(trigger: TriggerConfig, lists: List[]): string {
  const base = TRIGGER_SUMMARY[trigger.type] ?? trigger.type
  if (trigger.type === 'card_moved' && trigger.toListId) {
    const list = lists.find((l) => l.id === trigger.toListId)
    return `${base} to "${list?.title ?? '...'}"`
  }
  if (trigger.type === 'card_created' && trigger.listId) {
    const list = lists.find((l) => l.id === trigger.listId)
    return `${base} in "${list?.title ?? '...'}"`
  }
  return base
}

function summarizeActions(actions: ActionConfig[], lists: List[], labels: Label[]): string {
  return actions.map((a) => {
    const base = ACTION_SUMMARY[a.type] ?? a.type
    if (a.type === 'move_card' && a.toListId) {
      const list = lists.find((l) => l.id === a.toListId)
      return `${base}: "${list?.title ?? '...'}"`
    }
    if ((a.type === 'add_label' || a.type === 'remove_label') && a.labelId) {
      const label = labels.find((l) => l.id === a.labelId)
      return `${base}: "${label?.name ?? '...'}"`
    }
    if (a.type === 'set_due_date' && a.daysFromNow != null) return `${base}: +${a.daysFromNow}d`
    return base
  }).join(', ')
}

export default function AutomationPanel({ boardId, lists, labels, wsMembers, onClose }: Props) {
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Rule | null>(null)
  const [logs, setLogs] = useState<Record<string, RuleLog[]>>({})
  const [expandedLogs, setExpandedLogs] = useState<string | null>(null)

  useEffect(() => {
    getBoardRules(boardId)
      .then(setRules)
      .catch(() => toast.error('Failed to load rules'))
      .finally(() => setLoading(false))
  }, [boardId])

  const handleCreate = async (data: { name: string; trigger: TriggerConfig; actions: ActionConfig[] }) => {
    try {
      const rule = await createRule(boardId, data)
      setRules((prev) => [rule, ...prev])
      setCreating(false)
      toast.success('Rule created')
    } catch { toast.error('Failed to create rule') }
  }

  const handleEdit = async (data: { name: string; trigger: TriggerConfig; actions: ActionConfig[] }) => {
    if (!editing) return
    try {
      const rule = await updateRule(editing.id, data)
      setRules((prev) => prev.map((r) => r.id === rule.id ? rule : r))
      setEditing(null)
      toast.success('Rule updated')
    } catch { toast.error('Failed to update rule') }
  }

  const handleToggle = async (rule: Rule) => {
    try {
      const updated = await updateRule(rule.id, { isActive: !rule.isActive })
      setRules((prev) => prev.map((r) => r.id === updated.id ? updated : r))
    } catch { toast.error('Failed to update rule') }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteRule(id)
      setRules((prev) => prev.filter((r) => r.id !== id))
      toast.success('Rule deleted')
    } catch { toast.error('Failed to delete rule') }
  }

  const handleToggleLogs = async (ruleId: string) => {
    if (expandedLogs === ruleId) { setExpandedLogs(null); return }
    setExpandedLogs(ruleId)
    if (logs[ruleId]) return
    try {
      const data = await getRuleLogs(ruleId)
      setLogs((prev) => ({ ...prev, [ruleId]: data }))
    } catch { toast.error('Failed to load logs') }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-sm bg-white shadow-2xl flex flex-col h-full" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-border shrink-0">
          <h2 className="text-base font-semibold text-navy">Automation</h2>
          <button onClick={onClose} className="text-gray-dark hover:text-navy text-lg px-1">&#10005;</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Create form */}
          {creating ? (
            <div className="border border-gray-border rounded-card p-4">
              <p className="text-sm font-semibold text-navy mb-3">New Rule</p>
              <RuleForm
                lists={lists}
                labels={labels}
                wsMembers={wsMembers}
                onSave={handleCreate}
                onCancel={() => setCreating(false)}
              />
            </div>
          ) : (
            <button
              onClick={() => { setCreating(true); setEditing(null) }}
              className="btn-primary w-full h-9 min-h-0 text-sm"
            >+ New Rule</button>
          )}

          {/* Rule list */}
          {loading ? (
            <p className="text-sm text-gray-mid text-center py-4">Loading...</p>
          ) : rules.length === 0 && !creating ? (
            <p className="text-sm text-gray-mid text-center py-6">No rules yet. Create one to automate your board.</p>
          ) : (
            rules.map((rule) => (
              <div key={rule.id} className="border border-gray-border rounded-card overflow-hidden">
                {editing?.id === rule.id ? (
                  <div className="p-4">
                    <p className="text-sm font-semibold text-navy mb-3">Edit Rule</p>
                    <RuleForm
                      lists={lists}
                      labels={labels}
                      wsMembers={wsMembers}
                      initial={rule}
                      onSave={handleEdit}
                      onCancel={() => setEditing(null)}
                    />
                  </div>
                ) : (
                  <div className="p-3">
                    <div className="flex items-start gap-2">
                      {/* Toggle */}
                      <button
                        onClick={() => handleToggle(rule)}
                        className={`mt-0.5 w-8 h-5 rounded-full shrink-0 transition-colors relative ${rule.isActive ? 'bg-primary' : 'bg-gray-mid'}`}
                        title={rule.isActive ? 'Active — click to disable' : 'Inactive — click to enable'}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${rule.isActive ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-navy truncate">{rule.name}</p>
                        <p className="text-xs text-primary mt-0.5 truncate">When: {summarizeTrigger(rule.trigger, lists)}</p>
                        <p className="text-xs text-gray-dark mt-0.5 truncate">Then: {summarizeActions(rule.actions, lists, labels)}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => { setEditing(rule); setCreating(false) }}
                          className="text-gray-dark hover:text-primary text-xs px-1 py-1"
                          title="Edit"
                        >&#9998;</button>
                        <button
                          onClick={() => handleDelete(rule.id)}
                          className="text-gray-dark hover:text-red-500 text-xs px-1 py-1"
                          title="Delete"
                        >&#128465;</button>
                      </div>
                    </div>
                    {/* Logs toggle */}
                    <button
                      onClick={() => handleToggleLogs(rule.id)}
                      className="text-xs text-gray-mid hover:text-primary mt-2 hover:underline"
                    >
                      {expandedLogs === rule.id ? 'Hide logs' : 'View logs'}
                    </button>
                    {expandedLogs === rule.id && (
                      <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                        {(logs[rule.id] ?? []).length === 0 ? (
                          <p className="text-xs text-gray-mid">No executions yet.</p>
                        ) : (
                          (logs[rule.id] ?? []).map((log) => (
                            <div key={log.id} className="flex items-center gap-2 text-xs">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${log.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
                              <span className="text-gray-dark truncate">{log.detail}</span>
                              <span className="text-gray-mid ml-auto shrink-0">{new Date(log.createdAt).toLocaleDateString()}</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
