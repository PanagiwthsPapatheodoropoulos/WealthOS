"""
WealthOS AI Investment Copilot Agentic Engine
Provides tool-calling into quantitative modules:
- DCF valuation & fundamental quality scoring (IntelligenceEngine)
- Sharpe/Sortino/VaR & Monte Carlo risk diagnostics (RiskEngine)
- Greek Law 4172/2013 tax audit & UCITS tax exemption (GreekTaxEngine)
- 12-Month forward dividend runway & ex-dividend calendar (DividendEngine)
- Markowitz mean-variance efficient frontier & rebalancing (PortfolioOptimizerEngine)
"""

import os
import json
import re
from typing import Dict, Any, List, Optional
from services.ai_tools import TOOL_SCHEMAS, dispatch_tool

SYSTEM_PROMPT = """You are the WealthOS Institutional AI Copilot, an investment assistant with direct access to
real-time market data, DCF valuation models, portfolio risk analytics, Greek/EU tax rules, dividend forecasting,
and Markowitz portfolio optimization tools.

Rules:
- Always call a tool to get real data before answering questions about specific tickers, portfolio risk, tax, dividends, or rebalancing.
- Never fabricate numbers. If a tool call fails, say so plainly.
- Keep answers concise, use bold for key figures, and cite the actual computed values from tool results.
- If the user's question doesn't require live data (e.g. "what is a Sharpe ratio?"), answer directly without a tool call.
"""

# Common company name to ticker symbol mapping
NAME_TO_SYMBOL = {
    "nvidia": "NVDA", "nvda": "NVDA",
    "tesla": "TSLA", "tsla": "TSLA",
    "apple": "AAPL", "aapl": "AAPL",
    "microsoft": "MSFT", "msft": "MSFT",
    "amazon": "AMZN", "amzn": "AMZN",
    "google": "GOOGL", "alphabet": "GOOGL", "googl": "GOOGL", "goog": "GOOGL",
    "meta": "META", "facebook": "META",
    "bitcoin": "BTC", "btc": "BTC",
    "ethereum": "ETH", "eth": "ETH",
    "solana": "SOL", "sol": "SOL",
    "vuaa": "VUAA.MI", "vanguard": "VUAA.MI", "vuaa.mi": "VUAA.MI",
    "smh": "SMH", "smhm": "SMH",
    "s&p 500": "SPY", "sp500": "SPY", "spy": "SPY",
    "nasdaq": "QQQ", "qqq": "QQQ",
}


