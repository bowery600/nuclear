# Bloomberg-Terminal Tabs — Design Spec

**Date:** 2026-05-23
**Status:** Proposed
**Scope:** Frontend (`frontend/src/`) — additive; no backend changes.

## Goal

Transform the Nuclear Grid app's top chrome from a single-view dashboard into a Bloomberg-terminal-style multi-view workspace. Add primary view tabs (MAP / MARKETS / OUTAGES / PIPELINE) and utility chips (NEWS / CMD / ARCHIVES), with a persistent ticker rail and a `Ctrl+K` command palette tying everything together.

## Non-Goals (v1)

- Real market data feeds. All prices/headlines are seeded + synthetic-fluctuated. The seam for swapping in a real API later is identified but not implemented.
- Persisted user preferences (custom watchlists, saved alerts).
- Mobile/responsive collapse of the tab bar. Desktop-first, matching the rest of the app.
- New backend routes. All new views consume the existing `/api/plants` payload plus static JSON seeds bundled with the frontend.

## Layout

The top rail becomes a denser two-row chrome:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ▣ NUCLEAR GRID │ MAP  MARKETS  OUTAGES  PIPELINE │ 🔍 search…  ● LIVE  93 │  ← Row 1
├──────────────────────────────────────────────────────────────────────────┤
│  TICKER RAIL (persistent across all views) ····························· │  ← Row 2
└──────────────────────────────────────────────────────────────────────────┘
                                                       [NEWS] [CMD] [ARCH]  ← Floating chip cluster (top-right)
```

- **Tab bar** is inline with the brand block. Active tab uses bright cyan accent + underline glow (existing palette). Inactive = muted gray; hover brightens.
- **Search input, live indicator, site-count pill** remain on the right of Row 1. Search becomes context-aware (plants on MAP, tickers on MARKETS, projects on PIPELINE).
- **TickerRail** renders unconditionally — it is the heartbeat and visually anchors the terminal feel across views.
- **Utility chip cluster** floats top-right of the viewport. Each chip toggles an overlay; chips do not change `activeView`.
- **TimelineSlider, MetricStrip, OwnershipPanel** are MAP-only — hidden on the other three views so they get the full stage.

## Primary Views

### MAP (default)
Unchanged from the current behavior. Default `activeView` on load.

### MARKETS
Two-column split, dense, monospace numerics throughout.

**Left column — Fuel Cycle Panel.** Three stacked cards:
- **U₃O₈ Spot** — seed ~$80/lb
- **Conversion** — seed ~$80/kgU
- **SWU Enrichment** — seed ~$170/SWU

Each card shows: price, daily Δ + Δ%, 30-day sparkline. Values are deterministically seeded and fluctuated by the existing `fluctuationFactor` tick.

**Right column — Nuclear Equities Watchlist.** Table of ~12 tickers: CCJ, LEU, BWXT, NNE, OKLO, SMR, GEV, CEG, VST, TLN, BWX, CCO. Columns: ticker · name · price · Δ · Δ% · mini sparkline · market cap. Sortable. Clicking a row sets `highlightTicker`, which the MAP view consumes to highlight any plants owned by that company on the next tab back to MAP.

### OUTAGES
Built on the deterministic refueling logic already in `animatedPlants` (`(plantId + timelineYear) % 13 === 0`).

- **Top KPI strip:** MW currently on outage · # units down · % of fleet offline · next scheduled return.
- **Gantt-style timeline:** Y-axis = plant units, X-axis = ±90 days from today. Colored bars for refueling (cyan), forced outage (red), planned maintenance (amber). Hover surfaces details; click jumps to MAP with that plant selected.
- Respects the global `timelineYear` — dragging the year shifts which outages appear.

### PIPELINE
SMR / new-build tracker. Sourced from the existing `frontend/src/data/smr_sites.json` payload.

- **Kanban-style columns by status:** Announced → Site Permit → Licensed → Under Construction → Operating.
- **Cards** show: project name, vendor (NuScale / X-energy / Holtec / GEH / Westinghouse / Kairos / Oklo), MWe, target COD, host site/state, sponsor.
- **Filter chips:** vendor, reactor type (LWR / HTGR / MSR / SFR), region.

### Cross-view consistency
- Color palette, status badges, monospace font conventions are shared.
- `fluctuationFactor`, `timelineYear`, `selectedPlant`, `highlightTicker` are top-level App state and consumed by every view.
- Selecting a plant on MAP and switching to OUTAGES keeps the plant highlighted in the Gantt.

## Utility Chips

Three icon-buttons clustered top-right. Each toggles `overlay` state; underlying view stays mounted.

### NEWS
- Slide-in panel from the right (matches Archives modal styling).
- Reverse-chronological feed of ~40 curated synthetic nuclear headlines covering equities, regulatory, geopolitics, fuel cycle, restart announcements, SMR milestones.
- Each item: timestamp, source tag (NRC / Reuters / Bloomberg / WNN / company release), headline, 1-line summary, optional ticker chips that deep-link into MARKETS.
- Topic filter chips at top: FUEL · REGULATORY · M&A · SMR · OUTAGE · MACRO.
- New headlines fade in periodically (driven by `fluctuationFactor`) so the feed feels live.

### CMD — Command Palette (Ctrl+K / Cmd+K)
The centerpiece — what makes the app feel like a terminal rather than a dashboard.

- Centered modal. Monospace input with blinking cursor. Placeholder: `> VOGTLE <GO>`.
- Type-ahead matches across a unified index of:
  - **Views:** `MAP`, `MARKETS`, `OUTAGES`, `PIPELINE`, `NEWS`, `ARCHIVES`
  - **Plants:** plant names from the loaded GeoJSON → selects on MAP
  - **Tickers:** equities list → MARKETS + highlights row
  - **Companies / Owners:** parent companies from plant properties → filters
  - **Vendors:** SMR vendors → PIPELINE filtered
  - **States / ISOs:** US states + ISO codes → MAP filtered
- Keyboard: `↑↓` to navigate · `Enter` to execute · `Esc` to close.
- Recent commands history at the bottom of the modal.
- Small `⌘K` hint pill in the top rail for discoverability.

### ARCHIVES (existing)
No behavior change. Relocated into the chip cluster and restyled to match the new chip visual.

## Architecture

### App-level state (in `App.jsx`)
Three new pieces of top-level state, joining the existing ones:
```js
const [activeView, setActiveView] = useState("map");           // "map" | "markets" | "outages" | "pipeline"
const [overlay, setOverlay] = useState(null);                  // null | "news" | "cmd" | "archives"
const [highlightTicker, setHighlightTicker] = useState(null);  // cross-view linkage MARKETS → MAP
```

Existing state (`fluctuationFactor`, `timelineYear`, `selectedPlant`, `animatedPlants`, `replacementFuel`, etc.) is unchanged and is passed down as props to the new views.

### Conditional rendering in the map stage
```jsx
{activeView === "map"      && <MapView .../>}
{activeView === "markets"  && <MarketsView plants={animatedPlants} tick={fluctuationFactor} onHighlightTicker={setHighlightTicker} />}
{activeView === "outages"  && <OutagesView plants={animatedPlants} year={timelineYear} onSelectPlant={selectPlant} onSwitchView={setActiveView} />}
{activeView === "pipeline" && <PipelineView />}
```

- `TickerRail` renders unconditionally.
- `TimelineSlider`, `MetricStrip`, `OwnershipPanel` only render when `activeView === "map"`.
- Global keyboard handler in `App.jsx` listens for `Ctrl/Cmd+K` and sets `overlay = "cmd"`.

### New files
```
frontend/src/
  map/
    TopRail.jsx              ← extracted from App.jsx; adds tab bar + chip cluster
  views/
    MarketsView.jsx          ← fuel cycle panel + equities watchlist
    OutagesView.jsx          ← KPI strip + Gantt
    PipelineView.jsx         ← Kanban columns
  overlays/
    NewsOverlay.jsx
    CommandPalette.jsx
  data/
    fuelCycleSeed.js         ← seed prices for U3O8 / conversion / SWU
    equitiesSeed.js          ← ticker list + seed prices + company→plant mapping
    newsSeed.js              ← ~40 curated synthetic headlines
    commandIndex.js          ← builds searchable index from plants + tickers + views
