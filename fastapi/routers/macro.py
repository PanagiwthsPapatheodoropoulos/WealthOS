from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any, Optional
from services.inflation_engine import MacroInflationEngine
from auth import get_optional_user_id

router = APIRouter()

class RealReturnRequest(BaseModel):
    initialWealth: float = 0.0
    monthlyContribution: float = 500.0
    nominalAnnualReturnPct: float = 9.0
    inflationRatePct: float = 2.5
    horizonYears: int = 20
    isUcitsTaxFree: bool = True
    taxRatePct: float = 15.0

@router.post("/real-returns")
def get_real_returns(payload: RealReturnRequest, user_id: Optional[str] = Depends(get_optional_user_id)):
    """Calculates Nominal vs. Inflation-Adjusted Real Purchasing Power & Triple Drag Advantage."""
    try:
        data = MacroInflationEngine.calculate_real_purchasing_power(
            initial_wealth=payload.initialWealth,
            monthly_contribution=payload.monthlyContribution,
            nominal_annual_return_pct=payload.nominalAnnualReturnPct,
            inflation_rate_pct=payload.inflationRatePct,
            horizon_years=payload.horizonYears,
            is_ucits_tax_free=payload.isUcitsTaxFree,
            tax_rate_pct=payload.taxRatePct,
        )
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sentiment")
@router.get("/fear-and-greed")
async def get_market_sentiment(user_id: Optional[str] = Depends(get_optional_user_id)):
    """Retrieves live Institutional Fear & Greed Index (multi-factor: VIX, SPY momentum, RSI, Safe Haven demand)."""
    try:
        data = await MacroInflationEngine.compute_fear_and_greed_index()
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/treasury-yields")
async def get_treasury_yields(user_id: Optional[str] = Depends(get_optional_user_id)):
    """Retrieves live 10-Year, 2-Year Treasury yields, 10Y-2Y yield curve spread, and TIPS real rates."""
    try:
        data = await MacroInflationEngine.fetch_treasury_yields()
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/fomc-dot-plot")
def get_fomc_dot_plot(user_id: Optional[str] = Depends(get_optional_user_id)):
    """Retrieves FOMC Dot Plot projections, SEP median forecasts, meeting probabilities, and portfolio transmission."""
    try:
        data = MacroInflationEngine.get_fomc_dot_plot()
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/hyperscaler-capex")
def get_hyperscaler_capex(user_id: Optional[str] = Depends(get_optional_user_id)):
    """Retrieves Hyperscaler AI & Datacenter CapEx guidance (MSFT, GOOGL, AMZN, META) and portfolio transmission links."""
    try:
        data = MacroInflationEngine.get_hyperscaler_capex()
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/overview")
async def get_macro_overview(user_id: Optional[str] = Depends(get_optional_user_id)):
    """Aggregated macro overview returning FOMC rate path, Treasury yields, Fear & Greed, and Hyperscaler CapEx."""
    try:
        yields = await MacroInflationEngine.fetch_treasury_yields()
        sentiment = await MacroInflationEngine.compute_fear_and_greed_index()
        fomc = MacroInflationEngine.get_fomc_dot_plot()
        capex = MacroInflationEngine.get_hyperscaler_capex()
        return {
            "status": "success",
            "data": {
                "treasuryYields": yields,
                "sentiment": sentiment,
                "fomcDotPlot": fomc,
                "hyperscalerCapEx": capex
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



