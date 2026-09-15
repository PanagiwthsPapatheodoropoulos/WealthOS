import React, { useEffect } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl'
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'md',
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = 'unset'
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  }[maxWidth]

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/60 p-4 sm:p-6 md:p-10 flex items-center justify-center min-h-screen">
      {/* Backdrop click area */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Container */}
      <div
        className={`relative my-auto w-full ${maxWidthClass} overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl transition-all z-10`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-zinc-100">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 tracking-tight">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 max-h-[75vh] overflow-y-auto pr-1">{children}</div>
      </div>
    </div>
  )
}
