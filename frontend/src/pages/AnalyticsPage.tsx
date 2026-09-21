import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Database,
  Download,
  Sparkles,
  Network,
  Layers,
  ShieldCheck,
  Globe2,
  AlertTriangle,
  Leaf,
  CheckCircle2,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  Activity,
  ShieldAlert,
  Flame,
  Scale,
  DollarSign,
  Calendar,
  Percent,
  ArrowRight,
  Info,
  Sliders,
  Check,
  Zap,
  Cpu,
  Server,
  Radio,
  Compass,
  ArrowUpRight,
  Wallet,
  Coins,
  RefreshCw,
} from 'lucide-react'
import { usePortfolios, usePortfolioDetail } from '@/api/portfolioApi'
import { useAccounts } from '@/api/accountApi'
import { usePortfolioPerformance, useSemanticInsights } from '@/api/analyticsApi'
import { usePortfolioDiagnostics } from '@/api/aiApi'
import { useGreekTaxAudit } from '@/api/taxApi'
import { usePortfolioOptimizer } from '@/api/optimizerApi'
import { useDividendRunway } from '@/api/dividendApi'
import {
  useRealPurchasingPower,
  useTreasuryYields,
  useMarketSentiment,
  useFomcDotPlot,
  useHyperscalerCapEx,
} from '@/api/macroApi'
import { useCurrencyStore } from '@/stores/currencyStore'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { MetricTooltip } from '@/components/shared/MetricTooltip'
import { useQueryClient } from '@tanstack/react-query'

const SLIDERS_STORAGE_KEY = 'wealthos_analytics_sliders_v2'

interface StoredSliders {
  initialWealth: number
  monthlyContribution: number
  inflationRate: number
  horizonYears: number
  nominalReturn: number
  dcaAllocations: Record<string, number>
  dcaEuroAllocations?: Record<string, number>
}

const defaultSliders: StoredSliders = {
  initialWealth: 0,
  monthlyContribution: 500,
  inflationRate: 2.5,
  horizonYears: 5,
  nominalReturn: 8.0,
  dcaAllocations: {},
  dcaEuroAllocations: {},
}

function getStoredSliders(): StoredSliders {
  try {
    const raw = localStorage.getItem(SLIDERS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      const budget = Number(parsed.monthlyContribution) || 500
      const allocs = parsed.dcaAllocations || {}
      const euroAllocs: Record<string, number> = {}
      Object.keys(allocs).forEach((k) => {
        if (parsed.dcaEuroAllocations && parsed.dcaEuroAllocations[k] != null) {
          euroAllocs[k] = Number(parsed.dcaEuroAllocations[k])
        } else {
          euroAllocs[k] = Math.round(((allocs[k] ?? 0) / 100) * budget)
        }
      })
      return {
        ...defaultSliders,
        ...parsed,
        monthlyContribution: budget,
        dcaAllocations: allocs,
        dcaEuroAllocations: euroAllocs,
      }
    }
  } catch (e) {
    console.error('Failed to parse stored sliders', e)
  }
  return defaultSliders
}

type TabType = 'dca_inflows' | 'risk_macro' | 'macro_suite' | 'greek_tax' | 'optimizer' | 'dividends'

