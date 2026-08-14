CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
    type VARCHAR(20) NOT NULL,
    quantity NUMERIC(18, 6) NOT NULL,
    price NUMERIC(18, 6) NOT NULL,
    total_amount NUMERIC(18, 2) NOT NULL,
    realized_pnl NUMERIC(18, 2),
    executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_transactions_type CHECK (type IN ('BUY', 'SELL', 'DEPOSIT', 'WITHDRAWAL')),
    CONSTRAINT chk_transactions_quantity_positive CHECK (quantity > 0),
    CONSTRAINT chk_transactions_realized_pnl_only_sell CHECK (type = 'SELL' OR realized_pnl IS NULL)
);

CREATE INDEX idx_transactions_portfolio_id ON transactions (portfolio_id);
CREATE INDEX idx_transactions_executed_at ON transactions (executed_at DESC);
