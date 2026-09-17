import { describe, it, expect, vi, beforeEach } from 'vitest'
import { http, HttpError } from '@/lib/http'
import { useAuthStore } from '@/stores/authStore'

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('http client', () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: 'expired-token',
      refreshToken: 'valid-refresh-token',
      user: null,
      isAuthenticated: true,
    })
  })

  it('returns data on a successful request', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(200, { success: true, data: { id: '1' }, timestamp: new Date().toISOString() })
      )
    )

    const result = await http.get<{ id: string }>('/assets/1')

    expect(result).toEqual({ id: '1' })
  })

  it('silently refreshes the token on a 401 and retries the original request', async () => {
    const fetchMock = vi.fn()
      // 1st call: original request fails with 401
      .mockResolvedValueOnce(jsonResponse(401, {}))
      // 2nd call: /auth/refresh succeeds
      .mockResolvedValueOnce(
        jsonResponse(200, {
          success: true,
          data: {
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
            expiresIn: 900,
            user: { id: '1', email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'USER', active: true, createdAt: '' },
          },
          timestamp: new Date().toISOString(),
        })
      )
      // 3rd call: retried original request succeeds
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: { id: '1' }, timestamp: new Date().toISOString() }))

    vi.stubGlobal('fetch', fetchMock)

    const result = await http.get<{ id: string }>('/portfolios/1')

    expect(result).toEqual({ id: '1' })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(useAuthStore.getState().accessToken).toBe('new-access-token')
  })

  it('clears the session when the refresh token itself is invalid', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(401, {}))
      .mockResolvedValueOnce(jsonResponse(401, { message: 'Invalid refresh token' }))

    vi.stubGlobal('fetch', fetchMock)

    await expect(http.get('/portfolios/1')).rejects.toBeInstanceOf(HttpError)
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(useAuthStore.getState().accessToken).toBeNull()
  })

  it('surfaces a 429 as a rate-limit HttpError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 429 })))

    await expect(http.post('/auth/login', { email: 'a@b.com', password: 'x' }))
      .rejects.toMatchObject({ status: 429 })
  })
})
