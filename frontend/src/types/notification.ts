export type NotificationType = 'TRANSACTION_EXECUTED' | 'ALERT_TRIGGERED'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  body: string
  read: boolean
  createdAt: string
}

export type NotificationItem = Notification

export interface UnreadCountResponse {
  unreadCount: number
}