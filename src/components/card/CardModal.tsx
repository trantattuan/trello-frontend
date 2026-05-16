import { useEffect, useState, useRef } from 'react'
import toast from 'react-hot-toast'
import { updateCard, deleteCard, getComments, addComment, createChecklist, deleteChecklist, addChecklistItem, updateChecklistItem, uploadAttachment, assignMember, removeMember, toggleLabel } from '../../api/cards'
import { createLabel } from '../../api/boards'
import ConfirmDialog from '../ui/ConfirmDialog'
import type { Card, Comment, Checklist, Label, User, WorkspaceMember } from '../../types'

const LABEL_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899']

interface Props {
  card: Card
  boardId: string
  boardLabels: Label[]
  wsMembers: WorkspaceMember[]
  onClose: () => void
  onUpdate: (updated: Partial<Card>) => void
  onDelete: (cardId: string) => void
}

type Confirm = { message: string; onConfirm: () => void }

export default function CardModal({ card, boardId, boardLabels, wsMembers, onClose, onUpdate, onDelete }: Props) {
  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description ?? '')
  const [dueDate, setDueDate] = useState(card.dueDate ? card.dueDate.slice(0, 10) : '')
  const [cardMembers, setCardMembers] = useState<User[]>(card.members?.map((m) => m.user) ?? [])
  const [activeLabels, setActiveLabels] = useState<string[]>(card.labels?.map((l) => l.label.id) ?? [])
  const [labels, setLabels] = useState<Label[]>(boardLabels)
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0])
  const [showLabelForm, setShowLabelForm] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [checklists, setChecklists] = useState<Checklist[]>(card.checklists ?? [])
  const [newChecklistTitle, setNewChecklistTitle] = useState('')
  const [addingChecklist, setAddingChecklist] = useState(false)
  const [newItemText, setNewItemText] = useState<Record<string, string>>({})
  const [confirm, setConfirm] = useState<Confirm | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getComments(card.id).then(setComments).catch(() => {})
  }, [card.id])

  const saveTitle = async () => {
    if (title !== card.title) {
      await updateCard(card.id, { title })
      onUpdate({ title })
    }
  }

  const saveDescription = async () => {
    await updateCard(card.id, { description })
    onUpdate({ description })
  }

  const handleDueDateChange = async (val: string) => {
    setDueDate(val)
    try {
      await updateCard(card.id, { dueDate: val || null })
      onUpdate({ dueDate: val || null })
    } catch { toast.error('Failed to update due date') }
  }

  const handleToggleMember = async (user: User) => {
    const isAssigned = cardMembers.some((m) => m.id === user.id)
    try {
      if (isAssigned) {
        await removeMember(card.id, user.id)
        setCardMembers((prev) => prev.filter((m) => m.id !== user.id))
      } else {
        await assignMember(card.id, user.id)
        setCardMembers((prev) => [...prev, user])
      }
    } catch { toast.error('Failed to update member') }
  }

  const handleToggleLabel = async (labelId: string) => {
    const active = activeLabels.includes(labelId)
    try {
      await toggleLabel(card.id, labelId, !active)
      setActiveLabels((prev) => active ? prev.filter((id) => id !== labelId) : [...prev, labelId])
    } catch { toast.error('Failed to update label') }
  }

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return
    try {
      const label = await createLabel(boardId, newLabelName.trim(), newLabelColor) as Label
      setLabels((prev) => [...prev, label])
      setNewLabelName('')
      setShowLabelForm(false)
    } catch { toast.error('Failed to create label') }
  }

  const handleDeleteCard = () => {
    setConfirm({
      message: `Xóa card "${card.title}"? Hành động này không thể hoàn tác.`,
      onConfirm: async () => {
        try {
          await deleteCard(card.id)
          onDelete(card.id)
        } catch { toast.error('Failed to delete card') }
        setConfirm(null)
      },
    })
  }

  const handleDeleteChecklist = (cl: Checklist) => {
    setConfirm({
      message: `Xóa checklist "${cl.title}"?`,
      onConfirm: async () => {
        try {
          await deleteChecklist(cl.id)
          setChecklists((prev) => prev.filter((c) => c.id !== cl.id))
        } catch { toast.error('Failed to delete checklist') }
        setConfirm(null)
      },
    })
  }

  const handleComment = async () => {
    if (!commentText.trim()) return
    try {
      const comment = await addComment(card.id, commentText.trim())
      setComments((prev) => [...prev, comment])
      setCommentText('')
    } catch { toast.error('Failed to add comment') }
  }

  const handleAddChecklist = async () => {
    if (!newChecklistTitle.trim()) return
    try {
      const cl = await createChecklist(card.id, newChecklistTitle.trim())
      setChecklists((prev) => [...prev, { ...cl, items: [] }])
      setNewChecklistTitle('')
      setAddingChecklist(false)
    } catch { toast.error('Failed to add checklist') }
  }

  const handleAddItem = async (checklistId: string) => {
    const text = newItemText[checklistId]?.trim()
    if (!text) return
    try {
      const item = await addChecklistItem(checklistId, text)
      setChecklists((prev) => prev.map((cl) => cl.id === checklistId ? { ...cl, items: [...cl.items, item] } : cl))
      setNewItemText((prev) => ({ ...prev, [checklistId]: '' }))
    } catch { toast.error('Failed to add item') }
  }

  const handleToggleItem = async (checklistId: string, itemId: string, isDone: boolean) => {
    await updateChecklistItem(itemId, isDone)
    setChecklists((prev) => prev.map((cl) => cl.id === checklistId
      ? { ...cl, items: cl.items.map((i) => i.id === itemId ? { ...i, isDone } : i) }
      : cl))
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await uploadAttachment(card.id, file)
      toast.success(`${file.name} uploaded`)
    } catch { toast.error('Upload failed') }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-12 overflow-y-auto" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="bg-white rounded-card shadow-modal w-full max-w-2xl p-6" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-start mb-4">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              className="text-lg font-semibold text-navy bg-transparent border-b-2 border-transparent focus:border-primary outline-none flex-1 mr-4"
            />
            <button onClick={onClose} className="text-gray-mid hover:text-navy text-xl leading-none">&times;</button>
          </div>

          <div className="flex gap-6">
            {/* Main column */}
            <div className="flex-1 min-w-0">
              {activeLabels.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {labels.filter((l) => activeLabels.includes(l.id)).map((l) => (
                    <span key={l.id} className="px-2 py-0.5 rounded text-white text-xs font-semibold" style={{ background: l.color }}>{l.name}</span>
                  ))}
                </div>
              )}

              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-dark uppercase tracking-wide mb-1 block">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={saveDescription}
                  rows={8}
                  placeholder="Add a description..."
                  className="w-full text-sm border border-gray-border rounded-card p-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none text-navy"
                />
              </div>

              {checklists.map((cl) => {
                const done = cl.items.filter((i) => i.isDone).length
                const pct = cl.items.length > 0 ? Math.round((done / cl.items.length) * 100) : 0
                return (
                  <div key={cl.id} className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-sm text-navy">{cl.title}</h4>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-dark">{pct}%</span>
                        <button onClick={() => handleDeleteChecklist(cl)} className="text-xs text-gray-dark hover:text-red-500 transition-colors">&#10005;</button>
                      </div>
                    </div>
                    <div className="w-full bg-gray-ui rounded-full h-1.5 mb-2">
                      <div className={`h-1.5 rounded-full transition-all ${pct === 100 ? 'bg-green-500' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
                    </div>
                    {cl.items.map((item) => (
                      <label key={item.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-ui/50 rounded px-2">
                        <input type="checkbox" checked={item.isDone} onChange={(e) => handleToggleItem(cl.id, item.id, e.target.checked)} className="accent-primary" />
                        <span className={`text-sm ${item.isDone ? 'line-through text-gray-mid' : 'text-navy'}`}>{item.text}</span>
                      </label>
                    ))}
                    <div className="flex gap-2 mt-2">
                      <input
                        value={newItemText[cl.id] ?? ''}
                        onChange={(e) => setNewItemText((prev) => ({ ...prev, [cl.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddItem(cl.id)}
                        placeholder="Add an item..."
                        className="text-sm border-b border-gray-border outline-none px-1 py-0.5 flex-1 focus:border-primary"
                      />
                      <button onClick={() => handleAddItem(cl.id)} className="text-xs text-primary font-semibold hover:underline">Add</button>
                    </div>
                  </div>
                )
              })}

              <div className="mb-6 flex flex-wrap gap-2">
                {addingChecklist ? (
                  <div className="flex gap-2 items-center w-full">
                    <input
                      autoFocus
                      value={newChecklistTitle}
                      onChange={(e) => setNewChecklistTitle(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddChecklist(); if (e.key === 'Escape') setAddingChecklist(false) }}
                      placeholder="Checklist title..."
                      className="input-base h-9 text-sm flex-1"
                    />
                    <button onClick={handleAddChecklist} className="btn-primary text-sm h-9 min-h-0 px-3">Add</button>
                    <button onClick={() => setAddingChecklist(false)} className="btn-secondary text-sm h-9 min-h-0 px-3">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setAddingChecklist(true)} className="btn-secondary text-sm h-9 min-h-0 px-3">+ Checklist</button>
                )}
                <button onClick={() => fileRef.current?.click()} className="btn-secondary text-sm h-9 min-h-0 px-3">+ Attachment</button>
                <input ref={fileRef} type="file" className="hidden" onChange={handleFileUpload} />
              </div>

              <div>
                <h4 className="font-semibold text-sm text-navy mb-3">Comments</h4>
                {comments.map((c) => (
                  <div key={c.id} className="flex gap-3 mb-3">
                    <div className="w-7 h-7 rounded-full bg-primary text-white text-xs flex items-center justify-center shrink-0 font-semibold">{c.user.name[0]}</div>
                    <div>
                      <span className="text-xs font-semibold text-navy">{c.user.name}</span>
                      <span className="text-xs text-gray-mid ml-2">{new Date(c.createdAt).toLocaleString()}</span>
                      <p className="text-sm text-navy mt-0.5">{c.body}</p>
                    </div>
                  </div>
                ))}
                <div className="flex gap-2 mt-3">
                  <input
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                    placeholder="Write a comment..."
                    className="input-base h-9 text-sm flex-1"
                  />
                  <button onClick={handleComment} className="btn-primary h-9 min-h-0 px-3 text-sm">Send</button>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="w-44 shrink-0 space-y-5">
              {/* Labels */}
              <div>
                <p className="text-xs font-semibold text-gray-dark uppercase tracking-wide mb-2">Labels</p>
                <div className="space-y-0.5">
                  {labels.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => handleToggleLabel(l.id)}
                      className="flex items-center gap-2 w-full rounded px-2 py-1 hover:bg-gray-ui transition-colors"
                    >
                      <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: l.color }} />
                      <span className="text-xs text-navy flex-1 text-left truncate">{l.name}</span>
                      {activeLabels.includes(l.id) && <span className="text-primary text-xs">&#10003;</span>}
                    </button>
                  ))}
                </div>
                {showLabelForm ? (
                  <div className="mt-2 space-y-1.5">
                    <input
                      autoFocus
                      value={newLabelName}
                      onChange={(e) => setNewLabelName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleCreateLabel(); if (e.key === 'Escape') setShowLabelForm(false) }}
                      placeholder="Label name..."
                      className="input-base h-7 text-xs w-full"
                    />
                    <div className="flex flex-wrap gap-1">
                      {LABEL_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => setNewLabelColor(c)}
                          className="w-5 h-5 rounded transition-transform hover:scale-110"
                          style={{ background: c, outline: c === newLabelColor ? '2px solid #1a1a2e' : 'none', outlineOffset: '1px' }}
                        />
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={handleCreateLabel} className="btn-primary text-xs h-7 min-h-0 px-2 flex-1">Create</button>
                      <button onClick={() => setShowLabelForm(false)} className="btn-ghost text-xs h-7 min-h-0 px-2">&#10005;</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowLabelForm(true)} className="text-xs text-primary hover:underline mt-1.5 block">+ New label</button>
                )}
              </div>

              {/* Members */}
              <div>
                <p className="text-xs font-semibold text-gray-dark uppercase tracking-wide mb-2">Members</p>
                {cardMembers.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {cardMembers.map((u) => (
                      <div key={u.id} title={u.name} className="w-7 h-7 rounded-full bg-primary text-white text-xs flex items-center justify-center font-semibold">
                        {u.name[0]}
                      </div>
                    ))}
                  </div>
                )}
                <div className="space-y-0.5">
                  {wsMembers.map(({ user }) => {
                    const assigned = cardMembers.some((m) => m.id === user.id)
                    return (
                      <button
                        key={user.id}
                        onClick={() => handleToggleMember(user)}
                        className="flex items-center gap-2 w-full rounded px-2 py-1 hover:bg-gray-ui transition-colors"
                      >
                        <div className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center font-semibold shrink-0">{user.name[0]}</div>
                        <span className="text-xs text-navy flex-1 text-left truncate">{user.name}</span>
                        {assigned && <span className="text-primary text-xs">&#10003;</span>}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Due date */}
              <div>
                <p className="text-xs font-semibold text-gray-dark uppercase tracking-wide mb-2">Due Date</p>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => handleDueDateChange(e.target.value)}
                  className="input-base h-8 text-xs w-full"
                />
              </div>

              {/* Created at */}
              {card.createdAt && (
                <div>
                  <p className="text-xs font-semibold text-gray-dark uppercase tracking-wide mb-1">Created</p>
                  <p className="text-xs text-gray-dark">{new Date(card.createdAt).toLocaleString()}</p>
                </div>
              )}

              {/* Delete */}
              <button
                onClick={handleDeleteCard}
                className="w-full text-sm h-9 min-h-0 px-3 rounded-card font-semibold text-red-500 border border-red-200 hover:bg-red-50 transition-colors"
              >Delete card</button>
            </div>
          </div>
        </div>
      </div>

      {confirm && (
        <ConfirmDialog
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  )
}
