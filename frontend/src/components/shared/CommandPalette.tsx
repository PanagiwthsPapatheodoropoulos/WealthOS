import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  Search,
  TrendingUp,
  TrendingDown,
  Plus,
  X,
  Sparkles,
  Loader2,
  Calendar,
  Newspaper,
  ShieldCheck,
  BarChart2,
  Target,
  Award,
  FileText,
  Activity,
  Layers,
  ArrowUpRight,
  Check,
  Zap,
  PieChart,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useCurrencyStore } from '@/stores/currencyStore'
import { usePortfolios } from '@/api/portfolioApi'
import { useBuyAsset } from '@/api/transactionApi'
import { useQueryClient } from '@tanstack/react-query'
import { useFilingSummary } from '@/api/filingApi'
import { useBatchQuotes } from '@/api/assetApi'
import { MetricTooltip } from '@/components/shared/MetricTooltip'
import type {
  AssetNewsItem,
  UpcomingCatalysts,
  ValuationModels,
  ExpectedReturnsAndRisk,
} from '@/api/aiApi'

interface LiveSearchResult {
  symbol: string
  name: string
  assetType: string
  sector: string
  currency: string
  currentPrice: number
  priceChange24h: number
}

interface SelectedAssetDetails {
  symbol: string
  name: string
  currency: string
  current_price: number
  price_change_24h: number
  all_time_high: number
  fifty_two_week_high: number
  fifty_two_week_low: number
  distance_from_ath_pct: number
  market_cap: number
  peRatio?: number | null
  forwardPe?: number | null
  pegRatio?: number | null
  expenseRatio?: number | null
  dividendYield?: number | null
  beta?: number | null
  sector: string
  asset_type: string
}

function formatCap(cap?: number, currency: string = 'USD'): string {
  if (!cap || cap <= 0) return '—'
  const prefix = currency === 'EUR' ? '€' : '$'
  if (cap >= 1e12) return `${prefix}${(cap / 1e12).toFixed(2)}T`
  if (cap >= 1e9) return `${prefix}${(cap / 1e9).toFixed(2)}B`
  if (cap >= 1e6) return `${prefix}${(cap / 1e6).toFixed(2)}M`
  return `${prefix}${cap.toLocaleString()}`
}

interface ChartPoint {
  t: string
  price: number
}

interface ChartDataResponse {
  symbol: string
  timeframe: string
  currency: string
  currentPrice: number
  startPrice: number
  periodReturnPct: number
  points: ChartPoint[]
}

const TIMEFRAMES = ['1D', '1W', '1M', '3M', '1Y', 'YTD', 'ALL']

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  initialSymbol?: string
}

