// Stroke color per SMR vendor. Falls back to a neutral slate for unknown vendors.
const VENDOR_COLORS = {
  "NuScale": "#a78bfa",
  "X-energy": "#34d399",
  "GE Hitachi": "#60a5fa",
  "Westinghouse": "#f472b6",
  "Holtec": "#fb923c",
  "TerraPower": "#facc15",
  "Kairos": "#22d3ee",
  "Oklo": "#f87171",
  "Last Energy": "#c084fc"
};

const VENDOR_FALLBACK = "#94a3b8";

export function colorForVendor(vendor) {
  return VENDOR_COLORS[vendor] || VENDOR_FALLBACK;
}

// Phase visual treatment. `dash` is an SVG strokeDasharray string (or null for solid).
// `innerDot` flags "under construction" for an extra inner marker.
const PHASE_STYLES = {
  announced: { dash: "3 3", innerDot: false, label: "Announced" },
  nrc_engaged: { dash: null, innerDot: false, label: "NRC-Engaged" },
  under_construction: { dash: null, innerDot: true, label: "Under Construction" }
};

const PHASE_FALLBACK = { dash: "3 3", innerDot: false, label: "Unknown" };

export function styleForPhase(phase) {
  return PHASE_STYLES[phase] || PHASE_FALLBACK;
}

export function labelForPhase(phase) {
  return styleForPhase(phase).label;
}
