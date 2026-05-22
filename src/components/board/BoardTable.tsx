import { useState } from 'react'
import type { Board, Card, List } from '../../types'
import { updateCard, moveCard } from '../../api/cards'
import toast from 'react-hot-toast'

interface CardRow extends Card {
  _list: List
}

interface Props {
  board: Board
  onCardClick: (card: Card) => void
  onCardUpdate: (updated: Card) => void
}

export default function BoardTable({ board, onCardClick, onCardUpdate }: Props) {
  const lists = board.lists ?? []
  const labels = board.labels ?? []

  const [filterLists, setFilterLists] = useState<string[]>([])
  const [filterLabels, setFilterLabels] = useState<string[]>([])
  const [filterDue, setFilterDue] = useState<'all' | 'overdue' | 'this_week' | 'none'>('all')
  const [sortBy, setSortBy] = useState<'list' | 'title' | 'dueDate' | 'created'>('list')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
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
    let cmp = 0
    if (sortBy === 'title') cmp = a.title.localeCompare(b.title)
    else if (sortBy === 'dueDate') {
      if (!a.dueDate && !b.dueDate) cmp = 0
      else if (!a.dueDate) cmp = 1
      else if (!b.dueDate) cmp = -1
      else cmp = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    } else if (sortBy === 'created') {
      if (!a.createdAt && !b.createdAt) cmp = 0
      else if (!a.createdAt) cmp = 1
      else if (!b.createdAt) cmp = -1
      else cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    } else {
      const lDiff = a._list.position - b._list.position
      cmp = lDiff !== 0 ? lDiff : a.position - b.position
    }
    return sortDir === 'asc' ? cmp : -cmp
  })

  const toggleFilter = (arr: string[], val: string, set: (v: string[]) => void) => {
    set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val])
  }

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortBy(field); setSortDir('asc') }
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
    if (!dueDate) return <span className="text-gray-300">·</span>
    const d = new Date(dueDate)
    const isOverdue = d < now
    const isSoon = d >= now && d <= weekLater
    const cls = isOverdue
      ? 'text-red-600 bg-red-50 border border-red-200'
      : isSoon
      ? 'text-orange-600 bg-orange-50 border border-orange-200'
      : 'text-gray-600 bg-gray-100 border border-gray-200'
    return (
      <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${cls}`}>
        {d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
      </span>
    )
  }

  const checklistProgress = (card: Card) => {
    if (!card.checklists?.length) return <span className="text-gray-300">·</span>
    const total = card.checklists.reduce((s, cl) => s + cl.items.length, 0)
    const done = card.checklists.reduce((s, cl) => s + cl.items.filter((i) => i.isDone).length, 0)
    if (total === 0) return <span className="text-gray-300">·</span>
    const pct = Math.round((done / total) * 100)
    return (
      <div className="flex items-center gap-1.5 min-w-[72px]">
        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${pct === 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs text-gray-500 tabular-nums">{done}/{total}</span>
      </div>
    )
  }

  const SortHeader = ({ field, label, className = '' }: { field: typeof sortBy; label: string; className?: string }) => (
    <button
      onClick={() => handleSort(field)}
      className={`flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors ${className}`}
    >
      {label}
      {sortBy === field
        ? <span className="text-blue-500">{sortDir === 'asc' ? '↑' : '↓'}</span>
        : <span className="text-gray-300">↕</span>
      }
    </button>
  )

  const activeFilters = filterLists.length + filterLabels.length + (filterDue !== 'all' ? 1 : 0)

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* Filter bar */}
      <div className="flex items-center gap-3 px-6 py-3 bg-gray-50 border-b border-gray-200 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 font-medium">List:</span>
          {lists.map((list) => (
            <button
              key={list.id}
              onClick={() => toggleFilter(filterLists, list.id, setFilterLists)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                filterLists.includes(list.id)
                  ? 'bg-blue-50 border-blue-400 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-800'
              }`}
            >
              {list.title}
            </button>
          ))}
        </div>

        {labels.length > 0 && (
          <>
            <div className="w-px h-4 bg-gray-200" />
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 font-medium">Label:</span>
              {labels.map((lbl) => (
                <button
                  key={lbl.id}
                  onClick={() => toggleFilter(filterLabels, lbl.id, setFilterLabels)}
                  title={lbl.name}
                  className={`w-5 h-5 rounded-full border-2 transition-all ${
                    filterLabels.includes(lbl.id) ? 'border-gray-800 scale-110' : 'border-transparent hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: lbl.color }}
                />
              ))}
            </div>
          </>
        )}

        <div className="w-px h-4 bg-gray-200" />

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 font-medium">Due:</span>
          {(['all', 'overdue', 'this_week', 'none'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setFilterDue(opt)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                filterDue === opt
                  ? 'bg-blue-50 border-blue-400 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-800'
              }`}
            >
              {opt === 'all' ? 'All' : opt === 'overdue' ? 'Overdue' : opt === 'this_week' ? 'This week' : 'No due'}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3">
          {activeFilters > 0 && (
            <button
              onClick={() => { setFilterLists([]); setFilterLabels([]); setFilterDue('all') }}
              className="text-xs text-red-500 hover:text-red-700"
            >
              Clear ({activeFilters})
            </button>
          )}
          <span className="text-xs text-gray-400">{sorted.length} cards</span>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-white z-10 border-b-2 border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 w-8">
                <span className="text-xs font-semibold text-gray-500">#</span>
              </th>
              <th className="text-left px-4 py-3">
                <SortHeader field="title" label="Card" />
              </th>
              <th className="text-left px-4 py-3 w-44">
                <SortHeader field="list" label="List" />
              </th>
              <th className="text-left px-4 py-3 w-40">
                <span className="text-xs font-semibold text-gray-600">Labels</span>
              </th>
              <th className="text-left px-4 py-3 w-32">
                <span className="text-xs font-semibold text-gray-600">Members</span>
              </th>
              <th className="text-left px-4 py-3 w-32">
                <SortHeader field="dueDate" label="Due date" />
              </th>
              <th className="text-left px-4 py-3 w-28">
                <span className="text-xs font-semibold text-gray-600">Checklist</span>
              </th>
              <th className="text-right px-4 py-3 w-8">
                <span className="text-gray-300 text-xs">↓</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-gray-400 py-16 text-sm">
                  No cards match the current filters
                </td>
              </tr>
            ) : sorted.map((card, idx) => {
              const isEditingTitle = editingCell?.cardId === card.id && editingCell.field === 'title'
              const isEditingDue = editingCell?.cardId === card.id && editingCell.field === 'dueDate'

              return (
                <tr
                  key={card.id}
                  className="hover:bg-gray-50 group transition-colors"
                >
                  <td className="px-4 py-2.5 text-gray-400 text-xs tabular-nums">{idx + 1}</td>

                  <td className="px-4 py-2.5">
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
                        className="w-full border border-blue-400 rounded px-2 py-0.5 text-gray-900 text-sm outline-none ring-1 ring-blue-300"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        {card.coverColor && (
                          <span className="w-1 h-4 rounded-full shrink-0" style={{ backgroundColor: card.coverColor }} />
                        )}
                        <span
                          className="text-gray-800 cursor-pointer hover:text-blue-600 hover:underline line-clamp-1"
                          onClick={() => onCardClick(card)}
                        >
                          {card.title}
                        </span>
                        <button
                          onClick={() => startEdit(card, 'title')}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 text-xs shrink-0 transition-opacity ml-1"
                        >
                          ✎
                        </button>
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-2.5">
                    <select
                      value={card.listId}
                      onChange={(e) => handleMoveList(card, e.target.value)}
                      className="bg-transparent text-gray-600 text-xs border border-transparent hover:border-gray-300 rounded px-1 py-0.5 outline-none cursor-pointer hover:text-gray-800 transition-colors"
                    >
                      {lists.map((l) => (
                        <option key={l.id} value={l.id}>{l.title}</option>
                      ))}
                    </select>
                  </td>

                  <td className="px-4 py-2.5">
                    {card.labels?.length ? (
                      <div className="flex flex-wrap gap-1">
                        {card.labels.map((l) => (
                          <span
                            key={l.label.id}
                            title={l.label.name}
                            className="inline-block h-2 w-8 rounded-full"
                            style={{ backgroundColor: l.label.color }}
                          />
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-300">·</span>
                    )}
                  </td>

                  <td className="px-4 py-2.5">
                    {card.members?.length ? (
                      <div className="flex -space-x-1">
                        {card.members.slice(0, 4).map((m) => (
                          <div
                            key={m.user.id}
                            title={m.user.name}
                            className="w-6 h-6 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-xs font-medium text-white shrink-0 overflow-hidden"
                          >
                            {m.user.avatarUrl
                              ? <img src={m.user.avatarUrl} alt={m.user.name} className="w-full h-full object-cover" />
                              : m.user.name.charAt(0).toUpperCase()
                            }
                          </div>
                        ))}
                        {(card.members?.length ?? 0) > 4 && (
                          <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs text-gray-600">
                            +{(card.members?.length ?? 0) - 4}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-300">·</span>
                    )}
                  </td>

                  <td className="px-4 py-2.5">
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
                        className="border border-blue-400 rounded px-1 py-0.5 text-gray-900 text-xs outline-none ring-1 ring-blue-300"
                      />
                    ) : (
                      <div
                        className="cursor-pointer"
                        onClick={() => startEdit(card, 'dueDate')}
                      >
                        {dueBadge(card.dueDate)}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-2.5">{checklistProgress(card)}</td>

                  <td className="px-4 py-2.5 text-right">
                    <span className="text-gray-300 text-xs">↓</span>
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
