import { useState } from 'react'
import { ArrowUpRight, TrendingUp } from 'lucide-react'
import { Modal } from '@/components/shared/Modal'
import type { Holding } from '@/types/portfolio'

interface SellModalProps {
  isOpen: boolean
  onClose: () => void
  holding: Holding | null
  portfolioId: string
  onSell: (payload: { portfolioId: string; assetId: string; quantity: number }) => void
  isPending: boolean
}

export function SellModal({
  isOpen,
  onClose,
  holding,
  portfolioId,
  onSell,
  isPending,
}: SellModalProps) {
  const [quantity, setQuantity] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!holding) return null

  const maxQty = holding.quantity
  const price = holding.currentPrice
  const numQty = parseFloat(quantity) || 0
  const estimatedProceeds = numQty * price
  const avgCost = holding.avgCost
  const estPnl = (price - avgCost) * numQty

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault()
    if (numQty <= 0) {
      setError('Please enter a valid quantity.')
      return
    }
    if (numQty > maxQty) {
      setError(`Cannot sell more than available quantity (${maxQty}).`)
      return
    }

    setError(null)
    onSell({
      portfolioId,
      assetId: holding.assetId,
      quantity: numQty,
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Sell ${holding.symbol} Position`}
      subtitle={`Execute market sell order for ${holding.name}`}
      maxWidth="md"
    >
      <form onSubmit={handleConfirm} className="space-y-4">
        {/* Position Summary Card */}
        <div className="grid grid-cols-3 gap-3 rounded-xl border border-zinc-200 bg-zinc-50/60 p-3.5">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Holding</span>
            <p className="mt-0.5 text-xs font-bold font-mono text-zinc-900">{maxQty} Units</p>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Market Price</span>
            <p className="mt-0.5 text-xs font-bold font-mono text-zinc-900">${(price ?? 0).toFixed(2)}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Avg Cost</span>
            <p className="mt-0.5 text-xs font-bold font-mono text-zinc-600">${(avgCost ?? 0).toFixed(2)}</p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              Quantity to Sell
            </label>
            <button
              type="button"
              onClick={() => setQuantity(maxQty.toString())}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-700 underline"
            >
              Sell Max ({maxQty})
            </button>
          </div>
          <input
            type="number"
            min="0.000001"
            max={maxQty}
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder={`0.00 (Max: ${maxQty})`}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm font-mono font-semibold text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300"
            required
            autoFocus
          />
        </div>

        {/* Estimated Summary */}
        {numQty > 0 && (
          <div className="rounded-xl border border-zinc-200 bg-white p-3 space-y-1.5 text-xs font-mono">
            <div className="flex justify-between text-zinc-600">
              <span>Estimated Proceeds:</span>
              <strong className="text-zinc-900">${(estimatedProceeds ?? 0).toFixed(2)}</strong>
            </div>
            <div className="flex justify-between text-zinc-600">
              <span>Estimated Realized P/L:</span>
              <strong className={estPnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                {estPnl >= 0 ? '+' : ''}${(estPnl ?? 0).toFixed(2)}
              </strong>
            </div>
          </div>
        )}

        {error && <div className="text-xs text-rose-600 font-medium">{error}</div>}

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending || numQty <= 0 || numQty > maxQty}
            className="rounded-lg bg-rose-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 transition-colors disabled:opacity-50"
          >
            {isPending ? 'Executing Sale...' : `Confirm Sale (${holding.symbol})`}
          </button>
        </div>
      </form>
    </Modal>
  )
}
