import { useEffect, useMemo, useState } from "react";
import smrSites from "../data/smr_sites.json";

// Ordered columns. Map any raw `phase` strings encountered in smr_sites.json to one of these.
const PHASES = [
  { id: "announced",   label: "Announced" },
  { id: "site_permit", label: "Site Permit" },
  { id: "licensed",    label: "Licensed" },
  { id: "construction", label: "Under Construction" },
  { id: "operating",   label: "Operating" },
  { id: "other",       label: "Other" }
];

// Heuristic mapping of raw phase strings to column id. Add cases as new phases appear in the data.
function bucketPhase(raw) {
  const p = (raw || "").toLowerCase();
  if (p.includes("operat")) return "operating";
  if (p.includes("constr")) return "construction";
  if (p.includes("licens")) return "licensed";
  if (p.includes("permit") || p.includes("nrc_engaged") || p.includes("docket")) return "site_permit";
  if (p.includes("announce") || p.includes("planned") || p.includes("propos")) return "announced";
  return "other";
}

function reactorFamily(model) {
  const m = (model || "").toUpperCase();
  if (m.includes("BWR") || m.includes("PWR") || m.includes("AP")) return "LWR";
  if (m.includes("XE") || m.includes("HTGR")) return "HTGR";
  if (m.includes("MSR") || m.includes("KP")) return "MSR";
  if (m.includes("AURORA") || m.includes("SFR") || m.includes("NATRIUM")) return "SFR";
  return "Other";
}

export default function PipelineView({ requestedVendor = "ALL" }) {
  const [vendorFilter, setVendorFilter] = useState("ALL");
  const [familyFilter, setFamilyFilter] = useState("ALL");

  const vendors = useMemo(() => {
    const set = new Set(smrSites.map((s) => s.vendor).filter(Boolean));
    return ["ALL", ...Array.from(set).sort()];
  }, []);

  useEffect(() => {
    if (vendors.includes(requestedVendor)) {
      setVendorFilter(requestedVendor);
    }
  }, [requestedVendor, vendors]);

  const families = ["ALL", "LWR", "HTGR", "MSR", "SFR", "Other"];

  const filtered = useMemo(() => {
    return smrSites.filter((s) => {
      if (vendorFilter !== "ALL" && s.vendor !== vendorFilter) return false;
      if (familyFilter !== "ALL" && reactorFamily(s.reactor_model) !== familyFilter) return false;
      return true;
    });
  }, [vendorFilter, familyFilter]);

  const byPhase = useMemo(() => {
    const buckets = Object.fromEntries(PHASES.map((p) => [p.id, []]));
    filtered.forEach((s) => buckets[bucketPhase(s.phase)].push(s));
    return buckets;
  }, [filtered]);

  return (
    <div className="pipeline-view">
      <div className="pipeline-filters">
        <label>
          <span>Vendor</span>
          <select value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)}>
            {vendors.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
        <label>
          <span>Reactor Type</span>
          <select value={familyFilter} onChange={(e) => setFamilyFilter(e.target.value)}>
            {families.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
        <span className="pipeline-count">{filtered.length} projects</span>
      </div>

      <div className="pipeline-board">
        {PHASES.map((phase) => (
          <div key={phase.id} className="pipeline-col">
            <div className="pipeline-col-head">
              <span>{phase.label}</span>
              <span className="pipeline-col-count">{byPhase[phase.id].length}</span>
            </div>
            <div className="pipeline-col-body">
              {byPhase[phase.id].map((site) => (
                <article key={site.site_id} className="pipeline-card">
                  <h3>{site.site_name}</h3>
                  <div className="pipeline-card-row"><span>Vendor</span><strong>{site.vendor || "--"}</strong></div>
                  <div className="pipeline-card-row"><span>Model</span><strong>{site.reactor_model || "--"}</strong></div>
                  <div className="pipeline-card-row"><span>MWe</span><strong>{site.capacity_mwe_total ? site.capacity_mwe_total.toLocaleString() : "--"}</strong></div>
                  <div className="pipeline-card-row"><span>COD</span><strong>{site.target_cod || "--"}</strong></div>
                  <div className="pipeline-card-row"><span>Host</span><strong>{site.owner || "--"} ({site.state})</strong></div>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
