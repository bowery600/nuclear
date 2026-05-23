# Bloomberg-Terminal Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Bloomberg-terminal-style primary tabs (MAP / MARKETS / OUTAGES / PIPELINE) and utility chips (NEWS / CMD / ARCHIVES) over the existing nuclear map, with a Ctrl+K command palette tying them together.

**Architecture:** Additive frontend-only change. New top-level state in `App.jsx` (`activeView`, `overlay`, `highlightTicker`) drives conditional rendering of the existing map view vs. three new sibling views (`MarketsView`, `OutagesView`, `PipelineView`) inside the same map-stage area. `TickerRail` stays persistent. Three overlays (`NewsOverlay`, `CommandPalette`, existing `NuclearHistory`) toggle via the floating chip cluster. All new data is seeded statically and animated client-side using the existing `fluctuationFactor` tick.

**Tech Stack:** React 19, Vite 6, `lucide-react` icons (already installed), CSS appended to `frontend/src/styles.css`. No new dependencies.

**Verification convention:** This codebase has no automated frontend tests. Each task's "verify" step means running `npm run dev` from `frontend/` and manually checking the listed behavior in a browser at the URL Vite prints (typically `http://127.0.0.1:5173`). If a dev server is already running from a prior task, just refresh the browser.

**Spec:** [`docs/superpowers/specs/2026-05-23-bloomberg-tabs-design.md`](../specs/2026-05-23-bloomberg-tabs-design.md)

---

## File Structure

**Create:**
- `frontend/src/map/TopRail.jsx` — extracted top rail with tab bar + chip cluster + ⌘K hint
- `frontend/src/views/MarketsView.jsx` — fuel cycle panel + equities watchlist
- `frontend/src/views/OutagesView.jsx` — KPI strip + Gantt
- `frontend/src/views/PipelineView.jsx` — SMR Kanban
- `frontend/src/overlays/NewsOverlay.jsx` — slide-in news feed
- `frontend/src/overlays/CommandPalette.jsx` — Ctrl+K modal
- `frontend/src/data/fuelCycleSeed.js` — U₃O₈ / conversion / SWU seeds
- `frontend/src/data/equitiesSeed.js` — ticker list, seed prices, company→plant mapping
- `frontend/src/data/newsSeed.js` — ~40 curated synthetic headlines
- `frontend/src/data/commandIndex.js` — type-ahead index builder

**Modify:**
- `frontend/src/App.jsx` — add `activeView`/`overlay`/`highlightTicker` state, conditional view render, global Ctrl+K listener, remove inline `TopRail`
- `frontend/src/styles.css` — append styles for tabs, chips, each view, and overlays

---

## Task 1: Extract `TopRail` into its own file (no behavior change)

**Goal:** Pure refactor. App still looks and behaves exactly as it does today. This sets up Task 2.

**Files:**
- Create: `frontend/src/map/TopRail.jsx`
- Modify: `frontend/src/App.jsx` (remove inline `TopRail` definition at lines 514-559, replace with import)

- [ ] **Step 1: Create `frontend/src/map/TopRail.jsx`**

Copy the existing `TopRail` function from `App.jsx:514-559` verbatim into a new file, adding imports for the icons it uses:

```jsx
import { Search, Loader2, MapPin, Factory, BookOpen } from "lucide-react";

export default function TopRail({ query, setQuery, visibleCount, status, activeYear, onShowHistory }) {
  return (
    <header className="top-rail">
      <div className="brand-block">
        <div className="brand-mark" aria-hidden="true">
          <Factory size={21} />
        </div>
        <div>
          <p className="eyebrow">Nuclear Grid</p>
          <h1>Ownership Map</h1>
        </div>
      </div>

      <label className="search-box" htmlFor="plant-search">
        <Search size={18} aria-hidden="true" />
        <span className="sr-only">Search plants, owners, states, or markets</span>
        <input
          id="plant-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search plants, owners, states"
        />
      </label>

      <div className={`live-indicator${activeYear !== 2026 ? " sim-indicator" : ""}`} aria-hidden="true">
        <span className={activeYear !== 2026 ? "sim-dot" : "live-dot"} />
        {activeYear !== 2026 ? `HISTORICAL` : "LIVE FEED"}
      </div>

      <div className="count-pill" aria-live="polite">
        {status === "loading" ? <Loader2 size={15} className="spin" /> : <MapPin size={15} />}
        {visibleCount} sites
      </div>

      <button
        className="top-rail-archives-btn"
        onClick={onShowHistory}
        title="Open Nuclear History Archives"
      >
        <BookOpen size={15} />
        <span>Archives</span>
      </button>
    </header>
  );
}
```

- [ ] **Step 2: Update `App.jsx` to import `TopRail` and delete the inline definition**

At the top of `App.jsx`, add:
```jsx
import TopRail from "./map/TopRail";
```

Delete the entire inline `TopRail` function (lines 514-559 in the current file). Also remove `Search`, `BookOpen`, and any icons from the `lucide-react` import line in `App.jsx` that are no longer referenced after this extraction. Keep all icons that are still used elsewhere in `App.jsx` (e.g., `Factory` is used in `MetricStrip`, `Loader2` in `OwnershipPanel`).

To check which icons are still used after extraction, search `App.jsx` for each imported icon name and keep only those with remaining references.

- [ ] **Step 3: Verify no behavior change**

Run from `frontend/`:
```
npm run dev
```
Open the browser at the URL printed. Expected: identical to before — brand, search, LIVE/HISTORICAL pill, site count, Archives button all render as they did.

- [ ] **Step 4: Commit**

```
git add frontend/src/map/TopRail.jsx frontend/src/App.jsx
git commit -m "refactor: extract TopRail into its own file"
```

---

## Task 2: Add `activeView` state and primary tab bar

**Goal:** Tab bar renders, clicking tabs flips `activeView`, MAP works, the other three views render a placeholder text block.

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/map/TopRail.jsx`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: Add `activeView` state to `App.jsx`**

Inside the `App` component, alongside the existing `useState` calls, add:

```jsx
const [activeView, setActiveView] = useState("map");
```

- [ ] **Step 2: Pass `activeView` + setter into `TopRail`**

In `App.jsx`, update the `<TopRail ... />` JSX to include:
```jsx
<TopRail
  query={query}
  setQuery={setQuery}
  visibleCount={filteredPlants.features.length}
  status={status}
  activeYear={timelineYear}
  onShowHistory={() => setShowHistory(true)}
  activeView={activeView}
  onChangeView={setActiveView}
/>
```

- [ ] **Step 3: Render tab bar inside `TopRail`**

In `frontend/src/map/TopRail.jsx`, update the signature and add the tab bar between the brand block and the search box:

```jsx
import { Search, Loader2, MapPin, Factory, BookOpen } from "lucide-react";

const TABS = [
  { id: "map",      label: "MAP" },
  { id: "markets",  label: "MARKETS" },
  { id: "outages",  label: "OUTAGES" },
  { id: "pipeline", label: "PIPELINE" }
];

