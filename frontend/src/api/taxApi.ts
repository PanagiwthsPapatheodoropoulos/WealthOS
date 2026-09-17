import { useQuery } from '@tanstack/react-query'

export interface TaxPositionAudit {
  symbol: string
  name: string
  quantity: number
  costBasis: number
  marketValue: number
  unrealizedPnl: number
  taxVehicle: string
  taxLabel: string
  capitalGainsTaxPct: number
  dividendTaxPct: number
  isTaxExempt: boolean
  legalBasis: string
  unrealizedTaxLiability: number
}

export interface TaxLossHarvestingItem {
  symbol: string
  name: string
  unrealizedLoss: number
  potentialTaxCredit: number
  recommendation: string
}

export interface TaxAuditResponse {
  residenceJurisdiction: string
  taxLegislation: string
  totalPortfolioValue: number
  totalHoldingsValue: number
  taxExemptValue: number
  taxableValue: number
  taxExemptPercentage: number
  taxEfficiencyScore: number
  estimatedUnrealizedTaxLiability: number
  potential20YearTaxSavingsViaUCITS: number
  taxLossHarvestingOpportunities: TaxLossHarvestingItem[]
  auditedPositions: TaxPositionAudit[]
  executiveSummary: string
}

export function useGreekTaxAudit(holdings: any[] | undefined, cashBalance: number = 0) {
  return useQuery<TaxAuditResponse>({
    queryKey: ['tax', 'greekAudit', holdings, cashBalance],
    queryFn: async () => {
      const res = await fetch('/api/tax/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holdings: holdings || [], cashBalance }),
      })
      if (!res.ok) throw new Error('Failed to audit Greek tax efficiency')
      const json = await res.json()
      return json.data
    },
    staleTime: 30_000,
  })
}
