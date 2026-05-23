import { Archive, Command, Loader2, MapPin, Factory, Newspaper, Search } from "lucide-react";

const TABS = [
  { id: "map",      label: "MAP" },
  { id: "markets",  label: "MARKETS" },
  { id: "outages",  label: "OUTAGES" },
  { id: "pipeline", label: "PIPELINE" }
];

export default function TopRail({
  query, setQuery, visibleCount, status, activeYear,
  activeView, onChangeView, overlay, onToggleOverlay
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

      <div className="rail-utils" role="toolbar" aria-label="Utility actions">
        <button
          type="button"
          className={overlay === "news" ? "active" : ""}
          onClick={() => onToggleOverlay?.("news")}
          title="News feed"
          aria-label="News feed"
        >
          <Newspaper size={14} /><span>NEWS</span>
        </button>
        <button
          type="button"
          className={overlay === "cmd" ? "active" : ""}
          onClick={() => onToggleOverlay?.("cmd")}
          title="Command palette (Ctrl+K)"
          aria-label="Command palette"
        >
          <Command size={14} /><span>CMD</span><kbd>Ctrl+K</kbd>
        </button>
        <button
          type="button"
          className={overlay === "archives" ? "active" : ""}
          onClick={() => onToggleOverlay?.("archives")}
          title="Archives"
          aria-label="Archives"
        >
          <Archive size={14} /><span>ARCH</span>
        </button>
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
    </header>
  );
}