export default function TopRail({
  query, setQuery, visibleCount, status, activeYear, onShowHistory,
  activeView, onChangeView
}) {
  return (
    <header className="top-rail">
      <div className="brand-block">
        <div className="brand-mark" aria-hidden="true">
          <Factory size={21} />
        </div>
        <div>
          <p className="eyebrow">Nuclear Grid</p>
          <h1>Ownership Map</h1>
        </div>
      </div>

      <nav className="view-tabs" role="tablist" aria-label="Primary views">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeView === tab.id}
            className={`view-tab ${activeView === tab.id ? "active" : ""}`}
            onClick={() => onChangeView(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <label className="search-box" htmlFor="plant-search">
        <Search size={18} aria-hidden="true" />
        <span className="sr-only">Search plants, owners, states, or markets</span>
        <input
          id="plant-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search plants, owners, states"
        />
      </label>

      <div className={`live-indicator${activeYear !== 2026 ? " sim-indicator" : ""}`} aria-hidden="true">
        <span className={activeYear !== 2026 ? "sim-dot" : "live-dot"} />
        {activeYear !== 2026 ? `HISTORICAL` : "LIVE FEED"}
      </div>

      <div className="count-pill" aria-live="polite">
        {status === "loading" ? <Loader2 size={15} className="spin" /> : <MapPin size={15} />}
        {visibleCount} sites
      </div>

      <button
        className="top-rail-archives-btn"
        onClick={onShowHistory}
        title="Open Nuclear History Archives"
      >
        <BookOpen size={15} />
        <span>Archives</span>
      </button>
    </header>
  );
}
```

- [ ] **Step 4: Conditionally render placeholders for non-map views**

In `App.jsx`, inside the `<section className="map-stage">` block, find the `<NuclearMap .../>` element and wrap the rendering so that only the active view shows. Add placeholder divs for the other three views:

```jsx
<section className="map-stage" aria-label="Nuclear plant map">
  {activeView === "map" && (
    <NuclearMap
      plants={filteredPlants}
      selectedPlant={activeSelectedPlant}
      onSelect={selectPlant}
      metricMode={metricMode}
      onUpdatePlantMetrics={handleUpdatePlantMetrics}
      show3DOverlay={show3DOverlay}
      setShow3DOverlay={setShow3DOverlay}
    />
  )}

  {activeView === "markets"  && <div className="view-placeholder">MARKETS view — coming soon</div>}
  {activeView === "outages"  && <div className="view-placeholder">OUTAGES view — coming soon</div>}
  {activeView === "pipeline" && <div className="view-placeholder">PIPELINE view — coming soon</div>}

  <TopRail
    query={query}
    setQuery={setQuery}
    visibleCount={filteredPlants.features.length}
    status={status}
    activeYear={timelineYear}
    onShowHistory={() => setShowHistory(true)}
    activeView={activeView}
    onChangeView={setActiveView}
  />

  {/* keep TickerRail, TimelineSlider, MetricStrip exactly as they are for now — Task 3 will hide them on non-map views */}
  <TickerRail plants={animatedPlants} />
  <TimelineSlider activeYear={timelineYear} onChangeYear={setTimelineYear} />
  <MetricStrip
    stats={stats}
    status={status}
    error={error}
    replacementFuel={replacementFuel}
    setReplacementFuel={setReplacementFuel}
  />

  {status === "error" && (
    <div className="map-alert" role="alert">
      <AlertCircle size={18} />
      <span>{error}</span>
    </div>
  )}
</section>
```

- [ ] **Step 5: Append tab bar + placeholder styles to `styles.css`**

Append to the end of `frontend/src/styles.css`:

```css
/* === Primary view tabs === */
.view-tabs {
  display: flex;
  gap: 4px;
  align-items: center;
  margin-left: 8px;
}
.view-tab {
  background: transparent;
  border: none;
  color: rgba(226, 232, 240, 0.55);
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.12em;
  padding: 8px 12px;
  cursor: pointer;
  position: relative;
  transition: color 120ms ease;
}
.view-tab:hover {
  color: rgba(226, 232, 240, 0.9);
}
.view-tab.active {
  color: #22d3ee;
}
.view-tab.active::after {
  content: "";
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: 2px;
  height: 2px;
  background: #22d3ee;
  box-shadow: 0 0 8px rgba(34, 211, 238, 0.6);
}

/* === Placeholder for unfinished views === */
.view-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(226, 232, 240, 0.4);
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 14px;
  letter-spacing: 0.1em;
}
```

- [ ] **Step 6: Verify**

Refresh the browser. Expected: tab bar appears in the top rail with MAP highlighted (cyan, underlined). Click MARKETS — map disappears, placeholder text shows. Click MAP — map returns. Side panel, timeline, metric strip still show on map view (we'll hide them in Task 3).

- [ ] **Step 7: Commit**

```
git add frontend/src/App.jsx frontend/src/map/TopRail.jsx frontend/src/styles.css
git commit -m "feat: add primary view tab bar with MAP/MARKETS/OUTAGES/PIPELINE"
```

---

## Task 3: Hide MAP-only chrome on non-map views

**Goal:** TimelineSlider, MetricStrip, OwnershipPanel, StakeholderTree only render when `activeView === "map"`.

**Files:**
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Gate map-only chrome behind `activeView === "map"`**

In `App.jsx`, wrap each map-only element. Replace the relevant block inside `<section className="map-stage">` and the sibling top-level renders so they read:

```jsx
{activeView === "map" && (
  <>
    <TimelineSlider activeYear={timelineYear} onChangeYear={setTimelineYear} />
    <MetricStrip
      stats={stats}
      status={status}
      error={error}
      replacementFuel={replacementFuel}
      setReplacementFuel={setReplacementFuel}
    />
  </>
)}
```

And outside `<section>`, wrap the `OwnershipPanel` and `StakeholderTree` renders:

```jsx
{activeView === "map" && (
  <OwnershipPanel
    plant={activeSelectedPlant}
    ownership={ownership}
    status={ownershipStatus}
    error={ownershipError}
    onClose={closePanel}
    onVisualizeTree={() => setShowTree(true)}
    replacementFuel={replacementFuel}
    timelineYear={timelineYear}
    onInspectCore={() => setShow3DOverlay(true)}
  />
)}

{activeView === "map" && showTree && activeSelectedPlant && ownership && (
  <StakeholderTree
    plant={activeSelectedPlant}
    ownership={ownership}
    onClose={() => setShowTree(false)}
  />
)}
```

Keep `TickerRail` **outside** any `activeView` gate — it stays persistent.

- [ ] **Step 2: Verify**

Refresh. On MAP: everything as before. On MARKETS/OUTAGES/PIPELINE: timeline slider gone, metric strip gone, side panel gone, ticker rail still scrolling at the bottom.

- [ ] **Step 3: Commit**

```
git add frontend/src/App.jsx
git commit -m "feat: hide map-only chrome on non-map views"
```

---

## Task 4: Build the MARKETS view

**Goal:** Switching to MARKETS shows the fuel-cycle panel (left) and equities watchlist (right), both with live-fluctuating numbers driven by `fluctuationFactor`.

**Files:**
- Create: `frontend/src/data/fuelCycleSeed.js`
- Create: `frontend/src/data/equitiesSeed.js`
- Create: `frontend/src/views/MarketsView.jsx`
- Modify: `frontend/src/App.jsx` (swap placeholder for real component)
- Modify: `frontend/src/styles.css` (append styles)

- [ ] **Step 1: Create `frontend/src/data/fuelCycleSeed.js`**

```jsx
// Seeded prices for the nuclear fuel cycle. Values are realistic 2026 ballparks.
// Replace with a real feed later; the API surface from this file is just an array of {id, label, unit, basePrice}.

export const FUEL_CYCLE = [
  { id: "u3o8",       label: "U₃O₈ Spot",      unit: "/lb",   basePrice: 80.50, dailyVolatility: 1.4 },
  { id: "conversion", label: "UF₆ Conversion", unit: "/kgU",  basePrice: 82.00, dailyVolatility: 0.9 },
  { id: "swu",        label: "SWU Enrichment", unit: "/SWU",  basePrice: 168.00, dailyVolatility: 2.1 }
];

// Deterministic pseudo-noise so the same tick produces the same price across re-renders.
function noise(seed, tick) {
  const x = Math.sin(seed * 12.9898 + tick * 0.731) * 43758.5453;
  return x - Math.floor(x);
}

export function priceAt(item, tick, seedOffset = 0) {
  const r = noise(item.basePrice + seedOffset, tick);
  const delta = (r - 0.5) * item.dailyVolatility;
  return Math.max(0.01, item.basePrice + delta);
}

// 30-tick sparkline series ending at the current tick.
export function sparkSeries(item, tick) {
  const out = [];
  for (let i = 29; i >= 0; i--) {
    out.push(priceAt(item, tick - i, i));
  }
  return out;
}
```

- [ ] **Step 2: Create `frontend/src/data/equitiesSeed.js`**

```jsx
// Nuclear-exposed public equities. companyKeys are matched (case-insensitive substring)
// against plant `parent_company_name` for the cross-view highlight feature.

export const EQUITIES = [
  { ticker: "CCJ",  name: "Cameco",                basePrice:  52.40, mktCapB:  22.8, companyKeys: ["cameco"] },
  { ticker: "LEU",  name: "Centrus Energy",        basePrice:  68.10, mktCapB:   1.0, companyKeys: ["centrus"] },
  { ticker: "BWXT", name: "BWX Technologies",      basePrice: 121.50, mktCapB:  11.1, companyKeys: ["bwx", "bwxt"] },
  { ticker: "NNE",  name: "Nano Nuclear Energy",   basePrice:  28.90, mktCapB:   0.8, companyKeys: ["nano nuclear"] },
  { ticker: "OKLO", name: "Oklo Inc.",             basePrice:  85.20, mktCapB:  12.4, companyKeys: ["oklo"] },
  { ticker: "SMR",  name: "NuScale Power",         basePrice:  31.40, mktCapB:   8.6, companyKeys: ["nuscale"] },
  { ticker: "GEV",  name: "GE Vernova",            basePrice: 412.00, mktCapB: 113.2, companyKeys: ["ge vernova", "ge hitachi"] },
  { ticker: "CEG",  name: "Constellation Energy",  basePrice: 268.50, mktCapB:  84.6, companyKeys: ["constellation"] },
  { ticker: "VST",  name: "Vistra Corp.",          basePrice: 142.80, mktCapB:  48.1, companyKeys: ["vistra"] },
  { ticker: "TLN",  name: "Talen Energy",          basePrice: 198.30, mktCapB:   9.7, companyKeys: ["talen"] },
  { ticker: "D",    name: "Dominion Energy",       basePrice:  58.20, mktCapB:  49.0, companyKeys: ["dominion"] },
  { ticker: "DUK",  name: "Duke Energy",           basePrice: 117.40, mktCapB:  90.5, companyKeys: ["duke"] }
];

function noise(seed, tick) {
  const x = Math.sin(seed * 78.233 + tick * 0.911) * 43758.5453;
  return x - Math.floor(x);
}

export function quoteAt(eq, tick) {
  const r = noise(eq.basePrice, tick);
  const drift = (r - 0.5) * (eq.basePrice * 0.012); // ~±0.6% per tick
  const price = Math.max(0.01, eq.basePrice + drift);
  const dayOpen = eq.basePrice + (noise(eq.basePrice + 7, Math.floor(tick / 50)) - 0.5) * (eq.basePrice * 0.02);
  const delta = price - dayOpen;
  const deltaPct = (delta / dayOpen) * 100;
  return { price, delta, deltaPct };
}

