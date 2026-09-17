import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAccounts } from '@/api/accountApi'
import { createTestQueryClient, createWrapper } from '@/test/queryWrapper'
import { jsonResponse, mockFetchRouter } from '@/test/mockFetch'

describe('accountApi', () => {
  it('fetches the current user accounts', async () => {
    vi.stubGlobal('fetch', mockFetchRouter({
      'GET /accounts': () => jsonResponse(200, {
        success: true, timestamp: '',
        data: [{ id: 'a1', name: 'Main Account', accountType: 'CASH', currency: 'USD', cashBalance: 10000, createdAt: '' }],
      }),
    }))

    const { result } = renderHook(() => useAccounts(), { wrapper: createWrapper(createTestQueryClient()) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.[0].cashBalance).toBe(10000)
  })
})