"""
WealthOS Apache Airflow Pipeline: End-of-Day Portfolio Valuation & CQRS Snapshots
================================================================================
Airflow DAG 02: Recalculates end-of-day portfolio valuations from PostgreSQL records,
computes rolling performance metrics (Sharpe ratio, Max Drawdown), and updates CQRS read snapshots.
"""

from datetime import datetime, timedelta
import os
import requests
from airflow import DAG
from airflow.operators.python import PythonOperator

DEFAULT_ARGS = {
    "owner": "wealthos",
    "depends_on_past": False,
    "email_on_failure": False,
    "email_on_retry": False,
    "retries": 2,
    "retry_delay": timedelta(seconds=15),
}

WEALTHOS_API_URL = os.getenv("WEALTHOS_API_URL")
if not WEALTHOS_API_URL:
    raise ValueError("WEALTHOS_API_URL environment variable is required")


def execute_extract_portfolios(**context):
    """[Bronze Tier] Raw Ingestion: Extract active portfolios and positions from PostgreSQL database."""
    url = f"{WEALTHOS_API_URL}/api/v1/dags/wealthos_eod_portfolio_valuation/tasks/task_extract_portfolios"
    print(f"[Airflow:DAG-02][Bronze] Extracting portfolios from {url}...")
    resp = requests.post(url, json={"context": {}}, timeout=30)
    resp.raise_for_status()
    payload = resp.json()
    count = payload.get("portfolio_count", 0)
    print(f"[Airflow:DAG-02][Bronze] Extracted {count} portfolios.")
    
    ti = context["ti"]
    ti.xcom_push(key="portfolio_count", value=count)
    ti.xcom_push(key="context", value=payload.get("context", {}))
    return count


def execute_mark_to_market_valuation(**context):
    """[Silver Tier] Data Enrichment: Calculate Mark-to-Market holdings value and total NAV."""
    ti = context["ti"]
    ctx = ti.xcom_pull(key="context", task_ids="extract_portfolios") or {}
    url = f"{WEALTHOS_API_URL}/api/v1/dags/wealthos_eod_portfolio_valuation/tasks/task_mark_to_market_valuation"
    print(f"[Airflow:DAG-02][Silver] Performing mark-to-market valuation via {url}...")
    resp = requests.post(url, json={"context": ctx}, timeout=30)
    resp.raise_for_status()
    payload = resp.json()
    valued_count = payload.get("valued_count", 0)
    print(f"[Airflow:DAG-02][Silver] Valued {valued_count} portfolios.")
    
    ti.xcom_push(key="valued_count", value=valued_count)
    ti.xcom_push(key="context", value=payload.get("context", {}))
    return valued_count


def execute_compute_performance_metrics(**context):
    """[Gold Tier] Curated Analytics: Compute rolling performance metrics (Sharpe ratio, Max Drawdown)."""
    ti = context["ti"]
    ctx = ti.xcom_pull(key="context", task_ids="mark_to_market_valuation") or {}
    url = f"{WEALTHOS_API_URL}/api/v1/dags/wealthos_eod_portfolio_valuation/tasks/task_compute_performance_metrics"
    print(f"[Airflow:DAG-02][Gold] Computing performance metrics via {url}...")
    resp = requests.post(url, json={"context": ctx}, timeout=30)
    resp.raise_for_status()
    payload = resp.json()
    analyzed_count = payload.get("analyzed_count", 0)
    print(f"[Airflow:DAG-02][Gold] Analyzed {analyzed_count} portfolios.")
    
    ti.xcom_push(key="analyzed_count", value=analyzed_count)
    ti.xcom_push(key="context", value=payload.get("context", {}))
    return analyzed_count


def execute_persist_eod_snapshots(**context):
    """[Gold Tier] CQRS Projections: Persist immutable EOD valuation snapshots to database."""
    ti = context["ti"]
    ctx = ti.xcom_pull(key="context", task_ids="compute_performance_metrics") or {}
    url = f"{WEALTHOS_API_URL}/api/v1/dags/wealthos_eod_portfolio_valuation/tasks/task_persist_eod_snapshots"
    print(f"[Airflow:DAG-02][Gold] Persisting EOD snapshots via {url}...")
    resp = requests.post(url, json={"context": ctx}, timeout=30)
    resp.raise_for_status()
    payload = resp.json()
    summary = payload.get("summary", {})
    print(f"[Airflow:DAG-02][Gold] EOD Persistence summary: {summary}")
    
    ti.xcom_push(key="execution_summary", value=summary)
    return summary


with DAG(
    dag_id="wealthos_eod_portfolio_valuation",
    default_args=DEFAULT_ARGS,
    description="[Medallion: Bronze -> Silver -> Gold] EOD valuations, Sharpe ratio, max drawdown, and CQRS snapshots",
    schedule_interval="30 21 * * 1-5",  # Mon-Fri 21:30 UTC
    start_date=datetime(2026, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=["wealthos", "medallion-architecture", "bronze", "silver", "gold", "portfolio", "valuation", "cqrs"],
) as dag:

    # Bronze Tier: Portfolio Extraction
    t1_extract_portfolios = PythonOperator(
        task_id="extract_portfolios",
        python_callable=execute_extract_portfolios,
        provide_context=True,
    )

    # Silver Tier: Mark-to-Market Valuation & Unrealized PnL
    t2_mark_to_market = PythonOperator(
        task_id="mark_to_market_valuation",
        python_callable=execute_mark_to_market_valuation,
        provide_context=True,
    )

    # Gold Tier: Analytical Metrics (Sharpe, Max Drawdown) & CQRS Projections
    t3_compute_metrics = PythonOperator(
        task_id="compute_performance_metrics",
        python_callable=execute_compute_performance_metrics,
        provide_context=True,
    )

    t4_persist_snapshots = PythonOperator(
        task_id="persist_eod_snapshots",
        python_callable=execute_persist_eod_snapshots,
        provide_context=True,
    )

    # Medallion Lineage (Bronze >> Silver >> Gold)
    t1_extract_portfolios >> t2_mark_to_market >> t3_compute_metrics >> t4_persist_snapshots

