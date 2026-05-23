# SMR Pipeline Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a visually-distinct, always-on layer of US SMR (Small Modular Reactor) project sites — Announced + NRC-Engaged — to the existing nuclear map, with hover tooltips showing vendor, model, phase, planned capacity, owner, and target COD.

**Architecture:** Static-data feature mirroring the operating-plant data pattern. A hand-curated CSV is processed by a Python script into a JSON artifact bundled by Vite. The map fetches no new endpoints; it imports the JSON, projects sites with the existing helper, and renders them through a new `SmrNode` component beneath the operating-plant layer. Hovering an SMR node opens a new `SmrTooltip` parallel to `PlantTooltip`.

**Tech Stack:** Python 3 (stdlib csv + json), React, Vite, SVG.

**Deviation from spec:** The spec called for the processed JSON at `data/processed/smr_sites.json`. The frontend can't fetch from outside `frontend/` in production (Vercel builds from `frontend/dist`). Existing static datasets (e.g. `iso-regions.json`) live under `frontend/src/map/` and are imported directly so Vite bundles them. We follow that pattern: the processor writes to `frontend/src/data/smr_sites.json`. The CSV remains at `data/raw/smr_sites.csv`.

---

## File Structure

**New files:**

- `data/raw/smr_sites.csv` — hand-curated SMR site list
- `scripts/process_smr_sites.py` — CSV → JSON processor with validation
- `frontend/src/data/smr_sites.json` — processor output, bundled by Vite
- `frontend/src/map/SmrNode.jsx` — SMR map glyph component
- `frontend/src/map/SmrTooltip.jsx` — SMR hover detail component
- `frontend/src/map/smrColors.js` — vendor + phase color palette

**Modified files:**

- `frontend/src/map/NuclearMap.jsx` — import SMR JSON, project sites, render `SmrNode` layer beneath operating plants, wire `SmrTooltip` hover state, add legend snippet

---

## Task 1: Seed the SMR site CSV

**Files:**
- Create: `data/raw/smr_sites.csv`

- [ ] **Step 1: Create the CSV with header and seed rows**

Write `data/raw/smr_sites.csv` with the exact header below, then the seed rows. Coordinates are approximate and should be verified against the listed `source_url` during data review. Use empty strings for null cells (`offtaker`, `target_cod`, `nrc_docket`).

```csv
site_id,site_name,state,lat,lon,vendor,reactor_model,owner,offtaker,module_count,capacity_mwe_total,phase,target_cod,nrc_docket,source_url
tva-clinch-river,Clinch River Site,TN,35.9094,-84.3878,GE Hitachi,BWRX-300,Tennessee Valley Authority,,1,300,nrc_engaged,2032,52-049,https://www.nrc.gov/reactors/new-reactors/smr/licensing-activities/clinch-river.html
dow-seadrift,Dow Seadrift,TX,28.4203,-96.7100,X-energy,Xe-100,Dow Chemical,Dow Chemical,4,320,nrc_engaged,2030,,https://www.energy.gov/ne/articles/x-energy-and-dow-submit-construction-permit-application-advanced-nuclear
energy-northwest-xe100,Energy Northwest Xe-100,WA,46.4710,-119.3320,X-energy,Xe-100,Energy Northwest,Amazon Web Services,12,960,announced,2032,,https://www.energy-northwest.com/newsroom/Pages/X-Energy-Project.aspx
pacificorp-kemmerer,TerraPower Natrium Kemmerer,WY,41.8276,-110.5366,TerraPower,Natrium,PacifiCorp,PacifiCorp,1,345,under_construction,2030,,https://www.terrapower.com/our-work/natriumpower/
holtec-palisades,Holtec Palisades SMR-300,MI,42.3239,-86.3151,Holtec,SMR-300,Holtec International,,2,600,announced,2030,,https://holtecinternational.com/products-and-services/smr/
oklo-idaho,Oklo Aurora INL,ID,43.5167,-112.9533,Oklo,Aurora,Oklo Inc.,,1,15,nrc_engaged,2027,52-048,https://www.nrc.gov/reactors/new-reactors/smr/licensing-activities/aurora.html
kairos-hermes,Kairos Hermes,TN,35.9233,-84.3120,Kairos,KP-FHR,Kairos Power,Tennessee Valley Authority,1,35,under_construction,2027,50-7513,https://www.nrc.gov/reactors/non-power/new-fac/kairos-hermes.html
last-energy-haskell,Last Energy Haskell County,TX,33.1577,-99.7333,Last Energy,PWR-20,Last Energy,,4,80,announced,2027,,https://www.lastenergy.com/news/last-energy-texas
ge-hitachi-darlington-style-ny,GE Hitachi BWRX-300 NY Pilot,NY,43.5230,-76.0980,GE Hitachi,BWRX-300,New York Power Authority,,1,300,announced,2033,,https://www.nypa.gov/news/press-releases
westinghouse-ap300-pilot,Westinghouse AP300 Pilot Site,VA,37.7960,-78.1340,Westinghouse,AP300,Dominion Energy,Dominion Energy,1,300,announced,2032,,https://www.westinghousenuclear.com/energy-systems/ap300-smr
```

