import { useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Upload,
  X,
  Check,
  FileText,
  Key,
  ShieldCheck,
  Loader2,
  ExternalLink,
  AlertCircle,
  Plus,
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Zap,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useTrading212Sync, useTrading212Status, disconnectTrading212, type Trading212Position } from '@/api/brokerApi'
import { useCurrencyStore } from '@/stores/currencyStore'
import { http } from '@/lib/http'

interface Trading212ImportModalProps {
  isOpen: boolean
  onClose: () => void
  portfolioId: string
  portfolioName?: string
}

type TabType = 'API' | 'CSV' | 'MANUAL'

export function Trading212ImportModal({
  isOpen,
  onClose,
  portfolioId,
  portfolioName = 'Main Portfolio',
}: Trading212ImportModalProps) {
  const queryClient = useQueryClient()
  const { currentCurrency, formatMoney } = useCurrencyStore()
  const syncMutation = useTrading212Sync()

  const { data: statusData } = useTrading212Status()
  const [activeTab, setActiveTab] = useState<TabType>('API')
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [isDemo, setIsDemo] = useState(false)

  // CSV State
  const [csvText, setCsvText] = useState('')
  const [parsedRows, setParsedRows] = useState<Trading212Position[]>([])
  const [csvFileName, setCsvFileName] = useState<string | null>(null)

  // Manual Position State
  const [manualSymbol, setManualSymbol] = useState('VUAA.MI')
  const [manualShares, setManualShares] = useState('25')
  const [manualPrice, setManualPrice] = useState('118.50')

  // Execution State
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false)
  const [isDisconnected, setIsDisconnected] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  const isConnected = !isDisconnected && (!!statusData?.hasSavedKey || !!statusData?.hasEnvKey)

  const handleDisconnect = async () => {
    setIsDisconnecting(true)
    setErrorMessage(null)
    try {
      if (portfolioId) {
        await http.post(`/portfolios/${portfolioId}/clear`, {})
      }
      await disconnectTrading212()
      queryClient.invalidateQueries({ queryKey: ['portfolios'] })
      queryClient.invalidateQueries({ queryKey: ['portfolioDetail'] })
      queryClient.invalidateQueries({ queryKey: ['performance'] })
      queryClient.invalidateQueries({ queryKey: ['diagnostics'] })
      queryClient.invalidateQueries({ queryKey: ['greekTaxAudit'] })
      queryClient.invalidateQueries({ queryKey: ['optimizer'] })
      queryClient.invalidateQueries({ queryKey: ['dividends'] })
      queryClient.invalidateQueries({ queryKey: ['integrations', 'trading212', 'status'] })
      queryClient.invalidateQueries({ queryKey: ['macroDashboard'] })

      setParsedRows([])
      setApiKey('')
      setIsDisconnected(true)
      setShowDisconnectConfirm(false)
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to disconnect broker and clear holdings.')
    } finally {
      setIsDisconnecting(false)
    }
  }

  if (!isOpen) return null

  // 1. Handle API Sync (First connect or Re-Sync)
  const handleFetchFromApi = async (overrideKey?: string) => {
    let keyToUse = overrideKey
    if (!keyToUse) {
      if (isConnected) {
        keyToUse = statusData?.hasSavedKey ? 'SAVED' : (statusData?.hasEnvKey ? 'ENV' : 'SAVED')
      } else {
        keyToUse = apiKey.trim() || (statusData?.hasEnvKey ? 'ENV' : '')
      }
    }
    if (!keyToUse) {
      setErrorMessage('Please enter your Trading 212 API key.')
      return
    }
    if (keyToUse !== 'SAVED' && keyToUse !== 'ENV' && keyToUse.length < 8) {
      setErrorMessage('Trading 212 API key must be at least 8 characters.')
      return
    }
    setErrorMessage(null)
    try {
      const targetDemo = isConnected ? (statusData?.isDemo ?? isDemo) : isDemo
      const data = await syncMutation.mutateAsync({ apiKey: keyToUse, isDemo: targetDemo })
      setParsedRows(data.positions)

      // Direct auto-import into portfolio
      if (portfolioId && data.positions.length > 0) {
        setIsSaving(true)
        const payload = data.positions.map((pos) => ({
          symbol: pos.symbol,
          name: pos.name || pos.symbol,
          quantity: pos.quantity,
          averagePrice: pos.averagePrice,
          currentPrice: pos.currentPrice,
        }))
        await http.post(`/portfolios/${portfolioId}/import`, payload)
        setSaveSuccess(true)
        setIsDisconnected(false)
        queryClient.invalidateQueries({ queryKey: ['portfolios'] })
        queryClient.invalidateQueries({ queryKey: ['portfolioDetail'] })
        queryClient.invalidateQueries({ queryKey: ['integrations', 'trading212', 'status'] })
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to fetch positions from Trading 212.')
    } finally {
      setIsSaving(false)
    }
  }

  // 2. Handle CSV Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvFileName(file.name)
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setCsvText(content)
      parseCsv(content)
    }
    reader.readAsText(file)
  }

  const parseCsv = (text: string) => {
    try {
      setErrorMessage(null)
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
      if (lines.length < 2) {
        setErrorMessage('CSV file is empty or missing data rows.')
        return
      }

      const rows: Trading212Position[] = []

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.replace(/["']/g, '').trim())
        if (cols.length < 3) continue

        let rawTicker = cols[3] || cols[0]
        let qty = parseFloat(cols[5]) || parseFloat(cols[4]) || 0
        let price = parseFloat(cols[6]) || parseFloat(cols[5]) || 0

        if (rawTicker && qty > 0) {
          let sym = rawTicker.replace(/_EQ$/, '').replace(/_US$/, '')
          if (sym.includes('_MI')) sym = sym.replace('_MI', '.MI')
          if (sym.includes('_DE')) sym = sym.replace('_DE', '.DE')

          const costBasis = Math.abs(qty * price)
          rows.push({
            rawTicker,
            symbol: sym.toUpperCase(),
            quantity: Math.abs(qty),
            averagePrice: Math.abs(price),
            currentPrice: Math.abs(price),
            costBasis,
            marketValue: costBasis,
            unrealizedPnl: 0,
            unrealizedPnlPercentage: 0,
            isUcits: sym.includes('VUAA') || sym.includes('VWCE') || sym.includes('.MI') || sym.includes('.DE'),
          })
        }
      }

      if (rows.length === 0) {
        setErrorMessage('Could not find any valid position rows in the CSV.')
      } else {
        setParsedRows(rows)
      }
    } catch {
      setErrorMessage('Failed to parse Trading 212 CSV. Please verify export format.')
    }
  }

  // 3. Handle Manual Add
  const handleAddManualPosition = () => {
    const qty = parseFloat(manualShares)
    const price = parseFloat(manualPrice)
    if (!manualSymbol || isNaN(qty) || qty <= 0 || isNaN(price) || price <= 0) {
      setErrorMessage('Please enter a valid symbol, shares quantity and buy price.')
      return
    }

    const sym = manualSymbol.trim().toUpperCase()
    const costBasis = qty * price
    const newPos: Trading212Position = {
      rawTicker: sym,
      symbol: sym,
      quantity: qty,
      averagePrice: price,
      currentPrice: price,
      costBasis,
      marketValue: costBasis,
      unrealizedPnl: 0,
      unrealizedPnlPercentage: 0,
      isUcits: sym.includes('VUAA') || sym.includes('VWCE') || sym.includes('.MI') || sym.includes('.DE'),
    }

    setParsedRows((prev) => [...prev.filter((p) => p.symbol !== sym), newPos])
    setErrorMessage(null)
  }

  // 4. Save Imported Positions (from CSV or Manual)
  const handleSaveToPortfolio = async () => {
    if (parsedRows.length === 0 || isSaving) return
    setIsSaving(true)
    setErrorMessage(null)

    try {
      const payload = parsedRows.map((pos) => ({
        symbol: pos.symbol,
        name: pos.name || pos.symbol,
        quantity: pos.quantity,
        averagePrice: pos.averagePrice,
        currentPrice: pos.currentPrice,
      }))

      await http.post(`/portfolios/${portfolioId}/import`, payload)

      setSaveSuccess(true)
      queryClient.invalidateQueries({ queryKey: ['portfolios'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
    } catch (e: any) {
      setErrorMessage(e?.message || 'Encountered an issue saving holdings. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-zinc-950/70 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-blue-600 p-2 text-white font-black text-sm">
              T212
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900">Trading 212 & Broker Portfolio Sync</h3>
              <p className="text-xs text-zinc-500">
                Sync live holdings into <strong className="text-zinc-800">{portfolioName}</strong>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        {saveSuccess ? (
          <div className="py-8 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Check className="h-6 w-6" />
            </div>
            <h4 className="text-base font-bold text-zinc-900">Holdings Successfully Synchronized!</h4>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              Your positions have been imported into WealthOS with real-time price updates, Greek Law 4172/2013 tax classification, and Markowitz risk analytics.
            </p>
            <button
              onClick={onClose}
              className="rounded-xl bg-zinc-900 px-6 py-2.5 text-xs font-bold text-white hover:bg-zinc-800 transition-colors mt-2"
            >
              View Updated Portfolio
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {isConnected ? (
              /* VIEW 1: ACTIVE CONNECTION (Permanent link) */
              <div className="space-y-4 py-2">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                        <CheckCircle2 className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-emerald-950">Trading 212 Active Connection</h4>
                          <span className="rounded-md bg-emerald-200/90 px-2 py-0.5 text-[10px] font-extrabold font-mono text-emerald-900">
                            {statusData?.isDemo ? 'PRACTICE / DEMO' : 'LIVE SYNC'}
                          </span>
                        </div>
                        <p className="text-xs text-emerald-700 mt-0.5">
                          Authenticated API Key: <code className="font-mono font-bold text-emerald-900">{statusData?.maskedKey || '••••••••'}</code>
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-emerald-800 leading-relaxed">
                    Your institutional portfolio is permanently linked to Trading 212 with read-only portfolio synchronization. Holdings and valuations update in real-time.
                  </p>
                </div>

                {showDisconnectConfirm && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                      <AlertTriangle className="h-4 w-4 text-rose-600" />
                      <span>Confirm Disconnect Broker Sync?</span>
                    </div>
                    <p className="text-xs text-rose-700 leading-relaxed">
                      This will remove your saved Trading 212 credentials and clear all imported holdings from this portfolio.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleDisconnect}
                        disabled={isDisconnecting}
                        className="rounded-xl bg-rose-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50 transition-colors shadow-xs"
                      >
                        {isDisconnecting ? 'Disconnecting...' : 'Disconnect Now & Clear Data'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDisconnectConfirm(false)}
                        className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDisconnectConfirm(true)}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 transition-colors py-1"
                  >
                    Disconnect Broker
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFetchFromApi(statusData?.hasSavedKey ? 'SAVED' : 'ENV')}
                    disabled={syncMutation.isPending || isSaving}
                    className="w-full sm:w-auto rounded-xl bg-blue-600 hover:bg-blue-500 px-6 py-2.5 text-xs font-bold text-white shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {syncMutation.isPending || isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-white" /> Synchronizing Portfolio...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 text-white" /> Re-Sync Live Holdings
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* VIEW 2: CONNECT BROKER (Enter key once) */
              <div className="space-y-4">
                {/* Tabs */}
                <div className="grid grid-cols-3 gap-2 border-b border-zinc-100 pb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('API')
                      setErrorMessage(null)
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                      activeTab === 'API'
                        ? 'bg-zinc-900 text-white shadow-xs'
                        : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100'
                    }`}
                  >
                    <Key className="h-3.5 w-3.5" />
                    <span>Direct API Key</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('CSV')
                      setErrorMessage(null)
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                      activeTab === 'CSV'
                        ? 'bg-zinc-900 text-white shadow-xs'
                        : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100'
                    }`}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>CSV Upload</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('MANUAL')
                      setErrorMessage(null)
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                      activeTab === 'MANUAL'
                        ? 'bg-zinc-900 text-white shadow-xs'
                        : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100'
                    }`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Manual Entry</span>
                  </button>
                </div>

                {/* TAB 1: TRADING 212 API */}
                {activeTab === 'API' && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 space-y-1">
                      <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                        <Key className="h-3.5 w-3.5 text-blue-600" /> Connect Your Trading 212 Account
                      </span>
                      <p className="text-xs text-blue-800 leading-relaxed">
                        Enter your Trading 212 API Key once. WealthOS securely links your portfolio and synchronizes your positions automatically.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-zinc-700">
                          Trading 212 API Key & Secret
                        </label>
                        <a
                          href="https://www.trading212.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <span>Where to find API Key (Settings &rarr; API)</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>

                      <div className="relative">
                        <input
                          type={showKey ? 'text' : 'password'}
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder="API_KEY:API_SECRET (or single API key)"
                          className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3.5 py-2.5 pr-10 text-xs font-mono font-semibold text-zinc-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
                        />
                        <button
                          type="button"
                          onClick={() => setShowKey(!showKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5"
                        >
                          {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>

                      {/* Server-managed .env key option - zero credentials leaked to client */}
                      {statusData?.hasEnvKey && (
                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={() => handleFetchFromApi('ENV')}
                            disabled={syncMutation.isPending || isSaving}
                            className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold cursor-pointer"
                          >
                            <Zap className="h-3 w-3" /> Connect via Server Environment Key (.env)
                          </button>
                          <span className="text-[10px] text-zinc-400">Read-Only Portfolio Permissions</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-600 font-medium select-none">
                        <input
                          type="checkbox"
                          checked={isDemo}
                          onChange={(e) => setIsDemo(e.target.checked)}
                          className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                        />
                        <span>Practice / Demo Account (demo.trading212.com)</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => handleFetchFromApi()}
                        disabled={syncMutation.isPending || isSaving}
                        className="rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-xs font-bold text-white shadow-xs disabled:opacity-40 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        {syncMutation.isPending || isSaving ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Verifying & Connecting...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4" /> Connect & Sync Live Holdings
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 2: CSV UPLOAD */}
                {activeTab === 'CSV' && (
                  <div className="space-y-3">
                    <div className="rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50/60 p-6 text-center hover:bg-zinc-50 transition-colors">
                      <FileText className="h-8 w-8 text-zinc-400 mx-auto mb-2" />
                      <p className="text-xs font-bold text-zinc-800">
                        {csvFileName ? `Selected: ${csvFileName}` : 'Upload Trading 212 / Broker Export CSV'}
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Export your positions or history CSV from Trading 212
                      </p>
                      <input
                        type="file"
                        accept=".csv,.txt"
                        onChange={handleFileUpload}
                        className="mt-3 text-xs text-zinc-500 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-zinc-900 file:text-white hover:file:bg-zinc-800 cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 3: MANUAL ENTRY */}
                {activeTab === 'MANUAL' && (
                  <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
                    <span className="text-xs font-bold text-zinc-800 block">Add Single Position Manually</span>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Ticker</label>
                        <input
                          type="text"
                          value={manualSymbol}
                          onChange={(e) => setManualSymbol(e.target.value.toUpperCase())}
                          placeholder="VUAA.MI"
                          className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-mono font-bold text-zinc-900"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Shares</label>
                        <input
                          type="number"
                          step="any"
                          min="0.01"
                          value={manualShares}
                          onChange={(e) => setManualShares(e.target.value)}
                          placeholder="25"
                          className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-mono font-bold text-zinc-900"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Buy Price (€)</label>
                        <input
                          type="number"
                          step="any"
                          min="0.01"
                          value={manualPrice}
                          onChange={(e) => setManualPrice(e.target.value)}
                          placeholder="118.50"
                          className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-mono font-bold text-zinc-900"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleAddManualPosition}
                        className="rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs px-4 py-1.5 transition-colors flex items-center gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Position
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {errorMessage && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-rose-700 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* PREVIEW OF DETECTED POSITIONS (FOR CSV / MANUAL) */}
            {parsedRows.length > 0 && activeTab !== 'API' && (
              <div className="space-y-2 pt-2 border-t border-zinc-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                    Ready to Import ({parsedRows.length} Positions)
                  </span>
                  <span className="text-xs font-mono text-zinc-500 font-semibold">
                    Total Value: {formatMoney(parsedRows.reduce((sum, p) => sum + p.marketValue, 0), currentCurrency)}
                  </span>
                </div>

                <div className="max-h-44 overflow-y-auto rounded-xl border border-zinc-200 divide-y divide-zinc-100 bg-white shadow-2xs">
                  {parsedRows.map((pos, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-900 bg-zinc-100 px-1.5 py-0.5 rounded text-[11px]">
                          {pos.symbol}
                        </span>
                        <span className="text-zinc-600">
                          {pos.quantity} shares @ {formatMoney(pos.averagePrice, currentCurrency)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-zinc-900 block">
                          {formatMoney(pos.marketValue, currentCurrency)}
                        </span>
                        {pos.unrealizedPnl !== 0 && (
                          <span className={`text-[10px] font-bold ${pos.unrealizedPnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {pos.unrealizedPnl >= 0 ? '+' : ''}{formatMoney(pos.unrealizedPnl, currentCurrency)} ({pos.unrealizedPnlPercentage}%)
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
              <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Read-only sync & zero trading execution permissions
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50"
                >
                  Close
                </button>
                {activeTab !== 'API' && parsedRows.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSaveToPortfolio}
                    disabled={isSaving || parsedRows.length === 0}
                    className="rounded-xl bg-zinc-900 px-5 py-2 text-xs font-bold text-white hover:bg-zinc-800 disabled:opacity-40 transition-colors shadow-xs"
                  >
                    {isSaving ? 'Importing Holdings...' : `Import ${parsedRows.length} Positions`}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
