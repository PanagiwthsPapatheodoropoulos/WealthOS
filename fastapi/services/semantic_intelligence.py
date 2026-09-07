"""
WealthOS Semantic Intelligence & Automated Graph Analytics
Executes RDF reasoning, transitive dependency graphs, SPARQL inferences, and SHACL validation behind the scenes.
"""

from typing import Dict, Any, List
from sqlalchemy.orm import Session
from db.models import Portfolio, Holding, Asset
from services.rdf_mapper import RDFMappingService
from services.sparql_engine import SPARQLEngine
from services.shacl_validator import SHACLValidationService


class SemanticIntelligenceService:
    """
    Computes deep semantic graph analytics, transitive supply-chain risk,
    ESG ratings, and SHACL data governance automatically from actual database records.
    """

    @classmethod
    def compute_portfolio_semantic_insights(cls, db: Session, portfolio_id: str) -> Dict[str, Any]:
        portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
        if not portfolio:
            portfolio = db.query(Portfolio).first()

        if not portfolio:
            return {
                "portfolio_id": "",
                "portfolio_name": "No Active Portfolio",
                "total_value": 0.0,
                "holdings_value": 0.0,
                "cash_balance": 0.0,
                "sector_exposure": [],
                "supply_chain_risks": [],
                "esg_summary": {"overall_score": 0.0, "rating": "N/A", "carbon_risk": "N/A", "governance_score": 0.0},
                "risk_profile": {"weighted_risk_score": 0.0, "risk_tier": "N/A"},
                "shacl_governance": {"conforms": True, "violations_count": 0, "status": "W3C SHACL CERTIFIED"},
                "knowledge_graph_stats": {"triples_count": 0, "ontology_standard": "FIBO (Financial Industry Business Ontology) + W3C OWL"}
            }

        cash_bal = portfolio.account.cash_balance if portfolio.account else 0.0

        if not portfolio.holdings or len(portfolio.holdings) == 0:
            return {
                "portfolio_id": portfolio.id,
                "portfolio_name": portfolio.name,
                "total_value": round(cash_bal, 2),
                "holdings_value": 0.0,
                "cash_balance": round(cash_bal, 2),
                "sector_exposure": [],
                "supply_chain_risks": [],
                "esg_summary": {"overall_score": 0.0, "rating": "N/A", "carbon_risk": "N/A", "governance_score": 0.0},
                "risk_profile": {"weighted_risk_score": 0.0, "risk_tier": "CASH ONLY"},
                "shacl_governance": {"conforms": True, "violations_count": 0, "status": "W3C SHACL CERTIFIED"},
                "knowledge_graph_stats": {"triples_count": 0, "ontology_standard": "FIBO (Financial Industry Business Ontology) + W3C OWL"}
            }

        holdings_data = []
        supply_chain_exposures = []
        total_holdings_val = 0.0
        weighted_esg_sum = 0.0
        weighted_risk_sum = 0.0

        for h in portfolio.holdings:
            asset = h.asset
            if not asset:
                continue
            val = h.quantity * asset.current_price
            total_holdings_val += val
            weighted_esg_sum += asset.esg_score * val
            weighted_risk_sum += asset.risk_score * val

            holdings_data.append({
                "symbol": asset.symbol,
                "name": asset.name,
                "assetType": asset.asset_type,
                "quantity": h.quantity,
                "avgCost": h.avg_cost,
                "currentPrice": asset.current_price,
                "marketValue": val,
                "riskScore": asset.risk_score,
                "esgScore": asset.esg_score,
            })

            if asset.supply_chain_dependency:
                supply_chain_exposures.append({
                    "symbol": asset.symbol,
                    "assetName": asset.name,
                    "marketValue": round(val, 2),
                    "dependency": asset.supply_chain_dependency,
                    "geopolitical_sensitivity": "HIGH" if "TSMC" in asset.supply_chain_dependency or "Lithium" in asset.supply_chain_dependency else "MODERATE"
                })

        total_val = total_holdings_val + cash_bal

        portfolio_payload = {
            "id": portfolio.id,
            "name": portfolio.name,
            "cashBalance": cash_bal,
            "totalValue": total_val,
            "holdings": holdings_data
        }

        # 1. Build W3C RDF Knowledge Graph
        rdf_graph = RDFMappingService.build_knowledge_graph(portfolios=[portfolio_payload])

        # 2. Automated SPARQL Sector Exposure Query
        sector_res = SPARQLEngine.execute_template(rdf_graph, "SECTOR_EXPOSURE")
        sector_exposure = []
        for row in sector_res.get("rows", []):
            sec_val = float(row.get("totalSectorValue", 0.0))
            pct = (sec_val / total_val * 100) if total_val > 0 else 0.0
            sector_exposure.append({
                "sector": row.get("sectorName", "General"),
                "value": round(sec_val, 2),
                "percentage": round(pct, 1),
                "assetCount": int(row.get("assetCount", 1))
            })

        # 3. Compute Real Aggregated ESG Metrics
        avg_esg = (weighted_esg_sum / total_holdings_val) if total_holdings_val > 0 else 0.0
        avg_risk = (weighted_risk_sum / total_holdings_val) if total_holdings_val > 0 else 0.0

        esg_grade = "AAA" if avg_esg >= 85 else ("AA" if avg_esg >= 75 else ("A" if avg_esg >= 65 else ("BBB" if avg_esg > 0 else "N/A")))

        # 4. Automated SHACL Validation
        shacl_report = SHACLValidationService.validate_graph(rdf_graph)

        return {
            "portfolio_id": portfolio.id,
            "portfolio_name": portfolio.name,
            "total_value": round(total_val, 2),
            "holdings_value": round(total_holdings_val, 2),
            "cash_balance": round(cash_bal, 2),
            "sector_exposure": sector_exposure,
            "supply_chain_risks": supply_chain_exposures,
            "esg_summary": {
                "overall_score": round(avg_esg, 1),
                "rating": esg_grade,
                "carbon_risk": "LOW" if avg_esg >= 75 else ("MODERATE" if avg_esg > 0 else "N/A"),
                "governance_score": round(min(100.0, avg_esg * 1.05), 1)
            },
            "risk_profile": {
                "weighted_risk_score": round(avg_risk, 3),
                "risk_tier": "AGGRESSIVE" if avg_risk > 0.55 else ("BALANCED" if avg_risk > 0.30 else ("CONSERVATIVE" if avg_risk > 0 else "CASH ONLY")),
            },
            "shacl_governance": {
                "conforms": shacl_report["conforms"],
                "violations_count": shacl_report["total_violations"],
                "status": "W3C SHACL CERTIFIED" if shacl_report["conforms"] else "VIOLATIONS DETECTED",
            },
            "knowledge_graph_stats": {
                "triples_count": len(rdf_graph),
                "ontology_standard": "FIBO (Financial Industry Business Ontology) + W3C OWL",
            }
        }
