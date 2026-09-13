"""
WealthOS Knowledge Graph & SPARQL API Router
Exposes endpoints for RDF Knowledge Graph generation, SPARQL query execution, and semantic exports.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from services.rdf_mapper import RDFMappingService
from services.sparql_engine import SPARQLEngine, SPARQL_TEMPLATES
from services.shacl_validator import SHACLValidationService
from rdflib import Graph

router = APIRouter()

# Global in-memory Semantic Knowledge Graph store
_semantic_knowledge_graph: Graph = RDFMappingService.initialize_graph()


class AssetPayload(BaseModel):
    id: Optional[str] = None
    symbol: str
    name: Optional[str] = None
    assetType: str = "STOCK"
    currency: str = "USD"
    currentPrice: float
    priceUpdatedAt: Optional[str] = None


class HoldingPayload(BaseModel):
    assetId: Optional[str] = None
    symbol: str
    name: Optional[str] = None
    type: Optional[str] = "STOCK"
    assetType: Optional[str] = "STOCK"
    quantity: float
    avgCost: Optional[float] = 0.0
    currentPrice: Optional[float] = 0.0
    marketValue: Optional[float] = 0.0
    value: Optional[float] = 0.0


class PortfolioPayload(BaseModel):
    id: str = "portfolio_1"
    name: str = "Primary Portfolio"
    cashBalance: float = 0.0
    totalValue: float = 0.0
    holdings: List[HoldingPayload] = Field(default_factory=list)


class KnowledgeGraphBuildRequest(BaseModel):
    portfolios: List[PortfolioPayload] = Field(default_factory=list)
    assets: List[AssetPayload] = Field(default_factory=list)
    transactions: List[Dict[str, Any]] = Field(default_factory=list)


class SPARQLQueryRequest(BaseModel):
    query: Optional[str] = None
    template: Optional[str] = None
    custom_graph_data: Optional[KnowledgeGraphBuildRequest] = None


@router.post("/build")
def build_knowledge_graph(payload: KnowledgeGraphBuildRequest):
    """
    Builds and loads the RDF Knowledge Graph from portfolio and asset data.
    """
    global _semantic_knowledge_graph
    
    portfolios_data = [p.model_dump() for p in payload.portfolios]
    assets_data = [a.model_dump() for a in payload.assets]
    transactions_data = payload.transactions

    _semantic_knowledge_graph = RDFMappingService.build_knowledge_graph(
        portfolios=portfolios_data,
        assets=assets_data,
        transactions=transactions_data,
    )

    return {
        "status": "success",
        "message": "Knowledge Graph built successfully",
        "triples_count": len(_semantic_knowledge_graph),
    }


@router.get("/summary")
def get_knowledge_graph_summary():
    """
    Returns summary statistics of the current Semantic Knowledge Graph.
    """
    global _semantic_knowledge_graph
    triple_count = len(_semantic_knowledge_graph)
    
    # Query distinct classes and subjects
    stats = SPARQLEngine.execute_query(
        _semantic_knowledge_graph,
        """
        SELECT (COUNT(DISTINCT ?s) AS ?distinctEntities) (COUNT(DISTINCT ?class) AS ?distinctClasses)
        WHERE {
            ?s a ?class .
        }
        """
    )

    return {
        "status": "success",
        "triple_count": triple_count,
        "ontology": "FIBO (Financial Industry Business Ontology) + WealthOS Core",
        "namespaces": {
            "wos": "https://wealthos.io/ontology/core#",
            "fibo": "https://spec.edmcouncil.org/fibo/ontology/",
        },
        "stats": stats.get("rows", [{}])[0] if stats.get("rows") else {},
    }


def _get_active_or_db_graph() -> Graph:
    """Returns active knowledge graph or generates it from PostgreSQL database entities."""
    global _semantic_knowledge_graph
    if len(_semantic_knowledge_graph) > 0:
        return _semantic_knowledge_graph

    try:
        from db.database import SessionLocal
        from db.models import Portfolio, Holding, Asset, Account
        from sqlalchemy.orm import joinedload
        db = SessionLocal()
        query = db.query(Portfolio)
        if joinedload:
            query = query.options(joinedload(Portfolio.holdings).joinedload(Holding.asset), joinedload(Portfolio.account))
        db_ports = query.all()
        if db_ports:
            port_dicts = []
            for p in db_ports:
                cash_val = float(p.account.cash_balance) if (p.account and p.account.cash_balance is not None) else 0.0
                holdings_list = []
                total_mv = cash_val
                for h in p.holdings:
                    if not h.asset:
                        continue
                    curr_p = float(h.asset.current_price or 100.0)
                    qty = float(h.quantity or 0.0)
                    mv = qty * curr_p
                    total_mv += mv
                    holdings_list.append({
                        "symbol": h.asset.symbol,
                        "assetType": h.asset.asset_type,
                        "quantity": qty,
                        "currentPrice": curr_p,
                        "marketValue": round(mv, 2),
                        "avgCost": float(h.avg_cost or 0.0),
                        "sector": h.asset.sector,
                        "riskScore": float(h.asset.risk_score or 0.35),
                        "esgScore": float(h.asset.esg_score or 75.0),
                    })
                port_dicts.append({
                    "id": p.id,
                    "name": p.name,
                    "cashBalance": cash_val,
                    "totalValue": round(total_mv, 2),
                    "holdings": holdings_list,
                })
            db.close()
            _semantic_knowledge_graph = RDFMappingService.build_knowledge_graph(portfolios=port_dicts)
            return _semantic_knowledge_graph
        db.close()
    except Exception:
        pass

    # Baseline reference fallback when database is not yet populated
    reference_data = {
        "id": "p_main",
        "name": "Main Institutional Portfolio",
        "cashBalance": 5000.0,
        "totalValue": 25000.0,
        "holdings": [
            {"symbol": "AAPL", "assetType": "STOCK", "quantity": 50, "currentPrice": 195.0, "marketValue": 9750.0, "avgCost": 180.0},
            {"symbol": "NVDA", "assetType": "STOCK", "quantity": 30, "currentPrice": 125.0, "marketValue": 3750.0, "avgCost": 110.0},
            {"symbol": "BTC", "assetType": "CRYPTO", "quantity": 0.1, "currentPrice": 65000.0, "marketValue": 6500.0, "avgCost": 60000.0},
            {"symbol": "JNJ", "assetType": "STOCK", "quantity": 20, "currentPrice": 155.0, "marketValue": 3100.0, "avgCost": 150.0},
        ]
    }
    _semantic_knowledge_graph = RDFMappingService.build_knowledge_graph(portfolios=[reference_data])
    return _semantic_knowledge_graph


@router.get("/export")
def export_rdf(format: str = Query("turtle", pattern="^(turtle|ttl|json-ld|nt|xml)$")):
    """
    Exports the Knowledge Graph in W3C RDF formats (turtle, json-ld, nt, xml).
    """
    graph = _get_active_or_db_graph()
    serialized = RDFMappingService.serialize_graph(graph, format)
    return {
        "format": format,
        "triples_count": len(graph),
        "content": serialized,
    }


@router.post("/sparql")
def run_sparql_query(payload: SPARQLQueryRequest):
    """
    Executes a custom SPARQL query or a predefined institutional template.
    """
    global _semantic_knowledge_graph

    # If custom data is provided in request, build a transient graph
    target_graph = _semantic_knowledge_graph
    if payload.custom_graph_data:
        portfolios_data = [p.model_dump() for p in payload.custom_graph_data.portfolios]
        assets_data = [a.model_dump() for a in payload.custom_graph_data.assets]
        target_graph = RDFMappingService.build_knowledge_graph(
            portfolios=portfolios_data,
            assets=assets_data,
            transactions=payload.custom_graph_data.transactions,
        )
    elif len(target_graph) == 0:
        target_graph = _get_active_or_db_graph()

    if payload.template:
        result = SPARQLEngine.execute_template(target_graph, payload.template)
    elif payload.query:
        result = SPARQLEngine.execute_query(target_graph, payload.query)
    else:
        result = SPARQLEngine.execute_template(target_graph, "SECTOR_EXPOSURE")

    return {
        "status": "success",
        "result": result,
    }


@router.get("/templates")
def get_sparql_templates():
    """
    Returns available institutional SPARQL query templates.
    """
    return {
        "templates": [
            {
                "id": k,
                "name": k.replace("_", " ").title(),
                "query": v.strip(),
            }
            for k, v in SPARQL_TEMPLATES.items()
        ]
    }


@router.post("/validate-shacl")
def validate_knowledge_graph_shacl(payload: Optional[KnowledgeGraphBuildRequest] = None):
    """
    Executes W3C SHACL constraint validation against the Knowledge Graph
    and returns conformance status and data quality violation diagnostics.
    """
    global _semantic_knowledge_graph
    target_graph = _semantic_knowledge_graph

    if payload and (payload.portfolios or payload.assets):
        portfolios_data = [p.model_dump() for p in payload.portfolios]
        assets_data = [a.model_dump() for a in payload.assets]
        target_graph = RDFMappingService.build_knowledge_graph(
            portfolios=portfolios_data,
            assets=assets_data,
            transactions=payload.transactions,
        )
    elif len(target_graph) == 0:
        target_graph = _get_active_or_db_graph()

    report = SHACLValidationService.validate_graph(target_graph)
    return {
        "status": "success",
        "conforms": report["conforms"],
        "total_violations": report["total_violations"],
        "violations": report["violations"],
    }
