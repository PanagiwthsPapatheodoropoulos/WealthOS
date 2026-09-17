import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '@/lib/http'

export interface UserPreferences {
  baseCurrency: 'EUR' | 'USD' | 'GBP'
  theme: 'light' | 'dark'
  defaultTimeframe: string
}

export function useUserPreferences() {
  return useQuery({
    queryKey: ['userPreferences'],
    queryFn: () => http.get<UserPreferences>('/users/me/preferences'),
    staleTime: 60000,
  })
}

export function useUpdateUserPreferences() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<UserPreferences>) =>
      http.put<UserPreferences>('/users/me/preferences', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userPreferences'] })
      queryClient.invalidateQueries({ queryKey: ['portfolios'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
    },
  })
}
