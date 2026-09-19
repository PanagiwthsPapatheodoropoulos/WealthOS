import { useState } from 'react'
import { FolderPlus, Layers } from 'lucide-react'
import { Modal } from '@/components/shared/Modal'

interface CreatePortfolioModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CreatePortfolioModal({ isOpen, onClose, onSuccess }: CreatePortfolioModalProps) {
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Please provide a portfolio name.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/portfolios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (!res.ok) throw new Error('Failed to create portfolio')
      setName('')
      onSuccess()
      onClose()
    } catch {
      setError('Could not create portfolio. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Portfolio"
      subtitle="Organize specific investment strategies (e.g. Long-term ETFs, Crypto Growth, Dividend)"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
            Portfolio Name
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400">
              <Layers className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. High-Growth Tech & AI Strategy"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 py-2.5 text-sm font-semibold text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300"
              required
              autoFocus
            />
          </div>
        </div>

        {error && <div className="text-xs text-rose-600 font-medium">{error}</div>}

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="rounded-lg bg-zinc-900 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Create Portfolio'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
