import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { http } from '@/lib/http'
import type { NotificationItem, UnreadCountResponse } from '@/types/notification'

export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
}

function fetchNotifications() {
  return http.get<NotificationItem[]>('/notifications')
}

function fetchUnreadCount() {
  return http.get<UnreadCountResponse>('/notifications/unread-count')
}

function markAsRead(id: string) {
  return http.post<void>(`/notifications/${id}/read`)
}

function markAllAsRead() {
  return http.post<void>('/notifications/read-all')
}

export function useNotifications() {
  return useQuery({
    queryKey: notificationKeys.lists(),
    queryFn: fetchNotifications,
  })
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: fetchUnreadCount,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  })
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
}
