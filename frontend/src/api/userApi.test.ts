import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useCurrentUser } from '@/api/userApi'
import { useAuthStore } from '@/stores/authStore'
import { createTestQueryClient, createWrapper } from '@/test/queryWrapper'
import { jsonResponse, mockFetchRouter } from '@/test/mockFetch'

describe('userApi', () => {
  it('fetches the current user when authenticated', async () => {
    useAuthStore.setState({ accessToken: 'token', refreshToken: 'r', user: null, isAuthenticated: true })
    vi.stubGlobal('fetch', mockFetchRouter({
      'GET /users/me': () => jsonResponse(200, {
        success: true, timestamp: '',
        data: { id: '1', email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'USER', active: true, createdAt: '' },
      }),
    }))

    const { result } = renderHook(() => useCurrentUser(), { wrapper: createWrapper(createTestQueryClient()) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.email).toBe('a@b.com')
  })

  it('skips the request entirely when not authenticated', () => {
    useAuthStore.setState({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false })
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    renderHook(() => useCurrentUser(), { wrapper: createWrapper(createTestQueryClient()) })

    expect(fetchMock).not.toHaveBeenCalled()
  })
})
