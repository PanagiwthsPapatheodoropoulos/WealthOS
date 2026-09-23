import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TransactionsPage } from '@/pages/TransactionsPage'
import { createTestQueryClient, createWrapper } from '@/test/queryWrapper'
import { jsonResponse, mockFetchRouter } from '@/test/mockFetch'
import { useAuthStore } from '@/stores/authStore'

describe('TransactionsPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'token', refreshToken: 'r', user: null, isAuthenticated: true })
  })

  it('shows an empty state when there are no transactions', async () => {
    vi.stubGlobal('fetch', mockFetchRouter({
      'GET /portfolios': () => jsonResponse(200, {
        success: true, timestamp: '',
        data: [{ id: 'p1', accountId: 'a1', name: 'Main', totalValue: 0, createdAt: '' }],
      }),
      'GET /transactions?portfolioId=p1': () => jsonResponse(200, { success: true, timestamp: '', data: [] }),
    }))

    render(<TransactionsPage />, { wrapper: createWrapper(createTestQueryClient()) })

    expect(await screen.findByText(/No Past Broker Orders Synchronized|no transactions yet/i)).toBeInTheDocument()
  })

  it('renders BUY and SELL rows with correct realized P/L formatting', async () => {
    vi.stubGlobal('fetch', mockFetchRouter({
      'GET /portfolios': () => jsonResponse(200, {
        success: true, timestamp: '',
        data: [{ id: 'p1', accountId: 'a1', name: 'Main', totalValue: 0, createdAt: '' }],
      }),
      'GET /transactions?portfolioId=p1': () => jsonResponse(200, {
        success: true, timestamp: '',
        data: [
          { id: 't1', portfolioId: 'p1', assetId: 'a1', symbol: 'AAPL', type: 'BUY', quantity: 5, price: 100, totalAmount: 500, realizedPnl: null, executedAt: '2026-01-01T00:00:00Z' },
          { id: 't2', portfolioId: 'p1', assetId: 'a1', symbol: 'AAPL', type: 'SELL', quantity: 2, price: 120, totalAmount: 240, realizedPnl: 40, executedAt: '2026-01-02T00:00:00Z' },
          { id: 't3', portfolioId: 'p1', assetId: 'a1', symbol: 'AAPL', type: 'SELL', quantity: 3, price: 90, totalAmount: 270, realizedPnl: -30, executedAt: '2026-01-03T00:00:00Z' },
        ],
      }),
    }))

    render(<TransactionsPage />, { wrapper: createWrapper(createTestQueryClient()) })

    expect(await screen.findByText('—')).toBeInTheDocument() // BUY row: no realized P/L
    expect(await screen.findByText(/\+?(€|\$)40\.00/)).toBeInTheDocument()
    expect(await screen.findByText(/-(€|\$)30\.00/)).toBeInTheDocument()
  })
})
