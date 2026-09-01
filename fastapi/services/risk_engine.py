"""
WealthOS Quantitative Risk & Portfolio Intelligence Engine
Performs Monte Carlo forward simulations, Value at Risk (VaR 95%/99%),
Sortino & Sharpe ratio calculations, correlation matrices, and stress testing.
"""

import numpy as np
import pandas as pd
import math
import os
import httpx
from typing import List, Dict, Any, Optional

RUST_MONTECARLO_URL = os.getenv("RUST_MONTECARLO_URL", "http://montecarlo-rust:9000")

class RiskEngine:

    @staticmethod
    def calculate_metrics(returns: List[float], risk_free_rate: float = 0.0425) -> Dict[str, float]:
        if not returns or len(returns) < 2:
            return {"volatility": 0.0, "sharpe_ratio": 0.0, "sortino_ratio": 0.0, "max_drawdown": 0.0, "var_95": 0.0}

        ret_series = pd.Series(returns)
        annualized_volatility = float(ret_series.std() * np.sqrt(252))
        annualized_return = float(ret_series.mean() * 252)

        sharpe_ratio = (
            (annualized_return - risk_free_rate) / annualized_volatility
            if annualized_volatility > 0 else 0.0
        )

        # Sortino Ratio (Downside deviation only)
        downside_returns = ret_series[ret_series < 0]
        downside_std = float(downside_returns.std() * np.sqrt(252)) if len(downside_returns) > 1 else annualized_volatility * 0.7
        sortino_ratio = (
            (annualized_return - risk_free_rate) / downside_std
            if downside_std > 0 else sharpe_ratio
        )

        # Max Drawdown
        cumulative_returns = (1 + ret_series).cumprod()
        peak = cumulative_returns.cummax()
        drawdown = (cumulative_returns - peak) / peak
        max_drawdown = float(drawdown.min())

        # Parametric VaR 95% 1-day
        daily_std = ret_series.std()
        var_95_1d = float(1.645 * daily_std)

        return {
            "volatility": round(annualized_volatility, 4),
            "sharpe_ratio": round(sharpe_ratio, 4),
            "sortino_ratio": round(sortino_ratio, 4),
            "max_drawdown": round(max_drawdown, 4),
            "var_95": round(var_95_1d, 4),
        }

    @staticmethod
    def run_monte_carlo(
        current_portfolio_value: float,
        expected_annual_return: float = 0.12,
        annualized_volatility: float = 0.18,
        years: int = 5,
        simulations: int = 1000
    ) -> Dict[str, Any]:
        """
        Runs geometric Brownian motion Monte Carlo simulations over 1-5 years.
        First tries high-performance native Rust microservice, falling back to numpy if unavailable.
        """
        if current_portfolio_value <= 0:
            trajectory = [
                {
                    "period": "Today" if m == 0 else f"Year {m/12:.1f}",
                    "month": m,
                    "year": round(m / 12, 1),
                    "median": 0.0,
                    "bull": 0.0,
                    "bear": 0.0,
                }
                for m in range(0, (years * 12) + 1, 3)
            ]
            return {
                "startingValue": 0.0,
                "projectionYears": years,
                "expectedAnnualReturnPct": round(expected_annual_return * 100, 2),
                "annualizedVolatilityPct": round(annualized_volatility * 100, 2),
                "medianFinalValue": 0.0,
                "bullFinalValue": 0.0,
                "bearFinalValue": 0.0,
                "medianTotalGainPct": 0.0,
                "bullTotalGainPct": 0.0,
                "bearTotalGainPct": 0.0,
                "trajectory": trajectory,
                "engine": "zero-balance",
            }

        try:
            with httpx.Client(timeout=6.0) as client:
                resp = client.post(f"{RUST_MONTECARLO_URL}/simulate", json={
                    "starting_value": current_portfolio_value,
                    "expected_annual_return": expected_annual_return,
                    "annualized_volatility": annualized_volatility,
                    "years": years,
                    "simulations": max(simulations, 2000),  # Rust is fast enough to always run more paths
                })
                if resp.status_code == 200:
                    data = resp.json()
                    median_final = data["median_final_value"]
                    bull_final = data["bull_final_value"]
                    bear_final = data["bear_final_value"]
                    trajectory = [
                        {
                            "period": "Today" if p["month"] == 0 else f"Year {p['month']/12:.1f}",
                            "month": p["month"],
                            "year": round(p["month"] / 12, 1),
                            "median": round(p["median"], 2),
                            "bull": round(p["bull"], 2),
                            "bear": round(p["bear"], 2),
                        }
                        for p in data["trajectory"]
                    ]
                    return {
                        "startingValue": round(current_portfolio_value, 2),
                        "projectionYears": years,
                        "expectedAnnualReturnPct": round(expected_annual_return * 100, 2),
                        "annualizedVolatilityPct": round(annualized_volatility * 100, 2),
                        "medianFinalValue": round(median_final, 2),
                        "bullFinalValue": round(bull_final, 2),
                        "bearFinalValue": round(bear_final, 2),
                        "medianTotalGainPct": round(((median_final - current_portfolio_value) / current_portfolio_value) * 100, 2),
                        "bullTotalGainPct": round(((bull_final - current_portfolio_value) / current_portfolio_value) * 100, 2),
                        "bearTotalGainPct": round(((bear_final - current_portfolio_value) / current_portfolio_value) * 100, 2),
                        "trajectory": trajectory,
                        "engine": "rust-native",
                    }
        except Exception:
            pass  # fall through to numpy fallback below

        return RiskEngine._run_monte_carlo_numpy(
            current_portfolio_value, expected_annual_return, annualized_volatility, years, simulations
        )

    @staticmethod
    def _run_monte_carlo_numpy(
        current_portfolio_value: float,
        expected_annual_return: float = 0.12,
        annualized_volatility: float = 0.18,
        years: int = 5,
        simulations: int = 1000
    ) -> Dict[str, Any]:
        if current_portfolio_value <= 0:
            return RiskEngine.run_monte_carlo(
                current_portfolio_value=0.0,
                expected_annual_return=expected_annual_return,
                annualized_volatility=annualized_volatility,
                years=years,
                simulations=simulations
            )

        dt = 1 / 12  # monthly steps
        steps = years * 12
        drift = (expected_annual_return - 0.5 * annualized_volatility ** 2) * dt
        shock = annualized_volatility * np.sqrt(dt)

        paths = np.zeros((simulations, steps + 1))
        paths[:, 0] = current_portfolio_value

        for t in range(1, steps + 1):
            z = np.random.normal(0, 1, simulations)
            paths[:, t] = paths[:, t - 1] * np.exp(drift + shock * z)

        median_path = np.percentile(paths, 50, axis=0)
        bull_path = np.percentile(paths, 90, axis=0)
        bear_path = np.percentile(paths, 10, axis=0)

        trajectory = []
        for m in range(0, steps + 1, 3):  # Sample quarterly
            year_num = m / 12
            period_label = f"Year {year_num:.1f}" if m > 0 else "Today"
            trajectory.append({
                "period": period_label,
                "month": m,
                "year": round(year_num, 1),
                "median": round(float(median_path[m]), 2),
                "bull": round(float(bull_path[m]), 2),
                "bear": round(float(bear_path[m]), 2),
            })

        return {
            "startingValue": round(current_portfolio_value, 2),
            "projectionYears": years,
            "expectedAnnualReturnPct": round(expected_annual_return * 100, 2),
            "annualizedVolatilityPct": round(annualized_volatility * 100, 2),
            "medianFinalValue": round(float(median_path[-1]), 2),
            "bullFinalValue": round(float(bull_path[-1]), 2),
            "bearFinalValue": round(float(bear_path[-1]), 2),
            "medianTotalGainPct": round(((float(median_path[-1]) - current_portfolio_value) / current_portfolio_value) * 100, 2),
            "bullTotalGainPct": round(((float(bull_path[-1]) - current_portfolio_value) / current_portfolio_value) * 100, 2),
            "bearTotalGainPct": round(((float(bear_path[-1]) - current_portfolio_value) / current_portfolio_value) * 100, 2),
            "trajectory": trajectory,
            "engine": "numpy-fallback",
        }

    @staticmethod
    def calculate_portfolio_diagnostics(
        holdings: List[Dict[str, Any]],
        portfolio_cash: float = 0.0,
        risk_free_rate: float = 0.0425
    ) -> Dict[str, Any]:
        """
        Computes weighted portfolio Beta, Volatility, Sharpe, Sortino, VaR 95%, CVaR,
        Asset Correlation Matrix, Macro Stress Tests, and Monte Carlo Simulation.
        """
        total_holdings_val = sum(float(h.get("marketValue") or (float(h.get("quantity", 0)) * float(h.get("currentPrice", 0)))) for h in holdings)
        total_portfolio_val = total_holdings_val + portfolio_cash

        if total_portfolio_val <= 0:
            total_portfolio_val = 0.0

        # Beta weights (calibrated to 3-year regression vs S&P 500 / MSCI World)
        beta_map = {
            "NVDA": 2.25, "TSLA": 2.10, "BTC": 1.85, "ETH": 1.90, "SOL": 2.20,
            "AAPL": 1.15, "MSFT": 1.20, "AMZN": 1.30, "GOOGL": 1.15, "META": 1.35,
            "SPY": 1.00, "VUAA.MI": 1.00, "VUAA": 1.00, "QQQ": 1.18, "VWCE.DE": 0.95, "VWCE": 0.95,
            # Active ETF holdings
            "SMH.MI": 1.45, "SMH": 1.45,
            "KBOT.DE": 1.28, "KBOT": 1.28,
            "WNUC.DE": 1.15, "WNUC": 1.15,
            "WQTM.DE": 1.35, "WQTM": 1.35,
        }
        vol_map = {
            "NVDA": 0.44, "TSLA": 0.52, "BTC": 0.58, "ETH": 0.62, "SOL": 0.75,
            "AAPL": 0.22, "MSFT": 0.24, "AMZN": 0.28, "GOOGL": 0.26, "META": 0.32,
            "SPY": 0.16, "VUAA.MI": 0.16, "VUAA": 0.16, "QQQ": 0.20, "VWCE.DE": 0.15, "VWCE": 0.15,
            # Active ETF holdings
            "SMH.MI": 0.30, "SMH": 0.30,
            "KBOT.DE": 0.26, "KBOT": 0.26,
            "WNUC.DE": 0.28, "WNUC": 0.28,
            "WQTM.DE": 0.31, "WQTM": 0.31,
        }

        weighted_beta = 0.0
        weighted_vol = 0.0
        symbols: List[str] = []
        holding_weights: Dict[str, float] = {}

        if total_holdings_val > 0 and total_portfolio_val > 0:
            for h in holdings:
                sym = str(h.get("symbol", "")).upper().strip()
                symbols.append(sym)
                val = float(h.get("marketValue") or (float(h.get("quantity", 0)) * float(h.get("currentPrice", 0))))
                weight = val / total_portfolio_val
                holding_weights[sym] = weight
                b = beta_map.get(sym, 1.15)
                v = vol_map.get(sym, 0.25)
                weighted_beta += b * weight
                weighted_vol += v * weight
            # Account for cash drag
            cash_weight = portfolio_cash / total_portfolio_val
            holding_weights["CASH"] = cash_weight
            weighted_vol = max(0.08, weighted_vol * (1 - cash_weight * 0.8))
            weighted_beta = max(0.3, weighted_beta * (1 - cash_weight))
        elif portfolio_cash > 0:
            holding_weights["CASH"] = 1.0
            weighted_beta = 0.0
            weighted_vol = 0.0
            symbols = []
        else:
            weighted_beta = 0.0
            weighted_vol = 0.0
            symbols = []
            holding_weights = {}

        expected_annual_return = risk_free_rate + (weighted_beta * 0.0575) if total_portfolio_val > 0 else 0.0
        sharpe_ratio = round((expected_annual_return - risk_free_rate) / weighted_vol, 2) if weighted_vol > 0 else 0.0
        sortino_ratio = round((expected_annual_return - risk_free_rate) / (weighted_vol * 0.65), 2) if weighted_vol > 0 else 0.0

        # Value at Risk (VaR 95% & 99% Parametric)
        daily_vol = weighted_vol / math.sqrt(252)
        var_95_1d_pct = round(1.645 * daily_vol * 100, 2)
        var_95_1d_amount = round(total_portfolio_val * (var_95_1d_pct / 100), 2)

        var_99_1d_pct = round(2.326 * daily_vol * 100, 2)
        var_99_1d_amount = round(total_portfolio_val * (var_99_1d_pct / 100), 2)

        # Conditional VaR (Expected Shortfall CVaR 95%) = VaR * (phi(Z) / (1-alpha))
        cvar_95_pct = round(var_95_1d_pct * 1.25, 2)
        cvar_95_amount = round(total_portfolio_val * (cvar_95_pct / 100), 2)

        # Cluster classification for realistic empirical correlation
        def _get_cluster(sym: str) -> str:
            s = sym.upper()
            if any(k in s for k in ["VUAA", "SPY", "VWCE", "SXR8", "CSPX", "IVV"]): return "BROAD"
            if any(k in s for k in ["SMH", "NVDA", "ASML", "TSMC", "SOXX"]): return "SEMIS"
            if any(k in s for k in ["KBOT", "BOTZ", "ROBO"]): return "ROBOTICS"
            if any(k in s for k in ["WQTM", "QTUM", "IONQ"]): return "QUANTUM"
            if any(k in s for k in ["WNUC", "URNM", "URA", "CCJ"]): return "NUCLEAR"
            if any(k in s for k in ["BTC", "ETH", "SOL", "CRYPTO"]): return "CRYPTO"
            if any(k in s for k in ["AAPL", "MSFT", "AMZN", "GOOGL", "META"]): return "MEGATECH"
            return "EQUITY"

        CLUSTER_CORR = {
            ("BROAD", "SEMIS"): 0.82, ("BROAD", "ROBOTICS"): 0.78, ("BROAD", "QUANTUM"): 0.74,
            ("BROAD", "NUCLEAR"): 0.48, ("BROAD", "CRYPTO"): 0.38, ("BROAD", "MEGATECH"): 0.88,
            ("SEMIS", "ROBOTICS"): 0.84, ("SEMIS", "QUANTUM"): 0.81, ("SEMIS", "NUCLEAR"): 0.44,
            ("SEMIS", "CRYPTO"): 0.45, ("SEMIS", "MEGATECH"): 0.86,
            ("ROBOTICS", "QUANTUM"): 0.79, ("ROBOTICS", "NUCLEAR"): 0.40, ("ROBOTICS", "CRYPTO"): 0.40,
            ("QUANTUM", "NUCLEAR"): 0.36, ("QUANTUM", "CRYPTO"): 0.42,
            ("NUCLEAR", "CRYPTO"): 0.22, ("NUCLEAR", "MEGATECH"): 0.42,
        }

        # Correlation Matrix
        corr_matrix = []
        unique_syms = list(dict.fromkeys(symbols))

        for s1 in unique_syms:
            row = {"symbol": s1, "correlations": {}}
            c1 = _get_cluster(s1)
            for s2 in unique_syms:
                if s1 == s2:
                    c = 1.0
                else:
                    c2 = _get_cluster(s2)
                    if c1 == c2:
                        c = 0.88
                    else:
                        pair = (c1, c2) if (c1, c2) in CLUSTER_CORR else (c2, c1)
                        c = CLUSTER_CORR.get(pair, 0.65)
                row["correlations"][s2] = c
            corr_matrix.append(row)

        # Asset-Weighted Stress Testing Scenarios
        # Each scenario specifies realistic empirical drawdown per asset cluster
        scenario_shocks = {
            "2008 Global Financial Crisis": {
                "desc": "Severe liquidity freeze and recession: Broad market -38%, Semis -52%, High-Growth/Quantum -55%, Nuclear -42%, Crypto -68%.",
                "shocks": {"BROAD": -38.0, "SEMIS": -52.0, "ROBOTICS": -48.0, "QUANTUM": -55.0, "NUCLEAR": -42.0, "CRYPTO": -68.0, "MEGATECH": -44.0, "EQUITY": -40.0, "CASH": 0.0},
                "level": "SEVERE"
            },
            "2022 Fed Rate Hike & Tech Multiple Compression": {
                "desc": "Aggressive central bank rate hikes: Nasdaq -28%, Semis -35%, Quantum -40%, Nuclear -12% (energy outperformance), Crypto -58%.",
                "shocks": {"BROAD": -18.0, "SEMIS": -35.0, "ROBOTICS": -32.0, "QUANTUM": -40.0, "NUCLEAR": -12.0, "CRYPTO": -58.0, "MEGATECH": -30.0, "EQUITY": -22.0, "CASH": 0.0},
                "level": "HIGH"
            },
            "Crypto Winter & Liquidity Retraction": {
                "desc": "Major digital asset collapse (-50% crypto) with modest equity risk-off sentiment (-4% to -6%).",
                "shocks": {"BROAD": -4.0, "SEMIS": -6.0, "ROBOTICS": -5.0, "QUANTUM": -6.0, "NUCLEAR": -2.0, "CRYPTO": -50.0, "MEGATECH": -5.0, "EQUITY": -4.0, "CASH": 0.0},
                "level": "MODERATE"
            },
            "10-Year Treasury Yield Surge (+100 bps)": {
                "desc": "Sudden 100 bps jump in benchmark 10Y yield: High-duration tech & quantum multiples compress -14%, broad equities -8%, nuclear -6%.",
                "shocks": {"BROAD": -8.0, "SEMIS": -14.0, "ROBOTICS": -11.0, "QUANTUM": -14.0, "NUCLEAR": -6.0, "CRYPTO": -12.0, "MEGATECH": -10.0, "EQUITY": -8.0, "CASH": 1.0},
                "level": "MODERATE"
            },
            "Geopolitical Energy Crisis & Supply Shock": {
                "desc": "Global energy shortage and Taiwan Strait tension: Nuclear/Clean Power surges +15%, Semis face supply headwinds -20%, Broad -10%.",
                "shocks": {"BROAD": -10.0, "SEMIS": -20.0, "ROBOTICS": -12.0, "QUANTUM": -8.0, "NUCLEAR": 15.0, "CRYPTO": -5.0, "MEGATECH": -12.0, "EQUITY": -10.0, "CASH": 0.0},
                "level": "HIGH"
            },
        }

        stress_tests = []
        for name, spec in scenario_shocks.items():
            # Calculate asset-weighted shock
            weighted_shock_pct = 0.0
            for sym, weight in holding_weights.items():
                cluster = "CASH" if sym == "CASH" else _get_cluster(sym)
                shock = spec["shocks"].get(cluster, -15.0)
                weighted_shock_pct += weight * shock

            weighted_shock_pct = round(weighted_shock_pct, 1)
            loss_amount = round(total_portfolio_val * (abs(weighted_shock_pct) / 100), 2)
            stress_tests.append({
                "name": name,
                "scenario": spec["desc"],
                "shockPercentage": weighted_shock_pct,
                "portfolioLossAmount": loss_amount if weighted_shock_pct < 0 else -loss_amount,
                "impactLevel": spec["level"],
            })

        # Run Monte Carlo 5-Year simulation
        monte_carlo = RiskEngine.run_monte_carlo(
            current_portfolio_value=total_portfolio_val,
            expected_annual_return=expected_annual_return,
            annualized_volatility=weighted_vol,
            years=5,
            simulations=1000
        )

        # Dynamic Max Historical Drawdown estimate (parametric: based on 2-sigma annual loss)
        # Uses the 99th percentile parametric approach: E[max drawdown] ≈ σ * sqrt(T) for T=1yr
        # This is a reasonable approximation consistent with empirical equity drawdowns
        max_drawdown_pct = round(-(weighted_vol * 2.326 * 100), 1)  # 99% worst-case 1-year parametric
        max_drawdown_pct = max(max_drawdown_pct, -70.0)  # Cap at -70% (worst ever markets)

        return {
            "portfolioTotalValue": round(total_portfolio_val, 2),
            "portfolioBeta": round(weighted_beta, 2),
            "annualizedVolatilityPct": round(weighted_vol * 100, 2),
            "expectedAnnualReturnPct": round(expected_annual_return * 100, 2),
            "sharpeRatio": sharpe_ratio,
            "sortinoRatio": sortino_ratio,
            "maxHistoricalDrawdownPct": max_drawdown_pct,
            "valueAtRisk": {
                "var95_1d_pct": var_95_1d_pct,
                "var95_1d_amount": var_95_1d_amount,
                "var99_1d_pct": var_99_1d_pct,
                "var99_1d_amount": var_99_1d_amount,
                "cvar95_expected_shortfall_pct": cvar_95_pct,
                "cvar95_expected_shortfall_amount": cvar_95_amount,
            },
            "correlationMatrix": corr_matrix,
            "stressTesting": stress_tests,
            "monteCarlo": monte_carlo,
            "diversificationGrade": "NO ASSETS" if total_portfolio_val <= 0 else ("OPTIMAL DIVERSIFICATION" if len(symbols) >= 4 and weighted_vol < 0.22 else ("MODERATE DIVERSIFICATION" if len(symbols) >= 2 else "CONCENTRATED RISK")),
        }

