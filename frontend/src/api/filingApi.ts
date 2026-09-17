import { useQuery } from '@tanstack/react-query'
import { http } from '@/lib/http'

export interface SegmentRevenueItem {

  segment: string
  revenueFormatted: string
  growthYoYPct: number
  sharePct: number
}

export interface InsiderTradingSummary {
  netSentiment: string
  last90DaysPurchases: string
  last90DaysSales: string
  institutionalOwnershipPct: number
}

export interface EtfConstituentHolding {
  name: string
  symbol: string
  weightPct: number
  sector: string
}

export interface EtfSectorWeight {
  sector: string
  weightPct: number
}

export interface FilingSummaryResponse {
  symbol: string
  companyName: string
  fiscalPeriod: string
  isEtf?: boolean
  fundName?: string
  benchmark?: string
  ter?: string
  holdingsCount?: number
  topHoldings?: EtfConstituentHolding[]
  sectorAllocation?: EtfSectorWeight[]
  factsheetSummary?: string
  segmentBreakdown?: SegmentRevenueItem[]
  managementGuidanceSummary?: string
  insiderTradingSummary?: InsiderTradingSummary
  topRiskFactors?: string[]
  generatedAt: string
}

export function useFilingSummary(symbol: string | undefined) {
  return useQuery<FilingSummaryResponse>({
    queryKey: ['filings', 'summary', symbol],
    queryFn: async () => {
      try {
        const data = await http.get<FilingSummaryResponse>(`/filings/summary/${encodeURIComponent(symbol as string)}`)
        return data
      } catch {
        const res = await fetch(`/api/filings/summary/${encodeURIComponent(symbol as string)}`)
        if (!res.ok) throw new Error('Failed to fetch corporate filings summary')
        const json = await res.json()
        return json.data
      }
    },
    enabled: !!symbol,
    staleTime: 120_000,
  })
}

