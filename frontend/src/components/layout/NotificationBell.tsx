import { useState } from 'react'
import { Bell } from 'lucide-react'
import { useNotifications, useUnreadNotificationCount, useMarkAllNotificationsRead } from '@/api/notificationApi'
import { cn } from '@/lib/utils'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const { data: notifications } = useNotifications()
  const { data: unread } = useUnreadNotificationCount()
  const markAllRead = useMarkAllNotificationsRead()

  const unreadCount = unread?.unreadCount ?? 0

  const items: any[] = Array.isArray(notifications)
    ? notifications
    : (notifications as any)?.content || []

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen((v) => !v)
          if (!open && unreadCount > 0) markAllRead.mutate()
        }}
        className="relative rounded-md p-2 text-slate-500 hover:bg-slate-100"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-2 w-80 rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="max-h-96 overflow-y-auto p-2">
            {items.length === 0 ? (
              <p className="p-3 text-sm text-slate-500">No notifications yet.</p>
            ) : (
              items.map((n: any) => (
                <div
                  key={n.id}
                  className={cn('rounded-md p-3 text-sm', !n.read && 'bg-brand-50')}
                >
                  <p className="font-medium text-slate-800">{n.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{n.body}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}