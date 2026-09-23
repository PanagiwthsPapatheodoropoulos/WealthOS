"""Tool definitions and dispatch for the agentic AI Copilot."""
from typing import Dict, Any, List
from services.intelligence_engine import IntelligenceEngine
from services.risk_engine import RiskEngine
from services.tax_engine import GreekTaxEngine
from services.dividend_engine import DividendEngine
from services.portfolio_optimizer import PortfolioOptimizerEngine

TOOL_SCHEMAS: List[Dict[str, Any]] = [
    {
        "name": "get_asset_intelligence",
        "description": "Fetch live valuation (DCF, Buffett quality score), upcoming earnings catalysts, news sentiment, and CAPM expected returns for a single ticker symbol.",
        "input_schema": {
            "type": "object",
            "properties": {"symbol": {"type": "string", "description": "Ticker symbol, e.g. NVDA, VUAA, BTC"}},
            "required": ["symbol"],
        },
    },
    {
        "name": "get_portfolio_diagnostics",
        "description": "Compute Sharpe/Sortino ratios, Value at Risk, correlation matrix, macro stress tests, and a 5-year Monte Carlo projection for the user's current portfolio holdings.",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "get_greek_tax_audit",
        "description": "Audit the user's holdings for Greek/EU tax efficiency under Law 4172/2013 — identifies UCITS 0%-tax positions vs taxable single equities, and tax-loss harvesting opportunities.",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "get_dividend_runway",
        "description": "Project the user's 12-month forward dividend income schedule, post-tax net yield, and ex-dividend calendar.",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "get_efficient_frontier",
        "description": "Run Markowitz mean-variance optimization on the user's holdings — returns the max-Sharpe and min-volatility allocations and a rebalancing plan.",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
]


async def dispatch_tool(name: str, tool_input: Dict[str, Any], portfolio_context: Dict[str, Any]) -> Dict[str, Any]:
    holdings = portfolio_context.get("holdings", [])
    cash_balance = portfolio_context.get("cashBalance", 0.0)

    if name == "get_asset_intelligence":
        symbol = tool_input.get("symbol", "").upper().strip()
        return await IntelligenceEngine.fetch_comprehensive_intelligence(symbol)

    if name == "get_portfolio_diagnostics":
        return RiskEngine.calculate_portfolio_diagnostics(holdings=holdings, portfolio_cash=cash_balance)

    if name == "get_greek_tax_audit":
        return GreekTaxEngine.audit_portfolio_tax_efficiency(holdings, cash_balance)

    if name == "get_dividend_runway":
        return DividendEngine.calculate_dividend_runway(holdings, "EUR")

    if name == "get_efficient_frontier":
        return PortfolioOptimizerEngine.calculate_efficient_frontier(holdings=holdings, cash_balance=cash_balance)

    return {"error": f"Unknown tool: {name}"}
