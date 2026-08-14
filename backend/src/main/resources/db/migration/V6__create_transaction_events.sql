CREATE TABLE transaction_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    portfolio_id UUID NOT NULL,
    event_type VARCHAR(40) NOT NULL,
    payload JSONB NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_transaction_events_type CHECK (
        event_type IN ('TRANSACTION_INITIATED', 'TRANSACTION_EXECUTED', 'TRANSACTION_BOUGHT', 'TRANSACTION_SOLD')
    )
);

CREATE INDEX idx_transaction_events_transaction_id ON transaction_events (transaction_id, occurred_at);
CREATE INDEX idx_transaction_events_user_id ON transaction_events (user_id, occurred_at DESC);
