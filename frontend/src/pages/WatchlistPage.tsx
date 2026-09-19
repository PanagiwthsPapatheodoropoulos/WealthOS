import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  Star,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Search,
  Layers,
  Sparkles,
  X,
  Check,
  Loader2,
  ExternalLink,
  Info,
  ChevronRight,
  PieChart,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react'
import {
  useWatchlists,
  useCreateWatchlist,
  useAddWatchlistItem,
  useRemoveWatchlistItem,
  useDeleteWatchlist,
} from '@/api/watchlistApi'
import { useBatchQuotes } from '@/api/assetApi'
import { useCurrencyStore } from '@/stores/currencyStore'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { MetricTooltip } from '@/components/shared/MetricTooltip'
import { CommandPalette } from '@/components/shared/CommandPalette'


interface SuggestedAsset {
  symbol: string
  name: string
  assetType?: string
  sector?: string
  currency?: string
  currentPrice?: number
  priceChange24h?: number
  marketCap?: number
  peRatio?: number | null
  pegRatio?: number | null
  expenseRatio?: number | null
  beta?: number | null
  dividendYield?: number | null
}

const PRESET_BASKETS = [
  {
    name: 'US Tech Leaders',
    assets: [
      { symbol: 'NVDA', name: 'NVIDIA Corporation', assetType: 'STOCK', currency: 'USD' },
      { symbol: 'AAPL', name: 'Apple Inc.', assetType: 'STOCK', currency: 'USD' },
      { symbol: 'MSFT', name: 'Microsoft Corporation', assetType: 'STOCK', currency: 'USD' },
    ],
  },
  {
    name: 'European UCITS Core',
    assets: [
      { symbol: 'VUAA.MI', name: 'Vanguard S&P 500 UCITS ETF (Acc)', assetType: 'ETF', currency: 'EUR' },
      { symbol: 'VWCE.DE', name: 'Vanguard FTSE All-World UCITS ETF', assetType: 'ETF', currency: 'EUR' },
      { symbol: 'SMHM', name: 'VanEck Semiconductor UCITS ETF', assetType: 'ETF', currency: 'EUR' },
    ],
  },
  {
    name: 'Semiconductors & AI',
    assets: [
      { symbol: 'SMHM', name: 'VanEck Semiconductor UCITS ETF', assetType: 'ETF', currency: 'EUR' },
      { symbol: 'NVDA', name: 'NVIDIA Corporation', assetType: 'STOCK', currency: 'USD' },
      { symbol: 'WQTM', name: 'WisdomTree Quantum Computing Fund', assetType: 'ETF', currency: 'USD' },
    ],
  },
  {
    name: 'Digital Assets & Crypto',
    assets: [
      { symbol: 'BTC', name: 'Bitcoin', assetType: 'CRYPTO', currency: 'USD' },
      { symbol: 'ETH', name: 'Ethereum', assetType: 'CRYPTO', currency: 'USD' },
      { symbol: 'SOL', name: 'Solana', assetType: 'CRYPTO', currency: 'USD' },
    ],
  },
]

function formatMarketCap(cap?: number, currency: string = 'USD'): string {
  if (!cap || cap <= 0) return '—'
  const prefix = currency === 'EUR' ? '€' : '$'
  if (cap >= 1e12) return `${prefix}${(cap / 1e12).toFixed(2)}T`
  if (cap >= 1e9) return `${prefix}${(cap / 1e9).toFixed(2)}B`
  if (cap >= 1e6) return `${prefix}${(cap / 1e6).toFixed(2)}M`
  return `${prefix}${cap.toLocaleString()}`
}

