from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from services.transcript_engine import TranscriptEngine
from auth import get_optional_user_id

router = APIRouter()

@router.get("/summary/{symbol}")
def get_filing_summary(symbol: str, user_id: Optional[str] = Depends(get_optional_user_id)):
    """Retrieves SEC 10-K, 10-Q & Earnings transcript analysis, segment breakdown, insider trading, and risk factors."""
    try:
        data = TranscriptEngine.fetch_filing_summary(symbol)
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

