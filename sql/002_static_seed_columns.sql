BEGIN;

ALTER TABLE plants
    ADD COLUMN IF NOT EXISTS source_plant_code TEXT,
    ADD COLUMN IF NOT EXISTS state TEXT,
    ADD COLUMN IF NOT EXISTS operator_name TEXT,
    ADD COLUMN IF NOT EXISTS primary_fuel TEXT,
    ADD COLUMN IF NOT EXISTS nrc_owner_operator TEXT,
    ADD COLUMN IF NOT EXISTS nrc_reactor_count INTEGER,
    ADD COLUMN IF NOT EXISTS hifld_source TEXT,
    ADD COLUMN IF NOT EXISTS nrc_source TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'plants_source_plant_code_unique'
    ) THEN
        ALTER TABLE plants
            ADD CONSTRAINT plants_source_plant_code_unique UNIQUE (source_plant_code);
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_plants_state
    ON plants(state);

CREATE INDEX IF NOT EXISTS idx_plants_primary_fuel
    ON plants(primary_fuel);

COMMIT;

