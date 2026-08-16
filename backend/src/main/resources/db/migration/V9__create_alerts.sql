CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
    condition VARCHAR(20) NOT NULL,
    target_price NUMERIC(18, 6) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    triggered_at TIMESTAMPTZ,
    CONSTRAINT chk_alerts_condition CHECK (condition IN ('ABOVE', 'BELOW')),
    CONSTRAINT chk_alerts_status CHECK (status IN ('ACTIVE', 'TRIGGERED', 'CANCELLED')),
    CONSTRAINT chk_alerts_target_price_positive CHECK (target_price > 0)
);

CREATE INDEX idx_alerts_user_id ON alerts (user_id, created_at DESC);
CREATE INDEX idx_alerts_active_asset ON alerts (status, asset_id) WHERE status = 'ACTIVE';