- [ ] **Step 2: Commit**

```bash
git add data/raw/smr_sites.csv
git commit -m "data: seed SMR sites CSV"
```

---

## Task 2: Write a failing test for the SMR processor

**Files:**
- Create: `scripts/test_process_smr_sites.py`

- [ ] **Step 1: Write the failing test**

The project has no `pytest` setup but has Python in `requirements-dev.txt`. We use Python's built-in `unittest` so no new dependency is needed. The test runs the processor against a tiny in-memory CSV via a temp file and asserts the output JSON structure and validation behavior.

Create `scripts/test_process_smr_sites.py`:

```python
import json
import os
import sys
import tempfile
import unittest

THIS_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, THIS_DIR)

from process_smr_sites import process_csv, ValidationError  # noqa: E402


VALID_ROW = {
    "site_id": "test-site",
    "site_name": "Test Site",
    "state": "TN",
    "lat": "35.9",
    "lon": "-84.4",
    "vendor": "GE Hitachi",
    "reactor_model": "BWRX-300",
    "owner": "Test Utility",
    "offtaker": "",
    "module_count": "1",
    "capacity_mwe_total": "300",
    "phase": "nrc_engaged",
    "target_cod": "2032",
    "nrc_docket": "52-049",
    "source_url": "https://example.com/source"
}


def write_csv(rows, path):
    import csv as csvmod
    fieldnames = list(VALID_ROW.keys())
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csvmod.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


class ProcessSmrSitesTests(unittest.TestCase):
    def test_valid_row_produces_json_record(self):
        with tempfile.TemporaryDirectory() as tmp:
            in_path = os.path.join(tmp, "in.csv")
            out_path = os.path.join(tmp, "out.json")
            write_csv([VALID_ROW], in_path)

            process_csv(in_path, out_path)

            with open(out_path, encoding="utf-8") as f:
                data = json.load(f)

            self.assertEqual(len(data), 1)
            rec = data[0]
            self.assertEqual(rec["site_id"], "test-site")
            self.assertEqual(rec["lat"], 35.9)
            self.assertEqual(rec["lon"], -84.4)
            self.assertEqual(rec["module_count"], 1)
            self.assertEqual(rec["capacity_mwe_total"], 300.0)
            self.assertEqual(rec["target_cod"], 2032)
            self.assertIsNone(rec["offtaker"])

    def test_invalid_phase_raises(self):
        bad = dict(VALID_ROW, phase="planning")
        with tempfile.TemporaryDirectory() as tmp:
            in_path = os.path.join(tmp, "in.csv")
            out_path = os.path.join(tmp, "out.json")
            write_csv([bad], in_path)
            with self.assertRaises(ValidationError) as ctx:
                process_csv(in_path, out_path)
            self.assertIn("test-site", str(ctx.exception))
            self.assertIn("phase", str(ctx.exception))

    def test_lat_out_of_us_bounds_raises(self):
        bad = dict(VALID_ROW, lat="60.0")
        with tempfile.TemporaryDirectory() as tmp:
            in_path = os.path.join(tmp, "in.csv")
            out_path = os.path.join(tmp, "out.json")
            write_csv([bad], in_path)
            with self.assertRaises(ValidationError) as ctx:
                process_csv(in_path, out_path)
            self.assertIn("test-site", str(ctx.exception))
            self.assertIn("lat", str(ctx.exception))

    def test_missing_source_url_raises(self):
        bad = dict(VALID_ROW, source_url="")
        with tempfile.TemporaryDirectory() as tmp:
            in_path = os.path.join(tmp, "in.csv")
            out_path = os.path.join(tmp, "out.json")
            write_csv([bad], in_path)
            with self.assertRaises(ValidationError) as ctx:
                process_csv(in_path, out_path)
            self.assertIn("source_url", str(ctx.exception))

    def test_zero_module_count_raises(self):
        bad = dict(VALID_ROW, module_count="0")
        with tempfile.TemporaryDirectory() as tmp:
            in_path = os.path.join(tmp, "in.csv")
            out_path = os.path.join(tmp, "out.json")
            write_csv([bad], in_path)
            with self.assertRaises(ValidationError):
                process_csv(in_path, out_path)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

```bash
python scripts/test_process_smr_sites.py
```

Expected: ImportError / ModuleNotFoundError on `from process_smr_sites import ...` (because `scripts/process_smr_sites.py` doesn't exist yet).

- [ ] **Step 3: Commit**

```bash
git add scripts/test_process_smr_sites.py
git commit -m "test: failing tests for SMR sites processor"
```

---

## Task 3: Implement the SMR processor to make tests pass

**Files:**
- Create: `scripts/process_smr_sites.py`

- [ ] **Step 1: Implement the processor**

Create `scripts/process_smr_sites.py`:

```python
"""Process data/raw/smr_sites.csv into frontend/src/data/smr_sites.json.

Validates every row; fails loudly with the offending site_id on any issue.
"""
import csv
import json
import os
import sys

