# dividends.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from services.dividend_engine import DividendEngine
from auth import get_optional_user_id

router = APIRouter()

class DividendRequest(BaseModel):
    holdings: List[Dict[str, Any]] = []
    currency: str = "EUR"

@router.post("/forecast")
@router.post("/runway")
def get_dividend_runway(payload: DividendRequest, user_id: Optional[str] = Depends(get_optional_user_id)):
    """Computes 12-month forward monthly passive dividend runway, post-tax net yield, and ex-dividend calendar."""
    try:
        data = DividendEngine.calculate_dividend_runway(payload.holdings, payload.currency)
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
