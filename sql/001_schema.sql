BEGIN;

CREATE TABLE IF NOT EXISTS companies (
    id BIGSERIAL PRIMARY KEY,
    stock_ticker TEXT NOT NULL UNIQUE,
    parent_company_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT companies_stock_ticker_not_blank CHECK (BTRIM(stock_ticker) <> ''),
    CONSTRAINT companies_parent_company_name_not_blank CHECK (BTRIM(parent_company_name) <> '')
);

CREATE TABLE IF NOT EXISTS plants (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    plant_name TEXT NOT NULL,
    latitude NUMERIC(9, 6) NOT NULL,
    longitude NUMERIC(9, 6) NOT NULL,
    total_mw_capacity NUMERIC(12, 3) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT plants_name_company_unique UNIQUE (company_id, plant_name),
    CONSTRAINT plants_name_not_blank CHECK (BTRIM(plant_name) <> ''),
    CONSTRAINT plants_latitude_range CHECK (latitude BETWEEN -90 AND 90),
    CONSTRAINT plants_longitude_range CHECK (longitude BETWEEN -180 AND 180),
    CONSTRAINT plants_total_mw_capacity_positive CHECK (total_mw_capacity > 0)
);

CREATE TABLE IF NOT EXISTS shareholders (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    institutional_investor_name TEXT NOT NULL,
    ownership_percentage NUMERIC(7, 4) NOT NULL,
    reported_at DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT shareholders_company_investor_unique UNIQUE (
        company_id,
        institutional_investor_name,
        reported_at
    ),
    CONSTRAINT shareholders_investor_name_not_blank CHECK (BTRIM(institutional_investor_name) <> ''),
    CONSTRAINT shareholders_ownership_percentage_range CHECK (
        ownership_percentage >= 0
        AND ownership_percentage <= 100
    )
);

CREATE TABLE IF NOT EXISTS telemetry (
    id BIGSERIAL PRIMARY KEY,
    plant_id BIGINT NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
    observed_at TIMESTAMPTZ NOT NULL,
    realtime_output_mw NUMERIC(12, 3) NOT NULL,
    local_marginal_price_usd_mwh NUMERIC(12, 4) NOT NULL,
    source TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT telemetry_plant_observed_at_unique UNIQUE (plant_id, observed_at),
    CONSTRAINT telemetry_realtime_output_mw_nonnegative CHECK (realtime_output_mw >= 0)
);

CREATE INDEX IF NOT EXISTS idx_plants_company_id
    ON plants(company_id);

CREATE INDEX IF NOT EXISTS idx_shareholders_company_id
    ON shareholders(company_id);

CREATE INDEX IF NOT EXISTS idx_telemetry_plant_observed_at
    ON telemetry(plant_id, observed_at DESC);

CREATE INDEX IF NOT EXISTS idx_telemetry_observed_at
    ON telemetry(observed_at DESC);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_companies_updated_at ON companies;
CREATE TRIGGER trg_companies_updated_at
BEFORE UPDATE ON companies
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_plants_updated_at ON plants;
CREATE TRIGGER trg_plants_updated_at
BEFORE UPDATE ON plants
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_shareholders_updated_at ON shareholders;
CREATE TRIGGER trg_shareholders_updated_at
BEFORE UPDATE ON shareholders
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

COMMIT;

