CREATE TABLE IF NOT EXISTS user_broker_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    broker VARCHAR(50) NOT NULL,
    api_key TEXT NOT NULL,
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_synced_at TIMESTAMPTZ,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    CONSTRAINT uq_user_broker UNIQUE (user_id, broker)
);

CREATE INDEX IF NOT EXISTS idx_user_broker_connections_user ON user_broker_connections (user_id);
