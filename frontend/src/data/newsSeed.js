export const NEWS_TOPICS = ["ALL", "FUEL", "REGULATORY", "M&A", "SMR", "OUTAGE", "MACRO"];

export const NEWS_ITEMS = [
  {
    id: 1,
    minutesAgo: 3,
    source: "NRC",
    topic: "REGULATORY",
    headline: "NRC staff posts inspection update for multi-unit southern fleet",
    summary: "Routine resident-inspector notes flag no immediate operating restrictions.",
    tickers: ["DUK", "CEG"]
  },
  {
    id: 2,
    minutesAgo: 9,
    source: "WNN",
    topic: "SMR",
    headline: "Utility consortium adds a second site to advanced reactor screening list",
    summary: "Host-site evaluation now includes grid interconnection and cooling-water review.",
    tickers: ["SMR", "GEV"]
  },
  {
    id: 3,
    minutesAgo: 14,
    source: "Bloomberg",
    topic: "FUEL",
    headline: "Uranium spot indications firm as utilities extend term-market inquiries",
    summary: "Traders cite limited discretionary supply and renewed long-cycle procurement.",
    tickers: ["CCJ"]
  },
  {
    id: 4,
    minutesAgo: 19,
    source: "Reuters",
    topic: "OUTAGE",
    headline: "Midwest refueling window expected to tighten regional reserve margins",
    summary: "Operators say replacement power has been scheduled through day-ahead markets.",
    tickers: ["CEG", "VST"]
  },
  {
    id: 5,
    minutesAgo: 27,
    source: "Company",
    topic: "SMR",
    headline: "Reactor vendor completes factory-acceptance test for simulator platform",
    summary: "The milestone supports operator training and license-application readiness.",
    tickers: ["OKLO", "NNE"]
  },
  {
    id: 6,
    minutesAgo: 36,
    source: "DOE",
    topic: "MACRO",
    headline: "Loan office opens due-diligence phase for uprate and life-extension package",
    summary: "The package would support grid reliability in constrained load pockets.",
    tickers: ["CEG", "D"]
  },
  {
    id: 7,
    minutesAgo: 44,
    source: "NRC",
    topic: "REGULATORY",
    headline: "Advisory committee schedules public session on advanced fuel qualification",
    summary: "Agenda items include burnup limits, accident tolerance, and test-reactor data.",
    tickers: ["BWXT", "LEU"]
  },
  {
    id: 8,
    minutesAgo: 53,
    source: "WNN",
    topic: "FUEL",
    headline: "Conversion market remains tight as western enrichers publish delivery slots",
    summary: "Indicative offers continue to favor customers with bundled term commitments.",
    tickers: ["LEU", "CCJ"]
  },
  {
    id: 9,
    minutesAgo: 61,
    source: "Reuters",
    topic: "M&A",
    headline: "Infrastructure funds weigh minority stakes in merchant nuclear assets",
    summary: "Bankers point to data-center load growth and capacity-market scarcity.",
    tickers: ["TLN", "VST"]
  },
  {
    id: 10,
    minutesAgo: 74,
    source: "ISO",
    topic: "MACRO",
    headline: "PJM capacity strip strengthens after nuclear outage schedule update",
    summary: "Forward prices moved higher around peak-risk delivery months.",
    tickers: ["CEG", "TLN"]
  },
  {
    id: 11,
    minutesAgo: 87,
    source: "Company",
    topic: "OUTAGE",
    headline: "Plant operator reports turbine inspection complete ahead of restart sequence",
    summary: "Synchronization is expected after final chemistry and protection checks.",
    tickers: ["DUK"]
  },
  {
    id: 12,
    minutesAgo: 102,
    source: "Bloomberg",
    topic: "SMR",
    headline: "Advanced nuclear developers pitch behind-the-meter power to AI campuses",
    summary: "Prospective customers want firm clean power with staged capacity additions.",
    tickers: ["OKLO", "SMR", "NNE"]
  },
  {
    id: 13,
    minutesAgo: 118,
    source: "NRC",
    topic: "REGULATORY",
    headline: "Environmental review clock starts for uprate request at eastern station",
    summary: "The filing includes condenser, steam-generator, and grid-stability studies.",
    tickers: ["D"]
  },
  {
    id: 14,
    minutesAgo: 137,
    source: "WNN",
    topic: "FUEL",
    headline: "Enrichment buyers seek optionality as tails-assay assumptions shift lower",
    summary: "Fuel managers are balancing feed-cost exposure against SWU scarcity.",
    tickers: ["LEU"]
  },
  {
    id: 15,
    minutesAgo: 155,
    source: "Reuters",
    topic: "MACRO",
    headline: "State regulators question reserve margin assumptions in summer outlook",
    summary: "Nuclear availability is cited as a key swing factor for reliability.",
    tickers: ["DUK", "D"]
  },
  {
    id: 16,
    minutesAgo: 181,
    source: "Company",
    topic: "M&A",
    headline: "Merchant fleet owner extends strategic review for non-core generation assets",
    summary: "Management says nuclear assets remain central to long-term contracting plans.",
    tickers: ["VST", "TLN"]
  },
  {
    id: 17,
    minutesAgo: 204,
    source: "DOE",
    topic: "SMR",
    headline: "National lab signs memorandum for sodium fast reactor test campaign",
    summary: "The agreement covers instrumentation, materials surveillance, and data sharing.",
    tickers: ["OKLO"]
  },
  {
    id: 18,
    minutesAgo: 231,
    source: "NRC",
    topic: "OUTAGE",
    headline: "Special inspection closes after auxiliary-feedwater valve event",
    summary: "Corrective actions were accepted with follow-up sampling planned.",
    tickers: []
  },
  {
    id: 19,
    minutesAgo: 258,
    source: "Bloomberg",
    topic: "FUEL",
    headline: "Long-term uranium contracting volume rises as utilities rebuild coverage",
    summary: "Market participants report stronger interest in North American origin material.",
    tickers: ["CCJ"]
  },
  {
    id: 20,
    minutesAgo: 284,
    source: "Company",
    topic: "SMR",
    headline: "Microreactor developer selects manufacturing partner for heat-exchanger modules",
    summary: "The order supports first-of-a-kind component qualification.",
    tickers: ["NNE", "BWXT"]
  },
  {
    id: 21,
    minutesAgo: 315,
    source: "ISO",
    topic: "OUTAGE",
    headline: "ERCOT posts higher ancillary-service needs during nuclear maintenance week",
    summary: "Grid operators expect gas units and storage to cover the temporary gap.",
    tickers: ["VST"]
  },
  {
    id: 22,
    minutesAgo: 347,
    source: "Reuters",
    topic: "REGULATORY",
    headline: "Federal appeals court denies petition challenging license-renewal process",
    summary: "The decision leaves the current environmental-review framework intact.",
    tickers: ["CEG", "DUK", "D"]
  },
  {
    id: 23,
    minutesAgo: 381,
    source: "WNN",
    topic: "FUEL",
    headline: "Fabrication slots tighten for utilities requesting accident-tolerant lead assemblies",
    summary: "Vendors are sequencing pilot batches around outage schedules.",
    tickers: ["BWXT"]
  },
  {
    id: 24,
    minutesAgo: 418,
    source: "Bloomberg",
    topic: "MACRO",
    headline: "Clean firm power premiums widen in bilateral data-center negotiations",
    summary: "Buyers are paying more for 24-hour matching and congestion protection.",
    tickers: ["CEG", "TLN", "VST"]
  },
  {
    id: 25,
    minutesAgo: 456,
    source: "Company",
    topic: "OUTAGE",
    headline: "Operator advances refueling completion date after smooth vessel-closeout work",
    summary: "The site is moving into startup physics testing ahead of grid return.",
    tickers: ["D"]
  },
  {
    id: 26,
    minutesAgo: 492,
    source: "NRC",
    topic: "SMR",
    headline: "Regulator accepts topical report for modular reactor control-room staffing",
    summary: "The review will inform multi-module staffing assumptions in future applications.",
    tickers: ["SMR"]
  },
  {
    id: 27,
    minutesAgo: 530,
    source: "Reuters",
    topic: "M&A",
    headline: "Industrial customer explores direct investment in nuclear restart project",
    summary: "Parties are evaluating offtake structures tied to firm delivery profiles.",
    tickers: ["CEG"]
  },
  {
    id: 28,
    minutesAgo: 566,
    source: "DOE",
    topic: "MACRO",
    headline: "Grid study highlights nuclear uprates as near-term capacity option",
    summary: "Analysts cite existing interconnections as a key advantage over new build.",
    tickers: ["DUK", "CEG", "D"]
  },
  {
    id: 29,
    minutesAgo: 601,
    source: "WNN",
    topic: "SMR",
    headline: "High-temperature reactor vendor reports progress on graphite qualification",
    summary: "Material testing supports a planned construction-permit package.",
    tickers: ["BWXT", "GEV"]
  },
  {
    id: 30,
    minutesAgo: 642,
    source: "Bloomberg",
    topic: "FUEL",
    headline: "SWU term prices hold near cycle highs amid limited western supply",
    summary: "Procurement teams continue to value security of supply over spot optionality.",
    tickers: ["LEU"]
  },
  {
    id: 31,
    minutesAgo: 688,
    source: "NRC",
    topic: "REGULATORY",
    headline: "Licensee submits supplemental seismic analysis for coastal station",
    summary: "The supplement updates probabilistic-risk assumptions and walkdown results.",
    tickers: []
  },
  {
    id: 32,
    minutesAgo: 731,
    source: "Company",
    topic: "M&A",
    headline: "Generator signs preliminary term sheet for nuclear-backed power sale",
    summary: "The proposed deal would run through the next capacity-delivery year.",
    tickers: ["TLN"]
  },
  {
    id: 33,
    minutesAgo: 776,
    source: "Reuters",
    topic: "OUTAGE",
    headline: "Forced outage ends after switchyard repair at eastern nuclear plant",
    summary: "The unit returned to full power after transmission-equipment testing.",
    tickers: ["CEG"]
  },
  {
    id: 34,
    minutesAgo: 812,
    source: "DOE",
    topic: "SMR",
    headline: "Advanced reactor demonstration team adds fuel-cycle workstream",
    summary: "The workstream covers HALEU demand timing and contingency supply planning.",
    tickers: ["LEU", "OKLO"]
  },
  {
    id: 35,
    minutesAgo: 853,
    source: "Bloomberg",
    topic: "MACRO",
    headline: "Nuclear equities mixed as rate move offsets firm power-price outlook",
    summary: "Analysts say contract visibility remains the main sector differentiator.",
    tickers: ["CEG", "VST", "TLN", "DUK"]
  },
  {
    id: 36,
    minutesAgo: 897,
    source: "WNN",
    topic: "FUEL",
    headline: "Fuel buyers revisit inventory targets after geopolitical shipping disruption",
    summary: "Utilities are reviewing buffer-stock assumptions for conversion and enrichment.",
    tickers: ["CCJ", "LEU"]
  }
];
