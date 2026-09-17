import { useQuery } from '@tanstack/react-query'

export interface RealReturnYearPoint {
  year: number
  totalInvested: number
  nominalWealth: number
  realPurchasingPower: number
  inflationErosionAmount: number
  taxableRealPurchasingPower: number
  ucitsRealAdvantage: number
}

export interface RealReturnResponse {
  parameters: {
    initialWealth: number
    monthlyContribution: number
    nominalAnnualReturnPct: number
    inflationRatePct: number
    horizonYears: number
    isUcitsTaxFree: boolean
    exactRealReturnPct: number
  }
  summary: {
    finalNominalWealth: number
    finalRealPurchasingPower: number
    inflationErosionTotal: number
    ucitsTaxExemptWealthAdvantage: number
    realSafeMonthlyIncome: number
    nominalSafeMonthlyIncome: number
    verdict: string
  }
  yearlyProjection: RealReturnYearPoint[]
}

export interface SentimentFactor {
  factor: string
  status: string
  score: number
}

export interface MarketSentimentResponse {
  score: number
  rating: string
  previousCloseScore: number
  oneWeekAgoScore: number
  oneMonthAgoScore: number
  description: string
  factors: SentimentFactor[]
  macroRegime: string
  vixValue?: number
  vixRegime?: string
  vix60dAvg?: number
  updatedAt: string
}

export interface YieldCurvePoint {
  maturity: string
  name: string
  yield: number
}

export interface TreasuryYieldsResponse {
  tenYearYield: number
  twoYearYield: number
  fiveYearYield: number
  threeMonthYield: number
  thirtyYearYield: number
  spread10Y2YBps: number
  spread10Y3MBps: number
  nyFedRecessionProbPct: number
  realYield10YTIPSPct: number
  breakevenInflationPct: number
  curveStatus: string
  curveDescription: string
  termStructure: YieldCurvePoint[]
  isLive: boolean
  updatedAt: string
}

export interface FomcMeeting {
  meeting: string
  date: string
  expectedAction: string
  probabilityCutPct: number
  impliedRate: number
}

export interface DotPlotHorizon {
  horizon: string
  median: number
  dots: { rate: number; count: number }[]
}

export interface FomcDotPlotResponse {
  currentPolicyRate: string
  effectiveFundsRate: number
  neutralRateLongerRun: number
  policyStance: string
  sepProjections: {
    fedFundsMedian: Record<string, number>
    pceInflation: Record<string, number>
    realGdpGrowth: Record<string, number>
    unemploymentRate: Record<string, number>
  }
  upcomingMeetings: FomcMeeting[]
  dotPlotDistribution: DotPlotHorizon[]
  transmissionAnalysis: {
    vuaaImpact: string
    smhImpact: string
    wnucImpact: string
    kbotWqtmImpact: string
  }
}

export interface HyperscalerInfo {
  company: string
  ticker: string
  division: string
  actual2024B: number
  guidance2025B: number
  growthPct: number
  keyInitiatives: string[]
  nuclearAndPowerFocus: string
}

export interface PortfolioTransmissionItem {
  holdingSymbol: string
  holdingName: string
  weightInCapExFlow: string
  transmissionMechanism: string
}

export interface HyperscalerCapExResponse {
  aggregateCapEx2024B: number
  aggregateCapEx2025ProjectedB: number
  aggregateYoYGrowthPct: number
  hyperscalers: HyperscalerInfo[]
  portfolioTransmission: PortfolioTransmissionItem[]
}

export interface MacroOverviewResponse {
  treasuryYields: TreasuryYieldsResponse
  sentiment: MarketSentimentResponse
  fomcDotPlot: FomcDotPlotResponse
  hyperscalerCapEx: HyperscalerCapExResponse
}

export function useRealPurchasingPower(params: {
  initialWealth?: number
  monthlyContribution?: number
  nominalAnnualReturnPct?: number
  inflationRatePct?: number
  horizonYears?: number
  isUcitsTaxFree?: boolean
}) {
  return useQuery<RealReturnResponse>({
    queryKey: ['macro', 'realReturns', params],
    queryFn: async () => {
      const res = await fetch('/api/macro/real-returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initialWealth: params.initialWealth ?? 0.0,
          monthlyContribution: params.monthlyContribution ?? 500,
          nominalAnnualReturnPct: params.nominalAnnualReturnPct ?? 9.0,
          inflationRatePct: params.inflationRatePct ?? 2.5,
          horizonYears: params.horizonYears ?? 20,
          isUcitsTaxFree: params.isUcitsTaxFree ?? true,
        }),
      })
      if (!res.ok) throw new Error('Failed to compute real returns')
      const json = await res.json()
      return json.data
    },
    staleTime: 60_000,
  })
}

export function useMarketSentiment() {
  return useQuery<MarketSentimentResponse>({
    queryKey: ['macro', 'sentiment'],
    queryFn: async () => {
      const res = await fetch('/api/macro/sentiment')
      if (!res.ok) throw new Error('Failed to fetch market sentiment')
      const json = await res.json()
      return json.data
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
    refetchOnWindowFocus: true,
  })
}

export function useTreasuryYields() {
  return useQuery<TreasuryYieldsResponse>({
    queryKey: ['macro', 'treasuryYields'],
    queryFn: async () => {
      const res = await fetch('/api/macro/treasury-yields')
      if (!res.ok) throw new Error('Failed to fetch treasury yields')
      const json = await res.json()
      return json.data
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
    refetchOnWindowFocus: true,
  })
}

export function useFomcDotPlot() {
  return useQuery<FomcDotPlotResponse>({
    queryKey: ['macro', 'fomcDotPlot'],
    queryFn: async () => {
      const res = await fetch('/api/macro/fomc-dot-plot')
      if (!res.ok) throw new Error('Failed to fetch FOMC dot plot')
      const json = await res.json()
      return json.data
    },
    staleTime: 60 * 60 * 1000, // 1 hour cache
    refetchOnWindowFocus: false,
  })
}

export function useHyperscalerCapEx() {
  return useQuery<HyperscalerCapExResponse>({
    queryKey: ['macro', 'hyperscalerCapEx'],
    queryFn: async () => {
      const res = await fetch('/api/macro/hyperscaler-capex')
      if (!res.ok) throw new Error('Failed to fetch hyperscaler capex')
      const json = await res.json()
      return json.data
    },
    staleTime: 60 * 60 * 1000, // 1 hour cache
    refetchOnWindowFocus: false,
  })
}

export function useMacroOverview() {
  return useQuery<MacroOverviewResponse>({
    queryKey: ['macro', 'overview'],
    queryFn: async () => {
      const res = await fetch('/api/macro/overview')
      if (!res.ok) throw new Error('Failed to fetch macro overview')
      const json = await res.json()
      return json.data
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  })
}

