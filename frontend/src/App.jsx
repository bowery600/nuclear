import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  Building2,
  DollarSign,
  Factory,
  GitBranch,
  Loader2,
  MapPin,
  Search,
  X,
  Zap
} from "lucide-react";
import NuclearMap from "./map/NuclearMap";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const emptyCollection = {
  type: "FeatureCollection",
  features: []
};

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function formatNumber(value, options = {}) {
  const numeric = numberOrNull(value);
  if (numeric === null) {
    return "Unknown";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
    ...options
  }).format(numeric);
}

function formatPercent(value) {
  return formatNumber(value, {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
    style: "percent",
    maximumSignificantDigits: undefined
  });
}

function formatCapacityPercent(value) {
  const numeric = numberOrNull(value);
  if (numeric === null) {
    return "Unknown";
  }
  return `${formatNumber(numeric, { maximumFractionDigits: 1 })}%`;
}

function formatDateTime(value) {
  if (!value) {
    return "No recent observation";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "No recent observation";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

const NON_PUBLIC_TICKERS = {
  ENW: "Energy Northwest is a joint operating agency and not publicly traded.",
  HOLTEC: "Holtec International is a privately held energy technology company.",
  NPPD: "Nebraska Public Power District is a public power corporation and not publicly traded.",
  STP: "STP Nuclear Operating Company is a private joint venture and not publicly traded.",
  TVA: "Tennessee Valley Authority is a federally owned corporation and not publicly traded.",
  WCNOC: "Wolf Creek Nuclear Operating Corporation is a private operating company and not publicly traded."
};

function displayTicker(ticker) {
  if (!ticker || ticker === "PRIVATE" || NON_PUBLIC_TICKERS[ticker.toUpperCase()]) {
    return "Private / Non-public";
  }
  return ticker;
}

function plantName(feature) {
  return feature?.properties?.plant_name || "Select a plant";
}

function plantSubtitle(feature) {
  const props = feature?.properties || {};
  return [props.state, props.parent_company_name].filter(Boolean).join(" • ");
}

function usePlants() {
  const [plants, setPlants] = useState(emptyCollection);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadPlants() {
      try {
        setStatus("loading");
        const response = await fetch(`${API_BASE_URL}/api/plants`, {
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`Plant endpoint returned ${response.status}`);
        }

        const payload = await response.json();
        setPlants(payload?.type === "FeatureCollection" ? payload : emptyCollection);
        setStatus("ready");
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }
        setError(err.message || "Could not load plants");
        setStatus("error");
      }
    }

    loadPlants();
    return () => controller.abort();
  }, []);

  return { plants, status, error };
}

