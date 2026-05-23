import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  Building2,
  Car,
  Clock,
  Coins,
  DollarSign,
  Factory,
  GitBranch,
  Home,
  Leaf,
  Loader2,
  MapPin,
  Percent,
  Sliders,
  Trees,
  TrendingUp,
  X,
  Zap
} from "lucide-react";
import NuclearMap from "./map/NuclearMap";
import StakeholderTree from "./map/StakeholderTree";
import { getHistoricalPlantProperties } from "./data/historicalTimeline";
import TimelineSlider from "./map/TimelineSlider";
import TickerRail from "./map/TickerRail";
import TopRail from "./map/TopRail";
import { getPlantStatusDetails } from "./map/colors";
import NuclearHistory from "./map/NuclearHistory";
import Odometer from "./map/Odometer";


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
  WCNOC: "Wolf Creek Nuclear Operating Corporation is a private operating company and not publicly traded.",
  CPS: "CPS Energy is a municipal utility and not publicly traded.",
  AE: "Austin Energy is a municipal utility and not publicly traded.",
  OGLE: "Oglethorpe Power Corporation is an electric cooperative and not publicly traded.",
  MEAG: "Municipal Electric Authority of Georgia is a public joint-action agency.",
  DALTON: "Dalton Utilities is a municipal utility and not publicly traded.",
  SRP: "Salt River Project is a municipal utility and not publicly traded.",
  EPE: "El Paso Electric Company is privately held and not publicly traded.",
  SCPPA: "Southern California Public Power Authority is a joint powers authority.",
  LADWP: "Los Angeles Department of Water and Power is a municipal utility.",
  NCMPA1: "North Carolina Municipal Power Agency No. 1 is a joint municipal agency.",
  NCEMPA: "North Carolina Eastern Municipal Power Agency is a joint municipal agency."
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

const EMISSION_FACTORS = {
  gas: 0.43,
  coal: 0.98,
  grid: 0.70
};

