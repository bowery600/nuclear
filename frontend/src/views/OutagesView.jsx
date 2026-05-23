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