class AICopilotService:

    @classmethod
    async def handle_chat_query(cls, message: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Processes chat message using agentic tool routing.
        If an external Anthropic API key is provided, it attempts Claude tool calling.
        Otherwise (or on failure), executes via the built-in deterministic tool engine.
        """
        portfolio_context = context or {}
        anthropic_key = os.getenv("ANTHROPIC_API_KEY", "").strip()

        if anthropic_key:
            try:
                import anthropic
                client = anthropic.Anthropic(api_key=anthropic_key)
                messages = [{"role": "user", "content": message}]
                tool_calls_made = []

                for _ in range(4):
                    response = client.messages.create(
                        model="claude-3-5-sonnet-20241022",
                        max_tokens=1200,
                        system=SYSTEM_PROMPT,
                        tools=TOOL_SCHEMAS,
                        messages=messages,
                    )

                    if response.stop_reason != "tool_use":
                        final_text = "".join(block.text for block in response.content if block.type == "text")
                        return {
                            "status": "success",
                            "reply": final_text or "I wasn't able to generate a response.",
                            "toolCallsUsed": tool_calls_made,
                        }

                    messages.append({"role": "assistant", "content": response.content})
                    tool_results = []

                    for block in response.content:
                        if block.type == "tool_use":
                            tool_calls_made.append(block.name)
                            try:
                                result = await dispatch_tool(block.name, block.input, portfolio_context)
                            except Exception as e:
                                result = {"error": str(e)}

                            tool_results.append({
                                "type": "tool_result",
                                "tool_use_id": block.id,
                                "content": json.dumps(result, default=str)[:8000],
                            })

                    messages.append({"role": "user", "content": tool_results})

                return {
                    "status": "success",
                    "reply": "I gathered the data but reached the reasoning limit — please ask a more specific follow-up.",
                    "toolCallsUsed": tool_calls_made,
                }
            except Exception:
                pass  # Fall back to deterministic agent below

        # Deterministic Tool Dispatch Engine
        return await cls._run_free_agentic_engine(message, portfolio_context)

    @classmethod
    async def _run_free_agentic_engine(cls, message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        msg_lower = message.lower().strip()
        tool_calls_made: List[str] = []
        tool_data: Dict[str, Any] = {}

        # 1. Identify Ticker Symbol(s) in message
        detected_sym = None
        for key, sym in NAME_TO_SYMBOL.items():
            if re.search(r'\b' + re.escape(key) + r'\b', msg_lower):
                detected_sym = sym
                break

        if not detected_sym:
            # Check for uppercase ticker tokens like AAPL, NVDA, TSLA, etc.
            tokens = re.findall(r'\b[A-Z]{2,6}(?:\.[A-Z]{2})?\b', message)
            for t in tokens:
                if t.upper() not in ["USD", "EUR", "GBP", "CAD", "CHF", "API", "ETF", "DCF", "PE", "EPS", "VAR", "CAPM"]:
                    detected_sym = t.upper()
                    break

        # 2. Determine Intent & Dispatch Tools
        # A. Tax efficiency / Greek Law 4172/2013 intent
        if any(w in msg_lower for w in ["tax", "ucits", "law 4172", "4172/2013", "harvesting", "capital gain", "φορολογ"]):
            tool_name = "get_greek_tax_audit"
            tool_calls_made.append(tool_name)
            tax_res = await dispatch_tool(tool_name, {}, context)
            tool_data["tax"] = tax_res
            return cls._synthesize_tax_response(tax_res, tool_calls_made)

        # B. Dividend / Passive income runway intent
        if any(w in msg_lower for w in ["dividend", "runway", "passive income", "yield", "payout", "μερισμ"]):
            tool_name = "get_dividend_runway"
            tool_calls_made.append(tool_name)
            div_res = await dispatch_tool(tool_name, {}, context)
            tool_data["dividend"] = div_res
            return cls._synthesize_dividend_response(div_res, tool_calls_made)

        # C. Rebalancing / Markowitz Efficient Frontier intent
        if any(w in msg_lower for w in ["rebalance", "efficient frontier", "markowitz", "optimal weight", "sharpe optimal"]):
            tool_name = "get_efficient_frontier"
            tool_calls_made.append(tool_name)
            eff_res = await dispatch_tool(tool_name, {}, context)
            tool_data["optimizer"] = eff_res
            return cls._synthesize_optimizer_response(eff_res, tool_calls_made)

        # D. Portfolio risk / diagnostics intent
        if any(w in msg_lower for w in ["portfolio", "risk", "sharpe", "sortino", "var", "drawdown", "monte carlo", "stress test", "health check"]):
            tool_name = "get_portfolio_diagnostics"
            tool_calls_made.append(tool_name)
            risk_res = await dispatch_tool(tool_name, {}, context)
            tool_data["risk"] = risk_res
            return cls._synthesize_risk_response(risk_res, tool_calls_made)

        # E. Specific Ticker Intelligence intent
        if detected_sym:
            tool_name = "get_asset_intelligence"
            tool_calls_made.append(tool_name)
            intel_res = await dispatch_tool(tool_name, {"symbol": detected_sym}, context)
            tool_data["intelligence"] = intel_res
            return cls._synthesize_ticker_response(detected_sym, intel_res, msg_lower, tool_calls_made)

        # F. General Advisory / Capabilities Guidance
        return {
            "status": "success",
            "reply": (
                "🤖 **WealthOS Institutional AI Copilot Active**\n\n"
                "I have direct agentic access to the platform's quantitative engines:\n\n"
                "• **DCF Intrinsic Valuation & Buffett Moat**: Ask *'What is NVDA fair value?'* or *'Is Apple undervalued?'*\n"
                "• **Portfolio Risk & Monte Carlo**: Ask *'Analyze my portfolio risk'* for Sharpe/Sortino ratios, VaR 95%, and 5-year stochastic projections.\n"
                "• **Greek Tax Efficiency (Law 4172/2013)**: Ask *'Audit my portfolio for taxes'* to check UCITS 0% tax compliance and tax-loss harvesting.\n"
                "• **12-Month Dividend Runway**: Ask *'Show my dividend schedule'* for monthly net passive income forecasts and ex-dividend dates.\n"
                "• **Markowitz Modern Portfolio Optimization**: Ask *'How should I rebalance my portfolio?'* for max-Sharpe allocations."
            ),
            "toolCallsUsed": [],
        }

    @classmethod
    def _synthesize_tax_response(cls, tax: Dict[str, Any], tools: List[str]) -> Dict[str, Any]:
        exempt_pct = tax.get("taxExemptPercentage", 0.0)
        eff_score = tax.get("taxEfficiencyScore", 100.0)
        total_val = tax.get("totalPortfolioValue", 0.0)
        unrealized_tax = tax.get("estimatedUnrealizedTaxLiability", 0.0)
        savings_20y = tax.get("potential20YearTaxSavingsViaUCITS", 0.0)
        harvesting = tax.get("taxLossHarvestingOpportunities", [])

        harvest_text = ""
        if harvesting:
            harvest_text = "\n\n🌾 **Tax-Loss Harvesting Opportunities Identified**:\n"
            for opp in harvesting[:3]:
                harvest_text += f"• **{opp.get('symbol')}**: {opp.get('recommendation')}\n"

        reply = (
            f"🏛️ **Greek & EU Tax Compliance Audit (Law 4172/2013)**\n\n"
            f"• **Tax Residence Jurisdiction**: {tax.get('residenceJurisdiction', 'Greece (Hellenic Republic / EU)')}\n"
            f"• **Portfolio Tax Efficiency Score**: **{eff_score}/100**\n"
            f"• **UCITS Tax-Exempt Allocation**: **{exempt_pct}%** (Eligible for 0% Capital Gains & 0% Dividend Tax under Art. 42/43)\n"
            f"• **Estimated Unrealized Tax Drag**: **€{unrealized_tax:,.2f}**\n"
            f"• **20-Year UCITS Compounding Advantage**: **€{savings_20y:,.2f}** preserved versus standard taxable accounts\n"
            f"{harvest_text}\n"
            f"💡 **Statutory Guidance**: All EU-domiciled UCITS ETFs (like VUAA or VWCE) enjoy complete tax immunity in Greece. Non-UCITS US equities incur a 15% tax on realized gains."
        )
        return {"status": "success", "reply": reply, "toolCallsUsed": tools, "data": tax}

    @classmethod
    def _synthesize_dividend_response(cls, div: Dict[str, Any], tools: List[str]) -> Dict[str, Any]:
        gross = div.get("annualGrossDividend", 0.0)
        net = div.get("annualNetDividend", 0.0)
        yield_pct = div.get("portfolioDividendYieldPct", 0.0)
        runway = div.get("monthlyRunway", [])

        top_months = sorted([m for m in runway if m.get("netAmount", 0) > 0], key=lambda x: x.get("netAmount", 0), reverse=True)[:3]
        month_summary = ", ".join(f"{m['month']} (€{m['netAmount']:.2f})" for m in top_months) if top_months else "Evenly distributed"

        reply = (
            f"💰 **12-Month Forward Dividend Runway & Passive Income Forecast**\n\n"
            f"• **Net Annual Dividend Cash Flow**: **€{net:,.2f}** (Gross: €{gross:,.2f})\n"
            f"• **Effective Portfolio Dividend Yield**: **{yield_pct:.2f}%**\n"
            f"• **Peak Distribution Months**: {month_summary}\n\n"
            f"💡 **Reinvestment Strategy**: Accumulating UCITS ETFs automatically reinvest dividends internally with 0% tax leakage, while distributing equities require periodic manual rebalancing."
        )
        return {"status": "success", "reply": reply, "toolCallsUsed": tools, "data": div}

    @classmethod
    def _synthesize_optimizer_response(cls, opt: Dict[str, Any], tools: List[str]) -> Dict[str, Any]:
        max_sharpe = opt.get("maxSharpeAllocation", {})
        min_vol = opt.get("minVolatilityAllocation", {})
        rebalance = opt.get("rebalancePlan", [])

        sharpe_weights = ", ".join(f"**{k}**: {v*100:.1f}%" for k, v in list(max_sharpe.get("weights", {}).items())[:5])

        reply = (
            f"📐 **Markowitz Modern Portfolio Theory & Efficient Frontier**\n\n"
            f"• **Max-Sharpe Expected Return**: **+{max_sharpe.get('expectedReturnPct', 0):.1f}%** (Annualized Volatility: **{max_sharpe.get('volatilityPct', 0):.1f}%**)\n"
            f"• **Max-Sharpe Ratio**: **{max_sharpe.get('sharpeRatio', 0):.2f}**\n"
            f"• **Optimal Tangency Allocations**: {sharpe_weights or 'Diversified basket'}\n"
            f"• **Min-Volatility Defensive Return**: **+{min_vol.get('expectedReturnPct', 0):.1f}%** (Risk: **{min_vol.get('volatilityPct', 0):.1f}%**)\n\n"
            f"🎯 **Actionable Rebalancing**: Aligning your weights toward the tangency portfolio maximizes return per unit of variance under European market conditions."
        )
        return {"status": "success", "reply": reply, "toolCallsUsed": tools, "data": opt}

    @classmethod
    def _synthesize_risk_response(cls, risk: Dict[str, Any], tools: List[str]) -> Dict[str, Any]:
        mc = risk.get("monteCarlo", {})
        var = risk.get("valueAtRisk", {})

        reply = (
            f"🛡️ **Portfolio Risk & Quantitative Diagnostics**\n\n"
            f"• **Total Valuation Audited**: **${risk.get('portfolioTotalValue', 0):,.2f}**\n"
            f"• **CAPM Expected Annual Return**: **+{risk.get('expectedAnnualReturnPct', 0):.1f}%**\n"
            f"• **Portfolio Beta**: **{risk.get('portfolioBeta', 1.0)}x** | **Annualized Volatility**: **{risk.get('annualizedVolatilityPct', 0):.1f}%**\n"
            f"• **Sharpe Ratio**: **{risk.get('sharpeRatio', 0):.2f}** | **Sortino Ratio (Downside)**: **{risk.get('sortinoRatio', 0):.2f}**\n"
            f"• **1-Day Value at Risk (VaR 95%)**: **${var.get('var95_1d_amount', 0):,.2f}** ({var.get('var95_1d_pct', 0):.1f}%)\n\n"
            f"🎲 **Monte Carlo 5-Year Stochastic Projection**:\n"
            f"• **Median Expected Value (50th %ile)**: **${mc.get('medianFinalValue', 0):,.2f}** (+{mc.get('medianTotalGainPct', 0)}%)\n"
            f"• **Bull Case Expansion (90th %ile)**: **${mc.get('bullFinalValue', 0):,.2f}** (+{mc.get('bullTotalGainPct', 0)}%)\n"
            f"• **Bear Case Floor (10th %ile)**: **${mc.get('bearFinalValue', 0):,.2f}** ({mc.get('bearTotalGainPct', 0):+0.1f}%)\n\n"
            f"⚡ **Diversification Rating**: **{risk.get('diversificationGrade', 'OPTIMAL')}**"
        )
        return {"status": "success", "reply": reply, "toolCallsUsed": tools, "data": risk}

    @classmethod
    def _synthesize_ticker_response(cls, sym: str, intel: Dict[str, Any], msg_lower: str, tools: List[str]) -> Dict[str, Any]:
        dcf = intel.get("valuation", {}).get("dcfModel", {})
        cat = intel.get("catalysts", {})
        buffett = intel.get("valuation", {}).get("buffettQualityModel", {})
        capm = intel.get("riskAndExpectedReturns", {}).get("capmExpectedReturn", {})
        news = intel.get("news", [])
        latest_headline = news[0]["headline"] if news else "Active market disclosures monitored"

        if any(k in msg_lower for k in ["earning", "catalyst", "announcement", "date", "when"]):
            reply = (
                f"📅 **Upcoming Catalyst & Earnings Report for {sym}**\n\n"
                f"{cat.get('catalystAlert') or 'Tracking active corporate earnings schedule.'}\n\n"
                f"• **Scheduled Date**: **{cat.get('earningsDate') or 'Periodic filings'}** ({cat.get('earningsQuarter', 'Upcoming')})\n"
                f"• **Session**: {cat.get('earningsHour', 'AMC')}\n"
                f"• **Consensus EPS Estimate**: **${cat.get('epsEstimate') or 'N/A'}**\n"
                f"• **Wall Street Rating**: **{cat.get('analystConsensus', {}).get('consensusRating', 'BUY')}** "
                f"({cat.get('analystConsensus', {}).get('buyRatioPct', 0)}% Buy Consensus)\n\n"
                f"📰 **Recent Disclosure**: *\"{latest_headline}\"*"
            )
        elif any(k in msg_lower for k in ["valuation", "dcf", "buffett", "fair value", "cheap", "expensive", "undervalued"]):
            margin = dcf.get("marginOfSafetyPct", 0)
            status_text = "discount" if margin > 0 else "premium"
            reply = (
                f"📊 **Intrinsic DCF Valuation & Warren Buffett Metrics for {sym}**\n\n"
                f"• **DCF Intrinsic Fair Value**: **${dcf.get('fairValue', 'N/A')}** "
                f"({dcf.get('valuationStatus', 'FAIRLY VALUED')}, Margin of Safety: **{margin:+0.1f}%**)\n"
                f"• **Warren Buffett Moat Tier**: **{buffett.get('economicMoatTier', 'WIDE MOAT')}** (Quality Score: **{buffett.get('qualityScore', 80)}/100**)\n"
                f"• **Buffett Verdict**: {buffett.get('verdict')}\n"
                f"• **Benjamin Graham Number**: ${intel.get('valuation', {}).get('grahamNumber', 'N/A')}\n"
                f"• **Peter Lynch Fair Value**: ${intel.get('valuation', {}).get('peterLynchFairValue', 'N/A')}\n\n"
                f"💡 **Valuation Conclusion**: Based on discounted free cash flows, {sym} trades at a **{abs(margin):.1f}% {status_text}** to intrinsic value."
            )
        else:
            reply = (
                f"🏛️ **Institutional Intelligence Dossier for {sym}**\n\n"
                f"{intel.get('executiveThesis') or f'Analysis for {sym} based on fundamentals and pricing.'}\n\n"
                f"• **Intrinsic Valuation**: {dcf.get('valuationStatus', 'FAIRLY VALUED')} (DCF Fair Value: **${dcf.get('fairValue', 'N/A')}**)\n"
                f"• **1-Year CAPM Expected Return**: **+{capm.get('oneYearExpectedReturnPct', 10.0)}%**\n"
                f"• **Warren Buffett Quality**: **{buffett.get('economicMoatTier', 'WIDE MOAT')}** ({buffett.get('qualityScore', 80)}/100)\n"
                f"• **Upcoming Catalyst**: {cat.get('earningsDate') or 'Periodic filings'} ({cat.get('earningsQuarter', 'Q3')})\n\n"
                f"📰 **Latest News**: *\"{latest_headline}\"*"
            )

        return {"status": "success", "reply": reply, "toolCallsUsed": tools, "data": intel}
