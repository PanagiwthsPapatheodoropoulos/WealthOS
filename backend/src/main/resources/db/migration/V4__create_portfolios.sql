CREATE TABLE portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE portfolio_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
    quantity NUMERIC(18, 6) NOT NULL DEFAULT 0,
    avg_cost NUMERIC(18, 6) NOT NULL DEFAULT 0,
    CONSTRAINT uq_portfolio_assets_portfolio_asset UNIQUE (portfolio_id, asset_id),
    CONSTRAINT chk_portfolio_assets_quantity_non_negative CHECK (quantity >= 0)
);

CREATE INDEX idx_portfolios_account_id ON portfolios (account_id);
CREATE INDEX idx_portfolio_assets_portfolio_id ON portfolio_assets (portfolio_id);
CREATE INDEX idx_portfolio_assets_asset_id ON portfolio_assets (asset_id);
