import { interpolateRgb } from "d3-interpolate";

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function piecewise(stops, value) {
  if (!Number.isFinite(value)) return stops[0].color;
  if (value <= stops[0].at) return stops[0].color;
  if (value >= stops[stops.length - 1].at) return stops[stops.length - 1].color;

  for (let i = 0; i < stops.length - 1; i += 1) {
    const a = stops[i];
    const b = stops[i + 1];
    if (value >= a.at && value <= b.at) {
      const t = (value - a.at) / (b.at - a.at);
      return interpolateRgb(a.color, b.color)(clamp01(t));
    }
  }
  return stops[stops.length - 1].color;
}

// Terminal palette: cool (low) -> hot (high). Cyan -> amber -> red.
const OUTPUT_STOPS = [
  { at: 0,   color: "#005a6e" },
  { at: 45,  color: "#00d4ff" },
  { at: 75,  color: "#ff8c00" },
  { at: 100, color: "#ff3b4e" }
];

const PRICE_STOPS = [
  { at: 0,   color: "#00d4ff" },
  { at: 35,  color: "#4ade80" },
  { at: 65,  color: "#ff8c00" },
  { at: 100, color: "#ff3b4e" }
];

export function colorForOutput(capacityPercent) {
  return piecewise(OUTPUT_STOPS, capacityPercent);
}

export function colorForPrice(usdPerMwh) {
  return piecewise(PRICE_STOPS, usdPerMwh);
}

export function colorForPlant(plant, metricMode) {
  const props = plant?.properties || {};
  if (metricMode === "price") {
    return colorForPrice(Number(props.current_power_cost_usd_mwh));
  }
  return colorForOutput(Number(props.capacity_percentage));
}

export function colorForIsoHeatmap(avgPrice) {
  if (!Number.isFinite(avgPrice)) {
    return "#0a0a0a";
  }
  return colorForPrice(avgPrice);
}

export function getPlantStatusDetails(plant) {
  if (!plant) {
    return {
      type: "baseload",
      label: "Normal Baseload Operation",
      color: "#4ade80"
    };
  }
  const props = plant.properties || {};
  const status = props.timelineStatus || "Active";
  const capacityPct = Number(props.capacity_percentage) || 0;

  if (status === "Construction") {
    return {
      type: "construction",
      label: "Under Construction",
      color: "#d946ef"
    };
  } else if (status === "Decommissioned") {
    return {
      type: "decommissioned",
      label: "Decommissioned",
      color: "#595959"
    };
  } else {
    if (capacityPct < 15) {
      return {
        type: "refueling",
        label: "Planned Refueling Outage",
        color: "#facc15"
      };
    }
    return {
      type: "baseload",
      label: "Normal Baseload Operation",
      color: "#4ade80"
    };
  }
}

