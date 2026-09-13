import pytest
from rdflib import Graph, RDF, RDFS, Literal, URIRef
from services.rdf_mapper import RDFMappingService, WOS


def test_initialize_graph():
    g = RDFMappingService.initialize_graph()
    assert isinstance(g, Graph)
    assert len(g) == 0


def test_map_asset_stock():
    g = RDFMappingService.initialize_graph()
    asset = {
        "id": "asset-1",
        "symbol": "AAPL",
        "name": "Apple Inc.",
        "assetType": "STOCK",
        "currency": "USD",
        "currentPrice": 195.50,
    }
    uri = RDFMappingService.map_asset_to_rdf(g, asset)
    assert isinstance(uri, URIRef)
    assert (uri, RDF.type, WOS.Stock) in g
    assert (uri, WOS.symbol, Literal("AAPL")) in g
    assert (uri, WOS.assetType, Literal("STOCK")) in g


def test_map_asset_crypto():
    g = RDFMappingService.initialize_graph()
    asset = {
        "id": "asset-2",
        "symbol": "BTC",
        "name": "Bitcoin",
        "assetType": "CRYPTO",
        "currency": "USD",
        "currentPrice": 67000.0,
    }
    uri = RDFMappingService.map_asset_to_rdf(g, asset)
    assert (uri, RDF.type, WOS.CryptoAsset) in g
    assert (uri, WOS.symbol, Literal("BTC")) in g


def test_map_portfolio_with_holdings():
    g = RDFMappingService.initialize_graph()
    portfolio = {
        "id": "p-100",
        "name": "Growth Portfolio",
        "cashBalance": 1000.0,
        "totalValue": 10000.0,
        "holdings": [
            {"symbol": "NVDA", "assetType": "STOCK", "quantity": 10, "currentPrice": 120.0, "marketValue": 1200.0},
        ],
    }
    p_uri = RDFMappingService.map_portfolio_to_rdf(g, portfolio)
    assert (p_uri, RDF.type, WOS.Portfolio) in g
    assert len(g) > 10


def test_serialize_graph():
    portfolio = {
        "id": "p-200",
        "name": "Test Serialization",
        "cashBalance": 500.0,
        "totalValue": 2500.0,
        "holdings": [
            {"symbol": "AAPL", "assetType": "STOCK", "quantity": 10, "currentPrice": 200.0, "marketValue": 2000.0},
        ],
    }
    g = RDFMappingService.build_knowledge_graph(portfolios=[portfolio])
    
    turtle_out = RDFMappingService.serialize_graph(g, "turtle")
    assert "@prefix wos:" in turtle_out
    assert "AAPL" in turtle_out

    jsonld_out = RDFMappingService.serialize_graph(g, "json-ld")
    assert "@id" in jsonld_out or "@type" in jsonld_out
