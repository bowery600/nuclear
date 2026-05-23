BEGIN;

-- 1. Create the plant_equity_stakes table
CREATE TABLE IF NOT EXISTS plant_equity_stakes (
    id BIGSERIAL PRIMARY KEY,
    plant_id BIGINT NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
    owner_name TEXT NOT NULL,
    equity_percentage NUMERIC(5, 2) NOT NULL,
    parent_company_id BIGINT REFERENCES companies(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT plant_equity_stakes_plant_owner_unique UNIQUE (plant_id, owner_name),
    CONSTRAINT plant_equity_stakes_owner_name_not_blank CHECK (BTRIM(owner_name) <> ''),
    CONSTRAINT plant_equity_stakes_equity_range CHECK (equity_percentage BETWEEN 0 AND 100)
);

CREATE INDEX IF NOT EXISTS idx_plant_equity_stakes_plant_id
    ON plant_equity_stakes(plant_id);

CREATE INDEX IF NOT EXISTS idx_plant_equity_stakes_parent_company_id
    ON plant_equity_stakes(parent_company_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_plant_equity_stakes_updated_at ON plant_equity_stakes;
CREATE TRIGGER trg_plant_equity_stakes_updated_at
BEFORE UPDATE ON plant_equity_stakes
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- 2. Upsert the additional parent companies
INSERT INTO companies (stock_ticker, parent_company_name)
VALUES
    ('CPS', 'CPS Energy'),
    ('AE', 'Austin Energy'),
    ('OGLE', 'Oglethorpe Power Corporation'),
    ('MEAG', 'Municipal Electric Authority of Georgia'),
    ('DALTON', 'Dalton Utilities'),
    ('SRP', 'Salt River Project'),
    ('EPE', 'El Paso Electric Company'),
    ('EIX', 'Edison International'),
    ('PNM', 'PNM Resources, Inc.'),
    ('SCPPA', 'Southern California Public Power Authority'),
    ('LADWP', 'Los Angeles Department of Water and Power'),
    ('NCMPA1', 'North Carolina Municipal Power Agency No. 1'),
    ('NCEMPA', 'North Carolina Eastern Municipal Power Agency')
ON CONFLICT (stock_ticker) DO UPDATE
SET parent_company_name = EXCLUDED.parent_company_name;

-- 3. Seed joint equity distribution
-- South Texas Project (STP)
WITH p AS (SELECT id FROM plants WHERE plant_name = 'South Texas'),
     c_ceg AS (SELECT id FROM companies WHERE stock_ticker = 'CEG'),
     c_cps AS (SELECT id FROM companies WHERE stock_ticker = 'CPS'),
     c_ae AS (SELECT id FROM companies WHERE stock_ticker = 'AE')
INSERT INTO plant_equity_stakes (plant_id, owner_name, equity_percentage, parent_company_id)
SELECT p.id, 'Constellation Energy Generation, LLC', 44.00, c_ceg.id FROM p, c_ceg
UNION ALL
SELECT p.id, 'CPS Energy', 40.00, c_cps.id FROM p, c_cps
UNION ALL
SELECT p.id, 'Austin Energy', 16.00, c_ae.id FROM p, c_ae
ON CONFLICT (plant_id, owner_name) DO UPDATE
SET equity_percentage = EXCLUDED.equity_percentage,
    parent_company_id = EXCLUDED.parent_company_id;

-- Vogtle
WITH p AS (SELECT id FROM plants WHERE plant_name = 'Vogtle'),
     c_so AS (SELECT id FROM companies WHERE stock_ticker = 'SO'),
     c_ogle AS (SELECT id FROM companies WHERE stock_ticker = 'OGLE'),
     c_meag AS (SELECT id FROM companies WHERE stock_ticker = 'MEAG'),
     c_dalton AS (SELECT id FROM companies WHERE stock_ticker = 'DALTON')
INSERT INTO plant_equity_stakes (plant_id, owner_name, equity_percentage, parent_company_id)
SELECT p.id, 'Georgia Power Company', 45.70, c_so.id FROM p, c_so
UNION ALL
SELECT p.id, 'Oglethorpe Power Corporation', 30.00, c_ogle.id FROM p, c_ogle
UNION ALL
SELECT p.id, 'Municipal Electric Authority of Georgia', 22.70, c_meag.id FROM p, c_meag
UNION ALL
SELECT p.id, 'Dalton Utilities', 1.60, c_dalton.id FROM p, c_dalton
ON CONFLICT (plant_id, owner_name) DO UPDATE
SET equity_percentage = EXCLUDED.equity_percentage,
    parent_company_id = EXCLUDED.parent_company_id;

-- Hatch
WITH p AS (SELECT id FROM plants WHERE plant_name = 'Hatch'),
     c_so AS (SELECT id FROM companies WHERE stock_ticker = 'SO'),
     c_ogle AS (SELECT id FROM companies WHERE stock_ticker = 'OGLE'),
     c_meag AS (SELECT id FROM companies WHERE stock_ticker = 'MEAG'),
     c_dalton AS (SELECT id FROM companies WHERE stock_ticker = 'DALTON')
INSERT INTO plant_equity_stakes (plant_id, owner_name, equity_percentage, parent_company_id)
SELECT p.id, 'Georgia Power Company', 50.10, c_so.id FROM p, c_so
UNION ALL
SELECT p.id, 'Oglethorpe Power Corporation', 30.00, c_ogle.id FROM p, c_ogle
UNION ALL
SELECT p.id, 'Municipal Electric Authority of Georgia', 17.70, c_meag.id FROM p, c_meag
UNION ALL
SELECT p.id, 'Dalton Utilities', 2.20, c_dalton.id FROM p, c_dalton
ON CONFLICT (plant_id, owner_name) DO UPDATE
SET equity_percentage = EXCLUDED.equity_percentage,
    parent_company_id = EXCLUDED.parent_company_id;

-- Palo Verde
WITH p AS (SELECT id FROM plants WHERE plant_name = 'Palo Verde'),
     c_pnw AS (SELECT id FROM companies WHERE stock_ticker = 'PNW'),
     c_srp AS (SELECT id FROM companies WHERE stock_ticker = 'SRP'),
     c_epe AS (SELECT id FROM companies WHERE stock_ticker = 'EPE'),
     c_eix AS (SELECT id FROM companies WHERE stock_ticker = 'EIX'),
     c_pnm AS (SELECT id FROM companies WHERE stock_ticker = 'PNM'),
     c_scppa AS (SELECT id FROM companies WHERE stock_ticker = 'SCPPA'),
     c_ladwp AS (SELECT id FROM companies WHERE stock_ticker = 'LADWP')
INSERT INTO plant_equity_stakes (plant_id, owner_name, equity_percentage, parent_company_id)
SELECT p.id, 'Arizona Public Service Co.', 29.10, c_pnw.id FROM p, c_pnw
UNION ALL
SELECT p.id, 'Salt River Project', 17.50, c_srp.id FROM p, c_srp
UNION ALL
SELECT p.id, 'El Paso Electric Company', 15.80, c_epe.id FROM p, c_epe
UNION ALL
SELECT p.id, 'Southern California Edison', 15.80, c_eix.id FROM p, c_eix
UNION ALL
SELECT p.id, 'Public Service Co. of New Mexico', 10.20, c_pnm.id FROM p, c_pnm
UNION ALL
SELECT p.id, 'Southern California Public Power Authority', 5.90, c_scppa.id FROM p, c_scppa
UNION ALL
SELECT p.id, 'Los Angeles Dept of Water & Power', 5.70, c_ladwp.id FROM p, c_ladwp
ON CONFLICT (plant_id, owner_name) DO UPDATE
SET equity_percentage = EXCLUDED.equity_percentage,
    parent_company_id = EXCLUDED.parent_company_id;

-- Salem
WITH p AS (SELECT id FROM plants WHERE plant_name = 'Salem'),
     c_peg AS (SELECT id FROM companies WHERE stock_ticker = 'PEG'),
     c_ceg AS (SELECT id FROM companies WHERE stock_ticker = 'CEG')
INSERT INTO plant_equity_stakes (plant_id, owner_name, equity_percentage, parent_company_id)
SELECT p.id, 'PSEG Nuclear, LLC', 57.41, c_peg.id FROM p, c_peg
UNION ALL
SELECT p.id, 'Constellation Energy Generation, LLC', 42.59, c_ceg.id FROM p, c_ceg
ON CONFLICT (plant_id, owner_name) DO UPDATE
SET equity_percentage = EXCLUDED.equity_percentage,
    parent_company_id = EXCLUDED.parent_company_id;

-- Peach Bottom
WITH p AS (SELECT id FROM plants WHERE plant_name = 'Peach Bottom'),
     c_ceg AS (SELECT id FROM companies WHERE stock_ticker = 'CEG'),
     c_peg AS (SELECT id FROM companies WHERE stock_ticker = 'PEG')
INSERT INTO plant_equity_stakes (plant_id, owner_name, equity_percentage, parent_company_id)
SELECT p.id, 'Constellation Energy Generation, LLC', 50.00, c_ceg.id FROM p, c_ceg
UNION ALL
SELECT p.id, 'PSEG Nuclear, LLC', 50.00, c_peg.id FROM p, c_peg
ON CONFLICT (plant_id, owner_name) DO UPDATE
SET equity_percentage = EXCLUDED.equity_percentage,
    parent_company_id = EXCLUDED.parent_company_id;

-- Shearon Harris
WITH p AS (SELECT id FROM plants WHERE plant_name = 'Shearon Harris'),
     c_duk AS (SELECT id FROM companies WHERE stock_ticker = 'DUK'),
     c_nc1 AS (SELECT id FROM companies WHERE stock_ticker = 'NCMPA1')
INSERT INTO plant_equity_stakes (plant_id, owner_name, equity_percentage, parent_company_id)
SELECT p.id, 'Duke Energy Progress, LLC', 83.83, c_duk.id FROM p, c_duk
UNION ALL
SELECT p.id, 'North Carolina Municipal Power Agency No. 1', 16.17, c_nc1.id FROM p, c_nc1
ON CONFLICT (plant_id, owner_name) DO UPDATE
SET equity_percentage = EXCLUDED.equity_percentage,
    parent_company_id = EXCLUDED.parent_company_id;

-- Brunswick
WITH p AS (SELECT id FROM plants WHERE plant_name = 'Brunswick'),
     c_duk AS (SELECT id FROM companies WHERE stock_ticker = 'DUK'),
     c_nc2 AS (SELECT id FROM companies WHERE stock_ticker = 'NCEMPA')
INSERT INTO plant_equity_stakes (plant_id, owner_name, equity_percentage, parent_company_id)
SELECT p.id, 'Duke Energy Progress, LLC', 81.68, c_duk.id FROM p, c_duk
UNION ALL
SELECT p.id, 'North Carolina Eastern Municipal Power Agency', 18.32, c_nc2.id FROM p, c_nc2
ON CONFLICT (plant_id, owner_name) DO UPDATE
SET equity_percentage = EXCLUDED.equity_percentage,
    parent_company_id = EXCLUDED.parent_company_id;

COMMIT;
