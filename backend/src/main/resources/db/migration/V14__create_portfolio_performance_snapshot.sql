CREATE TABLE portfolio_performance_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_value NUMERIC(18, 2) NOT NULL,
    cash_balance NUMERIC(18, 2) NOT NULL,
    holdings_value NUMERIC(18, 2) NOT NULL,
    daily_pnl NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    daily_pnl_percentage NUMERIC(8, 4) NOT NULL DEFAULT 0.0000,
    snapshot_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_portfolio_snapshot_date UNIQUE (portfolio_id, snapshot_date)
);

CREATE INDEX idx_portfolio_snapshots_lookup ON portfolio_performance_snapshots (portfolio_id, snapshot_date ASC);
CREATE INDEX idx_portfolio_snapshots_user_date ON portfolio_performance_snapshots (user_id, snapshot_date DESC);
