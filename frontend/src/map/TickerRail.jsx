import { useMemo, useRef } from "react";

function formatMW(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "----";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

function formatPct(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "--.-";
  return n.toFixed(1);
}

function tickerCode(name) {
  if (!name) return "PLNT";
  return name
    .replace(/Nuclear|Generating|Station|Power|Plant/gi, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, 6)
    .toUpperCase() || "PLNT";
}

export default function TickerRail({ plants }) {
  const prevPctRef = useRef(new Map());

  const items = useMemo(() => {
    const features = plants?.features || [];
    const prev = prevPctRef.current;
    const next = new Map();

    const rows = features.map((f) => {
      const props = f.properties || {};
      const id = props.id ?? props.plant_name;
      const status = props.timelineStatus || "Active";
      const pct = Number(props.capacity_percentage);
      const mw = Number(props.current_mw_output);
      const lmp = Number(props.current_power_cost_usd_mwh);
      const prevPct = prev.get(id);
      next.set(id, pct);

      let dir = "flat";
      if (Number.isFinite(prevPct) && Number.isFinite(pct)) {
        if (pct > prevPct + 0.001) dir = "up";
        else if (pct < prevPct - 0.001) dir = "down";
      }

      let tag = null;
      if (status === "Construction") tag = { label: "CONST", cls: "const" };
      else if (status === "Decommissioned") tag = { label: "DECOM", cls: "decom" };
      else if (Number.isFinite(pct) && pct < 15) tag = { label: "REFUEL", cls: "refuel" };

      return {
        id,
        code: tickerCode(props.plant_name),
        mw,
        pct,
        lmp,
        dir,
        tag
      };
    });

    prevPctRef.current = next;
    return rows;
  }, [plants]);

  if (items.length === 0) return null;

  // duplicate sequence so the marquee can scroll seamlessly.
  const doubled = [...items, ...items];

  return (
    <div className="ticker-rail" aria-label="Live fleet ticker">
      <div className="ticker-track">
        {doubled.map((it, idx) => (
          <div className="ticker-item" key={`${it.id}-${idx}`}>
            <span className="ticker-name">{it.code}</span>
            {it.tag ? (
              <span className={`ticker-tag ${it.tag.cls}`}>{it.tag.label}</span>
            ) : (
              <>
                <span className="ticker-val">{formatMW(it.mw)} MW</span>
                <span className={`ticker-delta ${it.dir}`}>{formatPct(it.pct)}%</span>
                {Number.isFinite(it.lmp) && (
                  <span className="ticker-val">${it.lmp.toFixed(2)}</span>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
