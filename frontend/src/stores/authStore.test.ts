import { describe, it, expect, beforeEach, vi } from 'vitest'

const REFRESH_TOKEN_KEY = 'wealthos_refresh_token'
const demoUser = { id: '1', email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'USER' as const, active: true, createdAt: '' }

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it('setSession persists the refresh token to localStorage and updates state', async () => {
    const { useAuthStore } = await import('@/stores/authStore')

    useAuthStore.getState().setSession('access-1', 'refresh-1', demoUser)

    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('refresh-1')
    expect(useAuthStore.getState().accessToken).toBe('access-1')
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
    expect(useAuthStore.getState().user).toEqual(demoUser)
  })

  it('clearSession removes the refresh token from localStorage and resets state', async () => {
    const { useAuthStore } = await import('@/stores/authStore')
    useAuthStore.getState().setSession('access-1', 'refresh-1', demoUser)

    useAuthStore.getState().clearSession()

    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull()
    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(useAuthStore.getState().refreshToken).toBeNull()
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })

  it('rehydrates the refresh token from localStorage on module initialization (e.g. after a page reload)', async () => {
    localStorage.setItem(REFRESH_TOKEN_KEY, 'pre-existing-refresh-token')

    const { useAuthStore } = await import('@/stores/authStore')

    expect(useAuthStore.getState().refreshToken).toBe('pre-existing-refresh-token')
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(useAuthStore.getState().accessToken).toBeNull()
  })

  it('overwrites a previously persisted refresh token when a new session starts', async () => {
    localStorage.setItem(REFRESH_TOKEN_KEY, 'old-token')
    const { useAuthStore } = await import('@/stores/authStore')

    useAuthStore.getState().setSession('new-access', 'new-refresh', demoUser)

    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('new-refresh')
  })
})
