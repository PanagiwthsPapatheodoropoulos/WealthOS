import { useQuery, useMutation } from '@tanstack/react-query'
import { http } from '@/lib/http'

export interface AssetNewsItem {
  id: string
  headline: string
  summary: string
  source: string
  url: string
  publishedAt: string
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
  sentimentScore: number
  category: string
}

export interface UpcomingCatalysts {
  symbol: string
  hasUpcomingEarnings: boolean
  earningsDate?: string | null
  earningsQuarter?: string | null
  earningsHour?: string | null
  epsEstimate?: number | null
  revenueEstimateFormatted?: string | null
  analystConsensus: {
    strongBuy: number
    buy: number
    hold: number
    sell: number
    strongSell: number
    totalRatings: number
    consensusRating: 'STRONG BUY' | 'BUY' | 'HOLD' | 'SELL'
    buyRatioPct: number
  }
  catalystAlert?: string | null
  keyEvents: {
    title: string
    date: string
    type: string
    impact: string
    description: string
  }[]
}

export interface ValuationModels {
  symbol: string
  name: string
  currency: string
  currentPrice: number
  dcfModel: {
    fairValue: number
    marginOfSafetyPct: number
    valuationStatus: 'UNDERVALUED' | 'OVERVALUED' | 'FAIRLY VALUED'
    assumedGrowthRatePct: number
    discountRateWaccPct: number
    terminalGrowthRatePct: number
  }
  grahamNumber: number
  peterLynchFairValue: number
  buffettQualityModel: {
    qualityScore: number
    verdict: string
    economicMoatTier: 'WIDE MOAT' | 'NARROW MOAT' | 'NONE'
    checklist: {
      criterion: string
      met: boolean
      value: string
    }[]
  }
  valuationMultiples: {
    peTTM?: number | null
    forwardPE?: number | null
    pegRatio?: number | null
    priceToBook?: number | null
  }
}

export interface ExpectedReturnsAndRisk {
  symbol: string
  beta: number
  annualizedVolatilityPct: number
  sharpeRatio: number
  valueAtRisk95: {
    oneDayVaRPct: number
    oneMonthVaRPct: number
    interpretation: string
  }
  capmExpectedReturn: {
    riskFreeRatePct: number
    equityRiskPremiumPct: number
    oneYearExpectedReturnPct: number
    bullCaseScenarioPct: number
    bearCaseScenarioPct: number
    threeYearCompoundedReturnPct: number
    fiveYearCompoundedReturnPct: number
  }
  riskGrade: string
}

export interface ComprehensiveIntelligence {
  status: string
  symbol: string
  executiveThesis: string
  news: AssetNewsItem[]
  catalysts: UpcomingCatalysts
  valuation: ValuationModels
  riskAndExpectedReturns: ExpectedReturnsAndRisk
  generatedAt: string
}

export interface MonteCarloTrajectoryPoint {
  period: string
  month: number
  year: number
  median: number
  bull: number
  bear: number
}

export interface PortfolioDiagnostics {
  portfolioTotalValue: number
  portfolioBeta: number
  annualizedVolatilityPct: number
  expectedAnnualReturnPct: number
  sharpeRatio: number
  sortinoRatio: number
  maxHistoricalDrawdownPct: number
  valueAtRisk: {
    var95_1d_pct: number
    var95_1d_amount: number
    var99_1d_pct: number
    var99_1d_amount: number
    cvar95_expected_shortfall_pct: number
    cvar95_expected_shortfall_amount: number
  }
  correlationMatrix: {
    symbol: string
    correlations: Record<string, number>
  }[]
  stressTesting: {
    name: string
    scenario: string
    shockPercentage: number
    portfolioLossAmount: number
    impactLevel: string
  }[]
  monteCarlo: {
    startingValue: number
    projectionYears: number
    expectedAnnualReturnPct: number
    annualizedVolatilityPct: number
    medianFinalValue: number
    bullFinalValue: number
    bearFinalValue: number
    medianTotalGainPct: number
    bullTotalGainPct: number
    bearTotalGainPct: number
    trajectory: MonteCarloTrajectoryPoint[]
  }
  diversificationGrade: string
}

export function useComprehensiveIntelligence(symbol: string | undefined) {
  return useQuery<ComprehensiveIntelligence>({
    queryKey: ['assets', 'intelligence', symbol],
    queryFn: async () => {
      const res = await fetch(`/api/assets/intelligence/${encodeURIComponent(symbol as string)}`)
      if (!res.ok) throw new Error('Failed to fetch intelligence dossier')
      const json = await res.json()
      return json.data
    },
    enabled: !!symbol,
    staleTime: 60_000,
  })
}

export function useAssetNews(symbol: string | undefined) {
  return useQuery<AssetNewsItem[]>({
    queryKey: ['assets', 'news', symbol],
    queryFn: async () => {
      const res = await fetch(`/api/assets/news/${encodeURIComponent(symbol as string)}`)
      if (!res.ok) throw new Error('Failed to fetch asset news')
      const json = await res.json()
      return json.data
    },
    enabled: !!symbol,
    staleTime: 60_000,
  })
}

export function useAssetCatalysts(symbol: string | undefined) {
  return useQuery<UpcomingCatalysts>({
    queryKey: ['assets', 'catalysts', symbol],
    queryFn: async () => {
      const res = await fetch(`/api/assets/catalysts/${encodeURIComponent(symbol as string)}`)
      if (!res.ok) throw new Error('Failed to fetch asset catalysts')
      const json = await res.json()
      return json.data
    },
    enabled: !!symbol,
    staleTime: 120_000,
  })
}

export function useAssetValuation(symbol: string | undefined) {
  return useQuery<ValuationModels>({
    queryKey: ['assets', 'valuation', symbol],
    queryFn: async () => {
      const res = await fetch(`/api/assets/valuation/${encodeURIComponent(symbol as string)}`)
      if (!res.ok) throw new Error('Failed to fetch asset valuation')
      const json = await res.json()
      return json.data
    },
    enabled: !!symbol,
    staleTime: 120_000,
  })
}

export function useAssetExpectedReturns(symbol: string | undefined) {
  return useQuery<ExpectedReturnsAndRisk>({
    queryKey: ['assets', 'expected-returns', symbol],
    queryFn: async () => {
      const res = await fetch(`/api/assets/expected-returns/${encodeURIComponent(symbol as string)}`)
      if (!res.ok) throw new Error('Failed to fetch expected returns')
      const json = await res.json()
      return json.data
    },
    enabled: !!symbol,
    staleTime: 120_000,
  })
}

export function usePortfolioDiagnostics(holdings: any[] | undefined, cashBalance: number = 0) {
  return useQuery<PortfolioDiagnostics>({
    queryKey: ['analytics', 'diagnostics', holdings, cashBalance],
    queryFn: async () => {
      const res = await fetch('/api/analytics/diagnostics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          holdings: holdings || [],
          cashBalance: cashBalance || 0,
        }),
      })
      if (!res.ok) throw new Error('Failed to compute portfolio diagnostics')
      const json = await res.json()
      return json.data
    },
    staleTime: 30_000,
  })
}

export function useCopilotChat() {
  return useMutation({
    mutationFn: async (payload: { message: string; portfolio?: any }) => {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Copilot response error')
      return res.json()
    },
  })
}
