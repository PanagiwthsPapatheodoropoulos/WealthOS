export interface WatchlistItem {
  assetId: string
  symbol: string
  name: string
  currentPrice: number
}

export interface Watchlist {
  id: string
  name: string
  items: WatchlistItem[]
  createdAt: string
}