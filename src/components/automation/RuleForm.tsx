import { useState } from 'react'
import type { Rule, TriggerConfig, ActionConfig, List, Label, WorkspaceMember } from '../../types'

interface Props {
  lists: List[]
  labels: Label[]
  wsMembers: WorkspaceMember[]
  initial?: Rule
  onSave: (data: { name: string; trigger: TriggerConfig; actions: ActionConfig[] }) => void
  onCancel: () => void
}

const TRIGGER_LABELS: Record<string, string> = {
  card_moved: 'Card moved to list',
  card_created: 'Card created',
  checklist_completed: 'All checklist items completed',
}

const ACTION_LABELS: Record<string, string> = {
  move_card: 'Move card to list',
  add_label: 'Add label',
  remove_label: 'Remove label',
  assign_member: 'Assign member',
  set_due_date: 'Set due date',
}

const EMPTY_ACTION: ActionConfig = { type: 'move_card' }

export default function RuleForm({ lists, labels, wsMembers, initial, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [trigger, setTrigger] = useState<TriggerConfig>(initial?.trigger ?? { type: 'card_moved' })
  const [actions, setActions] = useState<ActionConfig[]>(initial?.actions ?? [{ ...EMPTY_ACTION }])

  const setTriggerType = (type: TriggerConfig['type']) => setTrigger({ type })

  const updateAction = (i: number, patch: Partial<ActionConfig>) =>
    setActions((prev) => prev.map((a, idx) => idx === i ? { ...a, ...patch } : a))

  const handleSubmit = () => {
    if (!name.trim() || actions.length === 0) return
    onSave({ name: name.trim(), trigger, actions })
  }

  return (
    <div className="space-y-4">
      {/* Name */}
      <div>
        <label className="text-xs font-semibold text-gray-dark uppercase tracking-wide block mb-1">Rule name</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Move to Done when checklist complete"
          className="input-base h-9 w-full text-sm"
        />
      </div>

      {/* Trigger */}
      <div>
        <label className="text-xs font-semibold text-gray-dark uppercase tracking-wide block mb-2">When (trigger)</label>
        <select
          value={trigger.type}
          onChange={(e) => setTriggerType(e.target.value as TriggerConfig['type'])}
          className="input-base h-9 w-full text-sm mb-2"
        >
          {Object.entries(TRIGGER_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {trigger.type === 'card_moved' && (
          <select
            value={trigger.toListId ?? ''}
            onChange={(e) => setTrigger({ ...trigger, toListId: e.target.value || undefined })}
            className="input-base h-9 w-full text-sm"
          >
            <option value="">Any list</option>
            {lists.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
          </select>
        )}
        {trigger.type === 'card_created' && (
          <select
            value={trigger.listId ?? ''}
            onChange={(e) => setTrigger({ ...trigger, listId: e.target.value || undefined })}
            className="input-base h-9 w-full text-sm"
          >
            <option value="">Any list</option>
            {lists.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
          </select>
        )}
      </div>

      {/* Actions */}
      <div>
        <label className="text-xs font-semibold text-gray-dark uppercase tracking-wide block mb-2">Then (actions)</label>
        <div className="space-y-2">
          {actions.map((action, i) => (
            <div key={i} className="border border-gray-border rounded-card p-3 space-y-2">
              <div className="flex items-center gap-2">
                <select
                  value={action.type}
                  onChange={(e) => updateAction(i, { type: e.target.value as ActionConfig['type'], toListId: undefined, labelId: undefined, userId: undefined, daysFromNow: undefined })}
                  className="input-base h-8 text-sm flex-1"
                >
                  {Object.entries(ACTION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                {actions.length > 1 && (
                  <button onClick={() => setActions((prev) => prev.filter((_, idx) => idx !== i))} className="text-gray-dark hover:text-red-500 text-xs px-1">&#10005;</button>
                )}
              </div>
              {(action.type === 'move_card') && (
                <select
                  value={action.toListId ?? ''}
                  onChange={(e) => updateAction(i, { toListId: e.target.value })}
                  className="input-base h-8 text-sm w-full"
                >
                  <option value="">Select list...</option>
                  {lists.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
                </select>
              )}
              {(action.type === 'add_label' || action.type === 'remove_label') && (
                <select
                  value={action.labelId ?? ''}
                  onChange={(e) => updateAction(i, { labelId: e.target.value })}
                  className="input-base h-8 text-sm w-full"
                >
                  <option value="">Select label...</option>
                  {labels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              )}
              {action.type === 'assign_member' && (
                <select
                  value={action.userId ?? ''}
                  onChange={(e) => updateAction(i, { userId: e.target.value })}
                  className="input-base h-8 text-sm w-full"
                >
                  <option value="">Select member...</option>
                  {wsMembers.map((m) => <option key={m.userId} value={m.userId}>{m.user.name}</option>)}
                </select>
              )}
              {action.type === 'set_due_date' && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={action.daysFromNow ?? ''}
                    onChange={(e) => updateAction(i, { daysFromNow: parseInt(e.target.value) || 0 })}
                    placeholder="7"
                    className="input-base h-8 text-sm w-20"
                  />
                  <span className="text-xs text-gray-dark">days from now</span>
                </div>
              )}
            </div>
          ))}
          <button
            onClick={() => setActions((prev) => [...prev, { ...EMPTY_ACTION }])}
            className="text-xs text-primary hover:underline"
          >+ Add action</button>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={handleSubmit} className="btn-primary h-9 min-h-0 px-4 text-sm flex-1">Save rule</button>
        <button onClick={onCancel} className="btn-ghost h-9 min-h-0 px-4 text-sm">Cancel</button>
      </div>
    </div>
  )
}