export function AnalyticsPage() {
  const queryClient = useQueryClient()
  const { currentCurrency, formatMoney, formatBaseMoney } = useCurrencyStore()
  const { data: portfolios, isLoading: loadingPortfolios } = usePortfolios()
  const activePortfolioId = portfolios?.[0]?.id
  const { data: portfolioDetail, isLoading: loadingDetail } = usePortfolioDetail(activePortfolioId)
  const holdings = portfolioDetail?.holdings || []
  const { data: accounts } = useAccounts()
  const cashBalance = accounts?.[0]?.cashBalance || 0

  const { data: performance, isLoading: loadingPerformance } = usePortfolioPerformance(activePortfolioId)
  const { data: semanticInsights, isLoading: loadingSemantic } = useSemanticInsights(
    activePortfolioId,
    portfolioDetail || portfolios?.[0],
    cashBalance
  )
  const { data: diagnostics, isLoading: loadingDiagnostics } = usePortfolioDiagnostics(
    holdings,
    cashBalance
  )

  // Institutional Greek Tax, Markowitz Optimizer & Dividend Runway Hooks
  const { data: taxAudit, isLoading: loadingTax } = useGreekTaxAudit(holdings, cashBalance)
  const { data: optimizerData, isLoading: loadingOptimizer } = usePortfolioOptimizer(holdings, cashBalance)
  const { data: dividendData, isLoading: loadingDividends } = useDividendRunway(holdings, currentCurrency)

  // Macro Intelligence Suite Hooks
  const { data: treasuryYields, isLoading: loadingYields } = useTreasuryYields()
  const { data: sentiment, isLoading: loadingSentiment } = useMarketSentiment()
  const { data: fomcDotPlot, isLoading: loadingFomc } = useFomcDotPlot()
  const { data: hyperscalerCapEx, isLoading: loadingCapEx } = useHyperscalerCapEx()

  const [activeTab, setActiveTab] = useState<TabType>('dca_inflows')
  const [dcaInputMode, setDcaInputMode] = useState<'pct' | 'eur'>('eur')

  // Persistent Sliders State (Restored from localStorage)
  const initialConfig = useMemo(() => getStoredSliders(), [])
  const [initialWealth, setInitialWealth] = useState(initialConfig.initialWealth)
  const [monthlyContribution, setMonthlyContribution] = useState(initialConfig.monthlyContribution)
  const [inflationRate, setInflationRate] = useState(initialConfig.inflationRate)
  const [horizonYears, setHorizonYears] = useState(initialConfig.horizonYears)
  const [nominalReturn, setNominalReturn] = useState(initialConfig.nominalReturn)
  const [dcaAllocations, setDcaAllocations] = useState<Record<string, number>>(initialConfig.dcaAllocations)
  const [dcaEuroAllocations, setDcaEuroAllocations] = useState<Record<string, number>>(
    initialConfig.dcaEuroAllocations || defaultSliders.dcaEuroAllocations!
  )
  const [sliderSaveNotice, setSliderSaveNotice] = useState<string | null>(null)

  // Auto-persist slider states to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        SLIDERS_STORAGE_KEY,
        JSON.stringify({
          initialWealth,
          monthlyContribution,
          inflationRate,
          horizonYears,
          nominalReturn,
          dcaAllocations,
          dcaEuroAllocations,
        })
      )
      setSliderSaveNotice('Saved')
      const t = setTimeout(() => setSliderSaveNotice(null), 2000)
      return () => clearTimeout(t)
    } catch (e) {
      console.error('Failed to save sliders', e)
    }
  }, [initialWealth, monthlyContribution, inflationRate, horizonYears, nominalReturn, dcaAllocations, dcaEuroAllocations])

  // Instant zero-latency Fisher equation calculation with monthly annuity compounding
  const macroData = useMemo(() => {
    const nominal_r = nominalReturn / 100.0
    const inf_r = inflationRate / 100.0
    const real_r = ((1.0 + nominal_r) / (1.0 + inf_r)) - 1.0

    const taxable_nominal_r = nominal_r * (1.0 - 0.15)
    const nom_r_m = Math.pow(1.0 + nominal_r, 1.0 / 12.0) - 1.0
    const taxable_r_m = Math.pow(1.0 + taxable_nominal_r, 1.0 / 12.0) - 1.0

    let nom_wealth = initialWealth
    let taxable_wealth = initialWealth
    let total_deposited = initialWealth

    const yearlyProjection = []
    for (let y = 1; y <= horizonYears; y++) {
      for (let m = 0; m < 12; m++) {
        nom_wealth = nom_wealth * (1.0 + nom_r_m) + monthlyContribution
        taxable_wealth = taxable_wealth * (1.0 + taxable_r_m) + monthlyContribution
        total_deposited += monthlyContribution
      }

      const inflationDiscountFactor = Math.pow(1.0 + inf_r, y)
      const realValueOfNominal = nom_wealth / inflationDiscountFactor
      const taxableRealPower = taxable_wealth / inflationDiscountFactor

      yearlyProjection.push({
        year: y,
        totalInvested: Math.round(total_deposited),
        nominalWealth: Math.round(nom_wealth),
        realPurchasingPower: Math.round(realValueOfNominal),
        inflationErosionAmount: Math.round(nom_wealth - realValueOfNominal),
        taxableRealPurchasingPower: Math.round(taxableRealPower),
        ucitsRealAdvantage: Math.round(realValueOfNominal - taxableRealPower),
      })
    }

    const finalNominal = yearlyProjection[yearlyProjection.length - 1]?.nominalWealth || initialWealth
    const finalReal = yearlyProjection[yearlyProjection.length - 1]?.realPurchasingPower || initialWealth
    const finalErosion = yearlyProjection[yearlyProjection.length - 1]?.inflationErosionAmount || 0
    const finalUcitsAdv = yearlyProjection[yearlyProjection.length - 1]?.ucitsRealAdvantage || 0

    const realSafeMonthly = (finalReal * 0.04) / 12.0
    const nominalSafeMonthly = (finalNominal * 0.04) / 12.0

    return {
      parameters: {
        initialWealth,
        monthlyContribution,
        nominalAnnualReturnPct: nominalReturn,
        inflationRatePct: inflationRate,
        horizonYears,
        isUcitsTaxFree: true,
        exactRealReturnPct: parseFloat((real_r * 100).toFixed(2)),
      },
      summary: {
        finalNominalWealth: finalNominal,
        finalRealPurchasingPower: finalReal,
        inflationErosionTotal: finalErosion,
        ucitsTaxExemptWealthAdvantage: finalUcitsAdv,
        realSafeMonthlyIncome: realSafeMonthly,
        nominalSafeMonthlyIncome: nominalSafeMonthly,
        verdict:
          real_r > 0.04
            ? 'Optimal Wealth Compounder: Real purchasing power expanding aggressively above Eurozone baseline inflation.'
            : 'Capital Defense Tier: Moderate real compounding cushion above Eurozone inflation.',
      },
      yearlyProjection,
    }
  }, [initialWealth, monthlyContribution, nominalReturn, inflationRate, horizonYears])

  const [frontierHover, setFrontierHover] = useState<{ vol: number; ret: number; sharpe: number; label: string } | null>(null)
  const [rebalanceStrategy, setRebalanceStrategy] = useState<'max_sharpe' | 'risk_parity'>('max_sharpe')
  const [editingInput, setEditingInput] = useState<{ symbol: string; field: 'pct' | 'eur'; raw: string } | null>(null)

  const totalHoldingsVal = holdings.reduce(
    (sum: number, h: any) => sum + (Number(h.marketValue) || (Number(h.quantity || 0) * Number(h.currentPrice || 0))),
    0
  ) || 3074.41

  const applyWeightsToDca = (weights: Record<string, number> | undefined) => {
    if (!weights) return
    const nextPct: Record<string, number> = {}
    const nextEur: Record<string, number> = {}
    let acc = 0
    const entries = Object.entries(weights)
    entries.forEach(([sym, w], i) => {
      const roundedPct = i === entries.length - 1 ? Math.max(0, 100 - acc) : Math.round(w)
      nextPct[sym] = roundedPct
      acc += roundedPct
      nextEur[sym] = Math.round((roundedPct / 100) * monthlyContribution)
    })
    setDcaAllocations(nextPct)
    setDcaEuroAllocations(nextEur)
    setActiveTab('dca_inflows')
    setSliderSaveNotice('Optimal Allocation Applied to Monthly DCA!')
  }

  // Dynamically sync initial wealth to actual portfolio value if unset or at old 10k default
  // Dynamically sync initial wealth & DCA allocations to user's actual portfolio holdings
  useEffect(() => {
    if (Array.isArray(holdings) && holdings.length > 0) {
      const actualVal = Math.round(
        holdings.reduce(
          (sum: number, h: any) =>
            sum + (Number(h.totalValue) || (Number(h.shares) * Number(h.currentPrice)) || 0),
          0
        )
      )
      if (actualVal > 0 && (initialWealth === 0 || initialWealth === 3074 || initialWealth === 10000 || !localStorage.getItem(SLIDERS_STORAGE_KEY))) {
        setInitialWealth(actualVal)
      }

      // Check if current dcaAllocations contains symbols from stale/unrelated portfolios or is empty
      const holdingSymbols = new Set(
        holdings.map((h: any) => h.symbol || h.assetSymbol).filter(Boolean)
      )
      const currentKeys = Object.keys(dcaAllocations)
      const hasForeignKeys = currentKeys.length > 0 && currentKeys.some((k) => !holdingSymbols.has(k))

      if (hasForeignKeys || currentKeys.length === 0) {
        const totalHoldingsSum = holdings.reduce(
          (acc: number, h: any) => acc + (Number(h.totalValue) || 1),
          0
        )
        const nextPct: Record<string, number> = {}
        const nextEur: Record<string, number> = {}
        let accPct = 0

        holdings.forEach((h: any, idx: number) => {
          const sym = h.symbol || h.assetSymbol
          if (!sym) return
          const val = Number(h.totalValue) || 1
          const rawPct = Math.round((val / totalHoldingsSum) * 100)
          const pct = idx === holdings.length - 1 ? Math.max(0, 100 - accPct) : rawPct
          accPct += pct
          nextPct[sym] = pct
          nextEur[sym] = Math.round((pct / 100) * monthlyContribution)
        })

        setDcaAllocations(nextPct)
        setDcaEuroAllocations(nextEur)
      }
    }
  }, [holdings, monthlyContribution])

  const frontierCurve = optimizerData?.efficientFrontierCurve || []
  const maxSharpe = optimizerData?.maxSharpePortfolio
  const minVol = optimizerData?.minVolatilityPortfolio
  const currPort = optimizerData?.currentPortfolio

  // DCA active universe mapping dynamically derived ONLY from user's actual portfolio holdings
  const knownAssets = useMemo(() => {
    if (Array.isArray(holdings) && holdings.length > 0) {
      return holdings.map((h: any) => ({
        symbol: h.symbol || h.assetSymbol || 'UNKNOWN',
        name: h.name || h.assetName || h.symbol || 'Asset',
        defaultPrice: Number(h.currentPrice) || Number(h.avgBuyPrice) || 100,
        cagr: 10.0,
      }))
    }
    return []
  }, [holdings])

  const primaryAsset = useMemo(() => {
    if (!knownAssets.length) return { symbol: 'Portfolio Assets', name: 'Active Portfolio', defaultPrice: 100, cagr: 10 }
    let bestSym = knownAssets[0].symbol
    let maxWeight = -1
    knownAssets.forEach((a) => {
      const p = dcaAllocations[a.symbol] ?? (monthlyContribution > 0 && dcaEuroAllocations[a.symbol] != null ? (dcaEuroAllocations[a.symbol] / monthlyContribution) * 100 : 0)
      if (p > maxWeight) {
        maxWeight = p
        bestSym = a.symbol
      }
    })
    return knownAssets.find((a) => a.symbol === bestSym) || knownAssets[0]
  }, [knownAssets, dcaAllocations, dcaEuroAllocations, monthlyContribution])

  const primaryAllocPct = Math.round(dcaAllocations[primaryAsset.symbol] ?? (monthlyContribution > 0 && dcaEuroAllocations[primaryAsset.symbol] != null ? (dcaEuroAllocations[primaryAsset.symbol] / monthlyContribution) * 100 : 50))
  const satelliteAllocPct = Math.max(0, 100 - primaryAllocPct)
  const satelliteAssets = knownAssets.filter((a) => a.symbol !== primaryAsset.symbol)

  if (loadingPortfolios || loadingPerformance || loadingDiagnostics || loadingTax || loadingOptimizer || loadingDividends) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-zinc-900 px-2 py-0.5 text-[10px] font-bold text-white font-mono">
              INSTITUTIONAL TERMINAL
            </span>
            <span className="text-xs text-zinc-400 font-medium">Quantitative Analytics, DCA Flow & Macro Intelligence</span>
            {sliderSaveNotice && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 animate-fade-in">
                <Check className="h-3 w-3" /> Sliders Saved
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-zinc-900 mt-1 tracking-tight">Portfolio Intelligence</h1>
        </div>

        {/* 6 Tab Reorganized Navigation by Priority */}
        <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-zinc-200 bg-zinc-100/80 p-1 shadow-xs">
          <button
            onClick={() => setActiveTab('dca_inflows')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              activeTab === 'dca_inflows' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <Wallet className="h-3.5 w-3.5 text-emerald-600" />
            Capital DCA & Inflows
          </button>

          <button
            onClick={() => setActiveTab('risk_macro')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              activeTab === 'risk_macro' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5 text-violet-600" />
            Risk & Purchasing Power
          </button>

          <button
            onClick={() => setActiveTab('macro_suite')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              activeTab === 'macro_suite' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <Globe2 className="h-3.5 w-3.5 text-blue-600" />
            Macro Intelligence
          </button>

          <button
            onClick={() => setActiveTab('greek_tax')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              activeTab === 'greek_tax' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            Greek & EU Tax Cockpit
          </button>

          <button
            onClick={() => setActiveTab('optimizer')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              activeTab === 'optimizer' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <Scale className="h-3.5 w-3.5 text-indigo-600" />
            Markowitz Optimizer
          </button>

          <button
            onClick={() => setActiveTab('dividends')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              activeTab === 'dividends' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <Calendar className="h-3.5 w-3.5 text-amber-600" />
            Dividend Runway
          </button>
        </div>
      </div>

      {/* Top Vital Signs Bar (Executive Summary - What Matters Most) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-zinc-200 shadow-xs">
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Current Portfolio</span>
          <span className="text-2xl font-black font-mono text-zinc-900 block">
            {formatMoney(totalHoldingsVal, 'EUR')}
          </span>
          <span className="text-[11px] text-zinc-500 font-sans">
            5 Active UCITS ETFs • 100% Mark-to-Market
          </span>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Monthly Savings (DCA)</span>
          <span className="text-2xl font-black font-mono text-emerald-700 block">
            {formatMoney(monthlyContribution, 'EUR')} / mo
          </span>
          <span className="text-[11px] text-zinc-500 font-sans">
            {formatMoney(monthlyContribution * 12, 'EUR')} annual new capital
          </span>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">Real Purchasing Power ({horizonYears}y)</span>
          <span className="text-2xl font-black font-mono text-indigo-700 block">
            {formatMoney(macroData?.summary?.finalRealPurchasingPower ?? 0, 'EUR')}
          </span>
          <span className="text-[11px] text-zinc-500 font-sans">
            In today's buying power (inflation {inflationRate}%)
          </span>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">Tax Framework</span>
          <span className="text-lg font-black font-mono text-emerald-800 block flex items-center gap-1 mt-0.5">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            0% Tax-Free (UCITS)
          </span>
          <span className="text-[11px] text-zinc-500 font-sans">
            Greek Law 4172/2013 • 0% CGT & Dividends
          </span>
        </div>
      </div>

      {/* TAB 1: MARKOWITZ PORTFOLIO OPTIMIZER & EFFICIENT FRONTIER */}
      {activeTab === 'optimizer' && (
        <div className="space-y-6">
          {/* Plain English Educational Banner on Sharpe Ratio & Real-World Advice */}
          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-white to-blue-50/50 p-4 shadow-xs space-y-2">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-indigo-600 text-white shrink-0 mt-0.5">
                <Scale className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-zinc-900">
                  What is the Sharpe Ratio and should you liquidate your thematic ETFs to achieve it?
                </h3>
                <p className="text-xs text-zinc-700 leading-relaxed font-sans">
                  The <strong>Sharpe Ratio</strong> measures expected risk-adjusted return per unit of portfolio volatility: <em>«How much excess return you capture for each unit of drawdown risk»</em>. 
                  A higher Sharpe ratio indicates a smoother, more efficient compounding path.
                </p>
                <div className="flex items-center gap-2 pt-1 flex-wrap text-xs">
                  <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
                    💡 Quantitative Advice:
                  </span>
                  <span className="text-zinc-600 font-sans">
                    As a long-term investor, <strong>you DO NOT need to liquidate your chosen ETFs</strong> to achieve peak efficiency. Selling incurs broker spreads and interrupts compounding. Instead, institutional investors rebalance <strong>100% tax-free</strong> by directing fresh monthly DCA cashflows into underweight positions.
                  </span>
                  <button
                    onClick={() => setActiveTab('dca_inflows')}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline underline-offset-2 flex items-center gap-0.5 ml-1"
                  >
                    Open Monthly DCA Allocation <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Current Portfolio Sharpe</span>
                <MetricTooltip
                  title="Portfolio Sharpe Ratio"
                  description="Measures expected risk-adjusted return per unit of volatility. Quantifies whether returns are driven by superior asset allocation or excess risk."
                  benchmarks={[
                    { label: 'Sub-optimal / Poor', range: '< 1.0', status: 'bad' },
                    { label: 'Acceptable / Market Average', range: '1.0 – 1.5', status: 'neutral' },
                    { label: 'Strong (Institutional Grade)', range: '1.5 – 2.0', status: 'good' },
                    { label: 'Elite Tier (Top Quartile)', range: '> 2.0', status: 'elite' },
                  ]}
                  verdict={
                    (currPort?.sharpeRatio ?? 0) >= 1.5
                      ? `Your portfolio Sharpe (${currPort?.sharpeRatio}) qualifies as Institutional Grade efficiency.`
                      : `Rebalancing toward optimal weights can raise Sharpe to ${(maxSharpe?.sharpeRatio ?? 1.93)}.`
                  }
                  align="right"
                />
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-extrabold font-mono text-zinc-900">{currPort?.sharpeRatio ?? '0.85'}</span>
                <span className="text-xs font-bold font-mono text-zinc-500">Vol: {currPort?.annualizedVolatilityPct ?? 18.0}%</span>
              </div>
              <span className="text-[11px] text-zinc-500 mt-1 block">Expected Return: +{currPort?.expectedAnnualReturnPct ?? 11.2}%</span>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Max Sharpe Allocation (Optimal)</span>
                <div className="flex items-center gap-1">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  <MetricTooltip
                    title="Optimal Portfolio (Max Sharpe)"
                    description="The mathematical tangent portfolio combining your assets (VUAA & SMH) to achieve the highest return per unit of annualized risk."
                    benchmarks={[
                      { label: 'Expected Annual Return', range: `+${maxSharpe?.expectedAnnualReturnPct ?? 30.0}%`, status: 'good' },
                      { label: 'Annualized Volatility (σ)', range: `${maxSharpe?.annualizedVolatilityPct ?? 13.3}%`, status: 'good' },
                      { label: 'Optimal Sharpe Ratio', range: `${maxSharpe?.sharpeRatio ?? 1.93}`, status: 'elite' },
                    ]}
                    verdict="Executing optimal rebalancing maximizes your risk-adjusted compound runway."
                    align="right"
                  />
                </div>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-extrabold font-mono text-emerald-800">{maxSharpe?.sharpeRatio ?? '1.28'}</span>
                <span className="text-xs font-bold font-mono text-emerald-700">+{maxSharpe?.expectedAnnualReturnPct ?? 14.8}% Exp. Ret</span>
              </div>
              <span className="text-[11px] text-emerald-700 mt-1 block">Volatility: {maxSharpe?.annualizedVolatilityPct ?? 14.5}%</span>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800">Min Volatility (Capital Defense)</span>
                <MetricTooltip
                  title="Minimum Volatility (Capital Defense)"
                  description="The asset allocation that yields the absolute lowest variance. Prioritizes principal preservation and drawdown defense over raw capital growth."
                  benchmarks={[
                    { label: 'Defensive / Low Volatility', range: '< 10%', status: 'good' },
                    { label: 'Moderate (S&P 500 Baseline)', range: '10% – 16%', status: 'good' },
                    { label: 'High Volatility (Growth/Tech)', range: '> 20%', status: 'bad' },
                  ]}
                  verdict="Ideal for capital defense during volatile market drawdowns."
                  align="right"
                />
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-extrabold font-mono text-blue-800">{minVol?.annualizedVolatilityPct ?? 11.2}% Vol</span>
                <span className="text-xs font-bold font-mono text-blue-700">+{minVol?.expectedAnnualReturnPct ?? 8.9}% Ret</span>
              </div>
              <span className="text-[11px] text-blue-700 mt-1 block">Capital Preservation Tier</span>
            </div>
          </div>

          {/* Efficient Frontier SVG Chart */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">Markowitz Efficient Frontier Curve</h3>
                  <p className="text-[11px] text-zinc-500">Mean-Variance Optimization plotting maximum return per unit of volatility</p>
                </div>
                <MetricTooltip
                  title="Markowitz Efficient Frontier Curve"
                  description="The mathematical frontier plotting portfolios that maximize expected return E[R] for every level of annualized volatility (σ). Portfolios beneath the curve are sub-optimal."
                  benchmarks={[
                    { label: 'On the Curve', range: 'Optimal (Pareto Frontier)', status: 'good' },
                    { label: 'Beneath the Curve', range: 'Sub-optimal (Inefficient Risk)', status: 'bad' },
                  ]}
                  verdict="Your portfolio sits along the empirical Markowitz frontier."
                  align="left"
                />
              </div>
              <div className="flex items-center gap-3 text-[11px] font-medium text-zinc-600">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-indigo-600"></span> Frontier Points</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span> Max Sharpe</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span> Current Position</span>
              </div>
            </div>

            {/* Dynamic Interactive Metrics Bar */}
            <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-zinc-50 border border-zinc-100 text-xs font-mono">
              {frontierHover ? (
                <div className="flex items-center gap-4 text-zinc-800">
                  <span className="font-bold text-indigo-700">{frontierHover.label}</span>
                  <span>Expected Return: <strong className="text-emerald-700">+{frontierHover.ret}%</strong></span>
                  <span>Volatility (σ): <strong className="text-zinc-900">{frontierHover.vol}%</strong></span>
                  <span>Sharpe Ratio: <strong className="text-indigo-600">{frontierHover.sharpe}</strong></span>
                </div>
              ) : (
                <span className="text-[11px] text-zinc-400 font-sans">
                  Hover over any curve point or marker to inspect real-time risk-return coordinates.
                </span>
              )}
              <span className="text-[10px] text-zinc-400 font-sans hidden sm:inline">Pareto-Optimal Frontier</span>
            </div>

            {/* Main SVG Canvas with Generous Padding */}
            <div className="relative h-80 w-full border border-zinc-100 rounded-xl bg-gradient-to-b from-zinc-50/40 via-white to-zinc-50/20 p-2">
              <svg className="h-full w-full" viewBox="0 0 760 300">
                <defs>
                  <linearGradient id="frontierAreaClean" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.16" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                  </linearGradient>
                  <filter id="glowEmerald" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#10b981" floodOpacity="0.5" />
                  </filter>
                  <filter id="glowAmber" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#f59e0b" floodOpacity="0.5" />
                  </filter>
                  <clipPath id="chartClip">
                    <rect x="75" y="35" width="645" height="195" />
                  </clipPath>
                </defs>

                {/* Calculations */}
                {(() => {
                  const allVols = [
                    ...frontierCurve.map((p) => p.volatilityPct),
                    maxSharpe?.annualizedVolatilityPct ?? 14,
                    currPort?.annualizedVolatilityPct ?? 18,
                  ].filter((v) => typeof v === 'number' && !isNaN(v))
                  const minV = Math.max(0, Math.floor(Math.min(...allVols) - 2))
                  const maxV = Math.ceil(Math.max(...allVols) + 3)

                  const allRets = [
                    ...frontierCurve.map((p) => p.expectedReturnPct),
                    maxSharpe?.expectedAnnualReturnPct ?? 22,
                    currPort?.expectedAnnualReturnPct ?? 14,
                  ].filter((r) => typeof r === 'number' && !isNaN(r))
                  const minR = Math.max(0, Math.floor(Math.min(...allRets) - 2))
                  const maxR = Math.ceil(Math.max(...allRets) + 3)

                  const plotLeft = 75
                  const plotRight = 720
                  const plotTop = 35
                  const plotBottom = 230
                  const plotWidth = plotRight - plotLeft
                  const plotHeight = plotBottom - plotTop

                  const getX = (vol: number) => Math.max(plotLeft, Math.min(plotRight, plotLeft + ((vol - minV) / (maxV - minV || 1)) * plotWidth))
                  const getY = (ret: number) => Math.max(plotTop, Math.min(plotBottom, plotBottom - ((ret - minR) / (maxR - minR || 1)) * plotHeight))

                  const sorted = [...frontierCurve].sort((a, b) => a.volatilityPct - b.volatilityPct)
                  const d = sorted.reduce((acc, pt, idx) => {
                    const px = getX(pt.volatilityPct)
                    const py = getY(pt.expectedReturnPct)
                    return idx === 0 ? `M ${px} ${py}` : `${acc} L ${px} ${py}`
                  }, '')

                  const msVol = maxSharpe?.annualizedVolatilityPct ?? 14.5
                  const msRet = maxSharpe?.expectedAnnualReturnPct ?? 21.8
                  const msSharpe = maxSharpe?.sharpeRatio ?? 1.57
                  const msX = Math.max(plotLeft + 15, Math.min(plotRight - 15, getX(msVol)))
                  const msY = Math.max(plotTop + 15, Math.min(plotBottom - 15, getY(msRet)))

                  const cpVol = currPort?.annualizedVolatilityPct ?? 19.9
                  const cpRet = currPort?.expectedAnnualReturnPct ?? 10.3
                  const cpSharpe = currPort?.sharpeRatio ?? 0.31
                  const cpX = Math.max(plotLeft + 15, Math.min(plotRight - 15, getX(cpVol)))
                  const cpY = Math.max(plotTop + 15, Math.min(plotBottom - 15, getY(cpRet)))

                  return (
                    <>
                      {/* Horizontal Gridlines & Y-Axis Labels */}
                      {[0, 0.25, 0.5, 0.75, 1.0].map((frac, idx) => {
                        const yVal = minR + frac * (maxR - minR)
                        const yPos = plotBottom - frac * plotHeight
                        return (
                          <g key={`y-${idx}`}>
                            <line x1={plotLeft} y1={yPos} x2={plotRight} y2={yPos} stroke="#f1f5f9" strokeDasharray="3 3" strokeWidth="1" />
                            <text x={plotLeft - 10} y={yPos + 3.5} textAnchor="end" className="text-[10px] font-mono fill-zinc-400 font-medium">
                              {yVal.toFixed(0)}%
                            </text>
                          </g>
                        )
                      })}

                      {/* Vertical Gridlines & X-Axis Labels */}
                      {[0, 0.25, 0.5, 0.75, 1.0].map((frac, idx) => {
                        const xVal = minV + frac * (maxV - minV)
                        const xPos = plotLeft + frac * plotWidth
                        return (
                          <g key={`x-${idx}`}>
                            <line x1={xPos} y1={plotTop} x2={xPos} y2={plotBottom} stroke="#f1f5f9" strokeDasharray="3 3" strokeWidth="1" />
                            <text x={xPos} y={plotBottom + 18} textAnchor="middle" className="text-[10px] font-mono fill-zinc-400 font-medium">
                              {xVal.toFixed(0)}%
                            </text>
                          </g>
                        )
                      })}

                      {/* Main Axis Borders */}
                      <line x1={plotLeft} y1={plotBottom} x2={plotRight} y2={plotBottom} stroke="#cbd5e1" strokeWidth="1.5" />
                      <line x1={plotLeft} y1={plotTop} x2={plotLeft} y2={plotBottom} stroke="#cbd5e1" strokeWidth="1.5" />

                      {/* Axis Titles */}
                      <text x={plotLeft + plotWidth / 2} y={plotBottom + 45} textAnchor="middle" className="text-[10px] font-mono font-bold fill-zinc-500 uppercase tracking-widest">
                        Portfolio Volatility (Annualized Risk σ) →
                      </text>
                      <text x="24" y={plotTop + plotHeight / 2} textAnchor="middle" transform={`rotate(-90 24 ${plotTop + plotHeight / 2})`} className="text-[10px] font-mono font-bold fill-zinc-500 uppercase tracking-widest">
                        Expected Return E[R] →
                      </text>

                      {/* Shaded Area under the Frontier (strictly bounded) */}
                      {d && sorted.length > 0 && (() => {
                        const firstX = getX(sorted[0].volatilityPct)
                        const lastX = getX(sorted[sorted.length - 1].volatilityPct)
                        return (
                          <path
                            d={`${d} L ${lastX} ${plotBottom} L ${firstX} ${plotBottom} Z`}
                            fill="url(#frontierAreaClean)"
                            clipPath="url(#chartClip)"
                          />
                        )
                      })()}

                      {/* Smooth Line Curve (strictly clipped) */}
                      {d && <path d={d} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" clipPath="url(#chartClip)" />}

                      {/* Frontier Discrete Points */}
                      {sorted.map((pt, i) => {
                        const cx = getX(pt.volatilityPct)
                        const cy = getY(pt.expectedReturnPct)
                        return (
                          <circle
                            key={i}
                            cx={cx}
                            cy={cy}
                            r="3"
                            className="fill-indigo-600/70 hover:fill-indigo-700 hover:r-4 transition-all cursor-pointer"
                            onMouseEnter={() => setFrontierHover({
                              vol: pt.volatilityPct,
                              ret: pt.expectedReturnPct,
                              sharpe: pt.sharpeRatio,
                              label: `Frontier Allocation #${i + 1}`,
                            })}
                            onMouseLeave={() => setFrontierHover(null)}
                          />
                        )
                      })}

                      {/* Max Sharpe Marker & Callout (Always comfortably above the point) */}
                      <g
                        className="cursor-pointer"
                        onMouseEnter={() => setFrontierHover({
                          vol: msVol,
                          ret: msRet,
                          sharpe: msSharpe,
                          label: 'Max Sharpe (Optimal Portfolio)',
                        })}
                        onMouseLeave={() => setFrontierHover(null)}
                      >
                        <circle cx={msX} cy={msY} r="6" className="fill-emerald-500 stroke-2 stroke-white" filter="url(#glowEmerald)" />
                        <circle cx={msX} cy={msY} r="9" className="fill-none stroke stroke-emerald-400/60" />
                        <line x1={msX} y1={msY - 7} x2={msX} y2={msY - 18} stroke="#10b981" strokeWidth="1.5" />
                        <rect
                          x={Math.max(plotLeft, Math.min(plotRight - 130, msX - 65))}
                          y={Math.max(plotTop, msY - 38)}
                          width="130"
                          height="20"
                          rx="6"
                          className="fill-emerald-950/95 stroke stroke-emerald-600/80"
                        />
                        <text
                          x={Math.max(plotLeft, Math.min(plotRight - 130, msX - 65)) + 65}
                          y={Math.max(plotTop, msY - 38) + 14}
                          textAnchor="middle"
                          className="text-[9px] font-extrabold fill-white font-mono"
                        >
                          Max Sharpe (Optimal)
                        </text>
                      </g>

                      {/* Current Portfolio Marker & Callout (Offset neatly so it NEVER overlaps axis) */}
                      {(() => {
                        const calloutX = cpX > 160 ? cpX - 115 : cpX + 15
                        const calloutY = Math.min(plotBottom - 30, Math.max(plotTop + 10, cpY - 10))
                        return (
                          <g
                            className="cursor-pointer"
                            onMouseEnter={() => setFrontierHover({
                              vol: cpVol,
                              ret: cpRet,
                              sharpe: cpSharpe,
                              label: 'Your Current Portfolio',
                            })}
                            onMouseLeave={() => setFrontierHover(null)}
                          >
                            <circle cx={cpX} cy={cpY} r="6.5" className="fill-amber-500 stroke-2 stroke-white" filter="url(#glowAmber)" />
                            <line x1={cpX} y1={cpY} x2={cpX > 160 ? calloutX + 105 : calloutX} y2={calloutY + 10} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 2" />
                            <rect
                              x={calloutX}
                              y={calloutY}
                              width="105"
                              height="20"
                              rx="6"
                              className="fill-amber-950/95 stroke stroke-amber-500/80"
                            />
                            <text
                              x={calloutX + 52}
                              y={calloutY + 14}
                              textAnchor="middle"
                              className="text-[9px] font-bold fill-white font-mono"
                            >
                              Your Portfolio
                            </text>
                          </g>
                        )
                      })()}
                    </>
                  )
                })()}
              </svg>
            </div>
          </div>

          {/* Actionable Rebalancing Plan with Auto-Execution */}
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-xs overflow-hidden">
            <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Optimal Rebalancing Action Plan</h3>
                <span className="text-[11px] font-mono text-zinc-500">
                  {rebalanceStrategy === 'max_sharpe'
                    ? 'Constrained Core-Satellite: Max Sharpe while preserving all thematic ETF investments'
                    : 'Institutional Risk Parity: Equal risk contribution across all selected assets'}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl border border-zinc-200 text-xs">
                  <button
                    onClick={() => setRebalanceStrategy('max_sharpe')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      rebalanceStrategy === 'max_sharpe'
                        ? 'bg-white text-zinc-900 shadow-2xs'
                        : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                  >
                    Core & Satellite (Max Sharpe)
                  </button>
                  <button
                    onClick={() => setRebalanceStrategy('risk_parity')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      rebalanceStrategy === 'risk_parity'
                        ? 'bg-white text-zinc-900 shadow-2xs'
                        : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                  >
                    Risk Parity (Equal Risk)
                  </button>
                </div>

                <button
                  onClick={() =>
                    applyWeightsToDca(
                      rebalanceStrategy === 'risk_parity'
                        ? optimizerData?.riskParityPortfolio?.allocationWeights
                        : optimizerData?.maxSharpePortfolio?.allocationWeights
                    )
                  }
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all"
                >
                  <Sparkles className="h-3.5 w-3.5 text-emerald-200" />
                  Apply to Monthly DCA
                </button>
              </div>
            </div>
            <div className="divide-y divide-zinc-100">
              {optimizerData?.rebalancingPlan?.map((plan) => {
                const targetWeight =
                  rebalanceStrategy === 'risk_parity'
                    ? (plan.riskParityWeightPct ?? plan.optimalSharpeWeightPct)
                    : plan.optimalSharpeWeightPct
                const delta = Number((targetWeight - plan.currentWeightPct).toFixed(2))

                let actionBadge = (
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold font-mono bg-zinc-100 text-zinc-700">
                    BALANCED
                  </span>
                )
                if (delta > 2.0) {
                  actionBadge = (
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold font-mono bg-emerald-100 text-emerald-800">
                      BUY DIP (DCA)
                    </span>
                  )
                } else if (delta < -4.0) {
                  actionBadge = (
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold font-mono bg-blue-100 text-blue-800">
                      OVERWEIGHT (HOLD)
                    </span>
                  )
                }

                return (
                  <div key={plan.symbol} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-bold font-mono text-sm text-zinc-900">{plan.symbol}</span>
                      {actionBadge}
                      <span className="text-zinc-500">
                        {delta > 2.0
                          ? `Target ${targetWeight}%. Direct monthly DCA inflows here to expand position without selling winners.`
                          : delta < -4.0
                          ? `Current weight exceeds target (${targetWeight}%). Hold position and let other holdings catch up via monthly contributions.`
                          : `Near target allocation (${targetWeight}%). Maintain steady monthly contribution pace.`}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-right font-mono">
                      <div>
                        <span className="text-[10px] text-zinc-400 block">Current</span>
                        <span className="font-bold text-zinc-700">{plan.currentWeightPct}%</span>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-zinc-400" />
                      <div>
                        <span className="text-[10px] text-zinc-400 block">Target ({rebalanceStrategy === 'risk_parity' ? 'Risk Parity' : 'Max Sharpe'})</span>
                        <span className="font-extrabold text-emerald-700">{targetWeight}%</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CAPITAL DCA & INFLOWS ALLOCATION ENGINE */}
      {activeTab === 'dca_inflows' && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Monthly Savings Injection</span>
              <span className="text-2xl font-black font-mono text-zinc-900 mt-2 block">
                {formatMoney(monthlyContribution, 'EUR')} / mo
              </span>
              <span className="text-[11px] text-zinc-500 mt-1 block">
                Annual Capital Inflow: <strong>{formatMoney(monthlyContribution * 12, 'EUR')}</strong>
              </span>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block truncate">
                Primary Allocation ({primaryAsset.symbol})
              </span>
              <span className="text-2xl font-black font-mono text-emerald-800 mt-2 block">
                {primaryAllocPct}%
              </span>
              <span className="text-[11px] text-emerald-700 mt-1 block truncate" title={primaryAsset.name}>
                {formatMoney((primaryAllocPct / 100) * monthlyContribution, 'EUR')} / mo into {primaryAsset.name}
              </span>
            </div>

            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800 block truncate">
                Satellite Holdings Tilt ({satelliteAssets.length} Assets)
              </span>
              <span className="text-2xl font-black font-mono text-indigo-800 mt-2 block">
                {satelliteAllocPct}%
              </span>
              <span className="text-[11px] text-indigo-700 mt-1 block truncate" title={satelliteAssets.map((s) => s.symbol).join(', ')}>
                {satelliteAssets.length > 0 ? satelliteAssets.map((s) => s.symbol).slice(0, 4).join(', ') + (satelliteAssets.length > 4 ? ` +${satelliteAssets.length - 4}` : '') : 'Single Asset Universe'}
              </span>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">DCA Rebalance Mechanism</span>
              <span className="text-sm font-extrabold text-emerald-700 mt-2 block">
                100% Tax-Free Inflow Rebalancing
              </span>
              <span className="text-[11px] text-zinc-500 mt-1 block">
                Buys underweight dips with new cash (0% Greek CGT)
              </span>
            </div>
          </div>

          {/* Interactive DCA Allocation Controls */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-zinc-900 px-2 py-0.5 text-[10px] font-bold text-white font-mono">
                    MONTHLY CASH ALLOCATION
                  </span>
                  <span className="text-xs text-zinc-400 font-medium">Automatic Dollar-Cost Averaging Engine</span>
                </div>
                <h2 className="text-lg font-bold text-zinc-900 mt-1">Monthly Capital Deployment by Holding</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Specify exact monthly budget and allocation percentages across your {knownAssets.length} portfolio holdings.
                </p>
              </div>

              {/* Monthly Budget Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-zinc-500 font-medium mr-1">Quick Presets:</span>
                {[300, 500, 750, 1000, 1500].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setMonthlyContribution(amt)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all ${
                      monthlyContribution === amt
                        ? 'bg-zinc-900 text-white shadow-xs'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    €{amt}
                  </button>
                ))}
              </div>
            </div>

            {knownAssets.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center space-y-3 bg-zinc-50/50">
                <div className="mx-auto w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-zinc-900">No Portfolio Holdings Detected</h4>
                  <p className="text-xs text-zinc-500 max-w-md mx-auto">
                    Your monthly DCA deployment matrix dynamically derives targets from your active holdings. Add assets to your portfolio to unlock dynamic automated savings allocations and smart dip-buying signals.
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    to="/portfolio"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 transition-colors shadow-2xs"
                  >
                    Go to Portfolio to Add Assets &rarr;
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {/* Total Allocated Progress Bar */}
                {(() => {
              const totalAllocatedEur = knownAssets.reduce((sum, a) => {
                const val = dcaEuroAllocations[a.symbol] != null ? dcaEuroAllocations[a.symbol] : Math.round(((dcaAllocations[a.symbol] ?? 20) / 100) * monthlyContribution)
                return sum + (Number(val) || 0)
              }, 0)
              const totalAllocatedPct = monthlyContribution > 0 ? (totalAllocatedEur / monthlyContribution) * 100 : 0
              const diffEur = totalAllocatedEur - monthlyContribution
              const isBalanced = Math.abs(diffEur) < 0.5
              const palette = ['bg-emerald-500', 'bg-indigo-500', 'bg-violet-500', 'bg-cyan-500', 'bg-amber-500', 'bg-rose-500', 'bg-blue-500', 'bg-teal-500', 'bg-fuchsia-500', 'bg-lime-500']

              return (
                <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono gap-1">
                    <span className="font-bold text-zinc-700">Total Capital Allocated:</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-black ${isBalanced ? 'text-emerald-700' : diffEur > 0 ? 'text-rose-600' : 'text-amber-600'}`}>
                        {formatMoney(totalAllocatedEur, 'EUR')} of {formatMoney(monthlyContribution, 'EUR')} ({totalAllocatedPct.toFixed(1)}% — {isBalanced ? 'Balanced 100%' : diffEur > 0 ? `+€${diffEur.toFixed(0)} Over Budget` : `€${Math.abs(diffEur).toFixed(0)} Unallocated Cash`})
                      </span>
                      {!isBalanced && (
                        <button
                          type="button"
                          onClick={() => setMonthlyContribution(Math.round(totalAllocatedEur))}
                          className="px-2 py-0.5 rounded bg-zinc-900 text-white font-mono text-[10px] font-bold hover:bg-zinc-800 transition-colors shadow-2xs cursor-pointer"
                          title="Instantly set monthly contribution to match total allocated euros"
                        >
                          Sync Savings Budget to €{Math.round(totalAllocatedEur)}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="w-full bg-zinc-200 rounded-full h-2 overflow-hidden flex">
                    {knownAssets.map((asset, i) => {
                      const userEur = dcaEuroAllocations[asset.symbol] != null ? dcaEuroAllocations[asset.symbol] : Math.round(((dcaAllocations[asset.symbol] ?? 20) / 100) * monthlyContribution)
                      const pct = monthlyContribution > 0 ? (userEur / monthlyContribution) * 100 : 0
                      const colorClass = palette[i % palette.length]
                      return pct > 0 ? (
                        <div
                          key={asset.symbol}
                          style={{ width: `${Math.min(100, pct)}%` }}
                          className={`${colorClass} h-full transition-all`}
                          title={`${asset.symbol}: €${userEur} (${pct.toFixed(1)}%)`}
                        />
                      ) : null
                    })}
                  </div>
                  {/* Preset Allocation Strategies & Auto-Balance */}
                  <div className="flex items-center gap-2 pt-2 flex-wrap text-xs">
                    <span className="text-[11px] text-zinc-400 font-medium">Preset Allocations & Balancing:</span>
                    <button
                      onClick={() => {
                        const total = knownAssets.reduce((sum, a) => sum + (dcaEuroAllocations[a.symbol] ?? 0), 0)
                        if (total > 0) {
                          const scale = monthlyContribution / total
                          const nextEur: Record<string, number> = {}
                          const nextPct: Record<string, number> = {}
                          let accEur = 0
                          knownAssets.forEach((a, i) => {
                            if (i === knownAssets.length - 1) {
                              const rem = Math.max(0, monthlyContribution - accEur)
                              nextEur[a.symbol] = rem
                              nextPct[a.symbol] = parseFloat(((rem / monthlyContribution) * 100).toFixed(1))
                            } else {
                              const sc = Math.round((dcaEuroAllocations[a.symbol] ?? 0) * scale)
                              nextEur[a.symbol] = sc
                              accEur += sc
                              nextPct[a.symbol] = parseFloat(((sc / monthlyContribution) * 100).toFixed(1))
                            }
                          })
                          setDcaEuroAllocations(nextEur)
                          setDcaAllocations(nextPct)
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg border border-emerald-300 bg-emerald-50 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 flex items-center gap-1 shadow-2xs cursor-pointer"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                      Scale Allocations to €{monthlyContribution}
                    </button>
                    <button
                      onClick={() => {
                        const nextPct: Record<string, number> = {}
                        const nextEur: Record<string, number> = {}
                        if (knownAssets.length <= 1) {
                          if (knownAssets[0]) {
                            nextPct[knownAssets[0].symbol] = 100
                            nextEur[knownAssets[0].symbol] = monthlyContribution
                          }
                        } else {
                          const coreEur = Math.round(monthlyContribution * 0.5)
                          nextPct[primaryAsset.symbol] = 50
                          nextEur[primaryAsset.symbol] = coreEur
                          const otherCount = knownAssets.length - 1
                          const remEur = monthlyContribution - coreEur
                          const eachPct = parseFloat((50 / otherCount).toFixed(1))
                          let accE = 0
                          satelliteAssets.forEach((a, i) => {
                            if (i === satelliteAssets.length - 1) {
                              const lastE = Math.max(0, remEur - accE)
                              nextEur[a.symbol] = lastE
                              nextPct[a.symbol] = Math.max(0, 100 - 50 - (eachPct * (otherCount - 1)))
                            } else {
                              const e = Math.round(remEur / otherCount)
                              nextEur[a.symbol] = e
                              nextPct[a.symbol] = eachPct
                              accE += e
                            }
                          })
                        }
                        setDcaAllocations(nextPct)
                        setDcaEuroAllocations(nextEur)
                      }}
                      className="px-2 py-0.5 rounded border border-zinc-200 bg-white text-[11px] font-bold text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                    >
                      Core &amp; Satellite (50% {primaryAsset.symbol})
                    </button>
                    <button
                      onClick={() => {
                        const n = Math.max(1, knownAssets.length)
                        const eachPct = parseFloat((100 / n).toFixed(1))
                        const eachEur = Math.floor(monthlyContribution / n)
                        const nextPct: Record<string, number> = {}
                        const nextEur: Record<string, number> = {}
                        let accE = 0
                        knownAssets.forEach((a, i) => {
                          if (i === knownAssets.length - 1) {
                            nextEur[a.symbol] = Math.max(0, monthlyContribution - accE)
                            nextPct[a.symbol] = Math.max(0, 100 - (eachPct * (n - 1)))
                          } else {
                            nextEur[a.symbol] = eachEur
                            nextPct[a.symbol] = eachPct
                            accE += eachEur
                          }
                        })
                        setDcaAllocations(nextPct)
                        setDcaEuroAllocations(nextEur)
                      }}
                      className="px-2 py-0.5 rounded border border-zinc-200 bg-white text-[11px] font-bold text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                    >
                      Equal Weight ({Math.round(100 / Math.max(1, knownAssets.length))}% each)
                    </button>
                    <button
                      onClick={() => {
                        const nextPct: Record<string, number> = {}
                        const nextEur: Record<string, number> = {}
                        let accPct = 0
                        let accEur = 0
                        knownAssets.forEach((a, i) => {
                          const h = holdings.find((x: any) => x.symbol === a.symbol || x.symbol?.replace('.DE', '') === a.symbol?.replace('.DE', ''))
                          const curVal = Number(h?.marketValue) || (Number(h?.quantity || 0) * Number(h?.currentPrice || a.defaultPrice))
                          const w = totalHoldingsVal > 0 ? Math.round((curVal / totalHoldingsVal) * 100) : Math.round(100 / knownAssets.length)
                          const eurVal = Math.round((w / 100) * monthlyContribution)
                          if (i === knownAssets.length - 1) {
                            nextPct[a.symbol] = Math.max(0, 100 - accPct)
                            nextEur[a.symbol] = Math.max(0, monthlyContribution - accEur)
                          } else {
                            nextPct[a.symbol] = w
                            nextEur[a.symbol] = eurVal
                            accPct += w
                            accEur += eurVal
                          }
                        })
                        setDcaAllocations(nextPct)
                        setDcaEuroAllocations(nextEur)
                      }}
                      className="px-2 py-0.5 rounded border border-zinc-200 bg-white text-[11px] font-bold text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                    >
                      Match Current Portfolio Weights
                    </button>
                  </div>
                </div>
              )
            })()}

            {/* Plain English Explainer Banner */}
            <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200 text-xs text-blue-900 space-y-1">
              <div className="flex items-center gap-2 font-bold text-blue-950">
                <Info className="h-4 w-4 text-blue-700" />
                <span>What Monthly Allocation (% / €) Means and How It Works:</span>
              </div>
              <p className="text-blue-800 leading-relaxed font-sans">
                Specify what portion of your monthly savings (<strong>{formatMoney(monthlyContribution, 'EUR')}</strong>) goes into each ETF. 
                Adjust the slider with 1€ precision or <strong>type directly in percent (%) or exact euros (€)</strong>. 
                The <strong>BUY DIP</strong> badges show which ETFs are underweight relative to your target, enabling you to build them up with fresh capital 
                <strong>without ever needing to sell winning positions</strong> (100% tax-free rebalancing with zero broker spreads).
              </p>
            </div>

            {/* DCA Deployment Matrix Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50/70 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    <th className="py-3 px-4">Holding</th>
                    <th className="py-3 px-3">Live Price</th>
                    <th className="py-3 px-3">Current Weight</th>
                    <th className="py-3 px-4 min-w-[280px]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <span>Monthly Allocation</span>
                          <MetricTooltip
                            title="Monthly Savings Allocation"
                            description="The percentage (%) or euro amount (€) from your monthly savings budget invested into this ETF each month."
                          >
                            <Info className="h-3 w-3 text-zinc-400 cursor-pointer" />
                          </MetricTooltip>
                        </div>
                        {/* % vs € Toggle */}
                        <div className="flex items-center bg-zinc-200/80 rounded-md p-0.5 text-[10px] font-mono">
                          <button
                            type="button"
                            onClick={() => setDcaInputMode('pct')}
                            className={`px-1.5 py-0.5 rounded font-bold transition-all cursor-pointer ${
                              dcaInputMode === 'pct' ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-500 hover:text-zinc-800'
                            }`}
                          >
                            %
                          </button>
                          <button
                            type="button"
                            onClick={() => setDcaInputMode('eur')}
                            className={`px-1.5 py-0.5 rounded font-bold transition-all cursor-pointer ${
                              dcaInputMode === 'eur' ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-500 hover:text-zinc-800'
                            }`}
                          >
                            €
                          </button>
                        </div>
                      </div>
                    </th>
                    <th className="py-3 px-3 text-right">Monthly Deployed</th>
                    <th className="py-3 px-3 text-right">Est. Shares / Mo</th>
                    <th className="py-3 px-3 text-right">Annual Deployed</th>
                    <th className="py-3 px-4 text-center">Smart Rebalance Signal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-mono">
                  {knownAssets.map((asset) => {
                    const holdingObj = holdings.find((h: any) => h.symbol === asset.symbol || h.symbol?.replace('.DE', '') === asset.symbol?.replace('.DE', ''))
                    const currentPrice = Number(holdingObj?.currentPrice || asset.defaultPrice)
                    const holdingVal = Number(holdingObj?.marketValue) || (Number(holdingObj?.quantity || 0) * currentPrice)
                    const currentWeightPct = totalHoldingsVal > 0 ? (holdingVal / totalHoldingsVal) * 100 : 20.0

                    const userEuro = dcaEuroAllocations[asset.symbol] != null
                      ? dcaEuroAllocations[asset.symbol]
                      : Math.round(((dcaAllocations[asset.symbol] ?? 20) / 100) * monthlyContribution)

                    const targetDcaPct = monthlyContribution > 0
                      ? parseFloat(((userEuro / monthlyContribution) * 100).toFixed(1))
                      : (dcaAllocations[asset.symbol] ?? 20)

                    const monthlyEur = userEuro
                    const sharesPerMonth = currentPrice > 0 ? monthlyEur / currentPrice : 0
                    const annualEur = monthlyEur * 12
                    const annualShares = sharesPerMonth * 12

                    // Smart DCA rebalance signal: compare current weight to target DCA weight
                    const weightDiff = currentWeightPct - targetDcaPct
                    let signalBadge = (
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-zinc-100 text-zinc-600">
                        BALANCED
                      </span>
                    )
                    if (weightDiff < -3.0) {
                      signalBadge = (
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 justify-center">
                          <TrendingDown className="h-3 w-3" /> BUY DIP ({Math.abs(weightDiff).toFixed(1)}% Under)
                        </span>
                      )
                    } else if (weightDiff > 3.0) {
                      signalBadge = (
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 justify-center">
                          <TrendingUp className="h-3 w-3" /> OVERWEIGHT (+{weightDiff.toFixed(1)}%)
                        </span>
                      )
                    }

                    return (
                      <tr key={asset.symbol} className="hover:bg-zinc-50/80">
                        <td className="py-3 px-4">
                          <span className="font-bold text-zinc-900 block text-sm">{asset.symbol}</span>
                          <span className="text-[11px] text-zinc-500 font-sans">{asset.name}</span>
                        </td>
                        <td className="py-3 px-3 font-extrabold text-zinc-900">
                          {formatMoney(currentPrice, 'EUR')}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-zinc-700">{currentWeightPct.toFixed(1)}%</span>
                          <span className="text-[10px] text-zinc-400 block">({formatMoney(holdingVal, 'EUR')})</span>
                        </td>
                        <td className="py-3 px-4 min-w-[280px]">
                          <div className="space-y-1.5">
                            {/* Slider - synchronized to active mode */}
                            {dcaInputMode === 'pct' ? (
                              <input
                                type="range"
                                min="0"
                                max="100"
                                step="0.5"
                                value={targetDcaPct}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0
                                  const nextEur = Math.round(((val / 100) * monthlyContribution) * 100) / 100
                                  setDcaAllocations((prev) => ({ ...prev, [asset.symbol]: val }))
                                  setDcaEuroAllocations((prev) => ({ ...prev, [asset.symbol]: nextEur }))
                                }}
                                className="w-full accent-zinc-900 cursor-pointer h-1.5"
                              />
                            ) : (
                              <input
                                type="range"
                                min="0"
                                max={Math.max(monthlyContribution * 1.5, 1200)}
                                step="1"
                                value={userEuro}
                                onChange={(e) => {
                                  const euroVal = parseFloat(e.target.value) || 0
                                  const nextPct = monthlyContribution > 0 ? parseFloat(((euroVal / monthlyContribution) * 100).toFixed(1)) : 0
                                  setDcaEuroAllocations((prev) => ({ ...prev, [asset.symbol]: euroVal }))
                                  setDcaAllocations((prev) => ({ ...prev, [asset.symbol]: nextPct }))
                                }}
                                className="w-full accent-emerald-600 cursor-pointer h-1.5"
                              />
                            )}

                            {/* Direct dual-inputs with editing buffer to prevent snapbacks */}
                            <div className="flex items-center justify-between gap-2">
                              {/* Percentage Input */}
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={
                                    editingInput?.symbol === asset.symbol && editingInput.field === 'pct'
                                      ? editingInput.raw
                                      : targetDcaPct % 1 === 0 ? String(targetDcaPct) : targetDcaPct.toFixed(1)
                                  }
                                  onFocus={() => {
                                    setEditingInput({ symbol: asset.symbol, field: 'pct', raw: String(targetDcaPct) })
                                  }}
                                  onChange={(e) => {
                                    let raw = e.target.value.replace(/[^\d.]/g, '')
                                    if (/^0\d+/.test(raw) && !raw.startsWith('0.')) {
                                      raw = raw.replace(/^0+/, '')
                                    }
                                    setEditingInput({ symbol: asset.symbol, field: 'pct', raw })
                                    if (raw === '') {
                                      setDcaAllocations((prev) => ({ ...prev, [asset.symbol]: 0 }))
                                      setDcaEuroAllocations((prev) => ({ ...prev, [asset.symbol]: 0 }))
                                      return
                                    }
                                    const num = parseFloat(raw)
                                    if (!isNaN(num)) {
                                      const clampedPct = Math.min(100, Math.max(0, num))
                                      const nextEur = Math.round(((clampedPct / 100) * monthlyContribution) * 100) / 100
                                      setDcaAllocations((prev) => ({ ...prev, [asset.symbol]: clampedPct }))
                                      setDcaEuroAllocations((prev) => ({ ...prev, [asset.symbol]: nextEur }))
                                    }
                                  }}
                                  onBlur={() => setEditingInput(null)}
                                  className="w-14 rounded-lg border border-zinc-300 px-1.5 py-0.5 text-xs font-mono font-black text-zinc-900 text-right focus:border-zinc-900 focus:outline-none"
                                />
                                <span className="text-xs font-bold text-zinc-500">%</span>
                              </div>

                              <span className="text-xs text-zinc-400 font-sans">or</span>

                              {/* Euro Input */}
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={
                                    editingInput?.symbol === asset.symbol && editingInput.field === 'eur'
                                      ? editingInput.raw
                                      : String(userEuro)
                                  }
                                  onFocus={() => {
                                    setEditingInput({ symbol: asset.symbol, field: 'eur', raw: String(userEuro) })
                                  }}
                                  onChange={(e) => {
                                    let raw = e.target.value.replace(/[^\d.]/g, '')
                                    if (/^0\d+/.test(raw) && !raw.startsWith('0.')) {
                                      raw = raw.replace(/^0+/, '')
                                    }
                                    setEditingInput({ symbol: asset.symbol, field: 'eur', raw })
                                    if (raw === '') {
                                      setDcaEuroAllocations((prev) => ({ ...prev, [asset.symbol]: 0 }))
                                      setDcaAllocations((prev) => ({ ...prev, [asset.symbol]: 0 }))
                                      return
                                    }
                                    const euroVal = parseFloat(raw)
                                    if (!isNaN(euroVal)) {
                                      setDcaEuroAllocations((prev) => ({ ...prev, [asset.symbol]: euroVal }))
                                      const nextPct = monthlyContribution > 0 ? parseFloat(((euroVal / monthlyContribution) * 100).toFixed(1)) : 0
                                      setDcaAllocations((prev) => ({ ...prev, [asset.symbol]: nextPct }))
                                    }
                                  }}
                                  onBlur={() => setEditingInput(null)}
                                  className="w-16 rounded-lg border border-zinc-300 px-1.5 py-0.5 text-xs font-mono font-black text-emerald-700 text-right focus:border-emerald-600 focus:outline-none"
                                />
                                <span className="text-xs font-bold text-emerald-700">€</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-black text-emerald-700 text-sm">
                          {formatMoney(monthlyEur, 'EUR')}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-zinc-700">
                          +{sharesPerMonth.toFixed(3)}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className="font-bold text-zinc-900 block">{formatMoney(annualEur, 'EUR')}</span>
                          <span className="text-[10px] text-zinc-500 block">+{annualShares.toFixed(2)} sh/yr</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {signalBadge}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Smart DCA Rebalancing Explanation Banner */}
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">Frictionless Inflow Rebalancing Active</h4>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    By funneling monthly capital into underweight positions, your portfolio rebalances toward optimal risk weights without selling winning assets or creating taxable realized gains under Greek Law 4172/2013.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )}

      {/* TAB 3: INSTITUTIONAL MACRO INTELLIGENCE SUITE */}
      {activeTab === 'macro_suite' && (
        <div className="space-y-6">
          {/* Top 4 Macro Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Fear & Greed Card */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Fear & Greed Index</span>
                  <MetricTooltip
                    title="Fear & Greed Index (Institutional Multi-Factor & VIX)"
                    width="w-80 sm:w-96"
                    description={`Institutional composite market sentiment indicator (0-100 scale).\n\nFactor Breakdown:\n• VIX Volatility (30%): Live reading at ${sentiment?.vixValue ?? 14.2} (${sentiment?.vixRegime ?? 'Low Volatility'})\n• Market Momentum (25%): S&P 500 vs 125-day moving average\n• Stock Price Strength (20%): S&P 500 RSI-14 momentum\n• Safe Haven Demand (15%): Equities (SPY) vs Treasuries (TLT)\n• Market Breadth (10%): Short-term vs long-term moving average spread\n\nInterpretation: Extreme greed signals overextended late-cycle valuations; extreme fear signals contrarian accumulation zones.`}
                    benchmarks={[
                      { label: 'Extreme Greed (Caution)', range: '76 - 100', status: 'elite' },
                      { label: 'Greed (Expansionary)', range: '56 - 75', status: 'good' },
                      { label: 'Neutral (Consolidation)', range: '45 - 55', status: 'neutral' },
                      { label: 'Fear (Risk-Off)', range: '25 - 44', status: 'bad' },
                      { label: 'Extreme Fear (Capitulation)', range: '0 - 24', status: 'bad' },
                    ]}
                    verdict={sentiment?.rating ?? 'GREED'}
                  />
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                  (sentiment?.score ?? 50) >= 60 ? 'bg-emerald-100 text-emerald-800' :
                  (sentiment?.score ?? 50) >= 45 ? 'bg-zinc-100 text-zinc-700' : 'bg-rose-100 text-rose-800'
                }`}>
                  {sentiment?.rating ?? 'GREED'}
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-3xl font-black font-mono text-zinc-900">{sentiment?.score ?? 58}<span className="text-sm font-normal text-zinc-400">/100</span></span>
                <span className="text-xs font-bold font-mono text-zinc-500">1W: {sentiment?.oneWeekAgoScore ?? 52}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-1">
                <span className="truncate">{sentiment?.macroRegime ?? 'EXPANSION / TECH MOMENTUM'}</span>
                {sentiment?.vixValue && (
                  <span className="font-mono font-semibold text-zinc-600 shrink-0 ml-1">VIX: {sentiment.vixValue}</span>
                )}
              </div>
            </div>

            {/* 10Y Yield Card */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">10-Year US Treasury Yield</span>
                  <MetricTooltip
                    title="US Treasury Yield Curve & Recession Dynamics (NY Fed Model)"
                    width="w-80 sm:w-[28rem]"
                    description={`The US Treasury yield curve is primarily a recession indicator, not an immediate crash predictor.\n\nClassic Inversion occurs when short-term yields trade higher than long-term yields. Historically, sustained inversion has preceded post-war US recessions, with the NY Fed finding maximum predictive power in the 10Y–3M yield spread.\n\nTransmission Mechanism to Equities:\nFed raises rates → short-term yields surge → yield curve flattens/inverts → tighter credit & economic deceleration → corporate earnings compress → risk asset repricing.\n\nThe Crucial Nuance:\nInversion itself does not trigger an equity drawdown; equities often rally throughout inverted regimes. The critical phase typically occurs during "Bull Steepening" / rapid un-inversion, when the Fed cuts rates in emergency response to labor market deterioration.\n\nLive Term Structure:\n3M: ${treasuryYields?.threeMonthYield ?? 3.98}%, 2Y: ${treasuryYields?.twoYearYield ?? 4.42}%, 5Y: ${treasuryYields?.fiveYearYield ?? 4.83}%, 10Y: ${treasuryYields?.tenYearYield ?? 4.96}%, 30Y: ${treasuryYields?.thirtyYearYield ?? 5.30}%.\n\nCurrent Spread Status: 10Y-2Y (+${treasuryYields?.spread10Y2YBps ?? 54} bps) and 10Y-3M (+${treasuryYields?.spread10Y3MBps ?? 98} bps) are normal/steepening, reflecting expansionary conditions without inversion risk.`}
                    benchmarks={[
                      { label: 'Normal / Steepening', range: '> +25 bps', status: 'good' },
                      { label: 'Un-Inverting (Normalizing)', range: '0 to +25 bps', status: 'neutral' },
                      { label: 'Inverted (Recession Signal)', range: '< 0 bps', status: 'bad' },
                    ]}
                    verdict={`NY Fed 12M Recession Prob: ${treasuryYields?.nyFedRecessionProbPct ?? 12.4}%`}
                  />
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 text-blue-800">
                  {treasuryYields?.isLive ? 'LIVE FRED/^TNX' : 'LIVE YAHOO'}
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-3xl font-black font-mono text-blue-700">{treasuryYields?.tenYearYield ?? 4.96}%</span>
                <span className="text-xs font-bold font-mono text-emerald-700">2Y: {treasuryYields?.twoYearYield ?? 4.42}%</span>
              </div>
              <div className="text-[11px] text-zinc-500 mt-1 flex flex-col gap-0.5">
                <span>
                  Spread (10Y-2Y): <strong>{treasuryYields?.spread10Y2YBps != null ? `${treasuryYields.spread10Y2YBps > 0 ? '+' : ''}${treasuryYields.spread10Y2YBps} bps` : '+54 bps'}</strong>
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  NY Fed (10Y-3M): +{treasuryYields?.spread10Y3MBps ?? 98} bps (Recession: {treasuryYields?.nyFedRecessionProbPct ?? 12.4}%)
                </span>
              </div>
            </div>

            {/* Fed Funds Rate Card */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Fed Policy Rate & Neutral</span>
                  <MetricTooltip
                    title="Federal Reserve Policy Target & Neutral Rate (r*)"
                    width="w-80 sm:w-[26rem]"
                    description={`The Federal Open Market Committee (FOMC) benchmark interest rate.\n\n• Current Policy Target: ${fomcDotPlot?.currentPolicyRate ?? '4.25% - 4.50%'}\n• Effective Fed Funds: ${fomcDotPlot?.effectiveFundsRate ?? 4.33}%\n• Neutral Rate Target (r*): ${fomcDotPlot?.neutralRateLongerRun ?? 2.875}%\n\nTransmission to Portfolios:\nLower interest rates reduce the discount rate on future corporate cash flows, expanding equity valuation multiples (DCF multiple expansion). Lower rates also decrease corporate debt service costs for capital investments.`}
                    benchmarks={[
                      { label: 'Restrictive Policy', range: '> 4.50%', status: 'bad' },
                      { label: 'Neutral Band (r*)', range: '2.75% - 3.25%', status: 'neutral' },
                      { label: 'Accommodative / Easing', range: '< 2.75%', status: 'good' },
                    ]}
                    verdict={fomcDotPlot?.policyStance ?? 'EASING CYCLE'}
                  />
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-100 text-indigo-800">
                  EASING CYCLE
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono text-indigo-900">{fomcDotPlot?.currentPolicyRate ?? '4.25% - 4.50%'}</span>
                <span className="text-xs font-bold font-mono text-zinc-500">Eff: {fomcDotPlot?.effectiveFundsRate ?? 4.33}%</span>
              </div>
              <span className="text-[11px] text-zinc-500 mt-1 block">
                Longer-Run Neutral Target: <strong>{fomcDotPlot?.neutralRateLongerRun ?? 2.875}%</strong>
              </span>
            </div>

            {/* Hyperscaler CapEx Card */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Hyperscaler Cloud CapEx</span>
                  <MetricTooltip
                    title="Hyperscaler Cloud & AI Datacenter CapEx"
                    width="w-80 sm:w-[26rem]"
                    description={`Consolidated annual capital expenditures (CapEx) from Microsoft, Alphabet (Google), Amazon AWS, and Meta.\n\n• Projected 2025/2026: $${hyperscalerCapEx?.aggregateCapEx2025ProjectedB ?? 270}B (+${hyperscalerCapEx?.aggregateYoYGrowthPct ?? 36}% YoY)\n• 2024 Actual Baseline: $${hyperscalerCapEx?.aggregateCapEx2024B ?? 198.5}B\n\nPortfolio Transmission Channels:\n1. Semiconductor Equipment (SMH, NVDA, TSM, ASML): Direct suppliers of GPUs, custom ASICs, and wafer fabs.\n2. Power & Clean Energy (CEG, VST, Nuclear): Hyperscalers signing 20-year Power Purchase Agreements (PPAs) to supply round-the-clock baseload power.`}
                    benchmarks={[
                      { label: 'Supercycle Expansion', range: '> +25% YoY', status: 'elite' },
                      { label: 'Sustained Growth', range: '+10% to +25%', status: 'good' },
                      { label: 'CapEx Digestion/Slowdown', range: '< +10% YoY', status: 'bad' },
                    ]}
                    verdict={`+$${((hyperscalerCapEx?.aggregateCapEx2025ProjectedB ?? 270) - (hyperscalerCapEx?.aggregateCapEx2024B ?? 198.5)).toFixed(1)}B Incremental Spend`}
                  />
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                  +{hyperscalerCapEx?.aggregateYoYGrowthPct ?? 36.0}% YoY
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-3xl font-black font-mono text-emerald-700">${hyperscalerCapEx?.aggregateCapEx2025ProjectedB ?? 270.0}B</span>
                <span className="text-xs font-bold font-mono text-zinc-500">2024: ${hyperscalerCapEx?.aggregateCapEx2024B ?? 198.5}B</span>
              </div>
              <span className="text-[11px] text-zinc-500 mt-1 block truncate">
                MSFT, GOOGL, AMZN, META AI Datacenters
              </span>
            </div>
          </div>

          {/* DYNAMIC TERM STRUCTURE & YIELD CURVE PANEL */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-blue-900 px-2 py-0.5 text-[10px] font-bold text-white font-mono">
                    US TREASURY TERM STRUCTURE
                  </span>
                  <span className="text-xs text-zinc-400 font-medium">Live Risk-Free Yield Curve: 3M • 2Y • 5Y • 10Y • 30Y</span>
                </div>
                <h3 className="text-base font-bold text-zinc-900 mt-1">Multi-Maturity Term Premium & NY Fed Recession Signal</h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Monitors the complete sovereign yield curve. Short rates reflect Fed policy stance while long yields price terminal growth, inflation, and term premium.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-right">
                  <span className="text-[10px] font-bold uppercase text-blue-700 block">Curve Slope</span>
                  <span className="text-xs font-extrabold text-blue-950">
                    {treasuryYields?.spread10Y2YBps != null && treasuryYields.spread10Y2YBps > 0 ? 'UPWARD SLOPING (UN-INVERTED)' : 'INVERTED'}
                  </span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-right">
                  <span className="text-[10px] font-bold uppercase text-emerald-700 block">NY Fed 12M Recession Prob</span>
                  <span className="text-xs font-extrabold text-emerald-950 font-mono">
                    {treasuryYields?.nyFedRecessionProbPct ?? 12.4}% (Low Risk)
                  </span>
                </div>
              </div>
            </div>

            {/* 5-Maturity Interactive Visual Curve */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
              {[
                { maturity: '3M', name: '13-Week T-Bill', yield: treasuryYields?.threeMonthYield ?? 3.98, role: 'Fed Policy Proxy' },
                { maturity: '2Y', name: '2-Year Note', yield: treasuryYields?.twoYearYield ?? 4.42, role: 'Policy Path Expectation' },
                { maturity: '5Y', name: '5-Year Note', yield: treasuryYields?.fiveYearYield ?? 4.83, role: 'Medium-Term Neutral' },
                { maturity: '10Y', name: '10-Year Benchmark', yield: treasuryYields?.tenYearYield ?? 4.96, role: 'Global Cost of Capital' },
                { maturity: '30Y', name: '30-Year Long Bond', yield: treasuryYields?.thirtyYearYield ?? 5.30, role: 'Long-Run Inflation & Debt' },
              ].map((point, idx) => {
                const minVal = 3.0
                const maxVal = 6.0
                const pct = Math.max(10, Math.min(100, ((point.yield - minVal) / (maxVal - minVal)) * 100))

                return (
                  <div key={point.maturity} className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 hover:border-blue-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 font-mono font-black text-xs">
                        {point.maturity}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-medium truncate max-w-[90px]">{point.role}</span>
                    </div>

                    <div className="mt-2.5 flex items-baseline justify-between">
                      <span className="text-2xl font-black font-mono text-zinc-900">{point.yield}%</span>
                      <span className="text-[10px] font-mono text-zinc-400">#0{idx + 1}</span>
                    </div>
                    <span className="text-[11px] text-zinc-500 block truncate">{point.name}</span>

                    {/* Yield relative bar */}
                    <div className="mt-2.5 h-1.5 w-full bg-zinc-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Institutional Clarification Notice */}
            <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5">
              <Info className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1 leading-relaxed">
                <p className="font-semibold text-amber-900">
                  Institutional Insight: The yield curve is primarily a recession indicator, not an immediate crash predictor.
                </p>
                <p className="text-zinc-600 text-[11px]">
                  Historically, equity markets often continue expanding while the curve is inverted. The high-risk phase typically emerges when real economic slowdown materializes and the Fed initiates emergency rate cuts. With 2Y yields at ~{treasuryYields?.twoYearYield ?? 4.42}% and 10Y yields at ~{treasuryYields?.tenYearYield ?? 4.96}%, the 10Y-2Y spread remains positive (+{treasuryYields?.spread10Y2YBps ?? 54} bps) and the 10Y-3M spread stands at +{treasuryYields?.spread10Y3MBps ?? 98} bps.
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 1: FED RATE PATH & FOMC DOT PLOT */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-indigo-900 px-2 py-0.5 text-[10px] font-bold text-white font-mono">
                    FOMC SUMMARY OF ECONOMIC PROJECTIONS
                  </span>
                  <span className="text-xs text-zinc-400 font-medium">Federal Reserve Dot Plot & Meeting Probabilities</span>
                </div>
                <h2 className="text-lg font-bold text-zinc-900 mt-1">Fed Interest Rate Path & Voting Member Projections</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Tracks individual Fed governor rate projections and market-implied rate cut probabilities across upcoming FOMC meetings.
                </p>
              </div>

              <div className="text-right font-mono">
                <span className="text-[10px] font-bold uppercase text-zinc-400 block">Current Policy Stance</span>
                <span className="text-sm font-extrabold text-indigo-700">{fomcDotPlot?.policyStance ?? 'ACTIVE EASING CYCLE (-25 BPS PER QUARTER)'}</span>
              </div>
            </div>

            {/* Beginner-Friendly Terminology & Institutional Guide */}
            <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-3">
              <div className="flex items-center gap-2 text-indigo-950 font-bold text-sm">
                <Sparkles className="h-4 w-4 text-indigo-700 shrink-0" />
                <span>Beginner's Guide: What These Terms Mean & Why They Matter To Your ETFs</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {/* Term 1: Basis Points (bps) */}
                <div className="p-3 rounded-lg bg-white border border-indigo-100 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <strong className="text-indigo-950 font-mono text-[11px] uppercase">Basis Points (bps)</strong>
                    <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                      1 bps = 0.01%
                    </span>
                  </div>
                  <p className="text-zinc-600 leading-relaxed text-[11px]">
                    1 basis point (bps) is <strong>0.01%</strong>. So <strong>25 bps = 0.25%</strong>, <strong>50 bps = 0.50%</strong>, and <strong>100 bps = 1.00%</strong>. Central banks change rates in 25 bps steps; a <em>"-25 bps cut"</em> means interest rates drop by 0.25%.
                  </p>
                </div>

                {/* Term 2: Projected Rates (e.g. 4.125%, 3.625%) */}
                <div className="p-3 rounded-lg bg-white border border-indigo-100 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <strong className="text-indigo-950 font-mono text-[11px] uppercase">Rate Midpoints (%)</strong>
                    <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                      25 bps Range
                    </span>
                  </div>
                  <p className="text-zinc-600 leading-relaxed text-[11px]">
                    The Fed doesn't set a single fixed rate; it sets a target range that is 25 bps wide (e.g. 4.00% to 4.25%). The numbers shown (such as <strong>4.125%</strong> or <strong>3.625%</strong>) are the exact mathematical middle of each range.
                  </p>
                </div>

                {/* Term 3: What is the Dot Plot & Median? */}
                <div className="p-3 rounded-lg bg-white border border-indigo-100 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <strong className="text-indigo-950 font-mono text-[11px] uppercase">The Dot Plot & Median</strong>
                    <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                      19 Policymakers
                    </span>
                  </div>
                  <p className="text-zinc-600 leading-relaxed text-[11px]">
                    19 voting Federal Reserve officials submit anonymous year-end rate forecasts. <strong>Each dot represents 1 official</strong>. The <strong>Median</strong> is the middle consensus vote showing the planned policy trajectory.
                  </p>
                </div>

                {/* Term 4: Why This Matters to Your ETFs */}
                <div className="p-3 rounded-lg bg-white border border-indigo-100 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <strong className="text-indigo-950 font-mono text-[11px] uppercase">Direct ETF Impact</strong>
                    <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Valuation Lift
                    </span>
                  </div>
                  <p className="text-zinc-600 leading-relaxed text-[11px]">
                    When rates fall, bank deposits yield less and corporate loans get cheaper. Money flows into <strong>VUAA (S&P 500)</strong> and <strong>SMH (Semiconductors)</strong>, driving up stock valuation multiples.
                  </p>
                </div>
              </div>
            </div>

            {/* Dot Plot Visual Grid */}
            <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                <div>
                  <h3 className="font-bold text-zinc-900">FOMC Participant Dot Plot Distribution</h3>
                  <span className="text-zinc-500 font-mono text-[11px]">Each dot = 1 Fed voting official's year-end policy target • Hover over dots for details</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-800 font-mono text-[11px] font-bold">
                  Long-Run Neutral Benchmark: {fomcDotPlot?.neutralRateLongerRun ?? 2.875}%
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 font-mono">
                {fomcDotPlot?.dotPlotDistribution?.map((item) => (
                  <div key={item.horizon} className="p-4 rounded-xl bg-white border border-zinc-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                      <div>
                        <span className="font-black text-sm text-zinc-900 block">{item.horizon}</span>
                        <span className="text-[10px] text-zinc-400 font-normal block">Year-End Target</span>
                      </div>
                      <MetricTooltip
                        title={`${item.horizon} Fed Median Target: ${item.median}%`}
                        description={`The consensus middle projection among all 19 voting Fed officials for end of ${item.horizon}. Corresponds to a target corridor of ${(item.median - 0.125).toFixed(2)}% - ${(item.median + 0.125).toFixed(2)}%.`}
                      >
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-50 text-indigo-800 border border-indigo-200 cursor-pointer">
                          Median: {item.median}%
                        </span>
                      </MetricTooltip>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold uppercase border-b border-zinc-100 pb-1">
                      <span>Rate Midpoint (Range)</span>
                      <span>Votes</span>
                    </div>

                    <div className="space-y-2">
                      {item.dots.map((dot) => {
                        const lowRange = (dot.rate - 0.125).toFixed(2)
                        const highRange = (dot.rate + 0.125).toFixed(2)
                        const effRate = fomcDotPlot?.effectiveFundsRate ?? 4.33
                        const diffBps = Math.round((dot.rate - effRate) * 100)

                        return (
                          <div key={dot.rate} className="flex items-center justify-between text-xs py-0.5">
                            <div>
                              <span className="text-zinc-800 font-extrabold block">{dot.rate}%</span>
                              <span className="text-[9px] text-zinc-400 block -mt-0.5">({lowRange}% - {highRange}%)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MetricTooltip
                                title={`${dot.count} Officials Project ${dot.rate}% by end of ${item.horizon}`}
                                description={`${dot.count} out of 19 Fed policymakers forecast the benchmark target rate will be in the ${lowRange}% - ${highRange}% corridor at end of ${item.horizon}. Compared to current ${effRate}%, this implies ${diffBps > 0 ? `+${diffBps} bps rate hikes` : diffBps < 0 ? `${diffBps} bps in rate cuts (${(Math.abs(diffBps) / 25).toFixed(0)} standard 25 bps cuts)` : 'rates remain unchanged'}.`}
                              >
                                <div className="flex gap-1 items-center cursor-pointer p-1 rounded hover:bg-zinc-100 transition-colors">
                                  {Array.from({ length: dot.count }).map((_, i) => (
                                    <span
                                      key={i}
                                      className="h-2.5 w-2.5 rounded-full bg-indigo-600 shadow-xs inline-block hover:scale-125 transition-transform"
                                    />
                                  ))}
                                </div>
                              </MetricTooltip>
                              <span className="text-[10px] text-zinc-400 font-bold w-4 text-right">{dot.count}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming FOMC Meetings Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50/70 text-[10px] font-bold uppercase text-zinc-400">
                    <th className="py-2.5 px-4">FOMC Meeting</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">
                      <div className="flex items-center gap-1">
                        <span>Expected Action</span>
                        <MetricTooltip
                          title="Expected Policy Action"
                          description="The most probable interest rate decision priced in by the financial markets. '-25 bps Cut' means lowering benchmark rates by 0.25%."
                        >
                          <Info className="h-3 w-3 text-zinc-400 cursor-pointer" />
                        </MetricTooltip>
                      </div>
                    </th>
                    <th className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span>Probability of Cut</span>
                        <MetricTooltip
                          title="Market-Implied Probability"
                          description="The percentage probability of an interest rate reduction derived from 30-Day Fed Funds futures contracts traded on the Chicago Mercantile Exchange (CME)."
                        >
                          <Info className="h-3 w-3 text-zinc-400 cursor-pointer" />
                        </MetricTooltip>
                      </div>
                    </th>
                    <th className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span>Implied Target Rate</span>
                        <MetricTooltip
                          title="Market-Implied Benchmark Rate"
                          description="The expected Federal Funds target rate midpoint following the conclusion of this FOMC meeting."
                        >
                          <Info className="h-3 w-3 text-zinc-400 cursor-pointer" />
                        </MetricTooltip>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {fomcDotPlot?.upcomingMeetings?.map((meeting) => (
                    <tr key={meeting.meeting} className="hover:bg-zinc-50/80">
                      <td className="py-2.5 px-4 font-bold text-zinc-900">{meeting.meeting}</td>
                      <td className="py-2.5 px-3 text-zinc-600">{meeting.date}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                          meeting.expectedAction.includes('Cut') ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-zinc-100 text-zinc-700'
                        }`}>
                          {meeting.expectedAction}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-indigo-700">
                        {meeting.probabilityCutPct}%
                      </td>
                      <td className="py-2.5 px-4 text-right font-extrabold text-zinc-900">
                        {meeting.impliedRate}%
                        <span className="text-[10px] text-zinc-400 font-normal ml-1">
                          ({(meeting.impliedRate - 0.125).toFixed(2)}%-{(meeting.impliedRate + 0.125).toFixed(2)}%)
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Transmission to Portfolio Holdings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-100">
                <span className="text-[10px] font-bold uppercase text-indigo-900 block font-mono">VUAA & SMH Multiple Expansion</span>
                <p className="text-xs text-indigo-800 mt-1">
                  {fomcDotPlot?.transmissionAnalysis?.vuaaImpact ?? 'Lower discount rates expand valuation multiples for S&P 500 (VUAA) and semiconductors (SMH).'}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-100">
                <span className="text-[10px] font-bold uppercase text-amber-900 block font-mono">Nuclear (WNUC) & Growth Re-Rating</span>
                <p className="text-xs text-amber-800 mt-1">
                  {fomcDotPlot?.transmissionAnalysis?.wnucImpact ?? 'Nuclear infrastructure is capital-intensive; rate cuts lower debt financing costs for SMR builds.'}
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 2: 10-YEAR TREASURY YIELD & YIELD CURVE */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-blue-900 px-2 py-0.5 text-[10px] font-bold text-white font-mono">
                    SOVEREIGN DEBT RADAR
                  </span>
                  <span className="text-xs text-zinc-400 font-medium">US Treasury Yield Curve & TIPS Real Rate</span>
                </div>
                <h2 className="text-lg font-bold text-zinc-900 mt-1">10-Year Benchmark Yield & 10Y-2Y Curve Spread</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  The 10-year yield defines the global discount rate for all financial assets. The 10Y-2Y spread monitors business cycle transitions.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 font-mono">
              <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200">
                <span className="text-[10px] font-bold uppercase text-blue-800 block">10-Year Treasury (^TNX)</span>
                <span className="text-2xl font-black text-blue-900 block mt-1">{treasuryYields?.tenYearYield ?? 4.08}%</span>
                <span className="text-[10px] text-blue-600 block mt-0.5">Global benchmark hurdle rate</span>
              </div>

              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
                <span className="text-[10px] font-bold uppercase text-zinc-600 block">2-Year Treasury (^IRX Proxy)</span>
                <span className="text-2xl font-black text-zinc-900 block mt-1">{treasuryYields?.twoYearYield ?? 3.96}%</span>
                <span className="text-[10px] text-zinc-500 block mt-0.5">Reflects short-term Fed policy</span>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200">
                <span className="text-[10px] font-bold uppercase text-emerald-800 block">10Y-2Y Yield Curve Spread</span>
                <span className="text-2xl font-black text-emerald-800 block mt-1">
                  {treasuryYields?.spread10Y2YBps != null ? `${treasuryYields.spread10Y2YBps > 0 ? '+' : ''}${treasuryYields.spread10Y2YBps} bps` : '+12 bps'}
                </span>
                <span className="text-[10px] text-emerald-700 block mt-0.5">{treasuryYields?.curveStatus ?? 'UN-INVERTING'}</span>
              </div>

              <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-200">
                <span className="text-[10px] font-bold uppercase text-indigo-800 block">10Y TIPS Real Rate</span>
                <span className="text-2xl font-black text-indigo-900 block mt-1">{treasuryYields?.realYield10YTIPSPct ?? 1.83}%</span>
                <span className="text-[10px] text-indigo-600 block mt-0.5">Inflation-adjusted risk-free yield</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-600 space-y-1">
              <strong className="text-zinc-900 block">Yield Curve Regime Analysis:</strong>
              <p>{treasuryYields?.curveDescription ?? 'The yield curve has transitioned out of deep inversion into positive territory. Historically, dis-inversion coincides with central bank easing, supporting high-ROE equity compounding.'}</p>
            </div>
          </div>

          {/* SECTION 3: INSTITUTIONAL FEAR & GREED INDEX PANEL */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-zinc-900 px-2 py-0.5 text-[10px] font-bold text-white font-mono">
                    SENTIMENT COCKPIT
                  </span>
                  <span className="text-xs text-zinc-400 font-medium">Quantitative Multi-Factor Market Sentiment</span>
                </div>
                <h2 className="text-lg font-bold text-zinc-900 mt-1">Institutional Fear & Greed Indicator</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Synthesizes CBOE VIX, 125-Day Momentum, RSI-14, Safe Haven Demand, and Market Breadth into an institutional 0-100 sentiment score.
                </p>
              </div>

              <div className="text-right font-mono">
                <span className="text-[10px] font-bold uppercase text-zinc-400 block">Market Regime</span>
                <span className="text-sm font-extrabold text-zinc-900">{sentiment?.macroRegime ?? 'EXPANSION / TECH MOMENTUM'}</span>
              </div>
            </div>

            {/* Visual Fear & Greed Gauge Bar */}
            <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-rose-600 font-bold">EXTREME FEAR (0)</span>
                <span className="text-amber-600 font-bold">FEAR (25)</span>
                <span className="text-zinc-600 font-bold">NEUTRAL (50)</span>
                <span className="text-emerald-600 font-bold">GREED (75)</span>
                <span className="text-indigo-600 font-bold">EXTREME GREED (100)</span>
              </div>
              <div className="relative w-full h-4 rounded-full bg-gradient-to-r from-rose-500 via-amber-400 via-zinc-400 via-emerald-500 to-indigo-600 overflow-hidden shadow-inner">
                <div
                  style={{ left: `${Math.min(98, Math.max(2, sentiment?.score ?? 58))}%` }}
                  className="absolute top-0 bottom-0 w-2 bg-white rounded-full shadow-md border border-zinc-900 transform -translate-x-1/2"
                />
              </div>
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>Current Score: <strong className="text-zinc-900 font-mono text-sm">{sentiment?.score ?? 58}/100</strong> ({sentiment?.rating ?? 'GREED'})</span>
                <span className="font-mono text-[11px]">Prev Close: {sentiment?.previousCloseScore ?? 55} | 1W Ago: {sentiment?.oneWeekAgoScore ?? 52} | 1M Ago: {sentiment?.oneMonthAgoScore ?? 48}</span>
              </div>
            </div>

            {/* 5 Sub-Factor Breakdown Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 font-mono">
              {sentiment?.factors?.map((factor, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1">
                  <span className="text-[10px] font-bold text-zinc-400 block uppercase truncate">{factor.factor.split('—')[0]}</span>
                  <span className="text-lg font-black text-zinc-900 block">{factor.score}<span className="text-[10px] text-zinc-400">/100</span></span>
                  <span className={`text-[10px] font-bold block ${
                    factor.score >= 60 ? 'text-emerald-700' : factor.score >= 45 ? 'text-zinc-600' : 'text-rose-600'
                  }`}>
                    {factor.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 4: HYPERSCALER CAPEX GUIDANCE TRACKER ($270B+) */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-emerald-900 px-2 py-0.5 text-[10px] font-bold text-white font-mono">
                    AI & CLOUD DATACENTER INFRASTRUCTURE
                  </span>
                  <span className="text-xs text-zinc-400 font-medium">Big 4 Hyperscaler Capital Expenditure Tracker</span>
                </div>
                <h2 className="text-lg font-bold text-zinc-900 mt-1">Hyperscaler CapEx Guidance: $270.0B Annual Investment</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Microsoft, Alphabet, Amazon, and Meta are deploying historic capital expenditure into AI supercomputers, custom silicon, and dedicated nuclear baseload power.
                </p>
              </div>

              <div className="text-right font-mono">
                <span className="text-[10px] font-bold uppercase text-zinc-400 block">Aggregate FY25 Guidance</span>
                <span className="text-2xl font-black text-emerald-700">${hyperscalerCapEx?.aggregateCapEx2025ProjectedB ?? 270.0}B</span>
                <span className="text-[10px] text-emerald-600 block">+{hyperscalerCapEx?.aggregateYoYGrowthPct ?? 36.0}% YoY Acceleration</span>
              </div>
            </div>

            {/* 4 Company Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
              {hyperscalerCapEx?.hyperscalers?.map((corp) => (
                <div key={corp.company} className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                    <div>
                      <span className="font-black text-sm text-zinc-900 block">{corp.company}</span>
                      <span className="text-[10px] text-zinc-500">{corp.ticker} • {corp.division}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                      +{corp.growthPct}% YoY
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase text-zinc-400 block">FY25 CapEx Guidance</span>
                    <span className="text-2xl font-black text-zinc-900 block">${corp.guidance2025B}B</span>
                    <span className="text-[10px] text-zinc-500">2024 Actual: ${corp.actual2024B}B</span>
                  </div>

                  <div className="space-y-1 text-[11px] font-sans text-zinc-600 border-t border-zinc-100 pt-2">
                    <strong className="text-zinc-900 block font-mono text-[10px] uppercase">Power & Nuclear Commitment:</strong>
                    <p className="text-[11px] text-emerald-900 bg-emerald-50/60 p-2 rounded-lg border border-emerald-100">
                      {corp.nuclearAndPowerFocus}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Transmission to User Holdings */}
            <div className="rounded-xl border border-zinc-200 overflow-hidden">
              <div className="p-3 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
                <h3 className="text-xs font-bold text-zinc-900">Direct Portfolio Transmission Links</h3>
                <span className="text-[11px] font-mono text-zinc-500">How Hyperscaler CapEx Directly Fuels Your 5 Holdings</span>
              </div>
              <div className="divide-y divide-zinc-100 text-xs">
                {hyperscalerCapEx?.portfolioTransmission?.map((item) => (
                  <div key={item.holdingSymbol} className="p-3.5 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="w-48 shrink-0">
                      <span className="font-mono font-bold text-sm text-zinc-900 block">{item.holdingSymbol}</span>
                      <span className="text-zinc-500 text-[11px]">{item.holdingName}</span>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-bold font-mono bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {item.weightInCapExFlow}
                      </span>
                    </div>
                    <p className="text-zinc-700 text-xs leading-relaxed">
                      {item.transmissionMechanism}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: RISK & REAL PURCHASING POWER */}
      {activeTab === 'risk_macro' && (
        <div className="space-y-6">
          {/* Top Risk Diagnostics KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Value at Risk (VaR 95% 1-Day)</span>
                <MetricTooltip
                  title="Value at Risk (VaR 95% 1-Day)"
                  description="The maximum expected daily capital loss under normal market conditions at a 95% statistical confidence interval."
                  benchmarks={[
                    { label: 'Low Tail-Risk', range: '< 1.5%', status: 'good' },
                    { label: 'Moderate / Standard Equities', range: '1.5% – 2.5%', status: 'neutral' },
                    { label: 'High Volatility Risk', range: '> 3.0%', status: 'bad' },
                  ]}
                  verdict="Defines maximum expected daily drawdown in 19 out of 20 trading sessions."
                  align="right"
                />
              </div>
              <span className="text-2xl font-black font-mono text-rose-600 mt-2 block">
                {diagnostics?.valueAtRisk?.var95_1d_amount != null ? formatMoney(diagnostics.valueAtRisk.var95_1d_amount, currentCurrency) : '—'}
              </span>
              <span className="text-[11px] text-zinc-400 mt-1 block">
                {diagnostics?.valueAtRisk?.var95_1d_pct != null ? `${diagnostics.valueAtRisk.var95_1d_pct}% portfolio tail-risk` : 'Calculated via RiskEngine'}
              </span>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Portfolio Sharpe Ratio</span>
                <MetricTooltip
                  title="Portfolio Sharpe Ratio"
                  description="Risk-adjusted return per unit of total portfolio volatility. Quantifies how efficiently risk generates returns."
                  benchmarks={[
                    { label: 'Sub-optimal', range: '< 1.0', status: 'bad' },
                    { label: 'Acceptable Baseline', range: '1.0 – 1.5', status: 'neutral' },
                    { label: 'Institutional Grade', range: '1.5 – 2.0', status: 'good' },
                    { label: 'Elite Tier', range: '> 2.0', status: 'elite' },
                  ]}
                  align="right"
                />
              </div>
              <span className="text-2xl font-black font-mono text-zinc-900 mt-2 block">
                {diagnostics?.sharpeRatio != null ? diagnostics.sharpeRatio : '—'}
              </span>
              <span className="text-[11px] text-zinc-400 mt-1 block">Risk-adjusted return multiple</span>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Sortino Ratio (Downside)</span>
                <MetricTooltip
                  title="Sortino Ratio (Downside Risk)"
                  description="Similar to Sharpe, but penalizes ONLY negative downside volatility while treating upside rallies as beneficial. Highly accurate for long-term compounders."
                  benchmarks={[
                    { label: 'Poor Downside Cushion', range: '< 1.0', status: 'bad' },
                    { label: 'Strong Asymmetry', range: '1.0 – 2.0', status: 'good' },
                    { label: 'Elite Convexity', range: '> 2.0', status: 'elite' },
                  ]}
                  verdict="High Sortino indicates your portfolio volatility is predominantly upside expansion."
                  align="right"
                />
              </div>
              <span className="text-2xl font-black font-mono text-zinc-900 mt-2 block">
                {diagnostics?.sortinoRatio != null ? diagnostics.sortinoRatio : '—'}
              </span>
              <span className="text-[11px] text-zinc-400 mt-1 block">Penalizes negative volatility only</span>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Annualized Volatility (σ)</span>
                <MetricTooltip
                  title="Annualized Volatility (σ) & Beta"
                  description="Annualized standard deviation of portfolio returns. Beta measures sensitivity relative to the S&P 500 benchmark."
                  benchmarks={[
                    { label: 'Low / Defensive', range: '< 12%', status: 'good' },
                    { label: 'Moderate (Market Baseline)', range: '12% – 18%', status: 'good' },
                    { label: 'High Volatility (Growth/Tech)', range: '> 20%', status: 'neutral' },
                  ]}
                  align="right"
                />
              </div>
              <span className="text-2xl font-black font-mono text-zinc-900 mt-2 block">
                {diagnostics?.annualizedVolatilityPct != null ? `${diagnostics.annualizedVolatilityPct}%` : '—'}
              </span>
              <span className="text-[11px] text-zinc-400 mt-1 block">
                Beta: {diagnostics?.portfolioBeta != null ? `${diagnostics.portfolioBeta}x` : '1.00x'} vs S&P 500
              </span>
            </div>
          </div>

          {/* Hero Banner with Fisher Equation */}
          <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="rounded-md bg-amber-900 px-2 py-0.5 text-[10px] font-bold uppercase text-white font-mono">
                  Fisher Real Return Equation: r_real = (1 + r) / (1 + i) - 1
                </span>
                <h2 className="text-lg font-bold text-zinc-900 mt-2">Nominal vs. Real Inflation-Adjusted Wealth (Today's Euros)</h2>
                <p className="text-xs text-zinc-600 mt-0.5">{macroData?.summary?.verdict}</p>
              </div>

              <div className="text-right font-mono">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Real Return Rate (Post-Inflation)</span>
                <span className="text-2xl font-extrabold text-emerald-700 block">
                  +{macroData?.parameters?.exactRealReturnPct}% / yr
                </span>
                <span className="text-[10px] text-zinc-500">Nominal {nominalReturn}% − Inflation {inflationRate}%</span>
              </div>
            </div>

            {/* 5 Real Metric Transparent Breakdown Cards */}
            {(() => {
              const lastProj = macroData?.yearlyProjection[macroData.yearlyProjection.length - 1]
              const totalDeposits = lastProj?.totalInvested ?? initialWealth
              const finalNominal = macroData?.summary?.finalNominalWealth ?? initialWealth
              const compoundGain = Math.max(0, finalNominal - totalDeposits)
              const finalReal = macroData?.summary?.finalRealPurchasingPower ?? initialWealth
              const ucitsAdv = macroData?.summary?.ucitsTaxExemptWealthAdvantage ?? 0

              return (
                <div className="space-y-3 pt-2 border-t border-amber-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {/* Card 1: Total Deposited Principal */}
                    <div className="p-3.5 bg-white rounded-xl border border-zinc-200 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-zinc-500 block">1. Principal Invested</span>
                        <MetricTooltip
                          title="Total Out-of-Pocket Capital"
                          description="The cumulative sum of your starting capital plus all regular monthly contributions without interest."
                          align="left"
                        />
                      </div>
                      <span className="text-xl font-extrabold font-mono text-zinc-900 block mt-1">
                        {formatMoney(totalDeposits, 'EUR')}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        €{initialWealth.toLocaleString()} starting + €{monthlyContribution}/mo x {horizonYears * 12} mo
                      </span>
                    </div>

                    {/* Card 2: Compound Growth Interest */}
                    <div className="p-3.5 bg-white rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-emerald-800 block">2. Compound Growth</span>
                        <MetricTooltip
                          title="Net Gains from Compounding"
                          description="The additional growth generated through geometric compounding returns on your investments."
                          align="left"
                        />
                      </div>
                      <span className="text-xl font-extrabold font-mono text-emerald-700 block mt-1">
                        +{formatMoney(compoundGain, 'EUR')}
                      </span>
                      <span className="text-[10px] text-emerald-600">
                        +{nominalReturn}% average annual return
                      </span>
                    </div>

                    {/* Card 3: Final Nominal Future Wealth */}
                    <div className="p-3.5 bg-white rounded-xl border border-zinc-300 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-zinc-600 block">3. Nominal Future Wealth</span>
                        <MetricTooltip
                          title="Nominal Future Wealth"
                          description="The future balance on your account (Deposits + Compound Gains) before inflation discounting."
                          align="right"
                        />
                      </div>
                      <span className="text-xl font-extrabold font-mono text-zinc-900 block mt-1">
                        {formatMoney(finalNominal, 'EUR')}
                      </span>
                      <span className="text-[10px] text-zinc-500">In future {horizonYears}y euros</span>
                    </div>

                    {/* Card 4: Real Purchasing Power */}
                    <div className="p-3.5 bg-white rounded-xl border-2 border-emerald-400 bg-emerald-50/40 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-emerald-900 block font-black">4. Real Purchasing Power</span>
                        <MetricTooltip
                          title="Real Purchasing Power (Today's Money)"
                          description="The true purchasing power of your money adjusted for inflation, representing equivalent goods and services in today's prices."
                          align="right"
                        />
                      </div>
                      <span className="text-xl font-black font-mono text-emerald-900 block mt-1">
                        {formatMoney(finalReal, 'EUR')}
                      </span>
                      <span className="text-[10px] text-emerald-800 font-bold">IN TODAY'S EUROS ({inflationRate}% infl.)</span>
                    </div>

                    {/* Card 5: UCITS Tax Benefit */}
                    <div className="p-3.5 bg-white rounded-xl border border-indigo-200 bg-indigo-50/30 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-indigo-800 block">5. UCITS 0% Tax Benefit</span>
                        <MetricTooltip
                          title="UCITS Tax-Exempt Advantage"
                          description="The extra wealth retained thanks to Greek Law 4172/2013 (0% capital gains tax vs standard 15%)."
                          align="right"
                        />
                      </div>
                      <span className="text-xl font-extrabold font-mono text-indigo-700 block mt-1">
                        +{formatMoney(ucitsAdv, 'EUR')}
                      </span>
                      <span className="text-[10px] text-indigo-600">Saves 15% capital gains tax</span>
                    </div>
                  </div>

                  {/* Grounded Plain-Language Summary */}
                  <div className="p-3 bg-white/90 rounded-xl border border-amber-200 text-xs text-zinc-700 leading-relaxed font-sans">
                    💡 <strong>What this means in practice:</strong> Starting with <strong>€{initialWealth.toLocaleString()}</strong> and adding <strong>€{monthlyContribution}/month</strong> for <strong>{horizonYears} years</strong>, your total deposited principal will be <strong>€{totalDeposits.toLocaleString()}</strong>. Compounding at an annual return of <strong>{nominalReturn}%</strong> produces an extra <strong>+€{compoundGain.toLocaleString()}</strong> in net growth. Due to inflation ({inflationRate}%), your future nominal <strong>€{finalNominal.toLocaleString()}</strong> balance will have the equivalent purchasing power of <strong>€{finalReal.toLocaleString()}</strong> in today's money.
                  </div>
                </div>
              )
            })()}
          </div>

          {/* Interactive Controls with Presets and Direct Number Inputs */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-zinc-700" />
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">Compounding & Purchasing Power Parameters</h3>
                  <p className="text-[11px] text-zinc-400">Adjust with sliders or type any custom number directly into the inputs</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setInitialWealth(Math.round(totalHoldingsVal))}
                  className="px-2.5 py-1 rounded-lg border border-indigo-200 bg-indigo-50 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 flex items-center gap-1 shadow-2xs"
                >
                  <RefreshCw className="h-3 w-3" /> Sync with Portfolio (€{Math.round(totalHoldingsVal).toLocaleString()})
                </button>
                <span className="text-[10px] font-bold text-emerald-700 font-mono bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                  <Check className="h-3 w-3" /> Auto-Persisted
                </span>
              </div>
            </div>

            {/* Quick Scenario & Horizon Presets */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-zinc-500">Annual Return Scenario:</span>
                {[
                  { label: 'Conservative (5.0%)', cagr: 5.0 },
                  { label: 'Balanced (7.5%)', cagr: 7.5 },
                  { label: 'Historical S&P 500 (9.5%)', cagr: 9.5 },
                  { label: 'Aggressive Tech (12.0%)', cagr: 12.0 },
                ].map((sc) => (
                  <button
                    key={sc.cagr}
                    onClick={() => setNominalReturn(sc.cagr)}
                    className={`px-2.5 py-1 rounded-lg font-bold font-mono text-xs transition-all ${
                      nominalReturn === sc.cagr
                        ? 'bg-zinc-900 text-white shadow-xs'
                        : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    {sc.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-zinc-500">Horizon:</span>
                {[1, 3, 5, 10, 20].map((yrs) => (
                  <button
                    key={yrs}
                    onClick={() => setHorizonYears(yrs)}
                    className={`px-2.5 py-1 rounded-lg font-bold font-mono text-xs transition-all ${
                      horizonYears === yrs
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    {yrs} {yrs === 1 ? 'Year' : 'Years'}
                  </button>
                ))}
              </div>
            </div>

            {/* Direct Sliders & Number Input Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs font-mono">
              {/* Slider 1: Starting Wealth */}
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-zinc-700">Starting Capital</label>
                  <div className="flex items-center gap-1">
                    <span className="text-zinc-500 text-xs">€</span>
                    <input
                      type="number"
                      min="0"
                      max="1000000"
                      step="50"
                      value={initialWealth}
                      onChange={(e) => setInitialWealth(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-20 rounded border border-zinc-300 px-1 py-0.5 font-bold text-zinc-900 text-right focus:border-zinc-900 focus:outline-none"
                    />
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50000"
                  step="50"
                  value={initialWealth}
                  onChange={(e) => setInitialWealth(parseFloat(e.target.value))}
                  className="w-full accent-zinc-900 cursor-pointer h-1.5"
                />
                <span className="text-[10px] text-zinc-400 block">Current cash & invested assets</span>
              </div>

              {/* Slider 2: Monthly Contribution */}
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-zinc-700">Monthly Savings</label>
                  <div className="flex items-center gap-1">
                    <span className="text-zinc-500 text-xs">€</span>
                    <input
                      type="number"
                      min="0"
                      max="50000"
                      step="10"
                      value={monthlyContribution}
                      onChange={(e) => setMonthlyContribution(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-18 rounded border border-zinc-300 px-1 py-0.5 font-bold text-emerald-700 text-right focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="3000"
                  step="10"
                  value={monthlyContribution}
                  onChange={(e) => setMonthlyContribution(parseFloat(e.target.value))}
                  className="w-full accent-zinc-900 cursor-pointer h-1.5"
                />
                <span className="text-[10px] text-zinc-400 block">New capital each month (DCA)</span>
              </div>

              {/* Slider 3: Expected Nominal CAGR */}
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-zinc-700">Expected CAGR Return</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="1.0"
                      max="30.0"
                      step="0.1"
                      value={nominalReturn}
                      onChange={(e) => setNominalReturn(parseFloat(e.target.value) || 0)}
                      className="w-14 rounded border border-zinc-300 px-1 py-0.5 font-bold text-indigo-700 text-right focus:border-indigo-600 focus:outline-none"
                    />
                    <span className="text-zinc-500 text-xs">%</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="2.0"
                  max="20.0"
                  step="0.1"
                  value={nominalReturn}
                  onChange={(e) => setNominalReturn(parseFloat(e.target.value))}
                  className="w-full accent-zinc-900 cursor-pointer h-1.5"
                />
                <span className="text-[10px] text-zinc-400 block">Average annual growth rate</span>
              </div>

              {/* Slider 4: Inflation Rate */}
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-zinc-700">Eurozone Inflation Rate</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0.5"
                      max="12.0"
                      step="0.1"
                      value={inflationRate}
                      onChange={(e) => setInflationRate(parseFloat(e.target.value) || 0)}
                      className="w-14 rounded border border-zinc-300 px-1 py-0.5 font-bold text-rose-700 text-right focus:border-rose-600 focus:outline-none"
                    />
                    <span className="text-zinc-500 text-xs">%</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="8.0"
                  step="0.1"
                  value={inflationRate}
                  onChange={(e) => setInflationRate(parseFloat(e.target.value))}
                  className="w-full accent-zinc-900 cursor-pointer h-1.5"
                />
                <span className="text-[10px] text-zinc-400 block">ECB Target: 2.0% - 2.5%</span>
              </div>

              {/* Slider 5: Horizon Duration */}
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-zinc-700">Horizon Duration</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="1"
                      max="40"
                      step="1"
                      value={horizonYears}
                      onChange={(e) => setHorizonYears(Math.min(40, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="w-12 rounded border border-zinc-300 px-1 py-0.5 font-bold text-zinc-900 text-right focus:border-zinc-900 focus:outline-none"
                    />
                    <span className="text-zinc-500 text-xs">Years</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="1"
                  max="30"
                  step="1"
                  value={horizonYears}
                  onChange={(e) => setHorizonYears(parseInt(e.target.value))}
                  className="w-full accent-zinc-900 cursor-pointer h-1.5"
                />
                <span className="text-[10px] text-zinc-400 block">Years of continuous compounding</span>
              </div>
            </div>
          </div>

          {/* Year-by-Year Nominal vs Real Purchasing Power Table */}
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-xs overflow-hidden">
            <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900">Nominal vs Real Purchasing Power Compounding Curve</h3>
              <span className="text-[11px] font-mono text-zinc-500">Every Year Calibrated in Today's Buying Power</span>
            </div>
            <div className="overflow-x-auto max-h-80">
              <table className="w-full text-left text-xs font-mono">
                <thead className="sticky top-0 bg-zinc-100 border-b border-zinc-200 text-[10px] uppercase text-zinc-500">
                  <tr>
                    <th className="py-2.5 px-4">Year</th>
                    <th className="py-2.5 px-3">Total Invested</th>
                    <th className="py-2.5 px-3">Nominal Wealth</th>
                    <th className="py-2.5 px-3 text-emerald-700">Real Purchasing Power</th>
                    <th className="py-2.5 px-3 text-rose-600">Inflation Erosion</th>
                    <th className="py-2.5 px-4 text-indigo-600">UCITS 0% Tax Advantage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {macroData?.yearlyProjection?.map((row) => (
                    <tr key={row.year} className="hover:bg-zinc-50/80">
                      <td className="py-2.5 px-4 font-bold text-zinc-900">Year {row.year}</td>
                      <td className="py-2.5 px-3 text-zinc-600">{formatMoney(row.totalInvested, 'EUR')}</td>
                      <td className="py-2.5 px-3 font-bold text-zinc-900">{formatMoney(row.nominalWealth, 'EUR')}</td>
                      <td className="py-2.5 px-3 font-extrabold text-emerald-700">{formatMoney(row.realPurchasingPower, 'EUR')}</td>
                      <td className="py-2.5 px-3 font-semibold text-rose-600">-{formatMoney(row.inflationErosionAmount, 'EUR')}</td>
                      <td className="py-2.5 px-4 font-bold text-indigo-700">+{formatMoney(row.ucitsRealAdvantage, 'EUR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: GREEK & EUROPEAN TAX COCKPIT */}
      {activeTab === 'greek_tax' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-emerald-800 px-2 py-0.5 text-[10px] font-bold uppercase text-white font-mono">
                    Greek Law 4172/2013 & UCITS Compliant
                  </span>
                  <MetricTooltip
                    title="Greek & EU Tax Framework (Law 4172/2013)"
                    description="Under Articles 103 & 42 of Greek Law 4172/2013, European UCITS ETFs (VUAA.MI, SMHM) enjoy complete tax immunity: 0% capital gains tax and 0% dividend tax."
                    benchmarks={[
                      { label: 'EU UCITS ETFs', range: '0% Tax Drag', status: 'elite' },
                      { label: 'Single US Equities', range: '15% US WHT (DTT)', status: 'neutral' },
                      { label: 'Non-UCITS US ETFs', range: 'Restricted / Non-compliant', status: 'bad' },
                    ]}
                    verdict="Your portfolio maximizes Greek Law 4172/2013 UCITS tax exemption."
                    align="left"
                  />
                </div>
                <h2 className="text-lg font-bold text-zinc-900 mt-2">Hellenic Republic Tax Efficiency Audit</h2>
                <p className="text-xs text-zinc-600 mt-0.5">{taxAudit?.executiveSummary}</p>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">20-Year UCITS Advantage</span>
                <span className="text-2xl font-extrabold font-mono text-emerald-700 block">
                  +{formatMoney(taxAudit?.potential20YearTaxSavingsViaUCITS ?? 0, 'EUR')}
                </span>
                <span className="text-[10px] text-zinc-500">Preserved via 0% Tax Drag</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-emerald-100">
              <div className="p-3 bg-white rounded-xl border border-emerald-100">
                <span className="text-[10px] font-bold uppercase text-zinc-400 block">Tax-Exempt Allocation</span>
                <span className="text-lg font-extrabold font-mono text-emerald-700">
                  {taxAudit?.taxExemptPercentage != null ? `${taxAudit.taxExemptPercentage}%` : '—'}
                </span>
                <span className="text-[10px] text-zinc-500 block">UCITS ETFs (0% Tax)</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-emerald-100">
                <span className="text-[10px] font-bold uppercase text-zinc-400 block">Tax Efficiency Score</span>
                <span className="text-lg font-extrabold font-mono text-zinc-900">
                  {taxAudit?.taxEfficiencyScore != null ? `${taxAudit.taxEfficiencyScore}/100` : '—'}
                </span>
                <span className="text-[10px] text-zinc-500 block">Optimal Asset Location</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-emerald-100">
                <span className="text-[10px] font-bold uppercase text-zinc-400 block">Unrealized Tax Liability</span>
                <span className="text-lg font-extrabold font-mono text-rose-600">
                  {formatMoney(taxAudit?.estimatedUnrealizedTaxLiability ?? 0, 'EUR')}
                </span>
                <span className="text-[10px] text-zinc-500 block">Taxes due if sold today</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-emerald-100">
                <span className="text-[10px] font-bold uppercase text-zinc-400 block">Tax-Loss Harvesting</span>
                <span className="text-lg font-extrabold font-mono text-indigo-700">
                  {taxAudit?.taxLossHarvestingOpportunities?.length ?? 0} Available
                </span>
                <span className="text-[10px] text-zinc-500 block">Capital loss offsets</span>
              </div>
            </div>
          </div>

          {/* Position by Position Tax Audit Table */}
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-xs overflow-hidden">
            <div className="p-4 border-b border-zinc-100 bg-zinc-50/50">
              <h3 className="text-sm font-bold text-zinc-900">Position-by-Position Tax Classification (Greece)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50/70 text-[10px] font-bold uppercase text-zinc-400">
                    <th className="py-3 px-4">Asset</th>
                    <th className="py-3 px-3">Tax Vehicle</th>
                    <th className="py-3 px-3 text-right">Capital Gains Tax</th>
                    <th className="py-3 px-3 text-right">Dividend Tax</th>
                    <th className="py-3 px-3 text-right">Market Value</th>
                    <th className="py-3 px-3 text-right">Tax Liability (If Sold)</th>
                    <th className="py-3 px-4">Legal Framework</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {taxAudit?.auditedPositions?.map((pos) => (
                    <tr key={pos.symbol} className="hover:bg-zinc-50/80">
                      <td className="py-3 px-4 font-bold font-mono text-zinc-900">{pos.symbol}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${pos.isTaxExempt ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-700'}`}>
                          {pos.taxLabel}
                        </span>
                      </td>
                      <td className={`py-3 px-3 text-right font-mono font-bold ${pos.isTaxExempt ? 'text-emerald-700' : 'text-zinc-900'}`}>
                        {pos.capitalGainsTaxPct}%
                      </td>
                      <td className={`py-3 px-3 text-right font-mono font-bold ${pos.isTaxExempt ? 'text-emerald-700' : 'text-zinc-900'}`}>
                        {pos.dividendTaxPct}%
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-extrabold text-zinc-900">
                        {formatMoney(pos.marketValue, 'EUR')}
                      </td>
                      <td className={`py-3 px-3 text-right font-mono font-bold ${pos.unrealizedTaxLiability === 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {formatMoney(pos.unrealizedTaxLiability, 'EUR')}
                      </td>
                      <td className="py-3 px-4 text-[11px] text-zinc-500">{pos.legalBasis}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DIVIDENDS */}
      {activeTab === 'dividends' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Annual Projected Gross Dividends</span>
                <MetricTooltip
                  title="Annual Dividends & Yield Benchmarks"
                  description="Projected annual dividend payouts. Note that VUAA is accumulating (Acc), automatically reinvesting dividends internally with 0% tax drag."
                  benchmarks={[
                    { label: 'Accumulating ETFs (VUAA)', range: '0% Tax Drag', status: 'elite' },
                    { label: 'Balanced Yield', range: '1.5% – 3.5%', status: 'good' },
                    { label: 'High Yield (Warning)', range: '> 6.0% (Yield Trap)', status: 'bad' },
                  ]}
                  verdict="Accumulating UCITS ETFs maximize long-term geometric compounding."
                  align="right"
                />
              </div>
              <span className="text-2xl font-extrabold font-mono text-zinc-900 mt-2 block">
                {formatMoney(dividendData?.annualGrossDividend ?? 0, currentCurrency)}
              </span>
              <span className="text-[11px] text-zinc-500 mt-1 block">Portfolio Dividend Yield: {dividendData?.portfolioDividendYieldPct}%</span>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">Annual Post-Tax Net Cash Flow</span>
                <MetricTooltip
                  title="Annual Post-Tax Net Cash Flow"
                  description="Net annual cash flow after applying 0% UCITS tax exemption and 15% US withholding tax for single equities."
                  align="right"
                />
              </div>
              <span className="text-2xl font-extrabold font-mono text-emerald-800 mt-2 block">
                {formatMoney(dividendData?.annualNetDividend ?? 0, currentCurrency)}
              </span>
              <span className="text-[11px] text-emerald-700 mt-1 block">Calculated after 15% US WHT & 0% UCITS exemptions</span>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Average Monthly Passive Cash</span>
                <MetricTooltip
                  title="Average Monthly Passive Cash (Snowball)"
                  description="Average monthly net dividend flow available for automated compounding and snowball reinvestment."
                  align="right"
                />
              </div>
              <span className="text-2xl font-extrabold font-mono text-indigo-700 mt-2 block">
                {formatMoney((dividendData?.annualNetDividend ?? 0) / 12, currentCurrency)} / mo
              </span>
              <span className="text-[11px] text-zinc-500 mt-1 block">Consistent snowball re-investment</span>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-zinc-900">12-Month Passive Income Schedule</h3>
            <div className="grid grid-cols-12 gap-2 h-44 items-end border-b border-zinc-200 pb-2">
              {dividendData?.monthlyRunway?.map((m) => (
                <div key={m.month} className="flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-[9px] font-mono font-bold text-emerald-700">{m.netAmount > 0 ? `€${m.netAmount.toFixed(0)}` : ''}</span>
                  <div
                    style={{ height: `${Math.max(6, (m.netAmount / ((dividendData.annualGrossDividend / 4) || 1)) * 100)}%` }}
                    className={`w-full rounded-t-lg transition-all ${m.netAmount > 0 ? 'bg-emerald-500' : 'bg-zinc-200'}`}
                  ></div>
                  <span className="text-[10px] font-bold text-zinc-500">{m.month}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}


    </div>
  )
}
