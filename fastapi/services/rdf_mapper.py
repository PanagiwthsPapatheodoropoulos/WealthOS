"""
WealthOS RDF & Linked Data Mapping Engine
Maps relational models (Portfolios, Holdings, Assets, Transactions) to W3C-compliant RDF Triples aligned with FIBO.
"""

from typing import List, Dict, Any, Optional
from rdflib import Graph, Namespace, URIRef, Literal, RDF, RDFS, OWL, XSD
from decimal import Decimal

# Define Namespaces
WOS = Namespace("https://wealthos.io/ontology/core#")
FIBO_SEC_EQ = Namespace("https://spec.edmcouncil.org/fibo/ontology/SEC/Equities/EquityInstruments/")
FIBO_SEC_FUND = Namespace("https://spec.edmcouncil.org/fibo/ontology/SEC/Funds/Funds/")
FIBO_FND_PTY = Namespace("https://spec.edmcouncil.org/fibo/ontology/FND/Parties/Parties/")
FIBO_FND_TXN = Namespace("https://spec.edmcouncil.org/fibo/ontology/FND/TransactionsExt/MarketTransactions/")
SCHEMA = Namespace("https://schema.org/")

# Sector taxonomy mapping
SECTOR_MAP = {
    "AAPL": "Technology",
    "MSFT": "Technology",
    "NVDA": "Technology",
    "AMZN": "Consumer Discretionary",
    "GOOGL": "Communication Services",
    "TSLA": "Consumer Discretionary",
    "JNJ": "Healthcare",
    "JPM": "Financials",
    "SPY": "Broad Market Index",
    "QQQ": "Technology Index",
    "BTC": "Cryptocurrency Network",
    "ETH": "Smart Contract Platform",
    "SOL": "High Performance Layer 1",
}

# Risk rating score mapping (0.0 to 1.0)
RISK_MAP = {
    "BTC": 0.85,
    "ETH": 0.78,
    "SOL": 0.88,
    "NVDA": 0.55,
    "TSLA": 0.65,
    "AAPL": 0.28,
    "MSFT": 0.25,
    "SPY": 0.22,
    "QQQ": 0.35,
    "JPM": 0.32,
    "JNJ": 0.18,
}

# ESG Scores (0 - 100)
ESG_MAP = {
    "AAPL": 82.5,
    "MSFT": 88.0,
    "NVDA": 76.4,
    "AMZN": 68.2,
    "GOOGL": 84.1,
    "TSLA": 71.0,
    "JNJ": 86.5,
    "JPM": 72.0,
    "SPY": 75.0,
    "QQQ": 78.0,
    "BTC": 35.0,
    "ETH": 65.0,
    "SOL": 60.0,
}