function App() {
  const { plants, status, error } = usePlants();
  const [query, setQuery] = useState("");
  const [metricMode, setMetricMode] = useState("output");
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [ownership, setOwnership] = useState(null);
  const [ownershipStatus, setOwnershipStatus] = useState("idle");
  const [ownershipError, setOwnershipError] = useState("");

  const filteredPlants = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return plants;
    }

    return {
      ...plants,
      features: plants.features.filter((feature) => {
        const props = feature.properties || {};
        return [
          props.plant_name,
          props.state,
          props.parent_company_name,
          props.stock_ticker,
          props.iso_code
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));
      })
    };
  }, [plants, query]);

  const stats = useMemo(() => {
    const features = plants.features || [];
    const totalCapacity = features.reduce(
      (sum, feature) => sum + (numberOrNull(feature.properties?.total_mw_capacity) || 0),
      0
    );
    const currentOutput = features.reduce(
      (sum, feature) => sum + (numberOrNull(feature.properties?.current_mw_output) || 0),
      0
    );
    const priceValues = features
      .map((feature) => numberOrNull(feature.properties?.current_power_cost_usd_mwh))
      .filter((value) => value !== null);
    const averagePrice =
      priceValues.length > 0
        ? priceValues.reduce((sum, value) => sum + value, 0) / priceValues.length
        : null;

    return {
      plantCount: features.length,
      totalCapacity,
      currentOutput,
      averagePrice
    };
  }, [plants]);

  const selectPlant = useCallback((feature) => {
    if (!feature) {
      setSelectedPlant(null);
      setOwnership(null);
      setOwnershipError("");
      setOwnershipStatus("idle");
      return;
    }
    setSelectedPlant(feature);
    setOwnership(null);
    setOwnershipError("");
  }, []);

  useEffect(() => {
    const plantId = selectedPlant?.properties?.id;
    if (!plantId) {
      return;
    }

    const controller = new AbortController();

    async function loadOwnership() {
      try {
        setOwnershipStatus("loading");
        const response = await fetch(`${API_BASE_URL}/api/plants/${plantId}/ownership`, {
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`Ownership endpoint returned ${response.status}`);
        }

        setOwnership(await response.json());
        setOwnershipStatus("ready");
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }
        setOwnershipError(err.message || "Could not load ownership");
        setOwnershipStatus("error");
      }
    }

    loadOwnership();
    return () => controller.abort();
  }, [selectedPlant]);

  function closePanel() {
    selectPlant(null);
  }

  return (
    <main className="app-shell">
      <section className="map-stage" aria-label="Nuclear plant map">
        <NuclearMap
          plants={filteredPlants}
          selectedPlant={selectedPlant}
          onSelect={selectPlant}
          metricMode={metricMode}
        />

        <TopRail
          query={query}
          setQuery={setQuery}
          metricMode={metricMode}
          setMetricMode={setMetricMode}
          visibleCount={filteredPlants.features.length}
          status={status}
        />

        <MetricStrip stats={stats} status={status} error={error} />

        {status === "error" && (
          <div className="map-alert" role="alert">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
      </section>

      <OwnershipPanel
        plant={selectedPlant}
        ownership={ownership}
        status={ownershipStatus}
        error={ownershipError}
        onClose={closePanel}
      />
    </main>
  );
}

function TopRail({ query, setQuery, metricMode, setMetricMode, visibleCount, status }) {
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

      <div className="rail-actions" role="group" aria-label="Map metric color">
        <button
          className={metricMode === "output" ? "active" : ""}
          type="button"
          aria-pressed={metricMode === "output"}
          onClick={() => setMetricMode("output")}
        >
          <Zap size={16} aria-hidden="true" />
          Output
        </button>
        <button
          className={metricMode === "price" ? "active" : ""}
          type="button"
          aria-pressed={metricMode === "price"}
          onClick={() => setMetricMode("price")}
        >
          <DollarSign size={16} aria-hidden="true" />
          Price
        </button>
      </div>

      <div className="count-pill" aria-live="polite">
        {status === "loading" ? <Loader2 size={15} className="spin" /> : <MapPin size={15} />}
        {visibleCount} sites
      </div>
    </header>
  );
}

function MetricStrip({ stats, status, error }) {
  const metrics = [
    {
      icon: Factory,
      label: "Operating Sites",
      value: status === "error" ? "--" : formatNumber(stats.plantCount)
    },
    {
      icon: Zap,
      label: "Live Output",
      value: `${formatNumber(stats.currentOutput)} MW`
    },
    {
      icon: Activity,
      label: "Seeded Capacity",
      value: `${formatNumber(stats.totalCapacity)} MW`
    },
    {
      icon: DollarSign,
      label: "Avg. LMP",
      value:
        stats.averagePrice === null ? "Unknown" : `$${formatNumber(stats.averagePrice)}/MWh`
    }
  ];

  const isLoading = status === "loading" && !error;

  return (
    <aside className="metric-strip" aria-label="Fleet metrics" aria-busy={isLoading}>
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <div className="metric-item" key={metric.label}>
            <Icon size={18} aria-hidden="true" />
            <div>
              <span>{metric.label}</span>
              <strong>
                {isLoading ? (
                  <span className="skeleton-pill" aria-hidden="true" />
                ) : (
                  metric.value
                )}
              </strong>
            </div>
          </div>
        );
      })}
    </aside>
  );
}

