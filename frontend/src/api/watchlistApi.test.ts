import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useWatchlists, useCreateWatchlist } from '@/api/watchlistApi'
import { createTestQueryClient, createWrapper } from '@/test/queryWrapper'
import { jsonResponse, mockFetchRouter } from '@/test/mockFetch'

describe('watchlistApi', () => {
  it('fetches watchlists', async () => {
    vi.stubGlobal('fetch', mockFetchRouter({
      'GET /watchlists': () => jsonResponse(200, {
        success: true, timestamp: '',
        data: [{ id: 'w1', name: 'Tech', items: [], createdAt: '' }],
      }),
    }))

    const { result } = renderHook(() => useWatchlists(), { wrapper: createWrapper(createTestQueryClient()) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.[0].name).toBe('Tech')
  })

  it('creates a watchlist and invalidates the list query', async () => {
    vi.stubGlobal('fetch', mockFetchRouter({
      'POST /watchlists': () => jsonResponse(201, {
        success: true, timestamp: '', data: { id: 'w2', name: 'New', items: [], createdAt: '' },
      }),
    }))

    const queryClient = createTestQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useCreateWatchlist(), { wrapper: createWrapper(queryClient) })

    result.current.mutate('New')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['watchlists'] })
  })
})