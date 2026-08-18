CREATE TABLE bank_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    provider VARCHAR(100) NOT NULL,
    external_account_id VARCHAR(150) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_bank_connections_status CHECK (status IN ('ACTIVE', 'DISCONNECTED', 'ERROR')),
    CONSTRAINT uq_bank_connections_user_external UNIQUE (user_id, external_account_id)
);

CREATE INDEX idx_bank_connections_user ON bank_connections (user_id);
CREATE INDEX idx_bank_connections_account ON bank_connections (account_id);
