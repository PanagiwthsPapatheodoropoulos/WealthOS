import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  Bell,
  CheckCircle2,
  Mail,
  Send,
  Calendar,
  Sparkles,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Search,
  Loader2,
  X,
  ExternalLink,
  ChevronRight,
  Clock,
  Inbox,
  AlertTriangle,
  FileText,
  Target,
  Layers,
  Eye,
  Activity,
  Zap,
  Cloud,
  Copy,
  Check,
  Pencil,
  Settings,
  Trash2,
} from 'lucide-react'
import { useAlerts, useCreateAlert, useCancelAlert, useDeleteAlert } from '@/api/alertApi'
import { useAssets } from '@/api/assetApi'
import { useWatchlists } from '@/api/watchlistApi'
import { useCurrencyStore } from '@/stores/currencyStore'
import { useAuthStore } from '@/stores/authStore'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import type { AlertCondition } from '@/types/alert'
import { GOOGLE_SENTINEL_SCRIPT_CODE } from '@/lib/googleSentinelScript'

export const resolveAssetCurrency = (symbol?: string, explicitCurrency?: string) => {
  if (explicitCurrency && typeof explicitCurrency === 'string' && explicitCurrency.trim()) {
    return explicitCurrency.trim().toUpperCase()
  }
  const sym = (symbol || '').trim().toUpperCase()
  if (!sym) return 'USD'

  // European exchanges -> EUR
  const euroSuffixes = ['.MI', '.DE', '.F', '.MU', '.PA', '.AS', '.BR', '.MC', '.AT', '.VI', '.HE', '.IR']
  if (euroSuffixes.some((ext) => sym.endsWith(ext))) {
    return 'EUR'
  }
  // London / UK -> GBP
  if (sym.endsWith('.L') || sym.endsWith('.IL')) {
    return 'GBP'
  }
  // Switzerland -> CHF
  if (sym.endsWith('.SW') || sym.endsWith('.VX')) {
    return 'CHF'
  }
  // Japan -> JPY
  if (sym.endsWith('.T')) {
    return 'JPY'
  }
  // Canada -> CAD
  if (sym.endsWith('.TO') || sym.endsWith('.V')) {
    return 'CAD'
  }
  // Australia -> AUD
  if (sym.endsWith('.AX')) {
    return 'AUD'
  }
  // Crypto pairs ending with standard currency quote
  if (sym.endsWith('-EUR')) return 'EUR'
  if (sym.endsWith('-GBP')) return 'GBP'
  if (sym.endsWith('-USD') || sym.endsWith('-USDT')) return 'USD'

  // Standard international convention: instruments without exchange dot suffix (e.g. US equities) trade in USD
  return 'USD'
}

export const getAssetCurrencySymbol = (currency?: string) => {
  const c = (currency || '').trim().toUpperCase()
  if (c === 'EUR') return '€'
  if (c === 'GBP') return '£'
  if (c === 'USD') return '$'
  if (c === 'CHF') return 'CHF '
  if (c === 'JPY') return '¥'
  if (c === 'CAD') return 'CA$'
  if (c === 'AUD') return 'AU$'
  return c ? `${c} ` : '$'
}

interface SuggestedAsset {
  symbol: string
  name: string
  assetType?: string
  currency?: string
  currentPrice?: number
  priceChange24h?: number
}

interface NewsItem {
  id?: string
  headline: string
  summary?: string
  source?: string
  url?: string
  publishedAt?: string
  sentiment?: string
}

interface MarketDriver {
  title: string
  impact: string
  summary: string
}

interface WatchlistIntelligenceItem {
  symbol: string
  name: string
  currentPrice: number
  priceFormatted: string
  priceChange24h: number
  currency: string
  action: string
  actionBadge: string
  actionColor: 'emerald' | 'blue' | 'amber' | 'rose'
  entryZone: string
  fairValue: number
  fairValueFormatted: string
  marginOfSafetyPct: number
  thesis: string
  nextCatalyst: {
    title: string
    date: string
    impact: string
    description?: string
  }
}

