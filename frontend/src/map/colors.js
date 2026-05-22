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

const OUTPUT_STOPS = [
  { at: 0, color: "#60a5fa" },
  { at: 45, color: "#22d3ee" },
  { at: 75, color: "#facc15" },
  { at: 100, color: "#fb7185" }
];

const PRICE_STOPS = [
  { at: 0, color: "#22d3ee" },
  { at: 35, color: "#2dd4bf" },
  { at: 65, color: "#f59e0b" },
  { at: 100, color: "#f97316" }
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
    return "rgba(148, 163, 184, 0.06)";
  }
  const base = colorForPrice(avgPrice);
  return base;
}
