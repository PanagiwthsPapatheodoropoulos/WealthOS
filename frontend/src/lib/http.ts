import { useAuthStore } from '@/stores/authStore'
import type { ApiResponse, ApiErrorResponse } from '@/types/api'
import type { AuthResponse } from '@/types/auth'

export class HttpError extends Error {
  status: number
  body: ApiErrorResponse | null

  constructor(status: number, body: ApiErrorResponse | null) {
    super(body?.message ?? `Request failed with status ${status}`)
    this.status = status
    this.body = body
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  skipAuth?: boolean
  _isRetry?: boolean
}

let isRefreshing = false
let refreshQueue: Array<(token: string | null) => void> = []

async function rawRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, skipAuth, _isRetry, headers, ...rest } = options

  const finalHeaders = new Headers(headers)
  finalHeaders.set('Content-Type', 'application/json')

  if (!skipAuth) {
    const token = useAuthStore.getState().accessToken
    if (token) {
      finalHeaders.set('Authorization', `Bearer ${token}`)
    }
  }

  const response = await fetch(`/api${path}`, {
    ...rest,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (response.status === 401 && !skipAuth && !_isRetry) {
    const newToken = await handleUnauthorized()
    if (newToken) {
      return rawRequest<T>(path, { ...options, _isRetry: true })
    }
  }

  if (response.status === 429) {
    throw new HttpError(429, { timestamp: new Date().toISOString(), status: 429, error: 'Too Many Requests', message: 'Too many attempts. Please wait a moment.', path })
  }

  if (!response.ok) {
    let errorBody: ApiErrorResponse | null = null
    try {
      errorBody = await response.json()
    } catch {
      errorBody = null
    }
    throw new HttpError(response.status, errorBody)
  }

  if (response.status === 204) {
    return undefined as T
  }

  const parsed: ApiResponse<T> = await response.json()
  return parsed.data
}

async function handleUnauthorized(): Promise<string | null> {
  const { refreshToken, setSession, clearSession, user } = useAuthStore.getState()

  if (!refreshToken) {
    clearSession()
    return null
  }

  if (isRefreshing) {
    return new Promise((resolve) => {
      refreshQueue.push(resolve)
    })
  }

  isRefreshing = true

  try {
    const auth = await rawRequest<AuthResponse>('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
      skipAuth: true,
    })

    setSession(auth.accessToken, auth.refreshToken, user ?? auth.user)
    refreshQueue.forEach((resolve) => resolve(auth.accessToken))
    refreshQueue = []
    return auth.accessToken
  } catch {
    clearSession()
    refreshQueue.forEach((resolve) => resolve(null))
    refreshQueue = []
    return null
  } finally {
    isRefreshing = false
  }
}

export function newIdempotencyKey(): string {
  return crypto.randomUUID()
}

export const http = {
  get: <T>(path: string, options?: RequestOptions) =>
    rawRequest<T>(path, { ...options, method: 'GET' }),

  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    rawRequest<T>(path, { ...options, method: 'POST', body }),

  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    rawRequest<T>(path, { ...options, method: 'PUT', body }),

  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    rawRequest<T>(path, { ...options, method: 'PATCH', body }),

  delete: <T>(path: string, options?: RequestOptions) =>
    rawRequest<T>(path, { ...options, method: 'DELETE' }),
}