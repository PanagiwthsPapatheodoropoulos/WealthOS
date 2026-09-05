"""
WealthOS Greek & European Investment Tax Compliance Engine
Implements authentic European Union and Hellenic Republic tax legislation:
- Greek Income Tax Code (Law 4172/2013, Articles 42 & 43): 0% Capital Gains Tax for UCITS ETFs (EU/EEA).
- Greek Law 3283/2004 (Article 103): 0% Withholding Tax on UCITS dividends and distributions.
- US-Greece Double Taxation Treaty (DTT): 15% Withholding Tax on US equity dividends (via W-8BEN).
- Non-UCITS single equities / US ETFs: 15% Capital Gains Tax on realized profits.
- Tax-Loss Harvesting Engine: Identifies losing taxable positions to offset realized capital gains.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

class GreekTaxEngine:

    UCITS_ETF_KEYWORDS = [
        "UCITS", "VANGUARD", "ISHARES", "XTRACKERS", "AMUNDI", "SPDR", "INVESCO", "LYXOR", "VANECK", "KRANESHARES",
        "VUAA", "VWCE", "SXR8", "MEUD", "VUSA", "CSPX", "EUNL", "IS3N", "QDVE", "IWDA",
        "SMH", "KBOT", "WNUC", "WQTM"
    ]

    CRYPTO_SYMBOLS = ["BTC", "ETH", "SOL", "ADA", "XRP", "DOT", "AVAX", "DOGE"]

    @classmethod
    def classify_asset_tax_vehicle(cls, symbol: str, name: str = "", asset_type: str = "STOCK") -> Dict[str, Any]:
        sym = symbol.upper().strip()
        n = (name or "").upper()

        if sym in cls.CRYPTO_SYMBOLS or asset_type.upper() == "CRYPTO":
            return {
                "vehicle": "CRYPTO",
                "label": "Cryptocurrency Asset",
                "jurisdiction": "Decentralized / Greek Tax Residence",
                "capitalGainsTaxPct": 15.0,
                "dividendTaxPct": 0.0,
                "isTaxExempt": False,
                "legalBasis": "Greek Income Tax Code (Art. 42 / Law 4172/2013)",
                "taxAdvantageTier": "TAXABLE (15% on Realized Gains)"
            }

        # Check for UCITS ETF designation
        is_ucits = any(k in sym or k in n for k in cls.UCITS_ETF_KEYWORDS) or asset_type.upper() == "ETF"
        if is_ucits:
            return {
                "vehicle": "UCITS_ETF",
                "label": "UCITS ETF (EU/EEA Registered)",
                "jurisdiction": "European Union / Ireland / Luxembourg",
                "capitalGainsTaxPct": 0.0,
                "dividendTaxPct": 0.0,
                "isTaxExempt": True,
                "legalBasis": "Greek Law 4172/2013 (Art. 42 §1 & Art. 43) & Law 3283/2004 (Art. 103)",
                "taxAdvantageTier": "100% TAX-FREE (0% Capital Gains & 0% Dividend Tax)"
            }

        # Single stocks (US / Foreign)
        if "." not in sym or sym.endswith(".US") or sym in ["NVDA", "AAPL", "MSFT", "AMZN", "GOOGL", "TSLA", "META"]:
            return {
                "vehicle": "US_EQUITY",
                "label": "US Single Stock / Non-UCITS Equity",
                "jurisdiction": "United States / Greek Tax Residence",
                "capitalGainsTaxPct": 15.0,
                "dividendTaxPct": 15.0, # Reduced via US-GR DTT W-8BEN from 30%
                "isTaxExempt": False,
                "legalBasis": "US-Greece Double Tax Treaty (15% WHT on Dividends) + Law 4172/2013 (15% Capital Gains)",
                "taxAdvantageTier": "TAXABLE (15% WHT Dividends + 15% Realized Capital Gains)"
            }

        return {
            "vehicle": "EU_EQUITY",
            "label": "European Single Equity",
            "jurisdiction": "European Economic Area",
            "capitalGainsTaxPct": 15.0,
            "dividendTaxPct": 5.0, # Standard Greek domestic dividend tax rate is 5%
            "isTaxExempt": False,
            "legalBasis": "Greek Income Tax Code (Law 4172/2013 Art. 40 & 42)",
            "taxAdvantageTier": "TAXABLE (5% Dividend Tax + 15% Capital Gains)"
        }

    @classmethod
    def audit_portfolio_tax_efficiency(cls, holdings: List[Dict[str, Any]], cash_balance: float = 0.0) -> Dict[str, Any]:
        """
        Performs a comprehensive Greek & European tax audit on the user's active holdings.
        """
        if not holdings:
            return {
                "totalPortfolioValue": cash_balance,
                "taxExemptValue": 0.0,
                "taxableValue": 0.0,
                "taxExemptPercentage": 0.0,
                "taxEfficiencyScore": 100.0,
                "estimatedUnrealizedTaxLiability": 0.0,
                "potentialTaxSavingsViaUCITS": 0.0,
                "taxLossHarvestingOpportunities": [],
                "auditedPositions": [],
                "residenceJurisdiction": "Greece (Hellenic Republic / EU)",
                "summary": "No active positions to audit."
            }

        audited_positions = []
        total_market_val = 0.0
        tax_exempt_val = 0.0
        taxable_val = 0.0
        total_unrealized_liability = 0.0
        tax_loss_harvesting = []

        for h in holdings:
            sym = str(h.get("symbol", "")).upper().strip()
            qty = float(h.get("quantity") or 0.0)
            avg_cost = float(h.get("avgCost") or 0.0)
            cur_price = float(h.get("currentPrice") or 0.0)
            cost_basis = qty * avg_cost
            market_val = qty * cur_price
            unrealized_pnl = market_val - cost_basis

            tax_info = cls.classify_asset_tax_vehicle(sym, h.get("name", ""), h.get("assetType", "STOCK"))
            cg_tax_rate = tax_info["capitalGainsTaxPct"] / 100.0

            if tax_info["isTaxExempt"]:
                position_tax_liability = 0.0
                tax_exempt_val += market_val
            else:
                position_tax_liability = max(0.0, unrealized_pnl * cg_tax_rate)
                taxable_val += market_val

                # Check for Tax-Loss Harvesting opportunities
                if unrealized_pnl < 0:
                    tax_loss_harvesting.append({
                        "symbol": sym,
                        "name": h.get("name") or sym,
                        "unrealizedLoss": round(abs(unrealized_pnl), 2),
                        "potentialTaxCredit": round(abs(unrealized_pnl) * 0.15, 2),
                        "recommendation": f"Harvest €{abs(unrealized_pnl):,.2f} loss to offset up to €{abs(unrealized_pnl)*0.15:,.2f} in taxable capital gains before December 31."
                    })

            total_market_val += market_val
            total_unrealized_liability += position_tax_liability

            audited_positions.append({
                "symbol": sym,
                "name": h.get("name") or sym,
                "quantity": qty,
                "costBasis": round(cost_basis, 2),
                "marketValue": round(market_val, 2),
                "unrealizedPnl": round(unrealized_pnl, 2),
                "taxVehicle": tax_info["vehicle"],
                "taxLabel": tax_info["label"],
                "capitalGainsTaxPct": tax_info["capitalGainsTaxPct"],
                "dividendTaxPct": tax_info["dividendTaxPct"],
                "isTaxExempt": tax_info["isTaxExempt"],
                "legalBasis": tax_info["legalBasis"],
                "unrealizedTaxLiability": round(position_tax_liability, 2),
            })

        total_portfolio = total_market_val + cash_balance
        tax_exempt_pct = round((tax_exempt_val / total_market_val) * 100, 2) if total_market_val > 0 else 0.0

        # Efficiency Score: 100 if all UCITS, lower if heavy taxable unrealized gains
        efficiency_score = round(max(0.0, 100.0 - (total_unrealized_liability / total_market_val * 100 * 3)), 1) if total_market_val > 0 else 100.0

        # 20-Year UCITS Compound Advantage Simulation (assuming 9% return and 15% tax drag)
        compound_20y_ucits = total_market_val * ((1 + 0.09) ** 20)
        compound_20y_taxable = total_market_val * ((1 + (0.09 * 0.85)) ** 20)
        potential_20y_tax_savings = round(max(0.0, compound_20y_ucits - compound_20y_taxable), 2)

        return {
            "residenceJurisdiction": "Greece (Hellenic Republic / EU Resident)",
            "taxLegislation": "Greek Law 4172/2013 (Articles 42 & 43) & UCITS Directive 2009/65/EC",
            "totalPortfolioValue": round(total_portfolio, 2),
            "totalHoldingsValue": round(total_market_val, 2),
            "taxExemptValue": round(tax_exempt_val, 2),
            "taxableValue": round(taxable_val, 2),
            "taxExemptPercentage": tax_exempt_pct,
            "taxEfficiencyScore": min(100.0, efficiency_score),
            "estimatedUnrealizedTaxLiability": round(total_unrealized_liability, 2),
            "potential20YearTaxSavingsViaUCITS": potential_20y_tax_savings,
            "taxLossHarvestingOpportunities": tax_loss_harvesting,
            "auditedPositions": audited_positions,
            "executiveSummary": (
                f"Your portfolio is {tax_exempt_pct}% allocated to 0% Tax-Exempt UCITS assets in Greece. "
                f"Holding UCITS ETFs like VUAA/VWCE completely eliminates Greek Capital Gains (15%) and Dividend Taxes (15%), "
                f"projected to preserve €{potential_20y_tax_savings:,.2f} in compound wealth over 20 years."
            )
        }
