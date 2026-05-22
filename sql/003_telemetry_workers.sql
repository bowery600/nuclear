BEGIN;

ALTER TABLE telemetry
    ALTER COLUMN realtime_output_mw DROP NOT NULL,
    ALTER COLUMN local_marginal_price_usd_mwh DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS capacity_percentage NUMERIC(6, 3),
    ADD COLUMN IF NOT EXISTS iso_code TEXT,
    ADD COLUMN IF NOT EXISTS lmp_market TEXT,
    ADD COLUMN IF NOT EXISTS lmp_location TEXT,
    ADD COLUMN IF NOT EXISTS lmp_location_type TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'telemetry_capacity_percentage_range'
    ) THEN
        ALTER TABLE telemetry
            ADD CONSTRAINT telemetry_capacity_percentage_range CHECK (
                capacity_percentage IS NULL
                OR capacity_percentage BETWEEN 0 AND 100
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'telemetry_has_measurement'
    ) THEN
        ALTER TABLE telemetry
            ADD CONSTRAINT telemetry_has_measurement CHECK (
                realtime_output_mw IS NOT NULL
                OR local_marginal_price_usd_mwh IS NOT NULL
                OR capacity_percentage IS NOT NULL
            );
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_telemetry_iso_observed_at
    ON telemetry(iso_code, observed_at DESC);

DROP TRIGGER IF EXISTS trg_telemetry_updated_at ON telemetry;
CREATE TRIGGER trg_telemetry_updated_at
BEFORE UPDATE ON telemetry
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

COMMIT;
