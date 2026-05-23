import { EQUITIES } from "./equitiesSeed";
import smrSites from "./smr_sites.json";

const VIEW_ENTRIES = [
  { kind: "view", label: "MAP", hint: "Primary plant map", action: { type: "view", view: "map" } },
  { kind: "view", label: "MARKETS", hint: "Fuel cycle and equities", action: { type: "view", view: "markets" } },
  { kind: "view", label: "OUTAGES", hint: "Refueling schedule", action: { type: "view", view: "outages" } },
  { kind: "view", label: "PIPELINE", hint: "SMR tracker", action: { type: "view", view: "pipeline" } },
  { kind: "view", label: "NEWS", hint: "Open news overlay", action: { type: "overlay", overlay: "news" } },
  { kind: "view", label: "ARCHIVES", hint: "Open nuclear history", action: { type: "overlay", overlay: "archives" } }
];

const TICKER_ENTRIES = EQUITIES.map((eq) => ({
  kind: "ticker",
  label: eq.ticker,
  hint: `${eq.name} / EQUITY`,
  action: { type: "ticker", ticker: eq.ticker }
}));

const VENDOR_ENTRIES = Array.from(new Set(smrSites.map((site) => site.vendor).filter(Boolean)))
  .sort()
  .map((vendor) => ({
    kind: "vendor",
    label: vendor.toUpperCase(),
    hint: "SMR vendor / opens PIPELINE",
    action: { type: "vendor", vendor }
  }));

const STATE_ABBR = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN",
  "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV",
  "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN",
  "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

const ISO_CODES = ["CAISO", "ERCOT", "ISONE", "MISO", "NYISO", "PJM", "SPP"];

const STATE_ENTRIES = [
  ...STATE_ABBR.map((state) => ({
    kind: "state",
    label: state,
    hint: "US state / filters MAP",
    action: { type: "state", state }
  })),
  ...ISO_CODES.map((iso) => ({
    kind: "state",
    label: iso,
    hint: "ISO region / filters MAP",
    action: { type: "iso", iso }
  }))
];

export function buildIndex(plantFeatures) {
  const ownerMap = new Map();
  const plantEntries = (plantFeatures || []).map((feature) => {
    const props = feature.properties || {};
    if (props.parent_company_name) {
      ownerMap.set(props.parent_company_name.toUpperCase(), props.parent_company_name);
    }
    return {
      kind: "plant",
      label: (props.plant_name || "").toUpperCase(),
      hint: [props.state, props.parent_company_name].filter(Boolean).join(" / "),
      action: { type: "plant", plantId: props.id }
    };
  });

  const ownerEntries = Array.from(ownerMap.values()).map((owner) => ({
    kind: "owner",
    label: owner.toUpperCase(),
    hint: "Owner / filters MAP",
    action: { type: "owner", owner }
  }));

  return [
    ...VIEW_ENTRIES,
    ...TICKER_ENTRIES,
    ...VENDOR_ENTRIES,
    ...plantEntries,
    ...ownerEntries,
    ...STATE_ENTRIES
  ].filter((entry) => entry.label);
}

export function searchIndex(index, queryText) {
  const query = queryText.trim().toUpperCase();
  if (!query) return index.slice(0, 10);

  const starts = [];
  const contains = [];

  for (const entry of index) {
    const haystack = `${entry.label} ${entry.hint}`.toUpperCase();
    if (entry.label.startsWith(query)) {
      starts.push(entry);
    } else if (haystack.includes(query)) {
      contains.push(entry);
    }

    if (starts.length + contains.length >= 80) break;
  }

  return [...starts, ...contains].slice(0, 20);
}
