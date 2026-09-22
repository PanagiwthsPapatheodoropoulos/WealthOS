import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DashboardPage } from '@/pages/DashboardPage'
import { createTestQueryClient, createWrapper } from '@/test/queryWrapper'
import { jsonResponse, mockFetchRouter } from '@/test/mockFetch'
import { useAuthStore } from '@/stores/authStore'

describe('DashboardPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'token', refreshToken: 'r', user: null, isAuthenticated: true })
  })

  it('sums cash balances and portfolio values into a single net worth figure', async () => {
    vi.stubGlobal('fetch', mockFetchRouter({
      'GET /users/me': () => jsonResponse(200, {
        success: true, timestamp: '',
        data: { id: 'u1', email: 'a@b.com', firstName: 'Alice', lastName: 'Smith', role: 'USER', active: true, createdAt: '' },
      }),
      'GET /accounts': () => jsonResponse(200, {
        success: true, timestamp: '',
        data: [
          { id: 'a1', name: 'Main', accountType: 'CASH', currency: 'USD', cashBalance: 300, createdAt: '' },
          { id: 'a2', name: 'Savings', accountType: 'CASH', currency: 'USD', cashBalance: 200, createdAt: '' },
        ],
      }),
      'GET /portfolios': () => jsonResponse(200, {
        success: true, timestamp: '',
        data: [{ id: 'p1', accountId: 'a1', name: 'Main', totalValue: 1500, createdAt: '' }],
      }),
    }))

    render(<DashboardPage />, { wrapper: createWrapper(createTestQueryClient()) })

    expect(await screen.findByText(/welcome back, alice/i)).toBeInTheDocument()
    expect((await screen.findAllByText(/(€|\$)1,?500\.00/))[0]).toBeInTheDocument()  // portfolio value
  })

  it('shows a loading spinner while any of the three queries are pending', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {}))) // never resolves

    const { container } = render(<DashboardPage />, { wrapper: createWrapper(createTestQueryClient()) })

    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })
})
