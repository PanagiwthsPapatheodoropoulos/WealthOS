-- Migration V16: Add optimistic locking version column to high-concurrency entities
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE portfolio_assets ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
