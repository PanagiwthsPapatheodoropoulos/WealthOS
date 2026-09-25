"""
WealthOS Apache Airflow Pipeline: Quantitative Risk Engine & Stress Testing
===========================================================================
Airflow DAG 03: Executes Value at Risk (VaR 95%, 99%), Conditional VaR (Expected Shortfall),
macro stress-testing scenarios, and automated risk limit alerts from database holdings.
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


def execute_extract_asset_exposures(**context):
    """[Bronze Tier] Raw Ingestion: Aggregate asset allocations across user accounts from database."""
    url = f"{WEALTHOS_API_URL}/api/v1/dags/wealthos_risk_stress_testing/tasks/task_extract_asset_exposures"
    print(f"[Airflow:DAG-03][Bronze] Extracting asset exposures from {url}...")
    resp = requests.post(url, json={"context": {}}, timeout=30)
    resp.raise_for_status()
    payload = resp.json()
    exposures = payload.get("exposures", {})
    print(f"[Airflow:DAG-03][Bronze] Extracted exposures for {len(exposures)} assets.")
    
    ti = context["ti"]
    ti.xcom_push(key="exposures", value=exposures)
    ti.xcom_push(key="context", value=payload.get("context", {}))
    return exposures


def execute_build_covariance_matrix(**context):
    """[Silver Tier] Quantitative Modeling: Build historical covariance matrix for active holdings."""
    ti = context["ti"]
    ctx = ti.xcom_pull(key="context", task_ids="extract_asset_exposures") or {}
    url = f"{WEALTHOS_API_URL}/api/v1/dags/wealthos_risk_stress_testing/tasks/task_build_covariance_matrix"
    print(f"[Airflow:DAG-03][Silver] Building covariance matrix via {url}...")
    resp = requests.post(url, json={"context": ctx}, timeout=30)
    resp.raise_for_status()
    payload = resp.json()
    symbols = payload.get("symbols", [])
    print(f"[Airflow:DAG-03][Silver] Covariance matrix built for {symbols}.")
    
    ti.xcom_push(key="symbols", value=symbols)
    ti.xcom_push(key="context", value=payload.get("context", {}))
    return symbols


def execute_calculate_var_cvar(**context):
    """[Silver Tier] Risk Analytics: Compute Parametric & Monte Carlo VaR (95%, 99%) and Expected Shortfall (CVaR)."""
    ti = context["ti"]
    ctx = ti.xcom_pull(key="context", task_ids="build_covariance_matrix") or {}
    url = f"{WEALTHOS_API_URL}/api/v1/dags/wealthos_risk_stress_testing/tasks/task_calculate_var_cvar"
    print(f"[Airflow:DAG-03][Silver] Calculating VaR & CVaR via {url}...")
    resp = requests.post(url, json={"context": ctx}, timeout=30)
    resp.raise_for_status()
    payload = resp.json()
    var_results = payload.get("var_results", {})
    print(f"[Airflow:DAG-03][Silver] VaR results computed: {var_results}")
    
    ti.xcom_push(key="var_results", value=var_results)
    ti.xcom_push(key="context", value=payload.get("context", {}))
    return var_results


def execute_run_macro_stress_scenarios(**context):
    """[Gold Tier] Scenario Replay: Apply macro factor shocks (2008 Crisis, 2020 Tech-Wreck, Rate Spike)."""
    ti = context["ti"]
    ctx = ti.xcom_pull(key="context", task_ids="calculate_var_cvar") or {}
    url = f"{WEALTHOS_API_URL}/api/v1/dags/wealthos_risk_stress_testing/tasks/task_run_macro_stress_scenarios"
    print(f"[Airflow:DAG-03][Gold] Running macro stress scenarios via {url}...")
    resp = requests.post(url, json={"context": ctx}, timeout=30)
    resp.raise_for_status()
    payload = resp.json()
    scenarios = payload.get("scenarios", [])
    print(f"[Airflow:DAG-03][Gold] Evaluated {len(scenarios)} macro stress scenarios.")
    
    ti.xcom_push(key="stress_scenarios", value=scenarios)
    ti.xcom_push(key="context", value=payload.get("context", {}))
    return scenarios


def execute_dispatch_risk_alerts(**context):
    """[Gold Tier] Executive Action: Dispatch alerts for portfolios exceeding risk thresholds."""
    ti = context["ti"]
    ctx = ti.xcom_pull(key="context", task_ids="run_macro_stress_scenarios") or {}
    url = f"{WEALTHOS_API_URL}/api/v1/dags/wealthos_risk_stress_testing/tasks/task_dispatch_risk_alerts"
    print(f"[Airflow:DAG-03][Gold] Dispatching risk alerts via {url}...")
    resp = requests.post(url, json={"context": ctx}, timeout=30)
    resp.raise_for_status()
    payload = resp.json()
    summary = payload.get("summary", {})
    print(f"[Airflow:DAG-03][Gold] Risk dispatch summary: {summary}")
    
    ti.xcom_push(key="execution_summary", value=summary)
    return summary


with DAG(
    dag_id="wealthos_risk_stress_testing",
    default_args=DEFAULT_ARGS,
    description="[Medallion: Bronze -> Silver -> Gold] Monte Carlo & Parametric VaR, macro shocks, concentration alerts",
    schedule_interval="0 22 * * 1-5",  # Mon-Fri 22:00 UTC
    start_date=datetime(2026, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=["wealthos", "medallion-architecture", "bronze", "silver", "gold", "risk", "monte-carlo", "var"],
) as dag:

    # Bronze Tier: Cross-Portfolio Asset Exposures
    t1_extract_exposures = PythonOperator(
        task_id="extract_asset_exposures",
        python_callable=execute_extract_asset_exposures,
        provide_context=True,
    )

    # Silver Tier: Covariance Modeling & VaR/CVaR Simulation
    t2_build_covariance = PythonOperator(
        task_id="build_covariance_matrix",
        python_callable=execute_build_covariance_matrix,
        provide_context=True,
    )

    t3_calc_var = PythonOperator(
        task_id="calculate_var_cvar",
        python_callable=execute_calculate_var_cvar,
        provide_context=True,
    )

    # Gold Tier: Macro Stress Testing & Automated Risk Limit Alerts
    t4_stress_scenarios = PythonOperator(
        task_id="run_macro_stress_scenarios",
        python_callable=execute_run_macro_stress_scenarios,
        provide_context=True,
    )

    t5_dispatch_alerts = PythonOperator(
        task_id="dispatch_risk_alerts",
        python_callable=execute_dispatch_risk_alerts,
        provide_context=True,
    )

    # Medallion Lineage (Bronze >> Silver >> Gold)
    t1_extract_exposures >> t2_build_covariance >> t3_calc_var >> t4_stress_scenarios >> t5_dispatch_alerts

