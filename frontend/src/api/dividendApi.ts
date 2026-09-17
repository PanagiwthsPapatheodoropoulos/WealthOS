import { useQuery } from '@tanstack/react-query'

export interface MonthlyDividendPoint {
  month: string
  grossAmount: number
  netAmount: number
}

export interface DividendPositionSummary {
  symbol: string
  name: string
  shares: number
  dividendYieldPct: number
  annualGrossDividend: number
  annualNetDividend: number
  taxRatePct: number
  payoutFrequency: string
  safetyScore: number
  isUcitsTaxFree: boolean
}

export interface ExDividendCalendarItem {
  symbol: string
  estimatedExDate: string
  paymentDate: string
  estimatedPayout: number
  currency: string
}

export interface DividendRunwayResponse {
  annualGrossDividend: number
  annualNetDividend: number
  portfolioDividendYieldPct: number
  monthlyRunway: MonthlyDividendPoint[]
  positions: DividendPositionSummary[]
  exDividendCalendar: ExDividendCalendarItem[]
}

export function useDividendRunway(holdings: any[] | undefined, currency: string = 'EUR') {
  return useQuery<DividendRunwayResponse>({
    queryKey: ['dividends', 'runway', holdings, currency],
    queryFn: async () => {
      const res = await fetch('/api/dividends/runway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holdings: holdings || [], currency }),
      })
      if (!res.ok) throw new Error('Failed to compute Dividend Runway')
      const json = await res.json()
      return json.data
    },
    staleTime: 30_000,
  })
}
