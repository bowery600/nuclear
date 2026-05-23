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
