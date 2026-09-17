import { useQuery } from '@tanstack/react-query'

export interface EfficientFrontierPoint {
  volatilityPct: number
  expectedReturnPct: number
  sharpeRatio: number
}

export interface RebalancingInstruction {
  symbol: string
  currentWeightPct: number
  optimalSharpeWeightPct: number
  riskParityWeightPct?: number
  deltaWeightPct: number
  targetAmountDelta: number
  action: string
  instruction: string
}

export interface OptimizerResponse {
  currentPortfolio: {
    expectedAnnualReturnPct: number
    annualizedVolatilityPct: number
    sharpeRatio: number
  }
  maxSharpePortfolio: {
    expectedAnnualReturnPct: number
    annualizedVolatilityPct: number
    sharpeRatio: number
    allocationWeights: Record<string, number>
  }
  riskParityPortfolio?: {
    expectedAnnualReturnPct: number
    annualizedVolatilityPct: number
    sharpeRatio: number
    allocationWeights: Record<string, number>
  }
  minVolatilityPortfolio: {
    expectedAnnualReturnPct: number
    annualizedVolatilityPct: number
    allocationWeights: Record<string, number>
  }
  efficientFrontierCurve: EfficientFrontierPoint[]
  rebalancingPlan: RebalancingInstruction[]
  mathematicalMethod: string
}

export function usePortfolioOptimizer(holdings: any[] | undefined, cashBalance: number = 0) {
  return useQuery<OptimizerResponse>({
    queryKey: ['optimizer', 'efficientFrontier', holdings, cashBalance],
    queryFn: async () => {
      const res = await fetch('/api/optimizer/efficient-frontier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holdings: holdings || [], cashBalance }),
      })
      if (!res.ok) throw new Error('Failed to compute Efficient Frontier')
      const json = await res.json()
      return json.data
    },
    staleTime: 30_000,
  })
}
