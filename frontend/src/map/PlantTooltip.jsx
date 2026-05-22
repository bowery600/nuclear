import { Zap, DollarSign, Activity } from "lucide-react";

function fmt(value, digits = 0) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "--";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(num);
}

export default function PlantTooltip({ plant, x, y }) {
  if (!plant) return null;
  const props = plant.properties || {};
  return (
    <div
      className="plant-tooltip"
      style={{ transform: `translate(${x}px, ${y}px)` }}
      role="tooltip"
    >
      <strong>{props.plant_name || "Unknown plant"}</strong>
      <span className="tt-sub">
        {[props.state, props.parent_company_name].filter(Boolean).join(" • ")}
      </span>
      <div className="tt-metrics">
        <span>
          <Zap size={12} /> {fmt(props.current_mw_output)} MW
        </span>
        <span>
          <Activity size={12} /> {fmt(props.capacity_percentage, 1)}%
        </span>
        <span>
          <DollarSign size={12} />
          {Number.isFinite(Number(props.current_power_cost_usd_mwh))
            ? `$${fmt(props.current_power_cost_usd_mwh, 2)}`
            : "--"}
        </span>
      </div>
      {props.iso_code && <span className="tt-iso">{props.iso_code}</span>}
    </div>
  );
}
