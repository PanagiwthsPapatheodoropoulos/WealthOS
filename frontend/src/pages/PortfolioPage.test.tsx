import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { PortfolioPage } from '@/pages/PortfolioPage'
import { createTestQueryClient, createWrapper } from '@/test/queryWrapper'
import { jsonResponse, mockFetchRouter, createDeferred } from '@/test/mockFetch'
import { useAuthStore } from '@/stores/authStore'

describe('PortfolioPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'token', refreshToken: 'r', user: null, isAuthenticated: true })
  })

  it('optimistically updates cash balance on buy, then reconciles with the server response', async () => {
    const portfolioState = {
      id: 'p1', accountId: 'a1', name: 'Main', cashBalance: 1000, holdingsValue: 0,
      totalValue: 1000, holdings: [] as unknown[], createdAt: '',
    }
    const deferredBuy = createDeferred<Response>()

    const fetchMock = mockFetchRouter({
      'GET /portfolios': () => jsonResponse(200, {
        success: true, timestamp: '',
        data: [{ id: 'p1', accountId: 'a1', name: 'Main', totalValue: 0, createdAt: '' }],
      }),
      'GET /portfolios/p1': () => jsonResponse(200, { success: true, timestamp: '', data: portfolioState }),
      'GET /assets': () => jsonResponse(200, {
        success: true, timestamp: '',
        data: [{ id: 'asset1', symbol: 'AAPL', name: 'Apple', assetType: 'STOCK', currency: 'USD', currentPrice: 100, priceUpdatedAt: null }],
      }),
      'POST /transactions/buy': () => deferredBuy.promise,
    })
    vi.stubGlobal('fetch', fetchMock)

    const queryClient = createTestQueryClient()
    render(<PortfolioPage />, { wrapper: createWrapper(queryClient) })

    const user = userEvent.setup()
    await screen.findAllByText(/(€|\$)1,?000\.00/)

    await user.selectOptions(await screen.findByRole('combobox'), 'asset1')
    await user.type(screen.getByPlaceholderText('Quantity'), '5')
    await user.click(screen.getByRole('button', { name: /buy/i }))

    await waitFor(() => expect(screen.getAllByText(/(€|\$)500\.00/)[0]).toBeInTheDocument())

    portfolioState.cashBalance = 495
    portfolioState.holdingsValue = 505
    portfolioState.holdings = [{
      assetId: 'asset1', symbol: 'AAPL', name: 'Apple', quantity: 5,
      avgCost: 101, currentPrice: 100, marketValue: 505, unrealizedPnl: -5,
    }]
    deferredBuy.resolve(jsonResponse(200, {
      success: true, timestamp: '',
      data: { id: 't1', portfolioId: 'p1', assetId: 'asset1', symbol: 'AAPL', type: 'BUY', quantity: 5, price: 101, totalAmount: 505, realizedPnl: null, executedAt: '' },
    }))

    await waitFor(() => expect(screen.getAllByText(/(€|\$)495\.00/)[0]).toBeInTheDocument())
  })

  it('shows an error message when the purchase fails', async () => {
    const fetchMock = mockFetchRouter({
      'GET /portfolios': () => jsonResponse(200, {
        success: true, timestamp: '',
        data: [{ id: 'p1', accountId: 'a1', name: 'Main', totalValue: 0, createdAt: '' }],
      }),
      'GET /portfolios/p1': () => jsonResponse(200, {
        success: true, timestamp: '',
        data: { id: 'p1', accountId: 'a1', name: 'Main', cashBalance: 10, holdingsValue: 0, totalValue: 10, holdings: [], createdAt: '' },
      }),
      'GET /assets': () => jsonResponse(200, {
        success: true, timestamp: '',
        data: [{ id: 'asset1', symbol: 'AAPL', name: 'Apple', assetType: 'STOCK', currency: 'USD', currentPrice: 100, priceUpdatedAt: null }],
      }),
      'POST /transactions/buy': () => jsonResponse(422, {
        timestamp: '', status: 422, error: 'Unprocessable Entity',
        message: 'Insufficient cash balance', path: '/api/transactions/buy',
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const queryClient = createTestQueryClient()
    render(<PortfolioPage />, { wrapper: createWrapper(queryClient) })

    const user = userEvent.setup()
    await user.selectOptions(await screen.findByRole('combobox'), 'asset1')
    await user.type(screen.getByPlaceholderText('Quantity'), '5')
    await user.click(screen.getByRole('button', { name: /buy/i }))

    expect(await screen.findByText(/could not complete purchase/i)).toBeInTheDocument()
  })
})
