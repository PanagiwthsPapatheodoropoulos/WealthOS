CREATE TABLE price_anomalies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    price NUMERIC(18, 6) NOT NULL,
    z_score NUMERIC(8, 4) NOT NULL,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_price_anomalies_symbol_detected ON price_anomalies (symbol, detected_at DESC);
CREATE INDEX idx_price_anomalies_asset_detected ON price_anomalies (asset_id, detected_at DESC);
