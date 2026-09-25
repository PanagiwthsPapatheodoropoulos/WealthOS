# WealthOS Apache Airflow 2.9 Orchestrator

## Overview
WealthOS integrates **Apache Airflow 2.9** as its enterprise-grade data engineering and quantitative pipeline orchestrator. The pipelines run automated scheduled batch jobs that ingest financial market data, value portfolios end-of-day, run Monte Carlo Value-at-Risk stress tests, and synchronize the W3C Semantic Knowledge Graph.

---

## Registered Pipelines (DAGs)

| DAG ID | Schedule | Tasks | Purpose |
|---|---|---|---|
| `wealthos_market_data_ingestion` | `0 18 * * 1-5` | 5 | Ingests OHLCV, calculates technical indicators (SMA20/50, volatility), detects anomalies ($\ge 4\%$). |
| `wealthos_eod_portfolio_valuation` | `30 21 * * 1-5` | 4 | Mark-to-market portfolio NAV valuation, Sharpe ratio, max drawdown, and CQRS snapshot persistence. |
| `wealthos_risk_stress_testing` | `0 22 * * 1-5` | 5 | Covariance matrix modeling, 95%/99% VaR, Expected Shortfall (CVaR), macro stress shocks (2008, 2020), automated risk alerts. |
| `wealthos_semantic_kg_sync` | `0 1 * * *` | 5 | Relational ETL to W3C FIBO RDF Triples, SHACL shape constraint validation, Triplestore sync & SPARQL view materialization. |

---

## Airflow Web UI & Access

- **URL**: [http://localhost:8085](http://localhost:8085)
- **Username**: Configured via `AIRFLOW_ADMIN_USER` in `.env` (default: `admin`)
- **Password**: Configured via `AIRFLOW_ADMIN_PASSWORD` in `.env`
- **Executor**: `LocalExecutor`
- **Metadata Database**: PostgreSQL 16 (`airflow`)

---

## Triggering Pipelines via CLI

Trigger DAGs directly inside the container:

```bash
docker exec -it wealthos-airflow-webserver airflow dags trigger wealthos_market_data_ingestion
docker exec -it wealthos-airflow-webserver airflow dags trigger wealthos_eod_portfolio_valuation
docker exec -it wealthos-airflow-webserver airflow dags trigger wealthos_risk_stress_testing
docker exec -it wealthos-airflow-webserver airflow dags trigger wealthos_semantic_kg_sync
```

Or via REST API:

```bash
curl -X POST http://localhost:8000/api/v1/dags/wealthos_market_data_ingestion/run
```
