from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from services.trading212_service import Trading212Service
from services.broker_connection_repo import (
    get_user_broker_connection,
    save_user_broker_connection,
    disconnect_user_broker_connection,
)
from auth import get_current_user_id
import os
from pathlib import Path
import logging
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(ROOT_DIR / ".env", override=True)
load_dotenv(Path(__file__).resolve().parent.parent / ".env", override=True)

router = APIRouter()
logger = logging.getLogger(__name__)

class Trading212ConnectRequest(BaseModel):
    apiKey: Optional[str] = None
    isDemo: Optional[bool] = False
    saveConnection: Optional[bool] = True

@router.get("/trading212/status")
async def get_trading212_status(user_id: str = Depends(get_current_user_id)):
    """Checks if the user has an active Trading 212 connection in the database."""
    conn = await get_user_broker_connection(user_id, "TRADING212")
    env_key = os.getenv("TRADING212_API_KEY", "").strip()

    if conn and conn.get("status") == "ACTIVE" and conn.get("api_key"):
        raw_key = conn["api_key"]
        masked = "••••••••" + raw_key[-4:]
        mode_label = "Practice / Demo" if conn.get("is_demo") else "Live Sync"
        return {
            "status": "success",
            "hasSavedKey": True,
            "hasEnvKey": bool(env_key and len(env_key) >= 8),
            "maskedKey": masked,
            "isDemo": conn.get("is_demo", False),
            "connectedAt": conn.get("connected_at"),
            "message": f"Trading 212 Active Connection ({mode_label})"
        }

    # If user hasn't explicitly saved yet in DB, but system .env key is configured:
    # Auto-register and activate the connection for this user!
    if env_key and len(env_key) >= 8:
        try:
            saved_conn = await save_user_broker_connection(
                user_id=user_id,
                api_key=env_key,
                is_demo=False,
                broker="TRADING212"
            )
            masked = "••••••••" + env_key[-4:]
            return {
                "status": "success",
                "hasSavedKey": True,
                "hasEnvKey": True,
                "maskedKey": masked,
                "isDemo": False,
                "connectedAt": saved_conn.get("connected_at") if saved_conn else None,
                "message": "Trading 212 Active Connection (Live Sync)"
            }
        except Exception as e:
            logger.warning(f"Could not auto-save env Trading 212 key: {e}")
            return {
                "status": "success",
                "hasSavedKey": True,
                "hasEnvKey": True,
                "maskedKey": "••••••••" + env_key[-4:],
                "isDemo": False,
                "connectedAt": None,
                "message": "Trading 212 Active Connection (Live Sync)"
            }

    return {
        "status": "success",
        "hasSavedKey": False,
        "hasEnvKey": bool(env_key and len(env_key) >= 8),
        "maskedKey": None,
        "isDemo": False,
        "message": "No Trading 212 connection found. Please enter your Trading 212 API key."
    }

@router.post("/trading212/fetch")
async def fetch_trading212_portfolio(request: Trading212ConnectRequest, user_id: str = Depends(get_current_user_id)):
    """Fetches real open positions and portfolio value directly from Trading 212 Open API."""
    key_input = (request.apiKey or "").strip()
    is_demo = request.isDemo or False
    should_save = request.saveConnection if request.saveConnection is not None else True
    is_new_key = False

    # 1. Determine which key to use
    if key_input and key_input not in ["ENV", "SAVED"]:
        key = key_input
        is_new_key = True
    else:
        # Check user's saved connection from database
        conn = await get_user_broker_connection(user_id, "TRADING212")
        if conn and conn.get("api_key"):
            key = conn["api_key"]
            is_demo = conn.get("is_demo", False) if request.isDemo is None else request.isDemo
        elif key_input == "ENV" or os.getenv("TRADING212_API_KEY"):
            # Fallback to system .env key if requested or available
            key = os.getenv("TRADING212_API_KEY", "").strip()
            is_new_key = True
        else:
            raise HTTPException(
                status_code=400,
                detail="No Trading 212 API key found. Please enter your API Key to connect your portfolio."
            )

    if not key or len(key) < 8:
        raise HTTPException(
            status_code=400,
            detail="Please provide a valid Trading 212 API key (at least 8 characters)."
        )

    try:
        data = await Trading212Service.fetch_live_portfolio(key, is_demo=is_demo, force_refresh=True)

        # 2. If valid and new key was provided, persist to database for this user!
        if is_new_key and should_save:
            await save_user_broker_connection(
                user_id=user_id,
                api_key=key,
                is_demo=is_demo,
                broker="TRADING212"
            )
            logger.info(f"Saved Trading 212 connection for user {user_id}")

        return {"status": "success", "data": data}
    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(status_code=401, detail=str(ve))
    except Exception as e:
        logger.error(f"Trading 212 API sync error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to connect to Trading 212: {str(e)}")

@router.post("/trading212/disconnect")
async def disconnect_trading212(user_id: str = Depends(get_current_user_id)):
    """Disconnects the user's Trading 212 connection and clears credentials."""
    await disconnect_user_broker_connection(user_id, "TRADING212")
    return {
        "status": "success",
        "message": "Trading 212 broker disconnected successfully."
    }

@router.post("/trading212/validate")
async def validate_trading212_key(request: Trading212ConnectRequest, user_id: str = Depends(get_current_user_id)):
    """Validates if a Trading 212 API key is active without requiring full save."""
    key = (request.apiKey or "").strip()
    if not key or key in ["ENV", "SAVED"]:
        conn = await get_user_broker_connection(user_id, "TRADING212")
        key = conn.get("api_key") if conn else os.getenv("TRADING212_API_KEY", "").strip()

    if not key:
        return {"status": "error", "valid": False, "message": "No API key provided."}

    try:
        data = await Trading212Service.fetch_live_portfolio(key, is_demo=request.isDemo or False)
        return {"status": "success", "valid": True, "positionCount": data.get("positionCount", 0)}
    except Exception as e:
        return {"status": "error", "valid": False, "message": str(e)}
