import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { Briefcase, Check, ChevronDown, Plus, X, Layers, Wallet, Loader2 } from 'lucide-react'
import { useCreatePortfolio } from '@/api/portfolioApi'
import type { PortfolioSummary } from '@/types/portfolio'
import { useCurrencyStore } from '@/stores/currencyStore'

interface PortfolioSelectorModalProps {
  activePortfolioId: string
  onSelectPortfolio: (id: string) => void
  portfolios: PortfolioSummary[]
}

export function PortfolioSelectorModal({
  activePortfolioId,
  onSelectPortfolio,
  portfolios,
}: PortfolioSelectorModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newPortfolioName, setNewPortfolioName] = useState('')
  const [newCurrency, setNewCurrency] = useState('EUR')
  const [createError, setCreateError] = useState<string | null>(null)

  const createMutation = useCreatePortfolio()
  const { currentCurrency, formatMoney } = useCurrencyStore()

  const activePortfolio = portfolios.find((p) => p.id === activePortfolioId) || portfolios[0]

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPortfolioName.trim()) return

    setCreateError(null)
    try {
      const res: any = await createMutation.mutateAsync({
        name: newPortfolioName.trim(),
        baseCurrency: newCurrency,
      })
      const createdId = res?.id || res?.data?.id
      setNewPortfolioName('')
      setIsCreating(false)
      if (createdId) {
        onSelectPortfolio(createdId)
      }
      setIsOpen(false)
    } catch (err: any) {
      setCreateError(err?.message || 'Failed to create portfolio')
    }
  }

  return (
    <>
      {/* Custom Selector Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="group flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-white py-2 pl-3 pr-4 text-sm font-bold text-zinc-900 shadow-xs hover:border-zinc-900 hover:shadow-sm transition-all cursor-pointer"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 group-hover:bg-zinc-900 group-hover:text-white transition-colors">
          <Briefcase className="h-3.5 w-3.5" />
        </div>
        <span>{activePortfolio?.name || 'Select Portfolio'}</span>
        <ChevronDown className="h-4 w-4 text-zinc-400 group-hover:text-zinc-700 transition-colors ml-1" />
      </button>

      {/* Modal Dialog */}
      {isOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-xs">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-900">Switch Portfolio</h3>
                    <p className="text-xs text-zinc-500">Manage your active trading & investment strategies</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false)
                    setIsCreating(false)
                  }}
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Portfolio List */}
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {portfolios.map((p) => {
                  const isSelected = p.id === activePortfolioId
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        onSelectPortfolio(p.id)
                        setIsOpen(false)
                      }}
                      className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                          : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/70'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-lg font-bold text-xs ${
                            isSelected ? 'bg-emerald-600 text-white' : 'bg-zinc-100 text-zinc-600'
                          }`}
                        >
                          <Briefcase className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-zinc-900">{p.name}</span>
                            <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-mono font-extrabold text-zinc-600">
                              {p.baseCurrency || 'EUR'}
                            </span>
                          </div>
                          <span className="text-[11px] text-zinc-500">
                            {p.assetCount ?? p.assets?.length ?? 2} Tracked Positions
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isSelected && (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Create New Portfolio Section */}
              {!isCreating ? (
                <button
                  type="button"
                  onClick={() => setIsCreating(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 p-3 text-xs font-bold text-zinc-700 hover:border-zinc-900 hover:text-zinc-900 hover:bg-zinc-50 transition-all cursor-pointer"
                >
                  <Plus className="h-4 w-4 text-zinc-500" />
                  <span>Create New Portfolio</span>
                </button>
              ) : (
                <form onSubmit={handleCreate} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-900">New Portfolio Details</span>
                    <button
                      type="button"
                      onClick={() => setIsCreating(false)}
                      className="text-[11px] text-zinc-400 hover:text-zinc-700"
                    >
                      Cancel
                    </button>
                  </div>

                  {createError && (
                    <p className="text-[11px] text-rose-600 font-medium">{createError}</p>
                  )}

                  <div>
                    <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">
                      Portfolio Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Growth & Tech Strategy"
                      value={newPortfolioName}
                      onChange={(e) => setNewPortfolioName(e.target.value)}
                      className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:border-zinc-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">
                      Base Currency
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {['EUR', 'USD'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setNewCurrency(c)}
                          className={`py-1.5 px-3 rounded-lg text-xs font-bold font-mono transition-all ${
                            newCurrency === c
                              ? 'bg-zinc-900 text-white shadow-xs'
                              : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                          }`}
                        >
                          {c} ({c === 'EUR' ? '€' : '$'})
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={createMutation.isPending || !newPortfolioName.trim()}
                    className="w-full rounded-xl bg-zinc-900 py-2 text-xs font-bold text-white hover:bg-zinc-800 disabled:opacity-40 flex items-center justify-center gap-2 transition-colors mt-2 shadow-xs"
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Creating...
                      </>
                    ) : (
                      'Save & Switch Portfolio'
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
