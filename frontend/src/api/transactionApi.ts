import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http, newIdempotencyKey } from '@/lib/http'
import { useInvalidatePortfolios } from '@/api/portfolioApi'
import type { Asset } from '@/types/asset'
import type { PortfolioDetail } from '@/types/portfolio'
import type { Transaction } from '@/types/transaction'

interface BuySellPayload {
  portfolioId: string
  assetId: string
  quantity: number
}

interface MutationContext {
  previous: PortfolioDetail | undefined
  queryKey: readonly ['portfolios', string]
}

function fetchTransactions(portfolioId: string) {
  return http.get<Transaction[]>(`/transactions?portfolioId=${portfolioId}`)
}

function buyAsset(payload: BuySellPayload) {
  return http.post<Transaction>('/transactions/buy', payload, {
    headers: { 'Idempotency-Key': newIdempotencyKey() },
  })
}

function sellAsset(payload: BuySellPayload) {
  return http.post<Transaction>('/transactions/sell', payload, {
    headers: { 'Idempotency-Key': newIdempotencyKey() },
  })
}

export function useTransactions(portfolioId: string | undefined) {
  return useQuery({
    queryKey: ['transactions', portfolioId],
    queryFn: () => fetchTransactions(portfolioId as string),
    enabled: !!portfolioId,
  })
}

export function useBuyAsset() {
  const queryClient = useQueryClient()
  const invalidate = useInvalidatePortfolios()

  return useMutation<Transaction, unknown, BuySellPayload, MutationContext>({
    mutationFn: buyAsset,
    onMutate: async (variables) => {
      const queryKey = ['portfolios', variables.portfolioId] as const
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<PortfolioDetail>(queryKey)

      if (previous) {
        const existingHolding = previous.holdings?.find((h) => h.assetId === variables.assetId)
        const assets = queryClient.getQueryData<Asset[]>(['assets'])
        const assetFromList = assets?.find((a) => a.id === variables.assetId)
        const referencePrice = existingHolding?.currentPrice ?? assetFromList?.currentPrice ?? 0
        const estimatedCost = referencePrice * variables.quantity

        const optimisticHoldings = existingHolding
          ? (previous.holdings || []).map((h) =>
              h.assetId === variables.assetId
                ? { ...h, quantity: h.quantity + variables.quantity, marketValue: h.marketValue + estimatedCost }
                : h
            )
          : previous.holdings

        queryClient.setQueryData<PortfolioDetail>(queryKey, {
          ...previous,
          cashBalance: previous.cashBalance - estimatedCost,
          holdingsValue: previous.holdingsValue + estimatedCost,
          holdings: optimisticHoldings,
        })
      }

      return { previous, queryKey: ['portfolios', variables.portfolioId] }
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.queryKey, context.previous)
      }
    },
    onSettled: (_data, _error, variables) => invalidate(variables.portfolioId),
  })
}

export function useSellAsset() {
  const queryClient = useQueryClient()
  const invalidate = useInvalidatePortfolios()

  return useMutation<Transaction, unknown, BuySellPayload, MutationContext>({
    mutationFn: sellAsset,
    onMutate: async (variables) => {
      const queryKey = ['portfolios', variables.portfolioId] as const
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<PortfolioDetail>(queryKey)

      if (previous) {
        const existingHolding = previous.holdings.find((h) => h.assetId === variables.assetId)

        if (existingHolding) {
          const proceeds = existingHolding.currentPrice * variables.quantity
          const remainingQuantity = existingHolding.quantity - variables.quantity

          const optimisticHoldings = remainingQuantity <= 0
            ? previous.holdings.filter((h) => h.assetId !== variables.assetId)
            : previous.holdings.map((h) =>
                h.assetId === variables.assetId
                  ? { ...h, quantity: remainingQuantity, marketValue: h.marketValue - proceeds }
                  : h
              )

          queryClient.setQueryData<PortfolioDetail>(queryKey, {
            ...previous,
            cashBalance: previous.cashBalance + proceeds,
            holdingsValue: previous.holdingsValue - proceeds,
            holdings: optimisticHoldings,
          })
        }
      }

      return { previous, queryKey: ['portfolios', variables.portfolioId] }
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.queryKey, context.previous)
      }
    },
    onSettled: (_data, _error, variables) => invalidate(variables.portfolioId),
  })
}
