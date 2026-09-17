export type TransactionType = 'BUY' | 'SELL'

export interface Transaction {
  id: string
  portfolioId: string
  assetId: string
  symbol: string
  type: TransactionType
  quantity: number
  price: number
  totalAmount: number
  realizedPnl: number | null
  executedAt: string
}