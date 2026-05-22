import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const HAS_MAPBOX_TOKEN =
  Boolean(MAPBOX_TOKEN) && !String(MAPBOX_TOKEN).includes("your_mapbox_token_here");
const PLANTS_SOURCE_ID = "plants";
const PLANT_GLOW_LAYER_ID = "plant-glow";
const PLANT_NODE_LAYER_ID = "plant-node";
const PLANT_RING_LAYER_ID = "plant-ring";

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

function displayTicker(ticker) {
  return ticker && ticker !== "PRIVATE" ? ticker : "Private";
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

function metricColorExpression(metricMode) {
  if (metricMode === "price") {
    return [
      "interpolate",
      ["linear"],
      ["coalesce", ["to-number", ["get", "current_power_cost_usd_mwh"]], 0],
      0,
      "#22d3ee",
      35,
      "#2dd4bf",
      65,
      "#f59e0b",
      100,
      "#f97316"
    ];
  }

  return [
    "interpolate",
    ["linear"],
    ["coalesce", ["to-number", ["get", "capacity_percentage"]], 0],
    0,
    "#60a5fa",
    45,
    "#22d3ee",
    75,
    "#facc15",
    100,
    "#fb7185"
  ];
}

function addPlantLayers(map, metricMode) {
  if (!map.getSource(PLANTS_SOURCE_ID)) {
    map.addSource(PLANTS_SOURCE_ID, {
      type: "geojson",
      data: emptyCollection
    });
  }

  if (!map.getLayer(PLANT_GLOW_LAYER_ID)) {
    map.addLayer({
      id: PLANT_GLOW_LAYER_ID,
      type: "circle",
      source: PLANTS_SOURCE_ID,
      paint: {
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["coalesce", ["to-number", ["get", "total_mw_capacity"]], 800],
          500,
          16,
          3500,
          34
        ],
        "circle-color": metricColorExpression(metricMode),
        "circle-opacity": 0.26,
        "circle-blur": 0.85
      }
    });
  }

  if (!map.getLayer(PLANT_NODE_LAYER_ID)) {
    map.addLayer({
      id: PLANT_NODE_LAYER_ID,
      type: "circle",
      source: PLANTS_SOURCE_ID,
      paint: {
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["coalesce", ["to-number", ["get", "total_mw_capacity"]], 800],
          500,
          5,
          3500,
          10
        ],
        "circle-color": metricColorExpression(metricMode),
        "circle-stroke-color": "#f8fafc",
        "circle-stroke-opacity": 0.92,
        "circle-stroke-width": 1.4,
        "circle-opacity": 0.95
      }
    });
  }

  if (!map.getLayer(PLANT_RING_LAYER_ID)) {
    map.addLayer({
      id: PLANT_RING_LAYER_ID,
      type: "circle",
      source: PLANTS_SOURCE_ID,
      paint: {
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["coalesce", ["to-number", ["get", "total_mw_capacity"]], 800],
          500,
          9,
          3500,
          15
        ],
        "circle-color": "rgba(255,255,255,0)",
        "circle-stroke-color": "#ffffff",
        "circle-stroke-opacity": [
          "case",
          ["boolean", ["feature-state", "selected"], false],
          0.9,
          0
        ],
        "circle-stroke-width": 2
      }
    });
  }
}

