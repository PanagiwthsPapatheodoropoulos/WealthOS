import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WatchlistPage } from '@/pages/WatchlistPage'
import { createTestQueryClient, createWrapper } from '@/test/queryWrapper'
import { jsonResponse, mockFetchRouter } from '@/test/mockFetch'
import { useAuthStore } from '@/stores/authStore'

describe('WatchlistPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'token', refreshToken: 'r', user: null, isAuthenticated: true })
  })

  it('prompts to create a watchlist when the user has none yet', async () => {
    vi.stubGlobal('fetch', mockFetchRouter({
      'GET /watchlists': () => jsonResponse(200, { success: true, timestamp: '', data: [] }),
      'GET /assets': () => jsonResponse(200, { success: true, timestamp: '', data: [] }),
    }))

    render(<WatchlistPage />, { wrapper: createWrapper(createTestQueryClient()) })

    expect(await screen.findByText(/create your first watchlist/i)).toBeInTheDocument()
  })

  it('excludes assets already on the watchlist from the "add asset" dropdown', async () => {
    vi.stubGlobal('fetch', mockFetchRouter({
      'GET /watchlists': () => jsonResponse(200, {
        success: true, timestamp: '',
        data: [{
          id: 'w1', name: 'Tech', createdAt: '',
          items: [{ assetId: 'a1', symbol: 'AAPL', name: 'Apple', currentPrice: 200 }],
        }],
      }),
      'GET /assets': () => jsonResponse(200, {
        success: true, timestamp: '',
        data: [
          { id: 'a1', symbol: 'AAPL', name: 'Apple', assetType: 'STOCK', currency: 'USD', currentPrice: 200, priceUpdatedAt: null },
          { id: 'a2', symbol: 'MSFT', name: 'Microsoft', assetType: 'STOCK', currency: 'USD', currentPrice: 400, priceUpdatedAt: null },
        ],
      }),
      'GET /assets/search': () => jsonResponse(200, {
        data: [
          { symbol: 'AAPL', name: 'Apple', assetType: 'STOCK', currency: 'USD', currentPrice: 200 },
          { symbol: 'MSFT', name: 'Microsoft', assetType: 'STOCK', currency: 'USD', currentPrice: 400 },
        ],
      }),
    }))

    render(<WatchlistPage />, { wrapper: createWrapper(createTestQueryClient()) })

    await screen.findByText('AAPL') // already-in-list item rendered in the table

    const input = screen.getByPlaceholderText(/type ticker/i)
    const user = userEvent.setup()
    await user.type(input, 'M')

    await screen.findByText('MSFT')
    expect(screen.queryByText('Click to Add to Watchlist')).toBeInTheDocument()
  })

  it('removes an item when Remove is clicked', async () => {
    let removeCalled = false
    vi.stubGlobal('fetch', mockFetchRouter({
      'GET /watchlists': () => jsonResponse(200, {
        success: true, timestamp: '',
        data: [{
          id: 'w1', name: 'Tech', createdAt: '',
          items: [{ assetId: 'a1', symbol: 'AAPL', name: 'Apple', currentPrice: 200 }],
        }],
      }),
      'GET /assets': () => jsonResponse(200, { success: true, timestamp: '', data: [] }),
      'DELETE /watchlists/w1/items/a1': () => {
        removeCalled = true
        return jsonResponse(200, { success: true, timestamp: '', data: { id: 'w1', name: 'Tech', items: [], createdAt: '' } })
      },
    }))

    render(<WatchlistPage />, { wrapper: createWrapper(createTestQueryClient()) })

    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /remove from watchlist/i }))

    await waitFor(() => expect(removeCalled).toBe(true))
  })
})
