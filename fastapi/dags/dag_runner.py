"""
WealthOS Data Engineering DAG Runner & Orchestrator
CLI and programmatic runner to trigger and monitor all batch data engineering pipelines.
"""

import sys
import os
import argparse
from typing import Dict, Any

# Ensure parent directory is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from dags.dag_01_market_data_ingestion import MarketDataIngestionDAG
from dags.dag_02_eod_portfolio_valuation import EODPortfolioValuationDAG
from dags.dag_03_risk_stress_testing import RiskStressTestingDAG
from dags.dag_04_semantic_knowledge_graph_sync import SemanticKnowledgeGraphSyncDAG


REGISTERED_DAGS = {
    MarketDataIngestionDAG.DAG_ID: MarketDataIngestionDAG,
    EODPortfolioValuationDAG.DAG_ID: EODPortfolioValuationDAG,
    RiskStressTestingDAG.DAG_ID: RiskStressTestingDAG,
    SemanticKnowledgeGraphSyncDAG.DAG_ID: SemanticKnowledgeGraphSyncDAG,
}


def list_dags():
    print("=" * 70)
    print("WealthOS Data Engineering Pipelines (DAGs)")
    print("=" * 70)
    for dag_id, dag_cls in REGISTERED_DAGS.items():
        print(f"• DAG ID:   {dag_id}")
        print(f"  Schedule: {dag_cls.SCHEDULE_INTERVAL}")
        print(f"  Desc:     {dag_cls.DESCRIPTION}")
        print("-" * 70)


def run_dag(dag_id: str) -> Dict[str, Any]:
    if dag_id not in REGISTERED_DAGS:
        raise ValueError(f"Unknown DAG '{dag_id}'. Available DAGs: {list(REGISTERED_DAGS.keys())}")
    dag_cls = REGISTERED_DAGS[dag_id]
    return dag_cls.run()


def run_all_dags() -> Dict[str, Any]:
    print(">>> Executing All WealthOS Batch Pipelines in Dependency Order <<<")
    results = {}
    for dag_id, dag_cls in REGISTERED_DAGS.items():
        results[dag_id] = dag_cls.run()
    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="WealthOS Data Engineering DAG Runner")
    parser.add_argument("--list", action="store_true", help="List all registered DAG pipelines")
    parser.add_argument("--run", type=str, help="Run a specific DAG by ID")
    parser.add_argument("--run-all", action="store_true", help="Run all DAGs in sequence")

    args = parser.parse_args()

    if args.list:
        list_dags()
    elif args.run:
        run_dag(args.run)
    elif args.run_all:
        run_all_dags()
    else:
        list_dags()
