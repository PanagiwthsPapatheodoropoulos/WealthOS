from typing import List, Dict

class AIInsightsService:

    @staticmethod
    def generate_portfolio_advice(holdings: List[Dict[str, float]]) -> List[str]:
        insights = []
        total_val = sum(h.get("value", 0.0) for h in holdings)
        if total_val == 0:
            return ["Portfolio is empty. Consider deploying cash into diversified ETFs."]

        for h in holdings:
            pct = (h.get("value", 0.0) / total_val) * 100
            if pct > 40.0:
                insights.append(
                    f"⚠️ High Concentration Risk: Asset '{h.get('symbol')}' accounts for {pct:.1f}% of your portfolio. Consider rebalancing."
                )

        crypto_val = sum(h.get("value", 0.0) for h in holdings if h.get("type") == "CRYPTO")
        crypto_pct = (crypto_val / total_val) * 100
        if crypto_pct > 25.0:
            insights.append(
                f"⚡ Volatility Warning: Crypto allocation is at {crypto_pct:.1f}%. High volatility may impact drawdowns."
            )

        if not insights:
            insights.append("✅ Portfolio is well-balanced across asset classes and risk tolerance limits.")

        return insights
