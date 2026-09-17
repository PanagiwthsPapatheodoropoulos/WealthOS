import { create } from 'zustand'
import type { User } from '@/types/auth'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: User | null
  isAuthenticated: boolean
  setSession: (accessToken: string, refreshToken: string, user: User) => void
  clearSession: () => void
}

const ACCESS_TOKEN_KEY = 'wealthos_access_token'
const REFRESH_TOKEN_KEY = 'wealthos_refresh_token'
const USER_KEY = 'wealthos_user'

function getInitialUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const initialAccessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
const initialRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: initialAccessToken,
  refreshToken: initialRefreshToken,
  user: getInitialUser(),
  isAuthenticated: Boolean(initialAccessToken),
  setSession: (accessToken, refreshToken, user) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    set({ accessToken, refreshToken, user, isAuthenticated: true })
  },
  clearSession: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false })
  },
}))