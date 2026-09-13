import pytest
from decimal import Decimal
from rdflib import Graph, URIRef, Literal, RDF, XSD
from services.rdf_mapper import RDFMappingService, WOS
from services.shacl_validator import SHACLValidationService


def test_shacl_valid_graph():
    portfolio = {
        "id": "p-valid",
        "name": "SHACL Conforming Portfolio",
        "cashBalance": 1000.0,
        "totalValue": 10000.0,
        "holdings": [
            {"symbol": "AAPL", "assetType": "STOCK", "quantity": 10, "currentPrice": 195.50, "marketValue": 1955.0},
        ],
    }
    graph = RDFMappingService.build_knowledge_graph(portfolios=[portfolio])
    report = SHACLValidationService.validate_graph(graph)
    assert report["conforms"] is True
    assert report["total_violations"] == 0


def test_shacl_invalid_negative_price():
    graph = RDFMappingService.initialize_graph()
    asset_uri = URIRef("https://wealthos.io/resource/asset/INVALID_TICKER")
    
    graph.add((asset_uri, RDF.type, WOS.Stock))
    graph.add((asset_uri, WOS.symbol, Literal("INVALID_TICKER")))
    graph.add((asset_uri, WOS.assetType, Literal("STOCK")))
    # Negative price violating sh:minExclusive 0.0
    graph.add((asset_uri, WOS.currentMarketPrice, Literal(Decimal("-10.50"), datatype=XSD.decimal)))

    report = SHACLValidationService.validate_graph(graph)
    assert report["conforms"] is False
    assert report["total_violations"] > 0
