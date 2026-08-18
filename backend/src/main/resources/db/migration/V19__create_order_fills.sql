CREATE TABLE order_fills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    fill_quantity NUMERIC(18,6) NOT NULL,
    fill_price NUMERIC(18,6) NOT NULL,
    slippage_bps NUMERIC(8,2) NOT NULL DEFAULT 0,
    filled_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_order_fills_order_id ON order_fills (order_id, filled_at);
