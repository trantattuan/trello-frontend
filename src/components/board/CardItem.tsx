import { Draggable } from '@hello-pangea/dnd'
import type { Card } from '../../types'

interface Props {
  card: Card
  index: number
  onClick: () => void
}

export default function CardItem({ card, index, onClick }: Props) {
  const totalItems = card.checklists?.reduce((acc, c) => acc + c.items.length, 0) ?? 0
  const doneItems = card.checklists?.reduce((acc, c) => acc + c.items.filter((i) => i.isDone).length, 0) ?? 0
  const progress = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : null
  const isOverdue = card.dueDate && new Date(card.dueDate) < new Date()

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={`card-base mb-2 cursor-pointer select-none ${snapshot.isDragging ? 'shadow-modal rotate-1' : ''}`}
          style={card.coverColor ? { borderTop: `3px solid ${card.coverColor}`, ...provided.draggableProps.style } : provided.draggableProps.style}
        >
          {card.labels && card.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {card.labels.map(({ label }) => (
                <span key={label.id} className="h-2 w-8 rounded-sm" style={{ backgroundColor: label.color }} />
              ))}
            </div>
          )}
          <p className="text-sm text-navy font-medium leading-snug">{card.title}</p>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {card.dueDate && (
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${isOverdue ? 'bg-red-100 text-red-700' : 'bg-gray-ui text-gray-dark'}`}>
                {new Date(card.dueDate).toLocaleDateString()}
              </span>
            )}
            {progress !== null && (
              <span className={`text-xs font-medium ${progress === 100 ? 'text-green-700' : 'text-gray-dark'}`}>
                {doneItems}/{totalItems}
              </span>
            )}
            {(card._count?.comments ?? 0) > 0 && (
              <span className="text-xs text-gray-dark">{card._count!.comments} comments</span>
            )}
            {(card._count?.attachments ?? 0) > 0 && (
              <span className="text-xs text-gray-dark">{card._count!.attachments} files</span>
            )}
            {card.members && card.members.length > 0 && (
              <div className="flex -space-x-1 ml-auto">
                {card.members.slice(0, 3).map(({ user }) => (
                  <div key={user.id} className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center border border-white font-semibold">
                    {user.name[0]}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  )
}
