import { useState, useEffect } from 'react'
import {
  Settings as SettingsIcon,
  Globe,
  Sliders,
  Database,
  Check,
  AlertTriangle,
  RefreshCw,
  Zap,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react'
import { useUserPreferences, useUpdateUserPreferences } from '@/api/userPreferencesApi'
import { useCurrencyStore } from '@/stores/currencyStore'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

export function SettingsPage() {
  const { data: preferences, isLoading } = useUserPreferences()
  const updatePreferences = useUpdateUserPreferences()
  const { currency, setCurrency, rates, formatBaseMoney } = useCurrencyStore()

  const [selectedCurrency, setSelectedCurrency] = useState<'EUR' | 'USD' | 'GBP'>('EUR')
  const [selectedTimeframe, setSelectedTimeframe] = useState('1M')
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  useEffect(() => {
    if (preferences) {
      setSelectedCurrency(preferences.baseCurrency || 'EUR')
      setSelectedTimeframe(preferences.defaultTimeframe || '1M')
      setCurrency(preferences.baseCurrency || 'EUR')
    }
  }, [preferences, setCurrency])

  const handleSelectCurrency = (curr: 'EUR' | 'USD' | 'GBP') => {
    setSelectedCurrency(curr)
    setCurrency(curr)
  }

  const handleSavePreferences = () => {
    updatePreferences.mutate(
      {
        baseCurrency: selectedCurrency,
        defaultTimeframe: selectedTimeframe,
      },
      {
        onSuccess: () => {
          setCurrency(selectedCurrency)
          setSavedSuccess(true)
          setTimeout(() => setSavedSuccess(false), 2500)
        },
      }
    )
  }

  const handleExecuteReset = async () => {
    setIsResetting(true)
    try {
      await fetch('/api/portfolios/reset-clean', { method: 'POST' })
      setShowResetConfirm(false)
      window.location.reload()
    } finally {
      setIsResetting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-zinc-900 px-2 py-0.5 text-xs font-bold text-white">
              System Settings
            </span>
            <span className="text-xs text-zinc-400 font-medium">Personal Preferences & Controls</span>
          </div>
          <h1 className="text-2xl font-black text-zinc-900 mt-1 tracking-tight">Preferences & Platform Configuration</h1>
        </div>

        <button
          onClick={handleSavePreferences}
          disabled={updatePreferences.isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-zinc-800 transition-colors disabled:opacity-50"
        >
          {savedSuccess ? (
            <>
              <Check className="h-4 w-4 text-emerald-400" />
              Preferences Saved
            </>
          ) : updatePreferences.isPending ? (
            'Saving Changes...'
          ) : (
            'Save Preferences'
          )}
        </button>
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 gap-6">
        {/* Section 1: Base Display Currency */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900">Base Portfolio Currency</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Select your default currency for calculating Total Net Worth, Cash Balances, and Portfolio Valuations.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {/* EUR */}
            <button
              type="button"
              onClick={() => handleSelectCurrency('EUR')}
              className={`p-4 rounded-xl border text-left transition-all ${
                selectedCurrency === 'EUR'
                  ? 'border-zinc-900 bg-zinc-900 text-white shadow-md'
                  : 'border-zinc-200 bg-white hover:border-zinc-300 text-zinc-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold font-mono">EUR (€)</span>
                {selectedCurrency === 'EUR' && <Check className="h-4 w-4 text-emerald-400" />}
              </div>
              <p className={`text-xs mt-1 ${selectedCurrency === 'EUR' ? 'text-zinc-300' : 'text-zinc-500'}`}>
                Eurozone Base (1.0000 Reference)
              </p>
              <div className={`mt-2 text-[11px] font-mono ${selectedCurrency === 'EUR' ? 'text-emerald-400 font-bold' : 'text-zinc-400'}`}>
                1 EUR = €1.00 EUR
              </div>
            </button>

            {/* USD */}
            <button
              type="button"
              onClick={() => handleSelectCurrency('USD')}
              className={`p-4 rounded-xl border text-left transition-all ${
                selectedCurrency === 'USD'
                  ? 'border-zinc-900 bg-zinc-900 text-white shadow-md'
                  : 'border-zinc-200 bg-white hover:border-zinc-300 text-zinc-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold font-mono">USD ($)</span>
                {selectedCurrency === 'USD' && <Check className="h-4 w-4 text-emerald-400" />}
              </div>
              <p className={`text-xs mt-1 ${selectedCurrency === 'USD' ? 'text-zinc-300' : 'text-zinc-500'}`}>
                US Dollar (ECB Live Cross)
              </p>
              <div className={`mt-2 text-[11px] font-mono ${selectedCurrency === 'USD' ? 'text-emerald-400 font-bold' : 'text-zinc-400'}`}>
                1 EUR = ${(rates.USD || 1.1643).toFixed(4)} USD
              </div>
            </button>

            {/* GBP */}
            <button
              type="button"
              onClick={() => handleSelectCurrency('GBP')}
              className={`p-4 rounded-xl border text-left transition-all ${
                selectedCurrency === 'GBP'
                  ? 'border-zinc-900 bg-zinc-900 text-white shadow-md'
                  : 'border-zinc-200 bg-white hover:border-zinc-300 text-zinc-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold font-mono">GBP (£)</span>
                {selectedCurrency === 'GBP' && <Check className="h-4 w-4 text-emerald-400" />}
              </div>
              <p className={`text-xs mt-1 ${selectedCurrency === 'GBP' ? 'text-zinc-300' : 'text-zinc-500'}`}>
                British Pound (ECB Live Cross)
              </p>
              <div className={`mt-2 text-[11px] font-mono ${selectedCurrency === 'GBP' ? 'text-emerald-400 font-bold' : 'text-zinc-400'}`}>
                1 EUR = £{(rates.GBP || 0.8572).toFixed(4)} GBP
              </div>
            </button>
          </div>

          {/* Live Valuation Conversion Verification Box */}
          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-zinc-600">Active Mathematical Cross:</span>
            </div>
            <span className="text-xs font-mono font-bold text-zinc-900">
              €1,000.00 EUR evaluates to {formatBaseMoney(1000, selectedCurrency)}
            </span>
          </div>
        </div>

        {/* Section 2: Default Chart Timeframe */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900">Default Chart Timeframe</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Set the default period displayed when opening asset analytics and price history cards.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {['1D', '1W', '1M', '3M', '1Y', 'YTD', 'ALL'].map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setSelectedTimeframe(tf)}
                className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                  selectedTimeframe === tf
                    ? 'bg-zinc-900 text-white shadow-sm'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Section 3: Performance & Real-Time Sync Architecture */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900">Market Data & Query Optimization</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                High-efficiency caching engine and zero N+1 queries.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3.5 space-y-1">
              <span className="font-bold text-zinc-900 block">Intelligent In-Memory Cache (TTL)</span>
              <p className="text-zinc-500">
                10-second price cache & 60-second ECB FX cache eliminate repetitive network loops and aggressive polling.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3.5 space-y-1">
              <span className="font-bold text-zinc-900 block">Eager SQLAlchemy Joined Loading</span>
              <p className="text-zinc-500">
                All portfolios, holdings, and watchlists resolve in a single database query, preventing N+1 execution bottlenecks.
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: Data Management & Reset */}
        <div className="glass-card rounded-2xl p-6 space-y-4 border border-rose-200/60 bg-rose-50/20">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-rose-900">Data Management & Account Reset</h2>
              <p className="text-xs text-rose-700/80 mt-0.5">
                Clear all active holdings, transactions, and price alerts back to initial clean state.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="rounded-xl border border-rose-300 bg-white px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 transition-colors shadow-xs"
            >
              Reset Account & Clear Data
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleExecuteReset}
        title="Reset Account Data"
        message="This will clear all transactions, holdings, and price alerts, and reset your account to clean defaults. Are you sure you want to proceed?"
        confirmText="Reset Everything"
        variant="danger"
        isPending={isResetting}
      />
    </div>
  )
}
