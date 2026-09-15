import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Wallet,
  Receipt,
  Star,
  Bell,
  BarChart3,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/portfolio', label: 'Portfolios', icon: Wallet },
  { to: '/transactions', label: 'Transactions', icon: Receipt },
  { to: '/watchlist', label: 'Watchlist', icon: Star },
  { to: '/alerts', label: 'Price Alerts', icon: Bell },
  { to: '/analytics', label: 'Analytics & Risk', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  return (
    <aside className="w-60 shrink-0 flex flex-col justify-between border-r border-zinc-200 bg-white text-zinc-900 select-none">
      <div>
        {/* Brand Header */}
        <div className="flex h-16 items-center gap-3 px-6 border-b border-zinc-100">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white font-bold text-sm tracking-tighter">
            W
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight text-zinc-900">WealthOS</span>
            <p className="text-[10px] text-zinc-400 font-medium tracking-wide uppercase">Institutional</p>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="px-3 py-4">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Platform
          </p>
          <nav className="flex flex-col gap-0.5">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-zinc-100 text-zinc-950 font-semibold'
                      : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
                  )
                }
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-zinc-100 text-[11px] text-zinc-400">
        <p className="font-medium text-zinc-600">WealthOS Engine</p>
        <p className="text-[10px] font-mono mt-0.5">v2.0.0 (FastAPI & Spring)</p>
      </div>
    </aside>
  )
}