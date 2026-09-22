import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AlertsPage } from '@/pages/AlertsPage'
import { createTestQueryClient, createWrapper } from '@/test/queryWrapper'
import { jsonResponse, mockFetchRouter } from '@/test/mockFetch'
import { useAuthStore } from '@/stores/authStore'

describe('AlertsPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'token', refreshToken: 'r', user: null, isAuthenticated: true })
  })

  it('creates an alert and sends the correct payload', async () => {
    let createCalled = false

    vi.stubGlobal('fetch', mockFetchRouter({
      'GET /alerts': () => jsonResponse(200, { success: true, timestamp: '', data: [] }),
      'GET /assets': () => jsonResponse(200, {
        success: true, timestamp: '',
        data: [{ id: 'asset1', symbol: 'BTC', name: 'Bitcoin', assetType: 'CRYPTO', currency: 'USD', currentPrice: 60000, priceUpdatedAt: null }],
      }),
      'POST /alerts': () => {
        createCalled = true
        return jsonResponse(201, {
          success: true, timestamp: '',
          data: { id: 'alert1', assetId: 'asset1', symbol: 'BTC', condition: 'ABOVE', targetPrice: 65000, status: 'ACTIVE', createdAt: '', triggeredAt: null },
        })
      },
    }))

    const queryClient = createTestQueryClient()
    render(<AlertsPage />, { wrapper: createWrapper(queryClient) })

    const user = userEvent.setup()
    const input = await screen.findByPlaceholderText(/Search/i)
    await user.type(input, 'BTC')
    await user.type(screen.getByPlaceholderText(/Target threshold/i), '65000')
    await user.click(screen.getByRole('button', { name: /activate alert/i }))

    await waitFor(() => expect(createCalled).toBe(true))
  })

  it('shows a cancel button only for ACTIVE alerts and calls the cancel endpoint', async () => {
    let cancelCalled = false

    vi.stubGlobal('fetch', mockFetchRouter({
      'GET /alerts': () => jsonResponse(200, {
        success: true, timestamp: '',
        data: [
          { id: 'active-1', assetId: 'a1', symbol: 'AAPL', condition: 'ABOVE', targetPrice: 200, status: 'ACTIVE', createdAt: '', triggeredAt: null },
          { id: 'triggered-1', assetId: 'a1', symbol: 'AAPL', condition: 'BELOW', targetPrice: 100, status: 'TRIGGERED', createdAt: '', triggeredAt: '2026-01-01T00:00:00Z' },
        ],
      }),
      'GET /assets': () => jsonResponse(200, { success: true, timestamp: '', data: [] }),
      'POST /alerts/active-1/cancel': () => {
        cancelCalled = true
        return jsonResponse(200, {
          success: true, timestamp: '',
          data: { id: 'active-1', assetId: 'a1', symbol: 'AAPL', condition: 'ABOVE', targetPrice: 200, status: 'CANCELLED', createdAt: '', triggeredAt: null },
        })
      },
    }))

    render(<AlertsPage />, { wrapper: createWrapper(createTestQueryClient()) })

    const cancelButtons = await screen.findAllByRole('button', { name: /cancel/i })
    expect(cancelButtons).toHaveLength(1); 

    const user = userEvent.setup()
    await user.click(cancelButtons[0])

    await waitFor(() => expect(cancelCalled).toBe(true))
  })
})