function RollingCounter({ currentOutput, fuel = "grid", inline = false }) {
  const offsetFactor = EMISSION_FACTORS[fuel] || 0.70;
  
  const getInitialTons = useCallback(() => {
    const now = new Date();
    const secondsSinceMidnight = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds() + now.getMilliseconds() / 1000;
    return secondsSinceMidnight * ((currentOutput * offsetFactor) / 3600);
  }, [currentOutput, offsetFactor]);

  const [count, setCount] = useState(getInitialTons);

  useEffect(() => {
    setCount(getInitialTons());
  }, [currentOutput, fuel, getInitialTons]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount((prev) => {
        const increment = (currentOutput * offsetFactor * 0.1) / 3600;
        return prev + increment;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [currentOutput, offsetFactor]);

  const formattedCount = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  }).format(count);

  if (inline) {
    return <Odometer value={formattedCount} theme="green" inline />;
  }

  return (
    <div className="rolling-counter-display">
      <Odometer value={formattedCount} theme="green" />
      <span className="rolling-counter-unit">Tons</span>
    </div>
  );
}
function App() {
  const { plants, status, error } = usePlants();
  const [query, setQuery] = useState("");
  const [metricMode, setMetricMode] = useState("output");
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [ownership, setOwnership] = useState(null);
  const [ownershipStatus, setOwnershipStatus] = useState("idle");
  const [ownershipError, setOwnershipError] = useState("");
  const [fluctuationFactor, setFluctuationFactor] = useState(0);
  const [showTree, setShowTree] = useState(false);
  const [replacementFuel, setReplacementFuel] = useState("grid");
  const [timelineYear, setTimelineYear] = useState(2026);
  const [showHistory, setShowHistory] = useState(false);

  // States for 3D reactor overlays and manual power factor overrides
  const [plantOverrides, setPlantOverrides] = useState({});
  const [show3DOverlay, setShow3DOverlay] = useState(false);

  const handleUpdatePlantMetrics = useCallback((plantId, capacityPercent, mwOutput) => {
    setPlantOverrides((prev) => ({
      ...prev,
      [plantId]: { capacity_percentage: capacityPercent, current_mw_output: mwOutput }
    }));
  }, []);

  useEffect(() => {
    if (status !== "ready") return;
    const interval = setInterval(() => {
      setFluctuationFactor((prev) => prev + 1);
    }, 4000);
    return () => clearInterval(interval);
  }, [status]);

  const animatedPlants = useMemo(() => {
    if (!plants.features || plants.features.length === 0) return plants;

    return {
      ...plants,
      features: plants.features
        .map((feature) => {
          const histProps = getHistoricalPlantProperties(feature, timelineYear);
          if (histProps.timelineStatus === "Planned") return null;

          const props = histProps;
          const plantId = props.id || 0;

          const seed1 = Math.sin(plantId * 12.9898 + fluctuationFactor) * 43758.5453;
          const rand1 = seed1 - Math.floor(seed1);

          const seed2 = Math.sin(plantId * 78.233 + fluctuationFactor * 1.5) * 43758.5453;
          const rand2 = seed2 - Math.floor(seed2);

          const currentOutput = numberOrNull(props.current_mw_output);
          const capacity = numberOrNull(props.total_mw_capacity);
          const currentPrice = numberOrNull(props.current_power_cost_usd_mwh);

          // Deterministically mark ~7.7% of active plants as in a planned refueling outage.
          // By adding timelineYear into the hash, refueling outages cycle realistically as you slide the timeline!
          const isDeterministicRefueling = props.timelineStatus === "Active" && ((plantId + timelineYear) % 13 === 0);

          const override = plantOverrides[plantId];

          let nextOutput = currentOutput;
          let nextPercent = props.capacity_percentage;
          if (override !== undefined) {
            nextOutput = override.current_mw_output;
            nextPercent = override.capacity_percentage;
          } else if (isDeterministicRefueling) {
            nextOutput = 0;
            nextPercent = 0;
          } else if (props.timelineStatus === "Active" && currentOutput !== null && capacity !== null) {
            if (props.capacity_percentage < 15) {
              nextOutput = 0;
              nextPercent = 0;
            } else {
              const delta = (rand1 - 0.5) * (capacity * 0.001);
              nextOutput = Math.max(0, Math.min(capacity, currentOutput + delta));
              nextPercent = (nextOutput / capacity) * 100;
            }
          }

          let nextPrice = currentPrice;
          if (props.timelineStatus === "Active" && currentPrice !== null) {
            const deltaPrice = (rand2 - 0.5) * 0.16;
            nextPrice = Math.max(1.0, currentPrice + deltaPrice);
          }


          return {
            ...feature,
            properties: {
              ...props,
              current_mw_output: nextOutput,
              capacity_percentage: nextPercent,
              current_power_cost_usd_mwh: nextPrice,
            },
          };
        })
        .filter(Boolean),
    };
  }, [plants, fluctuationFactor, timelineYear, plantOverrides]);

  const activeSelectedPlant = useMemo(() => {
    if (!selectedPlant) return null;
    const active = animatedPlants.features.find((f) => f.properties?.id === selectedPlant.properties?.id);
    return active || null;
  }, [selectedPlant, animatedPlants]);

  // Clean up selected plant if it gets filtered out by sliding to a year before its commissioning
  useEffect(() => {
    if (selectedPlant) {
      const active = animatedPlants.features.find((f) => f.properties?.id === selectedPlant.properties?.id);
      if (!active) {
        setSelectedPlant(null);
        setOwnership(null);
        setOwnershipStatus("idle");
        setOwnershipError("");
      }
    }
  }, [timelineYear, animatedPlants, selectedPlant]);

  const filteredPlants = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return animatedPlants;
    }

    return {
      ...animatedPlants,
      features: animatedPlants.features.filter((feature) => {
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
  }, [animatedPlants, query]);

  const stats = useMemo(() => {
    const features = animatedPlants.features || [];
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
  }, [animatedPlants]);

  const selectPlant = useCallback((feature) => {
    setShowTree(false);
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
          selectedPlant={activeSelectedPlant}
          onSelect={selectPlant}
          metricMode={metricMode}
          onUpdatePlantMetrics={handleUpdatePlantMetrics}
          show3DOverlay={show3DOverlay}
          setShow3DOverlay={setShow3DOverlay}
        />

        <TopRail
          query={query}
          setQuery={setQuery}
          visibleCount={filteredPlants.features.length}
          status={status}
          activeYear={timelineYear}
          onShowHistory={() => setShowHistory(true)}
        />

        <TickerRail plants={animatedPlants} />

        <TimelineSlider
          activeYear={timelineYear}
          onChangeYear={setTimelineYear}
        />

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

      {showTree && activeSelectedPlant && ownership && (
        <StakeholderTree
          plant={activeSelectedPlant}
          ownership={ownership}
          onClose={() => setShowTree(false)}
        />
      )}

      {showHistory && (
        <NuclearHistory onClose={() => setShowHistory(false)} />
      )}
    </main>
  );
}

function MetricStrip({ stats, status, error, replacementFuel, setReplacementFuel }) {
  const metrics = [
    {
      icon: Factory,
      label: "Operating Sites",
      value: status === "error" ? "--" : formatNumber(stats.plantCount),
      theme: "white"
    },
    {
      icon: Zap,
      label: "Live Output",
      value: status === "error" ? "--" : `${formatNumber(stats.currentOutput)} MW`,
      theme: "amber"
    },
    {
      icon: Activity,
      label: "Seeded Capacity",
      value: status === "error" ? "--" : `${formatNumber(stats.totalCapacity)} MW`,
      theme: "amber"
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
                  <Odometer value={metric.value} theme={metric.theme} />
                )}
              </strong>
            </div>
          </div>
        );
      })}

      <div className="metric-item avoided-co2-item">
        <Leaf size={18} aria-hidden="true" style={{ color: "#10b981" }} />
        <div>
          <span>Avoided CO2 (Today)</span>
          <strong>
            {isLoading ? (
              <span className="skeleton-pill" aria-hidden="true" />
            ) : (
              <RollingCounter
                currentOutput={stats.currentOutput}
                fuel={replacementFuel}
              />
            )}
          </strong>
          <div className="co2-fuel-toggle" role="group" aria-label="Avoided CO2 replacement fuel toggle">
            <button
              className={replacementFuel === "gas" ? "active" : ""}
              onClick={() => setReplacementFuel("gas")}
              title="Compare to Natural Gas (0.43 t/MWh)"
            >
              Gas
            </button>
            <button
              className={replacementFuel === "coal" ? "active" : ""}
              onClick={() => setReplacementFuel("coal")}
              title="Compare to Coal (0.98 t/MWh)"
            >
              Coal
            </button>
            <button
              className={replacementFuel === "grid" ? "active" : ""}
              onClick={() => setReplacementFuel("grid")}
              title="Compare to average Grid Mix (0.70 t/MWh)"
            >
              Mix
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function OwnershipPanel({ plant, ownership, status, error, onClose, onVisualizeTree, replacementFuel, timelineYear, onInspectCore }) {
  const props = plant?.properties || {};
  const statusDetails = getPlantStatusDetails(plant);
  const statusType = statusDetails?.type || "baseload";
  const statusLabel = statusDetails?.label || "Normal Baseload Operation";
  const stakes = ownership?.ownership_stakes || [];
  const [activeStakeIndex, setActiveStakeIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("ownership"); // "ownership" | "financials"

  // Interactive Financial Simulation States
  const [overnightCapEx, setOvernightCapEx] = useState(4500);
  const [fixedOM, setFixedOM] = useState(120);
  const [variableOM, setVariableOM] = useState(3.0);
  const [fuelCost, setFuelCost] = useState(7.0);
  const [capacityFactor, setCapacityFactor] = useState(90);
  const [discountRate, setDiscountRate] = useState(7);
  const [costRecoveryPeriod, setCostRecoveryPeriod] = useState(30);
  const [licenseExtension, setLicenseExtension] = useState(0);
  const [extensionCapEx, setExtensionCapEx] = useState(200);

  // Auto-reset active index when ownership changes
  useEffect(() => {
    setActiveStakeIndex(0);
    setActiveTab("ownership"); // Default tab back to corporate on plant selection
  }, [ownership]);

  // Synchronize financial inputs with database baselines on plant change
  useEffect(() => {
    if (plant) {
      setOvernightCapEx(Number(props.overnight_capex_usd_kw) || 4500);
      setFixedOM(Number(props.fixed_om_usd_kw_yr) || 120);
      setVariableOM(Number(props.variable_om_usd_mwh) || 3.0);
      setFuelCost(Number(props.fuel_cost_usd_mwh) || 7.0);
      setCapacityFactor(90);
      setDiscountRate(7);
      setCostRecoveryPeriod(30);
      setLicenseExtension(0);
      setExtensionCapEx(200);
    }
  }, [plant?.properties?.id]);

  // Selected stake and its shareholders
  const activeStake = stakes[activeStakeIndex] || stakes[0] || null;
  const activeParent = activeStake?.parent_company || null;
  const shareholders = activeStake?.shareholders || [];
  const activeTicker = activeParent?.stock_ticker || props.stock_ticker || "";
  const activeParentName = activeParent?.parent_company_name || props.parent_company_name || "Unknown";

  const topOwnership = shareholders.reduce(
    (sum, shareholder) => sum + (numberOrNull(shareholder.ownership_percentage) || 0),
    0
  );
  const maxOwnership = shareholders.reduce(
    (max, shareholder) =>
      Math.max(max, numberOrNull(shareholder.ownership_percentage) || 0),
    0
  );

  // Financial Calculations
  const currentYear = 2026;
  const commissionYear = Number(props.commission_year) || 1980;
  const age = Math.max(0, currentYear - commissionYear);
  const currentExpiration = Number(props.license_expiration_year) || (commissionYear + 60);
  const remainingLifespan = Math.max(0, currentExpiration - currentYear);

  const isDepreciated = age >= costRecoveryPeriod;
  const totalOriginalCapEx = (Number(props.total_mw_capacity) || 1000) * 1000 * overnightCapEx;

  // Capital Recovery Factor (CRF) for original investment
  const r = discountRate / 100;
  const N = costRecoveryPeriod;
  const CRF = r > 0 ? (r * Math.pow(1 + r, N)) / (Math.pow(1 + r, N) - 1) : 1 / N;

  const capitalLCOE = isDepreciated ? 0 : (overnightCapEx * 1000 * CRF) / (8760 * (capacityFactor / 100));
  const fixedOMLCOE = (fixedOM * 1000) / (8760 * (capacityFactor / 100));
  const variableOMLCOE = variableOM;
  const fuelLCOE = fuelCost;

  // License Extension Capital Recovery
  const extR = discountRate / 100;
  const extN = licenseExtension;
  const extCRF = extR > 0 && extN > 0 ? (extR * Math.pow(1 + extR, extN)) / (Math.pow(1 + extR, extN) - 1) : (extN > 0 ? 1 / extN : 0);
  const extensionLCOE = extN > 0 ? (extensionCapEx * 1000 * extCRF) / (8760 * (capacityFactor / 100)) : 0;

  const totalLCOE = capitalLCOE + fixedOMLCOE + variableOMLCOE + fuelLCOE + extensionLCOE;

  // Forecast Revenue Details
  const revenuePrice = Number(props.current_power_cost_usd_mwh) || 30.00;
  const annualGenMWh = (Number(props.total_mw_capacity) || 1000) * 8760 * (capacityFactor / 100);
  const annualRevenue = annualGenMWh * revenuePrice;
  const annualOpCost = annualGenMWh * (fixedOMLCOE + variableOMLCOE + fuelLCOE + extensionLCOE);
  const annualProfit = annualRevenue - annualOpCost;

  // Simulated license info
  const simulatedExpiration = currentExpiration + Number(licenseExtension);
  const simulatedRemainingYears = remainingLifespan + Number(licenseExtension);

  // Environmental calculated offset variables for Odometer components
  const offsetRateVal = ((Number(props.current_mw_output) || 0) * (EMISSION_FACTORS[replacementFuel] || 0.70)).toFixed(2);
  const annualAvoidedCO2Val = formatNumber((Number(props.total_mw_capacity) || 0) * 8760 * (capacityFactor / 100) * (EMISSION_FACTORS[replacementFuel] || 0.70)) + " Tons / yr";

  // Formatting helpers for CapEx Billion/Million
  const formatCapExAmount = (amount) => {
    if (amount >= 1e9) {
      return `$${(amount / 1e9).toFixed(2)} Billion`;
    }
    return `$${(amount / 1e6).toFixed(0)} Million`;
  };

  return (
    <aside className="side-panel" aria-label="Plant details" aria-busy={status === "loading"}>
      {plant ? (
        <>
          <div className="panel-header">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "6px" }}>
                <p className="eyebrow" style={{ margin: 0 }}>Selected Plant</p>
                <div className={`status-badge status-${statusType}`} style={{ marginTop: 0, padding: "2px 8px" }}>
                  <span className="badge-dot" />
                  {statusLabel}
                </div>
              </div>
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

          <div className="panel-tabs" role="tablist">
            <button
              role="tab"
              aria-selected={activeTab === "ownership"}
              className={`panel-tab-btn ${activeTab === "ownership" ? "active" : ""}`}
              onClick={() => setActiveTab("ownership")}
            >
              <Building2 size={14} style={{ marginRight: 6 }} />
              Corporate Ownership
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "financials"}
              className={`panel-tab-btn ${activeTab === "financials" ? "active" : ""}`}
              onClick={() => setActiveTab("financials")}
            >
              <Coins size={14} style={{ marginRight: 6 }} />
              Financial Analytics
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "decarbonization"}
              className={`panel-tab-btn ${activeTab === "decarbonization" ? "active" : ""}`}
              onClick={() => setActiveTab("decarbonization")}
            >
              <Leaf size={14} style={{ marginRight: 6 }} />
              Environmental Impact
            </button>
          </div>

          {activeTab === "ownership" && (
            <section className="ownership-tree" aria-label="Corporate ownership">
              {/* Visual equity distribution list */}
              <div className="equity-distribution-block">
                <span className="eyebrow">Equity Distribution</span>
                <div className="stakes-list">
                  {status === "ready" && stakes.map((stake, idx) => (
                    <div key={idx} className="stake-item">
                      <div className="stake-info">
                        <span className="stake-owner">{stake.owner_name}</span>
                        <span className="stake-percent">{formatCapacityPercent(stake.equity_percentage)}</span>
                      </div>
                      <div className="stake-progress-bg">
                        <span className="stake-progress-bar" style={{ width: `${stake.equity_percentage}%` }}></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Glowing D3 tree trigger CTA */}
              {status === "ready" && (
                <button className="visualize-tree-btn" onClick={onVisualizeTree}>
                  <GitBranch size={16} />
                  <span>Visualize Stakeholder Tree</span>
                </button>
              )}

              <div className="divider-line" />

              {/* Parent company and dropdown */}
              <div className="tree-root">
                <Building2 size={20} />
                <div>
                  <span>Parent Company</span>
                  {status === "ready" && stakes.length > 1 ? (
                    <div className="parent-dropdown-wrapper">
                      <select
                        className="parent-dropdown"
                        value={activeStakeIndex}
                        onChange={(e) => setActiveStakeIndex(Number(e.target.value))}
                      >
                        {stakes.map((stake, idx) => (
                          <option key={idx} value={idx}>
                            {stake.parent_company?.parent_company_name || stake.owner_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <strong>{activeParentName}</strong>
                  )}
                  <small>{displayTicker(activeTicker)}</small>
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

              {status === "ready" && timelineYear < 2000 && (
                <div className="historical-shareholders-notice" style={{
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(250, 204, 21, 0.25)",
                  background: "rgba(113, 63, 18, 0.15)",
                  color: "#facc15",
                  fontSize: "11.5px",
                  lineHeight: "1.45",
                  marginBottom: "12px"
                }}>
                  <strong>Pre-Deregulation Era:</strong> Prior to deregulation around 2000, <em>{activeParentName}</em> operated as a regulated regional utility. Equity was widely held by local retail investors and public trust funds rather than modern institutional asset managers.
                </div>
              )}

              {status === "ready" && shareholders.length === 0 && (
                <div className="empty-state">
                  <span>
                    {NON_PUBLIC_TICKERS[activeTicker?.toUpperCase()] ||
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
          )}

          {activeTab === "financials" && (
            <section className="financial-analytics-view" aria-label="Financial Analytics">
              
              {/* LCOE Summary Component */}
              <div className="financial-analytics-block">
                <span className="eyebrow">Levelized Cost of Electricity</span>
                
                <div className="lcoe-ticker-wrapper">
                  <div className="lcoe-ticker">
                    <span className="lcoe-amount"><Odometer value={"$" + totalLCOE.toFixed(2)} theme="amber" inline /></span>
                    <span className="lcoe-unit">/ MWh</span>
                  </div>
                  <div className={`depreciation-badge ${isDepreciated ? "depreciated" : "active"}`}>
                    {isDepreciated ? (
                      <>
                        <Coins size={12} className="glowing-icon" /> Fully Depreciated Fleet
                      </>
                    ) : (
                      `Debt Recovery (${costRecoveryPeriod - age} yrs remaining)`
                    )}
                  </div>
                </div>

                {/* Stacked cost bar */}
                <div className="lcoe-stacked-bar">
                  {capitalLCOE > 0 && (
                    <div 
                      className="lcoe-segment segment-capital" 
                      style={{ width: `${(capitalLCOE / totalLCOE) * 100}%` }}
                      title={`Capital Cost: $${capitalLCOE.toFixed(2)}/MWh`}
                    />
                  )}
                  <div 
                    className="lcoe-segment segment-fixed" 
                    style={{ width: `${(fixedOMLCOE / totalLCOE) * 100}%` }}
                    title={`Fixed O&M: $${fixedOMLCOE.toFixed(2)}/MWh`}
                  />
                  <div 
                    className="lcoe-segment segment-variable" 
                    style={{ width: `${(variableOMLCOE / totalLCOE) * 100}%` }}
                    title={`Variable O&M: $${variableOMLCOE.toFixed(2)}/MWh`}
                  />
                  <div 
                    className="lcoe-segment segment-fuel" 
                    style={{ width: `${(fuelLCOE / totalLCOE) * 100}%` }}
                    title={`Uranium Fuel: $${fuelLCOE.toFixed(2)}/MWh`}
                  />
                  {extensionLCOE > 0 && (
                    <div 
                      className="lcoe-segment segment-extension" 
                      style={{ width: `${(extensionLCOE / totalLCOE) * 100}%` }}
                      title={`Renewal Amortization: $${extensionLCOE.toFixed(2)}/MWh`}
                    />
                  )}
                </div>

                {/* Breakdown Legend */}
                <div className="lcoe-legend">
                  {capitalLCOE > 0 ? (
                    <div className="legend-item">
                      <span className="legend-color-box bg-capital" />
                      <span className="legend-name">Capital Cost</span>
                      <span className="legend-val">${capitalLCOE.toFixed(2)}</span>
                    </div>
                  ) : (
                    <div className="legend-item fully-depreciated">
                      <span className="legend-color-box bg-capital paid-off" />
                      <span className="legend-name">Capital Cost</span>
                      <span className="legend-val">$0.00 (Paid Off!)</span>
                    </div>
                  )}
                  <div className="legend-item">
                    <span className="legend-color-box bg-fixed" />
                    <span className="legend-name">Fixed O&M</span>
                    <span className="legend-val">${fixedOMLCOE.toFixed(2)}</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color-box bg-variable" />
                    <span className="legend-name">Variable O&M</span>
                    <span className="legend-val">${variableOMLCOE.toFixed(2)}</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color-box bg-fuel" />
                    <span className="legend-name">Uranium Fuel</span>
                    <span className="legend-val">${fuelLCOE.toFixed(2)}</span>
                  </div>
                  {extensionLCOE > 0 && (
                    <div className="legend-item">
                      <span className="legend-color-box bg-extension" />
                      <span className="legend-name">Renewal CapEx</span>
                      <span className="legend-val">${extensionLCOE.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="divider-line" />

              {/* Infrastructure Analytics & Forecast Cards */}
              <div className="financial-analytics-block">
                <span className="eyebrow">Infrastructure Analytics & Forecast</span>
                <div className="forecast-grid">
                  <div className="forecast-card">
                    <div className="card-top">
                      <TrendingUp size={15} />
                      <span>Annual Generation</span>
                    </div>
                    <strong>{(annualGenMWh / 1e6).toFixed(2)} TWh</strong>
                    <small>{capacityFactor}% Capacity Factor</small>
                  </div>

                  <div className="forecast-card">
                    <div className="card-top">
                      <Coins size={15} />
                      <span>Original CapEx Est.</span>
                    </div>
                    <strong>{formatCapExAmount(totalOriginalCapEx)}</strong>
                    <small>at ${overnightCapEx.toLocaleString()}/kW</small>
                  </div>

                  <div className="forecast-card">
                    <div className="card-top">
                      <Clock size={15} />
                      <span>License Lifespan</span>
                    </div>
                    <strong>{simulatedExpiration}</strong>
                    <small>
                      {simulatedRemainingYears > 0 
                        ? `${simulatedRemainingYears} operational yrs remaining` 
                        : "Expired / Extended"}
                    </small>
                  </div>

                  <div className={`forecast-card operating-margin ${annualProfit >= 0 ? "positive" : "negative"}`}>
                    <div className="card-top">
                      <DollarSign size={15} />
                      <span>Operating Margin</span>
                    </div>
                    <strong>{annualProfit >= 0 ? `+$${(annualProfit / 1e6).toFixed(1)}M` : `-$${(Math.abs(annualProfit) / 1e6).toFixed(1)}M`}</strong>
                    <small>at LMP ${revenuePrice.toFixed(2)}/MWh</small>
                  </div>
                </div>
              </div>

              <div className="divider-line" />

              {/* Sliders Container */}
              <div className="financial-analytics-block">
                <span className="eyebrow flex-header">
                  <Sliders size={13} style={{ marginRight: 6 }} />
                  Interactive Simulation Sliders
                </span>
                
                <div className="sliders-grid">
                  <div className="slider-wrapper">
                    <div className="slider-label-row">
                      <span className="slider-title">Overnight CapEx</span>
                      <span className="slider-value">${overnightCapEx.toLocaleString()}/kW</span>
                    </div>
                    <input
                      type="range"
                      min={1000}
                      max={15000}
                      step={100}
                      value={overnightCapEx}
                      onChange={(e) => setOvernightCapEx(Number(e.target.value))}
                    />
                  </div>

                  <div className="slider-wrapper">
                    <div className="slider-label-row">
                      <span className="slider-title">Capacity Factor</span>
                      <span className="slider-value">{capacityFactor}%</span>
                    </div>
                    <input
                      type="range"
                      min={50}
                      max={100}
                      step={1}
                      value={capacityFactor}
                      onChange={(e) => setCapacityFactor(Number(e.target.value))}
                    />
                  </div>

                  <div className="slider-wrapper">
                    <div className="slider-label-row">
                      <span className="slider-title">Fixed O&M Cost</span>
                      <span className="slider-value">${fixedOM}/kW-yr</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={300}
                      step={5}
                      value={fixedOM}
                      onChange={(e) => setFixedOM(Number(e.target.value))}
                    />
                  </div>

                  <div className="slider-wrapper">
                    <div className="slider-label-row">
                      <span className="slider-title">Variable O&M Cost</span>
                      <span className="slider-value">${variableOM.toFixed(1)}/MWh</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={20}
                      step={0.5}
                      value={variableOM}
                      onChange={(e) => setVariableOM(Number(e.target.value))}
                    />
                  </div>

                  <div className="slider-wrapper">
                    <div className="slider-label-row">
                      <span className="slider-title">Uranium Fuel Cost</span>
                      <span className="slider-value">${fuelCost.toFixed(1)}/MWh</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={30}
                      step={0.5}
                      value={fuelCost}
                      onChange={(e) => setFuelCost(Number(e.target.value))}
                    />
                  </div>

                  <div className="slider-wrapper">
                    <div className="slider-label-row">
                      <span className="slider-title">Debt Term</span>
                      <span className="slider-value">{costRecoveryPeriod} Years</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={50}
                      step={5}
                      value={costRecoveryPeriod}
                      onChange={(e) => setCostRecoveryPeriod(Number(e.target.value))}
                    />
                  </div>

                  <div className="slider-wrapper">
                    <div className="slider-label-row">
                      <span className="slider-title">WACC / Discount Rate</span>
                      <span className="slider-value">{discountRate.toFixed(1)}%</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={15}
                      step={0.5}
                      value={discountRate}
                      onChange={(e) => setDiscountRate(Number(e.target.value))}
                    />
                  </div>

                  <div className="slider-wrapper">
                    <div className="slider-label-row">
                      <span className="slider-title">License Extension</span>
                      <span className="slider-value">+{licenseExtension} Years</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={40}
                      step={10}
                      value={licenseExtension}
                      onChange={(e) => setLicenseExtension(Number(e.target.value))}
                    />
                  </div>

                  {licenseExtension > 0 && (
                    <div className="slider-wrapper full-width-slider">
                      <div className="slider-label-row">
                        <span className="slider-title">Renewal Renovations CapEx</span>
                        <span className="slider-value">${extensionCapEx}/kW</span>
                      </div>
                      <input
                        type="range"
                        min={50}
                        max={1000}
                        step={10}
                        value={extensionCapEx}
                        onChange={(e) => setExtensionCapEx(Number(e.target.value))}
                      />
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {activeTab === "decarbonization" && (
            <section className="decarbonization-view" aria-label="Environmental Impact">
              {/* Avoided Emissions Card */}
              <div className="financial-analytics-block">
                <span className="eyebrow">Real-Time Offset Rate</span>
                <div className="lcoe-ticker-wrapper">
                  <div className="lcoe-ticker">
                    <span className="lcoe-amount">
                      <Odometer value={offsetRateVal} theme="green" inline />
                    </span>
                    <span className="lcoe-unit">Tons CO₂ / hr</span>
                  </div>
                  <div className="depreciation-badge active flex-header" style={{ borderColor: 'rgba(16, 185, 129, 0.35)', background: 'rgba(4, 120, 87, 0.22)', color: '#34d399' }}>
                    <Leaf size={12} className="glowing-icon" style={{ marginRight: 4 }} />
                    Zero Emissions Output
                  </div>
                </div>
                
                {/* 3D Core Inspector launch button */}
                <button className="inspect-deck-btn" onClick={onInspectCore} style={{ marginTop: 12 }}>
                  <Zap size={13} style={{ marginRight: 6 }} />
                  <span>Launch 3D Core Inspector</span>
                </button>
              </div>

              <div className="divider-line" />

              {/* Projected Annual CO2 Avoided */}
              <div className="financial-analytics-block">
                <span className="eyebrow">Simulated Annual Avoided CO₂</span>
                <div className="forecast-grid">
                  <div className="forecast-card" style={{ gridColumn: '1 / -1', borderLeft: '3px solid #10b981' }}>
                    <div className="card-top">
                      <Leaf size={15} style={{ color: '#10b981' }} />
                      <span>Annual Avoided Emissions</span>
                    </div>
                    <strong className="annual-avoided-co2-display">
                      <Odometer value={annualAvoidedCO2Val} theme="green" />
                    </strong>
                    <small>Projected at {capacityFactor}% Capacity Factor & {replacementFuel === 'grid' ? 'Grid Mix' : replacementFuel === 'gas' ? 'Gas' : 'Coal'} replacement</small>
                  </div>
                </div>
              </div>

              <div className="divider-line" />

              {/* Comparative Chart */}
              <div className="financial-analytics-block">
                <span className="eyebrow">Annual Avoided CO₂ by Fuel Replacement</span>
                <div className="comparison-chart-block">
                  {(() => {
                    const capacity = Number(props.total_mw_capacity) || 0;
                    const hoursInYear = 8760;
                    const cfMultiplier = capacityFactor / 100;
                    const annualMWh = capacity * hoursInYear * cfMultiplier;
                    
                    const gasAvoided = annualMWh * EMISSION_FACTORS.gas;
                    const gridAvoided = annualMWh * EMISSION_FACTORS.grid;
                    const coalAvoided = annualMWh * EMISSION_FACTORS.coal;
                    
                    const maxVal = Math.max(coalAvoided, 1);
                    
                    return (
                      <div className="comparison-bars">
                        <div className="comparison-bar-row">
                          <span className="bar-label">Natural Gas <small>({EMISSION_FACTORS.gas} t/MWh)</small></span>
                          <div className="bar-container">
                            <div className="bar-fill gas-bar" style={{ width: `${(gasAvoided / maxVal) * 100}%` }}></div>
                            <span className="bar-value">{formatNumber(gasAvoided)} t</span>
                          </div>
                        </div>
                        <div className="comparison-bar-row">
                          <span className="bar-label">US Grid Mix <small>({EMISSION_FACTORS.grid} t/MWh)</small></span>
                          <div className="bar-container">
                            <div className="bar-fill grid-bar" style={{ width: `${(gridAvoided / maxVal) * 100}%` }}></div>
                            <span className="bar-value">{formatNumber(gridAvoided)} t</span>
                          </div>
                        </div>
                        <div className="comparison-bar-row">
                          <span className="bar-label">Coal Replacement <small>({EMISSION_FACTORS.coal} t/MWh)</small></span>
                          <div className="bar-container">
                            <div className="bar-fill coal-bar" style={{ width: `${(coalAvoided / maxVal) * 100}%` }}></div>
                            <span className="bar-value">{formatNumber(coalAvoided)} t</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="divider-line" />

              {/* Environmental Equivalencies */}
              <div className="financial-analytics-block">
                <span className="eyebrow flex-header">
                  <Sliders size={13} style={{ marginRight: 6 }} />
                  Equivalent Offsets (Simulated Annual)
                </span>
                
                <div className="forecast-grid">
                  {(() => {
                    const capacity = Number(props.total_mw_capacity) || 0;
                    const annualMWh = capacity * 8760 * (capacityFactor / 100);
                    const annualAvoided = annualMWh * (EMISSION_FACTORS[replacementFuel] || 0.70);
                    
                    const cars = annualAvoided / 4.6;
                    const trees = annualAvoided / 0.84;
                    const railcars = annualAvoided / 183.7;
                    const homes = annualAvoided / 7.9;
                    
                    return (
                      <>
                        <div className="forecast-card equivalency-card">
                          <div className="card-top">
                            <Car size={15} style={{ color: '#67e8f9' }} />
                            <span>Passenger Cars</span>
                          </div>
                          <strong>{formatNumber(cars)}</strong>
                          <small>Taken off the road / yr</small>
                        </div>

                        <div className="forecast-card equivalency-card">
                          <div className="card-top">
                            <Trees size={15} style={{ color: '#10b981' }} />
                            <span>Acres of US Forest</span>
                          </div>
                          <strong>{formatNumber(trees)}</strong>
                          <small>Carbon sequestered / yr</small>
                        </div>

                        <div className="forecast-card equivalency-card">
                          <div className="card-top">
                            <Factory size={15} style={{ color: '#facc15' }} />
                            <span>Railcars of Coal</span>
                          </div>
                          <strong>{formatNumber(railcars)}</strong>
                          <small>Not burned / yr</small>
                        </div>

                        <div className="forecast-card equivalency-card">
                          <div className="card-top">
                            <Home size={15} style={{ color: '#a855f7' }} />
                            <span>Home Electricity</span>
                          </div>
                          <strong>{formatNumber(homes)}</strong>
                          <small>Homes' electricity offset / yr</small>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </section>
          )}
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
