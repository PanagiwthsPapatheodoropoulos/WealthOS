import pytest
from services.rdf_mapper import RDFMappingService
from services.sparql_engine import SPARQLEngine, SPARQL_TEMPLATES


@pytest.fixture
def sample_graph():
    portfolio = {
        "id": "p-test",
        "name": "SPARQL Test Portfolio",
        "cashBalance": 1000.0,
        "totalValue": 11000.0,
        "holdings": [
            {"symbol": "AAPL", "assetType": "STOCK", "quantity": 20, "currentPrice": 200.0, "marketValue": 4000.0, "avgCost": 180.0},
            {"symbol": "NVDA", "assetType": "STOCK", "quantity": 30, "currentPrice": 120.0, "marketValue": 3600.0, "avgCost": 100.0},
            {"symbol": "BTC", "assetType": "CRYPTO", "quantity": 0.05, "currentPrice": 68000.0, "marketValue": 3400.0, "avgCost": 60000.0},
        ],
    }
    return RDFMappingService.build_knowledge_graph(portfolios=[portfolio])


def test_sparql_select_query(sample_graph):
    query = """
        PREFIX wos: <https://wealthos.io/ontology/core#>
        SELECT ?symbol ?price
        WHERE {
            ?asset a ?type ;
                   wos:symbol ?symbol ;
                   wos:currentMarketPrice ?price .
        }
        ORDER BY ?symbol
    """
    res = SPARQLEngine.execute_query(sample_graph, query)
    assert res["type"] == "select"
    assert res["total_rows"] >= 3
    symbols = [r["symbol"] for r in res["rows"]]
    assert "AAPL" in symbols
    assert "BTC" in symbols
    assert "NVDA" in symbols


def test_sparql_template_sector_exposure(sample_graph):
    res = SPARQLEngine.execute_template(sample_graph, "SECTOR_EXPOSURE")
    assert res["type"] == "select"
    assert res["total_rows"] > 0
    assert "sectorName" in res["columns"]
    assert "totalSectorValue" in res["columns"]


def test_sparql_template_high_risk(sample_graph):
    res = SPARQLEngine.execute_template(sample_graph, "HIGH_RISK_ASSETS")
    assert res["type"] == "select"
    symbols = [r["symbol"] for r in res["rows"]]
    assert "BTC" in symbols  # BTC risk score is >= 0.50


def test_sparql_ask_query(sample_graph):
    query = """
        PREFIX wos: <https://wealthos.io/ontology/core#>
        ASK {
            ?asset wos:symbol "AAPL" .
        }
    """
    res = SPARQLEngine.execute_query(sample_graph, query)
    assert res["type"] == "boolean"
    assert res["boolean"] is True
