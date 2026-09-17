import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAssets } from '@/api/assetApi'
import { createTestQueryClient, createWrapper } from '@/test/queryWrapper'
import { jsonResponse, mockFetchRouter } from '@/test/mockFetch'

describe('assetApi', () => {
  it('fetches all assets', async () => {
    vi.stubGlobal('fetch', mockFetchRouter({
      'GET /assets': () => jsonResponse(200, {
        success: true, timestamp: '',
        data: [{ id: 'a1', symbol: 'AAPL', name: 'Apple', assetType: 'STOCK', currency: 'USD', currentPrice: 195.5, priceUpdatedAt: null }],
      }),
    }))

    const { result } = renderHook(() => useAssets(), { wrapper: createWrapper(createTestQueryClient()) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.[0].symbol).toBe('AAPL')
  })
})