ALLOWED_PHASES = {"announced", "nrc_engaged", "under_construction"}

REQUIRED_FIELDS = [
    "site_id",
    "site_name",
    "state",
    "lat",
    "lon",
    "vendor",
    "reactor_model",
    "owner",
    "module_count",
    "capacity_mwe_total",
    "phase",
    "source_url",
]

OPTIONAL_FIELDS = ["offtaker", "target_cod", "nrc_docket"]

# Approximate continental + Alaska/Hawaii-tolerant US bounds.
LAT_MIN, LAT_MAX = 18.0, 72.0
LON_MIN, LON_MAX = -180.0, -65.0


class ValidationError(Exception):
    pass


def _parse_float(site_id, field, value):
    try:
        return float(value)
    except (TypeError, ValueError):
        raise ValidationError(f"{site_id}: {field} must be numeric, got {value!r}")


def _parse_int(site_id, field, value):
    try:
        return int(value)
    except (TypeError, ValueError):
        raise ValidationError(f"{site_id}: {field} must be an integer, got {value!r}")


def _validate_and_transform(row):
    site_id = (row.get("site_id") or "").strip()
    if not site_id:
        raise ValidationError("row missing site_id")

    for field in REQUIRED_FIELDS:
        value = (row.get(field) or "").strip()
        if not value:
            raise ValidationError(f"{site_id}: {field} is required")

    lat = _parse_float(site_id, "lat", row["lat"])
    lon = _parse_float(site_id, "lon", row["lon"])
    if not (LAT_MIN <= lat <= LAT_MAX):
        raise ValidationError(f"{site_id}: lat {lat} outside US bounds")
    if not (LON_MIN <= lon <= LON_MAX):
        raise ValidationError(f"{site_id}: lon {lon} outside US bounds")

    module_count = _parse_int(site_id, "module_count", row["module_count"])
    if module_count <= 0:
        raise ValidationError(f"{site_id}: module_count must be positive, got {module_count}")

    capacity = _parse_float(site_id, "capacity_mwe_total", row["capacity_mwe_total"])
    if capacity <= 0:
        raise ValidationError(f"{site_id}: capacity_mwe_total must be positive, got {capacity}")

    phase = row["phase"].strip()
    if phase not in ALLOWED_PHASES:
        raise ValidationError(
            f"{site_id}: phase {phase!r} not in {sorted(ALLOWED_PHASES)}"
        )

    target_cod_raw = (row.get("target_cod") or "").strip()
    target_cod = _parse_int(site_id, "target_cod", target_cod_raw) if target_cod_raw else None

    def opt(name):
        value = (row.get(name) or "").strip()
        return value if value else None

    return {
        "site_id": site_id,
        "site_name": row["site_name"].strip(),
        "state": row["state"].strip(),
        "lat": lat,
        "lon": lon,
        "vendor": row["vendor"].strip(),
        "reactor_model": row["reactor_model"].strip(),
        "owner": row["owner"].strip(),
        "offtaker": opt("offtaker"),
        "module_count": module_count,
        "capacity_mwe_total": capacity,
        "phase": phase,
        "target_cod": target_cod,
        "nrc_docket": opt("nrc_docket"),
        "source_url": row["source_url"].strip(),
    }


