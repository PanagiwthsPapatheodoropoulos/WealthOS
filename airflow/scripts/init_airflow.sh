#!/usr/bin/env bash
# ==============================================================================
# WealthOS Apache Airflow 2.9 - Production Bootstrap & Database Initializer
# ==============================================================================
# Idempotent script executed by airflow-init container.
# 1. Connects to PostgreSQL using injected environment variables (no hardcoded passwords).
# 2. Ensures the dedicated 'airflow' metadata database exists.
# 3. Runs 'airflow db migrate' to apply schema updates.
# 4. Idempotently provisions the RBAC Admin user.
# ==============================================================================

set -eo pipefail

echo "[Airflow-Init] Step 1/3: Verifying PostgreSQL connectivity and 'airflow' database..."

python - <<'EOF'
import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

host = os.getenv("POSTGRES_HOST", "postgres")
port = int(os.getenv("POSTGRES_PORT", "5432"))
user = os.getenv("POSTGRES_USER", "postgres")
password = os.getenv("POSTGRES_PASSWORD")
default_db = os.getenv("POSTGRES_DB", "wealthos")

if not password:
    print("[Airflow-Init] FATAL: POSTGRES_PASSWORD environment variable is required.", file=sys.stderr)
    sys.exit(1)

try:
    conn = psycopg2.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        dbname=default_db,
        connect_timeout=10,
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM pg_database WHERE datname='airflow'")
    if not cur.fetchone():
        cur.execute("CREATE DATABASE airflow")
        print("[Airflow-Init] Created 'airflow' metadata database successfully.")
    else:
        print("[Airflow-Init] 'airflow' metadata database already exists.")
    cur.close()
    conn.close()
except Exception as e:
    print(f"[Airflow-Init] Database bootstrap error: {e}", file=sys.stderr)
    sys.exit(1)
EOF

echo "[Airflow-Init] Step 2/3: Executing Airflow database migrations..."
airflow db migrate

echo "[Airflow-Init] Step 3/3: Idempotently provisioning Airflow Administrator..."
ADMIN_USER="${AIRFLOW_ADMIN_USER:-admin}"
ADMIN_PASSWORD="${AIRFLOW_ADMIN_PASSWORD}"
ADMIN_EMAIL="${AIRFLOW_ADMIN_EMAIL:-admin@wealthos.local}"
ADMIN_FIRSTNAME="${AIRFLOW_ADMIN_FIRSTNAME:-WealthOS}"
ADMIN_LASTNAME="${AIRFLOW_ADMIN_LASTNAME:-Admin}"

if [ -z "$ADMIN_PASSWORD" ]; then
    echo "[Airflow-Init] FATAL: AIRFLOW_ADMIN_PASSWORD environment variable is required." >&2
    exit 1
fi

airflow users create \
    --role Admin \
    --username "$ADMIN_USER" \
    --password "$ADMIN_PASSWORD" \
    --email "$ADMIN_EMAIL" \
    --firstname "$ADMIN_FIRSTNAME" \
    --lastname "$ADMIN_LASTNAME" || true

echo "[Airflow-Init] Airflow initialization completed successfully."
