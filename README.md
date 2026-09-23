# WealthOS — Institutional Multi-Asset Wealth Operating System

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![React Query](https://img.shields.io/badge/TanStack_Query-v5-ff4154.svg)](https://tanstack.com/query/latest)
[![Java](https://img.shields.io/badge/Java-17-orange.svg)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.3-green.svg)](https://spring.io/projects/spring-boot)
[![Python](https://img.shields.io/badge/Python-3.11-yellow.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-teal.svg)](https://fastapi.tiangolo.com/)
[![Semantic Web](https://img.shields.io/badge/W3C-RDF%20%7C%20SHACL%20%7C%20SPARQL-8B008B.svg)](https://www.w3.org/standards/semanticweb/)
[![Kafka](https://img.shields.io/badge/Apache_Kafka-3.7-black.svg)](https://kafka.apache.org/)
[![Redis](https://img.shields.io/badge/Redis-7.2-dc382d.svg)](https://redis.io/)
[![Rust](https://img.shields.io/badge/Rust-1.78-red.svg)](https://www.rust-lang.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ed.svg)](https://www.docker.com/)
[![License: View-Only](https://img.shields.io/badge/License-View--Only%20%2F%20All%20Rights%20Reserved-red.svg)](LICENSE)

**WealthOS** is an institutional-grade, distributed wealth management and autonomous portfolio surveillance platform. Built with a high-throughput microservices architecture, WealthOS integrates quantitative valuation models, automated data engineering pipelines (DAGs), event-driven stream processing, formal W3C Semantic Knowledge Graphs (RDF/FIBO/SHACL/SPARQL), sub-millisecond Rust stochastic engines, and real-time risk surveillance into a single unified operating system.

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
              │ & Batch DAG Pipelines │  │ Distributed  │   │  - Append-Only Events  │
              │ - W3C Knowledge Graph │  │ Locks (Lua)  │   │  - Flyway Migrations   │
              │ - FIBO / SHACL / SPARQL│ │ Rate Limiters│   │  - Optimistic Locking  │
              └───────────┬───────────┘  └──────────────┘   └────────────┬───────────┘
                          │                                              │
                          ▼                                              ▼
              ┌───────────────────────┐                     ┌────────────────────────┐
              │  Rust Monte Carlo Svc │                     │  Apache Kafka Cluster  │
              │  (Rayon Parallel SIMD)│                     │  (Event-Driven Stream) │
              └───────────────────────┘                     └────────────────────────┘
```

---

## 🛠️ Technology Stack & Engineering Specifications

| Layer | Technologies & Frameworks | Architectural Role |
|---|---|---|
| **Core Transaction Engine** | Java 17, Spring Boot 3.3, Spring Data JPA, Spring Security, Spring WebSocket / STOMP, Flyway, Resilience4j | CQRS command processing, append-only event sourcing, optimistic locking, idempotent order matching, slippage modeling |
| **Semantic Knowledge Graph** | W3C RDF 1.1, Turtle (`.ttl`), JSON-LD, FIBO (Financial Industry Business Ontology), W3C SHACL, SPARQL 1.1, RDFlib, PySHACL | Formal semantic domain model, automated triplification, ontology integrity enforcement, SPARQL graph analytics |
| **Data Streaming & Messaging** | Apache Kafka 3.7 (Consumer Groups, `market-ticks`), SockJS, STOMP Full-Duplex WebSockets | Real-time market tick ingestion, anomaly detection, live execution fill broadcasts, instant portfolio notifications |
| **Distributed State & Concurrency** | Redis 7.2 (Lua-Atomic Mutex Distributed Locks, Sliding Window Log, Token Bucket Limiter, TTL Caching) | Concurrency protection across distributed workers, sub-second API throttling, low-latency quote cache |
| **Quant Engine & Data Engineering** | Python 3.11, FastAPI, Pydantic v2, NumPy, SciPy (SLSQP Optimizer), Pandas, SQLAlchemy, Custom DAG Orchestrator | DCF intrinsic valuation, Markowitz Efficient Frontier, Greek Law 4172/2013 tax audit, automated batch data pipelines |
| **High-Performance Stochastic Simulation** | Rust 1.78, Axum, Tokio Async, Rayon (Data Parallelism), Rand/Rand_Distr, Serde | SIMD/Multithreaded Geometric Brownian Motion (GBM), 100K+ path Monte Carlo, Value-at-Risk (VaR / CVaR) |
| **Reactive Client Application** | React 18, TypeScript 5.5, Vite 5, TanStack React Query v5, Tailwind CSS, Lucide Icons | Zero-polling server-state synchronization, optimistic UI mutations, cubic Bezier trend splines, dynamic ECB FX crosses |
| **Persistence & Audit Storage** | PostgreSQL 16 (B-Tree & GiST indexes, `@Version` optimistic concurrency, immutable event store) | ACID transactional store, ledger accounting, historical pricing, event sourcing projection source |
| **Observability & Infrastructure** | Docker Compose, Nginx Reverse Proxy, Prometheus, Grafana, OpenTelemetry, Jaeger Tracing | Microservices containerization, end-to-end distributed tracing, time-series metrics, health probes |

---

## 🔬 Deep-Dive Architectural & Engineering Highlights

### 1. W3C Semantic Knowledge Graph: RDF, FIBO, SHACL & SPARQL
WealthOS implements a formal W3C Semantic Web layer bridging relational databases and financial ontology graphs:
* **FIBO Ontology Alignment**: Custom financial ontology (`wealthos_fibo.ttl`) directly inheriting from the Enterprise Data Management Council’s **Financial Industry Business Ontology (FIBO)**:
  * `wos:FinancialAsset` $\sqsubseteq$ `fibo-fnd-acc-cur:FinancialAsset`
  * `wos:Stock` $\sqsubseteq$ `wos:FinancialAsset` $\sqcap$ `fibo-sec-eq:Share`
  * `wos:ETF` $\sqsubseteq$ `wos:FinancialAsset` $\sqcap$ `fibo-sec-fund:ExchangeTradedFund`
  * `wos:FinancialTransaction` $\sqsubseteq$ `fibo-fnd-txn:Transaction`
* **Automated Triplification & Serialization (`RDFMappingService`)**: Relational PostgreSQL models (portfolios, holdings, assets, transactions) are dynamically triplified into RDF graphs using `rdflib`, supporting export in **Turtle (`.ttl`)**, **JSON-LD**, **N-Triples (`.nt`)**, and **RDF/XML**.
* **W3C SHACL Constraint Validation (`SHACLValidationService`)**: Validates data graph compliance using `pyshacl` with RDFS inferencing against `wealthos_shapes.shacl.ttl`:
  * **Ticker Integrity**: Regex pattern matching `^[A-Z0-9.-]+$` with exact cardinality (`sh:minCount 1`, `sh:maxCount 1`).
  * **Market Invariants**: Strict non-negative cash balances (`sh:minInclusive 0.0`), positive market prices (`sh:minExclusive 0.0`), and normalized risk/ESG scores ($[0.0, 1.0]$ and $[0.0, 100.0]$).
  * **Taxonomy Enforcement**: Mandatory classification of assets into economic sectors (`wos:EconomicSector`).
* **SPARQL 1.1 Analytical Query Engine (`SPARQLEngine`)**: In-memory graph query execution engine supporting complex analytical graph traversals:
  ```sparql
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
  ```

---

### 2. Distributed Concurrency, Locking & Rate Limiting (Redis & Spring Boot)
* **Atomic Mutex Distributed Locking (`DistributedLockService`)**: Built on Redis `SETNX` with cryptographic UUID ownership tokens and atomic Lua script release to prevent split-brain unlocks or releasing another worker's lock upon TTL expiration:
  ```lua
  if redis.call('GET', KEYS[1]) == ARGV[1] then
      return redis.call('DEL', KEYS[1])
  else
      return 0
  end
  ```
* **Dual-Strategy Distributed Rate Limiting**:
  * **Sliding Window Log (`SlidingWindowRateLimiter`)**: Uses Redis sorted sets (`ZSET`) with Unix microsecond timestamps (`ZREMRANGEBYSCORE`, `ZADD`, `ZCARD`, `EXPIRE`) for sub-second precision against API burst attacks on market endpoints.
  * **Token Bucket (`TokenBucketRateLimiter`)**: Dynamic bucket capacity and replenishment rate per minute for LLM insights endpoints.
* **Idempotent Order Pipeline**: High-throughput execution guarded by client-supplied `Idempotency-Key` headers, verified via Redis/PostgreSQL hashes to guarantee zero duplicate orders during network retransmissions.
* **JPA Optimistic Concurrency Control**: Entities (`Account`, `Portfolio`) utilize JPA `@Version` fields to detect and reject concurrent double-spend race conditions (`ConflictException` 409).
* **Simulated Institutional Slippage Engine (`SlippageEngine`)**: Dynamically models market liquidity degradation as a function of order notional value versus average daily volume:
  $$\text{Total Spread (bps)} = \min\left(\text{Base Spread} + \text{Impact Coeff} \times \frac{\text{Notional}}{10000}, \text{Max Bps}\right)$$

---

### 3. Event-Driven Market Streaming & WebSockets (Kafka & STOMP)
* **Kafka Tick Ingestion**: High-throughput consumer group (`wealthos-market-analytics`) ingesting high-frequency price feeds from the `market-ticks` topic.
* **Statistical Anomaly Detection**: `RollingStatsService` and `PriceAnomaly` monitoring streaming market ticks to identify statistically significant volatility spikes ($Z\text{-score} \ge 3.0$) and sudden price jumps ($\ge 4\%$).
* **Full-Duplex STOMP WebSockets**: Real-time push over SockJS/STOMP:
  * User-isolated private queues: `/user/{userId}/queue/notifications` (instant execution fills, margin alerts).
  * Broadcast topics: `/topic/portfolio-updates` and `/topic/market-data` for live quote updates without client polling.

---

### 4. Automated Data Engineering Pipelines (Batch DAGs)
WealthOS features a built-in programmatic DAG orchestrator (`dag_runner.py`) running structured, dependency-ordered data engineering workflows:
* **`dag_01_market_data_ingestion`**: Batch extraction, normalization, and staging of global multi-asset historical OHLCV data with technical indicator calculation (SMA-20, SMA-50, rolling volatility) and price jump anomaly detection.
* **`dag_02_eod_portfolio_valuation`**: End-of-Day mark-to-market valuations, realized/unrealized P&L reconciliation, and portfolio performance ledger snapshots.
* **`dag_03_risk_stress_testing`**: Multi-asset stress testing under macro shock scenarios (Black Swan, Interest Rate Spike, Stagflation), correlation breakdown, and Conditional Value-at-Risk (CVaR).
* **`dag_04_semantic_knowledge_graph_sync`**: Full ETL pipeline: relational PostgreSQL extraction $\rightarrow$ FIBO RDF triplification $\rightarrow$ OWL consistency verification $\rightarrow$ W3C SHACL shape validation $\rightarrow$ Triplestore synchronization and multi-format serialization.

---

### 5. Quantitative Optimization & Regulatory Compliance (FastAPI & SciPy)
* **Markowitz Modern Portfolio Theory (MPT)**: Quadratic optimization via SciPy’s Sequential Least Squares Programming (SLSQP) solver to trace the Efficient Frontier, maximize Sharpe ratio, and minimize volatility:
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
* **Multi-Timeframe Dynamic Spline**: Smooth cubic Bezier spline SVG chart (`24H`, `7D`, `30D`, `3M`, `YTD`) with interactive hover crosshair and period delta tracking.
* **Live ECB FX Cross Conversion**: Mathematical currency conversions (`EUR`, `USD`, `GBP`, `CHF`, `JPY`) calculated using live European Central Bank (ECB) reference rates with strict sign and rounding formatting (`-$30.00`).
* **Instant Surveillance Radar**: Multi-metric asset radar featuring P/E (TTM), PEG ratio, Total Expense Ratio (TER), Beta ($\beta$), and dividend yields.
* **Real-Time WebSocket Integration**: Native reactive hook `useWebSocket` maintaining persistent STOMP connections for instant toast notifications and status synchronizations.

---

### 8. Clean Database Initialization & Zero Hardcoded Secrets
* **Clean Database Migrations**: All Flyway database migrations (`V1` through `V19`) execute purely declarative schema definitions. Every user undergoes fresh self-registration with secure BCrypt hashing.
* **Parameterized Configuration**: All credentials, database URLs, JWT keys, and API secrets are parameterized through environment variables (`.env.example`).

---

## 🚀 Getting Started

### Prerequisites
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) (v24.0+ recommended)
* [Node.js](https://nodejs.org/) (v20+ LTS) — *optional for local frontend dev*
* [Java JDK 17](https://adoptium.net/) & Maven — *optional for local backend dev*
* [Python 3.11+](https://www.python.org/) — *optional for local FastAPI dev*

### 1. Environment Configuration
Create a `.env` file in the project root:
```bash
cp .env.example .env
```

### 2. Launching via Docker Compose
To build and start the entire distributed cluster simultaneously:
```bash
docker compose up --build -d
```

Verify service status:
```bash
docker compose ps
```

| Service | Port | Endpoint | Description |
|---|---|---|---|
| **Frontend UI** | `3000` (or `80`) | `http://localhost:3000` | React 18 SPA + TanStack Query v5 |
| **Spring Boot Core API** | `8080` | `http://localhost:8080/api/v1` | Java 17 transactional core + WebSockets |
| **FastAPI Quant Engine** | `8000` | `http://localhost:8000/docs` | Quant analytics, DAGs, Knowledge Graph |
| **Rust Monte Carlo** | `9000` | `http://localhost:9000/health` | High-throughput SIMD stochastic service |
| **Apache Kafka** | `9092` | `localhost:9092` | Event-driven stream broker |
| **Redis** | `6379` | `localhost:6379` | Distributed cache, locks & rate limiting |
| **PostgreSQL** | `5432` | `localhost:5432` | Primary relational store (Flyway migrations) |
| **Prometheus Metrics** | `9090` | `http://localhost:9090` | Time-series system metrics collection |
| **Grafana Dashboards** | `3001` | `http://localhost:3001` | Infrastructure and application telemetry |
| **Jaeger Tracing UI** | `16686` | `http://localhost:16686` | Distributed request tracing |

---

## 🔄 Running Data Engineering DAGs

To execute the batch data pipelines on-demand via the orchestrator:

```bash
# List all registered DAG pipelines
docker compose exec ai-service python dags/dag_runner.py --list

# Run Semantic Knowledge Graph & FIBO RDF Sync pipeline
docker compose exec ai-service python dags/dag_runner.py --run dag_04_semantic_knowledge_graph_sync

# Run End-of-Day Portfolio Valuation pipeline
docker compose exec ai-service python dags/dag_runner.py --run dag_02_eod_portfolio_valuation

# Execute all pipelines in dependency sequence
docker compose exec ai-service python dags/dag_runner.py --run-all
```

---

## 🧪 Testing & Quality Assurance

### Frontend Unit & Integration Tests (Vitest + React Testing Library)
```bash
cd frontend
npm install
npx vitest run
```
*Pass Rate: 15 / 15 test suites passed (36 / 36 unit tests — 100% pass rate).*

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
*Includes tests for RDF mapping (`test_rdf_mapper.py`), SHACL shape validation (`test_shacl.py`), SPARQL engine (`test_sparql_engine.py`), and batch DAG execution (`test_dags.py`).*

---

## 📄 License & Terms of Use

Copyright © 2026 Panagiotis Papatheodoropoulos. All rights reserved.

This repository is **source-available for inspection, portfolio review, and evaluation purposes only**.

* **Viewing & Evaluation**: You are welcome to browse the source code, evaluate the architecture, and execute it locally for personal inspection and evaluation of the author's work.
* **Strict Copying & Distribution Prohibition**: Copying, duplicating, cloning into public mirrors, modifying, redistributing, sublicensing, or commercially exploiting any part of this software, its quantitative models, or its architectures without prior written consent from the author is strictly prohibited.

For complete legal terms and conditions, refer to the [LICENSE](LICENSE) file.