def process_csv(input_path, output_path):
    records = []
    seen_ids = set()
    with open(input_path, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rec = _validate_and_transform(row)
            if rec["site_id"] in seen_ids:
                raise ValidationError(f"{rec['site_id']}: duplicate site_id")
            seen_ids.add(rec["site_id"])
            records.append(rec)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2)
        f.write("\n")
    return records


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    repo = os.path.abspath(os.path.join(here, os.pardir))
    in_path = os.path.join(repo, "data", "raw", "smr_sites.csv")
    out_path = os.path.join(repo, "frontend", "src", "data", "smr_sites.json")
    records = process_csv(in_path, out_path)
    print(f"Wrote {len(records)} SMR sites to {out_path}")


if __name__ == "__main__":
    try:
        main()
    except ValidationError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
python scripts/test_process_smr_sites.py
```

Expected: `OK` with 5 tests passing.

- [ ] **Step 3: Commit**

```bash
git add scripts/process_smr_sites.py
git commit -m "feat: SMR sites CSV processor with validation"
```

---

## Task 4: Run the processor against the seed CSV and commit the JSON

**Files:**
- Create: `frontend/src/data/smr_sites.json` (generated)

- [ ] **Step 1: Run the processor end-to-end**

```bash
python scripts/process_smr_sites.py
```

Expected stdout: `Wrote 10 SMR sites to .../frontend/src/data/smr_sites.json`. Exit code 0.

If any row fails validation, the script will exit non-zero with an `ERROR: <site_id>: <reason>` line — fix the CSV row, re-run.

- [ ] **Step 2: Sanity-check the JSON**

```bash
python -c "import json; data = json.load(open('frontend/src/data/smr_sites.json', encoding='utf-8')); print(len(data), data[0]['site_id'], data[0]['vendor'])"
```

Expected: `10 tva-clinch-river GE Hitachi`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/data/smr_sites.json
git commit -m "data: generate processed SMR sites JSON"
```

---

## Task 5: Add SMR color palette module

**Files:**
- Create: `frontend/src/map/smrColors.js`

- [ ] **Step 1: Implement the palette**

Vendor stroke colors and phase visual treatments are referenced by both `SmrNode` and `SmrTooltip`, so they live in one shared module. We keep them separate from the existing `colors.js` (which deals with output/price gradients) for clarity.

Create `frontend/src/map/smrColors.js`:

