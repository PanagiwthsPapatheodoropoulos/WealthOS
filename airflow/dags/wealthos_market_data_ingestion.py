"""
WealthOS Apache Airflow Pipeline: Market Data Ingestion & Normalization
========================================================================
Airflow DAG 01: Ingests OHLCV market quotes, computes rolling indicators,
detects statistical price/volume anomalies, and updates PostgreSQL/TimescaleDB.
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


def execute_fetch_active_universe(**context):
    """[Bronze Tier] Raw Ingestion: Fetch active ticker universe from database or asset registry."""
    url = f"{WEALTHOS_API_URL}/api/v1/dags/wealthos_market_data_ingestion/tasks/task_fetch_active_universe"
    print(f"[Airflow:DAG-01][Bronze] Requesting active ticker universe from {url}...")
    resp = requests.post(url, json={"context": {}}, timeout=30)
    resp.raise_for_status()
    payload = resp.json()
    symbols = payload.get("symbols", [])
    print(f"[Airflow:DAG-01][Bronze] Successfully fetched {len(symbols)} tickers: {symbols}")
    
    # Push to XCom
    ti = context["ti"]
    ti.xcom_push(key="active_symbols", value=symbols)
    ti.xcom_push(key="context", value=payload.get("context", {}))
    return symbols


def execute_ingest_ohlcv(**context):
    """[Bronze Tier] Raw Ingestion: Ingest daily OHLCV prices and volume for active universe."""
    ti = context["ti"]
    ctx = ti.xcom_pull(key="context", task_ids="fetch_active_universe") or {}
    url = f"{WEALTHOS_API_URL}/api/v1/dags/wealthos_market_data_ingestion/tasks/task_ingest_ohlcv"
    print(f"[Airflow:DAG-01][Bronze] Ingesting OHLCV data from {url}...")
    resp = requests.post(url, json={"context": ctx}, timeout=30)
    resp.raise_for_status()
    payload = resp.json()
    records_count = payload.get("records_count", 0)
    print(f"[Airflow:DAG-01][Bronze] Ingested OHLCV records for {records_count} assets.")
    
    ti.xcom_push(key="records_count", value=records_count)
    ti.xcom_push(key="context", value=payload.get("context", {}))
    return records_count


def execute_compute_technical_indicators(**context):
    """[Silver Tier] Data Enrichment: Compute rolling technical indicators (SMA-20, SMA-50, Daily Returns, Volatility)."""
    ti = context["ti"]
    ctx = ti.xcom_pull(key="context", task_ids="ingest_ohlcv") or {}
    url = f"{WEALTHOS_API_URL}/api/v1/dags/wealthos_market_data_ingestion/tasks/task_compute_technical_indicators"
    print(f"[Airflow:DAG-01][Silver] Computing technical indicators from {url}...")
    resp = requests.post(url, json={"context": ctx}, timeout=30)
    resp.raise_for_status()
    payload = resp.json()
    indicators_count = payload.get("indicators_count", 0)
    print(f"[Airflow:DAG-01][Silver] Computed indicators for {indicators_count} assets.")
    
    ti.xcom_push(key="indicators_count", value=indicators_count)
    ti.xcom_push(key="context", value=payload.get("context", {}))
    return indicators_count


def execute_detect_anomalies(**context):
    """[Silver Tier] Quality & Validation: Detect statistical anomalies (Price jumps >= 4% or volume surges)."""
    ti = context["ti"]
    ctx = ti.xcom_pull(key="context", task_ids="compute_technical_indicators") or {}
    url = f"{WEALTHOS_API_URL}/api/v1/dags/wealthos_market_data_ingestion/tasks/task_detect_anomalies"
    print(f"[Airflow:DAG-01][Silver] Running anomaly detection from {url}...")
    resp = requests.post(url, json={"context": ctx}, timeout=30)
    resp.raise_for_status()
    payload = resp.json()
    anomalies = payload.get("anomalies", [])
    print(f"[Airflow:DAG-01][Silver] Flagged {len(anomalies)} price anomalies.")
    
    ti.xcom_push(key="anomalies_flagged", value=len(anomalies))
    ti.xcom_push(key="context", value=payload.get("context", {}))
    return len(anomalies)


def execute_persist_market_data(**context):
    """[Gold Tier] Curated Analytics: Persist validated market data & anomalies into PostgreSQL/TimescaleDB."""
    ti = context["ti"]
    ctx = ti.xcom_pull(key="context", task_ids="detect_anomalies") or {}
    url = f"{WEALTHOS_API_URL}/api/v1/dags/wealthos_market_data_ingestion/tasks/task_persist_market_data"
    print(f"[Airflow:DAG-01][Gold] Persisting market data from {url}...")
    resp = requests.post(url, json={"context": ctx}, timeout=30)
    resp.raise_for_status()
    payload = resp.json()
    summary = payload.get("summary", {})
    print(f"[Airflow:DAG-01][Gold] Persistence summary: {summary}")
    
    ti.xcom_push(key="execution_summary", value=summary)
    return summary


with DAG(
    dag_id="wealthos_market_data_ingestion",
    default_args=DEFAULT_ARGS,
    description="[Medallion: Bronze -> Silver -> Gold] Ingests OHLCV quotes, computes indicators, flags anomalies, updates TimescaleDB",
    schedule_interval="0 18 * * 1-5",  # Mon-Fri 18:00 UTC
    start_date=datetime(2026, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=["wealthos", "medallion-architecture", "bronze", "silver", "gold", "market-data", "etl"],
) as dag:

    # Bronze Tier: Ingestion & Raw Extraction
    t1_fetch_universe = PythonOperator(
        task_id="fetch_active_universe",
        python_callable=execute_fetch_active_universe,
        provide_context=True,
    )

    t2_ingest_ohlcv = PythonOperator(
        task_id="ingest_ohlcv",
        python_callable=execute_ingest_ohlcv,
        provide_context=True,
    )

    # Silver Tier: Quality, Cleansing & Statistical Enrichment
    t3_compute_indicators = PythonOperator(
        task_id="compute_technical_indicators",
        python_callable=execute_compute_technical_indicators,
        provide_context=True,
    )

    t4_detect_anomalies = PythonOperator(
        task_id="detect_anomalies",
        python_callable=execute_detect_anomalies,
        provide_context=True,
    )

    # Gold Tier: Business Analytics & Curated Storage
    t5_persist_data = PythonOperator(
        task_id="persist_market_data",
        python_callable=execute_persist_market_data,
        provide_context=True,
    )

    # Medallion Architecture Lineage (Bronze >> Silver >> Gold)
    t1_fetch_universe >> t2_ingest_ohlcv >> t3_compute_indicators >> t4_detect_anomalies >> t5_persist_data

