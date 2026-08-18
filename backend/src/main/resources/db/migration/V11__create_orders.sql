CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
    type VARCHAR(20) NOT NULL,
    action VARCHAR(10) NOT NULL,
    quantity NUMERIC(18, 6) NOT NULL,
    target_price NUMERIC(18, 6) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    filled_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    CONSTRAINT chk_orders_type CHECK (type IN ('LIMIT', 'STOP_LOSS')),
    CONSTRAINT chk_orders_action CHECK (action IN ('BUY', 'SELL')),
    CONSTRAINT chk_orders_status CHECK (status IN ('PENDING', 'FILLED', 'CANCELLED')),
    CONSTRAINT chk_orders_quantity_positive CHECK (quantity > 0),
    CONSTRAINT chk_orders_target_price_positive CHECK (target_price > 0)
);

CREATE INDEX idx_orders_user_created ON orders (user_id, created_at DESC);
CREATE INDEX idx_orders_portfolio_created ON orders (portfolio_id, created_at DESC);
CREATE INDEX idx_orders_pending_matching ON orders (status, asset_id) WHERE status = 'PENDING';