```javascript
// Stroke color per SMR vendor. Falls back to a neutral slate for unknown vendors.
const VENDOR_COLORS = {
  "NuScale": "#a78bfa",
  "X-energy": "#34d399",
  "GE Hitachi": "#60a5fa",
  "Westinghouse": "#f472b6",
  "Holtec": "#fb923c",
  "TerraPower": "#facc15",
  "Kairos": "#22d3ee",
  "Oklo": "#f87171",
  "Last Energy": "#c084fc"
};

const VENDOR_FALLBACK = "#94a3b8";

export function colorForVendor(vendor) {
  return VENDOR_COLORS[vendor] || VENDOR_FALLBACK;
}

// Phase visual treatment. `dash` is an SVG strokeDasharray string (or null for solid).
// `innerDot` flags "under construction" for an extra inner marker.
const PHASE_STYLES = {
  announced: { dash: "3 3", innerDot: false, label: "Announced" },
  nrc_engaged: { dash: null, innerDot: false, label: "NRC-Engaged" },
  under_construction: { dash: null, innerDot: true, label: "Under Construction" }
};

const PHASE_FALLBACK = { dash: "3 3", innerDot: false, label: "Unknown" };

export function styleForPhase(phase) {
  return PHASE_STYLES[phase] || PHASE_FALLBACK;
}

export function labelForPhase(phase) {
  return styleForPhase(phase).label;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/map/smrColors.js
git commit -m "feat: SMR vendor/phase color palette"
```

---

## Task 6: Build the SmrNode component

**Files:**
- Create: `frontend/src/map/SmrNode.jsx`

- [ ] **Step 1: Implement the SMR map glyph**

`SmrNode` mirrors `PlantNode`'s scale-inversion approach (`transform={... scale(${invScale})}`) so the glyph stays the same screen size while the map zooms, matching the operating-plant nodes' behavior. Radius is ~70% of an operating-plant tower's base half-width (operating plants use base half ~5–10 px; we pick a fixed `BASE_R = 5`).

Create `frontend/src/map/SmrNode.jsx`:

```javascript
import { memo } from "react";
import { colorForVendor, styleForPhase } from "./smrColors";

const BASE_R = 5;

function SmrNodeImpl({ site, x, y, scale, onHover, onLeave }) {
  const invScale = scale > 0 ? 1 / scale : 1;
  const stroke = colorForVendor(site.vendor);
  const { dash, innerDot } = styleForPhase(site.phase);

  const label = `${site.site_name} (${site.vendor} ${site.reactor_model})`;

  return (
    <g
      className="smr-node"
      transform={`translate(${x}, ${y}) scale(${invScale})`}
      role="img"
      aria-label={label}
      onMouseEnter={() => onHover?.(site)}
      onMouseLeave={() => onLeave?.(site)}
      onFocus={() => onHover?.(site)}
      onBlur={() => onLeave?.(site)}
      tabIndex={0}
    >
      <circle
        r={BASE_R}
        fill="none"
        stroke={stroke}
        strokeWidth={1.4}
        strokeOpacity={0.95}
        strokeDasharray={dash || undefined}
      />
      {innerDot && (
        <circle
          r={BASE_R * 0.35}
          fill={stroke}
          fillOpacity={0.9}
          pointerEvents="none"
        />
      )}
      {/* Larger transparent hit target for easier hovering */}
      <circle r={BASE_R * 2.4} fill="transparent" />
    </g>
  );
}

export default memo(SmrNodeImpl);
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/map/SmrNode.jsx
git commit -m "feat: SmrNode component for map glyph"
```

---

## Task 7: Build the SmrTooltip component

**Files:**
- Create: `frontend/src/map/SmrTooltip.jsx`

- [ ] **Step 1: Implement the tooltip**

`SmrTooltip` reuses the existing `.plant-tooltip` CSS class for layout/positioning (translate via inline `transform`) — same DOM shape as `PlantTooltip` so it picks up the same styling without new CSS. Per-module MWe is derived inline.

Create `frontend/src/map/SmrTooltip.jsx`:

