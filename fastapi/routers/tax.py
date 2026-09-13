from fastapi import APIRouter, Query, Body, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from services.tax_engine import GreekTaxEngine
from auth import get_optional_user_id

router = APIRouter()

class TaxAuditRequest(BaseModel):
    holdings: List[Dict[str, Any]] = []
    cashBalance: float = 0.0

@router.post("/audit")
def audit_tax(payload: TaxAuditRequest, user_id: Optional[str] = Depends(get_optional_user_id)):
    """Audits active portfolio holdings according to Greek Law 4172/2013 and UCITS 0% tax rules."""
    try:
        data = GreekTaxEngine.audit_portfolio_tax_efficiency(payload.holdings, payload.cashBalance)
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/asset/{symbol}")
def get_asset_tax(symbol: str):
    """Retrieves Greek & European tax treatment classification for a specific symbol."""
    try:
        data = GreekTaxEngine.classify_asset_tax_vehicle(symbol)
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