export function WatchlistPage() {
  const { currentCurrency, formatMoney } = useCurrencyStore()
  const { data: watchlists, isLoading } = useWatchlists()
  const createWatchlist = useCreateWatchlist()
  const addItem = useAddWatchlistItem()
  const removeItem = useRemoveWatchlistItem()
  const deleteWatchlistMutation = useDeleteWatchlist()

  const safeWatchlists = Array.isArray(watchlists) ? watchlists : []
  const [activeWatchlistId, setActiveWatchlistId] = useState<string>('')
  const activeWatchlist = safeWatchlists.find((w) => w.id === activeWatchlistId) || safeWatchlists[0]

  // Dossier modal state
  const [dossierSymbol, setDossierSymbol] = useState<string | null>(null)

  // Delete confirmation modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newWatchlistName, setNewWatchlistName] = useState('')
  const [selectedPills, setSelectedPills] = useState<SuggestedAsset[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Inline Search State
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SuggestedAsset[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  // Direct Inline Add in Active Watchlist
  const [directQuery, setDirectQuery] = useState('')
  const [directResults, setDirectResults] = useState<SuggestedAsset[]>([])
  const [isDirectSearching, setIsDirectSearching] = useState(false)
  const [isDirectDropdownOpen, setIsDirectDropdownOpen] = useState(false)
  const directContainerRef = useRef<HTMLDivElement>(null)

  // Enriched metrics cache for items in the watchlist
  const [metricsMap, setMetricsMap] = useState<Record<string, any>>({})

  // Debounced search for creation modal
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setIsDropdownOpen(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await fetch(`/api/assets/search?q=${encodeURIComponent(searchQuery.trim())}`)
        if (res.ok) {
          const json = await res.json()
          setSearchResults(json?.data || [])
          setIsDropdownOpen(true)
        }
      } catch {
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Debounced search for direct add inside active watchlist
  useEffect(() => {
    if (!directQuery.trim()) {
      setDirectResults([])
      setIsDirectDropdownOpen(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsDirectSearching(true)
      try {
        const res = await fetch(`/api/assets/search?q=${encodeURIComponent(directQuery.trim())}`)
        if (res.ok) {
          const json = await res.json()
          setDirectResults(json?.data || [])
          setIsDirectDropdownOpen(true)
        }
      } catch {
        setDirectResults([])
      } finally {
        setIsDirectSearching(false)
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [directQuery])

  // Live batch price quotes — polls every 30s to keep prices current
  const watchlistSymbols = (activeWatchlist?.items || []).map((i) => i.symbol)
  const { data: liveQuotes } = useBatchQuotes(watchlistSymbols)

  // Fetch enriched deep metrics (PEG, Market Cap, TER, P/E, Beta) for all items in active watchlist
  useEffect(() => {
    if (!activeWatchlist?.items?.length) return

    const symbolsToFetch = activeWatchlist.items.map((i) => i.symbol).filter((s) => !metricsMap[s])
    if (symbolsToFetch.length === 0) return

    async function fetchDeepMetrics() {
      const updates: Record<string, any> = {}
      await Promise.all(
        symbolsToFetch.map(async (sym) => {
          try {
            const res = await fetch(`/api/market/analytics/${sym}`)
            if (res.ok) {
              const json = await res.json()
              updates[sym] = json?.data || {}
            }
          } catch {
            // ignore
          }
        })
      )
      if (Object.keys(updates).length > 0) {
        setMetricsMap((prev) => ({ ...prev, ...updates }))
      }
    }

    fetchDeepMetrics()
  }, [activeWatchlist?.items])



  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false)
      }
      if (directContainerRef.current && !directContainerRef.current.contains(e.target as Node)) {
        setIsDirectDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const safeItems = Array.isArray(activeWatchlist?.items) ? activeWatchlist.items : []

  const filteredDirectResults = useMemo(() => {
    const existing = new Set(safeItems.map((i) => i.symbol.toUpperCase()))
    return directResults.filter((item) => !existing.has(item.symbol.toUpperCase()))
  }, [directResults, safeItems])

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  // Add asset pill in creation modal
  const handleAddPill = (asset: SuggestedAsset) => {
    if (!selectedPills.some((p) => p.symbol === asset.symbol)) {
      setSelectedPills([...selectedPills, asset])
    }
    setSearchQuery('')
    setIsDropdownOpen(false)
  }

  // Remove asset pill in creation modal
  const handleRemovePill = (symbol: string) => {
    setSelectedPills(selectedPills.filter((p) => p.symbol !== symbol))
  }

  // Submit complete watchlist creation
  const handleCreateWatchlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newWatchlistName.trim()) return

    setIsSubmitting(true)
    try {
      const created: any = await createWatchlist.mutateAsync(newWatchlistName.trim())
      const watchlistId = created?.id || created?.data?.id

      if (watchlistId && selectedPills.length > 0) {
        for (const asset of selectedPills) {
          try {
            await addItem.mutateAsync({
              watchlistId,
              symbol: asset.symbol,
              name: asset.name,
              assetType: asset.assetType,
              currency: asset.currency,
              currentPrice: asset.currentPrice,
            })
          } catch (err) {
            console.error('Failed to add item to new watchlist', err)
          }
        }
      }

      setNewWatchlistName('')
      setSelectedPills([])
      setShowCreateModal(false)
      if (watchlistId) {
        setActiveWatchlistId(watchlistId)
      }
    } catch (err) {
      console.error('Watchlist creation failed', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Direct add single asset into active watchlist
  const handleDirectAdd = async (asset: SuggestedAsset) => {
    if (!activeWatchlist) return
    try {
      await addItem.mutateAsync({
        watchlistId: activeWatchlist.id,
        symbol: asset.symbol,
        name: asset.name,
        assetType: asset.assetType,
        currency: asset.currency,
        currentPrice: asset.currentPrice,
      })
      setDirectQuery('')
      setIsDirectDropdownOpen(false)
    } catch (err) {
      console.error('Failed to add item', err)
    }
  }

  // Delete entire watchlist
  const handleDeleteWatchlist = async () => {
    if (!activeWatchlist) return
    try {
      await deleteWatchlistMutation.mutateAsync(activeWatchlist.id)
      setShowDeleteConfirm(false)
      const remaining = safeWatchlists.filter((w) => w.id !== activeWatchlist.id)
      if (remaining.length > 0) {
        setActiveWatchlistId(remaining[0].id)
      } else {
        setActiveWatchlistId('')
      }
    } catch (err) {
      console.error('Failed to delete watchlist', err)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Watchlist Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-700 font-mono">
              REAL-TIME RADAR
            </span>
            <span className="text-xs text-zinc-400 font-medium">Institutional Multi-Asset Surveillance</span>
          </div>
          <h1 className="text-2xl font-black text-zinc-900 mt-1 tracking-tight">Market Watchlist</h1>
        </div>

        {/* Watchlist Tabs & Create Action */}
        <div className="flex flex-wrap items-center gap-2">
          {safeWatchlists.map((w) => (
            <button
              key={w.id}
              onClick={() => setActiveWatchlistId(w.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeWatchlist?.id === w.id
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              <Star className={`h-3.5 w-3.5 ${activeWatchlist?.id === w.id ? 'fill-amber-400 text-amber-400' : 'text-zinc-400'}`} />
              <span>{w.name}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeWatchlist?.id === w.id ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-500'
              }`}>
                {w.items?.length ?? 0}
              </span>
            </button>
          ))}

          <a
            href="/alerts"
            className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 px-3.5 py-1.5 text-xs font-bold text-emerald-800 shadow-xs transition-colors cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            <span>Generate Daily Briefing & Email</span>
          </a>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 stroke-[3]" />
            <span>New Watchlist</span>
          </button>
        </div>
      </div>

      {/* CREATE WATCHLIST MODAL WITH LIVE INLINE SUGGESTIONS */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                  <Star className="h-5 w-5 fill-amber-400 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900">Create New Watchlist</h3>
                  <p className="text-xs text-zinc-500">Pick asset baskets and monitor valuation statistics</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateWatchlistSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                  Watchlist Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Semiconductor Leaders, AI Innovation, UCITS Core..."
                  value={newWatchlistName}
                  onChange={(e) => setNewWatchlistName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-xs font-semibold text-zinc-900 focus:bg-white focus:border-zinc-900 focus:outline-none"
                />
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                  Or Pick an Institutional Preset Basket
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_BASKETS.map((b) => (
                    <button
                      key={b.name}
                      type="button"
                      onClick={() => {
                        setNewWatchlistName(b.name)
                        setSelectedPills(b.assets)
                      }}
                      className="p-2 text-left rounded-xl border border-zinc-200 hover:border-zinc-900 hover:bg-zinc-50 transition-all text-xs"
                    >
                      <span className="font-bold text-zinc-900 block truncate">{b.name}</span>
                      <span className="text-[10px] text-zinc-400 font-mono block mt-0.5">
                        {b.assets.map((a) => a.symbol).join(', ')}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div ref={searchContainerRef} className="relative">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                  Search & Add Tickers (Live Autocomplete)
                </label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Type ticker symbol (e.g. VUAA, WQTM, NVDA, SOL, AAPL)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-9 py-2 text-xs font-semibold text-zinc-900 focus:bg-white focus:border-zinc-900 focus:outline-none"
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-zinc-400" />
                  )}
                </div>

                {isDropdownOpen && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-xl max-h-56 overflow-y-auto space-y-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 px-2 py-1 block">
                      Live Matching Assets
                    </span>
                    {searchResults.map((item) => (
                      <button
                        key={item.symbol}
                        type="button"
                        onClick={() => handleAddPill(item)}
                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-zinc-50 transition-colors text-left text-xs cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="font-bold font-mono text-zinc-900 group-hover:text-blue-600 transition-colors">
                            {item.symbol}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-zinc-100 text-zinc-600 uppercase">
                            {item.assetType || 'STOCK'}
                          </span>
                          <span className="text-[11px] text-zinc-500 truncate max-w-44">
                            {item.name}
                          </span>
                        </div>
                        <div className="text-right font-mono">
                          <span className="font-extrabold text-zinc-900">
                            {item.currency === 'EUR' ? '€' : '$'}
                            {(item.currentPrice ?? 0).toFixed(2)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedPills.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                    Selected Assets ({selectedPills.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPills.map((pill) => (
                      <span
                        key={pill.symbol}
                        className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg bg-zinc-100 border border-zinc-200 text-xs font-mono font-bold text-zinc-800"
                      >
                        <span>{pill.symbol}</span>
                        <button
                          type="button"
                          onClick={() => handleRemovePill(pill.symbol)}
                          className="p-0.5 rounded hover:bg-zinc-200 text-zinc-400 hover:text-zinc-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newWatchlistName.trim()}
                  className="rounded-xl bg-zinc-900 px-5 py-2 text-xs font-bold text-white hover:bg-zinc-800 disabled:opacity-40 flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Creating...
                    </>
                  ) : (
                    <>
                      <span>Create Watchlist</span>
                      {selectedPills.length > 0 && (
                        <span className="rounded-full bg-zinc-700 px-1.5 py-0.2 text-[10px] font-mono">
                          {selectedPills.length}
                        </span>
                      )}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Delete Watchlist</h3>
                <p className="text-xs text-zinc-500">Permanently remove this surveillance basket</p>
              </div>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Are you sure you want to delete <strong className="text-zinc-900">"{activeWatchlist?.name}"</strong>? All monitored asset rows in this list will be cleared.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteWatchlist}
                disabled={deleteWatchlistMutation.isPending}
                className="rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors flex items-center gap-1.5"
              >
                {deleteWatchlistMutation.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" /> Confirm Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE WATCHLIST VIEW */}
      {!activeWatchlist ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-12 max-w-md mx-auto text-center space-y-3 shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <Star className="h-6 w-6 fill-amber-400 text-amber-500" />
          </div>
          <h2 className="text-base font-bold text-zinc-900">Create your first watchlist</h2>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Track equities, ETFs, crypto assets, and market prices with institutional PEG ratios, TER, and market capitalization.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded-xl bg-zinc-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-zinc-800 shadow-xs transition-colors mt-2"
          >
            Create Watchlist with Inline Suggestions
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Top Control Bar: Quick Add + Delete Watchlist Action */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-zinc-900">
                      Add Assets to "{activeWatchlist.name}"
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/70 border border-rose-200/60 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                      title="Delete this watchlist"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Delete Watchlist</span>
                    </button>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Type any ticker or company name for instant valuation and price matching
                  </p>
                </div>
              </div>

              {/* Inline Search Bar */}
              <div ref={directContainerRef} className="relative w-full sm:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Type ticker (e.g. WQTM, SOL, NVDA)..."
                  value={directQuery}
                  onChange={(e) => setDirectQuery(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-9 py-2 text-xs font-semibold text-zinc-900 focus:bg-white focus:border-zinc-900 focus:outline-none"
                />
                {isDirectSearching && (
                  <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-zinc-400" />
                )}

                {isDirectDropdownOpen && filteredDirectResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-xl max-h-56 overflow-y-auto space-y-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 px-2 py-1 block">
                      Click to Add to Watchlist
                    </span>
                    {filteredDirectResults.map((item) => (
                      <button
                        key={item.symbol}
                        type="button"
                        onClick={() => handleDirectAdd(item)}
                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-zinc-50 transition-colors text-left text-xs cursor-pointer group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-mono text-zinc-900 group-hover:text-blue-600 transition-colors">
                            {item.symbol}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-zinc-100 text-zinc-600 uppercase">
                            {item.assetType || 'STOCK'}
                          </span>
                          <span className="text-[11px] text-zinc-500 truncate max-w-36">
                            {item.name}
                          </span>
                        </div>
                        <div className="text-right font-mono">
                          <span className="font-extrabold text-zinc-900">
                            {item.currency === 'EUR' ? '€' : '$'}
                            {(item.currentPrice ?? 0).toFixed(2)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Institutional Multi-Metric Watchlist Table */}
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">{activeWatchlist.name}</h3>
                  <span className="text-[10px] font-mono text-zinc-400 block">
                    Institutional Real-Time Surveillance & Fundamentals
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-zinc-500">
                  {safeItems.length} Monitored Assets
                </span>
              </div>
            </div>

            {safeItems.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Search className="h-8 w-8 text-zinc-300 mx-auto" />
                <p className="text-xs font-bold text-zinc-700">No assets in this watchlist yet</p>
                <p className="text-[11px] text-zinc-400">
                  Use the inline search bar above to type any ticker (e.g. WQTM, SOL, VUAA) and add it.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-zinc-50 text-[10px] font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-200">
                    <tr>
                      <th className="py-3 px-5">Asset / Ticker</th>
                      <th className="py-3 px-4 text-right">Live Price</th>
                      <th className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1 justify-end">
                          <span>Market Cap</span>
                          <MetricTooltip
                            title="Market Capitalization / Total AUM"
                            description="The aggregate market value of outstanding equity shares, or total assets under management for index ETFs."
                            align="right"
                          />
                        </div>
                      </th>
                      <th className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1 justify-end">
                          <span>P/E (TTM)</span>
                          <MetricTooltip
                            title="Price to Earnings Ratio (P/E TTM)"
                            description="Current price divided by trailing 12-month earnings per share. Measures the market multiple paid per unit of profit."
                            benchmarks={[
                              { label: 'P/E < 15', range: 'Value / Undervalued', status: 'good' },
                              { label: 'P/E 15 - 28', range: 'Fair Market Multiple', status: 'neutral' },
                              { label: 'P/E > 30', range: 'High Growth / Premium', status: 'bad' },
                            ]}
                            align="right"
                          />
                        </div>
                      </th>
                      <th className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1 justify-end">
                          <span>PEG Ratio</span>
                          <MetricTooltip
                            title="PEG Ratio (Price/Earnings to Growth)"
                            description="Standard institutional metric dividing P/E by forecasted earnings growth rate. A PEG below 1.0 indicates undervalued growth potential."
                            benchmarks={[
                              { label: 'PEG < 1.0', range: 'Undervalued Growth', status: 'elite' },
                              { label: 'PEG 1.0 - 2.0', range: 'Fair Valuation', status: 'good' },
                              { label: 'PEG > 2.0', range: 'Premium / Stretched', status: 'bad' },
                            ]}
                            align="right"
                          />
                        </div>
                      </th>
                      <th className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1 justify-end">
                          <span>TER (Expense)</span>
                          <MetricTooltip
                            title="Total Expense Ratio (TER)"
                            description="Annual management fee percentage charged by ETF providers (e.g. 0.07% for Vanguard VUAA, 0.35% for VanEck SMHM). Directly impacts long-term compounding."
                            benchmarks={[
                              { label: 'TER < 0.10%', range: 'Ultra-Low Cost (Core)', status: 'elite' },
                              { label: 'TER 0.10% - 0.35%', range: 'Standard Sector/Index', status: 'good' },
                              { label: 'TER > 0.50%', range: 'Active / Thematic Drag', status: 'bad' },
                            ]}
                            align="right"
                          />
                        </div>
                      </th>
                      <th className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1 justify-end">
                          <span>Beta (β)</span>
                          <MetricTooltip
                            title="Market Volatility Beta (β)"
                            description="Sensitivity of the asset relative to the benchmark index (S&P 500 = 1.00). Beta > 1.0 indicates amplified market moves."
                            align="right"
                          />
                        </div>
                      </th>
                      <th className="py-3 px-4 text-right">Div Yield</th>
                      <th className="py-3 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {safeItems.map((item) => {
                      const deep = metricsMap[item.symbol] || {}
                      const liveQuote = liveQuotes?.quotes?.[item.symbol.toUpperCase()]
                      const curPrice = liveQuote?.price || item.currentPrice || deep.current_price || deep.currentPrice || 0
                      const change24h = liveQuote?.change24h ?? deep.price_change_24h ?? deep.priceChange24h ?? null
                      const isEur = item.symbol.includes('.MI') || item.symbol.includes('.DE') || item.symbol.includes('VUAA') || item.symbol.includes('SMH') || deep.currency === 'EUR' || liveQuote?.currency === 'EUR'
                      const isEtf = deep.asset_type === 'ETF' || deep.assetType === 'ETF' || item.symbol.includes('VUAA') || item.symbol.includes('SMH') || item.symbol.includes('VWCE') || item.symbol.includes('WQTM')
                      const peg = deep.pegRatio ?? null
                      const ter = deep.expenseRatio ?? deep.expense_ratio ?? (isEtf ? deep.netExpenseRatio : null)
                      const pe = deep.peRatio ?? deep.trailingPE ?? null
                      const mcap = deep.market_cap ?? deep.marketCap ?? null
                      const beta = deep.beta ?? null
                      const div = deep.dividendYield ?? deep.dividend_yield ?? null



                      return (
                        <tr key={item.assetId} className="hover:bg-zinc-50/80 transition-colors group">
                          {/* Symbol & Name with Click to open AI Dossier */}
                          <td className="py-3 px-5">
                            <button
                              type="button"
                              onClick={() => setDossierSymbol(item.symbol)}
                              className="text-left flex items-center gap-2 group-hover:text-blue-600 transition-colors cursor-pointer"
                            >
                              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 font-mono font-bold text-xs group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                                {item.symbol.slice(0, 2)}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-extrabold text-zinc-900 group-hover:text-blue-600">
                                    {item.symbol}
                                  </span>
                                  <span className={`text-[9px] px-1 py-0.2 rounded font-mono font-bold uppercase ${
                                    isEtf ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-600'
                                  }`}>
                                    {isEtf ? 'ETF' : 'STOCK'}
                                  </span>
                                </div>
                                <span className="text-[11px] text-zinc-500 font-medium truncate max-w-44 block">
                                  {item.name}
                                </span>
                              </div>
                            </button>
                          </td>

                          {/* Live Price with 24h change */}
                          <td className="py-3 px-4 text-right font-mono">
                            <div className="font-extrabold text-zinc-900">
                              {isEur ? '€' : '$'}{curPrice.toFixed(2)}
                            </div>
                            {change24h !== null && (
                              <div className={`text-[10px] font-bold mt-0.5 ${change24h >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
                              </div>
                            )}
                          </td>

                          {/* Market Cap */}
                          <td className="py-3 px-4 text-right font-mono font-medium text-zinc-700">
                            {formatMarketCap(mcap, isEur ? 'EUR' : 'USD')}
                          </td>

                          {/* P/E TTM */}
                          <td className="py-3 px-4 text-right font-mono">
                            {pe ? (
                              <span className="font-bold text-zinc-900">{pe.toFixed(1)}x</span>
                            ) : (
                              <span className="text-zinc-400">—</span>
                            )}
                          </td>

                          {/* PEG Ratio */}
                          <td className="py-3 px-4 text-right font-mono">
                            {peg ? (
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                peg < 1.0
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : peg <= 2.0
                                  ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}>
                                {peg.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-zinc-400">—</span>
                            )}
                          </td>

                          {/* TER (Expense Ratio) */}
                          <td className="py-3 px-4 text-right font-mono">
                            {ter !== null && ter !== undefined ? (
                              <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                                {ter.toFixed(2)}%
                              </span>
                            ) : (
                              <span className="text-zinc-400 text-[10px]">N/A (Stock)</span>
                            )}
                          </td>

                          {/* Beta */}
                          <td className="py-3 px-4 text-right font-mono font-medium text-zinc-700">
                            {beta ? beta.toFixed(2) : '1.00'}
                          </td>

                          {/* Dividend Yield */}
                          <td className="py-3 px-4 text-right font-mono font-medium text-zinc-700">
                            {div ? `${div.toFixed(2)}%` : '0.00%'}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-5 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => setDossierSymbol(item.symbol)}
                              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 px-2 py-1 text-[11px] font-bold text-zinc-700 transition-colors cursor-pointer"
                              title="Inspect AI Dossier"
                            >
                              <Sparkles className="h-3 w-3 text-indigo-500" />
                              <span>Dossier</span>
                            </button>
                            <button
                              type="button"
                              aria-label="Remove from watchlist"
                              onClick={() =>
                                removeItem.mutate({ watchlistId: activeWatchlist.id, assetId: item.assetId })
                              }
                              className="inline-flex items-center gap-1 rounded-lg bg-rose-50 border border-rose-200/60 px-2 py-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 transition-colors cursor-pointer"
                              title="Remove from watchlist"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Dossier Modal Triggered on Asset Click */}
      {dossierSymbol && (
        <CommandPalette
          isOpen={!!dossierSymbol}
          onClose={() => setDossierSymbol(null)}
          initialSymbol={dossierSymbol}
        />
      )}
    </div>
  )
}
