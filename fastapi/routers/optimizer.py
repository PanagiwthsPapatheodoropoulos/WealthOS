from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from services.portfolio_optimizer import PortfolioOptimizerEngine
from auth import get_optional_user_id

router = APIRouter()

class OptimizerRequest(BaseModel):
    holdings: List[Dict[str, Any]] = []
    cashBalance: float = 0.0
    riskFreeRate: float = 0.0425

@router.post("/markowitz")
@router.post("/efficient-frontier")
def compute_efficient_frontier(payload: OptimizerRequest, user_id: Optional[str] = Depends(get_optional_user_id)):
    """Computes Markowitz Efficient Frontier curve, Max Sharpe, Min Volatility, and Rebalancing plan."""
    try:
        data = PortfolioOptimizerEngine.calculate_efficient_frontier(
            holdings=payload.holdings,
            cash_balance=payload.cashBalance,
            risk_free_rate=payload.riskFreeRate
        )
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
