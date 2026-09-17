import { useQuery } from '@tanstack/react-query'
import { http } from '@/lib/http'
import type { Asset } from '@/types/asset'

export interface BatchQuoteItem {
  symbol: string
  price: number
  change24h: number
  changePercent: number
  currency: string
  lastUpdated: string
}

export interface LiveHoldingItem {
  assetId?: string | null
  symbol: string
  name: string
  quantity: number
  avgCost: number
  currentPrice: number
  marketValue: number
  costBasis: number
  unrealizedPnl: number
  unrealizedPnlPercentage: number
  dayPnl: number
  dayPnlPercentage: number
  currency: string
  allocationPercentage: number
}

export interface LiveHoldingsValuationResponse {
  holdings: LiveHoldingItem[]
  totalInvested: number
  currentMarketValue: number
  unrealizedPnl: number
  unrealizedPnlPercentage: number
  dayPnl: number
  dayPnlPercentage: number
  targetCurrency: string
  lastUpdated: string
}

// Asset list from Java (stored in PostgreSQL, seeded via Flyway)
function fetchAssets() {
  return http.get<Asset[]>('/assets')
}

// Live search from Python FastAPI (Yahoo Finance + Finnhub enrichment)
function searchAssets(query: string) {
  return http.get<Asset[]>(`/v1/market/search?q=${encodeURIComponent(query)}`)
}

// Live quote from Python FastAPI (real-time price)
function fetchQuote(symbol: string) {
  return http.get<{ symbol: string; price: number; change: number; changePercent: number }>(`/v1/market/quote/${symbol}`)
}

// Chart history from Python FastAPI
function fetchChart(symbol: string, range: string) {
  return http.get<{ points: { date: string; price: number }[] }>(`/v1/market/chart/${symbol}?range=${range}`)
}

// Deep analytics (P/E, forward P/E, PEG, Beta, ATH, etc.) from Python
function fetchAssetAnalytics(symbol: string) {
  return http.get<Record<string, unknown>>(`/v1/market/analytics/${symbol}`)
}

// Batch Quotes for multiple tickers concurrently
async function fetchBatchQuotes(symbols: string[]): Promise<Record<string, BatchQuoteItem>> {
  if (!symbols || symbols.length === 0) return {}
  const res = await fetch(`/api/assets/quotes/batch?symbols=${encodeURIComponent(symbols.join(','))}`)
  if (!res.ok) throw new Error('Failed to fetch batch quotes')
  const json = await res.json()
  return json?.data?.quotes || {}
}

// Live Holdings Valuation calculation with real-time unrealized & day PnL
async function fetchLiveHoldingsValuation(holdings: any[], currency: string = 'EUR'): Promise<LiveHoldingsValuationResponse> {
  if (!holdings || holdings.length === 0) {
    return {
      holdings: [],
      totalInvested: 0,
      currentMarketValue: 0,
      unrealizedPnl: 0,
      unrealizedPnlPercentage: 0,
      dayPnl: 0,
      dayPnlPercentage: 0,
      targetCurrency: currency,
      lastUpdated: new Date().toISOString(),
    }
  }

  const res = await fetch('/api/assets/valuation/live-holdings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ holdings, currency }),
  })
  if (!res.ok) throw new Error('Failed to calculate live holdings valuation')
  const json = await res.json()
  return json.data
}

export function useAssets() {
  return useQuery<Asset[]>({
    queryKey: ['assets'],
    queryFn: async () => {
      try {
        const res = await fetchAssets()
        return Array.isArray(res) ? res : []
      } catch {
        return []
      }
    },
    staleTime: 300_000,
  })
}

export function useAssetSearch(query: string) {
  return useQuery({
    queryKey: ['assets', 'search', query],
    queryFn: () => searchAssets(query),
    enabled: query.length >= 1,
    staleTime: 10_000,
  })
}

export function useAssetQuote(symbol: string | undefined) {
  return useQuery({
    queryKey: ['market', 'quote', symbol],
    queryFn: () => fetchQuote(symbol as string),
    enabled: !!symbol,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  })
}

export function useBatchQuotes(symbols: string[]) {
  return useQuery({
    queryKey: ['market', 'batchQuotes', symbols.sort().join(',')],
    queryFn: () => fetchBatchQuotes(symbols),
    enabled: symbols.length > 0,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  })
}

export function useLiveHoldingsValuation(holdings: any[] | undefined, currency: string = 'EUR') {
  return useQuery({
    queryKey: ['market', 'liveHoldingsValuation', holdings, currency],
    queryFn: () => fetchLiveHoldingsValuation(holdings || [], currency),
    enabled: !!holdings && holdings.length > 0,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  })
}

export function useAssetChart(symbol: string | undefined, range: string) {
  return useQuery({
    queryKey: ['market', 'chart', symbol, range],
    queryFn: () => fetchChart(symbol as string, range),
    enabled: !!symbol,
    staleTime: 30_000,
  })
}

export function useAssetAnalytics(symbol: string | undefined) {
  return useQuery({
    queryKey: ['market', 'analytics', symbol],
    queryFn: () => fetchAssetAnalytics(symbol as string),
    enabled: !!symbol,
    staleTime: 60_000,
  })
}
