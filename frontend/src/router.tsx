import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { ProtectedRoute } from '@/components/shared/ProtectedRoute'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

// Route-Level Code Splitting (Zero initial bundle bloat)
const LoginPage = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('@/pages/RegisterPage').then((m) => ({ default: m.RegisterPage })))
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const PortfolioPage = lazy(() => import('@/pages/PortfolioPage').then((m) => ({ default: m.PortfolioPage })))
const TransactionsPage = lazy(() => import('@/pages/TransactionsPage').then((m) => ({ default: m.TransactionsPage })))
const WatchlistPage = lazy(() => import('@/pages/WatchlistPage').then((m) => ({ default: m.WatchlistPage })))
const AlertsPage = lazy(() => import('@/pages/AlertsPage').then((m) => ({ default: m.AlertsPage })))
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })))
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))

// Idle prefetch: loads chunks in background idle time so tab clicks are 0ms instant
if (typeof window !== 'undefined') {
  const prefetch = () => {
    import('@/pages/DashboardPage')
    import('@/pages/PortfolioPage')
    import('@/pages/AnalyticsPage')
    import('@/pages/TransactionsPage')
    import('@/pages/WatchlistPage')
    import('@/pages/AlertsPage')
    import('@/pages/SettingsPage')
  }
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(prefetch)
  } else {
    setTimeout(prefetch, 300)
  }
}

const SuspenseWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense
    fallback={
      <div className="flex h-96 w-full items-center justify-center">
        <LoadingSpinner />
      </div>
    }
  >
    {children}
  </Suspense>
)

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <SuspenseWrapper>
        <LoginPage />
      </SuspenseWrapper>
    ),
  },
  {
    path: '/register',
    element: (
      <SuspenseWrapper>
        <RegisterPage />
      </SuspenseWrapper>
    ),
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            path: '/',
            element: (
              <SuspenseWrapper>
                <DashboardPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: '/portfolio',
            element: (
              <SuspenseWrapper>
                <PortfolioPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: '/transactions',
            element: (
              <SuspenseWrapper>
                <TransactionsPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: '/watchlist',
            element: (
              <SuspenseWrapper>
                <WatchlistPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: '/alerts',
            element: (
              <SuspenseWrapper>
                <AlertsPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: '/analytics',
            element: (
              <SuspenseWrapper>
                <AnalyticsPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: '/settings',
            element: (
              <SuspenseWrapper>
                <SettingsPage />
              </SuspenseWrapper>
            ),
          },
        ],
      },
    ],
  },
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  },
})
