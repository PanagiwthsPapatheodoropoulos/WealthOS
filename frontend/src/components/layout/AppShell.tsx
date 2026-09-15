import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Topbar } from './Topbar'
import { Sidebar } from './Sidebar'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useAuthStore } from '@/stores/authStore'
import { useQueryClient } from '@tanstack/react-query'

export function AppShell() {
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const { connected, subscribe } = useWebSocket('/ws')

  useEffect(() => {
    if (!connected || !user?.id) return

    // User-specific transactional & alert notifications via authenticated user queue
    const subUserQueue = subscribe('/user/queue/notifications', () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['portfolios'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    })

    // Fallback subscription to user topic
    const subUserTopic = subscribe(`/topic/user/${user.id}/notifications`, () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['portfolios'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    })

    // Real-time market tick updates
    const subMarket = subscribe('/topic/market-prices', () => {
      queryClient.invalidateQueries({ queryKey: ['market-prices'] })
      queryClient.invalidateQueries({ queryKey: ['assets'] })
    })

    return () => {
      subUserQueue?.unsubscribe()
      subUserTopic?.unsubscribe()
      subMarket?.unsubscribe()
    }
  }, [connected, user?.id, subscribe, queryClient])

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}