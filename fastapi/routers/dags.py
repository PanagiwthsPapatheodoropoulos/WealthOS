"""
WealthOS FastAPI Data Engineering & Airflow Pipeline Router
Exposes individual task execution endpoints and full DAG orchestrator hooks for Apache Airflow.
"""

from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from dags.dag_01_market_data_ingestion import MarketDataIngestionDAG
from dags.dag_02_eod_portfolio_valuation import EODPortfolioValuationDAG
from dags.dag_03_risk_stress_testing import RiskStressTestingDAG
from dags.dag_04_semantic_knowledge_graph_sync import SemanticKnowledgeGraphSyncDAG
from auth import get_optional_user_id

router = APIRouter()

REGISTERED_DAGS = {
    MarketDataIngestionDAG.DAG_ID: MarketDataIngestionDAG,
    EODPortfolioValuationDAG.DAG_ID: EODPortfolioValuationDAG,
    RiskStressTestingDAG.DAG_ID: RiskStressTestingDAG,
    SemanticKnowledgeGraphSyncDAG.DAG_ID: SemanticKnowledgeGraphSyncDAG,
}


class DAGRunRequest(BaseModel):
    parameters: Optional[Dict[str, Any]] = Field(default_factory=dict)


class TaskRunRequest(BaseModel):
    context: Optional[Dict[str, Any]] = Field(default_factory=dict)


@router.get("")
@router.get("/")
def list_dags():
    """List all registered WealthOS batch pipelines and their Airflow orchestration metadata."""
    dag_list = []
    for dag_id, dag_cls in REGISTERED_DAGS.items():
        dag_list.append({
            "dag_id": dag_id,
            "description": getattr(dag_cls, "DESCRIPTION", ""),
            "schedule_interval": getattr(dag_cls, "SCHEDULE_INTERVAL", "@daily"),
            "owner": "wealthos",
            "tags": ["wealthos", "etl", "airflow"],
            "status": "ACTIVE",
            "airflow_webserver_url": "http://localhost:8085",
        })
    return {"status": "success", "count": len(dag_list), "data": dag_list}


@router.get("/health")
def airflow_health():
    """Returns Airflow integration status and pipeline readiness."""
    return {
        "status": "UP",
        "orchestrator": "Apache Airflow 2.9",
        "registered_dags": list(REGISTERED_DAGS.keys()),
        "airflow_web_ui": "http://localhost:8085",
    }


