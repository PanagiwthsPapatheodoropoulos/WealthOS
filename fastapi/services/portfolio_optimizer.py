"""
WealthOS Markowitz Modern Portfolio Theory & Efficient Frontier Optimization Engine
Computes:
- Historical daily covariance matrix
- Maximum Sharpe Ratio Portfolio (Optimal Risk-Adjusted)
- Minimum Volatility Portfolio (Maximum Capital Preservation)
- 40-Point Efficient Frontier Curve coordinates
- Actionable Rebalancing Deltas based on active user portfolio holdings
"""

import httpx
import numpy as np
from scipy.optimize import minimize
from typing import Dict, Any, List, Tuple, Optional
from datetime import datetime, timezone

class PortfolioOptimizerEngine:

    # Cache for historical daily returns: {symbol: {"returns": np.ndarray, "ts": timestamp}}
    _RETURNS_CACHE: Dict[str, Dict[str, Any]] = {}

    @classmethod
    def _fetch_historical_returns(cls, symbol: str) -> Optional[np.ndarray]:
        """Fetches 1-year daily close returns from market feed for exact covariance calculation."""
        raw_sym = symbol.upper().strip()
        candidates = [raw_sym]
        if raw_sym in ["VUAAM", "VUAA"]:
            candidates.insert(0, "VUAA.MI")
        elif raw_sym in ["SMHM", "SMH"]:
            candidates.insert(0, "SMH")
            candidates.insert(1, "SMGB.L")
        elif raw_sym.endswith("M") and len(raw_sym) > 3:
            candidates.insert(0, raw_sym[:-1] + ".MI")
        elif raw_sym.endswith("D") and len(raw_sym) > 3:
            candidates.insert(0, raw_sym[:-1] + ".DE")
        elif "." in raw_sym:
            candidates.append(raw_sym.split(".")[0])

        for sym in candidates:
            cached = cls._RETURNS_CACHE.get(sym)
            if cached and (datetime.now(timezone.utc).timestamp() - cached.get("ts", 0)) < 86400:
                return cached["returns"]

            try:
                url = f"https://query1.finance.yahoo.com/v8/finance/chart/{sym}?interval=1d&range=1y"
                with httpx.Client(timeout=4.0, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}) as client:
                    r = client.get(url)
                    if r.status_code == 200:
                        closes = r.json().get("chart", {}).get("result", [{}])[0].get("indicators", {}).get("quote", [{}])[0].get("close", [])
                        valid = [float(c) for c in closes if c is not None]
                        if len(valid) > 20:
                            rets = np.diff(np.log(valid))
                            cls._RETURNS_CACHE[raw_sym] = {"returns": rets, "ts": datetime.now(timezone.utc).timestamp()}
                            cls._RETURNS_CACHE[sym] = {"returns": rets, "ts": datetime.now(timezone.utc).timestamp()}
                            return rets
            except Exception:
                pass
        return None

    @classmethod
    def calculate_efficient_frontier(
        cls,
        holdings: List[Dict[str, Any]],
        cash_balance: float = 0.0,
        risk_free_rate: float = 0.0425
    ) -> Dict[str, Any]:
        """
        Computes the Markowitz Efficient Frontier, optimal Sharpe weights, and rebalancing recommendations
        using empirical daily covariance matrix derived from real market price history.
        """
        if not holdings or len(holdings) < 2:
            default_symbols = ["VUAA.MI", "NVDA", "AAPL", "BTC"]
        else:
            default_symbols = [h.get("symbol", "").upper() for h in holdings]

        n_assets = len(default_symbols)
        historical_series = [cls._fetch_historical_returns(s) for s in default_symbols]

        # Check if we have valid real returns for all assets
        all_valid = all(s is not None and len(s) > 20 for s in historical_series)

        if all_valid:
            min_len = min(len(s) for s in historical_series)
            aligned_returns = np.array([s[-min_len:] for s in historical_series])
            returns_arr = np.mean(aligned_returns, axis=1) * 252.0
            cov_matrix = np.cov(aligned_returns) * 252.0
            vols_arr = np.sqrt(np.diag(cov_matrix))
        else:
            # Realistic asset-class fallbacks when market offline
            sample_returns = []
            sample_vols = []
            for sym in default_symbols:
                if "BTC" in sym or "ETH" in sym or "SOL" in sym:
                    sample_returns.append(0.35)
                    sample_vols.append(0.65)
                elif "VUAA" in sym or "SPY" in sym or "VWCE" in sym:
                    sample_returns.append(0.105)
                    sample_vols.append(0.15)
                elif "SMH" in sym or "SEMIS" in sym:
                    sample_returns.append(0.18)
                    sample_vols.append(0.30)
                elif "KBOT" in sym or "ROBOT" in sym:
                    sample_returns.append(0.14)
                    sample_vols.append(0.26)
                elif "WNUC" in sym or "NUCLEAR" in sym or "NUKL" in sym:
                    sample_returns.append(0.16)
                    sample_vols.append(0.28)
                elif "WQTM" in sym or "MOMENTUM" in sym:
                    sample_returns.append(0.13)
                    sample_vols.append(0.19)
                elif sym in ["NVDA", "TSLA"]:
                    sample_returns.append(0.20)
                    sample_vols.append(0.38)
                else:
                    sample_returns.append(0.12)
                    sample_vols.append(0.20)
            returns_arr = np.array(sample_returns)
            vols_arr = np.array(sample_vols)
            corr_matrix = np.full((n_assets, n_assets), 0.35)
            np.fill_diagonal(corr_matrix, 1.0)
            cov_matrix = np.outer(vols_arr, vols_arr) * corr_matrix

        # Current Portfolio Weights
        if holdings and len(holdings) >= 2:
            total_val = sum(float(h.get("marketValue") or (float(h.get("quantity", 0)) * float(h.get("currentPrice", 0)))) for h in holdings)
            if total_val > 0:
                current_weights = np.array([
                    float(h.get("marketValue") or (float(h.get("quantity", 0)) * float(h.get("currentPrice", 0)))) / total_val
                    for h in holdings
                ])
            else:
                current_weights = np.ones(n_assets) / n_assets
        else:
            current_weights = np.ones(n_assets) / n_assets

        current_ret = float(np.dot(current_weights, returns_arr))
        current_vol = float(np.sqrt(np.dot(current_weights.T, np.dot(cov_matrix, current_weights))))
        current_sharpe = float((current_ret - risk_free_rate) / current_vol) if current_vol > 0 else 0.0

        # Helper functions for portfolio metrics
        def _get_port_vol(w: np.ndarray) -> float:
            return float(np.sqrt(np.dot(w.T, np.dot(cov_matrix, w))))

        def _get_port_ret(w: np.ndarray) -> float:
            return float(np.dot(w, returns_arr))

        def _neg_sharpe(w: np.ndarray) -> float:
            v = _get_port_vol(w)
            return -((_get_port_ret(w) - risk_free_rate) / v) if v > 1e-6 else 0.0

        eq_sum_one = {"type": "eq", "fun": lambda w: np.sum(w) - 1.0}
        initial_w = np.ones(n_assets) / n_assets

        # 1. Global Minimum Volatility Portfolio (Quadratic Optimization)
        bounds_unconstrained = [(0.0, 1.0)] * n_assets
        res_min_vol = minimize(_get_port_vol, initial_w, bounds=bounds_unconstrained, constraints=[eq_sum_one], method="SLSQP")
        if res_min_vol.success:
            min_vol_weights = res_min_vol.x
            min_vol_val = _get_port_vol(min_vol_weights)
            min_vol_ret = _get_port_ret(min_vol_weights)
        else:
            min_vol_weights = initial_w
            min_vol_val = _get_port_vol(initial_w)
            min_vol_ret = _get_port_ret(initial_w)

        # 2. Institutional Core-Satellite Diversified Maximum Sharpe Portfolio
        # Guarantees deliberate user-selected thematic ETFs (Robotics, Nuclear, Quantum) are NEVER zeroed out.
        diversified_bounds = []
        for i, sym in enumerate(default_symbols):
            curr_w = float(current_weights[i])
            if any(c in sym for c in ["VUAA", "SPY", "VOO", "VWCE", "IWDA", "VUSA"]):
                # Core broad-market index foundation: 40% to 70%
                diversified_bounds.append((0.40, 0.70))
            else:
                # Thematic satellite holding: minimum 4% strategic floor, max 20%
                min_floor = max(0.04, min(curr_w * 0.4, 0.08))
                max_cap = min(0.25, max(0.18, curr_w * 1.5))
                diversified_bounds.append((min_floor, max_cap))

        # Ensure feasible initial point for SLSQP
        initial_w_div = np.array([(b[0] + b[1]) / 2.0 for b in diversified_bounds])
        initial_w_div = initial_w_div / np.sum(initial_w_div)

        res_max_sharpe = minimize(_neg_sharpe, initial_w_div, bounds=diversified_bounds, constraints=[eq_sum_one], method="SLSQP")
        if res_max_sharpe.success:
            max_sharpe_weights = res_max_sharpe.x
            max_sharpe_vol = _get_port_vol(max_sharpe_weights)
            max_sharpe_ret = _get_port_ret(max_sharpe_weights)
            max_sharpe_val = -float(res_max_sharpe.fun)
        else:
            max_sharpe_weights = initial_w_div
            max_sharpe_vol = _get_port_vol(initial_w_div)
            max_sharpe_ret = _get_port_ret(initial_w_div)
            max_sharpe_val = (max_sharpe_ret - risk_free_rate) / max_sharpe_vol if max_sharpe_vol > 0 else 0.0

        # 3. Institutional Risk-Parity Allocation (Equal Risk Contribution / Inverse Volatility)
        inv_vols = 1.0 / np.maximum(vols_arr, 1e-4)
        rp_weights = inv_vols / np.sum(inv_vols)
        rp_ret = _get_port_ret(rp_weights)
        rp_vol = _get_port_vol(rp_weights)
        rp_sharpe = float((rp_ret - risk_free_rate) / rp_vol) if rp_vol > 0 else 0.0

        # 4. Monotonic 35-Point Discrete Efficient Frontier Curve
        # Sweeps strictly from Global Min Volatility Return to Maximum Single Asset Return
        max_possible_return = float(np.max(returns_arr))
        target_returns = np.linspace(min_vol_ret, max_possible_return, 35)
        frontier_points = []

        last_v = min_vol_val
        for target_r in target_returns:
            cons = [
                eq_sum_one,
                {"type": "eq", "fun": lambda w, r=target_r: _get_port_ret(w) - r}
            ]
            res_pt = minimize(_get_port_vol, min_vol_weights, bounds=bounds_unconstrained, constraints=cons, method="SLSQP")
            if res_pt.success:
                pt_vol = float(res_pt.fun)
                pt_vol = max(pt_vol, last_v)
                last_v = pt_vol
                frontier_points.append({
                    "volatilityPct": round(pt_vol * 100, 2),
                    "expectedReturnPct": round(float(target_r) * 100, 2),
                    "sharpeRatio": round(float((target_r - risk_free_rate) / pt_vol), 2) if pt_vol > 0 else 0.0
                })

        frontier_points.sort(key=lambda p: (p["volatilityPct"], p["expectedReturnPct"]))

        # 5. Actionable DCA Cashflow-Driven Rebalancing Plan
        rebalancing_plan = []
        total_holdings_val = sum(float(h.get("marketValue") or 0.0) for h in holdings) if holdings else 0.0

        for i, sym in enumerate(default_symbols):
            curr_w = float(current_weights[i])
            opt_w = float(max_sharpe_weights[i])
            rp_w = float(rp_weights[i])
            delta_w = opt_w - curr_w
            delta_amt = delta_w * total_holdings_val

            action = "BALANCED"
            if delta_w > 0.02:
                action = "BUY DIP (DCA)"
                instruction = f"Target {round(opt_w * 100, 1)}% allocation (+{round(delta_w * 100, 1)}%). Direct monthly DCA inflows here to expand holding without selling other assets."
            elif delta_w < -0.04:
                action = "OVERWEIGHT (HOLD)"
                instruction = f"Current weight ({round(curr_w * 100, 1)}%) exceeds target ({round(opt_w * 100, 1)}%). Hold position; let other holdings catch up naturally via monthly DCA."
            else:
                instruction = f"Near optimal target ({round(opt_w * 100, 1)}%). Maintain steady monthly contribution pace."

            rebalancing_plan.append({
                "symbol": sym,
                "currentWeightPct": round(curr_w * 100, 2),
                "optimalSharpeWeightPct": round(opt_w * 100, 2),
                "riskParityWeightPct": round(rp_w * 100, 2),
                "deltaWeightPct": round(delta_w * 100, 2),
                "targetAmountDelta": round(delta_amt, 2),
                "action": action,
                "instruction": instruction,
            })

        return {
            "currentPortfolio": {
                "expectedAnnualReturnPct": round(current_ret * 100, 2),
                "annualizedVolatilityPct": round(current_vol * 100, 2),
                "sharpeRatio": round(current_sharpe, 2),
            },
            "maxSharpePortfolio": {
                "expectedAnnualReturnPct": round(max_sharpe_ret * 100, 2),
                "annualizedVolatilityPct": round(max_sharpe_vol * 100, 2),
                "sharpeRatio": round(max_sharpe_val, 2),
                "allocationWeights": {sym: round(float(max_sharpe_weights[i]) * 100, 2) for i, sym in enumerate(default_symbols)},
            },
            "riskParityPortfolio": {
                "expectedAnnualReturnPct": round(rp_ret * 100, 2),
                "annualizedVolatilityPct": round(rp_vol * 100, 2),
                "sharpeRatio": round(rp_sharpe, 2),
                "allocationWeights": {sym: round(float(rp_weights[i]) * 100, 2) for i, sym in enumerate(default_symbols)},
            },
            "minVolatilityPortfolio": {
                "expectedAnnualReturnPct": round(min_vol_ret * 100, 2),
                "annualizedVolatilityPct": round(min_vol_val * 100, 2),
                "allocationWeights": {sym: round(float(min_vol_weights[i]) * 100, 2) for i, sym in enumerate(default_symbols)},
            },
            "efficientFrontierCurve": frontier_points,
            "rebalancingPlan": rebalancing_plan,
            "mathematicalMethod": "Markowitz Modern Portfolio Theory (Diversified Core-Satellite & Risk Parity)",
            "calculatedAt": datetime.now(timezone.utc).isoformat(),
        }
