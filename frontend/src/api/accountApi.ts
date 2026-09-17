import { useQuery } from '@tanstack/react-query'
import { http } from '@/lib/http'
import type { Account } from '@/types/account'

function fetchAccounts() {
  return http.get<Account[]>('/accounts')
}

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: fetchAccounts,
  })
}