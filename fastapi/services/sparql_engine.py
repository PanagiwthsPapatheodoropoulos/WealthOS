"""
WealthOS SPARQL 1.1 Query Engine
Executes semantic queries over the WealthOS Knowledge Graph, provides analytical queries and aggregations.
"""

from typing import List, Dict, Any, Optional
from rdflib import Graph
from rdflib.plugins.sparql.processor import SPARQLResult
import json


# Institutional Predefined SPARQL Query Templates
SPARQL_TEMPLATES = {
    "SECTOR_EXPOSURE": """
        PREFIX wos: <https://wealthos.io/ontology/core#>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

        SELECT ?sectorName (SUM(?marketValue) AS ?totalSectorValue) (COUNT(?asset) AS ?assetCount)
        WHERE {
            ?portfolio a wos:Portfolio ;
                       wos:hasHolding ?holding .
            ?holding wos:holdsAsset ?asset ;
                     wos:holdingMarketValue ?marketValue .
            ?asset wos:belongsToSector ?sector .
            ?sector rdfs:label ?sectorName .
        }
        GROUP BY ?sectorName
        ORDER BY DESC(?totalSectorValue)
    """,
    "ALL_HOLDINGS": """
        PREFIX wos: <https://wealthos.io/ontology/core#>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

        SELECT ?symbol ?assetName ?assetType ?quantity ?marketValue ?currentPrice ?riskScore ?esgScore ?sectorName
        WHERE {
            ?holding a wos:PortfolioHolding ;
                     wos:holdsAsset ?asset ;
                     wos:holdingQuantity ?quantity ;
                     wos:holdingMarketValue ?marketValue .
            ?asset wos:symbol ?symbol ;
                   wos:assetType ?assetType ;
                   wos:currentMarketPrice ?currentPrice ;
                   wos:riskScore ?riskScore ;
                   wos:esgScore ?esgScore ;
                   wos:belongsToSector ?sector .
            OPT соединение
            OPTIONAL { ?asset wos:assetName ?assetName . }
            ?sector rdfs:label ?sectorName .
        }
        ORDER BY DESC(?marketValue)
    """.replace("OPT соединение", ""),
    "HIGH_RISK_ASSETS": """
        PREFIX wos: <https://wealthos.io/ontology/core#>

        SELECT ?symbol ?assetType ?currentPrice ?riskScore ?holdingValue
        WHERE {
            ?holding a wos:PortfolioHolding ;
                     wos:holdsAsset ?asset ;
                     wos:holdingMarketValue ?holdingValue .
            ?asset wos:symbol ?symbol ;
                   wos:assetType ?assetType ;
                   wos:currentMarketPrice ?currentPrice ;
                   wos:riskScore ?riskScore .
            FILTER (?riskScore >= 0.50)
        }
        ORDER BY DESC(?riskScore)
    """,
    "ESG_LEADERS": """
        PREFIX wos: <https://wealthos.io/ontology/core#>

        SELECT ?symbol ?assetType ?esgScore ?holdingValue
        WHERE {
            ?holding a wos:PortfolioHolding ;
                     wos:holdsAsset ?asset ;
                     wos:holdingMarketValue ?holdingValue .
            ?asset wos:symbol ?symbol ;
                   wos:assetType ?assetType ;
                   wos:esgScore ?esgScore .
            FILTER (?esgScore >= 75.0)
        }
        ORDER BY DESC(?esgScore)
    """,
    "PORTFOLIO_SUMMARY": """
        PREFIX wos: <https://wealthos.io/ontology/core#>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

        SELECT ?portfolio ?portfolioName ?cashBalance ?totalValue (COUNT(?holding) AS ?totalPositions)
        WHERE {
            ?portfolio a wos:Portfolio ;
                       rdfs:label ?portfolioName ;
                       wos:cashBalance ?cashBalance ;
                       wos:totalPortfolioValue ?totalValue .
            OPTIONAL { ?portfolio wos:hasHolding ?holding . }
        }
        GROUP BY ?portfolio ?portfolioName ?cashBalance ?totalValue
    """,
}


class SPARQLEngine:
    """
    SPARQL Query Execution Engine for WealthOS Knowledge Graph.
    """

    @classmethod
    def execute_query(cls, graph: Graph, query_str: str) -> Dict[str, Any]:
        """
        Executes an arbitrary SPARQL query against the given RDF graph
        and returns structured JSON results with columns and rows.
        """
        try:
            results: SPARQLResult = graph.query(query_str)
            
            # If query is a CONSTRUCT or DESCRIBE
            if results.type == "CONSTRUCT" or results.type == "DESCRIBE":
                subgraph = results.graph
                return {
                    "type": "graph",
                    "triple_count": len(subgraph),
                    "turtle": subgraph.serialize(format="turtle"),
                }

            # If query is ASK
            if results.type == "ASK":
                return {
                    "type": "boolean",
                    "boolean": results.askAnswer,
                }

            # If query is SELECT
            columns = [str(var) for var in results.vars] if results.vars else []
            rows = []

            for row in results:
                row_dict = {}
                for col in columns:
                    val = row[col]
                    if val is not None:
                        # Return python primitive if decimal/int/float or str
                        row_dict[col] = str(val.toPython()) if hasattr(val, "toPython") else str(val)
                    else:
                        row_dict[col] = None
                rows.append(row_dict)

            return {
                "type": "select",
                "total_rows": len(rows),
                "columns": columns,
                "rows": rows,
            }

        except Exception as e:
            return {
                "type": "error",
                "error": str(e),
                "columns": [],
                "rows": [],
            }

    @classmethod
    def execute_template(cls, graph: Graph, template_name: str) -> Dict[str, Any]:
        query = SPARQL_TEMPLATES.get(template_name)
        if not query:
            return {
                "type": "error",
                "error": f"Unknown template '{template_name}'. Available: {list(SPARQL_TEMPLATES.keys())}",
                "columns": [],
                "rows": [],
            }
        return cls.execute_query(graph, query)
