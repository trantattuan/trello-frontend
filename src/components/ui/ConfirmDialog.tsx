interface Props {
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({ message, confirmLabel = 'Xóa', cancelLabel = 'Hủy', onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="bg-white rounded-card shadow-modal w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm text-navy mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="btn-ghost text-sm h-9 min-h-0 px-4">{cancelLabel}</button>
          <button
            onClick={onConfirm}
            className="text-sm h-9 min-h-0 px-4 rounded-card font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors"
          >{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
