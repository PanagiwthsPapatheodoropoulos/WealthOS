import { useState, useMemo } from 'react'
import {
  Receipt,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  TrendingUp,
  TrendingDown,
  Layers,
  Calendar,
} from 'lucide-react'
import { usePortfolios } from '@/api/portfolioApi'
import { useTransactions } from '@/api/transactionApi'
import { useCurrencyStore } from '@/stores/currencyStore'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { PortfolioSelectorModal } from '@/components/portfolio/PortfolioSelectorModal'

export function TransactionsPage() {
  const { formatBaseMoney } = useCurrencyStore()
  const { data: portfolios, isLoading: loadingPortfolios } = usePortfolios()
  const safePortfolios = Array.isArray(portfolios) ? portfolios : []

  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>('')
  const activePortfolioId = selectedPortfolioId || safePortfolios[0]?.id

  const { data: transactions, isLoading: loadingTransactions } = useTransactions(activePortfolioId)
  const safeTransactions = Array.isArray(transactions) ? transactions : []

  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL')

  const filteredTransactions = useMemo(() => {
    return safeTransactions.filter((tx) => {
      const matchesSearch =
        tx.symbol?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.type?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesType = typeFilter === 'ALL' || tx.type === typeFilter
      return matchesSearch && matchesType
    })
  }, [safeTransactions, searchTerm, typeFilter])

  // Aggregate Transaction KPIs
  const totalVolume = useMemo(() => {
    return safeTransactions.reduce((sum, tx) => sum + (Number(tx.totalAmount) || 0), 0)
  }, [safeTransactions])

  const totalRealizedPnl = useMemo(() => {
    return safeTransactions.reduce((sum, tx) => sum + (Number(tx.realizedPnl) || 0), 0)
  }, [safeTransactions])

  const buyCount = useMemo(() => {
    return safeTransactions.filter((tx) => tx.type === 'BUY').length
  }, [safeTransactions])

  const sellCount = useMemo(() => {
    return safeTransactions.filter((tx) => tx.type === 'SELL').length
  }, [safeTransactions])

  if (loadingPortfolios || loadingTransactions) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-zinc-900 px-2 py-0.5 text-[10px] font-bold text-white font-mono">
              AUDIT TRAIL
            </span>
            <span className="text-xs text-zinc-400 font-medium">Immutable Execution History</span>
          </div>
          <h1 className="text-2xl font-black text-zinc-900 mt-1 tracking-tight">Transaction Ledger</h1>
        </div>

        {/* Portfolio Dropdown Selector */}
        <PortfolioSelectorModal
          activePortfolioId={activePortfolioId}
          onSelectPortfolio={setSelectedPortfolioId}
          portfolios={safePortfolios}
        />
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Total Volume Executed</span>
          <p className="mt-2 text-2xl font-black font-mono text-zinc-900 tracking-tight">
            {formatBaseMoney(totalVolume)}
          </p>
          <span className="text-[11px] text-zinc-400 mt-1 block">{safeTransactions.length} recorded orders</span>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Net Realized P/L</span>
          <p className={`mt-2 text-2xl font-black font-mono tracking-tight ${totalRealizedPnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {totalRealizedPnl >= 0 ? '+' : ''}{formatBaseMoney(totalRealizedPnl)}
          </p>
          <span className="text-[11px] text-zinc-400 mt-1 block">Closed position gains/losses</span>
        </div>

        <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/30 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Buy Executions</span>
            <ArrowDownRight className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-black font-mono text-emerald-950 tracking-tight">
            {buyCount}
          </p>
          <span className="text-[11px] text-emerald-700 mt-1 block">Asset accumulation trades</span>
        </div>

        <div className="rounded-2xl border border-amber-200/60 bg-amber-50/30 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Sell Executions</span>
            <ArrowUpRight className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-black font-mono text-amber-950 tracking-tight">
            {sellCount}
          </p>
          <span className="text-[11px] text-amber-700 mt-1 block">Capital liquidations</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-3 shadow-xs">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Filter by ticker (e.g. NVDA, VUAA)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50/80 pl-9 pr-3 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
          />
        </div>

        {/* Type Filter Buttons */}
        <div className="flex items-center gap-1 w-full sm:w-auto bg-zinc-100 p-1 rounded-xl">
          {(['ALL', 'BUY', 'SELL'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`flex-1 sm:flex-initial px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                typeFilter === t
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              {t === 'ALL' ? 'All Types' : t === 'BUY' ? 'Buys Only' : 'Sells Only'}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-xs">
        {safeTransactions.length === 0 ? (
          <div className="p-12 text-center max-w-md mx-auto space-y-2">
            <Receipt className="h-10 w-10 text-zinc-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-zinc-900">No Past Broker Orders Synchronized</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Your active positions and valuations synchronize automatically via Trading 212 Read-Only Portfolio Sync. Historical order logs require the <strong>&quot;Orders&quot;</strong> permission enabled on your API key.
            </p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-zinc-800">No transactions match your query</h3>
            <p className="text-xs text-zinc-400 mt-1">Try adjusting your filters or search terms.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  <th className="py-3 px-5">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Asset Ticker</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                  <th className="py-3 px-4 text-right">Execution Price</th>
                  <th className="py-3 px-4 text-right">Gross Total</th>
                  <th className="py-3 px-5 text-right">Realized Gain/Loss</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-xs font-mono">
                {filteredTransactions.map((tx) => {
                  const isBuy = tx.type === 'BUY'
                  const pnl = Number(tx.realizedPnl)
                  const hasPnl = tx.realizedPnl !== null && tx.realizedPnl !== undefined

                  return (
                    <tr key={tx.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="py-3.5 px-5 text-zinc-500 text-[11px]">
                        {new Date(tx.executedAt).toLocaleString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3.5 px-4 font-sans">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                            isBuy
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {isBuy ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-zinc-900 font-sans">
                        {tx.symbol}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-zinc-700">
                        {Number(tx.quantity).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                      </td>
                      <td className="py-3.5 px-4 text-right text-zinc-800">
                        {formatBaseMoney(Number(tx.price || 0))}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-zinc-900">
                        {formatBaseMoney(Number(tx.totalAmount || 0))}
                      </td>
                      <td className="py-3.5 px-5 text-right font-bold">
                        {!hasPnl ? (
                          <span className="text-zinc-300 font-sans">—</span>
                        ) : (
                          <span className={pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                            {pnl >= 0 ? '+' : ''}{formatBaseMoney(pnl)}
                          </span>
                        )}
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
  )
}