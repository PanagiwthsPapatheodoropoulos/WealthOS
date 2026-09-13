import pytest
from dags.dag_01_market_data_ingestion import MarketDataIngestionDAG
from dags.dag_02_eod_portfolio_valuation import EODPortfolioValuationDAG
from dags.dag_03_risk_stress_testing import RiskStressTestingDAG
from dags.dag_04_semantic_knowledge_graph_sync import SemanticKnowledgeGraphSyncDAG
from dags.dag_runner import REGISTERED_DAGS, run_dag, run_all_dags


def test_market_data_dag_execution():
    result = MarketDataIngestionDAG.run()
    assert result["status"] == "SUCCESS"
    assert result["records_persisted"] > 0


def test_eod_portfolio_valuation_dag():
    result = EODPortfolioValuationDAG.run()
    assert result["status"] == "SUCCESS"
    assert result["snapshots_created"] > 0


def test_risk_stress_testing_dag():
    result = RiskStressTestingDAG.run()
    assert result["status"] == "SUCCESS"
    assert "var_metrics" in result
    assert len(result["stress_scenarios"]) == 4


def test_semantic_kg_sync_dag():
    result = SemanticKnowledgeGraphSyncDAG.run()
    assert result["status"] == "SUCCESS"
    assert result["triples_synced"] > 0


def test_dag_runner_registry():
    assert len(REGISTERED_DAGS) == 4
    results = run_all_dags()
    assert len(results) == 4
    for dag_id, res in results.items():
        assert res["status"] == "SUCCESS"
