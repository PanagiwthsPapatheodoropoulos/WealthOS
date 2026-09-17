export interface PortfolioSummary {
  id: string
  accountId: string
  name: string
  holdingsValue?: number
  cashBalance?: number
  totalValue: number
  createdAt: string
}

export interface PortfolioHolding {
  assetId: string
  symbol: string
  name: string
  quantity: number
  avgCost: number
  currentPrice: number
  marketValue: number
  unrealizedPnl: number
}

export interface PortfolioDetail {
  id: string
  accountId: string
  name: string
  cashBalance: number
  holdingsValue: number
  totalValue: number
  holdings: PortfolioHolding[]
  createdAt: string
}