class RDFMappingService:
    """
    Service responsible for converting domain models to RDF Knowledge Graphs
    and serializing into multiple semantic formats (Turtle, JSON-LD, N-Triples, RDF/XML).
    """

    @staticmethod
    def initialize_graph() -> Graph:
        g = Graph()
        g.bind("wos", WOS)
        g.bind("fibo-eq", FIBO_SEC_EQ)
        g.bind("fibo-fund", FIBO_SEC_FUND)
        g.bind("fibo-pty", FIBO_FND_PTY)
        g.bind("fibo-txn", FIBO_FND_TXN)
        g.bind("schema", SCHEMA)
        g.bind("rdfs", RDFS)
        g.bind("owl", OWL)
        return g

    @classmethod
    def map_asset_to_rdf(cls, g: Graph, asset: Dict[str, Any]) -> URIRef:
        asset_id = str(asset.get("id", asset.get("symbol", "unknown")))
        symbol = str(asset.get("symbol", "")).upper()
        asset_uri = URIRef(f"https://wealthos.io/resource/asset/{symbol or asset_id}")

        asset_type = str(asset.get("assetType", asset.get("type", "STOCK"))).upper()

        if asset_type == "STOCK":
            g.add((asset_uri, RDF.type, WOS.Stock))
            g.add((asset_uri, RDF.type, FIBO_SEC_EQ.Share))
        elif asset_type == "ETF":
            g.add((asset_uri, RDF.type, WOS.ETF))
            g.add((asset_uri, RDF.type, FIBO_SEC_FUND.ExchangeTradedFund))
        elif asset_type == "CRYPTO":
            g.add((asset_uri, RDF.type, WOS.CryptoAsset))
        else:
            g.add((asset_uri, RDF.type, WOS.FinancialAsset))

        if symbol:
            g.add((asset_uri, WOS.symbol, Literal(symbol)))
            g.add((asset_uri, RDFS.label, Literal(f"{symbol} Financial Instrument")))

        name = asset.get("name", symbol)
        if name:
            g.add((asset_uri, WOS.assetName, Literal(name)))

        g.add((asset_uri, WOS.assetType, Literal(asset_type)))
        g.add((asset_uri, WOS.currency, Literal(asset.get("currency", "USD"))))

        price = asset.get("currentPrice", asset.get("price", 0.0))
        g.add((asset_uri, WOS.currentMarketPrice, Literal(Decimal(str(price)), datatype=XSD.decimal)))

        # Sector relationship
        sector_name = asset.get("sector") or SECTOR_MAP.get(symbol, "General Financial Asset")
        sector_slug = str(sector_name).replace(" ", "_").lower()
        sector_uri = URIRef(f"https://wealthos.io/resource/sector/{sector_slug}")
        g.add((sector_uri, RDF.type, WOS.EconomicSector))
        g.add((sector_uri, RDFS.label, Literal(sector_name)))
        g.add((asset_uri, WOS.belongsToSector, sector_uri))

        # Risk and ESG Scores (prefer dynamic values from asset model/payload)
        risk_score = asset.get("risk_score") if asset.get("risk_score") is not None else asset.get("riskScore", RISK_MAP.get(symbol, 0.40))
        esg_score = asset.get("esg_score") if asset.get("esg_score") is not None else asset.get("esgScore", ESG_MAP.get(symbol, 70.0))
        g.add((asset_uri, WOS.riskScore, Literal(Decimal(str(risk_score)), datatype=XSD.decimal)))
        g.add((asset_uri, WOS.esgScore, Literal(Decimal(str(esg_score)), datatype=XSD.decimal)))

        return asset_uri

    @classmethod
    def map_portfolio_to_rdf(cls, g: Graph, portfolio: Dict[str, Any]) -> URIRef:
        p_id = str(portfolio.get("id", "default_portfolio"))
        p_uri = URIRef(f"https://wealthos.io/resource/portfolio/{p_id}")

        g.add((p_uri, RDF.type, WOS.Portfolio))
        g.add((p_uri, RDF.type, FIBO_FND_PTY.Portfolio))
        g.add((p_uri, RDFS.label, Literal(portfolio.get("name", f"Portfolio {p_id}"))))

        cash = portfolio.get("cashBalance", 0.0)
        total = portfolio.get("totalValue", 0.0)
        g.add((p_uri, WOS.cashBalance, Literal(Decimal(str(cash)), datatype=XSD.decimal)))
        g.add((p_uri, WOS.totalPortfolioValue, Literal(Decimal(str(total)), datatype=XSD.decimal)))

        # Map holdings
        holdings = portfolio.get("holdings", [])
        for idx, h in enumerate(holdings):
            asset_uri = cls.map_asset_to_rdf(g, h)
            h_id = f"{p_id}_pos_{h.get('symbol', idx)}"
            h_uri = URIRef(f"https://wealthos.io/resource/holding/{h_id}")

            g.add((h_uri, RDF.type, WOS.PortfolioHolding))
            g.add((p_uri, WOS.hasHolding, h_uri))
            g.add((h_uri, WOS.holdsAsset, asset_uri))

            qty = h.get("quantity", 1.0)
            val = h.get("marketValue", h.get("value", 0.0))
            avg_cost = h.get("avgCost", 0.0)

            g.add((h_uri, WOS.holdingQuantity, Literal(Decimal(str(qty)), datatype=XSD.decimal)))
            g.add((h_uri, WOS.holdingMarketValue, Literal(Decimal(str(val)), datatype=XSD.decimal)))
            g.add((h_uri, WOS.holdingAvgCost, Literal(Decimal(str(avg_cost)), datatype=XSD.decimal)))

        return p_uri

    @classmethod
    def map_transactions_to_rdf(cls, g: Graph, p_uri: URIRef, transactions: List[Dict[str, Any]]) -> None:
        for tx in transactions:
            tx_id = str(tx.get("id", "tx_unknown"))
            tx_uri = URIRef(f"https://wealthos.io/resource/transaction/{tx_id}")

            g.add((tx_uri, RDF.type, WOS.FinancialTransaction))
            g.add((p_uri, WOS.hasTransaction, tx_uri))

            symbol = str(tx.get("symbol", "")).upper()
            if symbol:
                asset_uri = URIRef(f"https://wealthos.io/resource/asset/{symbol}")
                g.add((tx_uri, WOS.involvesAsset, asset_uri))

            tx_type = str(tx.get("type", "BUY")).upper()
            qty = tx.get("quantity", 0.0)
            price = tx.get("price", 0.0)
            total = tx.get("totalAmount", qty * price)

            g.add((tx_uri, WOS.holdingQuantity, Literal(Decimal(str(qty)), datatype=XSD.decimal)))
            g.add((tx_uri, WOS.currentMarketPrice, Literal(Decimal(str(price)), datatype=XSD.decimal)))
            g.add((tx_uri, WOS.holdingMarketValue, Literal(Decimal(str(total)), datatype=XSD.decimal)))
            g.add((tx_uri, RDFS.label, Literal(f"{tx_type} {qty} {symbol} @ ${price}")))

    @classmethod
    def build_knowledge_graph(
        cls,
        portfolios: Optional[List[Dict[str, Any]]] = None,
        assets: Optional[List[Dict[str, Any]]] = None,
        transactions: Optional[List[Dict[str, Any]]] = None,
    ) -> Graph:
        """
        Builds a comprehensive RDF graph containing all entities, properties and classifications.
        """
        g = cls.initialize_graph()

        if assets:
            for a in assets:
                cls.map_asset_to_rdf(g, a)

        if portfolios:
            for p in portfolios:
                p_uri = cls.map_portfolio_to_rdf(g, p)
                if transactions:
                    p_txs = [t for t in transactions if str(t.get("portfolioId")) == str(p.get("id"))]
                    cls.map_transactions_to_rdf(g, p_uri, p_txs)

        return g

    @staticmethod
    def serialize_graph(g: Graph, format_type: str = "turtle") -> str:
        """
        Serializes the RDF Graph into supported formats:
        - 'turtle' / 'ttl'
        - 'json-ld'
        - 'nt' / 'ntriples'
        - 'xml'
        """
        fmt = format_type.lower()
        if fmt in ["turtle", "ttl"]:
            return g.serialize(format="turtle")
        elif fmt in ["json-ld", "jsonld"]:
            return g.serialize(format="json-ld")
        elif fmt in ["nt", "ntriples"]:
            return g.serialize(format="nt")
        elif fmt in ["xml", "rdf/xml"]:
            return g.serialize(format="xml")
        else:
            return g.serialize(format="turtle")
