import { vi } from 'vitest'

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

type Handler = () => Response | Promise<Response>

/**
 */
export function mockFetchRouter(handlers: Record<string, Handler>) {
  return vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = (typeof input === 'string' ? input : input.toString()).replace(/^\/api/, '')
    const cleanUrl = url.split('?')[0]
    const method = (init?.method ?? 'GET').toUpperCase()
    const key = `${method} ${url}`
    const cleanKey = `${method} ${cleanUrl}`
    const handler = handlers[key] || handlers[cleanKey]

    if (!handler) {
      if (cleanUrl.startsWith('/assets/alerts/')) {
        return Promise.resolve(jsonResponse(200, { status: 'success', email: 'test@example.com', configured: false }))
      }
      if (cleanUrl.startsWith('/assets/daily-briefing') || cleanUrl.startsWith('/assets/search')) {
        return Promise.resolve(jsonResponse(200, { status: 'success', data: [], date: '', headlineSummary: '', topShortNews: [], keyDrivers: [] }))
      }
      throw new Error(`Unhandled mocked request: ${key}`)
    }

    return Promise.resolve(handler())
  })
}

export function createDeferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}