import { useMemo } from 'react'
import type { Board as BoardType, Card } from '../../types'

const DAY_PX = 36
const ROW_H = 36
const HEADER_H = 48

interface Props {
  board: BoardType
  onCardClick: (card: Card) => void
}

export default function BoardTimeline({ board, onCardClick }: Props) {
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const listsWithDue = useMemo(
    () => (board.lists ?? []).filter((l) => (l.cards ?? []).some((c) => c.dueDate)),
    [board],
  )

  const { rangeStart, dayCount } = useMemo(() => {
    const allMs: number[] = []
    listsWithDue.forEach((l) =>
      (l.cards ?? []).filter((c) => c.dueDate).forEach((c) => {
        if (c.createdAt) allMs.push(new Date(c.createdAt).setHours(0, 0, 0, 0))
        allMs.push(new Date(c.dueDate!).setHours(0, 0, 0, 0))
      }),
    )
    if (allMs.length === 0) {
      const s = new Date(today)
      s.setDate(s.getDate() - 7)
      return { rangeStart: s, dayCount: 45 }
    }
    const s = new Date(Math.min(...allMs))
    s.setDate(s.getDate() - 5)
    s.setHours(0, 0, 0, 0)
    const e = new Date(Math.max(...allMs))
    e.setDate(e.getDate() + 10)
    e.setHours(0, 0, 0, 0)
    return { rangeStart: s, dayCount: Math.ceil((e.getTime() - s.getTime()) / 86400000) + 1 }
  }, [listsWithDue, today])

  const days = useMemo(
    () =>
      Array.from({ length: dayCount }, (_, i) => {
        const d = new Date(rangeStart)
        d.setDate(d.getDate() + i)
        return d
      }),
    [rangeStart, dayCount],
  )

  const todayCol = Math.floor((today.getTime() - rangeStart.getTime()) / 86400000)

  const getBar = (card: Card) => {
    const startMs = card.createdAt
      ? new Date(card.createdAt).setHours(0, 0, 0, 0)
      : new Date(card.dueDate!).setHours(0, 0, 0, 0)
    const endMs = new Date(card.dueDate!).setHours(0, 0, 0, 0)
    const colStart = Math.max(0, Math.floor((startMs - rangeStart.getTime()) / 86400000))
    const colEnd = Math.floor((endMs - rangeStart.getTime()) / 86400000)
    const left = colStart * DAY_PX
    const width = Math.max(DAY_PX, (colEnd - colStart + 1) * DAY_PX)
    const isOverdue = endMs < today.getTime()
    const labelColor = card.labels?.[0]?.label?.color
    const barColor = labelColor ?? (isOverdue ? '#ef4444' : '#0C66E4')
    return { left, width: Math.min(width, dayCount * DAY_PX - left), barColor, isOverdue }
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <div className="w-44 shrink-0 border-r border-white/20 bg-black/20 flex flex-col z-20">
        <div
          className="border-b border-white/20 flex items-center px-3 shrink-0"
          style={{ height: HEADER_H }}
        >
          <span className="text-xs font-semibold text-white/50 uppercase tracking-wide">Card</span>
        </div>
        <div className="overflow-y-auto flex-1">
          {listsWithDue.map((list) => {
            const cards = (list.cards ?? []).filter((c) => c.dueDate)
            return (
              <div key={list.id}>
                <div
                  className="px-3 flex items-center border-b border-white/10 bg-black/20 shrink-0"
                  style={{ height: ROW_H }}
                >
                  <span className="text-xs font-bold text-white/70 truncate">{list.title}</span>
                </div>
                {cards.map((card) => (
                  <div
                    key={card.id}
                    className="px-3 flex items-center border-b border-white/10 text-xs text-white/50 truncate"
                    style={{ height: ROW_H }}
                    title={card.title}
                  >
                    {card.title}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>

      {/* Date grid */}
      <div className="flex-1 overflow-auto">
        <div style={{ width: dayCount * DAY_PX, minHeight: '100%', position: 'relative' }}>
          {/* Header */}
          <div
            className="flex sticky top-0 bg-black/50 backdrop-blur-sm z-10 border-b border-white/20"
            style={{ height: HEADER_H }}
          >
            {days.map((d, i) => {
              const isToday = d.getTime() === today.getTime()
              const showMonth = i === 0 || d.getDate() === 1
              return (
                <div
                  key={i}
                  className={`shrink-0 flex flex-col items-center justify-center border-r border-white/10 gap-0.5 ${isToday ? 'bg-primary/40' : ''}`}
                  style={{ width: DAY_PX }}
                >
                  {showMonth && (
                    <span className="text-[8px] font-bold text-white/60 uppercase leading-none">
                      {d.toLocaleString('default', { month: 'short' })}
                    </span>
                  )}
                  <span className={`text-xs leading-none ${isToday ? 'text-white font-bold' : 'text-white/40'}`}>
                    {d.getDate()}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Rows */}
          <div className="relative">
            {/* Weekend column shading */}
            {days.map((d, i) => {
              const dow = d.getDay()
              if (dow !== 0 && dow !== 6) return null
              return (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 pointer-events-none"
                  style={{ left: i * DAY_PX, width: DAY_PX, background: 'rgba(0,0,0,0.12)' }}
                />
              )
            })}

            {/* Today line */}
            {todayCol >= 0 && todayCol < dayCount && (
              <div
                className="absolute top-0 bottom-0 pointer-events-none z-10"
                style={{
                  left: todayCol * DAY_PX + DAY_PX / 2 - 1,
                  width: 2,
                  background: 'rgba(12,102,228,0.7)',
                }}
              />
            )}

            {listsWithDue.length === 0 && (
              <div className="flex items-center justify-center py-24 text-white/40 text-sm">
                No cards with due dates. Add due dates to cards to see them on the timeline.
              </div>
            )}

            {listsWithDue.map((list) => {
              const cards = (list.cards ?? []).filter((c) => c.dueDate)
              return (
                <div key={list.id}>
                  {/* List header row (blank, just for alignment) */}
                  <div className="border-b border-white/10" style={{ height: ROW_H }} />
                  {cards.map((card) => {
                    const { left, width, barColor } = getBar(card)
                    return (
                      <div
                        key={card.id}
                        className="relative border-b border-white/10"
                        style={{ height: ROW_H }}
                      >
                        <button
                          onClick={() =>
                            onCardClick({ ...card, checklists: card.checklists ?? [] })
                          }
                          className="absolute rounded text-xs font-semibold text-white px-2 truncate hover:brightness-110 transition-all shadow-sm"
                          style={{
                            left,
                            width,
                            top: 6,
                            height: ROW_H - 12,
                            background: barColor,
                          }}
                          title={`${card.title} — due ${card.dueDate?.slice(0, 10)}`}
                        >
                          {card.title}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
