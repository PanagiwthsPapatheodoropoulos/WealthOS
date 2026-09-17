import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useNotifications, useUnreadNotificationCount, useMarkAllNotificationsRead } from '@/api/notificationApi'
import { createTestQueryClient, createWrapper } from '@/test/queryWrapper'
import { jsonResponse, mockFetchRouter } from '@/test/mockFetch'

describe('notificationApi', () => {
  it('fetches notifications and unread count', async () => {
    vi.stubGlobal('fetch', mockFetchRouter({
      'GET /notifications': () => jsonResponse(200, {
        success: true, timestamp: '',
        data: [{ id: 'n1', type: 'TRANSACTION_EXECUTED', title: 'Bought AAPL', body: '...', read: false, createdAt: '' }],
      }),
      'GET /notifications/unread-count': () => jsonResponse(200, { success: true, timestamp: '', data: { unreadCount: 3 } }),
    }))

    const queryClient = createTestQueryClient()
    const notifications = renderHook(() => useNotifications(), { wrapper: createWrapper(queryClient) })
    const unread = renderHook(() => useUnreadNotificationCount(), { wrapper: createWrapper(queryClient) })

    await waitFor(() => expect(notifications.result.current.isSuccess).toBe(true))
    await waitFor(() => expect(unread.result.current.isSuccess).toBe(true))

    expect(notifications.result.current.data).toHaveLength(1)
    expect(unread.result.current.data?.unreadCount).toBe(3)
  })

  it('markAllAsRead invalidates the notifications query', async () => {
    vi.stubGlobal('fetch', mockFetchRouter({
      'POST /notifications/read-all': () => jsonResponse(200, { success: true, timestamp: '', data: null }),
    }))

    const queryClient = createTestQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useMarkAllNotificationsRead(), { wrapper: createWrapper(queryClient) })

    result.current.mutate()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['notifications'] })
  })
})