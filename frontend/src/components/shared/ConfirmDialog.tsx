import { AlertTriangle, Info } from 'lucide-react'
import { Modal } from './Modal'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'primary' | 'warning'
  isPending?: boolean
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  isPending = false,
}: ConfirmDialogProps) {
  const buttonStyle = {
    danger: 'bg-rose-600 hover:bg-rose-700 text-white',
    warning: 'bg-amber-600 hover:bg-amber-700 text-white',
    primary: 'bg-zinc-900 hover:bg-zinc-800 text-white',
  }[variant]

  const iconStyle = {
    danger: 'text-rose-600 bg-rose-50 border-rose-200',
    warning: 'text-amber-600 bg-amber-50 border-amber-200',
    primary: 'text-zinc-600 bg-zinc-50 border-zinc-200',
  }[variant]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className={`rounded-xl border p-2.5 ${iconStyle}`}>
            {variant === 'danger' || variant === 'warning' ? (
              <AlertTriangle className="h-5 w-5" />
            ) : (
              <Info className="h-5 w-5" />
            )}
          </div>
          <p className="text-xs text-zinc-600 leading-relaxed pt-1">{message}</p>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm()
            }}
            disabled={isPending}
            className={`rounded-lg px-4 py-2 text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 ${buttonStyle}`}
          >
            {isPending ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  )
}
