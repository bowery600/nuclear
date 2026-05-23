// Nuclear-exposed public equities. companyKeys are matched (case-insensitive substring)
// against plant `parent_company_name` for the cross-view highlight feature.

export const EQUITIES = [
  { ticker: "CCJ",  name: "Cameco",                basePrice:  52.40, mktCapB:  22.8, companyKeys: ["cameco"] },
  { ticker: "LEU",  name: "Centrus Energy",        basePrice:  68.10, mktCapB:   1.0, companyKeys: ["centrus"] },
  { ticker: "BWXT", name: "BWX Technologies",      basePrice: 121.50, mktCapB:  11.1, companyKeys: ["bwx", "bwxt"] },
  { ticker: "NNE",  name: "Nano Nuclear Energy",   basePrice:  28.90, mktCapB:   0.8, companyKeys: ["nano nuclear"] },
  { ticker: "OKLO", name: "Oklo Inc.",             basePrice:  85.20, mktCapB:  12.4, companyKeys: ["oklo"] },
  { ticker: "SMR",  name: "NuScale Power",         basePrice:  31.40, mktCapB:   8.6, companyKeys: ["nuscale"] },
  { ticker: "GEV",  name: "GE Vernova",            basePrice: 412.00, mktCapB: 113.2, companyKeys: ["ge vernova", "ge hitachi"] },
  { ticker: "CEG",  name: "Constellation Energy",  basePrice: 268.50, mktCapB:  84.6, companyKeys: ["constellation"] },
  { ticker: "VST",  name: "Vistra Corp.",          basePrice: 142.80, mktCapB:  48.1, companyKeys: ["vistra"] },
  { ticker: "TLN",  name: "Talen Energy",          basePrice: 198.30, mktCapB:   9.7, companyKeys: ["talen"] },
  { ticker: "D",    name: "Dominion Energy",       basePrice:  58.20, mktCapB:  49.0, companyKeys: ["dominion"] },
  { ticker: "DUK",  name: "Duke Energy",           basePrice: 117.40, mktCapB:  90.5, companyKeys: ["duke"] }
];

function noise(seed, tick) {
  const x = Math.sin(seed * 78.233 + tick * 0.911) * 43758.5453;
  return x - Math.floor(x);
}

export function quoteAt(eq, tick) {
  const r = noise(eq.basePrice, tick);
  const drift = (r - 0.5) * (eq.basePrice * 0.012); // ~±0.6% per tick
  const price = Math.max(0.01, eq.basePrice + drift);
  const dayOpen = eq.basePrice + (noise(eq.basePrice + 7, Math.floor(tick / 50)) - 0.5) * (eq.basePrice * 0.02);
  const delta = price - dayOpen;
  const deltaPct = (delta / dayOpen) * 100;
  return { price, delta, deltaPct };
}

export function sparkSeries(eq, tick) {
  const out = [];
  for (let i = 29; i >= 0; i--) {
    out.push(quoteAt(eq, tick - i).price);
  }
  return out;
}

// Find plants in animatedPlants whose parent_company_name matches one of an equity's companyKeys.
// Used by the MARKETS row-click → MAP highlight feature.
export function plantsForEquity(eq, plantFeatures) {
  if (!plantFeatures) return [];
  return plantFeatures.filter((feature) => {
    const name = (feature?.properties?.parent_company_name || "").toLowerCase();
    return eq.companyKeys.some((k) => name.includes(k.toLowerCase()));
  });
}
