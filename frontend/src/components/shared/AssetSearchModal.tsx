import { useState } from 'react'
import { Search, TrendingUp, TrendingDown, ArrowUpRight, Plus, Eye, Check } from 'lucide-react'
import { Modal } from './Modal'
import { useCurrencyStore } from '@/stores/currencyStore'

interface DeepQuote {
  symbol: string
  name: string
  asset_type: string
  current_price: number
  price_change_24h: number
  all_time_high: number
  distance_from_ath_pct: number
  fifty_two_week_high: number
  fifty_two_week_low: number
  market_cap: number
  sector: string
  currency: string
}

interface AssetSearchModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectForBuy?: (symbol: string, currentPrice: number) => void
  onAddToWatchlist?: (symbol: string) => void
}

const POPULAR_TICKERS = ['AAPL', 'NVDA', 'MSFT', 'TSLA', 'META', 'BTC', 'ETH', 'SOL', 'SPY', 'QQQ']

export function AssetSearchModal({
  isOpen,
  onClose,
  onSelectForBuy,
  onAddToWatchlist,
}: AssetSearchModalProps) {
  const { formatMoney } = useCurrencyStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [quote, setQuote] = useState<DeepQuote | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addedToWatchlist, setAddedToWatchlist] = useState(false)

  const handleSearch = async (symbolToFetch?: string) => {
    const sym = (symbolToFetch || searchTerm).trim().toUpperCase()
    if (!sym) return

    setIsLoading(true)
    setError(null)
    setQuote(null)
    setAddedToWatchlist(false)

    try {
      const res = await fetch(`/api/assets/quote/${encodeURIComponent(sym)}`)
      if (!res.ok) throw new Error('Asset not found')
      const json = await res.json()
      if (json?.data) {
        const d = json.data
        const curPrice = d.current_price ?? d.currentPrice ?? d.price ?? 0
        const chg24 = d.price_change_24h ?? d.priceChange24h ?? d.changePercent ?? d.change ?? 0
        const ath = d.all_time_high ?? d.allTimeHigh ?? curPrice
        const ftwHigh = d.fifty_two_week_high ?? d.fiftyTwoWeekHigh ?? curPrice
        const ftwLow = d.fifty_two_week_low ?? d.fiftyTwoWeekLow ?? (curPrice * 0.7)
        const distAth = d.distance_from_ath_pct ?? d.distanceFromAthPct ?? (ath > 0 ? ((curPrice - ath) / ath * 100) : 0)

        setQuote({
          symbol: d.symbol || sym,
          name: d.name || sym,
          asset_type: d.asset_type || d.assetType || 'STOCK',
          current_price: curPrice,
          price_change_24h: chg24,
          all_time_high: ath,
          distance_from_ath_pct: distAth,
          fifty_two_week_high: ftwHigh,
          fifty_two_week_low: ftwLow,
          market_cap: d.market_cap ?? d.marketCap ?? 0,
          sector: d.sector || 'General',
          currency: d.currency || 'USD',
        })
      }
    } catch {
      setError(`Could not fetch live market quote for "${sym}". Please verify ticker symbol.`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearch()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Live Market Asset Discovery"
      subtitle="Search any global stock, ETF, or cryptocurrency for live pricing & ATH analytics"
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Search Input Bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search ticker (e.g. NVDA, TSLA, BTC, META, SPY)..."
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 py-2.5 text-sm font-semibold text-zinc-900 uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300"
              autoFocus
            />
          </div>
          <button
            type="button"
            onClick={() => handleSearch()}
            disabled={isLoading || !searchTerm.trim()}
            className="rounded-xl bg-zinc-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Popular Ticker Quick Chips */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
            Quick Discovery
          </span>
          <div className="flex flex-wrap gap-1.5">
            {POPULAR_TICKERS.map((sym) => (
              <button
                key={sym}
                onClick={() => {
                  setSearchTerm(sym)
                  handleSearch(sym)
                }}
                className="rounded-lg border border-zinc-200 bg-zinc-50/80 px-2.5 py-1 text-xs font-mono font-semibold text-zinc-700 hover:border-zinc-300 hover:bg-white transition-all"
              >
                {sym}
              </button>
            ))}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 text-xs font-medium text-rose-700">
            {error}
          </div>
        )}

        {/* Deep Analytics Card Result */}
        {quote && (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-5 space-y-4">
            {/* Header / Price Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200/80 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-zinc-900 px-2.5 py-0.5 text-xs font-bold text-white font-mono">
                    {quote.symbol}
                  </span>
                  <span className="rounded bg-zinc-200 px-2 py-0.5 text-[10px] font-bold uppercase text-zinc-700">
                    {quote.asset_type}
                  </span>
                </div>
                <h3 className="mt-1 text-sm font-semibold text-zinc-900">{quote.name}</h3>
                <p className="text-[11px] text-zinc-500">{quote.sector}</p>
              </div>

              <div className="text-right">
                <div className="text-2xl font-extrabold font-mono text-zinc-900">
                  {formatMoney(quote.current_price, quote.currency)}
                </div>
                <div
                  className={`flex items-center justify-end gap-1 text-xs font-bold font-mono ${
                    quote.price_change_24h >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {quote.price_change_24h >= 0 ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5" />
                  )}
                  {(quote.price_change_24h ?? 0) >= 0 ? '+' : ''}
                  {(quote.price_change_24h ?? 0).toFixed(2)}% (24h)
                </div>
              </div>
            </div>

            {/* Deep ATH & 52-Week Range Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* All-Time High */}
              <div className="rounded-xl border border-zinc-200 bg-white p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                  All-Time High (ATH)
                </span>
                <p className="mt-1 text-sm font-bold font-mono text-zinc-900">
                  {formatMoney(quote.all_time_high ?? 0, quote.currency)}
                </p>
              </div>

              {/* Distance from ATH */}
              <div className="rounded-xl border border-zinc-200 bg-white p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                  From ATH
                </span>
                <p
                  className={`mt-1 text-sm font-extrabold font-mono ${
                    (quote.distance_from_ath_pct ?? 0) <= -20 ? 'text-rose-600' : 'text-zinc-800'
                  }`}
                >
                  {(quote.distance_from_ath_pct ?? 0).toFixed(2)}%
                </p>
              </div>

              {/* 52-Week High */}
              <div className="rounded-xl border border-zinc-200 bg-white p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                  52W High
                </span>
                <p className="mt-1 text-sm font-bold font-mono text-zinc-900">
                  {formatMoney(quote.fifty_two_week_high ?? 0, quote.currency)}
                </p>
              </div>

              {/* 52-Week Low */}
              <div className="rounded-xl border border-zinc-200 bg-white p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                  52W Low
                </span>
                <p className="mt-1 text-sm font-bold font-mono text-zinc-900">
                  {formatMoney(quote.fifty_two_week_low ?? 0, quote.currency)}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-200/60">
              {onAddToWatchlist && (
                <button
                  type="button"
                  onClick={() => {
                    onAddToWatchlist(quote.symbol)
                    setAddedToWatchlist(true)
                  }}
                  disabled={addedToWatchlist}
                  className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50"
                >
                  {addedToWatchlist ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      In Watchlist
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5 text-blue-600" />
                      + Add to Watchlist
                    </>
                  )}
                </button>
              )}

              {onSelectForBuy && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectForBuy(quote.symbol, quote.current_price)
                    onClose()
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-zinc-800 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Buy into Portfolio
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
