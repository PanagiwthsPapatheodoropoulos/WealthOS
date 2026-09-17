import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '@/lib/http'
import type { Watchlist } from '@/types/watchlist'

function fetchWatchlists() {
  return http.get<Watchlist[]>('/watchlists')
}

function createWatchlist(name: string) {
  return http.post<Watchlist>('/watchlists', { name })
}

function addItem(payload: {
  watchlistId: string
  assetId?: string
  symbol?: string
  name?: string
  assetType?: string
  currency?: string
  currentPrice?: number
}) {
  return http.post<Watchlist>(`/watchlists/${payload.watchlistId}/items`, payload)
}

function removeItem(payload: { watchlistId: string; assetId: string }) {
  return http.delete<Watchlist>(`/watchlists/${payload.watchlistId}/items/${payload.assetId}`)
}

function deleteWatchlist(id: string) {
  return http.delete<void>(`/watchlists/${id}`)
}

export function useWatchlists() {
  return useQuery({ queryKey: ['watchlists'], queryFn: fetchWatchlists })
}

export function useCreateWatchlist() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createWatchlist,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watchlists'] }),
  })
}

export function useAddWatchlistItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: addItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watchlists'] }),
  })
}

export function useRemoveWatchlistItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: removeItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watchlists'] }),
  })
}

export function useDeleteWatchlist() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteWatchlist,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watchlists'] }),
  })
}