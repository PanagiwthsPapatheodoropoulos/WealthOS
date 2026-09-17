export type AlertCondition = 'ABOVE' | 'BELOW'
export type AlertStatus = 'ACTIVE' | 'TRIGGERED' | 'CANCELLED'

export interface Alert {
  id: string
  assetId: string
  symbol: string
  condition: AlertCondition
  targetPrice: number
  status: AlertStatus
  createdAt: string
  triggeredAt: string | null
}