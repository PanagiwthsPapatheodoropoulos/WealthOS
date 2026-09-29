# WealthOS — Institutional Multi-Asset Wealth Operating System

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![React Query](https://img.shields.io/badge/TanStack_Query-v5-ff4154.svg)](https://tanstack.com/query/latest)
[![Java](https://img.shields.io/badge/Java-17-orange.svg)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.3-green.svg)](https://spring.io/projects/spring-boot)
[![Python](https://img.shields.io/badge/Python-3.11-yellow.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-teal.svg)](https://fastapi.tiangolo.com/)
[![Apache Airflow](https://img.shields.io/badge/Apache_Airflow-2.9-017CEE.svg?logo=Apache%20Airflow&logoColor=white)](https://airflow.apache.org/)
[![Semantic Web](https://img.shields.io/badge/W3C-RDF%20%7C%20SHACL%20%7C%20SPARQL-8B008B.svg)](https://www.w3.org/standards/semanticweb/)
[![Kafka](https://img.shields.io/badge/Apache_Kafka-3.7-black.svg)](https://kafka.apache.org/)
[![Redis](https://img.shields.io/badge/Redis-7.2-dc382d.svg)](https://redis.io/)
[![Rust](https://img.shields.io/badge/Rust-1.78-red.svg)](https://www.rust-lang.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ed.svg)](https://www.docker.com/)
[![License: View-Only](https://img.shields.io/badge/License-View--Only%20%2F%20All%20Rights%20Reserved-red.svg)](LICENSE)

**WealthOS** is an institutional-grade, distributed multi-asset wealth management and autonomous portfolio operating system. Engineered with a high-throughput microservices architecture, WealthOS orchestrates quantitative valuation algorithms, an enterprise **Apache Airflow 2.9 Medallion Architecture data engineering plane**, real-time event-driven market streaming, formal W3C Semantic Knowledge Graphs (RDF/FIBO/SHACL/SPARQL), sub-millisecond multithreaded Rust SIMD stochastic risk engines, and automated statutory tax compliance into a unified financial command terminal.

---

## 🏛️ System Architecture

```
                                      ┌────────────────────────┐
                                      │   Reverse Proxy / Nginx│
                                      │   (SSL/TLS Termination)│
                                      └───────────┬────────────┘
                                                  │
                          ┌───────────────────────┴──────────────────────┐
                          ▼                                              ▼
              ┌───────────────────────┐                      ┌───────────────────────┐
              │  Frontend Client App  │                      │ Spring Boot Core API  │
              │  React 18 / Vite / TS │                      │ (Java 17 / CQRS / ES) │
              │  TanStack Query v5    │                      │ STOMP WebSockets      │
              └───────────┬───────────┘                      └───────────┬───────────┘
                          │                                              │
                          ├──────────────────────┬───────────────────────┤
                          ▼                      ▼                       ▼
              ┌───────────────────────┐  ┌──────────────┐   ┌────────────────────────┐
              │ FastAPI Quant Engine  │  │ Redis Cache  │   │  PostgreSQL 16 Engine  │
              │ & Analytical Services │  │ Distributed  │   │  - Append-Only Events  │
              │ - W3C Knowledge Graph │  │ Locks (Lua)  │   │  - TimescaleDB Tables  │
              │ - FIBO / SHACL / SPARQL│ │ Rate Limiters│   │  - Airflow Metadata DB │
              └───────────┬───────────┘  └──────────────┘   └────────────┬───────────┘
                          │                                              │
          ┌───────────────┴───────────────┐                              │
          ▼                               ▼                              ▼
┌───────────────────┐           ┌───────────────────┐          ┌────────────────────┐
│ Rust Monte Carlo  │           │ Apache Airflow    │          │ Apache Kafka       │
│ (Rayon SIMD / VaR)│           │ (LocalExecutor    │          │ (Event Streaming)  │
└───────────────────┘           │  Medallion DAGs)  │          └────────────────────┘
                                └───────────────────┘
```

---

## 🛠️ Technology Stack & Engineering Specifications

| Architectural Layer | Core Technologies & Frameworks | Industrial Capabilities & Architecture |
|---|---|---|
| **Batch Orchestration & Data Engineering** | Apache Airflow 2.9, Python 3.12, LocalExecutor, XCom Context Protocol, Psycopg2 | Enterprise Medallion Architecture (Bronze Ingestion $\rightarrow$ Silver Cleansing & Modeling $\rightarrow$ Gold CQRS Projections), idempotent task pipelines, automated dependency scheduling, anomaly isolation |
| **Transactional Core & Domain Ledger** | Java 17, Spring Boot 3.3, Spring Data JPA, Spring Security (JWT), Spring WebSocket / STOMP, Flyway 10, Resilience4j | CQRS architecture, append-only domain event sourcing, optimistic locking, idempotent order execution, dynamic slippage degradation modeling |
| **Semantic Knowledge Graph** | W3C RDF 1.1, Turtle (`.ttl`), JSON-LD, FIBO (Financial Industry Business Ontology), W3C SHACL, SPARQL 1.1, RDFlib, PySHACL | Formal semantic domain modeling, dynamic ontological triplification, closed-world SHACL constraint validation, graph analytics |
| **Real-Time Streaming & Messaging** | Apache Kafka 3.7 (Consumer Groups, `market-ticks`), SockJS, STOMP Full-Duplex WebSockets | Asynchronous event streaming, rolling statistical anomaly detection ($Z\text{-score} \ge 3.0$), sub-second market quote broadcasting, zero-latency execution alerts |
| **Distributed State & Concurrency** | Redis 7.2 (Lua-Atomic Mutex Distributed Locks, Sliding Window Log, Token Bucket Limiter, TTL Caching) | Cryptographic UUID-bound distributed concurrency locks, sub-second API burst throttling, high-throughput in-memory state caching |
| **Quantitative Analytics & Regulatory Engine** | Python 3.11, FastAPI, Pydantic v2, NumPy, SciPy (SLSQP Solver), Pandas, SQLAlchemy | Markowitz Efficient Frontier optimization, multi-stage DCF intrinsic valuation, Greek Law 4172/2013 statutory tax audit, forward dividend runway forecasting |
| **High-Throughput Stochastic Engine** | Rust 1.78, Axum, Tokio Async, Rayon Data Parallelism, SIMD Acceleration, Rand_Distr, Serde | Multithreaded Geometric Brownian Motion (GBM), 100K+ stochastic path simulations, Parametric & Historical Value-at-Risk (VaR 95/99%), Expected Shortfall (CVaR) |
| **Institutional Reactive Client** | React 18, TypeScript 5.5, Vite 5, TanStack React Query v5, Tailwind CSS, Lucide Icons | Zero-polling server-state synchronization, optimistic UI mutations, live European Central Bank (ECB) FX conversions, cubic Bezier financial splines |
| **Persistence & Time-Series Engine** | PostgreSQL 16, TimescaleDB Hypertables, Flyway DDL Migrations (`V1`–`V20`) | ACID transactional integrity, immutable historical price-series partitions, audit logging, zero default credentials |
| **Observability & Cloud Edge** | Docker Compose, Nginx Reverse Proxy (TLS Termination), Prometheus, Grafana, OpenTelemetry, Jaeger Tracing | Containerized microservice mesh, distributed request tracing, telemetry scrapers, real-time health surveillance probes |

---

## 🔬 Deep-Dive Architectural & Engineering Highlights

### 1. Enterprise Medallion Data Engineering & Orchestration (Apache Airflow 2.9)
WealthOS features a dedicated, production-grade **Apache Airflow 2.9 orchestration plane** operating under the industry-standard **Medallion Data Architecture (Bronze → Silver → Gold)** with parallel async task scheduling via `LocalExecutor`:

* **Bronze Tier — Raw Ingestion & Source Provenance**:
  * `wealthos_market_data_ingestion`: High-throughput ingestion of multi-asset OHLCV market feeds across equities, ETFs, and crypto registries.
  * `wealthos_eod_portfolio_valuation`: Source database extractions of cross-portfolio holdings, executed ledger transactions, and raw cash balances.
  * `wealthos_risk_stress_testing`: Multi-asset portfolio exposure extraction and position weight aggregation across distributed accounts.
  * `wealthos_semantic_kg_sync`: Dynamic relational schema entity extraction directly from PostgreSQL tables.
* **Silver Tier — Cleansing, Conformance & Quantitative Modeling**:
  * Technical Indicator Transformation: High-speed rolling technical indicators (SMA-20, SMA-50, Daily Returns, Volatility).
  * Statistical Quality & Outlier Detection: Automated anomaly detection flagging price jumps $\ge 4\%$ or abnormal volume surges.
  * Mark-to-Market Normalization: Multi-currency price enrichment and unrealized profit-and-loss (PnL) ledger reconciliation.
  * Quantitative Risk Engine: High-dimensional cross-asset covariance matrix construction, 10,000-path Monte Carlo and Parametric Value-at-Risk (VaR 95%/99%), and Expected Shortfall (CVaR).
  * Ontological Conformance: Dynamic W3C FIBO RDF triplification with automated W3C SHACL shape validation and RDFS inferencing.
* **Gold Tier — Curated Analytics, CQRS Projections & Materialized Insights**:
  * Time-Series Hypertables: Persistence of validated market telemetry and statistical anomalies into TimescaleDB.
  * Immutable Read-Model Snapshots: CQRS portfolio valuation snapshots, annualized Sharpe ratios, Sortino ratios, and maximum drawdown metrics.
  * Macro Stress Testing Replays: Deterministic stress simulations replaying historic market shocks (2008 Great Financial Crisis, Tech-Wreck Crash, Fed Rate Spikes, Crypto Liquidity Freezes) with automated threshold breach alerts.
  * Semantic Triplestore Synchronization: RDF graph synchronization with Turtle export generation and materialized SPARQL analytical views.
* **Idempotent Infrastructure Bootstrap**: Dedicated initialization container (`airflow-init`) executing an automated shell bootstrap script that verifies PostgreSQL connectivity, provisions the `airflow` metadata database, executes schema migrations, and provisions the RBAC administrator account idempotently with dynamic environment variable injection.

---

### 2. W3C Semantic Knowledge Graph: RDF, FIBO, SHACL & SPARQL
WealthOS establishes a formal Semantic Web layer bridging relational databases and financial ontology graphs:
* **FIBO Ontology Alignment**: Custom financial ontology (`wealthos_fibo.ttl`) directly inheriting from the Enterprise Data Management Council’s **Financial Industry Business Ontology (FIBO)**:
  * Financial Assets: `wos:FinancialAsset` subsumed by `fibo-fnd-acc-cur:FinancialAsset`
  * Equities & Shares: `wos:Stock` subsumed by `wos:FinancialAsset` $\sqcap$ `fibo-sec-eq:Share`
  * Collective Investment Vehicles: `wos:ETF` subsumed by `wos:FinancialAsset` $\sqcap$ `fibo-sec-fund:ExchangeTradedFund`
  * Financial Transactions: `wos:FinancialTransaction` subsumed by `fibo-fnd-txn:Transaction`
* **Automated Triplification & Multi-Format Serialization**: Relational entities are dynamically mapped into RDF graphs via `RDFMappingService`, supporting export in **Turtle (`.ttl`)**, **JSON-LD**, **N-Triples (`.nt`)**, and **RDF/XML**.
* **W3C SHACL Constraint Validation**: Validates graph integrity using `pyshacl` with RDFS inferencing against `wealthos_shapes.shacl.ttl`:
  * Ticker Syntactic Integrity: Regex pattern enforcement (`^[A-Z0-9.-]+$`) with strict cardinality constraints.
  * Market Balance Invariants: Non-negative cash balance enforcement, strictly positive market prices, and bounded ESG / risk score intervals.
  * Taxonomy & Sector Classification: Enforced classification of securities into standard macroeconomic sectors (`wos:EconomicSector`).
* **Declarative SPARQL 1.1 Analytical Engine**: In-memory graph query execution engine supporting complex analytical traversals, multi-hop portfolio sector exposure aggregations, and ontological relationship inference.

---

### 3. Distributed Concurrency, Locking & Rate Limiting (Redis & Spring Boot)
* **Atomic Mutex Distributed Locking**: Built on Redis `SETNX` with cryptographic UUID ownership tokens and atomic Lua script release, guaranteeing mutual exclusion and preventing split-brain unlock conditions during worker TTL timeouts.
* **Dual-Strategy Distributed Rate Limiting**:
  * **Sliding Window Log**: Redis sorted sets (`ZSET`) utilizing Unix microsecond timestamps for sub-second precision against API burst attacks on market endpoints.
  * **Token Bucket**: Dynamic bucket capacity and replenishment rates per minute for compute-heavy LLM insights and Monte Carlo endpoints.
* **Idempotent Order Pipeline**: High-throughput execution guarded by client-supplied `Idempotency-Key` headers, verified via Redis/PostgreSQL hashes to guarantee zero duplicate orders during network retransmissions.
* **JPA Optimistic Concurrency Control**: Entities (`Account`, `Portfolio`) utilize JPA `@Version` fields to detect and reject concurrent double-spend race conditions (`ConflictException` 409).
* **Simulated Institutional Slippage Engine**: Dynamically models market liquidity degradation as a function of order notional value versus average daily volume.

---

### 4. Event-Driven Market Streaming & WebSockets (Kafka & STOMP)
* **Kafka Tick Ingestion**: High-throughput consumer group (`wealthos-market-analytics`) ingesting high-frequency price feeds from the `market-ticks` topic.
* **Statistical Volatility Anomaly Detection**: Rolling statistics monitors streaming market ticks to identify statistically significant volatility spikes ($Z\text{-score} \ge 3.0$) and rapid price fluctuations ($\ge 4\%$).
* **Full-Duplex STOMP WebSockets**: Real-time push over SockJS/STOMP:
  * User-isolated private queues: `/user/{userId}/queue/notifications` (instant execution fills, margin alerts).
  * Broadcast topics: `/topic/portfolio-updates` and `/topic/market-data` for live quote updates without client polling.

---

### 5. Quantitative Optimization & Regulatory Compliance (FastAPI & SciPy)
* **Markowitz Modern Portfolio Theory (MPT)**: Quadratic optimization via SciPy’s Sequential Least Squares Programming (SLSQP) solver to trace the Efficient Frontier, maximize the Sharpe ratio, and calculate minimum volatility allocations:
  $$\min_{\mathbf{w}} \mathbf{w}^T \mathbf{\Sigma} \mathbf{w} \quad \text{subject to} \quad \mathbf{w}^T \boldsymbol{\mu} = \mu_{\text{target}}, \quad \sum w_i = 1, \quad w_i \ge 0$$
* **Intrinsic Valuation Engine**: Multi-stage Discounted Cash Flow (DCF) with Gordon Growth terminal value, Benjamin Graham Fair Value formula, and Buffett Economic Moat index.
* **Statutory Tax Compliance (Greek Law 4172/2013)**: Automated auditing engine classifying EU UCITS funds for 0% capital gains tax immunity (Art. 42/43), dividend withholding tax rules, and FIFO/weighted-average tax-loss harvesting.
* **12-Month Forward Dividend Runway**: Predictive payout scheduling, monthly passive income forecasting, and ex-dividend tracking.

---

### 6. High-Performance Stochastic Simulation (Rust 1.78 & Rayon)
* **SIMD & Multithreaded Data Parallelism**: Built with Rust, Axum, Tokio, and Rayon (`into_par_iter()`), generating 100,000+ stochastic multi-year portfolio valuation trajectories in sub-millisecond execution times.
* **Geometric Brownian Motion (GBM)**:
  $$S_{t+\Delta t} = S_t \exp\left(\left(\mu - \frac{1}{2}\sigma^2\right)\Delta t + \sigma \sqrt{\Delta t} Z\right), \quad Z \sim \mathcal{N}(0, 1)$$
* **Extreme Tail Risk Diagnostics**: Value-at-Risk (VaR) and Expected Shortfall (CVaR) computed across 10th (bear), 50th (median), and 90th (bull) percentiles.

---

### 7. Modern Client State Management (React 18 & TanStack Query v5)
* **Optimized Server State with React Query v5**: Zero aggressive polling — strategic caching (`staleTime`, `cacheTime`), optimistic mutation updates on order execution, query deduplication, and automatic background invalidation.
* **Live Airflow Orchestration Telemetry**: Real-time pipeline status indicator integrated into the Portfolio Intelligence terminal with active Medallion tier badges (`Bronze › Silver › Gold`) and direct deep-linking to the Airflow cluster.
* **Live ECB FX Cross Conversion**: Mathematical currency conversions (`EUR`, `USD`, `GBP`, `CHF`, `JPY`) calculated using live European Central Bank (ECB) reference rates with strict sign and rounding formatting (`-$30.00`).
* **Multi-Timeframe Financial Spline**: Smooth cubic Bezier spline SVG chart (`24H`, `7D`, `30D`, `3M`, `YTD`) with interactive hover crosshairs and period delta tracking.
* **Real-Time WebSocket Integration**: Native reactive hook `useWebSocket` maintaining persistent STOMP connections for instant toast notifications and status synchronizations.

---

### 8. 12-Factor Security & Zero Hardcoded Credentials
* **Declarative Database Migrations**: All Flyway database migrations (`V1` through `V20`) execute purely declarative schema definitions. Every user undergoes fresh self-registration with secure BCrypt hashing.
* **Dynamic Environment Variables**: All credentials, database connection strings, JWT keys, and Airflow secret keys are dynamically injected from environment configuration (`.env.example`). Zero hardcoded fallback secrets exist in source files.

---

## 🚀 Getting Started

### Prerequisites
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) (v24.0+ recommended)
* [Node.js](https://nodejs.org/) (v20+ LTS) — *optional for local frontend dev*
* [Java JDK 17](https://adoptium.net/) & Maven — *optional for local backend dev*
* [Python 3.11+](https://www.python.org/) — *optional for local FastAPI dev*

### 1. Environment Configuration
Create a `.env` file in the project root from the template:
```bash
cp .env.example .env
```

### 2. Launching via Docker Compose
To build and start the entire distributed cluster simultaneously:
```bash
docker compose up --build -d
```

Verify cluster container health:
```bash
docker compose ps
```

| Distributed Service | Host Port | Internal Endpoint | Industrial Role |
|---|---|---|---|
| **Frontend Terminal** | `3000` (or `80`) | `http://localhost:3000` | React 18 SPA + TanStack Query v5 Institutional UI |
| **Spring Boot Core API** | `8080` | `http://localhost:8080/api/v1` | Java 17 transactional core + CQRS + WebSockets |
| **FastAPI Quant Engine** | `8000` | `http://localhost:8000/docs` | Quant analytics, DAG runners, W3C Knowledge Graph |
| **Apache Airflow Webserver**| `8085` | `http://localhost:8085` | Medallion Data Engineering & Pipeline Orchestrator |
| **Rust Monte Carlo Engine** | `9000` | `http://localhost:9000/health` | High-throughput SIMD Rayon stochastic simulation |
| **Apache Kafka Broker** | `9092` | `localhost:9092` | Real-time event-driven streaming backbone |
| **Redis Cache & Lock** | `6379` | `localhost:6379` | Distributed locks, sliding window rate limiters |
| **PostgreSQL 16 & TimescaleDB**| `5433` | `localhost:5433` | Primary relational & time-series hypertable store |
| **Prometheus Telemetry** | `9090` | `http://localhost:9090` | High-cardinality time-series metrics collection |
| **Grafana Observability** | `3001` | `http://localhost:3001` | Infrastructure & pipeline observability dashboards |
| **Jaeger Distributed Tracing**| `16686` | `http://localhost:16686` | End-to-end distributed request latency tracing |

---

## 🔄 Orchestrating Medallion Data Pipelines

### Via Apache Airflow 2.9 (CLI & LocalExecutor)
Trigger DAGs directly inside the Airflow scheduler container:
```bash
# DAG 01: Market Data Ingestion & Technical Indicators
docker compose exec airflow-scheduler airflow dags trigger wealthos_market_data_ingestion

# DAG 02: End-of-Day Mark-to-Market Valuation & Snapshots
docker compose exec airflow-scheduler airflow dags trigger wealthos_eod_portfolio_valuation

# DAG 03: Quantitative Risk Engine & Macro Stress Testing
docker compose exec airflow-scheduler airflow dags trigger wealthos_risk_stress_testing

# DAG 04: Semantic Knowledge Graph & FIBO RDF ETL
docker compose exec airflow-scheduler airflow dags trigger wealthos_semantic_kg_sync
```

### Via FastAPI Microservice REST API
Pipelines can also be triggered programmatically through REST endpoints:
```bash
# Trigger Market Data Ingestion
curl -X POST http://localhost:8000/api/v1/dags/wealthos_market_data_ingestion/run

# Trigger EOD Valuation & CQRS Snapshots
curl -X POST http://localhost:8000/api/v1/dags/wealthos_eod_portfolio_valuation/run

# Trigger Value-at-Risk & Macro Stress Testing
curl -X POST http://localhost:8000/api/v1/dags/wealthos_risk_stress_testing/run

# Trigger Semantic Knowledge Graph & FIBO Triplestore Sync
curl -X POST http://localhost:8000/api/v1/dags/wealthos_semantic_kg_sync/run
```

---

## 🧪 Testing & Quality Assurance

### Frontend Unit & Integration Tests (Vitest + React Testing Library)
```bash
cd frontend
npm install
npx vitest run
```
*Result: 15 / 15 test suites passed (36 / 36 unit tests — 100% pass rate).*

### Backend Integration Tests (Spring Boot + JUnit 5)
```bash
cd backend
./mvnw test
```

### FastAPI Quantitative & Semantic Suite (Pytest)
```bash
cd fastapi
pytest
```
*Includes tests for RDF mapping (`test_rdf_mapper.py`), SHACL shape validation (`test_shacl.py`), SPARQL engine (`test_sparql_engine.py`), and DAG pipeline triggers (`test_dags_router.py` — 26 / 26 passed).*

---

## 📄 License & Terms of Use

Copyright © 2026 Panagiotis Papatheodoropoulos. All rights reserved.

This repository is **source-available for inspection, portfolio review, and evaluation purposes only**.

* **Viewing & Evaluation**: You are welcome to browse the source code, evaluate the architecture, and execute it locally for personal inspection and evaluation of the author's work.
* **Strict Copying & Distribution Prohibition**: Copying, duplicating, cloning into public mirrors, modifying, redistributing, sublicensing, or commercially exploiting any part of this software, its quantitative models, or its architectures without prior written consent from the author is strictly prohibited.

For complete legal terms and conditions, refer to the [LICENSE](LICENSE) file.