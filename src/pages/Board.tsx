import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { DragDropContext, DropResult } from '@hello-pangea/dnd'
import toast from 'react-hot-toast'
import { getBoard, getWorkspace, createList, updateBoard, deleteBoard } from '../api/boards'
import { moveCard } from '../api/cards'
import { useSocket } from '../hooks/useSocket'
import BoardColumn from '../components/board/BoardColumn'
import BoardTimeline from '../components/board/BoardTimeline'
import AutomationPanel from '../components/automation/AutomationPanel'
import CardModal from '../components/card/CardModal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import type { Board as BoardType, Card, List, WorkspaceMember } from '../types'

type Confirm = { message: string; onConfirm: () => void }

export default function Board() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [board, setBoard] = useState<BoardType | null>(null)
  const [wsMembers, setWsMembers] = useState<WorkspaceMember[]>([])
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const [addingList, setAddingList] = useState(false)
  const [newListTitle, setNewListTitle] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [boardTitle, setBoardTitle] = useState('')
  const [confirm, setConfirm] = useState<Confirm | null>(null)
  const [view, setView] = useState<'board' | 'timeline'>('board')
  const [showAutomation, setShowAutomation] = useState(false)

  useEffect(() => {
    if (!id) return
    getBoard(id).then((b) => {
      setBoard(b)
      setBoardTitle(b.title)
      getWorkspace(b.workspaceId).then((ws) => setWsMembers(ws.members ?? []))
      const cardId = searchParams.get('card')
      if (cardId) {
        const card = (b.lists ?? []).flatMap((l) => l.cards ?? []).find((c) => c.id === cardId)
        if (card) setSelectedCard({ ...card, checklists: card.checklists ?? [] })
      }
    }).catch(() => { toast.error('Board not found'); navigate('/') })
  }, [id])

  useSocket(id ?? null, {
    'card:created': (card) => setBoard((b) => b ? {
      ...b, lists: b.lists!.map((l) => l.id === (card as Card).listId ? { ...l, cards: [...(l.cards ?? []), card as Card] } : l)
    } : b),
    'card:moved': (data) => {
      const { id: cardId, listId, position } = data as { id: string; listId: string; position: number }
      setBoard((b) => {
        if (!b) return b
        let movedCard: Card | undefined
        const lists = b.lists!.map((l) => {
          const filtered = (l.cards ?? []).filter((c) => { if (c.id === cardId) { movedCard = c; return false } return true })
          return { ...l, cards: filtered }
        })
        return { ...b, lists: lists.map((l) => l.id === listId ? { ...l, cards: [...(l.cards ?? []), { ...movedCard!, listId, position }].sort((a, b) => a.position - b.position) } : l) }
      })
    },
    'card:updated': (card) => setBoard((b) => b ? {
      ...b, lists: b.lists!.map((l) => ({ ...l, cards: (l.cards ?? []).map((c) => c.id === (card as Card).id ? { ...c, ...(card as Card) } : c) }))
    } : b),
    'list:created': (list) => setBoard((b) => b ? { ...b, lists: [...(b.lists ?? []), { ...(list as List), cards: [] }] } : b),
    'list:updated': (list) => setBoard((b) => b ? {
      ...b, lists: b.lists!.map((l) => l.id === (list as List).id ? { ...l, title: (list as List).title } : l)
    } : b),
    'list:deleted': (data) => setBoard((b) => b ? {
      ...b, lists: b.lists!.filter((l) => l.id !== (data as { id: string }).id)
    } : b),
    'card:deleted': (data) => {
      const deletedId = (data as { id: string }).id
      setBoard((b) => b ? { ...b, lists: b.lists!.map((l) => ({ ...l, cards: (l.cards ?? []).filter((c) => c.id !== deletedId) })) } : b)
      setSelectedCard((prev) => prev?.id === deletedId ? null : prev)
    },
    'list:reordered': (data) => {
      const items = data as { id: string; position: number }[]
      setBoard((b) => b ? { ...b, lists: [...(b.lists ?? [])].sort((a, z) => {
        const pa = items.find((i) => i.id === a.id)?.position ?? a.position
        const pb = items.find((i) => i.id === z.id)?.position ?? z.position
        return pa - pb
      })} : b)
    },
  })

  const onDragEnd = useCallback(async (result: DropResult) => {
    const { destination, source, draggableId } = result
    if (!destination || !board) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const destList = board.lists!.find((l) => l.id === destination.droppableId)!
    const destCards = [...(destList.cards ?? [])].filter((c) => c.id !== draggableId)

    const before = destCards[destination.index - 1]?.position ?? 0
    const after = destCards[destination.index]?.position ?? (before + 2)
    const position = (before + after) / 2

    setBoard((b) => {
      if (!b) return b
      let moving: Card | undefined
      const lists = b.lists!.map((l) => ({ ...l, cards: (l.cards ?? []).filter((c) => { if (c.id === draggableId) { moving = c; return false } return true }) }))
      return { ...b, lists: lists.map((l) => l.id === destination.droppableId ? { ...l, cards: [...(l.cards ?? []), { ...moving!, listId: destination.droppableId, position }].sort((a, b) => a.position - b.position) } : l) }
    })

    try {
      await moveCard(draggableId, destination.droppableId, position)
    } catch { toast.error('Failed to move card'); getBoard(id!).then(setBoard) }
  }, [board, id])

  const handleAddList = async () => {
    if (!newListTitle.trim() || !id) return
    try {
      await createList(id, newListTitle.trim())
      setNewListTitle('')
      setAddingList(false)
    } catch { toast.error('Failed to add list') }
  }

  const handleSaveBoardTitle = async () => {
    setEditingTitle(false)
    if (!board || !id || boardTitle.trim() === board.title || !boardTitle.trim()) return
    try {
      await updateBoard(id, { title: boardTitle.trim() })
      setBoard((prev) => prev ? { ...prev, title: boardTitle.trim() } : prev)
    } catch { toast.error('Failed to rename board') }
  }

  const handleDeleteBoard = () => {
    if (!board) return
    setConfirm({
      message: `Xoa board "${board.title}"? Hanh dong nay khong the hoan tac.`,
      onConfirm: async () => {
        try {
          await deleteBoard(id!)
          navigate('/')
        } catch { toast.error('Failed to delete board') }
        setConfirm(null)
      },
    })
  }

  if (!board) return <div className="min-h-screen bg-primary flex items-center justify-center text-white">Loading...</div>

  return (
    <div className="min-h-screen flex flex-col" style={{ background: board.backgroundUrl ? `url(${board.backgroundUrl}) center/cover` : '#0C66E4' }}>
      <nav className="bg-black/30 backdrop-blur-sm h-[60px] flex items-center px-6 gap-4">
        <button onClick={() => navigate('/')} className="text-white/80 hover:text-white text-sm">&#8592; Home</button>
        {editingTitle ? (
          <input
            autoFocus
            value={boardTitle}
            onChange={(e) => setBoardTitle(e.target.value)}
            onBlur={handleSaveBoardTitle}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveBoardTitle(); if (e.key === 'Escape') { setBoardTitle(board.title); setEditingTitle(false) } }}
            className="text-white font-semibold text-lg bg-white/20 border border-white/40 rounded px-2 py-0.5 outline-none"
          />
        ) : (
          <h1
            className="text-white font-semibold text-lg cursor-pointer hover:bg-white/10 px-2 py-0.5 rounded"
            onClick={() => { setBoardTitle(board.title); setEditingTitle(true) }}
          >{board.title}</h1>
        )}
        <div className="flex items-center gap-1 ml-4 bg-black/20 rounded p-0.5">
          <button
            onClick={() => setView('board')}
            className={`text-sm px-3 py-1 rounded transition-colors ${view === 'board' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'}`}
          >Board</button>
          <button
            onClick={() => setView('timeline')}
            className={`text-sm px-3 py-1 rounded transition-colors ${view === 'timeline' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'}`}
          >Timeline</button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowAutomation(true)}
            className="text-white/70 hover:text-white hover:bg-white/10 text-sm px-3 py-1 rounded transition-colors"
          >&#9889; Automation</button>
          <button
            onClick={handleDeleteBoard}
            className="text-red-300 hover:text-red-100 hover:bg-red-500/30 text-sm px-3 py-1 rounded transition-colors"
          >Xoa board</button>
        </div>
      </nav>

      {view === 'timeline' ? (
        <BoardTimeline
          board={board}
          onCardClick={(card) => setSelectedCard(card)}
        />
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 p-6 overflow-x-auto flex-1 items-start">
            {(board.lists ?? []).sort((a, b) => a.position - b.position).map((list) => (
              <BoardColumn
                key={list.id}
                list={list}
                onCardClick={(card) => setSelectedCard({ ...card, checklists: card.checklists ?? [] })}
                onCardAdded={(card) => setBoard((b) => b ? { ...b, lists: b.lists!.map((l) => l.id === list.id ? { ...l, cards: [...(l.cards ?? []), card] } : l) } : b)}
              />
            ))}

            <div className="w-64 shrink-0">
              {addingList ? (
                <div className="bg-gray-ui rounded-card p-2 space-y-2">
                  <input
                    autoFocus
                    value={newListTitle}
                    onChange={(e) => setNewListTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddList(); if (e.key === 'Escape') setAddingList(false) }}
                    placeholder="List title..."
                    className="input-base h-9 text-sm w-full"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleAddList} className="btn-primary text-sm h-8 min-h-0 px-3">Add</button>
                    <button onClick={() => { setAddingList(false); setNewListTitle('') }} className="btn-ghost text-sm h-8 min-h-0 px-3">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setAddingList(true)} className="w-full text-left text-white/90 hover:text-white hover:bg-white/10 rounded-card p-3 text-sm font-semibold transition-colors backdrop-blur-sm bg-black/20">
                  + Add another list
                </button>
              )}
            </div>
          </div>
        </DragDropContext>
      )}

      {selectedCard && (
        <CardModal
          card={selectedCard}
          boardId={board.id}
          boardLabels={board.labels ?? []}
          wsMembers={wsMembers}
          onClose={() => setSelectedCard(null)}
          onDelete={(cardId) => {
            setSelectedCard(null)
            setBoard((b) => b ? { ...b, lists: b.lists!.map((l) => ({ ...l, cards: (l.cards ?? []).filter((c) => c.id !== cardId) })) } : b)
          }}
          onUpdate={(updated) => {
            setSelectedCard((prev) => prev ? { ...prev, ...updated } : prev)
            setBoard((b) => b ? { ...b, lists: b.lists!.map((l) => ({ ...l, cards: (l.cards ?? []).map((c) => c.id === selectedCard.id ? { ...c, ...updated } : c) })) } : b)
          }}
          onLabelsChange={(labels) => setBoard((b) => b ? { ...b, labels } : b)}
        />
      )}

      {confirm && (
        <ConfirmDialog
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      {showAutomation && (
        <AutomationPanel
          boardId={board.id}
          lists={board.lists ?? []}
          labels={board.labels ?? []}
          wsMembers={wsMembers}
          onClose={() => setShowAutomation(false)}
        />
      )}
    </div>
  )
}