```javascript
import { Factory, Layers, Calendar } from "lucide-react";
import { labelForPhase } from "./smrColors";

function formatMw(value) {
  if (!Number.isFinite(value)) return "--";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

export default function SmrTooltip({ site, x, y }) {
  if (!site) return null;

  const perModule = site.module_count > 0
    ? site.capacity_mwe_total / site.module_count
    : null;

  const ownerLine = site.offtaker && site.offtaker !== site.owner
    ? `${site.owner} → ${site.offtaker}`
    : site.owner;

  return (
    <div
      className="plant-tooltip smr-tooltip"
      style={{ transform: `translate(${x}px, ${y}px)` }}
      role="tooltip"
    >
      <strong>{site.site_name}</strong>
      <span className="tt-sub">
        {site.vendor} · {site.reactor_model}
      </span>
      <span className={`tt-phase tt-phase-${site.phase}`}>
        {labelForPhase(site.phase)}
      </span>
      <div className="tt-metrics">
        <span>
          <Factory size={12} /> {site.module_count} ×{" "}
          {formatMw(perModule)} MWe
        </span>
        <span>
          <Layers size={12} /> {formatMw(site.capacity_mwe_total)} MWe total
        </span>
        <span>
          <Calendar size={12} />{" "}
          {Number.isFinite(site.target_cod) ? site.target_cod : "TBD"}
        </span>
      </div>
      <span className="tt-sub">{ownerLine}</span>
      <span className="tt-iso">{site.state}</span>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/map/SmrTooltip.jsx
git commit -m "feat: SmrTooltip with vendor, phase, capacity, owner, COD"
```

---

## Task 8: Add minimal CSS for SMR tooltip phase badge

**Files:**
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: Check existing tooltip CSS**

Run:

```bash
grep -n "plant-tooltip\|tt-phase\|tt-sub\|tt-iso" frontend/src/styles.css
```

Expected: `.plant-tooltip`, `.tt-sub`, `.tt-metrics`, `.tt-iso` already exist. The new classes (`.smr-tooltip`, `.tt-phase`, `.tt-phase-announced`, `.tt-phase-nrc_engaged`, `.tt-phase-under_construction`) do not.

- [ ] **Step 2: Append phase-badge styles to `frontend/src/styles.css`**

Add this block at the end of the file:

```css
.tt-phase {
  display: inline-block;
  align-self: flex-start;
  margin-top: 4px;
  padding: 1px 6px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  border-radius: 999px;
  border: 1px solid currentColor;
  opacity: 0.9;
}

.tt-phase-announced { color: #94a3b8; }
.tt-phase-nrc_engaged { color: #60a5fa; }
.tt-phase-under_construction { color: #34d399; }

.smr-node { cursor: pointer; }
.smr-node:focus { outline: none; }
.smr-node:focus circle:first-child {
  stroke-width: 2.2;
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/styles.css
git commit -m "style: SMR tooltip phase badge + node focus"
```

---

## Task 9: Wire SMR data and components into NuclearMap

**Files:**
- Modify: `frontend/src/map/NuclearMap.jsx`

This is the largest task. We import the JSON, project the sites once, render a `<g className="smr-layer">` group beneath the operating-plant group (drawn before, so painted under), and add a parallel `hoveredSmr` state with its own tooltip.

- [ ] **Step 1: Add the imports**

In `frontend/src/map/NuclearMap.jsx`, find the existing imports block (lines 1-11) and add two new lines: import `SmrNode`, `SmrTooltip`, and the SMR data JSON. After modification, the import block at the top of the file should include:

```javascript
import { useEffect, useMemo, useRef, useState } from "react";
import { feature } from "topojson-client";
import statesTopo from "us-atlas/states-10m.json";
import isoRegions from "./iso-regions.json";
import smrSitesData from "../data/smr_sites.json";
import { createProjection, projectPlant, bboxOfFeatures } from "./projection";
import { aggregateLmpByIso, bboxOfPath } from "./isoData";
import { colorForIsoHeatmap } from "./colors";
import { useZoom } from "./useZoom";
import PlantNode from "./PlantNode";
import PlantTooltip from "./PlantTooltip";
import SmrNode from "./SmrNode";
import SmrTooltip from "./SmrTooltip";
import RegionChips from "./RegionChips";
```