export function sparkSeries(eq, tick) {
  const out = [];
  for (let i = 29; i >= 0; i--) {
    out.push(quoteAt(eq, tick - i).price);
  }
  return out;
}

// Find plants in animatedPlants whose parent_company_name matches one of an equity's companyKeys.
// Used by the MARKETS row-click → MAP highlight feature.
export function plantsForEquity(eq, plantFeatures) {
  if (!plantFeatures) return [];
  return plantFeatures.filter((feature) => {
    const name = (feature?.properties?.parent_company_name || "").toLowerCase();
    return eq.companyKeys.some((k) => name.includes(k.toLowerCase()));
  });
}
```

- [ ] **Step 3: Create `frontend/src/views/MarketsView.jsx`**

```jsx
import { TrendingUp, TrendingDown } from "lucide-react";
import { FUEL_CYCLE, priceAt, sparkSeries as fuelSpark } from "../data/fuelCycleSeed";
import { EQUITIES, quoteAt, sparkSeries as equitySpark } from "../data/equitiesSeed";

function Sparkline({ values, width = 80, height = 22, color = "#22d3ee" }) {
  if (!values || values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = width / (values.length - 1);
  const points = values
    .map((v, i) => `${(i * step).toFixed(1)},${(height - ((v - min) / range) * height).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={width} height={height} className="sparkline" aria-hidden="true">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.4" />
    </svg>
  );
}

function fmt(n, digits = 2) {
  return Number(n).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export default function MarketsView({ plants, tick, onHighlightTicker }) {
  return (
    <div className="markets-view">
      <div className="markets-fuel-col">
        <h2 className="markets-section-title">Fuel Cycle</h2>
        {FUEL_CYCLE.map((item) => {
          const price = priceAt(item, tick);
          const prev  = priceAt(item, tick - 30);
          const delta = price - prev;
          const deltaPct = (delta / prev) * 100;
          const up = delta >= 0;
          return (
            <div key={item.id} className="fuel-card">
              <div className="fuel-card-head">
                <span className="fuel-label">{item.label}</span>
                <span className={`fuel-delta ${up ? "up" : "down"}`}>
                  {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {up ? "+" : ""}{fmt(deltaPct, 2)}%
                </span>
              </div>
              <div className="fuel-card-price">
                <span className="fuel-price">${fmt(price)}</span>
                <span className="fuel-unit">{item.unit}</span>
              </div>
              <Sparkline values={fuelSpark(item, tick)} width={220} height={36} color={up ? "#22d3ee" : "#f87171"} />
            </div>
          );
        })}
      </div>

      <div className="markets-equities-col">
        <h2 className="markets-section-title">Nuclear Equities</h2>
        <table className="equities-table">
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Name</th>
              <th className="num">Price</th>
              <th className="num">Δ</th>
              <th className="num">Δ%</th>
              <th>Chart</th>
              <th className="num">Mkt Cap</th>
            </tr>
          </thead>
          <tbody>
            {EQUITIES.map((eq) => {
              const q = quoteAt(eq, tick);
              const up = q.delta >= 0;
              return (
                <tr key={eq.ticker} onClick={() => onHighlightTicker && onHighlightTicker(eq.ticker)}>
                  <td className="ticker-cell">{eq.ticker}</td>
                  <td className="name-cell">{eq.name}</td>
                  <td className="num">${fmt(q.price)}</td>
                  <td className={`num ${up ? "up" : "down"}`}>{up ? "+" : ""}{fmt(q.delta)}</td>
                  <td className={`num ${up ? "up" : "down"}`}>{up ? "+" : ""}{fmt(q.deltaPct)}%</td>
                  <td><Sparkline values={equitySpark(eq, tick)} color={up ? "#22d3ee" : "#f87171"} /></td>
                  <td className="num">${fmt(eq.mktCapB, 1)}B</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="markets-footnote">Click a row to highlight that company's plants on MAP.</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire `MarketsView` into `App.jsx`**

Add at the top of `App.jsx`:
```jsx
import MarketsView from "./views/MarketsView";
```

Add a new state:
```jsx
const [highlightTicker, setHighlightTicker] = useState(null);
```

Replace the `MARKETS` placeholder line with:
```jsx
{activeView === "markets" && (
  <MarketsView
    plants={animatedPlants.features}
    tick={fluctuationFactor}
    onHighlightTicker={setHighlightTicker}
  />
)}
```

(Don't worry about `highlightTicker` consumption on MAP yet — that's Task 10.)

- [ ] **Step 5: Append MARKETS styles**

Append to `frontend/src/styles.css`:

```css
/* === MARKETS view === */
.markets-view {
  position: absolute;
  inset: 80px 24px 60px 24px;
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 20px;
  color: #e2e8f0;
  font-family: ui-monospace, SFMono-Regular, monospace;
  overflow: hidden;
}
.markets-section-title {
  font-size: 11px;
  letter-spacing: 0.18em;
  color: rgba(226, 232, 240, 0.55);
  margin: 0 0 12px 0;
  text-transform: uppercase;
}
.markets-fuel-col { display: flex; flex-direction: column; gap: 12px; }
.fuel-card {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(34, 211, 238, 0.15);
  border-radius: 8px;
  padding: 12px 14px;
}
.fuel-card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.fuel-label { font-size: 11px; letter-spacing: 0.1em; color: rgba(226, 232, 240, 0.75); }
.fuel-delta { font-size: 11px; display: flex; align-items: center; gap: 3px; }
.fuel-delta.up { color: #22d3ee; }
.fuel-delta.down { color: #f87171; }
.fuel-card-price { display: flex; align-items: baseline; gap: 6px; margin-bottom: 8px; }
.fuel-price { font-size: 22px; font-weight: 600; }
.fuel-unit { font-size: 11px; color: rgba(226, 232, 240, 0.5); }

.markets-equities-col { display: flex; flex-direction: column; min-height: 0; }
.equities-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(34, 211, 238, 0.12);
  border-radius: 8px;
  overflow: hidden;
}
.equities-table thead { background: rgba(15, 23, 42, 0.85); }
.equities-table th {
  text-align: left;
  padding: 8px 10px;
  font-size: 10px;
  letter-spacing: 0.12em;
  color: rgba(226, 232, 240, 0.6);
  text-transform: uppercase;
  font-weight: 600;
}
.equities-table th.num, .equities-table td.num { text-align: right; }
.equities-table td { padding: 8px 10px; border-top: 1px solid rgba(255, 255, 255, 0.04); }
.equities-table tbody tr { cursor: pointer; transition: background 80ms ease; }
.equities-table tbody tr:hover { background: rgba(34, 211, 238, 0.06); }
.equities-table .ticker-cell { font-weight: 700; color: #22d3ee; letter-spacing: 0.05em; }
.equities-table .name-cell { color: rgba(226, 232, 240, 0.85); }
.equities-table .up { color: #22d3ee; }
.equities-table .down { color: #f87171; }
.markets-footnote { font-size: 10.5px; color: rgba(226, 232, 240, 0.4); margin: 8px 4px 0; letter-spacing: 0.04em; }
.sparkline { display: block; }
```

- [ ] **Step 6: Verify**

Refresh. Click MARKETS. Expected:
- Left column: 3 fuel-cycle cards with prices, percent change, sparklines.
- Right column: equities table with 12 rows. Numbers tick / fluctuate every 4s (matches existing fluctuation interval).
- Hovering a row highlights it; clicking does nothing visible yet (handler runs but no consumer until Task 10).

- [ ] **Step 7: Commit**

```
git add frontend/src/data/fuelCycleSeed.js frontend/src/data/equitiesSeed.js frontend/src/views/MarketsView.jsx frontend/src/App.jsx frontend/src/styles.css
git commit -m "feat: add MARKETS view with fuel cycle + equities watchlist"
```

---

## Task 5: Build the OUTAGES view

**Goal:** Switching to OUTAGES shows a KPI rollup and a Gantt of refueling outages derived from the existing deterministic rule.

**Files:**
- Create: `frontend/src/views/OutagesView.jsx`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: Create `frontend/src/views/OutagesView.jsx`**

```jsx
import { useMemo } from "react";
import { Zap, AlertCircle, Calendar, Activity } from "lucide-react";

// Mirrors the rule in App.jsx animatedPlants: refueling when (plantId + year) % 13 === 0.
// We project that across ±90 days by sweeping a synthetic "day" index that maps into the same modulus.
const HORIZON_DAYS = 90;

function outagesForPlant(plant, year) {
  // Each plant gets at most one ~30-day refueling window per simulated year.
  // We seed the start day deterministically from plant id + year.
  const id = plant?.properties?.id || 0;
  const triggered = (id + year) % 13 === 0;
  if (!triggered) return null;
  const seed = Math.sin(id * 17.17 + year * 3.7) * 43758.5453;
  const r = seed - Math.floor(seed);
  const startOffset = Math.floor(r * (HORIZON_DAYS * 2)) - HORIZON_DAYS; // -90..+90
  const duration = 22 + Math.floor(r * 14); // 22..36 days
  return { startOffset, duration, type: "refueling" };
}

export default function OutagesView({ plants, year, onSelectPlant, onSwitchView }) {
  const rows = useMemo(() => {
    return plants
      .map((p) => ({ plant: p, outage: outagesForPlant(p, year) }))
      .filter((row) => row.outage)
      .sort((a, b) => a.outage.startOffset - b.outage.startOffset);
  }, [plants, year]);

  const downNow = rows.filter((r) => r.outage.startOffset <= 0 && r.outage.startOffset + r.outage.duration >= 0);
  const mwDown = downNow.reduce((s, r) => s + (Number(r.plant.properties?.total_mw_capacity) || 0), 0);
  const totalMw = plants.reduce((s, p) => s + (Number(p.properties?.total_mw_capacity) || 0), 0);
  const pctOffline = totalMw > 0 ? (mwDown / totalMw) * 100 : 0;
  const nextReturn = downNow
    .map((r) => r.outage.startOffset + r.outage.duration)
    .sort((a, b) => a - b)[0];

  const trackWidth = HORIZON_DAYS * 2; // -90..+90

  return (
    <div className="outages-view">
      <div className="outages-kpis">
        <div className="kpi-card">
          <div className="kpi-top"><Zap size={14} /><span>MW On Outage</span></div>
          <strong>{mwDown.toLocaleString("en-US", { maximumFractionDigits: 0 })} MW</strong>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><AlertCircle size={14} /><span>Units Down</span></div>
          <strong>{downNow.length}</strong>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><Activity size={14} /><span>% Fleet Offline</span></div>
          <strong>{pctOffline.toFixed(1)}%</strong>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><Calendar size={14} /><span>Next Return</span></div>
          <strong>{nextReturn !== undefined ? `T+${nextReturn}d` : "—"}</strong>
        </div>
      </div>

      <div className="gantt-wrap">
        <div className="gantt-ruler">
          {[-90, -60, -30, 0, 30, 60, 90].map((d) => (
            <span key={d} className={`ruler-tick ${d === 0 ? "today" : ""}`} style={{ left: `${((d + HORIZON_DAYS) / trackWidth) * 100}%` }}>
              {d === 0 ? "TODAY" : `${d > 0 ? "+" : ""}${d}d`}
            </span>
          ))}
        </div>
        <div className="gantt-rows">
          {rows.length === 0 && (
            <div className="gantt-empty">No outages scheduled in the ±90d window for year {year}.</div>
          )}
          {rows.map(({ plant, outage }) => {
            const left = ((outage.startOffset + HORIZON_DAYS) / trackWidth) * 100;
            const width = (outage.duration / trackWidth) * 100;
            return (
              <div
                key={plant.properties.id}
                className="gantt-row"
                onClick={() => {
                  onSelectPlant(plant);
                  onSwitchView("map");
                }}
                title={`${plant.properties.plant_name} — ${outage.duration}d refueling outage`}
              >
                <span className="gantt-row-label">{plant.properties.plant_name}</span>
                <div className="gantt-track">
                  <span
                    className={`gantt-bar gantt-bar-${outage.type}`}
                    style={{ left: `${left}%`, width: `${width}%` }}
                  />
                  <span className="gantt-today-line" style={{ left: `${(HORIZON_DAYS / trackWidth) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire into `App.jsx`**

Add at top:
```jsx
import OutagesView from "./views/OutagesView";
```

Replace the OUTAGES placeholder with:
```jsx
{activeView === "outages" && (
  <OutagesView
    plants={animatedPlants.features}
    year={timelineYear}
    onSelectPlant={selectPlant}
    onSwitchView={setActiveView}
  />
)}
```

- [ ] **Step 3: Append OUTAGES styles**

Append to `styles.css`:

```css
/* === OUTAGES view === */
.outages-view {
  position: absolute;
  inset: 80px 24px 60px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  color: #e2e8f0;
  font-family: ui-monospace, SFMono-Regular, monospace;
}
.outages-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.kpi-card {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(34, 211, 238, 0.15);
  border-radius: 8px;
  padding: 12px 14px;
}
.kpi-top { display: flex; align-items: center; gap: 6px; font-size: 10.5px; color: rgba(226, 232, 240, 0.6); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 6px; }
.kpi-card strong { font-size: 20px; font-weight: 600; color: #22d3ee; }

.gantt-wrap {
  flex: 1;
  background: rgba(15, 23, 42, 0.45);
  border: 1px solid rgba(34, 211, 238, 0.12);
  border-radius: 8px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.gantt-ruler { position: relative; height: 18px; margin-left: 180px; border-bottom: 1px solid rgba(255,255,255,0.06); margin-bottom: 6px; }
.ruler-tick { position: absolute; transform: translateX(-50%); font-size: 10px; color: rgba(226, 232, 240, 0.5); letter-spacing: 0.05em; }
.ruler-tick.today { color: #fbbf24; font-weight: 700; }
.gantt-rows { flex: 1; overflow-y: auto; }
.gantt-row { display: grid; grid-template-columns: 180px 1fr; align-items: center; gap: 8px; height: 26px; cursor: pointer; border-radius: 4px; padding: 0 4px; }
.gantt-row:hover { background: rgba(34, 211, 238, 0.06); }
.gantt-row-label { font-size: 11px; color: rgba(226, 232, 240, 0.85); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.gantt-track { position: relative; height: 14px; background: rgba(255, 255, 255, 0.03); border-radius: 3px; }
.gantt-bar { position: absolute; top: 0; bottom: 0; border-radius: 3px; }
.gantt-bar-refueling { background: rgba(34, 211, 238, 0.45); border: 1px solid rgba(34, 211, 238, 0.7); }
.gantt-today-line { position: absolute; top: -2px; bottom: -2px; width: 1px; background: #fbbf24; box-shadow: 0 0 4px rgba(251, 191, 36, 0.6); }
.gantt-empty { text-align: center; color: rgba(226, 232, 240, 0.4); padding: 40px; font-size: 12px; }
```

- [ ] **Step 4: Verify**

Refresh. Click OUTAGES. Expected:
- KPI strip with MW on outage, units down, % fleet offline, next return.
- Gantt with rows for plants currently scheduled for refueling within ±90d. Yellow "today" line in the middle.
- Click a row → jumps to MAP with that plant selected.
- Drag year slider away from 2026 on MAP, switch back to OUTAGES — rows change (different plants triggered by the modulus shift).

- [ ] **Step 5: Commit**

```
git add frontend/src/views/OutagesView.jsx frontend/src/App.jsx frontend/src/styles.css
git commit -m "feat: add OUTAGES view with refueling Gantt and fleet KPIs"
```

---

## Task 6: Build the PIPELINE view

**Goal:** Switching to PIPELINE shows a Kanban of SMR projects sourced from `smr_sites.json`, grouped by phase, with vendor / reactor-type filters.

**Files:**
- Create: `frontend/src/views/PipelineView.jsx`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: Inspect `smr_sites.json` to confirm the `phase` values**

Open `frontend/src/data/smr_sites.json` and note the distinct values of `phase` (e.g., `nrc_engaged`, etc.). The view will define a fixed ordered list of columns and bucket each project into one of them; any unrecognized phase falls into "Other".

- [ ] **Step 2: Create `frontend/src/views/PipelineView.jsx`**

```jsx
import { useMemo, useState } from "react";
import smrSites from "../data/smr_sites.json";

// Ordered columns. Map any raw `phase` strings encountered in smr_sites.json to one of these.
const PHASES = [
  { id: "announced",   label: "Announced" },
  { id: "site_permit", label: "Site Permit" },
  { id: "licensed",    label: "Licensed" },
  { id: "construction", label: "Under Construction" },
  { id: "operating",   label: "Operating" },
  { id: "other",       label: "Other" }
];

// Heuristic mapping of raw phase strings → column id. Add cases as new phases appear in the data.
function bucketPhase(raw) {
  const p = (raw || "").toLowerCase();
  if (p.includes("operat")) return "operating";
  if (p.includes("constr")) return "construction";
  if (p.includes("licens")) return "licensed";
  if (p.includes("permit") || p.includes("nrc_engaged") || p.includes("docket")) return "site_permit";
  if (p.includes("announce") || p.includes("planned") || p.includes("propos")) return "announced";
  return "other";
}

function reactorFamily(model) {
  const m = (model || "").toUpperCase();
  if (m.includes("BWR") || m.includes("PWR") || m.includes("AP")) return "LWR";
  if (m.includes("XE") || m.includes("HTGR")) return "HTGR";
  if (m.includes("MSR") || m.includes("KP")) return "MSR";
  if (m.includes("AURORA") || m.includes("SFR") || m.includes("NATRIUM")) return "SFR";
  return "Other";
}

export default function PipelineView() {
  const [vendorFilter, setVendorFilter] = useState("ALL");
  const [familyFilter, setFamilyFilter] = useState("ALL");

  const vendors = useMemo(() => {
    const set = new Set(smrSites.map((s) => s.vendor).filter(Boolean));
    return ["ALL", ...Array.from(set).sort()];
  }, []);

  const families = ["ALL", "LWR", "HTGR", "MSR", "SFR", "Other"];

  const filtered = useMemo(() => {
    return smrSites.filter((s) => {
      if (vendorFilter !== "ALL" && s.vendor !== vendorFilter) return false;
      if (familyFilter !== "ALL" && reactorFamily(s.reactor_model) !== familyFilter) return false;
      return true;
    });
  }, [vendorFilter, familyFilter]);

  const byPhase = useMemo(() => {
    const buckets = Object.fromEntries(PHASES.map((p) => [p.id, []]));
    filtered.forEach((s) => buckets[bucketPhase(s.phase)].push(s));
    return buckets;
  }, [filtered]);

  return (
    <div className="pipeline-view">
      <div className="pipeline-filters">
        <label>
          <span>Vendor</span>
          <select value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)}>
            {vendors.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
        <label>
          <span>Reactor Type</span>
          <select value={familyFilter} onChange={(e) => setFamilyFilter(e.target.value)}>
            {families.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
        <span className="pipeline-count">{filtered.length} projects</span>
      </div>

      <div className="pipeline-board">
        {PHASES.map((phase) => (
          <div key={phase.id} className="pipeline-col">
            <div className="pipeline-col-head">
              <span>{phase.label}</span>
              <span className="pipeline-col-count">{byPhase[phase.id].length}</span>
            </div>
            <div className="pipeline-col-body">
              {byPhase[phase.id].map((site) => (
                <article key={site.site_id} className="pipeline-card">
                  <h3>{site.site_name}</h3>
                  <div className="pipeline-card-row"><span>Vendor</span><strong>{site.vendor || "—"}</strong></div>
                  <div className="pipeline-card-row"><span>Model</span><strong>{site.reactor_model || "—"}</strong></div>
                  <div className="pipeline-card-row"><span>MWe</span><strong>{site.capacity_mwe_total ? site.capacity_mwe_total.toLocaleString() : "—"}</strong></div>
                  <div className="pipeline-card-row"><span>COD</span><strong>{site.target_cod || "—"}</strong></div>
                  <div className="pipeline-card-row"><span>Host</span><strong>{site.owner || "—"} ({site.state})</strong></div>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire into `App.jsx`**

```jsx
import PipelineView from "./views/PipelineView";
```

Replace the PIPELINE placeholder with:
```jsx
{activeView === "pipeline" && <PipelineView />}
```

- [ ] **Step 4: Append PIPELINE styles**

```css
/* === PIPELINE view === */
.pipeline-view {
  position: absolute;
  inset: 80px 24px 60px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  color: #e2e8f0;
  font-family: ui-monospace, SFMono-Regular, monospace;
  min-height: 0;
}
.pipeline-filters { display: flex; gap: 16px; align-items: center; }
.pipeline-filters label { display: flex; align-items: center; gap: 6px; font-size: 10.5px; letter-spacing: 0.1em; color: rgba(226, 232, 240, 0.6); text-transform: uppercase; }
.pipeline-filters select {
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(34, 211, 238, 0.25);
  color: #e2e8f0;
  border-radius: 4px;
  padding: 4px 6px;
  font-family: inherit;
  font-size: 11px;
}
.pipeline-count { margin-left: auto; font-size: 11px; color: rgba(226, 232, 240, 0.6); }

.pipeline-board {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
  overflow-x: auto;
  min-height: 0;
}
.pipeline-col { display: flex; flex-direction: column; min-width: 200px; background: rgba(15, 23, 42, 0.45); border: 1px solid rgba(34, 211, 238, 0.1); border-radius: 8px; padding: 10px; min-height: 0; }
.pipeline-col-head { display: flex; justify-content: space-between; font-size: 11px; letter-spacing: 0.1em; color: rgba(226, 232, 240, 0.7); text-transform: uppercase; margin-bottom: 8px; }
.pipeline-col-count { color: #22d3ee; }
.pipeline-col-body { display: flex; flex-direction: column; gap: 8px; overflow-y: auto; flex: 1; }
.pipeline-card { background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(34, 211, 238, 0.18); border-radius: 6px; padding: 10px; }
.pipeline-card h3 { margin: 0 0 8px 0; font-size: 12px; color: #e2e8f0; font-weight: 600; letter-spacing: 0.02em; }
.pipeline-card-row { display: flex; justify-content: space-between; font-size: 10.5px; padding: 2px 0; }
.pipeline-card-row span { color: rgba(226, 232, 240, 0.5); }
.pipeline-card-row strong { color: rgba(226, 232, 240, 0.95); font-weight: 500; }
```

- [ ] **Step 5: Verify**

Refresh. Click PIPELINE. Expected:
- Filter row with Vendor + Reactor Type dropdowns + project count.
- 6 columns showing SMR projects bucketed by phase.
- Cards show name, vendor, model, MWe, COD, host.
- Changing dropdowns filters the cards.

- [ ] **Step 6: Commit**

```
git add frontend/src/views/PipelineView.jsx frontend/src/App.jsx frontend/src/styles.css
git commit -m "feat: add PIPELINE view with SMR Kanban tracker"
```

---

## Task 7: Add chip cluster, `overlay` state, and relocate Archives

**Goal:** Floating top-right chip cluster with NEWS, CMD, ARCHIVES. Each toggles `overlay`. Archives now opens from the chip instead of the top rail.

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/map/TopRail.jsx` (remove Archives button)
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: Add `overlay` state to `App.jsx`**

```jsx
const [overlay, setOverlay] = useState(null); // null | "news" | "cmd" | "archives"
```

Remove the old `showHistory` state and any code that uses it (`setShowHistory`, the existing `{showHistory && <NuclearHistory ... />}` render). The chip cluster + overlay state replaces it.

- [ ] **Step 2: Render chip cluster from `App.jsx`**

Add the icons import (extend the existing `lucide-react` import line in `App.jsx`):
```jsx
import { /* existing icons */, Newspaper, Command, Archive } from "lucide-react";
```

Inside the `<main className="app-shell">` (after the closing `</section>` of `map-stage`), add:

```jsx
<div className="chip-cluster" role="toolbar" aria-label="Utility actions">
  <button className="util-chip" onClick={() => setOverlay(overlay === "news" ? null : "news")} title="News feed">
    <Newspaper size={14} /><span>NEWS</span>
  </button>
  <button className="util-chip" onClick={() => setOverlay(overlay === "cmd" ? null : "cmd")} title="Command palette (⌘K)">
    <Command size={14} /><span>CMD</span><kbd className="chip-kbd">⌘K</kbd>
  </button>
  <button className="util-chip" onClick={() => setOverlay(overlay === "archives" ? null : "archives")} title="Archives">
    <Archive size={14} /><span>ARCH</span>
  </button>
</div>

{overlay === "archives" && <NuclearHistory onClose={() => setOverlay(null)} />}
```

(NewsOverlay and CommandPalette renders come in Tasks 8 and 9 — for now those chips toggle state but show nothing.)

- [ ] **Step 3: Remove the Archives button from `TopRail.jsx`**

Delete the `<button className="top-rail-archives-btn" ...>` block from `frontend/src/map/TopRail.jsx`. Remove `BookOpen` from its `lucide-react` import. Remove the `onShowHistory` prop from the function signature.

In `App.jsx`, remove the `onShowHistory={...}` prop from the `<TopRail .../>` JSX.

- [ ] **Step 4: Append chip styles**

```css
/* === Utility chip cluster === */
.chip-cluster {
  position: fixed;
  top: 14px;
  right: 18px;
  display: flex;
  gap: 6px;
  z-index: 60;
}
.util-chip {
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(34, 211, 238, 0.25);
  color: rgba(226, 232, 240, 0.9);
  border-radius: 4px;
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  padding: 6px 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: border-color 120ms, color 120ms;
}
.util-chip:hover { border-color: rgba(34, 211, 238, 0.6); color: #22d3ee; }
.chip-kbd {
  background: rgba(34, 211, 238, 0.12);
  border: 1px solid rgba(34, 211, 238, 0.3);
  color: #22d3ee;
  border-radius: 3px;
  font-size: 9px;
  padding: 1px 4px;
  margin-left: 2px;
  letter-spacing: 0.05em;
}
```

- [ ] **Step 5: Verify**

Refresh. Expected:
- Top-right floating cluster: NEWS / CMD ⌘K / ARCH chips.
- Old "Archives" button is gone from the top rail.
- Clicking ARCH opens the existing Nuclear History modal; closing returns to whatever view was active.
- Clicking NEWS / CMD toggles state but renders nothing visible yet.

- [ ] **Step 6: Commit**

```
git add frontend/src/App.jsx frontend/src/map/TopRail.jsx frontend/src/styles.css
git commit -m "feat: add utility chip cluster and relocate Archives"
```

---

## Task 8: Build the NEWS overlay

**Goal:** Clicking NEWS chip opens a right-side slide-in panel with ~40 curated synthetic headlines, topic filter chips, and timestamp/source metadata.

**Files:**
- Create: `frontend/src/data/newsSeed.js`
- Create: `frontend/src/overlays/NewsOverlay.jsx`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: Create `frontend/src/data/newsSeed.js`**

```jsx
// Curated synthetic headlines. minutesAgo is interpreted relative to "now" each render.
// topic is one of: FUEL | REGULATORY | M&A | SMR | OUTAGE | MACRO
// tickers (optional) deep-link into MARKETS in a follow-up.
export const NEWS = [
  { id: 1,  minutesAgo:   3, source: "Reuters",   topic: "FUEL",       headline: "Uranium spot edges to $80.50/lb as Cameco buyers return to market", tickers: ["CCJ"] },
  { id: 2,  minutesAgo:   8, source: "NRC",       topic: "REGULATORY", headline: "NRC issues final EIS for Clinch River BWRX-300 site permit",        tickers: [] },
  { id: 3,  minutesAgo:  17, source: "Bloomberg", topic: "M&A",        headline: "Microsoft signs 20-year PPA to restart Three Mile Island Unit 1",   tickers: ["CEG"] },
  { id: 4,  minutesAgo:  22, source: "WNN",       topic: "SMR",        headline: "X-energy completes pre-application meeting for Dow Seadrift",      tickers: [] },
  { id: 5,  minutesAgo:  28, source: "Company",   topic: "OUTAGE",     headline: "Vogtle Unit 3 enters scheduled refueling outage; 24-day window",   tickers: ["CEG"] },
  { id: 6,  minutesAgo:  41, source: "Reuters",   topic: "MACRO",      headline: "EU adds nuclear to strategic technologies list; financing path widens", tickers: [] },
  { id: 7,  minutesAgo:  55, source: "Bloomberg", topic: "M&A",        headline: "Amazon reportedly close to second SMR offtake deal with X-energy",  tickers: [] },
  { id: 8,  minutesAgo:  68, source: "NRC",       topic: "REGULATORY", headline: "NRC orders supplemental inspections at two PWR sites after EDG findings", tickers: [] },
  { id: 9,  minutesAgo:  82, source: "WNN",       topic: "FUEL",       headline: "SWU enrichment prices firm at $168/SWU as Centrus HALEU shipments scale", tickers: ["LEU"] },
  { id: 10, minutesAgo:  95, source: "Reuters",   topic: "M&A",        headline: "Constellation guidance raised on data-center contracted load growth", tickers: ["CEG"] },
  { id: 11, minutesAgo: 110, source: "Company",   topic: "SMR",        headline: "NuScale wins TVA technical-services contract for Clinch River support", tickers: ["SMR"] },
  { id: 12, minutesAgo: 125, source: "Bloomberg", topic: "MACRO",      headline: "DOE accelerates HALEU strategic reserve; first deliveries Q3",      tickers: [] },
  { id: 13, minutesAgo: 140, source: "NRC",       topic: "REGULATORY", headline: "Diablo Canyon Unit 2 license extension to 2030 granted",            tickers: [] },
  { id: 14, minutesAgo: 158, source: "Reuters",   topic: "OUTAGE",     headline: "Palo Verde Unit 1 returns to grid following 28-day refueling outage", tickers: [] },
  { id: 15, minutesAgo: 173, source: "WNN",       topic: "SMR",        headline: "Kairos Power completes Hermes test reactor first concrete pour",    tickers: [] },
  { id: 16, minutesAgo: 188, source: "Company",   topic: "M&A",        headline: "Talen Energy expands Susquehanna data-center campus offtake",       tickers: ["TLN"] },
  { id: 17, minutesAgo: 205, source: "Bloomberg", topic: "FUEL",       headline: "Conversion services tight; UF6 spot moves +1.8% on Russian sanctions overhang", tickers: [] },
  { id: 18, minutesAgo: 220, source: "NRC",       topic: "REGULATORY", headline: "GE Hitachi BWRX-300 standard design certification application accepted for review", tickers: ["GEV"] },
  { id: 19, minutesAgo: 238, source: "Reuters",   topic: "MACRO",      headline: "France's EDF places order for six EPR2 reactors with completion 2035-42", tickers: [] },
  { id: 20, minutesAgo: 256, source: "WNN",       topic: "SMR",        headline: "Oklo selected for DOE Idaho National Lab Aurora demonstration site",  tickers: ["OKLO"] },
  { id: 21, minutesAgo: 280, source: "Company",   topic: "OUTAGE",     headline: "Browns Ferry Unit 2 trip triggers ISO-led grid-frequency assessment", tickers: [] },
  { id: 22, minutesAgo: 304, source: "Bloomberg", topic: "M&A",        headline: "Google signs first PPA with Kairos Power for SMR-sourced electricity", tickers: [] },
  { id: 23, minutesAgo: 330, source: "Reuters",   topic: "FUEL",       headline: "Kazatomprom guides 2026 production down 4%; spot reacts +$1.20/lb",  tickers: [] },
  { id: 24, minutesAgo: 360, source: "NRC",       topic: "REGULATORY", headline: "NRC publishes draft Part 53 framework for advanced reactors",       tickers: [] },
  { id: 25, minutesAgo: 395, source: "WNN",       topic: "MACRO",      headline: "Japan restarts Onagawa Unit 2 after 13-year shutdown",              tickers: [] },
  { id: 26, minutesAgo: 430, source: "Company",   topic: "SMR",        headline: "Holtec SMR-300 secures $500M DOE loan guarantee for Palisades pair", tickers: [] },
  { id: 27, minutesAgo: 470, source: "Bloomberg", topic: "M&A",        headline: "Vistra raises Comanche Peak capacity factor target to 95% for 2026", tickers: ["VST"] },
  { id: 28, minutesAgo: 510, source: "Reuters",   topic: "OUTAGE",     headline: "Dominion's North Anna Unit 1 to extend refueling by 6 days; pump seal", tickers: ["D"] },
  { id: 29, minutesAgo: 555, source: "NRC",       topic: "REGULATORY", headline: "NRC clarifies guidance on micro-reactor emergency planning zones",  tickers: [] },
  { id: 30, minutesAgo: 600, source: "WNN",       topic: "FUEL",       headline: "Westinghouse opens new fuel-fabrication line for AP1000 reload cycle", tickers: [] },
  { id: 31, minutesAgo: 660, source: "Company",   topic: "SMR",        headline: "TVA selects EPC partner for Clinch River BWRX-300 site preparation", tickers: [] },
  { id: 32, minutesAgo: 720, source: "Bloomberg", topic: "MACRO",      headline: "South Korea restarts construction on Shin-Hanul Units 3 and 4",     tickers: [] },
  { id: 33, minutesAgo: 800, source: "Reuters",   topic: "M&A",        headline: "BWXT awarded $200M contract for naval reactor components",          tickers: ["BWXT"] },
  { id: 34, minutesAgo: 890, source: "NRC",       topic: "REGULATORY", headline: "NRC inspector finds no safety significance in V.C. Summer event",   tickers: [] },
  { id: 35, minutesAgo: 980, source: "WNN",       topic: "SMR",        headline: "Romania's RoPower NuScale project advances to engineering Phase 2", tickers: ["SMR"] },
  { id: 36, minutesAgo: 1080, source: "Company",  topic: "MACRO",      headline: "Duke Energy files updated IRP including 1.6 GW of new nuclear by 2035", tickers: ["DUK"] },
  { id: 37, minutesAgo: 1180, source: "Bloomberg", topic: "FUEL",      headline: "Nano Nuclear acquires HALEU production startup; vertically integrating", tickers: ["NNE"] },
  { id: 38, minutesAgo: 1300, source: "Reuters",  topic: "OUTAGE",     headline: "Byron Unit 2 returns from refueling 3 days ahead of schedule",       tickers: [] },
  { id: 39, minutesAgo: 1450, source: "NRC",      topic: "REGULATORY", headline: "NRC chairman testifies on permitting reform before Senate ENR",      tickers: [] },
  { id: 40, minutesAgo: 1600, source: "WNN",      topic: "MACRO",      headline: "IAEA flags need for $125B in fuel-cycle investment to meet 2050 targets", tickers: [] }
];

export const TOPICS = ["ALL", "FUEL", "REGULATORY", "M&A", "SMR", "OUTAGE", "MACRO"];

export function formatAgo(min) {
  if (min < 60) return `${min}m ago`;
  if (min < 1440) return `${Math.floor(min / 60)}h ago`;
  return `${Math.floor(min / 1440)}d ago`;
}
```

- [ ] **Step 2: Create `frontend/src/overlays/NewsOverlay.jsx`**

```jsx
import { useState } from "react";
import { X } from "lucide-react";
import { NEWS, TOPICS, formatAgo } from "../data/newsSeed";

export default function NewsOverlay({ onClose }) {
  const [topic, setTopic] = useState("ALL");

  const items = topic === "ALL" ? NEWS : NEWS.filter((n) => n.topic === topic);

  return (
    <aside className="news-overlay" role="dialog" aria-label="News feed">
      <header className="news-header">
        <h2>NEWS</h2>
        <button className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button>
      </header>
      <div className="news-topic-row">
        {TOPICS.map((t) => (
          <button
            key={t}
            className={`news-topic-chip ${topic === t ? "active" : ""}`}
            onClick={() => setTopic(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <ul className="news-list">
        {items.map((n) => (
          <li key={n.id} className="news-item">
            <div className="news-meta">
              <span className="news-time">{formatAgo(n.minutesAgo)}</span>
              <span className="news-source">{n.source}</span>
              <span className={`news-topic-tag topic-${n.topic.toLowerCase().replace(/[^a-z]/g, "")}`}>{n.topic}</span>
            </div>
            <p className="news-headline">{n.headline}</p>
            {n.tickers.length > 0 && (
              <div className="news-tickers">
                {n.tickers.map((tk) => <span key={tk} className="news-ticker-chip">{tk}</span>)}
              </div>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}
```

- [ ] **Step 3: Render `NewsOverlay` from `App.jsx`**

```jsx
import NewsOverlay from "./overlays/NewsOverlay";
```

Below the existing overlay renders, add:
```jsx
{overlay === "news" && <NewsOverlay onClose={() => setOverlay(null)} />}
```

- [ ] **Step 4: Append NEWS styles**

```css
/* === NEWS overlay === */
.news-overlay {
  position: fixed;
  top: 0; right: 0; bottom: 0;
  width: 420px;
  background: rgba(8, 13, 27, 0.97);
  border-left: 1px solid rgba(34, 211, 238, 0.2);
  z-index: 70;
  display: flex;
  flex-direction: column;
  color: #e2e8f0;
  font-family: ui-monospace, SFMono-Regular, monospace;
}
.news-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 18px; border-bottom: 1px solid rgba(255,255,255,0.06); }
.news-header h2 { margin: 0; font-size: 13px; letter-spacing: 0.18em; color: #22d3ee; }
.news-topic-row { display: flex; flex-wrap: wrap; gap: 4px; padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.04); }
.news-topic-chip { background: transparent; border: 1px solid rgba(255,255,255,0.12); color: rgba(226,232,240,0.6); border-radius: 3px; font: inherit; font-size: 10px; letter-spacing: 0.1em; padding: 3px 7px; cursor: pointer; }
.news-topic-chip:hover { border-color: rgba(34,211,238,0.5); color: #e2e8f0; }
.news-topic-chip.active { background: rgba(34,211,238,0.12); border-color: #22d3ee; color: #22d3ee; }
.news-list { list-style: none; margin: 0; padding: 0; overflow-y: auto; flex: 1; }
.news-item { padding: 12px 18px; border-bottom: 1px solid rgba(255,255,255,0.04); }
.news-meta { display: flex; gap: 10px; align-items: center; font-size: 10px; color: rgba(226,232,240,0.5); letter-spacing: 0.06em; margin-bottom: 6px; }
.news-time { color: #22d3ee; }
.news-topic-tag { background: rgba(255,255,255,0.04); padding: 1px 5px; border-radius: 2px; font-weight: 600; }
.news-headline { margin: 0; font-size: 12.5px; line-height: 1.5; color: rgba(226,232,240,0.95); }
.news-tickers { display: flex; gap: 4px; margin-top: 6px; }
.news-ticker-chip { font-size: 10px; padding: 1px 5px; border: 1px solid rgba(34,211,238,0.35); color: #22d3ee; border-radius: 2px; letter-spacing: 0.05em; }
```

- [ ] **Step 5: Verify**

Refresh. Click NEWS chip. Expected: right-side panel slides in showing topic filter chips and the headline list. Click a topic — list filters. Close via X — returns to view.

- [ ] **Step 6: Commit**

```
git add frontend/src/data/newsSeed.js frontend/src/overlays/NewsOverlay.jsx frontend/src/App.jsx frontend/src/styles.css
git commit -m "feat: add NEWS overlay with curated nuclear headlines"
```

---

## Task 9: Build the Command Palette with global Ctrl+K

**Goal:** Pressing Ctrl+K (or Cmd+K) anywhere opens a centered modal with a type-ahead index over views, plants, tickers, vendors, states. Enter dispatches the right action.

**Files:**
- Create: `frontend/src/data/commandIndex.js`
- Create: `frontend/src/overlays/CommandPalette.jsx`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: Create `frontend/src/data/commandIndex.js`**

```jsx
import { EQUITIES } from "./equitiesSeed";
import smrSites from "./smr_sites.json";

// Each entry: { kind, label, hint, action } where action is a description string consumed by CommandPalette's dispatcher.
// kind = "view" | "plant" | "ticker" | "vendor" | "state"

const VIEW_ENTRIES = [
  { kind: "view", label: "MAP",      hint: "Primary map view",  action: { type: "view", view: "map" } },
  { kind: "view", label: "MARKETS",  hint: "Fuel cycle + equities", action: { type: "view", view: "markets" } },
  { kind: "view", label: "OUTAGES",  hint: "Refueling Gantt",   action: { type: "view", view: "outages" } },
  { kind: "view", label: "PIPELINE", hint: "SMR tracker",       action: { type: "view", view: "pipeline" } },
  { kind: "view", label: "NEWS",     hint: "Open news feed",    action: { type: "overlay", overlay: "news" } },
  { kind: "view", label: "ARCHIVES", hint: "Nuclear history",   action: { type: "overlay", overlay: "archives" } }
];

const TICKER_ENTRIES = EQUITIES.map((eq) => ({
  kind: "ticker",
  label: eq.ticker,
  hint: `${eq.name} • EQUITY`,
  action: { type: "ticker", ticker: eq.ticker }
}));

// Build a Set of unique vendors from smr_sites.json.
const VENDOR_ENTRIES = Array.from(new Set(smrSites.map((s) => s.vendor).filter(Boolean))).map((v) => ({
  kind: "vendor",
  label: v.toUpperCase(),
  hint: "SMR vendor — opens PIPELINE",
  action: { type: "vendor", vendor: v }
}));

const STATE_ABBR = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];
const ISOS = ["CAISO", "ERCOT", "MISO", "PJM", "NYISO", "ISONE", "SPP"];
const STATE_ENTRIES = [
  ...STATE_ABBR.map((s) => ({ kind: "state", label: s, hint: "US state — filters MAP", action: { type: "state", state: s } })),
  ...ISOS.map((s) => ({ kind: "state", label: s, hint: "ISO — filters MAP", action: { type: "iso", iso: s } }))
];

// Build the plant entries dynamically from the loaded plants GeoJSON at call time.
export function buildIndex(plantFeatures) {
  const plantEntries = (plantFeatures || []).map((f) => ({
    kind: "plant",
    label: (f.properties?.plant_name || "").toUpperCase(),
    hint: `${f.properties?.state || ""} • ${f.properties?.parent_company_name || ""}`,
    action: { type: "plant", plantId: f.properties?.id }
  }));

  return [...VIEW_ENTRIES, ...TICKER_ENTRIES, ...VENDOR_ENTRIES, ...plantEntries, ...STATE_ENTRIES];
}

export function searchIndex(index, q) {
  const query = q.trim().toUpperCase();
  if (!query) return index.slice(0, 8);
  const starts = [];
  const contains = [];
  for (const entry of index) {
    if (entry.label.startsWith(query)) starts.push(entry);
    else if (entry.label.includes(query) || entry.hint.toUpperCase().includes(query)) contains.push(entry);
    if (starts.length + contains.length >= 60) break;
  }
  return [...starts, ...contains].slice(0, 20);
}
```

- [ ] **Step 2: Create `frontend/src/overlays/CommandPalette.jsx`**

```jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { buildIndex, searchIndex } from "../data/commandIndex";

export default function CommandPalette({ plantFeatures, onClose, onDispatch }) {
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);

  const index = useMemo(() => buildIndex(plantFeatures), [plantFeatures]);
  const results = useMemo(() => searchIndex(index, q), [index, q]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setCursor(0);
  }, [q]);

  function execute(entry) {
    if (!entry) return;
    onDispatch(entry.action);
    onClose();
  }

  function handleKey(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(results.length - 1, c + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      execute(results[cursor]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  }

  return (
    <div className="cmd-backdrop" onClick={onClose}>
      <div className="cmd-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Command palette">
        <div className="cmd-input-row">
          <span className="cmd-prompt">&gt;</span>
          <input
            ref={inputRef}
            className="cmd-input"
            value={q}
            placeholder="VOGTLE  •  CCJ  •  MARKETS  •  ERCOT"
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={handleKey}
          />
          <span className="cmd-go-hint">&lt;GO&gt;</span>
        </div>
        <ul className="cmd-results">
          {results.length === 0 && <li className="cmd-empty">No matches</li>}
          {results.map((entry, i) => (
            <li
              key={`${entry.kind}-${entry.label}-${i}`}
              className={`cmd-result ${i === cursor ? "active" : ""}`}
              onMouseEnter={() => setCursor(i)}
              onClick={() => execute(entry)}
            >
              <span className={`cmd-kind kind-${entry.kind}`}>{entry.kind}</span>
              <span className="cmd-label">{entry.label}</span>
              <span className="cmd-hint">{entry.hint}</span>
            </li>
          ))}
        </ul>
        <div className="cmd-footer">
          <span><kbd>↑</kbd> <kbd>↓</kbd> navigate</span>
          <span><kbd>Enter</kbd> execute</span>
          <span><kbd>Esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire `CommandPalette` and global Ctrl+K listener into `App.jsx`**

Add at top:
```jsx
import CommandPalette from "./overlays/CommandPalette";
```

Add a global keydown effect inside the `App` component (near the other `useEffect`s):

```jsx
useEffect(() => {
  function onKey(e) {
    if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
      e.preventDefault();
      setOverlay((cur) => (cur === "cmd" ? null : "cmd"));
    }
  }
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, []);
```

Add a dispatcher callback inside the `App` component:

```jsx
const dispatchCommand = useCallback((action) => {
  switch (action.type) {
    case "view":
      setActiveView(action.view);
      break;
    case "overlay":
      setOverlay(action.overlay);
      break;
    case "ticker":
      setActiveView("markets");
      setHighlightTicker(action.ticker);
      break;
    case "vendor":
      setActiveView("pipeline");
      // PipelineView reads its own filter; for v1, opening the view is sufficient.
      break;
    case "plant": {
      const found = animatedPlants.features.find((f) => f.properties?.id === action.plantId);
      if (found) {
        setActiveView("map");
        selectPlant(found);
      }
      break;
    }
    case "state":
      setActiveView("map");
      setQuery(action.state);
      break;
    case "iso":
      setActiveView("map");
      setQuery(action.iso);
      break;
    default:
      break;
  }
}, [animatedPlants, selectPlant]);
```

Render the palette:
```jsx
{overlay === "cmd" && (
  <CommandPalette
    plantFeatures={animatedPlants.features}
    onClose={() => setOverlay(null)}
    onDispatch={dispatchCommand}
  />
)}
```

- [ ] **Step 4: Append command-palette styles**

```css
/* === Command Palette === */
.cmd-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.7);
  backdrop-filter: blur(2px);
  z-index: 80;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 120px;
}
.cmd-modal {
  width: min(640px, 90vw);
  background: rgba(8, 13, 27, 0.98);
  border: 1px solid rgba(34, 211, 238, 0.4);
  border-radius: 6px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6), 0 0 24px rgba(34, 211, 238, 0.15);
  color: #e2e8f0;
  font-family: ui-monospace, SFMono-Regular, monospace;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.cmd-input-row { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.06); }
.cmd-prompt { color: #22d3ee; font-size: 16px; }
.cmd-input { flex: 1; background: transparent; border: none; outline: none; color: #e2e8f0; font: inherit; font-size: 14px; letter-spacing: 0.04em; }
.cmd-input::placeholder { color: rgba(226,232,240,0.3); }
.cmd-go-hint { color: rgba(34,211,238,0.5); font-size: 11px; letter-spacing: 0.1em; }
.cmd-results { list-style: none; margin: 0; padding: 4px 0; max-height: 360px; overflow-y: auto; }
.cmd-result { display: grid; grid-template-columns: 70px 1fr auto; align-items: center; gap: 10px; padding: 6px 16px; cursor: pointer; font-size: 12px; }
.cmd-result.active { background: rgba(34, 211, 238, 0.1); }
.cmd-kind { font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; padding: 1px 5px; border-radius: 2px; text-align: center; }
.kind-view   { background: rgba(34, 211, 238, 0.18); color: #22d3ee; }
.kind-plant  { background: rgba(168, 85, 247, 0.18); color: #c084fc; }
.kind-ticker { background: rgba(251, 191, 36, 0.18); color: #fbbf24; }
.kind-vendor { background: rgba(16, 185, 129, 0.18); color: #34d399; }
.kind-state  { background: rgba(244, 114, 182, 0.18); color: #f9a8d4; }
.cmd-label { color: #e2e8f0; font-weight: 600; letter-spacing: 0.04em; }
.cmd-hint  { color: rgba(226,232,240,0.5); font-size: 11px; text-align: right; }
.cmd-empty { padding: 18px; text-align: center; color: rgba(226,232,240,0.4); font-size: 12px; }
.cmd-footer { display: flex; gap: 16px; padding: 8px 16px; border-top: 1px solid rgba(255,255,255,0.06); font-size: 10.5px; color: rgba(226,232,240,0.5); }
.cmd-footer kbd { background: rgba(255,255,255,0.08); padding: 1px 5px; border-radius: 2px; margin-right: 4px; font-family: inherit; }
```

- [ ] **Step 5: Verify**

Refresh. Press Ctrl+K (or Cmd+K on Mac). Expected:
- Centered command palette opens, input focused.
- Type `MARK` → MARKETS view entry. Enter → palette closes, MARKETS opens.
- Press Ctrl+K again, type `VOGTLE` (or any plant name from the map). Enter → MAP opens, that plant becomes the selected one.
- Type `CCJ` → ticker entry. Enter → MARKETS opens with `highlightTicker = "CCJ"`.
- Type `TX` → state entry. Enter → MAP opens with search box pre-filled to "TX".
- ↑↓ navigate; Esc closes.
- Clicking the CMD chip also opens the palette.

- [ ] **Step 6: Commit**

```
git add frontend/src/data/commandIndex.js frontend/src/overlays/CommandPalette.jsx frontend/src/App.jsx frontend/src/styles.css
git commit -m "feat: add Ctrl+K command palette with cross-view dispatch"
```

---

## Task 10: Cross-view linkage — equities row click highlights plants on MAP

**Goal:** Clicking a row in the MARKETS equities table (or executing a ticker command in CMD) sets `highlightTicker`, and when the user switches to MAP, plants owned by that company get a visible highlight indicator. Also: a small banner on MAP that says "Highlighting plants owned by CEG" with a clear button.

This is the simplest viable form of the cross-view linkage. We do not change `NuclearMap` rendering itself — instead we show a banner identifying the matched plants. A future task can wire the highlight into the actual map markers.

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: Compute matched plants in `App.jsx`**

Add an import:
```jsx
import { EQUITIES, plantsForEquity } from "./data/equitiesSeed";
```

Inside the `App` component, after `animatedPlants` is computed, add:
```jsx
const highlightedPlants = useMemo(() => {
  if (!highlightTicker) return [];
  const eq = EQUITIES.find((e) => e.ticker === highlightTicker);
  if (!eq) return [];
  return plantsForEquity(eq, animatedPlants.features);
}, [highlightTicker, animatedPlants]);
```

- [ ] **Step 2: Render the highlight banner on the map view**

Inside the `<section className="map-stage">`, after `<NuclearMap .../>` and only when `activeView === "map"` and `highlightTicker`, render:

```jsx
{activeView === "map" && highlightTicker && (
  <div className="highlight-banner" role="status">
    <span className="hb-ticker">{highlightTicker}</span>
    <span>Showing {highlightedPlants.length} plant{highlightedPlants.length === 1 ? "" : "s"} owned by this company</span>
    <button onClick={() => setHighlightTicker(null)} aria-label="Clear highlight">×</button>
  </div>
)}
```

- [ ] **Step 3: Append highlight-banner styles**

```css
/* === Highlight banner === */
.highlight-banner {
  position: absolute;
  top: 90px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(251, 191, 36, 0.5);
  color: #e2e8f0;
  border-radius: 4px;
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  z-index: 50;
  box-shadow: 0 4px 16px rgba(0,0,0,0.4);
}
.hb-ticker {
  background: rgba(251, 191, 36, 0.18);
  color: #fbbf24;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 700;
  letter-spacing: 0.06em;
}
.highlight-banner button {
  background: transparent;
  border: none;
  color: rgba(226, 232, 240, 0.7);
  font-size: 16px;
  cursor: pointer;
  padding: 0 4px;
}
.highlight-banner button:hover { color: #fbbf24; }
```

- [ ] **Step 4: Verify**

Refresh. Click MARKETS. Click the CEG row. Click MAP. Expected:
- Highlight banner appears: `CEG · Showing N plants owned by this company`.
- Clicking × clears the banner and `highlightTicker`.
- Also test: Ctrl+K → type `CCJ` → Enter. The MARKETS view opens; clicking MAP shows the banner for CCJ.

- [ ] **Step 5: Commit**

```
git add frontend/src/App.jsx frontend/src/styles.css
git commit -m "feat: cross-view highlight when MARKETS row or CMD ticker is selected"
```

---

## Final verification

- [ ] **Step 1: End-to-end smoke**

With `npm run dev` running, walk through:
1. Land on MAP — looks exactly as before.
2. Tab through MAP → MARKETS → OUTAGES → PIPELINE → MAP. Ticker rail stays mounted across all.
3. Open NEWS chip; filter to SMR; close.
4. Press Ctrl+K; type partial plant name; Enter; verify MAP selects that plant.
5. Press Ctrl+K; type a ticker; Enter; verify MARKETS opens and highlight banner appears when switching to MAP.
6. Open ARCH chip; verify Nuclear History still works.
7. Drag the year slider on MAP back to e.g. 2010; switch to OUTAGES; verify the Gantt rows differ from 2026.

- [ ] **Step 2: Production build sanity**

Run from `frontend/`:
```
npm run build
```
Expected: build succeeds. (Vite will print any unused-import or syntax issues.) Fix any errors before declaring done.

- [ ] **Step 3: Commit any build-fix follow-ups**

If Step 2 surfaced fixes, commit them:
```
git add -A
git commit -m "chore: fix build warnings from bloomberg-tabs rollout"
```

---

## Notes for the implementer

- The codebase uses **CRLF line endings on Windows**. Don't fight it; git's autocrlf will normalize.
- `App.jsx` has grown large already (~1400 lines). This plan extracts only `TopRail`. Don't be tempted to do a broader refactor in this branch — keep diffs focused.
- All the icons used (`Newspaper`, `Command`, `Archive`, `TrendingUp`, `TrendingDown`, `Calendar`, etc.) are available in `lucide-react` v0.511 — already a dependency.
- The `fluctuationFactor` ticks every 4s in `App.jsx`. That's slow enough that the MARKETS sparklines update visibly; if you find it sluggish, do not change the interval here — it's shared with the map's price/output animation.
