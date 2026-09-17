import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '@/lib/http'
import type { Alert, AlertCondition } from '@/types/alert'

interface CreateAlertPayload {
  assetId?: string
  symbol?: string
  name?: string
  assetType?: string
  currency?: string
  currentPrice?: number
  condition: AlertCondition
  targetPrice: number
}

function fetchAlerts() {
  return http.get<Alert[]>('/alerts')
}

function createAlert(payload: CreateAlertPayload) {
  return http.post<Alert>('/alerts', payload)
}

function cancelAlert(id: string) {
  return http.post<void>(`/alerts/${id}/cancel`)
}

function deleteAlert(id: string) {
  return http.delete<void>(`/alerts/${id}`)
}

export function useAlerts() {
  return useQuery({
    queryKey: ['alerts'],
    queryFn: fetchAlerts,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  })
}

export function useCreateAlert() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createAlert,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  })
}

export function useCancelAlert() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: cancelAlert,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  })
}

export function useDeleteAlert() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteAlert,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  })
}