- [ ] **Step 2: Add `hoveredSmr` state next to `hoveredPlant`**

Find the existing line:

```javascript
const [hoveredPlant, setHoveredPlant] = useState(null);
```

Add immediately after:

```javascript
const [hoveredSmr, setHoveredSmr] = useState(null);
```

- [ ] **Step 3: Add a projected-SMRs memo**

`projectPlant` expects a GeoJSON-style feature with `geometry.coordinates = [lon, lat]`. Our SMR records have raw `lat`/`lon` fields. We project them inline using the projection function directly.

Find the existing `projectedPlants` memo (around lines 50-59) and add immediately after it:

```javascript
  const projectedSmrs = useMemo(() => {
    if (!projection) return [];
    return smrSitesData
      .map((site) => {
        const p = projection([site.lon, site.lat]);
        if (!p || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) return null;
        return { site, x: p[0], y: p[1] };
      })
      .filter(Boolean);
  }, [projection]);
```

- [ ] **Step 4: Add an `smrTooltipPos` memo**

Right after the existing `tooltipPos` memo (around lines 146-153), add:

```javascript
  const smrTooltipPos = useMemo(() => {
    if (!hoveredSmr || !projection) return null;
    const p = projection([hoveredSmr.lon, hoveredSmr.lat]);
    if (!p) return null;
    const screenX = transform.x + p[0] * transform.k;
    const screenY = transform.y + p[1] * transform.k;
    return { x: screenX + 14, y: screenY - 18 };
  }, [hoveredSmr, projection, transform]);
```

- [ ] **Step 5: Render the SMR layer beneath the plant nodes**

Find the existing `<g className="plant-nodes">` block (around lines 263-281). Insert a new `<g className="smr-layer">` block **immediately before** it, so the SMRs render underneath:

```jsx
            <g className="smr-layer">
              {projectedSmrs.map(({ site, x, y }) => (
                <SmrNode
                  key={site.site_id}
                  site={site}
                  x={x}
                  y={y}
                  scale={transform.k}
                  onHover={setHoveredSmr}
                  onLeave={() => setHoveredSmr(null)}
                />
              ))}
            </g>
```

- [ ] **Step 6: Render the SMR tooltip alongside the plant tooltip**

Find the existing line near the end of the JSX:

```jsx
      {tooltipPos && <PlantTooltip plant={hoveredPlant} x={tooltipPos.x} y={tooltipPos.y} />}
```

Replace with:

```jsx
      {tooltipPos && <PlantTooltip plant={hoveredPlant} x={tooltipPos.x} y={tooltipPos.y} />}
      {smrTooltipPos && <SmrTooltip site={hoveredSmr} x={smrTooltipPos.x} y={smrTooltipPos.y} />}
```

- [ ] **Step 7: Build the frontend to verify no compile errors**

```bash
cd frontend && npm run build
```

Expected: build succeeds, `dist/` is regenerated, no errors mentioning `SmrNode`, `SmrTooltip`, or `smr_sites.json`.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/map/NuclearMap.jsx
git commit -m "feat: render SMR sites layer with tooltip on nuclear map"
```

---

## Task 10: Manual verification in the dev server

**Files:**
- (No code changes — verification only)

- [ ] **Step 1: Start the dev server**

```bash
cd frontend && npm run dev
```

Expected: Vite prints a local URL (e.g. `http://localhost:5173`).

- [ ] **Step 2: Verify SMR nodes appear on the map**

Open the URL. Confirm:
- Hollow ring glyphs appear at the expected US locations (TN, TX, WA, WY, MI, ID, NY, VA — 10 sites total).
- Operating-plant cooling-tower nodes still render normally on top of any overlapping SMR rings.
- Rings render at the same screen size at all zoom levels (verify by zooming with the existing zoom controls).

