"""
WealthOS Apache Airflow Pipeline: Semantic Knowledge Graph & FIBO RDF ETL Pipeline
==================================================================================
Airflow DAG 04: Extracts SQL entities, transforms to W3C FIBO RDF Triples,
validates OWL and SHACL shape axioms, syncs Triplestore, and materializes SPARQL analytical views.
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


def execute_extract_relational_entities(**context):
    """[Bronze Tier] Raw Ingestion: Extract relational records (assets, portfolios, positions, transactions) from PostgreSQL."""
    url = f"{WEALTHOS_API_URL}/api/v1/dags/wealthos_semantic_kg_sync/tasks/task_extract_relational_entities"
    print(f"[Airflow:DAG-04][Bronze] Extracting relational entities from {url}...")
    resp = requests.post(url, json={"context": {}}, timeout=30)
    resp.raise_for_status()
    payload = resp.json()
    entities = payload.get("entities", {})
    print(f"[Airflow:DAG-04][Bronze] Extracted entities: {len(entities.get('assets', []))} assets, {len(entities.get('portfolios', []))} portfolios.")
    
    ti = context["ti"]
    ti.xcom_push(key="entities", value=entities)
    ti.xcom_push(key="context", value=payload.get("context", {}))
    return entities


def execute_map_fibo_triples(**context):
    """[Silver Tier] Semantic Transformation: Transform relational entities into W3C FIBO-compliant RDF Triples."""
    ti = context["ti"]
    ctx = ti.xcom_pull(key="context", task_ids="extract_relational_entities") or {}
    url = f"{WEALTHOS_API_URL}/api/v1/dags/wealthos_semantic_kg_sync/tasks/task_map_fibo_triples"
    print(f"[Airflow:DAG-04][Silver] Mapping FIBO RDF triples via {url}...")
    resp = requests.post(url, json={"context": ctx}, timeout=30)
    resp.raise_for_status()
    payload = resp.json()
    triples_count = payload.get("triples_count", 0)
    print(f"[Airflow:DAG-04][Silver] Generated {triples_count} RDF triples.")
    
    ti.xcom_push(key="triples_count", value=triples_count)
    ti.xcom_push(key="context", value=payload.get("context", {}))
    return triples_count


def execute_validate_shacl_shapes(**context):
    """[Silver Tier] Data Governance & Quality: Validate Knowledge Graph against W3C SHACL Shapes & OWL axioms."""
    ti = context["ti"]
    ctx = ti.xcom_pull(key="context", task_ids="map_fibo_triples") or {}
    url = f"{WEALTHOS_API_URL}/api/v1/dags/wealthos_semantic_kg_sync/tasks/task_validate_shacl_shapes"
    print(f"[Airflow:DAG-04][Silver] Validating SHACL shapes via {url}...")
    resp = requests.post(url, json={"context": ctx}, timeout=30)
    resp.raise_for_status()
    payload = resp.json()
    conforms = payload.get("conforms", True)
    print(f"[Airflow:DAG-04][Silver] SHACL validation complete. Conforms: {conforms}.")
    
    ti.xcom_push(key="conforms", value=conforms)
    ti.xcom_push(key="context", value=payload.get("context", {}))
    return conforms


def execute_sync_triplestore(**context):
    """[Gold Tier] Semantic Materialization: Synchronize validated triples to In-Memory / Persistent Triplestore."""
    ti = context["ti"]
    ctx = ti.xcom_pull(key="context", task_ids="validate_shacl_shapes") or {}
    url = f"{WEALTHOS_API_URL}/api/v1/dags/wealthos_semantic_kg_sync/tasks/task_sync_triplestore"
    print(f"[Airflow:DAG-04][Gold] Syncing Triplestore via {url}...")
    resp = requests.post(url, json={"context": ctx}, timeout=30)
    resp.raise_for_status()
    payload = resp.json()
    sync = payload.get("sync", {})
    print(f"[Airflow:DAG-04][Gold] Triplestore sync complete: {sync}")
    
    ti.xcom_push(key="sync", value=sync)
    ti.xcom_push(key="context", value=payload.get("context", {}))
    return sync


def execute_materialize_sparql_views(**context):
    """[Gold Tier] Analytical Views: Materialize SPARQL analytical queries for systemic contagion and risk."""
    ti = context["ti"]
    ctx = ti.xcom_pull(key="context", task_ids="sync_triplestore") or {}
    url = f"{WEALTHOS_API_URL}/api/v1/dags/wealthos_semantic_kg_sync/tasks/task_materialize_sparql_views"
    print(f"[Airflow:DAG-04][Gold] Materializing SPARQL analytical views via {url}...")
    resp = requests.post(url, json={"context": ctx}, timeout=30)
    resp.raise_for_status()
    payload = resp.json()
    summary = payload.get("summary", {})
    print(f"[Airflow:DAG-04][Gold] SPARQL materialization summary: {summary}")
    
    ti.xcom_push(key="execution_summary", value=summary)
    return summary


with DAG(
    dag_id="wealthos_semantic_kg_sync",
    default_args=DEFAULT_ARGS,
    description="[Medallion: Bronze -> Silver -> Gold] Maps SQL to FIBO RDF, validates SHACL, synchronizes Triplestore",
    schedule_interval="0 1 * * *",  # Daily at 01:00 UTC
    start_date=datetime(2026, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=["wealthos", "medallion-architecture", "bronze", "silver", "gold", "fibo", "rdf", "shacl", "knowledge-graph", "sparql"],
) as dag:

    # Bronze Tier: Ingestion of Relational Records
    t1_extract_relational = PythonOperator(
        task_id="extract_relational_entities",
        python_callable=execute_extract_relational_entities,
        provide_context=True,
    )

    # Silver Tier: FIBO Ontology Mapping & W3C SHACL Validation
    t2_map_fibo = PythonOperator(
        task_id="map_fibo_triples",
        python_callable=execute_map_fibo_triples,
        provide_context=True,
    )

    t3_validate_shacl = PythonOperator(
        task_id="validate_shacl_shapes",
        python_callable=execute_validate_shacl_shapes,
        provide_context=True,
    )

    # Gold Tier: Triplestore Persistence & Analytical SPARQL View Materialization
    t4_sync_triplestore = PythonOperator(
        task_id="sync_triplestore",
        python_callable=execute_sync_triplestore,
        provide_context=True,
    )

    t5_materialize_sparql = PythonOperator(
        task_id="materialize_sparql_views",
        python_callable=execute_materialize_sparql_views,
        provide_context=True,
    )

    # Medallion Lineage (Bronze >> Silver >> Gold)
    t1_extract_relational >> t2_map_fibo >> t3_validate_shacl >> t4_sync_triplestore >> t5_materialize_sparql

