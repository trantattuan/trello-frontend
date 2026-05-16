import { useState, useRef } from 'react'
import { Droppable } from '@hello-pangea/dnd'
import CardItem from './CardItem'
import { createCard } from '../../api/cards'
import { renameList, deleteList } from '../../api/boards'
import ConfirmDialog from '../ui/ConfirmDialog'
import type { List, Card } from '../../types'
import toast from 'react-hot-toast'

type Confirm = { message: string; onConfirm: () => void }

interface Props {
  list: List
  onCardClick: (card: Card) => void
  onCardAdded: (card: Card) => void
}

export default function BoardColumn({ list, onCardClick }: Props) {
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [listTitle, setListTitle] = useState(list.title)
  const [confirm, setConfirm] = useState<Confirm | null>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)

  const handleRenameList = async () => {
    const trimmed = listTitle.trim()
    if (!trimmed) { setListTitle(list.title); setEditingTitle(false); return }
    if (trimmed === list.title) { setEditingTitle(false); return }
    try {
      await renameList(list.id, trimmed)
    } catch {
      toast.error('Failed to rename list')
      setListTitle(list.title)
    }
    setEditingTitle(false)
  }

  const handleDeleteList = () => {
    setConfirm({
      message: `Xóa list "${list.title}" và toàn bộ card bên trong?`,
      onConfirm: async () => {
        try {
          await deleteList(list.id)
        } catch { toast.error('Failed to delete list') }
        setConfirm(null)
      },
    })
  }

  const handleAdd = async () => {
    if (!title.trim()) { setAdding(false); return }
    try {
      await createCard(list.id, title.trim())
      setTitle('')
      setAdding(false)
    } catch { toast.error('Failed to add card') }
  }

  return (
    <>
    <div className="w-64 shrink-0 flex flex-col">
      <div className="bg-gray-ui rounded-card p-2">
        <div className="flex items-center gap-1 mb-1">
          {editingTitle ? (
            <input
              ref={titleInputRef}
              autoFocus
              value={listTitle}
              onChange={(e) => setListTitle(e.target.value)}
              onBlur={handleRenameList}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleRenameList() } if (e.key === 'Escape') { setListTitle(list.title); setEditingTitle(false) } }}
              className="text-sm font-semibold text-navy px-2 py-1 flex-1 rounded border border-primary outline-none bg-white"
            />
          ) : (
            <h3
              className="text-sm font-semibold text-navy px-2 py-1 flex-1 cursor-pointer hover:bg-black/5 rounded"
              onClick={() => { setListTitle(list.title); setEditingTitle(true) }}
            >{list.title}</h3>
          )}
          <button
            onClick={handleDeleteList}
            className="text-gray-dark hover:text-red-500 p-1 rounded hover:bg-black/5 transition-colors text-xs opacity-60 hover:opacity-100"
            title="Delete list"
          >&#10005;</button>
        </div>
        <Droppable droppableId={list.id}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`min-h-[4px] transition-colors rounded ${snapshot.isDraggingOver ? 'bg-blue-pale/60' : ''}`}
            >
              {(list.cards ?? []).map((card, index) => (
                <CardItem key={card.id} card={card} index={index} onClick={() => onCardClick(card)} />
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>

        {adding ? (
          <div className="mt-1 space-y-2">
            <textarea
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdd() } if (e.key === 'Escape') setAdding(false) }}
              placeholder="Enter card title..."
              className="w-full text-sm border border-gray-border rounded-card p-2 resize-none outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              rows={2}
            />
            <div className="flex gap-2">
              <button onClick={handleAdd} className="btn-primary text-sm px-3 py-1 min-h-0">Add</button>
              <button onClick={() => { setAdding(false); setTitle('') }} className="btn-ghost text-sm px-3 py-1 min-h-0">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} className="w-full text-left text-sm text-gray-dark hover:text-navy px-2 py-1 rounded hover:bg-gray-border/50 transition-colors mt-1">
            + Add a card
          </button>
        )}
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