@router.post("/{dag_id}/run")
def trigger_dag(dag_id: str, request: DAGRunRequest = DAGRunRequest()):
    """Triggers the full pipeline execution for the specified DAG."""
    if dag_id not in REGISTERED_DAGS:
        raise HTTPException(
            status_code=404,
            detail=f"DAG '{dag_id}' not found. Available: {list(REGISTERED_DAGS.keys())}"
        )
    try:
        dag_cls = REGISTERED_DAGS[dag_id]
        result = dag_cls.run()
        return {
            "status": "success",
            "dag_id": dag_id,
            "execution_result": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline execution error in {dag_id}: {str(e)}")


# -----------------------------------------------------------------------------
# DAG 01: Granular Task Endpoints
# -----------------------------------------------------------------------------
@router.post("/wealthos_market_data_ingestion/tasks/task_fetch_active_universe")
def run_dag01_task1(request: TaskRunRequest = TaskRunRequest()):
    ctx = request.context or {}
    symbols = MarketDataIngestionDAG.task_fetch_active_universe(ctx)
    return {"status": "SUCCESS", "symbols": symbols, "context": ctx}


@router.post("/wealthos_market_data_ingestion/tasks/task_ingest_ohlcv")
def run_dag01_task2(request: TaskRunRequest = TaskRunRequest()):
    ctx = request.context or {}
    if "symbols" not in ctx:
        MarketDataIngestionDAG.task_fetch_active_universe(ctx)
    data = MarketDataIngestionDAG.task_ingest_ohlcv(ctx)
    return {"status": "SUCCESS", "records_count": len(data), "data": data, "context": ctx}


@router.post("/wealthos_market_data_ingestion/tasks/task_compute_technical_indicators")
def run_dag01_task3(request: TaskRunRequest = TaskRunRequest()):
    ctx = request.context or {}
    if "ohlcv_data" not in ctx:
        MarketDataIngestionDAG.task_fetch_active_universe(ctx)
        MarketDataIngestionDAG.task_ingest_ohlcv(ctx)
    indicators = MarketDataIngestionDAG.task_compute_technical_indicators(ctx)
    return {"status": "SUCCESS", "indicators_count": len(indicators), "indicators": indicators, "context": ctx}


@router.post("/wealthos_market_data_ingestion/tasks/task_detect_anomalies")
def run_dag01_task4(request: TaskRunRequest = TaskRunRequest()):
    ctx = request.context or {}
    if "indicators" not in ctx:
        MarketDataIngestionDAG.task_fetch_active_universe(ctx)
        MarketDataIngestionDAG.task_ingest_ohlcv(ctx)
        MarketDataIngestionDAG.task_compute_technical_indicators(ctx)
    anomalies = MarketDataIngestionDAG.task_detect_anomalies(ctx)
    return {"status": "SUCCESS", "anomalies_flagged": len(anomalies), "anomalies": anomalies, "context": ctx}


@router.post("/wealthos_market_data_ingestion/tasks/task_persist_market_data")
def run_dag01_task5(request: TaskRunRequest = TaskRunRequest()):
    ctx = request.context or {}
    if "ohlcv_data" not in ctx:
        MarketDataIngestionDAG.task_fetch_active_universe(ctx)
        MarketDataIngestionDAG.task_ingest_ohlcv(ctx)
        MarketDataIngestionDAG.task_compute_technical_indicators(ctx)
        MarketDataIngestionDAG.task_detect_anomalies(ctx)
    summary = MarketDataIngestionDAG.task_persist_market_data(ctx)
    return {"status": "SUCCESS", "summary": summary, "context": ctx}


# -----------------------------------------------------------------------------
# DAG 02: Granular Task Endpoints
# -----------------------------------------------------------------------------
@router.post("/wealthos_eod_portfolio_valuation/tasks/task_extract_portfolios")
def run_dag02_task1(request: TaskRunRequest = TaskRunRequest()):
    ctx = request.context or {}
    portfolios = EODPortfolioValuationDAG.task_extract_portfolios(ctx)
    return {"status": "SUCCESS", "portfolio_count": len(portfolios), "portfolios": portfolios, "context": ctx}


@router.post("/wealthos_eod_portfolio_valuation/tasks/task_mark_to_market_valuation")
def run_dag02_task2(request: TaskRunRequest = TaskRunRequest()):
    ctx = request.context or {}
    if "portfolios" not in ctx:
        EODPortfolioValuationDAG.task_extract_portfolios(ctx)
    valued = EODPortfolioValuationDAG.task_mark_to_market_valuation(ctx)
    return {"status": "SUCCESS", "valued_count": len(valued), "data": valued, "context": ctx}


@router.post("/wealthos_eod_portfolio_valuation/tasks/task_compute_performance_metrics")
def run_dag02_task3(request: TaskRunRequest = TaskRunRequest()):
    ctx = request.context or {}
    if "valued_portfolios" not in ctx:
        EODPortfolioValuationDAG.task_extract_portfolios(ctx)
        EODPortfolioValuationDAG.task_mark_to_market_valuation(ctx)
    analyzed = EODPortfolioValuationDAG.task_compute_performance_metrics(ctx)
    return {"status": "SUCCESS", "analyzed_count": len(analyzed), "data": analyzed, "context": ctx}


@router.post("/wealthos_eod_portfolio_valuation/tasks/task_persist_eod_snapshots")
def run_dag02_task4(request: TaskRunRequest = TaskRunRequest()):
    ctx = request.context or {}
    if "analyzed_portfolios" not in ctx:
        EODPortfolioValuationDAG.task_extract_portfolios(ctx)
        EODPortfolioValuationDAG.task_mark_to_market_valuation(ctx)
        EODPortfolioValuationDAG.task_compute_performance_metrics(ctx)
    summary = EODPortfolioValuationDAG.task_persist_eod_snapshots(ctx)
    return {"status": "SUCCESS", "summary": summary, "context": ctx}


# -----------------------------------------------------------------------------
# DAG 03: Granular Task Endpoints
# -----------------------------------------------------------------------------
def _safe_ctx(ctx: dict) -> dict:
    """Filter out non-JSON-serializable objects like rdflib.Graph or numpy arrays."""
    return {k: v for k, v in ctx.items() if k != "rdf_graph"}


@router.post("/wealthos_risk_stress_testing/tasks/task_extract_asset_exposures")
def run_dag03_task1(request: TaskRunRequest = TaskRunRequest()):
    ctx = request.context or {}
    exposures = RiskStressTestingDAG.task_extract_asset_exposures(ctx)
    return {"status": "SUCCESS", "exposures": exposures, "context": _safe_ctx(ctx)}


@router.post("/wealthos_risk_stress_testing/tasks/task_build_covariance_matrix")
def run_dag03_task2(request: TaskRunRequest = TaskRunRequest()):
    ctx = request.context or {}
    if "portfolio_risk_input" not in ctx:
        RiskStressTestingDAG.task_extract_asset_exposures(ctx)
    cov = RiskStressTestingDAG.task_build_covariance_matrix(ctx)
    return {"status": "SUCCESS", "symbols": ctx.get("symbols", []), "context": _safe_ctx(ctx)}


@router.post("/wealthos_risk_stress_testing/tasks/task_calculate_var_cvar")
def run_dag03_task3(request: TaskRunRequest = TaskRunRequest()):
    ctx = request.context or {}
    if "portfolio_risk_input" not in ctx:
        RiskStressTestingDAG.task_extract_asset_exposures(ctx)
        RiskStressTestingDAG.task_build_covariance_matrix(ctx)
    var_results = RiskStressTestingDAG.task_calculate_var_cvar(ctx)
    return {"status": "SUCCESS", "var_results": var_results, "context": _safe_ctx(ctx)}


@router.post("/wealthos_risk_stress_testing/tasks/task_run_macro_stress_scenarios")
def run_dag03_task4(request: TaskRunRequest = TaskRunRequest()):
    ctx = request.context or {}
    if "var_metrics" not in ctx:
        RiskStressTestingDAG.task_extract_asset_exposures(ctx)
        RiskStressTestingDAG.task_build_covariance_matrix(ctx)
        RiskStressTestingDAG.task_calculate_var_cvar(ctx)
    scenarios = RiskStressTestingDAG.task_run_macro_stress_scenarios(ctx)
    return {"status": "SUCCESS", "scenarios": scenarios, "context": _safe_ctx(ctx)}


@router.post("/wealthos_risk_stress_testing/tasks/task_dispatch_risk_alerts")
def run_dag03_task5(request: TaskRunRequest = TaskRunRequest()):
    ctx = request.context or {}
    if "stress_results" not in ctx:
        RiskStressTestingDAG.task_extract_asset_exposures(ctx)
        RiskStressTestingDAG.task_build_covariance_matrix(ctx)
        RiskStressTestingDAG.task_calculate_var_cvar(ctx)
        RiskStressTestingDAG.task_run_macro_stress_scenarios(ctx)
    summary = RiskStressTestingDAG.task_dispatch_risk_alerts(ctx)
    return {"status": "SUCCESS", "summary": summary, "context": _safe_ctx(ctx)}


# -----------------------------------------------------------------------------
# DAG 04: Granular Task Endpoints
# -----------------------------------------------------------------------------
@router.post("/wealthos_semantic_kg_sync/tasks/task_extract_relational_entities")
def run_dag04_task1(request: TaskRunRequest = TaskRunRequest()):
    ctx = request.context or {}
    entities = SemanticKnowledgeGraphSyncDAG.task_extract_relational_entities(ctx)
    return {"status": "SUCCESS", "entities": entities, "context": _safe_ctx(ctx)}


@router.post("/wealthos_semantic_kg_sync/tasks/task_map_fibo_triples")
def run_dag04_task2(request: TaskRunRequest = TaskRunRequest()):
    ctx = request.context or {}
    if "raw_data" not in ctx:
        SemanticKnowledgeGraphSyncDAG.task_extract_relational_entities(ctx)
    graph = SemanticKnowledgeGraphSyncDAG.task_map_fibo_triples(ctx)
    triples_count = len(graph)
    safe = _safe_ctx(ctx)
    safe["triples_count"] = triples_count
    return {"status": "SUCCESS", "triples_count": triples_count, "context": safe}


@router.post("/wealthos_semantic_kg_sync/tasks/task_validate_shacl_shapes")
def run_dag04_task3(request: TaskRunRequest = TaskRunRequest()):
    ctx = request.context or {}
    if "rdf_graph" not in ctx:
        SemanticKnowledgeGraphSyncDAG.task_extract_relational_entities(ctx)
        SemanticKnowledgeGraphSyncDAG.task_map_fibo_triples(ctx)
    SemanticKnowledgeGraphSyncDAG.task_validate_owl_consistency(ctx)
    val = SemanticKnowledgeGraphSyncDAG.task_validate_shacl_shapes(ctx)
    return {"status": "SUCCESS", "conforms": val.get("conforms", True), "context": _safe_ctx(ctx)}


@router.post("/wealthos_semantic_kg_sync/tasks/task_sync_triplestore")
def run_dag04_task4(request: TaskRunRequest = TaskRunRequest()):
    ctx = request.context or {}
    if "rdf_graph" not in ctx:
        SemanticKnowledgeGraphSyncDAG.task_extract_relational_entities(ctx)
        SemanticKnowledgeGraphSyncDAG.task_map_fibo_triples(ctx)
        SemanticKnowledgeGraphSyncDAG.task_validate_owl_consistency(ctx)
        SemanticKnowledgeGraphSyncDAG.task_validate_shacl_shapes(ctx)
    sync = SemanticKnowledgeGraphSyncDAG.task_sync_triplestore(ctx)
    return {"status": "SUCCESS", "sync": sync, "context": _safe_ctx(ctx)}


@router.post("/wealthos_semantic_kg_sync/tasks/task_materialize_sparql_views")
def run_dag04_task5(request: TaskRunRequest = TaskRunRequest()):
    ctx = request.context or {}
    if "rdf_graph" not in ctx:
        SemanticKnowledgeGraphSyncDAG.task_extract_relational_entities(ctx)
        SemanticKnowledgeGraphSyncDAG.task_map_fibo_triples(ctx)
        SemanticKnowledgeGraphSyncDAG.task_validate_owl_consistency(ctx)
        SemanticKnowledgeGraphSyncDAG.task_validate_shacl_shapes(ctx)
        SemanticKnowledgeGraphSyncDAG.task_sync_triplestore(ctx)
    summary = SemanticKnowledgeGraphSyncDAG.task_materialize_sparql_views(ctx)
    return {"status": "SUCCESS", "summary": summary, "context": _safe_ctx(ctx)}

