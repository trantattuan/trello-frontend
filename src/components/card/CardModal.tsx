import { useEffect, useState, useRef } from 'react'
import toast from 'react-hot-toast'
import { updateCard, getComments, addComment, createChecklist, addChecklistItem, updateChecklistItem, uploadAttachment, getAttachmentUrl } from '../../api/cards'
import type { Card, Comment, Checklist } from '../../types'

interface Props {
  card: Card
  onClose: () => void
  onUpdate: (updated: Partial<Card>) => void
}

export default function CardModal({ card, onClose, onUpdate }: Props) {
  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description ?? '')
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [checklists, setChecklists] = useState<Checklist[]>(card.checklists ?? [])
  const [newChecklistTitle, setNewChecklistTitle] = useState('')
  const [addingChecklist, setAddingChecklist] = useState(false)
  const [newItemText, setNewItemText] = useState<Record<string, string>>({})
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

        <div className="mb-6">
          <label className="label-base text-sm">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={saveDescription}
            rows={3}
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
                <span className="text-xs text-gray-dark">{pct}%</span>
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

        <div className="mb-6">
          {addingChecklist ? (
            <div className="flex gap-2 items-center">
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
            <button onClick={() => setAddingChecklist(true)} className="btn-secondary text-sm h-9 min-h-0 px-3 mr-2">+ Checklist</button>
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
    </div>
  )
}
