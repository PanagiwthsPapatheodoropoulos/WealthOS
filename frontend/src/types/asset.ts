export type AssetType = 'STOCK' | 'ETF' | 'CRYPTO'

export interface Asset {
  id: string
  symbol: string
  name: string
  assetType: AssetType
  currency: string
  currentPrice: number
  priceUpdatedAt: string | null
}