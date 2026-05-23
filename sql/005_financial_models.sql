BEGIN;

ALTER TABLE plants
    ADD COLUMN IF NOT EXISTS commission_year INTEGER,
    ADD COLUMN IF NOT EXISTS license_expiration_year INTEGER,
    ADD COLUMN IF NOT EXISTS overnight_capex_usd_kw NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS fixed_om_usd_kw_yr NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS variable_om_usd_mwh NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS fuel_cost_usd_mwh NUMERIC(12, 2);

-- Set general default values first to avoid any NULLs in existing/future rows
UPDATE plants
SET commission_year = 1980,
    license_expiration_year = 2040,
    overnight_capex_usd_kw = 4500.00,
    fixed_om_usd_kw_yr = 120.00,
    variable_om_usd_mwh = 3.00,
    fuel_cost_usd_mwh = 7.00;

-- Now, set precise historical values for each plant
-- Overnight cost, O&M, and fuel are set to realistic values.
-- Older plants (1970s/1980s) have overnight CapEx around $3400-$4500/kW.
-- Newer plants have overnight CapEx around $6000-$8000/kW.
-- Vogtle has units 3 & 4 so its blended overnight CapEx is set to $11,000/kW.

UPDATE plants SET commission_year = 1974, license_expiration_year = 2034, overnight_capex_usd_kw = 3900.00 WHERE plant_name = 'Arkansas Nuclear';
UPDATE plants SET commission_year = 1976, license_expiration_year = 2036, overnight_capex_usd_kw = 4100.00 WHERE plant_name = 'Beaver Valley';
UPDATE plants SET commission_year = 1987, license_expiration_year = 2047, overnight_capex_usd_kw = 4900.00 WHERE plant_name = 'Braidwood';
UPDATE plants SET commission_year = 1973, license_expiration_year = 2053, overnight_capex_usd_kw = 3800.00 WHERE plant_name = 'Browns Ferry';
UPDATE plants SET commission_year = 1975, license_expiration_year = 2034, overnight_capex_usd_kw = 4000.00 WHERE plant_name = 'Brunswick';
UPDATE plants SET commission_year = 1985, license_expiration_year = 2045, overnight_capex_usd_kw = 4800.00 WHERE plant_name = 'Byron';
UPDATE plants SET commission_year = 1984, license_expiration_year = 2044, overnight_capex_usd_kw = 4700.00 WHERE plant_name = 'Callaway';
UPDATE plants SET commission_year = 1975, license_expiration_year = 2034, overnight_capex_usd_kw = 3950.00 WHERE plant_name = 'Calvert Cliffs';
UPDATE plants SET commission_year = 1985, license_expiration_year = 2043, overnight_capex_usd_kw = 4850.00 WHERE plant_name = 'Catawba';
UPDATE plants SET commission_year = 1987, license_expiration_year = 2047, overnight_capex_usd_kw = 5100.00 WHERE plant_name = 'Clinton';
UPDATE plants SET commission_year = 1984, license_expiration_year = 2043, overnight_capex_usd_kw = 4600.00 WHERE plant_name = 'Columbia Generating Station';
UPDATE plants SET commission_year = 1990, license_expiration_year = 2050, overnight_capex_usd_kw = 6200.00 WHERE plant_name = 'Comanche Peak';
UPDATE plants SET commission_year = 1974, license_expiration_year = 2034, overnight_capex_usd_kw = 3900.00 WHERE plant_name = 'Cooper';
UPDATE plants SET commission_year = 1975, license_expiration_year = 2034, overnight_capex_usd_kw = 4000.00 WHERE plant_name = 'D.C. Cook';
UPDATE plants SET commission_year = 1977, license_expiration_year = 2037, overnight_capex_usd_kw = 4200.00 WHERE plant_name = 'Davis-Besse';
UPDATE plants SET commission_year = 1985, license_expiration_year = 2044, overnight_capex_usd_kw = 5500.00 WHERE plant_name = 'Diablo Canyon';
UPDATE plants SET commission_year = 1970, license_expiration_year = 2029, overnight_capex_usd_kw = 3500.00 WHERE plant_name = 'Dresden';
UPDATE plants SET commission_year = 1977, license_expiration_year = 2037, overnight_capex_usd_kw = 4100.00 WHERE plant_name = 'Farley';
UPDATE plants SET commission_year = 1985, license_expiration_year = 2045, overnight_capex_usd_kw = 4800.00 WHERE plant_name = 'Fermi';
UPDATE plants SET commission_year = 1975, license_expiration_year = 2034, overnight_capex_usd_kw = 3950.00 WHERE plant_name = 'FitzPatrick';
UPDATE plants SET commission_year = 1969, license_expiration_year = 2029, overnight_capex_usd_kw = 3400.00 WHERE plant_name = 'Ginna';
UPDATE plants SET commission_year = 1985, license_expiration_year = 2044, overnight_capex_usd_kw = 5000.00 WHERE plant_name = 'Grand Gulf';
UPDATE plants SET commission_year = 1975, license_expiration_year = 2034, overnight_capex_usd_kw = 4000.00 WHERE plant_name = 'Hatch';
UPDATE plants SET commission_year = 1986, license_expiration_year = 2046, overnight_capex_usd_kw = 5100.00 WHERE plant_name = 'Hope Creek';
UPDATE plants SET commission_year = 1982, license_expiration_year = 2042, overnight_capex_usd_kw = 4500.00 WHERE plant_name = 'La Salle';
UPDATE plants SET commission_year = 1985, license_expiration_year = 2044, overnight_capex_usd_kw = 4900.00 WHERE plant_name = 'Limerick';
UPDATE plants SET commission_year = 1981, license_expiration_year = 2041, overnight_capex_usd_kw = 4400.00 WHERE plant_name = 'McGuire';
UPDATE plants SET commission_year = 1975, license_expiration_year = 2035, overnight_capex_usd_kw = 4050.00 WHERE plant_name = 'Millstone';
UPDATE plants SET commission_year = 1971, license_expiration_year = 2030, overnight_capex_usd_kw = 3600.00 WHERE plant_name = 'Monticello';
UPDATE plants SET commission_year = 1969, license_expiration_year = 2029, overnight_capex_usd_kw = 3450.00 WHERE plant_name = 'Nine Mile Point';
UPDATE plants SET commission_year = 1978, license_expiration_year = 2038, overnight_capex_usd_kw = 4300.00 WHERE plant_name = 'North Anna';
UPDATE plants SET commission_year = 1973, license_expiration_year = 2033, overnight_capex_usd_kw = 3800.00 WHERE plant_name = 'Oconee';
UPDATE plants SET commission_year = 1971, license_expiration_year = 2031, overnight_capex_usd_kw = 3650.00 WHERE plant_name = 'Palisades';
UPDATE plants SET commission_year = 1985, license_expiration_year = 2045, overnight_capex_usd_kw = 5200.00 WHERE plant_name = 'Palo Verde';
UPDATE plants SET commission_year = 1974, license_expiration_year = 2033, overnight_capex_usd_kw = 3900.00 WHERE plant_name = 'Peach Bottom';
UPDATE plants SET commission_year = 1987, license_expiration_year = 2047, overnight_capex_usd_kw = 5200.00 WHERE plant_name = 'Perry';
UPDATE plants SET commission_year = 1970, license_expiration_year = 2030, overnight_capex_usd_kw = 3500.00 WHERE plant_name = 'Point Beach';
UPDATE plants SET commission_year = 1973, license_expiration_year = 2033, overnight_capex_usd_kw = 3850.00 WHERE plant_name = 'Prairie Island';
UPDATE plants SET commission_year = 1972, license_expiration_year = 2032, overnight_capex_usd_kw = 3700.00 WHERE plant_name = 'Quad Cities';
UPDATE plants SET commission_year = 1985, license_expiration_year = 2045, overnight_capex_usd_kw = 4800.00 WHERE plant_name = 'River Bend';
UPDATE plants SET commission_year = 1971, license_expiration_year = 2030, overnight_capex_usd_kw = 3600.00 WHERE plant_name = 'Robinson';
UPDATE plants SET commission_year = 1976, license_expiration_year = 2036, overnight_capex_usd_kw = 4150.00 WHERE plant_name = 'Saint Lucie';
UPDATE plants SET commission_year = 1976, license_expiration_year = 2036, overnight_capex_usd_kw = 4200.00 WHERE plant_name = 'Salem';
UPDATE plants SET commission_year = 1990, license_expiration_year = 2050, overnight_capex_usd_kw = 6500.00 WHERE plant_name = 'Seabrook';
UPDATE plants SET commission_year = 1980, license_expiration_year = 2040, overnight_capex_usd_kw = 4300.00 WHERE plant_name = 'Sequoyah';
UPDATE plants SET commission_year = 1987, license_expiration_year = 2047, overnight_capex_usd_kw = 5100.00 WHERE plant_name = 'Shearon Harris';
UPDATE plants SET commission_year = 1988, license_expiration_year = 2047, overnight_capex_usd_kw = 5300.00 WHERE plant_name = 'South Texas';
UPDATE plants SET commission_year = 1982, license_expiration_year = 2042, overnight_capex_usd_kw = 4400.00 WHERE plant_name = 'Summer';
UPDATE plants SET commission_year = 1972, license_expiration_year = 2032, overnight_capex_usd_kw = 3700.00 WHERE plant_name = 'Surry';
UPDATE plants SET commission_year = 1983, license_expiration_year = 2042, overnight_capex_usd_kw = 4600.00 WHERE plant_name = 'Susquehanna';
UPDATE plants SET commission_year = 1972, license_expiration_year = 2032, overnight_capex_usd_kw = 3750.00 WHERE plant_name = 'Turkey Point';
UPDATE plants SET commission_year = 1987, license_expiration_year = 2047, overnight_capex_usd_kw = 11000.00, fixed_om_usd_kw_yr = 135.00, variable_om_usd_mwh = 3.50, fuel_cost_usd_mwh = 7.50 WHERE plant_name = 'Vogtle';
UPDATE plants SET commission_year = 1985, license_expiration_year = 2045, overnight_capex_usd_kw = 4850.00 WHERE plant_name = 'Waterford';
UPDATE plants SET commission_year = 1996, license_expiration_year = 2035, overnight_capex_usd_kw = 6800.00 WHERE plant_name = 'Watts Bar';
UPDATE plants SET commission_year = 1985, license_expiration_year = 2045, overnight_capex_usd_kw = 4900.00 WHERE plant_name = 'Wolf Creek';

COMMIT;