export function CommandPalette({ isOpen, onClose, initialSymbol }: CommandPaletteProps) {
  const queryClient = useQueryClient()
  const { currentCurrency, formatMoney } = useCurrencyStore()
  const { data: portfolios } = usePortfolios()
  const activePortfolio = portfolios?.[0]
  const buyAsset = useBuyAsset()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<LiveSearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<SelectedAssetDetails | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [dossierTab, setDossierTab] = useState<'overview' | 'valuation' | 'risk' | 'breakdown'>('overview')

  const RECOMMENDED_SYMBOLS = useMemo(() => ['VUAA.MI', 'SMHM', 'NVDA', 'AAPL', 'BTC', 'MSFT'], [])
  const { data: batchQuotes } = useBatchQuotes(RECOMMENDED_SYMBOLS)

  // Chart state
  const [selectedTimeframe, setSelectedTimeframe] = useState('1M')
  const [chartData, setChartData] = useState<ChartDataResponse | null>(null)
  const [isChartLoading, setIsChartLoading] = useState(false)
  const [hoveredPoint, setHoveredPoint] = useState<ChartPoint | null>(null)

  // Intelligence data state
  const [newsList, setNewsList] = useState<AssetNewsItem[]>([])
  const [showAllNews, setShowAllNews] = useState<boolean>(false)
  const [catalystsData, setCatalystsData] = useState<UpcomingCatalysts | null>(null)
  const [valuationData, setValuationData] = useState<ValuationModels | null>(null)
  const [returnsData, setReturnsData] = useState<ExpectedReturnsAndRisk | null>(null)
  const [isIntelLoading, setIsIntelLoading] = useState(false)

  // SEC Filings Hook
  const { data: filingsData, isLoading: loadingFilings } = useFilingSummary(selectedAsset?.symbol)

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 60)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
      setQuery('')
      setResults([])
      setSelectedAsset(null)
      setChartData(null)
      setNewsList([])
      setCatalystsData(null)
      setValuationData(null)
      setReturnsData(null)
      setHoveredPoint(null)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && initialSymbol) {
      handleSelectSymbol(initialSymbol)
    }
  }, [isOpen, initialSymbol])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // When user types in search box, clear selected asset so recommendations are displayed
  const handleQueryChange = (val: string) => {
    setQuery(val)
    if (selectedAsset && val.trim().length > 0) {
      setSelectedAsset(null)
    }
  }

  // Live Asset Search Query Debounced
  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/assets/search?q=${encodeURIComponent(q)}`)
        if (res.ok) {
          const json = await res.json()
          setResults(Array.isArray(json.data) ? json.data : [])
        }
      } catch {
        // Fallback
      } finally {
        setIsLoading(false)
      }
    }, 180)

    return () => clearTimeout(timer)
  }, [query])

  // Fetch Chart Points when asset or timeframe changes
  useEffect(() => {
    if (!selectedAsset) {
      setChartData(null)
      return
    }

    let isMounted = true
    setIsChartLoading(true)
    setHoveredPoint(null)
    fetch(`/api/assets/chart/${encodeURIComponent(selectedAsset.symbol)}?range=${selectedTimeframe}`)
      .then((r) => r.json())
      .then((json) => {
        if (isMounted && json?.data) {
          const raw = json.data
          if (Array.isArray(raw.points)) {
            setChartData(raw)
          } else if (raw.points && Array.isArray(raw.points.points)) {
            setChartData({
              symbol: raw.symbol || selectedAsset.symbol,
              timeframe: raw.points.timeframe || selectedTimeframe,
              currency: raw.points.currency || 'USD',
              currentPrice: raw.points.currentPrice,
              startPrice: raw.points.startPrice,
              periodReturnPct: raw.points.periodReturnPct,
              points: raw.points.points,
            })
          } else {
            setChartData(null)
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsChartLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [selectedAsset, selectedTimeframe])

  // Fetch Deep Intelligence (News, Catalysts, Valuation, Expected Returns)
  useEffect(() => {
    if (!selectedAsset) return

    let isMounted = true
    setIsIntelLoading(true)
    fetch(`/api/assets/intelligence/${encodeURIComponent(selectedAsset.symbol)}`)
      .then((r) => r.json())
      .then((json) => {
        if (isMounted && json?.data) {
          setNewsList(json.data.news || [])
          setCatalystsData(json.data.catalysts || null)
          setValuationData(json.data.valuation || null)
          setReturnsData(json.data.riskAndExpectedReturns || null)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsIntelLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [selectedAsset])

  const handleSelectSymbol = async (sym: string) => {
    setIsDetailLoading(true)
    setSelectedTimeframe('1M')
    setHoveredPoint(null)
    try {
      const res = await fetch(`/api/assets/quote/${encodeURIComponent(sym)}`)
      if (res.ok) {
        const json = await res.json()
        if (json?.data) {
          const d = json.data
          const curPrice = d.current_price ?? d.currentPrice ?? d.price ?? 0
          const chg24 = d.price_change_24h ?? d.priceChange24h ?? d.changePercent ?? d.change ?? 0
          const ath = d.all_time_high ?? d.allTimeHigh ?? curPrice
          const ftwHigh = d.fifty_two_week_high ?? d.fiftyTwoWeekHigh ?? curPrice
          const ftwLow = d.fifty_two_week_low ?? d.fiftyTwoWeekLow ?? (curPrice * 0.7)
          const distAth = d.distance_from_ath_pct ?? d.distanceFromAthPct ?? (ath > 0 ? ((curPrice - ath) / ath * 100) : 0)

          const isEurAsset = sym.toUpperCase().includes('VUAA') || sym.toUpperCase().includes('VWCE') || sym.toUpperCase().includes('SMH') || d.currency === 'EUR'

          setSelectedAsset({
            symbol: sym.toUpperCase(),
            name: d.name || sym.toUpperCase(),
            currency: d.currency || (isEurAsset ? 'EUR' : 'USD'),
            current_price: curPrice,
            price_change_24h: chg24,
            all_time_high: ath,
            fifty_two_week_high: ftwHigh,
            fifty_two_week_low: ftwLow,
            distance_from_ath_pct: distAth,
            market_cap: d.market_cap ?? d.marketCap ?? 0,
            peRatio: d.peRatio ?? d.trailingPE ?? null,
            forwardPe: d.forwardPe ?? d.forwardPE ?? null,
            pegRatio: d.pegRatio ?? d.peg ?? null,
            expenseRatio: d.expenseRatio ?? d.expense_ratio ?? d.netExpenseRatio ?? null,
            dividendYield: d.dividendYield ?? d.dividend_yield ?? null,
            beta: d.beta ?? null,
            sector: d.sector || 'Global Markets',
            asset_type: d.asset_type || d.assetType || (sym.includes('.MI') || sym.includes('.DE') ? 'ETF' : 'STOCK'),
          })
          setQuery('')
        }
      }
    } catch {
      // Fallback
    } finally {
      setIsDetailLoading(false)
    }
  }

  // Chart calculations with smooth curve generation
  const points = chartData?.points || []
  const prices = points.map((p) => p.price)
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 100
  const priceRange = maxPrice > minPrice ? maxPrice - minPrice : 1
  const isPositivePeriod = (chartData?.periodReturnPct ?? 0) >= 0

  // 52-Week Range position percentage
  const fiftyTwoWeekPct = useMemo(() => {
    if (!selectedAsset) return 50
    const low = selectedAsset.fifty_two_week_low
    const high = selectedAsset.fifty_two_week_high
    const cur = selectedAsset.current_price
    if (high <= low) return 50
    const pct = ((cur - low) / (high - low)) * 100
    return Math.max(0, Math.min(100, pct))
  }, [selectedAsset])

  // Generate smooth SVG path (Called unconditionally at top level)
  const svgPathData = useMemo(() => {
    if (points.length < 2) return ''
    const coords = points.map((p, i) => {
      const x = (i / (points.length - 1)) * 500
      const y = 88 - ((p.price - minPrice) / priceRange) * 72
      return [x, y]
    })

    let d = `M ${coords[0][0]},${coords[0][1]}`
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i === 0 ? i : i - 1]
      const p1 = coords[i]
      const p2 = coords[i + 1]
      const p3 = coords[i + 2] || p2

      const cp1x = p1[0] + (p2[0] - p0[0]) / 6
      const cp1y = p1[1] + (p2[1] - p0[1]) / 6
      const cp2x = p2[0] - (p3[0] - p1[0]) / 6
      const cp2y = p2[1] - (p3[1] - p1[1]) / 6

      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`
    }
    return d
  }, [points, minPrice, priceRange])

  const [hoveredIndex, setHoveredIndex] = useState<number>(-1)
  const animFrameRef = useRef<number | null>(null)

  // Fast throttled mousemove on SVG canvas with zero DOM layout thrashing
  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!points || points.length < 2) return
    const rect = e.currentTarget.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const pct = Math.max(0, Math.min(1, mouseX / rect.width))
    const idx = Math.round(pct * (points.length - 1))

    if (idx !== hoveredIndex) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = requestAnimationFrame(() => {
        setHoveredIndex(idx)
        setHoveredPoint(points[idx])
      })
    }
  }

  // Hover metrics
  const activeHoverPrice = hoveredPoint ? hoveredPoint.price : (selectedAsset?.current_price ?? 0)
  const startPeriodPrice = points.length > 0 ? points[0].price : activeHoverPrice
  const hoverPeriodReturn = startPeriodPrice > 0 ? ((activeHoverPrice - startPeriodPrice) / startPeriodPrice) * 100 : 0
  const hoverPriceDelta = activeHoverPrice - startPeriodPrice
  const assetATH = selectedAsset?.all_time_high || activeHoverPrice
  const hoverDistFromATH = assetATH > 0 ? ((activeHoverPrice - assetATH) / assetATH) * 100 : 0

  const hoveredCx = hoveredIndex >= 0 ? (hoveredIndex / (points.length - 1)) * 500 : 0
  const hoveredCy = hoveredIndex >= 0 && hoveredPoint ? 88 - ((hoveredPoint.price - minPrice) / priceRange) * 72 : 0

  const isUcitsAsset = selectedAsset && (selectedAsset.symbol.includes('VUAA') || selectedAsset.symbol.includes('VWCE') || selectedAsset.symbol.includes('SXR8') || (selectedAsset.asset_type === 'ETF'))

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-zinc-950/70 overflow-y-auto cursor-pointer"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="relative w-full max-w-4xl rounded-2xl border border-zinc-200/90 bg-white shadow-xl overflow-hidden flex flex-col max-h-[92vh] cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Bar Input */}
        <div className="flex items-center gap-3 border-b border-zinc-200 px-4 py-3 bg-zinc-50/70">
          <Search className="h-4 w-4 text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search 10,000+ assets (e.g. BTC, VUAA, NVDA, AAPL, ETH)..."
            className="w-full bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none font-medium"
          />
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-zinc-400 shrink-0" />}
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-xs text-zinc-400 hover:text-zinc-600 font-semibold"
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body: Search Results OR Unified 360° AI Dossier */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {!selectedAsset || query.trim().length > 0 ? (
            /* Search Results List */
            results.length > 0 ? (
              <div className="divide-y divide-zinc-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-3 py-1.5 block">
                  Search Results ({results.length})
                </span>
                {results.map((item) => (
                  <button
                    key={item.symbol}
                    type="button"
                    onClick={() => handleSelectSymbol(item.symbol)}
                    className="flex w-full items-center justify-between p-3 text-left hover:bg-zinc-50 rounded-xl transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 font-mono font-bold text-xs text-zinc-900 group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                        {item.symbol.slice(0, 3)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-zinc-900 font-mono">{item.symbol}</span>
                          <span className="text-[10px] font-bold rounded bg-zinc-100 px-1.5 py-0.5 text-zinc-600">
                            {item.assetType}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 line-clamp-1">{item.name}</p>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <span className="font-bold text-sm text-zinc-900">
                        {formatMoney(item.currentPrice, item.currency || 'USD')}
                      </span>
                      <div className={`flex items-center justify-end gap-0.5 text-xs font-bold ${
                        item.priceChange24h >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {item.priceChange24h >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        <span>{item.priceChange24h >= 0 ? '+' : ''}{item.priceChange24h.toFixed(2)}%</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-3 py-1 block">
                  Recommended Institutional Assets
                </span>
                <div className="divide-y divide-zinc-100">
                  {[
                    { symbol: 'VUAA.MI', name: 'Vanguard S&P 500 UCITS ETF (EUR)', assetType: 'ETF', currentPrice: 128.01, currency: 'EUR', priceChange24h: 0.13 },
                    { symbol: 'SMHM', name: 'VanEck Semiconductor UCITS ETF (EUR)', assetType: 'ETF', currentPrice: 86.42, currency: 'EUR', priceChange24h: -0.85 },
                    { symbol: 'NVDA', name: 'NVIDIA Corporation', assetType: 'STOCK', currentPrice: 226.57, currency: 'USD', priceChange24h: 2.14 },
                    { symbol: 'AAPL', name: 'Apple Inc.', assetType: 'STOCK', currentPrice: 328.46, currency: 'USD', priceChange24h: 0.52 },
                    { symbol: 'BTC', name: 'Bitcoin', assetType: 'CRYPTO', currentPrice: 110850.0, currency: 'USD', priceChange24h: 1.84 },
                    { symbol: 'MSFT', name: 'Microsoft Corporation', assetType: 'STOCK', currentPrice: 508.25, currency: 'USD', priceChange24h: 0.78 },
                  ].map((item) => {
                    const liveQ = batchQuotes?.quotes?.[item.symbol]
                    const price = liveQ?.price && liveQ.price > 0 ? liveQ.price : item.currentPrice
                    const chg24 = liveQ?.change24h != null ? liveQ.change24h : item.priceChange24h
                    const isPos = chg24 >= 0

                    return (
                      <button
                        key={item.symbol}
                        type="button"
                        onClick={() => handleSelectSymbol(item.symbol)}
                        className="flex w-full items-center justify-between p-3 text-left hover:bg-zinc-50 rounded-xl transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 font-mono font-bold text-xs text-zinc-900 group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                            {item.symbol.slice(0, 3)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-sm text-zinc-900 font-mono">{item.symbol}</span>
                              <span className="text-[10px] font-bold rounded bg-zinc-100 px-1.5 py-0.5 text-zinc-600">
                                {item.assetType}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-500 line-clamp-1">{item.name}</p>
                          </div>
                        </div>
                        <div className="text-right font-mono">
                          <span className="font-bold text-sm text-zinc-900">
                            {formatMoney(price, item.currency)}
                          </span>
                          <div className={`flex items-center justify-end gap-0.5 text-xs font-bold ${
                            isPos ? 'text-emerald-600' : 'text-rose-600'
                          }`}>
                            {isPos ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            <span>{isPos ? '+' : ''}{chg24.toFixed(2)}%</span>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          ) : (
            /* UNIFIED 360° INSTITUTIONAL ASSET DOSSIER (ALL-IN-ONE SINGLE VIEW) */
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Asset Header Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedAsset(null)
                        setQuery('')
                        inputRef.current?.focus()
                      }}
                      className="text-xs font-semibold text-zinc-400 hover:text-zinc-900 transition-colors"
                    >
                      &larr; Search
                    </button>
                    <span className="font-black font-mono text-xl text-zinc-900">{selectedAsset.symbol}</span>
                    <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-700">
                      {selectedAsset.asset_type}
                    </span>
                    {isUcitsAsset ? (
                      <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 font-mono">
                        0% GREEK TAX EXEMPT (UCITS)
                      </span>
                    ) : (
                      <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-600 font-mono">
                        15% WHT DTT
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">{selectedAsset.name} &bull; {selectedAsset.sector}</p>
                </div>

                <div className="text-right font-mono">
                  <div className="text-2xl font-black text-zinc-900">
                    {formatMoney(selectedAsset.current_price, selectedAsset.currency)}
                  </div>
                  <div className={`flex items-center justify-end gap-1 text-xs font-bold ${
                    selectedAsset.price_change_24h >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {selectedAsset.price_change_24h >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                    <span>{selectedAsset.price_change_24h >= 0 ? '+' : ''}{selectedAsset.price_change_24h.toFixed(2)}% (24h)</span>
                  </div>
                </div>
              </div>

              {/* Institutional Dossier Navigation Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 border-b border-zinc-200 bg-zinc-100/80 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setDossierTab('overview')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    dossierTab === 'overview'
                      ? 'bg-white text-zinc-900 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  <BarChart2 className="h-3.5 w-3.5" />
                  Overview & Chart
                </button>
                <button
                  type="button"
                  onClick={() => setDossierTab('valuation')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    dossierTab === 'valuation'
                      ? 'bg-white text-zinc-900 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  <Award className="h-3.5 w-3.5" />
                  DCF Valuation & Moat
                </button>
                <button
                  type="button"
                  onClick={() => setDossierTab('risk')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    dossierTab === 'risk'
                      ? 'bg-white text-zinc-900 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  <Target className="h-3.5 w-3.5" />
                  CAPM Risk & Returns
                </button>
                <button
                  type="button"
                  onClick={() => setDossierTab('breakdown')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    dossierTab === 'breakdown'
                      ? 'bg-white text-zinc-900 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  {isUcitsAsset ? 'ETF Holdings' : '10-K Filings'} & News ({newsList.length})
                </button>
              </div>

              {/* 1. OVERVIEW & CHART TAB */}
              {dossierTab === 'overview' && (
                <div className="space-y-4">
                  {/* POLISHED CHART & REFINED HOVER SCRUBBER CARD */}
                  <div className="rounded-2xl border border-zinc-200/90 bg-slate-50/50 p-4 space-y-3">
                    {/* Refined Cohesive Hover Header Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200/70 pb-2.5 font-mono text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-500 font-sans font-medium">
                          {hoveredPoint ? hoveredPoint.t : `${selectedTimeframe} Performance`}:
                        </span>
                        <span className="text-sm font-extrabold text-zinc-900">
                          {formatMoney(activeHoverPrice, selectedAsset.currency)}
                        </span>
                        <span className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
                          hoverPeriodReturn >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {hoverPeriodReturn >= 0 ? '+' : ''}{hoverPeriodReturn.toFixed(2)}%
                        </span>
                        <span className="text-[11px] text-zinc-500">
                          ({hoverPriceDelta >= 0 ? '+' : ''}{formatMoney(hoverPriceDelta, selectedAsset.currency)})
                        </span>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-zinc-400">ATH Distance:</span>
                          <span className={`font-bold text-[11px] px-1.5 py-0.5 rounded ${
                            hoverDistFromATH >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                          }`}>
                            {hoverDistFromATH.toFixed(2)}% from ATH ({formatMoney(assetATH, selectedAsset.currency)})
                          </span>
                        </div>

                        {/* Timeframe selector */}
                        <div className="flex items-center rounded-lg bg-zinc-200/70 p-0.5 text-[10px] font-bold">
                          {TIMEFRAMES.map((tf) => (
                            <button
                              key={tf}
                              type="button"
                              onClick={() => setSelectedTimeframe(tf)}
                              className={`rounded-md px-2 py-0.5 transition-all ${
                                selectedTimeframe === tf ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-900'
                              }`}
                            >
                              {tf}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Smooth Bezier SVG Chart Canvas */}
                    <div className="h-44 w-full relative">
                      {isChartLoading ? (
                        <div className="h-full flex items-center justify-center text-xs text-zinc-400 gap-1.5">
                          <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
                          <span>Loading {selectedTimeframe} chart...</span>
                        </div>
                      ) : points.length > 1 ? (
                        <svg
                          viewBox="0 0 500 100"
                          className="h-full w-full overflow-visible cursor-crosshair"
                          preserveAspectRatio="none"
                          onMouseMove={handleSvgMouseMove}
                          onMouseLeave={() => setHoveredPoint(null)}
                        >
                          <defs>
                            <linearGradient id="chartGradientSmooth" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={isPositivePeriod ? '#10b981' : '#f43f5e'} stopOpacity="0.22" />
                              <stop offset="100%" stopColor={isPositivePeriod ? '#10b981' : '#f43f5e'} stopOpacity="0.0" />
                            </linearGradient>
                          </defs>

                          {/* Gradient Fill Area */}
                          <path
                            d={`${svgPathData} L 500,100 L 0,100 Z`}
                            fill="url(#chartGradientSmooth)"
                          />

                          {/* Smooth Foreground Path Line */}
                          <path
                            d={svgPathData}
                            fill="none"
                            stroke={isPositivePeriod ? '#10b981' : '#f43f5e'}
                            strokeWidth="2.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          {/* Polished Dotted Crosshair Guide */}
                          {hoveredPoint && (
                            <line
                              x1={hoveredCx}
                              y1="0"
                              x2={hoveredCx}
                              y2="100"
                              stroke="#10b981"
                              strokeWidth="1.2"
                              strokeDasharray="3 3"
                              opacity="0.75"
                            />
                          )}

                          {/* Polished Hover Marker Dot with Glowing Rings */}
                          {hoveredPoint && (
                            <g>
                              <circle cx={hoveredCx} cy={hoveredCy} r="10" className="fill-emerald-500/20" />
                              <circle cx={hoveredCx} cy={hoveredCy} r="6" className="fill-emerald-500/40" />
                              <circle cx={hoveredCx} cy={hoveredCy} r="3.5" className="fill-emerald-600 stroke-2 stroke-white shadow-lg" />
                            </g>
                          )}
                        </svg>
                      ) : (
                        <div className="h-full flex items-center justify-center text-xs text-zinc-400">
                          Live chart points active
                        </div>
                      )}
                    </div>

                    {/* High / Low footer */}
                    {points.length > 1 && (
                      <div className="flex justify-between border-t border-zinc-200/60 pt-1.5 text-[10px] font-mono text-zinc-400">
                        <span>{points[0].t}</span>
                        <span>Low: {formatMoney(minPrice, selectedAsset.currency)}</span>
                        <span>High: {formatMoney(maxPrice, selectedAsset.currency)}</span>
                        <span>{points[points.length - 1].t}</span>
                      </div>
                    )}
                  </div>

                  {/* 52-WEEK RANGE VISUAL SLIDER BAR */}
                  <div className="rounded-xl border border-zinc-200 bg-white p-3.5 shadow-xs space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] uppercase font-bold text-zinc-400">52-Week Price Channel</span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                          {fiftyTwoWeekPct.toFixed(0)}% of Range
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-400 font-mono">
                        {selectedAsset.distance_from_ath_pct.toFixed(1)}% from ATH
                      </span>
                    </div>
                    <div className="relative h-2 rounded-full bg-gradient-to-r from-rose-200 via-amber-200 to-emerald-300">
                      <div
                        style={{ left: `${Math.max(2, Math.min(98, fiftyTwoWeekPct))}%` }}
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full bg-zinc-900 border-2 border-white shadow-sm transition-all duration-300"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
                      <span>52W Low: {formatMoney(selectedAsset.fifty_two_week_low, selectedAsset.currency)}</span>
                      <span className="font-bold text-zinc-900">Current: {formatMoney(selectedAsset.current_price, selectedAsset.currency)}</span>
                      <span>52W High: {formatMoney(selectedAsset.fifty_two_week_high, selectedAsset.currency)}</span>
                    </div>
                  </div>

                  {/* 2. KEY METRICS & FUNDAMENTALS GRID */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Market Cap / AUM</span>
                        <MetricTooltip
                          title="Market Capitalization / Total AUM"
                          description="The aggregate market value of outstanding equity shares, or total assets under management for index ETFs."
                          align="right"
                        />
                      </div>
                      <p className="mt-1 text-sm font-bold font-mono text-zinc-900">
                        {formatCap(selectedAsset.market_cap, selectedAsset.currency)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">P/E (TTM)</span>
                        <MetricTooltip
                          title="Price to Earnings (P/E TTM)"
                          description="Current share price divided by trailing 12-month earnings per share."
                          benchmarks={[
                            { label: 'P/E < 15', range: 'Value / Undervalued', status: 'good' },
                            { label: 'P/E 15 - 28', range: 'Fair Multiple', status: 'neutral' },
                            { label: 'P/E > 30', range: 'High Growth Premium', status: 'bad' },
                          ]}
                          align="right"
                        />
                      </div>
                      <p className="mt-1 text-sm font-bold font-mono text-zinc-900">
                        {selectedAsset.peRatio ? `${selectedAsset.peRatio.toFixed(1)}x` : '—'}
                        {selectedAsset.forwardPe && (
                          <span className="text-[10px] text-zinc-400 font-normal ml-1">(Fwd: {selectedAsset.forwardPe.toFixed(1)}x)</span>
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">PEG Ratio</span>
                        <MetricTooltip
                          title="PEG Ratio (Price/Earnings-to-Growth)"
                          description="P/E divided by forecasted annual earnings growth. A PEG under 1.0 indicates undervalued growth potential."
                          benchmarks={[
                            { label: 'PEG < 1.0', range: 'Undervalued Growth', status: 'elite' },
                            { label: 'PEG 1.0 - 2.0', range: 'Fair Valuation', status: 'good' },
                            { label: 'PEG > 2.0', range: 'Premium / Stretched', status: 'bad' },
                          ]}
                          align="right"
                        />
                      </div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="text-sm font-bold font-mono text-zinc-900">
                          {selectedAsset.pegRatio ? selectedAsset.pegRatio.toFixed(2) : '—'}
                        </span>
                        {selectedAsset.pegRatio && (
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                            selectedAsset.pegRatio < 1.0
                              ? 'bg-emerald-50 text-emerald-700'
                              : selectedAsset.pegRatio <= 2.0
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}>
                            {selectedAsset.pegRatio < 1.0 ? 'Undervalued' : selectedAsset.pegRatio <= 2.0 ? 'Fair' : 'Premium'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">TER (Expense Ratio)</span>
                        <MetricTooltip
                          title="Total Expense Ratio (TER)"
                          description="Annual percentage fee deducted by fund managers to operate index funds and ETFs."
                          benchmarks={[
                            { label: 'TER < 0.10%', range: 'Ultra-Low Cost (Core)', status: 'elite' },
                            { label: 'TER 0.10% - 0.35%', range: 'Standard Sector/UCITS', status: 'good' },
                            { label: 'TER > 0.50%', range: 'Active / Thematic Drag', status: 'bad' },
                          ]}
                          align="right"
                        />
                      </div>
                      <p className="mt-1 text-sm font-bold font-mono text-emerald-700">
                        {selectedAsset.expenseRatio !== null && selectedAsset.expenseRatio !== undefined
                          ? `${selectedAsset.expenseRatio.toFixed(2)}% / yr`
                          : '0.00% (Stock)'}
                      </p>
                    </div>

                    <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">All-Time High</span>
                      <p className="mt-1 text-sm font-bold font-mono text-zinc-900">
                        {formatMoney(selectedAsset.all_time_high, selectedAsset.currency)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">From ATH %</span>
                      <p className={`mt-1 text-sm font-extrabold font-mono ${selectedAsset.distance_from_ath_pct < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {selectedAsset.distance_from_ath_pct.toFixed(2)}%
                      </p>
                    </div>

                    <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">52-Week Range</span>
                      <p className="mt-1 text-xs font-bold font-mono text-zinc-800">
                        {formatMoney(selectedAsset.fifty_two_week_low, selectedAsset.currency)} - {formatMoney(selectedAsset.fifty_two_week_high, selectedAsset.currency)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Tax Jurisdiction</span>
                        <MetricTooltip
                          title="Tax Regime & Withholding"
                          description="UCITS ETFs domiciled in Ireland/Luxembourg benefit from 0% Greek capital gains tax and 0% dividend distribution tax under Greek Tax Law 4172/2013."
                          align="right"
                        />
                      </div>
                      <p className={`mt-1 text-xs font-bold font-mono ${isUcitsAsset ? 'text-emerald-700' : 'text-zinc-700'}`}>
                        {isUcitsAsset ? '0% UCITS Greek Exempt' : '15% US WHT Treaty'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. VALUATION & BUFFETT MOAT TAB */}
              {dossierTab === 'valuation' && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-amber-600" />
                        <div>
                          <h4 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
                            {isUcitsAsset ? 'Institutional ETF Valuation & Quality' : 'Intrinsic DCF & Buffett Moat Model'}
                          </h4>
                          <p className="text-xs text-zinc-500">
                            {isUcitsAsset
                              ? 'Fundamental tracking efficiency, fee drag analysis & diversification score'
                              : 'Discounted Cash Flow intrinsic valuation and competitive moat checklist'}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-bold font-mono text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                        Score: {valuationData?.buffettQualityModel?.qualityScore ?? 100}/100
                      </span>
                    </div>

                    {valuationData && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                        <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80">
                          <span className="text-[10px] text-zinc-400 block uppercase font-bold tracking-wider">Intrinsic Fair Value</span>
                          <span className="text-xl font-black text-zinc-900 block mt-1">
                            {formatMoney(valuationData.dcfModel.fairValue, selectedAsset.currency)}
                          </span>
                          <span className="text-[10px] text-zinc-500 mt-0.5 block">{valuationData.dcfModel.valuationStatus}</span>
                        </div>
                        <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80">
                          <span className="text-[10px] text-zinc-400 block uppercase font-bold tracking-wider">Margin of Safety</span>
                          <span className={`text-xl font-black block mt-1 ${
                            valuationData.dcfModel.marginOfSafetyPct >= 0 ? 'text-emerald-600' : 'text-zinc-700'
                          }`}>
                            {valuationData.dcfModel.marginOfSafetyPct > 0 ? '+' : ''}{valuationData.dcfModel.marginOfSafetyPct}%
                          </span>
                          <span className="text-[10px] text-zinc-500 mt-0.5 block">Relative to market price</span>
                        </div>
                        <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80">
                          <span className="text-[10px] text-zinc-400 block uppercase font-bold tracking-wider">Valuation Multiple</span>
                          <span className="text-xl font-black text-zinc-900 block mt-1">
                            {selectedAsset.peRatio ? `${selectedAsset.peRatio.toFixed(1)}x P/E` : 'N/A'}
                          </span>
                          <span className="text-[10px] text-zinc-500 mt-0.5 block">
                            {selectedAsset.pegRatio ? `PEG: ${selectedAsset.pegRatio.toFixed(2)}` : 'Core Profile'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Quality Checklist Items */}
                    <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-4 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                        Moat & Quality Criteria Breakdown
                      </span>
                      <div className="divide-y divide-zinc-200/60 text-xs">
                        {valuationData?.buffettQualityModel?.checklist?.map((c, i) => (
                          <div key={i} className="py-2 flex items-center justify-between">
                            <span className="text-zinc-700 font-medium text-xs">{c.criterion}</span>
                            <span className="font-bold font-mono text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                              {c.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. CAPM RISK & EXPECTED RETURNS TAB */}
              {dossierTab === 'risk' && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-violet-600" />
                        <div>
                          <h4 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">CAPM Expected Returns & Risk Profile</h4>
                          <p className="text-xs text-zinc-500">Capital Asset Pricing Model forward 1-year projections and tail-risk VaR</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-zinc-500 bg-zinc-100 px-2 py-1 rounded">
                        1-Year Horizon
                      </span>
                    </div>

                    {returnsData && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                        <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
                          <span className="text-[10px] text-emerald-800 block uppercase font-bold tracking-wider">1-Year CAPM Return</span>
                          <span className="text-2xl font-black text-emerald-700 block mt-1">
                            +{returnsData.capmExpectedReturn.oneYearExpectedReturnPct}%
                          </span>
                          <span className="text-[10px] text-emerald-600 mt-0.5 block">Base case risk-adjusted</span>
                        </div>
                        <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-200/80">
                          <span className="text-[10px] text-indigo-800 block uppercase font-bold tracking-wider">Bull Case Scenario</span>
                          <span className="text-2xl font-black text-indigo-700 block mt-1">
                            +{returnsData.capmExpectedReturn.bullCaseScenarioPct}%
                          </span>
                          <span className="text-[10px] text-indigo-600 mt-0.5 block">Optimistic market multiple expansion</span>
                        </div>
                        <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200/80">
                          <span className="text-[10px] text-rose-800 block uppercase font-bold tracking-wider">95% 1-Day VaR</span>
                          <span className="text-2xl font-black text-rose-700 block mt-1">
                            -{returnsData.valueAtRisk95.oneDayVaRPct}%
                          </span>
                          <span className="text-[10px] text-rose-600 mt-0.5 block">Maximum expected daily loss (95% CI)</span>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                      <div className="p-3 rounded-xl border border-zinc-200 bg-zinc-50/70 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Beta to Benchmark</span>
                        <p className="text-base font-black font-mono text-zinc-900">
                          {selectedAsset.beta !== null && selectedAsset.beta !== undefined ? selectedAsset.beta.toFixed(2) : '1.00'}
                        </p>
                        <p className="text-[10px] text-zinc-500">
                          {(selectedAsset.beta || 1.0) < 0.9 ? 'Lower volatility than market' : (selectedAsset.beta || 1.0) > 1.2 ? 'Higher sensitivity / high beta' : 'In line with global market beta'}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl border border-zinc-200 bg-zinc-50/70 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Distance from ATH</span>
                        <p className={`text-base font-black font-mono ${selectedAsset.distance_from_ath_pct < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {selectedAsset.distance_from_ath_pct.toFixed(2)}%
                        </p>
                        <p className="text-[10px] text-zinc-500">
                          Peak price: {formatMoney(selectedAsset.all_time_high, selectedAsset.currency)}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl border border-zinc-200 bg-zinc-50/70 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Expense Drag / WHT</span>
                        <p className={`text-base font-black font-mono ${isUcitsAsset ? 'text-emerald-700' : 'text-zinc-800'}`}>
                          {isUcitsAsset ? '0.00% Tax Drag' : '15.0% WHT Drag'}
                        </p>
                        <p className="text-[10px] text-zinc-500">
                          {isUcitsAsset ? 'UCITS Greek Tax Law 4172/2013' : 'US-Greece Double Tax Treaty'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. ETF CONSTITUENTS / 10-K FILINGS & LIVE NEWS */}
              {dossierTab === 'breakdown' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* ETF Constituents OR SEC 10-K Corporate Breakdown */}
                  <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {filingsData?.isEtf || isUcitsAsset ? (
                          <PieChart className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <FileText className="h-4 w-4 text-blue-600" />
                        )}
                        <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                          {filingsData?.isEtf || isUcitsAsset
                            ? 'ETF Top 10 Constituents & Sectors'
                            : 'SEC 10-K & Revenue Segments'}
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400">
                        {filingsData?.fiscalPeriod || (isUcitsAsset ? 'UCITS KID' : 'FY2025/2026')}
                      </span>
                    </div>

                    {loadingFilings ? (
                      <div className="py-6 text-center text-zinc-400 text-xs">
                        <Loader2 className="h-4 w-4 animate-spin mx-auto text-zinc-400 mb-1" />
                        Loading holdings & filings...
                      </div>
                    ) : filingsData?.isEtf || isUcitsAsset ? (
                      /* ETF Top 10 Constituents & Sector Allocation */
                      <div className="space-y-3">
                        {/* Top Holdings List */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                              Top Underlying Holdings {filingsData?.holdingsCount ? `(${filingsData.holdingsCount} Total)` : ''}
                            </span>
                            {filingsData?.ter && (
                              <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                TER {filingsData.ter}
                              </span>
                            )}
                          </div>
                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {filingsData?.topHoldings && filingsData.topHoldings.length > 0 ? (
                              filingsData.topHoldings.map((h) => (
                                <div key={h.symbol} className="space-y-0.5 text-xs font-mono">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <div className="flex items-center gap-1.5 truncate">
                                      <span className="font-bold text-zinc-900 bg-zinc-100 px-1 rounded text-[10px]">
                                        {h.symbol}
                                      </span>
                                      <span className="text-zinc-700 truncate">{h.name}</span>
                                    </div>
                                    <span className="font-bold text-zinc-900 ml-2">{h.weightPct}%</span>
                                  </div>
                                  <div className="w-full h-1 rounded-full bg-zinc-100 overflow-hidden">
                                    <div style={{ width: `${Math.min(100, h.weightPct * 10)}%` }} className="h-full bg-emerald-500 rounded-full" />
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="py-4 text-center text-zinc-400 text-xs font-mono">
                                Constituent holdings data updating...
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Sector Allocation Pills */}
                        {filingsData?.sectorAllocation && filingsData.sectorAllocation.length > 0 && (
                          <div className="pt-2 border-t border-zinc-100">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                              Sector Allocation
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {filingsData.sectorAllocation.map((sec) => (
                                <span key={sec.sector} className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-mono text-zinc-700">
                                  {sec.sector} <strong>{sec.weightPct}%</strong>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Factsheet summary */}
                        {filingsData?.factsheetSummary && (
                          <div className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100 text-[11px] text-emerald-900 leading-relaxed">
                            <strong className="block mb-0.5">UCITS Factsheet Summary:</strong>
                            {filingsData.factsheetSummary}
                          </div>
                        )}
                      </div>
                    ) : filingsData ? (
                      /* Stock 10-K Segment Revenue */
                      <div className="space-y-3">
                        <div className="space-y-2">
                          {filingsData.segmentBreakdown?.slice(0, 4).map((seg) => (
                            <div key={seg.segment} className="space-y-1 text-xs font-mono">
                              <div className="flex justify-between text-[11px]">
                                <span className="font-semibold text-zinc-700">{seg.segment}</span>
                                <span className="font-bold text-zinc-900">{seg.revenueFormatted} ({seg.sharePct}%)</span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                                <div style={{ width: `${seg.sharePct}%` }} className="h-full bg-indigo-600 rounded-full" />
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-100 text-[11px] text-zinc-600 leading-relaxed">
                          <strong className="text-zinc-800 block mb-0.5 font-sans">Guidance Highlight:</strong>
                          {filingsData.managementGuidanceSummary}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* Upcoming Catalysts & Corporate Calendar */}
                  {catalystsData && (catalystsData.catalystAlert || (catalystsData.keyEvents && catalystsData.keyEvents.length > 0)) && (
                    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4 text-indigo-600" />
                          <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Upcoming Catalysts & Events</h4>
                        </div>
                        {catalystsData.analystConsensus && catalystsData.analystConsensus.totalRatings > 0 && (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Wall St: {catalystsData.analystConsensus.consensusRating} ({catalystsData.analystConsensus.buyRatioPct}% Buy)
                          </span>
                        )}
                      </div>

                      {/* Active Catalyst Alert Banner */}
                      {catalystsData.catalystAlert && (
                        <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-2.5">
                          <Zap className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                          <p className="text-xs text-indigo-950 leading-relaxed font-medium">
                            {catalystsData.catalystAlert}
                          </p>
                        </div>
                      )}

                      {/* Earnings Highlight If Scheduled */}
                      {catalystsData.hasUpcomingEarnings && catalystsData.earningsDate && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                          <div className="p-2 rounded-lg bg-zinc-50 border border-zinc-200">
                            <span className="text-[9px] uppercase font-bold text-zinc-400 block">Earnings Date</span>
                            <span className="font-bold text-zinc-900">{catalystsData.earningsDate}</span>
                          </div>
                          <div className="p-2 rounded-lg bg-zinc-50 border border-zinc-200">
                            <span className="text-[9px] uppercase font-bold text-zinc-400 block">Period</span>
                            <span className="font-bold text-zinc-900">{catalystsData.earningsQuarter || 'Next Qtr'}</span>
                          </div>
                          <div className="p-2 rounded-lg bg-zinc-50 border border-zinc-200">
                            <span className="text-[9px] uppercase font-bold text-zinc-400 block">Consensus EPS</span>
                            <span className="font-bold text-emerald-700">${catalystsData.epsEstimate ?? 'N/A'}</span>
                          </div>
                          <div className="p-2 rounded-lg bg-zinc-50 border border-zinc-200">
                            <span className="text-[9px] uppercase font-bold text-zinc-400 block">Consensus Rev</span>
                            <span className="font-bold text-zinc-900">{catalystsData.revenueEstimateFormatted ?? 'N/A'}</span>
                          </div>
                        </div>
                      )}

                      {/* Scheduled Key Events List */}
                      {catalystsData.keyEvents && catalystsData.keyEvents.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                            Key Scheduled Events & Milestones
                          </span>
                          <div className="space-y-2">
                            {catalystsData.keyEvents.map((ev, idx) => (
                              <div
                                key={idx}
                                className="p-2.5 rounded-xl border border-zinc-100 bg-zinc-50/60 space-y-1 text-xs"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-bold text-zinc-900">{ev.title}</span>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-zinc-200/80 text-zinc-700">
                                      {ev.date}
                                    </span>
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                                      ev.impact === 'HIGH' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                                    }`}>
                                      {ev.impact} IMPACT
                                    </span>
                                  </div>
                                </div>
                                <p className="text-[11px] text-zinc-600 leading-snug">
                                  {ev.description}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Live News & Market Sentiment (Expandable & Clickable) */}
                  <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Newspaper className="h-4 w-4 text-emerald-600" />
                        <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Live News & Sentiment</h4>
                      </div>
                      <span className="text-[10px] font-mono font-semibold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">
                        {newsList.length} Stories Available
                      </span>
                    </div>

                    <div className={`space-y-2 overflow-y-auto pr-1 text-xs transition-all ${showAllNews ? 'max-h-96' : 'max-h-56'}`}>
                      {(showAllNews ? newsList : newsList.slice(0, 4)).map((item, i) => (
                        <a
                          key={i}
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group block p-2.5 rounded-xl border border-zinc-100 bg-zinc-50/70 hover:bg-emerald-50/40 hover:border-emerald-200 transition-all shadow-2xs"
                        >
                          <div className="flex items-center justify-between text-[10px] text-zinc-400">
                            <span className="font-semibold text-zinc-600 flex items-center gap-1">
                              {item.source}
                              <ExternalLink className="h-3 w-3 text-zinc-400 group-hover:text-emerald-600 transition-colors" />
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                              item.sentiment === 'POSITIVE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.sentiment === 'NEGATIVE'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-zinc-200 text-zinc-700'
                            }`}>
                              {item.sentiment}
                            </span>
                          </div>
                          <h5 className="font-semibold text-zinc-900 text-xs mt-1 leading-snug group-hover:text-emerald-950 transition-colors">
                            {item.headline}
                          </h5>
                          {item.publishedAt && (
                            <span className="text-[9px] text-zinc-400 font-mono mt-1 block">
                              {item.publishedAt}
                            </span>
                          )}
                        </a>
                      ))}
                    </div>

                    {newsList.length > 4 && (
                      <button
                        type="button"
                        onClick={() => setShowAllNews(!showAllNews)}
                        className="w-full py-1.5 text-[11px] font-bold text-zinc-600 hover:text-zinc-900 bg-zinc-50 hover:bg-zinc-100 rounded-lg transition-colors flex items-center justify-center gap-1 border border-zinc-200/80"
                      >
                        {showAllNews ? (
                          <>
                            <ChevronUp className="h-3.5 w-3.5" /> Show Less
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3.5 w-3.5" /> View All ({newsList.length} Articles)
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
