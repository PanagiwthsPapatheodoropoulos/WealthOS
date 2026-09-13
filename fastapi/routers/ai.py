"""
WealthOS AI Investment Copilot & Portfolio Intelligence Router
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from services.ai_copilot_service import AICopilotService
from services.ai_insights import AIInsightsService
from services.risk_engine import RiskEngine
from services.intelligence_engine import IntelligenceEngine
from auth import get_current_user_id

router = APIRouter()


@router.post("/insights/portfolio")
def portfolio_insights(holdings: List[Dict[str, Any]]):
    """Generates AI portfolio advice and concentration risk analysis."""
    insights = AIInsightsService.generate_portfolio_advice(holdings)
    return {"status": "success", "insights": insights}


class HoldingItem(BaseModel):
    symbol: str
    assetType: Optional[str] = "STOCK"
    quantity: Optional[float] = 1.0
    currentPrice: Optional[float] = 0.0
    marketValue: Optional[float] = 0.0
    avgCost: Optional[float] = 0.0


class PortfolioDiagnosticsRequest(BaseModel):
    holdings: List[HoldingItem] = []
    portfolioCash: Optional[float] = 0.0
    riskFreeRate: Optional[float] = 0.0425


class ChatMessageRequest(BaseModel):
    message: str
    portfolio: Optional[Dict[str, Any]] = None


@router.post("/copilot/query")
@router.post("/chat")
async def chat_copilot(payload: ChatMessageRequest, user_id: str = Depends(get_current_user_id)):
    """Interactive conversational AI investment assistant with live context and quantitative analytics."""
    try:
        res = await AICopilotService.handle_chat_query(payload.message, payload.portfolio)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Copilot query error: {str(e)}")


@router.post("/portfolio/diagnostics")
def portfolio_diagnostics(payload: PortfolioDiagnosticsRequest, user_id: str = Depends(get_current_user_id)):
    """
    Computes weighted portfolio Beta, Volatility, Sharpe, Sortino, VaR 95%, CVaR,
    Correlation Matrix, Stress Testing Scenarios, and Monte Carlo 5-Year simulation.
    """
    try:
        raw_holdings = [h.model_dump() for h in payload.holdings]
        diagnostics = RiskEngine.calculate_portfolio_diagnostics(
            holdings=raw_holdings,
            portfolio_cash=payload.portfolioCash or 0.0,
            risk_free_rate=payload.riskFreeRate or 0.0425,
        )
        return {"status": "success", "data": diagnostics, "dataSource": "live", "isEstimate": False}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Portfolio diagnostics error: {str(e)}")


@router.get("/asset/{symbol}")
async def asset_intelligence(symbol: str, user_id: str = Depends(get_current_user_id)):
    """Comprehensive 360° investment intelligence dossier for any ticker."""
    try:
        dossier = await IntelligenceEngine.fetch_comprehensive_intelligence(symbol)
        return {"status": "success", "data": dossier}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Asset intelligence error: {str(e)}")
