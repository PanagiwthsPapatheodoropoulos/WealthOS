import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from root and fastapi directories
ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env", override=True)
load_dotenv(Path(__file__).resolve().parent / ".env", override=True)

import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import analytics, ai, knowledge_graph, market, tax, optimizer, dividends, filings, macro, integrations
from services.http_client import close_http_client
from services.alert_monitor import price_alert_monitor_loop

@asynccontextmanager
async def lifespan(app: FastAPI):
    monitor_task = asyncio.create_task(price_alert_monitor_loop(poll_interval=300))
    yield
    monitor_task.cancel()
    try:
        await monitor_task
    except asyncio.CancelledError:
        pass
    await close_http_client()

app = FastAPI(
    title="WealthOS Intelligence & Market API",
    description="Python FastAPI Microservice for Live Market Data, Risk Analytics, Greek Tax Engine, Markowitz Optimizer & AI Insights",
    version="1.0.0",
    lifespan=lifespan
)

raw_origins = os.getenv("CORS_ALLOWED_ORIGINS", "")
allowed_origins = [o.strip() for o in raw_origins.split(",") if o.strip()]
if not allowed_origins:
    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:80",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:80",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Broker Integrations (Trading 212 API & CSV Importer)
app.include_router(integrations.router, prefix="/api/v1/integrations", tags=["Broker Integrations v1"])
app.include_router(integrations.router, prefix="/api/integrations", tags=["Broker Integrations"])

# Macroeconomic Inflation, Real Returns & Sentiment
app.include_router(macro.router, prefix="/api/v1/macro", tags=["Macro & Inflation v1"])
app.include_router(macro.router, prefix="/api/macro", tags=["Macro & Inflation"])
app.include_router(macro.router, prefix="/api/market", tags=["Market Sentiment"])

# Market Data endpoints (live quotes, charts, search, ECB fx rates, asset fundamentals)
app.include_router(market.router, prefix="/api/v1/market", tags=["Market Data v1"])
app.include_router(market.router, prefix="/api/market", tags=["Market Data"])
app.include_router(market.router, prefix="/api/assets", tags=["Asset Market Data"])
app.include_router(market.router, prefix="/api/v1/assets", tags=["Asset Market Data v1"])

# Greek & European Tax Engine (Law 4172/2013 & UCITS 0% Tax Exemption)
app.include_router(tax.router, prefix="/api/v1/tax", tags=["Greek & EU Tax Engine v1"])
app.include_router(tax.router, prefix="/api/tax", tags=["Greek & EU Tax Engine"])

# Markowitz Modern Portfolio Theory & Efficient Frontier Optimizer
app.include_router(optimizer.router, prefix="/api/v1/optimizer", tags=["Markowitz Optimizer v1"])
app.include_router(optimizer.router, prefix="/api/optimizer", tags=["Markowitz Optimizer"])

# Dividend Runway & Passive Cash Flow Forecasting
app.include_router(dividends.router, prefix="/api/v1/dividends", tags=["Dividend Runway v1"])
app.include_router(dividends.router, prefix="/api/dividends", tags=["Dividend Runway"])

# SEC 10-K, 10-Q & Earnings Call Transcript Summarizer
app.include_router(filings.router, prefix="/api/v1/filings", tags=["Corporate Filings v1"])
app.include_router(filings.router, prefix="/api/filings", tags=["Corporate Filings"])

# AI Insights, Copilot & Portfolio Intelligence
app.include_router(ai.router, prefix="/api/v1/ai", tags=["AI Copilot & Insights v1"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI Copilot & Insights"])
app.include_router(ai.router, prefix="/api/v1/ai/insights", tags=["AI Insights v1"])
app.include_router(ai.router, prefix="/api/ai/insights", tags=["AI Insights"])

# Quantitative Risk Analytics & Semantic Insights
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Risk Analytics v1"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Risk Analytics"])
app.include_router(analytics.router, prefix="/api/v1/ai/analytics", tags=["Risk Analytics"])
app.include_router(analytics.router, prefix="/api/ai/analytics", tags=["Risk Analytics"])

# Semantic Knowledge Graph & SPARQL
app.include_router(knowledge_graph.router, prefix="/api/v1/ai/knowledge-graph", tags=["Knowledge Graph & SPARQL"])
app.include_router(knowledge_graph.router, prefix="/api/ai/knowledge-graph", tags=["Knowledge Graph & SPARQL"])

@app.get("/health")
def health_check():
    return {"status": "UP", "service": "wealthos-intelligence"}
