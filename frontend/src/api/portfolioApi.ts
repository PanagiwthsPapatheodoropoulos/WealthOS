import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { http } from '@/lib/http'
import type { PortfolioDetail, PortfolioSummary } from '@/types/portfolio'

function fetchPortfolios() {
  return http.get<PortfolioSummary[]>('/portfolios')
}

function fetchPortfolioDetail(id: string) {
  return http.get<PortfolioDetail>(`/portfolios/${id}`)
}

export function usePortfolios() {
  return useQuery({
    queryKey: ['portfolios'],
    queryFn: fetchPortfolios,
  })
}

export function usePortfolioDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['portfolios', id],
    queryFn: () => fetchPortfolioDetail(id as string),
    enabled: !!id,
  })
}

export function useCreatePortfolio() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; baseCurrency?: string }) =>
      http.post<PortfolioSummary>('/portfolios', {
        name: data.name,
        baseCurrency: data.baseCurrency || 'EUR',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] })
    },
  })
}

export function useInvalidatePortfolios() {
  const queryClient = useQueryClient()
  return (portfolioId?: string) => {
    queryClient.invalidateQueries({ queryKey: ['portfolios'] })
    if (portfolioId) {
      queryClient.invalidateQueries({ queryKey: ['portfolios', portfolioId] })
      queryClient.invalidateQueries({ queryKey: ['analytics', 'performance', portfolioId] })
    }
    queryClient.invalidateQueries({ queryKey: ['accounts'] })
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }
}