```

### Why extract `TopRail.jsx`
The existing `TopRail` is defined inline at the bottom of `App.jsx` (~50 lines). Adding tabs + chip cluster + the `⌘K` hint pushes it past the point where inline-in-App makes sense. Extracting now keeps `App.jsx` focused on state orchestration.

### Styling
All new styles append to `frontend/src/styles.css`, following the existing pattern (no CSS framework introduction). New rules reuse existing design tokens: cyan accents, monospace numerics, glow-on-active, status pill colors.

## Data Sources

| View / Overlay | Source |
|---|---|
| MAP | existing `/api/plants` (unchanged) |
| MARKETS — fuel cycle | `fuelCycleSeed.js` (static seeds, fluctuated client-side by `fluctuationFactor`) |
| MARKETS — equities | `equitiesSeed.js` (static seeds, fluctuated client-side) |
| OUTAGES | derived from `animatedPlants` using the existing deterministic refueling rule |
| PIPELINE | existing `frontend/src/data/smr_sites.json` |
| NEWS | `newsSeed.js` (curated static array) |
| CMD index | composed at runtime from `animatedPlants` + `equitiesSeed` + static view/vendor/state lists |

All seed files are designed to be drop-in replaceable with real API fetches in a follow-up. No code path assumes seeds are static beyond the data layer.

## Testing

- Manual verification of each tab switch (MAP ↔ MARKETS ↔ OUTAGES ↔ PIPELINE) with the dev server running, checking that:
  - Ticker rail stays mounted and continues animating across switches.
  - `selectedPlant` survives a round-trip MAP → OUTAGES → MAP.
  - `timelineYear` survives a round-trip and propagates to OUTAGES.
  - MetricStrip / TimelineSlider / OwnershipPanel correctly hide on non-MAP views.
- Manual verification of each overlay (NEWS / CMD / ARCHIVES) — opens, closes via Esc and via the chip, doesn't trap focus.
- CMD palette: verified type-ahead returns matches for plant names, tickers, vendors, and view names; Enter on each result type takes the correct action.
- No automated test suite exists for the frontend today; this spec does not introduce one.

## Open Questions

None at design time. Implementation may surface visual-tuning questions (e.g., exact Gantt row height, equities table density) — those will be resolved inline during build.
