CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(20) NOT NULL,
    name VARCHAR(150) NOT NULL,
    asset_type VARCHAR(30) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    current_price NUMERIC(18, 6) NOT NULL DEFAULT 0,
    price_updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_assets_symbol UNIQUE (symbol),
    CONSTRAINT chk_assets_type CHECK (asset_type IN ('STOCK', 'CRYPTO', 'ETF', 'BOND', 'COMMODITY')),
    CONSTRAINT chk_assets_price_non_negative CHECK (current_price >= 0)
);

CREATE TABLE asset_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    price NUMERIC(18, 6) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assets_symbol ON assets (symbol);
CREATE INDEX idx_asset_price_history_asset_recorded ON asset_price_history (asset_id, recorded_at);
