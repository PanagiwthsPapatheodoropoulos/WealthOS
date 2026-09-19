import { useMemo, useState, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Wallet,
  RotateCcw,
  Search,
  Building2,
  Trash2,
  FolderPlus,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Sparkles,
  Download,
  ArrowUpDown,
  Filter,
  CheckCircle2,
  Percent,
  Upload,
  Settings2,
} from 'lucide-react'
import { usePortfolios, usePortfolioDetail } from '@/api/portfolioApi'
import { useAssets, useLiveHoldingsValuation } from '@/api/assetApi'
import { useBuyAsset } from '@/api/transactionApi'
import { useTrading212Status, fetchTrading212Portfolio } from '@/api/brokerApi'
import { http } from '@/lib/http'
import { useCurrencyStore } from '@/stores/currencyStore'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DepositModal } from '@/components/portfolio/DepositModal'
import { CreatePortfolioModal } from '@/components/portfolio/CreatePortfolioModal'
import { CommandPalette } from '@/components/shared/CommandPalette'
import { Trading212ImportModal } from '@/components/portfolio/Trading212ImportModal'
import { PortfolioSelectorModal } from '@/components/portfolio/PortfolioSelectorModal'
import type { Holding } from '@/types/portfolio'

export function PortfolioPage() {
  const queryClient = useQueryClient()
  const { currentCurrency, formatMoney, formatBaseMoney } = useCurrencyStore()
  const { data: portfolios, isLoading: loadingPortfolios } = usePortfolios()

  const safePortfolios = Array.isArray(portfolios) ? portfolios : []
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>('')
  const activePortfolioId = selectedPortfolioId || safePortfolios[0]?.id

  const { data: detail, isLoading: loadingDetail, refetch: refetchDetail } = usePortfolioDetail(activePortfolioId)
  const { data: assets } = useAssets()
  const safeAssets = Array.isArray(assets) ? assets : []

  // Dynamic Live Market Price Sync (30s background poll, pauses when tab is hidden)
  const {
    data: liveValuation,
    isLoading: loadingLiveValuation,
    isFetching: isFetchingLive,
    refetch: refetchLiveValuation,
  } = useLiveHoldingsValuation(detail?.holdings, currentCurrency)

  // Search & Sorting state for holdings table
  const [holdingSearch, setHoldingSearch] = useState('')
  const [sortField, setSortField] = useState<'marketValue' | 'unrealizedPnlPercentage' | 'dayPnlPercentage' | 'allocationPercentage'>('marketValue')
  const [sortAsc, setSortAsc] = useState(false)
  const [assetTypeFilter, setAssetTypeFilter] = useState<'ALL' | 'STOCK' | 'ETF' | 'CRYPTO'>('ALL')

  // Selected ticker for AI Dossier modal
  const [dossierSymbol, setDossierSymbol] = useState<string | null>(null)

  // Custom Modal States
  const [isDepositOpen, setIsDepositOpen] = useState(false)
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [isCreatePortfolioOpen, setIsCreatePortfolioOpen] = useState(false)
  const [isDeletePortfolioOpen, setIsDeletePortfolioOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isBrokerImportOpen, setIsBrokerImportOpen] = useState(false)
  const [isCommandOpen, setIsCommandOpen] = useState(false)

  // Trading 212 Live Sync State & Automatic Synchronization
  const { data: statusData } = useTrading212Status()
  const [isOneClickSyncing, setIsOneClickSyncing] = useState(false)
  const [lastSyncNotice, setLastSyncNotice] = useState<string | null>(null)
  const [hasAutoSynced, setHasAutoSynced] = useState(false)
  // Manual / Paper Order Execution State
  const buyAsset = useBuyAsset()
  const [selectedAssetId, setSelectedAssetId] = useState('')
  const [buyQuantity, setBuyQuantity] = useState('')

  const selectedAsset = useMemo(
    () => safeAssets.find((a) => a.id === selectedAssetId),
    [safeAssets, selectedAssetId]
  )

  const handleManualBuy = () => {
    if (!activePortfolioId || !selectedAssetId || !buyQuantity) return
    buyAsset.mutate(
      { portfolioId: activePortfolioId, assetId: selectedAssetId, quantity: Number(buyQuantity) },
      {
        onSuccess: () => {
          setBuyQuantity('')
          setSelectedAssetId('')
          refetchDetail()
          refetchLiveValuation()
        },
      }
    )
  }

  const [deletingSymbol, setDeletingSymbol] = useState<string | null>(null)

  const handleDeleteHolding = async (assetId?: string, symbol?: string) => {
    if (!activePortfolioId || !symbol) return
    if (!window.confirm(`Are you sure you want to remove ${symbol} from this portfolio?`)) return

    setDeletingSymbol(symbol)
    try {
      if (assetId) {
        await http.delete(`/portfolios/${activePortfolioId}/holdings/${assetId}`)
      } else {
        await http.delete(`/portfolios/${activePortfolioId}/assets/${symbol}`)
      }
      queryClient.invalidateQueries({ queryKey: ['portfolios'] })
      queryClient.invalidateQueries({ queryKey: ['portfolioDetail', activePortfolioId] })
      queryClient.invalidateQueries({ queryKey: ['portfolioPerformance'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      refetchDetail()
      refetchLiveValuation()
    } catch (err: any) {
      console.error('Failed to remove holding:', err)
      alert(err?.message || `Failed to remove ${symbol}`)
    } finally {
      setDeletingSymbol(null)
    }
  }

  const executeT212Sync = useCallback(async (isSilent = false) => {
    if (!activePortfolioId) return
    if (!isSilent) setIsOneClickSyncing(true)

    try {
      const apiKeyArg = (statusData?.hasSavedKey || !statusData?.hasEnvKey) ? 'SAVED' : 'ENV'
      const data = await fetchTrading212Portfolio(apiKeyArg, statusData?.isDemo ?? false)
      if (data && Array.isArray(data.positions) && data.positions.length > 0) {
        const payload = data.positions.map((p) => ({
          symbol: p.symbol,
          name: p.name || p.symbol,
          quantity: p.quantity,
          averagePrice: p.averagePrice,
          currentPrice: p.currentPrice,
        }))

        await http.post(`/portfolios/${activePortfolioId}/import`, payload)
        queryClient.invalidateQueries({ queryKey: ['portfolios'] })
        queryClient.invalidateQueries({ queryKey: ['portfolioDetail', activePortfolioId] })
        queryClient.invalidateQueries({ queryKey: ['portfolioPerformance'] })
        queryClient.invalidateQueries({ queryKey: ['analytics'] })
        refetchDetail()
        refetchLiveValuation()

        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        setLastSyncNotice(`Synced ${data.positions.length} positions (${timeStr})`)
        setTimeout(() => setLastSyncNotice(null), 6000)
      }
    } catch (err: any) {
      if (!isSilent) {
        console.error('Trading 212 sync error:', err)
        setIsBrokerImportOpen(true)
      }
    } finally {
      if (!isSilent) setIsOneClickSyncing(false)
    }
  }, [activePortfolioId, queryClient, refetchDetail, refetchLiveValuation, statusData?.hasSavedKey, statusData?.hasEnvKey, statusData?.isDemo])

  // Silent automatic sync on portfolio page mount if user has a saved connection or system env key
  useEffect(() => {
    if ((statusData?.hasSavedKey || statusData?.hasEnvKey) && activePortfolioId && !hasAutoSynced) {
      setHasAutoSynced(true)
      executeT212Sync(true)
    }
  }, [statusData?.hasSavedKey, statusData?.hasEnvKey, activePortfolioId, hasAutoSynced, executeT212Sync])

  const handleOneClickSync = () => {
    if (!statusData?.hasSavedKey && !statusData?.hasEnvKey) {
      setIsBrokerImportOpen(true)
      return
    }
    executeT212Sync(false)
  }

  // Merge database holdings with live valuation data
  const mergedHoldings = useMemo(() => {
    const rawHoldings = Array.isArray(detail?.holdings) ? detail.holdings : []
    if (!liveValuation?.holdings || liveValuation.holdings.length === 0) {
      return rawHoldings.map((h) => ({
        ...h,
        livePrice: h.currentPrice,
        liveMarketValue: h.marketValue,
        liveUnrealizedPnl: h.unrealizedPnl,
        liveUnrealizedPnlPct: h.avgCost > 0 ? ((h.currentPrice - h.avgCost) / h.avgCost) * 100 : 0,
        dayPnl: 0,
        dayPnlPct: 0,
        allocationPct: detail?.holdingsValue ? (h.marketValue / detail.holdingsValue) * 100 : 0,
      }))
    }

    const liveMap = new Map(liveValuation.holdings.map((lh) => [lh.symbol.toUpperCase(), lh]))

    return rawHoldings.map((h) => {
      const live = liveMap.get(h.symbol.toUpperCase())
      const livePrice = live ? live.currentPrice : h.currentPrice
      const liveMarketValue = live ? live.marketValue : (h.quantity * livePrice)
      const costBasis = h.quantity * h.avgCost
      const liveUnrealizedPnl = live ? live.unrealizedPnl : (liveMarketValue - costBasis)
      const liveUnrealizedPnlPct = live ? live.unrealizedPnlPercentage : (costBasis > 0 ? (liveUnrealizedPnl / costBasis) * 100 : 0)

      return {
        ...h,
        livePrice,
        liveMarketValue,
        liveUnrealizedPnl,
        liveUnrealizedPnlPct,
        dayPnl: live?.dayPnl ?? 0,
        dayPnlPct: live?.dayPnlPercentage ?? 0,
        allocationPct: live?.allocationPercentage ?? (detail?.holdingsValue ? (h.marketValue / detail.holdingsValue) * 100 : 0),
      }
    })
  }, [detail, liveValuation])

  // Filtered & Sorted Holdings
  const displayedHoldings = useMemo(() => {
    let result = [...mergedHoldings]

    if (holdingSearch.trim()) {
      const q = holdingSearch.toLowerCase().trim()
      result = result.filter(
        (h) => h.symbol.toLowerCase().includes(q) || (h.name && h.name.toLowerCase().includes(q))
      )
    }

    result.sort((a, b) => {
      let valA = 0
      let valB = 0
      if (sortField === 'marketValue') {
        valA = a.liveMarketValue
        valB = b.liveMarketValue
      } else if (sortField === 'unrealizedPnlPercentage') {
        valA = a.liveUnrealizedPnlPct
        valB = b.liveUnrealizedPnlPct
      } else if (sortField === 'dayPnlPercentage') {
        valA = a.dayPnlPct
        valB = b.dayPnlPct
      } else if (sortField === 'allocationPercentage') {
        valA = a.allocationPct
        valB = b.allocationPct
      }
      return sortAsc ? valA - valB : valB - valA
    })

    return result
  }, [mergedHoldings, holdingSearch, sortField, sortAsc])

  // Totals dynamically calculated with live prices
  const cashBalance = detail?.cashBalance ?? 0
  const liveHoldingsTotal = liveValuation?.currentMarketValue ?? detail?.holdingsValue ?? 0
  const liveNetWorth = cashBalance + liveHoldingsTotal
  const totalUnrealizedPnl = liveValuation?.unrealizedPnl ?? (detail?.holdingsValue ? detail.holdingsValue - (detail.holdings.reduce((s, h) => s + (h.quantity * h.avgCost), 0)) : 0)
  const totalUnrealizedPnlPct = liveValuation?.unrealizedPnlPercentage ?? 0
  const totalDayPnl = liveValuation?.dayPnl ?? 0
  const totalDayPnlPct = liveValuation?.dayPnlPercentage ?? 0

  if (loadingPortfolios || loadingDetail) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!activePortfolioId || !detail) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center max-w-xl mx-auto mt-12 space-y-4 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-900">No active portfolio found</h2>
        <p className="text-xs text-zinc-500">Create your first portfolio strategy to begin trading.</p>
        <button
          onClick={() => setIsCreatePortfolioOpen(true)}
          className="rounded-xl bg-zinc-900 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-zinc-800 transition-colors"
        >
          + Create Portfolio
        </button>
        <CreatePortfolioModal
          isOpen={isCreatePortfolioOpen}
          onClose={() => setIsCreatePortfolioOpen(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['portfolios'] })}
        />
      </div>
    )
  }

  const handleRefreshAll = () => {
    refetchDetail()
    refetchLiveValuation()
  }

  const handleExportCSV = () => {
    if (!mergedHoldings.length) return
    const headers = ['Symbol', 'Name', 'Quantity', 'Avg Cost', 'Current Price', 'Market Value', 'Unrealized PnL', 'Unrealized PnL %', 'Day Change %', 'Allocation %']
    const rows = mergedHoldings.map((h) => [
      h.symbol,
      `"${h.name}"`,
      h.quantity,
      h.avgCost.toFixed(4),
      h.livePrice.toFixed(2),
      h.liveMarketValue.toFixed(2),
      h.liveUnrealizedPnl.toFixed(2),
      h.liveUnrealizedPnlPct.toFixed(2) + '%',
      h.dayPnlPct.toFixed(2) + '%',
      h.allocationPct.toFixed(2) + '%',
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `wealthos_portfolio_${detail.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(false)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Portfolio Selector & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <PortfolioSelectorModal
            activePortfolioId={activePortfolioId}
            onSelectPortfolio={setSelectedPortfolioId}
            portfolios={safePortfolios}
          />

          {/* Real-Time Sync Indicator */}
          <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-3 py-1 text-[11px] font-medium text-emerald-800">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Live Sync Active (30s)</span>
          </div>

          {lastSyncNotice && (
            <div className="flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-800 animate-in fade-in duration-200">
              <CheckCircle2 className="h-3 w-3 text-blue-600" />
              <span>{lastSyncNotice}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsDepositOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors shadow-xs"
          >
            <Wallet className="h-3.5 w-3.5 text-zinc-500" />
            Deposit Cash
          </button>

          <button
            onClick={handleRefreshAll}
            disabled={isFetchingLive}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors shadow-xs disabled:opacity-50"
            title="Refresh Live Quotes Now"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetchingLive ? 'animate-spin text-zinc-900' : 'text-zinc-500'}`} />
            Refresh
          </button>

          {/* 1-Click Sync Trading 212 & Last Resort Settings */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleOneClickSync}
              disabled={isOneClickSyncing}
              className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors shadow-xs disabled:opacity-60 cursor-pointer"
              title="Sync latest live positions from Trading 212 with 1 click"
            >
              <span className="rounded bg-blue-600 px-1 py-0.2 text-[9px] text-white font-black">T212</span>
              <RefreshCw className={`h-3.5 w-3.5 ${isOneClickSyncing ? 'animate-spin text-blue-600' : 'text-blue-600'}`} />
              <span>{isOneClickSyncing ? 'Syncing...' : 'Sync Trading 212'}</span>
            </button>

            <button
              onClick={() => setIsBrokerImportOpen(true)}
              className="p-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 transition-colors shadow-xs cursor-pointer"
              title="Broker Sync Settings & CSV Import (Last Resort)"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors shadow-xs"
            title="Export Holdings CSV"
          >
            <Download className="h-3.5 w-3.5 text-zinc-500" />
            Export CSV
          </button>

          <button
            onClick={() => setIsCreatePortfolioOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors shadow-xs"
          >
            <FolderPlus className="h-3.5 w-3.5 text-zinc-500" />
            New Portfolio
          </button>
        </div>
      </div>

      {/* Portfolio Performance Summary Metrics (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
            Portfolio Market Value
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold tracking-tight font-mono text-zinc-900">
              {formatMoney(liveHoldingsTotal, currentCurrency)}
            </span>
          </div>
          <span className="text-[11px] text-zinc-500 mt-1 block">Live mark-to-market valuation</span>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
            Invested Cost Basis
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold tracking-tight font-mono text-zinc-900">
              {formatMoney(
                detail?.holdings?.reduce((s, h) => s + h.quantity * (h.avgCost || 0), 0) || liveHoldingsTotal,
                currentCurrency
              )}
            </span>
          </div>
          <span className="text-[11px] text-zinc-500 mt-1 block">Total deployed capital</span>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
            Total Unrealized Return
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className={`text-2xl font-extrabold tracking-tight font-mono ${totalUnrealizedPnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {totalUnrealizedPnl >= 0 ? '+' : ''}{formatMoney(totalUnrealizedPnl, currentCurrency)}
            </span>
            <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md ${totalUnrealizedPnl >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {totalUnrealizedPnlPct >= 0 ? '+' : ''}{totalUnrealizedPnlPct.toFixed(2)}%
            </span>
          </div>
          <span className="text-[11px] text-zinc-500 mt-1 block">Cumulative Open P&L</span>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
            Today's Price Movement
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className={`text-2xl font-extrabold tracking-tight font-mono ${totalDayPnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {totalDayPnl >= 0 ? '+' : ''}{formatMoney(totalDayPnl, currentCurrency)}
            </span>
            <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md ${totalDayPnl >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {totalDayPnlPct >= 0 ? '+' : ''}{totalDayPnlPct.toFixed(2)}%
            </span>
          </div>
          <span className="text-[11px] text-zinc-500 mt-1 block">24h Real-Time Delta</span>
        </div>
      </div>

      {/* Broker Feed Surveillance Banner (Read-Only sync architecture) */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white font-black text-xs">
            T212
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-zinc-900">Trading 212 Institutional Sync</h4>
              <span className="rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-mono font-bold">
                ● Read-Only Active
              </span>
            </div>
            <p className="text-[11px] text-zinc-500">Holdings & valuations synchronize automatically. Order placement is conducted securely via your broker.</p>
          </div>
        </div>
        <button
          onClick={() => setIsT212Open(true)}
          className="rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 px-3.5 py-1.5 text-xs font-bold text-zinc-700 transition-colors"
        >
          Manage Broker Sync
        </button>
      </div>

      {/* Quick Trade / Manual Order Execution Bar */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-bold text-zinc-900">Execute Order</h3>
            <p className="text-xs text-zinc-500">
              {cashBalance > 0 && (
                <>Available Cash: <strong className="font-mono font-bold text-zinc-900">{formatMoney(cashBalance, currentCurrency)}</strong> &bull; </>
              )}
              Total Value: <strong className="font-mono font-bold text-zinc-900">{formatMoney(liveNetWorth, currentCurrency)}</strong>
            </p>
          </div>
          {buyAsset.isError && (
            <p className="text-xs font-semibold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
              Could not complete purchase.
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedAssetId}
            onChange={(e) => setSelectedAssetId(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-xs font-semibold text-zinc-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
          >
            <option value="">Select asset…</option>
            {safeAssets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.symbol} — {formatMoney(asset.currentPrice, currentCurrency)}
              </option>
            ))}
          </select>
          <input
            type="number"
            min="0"
            step="any"
            placeholder="Quantity"
            value={buyQuantity}
            onChange={(e) => setBuyQuantity(e.target.value)}
            className="w-32 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-xs font-mono font-semibold text-zinc-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
          />
          {selectedAsset && buyQuantity && (
            <span className="text-xs font-mono text-zinc-500">
              ≈ {formatMoney((selectedAsset.currentPrice || 0) * Number(buyQuantity), currentCurrency)}
            </span>
          )}
          <button
            onClick={handleManualBuy}
            disabled={buyAsset.isPending || !selectedAssetId || !buyQuantity}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-xs font-bold text-white hover:bg-zinc-800 disabled:opacity-40 transition-colors shadow-xs cursor-pointer"
          >
            {buyAsset.isPending ? 'Executing...' : 'Buy'}
          </button>
        </div>
      </div>

      {/* Active Holdings Table with Live Polling, Sorting & Actions */}
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-xs overflow-hidden">
        {/* Table Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-zinc-100 bg-zinc-50/50">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-zinc-900">Active Positions</h3>
            <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-extrabold font-mono text-zinc-700">
              {mergedHoldings.length}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={holdingSearch}
                onChange={(e) => setHoldingSearch(e.target.value)}
                placeholder="Filter positions..."
                className="rounded-lg border border-zinc-200 bg-white pl-8 pr-3 py-1.5 text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 w-44"
              />
            </div>
          </div>
        </div>

        {displayedHoldings.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-xs">
            No active positions found in this portfolio. Execute an instant buy order above to start investing.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/70 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  <th className="py-3 px-4">Asset</th>
                  <th className="py-3 px-3 text-right">Holdings</th>
                  <th className="py-3 px-3 text-right">Avg Cost</th>
                  <th className="py-3 px-3 text-right">Live Price</th>
                  <th
                    className="py-3 px-3 text-right cursor-pointer hover:text-zinc-900 select-none"
                    onClick={() => toggleSort('marketValue')}
                  >
                    <span className="inline-flex items-center gap-1">
                      Market Value
                      <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </th>
                  <th
                    className="py-3 px-3 text-right cursor-pointer hover:text-zinc-900 select-none"
                    onClick={() => toggleSort('unrealizedPnlPercentage')}
                  >
                    <span className="inline-flex items-center gap-1">
                      Total P&L
                      <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </th>
                  <th
                    className="py-3 px-3 text-right cursor-pointer hover:text-zinc-900 select-none"
                    onClick={() => toggleSort('dayPnlPercentage')}
                  >
                    <span className="inline-flex items-center gap-1">
                      24h Change
                      <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </th>
                  <th
                    className="py-3 px-3 text-right cursor-pointer hover:text-zinc-900 select-none"
                    onClick={() => toggleSort('allocationPercentage')}
                  >
                    <span className="inline-flex items-center gap-1">
                      Weight
                      <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {displayedHoldings.map((h) => {
                  const isPosPnl = h.liveUnrealizedPnl >= 0
                  const isPosDay = h.dayPnlPct >= 0

                  return (
                    <tr key={h.assetId || h.symbol} className="hover:bg-zinc-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setDossierSymbol(h.symbol)}
                            className="font-bold font-mono text-zinc-900 hover:text-indigo-600 hover:underline flex items-center gap-1"
                            title="Open 360° AI Intelligence Dossier"
                          >
                            {h.symbol}
                            <Sparkles className="h-3 w-3 text-amber-500" />
                          </button>
                          <span className="text-[11px] text-zinc-400 truncate max-w-[140px]">
                            {h.name}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-medium text-zinc-700">
                        {h.quantity}
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-zinc-500">
                        {formatMoney(h.avgCost, currentCurrency)}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-zinc-900">
                        {formatMoney(h.livePrice, currentCurrency)}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-extrabold text-zinc-900">
                        {formatMoney(h.liveMarketValue, currentCurrency)}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="font-mono font-bold">
                          <span className={isPosPnl ? 'text-emerald-600' : 'text-rose-600'}>
                            {isPosPnl ? '+' : ''}{formatMoney(h.liveUnrealizedPnl, currentCurrency)}
                          </span>
                          <span className={`block text-[10px] ${isPosPnl ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {isPosPnl ? '+' : ''}{h.liveUnrealizedPnlPct.toFixed(2)}%
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold">
                        {isFetchingLive && h.dayPnlPct === 0 && !liveValuation ? (
                          <span className="text-zinc-400 text-[11px]">—</span>
                        ) : (
                          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] ${isPosDay ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                            {isPosDay ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {isPosDay ? '+' : ''}{isNaN(h.dayPnlPct) ? '0.00' : (h.dayPnlPct).toFixed(2)}%
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-semibold text-zinc-700">
                        {h.allocationPct.toFixed(1)}%
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setDossierSymbol(h.symbol)}
                            className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[10px] font-bold text-zinc-700 hover:bg-zinc-50 transition-colors shadow-2xs"
                            title="AI Dossier & DCF Valuation"
                          >
                            AI Dossier
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteHolding(h.assetId, h.symbol)}
                            disabled={deletingSymbol === h.symbol}
                            className="rounded-lg border border-rose-200 bg-rose-50/60 p-1 text-rose-600 hover:bg-rose-100 hover:text-rose-700 disabled:opacity-40 transition-colors shadow-2xs cursor-pointer"
                            title={`Remove ${h.symbol} from portfolio`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <DepositModal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        accountId={detail?.accountId}
        currentBalance={detail?.cashBalance}
        onSuccess={() => {
          refetchDetail()
          refetchLiveValuation()
        }}
      />

      <CreatePortfolioModal
        isOpen={isCreatePortfolioOpen}
        onClose={() => setIsCreatePortfolioOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['portfolios'] })}
      />

      <Trading212ImportModal
        isOpen={isBrokerImportOpen}
        onClose={() => setIsBrokerImportOpen(false)}
        portfolioId={activePortfolioId}
        portfolioName={detail.name}
      />

      {/* Global Command Palette / AI Dossier Modal for selected holding */}
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
