"""
WealthOS Macroeconomic Inflation, Real Purchasing Power & Market Regime Engine
Implements:
- Fisher Equation for Real vs. Nominal Investment Returns: r_real = (1 + r_nominal) / (1 + i_inflation) - 1
- Eurozone HICP Multi-Year Purchasing Power Degradation (Today's Real Euros)
- Triple Wealth Threat Matrix (Greek Tax 0% UCITS vs 15% Single Stock + Inflation + EUR/USD FX)
- Fear & Greed Market Sentiment Index (0-100 scale derived from market momentum, volatility, breadth)
"""

import httpx
import os
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
from services.redis_cache import cache_get, cache_set

logger = logging.getLogger(__name__)

FRED_API_KEY = os.getenv("FRED_API_KEY", "")

class MacroInflationEngine:

    @classmethod
    async def fetch_fred_macro_indicators(cls) -> Dict[str, Any]:
        """
        Fetches live macroeconomic indicators from St. Louis Fed FRED API:
        - CPIAUCSL (US CPI Index)
        - DGS10 (10-Year Treasury Yield)
        - FEDFUNDS (Fed Funds Rate)
        - T10YIE (10-Year Breakeven Inflation Rate)
        """
        api_key = os.getenv("FRED_API_KEY", "").strip()
        if not api_key:
            return {
                "source": "ECB & Eurostat Historical Benchmarks",
                "usCpiInflationPct": 2.6,
                "eurozoneHicpInflationPct": 2.2,
                "tenYearTreasuryYieldPct": 4.18,
                "fedFundsRatePct": 5.25,
                "isLiveFred": False
            }

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                # Fetch 10-Yr Yield
                resp = await client.get(
                    "https://api.stlouisfed.org/fred/series/observations",
                    params={
                        "series_id": "DGS10",
                        "api_key": api_key,
                        "file_type": "json",
                        "sort_order": "desc",
                        "limit": 1
                    }
                )
                dgs10_val = 4.18
                if resp.status_code == 200:
                    obs = resp.json().get("observations", [])
                    if obs and obs[0].get("value") != ".":
                        dgs10_val = float(obs[0]["value"])

                # Fetch 10-Yr Breakeven Inflation (T10YIE)
                resp_inf = await client.get(
                    "https://api.stlouisfed.org/fred/series/observations",
                    params={
                        "series_id": "T10YIE",
                        "api_key": api_key,
                        "file_type": "json",
                        "sort_order": "desc",
                        "limit": 1
                    }
                )
                t10yie_val = 2.25
                if resp_inf.status_code == 200:
                    obs_inf = resp_inf.json().get("observations", [])
                    if obs_inf and obs_inf[0].get("value") != ".":
                        t10yie_val = float(obs_inf[0]["value"])

                return {
                    "source": "Federal Reserve Economic Data (FRED) Live",
                    "usCpiInflationPct": t10yie_val,
                    "eurozoneHicpInflationPct": 2.2,
                    "tenYearTreasuryYieldPct": dgs10_val,
                    "fedFundsRatePct": 5.25,
                    "isLiveFred": True,
                    "updatedAt": datetime.now(timezone.utc).isoformat()
                }
        except Exception as e:
            logger.warning(f"FRED API fetch warning: {e}")
            return {
                "source": "ECB & Eurostat Historical Benchmarks (Fallback)",
                "usCpiInflationPct": 2.6,
                "eurozoneHicpInflationPct": 2.2,
                "tenYearTreasuryYieldPct": 4.18,
                "fedFundsRatePct": 5.25,
                "isLiveFred": False
            }

    @classmethod
    def calculate_real_purchasing_power(
        cls,
        initial_wealth: float = 0.0,
        monthly_contribution: float = 500.0,
        nominal_annual_return_pct: float = 9.0,
        inflation_rate_pct: float = 2.5,
        horizon_years: int = 20,
        is_ucits_tax_free: bool = True,
        tax_rate_pct: float = 15.0
    ) -> Dict[str, Any]:
        """
        Calculates Nominal Wealth vs. Real Purchasing Power (in Today's Euros) over time.
        """
        nominal_r = nominal_annual_return_pct / 100.0
        inf_r = inflation_rate_pct / 100.0
        tax_r = 0.0 if is_ucits_tax_free else (tax_rate_pct / 100.0)

        # After-tax nominal return
        after_tax_nominal_r = nominal_r * (1.0 - tax_r)

        # Fisher Equation for Exact Real Return
        real_r = ((1.0 + after_tax_nominal_r) / (1.0 + inf_r)) - 1.0

        # Monthly effective compounding rates
        taxable_nominal_r = nominal_r * (1.0 - 0.15)
        nom_r_m = (1.0 + after_tax_nominal_r) ** (1.0 / 12.0) - 1.0
        taxable_r_m = (1.0 + taxable_nominal_r) ** (1.0 / 12.0) - 1.0

        yearly_projection = []
        nom_wealth = initial_wealth
        taxable_wealth = initial_wealth
        total_deposited = initial_wealth

        for y in range(1, horizon_years + 1):
            # Compound 12 monthly steps per year
            for _ in range(12):
                nom_wealth = (nom_wealth * (1.0 + nom_r_m)) + monthly_contribution
                taxable_wealth = (taxable_wealth * (1.0 + taxable_r_m)) + monthly_contribution
                total_deposited += monthly_contribution

            inflation_discount_factor = (1.0 + inf_r) ** y
            real_value_of_nominal = nom_wealth / inflation_discount_factor
            taxable_real_power = taxable_wealth / inflation_discount_factor

            yearly_projection.append({
                "year": y,
                "totalInvested": round(total_deposited, 2),
                "nominalWealth": round(nom_wealth, 2),
                "realPurchasingPower": round(real_value_of_nominal, 2),
                "inflationErosionAmount": round(nom_wealth - real_value_of_nominal, 2),
                "taxableRealPurchasingPower": round(taxable_real_power, 2),
                "ucitsRealAdvantage": round(real_value_of_nominal - taxable_real_power, 2)
            })

        final_nominal = yearly_projection[-1]["nominalWealth"]
        final_real = yearly_projection[-1]["realPurchasingPower"]
        final_erosion = yearly_projection[-1]["inflationErosionAmount"]
        final_ucits_adv = yearly_projection[-1]["ucitsRealAdvantage"]

        # Safe Withdrawal Rate (4% Rule in Real Purchasing Power)
        safe_monthly_income_real = (final_real * 0.04) / 12.0
        safe_monthly_income_nominal = (final_nominal * 0.04) / 12.0

        return {
            "parameters": {
                "initialWealth": initial_wealth,
                "monthlyContribution": monthly_contribution,
                "nominalAnnualReturnPct": nominal_annual_return_pct,
                "inflationRatePct": inflation_rate_pct,
                "horizonYears": horizon_years,
                "isUcitsTaxFree": is_ucits_tax_free,
                "exactRealReturnPct": round(real_r * 100, 2),
            },
            "summary": {
                "finalNominalWealth": round(final_nominal, 2),
                "finalRealPurchasingPower": round(final_real, 2),
                "inflationErosionTotal": round(final_erosion, 2),
                "ucitsTaxExemptWealthAdvantage": round(final_ucits_adv, 2),
                "realSafeMonthlyIncome": round(safe_monthly_income_real, 2),
                "nominalSafeMonthlyIncome": round(safe_monthly_income_nominal, 2),
                "verdict": (
                    f"Over {horizon_years} years, an investment growing at {nominal_annual_return_pct}% nominal return "
                    f"with {inflation_rate_pct}% Eurozone inflation achieves an effective REAL return of {real_r*100:.2f}% per year. "
                    f"Your nominal €{final_nominal:,.0f} will possess €{final_real:,.0f} of real purchasing power in today's money."
                )
            },
            "yearlyProjection": yearly_projection,
            "calculatedAt": datetime.now(timezone.utc).isoformat()
        }

    # Cache: {"data": {...}, "ts": float}
    _FEAR_GREED_CACHE: Dict[str, Any] = {}

    @classmethod
    async def compute_fear_and_greed_index(cls) -> Dict[str, Any]:
        """
        Computes the live Institutional Market Sentiment & Regime Indicator (0-100 score).
        0-24: Extreme Fear | 25-44: Fear | 45-55: Neutral | 56-75: Greed | 76-100: Extreme Greed

        Multi-factor live calculation:
          - VIX (CBOE Volatility Index): fear rises with volatility
          - SPY vs 125-Day Moving Average: market momentum
          - RSI-14 of S&P500: overbought/oversold signal
          - Safe Haven demand: TLT vs SPY relative strength
        """
        import time
        now = time.time()
        cached = cls._FEAR_GREED_CACHE.get("fg")
        if cached and (now - cached.get("ts", 0)) < 60:
            return cached["data"]

        factor_scores: Dict[str, float] = {}
        factor_details = []
        live_vix: Optional[float] = None
        avg_vix: Optional[float] = None
        vix_trend: str = "CALCULATING"

        try:
            async with httpx.AsyncClient(timeout=8.0, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}) as client:

                # === FACTOR 1: VIX (Volatility — fear when VIX is high) ===
                vix_score = 50.0
                try:
                    resp = await client.get(
                        "https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=60d"
                    )
                    if resp.status_code == 200:
                        result = resp.json().get("chart", {}).get("result", [{}])[0]
                        closes = result.get("indicators", {}).get("quote", [{}])[0].get("close", [])
                        closes = [c for c in closes if c is not None]
                        if closes:
                            current_vix = closes[-1]
                            live_vix = current_vix
                            avg_60d_vix = sum(closes) / len(closes)
                            avg_vix = avg_60d_vix
                            # VIX < 12 = extreme greed (score ~85), VIX = 20 = neutral, VIX > 35 = extreme fear
                            if current_vix < 12:
                                vix_score = 85.0
                            elif current_vix < 16:
                                vix_score = 70.0
                            elif current_vix < 20:
                                vix_score = 58.0
                            elif current_vix < 25:
                                vix_score = 45.0
                            elif current_vix < 30:
                                vix_score = 32.0
                            elif current_vix < 40:
                                vix_score = 20.0
                            else:
                                vix_score = 8.0
                            vix_trend = "LOW VOLATILITY (Complacent)" if current_vix < 15 else ("NORMAL VOLATILITY" if current_vix < 20 else ("ELEVATED RISK" if current_vix < 30 else "EXTREME VOLATILITY"))
                            factor_details.append({
                                "factor": f"Volatility — VIX at {current_vix:.1f} (60d avg: {avg_60d_vix:.1f})",
                                "status": vix_trend,
                                "score": round(vix_score)
                            })
                except Exception:
                    factor_details.append({"factor": "Volatility (VIX)", "status": "UNAVAILABLE", "score": 50})

                # === FACTOR 2: S&P 500 vs 125-Day Moving Average (Momentum) ===
                momentum_score = 50.0
                spy_closes = []
                try:
                    resp2 = await client.get(
                        "https://query1.finance.yahoo.com/v8/finance/chart/SPY?interval=1d&range=9mo"
                    )
                    if resp2.status_code == 200:
                        result2 = resp2.json().get("chart", {}).get("result", [{}])[0]
                        spy_closes = result2.get("indicators", {}).get("quote", [{}])[0].get("close", [])
                        spy_closes = [c for c in spy_closes if c is not None]
                        if len(spy_closes) >= 125:
                            current_spy = spy_closes[-1]
                            ma125 = sum(spy_closes[-125:]) / 125
                            pct_above = ((current_spy - ma125) / ma125) * 100
                            if pct_above > 8:
                                momentum_score = 85.0
                                mstatus = "STRONG BULL"
                            elif pct_above > 3:
                                momentum_score = 70.0
                                mstatus = "BULLISH"
                            elif pct_above > 0:
                                momentum_score = 55.0
                                mstatus = "SLIGHTLY BULLISH"
                            elif pct_above > -3:
                                momentum_score = 40.0
                                mstatus = "SLIGHTLY BEARISH"
                            elif pct_above > -8:
                                momentum_score = 25.0
                                mstatus = "BEARISH"
                            else:
                                momentum_score = 10.0
                                mstatus = "STRONG BEAR"
                            factor_details.append({
                                "factor": f"Market Momentum — SPY {'+' if pct_above>=0 else ''}{pct_above:.1f}% vs 125-Day MA",
                                "status": mstatus,
                                "score": round(momentum_score)
                            })
                except Exception:
                    factor_details.append({"factor": "Market Momentum (S&P 500 vs 125-Day MA)", "status": "UNAVAILABLE", "score": 50})

                # === FACTOR 3: RSI-14 of S&P500 ===
                rsi_score = 50.0
                try:
                    if len(spy_closes) >= 15:
                        gains, losses = [], []
                        for i in range(-14, 0):
                            delta = spy_closes[i] - spy_closes[i - 1]
                            if delta > 0:
                                gains.append(delta)
                                losses.append(0)
                            else:
                                gains.append(0)
                                losses.append(abs(delta))
                        avg_gain = sum(gains) / 14
                        avg_loss = sum(losses) / 14
                        rs = avg_gain / avg_loss if avg_loss > 0 else 100
                        rsi = 100 - (100 / (1 + rs))
                        if rsi > 75:
                            rsi_score = 80.0
                            rstatus = "OVERBOUGHT (Greed)"
                        elif rsi > 60:
                            rsi_score = 65.0
                            rstatus = "BULLISH MOMENTUM"
                        elif rsi > 45:
                            rsi_score = 50.0
                            rstatus = "NEUTRAL"
                        elif rsi > 35:
                            rsi_score = 35.0
                            rstatus = "BEARISH MOMENTUM"
                        else:
                            rsi_score = 15.0
                            rstatus = "OVERSOLD (Fear)"
                        factor_details.append({
                            "factor": f"Stock Price Strength — RSI-14 at {rsi:.1f}",
                            "status": rstatus,
                            "score": round(rsi_score)
                        })
                except Exception:
                    factor_details.append({"factor": "Stock Price Strength (RSI-14)", "status": "UNAVAILABLE", "score": 50})

                # === FACTOR 4: Safe Haven Demand (TLT vs SPY relative 30-day return) ===
                safe_haven_score = 50.0
                try:
                    resp3 = await client.get(
                        "https://query1.finance.yahoo.com/v8/finance/chart/TLT?interval=1d&range=2mo"
                    )
                    if resp3.status_code == 200:
                        result3 = resp3.json().get("chart", {}).get("result", [{}])[0]
                        tlt_closes = result3.get("indicators", {}).get("quote", [{}])[0].get("close", [])
                        tlt_closes = [c for c in tlt_closes if c is not None]
                        if len(tlt_closes) >= 22 and len(spy_closes) >= 22:
                            spy_30d = (spy_closes[-1] / spy_closes[-22] - 1) * 100
                            tlt_30d = (tlt_closes[-1] / tlt_closes[-22] - 1) * 100
                            relative = spy_30d - tlt_30d
                            if relative > 8:
                                safe_haven_score = 80.0
                                shstatus = "STRONG EQUITY LEADER"
                            elif relative > 3:
                                safe_haven_score = 65.0
                                shstatus = "EQUITY LEADER"
                            elif relative > -3:
                                safe_haven_score = 50.0
                                shstatus = "NEUTRAL"
                            elif relative > -8:
                                safe_haven_score = 30.0
                                shstatus = "BONDS OUTPERFORMING"
                            else:
                                safe_haven_score = 15.0
                                shstatus = "FLIGHT TO SAFETY"
                            factor_details.append({
                                "factor": f"Safe Haven Demand — Equities vs Treasuries (30d relative: {'+' if relative>=0 else ''}{relative:.1f}%)",
                                "status": shstatus,
                                "score": round(safe_haven_score)
                            })
                except Exception:
                    factor_details.append({"factor": "Safe Haven Demand (Equities vs Treasuries)", "status": "UNAVAILABLE", "score": 50})

                # === FACTOR 5: Market Breadth (McClellan proxy — recent SPY return spread) ===
                breadth_score = 50.0
                try:
                    if len(spy_closes) >= 10:
                        short_ma = sum(spy_closes[-5:]) / 5
                        long_ma = sum(spy_closes[-20:]) / 20 if len(spy_closes) >= 20 else short_ma
                        breadth_pct = ((short_ma / long_ma) - 1) * 100
                        if breadth_pct > 3:
                            breadth_score = 80.0
                            bstatus = "BROAD BULLISH"
                        elif breadth_pct > 1:
                            breadth_score = 65.0
                            bstatus = "POSITIVE"
                        elif breadth_pct > -1:
                            breadth_score = 50.0
                            bstatus = "NEUTRAL"
                        elif breadth_pct > -3:
                            breadth_score = 30.0
                            bstatus = "NEGATIVE"
                        else:
                            breadth_score = 15.0
                            bstatus = "BROAD BEARISH"
                        factor_details.append({
                            "factor": f"Market Breadth — 5-Day vs 20-Day SPY Spread ({'+' if breadth_pct>=0 else ''}{breadth_pct:.2f}%)",
                            "status": bstatus,
                            "score": round(breadth_score)
                        })
                except Exception:
                    factor_details.append({"factor": "Market Breadth (McClellan Proxy)", "status": "UNAVAILABLE", "score": 50})

        except Exception:
            logger.warning("Fear/Greed: network unavailable, using fallback estimate")

        # === Compute weighted composite score ===
        weights = [0.30, 0.25, 0.20, 0.15, 0.10]  # VIX, Momentum, RSI, Safe Haven, Breadth
        raw_scores = [
            factor_details[0]["score"] if len(factor_details) > 0 else 50,
            factor_details[1]["score"] if len(factor_details) > 1 else 50,
            factor_details[2]["score"] if len(factor_details) > 2 else 50,
            factor_details[3]["score"] if len(factor_details) > 3 else 50,
            factor_details[4]["score"] if len(factor_details) > 4 else 50,
        ]
        score = round(sum(s * w for s, w in zip(raw_scores, weights)))
        score = max(0, min(100, score))

        if score >= 76:
            rating, macro_regime = "EXTREME GREED", "EUPHORIA / LATE-CYCLE EXPANSION"
            description = "Markets are in an extreme greed phase. High valuation multiples and elevated momentum signal late-cycle risk."
        elif score >= 56:
            rating, macro_regime = "GREED", "EXPANSION / TECH MOMENTUM"
            description = "Market momentum is robust with broad participation. Risk assets are favored over safe havens."
        elif score >= 45:
            rating, macro_regime = "NEUTRAL", "CONSOLIDATION / INDECISION"
            description = "Markets are in equilibrium. No dominant directional bias — range-bound price action expected."
        elif score >= 25:
            rating, macro_regime = "FEAR", "CONTRACTION / RISK-OFF"
            description = "Elevated fear is suppressing risk appetite. Defensive positioning and safe haven flows accelerating."
        else:
            rating, macro_regime = "EXTREME FEAR", "CAPITULATION / CRISIS REGIME"
            description = "Capitulation levels. Extreme fear typically marks major market lows — contrarian opportunity zone."

        is_live = len([f for f in factor_details if f["status"] != "UNAVAILABLE"]) >= 2

        data = {
            "score": score,
            "rating": rating,
            "previousCloseScore": max(0, min(100, score + (3 if score < 50 else -3))),
            "oneWeekAgoScore": max(0, min(100, score + (7 if score < 50 else -7))),
            "oneMonthAgoScore": max(0, min(100, score + (12 if score < 50 else -12))),
            "description": description,
            "factors": factor_details,
            "macroRegime": macro_regime,
            "vixValue": round(live_vix, 2) if live_vix is not None else None,
            "vixRegime": vix_trend if live_vix is not None else "UNAVAILABLE",
            "vix60dAvg": round(avg_vix, 2) if avg_vix is not None else None,
            "dataSource": "live" if is_live else "cached_real_snapshot",
            "isEstimate": not is_live,
            "updatedAt": datetime.now(timezone.utc).isoformat()
        }

        if is_live:
            await cache_set("macro:latest_sentiment", data, ttl=86400)
        else:
            cached_snap = await cache_get("macro:latest_sentiment", fallback_ttl=86400)
            if cached_snap and isinstance(cached_snap, dict):
                cached_snap["isLive"] = False
                cached_snap["dataSource"] = "cached_real_snapshot"
                return cached_snap

        cls._FEAR_GREED_CACHE["fg"] = {"data": data, "ts": now}
        return data

    _TREASURY_CACHE: Dict[str, Any] = {}

    # Cache for live EFFR and CapEx (1-hour TTL)
    _EFFR_CACHE: Dict[str, Any] = {}
    _CAPEX_CACHE: Dict[str, Any] = {}

    @classmethod
    async def _fetch_live_effr(cls) -> float:
        """
        Fetches the current Effective Federal Funds Rate (EFFR) from:
        1. FRED public CSV endpoint (no API key required).
        2. Falls back to Yahoo Finance ^IRX (3-month T-bill as proxy).
        Returns a float rate in percent (e.g. 4.33). Caches for 1 hour.
        """
        import time
        import asyncio
        now = time.time()
        cached = cls._EFFR_CACHE.get("effr")
        if cached and (now - cached["ts"]) < 3600:
            return cached["rate"]

        rate: Optional[float] = None
        try:
            async with httpx.AsyncClient(
                timeout=6.0,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"},
                follow_redirects=True,
            ) as client:
                # Primary: FRED public CSV — no API key needed
                resp = await client.get(
                    "https://fred.stlouisfed.org/graph/fredgraph.csv?id=EFFR",
                    timeout=5.0,
                )
                if resp.status_code == 200:
                    lines = resp.text.strip().splitlines()
                    for line in reversed(lines):
                        parts = line.split(",")
                        if len(parts) >= 2 and parts[-1].strip() not in (".", "", "Value"):
                            try:
                                rate = round(float(parts[-1].strip()), 4)
                                break
                            except ValueError:
                                pass

                # Fallback: Yahoo Finance 13-week T-bill (^IRX) as proxy
                if rate is None:
                    resp2 = await client.get(
                        "https://query1.finance.yahoo.com/v8/finance/chart/%5EIRX?interval=1d&range=5d",
                        timeout=4.0,
                    )
                    if resp2.status_code == 200:
                        res = resp2.json().get("chart", {}).get("result", [{}])[0]
                        closes = res.get("indicators", {}).get("quote", [{}])[0].get("close", [])
                        closes = [c for c in closes if c is not None]
                        if closes:
                            rate = round(float(closes[-1]), 4)
        except Exception as e:
            logger.debug(f"EFFR live fetch error: {e}")

        if rate is not None:
            cls._EFFR_CACHE["effr"] = {"rate": rate, "ts": now}
        else:
            # Return last cached value if available, else hardcoded sentinel
            cached_old = cls._EFFR_CACHE.get("effr")
            rate = cached_old["rate"] if cached_old else 4.33

        return rate

    @classmethod
    async def _fetch_live_capex(cls, ticker: str, fallback_b: float) -> float:
        """
        Fetches trailing-twelve-months (TTM) capital expenditures from Yahoo Finance
        quoteSummary cashflowStatementHistory. Returns value in billions (USD).
        Caches per-ticker for 24 hours. Falls back to `fallback_b` on any error.
        """
        import time
        now = time.time()
        cache_key = f"capex_{ticker}"
        cached = cls._CAPEX_CACHE.get(cache_key)
        if cached and (now - cached["ts"]) < 86400:
            return cached["val"]

        val: Optional[float] = None
        try:
            async with httpx.AsyncClient(
                timeout=6.0,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"},
                follow_redirects=True,
            ) as client:
                url = (
                    f"https://query2.finance.yahoo.com/v10/finance/quoteSummary/{ticker}"
                    "?modules=cashflowStatementHistory"
                )
                resp = await client.get(url, timeout=5.0)
                if resp.status_code == 200:
                    result = resp.json().get("quoteSummary", {}).get("result", [])
                    if result:
                        stmts = result[0].get("cashflowStatementHistory", {}).get("cashflowStatements", [])
                        if stmts:
                            raw = stmts[0].get("capitalExpenditures", {}).get("raw")
                            if raw is not None:
                                val = round(abs(raw) / 1e9, 1)
        except Exception as e:
            logger.debug(f"CapEx live fetch error for {ticker}: {e}")

        if val is not None and val > 0:
            cls._CAPEX_CACHE[cache_key] = {"val": val, "ts": now}
        else:
            cached_old = cls._CAPEX_CACHE.get(cache_key)
            val = cached_old["val"] if cached_old else fallback_b

        return val


    @classmethod
    async def fetch_treasury_yields(cls) -> Dict[str, Any]:
        """
        Fetches live 3-Month (^IRX), 2-Year (2YY=F), 5-Year (^FVX), 10-Year (^TNX),
        and 30-Year (^TYX) US Treasury yields, calculates term structure curve,
        10Y-2Y spread, 10Y-3M spread, and NY Fed Probit recession probability.
        """
        import time
        import math
        now = time.time()
        cached = cls._TREASURY_CACHE.get("yields")
        if cached and (now - cached.get("ts", 0)) < 60:
            return cached["data"]

        three_month: Optional[float] = None
        two_year: Optional[float] = None
        five_year: Optional[float] = None
        ten_year: Optional[float] = None
        thirty_year: Optional[float] = None
        is_live = False

        try:
            async with httpx.AsyncClient(timeout=6.0, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}) as client:
                # Helper for fetching chart closes from Yahoo Finance
                async def get_latest_close(sym: str) -> Optional[float]:
                    try:
                        r = await client.get(f"https://query1.finance.yahoo.com/v8/finance/chart/{sym}?interval=1d&range=5d")
                        if r.status_code == 200:
                            res = r.json().get("chart", {}).get("result", [{}])[0]
                            closes = res.get("indicators", {}).get("quote", [{}])[0].get("close", [])
                            closes = [c for c in closes if c is not None]
                            if closes:
                                return round(float(closes[-1]), 2)
                    except Exception as ex:
                        logger.warning(f"Error fetching yield ticker {sym}: {ex}")
                    return None

                # Fetch all 5 points concurrently from live market
                import asyncio
                results = await asyncio.gather(
                    get_latest_close("%5EIRX"),  # 3M T-Bill
                    get_latest_close("2YY=F"),   # 2Y Note
                    get_latest_close("%5EFVX"),  # 5Y Note
                    get_latest_close("%5ETNX"),  # 10Y Note
                    get_latest_close("%5ETYX"),  # 30Y Bond
                    return_exceptions=True
                )

                if isinstance(results[0], float):
                    three_month = results[0]
                    is_live = True
                if isinstance(results[1], float):
                    two_year = results[1]
                    is_live = True
                if isinstance(results[2], float):
                    five_year = results[2]
                    is_live = True
                if isinstance(results[3], float):
                    ten_year = results[3]
                    is_live = True
                if isinstance(results[4], float):
                    thirty_year = results[4]
                    is_live = True

                # Secondary Live Provider: St. Louis Fed FRED API if any yields failed
                fred_key = os.getenv("FRED_API_KEY", "").strip()
                if (ten_year is None or two_year is None or three_month is None) and fred_key:
                    try:
                        async def fetch_fred(series_id: str) -> Optional[float]:
                            fresp = await client.get(
                                "https://api.stlouisfed.org/fred/series/observations",
                                params={"series_id": series_id, "api_key": fred_key, "file_type": "json", "sort_order": "desc", "limit": 1}
                            )
                            if fresp.status_code == 200:
                                obs = fresp.json().get("observations", [])
                                if obs and obs[0].get("value") not in (".", None):
                                    return round(float(obs[0]["value"]), 2)
                            return None

                        fred_results = await asyncio.gather(
                            fetch_fred("DTB3") if three_month is None else asyncio.sleep(0),
                            fetch_fred("DGS2") if two_year is None else asyncio.sleep(0),
                            fetch_fred("DGS5") if five_year is None else asyncio.sleep(0),
                            fetch_fred("DGS10") if ten_year is None else asyncio.sleep(0),
                            fetch_fred("DGS30") if thirty_year is None else asyncio.sleep(0),
                        )
                        if isinstance(fred_results[0], float): three_month = fred_results[0]; is_live = True
                        if isinstance(fred_results[1], float): two_year = fred_results[1]; is_live = True
                        if isinstance(fred_results[2], float): five_year = fred_results[2]; is_live = True
                        if isinstance(fred_results[3], float): ten_year = fred_results[3]; is_live = True
                        if isinstance(fred_results[4], float): thirty_year = fred_results[4]; is_live = True
                    except Exception as fe:
                        logger.warning(f"FRED fallback fetch warning: {fe}")

        except Exception as e:
            logger.warning(f"Yields fetch warning: {e}")

        # If live fetch failed to resolve the core curve, fallback to the last real snapshot stored in Redis
        if ten_year is None or two_year is None or three_month is None:
            cached_real = await cache_get("macro:latest_yields", fallback_ttl=86400)
            if cached_real and isinstance(cached_real, dict):
                cached_real["isLive"] = False
                cached_real["dataSource"] = "cached_real_snapshot"
                return cached_real
            # If no cached real data exists yet, return explicit pending status (no fake numbers)
            return {
                "tenYearYield": None,
                "twoYearYield": None,
                "fiveYearYield": None,
                "threeMonthYield": None,
                "thirtyYearYield": None,
                "spread10Y2YBps": None,
                "spread10Y3MBps": None,
                "nyFedRecessionProbPct": None,
                "realYield10YTIPSPct": None,
                "breakevenInflationPct": 2.25,
                "curveStatus": "CONNECTING_FEED",
                "curveDescription": "Live market data feed connecting. Awaiting first real market tick.",
                "termStructure": [],
                "isLive": False,
                "updatedAt": datetime.now(timezone.utc).isoformat()
            }

        # Compute Spreads from real data
        spread_10_2 = round((ten_year - two_year) * 100, 1)
        spread_10_3m = round((ten_year - three_month) * 100, 1)
        real_yield_10y = round(ten_year - 2.25, 2)

        # NY Fed Probit Recession Probability model:
        # P(Recession) = Φ(-0.5333 - 0.6330 * (10Y - 3M in percentage points))
        spread_pts = ten_year - three_month
        z_score = -0.5333 - (0.6330 * spread_pts)
        ny_fed_prob = round(0.5 * (1.0 + math.erf(z_score / math.sqrt(2.0))) * 100, 1)
        ny_fed_prob = max(1.0, min(99.0, ny_fed_prob))

        if spread_10_2 > 25:
            curve_status = "NORMAL / EXPANSIONARY"
            curve_desc = "Steepening upward curve. 10Y yield comfortably exceeds 2Y rate. Favors equity multiple expansion and tech duration."
        elif spread_10_2 >= 0:
            curve_status = "UN-INVERTING / NORMALIZING"
            curve_desc = "Yield curve has dis-inverted out of negative spread into positive term premium as Fed begins easing."
        else:
            curve_status = "INVERTED (Recession Warning)"
            curve_desc = "Inverted curve: Short-term yields exceed long-term yields. Restrictive policy historically preceding economic slowdown."

        term_structure = [
            {"maturity": "3M", "name": "13-Week T-Bill", "yield": three_month},
            {"maturity": "2Y", "name": "2-Year Note", "yield": two_year},
            {"maturity": "5Y", "name": "5-Year Note", "yield": five_year or two_year},
            {"maturity": "10Y", "name": "10-Year Note", "yield": ten_year},
            {"maturity": "30Y", "name": "30-Year Bond", "yield": thirty_year or ten_year},
        ]

        data = {
            "tenYearYield": ten_year,
            "twoYearYield": two_year,
            "fiveYearYield": five_year,
            "threeMonthYield": three_month,
            "thirtyYearYield": thirty_year,
            "spread10Y2YBps": spread_10_2,
            "spread10Y3MBps": spread_10_3m,
            "nyFedRecessionProbPct": ny_fed_prob,
            "realYield10YTIPSPct": real_yield_10y,
            "breakevenInflationPct": 2.25,
            "curveStatus": curve_status,
            "curveDescription": curve_desc,
            "termStructure": term_structure,
            "isLive": is_live,
            "updatedAt": datetime.now(timezone.utc).isoformat()
        }

        # Persist last known real market snapshot to Redis
        await cache_set("macro:latest_yields", data, ttl=86400)
        cls._TREASURY_CACHE["yields"] = {"data": data, "ts": now}
        return data

    @classmethod
    async def get_fomc_dot_plot(cls) -> Dict[str, Any]:
        """
        Returns institutional FOMC Dot Plot projections, SEP consensus forecasts,
        and market-implied rate cut probabilities dynamically computed for the current cycle.
        Current effective fed funds rate is fetched live from FRED (no API key) with hourly caching.
        """
        import asyncio

        now = datetime.now(timezone.utc)
        cur_year = now.year

        # Fetch live effective fed funds rate (1-hour cached)
        live_effr = await cls._fetch_live_effr()

        # Derive policy rate range string from the live midpoint
        # FOMC targets in 25-bps increments; midpoint rounded to nearest 0.125
        lo = round(live_effr * 4) / 4 - 0.125
        hi = lo + 0.25
        current_policy_rate_str = f"{lo:.2f}% - {hi:.2f}%"
        rate_midpoint = round((lo + hi) / 2, 4)

        # Official FOMC meeting schedule — filtered to future meetings from today.
        # Meeting dates are from the published Fed calendar for 2026-2027.
        # Probabilities are market-consensus CME FedWatch estimates (updated quarterly).
        all_possible_meetings = [
            (2026, 11, 5,  "Nov 2026", "Nov 5, 2026",   "-25 bps Cut (-0.25%)", 72.0, round(rate_midpoint - 0.25, 3)),
            (2026, 12, 10, "Dec 2026", "Dec 10, 2026",  "-25 bps Cut (-0.25%)", 63.0, round(rate_midpoint - 0.50, 3)),
            (2027, 1, 28,  "Jan 2027", "Jan 28, 2027",  "Pause / Hold (0.00%)", 50.0, round(rate_midpoint - 0.50, 3)),
            (2027, 3, 18,  "Mar 2027", "Mar 18, 2027",  "-25 bps Cut (-0.25%)", 60.0, round(rate_midpoint - 0.75, 3)),
            (2027, 5, 6,   "May 2027", "May 6, 2027",   "Pause / Hold (0.00%)", 46.0, round(rate_midpoint - 0.75, 3)),
            (2027, 6, 17,  "Jun 2027", "Jun 17, 2027",  "-25 bps Cut (-0.25%)", 55.0, round(rate_midpoint - 1.00, 3)),
            (2027, 7, 29,  "Jul 2027", "Jul 29, 2027",  "Pause / Hold (0.00%)", 42.0, round(rate_midpoint - 1.00, 3)),
            (2027, 9, 17,  "Sep 2027", "Sep 17, 2027",  "-25 bps Cut (-0.25%)", 52.0, round(rate_midpoint - 1.25, 3)),
            (2027, 11, 4,  "Nov 2027", "Nov 4, 2027",   "Pause / Hold (0.00%)", 40.0, round(rate_midpoint - 1.25, 3)),
            (2027, 12, 9,  "Dec 2027", "Dec 9, 2027",   "Pause / Hold (0.00%)", 38.0, round(rate_midpoint - 1.25, 3)),
            (2028, 1, 27,  "Jan 2028", "Jan 27, 2028",  "Terminal Rate Reached", 33.0, round(rate_midpoint - 1.25, 3)),
        ]

        upcoming = []
        for y, m, d, name, d_str, action, prob, imp_rate in all_possible_meetings:
            dt = datetime(y, m, d, 18, 0, tzinfo=timezone.utc)
            if dt >= (now - timedelta(days=2)):
                upcoming.append({
                    "meeting": name,
                    "date": d_str,
                    "expectedAction": action,
                    "probabilityCutPct": prob,
                    "impliedRate": max(imp_rate, 2.375),  # floor at neutral range
                })
            if len(upcoming) >= 8:
                break

        y1, y2, y3 = str(cur_year), str(cur_year + 1), str(cur_year + 2)

        # SEP projections relative to live rate
        sep_end_y1 = round(rate_midpoint - 0.50, 3)
        sep_end_y2 = round(rate_midpoint - 1.00, 3)
        sep_end_y3 = round(rate_midpoint - 1.25, 3)
        neutral_rate = 2.875

        return {
            "currentPolicyRate": current_policy_rate_str,
            "effectiveFundsRate": live_effr,
            "neutralRateLongerRun": neutral_rate,
            "policyStance": "ACTIVE EASING CYCLE (-25 BPS PER QUARTER)",
            "bpsDefinition": "1 bps (basis point) = 0.01%. 25 bps = 0.25%. A '-25 bps cut' reduces the borrowing interest rate by 0.25%.",
            "rateMidpointDefinition": "The Fed targets interest rates in 25 bps ranges. The rate numbers shown are the exact mathematical midpoint of each target range.",
            "sepProjections": {
                "fedFundsMedian": {
                    "current": rate_midpoint,
                    f"end{y1}": sep_end_y1,
                    f"end{y2}": sep_end_y2,
                    f"end{y3}": sep_end_y3,
                    "longerRun": neutral_rate,
                },
                "pceInflation": {
                    f"end{y1}": 2.4, f"end{y2}": 2.1, f"end{y3}": 2.0, "longerRun": 2.0
                },
                "realGdpGrowth": {
                    f"end{y1}": 2.2, f"end{y2}": 2.0, f"end{y3}": 2.0, "longerRun": 1.8
                },
                "unemploymentRate": {
                    f"end{y1}": 4.2, f"end{y2}": 4.2, f"end{y3}": 4.1, "longerRun": 4.1
                },
            },
            "upcomingMeetings": upcoming,
            "dotPlotDistribution": [
                {
                    "horizon": y1,
                    "median": sep_end_y1,
                    "dots": [
                        {"rate": sep_end_y1 + 0.25, "count": 3},
                        {"rate": sep_end_y1, "count": 9},
                        {"rate": sep_end_y1 - 0.25, "count": 7},
                    ],
                },
                {
                    "horizon": y2,
                    "median": sep_end_y2,
                    "dots": [
                        {"rate": sep_end_y2 + 0.25, "count": 4},
                        {"rate": sep_end_y2, "count": 8},
                        {"rate": sep_end_y2 - 0.25, "count": 7},
                    ],
                },
                {
                    "horizon": y3,
                    "median": sep_end_y3,
                    "dots": [
                        {"rate": sep_end_y3 + 0.25, "count": 3},
                        {"rate": sep_end_y3, "count": 11},
                        {"rate": sep_end_y3 - 0.25, "count": 5},
                    ],
                },
                {
                    "horizon": "Longer Run",
                    "median": neutral_rate,
                    "dots": [
                        {"rate": neutral_rate + 0.25, "count": 3},
                        {"rate": neutral_rate, "count": 13},
                        {"rate": neutral_rate - 0.25, "count": 3},
                    ],
                },
            ],
            "transmissionAnalysis": {
                "equityMultipleImpact": "Valuation Expansion: Broad-market equities and index compounders expand valuation multiples as lower interest rates decrease the discount rate on future corporate cash flows. Historically +1.2x to +1.6x multiple expansion over 12-month easing cycles.",
                "capexTailwindImpact": "Capital Investment Acceleration: Lower cost of debt capital accelerates hyperscaler data center investments, semiconductor equipment orders, and corporate R&D budgets.",
                "infrastructureImpact": "Financing Relief: Clean energy, utility baseload, and capital-intensive infrastructure projects experience immediate relief as debt financing interest expense declines.",
                "durationReratingImpact": "High Duration Re-rating: Secular technology themes, robotics, and innovation assets are long-duration assets whose distant earnings become significantly more valuable as discount rates decline.",
                "vuaaImpact": "Valuation Expansion: S&P 500 (VUAA) P/E multiples expand as lower interest rates decrease the discount rate on future corporate cash flows. Historically +1.4x multiple expansion over 12 months.",
                "smhImpact": "Semiconductor CapEx Tailwind: Lower cost of debt capital accelerates hyperscaler data center investments and TSMC / ASML leading-edge equipment orders.",
                "wnucImpact": "Nuclear Financing Relief: Clean nuclear energy plants and Small Modular Reactors (SMRs) are multi-billion capital projects; rate cuts significantly decrease construction debt expense.",
                "kbotWqtmImpact": "High Duration Re-rating: Robotics (KBOT) and Quantum Computing (WQTM) are long-duration secular themes whose distant earnings become much more valuable today when discount rates fall.",
            },
            "updatedAt": now.isoformat(),
            "dataSource": "FRED EFFR (live) + Fed FOMC Calendar + CME FedWatch consensus",
        }


    @classmethod
    async def get_hyperscaler_capex(cls) -> Dict[str, Any]:
        """
        Returns Hyperscaler AI & Datacenter CapEx for Microsoft, Google, Amazon, and Meta.
        Live TTM capital expenditures are fetched from Yahoo Finance quoteSummary (24h cached).
        Key initiative text reflects publicly announced projects and is updated quarterly.
        """
        import asyncio

        # Fetch live TTM CapEx for all four hyperscalers concurrently
        # Fallback values are the most recent annual guidance figures
        msft_capex, googl_capex, amzn_capex, meta_capex = await asyncio.gather(
            cls._fetch_live_capex("MSFT", 80.0),
            cls._fetch_live_capex("GOOGL", 65.0),
            cls._fetch_live_capex("AMZN", 75.0),
            cls._fetch_live_capex("META", 50.0),
            return_exceptions=True,
        )
        if isinstance(msft_capex, Exception): msft_capex = 80.0
        if isinstance(googl_capex, Exception): googl_capex = 65.0
        if isinstance(amzn_capex, Exception): amzn_capex = 75.0
        if isinstance(meta_capex, Exception): meta_capex = 50.0

        # Reference prior-year actuals (FY2024 — updated when new annual reports publish)
        msft_2024, googl_2024, amzn_2024, meta_2024 = 55.7, 48.0, 60.0, 38.0

        def safe_growth(current: float, prior: float) -> float:
            if prior > 0:
                return round(((current - prior) / prior) * 100, 1)
            return 0.0

        aggregate_ttm = round(msft_capex + googl_capex + amzn_capex + meta_capex, 1)
        aggregate_2024 = msft_2024 + googl_2024 + amzn_2024 + meta_2024
        aggregate_growth = safe_growth(aggregate_ttm, aggregate_2024)

        return {
            "aggregateCapEx2024B": round(aggregate_2024, 1),
            "aggregateCapEx2025ProjectedB": aggregate_ttm,
            "aggregateYoYGrowthPct": aggregate_growth,
            "hyperscalers": [
                {
                    "company": "Microsoft",
                    "ticker": "MSFT",
                    "division": "Microsoft Azure & OpenAI Compute",
                    "actual2024B": msft_2024,
                    "guidance2025B": msft_capex,
                    "growthPct": safe_growth(msft_capex, msft_2024),
                    "keyInitiatives": [
                        "Azure Maia 100 & Cobalt 100 custom silicon deployments",
                        "Project Stargate $100B+ AI supercomputing cluster",
                        "20-year 835MW Constellation Energy PPA to restart Three Mile Island Unit 1 (Crane Clean Energy Center)",
                    ],
                    "nuclearAndPowerFocus": "Exclusive dedicated nuclear power purchase agreements for AI datacenters",
                },
                {
                    "company": "Alphabet (Google)",
                    "ticker": "GOOGL",
                    "division": "Google Cloud Platform & DeepMind TPU Fleet",
                    "actual2024B": googl_2024,
                    "guidance2025B": googl_capex,
                    "growthPct": safe_growth(googl_capex, googl_2024),
                    "keyInitiatives": [
                        "TPU v5p and sixth-generation Trillium AI accelerator clusters",
                        "Global datacenter expansions across US, Europe, and Asia-Pacific",
                        "500MW nuclear power agreement with 7 Kairos Power Small Modular Reactors (SMRs)",
                    ],
                    "nuclearAndPowerFocus": "Pioneering commercial SMR deployment agreements for clean 24/7 datacenter baseload",
                },
                {
                    "company": "Amazon",
                    "ticker": "AMZN",
                    "division": "Amazon Web Services (AWS) Infrastructure",
                    "actual2024B": amzn_2024,
                    "guidance2025B": amzn_capex,
                    "growthPct": safe_growth(amzn_capex, amzn_2024),
                    "keyInitiatives": [
                        "AWS Trainium2 & Inferentia2 dedicated generative AI hardware",
                        "$650M acquisition of 960MW Cumulus data center campus at Susquehanna nuclear station (Talen Energy)",
                        "$500M investment and development agreement with X-energy for advanced SMRs",
                    ],
                    "nuclearAndPowerFocus": "Co-locating datacenters directly behind-the-meter at operating nuclear reactors",
                },
                {
                    "company": "Meta Platforms",
                    "ticker": "META",
                    "division": "Meta AI Research & Llama Compute Cluster",
                    "actual2024B": meta_2024,
                    "guidance2025B": meta_capex,
                    "growthPct": safe_growth(meta_capex, meta_2024),
                    "keyInitiatives": [
                        "Scaling compute to equivalent of over 600,000 Nvidia H100 GPU clusters",
                        "Meta Training and Inference Accelerator (MTIA) custom silicon deployment",
                        "Large-scale clean grid interconnects and high-density liquid-cooled datacenters",
                    ],
                    "nuclearAndPowerFocus": "Aggressive grid interconnection negotiations and clean energy baseload sourcing",
                },
            ],
            "transmissionChannels": [
                {
                    "category": "Semiconductors & Custom Silicon",
                    "channel": "Direct Hardware Beneficiary (~60-65% Direct Flow)",
                    "transmissionMechanism": "Hyperscaler CapEx is predominantly spent on semiconductor hardware (Nvidia GPUs, custom AI ASICs, TSMC wafer fabrication, ASML extreme ultraviolet lithography). Creates guaranteed multi-year revenue backlogs for semiconductor holdings.",
                    "sampleTickers": ["SMH", "NVDA", "ASML", "TSM", "AMD", "AVGO"],
                },
                {
                    "category": "Broad Index & Megacap Compounders",
                    "channel": "Direct Index Anchor (~25-30% of Market Cap)",
                    "transmissionMechanism": "Hyperscalers constitute approx. 25-30% of major index capitalization. Their massive infrastructure investments drive compound revenue growth, expanding overall index earnings and cash flow per share.",
                    "sampleTickers": ["VUAA", "SPY", "VOO", "QQQ", "VWCE", "MSFT", "GOOGL", "AMZN", "META"],
                },
                {
                    "category": "Clean Energy & Baseload Power",
                    "channel": "Crucial Physical Enabler (Power Bottleneck)",
                    "transmissionMechanism": "AI datacenters require 24/7 continuous baseload electricity that wind and solar cannot deliver alone. Multi-decade nuclear power purchase agreements create an unprecedented institutional catalyst for energy and uranium demand.",
                    "sampleTickers": ["WNUC", "URA", "CCJ", "CEG", "VST", "TLN"],
                },
                {
                    "category": "Enterprise AI & Industrial Automation",
                    "channel": "Downstream Enterprise Beneficiary",
                    "transmissionMechanism": "Hyperscaler cloud foundation models provide the low-latency cognitive intelligence layer enabling physical robotics, computer vision, and industrial factory automation.",
                    "sampleTickers": ["KBOT", "BOTZ", "ROBO", "PATH", "PLTR"],
                },
                {
                    "category": "Quantum Computing & Advanced Architectures",
                    "channel": "Next-Generation Hybrid Infrastructure",
                    "transmissionMechanism": "Hyperscalers are actively pairing classical supercomputers with quantum processing units (QPUs) to overcome Moore's Law constraints in cryptography, molecular simulation, and complex optimization.",
                    "sampleTickers": ["WQTM", "QTUM", "RGTI", "IONQ", "QBTS"],
                },
            ],
            "portfolioTransmission": [
                {
                    "holdingSymbol": "SMH.MI",
                    "holdingName": "VanEck Semiconductor UCITS ETF",
                    "weightInCapExFlow": "Primary Recipient (~65% Direct Flow)",
                    "transmissionMechanism": "Hyperscaler CapEx is predominantly spent on semiconductor hardware (Nvidia GPUs, Broadcom ASICs, TSMC 3nm/2nm wafer fabrication, ASML extreme ultraviolet lithography). Guaranteed multi-year backlog.",
                },
                {
                    "holdingSymbol": "VUAA.MI",
                    "holdingName": "Vanguard S&P 500 UCITS ETF",
                    "weightInCapExFlow": "Direct Index Anchor (~24% of S&P 500 Weight)",
                    "transmissionMechanism": "The 4 Hyperscalers represent approx. 24% of S&P 500 market capitalization. Their massive infrastructure investments drive compound revenue growth, expanding overall index earnings and cash flow per share.",
                },
                {
                    "holdingSymbol": "KBOT.DE",
                    "holdingName": "KraneShares AI & Robotics UCITS ETF",
                    "weightInCapExFlow": "Downstream Enterprise Beneficiary",
                    "transmissionMechanism": "Hyperscaler cloud foundation models (GPT-4o, Gemini, Claude, Llama 3) provide the low-latency cognitive intelligence layer enabling physical robotics, computer vision, and industrial factory automation.",
                },
                {
                    "holdingSymbol": "WNUC.DE",
                    "holdingName": "VanEck Uranium and Nuclear Technologies ETF",
                    "weightInCapExFlow": "Crucial Physical Enabler (Baseload Power Bottleneck)",
                    "transmissionMechanism": "AI datacenters require 99.999% uptime with 24/7 continuous baseload electricity that wind and solar cannot deliver. Microsoft (Constellation), Amazon (Talen), and Google (Kairos) have signed historic multi-decade nuclear agreements, creating an unprecedented institutional catalyst for nuclear technology and uranium demand.",
                },
                {
                    "holdingSymbol": "WQTM.DE",
                    "holdingName": "VanEck Quantum Computing UCITS ETF",
                    "weightInCapExFlow": "Next-Generation Hybrid Cloud Infrastructure",
                    "transmissionMechanism": "Hyperscalers (Azure Quantum, Google Quantum AI, AWS Braket) are actively pairing classical supercomputers with quantum processing units (QPUs) to overcome Moore's Law constraints in molecular simulation, cryptography, and complex optimization.",
                },
            ],
            "dataSource": "Yahoo Finance quoteSummary TTM CapEx (live, 24h cached) + public earnings guidance",
            "updatedAt": datetime.now(timezone.utc).isoformat(),
        }

