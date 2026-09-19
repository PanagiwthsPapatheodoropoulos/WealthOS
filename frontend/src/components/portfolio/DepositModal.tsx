import { useState } from 'react'
import { DollarSign, Wallet } from 'lucide-react'
import { Modal } from '@/components/shared/Modal'
import { useCurrencyStore } from '@/stores/currencyStore'

interface DepositModalProps {
  isOpen: boolean
  onClose: () => void
  accountId?: string
  currentBalance?: number
  onSuccess: () => void
}

const QUICK_AMOUNTS = [1000, 5000, 10000, 25000]

export function DepositModal({
  isOpen,
  onClose,
  accountId,
  currentBalance = 0,
  onSuccess,
}: DepositModalProps) {
  const { currentCurrency, formatMoney } = useCurrencyStore()
  const [amount, setAmount] = useState('5000')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accountId) {
      setError('No active cash account selected.')
      return
    }
    const num = parseFloat(amount)
    if (isNaN(num) || num <= 0) {
      setError('Please enter a valid deposit amount.')
      return
    }

    setError(null)
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/accounts/${accountId}/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: num }),
      })
      if (!res.ok) throw new Error('Deposit failed')
      onSuccess()
      onClose()
    } catch {
      setError('Failed to process cash deposit. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const safeBalance = currentBalance ?? 0

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Deposit Cash Reserves"
      subtitle="Add instant purchasing power to your trading account"
      maxWidth="md"
    >
      <form onSubmit={handleDeposit} className="space-y-4">
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
              <Wallet className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Current Cash Balance
              </span>
              <p className="text-sm font-bold font-mono text-zinc-900">
                {formatMoney(safeBalance, currentCurrency)}
              </p>
            </div>
          </div>
          <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/60">
            Instant
          </span>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
            Deposit Amount ({currentCurrency})
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
              <DollarSign className="h-4 w-4" />
            </div>
            <input
              type="number"
              min="1"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="5,000.00"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-4 py-2.5 text-sm font-mono font-semibold text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300"
              required
            />
          </div>
        </div>

        {/* Quick Amount Chips */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
            Quick Select
          </span>
          <div className="flex items-center gap-2">
            {QUICK_AMOUNTS.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setAmount(amt.toString())}
                className={`rounded-lg border px-3 py-1.5 text-xs font-mono font-semibold transition-all ${
                  amount === amt.toString()
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                +{formatMoney(amt, currentCurrency)}
              </button>
            ))}
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
            disabled={isSubmitting}
            className="rounded-lg bg-zinc-900 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Depositing...' : 'Confirm Deposit'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
