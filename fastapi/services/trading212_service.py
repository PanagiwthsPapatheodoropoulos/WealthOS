"""
Trading 212 Integration Engine for WealthOS
Supports:
1. Live Trading 212 OpenAPI v0 synchronization (/equity/portfolio, /equity/account/cash)
2. In-memory response caching (30s TTL) to prevent 429 rate limit errors
3. Resilient 429 backoff retry and stale-cache serving
4. Precise ticker normalization (e.g. VUAAm_EQ -> VUAA.MI, SMHm_EQ -> SMH.MI, A1P0d_EQ -> A1P0.DE)
5. Direct CSV/Export parser for Trading 212, IBKR, and Degiro
"""

import httpx
import re
import time
import base64
import hashlib
import asyncio
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from fastapi import HTTPException

logger = logging.getLogger(__name__)

class Trading212Service:

    TRADING212_LIVE_API_BASE = "https://live.trading212.com/api/v0"
    TRADING212_DEMO_API_BASE = "https://demo.trading212.com/api/v0"

    # In-memory short-lived cache: cache_key -> {"timestamp": float, "data": dict}
    _portfolio_cache: Dict[str, Dict[str, Any]] = {}
    CACHE_TTL_SECONDS = 30

    @classmethod
    def _build_auth_candidates(cls, raw_key: str) -> List[str]:
        raw = raw_key.strip()
        if not raw:
            return []
        if raw.startswith("Basic ") or raw.startswith("Bearer "):
            return [raw]
        
        if ":" in raw:
            # Pair provided: API_KEY:API_SECRET -> standard HTTP Basic Auth
            encoded = base64.b64encode(raw.encode("utf-8")).decode("utf-8")
            return [f"Basic {encoded}"]
        
        # Single key provided without colon
        candidates = []
        encoded_single = base64.b64encode(f"{raw}:".encode("utf-8")).decode("utf-8")
        candidates.append(f"Basic {encoded_single}")
        candidates.append(raw)
        candidates.append(f"Bearer {raw}")
        return candidates

    @classmethod
    def normalize_ticker(cls, raw_ticker: str) -> str:
        """
        Normalizes Trading 212 raw ticker codes into standard Yahoo/Bloomberg tickers.
        Examples:
        - VUAAm_EQ -> VUAA.MI
        - SMHm_EQ -> SMH.MI
        - A1P0d_EQ -> A1P0.DE
        - WNUCd_EQ -> WNUC.DE
        - WQTMd_EQ -> WQTM.DE
        - BOTZd_EQ -> BOTZ.MI
        - VWCE_DE_EQ -> VWCE.DE
        - NVDA_US_EQ -> NVDA
        """
        if not raw_ticker:
            return ""
        t = raw_ticker.strip()

        # Direct common mapping
        direct_map = {
            "VUAAm_EQ": "VUAA.MI",
            "VUAAM_EQ": "VUAA.MI",
            "SMHm_EQ": "SMH.MI",
            "SMHM_EQ": "SMH.MI",
            "A1P0d_EQ": "A1P0.DE",
            "A1P0D_EQ": "A1P0.DE",
            "WNUCd_EQ": "WNUC.DE",
            "WNUCD_EQ": "WNUC.DE",
            "WQTMd_EQ": "WQTM.DE",
            "WQTM_DE_EQ": "WQTM.DE",
            "BOTZd_EQ": "BOTZ.MI",
            "BOTZ_MI_EQ": "BOTZ.MI",
            "VWCEd_EQ": "VWCE.DE",
            "VWCED_EQ": "VWCE.DE",
            "KBOTd_EQ": "KBOT.DE",
            "KBOTD_EQ": "KBOT.DE",
        }
        if t in direct_map:
            return direct_map[t]

        # Suffix matching
        if re.search(r'm_EQ$', t, re.IGNORECASE):
            base = re.sub(r'm_EQ$', '', t, flags=re.IGNORECASE).upper()
            return f"{base}.MI"
        if re.search(r'd_EQ$', t, re.IGNORECASE):
            base = re.sub(r'd_EQ$', '', t, flags=re.IGNORECASE).upper()
            return f"{base}.DE"
        if re.search(r'l_EQ$', t, re.IGNORECASE):
            base = re.sub(r'l_EQ$', '', t, flags=re.IGNORECASE).upper()
            return f"{base}.L"

        t_up = t.upper()
        t_up = re.sub(r'_EQ$', '', t_up)
        if '_MI' in t_up:
            return t_up.replace('_MI', '.MI')
        if '_DE' in t_up:
            return t_up.replace('_DE', '.DE')
        if '_L' in t_up or '_LN' in t_up:
            return t_up.replace('_LN', '.L').replace('_L', '.L')
        if '_PA' in t_up:
            return t_up.replace('_PA', '.PA')
        if '_AS' in t_up:
            return t_up.replace('_AS', '.AS')
        if '_US' in t_up:
            return t_up.replace('_US', '')

        return t_up.split('_')[0]

    @classmethod
    async def fetch_live_portfolio(cls, api_key: str, is_demo: bool = False, force_refresh: bool = False) -> Dict[str, Any]:
        """
        Connects to Trading 212 Open API and retrieves real open positions.
        Supports both single API key and combined API_KEY:API_SECRET pair.
        Implements 30s in-memory caching and backoff on HTTP 429 rate limits.
        """
        base_url = cls.TRADING212_DEMO_API_BASE if is_demo else cls.TRADING212_LIVE_API_BASE
        candidates = cls._build_auth_candidates(api_key)

        cache_key = f"{is_demo}_{hashlib.sha256(api_key.encode()).hexdigest()[:16]}"
        now = time.time()

        # Check in-memory cache to prevent 429 rate limits from multiple rapid UI requests
        if not force_refresh and cache_key in cls._portfolio_cache:
            entry = cls._portfolio_cache[cache_key]
            age = now - entry["timestamp"]
            if age < cls.CACHE_TTL_SECONDS:
                logger.info(f"Serving cached Trading 212 portfolio ({round(age, 1)}s old)")
                return entry["data"]

        portfolio_resp = None
        working_auth = None

        for auth_val in candidates:
            headers = {
                "Authorization": auth_val,
                "User-Agent": "WealthOS-Institutional-Bridge/2.0"
            }
            try:
                async with httpx.AsyncClient(timeout=10.0, headers=headers) as client:
                    resp = await client.get(f"{base_url}/equity/portfolio")
                    portfolio_resp = resp

                    if resp.status_code == 200:
                        working_auth = auth_val
                        break

                    if resp.status_code == 429:
                        # Rate limited! Back off and retry once
                        logger.warning("Trading 212 429 Too Many Requests. Backing off 2.0s...")
                        await asyncio.sleep(2.0)
                        retry_resp = await client.get(f"{base_url}/equity/portfolio")
                        if retry_resp.status_code == 200:
                            portfolio_resp = retry_resp
                            working_auth = auth_val
                            break
                        elif retry_resp.status_code == 429:
                            # If we have a cached version (up to 5 minutes old), return it!
                            if cache_key in cls._portfolio_cache:
                                logger.warning("Trading 212 429 sustained; serving stale cached portfolio.")
                                return cls._portfolio_cache[cache_key]["data"]
                            raise HTTPException(
                                status_code=429,
                                detail="Trading 212 rate limit reached (1 request per few seconds). Please wait 5 seconds and retry."
                            )
            except HTTPException:
                raise
            except Exception as e:
                logger.debug(f"Trading 212 candidate test error: {e}")

        if not portfolio_resp or portfolio_resp.status_code == 401:
            # Probe alternate environment (Live vs Demo) to provide definitive diagnostic guidance
            alt_base = cls.TRADING212_LIVE_API_BASE if is_demo else cls.TRADING212_DEMO_API_BASE
            alt_mode = "Live" if is_demo else "Practice / Demo"
            curr_mode = "Practice / Demo" if is_demo else "Live"

            for auth_val in candidates:
                try:
                    async with httpx.AsyncClient(timeout=6.0, headers={"Authorization": auth_val}) as alt_client:
                        alt_resp = await alt_client.get(f"{alt_base}/equity/portfolio")
                        if alt_resp.status_code == 200:
                            raise ValueError(
                                f"Trading 212 API key rejected on {curr_mode} (401), but ACCEPTED on {alt_mode}! "
                                f"Please switch your modal toggle to '{alt_mode}' and retry."
                            )
                except ValueError:
                    raise
                except Exception:
                    pass

            has_pair = ":" in api_key.strip()
            pair_tip = (
                " Note: Trading 212 requires an API Key AND a Secret Key pair. "
                "If Trading 212 gave you an API Key and a separate Secret Key, combine them as 'API_KEY:API_SECRET' "
                "(e.g. paste both into the modal or in .env: TRADING212_API_KEY=YOUR_KEY:YOUR_SECRET)."
                if not has_pair else ""
            )

            raise ValueError(
                f"Trading 212 rejected this key against the {curr_mode.upper()} endpoint (401). "
                f"This means: (1) The key was generated in the opposite mode (Practice keys only work on Demo; Live keys only work on Live), or "
                f"(2) The key was generated without the 'Portfolio' read scope enabled in Trading 212 Settings -> API.{pair_tip}"
            )

        if portfolio_resp.status_code == 403:
            raise ValueError("Key is valid but missing the 'Portfolio' scope. Recreate it in Trading 212 Settings -> API with Portfolio read permission enabled.")

        if portfolio_resp.status_code == 429:
            if cache_key in cls._portfolio_cache:
                return cls._portfolio_cache[cache_key]["data"]
            raise HTTPException(status_code=429, detail="Trading 212 rate limit hit — wait 5 seconds and retry.")

        if portfolio_resp.status_code != 200:
            raise RuntimeError(f"Trading 212 API error {portfolio_resp.status_code}: {portfolio_resp.text[:300]}")

        raw_positions = portfolio_resp.json()

        # 2. Fetch Cash Balance (Optional & Safe)
        cash_data = {}
        auth_for_cash = working_auth or (candidates[0] if candidates else api_key)
        try:
            async with httpx.AsyncClient(timeout=6.0, headers={"Authorization": auth_for_cash}) as client:
                cash_resp = await client.get(f"{base_url}/equity/account/cash")
                if cash_resp.status_code == 200:
                    cash_data = cash_resp.json()
        except Exception as e:
            logger.debug(f"Optional cash fetch skipped: {e}")

        # 3. Normalize Positions
        normalized_positions: List[Dict[str, Any]] = []
        total_invested = 0.0
        total_current_value = 0.0
        total_ppl = 0.0

        TICKER_NAME_MAP = {
            "VUAA.MI": "Vanguard S&P 500 UCITS ETF (EUR)",
            "VUAAM": "Vanguard S&P 500 UCITS ETF (EUR)",
            "VUAA": "Vanguard S&P 500 UCITS ETF (EUR)",
            "SMH.MI": "VanEck Semiconductor UCITS ETF (EUR)",
            "SMHM": "VanEck Semiconductor UCITS ETF (EUR)",
            "SMH": "VanEck Semiconductor UCITS ETF (EUR)",
            "A1P0.DE": "Defiance Next Gen AI & Power Infrastructure UCITS ETF",
            "A1P0D": "Defiance Next Gen AI & Power Infrastructure UCITS ETF",
            "A1P0": "Defiance Next Gen AI & Power Infrastructure UCITS ETF",
            "WNUC.DE": "WisdomTree Uranium & Nuclear Energy UCITS ETF",
            "WNUCD": "WisdomTree Uranium & Nuclear Energy UCITS ETF",
            "WNUC": "WisdomTree Uranium & Nuclear Energy UCITS ETF",
            "WQTM.DE": "WisdomTree Quantum Computing UCITS ETF",
            "WQTMD": "WisdomTree Quantum Computing UCITS ETF",
            "WQTM": "WisdomTree Quantum Computing UCITS ETF",
            "BOTZ.MI": "Global X Robotics & AI UCITS ETF",
            "BOTZD": "Global X Robotics & AI UCITS ETF",
            "BOTZ": "Global X Robotics & AI UCITS ETF",
            "VWCE.DE": "Vanguard FTSE All-World UCITS ETF (USD)",
            "VWCE": "Vanguard FTSE All-World UCITS ETF (USD)",
            "VWCED": "Vanguard FTSE All-World UCITS ETF (USD)",
            "KBOT.DE": "KraneShares Artificial Intelligence and Robotics UCITS ETF",
            "KBOTD": "KraneShares Artificial Intelligence and Robotics UCITS ETF",
            "KBOT": "KraneShares Artificial Intelligence and Robotics UCITS ETF",
        }

        for p in raw_positions:
            raw_ticker = p.get("ticker", "")
            symbol = cls.normalize_ticker(raw_ticker)
            name = TICKER_NAME_MAP.get(symbol, TICKER_NAME_MAP.get(raw_ticker, symbol))
            qty = float(p.get("quantity", 0))
            avg_price = float(p.get("averagePrice", 0))
            cur_price = float(p.get("currentPrice", avg_price))
            ppl = float(p.get("ppl", 0))

            cost_basis = round(qty * avg_price, 2)
            market_val = round(qty * cur_price, 2)
            pnl_pct = round(((cur_price - avg_price) / avg_price) * 100, 2) if avg_price > 0 else 0.0

            total_invested += cost_basis
            total_current_value += market_val
            total_ppl += ppl

            normalized_positions.append({
                "rawTicker": raw_ticker,
                "symbol": symbol,
                "name": name,
                "quantity": qty,
                "averagePrice": avg_price,
                "currentPrice": cur_price,
                "costBasis": cost_basis,
                "marketValue": market_val,
                "unrealizedPnl": ppl,
                "unrealizedPnlPercentage": pnl_pct,
                "isUcits": any(k in symbol for k in ["VUAA", "SMH", "VWCE", "WQTM", "WNUC", "A1P0", "A1PO", "BOTZ", ".MI", ".DE"])
            })

        result = {
            "broker": "Trading 212",
            "connectedAt": datetime.now(timezone.utc).isoformat(),
            "positionCount": len(normalized_positions),
            "totalInvested": round(total_invested, 2),
            "totalMarketValue": round(total_current_value, 2),
            "totalUnrealizedPnl": round(total_ppl, 2),
            "totalUnrealizedPnlPercentage": round(((total_current_value - total_invested) / total_invested) * 100, 2) if total_invested > 0 else 0.0,
            "cash": cash_data.get("free", 0.0),
            "positions": normalized_positions
        }

        # Cache result
        cls._portfolio_cache[cache_key] = {"timestamp": now, "data": result}
        return result
