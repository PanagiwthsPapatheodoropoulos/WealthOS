import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { usePortfolioPerformance } from '@/api/analyticsApi'
import { createTestQueryClient, createWrapper } from '@/test/queryWrapper'
import { jsonResponse, mockFetchRouter } from '@/test/mockFetch'

describe('analyticsApi', () => {
  it('fetches portfolio performance when a portfolioId is provided', async () => {
    vi.stubGlobal('fetch', mockFetchRouter({
      'GET /analytics/portfolios/p1/performance': () => jsonResponse(200, {
        success: true, timestamp: '',
        data: { portfolioId: 'p1', totalInvested: 100, currentValue: 120, totalUnrealizedPnl: 20, totalRealizedPnl: 0, roiPercentage: 20, allocation: [] },
      }),
    }))

    const { result } = renderHook(() => usePortfolioPerformance('p1'), { wrapper: createWrapper(createTestQueryClient()) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.roiPercentage).toBe(20)
  })

  it('does not fetch when portfolioId is undefined', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    renderHook(() => usePortfolioPerformance(undefined), { wrapper: createWrapper(createTestQueryClient()) })

    expect(fetchMock).not.toHaveBeenCalled()
  })
})