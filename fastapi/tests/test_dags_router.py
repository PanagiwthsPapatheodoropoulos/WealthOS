import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_list_dags():
    response = client.get("/api/v1/dags")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["count"] == 4
    dag_ids = [d["dag_id"] for d in data["data"]]
    assert "wealthos_market_data_ingestion" in dag_ids
    assert "wealthos_eod_portfolio_valuation" in dag_ids
    assert "wealthos_risk_stress_testing" in dag_ids
    assert "wealthos_semantic_kg_sync" in dag_ids


def test_airflow_health():
    response = client.get("/api/v1/dags/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "UP"
    assert data["orchestrator"] == "Apache Airflow 2.9"


def test_trigger_dag01_step_endpoints():
    r1 = client.post("/api/v1/dags/wealthos_market_data_ingestion/tasks/task_fetch_active_universe")
    assert r1.status_code == 200
    assert r1.json()["status"] == "SUCCESS"

    r2 = client.post("/api/v1/dags/wealthos_market_data_ingestion/tasks/task_ingest_ohlcv", json={"context": r1.json()["context"]})
    assert r2.status_code == 200
    assert r2.json()["status"] == "SUCCESS"

    r3 = client.post("/api/v1/dags/wealthos_market_data_ingestion/tasks/task_compute_technical_indicators", json={"context": r2.json()["context"]})
    assert r3.status_code == 200
    assert r3.json()["status"] == "SUCCESS"

    r4 = client.post("/api/v1/dags/wealthos_market_data_ingestion/tasks/task_detect_anomalies", json={"context": r3.json()["context"]})
    assert r4.status_code == 200
    assert r4.json()["status"] == "SUCCESS"

    r5 = client.post("/api/v1/dags/wealthos_market_data_ingestion/tasks/task_persist_market_data", json={"context": r4.json()["context"]})
    assert r5.status_code == 200
    assert r5.json()["status"] == "SUCCESS"


def test_trigger_dag_run_endpoint():
    response = client.post("/api/v1/dags/wealthos_market_data_ingestion/run")
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    assert response.json()["execution_result"]["status"] == "SUCCESS"
