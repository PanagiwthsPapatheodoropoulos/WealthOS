import { useQuery } from '@tanstack/react-query'
import { http } from '@/lib/http'
import type { PortfolioPerformance, SemanticInsights } from '@/types/analytics'

function fetchPortfolioPerformance(portfolioId: string) {
  return http.get<PortfolioPerformance>(`/analytics/portfolios/${portfolioId}/performance`)
}

async function fetchSemanticInsights(portfolioId: string, portfolio?: any, cashBalance: number = 0): Promise<SemanticInsights> {
  const payload = {
    portfolioId,
    portfolioName: portfolio?.name || 'Active Portfolio',
    cashBalance,
    holdings: portfolio?.holdings || [],
  }

  const res = await fetch('/api/analytics/semantic-insights', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    // Fallback to GET
    const fallbackRes = await fetch(`/api/analytics/semantic-insights?portfolioId=${encodeURIComponent(portfolioId)}`)
    const json = await fallbackRes.json()
    return json.data
  }
  const json = await res.json()
  return json.data
}

export function usePortfolioPerformance(portfolioId: string | undefined) {
  return useQuery({
    queryKey: ['analytics', 'performance', portfolioId],
    queryFn: () => fetchPortfolioPerformance(portfolioId as string),
    enabled: !!portfolioId,
  })
}

export function useSemanticInsights(portfolioId: string | undefined, portfolio?: any, cashBalance: number = 0) {
  return useQuery({
    queryKey: ['analytics', 'semantic-insights', portfolioId, portfolio?.holdings, cashBalance],
    queryFn: () => fetchSemanticInsights(portfolioId as string, portfolio, cashBalance),
    enabled: !!portfolioId,
    staleTime: 30_000,
  })
}
