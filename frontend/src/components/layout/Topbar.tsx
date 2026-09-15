import { useState, useEffect } from 'react'
import { LogOut, Search, Sparkles } from 'lucide-react'
import { useCurrentUser } from '@/api/userApi'
import { useLogout } from '@/api/authApi'
import { NotificationBell } from './NotificationBell'
import { useCurrencyStore } from '@/stores/currencyStore'
import { CommandPalette } from '@/components/shared/CommandPalette'
import { CopilotDrawer } from '@/components/shared/CopilotDrawer'

export function Topbar() {
  const { data: user } = useCurrentUser()
  const logout = useLogout()
  const { currency, setCurrency, setFxRates } = useCurrencyStore()

  const [isCommandOpen, setIsCommandOpen] = useState(false)
  const [isCopilotOpen, setIsCopilotOpen] = useState(false)

  // Live FX sync with European Central Bank (every 15 min / 900s)
  useEffect(() => {
    const fetchRates = () => {
      fetch('/api/market/fx-rates')
        .then((r) => r.json())
        .then((d) => {
          if (d?.data) {
            setFxRates(d.data)
          }
        })
        .catch(() => {})
    }

    fetchRates()
    const interval = setInterval(fetchRates, 15 * 60 * 1000)
    return () => clearInterval(interval)
  }, [setFxRates])

  // Global Keyboard Shortcut (Slash / or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && document.activeElement?.tagName !== 'INPUT')) {
        e.preventDefault()
        setIsCommandOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const initials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()
    : 'U'

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-200 bg-white/95 px-8 backdrop-blur-md sticky top-0 z-30">
      {/* Left section: Quick Search Command Button & AI Copilot Trigger */}
      <div className="flex-1 max-w-lg flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsCommandOpen(true)}
          className="flex-1 flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50/80 px-3.5 py-2 text-xs text-zinc-400 transition-all hover:border-zinc-300 hover:bg-white hover:text-zinc-600 shadow-xs"
        >
          <div className="flex items-center gap-2.5">
            <Search className="h-3.5 w-3.5 text-zinc-400" />
            <span>Search live assets, NVDA, TSLA, BTC...</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] font-mono text-zinc-500 font-semibold shadow-xs">
            /
          </kbd>
        </button>

        <button
          type="button"
          onClick={() => setIsCopilotOpen(true)}
          className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-2 text-xs font-bold text-amber-900 hover:border-amber-400 hover:shadow-xs transition-all shadow-xs shrink-0"
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-600 animate-pulse" />
          <span className="hidden sm:inline">AI Copilot</span>
        </button>
      </div>

      {/* Right section: Currency Switcher, Notifications & User Profile */}
      <div className="flex items-center gap-4">
        {/* Currency Switcher (€ EUR / $ USD) */}
        <div className="flex items-center rounded-lg border border-zinc-200 bg-zinc-50/80 p-0.5 text-xs font-semibold">
          <button
            onClick={() => setCurrency('EUR')}
            className={`rounded-md px-2.5 py-1 transition-all ${
              currency === 'EUR'
                ? 'bg-white text-zinc-900 shadow-sm font-bold'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            € EUR
          </button>
          <button
            onClick={() => setCurrency('USD')}
            className={`rounded-md px-2.5 py-1 transition-all ${
              currency === 'USD'
                ? 'bg-white text-zinc-900 shadow-sm font-bold'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            $ USD
          </button>
        </div>

        <NotificationBell />

        <div className="h-5 w-px bg-zinc-200" />

        {user && (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">
              {initials}
            </div>
            <div className="hidden sm:block text-left leading-tight">
              <p className="text-xs font-semibold text-zinc-900">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-[11px] text-zinc-500 font-mono">{user.email}</p>
            </div>
          </div>
        )}

        <button
          onClick={() => logout.mutate()}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
          title="Sign out of WealthOS"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>

      {/* Global Command Palette Dialog */}
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
      />

      {/* AI Investment Copilot Drawer */}
      <CopilotDrawer
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
      />
    </header>
  )
}