- [ ] **Step 3: Verify phase styling**

- Most rings are solid (NRC-engaged or under-construction).
- At least one ring (e.g. Energy Northwest Xe-100 in WA — `announced`) has a dashed stroke.
- Kemmerer WY (TerraPower Natrium) and Kairos Hermes TN (`under_construction`) have a small filled inner dot.

- [ ] **Step 4: Verify tooltips**

Hover each SMR node and confirm the tooltip shows:
- Site name (header)
- Vendor · Reactor model (e.g. `GE Hitachi · BWRX-300`)
- Colored phase badge with correct label
- `{module_count} × {per-module} MWe` (e.g. `4 × 80 MWe` for Dow Seadrift)
- Total MWe
- Target COD year (or `TBD` if blank)
- Owner (and `Owner → Offtaker` when the two differ)
- State badge in the corner

- [ ] **Step 5: Verify operating-plant interaction is unchanged**

- Hover an existing operating plant — `PlantTooltip` still appears with output/price/etc.
- Click an operating plant — selection, ownership-line animation, and detail panel still work.
- Both tooltips do not appear simultaneously when moving from one node type to the other (mouse-leave clears the prior hover before the new one sets).

- [ ] **Step 6: Stop the dev server and commit any incidental changes**

```bash
# No commit needed unless verification surfaced a bug to fix.
```

If verification failed, file the failing observation as the in-progress task, fix, re-verify, then commit the fix.

---

## Task 11: Add a minimal SMR legend overlay

**Files:**
- Modify: `frontend/src/map/NuclearMap.jsx`
- Modify: `frontend/src/styles.css`

The spec calls for a small legend explaining the SMR glyph. There is no existing map legend (the `RegionChips` are interactive controls, not a legend), so we add a small static overlay in the map corner. No new interactive controls.

- [ ] **Step 1: Add the legend JSX inside the `.nuclear-map` container**

In `frontend/src/map/NuclearMap.jsx`, find the closing `</svg>` tag and the `<RegionChips ... />` block. Insert this static legend **between** `</svg>` and `<RegionChips ... />`:

```jsx
      <div className="smr-legend" aria-label="SMR layer legend">
        <span className="smr-legend-title">SMR Sites</span>
        <span className="smr-legend-item">
          <svg width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
            <circle r="5" fill="none" stroke="#94a3b8" strokeWidth="1.4" strokeDasharray="3 3" />
          </svg>
          Announced
        </span>
        <span className="smr-legend-item">
          <svg width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
            <circle r="5" fill="none" stroke="#60a5fa" strokeWidth="1.4" />
          </svg>
          NRC-Engaged
        </span>
        <span className="smr-legend-item">
          <svg width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
            <circle r="5" fill="none" stroke="#34d399" strokeWidth="1.4" />
            <circle r="1.7" fill="#34d399" />
          </svg>
          Under Construction
        </span>
      </div>
```

- [ ] **Step 2: Append styles to `frontend/src/styles.css`**

Add at the end of the file:

```css
.smr-legend {
  position: absolute;
  bottom: 16px;
  left: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  background: rgba(2, 6, 23, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 11px;
  pointer-events: none;
  z-index: 5;
}

.smr-legend-title {
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #94a3b8;
  font-size: 10px;
}

.smr-legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}
```

- [ ] **Step 3: Build to verify**

```bash
cd frontend && npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/map/NuclearMap.jsx frontend/src/styles.css
git commit -m "feat: SMR layer legend overlay"
```

---

## Verification Summary

After Task 10 completes successfully:
- 10 SMR sites visible on the map with vendor-colored hollow rings
- Phase encoded via dash pattern + inner dot for `under_construction`
- Hover tooltip shows vendor, model, phase, capacity breakdown, owner/offtaker, target COD, state
- Existing operating-plant behavior is unchanged
- `python scripts/test_process_smr_sites.py` passes
- `cd frontend && npm run build` succeeds
