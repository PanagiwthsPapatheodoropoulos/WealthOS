import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "UP"


def test_risk_analytics_endpoint():
    payload = {
        "daily_returns": [0.01, -0.02, 0.015, 0.005, -0.01, 0.02],
        "risk_free_rate": 0.03,
    }
    response = client.post("/api/v1/ai/analytics/risk", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "metrics" in data
    assert "volatility" in data["metrics"]
    assert "sharpe_ratio" in data["metrics"]


def test_ai_insights_endpoint():
    holdings = [
        {"symbol": "AAPL", "type": "STOCK", "value": 5000.0},
        {"symbol": "BTC", "type": "CRYPTO", "value": 5000.0},
    ]
    response = client.post("/api/v1/ai/insights/portfolio", json=holdings)
    assert response.status_code == 200
    data = response.json()
    assert "insights" in data
    assert len(data["insights"]) > 0


def test_knowledge_graph_summary_endpoint():
    response = client.get("/api/v1/ai/knowledge-graph/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "triple_count" in data


def test_knowledge_graph_export_turtle():
    response = client.get("/api/v1/ai/knowledge-graph/export?format=turtle")
    assert response.status_code == 200
    data = response.json()
    assert data["format"] == "turtle"
    assert "@prefix" in data["content"]


def test_sparql_query_endpoint():
    payload = {
        "template": "SECTOR_EXPOSURE"
    }
    response = client.post("/api/v1/ai/knowledge-graph/sparql", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "result" in data
    assert data["result"]["type"] == "select"
