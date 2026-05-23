# SMR Pipeline Tracker — Design

**Date:** 2026-05-22
**Status:** Approved for planning

## Purpose

Extend the Nuclear dashboard's map to surface the emerging Small Modular Reactor (SMR) landscape alongside the existing operating gigawatt-scale fleet. Users should be able to see — at a glance and without toggling — which US sites have an SMR project attached, who's building what, and how far along it is.

## Scope

- **Geographic:** US-only (matches current dashboard scope).
- **Pipeline coverage:** Announced + NRC-engaged sites. Requires a named technology partner and a target site. Excludes pre-announcement studies and cancelled projects (e.g. NuScale CFPP).
- **Phases tracked:** `announced`, `nrc_engaged`, `under_construction`.

### Out of scope (explicit YAGNI)

- Global / non-US sites.
- Cancelled or paused projects (no historical layer).
- NRC scraper / live phase refresh.
- UI filters (by vendor or phase).
- Backend API changes — `api/` is untouched.
- Frontend test infrastructure (none exists today; not introducing it for this feature).

## Architecture

Static-data feature. Mirrors the existing operating-plant pipeline:

```
data/raw/smr_sites.csv
        │
        ▼  scripts/process_smr_sites.py  (validates + transforms)
        │
        ▼
data/processed/smr_sites.json
        │
        ▼  fetched by NuclearMap.jsx
        │
        ▼
SmrNode.jsx  (rendering)   ──hover──▶   SmrTooltip.jsx  (detail)
```

No new backend endpoints. No changes to `api/`.

## Data layer

### Raw CSV — `data/raw/smr_sites.csv`

One row per announced US SMR site. Columns:

| Column | Type | Notes |
|---|---|---|
| `site_id` | string (kebab slug) | e.g. `tva-clinch-river`. Stable primary key. |
| `site_name` | string | Human-readable. |
| `state` | string (2-letter) | US state code. |
| `lat` | float | Decimal degrees. Must fall within US bounds. |
| `lon` | float | Decimal degrees. Must fall within US bounds. |
| `vendor` | enum | `NuScale` \| `X-energy` \| `GE Hitachi` \| `Westinghouse` \| `Holtec` \| `TerraPower` \| `Kairos` \| `Oklo`. Extend as new vendors emerge. |
| `reactor_model` | string | e.g. `BWRX-300`, `Xe-100`, `VOYGR`, `Natrium`, `eVinci`. |
| `owner` | string | Owning utility or developer. |
| `offtaker` | string (nullable) | Power purchaser if distinct from owner. |
| `module_count` | int | Planned number of modules at the site. Must be > 0. |
| `capacity_mwe_total` | float | Planned total electrical capacity, MWe. Must be > 0. |
| `phase` | enum | `announced` \| `nrc_engaged` \| `under_construction`. |
| `target_cod` | int (nullable) | Target commercial operation date, year only. |
| `nrc_docket` | string (nullable) | NRC docket reference if applicable. Carried but not currently surfaced in the UI. |
| `source_url` | string | Public source backing the row. Required for every row. |

### Processor — `scripts/process_smr_sites.py`

Reads the CSV, validates each row, writes `data/processed/smr_sites.json`. Validation rules (fail loudly with the offending `site_id`):

- All required fields present (everything except `offtaker`, `target_cod`, `nrc_docket` is required).
- `phase` ∈ {`announced`, `nrc_engaged`, `under_construction`}.
- `lat` numeric, in [24.0, 49.5]; `lon` numeric, in [-125.0, -66.0].
- `module_count` is a positive integer.
- `capacity_mwe_total` is a positive number.
- `source_url` is non-empty.

Output JSON shape (array of objects): same field names as the CSV columns, with numeric types preserved. Per-module MWe is derived in the frontend (`capacity_mwe_total / module_count`), not pre-computed in the JSON.

### Initial dataset

~10–12 sites. Candidate seed list (subject to source verification at implementation time):

