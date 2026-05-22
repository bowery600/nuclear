# Nuclear Data Platform

Phase 1 initializes a local PostgreSQL database and the Python environment needed for future scraper work. Phase 2 seeds static company and plant reference data from HIFLD and NRC sources.

## Schema

The relational model is defined in `sql/001_schema.sql`.

- `companies`: stock ticker and parent company name.
- `plants`: plant name, latitude, longitude, total MW capacity, and a required company foreign key.
- `shareholders`: institutional investor names and ownership percentages linked to a company.
- `telemetry`: plant-level observed output and local marginal price by timestamp.

The schema includes primary keys, foreign keys, uniqueness checks, range checks, timestamp indexes, and `updated_at` triggers for mutable tables.

`sql/002_static_seed_columns.sql` adds static seed metadata to `plants`, including source plant code, state, operator name, primary fuel, NRC owner/operator, reactor count, and source URLs.

## Local Setup

Create and activate a virtual environment:

```powershell
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Python 3.13 is recommended on Windows for the Phase 4 `gridstatus` dependency. Python 3.14 currently resolves to a `gridstatus`/`lxml` combination that may require compiling `lxml` locally.

Create a local environment file:

```powershell
Copy-Item .env.example .env
```

Start PostgreSQL with Docker:

```powershell
docker compose up -d postgres
```

The Docker container automatically applies files in `sql/` the first time the volume is created. To apply the schema manually against the configured `DATABASE_URL`, run:

```powershell
python scripts/init_db.py
```

## Static Data Seed

Seed companies and operating nuclear plant sites:

```powershell
python scripts/seed_static_data.py
```

The seed script:

- Downloads the full HIFLD Power Plants ArcGIS layer to `data/raw/hifld_power_plants.csv`.
- Downloads the NRC operating reactor-unit table to `data/raw/nrc_operating_reactor_units.csv`.
- Groups NRC reactor units into plant sites and uses the NRC list as the source of truth for operating nuclear status.
- Matches NRC operating sites to HIFLD plant records for coordinates, state, operator name, and capacity.
- Upserts parent companies into `companies` and plant/site records into `plants`.
- Writes `data/processed/static_seed_match_review.csv` for audit/review.
- Writes `data/processed/operating_nuclear_plants_seed.csv` with the matched seed set.

HIFLD has several operating nuclear sites misclassified under non-nuclear `PRIMARY_FU` values. The seed script intentionally downloads the full HIFLD layer, then filters by NRC operating status instead of relying only on `PRIMARY_FU = 'NUC'`.

Current seed verification loaded 55 operating plant sites and 21 parent company records.

## Shareholder Seed

Seed top institutional holders for public company tickers:

```powershell
python scripts/seed_shareholders.py
```

The shareholder script:

- Reads stock tickers from `companies`.
- Uses `yfinance` to fetch the top 10 institutional holders for each ticker.
- Upserts holder names, ownership percentages, and reported dates into `shareholders`.
- Skips private, municipal, cooperative, or otherwise non-traded placeholder tickers so yfinance symbol collisions do not create false stakeholders.

To test a smaller batch without writing rows:

```powershell
python scripts/seed_shareholders.py --dry-run --tickers CEG DUK NEE
```

Because institutional ownership moves slowly, rerun this every few weeks rather than as a high-frequency job.

## Real-Time Telemetry Workers

Phase 4 adds `scripts/telemetry_workers.py` for automated plant telemetry updates.

Apply the new schema migration after updating dependencies:

```powershell
pip install -r requirements.txt
python scripts/init_db.py
```

Run the NRC reactor power worker once:

```powershell
python scripts/telemetry_workers.py nrc
```

The NRC worker discovers the current raw status text feed from the NRC reactor status page, parses each unit's reported power percentage, rolls unit rows up to plant sites, estimates `realtime_output_mw` from the plant's seeded MW capacity, and upserts the latest observation into `telemetry`.

Run the gridstatus LMP worker once:

```powershell
python scripts/telemetry_workers.py lmp
```

The LMP worker fetches real-time prices from supported ISOs through `gridstatus`, groups plants by configured/default market node, and upserts `local_marginal_price_usd_mwh` plus ISO/node metadata into `telemetry`. Plants outside supported ISO/RTO feeds, or plants whose node fetch fails, are written to `data/processed/lmp_status_skipped.csv`.

Start both jobs with APScheduler:

```powershell
python scripts/telemetry_workers.py serve --run-on-start
```

Scheduler cadence:

- NRC power status: daily at 8:00 AM in `TELEMETRY_SCHEDULER_TIMEZONE` (defaults to `America/New_York`).
- gridstatus LMP: every 15 minutes.

Use dry runs while validating mappings:

```powershell
python scripts/telemetry_workers.py nrc --dry-run
python scripts/telemetry_workers.py lmp --dry-run
```

## Backend API

Phase 5 adds a lightweight FastAPI layer in `api/main.py`.

Install the API dependencies and start the local server:

```powershell
pip install -r requirements.txt
python -m uvicorn api.main:app --reload
```

Endpoints:

- `GET /api/plants` returns a GeoJSON `FeatureCollection` of all plants. Each point uses `[longitude, latitude]` coordinates and includes current MW output, current power cost in USD/MWh, capacity percentage, parent company, ticker, and latest telemetry timestamps.
- `GET /api/plants/{id}/ownership` returns the selected plant, parent company details, and shareholders sorted by ownership percentage descending.

The API reads `DATABASE_URL` from `.env`. For map frontend development, CORS defaults to `localhost` and `127.0.0.1` ports `3000` and `5173`; set `API_CORS_ORIGINS` to a comma-separated list to override it.

## Interactive Map Frontend

Phase 6 adds a Vite React frontend in `frontend/` with Mapbox GL JS.

Create a frontend environment file:

```powershell
Copy-Item frontend/.env.example frontend/.env.local
```

Set `VITE_MAPBOX_TOKEN` in `frontend/.env.local`, then install and run:

```powershell
cd frontend
npm install
npm run dev
```

The app loads `GET /api/plants` as GeoJSON, renders glowing Mapbox plant nodes, and fetches `GET /api/plants/{id}/ownership` when a marker is selected. `VITE_API_BASE_URL` defaults to `http://localhost:8000`.

Exact pricing-node overrides can be supplied as JSON in `TELEMETRY_LMP_NODE_OVERRIDES`, either directly or as a path to a JSON file:

```json
{
  "South Texas": {
    "iso_code": "ERCOT",
    "location": "HB_SOUTH",
    "location_type": "Trading Hub",
    "market": "REAL_TIME_15_MIN"
  },
  "source_plant_code:12345": {
    "iso_code": "PJM",
    "location": "51217",
    "market": "REAL_TIME_5_MIN"
  }
}
```

Sources:

- HIFLD Power Plants ArcGIS FeatureServer: `https://services.arcgis.com/XG15cJAlne2vxtgt/ArcGIS/rest/services/Power_Plants/FeatureServer/0/query`
- NRC List of Power Reactor Units: `https://www.nrc.gov/reactors/operating/list-power-reactor-units`
- NRC Power Reactor Status raw data: `https://www.nrc.gov/reading-rm/doc-collections/event-status/reactor-status/PowerReactorStatusForLast365Days.txt`

## Connection

Default development connection:

```text
postgresql://nuclear:nuclear@localhost:5432/nuclear
```

To reset the local database completely:

```powershell
docker compose down -v
docker compose up -d postgres
```