export function AlertsPage() {
  const { formatBaseMoney } = useCurrencyStore()
  const { user } = useAuthStore()
  const { data: alerts, isLoading } = useAlerts()
  const { data: assets } = useAssets()
  const { data: watchlists } = useWatchlists()
  const safeAlerts = Array.isArray(alerts) ? alerts : []
  const safeAssets = Array.isArray(assets) ? assets : []
  const safeWatchlists = useMemo(() => (Array.isArray(watchlists) ? watchlists : []), [watchlists])
  const createAlert = useCreateAlert()
  const cancelAlert = useCancelAlert()
  const deleteAlert = useDeleteAlert()
  const [deletingAlertId, setDeletingAlertId] = useState<string | null>(null)

  // Top Tabs
  const [activeTab, setActiveTab] = useState<'ALERTS' | 'DAILY_DIGEST'>('ALERTS')

  // --- TAB 1: PRICE ALERTS STATE ---
  const [recipientEmail, setRecipientEmail] = useState(user?.email || '')
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [editEmailValue, setEditEmailValue] = useState(user?.email || '')
  const [isSavingEmail, setIsSavingEmail] = useState(false)
  const [emailSaveFeedback, setEmailSaveFeedback] = useState<string | null>(null)
  const [sendEmailNotification, setSendEmailNotification] = useState(true)

  const [isSendingVerification, setIsSendingVerification] = useState(false)
  const [verificationFeedback, setVerificationFeedback] = useState<string | null>(null)

  // Cloud Config modal
  const [showCloudModal, setShowCloudModal] = useState(false)

  // Inline Asset Search for Alerts
  const [assetSearchQuery, setAssetSearchQuery] = useState('')
  const [assetSuggestions, setAssetSuggestions] = useState<SuggestedAsset[]>([])
  const [isSearchingAsset, setIsSearchingAsset] = useState(false)
  const [isAssetDropdownOpen, setIsAssetDropdownOpen] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<SuggestedAsset | null>(null)
  const assetDropdownRef = useRef<HTMLDivElement>(null)

  const [condition, setCondition] = useState<AlertCondition>('ABOVE')
  const [targetPrice, setTargetPrice] = useState('')

  // Test Email Modal
  const [testEmailModal, setTestEmailModal] = useState<{
    isOpen: boolean
    subject: string
    recipient: string
    bodyHtml: string
    sentAt: string
  } | null>(null)

  // Trigger evaluation check state
  const [isEvaluatingNow, setIsEvaluatingNow] = useState(false)
  const [evaluateResult, setEvaluateResult] = useState<string | null>(null)

  const handleEvaluateNow = async () => {
    setIsEvaluatingNow(true)
    try {
      const res = await fetch('/api/assets/alerts/evaluate-now', { method: 'POST' })
      if (res.ok) {
        const json = await res.json()
        const data = json.data || {}
        setEvaluateResult(`Checked ${data.checked || 0} alerts (${data.triggered || 0} triggered)`)
        setTimeout(() => setEvaluateResult(null), 4000)
      }
    } catch (e) {
      console.error('Failed to evaluate alerts', e)
    } finally {
      setIsEvaluatingNow(false)
    }
  }

  // --- 24/7 GOOGLE CLOUD SENTINEL (ZERO-COST SURVEILLANCE) ---
  const [cloudWebhookUrl, setCloudWebhookUrl] = useState('')
  const [isCloudConfigured, setIsCloudConfigured] = useState(false)
  const [isSavingWebhook, setIsSavingWebhook] = useState(false)
  const [isSyncingCloud, setIsSyncingCloud] = useState(false)
  const [cloudSyncFeedback, setCloudSyncFeedback] = useState<string | null>(null)
  const [showScriptModal, setShowScriptModal] = useState(false)
  const [scriptCopied, setScriptCopied] = useState(false)

  // Fetch initial target email from backend
  useEffect(() => {
    fetch('/api/assets/alerts/target-email')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.email) {
          setRecipientEmail(data.email)
          setEditEmailValue(data.email)
        }
      })
      .catch(() => {})
  }, [])

  // Fetch cloud sentinel status
  useEffect(() => {
    fetch('/api/assets/alerts/cloud-sentinel-config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.webhookUrl) setCloudWebhookUrl(data.webhookUrl)
        if (data?.configured) setIsCloudConfigured(true)
        if (data?.recipientEmail && !recipientEmail) {
          setRecipientEmail(data.recipientEmail)
          setEditEmailValue(data.recipientEmail)
        }
      })
      .catch(() => {})
  }, [])

  const handleDeleteAlert = async (id: string) => {
    setDeletingAlertId(id)
    try {
      await deleteAlert.mutateAsync(id)
      fetch(`/api/assets/alerts/${id}`, { method: 'DELETE' }).catch(() => {})
    } catch (e) {
      console.error('Failed to delete alert', e)
    } finally {
      setDeletingAlertId(null)
    }
  }

  const handleSendVerificationEmail = async () => {
    const target = (editEmailValue || recipientEmail).trim()
    if (!target || !target.includes('@')) {
      setVerificationFeedback('Please enter a valid email address first.')
      return
    }
    setIsSendingVerification(true)
    setVerificationFeedback(null)
    try {
      const res = await fetch('/api/assets/alerts/send-test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: target,
          symbol: selectedAsset?.symbol || safeAssets[0]?.symbol || 'ASSET',
          assetName: selectedAsset?.name || safeAssets[0]?.name || 'Portfolio Asset',
          condition: condition,
          targetPrice: targetPrice ? parseFloat(targetPrice) : (selectedAsset?.currentPrice ?? 100.0),
          currency: resolveAssetCurrency(selectedAsset?.symbol || safeAssets[0]?.symbol || 'USD', selectedAsset?.currency || safeAssets[0]?.currency),
        }),
      })
      const json = await res.json()
      if (res.ok && json.delivered) {
        setVerificationFeedback(`Email sent via ${json.provider}! Check your inbox (${target}).`)
      } else if (res.ok && !json.delivered) {
        setVerificationFeedback(`Dispatched, but check provider: ${json.provider || 'No provider response'}`)
      } else {
        setVerificationFeedback(`Failed: ${json.detail || 'Error'}`)
      }
    } catch (e: any) {
      setVerificationFeedback(`Error: ${e.message || e}`)
    } finally {
      setIsSendingVerification(false)
    }
  }

  const handleSaveTargetEmail = async () => {
    if (!editEmailValue.trim() || !editEmailValue.includes('@')) return
    setIsSavingEmail(true)
    try {
      const res = await fetch('/api/assets/alerts/target-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: editEmailValue.trim() }),
      })
      if (res.ok) {
        const json = await res.json()
        setRecipientEmail(json.email)
        setEmailSaveFeedback(json.cloudSynced ? 'Saved permanently & synced with Cloud Sentinel!' : 'Saved permanently!')
        setTimeout(() => {
          setEmailSaveFeedback(null)
          setShowEmailModal(false)
        }, 1200)
      }
    } catch (e) {
      console.error('Failed to save target email', e)
    } finally {
      setIsSavingEmail(false)
    }
  }

  const handleSaveWebhook = async () => {
    setIsSavingWebhook(true)
    try {
      const res = await fetch('/api/assets/alerts/cloud-sentinel-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: cloudWebhookUrl }),
      })
      if (res.ok) {
        setIsCloudConfigured(Boolean(cloudWebhookUrl.trim()))
        setCloudSyncFeedback('Cloud Sentinel Webhook successfully configured!')
        setTimeout(() => setCloudSyncFeedback(null), 4000)
      }
    } catch (e) {
      console.error('Failed to save webhook config', e)
    } finally {
      setIsSavingWebhook(false)
    }
  }

  const handleSyncCloud = async () => {
    setIsSyncingCloud(true)
    try {
      const res = await fetch('/api/assets/alerts/sync-cloud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: cloudWebhookUrl || undefined }),
      })
      if (res.ok) {
        const json = await res.json()
        const count = json?.data?.count || 0
        setCloudSyncFeedback(`Synced ${count} active alerts to 24/7 Google Cloud Sentinel!`)
        setTimeout(() => setCloudSyncFeedback(null), 5000)
      } else {
        const err = await res.json()
        setCloudSyncFeedback(`Sync failed: ${err.detail || 'Check Webhook URL'}`)
        setTimeout(() => setCloudSyncFeedback(null), 5000)
      }
    } catch (e) {
      setCloudSyncFeedback('Network error while connecting to Cloud Sentinel')
      setTimeout(() => setCloudSyncFeedback(null), 4000)
    } finally {
      setIsSyncingCloud(false)
    }
  }

  const handleCopyScript = () => {
    navigator.clipboard.writeText(GOOGLE_SENTINEL_SCRIPT_CODE)
    setScriptCopied(true)
    setTimeout(() => setScriptCopied(false), 2500)
  }

  // --- TAB 2: DAILY BRIEFING STATE ---
  const [digestEmail, setDigestEmail] = useState(user?.email || '')
  const [digestFrequency, setDigestFrequency] = useState('Both Sessions (08:30 & 17:30 CET)')
  const [includeHoldings, setIncludeHoldings] = useState(true)
  const [includeEarnings, setIncludeEarnings] = useState(true)
  const [includeMacro, setIncludeMacro] = useState(true)
  const [isBriefingSaved, setIsBriefingSaved] = useState(false)
  const [isSendingTestBriefing, setIsSendingTestBriefing] = useState(false)
  const [selectedWatchlistId, setSelectedWatchlistId] = useState<string>('ALL')

  // Compute active target symbols from selected watchlist, watchlists, alerts or assets dynamically
  const activeWatchlistSymbols = useMemo(() => {
    if (selectedWatchlistId === 'ALL') {
      const syms = Array.from(new Set(safeWatchlists.flatMap((w) => (w.items || []).map((i) => i.symbol)))).filter(Boolean)
      if (syms.length) return syms
    } else {
      const match = safeWatchlists.find((w) => w.id === selectedWatchlistId)
      const syms = (match?.items || []).map((i) => i.symbol).filter(Boolean)
      if (syms.length) return syms
    }
    const alertSymbols = Array.from(new Set(safeAlerts.map((a) => a.assetSymbol))).filter(Boolean)
    if (alertSymbols.length) return alertSymbols
    return safeAssets.map((a) => a.symbol).filter(Boolean).slice(0, 10)
  }, [safeWatchlists, selectedWatchlistId, safeAlerts, safeAssets])

  // Live Daily News & Briefing Data
  const [briefingData, setBriefingData] = useState<{
    date: string
    headlineSummary: string
    watchlistIntelligence?: WatchlistIntelligenceItem[]
    topShortNews: NewsItem[]
    keyDrivers: MarketDriver[]
  } | null>(null)
  const [loadingBriefing, setLoadingBriefing] = useState(false)

  useEffect(() => {
    if (user?.email) {
      if (!recipientEmail) setRecipientEmail(user.email)
      if (!digestEmail) setDigestEmail(user.email)
    }
  }, [user?.email])

  // Debounced asset search in Alert creation
  useEffect(() => {
    if (!assetSearchQuery.trim()) {
      setAssetSuggestions([])
      setIsAssetDropdownOpen(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsSearchingAsset(true)
      try {
        const res = await fetch(`/api/assets/search?q=${encodeURIComponent(assetSearchQuery.trim())}`)
        if (res.ok) {
          const json = await res.json()
          setAssetSuggestions(json?.data || [])
          setIsAssetDropdownOpen(true)
        }
      } catch {
        setAssetSuggestions([])
      } finally {
        setIsSearchingAsset(false)
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [assetSearchQuery])

  // Click outside to close asset dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (assetDropdownRef.current && !assetDropdownRef.current.contains(e.target as Node)) {
        setIsAssetDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch Daily Briefing Data dynamically matching active watchlist symbols
  useEffect(() => {
    let isMounted = true
    async function loadBriefing() {
      setLoadingBriefing(true)
      try {
        const query = activeWatchlistSymbols.join(',')
        const res = await fetch(`/api/assets/daily-briefing?symbols=${encodeURIComponent(query)}`)
        if (res.ok && isMounted) {
          const json = await res.json()
          setBriefingData(json)
        }
      } catch (e) {
        console.error('Failed to load daily briefing', e)
      } finally {
        if (isMounted) setLoadingBriefing(false)
      }
    }
    loadBriefing()
    return () => {
      isMounted = false
    }
  }, [activeWatchlistSymbols])

  const activeCount = useMemo(() => safeAlerts.filter((a) => a.status === 'ACTIVE').length, [safeAlerts])
  const triggeredCount = useMemo(() => safeAlerts.filter((a) => a.status === 'TRIGGERED').length, [safeAlerts])

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  // Arm new price alert
  const handleCreate = () => {
    if ((!selectedAsset && !assetSearchQuery.trim()) || !targetPrice) return

    const sym = (selectedAsset?.symbol || assetSearchQuery).trim()
    if (!sym) return

    // Find if the asset exists in safeAssets by symbol or ID
    const matched = safeAssets.find(
      (a) =>
        a.symbol.toUpperCase() === sym.toUpperCase() ||
        a.id.toLowerCase() === sym.toLowerCase()
    )

    const payload = matched
      ? { assetId: matched.id, condition, targetPrice: Number(targetPrice) }
      : {
          symbol: sym.toUpperCase(),
          name: selectedAsset?.name || sym.toUpperCase(),
          assetType: selectedAsset?.assetType || 'STOCK',
          currency: selectedAsset?.currency || resolveAssetCurrency(sym),
          currentPrice: selectedAsset?.currentPrice || Number(targetPrice),
          condition,
          targetPrice: Number(targetPrice),
        }

    createAlert.mutate(
      payload,
      {
        onSuccess: () => {
          setTargetPrice('')
          setSelectedAsset(null)
          setAssetSearchQuery('')
          if (isCloudConfigured) {
            setTimeout(handleSyncCloud, 500)
          }
        },
      }
    )
  }

  // Trigger test price alert email
  const handleTestAlertEmail = (symbol: string, threshold: number, cond: string) => {
    const nowStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' UTC'
    const currSym = getAssetCurrencySymbol(resolveAssetCurrency(symbol))
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #18181b;">
        <p style="font-size: 13px; margin: 0 0 12px 0;">Your real-time price trigger has been reached:</p>
        <div style="background: #f4f4f5; border-left: 4px solid #10b981; padding: 12px 16px; border-radius: 6px; margin-bottom: 16px;">
          <strong style="font-size: 16px; color: #09090b;">${symbol} &bull; ${cond === 'ABOVE' ? 'Crossed Above (≥)' : 'Dropped Below (≤)'} ${currSym}${threshold.toFixed(2)}</strong>
          <div style="font-size: 12px; color: #52525b; margin-top: 4px;">Triggered at ${nowStr} &bull; WealthOS Sub-Second Monitoring Engine</div>
        </div>
        <p style="font-size: 12px; color: #71717a;">Action Required: Review portfolio allocation or rebalance accordingly.</p>
      </div>
    `
    setTestEmailModal({
      isOpen: true,
      subject: `[WealthOS Alert] ${symbol} Target Price Triggered (${cond === 'ABOVE' ? '≥' : '≤'} ${currSym}${threshold.toFixed(2)})`,
      recipient: recipientEmail,
      bodyHtml: html,
      sentAt: nowStr,
    })
  }

  // Trigger test daily digest briefing email
  const handleSendTestDailyBriefing = async () => {
    setIsSendingTestBriefing(true)
    try {
      const res = await fetch('/api/assets/daily-briefing/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: digestEmail,
          frequency: digestFrequency,
          symbols: activeWatchlistSymbols.join(','),
        }),
      })
      if (res.ok) {
        const json = await res.json()
        setTestEmailModal({
          isOpen: true,
          subject: `[WealthOS Daily Briefing] Executive Market Wrap & Watchlist Action Plan (${activeWatchlistSymbols.length} Assets)`,
          recipient: digestEmail,
          bodyHtml: json.emailPreviewHtml || '<p>Daily briefing dispatched.</p>',
          sentAt: json.dispatchedAt || 'Now',
        })
      }
    } catch (e) {
      console.error('Failed to send test briefing', e)
    } finally {
      setIsSendingTestBriefing(false)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Subtabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-zinc-900 px-2 py-0.5 text-[10px] font-bold text-white font-mono">
              SURVEILLANCE & BRIEFINGS
            </span>
            <span className="text-xs text-zinc-400 font-medium">Real-Time Alerts & Daily Intelligence</span>
          </div>
          <h1 className="text-2xl font-black text-zinc-900 mt-1 tracking-tight">
            Alerts & Market Briefings
          </h1>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-100 border border-zinc-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('ALERTS')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'ALERTS'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Bell className="h-3.5 w-3.5" />
            <span>Price Alerts</span>
            <span className="rounded-full bg-zinc-200 px-1.5 py-0.2 text-[10px] font-mono">
              {activeCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('DAILY_DIGEST')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'DAILY_DIGEST'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Mail className="h-3.5 w-3.5" />
            <span>Daily Market Digest</span>
            <span className="rounded-full bg-emerald-100 text-emerald-800 px-1.5 py-0.2 text-[10px] font-mono">
              Daily
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PRICE & VOLATILITY ALERTS */}
      {/* ========================================================================= */}
      {activeTab === 'ALERTS' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                Active Surveillance
              </span>
              <p className="mt-2 text-2xl font-black font-mono text-zinc-900 tracking-tight">
                {activeCount}
              </p>
              <span className="text-[11px] text-zinc-400 mt-1 block">Live price monitors running</span>
            </div>

            <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/30 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                  Triggered Thresholds
                </span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="mt-2 text-2xl font-black font-mono text-emerald-950 tracking-tight">
                {triggeredCount}
              </p>
              <span className="text-[11px] text-emerald-700 mt-1 block">Target conditions met</span>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                  Target Email Recipient
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditEmailValue(recipientEmail)
                    setShowEmailModal(true)
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                >
                  <Pencil className="h-3 w-3" /> Edit
                </button>
              </div>
              <p className="mt-2 text-sm font-bold font-mono text-zinc-900 tracking-tight truncate" title={recipientEmail}>
                {recipientEmail || 'None configured'}
              </p>
              <span className="text-[11px] text-emerald-700 font-medium mt-1 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> Direct email dispatch armed
              </span>
            </div>
          </div>

          {/* Institutional 24/7 Surveillance Status Bar (Clean Light Card Aesthetic) */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
                <ShieldCheck className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-zinc-900">
                    24/7 Autonomous Cloud Surveillance Active
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[9px] font-mono font-bold">
                    CLOUD SENTINEL
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 text-[9px] font-mono font-bold">
                    <Cloud className="h-2.5 w-2.5" /> Google Cloud Sentinel Armed
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
                  Autonomous 24/7 Google Cloud Sentinel &bull; Operates continuously in the background
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
              {evaluateResult && (
                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  {evaluateResult}
                </span>
              )}
              <button
                type="button"
                onClick={handleEvaluateNow}
                disabled={isEvaluatingNow}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 px-3 py-1.5 text-xs font-bold text-zinc-800 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isEvaluatingNow ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5 text-amber-500" />}
                <span>Check Now</span>
              </button>
              <button
                type="button"
                onClick={() => setShowCloudModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 px-3.5 py-1.5 text-xs font-bold text-indigo-700 shadow-xs transition-colors cursor-pointer"
              >
                <Mail className="h-3.5 w-3.5 text-indigo-600" />
                <span>Email &amp; Cloud Settings</span>
              </button>
            </div>
          </div>

          {/* Setup Alert Card */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-zinc-800" />
                <h2 className="text-sm font-bold text-zinc-900">Arm Target Price Alert</h2>
              </div>
              <span className="text-[11px] text-zinc-400 font-medium">
                Autonomous real-time price monitoring
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {/* Asset Autocomplete Input */}
              <div ref={assetDropdownRef} className="relative sm:col-span-1">
                <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">
                  Ticker / Asset
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={selectedAsset ? selectedAsset.symbol : "Search (e.g. WQTM, SOL, VUAA)..."}
                    value={assetSearchQuery}
                    onChange={(e) => {
                      setAssetSearchQuery(e.target.value)
                      setSelectedAsset(null)
                    }}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2 text-xs font-bold text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                  />
                  {isSearchingAsset && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-zinc-400" />
                  )}
                </div>

                {/* Inline Suggestions Dropdown */}
                {isAssetDropdownOpen && assetSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-xl max-h-56 overflow-y-auto space-y-1">
                    {assetSuggestions.map((item) => (
                      <button
                        key={item.symbol}
                        type="button"
                        onClick={() => {
                          setSelectedAsset(item)
                          setAssetSearchQuery(item.symbol)
                          setIsAssetDropdownOpen(false)
                          if (item.currentPrice) {
                            setTargetPrice(item.currentPrice.toFixed(2))
                          }
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-zinc-50 transition-colors text-left text-xs cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-mono text-zinc-900">{item.symbol}</span>
                          <span className="text-[10px] text-zinc-500 truncate max-w-32">{item.name}</span>
                        </div>
                        <span className="font-mono font-extrabold text-zinc-900">
                          {getAssetCurrencySymbol(resolveAssetCurrency(item.symbol, item.currency))}
                          {(item.currentPrice ?? 0).toFixed(2)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Condition */}
              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">
                  Condition Trigger
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as AlertCondition)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/80 px-3.5 py-2 text-xs font-semibold text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                >
                  <option value="ABOVE">Price Rises Above (≥)</option>
                  <option value="BELOW">Price Drops Below (≤)</option>
                </select>
              </div>

              {/* Target Price */}
              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">
                  Target Price ({getAssetCurrencySymbol(resolveAssetCurrency(selectedAsset?.symbol || assetSearchQuery, selectedAsset?.currency))})
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder={`Target threshold (${getAssetCurrencySymbol(resolveAssetCurrency(selectedAsset?.symbol || assetSearchQuery, selectedAsset?.currency))})...`}
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/80 px-3.5 py-2 text-xs font-mono font-medium text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>

              {/* Activate Button */}
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={createAlert.isPending || (!selectedAsset && !assetSearchQuery) || !targetPrice}
                  className="w-full rounded-xl bg-zinc-900 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-zinc-800 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  {createAlert.isPending ? 'Arming Alert...' : 'Activate Alert'}
                </button>
              </div>
            </div>
          </div>

          {/* Active Alerts Table */}
          <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-xs">
            <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Active Price Surveillance Watch
              </h3>
              <span className="text-xs font-mono font-medium text-zinc-400">
                {safeAlerts.length} Configured Alerts
              </span>
            </div>

            {safeAlerts.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Bell className="h-8 w-8 text-zinc-300 mx-auto" />
                <p className="text-xs font-bold text-zinc-700">No active price alerts armed</p>
                <p className="text-[11px] text-zinc-400">
                  Search an asset above (e.g. WQTM, SOL, VUAA) and set a target price to arm sub-second triggers.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-zinc-50 text-[10px] font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-200">
                    <tr>
                      <th className="py-3 px-6">Asset Ticker</th>
                      <th className="py-3 px-6">Trigger Condition</th>
                      <th className="py-3 px-6">Target Threshold</th>
                      <th className="py-3 px-6">Notification Target</th>
                      <th className="py-3 px-6">Status</th>
                      <th className="py-3 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {safeAlerts.map((alert) => {
                      const displaySymbol = (alert as any).symbol || alert.assetSymbol || alert.assetId
                      const assetCurr = resolveAssetCurrency(displaySymbol, (alert as any).currency)
                      const currSym = getAssetCurrencySymbol(assetCurr)

                      return (
                        <tr key={alert.id} className="hover:bg-zinc-50/70 transition-colors">
                          <td className="py-3.5 px-6 font-bold font-mono text-zinc-900">
                            {displaySymbol}
                          </td>
                          <td className="py-3.5 px-6 font-medium text-zinc-700">
                            {alert.condition === 'ABOVE' ? 'Crosses Above (≥)' : 'Drops Below (≤)'}
                          </td>
                          <td className="py-3.5 px-6 font-mono font-extrabold text-zinc-900">
                            {currSym}{alert.targetPrice?.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-6 font-mono text-zinc-600">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3 text-zinc-400" />
                              <span>{recipientEmail || 'Default Account'}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-6">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold ${
                                alert.status === 'ACTIVE'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : alert.status === 'TRIGGERED'
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : 'bg-zinc-100 text-zinc-600'
                              }`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${alert.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : (alert.status === 'TRIGGERED' ? 'bg-amber-500' : 'bg-zinc-400')}`}></span>
                              {alert.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-6 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleTestAlertEmail(
                                  displaySymbol,
                                  alert.targetPrice,
                                  alert.condition
                                )
                              }
                              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[11px] font-bold text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 transition-colors cursor-pointer"
                              title="Preview the exact email layout that will be sent automatically when this price is reached"
                            >
                              <Eye className="h-3 w-3 text-zinc-500" /> Preview
                            </button>
                            {alert.status === 'ACTIVE' && (
                              <button
                                type="button"
                                onClick={() => cancelAlert.mutate(alert.id)}
                                className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 border border-zinc-200 px-2 py-1 text-[11px] font-bold text-zinc-700 hover:bg-zinc-200 transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteAlert(alert.id)}
                              disabled={deletingAlertId === alert.id}
                              className="inline-flex items-center gap-1 rounded-lg bg-rose-50 border border-rose-200/60 px-2 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition-colors cursor-pointer disabled:opacity-50"
                              title="Delete this price alert permanently"
                            >
                              {deletingAlertId === alert.id ? (
                                <Loader2 className="h-3 w-3 animate-spin text-rose-500" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                              <span>Delete</span>
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

      {/* ========================================================================= */}
      {/* TAB 2: DAILY MARKET BRIEFING & EARNINGS DIGEST */}
      {/* ========================================================================= */}
      {activeTab === 'DAILY_DIGEST' && (
        <div className="space-y-6">
          {/* Automated Daily Email Briefing Subscription Card */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900">
                    Daily Institutional Briefing & Market Digest
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Automated dynamic emails with today's key headlines, earnings results, and portfolio updates
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-mono font-bold text-emerald-800">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Subscription Active
                </span>
              </div>
            </div>

            {/* Email Dispatch Configuration Form */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Target Email */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                  Recipient Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                  <input
                    type="email"
                    value={digestEmail}
                    onChange={(e) => setDigestEmail(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-3 py-2 text-xs font-mono font-bold text-zinc-900 focus:bg-white focus:border-zinc-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* Delivery Frequency */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                  Delivery Schedule
                </label>
                <select
                  value={digestFrequency}
                  onChange={(e) => setDigestFrequency(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-bold text-zinc-900 focus:bg-white focus:border-zinc-900 focus:outline-none"
                >
                  <option value="Both Sessions (08:30 & 17:30 CET)">Both Sessions (08:30 Market Open & 17:30 Wrap)</option>
                  <option value="Daily Pre-Market (08:30 CET)">Daily Pre-Market Morning Outlook (08:30 CET)</option>
                  <option value="Daily Post-Market (17:30 CET)">Daily Post-Market Executive Wrap (17:30 CET)</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsBriefingSaved(true)
                    setTimeout(() => setIsBriefingSaved(false), 3000)
                  }}
                  className="flex-1 rounded-xl bg-zinc-900 py-2 text-xs font-bold text-white hover:bg-zinc-800 transition-colors shadow-xs"
                >
                  {isBriefingSaved ? 'Preferences Saved ✓' : 'Save Preferences'}
                </button>

                <button
                  type="button"
                  onClick={handleSendTestDailyBriefing}
                  disabled={isSendingTestBriefing}
                  className="flex items-center gap-1.5 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-50 px-3 py-2 text-xs font-bold text-zinc-800 transition-colors shadow-xs cursor-pointer"
                >
                  {isSendingTestBriefing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5 text-zinc-500" />
                  )}
                  <span>Send Test Email Now</span>
                </button>
              </div>
            </div>

            {/* Content Filters */}
            <div className="border-t border-zinc-100 pt-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                Included Digest Modules
              </span>
              <div className="flex flex-wrap gap-4 text-xs font-medium text-zinc-700">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeHoldings}
                    onChange={(e) => setIncludeHoldings(e.target.checked)}
                    className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                  />
                  <span>Portfolio Holdings Performance</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeEarnings}
                    onChange={(e) => setIncludeEarnings(e.target.checked)}
                    className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                  />
                  <span>Corporate Earnings Surprises & Catalysts</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeMacro}
                    onChange={(e) => setIncludeMacro(e.target.checked)}
                    className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                  />
                  <span>Central Bank & Macro Indicators (ECB, Fed)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Personalized Watchlist Action Plan & Institutional Guidance */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900">
                    Watchlist Action Plan & Institutional Guidance
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Per-asset actionable recommendations, DCF fair value targets, optimal buy zones, and upcoming catalysts
                  </p>
                </div>
              </div>

              {/* Watchlist Filter Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Source Watchlist:</span>
                <select
                  value={selectedWatchlistId}
                  onChange={(e) => setSelectedWatchlistId(e.target.value)}
                  className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-bold text-zinc-800 focus:bg-white focus:border-zinc-900 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Watchlists ({activeWatchlistSymbols.length} Assets)</option>
                  {safeWatchlists.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({(w.items || []).length} items)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loadingBriefing ? (
              <div className="py-12 flex justify-center">
                <LoadingSpinner />
              </div>
            ) : !briefingData?.watchlistIntelligence || briefingData.watchlistIntelligence.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-400">
                No watchlist assets found. Add items to your Watchlist to receive personalized action guidance.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {briefingData.watchlistIntelligence.map((item) => {
                  const isPositive = item.priceChange24h >= 0
                  return (
                    <div
                      key={item.symbol}
                      className="rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-4 hover:border-zinc-300 transition-all hover:shadow-xs flex flex-col justify-between space-y-3"
                    >
                      {/* Top Header: Symbol, Name, Price & 24h Change */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-black text-zinc-900">{item.symbol}</span>
                            <span
                              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-mono font-bold uppercase ${
                                item.actionBadge === 'ACCUMULATE'
                                  ? 'bg-emerald-100/70 text-emerald-800 border border-emerald-300/80'
                                  : item.actionBadge === 'TRIM'
                                  ? 'bg-rose-100/70 text-rose-800 border border-rose-300/80'
                                  : item.actionBadge === 'WATCH'
                                  ? 'bg-amber-100/70 text-amber-800 border border-amber-300/80'
                                  : 'bg-blue-100/70 text-blue-800 border border-blue-300/80'
                              }`}
                            >
                              {item.actionBadge}
                            </span>
                          </div>
                          <div className="text-xs text-zinc-500 font-medium truncate max-w-[220px] mt-0.5">
                            {item.name}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-mono text-sm font-bold text-zinc-900">{item.priceFormatted}</div>
                          <div
                            className={`inline-flex items-center gap-0.5 text-xs font-mono font-bold ${
                              isPositive ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            <span>{isPositive ? `+${item.priceChange24h.toFixed(2)}%` : `${item.priceChange24h.toFixed(2)}%`}</span>
                          </div>
                        </div>
                      </div>

                      {/* Middle Target & Valuation Metrics */}
                      <div className="grid grid-cols-2 gap-2 rounded-lg bg-white p-2.5 border border-zinc-200/60 text-xs">
                        <div>
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Target Entry Zone</span>
                          <span className="font-mono font-bold text-zinc-800 text-[11px] leading-tight block mt-0.5">
                            {item.entryZone}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">DCF Fair Value</span>
                          <span className="font-mono font-bold text-zinc-800 text-[11px] leading-tight block mt-0.5">
                            {item.fairValueFormatted}{' '}
                            <span
                              className={`text-[10px] ${
                                item.marginOfSafetyPct >= 0 ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              ({item.marginOfSafetyPct >= 0 ? `+${item.marginOfSafetyPct}%` : `${item.marginOfSafetyPct}%`})
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Institutional Thesis / Recommendation */}
                      <div className="text-xs text-zinc-700 bg-zinc-100/60 p-2.5 rounded-lg border border-zinc-200/50 leading-relaxed font-medium">
                        <span className="font-bold text-zinc-900 mr-1">Action Thesis:</span>
                        {item.thesis}
                      </div>

                      {/* Key Upcoming Catalyst */}
                      {item.nextCatalyst && (
                        <div className="flex items-start gap-1.5 text-[11px] text-blue-700 bg-blue-50/60 px-2.5 py-1.5 rounded-lg border border-blue-100/80">
                          <Calendar className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />
                          <div className="leading-tight">
                            <span className="font-bold">{item.nextCatalyst.title}</span> &bull;{' '}
                            <span className="font-mono">{item.nextCatalyst.date}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Today's Short News & Market Digest Feed */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">
                  Today's Curated Short Market News & Headlines
                </h3>
                <p className="text-xs text-zinc-500">
                  Real-time intelligence feed included dynamically in your daily email briefing
                </p>
              </div>
              <span className="text-[11px] font-mono text-zinc-400">
                {briefingData?.date || 'Live Feed'}
              </span>
            </div>

            {loadingBriefing ? (
              <div className="py-12 flex justify-center">
                <LoadingSpinner />
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {briefingData?.topShortNews?.map((item, idx) => (
                  <div key={idx} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1 max-w-2xl">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-md px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase ${
                            item.sentiment === 'BULLISH'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : item.sentiment === 'BEARISH'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-zinc-100 text-zinc-600'
                          }`}
                        >
                          {item.sentiment || 'NEUTRAL'}
                        </span>
                        <span className="text-[11px] font-mono text-zinc-400">{item.source || 'Market Wire'}</span>
                        <span className="text-[11px] font-mono text-zinc-400">&bull; {item.publishedAt}</span>
                      </div>
                      <h4 className="text-xs font-bold text-zinc-900 leading-snug">{item.headline}</h4>
                      {item.summary && (
                        <p className="text-[11px] text-zinc-500 line-clamp-2">{item.summary}</p>
                      )}
                    </div>

                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 whitespace-nowrap self-start sm:self-center"
                      >
                        <span>Full Article</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Key Drivers & Catalysts Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {briefingData?.keyDrivers?.map((driver, idx) => (
              <div key={idx} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Macro Driver #{idx + 1}
                  </span>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      driver.impact === 'BULLISH'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-zinc-100 text-zinc-700'
                    }`}
                  >
                    {driver.impact}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-zinc-900">{driver.title}</h4>
                <p className="text-[11px] text-zinc-500 leading-relaxed">{driver.summary}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TEST EMAIL DISPATCH PREVIEW MODAL */}
      {/* ========================================================================= */}
      {testEmailModal?.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Send className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900">Email Dispatched Successfully</h3>
                  <p className="text-xs text-zinc-500">Live preview of the message sent to your inbox</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTestEmailModal(null)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Email Metadata */}
            <div className="rounded-xl bg-zinc-50 p-3 border border-zinc-100 text-xs space-y-1 font-mono">
              <div className="flex justify-between">
                <span className="text-zinc-400 font-bold">TO:</span>
                <span className="text-zinc-900 font-bold">{testEmailModal.recipient}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400 font-bold">SUBJECT:</span>
                <span className="text-zinc-900 font-bold">{testEmailModal.subject}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400 font-bold">DISPATCHED:</span>
                <span className="text-zinc-600">{testEmailModal.sentAt}</span>
              </div>
            </div>

            {/* Rendered HTML Email Content */}
            <div className="flex-1 overflow-y-auto border border-zinc-100 rounded-xl p-4 bg-white">
              <div dangerouslySetInnerHTML={{ __html: testEmailModal.bodyHtml }} />
            </div>

            {/* Close Button */}
            <div className="pt-2 border-t border-zinc-100 flex justify-end">
              <button
                type="button"
                onClick={() => setTestEmailModal(null)}
                className="rounded-xl bg-zinc-900 px-5 py-2 text-xs font-bold text-white hover:bg-zinc-800 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT TARGET EMAIL MODAL */}
      {/* ========================================================================= */}
      {showEmailModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900">
                    Target Alert Recipient
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Saves permanently across restarts &amp; cloud triggers
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowEmailModal(false)
                  setEmailSaveFeedback(null)
                }}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                <input
                  type="email"
                  placeholder="e.g. user@example.com"
                  value={editEmailValue}
                  onChange={(e) => setEditEmailValue(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-3 py-2 text-xs font-mono font-bold text-zinc-900 focus:bg-white focus:border-zinc-900 focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-zinc-500">
                All price target triggers and 24/7 Cloud Sentinel notifications will be delivered to this address automatically.
              </p>
            </div>

            {emailSaveFeedback && (
              <div className="text-xs font-medium text-emerald-800 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{emailSaveFeedback}</span>
              </div>
            )}

            <div className="pt-2 border-t border-zinc-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowEmailModal(false)
                  setEmailSaveFeedback(null)
                }}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={handleSaveTargetEmail}
                disabled={isSavingEmail || !editEmailValue.trim() || !editEmailValue.includes('@')}
                className="rounded-xl bg-zinc-900 px-5 py-2 text-xs font-bold text-white hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
              >
                {isSavingEmail ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                <span>Save Setup</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* EMAIL & 24/7 CLOUD SURVEILLANCE SETTINGS MODAL */}
      {/* ========================================================================= */}
      {showCloudModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900">
                    Email Dispatch &amp; Cloud Surveillance Engine
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-zinc-500">Real-Time Cloud Sentinel &bull; Automated Email Dispatch</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCloudModal(false)
                  setCloudSyncFeedback(null)
                  setVerificationFeedback(null)
                }}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Section 1: Dynamic Recipient Email */}
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 block">
                  1. Dynamic Alert Recipient Email
                </label>
                <span className="text-[10px] text-zinc-400">Where alerts are delivered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                  <input
                    type="email"
                    placeholder="Enter your personal email..."
                    value={editEmailValue}
                    onChange={(e) => setEditEmailValue(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 py-2 text-xs font-mono font-bold text-zinc-900 focus:border-zinc-900 focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSaveTargetEmail}
                  disabled={isSavingEmail || !editEmailValue.trim() || !editEmailValue.includes('@')}
                  className="rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer disabled:opacity-40"
                >
                  {isSavingEmail ? 'Saving...' : 'Save'}
                </button>
              </div>
              {emailSaveFeedback && (
                <span className="text-[11px] text-emerald-700 font-medium block">
                  {emailSaveFeedback}
                </span>
              )}
            </div>

            {/* Section 2: 24/7 Google Cloud Sentinel Webhook */}
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-900">
                    2. 24/7 Google Cloud Sentinel Webhook
                  </span>
                  <span className="inline-flex items-center rounded-full bg-indigo-100 text-indigo-800 px-2 py-0.5 text-[9px] font-mono font-bold">
                    Autonomous Webhook
                  </span>
                </div>
                {isCloudConfigured && (
                  <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-100/70 border border-indigo-300 px-2 py-0.5 rounded-md">
                    ✓ Armed 24/7
                  </span>
                )}
              </div>
              <p className="text-[11px] text-indigo-900/80 leading-relaxed">
                Monitors your target prices continuously on Google Cloud. Delivers instant HTML emails directly to your Gmail even when this computer is powered off.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={cloudWebhookUrl}
                  onChange={(e) => setCloudWebhookUrl(e.target.value)}
                  className="flex-1 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-mono text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <button
                  type="button"
                  onClick={handleSaveWebhook}
                  disabled={isSavingWebhook || !cloudWebhookUrl.trim()}
                  className="rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer disabled:opacity-40"
                >
                  {isSavingWebhook ? 'Saving...' : 'Save URL'}
                </button>
              </div>
              <div className="flex items-center justify-between pt-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    setShowCloudModal(false)
                    setShowScriptModal(true)
                  }}
                  className="text-xs text-indigo-700 hover:text-indigo-900 font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <FileText className="h-3.5 w-3.5" /> View GS Script Code &amp; 5-Min Trigger Guide
                </button>
                <button
                  type="button"
                  onClick={handleSyncCloud}
                  disabled={isSyncingCloud}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                >
                  {isSyncingCloud ? <Loader2 className="h-3 w-3 animate-spin" /> : <Cloud className="h-3 w-3" />}
                  <span>Sync Alerts to Cloud</span>
                </button>
              </div>
              {cloudSyncFeedback && (
                <span className="text-[11px] text-indigo-800 font-medium block mt-1">
                  {cloudSyncFeedback}
                </span>
              )}
            </div>

            {/* Section 3: Instant Test Verification Button */}
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-zinc-800 block">
                  Verify Cloud Email Delivery Now
                </span>
                <span className="text-[11px] text-zinc-500 block">
                  Dispatches an authentic test alert to <strong>{editEmailValue || recipientEmail || 'your email'}</strong> via Google Sentinel
                </span>
              </div>
              <button
                type="button"
                onClick={handleSendVerificationEmail}
                disabled={isSendingVerification || (!editEmailValue && !recipientEmail)}
                className="rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-2 text-xs font-bold transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-1.5 shrink-0"
              >
                {isSendingVerification ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                <span>Send Test Verification Email</span>
              </button>
            </div>
            {verificationFeedback && (
              <div className="text-xs font-bold p-2.5 rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{verificationFeedback}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 24/7 GOOGLE CLOUD SENTINEL SETUP & CODE MODAL */}
      {/* ========================================================================= */}
      {showScriptModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Cloud className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900">
                    24/7 Google Cloud Sentinel Setup
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-zinc-500">Autonomous Serverless Cloud Sentinel Script</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowScriptModal(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="rounded-xl bg-zinc-50 p-4 border border-zinc-200/80 text-xs space-y-2">
              <div className="font-bold text-zinc-900 uppercase tracking-wider text-[10px]">
                3 Simple Steps to 24/7 Zero-Cost Surveillance
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-zinc-700 leading-relaxed">
                <li>
                  Open <a href="https://script.google.com" target="_blank" rel="noreferrer" className="text-indigo-600 font-bold underline inline-flex items-center gap-0.5">script.google.com <ExternalLink className="h-3 w-3" /></a> and click <strong>New Project</strong>.
                </li>
                <li>
                  Copy the code below, replace all contents in the editor, and click <strong>Save</strong>.
                </li>
                <li>
                  Click <strong>Deploy &gt; New deployment &gt; Web app</strong> (Set: <em>Execute as: Me</em>, <em>Who has access: Anyone</em>), copy your Web App URL, and paste it into the <strong>Google Webhook URL</strong> field on WealthOS.
                </li>
                <li>
                  Click the <strong>Triggers</strong> icon (clock) on the left &gt; <strong>Add Trigger</strong> &gt; Function: <code>checkPriceAlerts</code> &gt; <em>Time-driven &gt; Minutes timer &gt; Every 5 minutes</em>.
                </li>
              </ol>
            </div>

            {/* Code Header & Copy Button */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-bold text-zinc-700 font-mono">google_cloud_sentinel.js</span>
              <button
                type="button"
                onClick={handleCopyScript}
                className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-zinc-800 transition-colors cursor-pointer shadow-xs"
              >
                {scriptCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{scriptCopied ? 'Copied to Clipboard!' : 'Copy Entire Code'}</span>
              </button>
            </div>

            {/* Code Block Container */}
            <div className="flex-1 overflow-y-auto border border-zinc-200 rounded-xl p-3.5 bg-zinc-950 font-mono text-[11px] text-zinc-300 leading-relaxed select-all max-h-72">
              <pre className="whitespace-pre-wrap">{GOOGLE_SENTINEL_SCRIPT_CODE}</pre>
            </div>

            {/* Close Button */}
            <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
              <span className="text-[11px] text-zinc-400">WealthOS &bull; Zero-Fee Google Cloud Architecture</span>
              <button
                type="button"
                onClick={() => setShowScriptModal(false)}
                className="rounded-xl bg-zinc-900 px-5 py-2 text-xs font-bold text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