- TVA Clinch River (BWRX-300)
- Dow Seadrift (X-energy Xe-100)
- Energy Northwest / X-energy (Xe-100)
- Amazon partnership site(s) via Energy Northwest
- PacifiCorp Kemmerer WY (TerraPower Natrium)
- Holtec Palisades site (SMR-300)
- Oklo Idaho (Aurora)
- Kairos Hermes (Oak Ridge)
- Last Energy Texas sites
- Any additional NRC-docketed US site identified during data collection

## Frontend rendering

### New component — `frontend/src/map/SmrNode.jsx`

Separate from `PlantNode` so styling concerns stay isolated.

**Visual treatment (always-on, no toggle):**

- **Shape:** hollow ring (stroked circle, no fill). Distinguishes future projects from filled operating-plant nodes.
- **Size:** ~70% of operating-plant node radius. Visually subordinate.
- **Phase encoded via stroke:**
  - `announced` — dashed stroke, muted color
  - `nrc_engaged` — solid stroke, accent color
  - `under_construction` — solid stroke + small inner dot
- **Vendor color:** small palette in `colors.js` keyed by vendor, applied to the stroke.
- **z-order:** rendered beneath operating-plant nodes so overlaps don't visually compete.

### Data loading

`NuclearMap.jsx` fetches `smr_sites.json` alongside existing operating-plant data. Both pass through the same projection helper (`projection.js`).

### Legend

Small addition to the existing legend/sidebar explaining the SMR glyph: hollow ring = SMR, dash patterns = phase. No new interactive controls.

## Tooltip / detail

### New component — `frontend/src/map/SmrTooltip.jsx`

Parallels `PlantTooltip` but with SMR-specific fields. Kept as a separate component (not a branched `PlantTooltip`) so each stays focused.

**Fields displayed:**

- Site name (header)
- Vendor + reactor model — e.g. `GE Hitachi · BWRX-300`
- Phase badge (Announced / NRC-Engaged / Under Construction), colored to match the map glyph
- Planned capacity — `{module_count} × {per-module MWe} = {total} MWe`, with per-module derived as `capacity_mwe_total / module_count`
- Owner (and offtaker if present and distinct)
- Target COD year (or `TBD` if null)
- State

### Interaction

Hover/click behavior matches `PlantNode`. Reuse `PlantTooltip`'s positioning logic rather than reimplement.

**Targeted improvement (conditional):** if positioning logic is currently entangled inside `PlantTooltip.jsx`, extract it into a small shared helper (e.g. `tooltipPosition.js`) consumed by both tooltips. If it's already standalone, just reuse as-is. No unrelated refactoring.

### Wiring

`NuclearMap.jsx` gains a second hover-state slot for SMR hovers, rendered through `SmrTooltip`. Operating-plant tooltip behavior is unchanged.

## Testing & validation

- **Processor:** validation runs every time `process_smr_sites.py` executes; any bad row fails loudly with the offending `site_id`. No separate test suite.
- **Frontend:** no new test infrastructure (project has none today). Manual verification: load dashboard, confirm SMR nodes render at correct coordinates, hover each, confirm tooltip fields populate, confirm phase styling matches CSV data.
- **Data provenance:** `source_url` required on every CSV row. Enforced by the processor.

## File summary

**New files:**

- `data/raw/smr_sites.csv`
- `data/processed/smr_sites.json` (generated)
- `scripts/process_smr_sites.py`
- `frontend/src/map/SmrNode.jsx`
- `frontend/src/map/SmrTooltip.jsx`
- `frontend/src/map/tooltipPosition.js` (conditional — only if extracting from `PlantTooltip.jsx`)

**Modified files:**

- `frontend/src/map/NuclearMap.jsx` — fetch SMR data, render SMR nodes, wire SMR tooltip
- `frontend/src/map/colors.js` — vendor palette additions
- `frontend/src/map/PlantTooltip.jsx` — only if positioning logic is extracted to shared helper
- Legend component (wherever the existing legend lives in the sidebar) — add SMR glyph key
