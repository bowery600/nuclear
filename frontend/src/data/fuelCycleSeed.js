// Seeded prices for the nuclear fuel cycle. Values are realistic 2026 ballparks.
// Replace with a real feed later; the API surface from this file is just an array of {id, label, unit, basePrice}.

export const FUEL_CYCLE = [
  { id: "u3o8",       label: "U₃O₈ Spot",      unit: "/lb",   basePrice: 80.50, dailyVolatility: 1.4 },
  { id: "conversion", label: "UF₆ Conversion", unit: "/kgU",  basePrice: 82.00, dailyVolatility: 0.9 },
  { id: "swu",        label: "SWU Enrichment", unit: "/SWU",  basePrice: 168.00, dailyVolatility: 2.1 }
];

// Deterministic pseudo-noise so the same tick produces the same price across re-renders.
function noise(seed, tick) {
  const x = Math.sin(seed * 12.9898 + tick * 0.731) * 43758.5453;
  return x - Math.floor(x);
}

export function priceAt(item, tick, seedOffset = 0) {
  const r = noise(item.basePrice + seedOffset, tick);
  const delta = (r - 0.5) * item.dailyVolatility;
  return Math.max(0.01, item.basePrice + delta);
}

// 30-tick sparkline series ending at the current tick.
export function sparkSeries(item, tick) {
  const out = [];
  for (let i = 29; i >= 0; i--) {
    out.push(priceAt(item, tick - i, i));
  }
  return out;
}
