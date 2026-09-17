import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface Trading212StatusResponse {
  hasSavedKey?: boolean
  hasEnvKey: boolean
  maskedKey: string | null
  isDemo?: boolean
  message: string
}

export function useTrading212Status() {
  return useQuery<Trading212StatusResponse>({
    queryKey: ['integrations', 'trading212', 'status'],
    queryFn: async () => {
      const token = localStorage.getItem('wealthos_access_token')
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch('/api/integrations/trading212/status', { headers })
      if (!res.ok) return { hasSavedKey: false, hasEnvKey: false, maskedKey: null, isDemo: false, message: '' }
      return res.json()
    },
    staleTime: 30_000,
  })
}

export interface Trading212Position {
  rawTicker: string
  symbol: string
  name?: string
  quantity: number
  averagePrice: number
  currentPrice: number
  costBasis: number
  marketValue: number
  unrealizedPnl: number
  unrealizedPnlPercentage: number
  isUcits: boolean
}

export interface Trading212PortfolioSyncResponse {
  broker: string
  connectedAt: string
  positionCount: number
  totalInvested: number
  totalMarketValue: number
  totalUnrealizedPnl: number
  totalUnrealizedPnlPercentage: number
  cash: number
  positions: Trading212Position[]
}

export async function fetchTrading212Portfolio(apiKey: string, isDemo: boolean = false): Promise<Trading212PortfolioSyncResponse> {
  const token = localStorage.getItem('wealthos_access_token')
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch('/api/integrations/trading212/fetch', {
    method: 'POST',
    headers,
    body: JSON.stringify({ apiKey, isDemo }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to sync Trading 212 portfolio')
  }
  const json = await res.json()
  return json.data
}

export async function disconnectTrading212(): Promise<void> {
  const token = localStorage.getItem('wealthos_access_token')
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  await fetch('/api/integrations/trading212/disconnect', {
    method: 'POST',
    headers,
  })
}

export function useTrading212Sync() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ apiKey, isDemo }: { apiKey: string; isDemo?: boolean }) =>
      fetchTrading212Portfolio(apiKey, isDemo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      queryClient.invalidateQueries({ queryKey: ['integrations', 'trading212', 'status'] })
    },
  })
}