function App() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const selectedIdRef = useRef(null);
  const { plants, status, error } = usePlants();
  const [query, setQuery] = useState("");
  const [metricMode, setMetricMode] = useState("output");
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [ownership, setOwnership] = useState(null);
  const [ownershipStatus, setOwnershipStatus] = useState("idle");
  const [ownershipError, setOwnershipError] = useState("");
  const [mapReady, setMapReady] = useState(false);

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

  const setSelectedFeatureState = useCallback((featureId) => {
    const map = mapRef.current;
    if (!map?.getSource(PLANTS_SOURCE_ID)) {
      return;
    }

    if (selectedIdRef.current !== null) {
      map.setFeatureState(
        { source: PLANTS_SOURCE_ID, id: selectedIdRef.current },
        { selected: false }
      );
    }

    selectedIdRef.current = featureId;

    if (featureId !== null) {
      map.setFeatureState({ source: PLANTS_SOURCE_ID, id: featureId }, { selected: true });
    }
  }, []);

  const selectPlant = useCallback(
    (feature) => {
      const props = feature?.properties || {};
      setSelectedPlant(feature);
      setOwnership(null);
      setOwnershipError("");
      setSelectedFeatureState(feature?.id ?? props.id ?? null);

      if (feature?.geometry?.coordinates && mapRef.current) {
        mapRef.current.easeTo({
          center: feature.geometry.coordinates,
          zoom: Math.max(mapRef.current.getZoom(), 5.4),
          duration: 650,
          offset: [-180, 0]
        });
      }
    },
    [setSelectedFeatureState]
  );

  useEffect(() => {
    if (!HAS_MAPBOX_TOKEN || mapRef.current || !mapContainerRef.current) {
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-97.6, 39.4],
      zoom: 3.15,
      minZoom: 2.4,
      maxZoom: 12,
      attributionControl: false
    });

    mapRef.current = map;
    if (import.meta.env.DEV) {
      window.nuclearMap = map;
    }
    map.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true
      }),
      "bottom-left"
    );
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");

    map.on("load", () => {
      addPlantLayers(map, "output");
      setMapReady(true);
    });

    map.on("click", PLANT_NODE_LAYER_ID, (event) => {
      const feature = event.features?.[0];
      if (feature) {
        selectPlant(feature);
      }
    });

    map.on("mouseenter", PLANT_NODE_LAYER_ID, () => {
      map.getCanvas().style.cursor = "pointer";
    });

    map.on("mouseleave", PLANT_NODE_LAYER_ID, () => {
      map.getCanvas().style.cursor = "";
    });

    return () => {
      map.remove();
      mapRef.current = null;
      if (import.meta.env.DEV) {
        delete window.nuclearMap;
      }
    };
  }, [selectPlant]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map?.getSource(PLANTS_SOURCE_ID)) {
      return;
    }

    map.getSource(PLANTS_SOURCE_ID).setData(filteredPlants);

    if (filteredPlants.features.length > 0 && !selectedPlant) {
      const bounds = new mapboxgl.LngLatBounds();
      filteredPlants.features.forEach((feature) => {
        bounds.extend(feature.geometry.coordinates);
      });
      map.fitBounds(bounds, {
        padding: { top: 120, right: 420, bottom: 80, left: 80 },
        maxZoom: 4.2,
        duration: 700
      });
    }
  }, [filteredPlants, mapReady, selectedPlant]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady) {
      return;
    }

    const color = metricColorExpression(metricMode);
    [PLANT_GLOW_LAYER_ID, PLANT_NODE_LAYER_ID].forEach((layerId) => {
      if (map.getLayer(layerId)) {
        map.setPaintProperty(layerId, "circle-color", color);
      }
    });
  }, [metricMode, mapReady]);

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
    setSelectedPlant(null);
    setOwnership(null);
    setOwnershipStatus("idle");
    setSelectedFeatureState(null);
  }

  return (
    <main className="app-shell">
      <section className="map-stage" aria-label="Nuclear plant map">
        {HAS_MAPBOX_TOKEN ? (
          <div ref={mapContainerRef} className="map-canvas" />
        ) : (
          <TokenGate />
        )}

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

      <label className="search-box">
        <Search size={18} aria-hidden="true" />
        <span className="sr-only">Search plants, owners, states, or markets</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search plants, owners, states"
        />
      </label>

      <div className="rail-actions" aria-label="Map metric color">
        <button
          className={metricMode === "output" ? "active" : ""}
          type="button"
          onClick={() => setMetricMode("output")}
        >
          <Zap size={16} />
          Output
        </button>
        <button
          className={metricMode === "price" ? "active" : ""}
          type="button"
          onClick={() => setMetricMode("price")}
        >
          <DollarSign size={16} />
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

  return (
    <aside className="metric-strip" aria-label="Fleet metrics">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <div className="metric-item" key={metric.label}>
            <Icon size={18} aria-hidden="true" />
            <div>
              <span>{metric.label}</span>
              <strong>{status === "loading" && !error ? "Loading" : metric.value}</strong>
            </div>
          </div>
        );
      })}
    </aside>
  );
}

function TokenGate() {
  return (
    <div className="token-gate">
      <div>
        <MapPin size={28} />
        <h2>Mapbox token required</h2>
        <p>Add `VITE_MAPBOX_TOKEN` in `frontend/.env.local` to render the interactive canvas.</p>
      </div>
    </div>
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
    <aside className={`side-panel ${plant ? "open" : ""}`} aria-live="polite">
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
              <div className="loading-row">
                <Loader2 size={17} className="spin" />
                Loading ownership
              </div>
            )}

            {status === "error" && (
              <div className="inline-alert" role="alert">
                <AlertCircle size={17} />
                {error}
              </div>
            )}

            {status === "ready" && shareholders.length === 0 && (
              <div className="empty-state">No shareholder rows available for this owner.</div>
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
