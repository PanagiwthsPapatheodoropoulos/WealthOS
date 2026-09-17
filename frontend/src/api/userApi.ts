import { useQuery } from '@tanstack/react-query'
import { http } from '@/lib/http'
import { useAuthStore } from '@/stores/authStore'
import type { User } from '@/types/auth'

function fetchCurrentUser() {
  return http.get<User>('/users/me')
}

export function useCurrentUser() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: ['users', 'me'],
    queryFn: fetchCurrentUser,
    enabled: isAuthenticated,
  })
}