import { useState } from 'react'
import type { Board, Card, List, WorkspaceMember } from '../../types'
import { updateCard, moveCard } from '../../api/cards'
import toast from 'react-hot-toast'

interface CardRow extends Card {
  _list: List
}

interface Props {
  board: Board
  wsMembers: WorkspaceMember[]
  onCardClick: (card: Card) => void
  onCardUpdate: (updated: Card) => void
}

export default function BoardTable({ board, wsMembers, onCardClick, onCardUpdate }: Props) {
  const lists = board.lists ?? []
  const labels = board.labels ?? []

  const [filterLists, setFilterLists] = useState<string[]>([])
  const [filterLabels, setFilterLabels] = useState<string[]>([])
  const [filterMembers, setFilterMembers] = useState<string[]>([])
  const [filterDue, setFilterDue] = useState<'all' | 'overdue' | 'this_week' | 'none'>('all')
  const [sortBy, setSortBy] = useState<'list' | 'title' | 'dueDate' | 'created'>('list')
  const [editingCell, setEditingCell] = useState<{ cardId: string; field: 'title' | 'dueDate' } | null>(null)
  const [editValue, setEditValue] = useState('')

  const now = new Date()
  const weekLater = new Date(now.getTime() + 7 * 86400000)

  const allCards: CardRow[] = lists.flatMap((list) =>
    (list.cards ?? []).map((card) => ({ ...card, _list: list }))
  )

  const filtered = allCards.filter((card) => {
    if (filterLists.length > 0 && !filterLists.includes(card.listId)) return false
    if (filterLabels.length > 0 && !card.labels?.some((l) => filterLabels.includes(l.label.id))) return false
    if (filterMembers.length > 0 && !card.members?.some((m) => filterMembers.includes(m.user.id))) return false
    if (filterDue === 'overdue') {
      if (!card.dueDate || new Date(card.dueDate) >= now) return false
    } else if (filterDue === 'this_week') {
      if (!card.dueDate) return false
      const d = new Date(card.dueDate)
      if (d < now || d > weekLater) return false
    } else if (filterDue === 'none') {
      if (card.dueDate) return false
    }
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'title') return a.title.localeCompare(b.title)
    if (sortBy === 'dueDate') {
      if (!a.dueDate && !b.dueDate) return 0
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    }
    if (sortBy === 'created') {
      if (!a.createdAt && !b.createdAt) return 0
      if (!a.createdAt) return 1
      if (!b.createdAt) return -1
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    }
    // default: sort by list position then card position
    const lDiff = a._list.position - b._list.position
    return lDiff !== 0 ? lDiff : a.position - b.position
  })

  const toggleFilter = (arr: string[], val: string, set: (v: string[]) => void) => {
    set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val])
  }

  const startEdit = (card: CardRow, field: 'title' | 'dueDate') => {
    setEditingCell({ cardId: card.id, field })
    if (field === 'title') setEditValue(card.title)
    else setEditValue(card.dueDate ? card.dueDate.slice(0, 16) : '')
  }

  const commitTitle = async (card: CardRow) => {
    const trimmed = editValue.trim()
    setEditingCell(null)
    if (!trimmed || trimmed === card.title) return
    try {
      const updated = await updateCard(card.id, { title: trimmed })
      onCardUpdate({ ...card, ...updated })
    } catch {
      toast.error('Update failed')
    }
  }

  const commitDueDate = async (card: CardRow, value: string) => {
    setEditingCell(null)
    try {
      const updated = await updateCard(card.id, { dueDate: value ? new Date(value).toISOString() : null })
      onCardUpdate({ ...card, ...updated })
    } catch {
      toast.error('Update failed')
    }
  }

  const handleMoveList = async (card: CardRow, newListId: string) => {
    if (newListId === card.listId) return
    const targetList = lists.find((l) => l.id === newListId)
    if (!targetList) return
    const lastPos = Math.max(0, ...(targetList.cards ?? []).map((c) => c.position))
    try {
      await moveCard(card.id, newListId, lastPos + 1)
      onCardUpdate({ ...card, listId: newListId })
    } catch {
      toast.error('Move failed')
    }
  }

  const dueBadge = (dueDate: string | null | undefined) => {
    if (!dueDate) return null
    const d = new Date(dueDate)
    const isOverdue = d < now
    const isSoon = d >= now && d <= weekLater
    const cls = isOverdue ? 'text-red-400 bg-red-400/10' : isSoon ? 'text-orange-400 bg-orange-400/10' : 'text-gray-400 bg-gray-400/10'
    return (
      <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${cls}`}>
        {d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
      </span>
    )
  }

  const checklistProgress = (card: Card) => {
    if (!card.checklists?.length) return null
    const total = card.checklists.reduce((s, cl) => s + cl.items.length, 0)
    const done = card.checklists.reduce((s, cl) => s + cl.items.filter((i) => i.isDone).length, 0)
    if (total === 0) return null
    const pct = Math.round((done / total) * 100)
    return (
      <div className="flex items-center gap-1.5 min-w-[80px]">
        <div className="flex-1 h-1.5 bg-gray-600 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${pct === 100 ? 'bg-green-500' : 'bg-blue-400'}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs text-gray-400 tabular-nums">{done}/{total}</span>
      </div>
    )
  }

  const SortBtn = ({ field, label }: { field: typeof sortBy; label: string }) => (
    <button
      onClick={() => setSortBy(field)}
      className={`flex items-center gap-1 text-xs font-medium transition-colors ${sortBy === field ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}
    >
      {label}
      {sortBy === field && <span className="text-blue-400">↑</span>}
    </button>
  )

  const activeFilters = filterLists.length + filterLabels.length + filterMembers.length + (filterDue !== 'all' ? 1 : 0)

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-black/10">
      {/* Filter bar */}
      <div className="flex items-center gap-3 px-6 py-3 bg-black/20 backdrop-blur-sm border-b border-white/10 flex-wrap">
        {/* List filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400 font-medium">List:</span>
          {lists.map((list) => (
            <button
              key={list.id}
              onClick={() => toggleFilter(filterLists, list.id, setFilterLists)}
              className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${filterLists.includes(list.id) ? 'bg-blue-500/30 border-blue-400 text-blue-200' : 'border-white/20 text-gray-400 hover:border-white/40 hover:text-gray-200'}`}
            >
              {list.title}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-white/10" />

        {/* Label filter */}
        {labels.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400 font-medium">Label:</span>
            {labels.map((lbl) => (
              <button
                key={lbl.id}
                onClick={() => toggleFilter(filterLabels, lbl.id, setFilterLabels)}
                title={lbl.name}
                className={`w-4 h-4 rounded-full border-2 transition-all ${filterLabels.includes(lbl.id) ? 'border-white scale-125' : 'border-transparent hover:border-white/50'}`}
                style={{ backgroundColor: lbl.color }}
              />
            ))}
          </div>
        )}

        {labels.length > 0 && <div className="w-px h-4 bg-white/10" />}

        {/* Due date filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400 font-medium">Due:</span>
          {(['all', 'overdue', 'this_week', 'none'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setFilterDue(opt)}
              className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${filterDue === opt ? 'bg-blue-500/30 border-blue-400 text-blue-200' : 'border-white/20 text-gray-400 hover:border-white/40 hover:text-gray-200'}`}
            >
              {opt === 'all' ? 'All' : opt === 'overdue' ? 'Overdue' : opt === 'this_week' ? 'This week' : 'No due'}
            </button>
          ))}
        </div>

        {activeFilters > 0 && (
          <button
            onClick={() => { setFilterLists([]); setFilterLabels([]); setFilterMembers([]); setFilterDue('all') }}
            className="text-xs text-red-400 hover:text-red-300 ml-auto"
          >
            Clear filters ({activeFilters})
          </button>
        )}

        <span className="text-xs text-gray-500 ml-auto">{sorted.length} cards</span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-gray-900/95 backdrop-blur-sm z-10">
            <tr className="border-b border-white/10">
              <th className="text-left px-4 py-2.5 text-gray-400 font-medium w-8">#</th>
              <th className="text-left px-4 py-2.5">
                <SortBtn field="title" label="Title" />
              </th>
              <th className="text-left px-4 py-2.5 w-36">
                <SortBtn field="list" label="List" />
              </th>
              <th className="text-left px-4 py-2.5 w-40 text-gray-400 font-medium text-xs">Labels</th>
              <th className="text-left px-4 py-2.5 w-32 text-gray-400 font-medium text-xs">Members</th>
              <th className="text-left px-4 py-2.5 w-32">
                <SortBtn field="dueDate" label="Due date" />
              </th>
              <th className="text-left px-4 py-2.5 w-28 text-gray-400 font-medium text-xs">Checklist</th>
              <th className="text-left px-4 py-2.5 w-24">
                <SortBtn field="created" label="Created" />
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-gray-500 py-12 text-sm">
                  No cards match the current filters
                </td>
              </tr>
            ) : sorted.map((card, idx) => {
              const isEditingTitle = editingCell?.cardId === card.id && editingCell.field === 'title'
              const isEditingDue = editingCell?.cardId === card.id && editingCell.field === 'dueDate'

              return (
                <tr
                  key={card.id}
                  className="border-b border-white/5 hover:bg-white/5 group transition-colors"
                >
                  {/* Index */}
                  <td className="px-4 py-2 text-gray-600 text-xs tabular-nums">{idx + 1}</td>

                  {/* Title */}
                  <td className="px-4 py-2">
                    {isEditingTitle ? (
                      <input
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => commitTitle(card)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitTitle(card)
                          if (e.key === 'Escape') setEditingCell(null)
                        }}
                        className="w-full bg-gray-800 border border-blue-500 rounded px-2 py-0.5 text-white text-sm outline-none"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        {card.coverColor && (
                          <span className="w-1 h-4 rounded-full shrink-0" style={{ backgroundColor: card.coverColor }} />
                        )}
                        <span
                          className="text-gray-200 cursor-pointer hover:text-white line-clamp-1"
                          onClick={() => onCardClick(card)}
                        >
                          {card.title}
                        </span>
                        <button
                          onClick={() => startEdit(card, 'title')}
                          className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-gray-300 text-xs px-1 shrink-0 transition-opacity"
                        >
                          ✎
                        </button>
                      </div>
                    )}
                  </td>

                  {/* List (moveable) */}
                  <td className="px-4 py-2">
                    <select
                      value={card.listId}
                      onChange={(e) => handleMoveList(card, e.target.value)}
                      className="bg-transparent text-gray-400 text-xs border border-transparent hover:border-white/20 rounded px-1 py-0.5 outline-none cursor-pointer hover:text-gray-200 transition-colors"
                    >
                      {lists.map((l) => (
                        <option key={l.id} value={l.id} className="bg-gray-800 text-gray-200">{l.title}</option>
                      ))}
                    </select>
                  </td>

                  {/* Labels */}
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-1">
                      {card.labels?.map((l) => (
                        <span
                          key={l.label.id}
                          title={l.label.name}
                          className="inline-block h-2 w-8 rounded-full"
                          style={{ backgroundColor: l.label.color }}
                        />
                      ))}
                    </div>
                  </td>

                  {/* Members */}
                  <td className="px-4 py-2">
                    <div className="flex -space-x-1">
                      {card.members?.slice(0, 4).map((m) => (
                        <div
                          key={m.user.id}
                          title={m.user.name}
                          className="w-6 h-6 rounded-full bg-blue-600 border-2 border-gray-900 flex items-center justify-center text-xs font-medium text-white shrink-0 overflow-hidden"
                        >
                          {m.user.avatarUrl
                            ? <img src={m.user.avatarUrl} alt={m.user.name} className="w-full h-full object-cover" />
                            : m.user.name.charAt(0).toUpperCase()
                          }
                        </div>
                      ))}
                      {(card.members?.length ?? 0) > 4 && (
                        <div className="w-6 h-6 rounded-full bg-gray-700 border-2 border-gray-900 flex items-center justify-center text-xs text-gray-400">
                          +{(card.members?.length ?? 0) - 4}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Due date */}
                  <td className="px-4 py-2">
                    {isEditingDue ? (
                      <input
                        autoFocus
                        type="datetime-local"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => commitDueDate(card, editValue)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitDueDate(card, editValue)
                          if (e.key === 'Escape') setEditingCell(null)
                        }}
                        className="bg-gray-800 border border-blue-500 rounded px-1 py-0.5 text-white text-xs outline-none"
                      />
                    ) : (
                      <div
                        className="flex items-center gap-1 cursor-pointer group/due"
                        onClick={() => startEdit(card, 'dueDate')}
                      >
                        {dueBadge(card.dueDate) ?? (
                          <span className="text-gray-600 text-xs opacity-0 group-hover/due:opacity-100 transition-opacity">+ date</span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Checklist */}
                  <td className="px-4 py-2">{checklistProgress(card)}</td>

                  {/* Created */}
                  <td className="px-4 py-2 text-gray-500 text-xs tabular-nums">
                    {card.createdAt
                      ? new Date(card.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
                      : '-'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