function OwnershipPanel({ plant, ownership, status, error, onClose }) {
  const props = plant?.properties || {};
  const shareholders = ownership?.shareholders || [];
  const topOwnership = shareholders.reduce(
    (sum, shareholder) => sum + (numberOrNull(shareholder.ownership_percentage) || 0),
    0
  );
  const maxOwnership = shareholders.reduce(
    (max, shareholder) =>
      Math.max(max, numberOrNull(shareholder.ownership_percentage) || 0),
    0
  );

  return (
    <aside className="side-panel" aria-label="Plant details" aria-busy={status === "loading"}>
      {plant ? (
        <>
          <div className="panel-header">
            <div>
              <p className="eyebrow">Selected Plant</p>
              <h2>{plantName(plant)}</h2>
              <span>{plantSubtitle(plant)}</span>
            </div>
            <button className="icon-button" type="button" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>

          <div className="plant-metrics">
            <MetricCard
              icon={Zap}
              label="Output"
              value={`${formatNumber(props.current_mw_output)} MW`}
              detail={formatDateTime(props.output_observed_at)}
            />
            <MetricCard
              icon={Activity}
              label="Capacity"
              value={formatCapacityPercent(props.capacity_percentage)}
              detail={`${formatNumber(props.total_mw_capacity)} MW nameplate`}
            />
            <MetricCard
              icon={DollarSign}
              label="Power Cost"
              value={
                props.current_power_cost_usd_mwh === null ||
                props.current_power_cost_usd_mwh === undefined
                  ? "Unknown"
                  : `$${formatNumber(props.current_power_cost_usd_mwh, {
                      maximumFractionDigits: 2
                    })}/MWh`
              }
              detail={props.iso_code ? `${props.iso_code} ${props.lmp_location || ""}` : "No node"}
            />
          </div>

          <section className="ownership-tree" aria-label="Corporate ownership">
            <div className="tree-root">
              <Building2 size={20} />
              <div>
                <span>Parent Company</span>
                <strong>{props.parent_company_name || "Unknown"}</strong>
                <small>{displayTicker(props.stock_ticker)}</small>
              </div>
            </div>

            <div className="tree-connector" aria-hidden="true">
              <GitBranch size={18} />
            </div>

            <div className="ownership-summary">
              <span>Top holders</span>
              <strong>{formatPercent(topOwnership / 100)}</strong>
            </div>

            {status === "loading" && (
              <div className="loading-row" role="status" aria-live="polite">
                <Loader2 size={17} className="spin" aria-hidden="true" />
                Loading ownership
              </div>
            )}

            {status === "error" && (
              <div className="inline-alert" role="alert">
                <AlertCircle size={17} aria-hidden="true" />
                {error}
              </div>
            )}

            {status === "ready" && shareholders.length === 0 && (
              <div className="empty-state">
                <span>
                  {NON_PUBLIC_TICKERS[props.stock_ticker?.toUpperCase()] ||
                    "No shareholder rows available for this owner."}
                </span>
              </div>
            )}

            <div className="shareholder-grid">
              {shareholders.map((shareholder) => {
                const ownershipValue =
                  numberOrNull(shareholder.ownership_percentage) || 0;
                const width =
                  maxOwnership > 0 ? Math.max((ownershipValue / maxOwnership) * 100, 6) : 6;

                return (
                  <article className="shareholder-card" key={shareholder.id}>
                    <div>
                      <h3>{shareholder.institutional_investor_name}</h3>
                      <span>{formatDateTime(shareholder.reported_at)}</span>
                    </div>
                    <strong>{formatPercent(ownershipValue / 100)}</strong>
                    <div className="ownership-bar" aria-hidden="true">
                      <span style={{ width: `${width}%` }} />
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </>
      ) : (
        <div className="panel-placeholder">
          <MapPin size={24} />
          <h2>Select a plant</h2>
          <p>Click a glowing node to inspect generation, market pricing, and shareholders.</p>
        </div>
      )}
    </aside>
  );
}

function MetricCard({ icon: Icon, label, value, detail }) {
  return (
    <div className="plant-metric-card">
      <Icon size={17} aria-hidden="true" />
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

export default App;
