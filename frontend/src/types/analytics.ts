export interface AssetAllocation {
  assetType: string
  value: number
  percentage: number
}

export interface HistoryPoint {
  date: string
  label: string
  value: number
}

export interface PortfolioPerformance {
  portfolioId: string
  totalInvested: number
  currentValue: number
  totalUnrealizedPnl: number
  totalRealizedPnl: number
  roiPercentage: number
  allocation: AssetAllocation[]
  history?: HistoryPoint[]
}

export interface SupplyChainRisk {
  symbol: string
  assetName: string
  marketValue: number
  dependency: string
  geopolitical_sensitivity: 'HIGH' | 'MODERATE' | 'LOW'
}

export interface SectorExposure {
  sector: string
  value: number
  percentage: number
  assetCount: number
}

export interface SemanticInsights {
  portfolio_id: string
  portfolio_name: string
  total_value: number
  holdings_value: number
  cash_balance: number
  sector_exposure: SectorExposure[]
  supply_chain_risks: SupplyChainRisk[]
  esg_summary: {
    overall_score: number
    rating: string
    carbon_risk: string
    governance_score: number
  }
  risk_profile: {
    weighted_risk_score: number
    risk_tier: string
  }
  shacl_governance: {
    conforms: boolean
    violations_count: number
    status: string
  }
  knowledge_graph_stats: {
    triples_count: number
    ontology_standard: string
  }
}