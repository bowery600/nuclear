/**
 * Historical Nuclear Fleet Timeline Simulation Config and Logic
 * Covers 1950s to 2050s, representing fleet growth, consolidation, uprates, and decommissioning.
 */

export const TIMELINE_START_YEAR = 1950;
export const TIMELINE_END_YEAR = 2050;
export const DEFAULT_YEAR = 2026; // Present

export const TIMELINE_EVENTS = [
  {
    startYear: 1950,
    endYear: 1964,
    title: "Dawn of the Atomic Age",
    category: "pioneer",
    description: "The US Atomic Energy Commission launches the Power Reactor Demonstration Program. Pioneers like Shippingport and Dresden Unit 1 prove the commercial viability of nuclear steam supply systems, laying the groundwork for a massive infrastructure boom."
  },
  {
    startYear: 1965,
    endYear: 1975,
    title: "The Great Bandwagon Era",
    category: "boom",
    description: "Utility companies order dozens of reactors as electricity demand skyrockets. Giants like Ginna, Nine Mile Point, Browns Ferry, and Peach Bottom are commissioned. Construction sites hum nationwide as nuclear becomes a key player in American power generation."
  },
  {
    startYear: 1976,
    endYear: 1985,
    title: "Peak Construction & Regulatory Shifts",
    category: "regulatory",
    description: "Dozens of large units go online. In 1979, the Three Mile Island accident halts new reactor orders and prompts a massive overhaul in NRC safety standards. While new orders freeze, plants currently under construction are completed with highly enhanced safety retrofits."
  },
  {
    startYear: 1986,
    endYear: 1997,
    title: "Completing the First Generation",
    category: "completion",
    description: "The boom winds down as utilities complete reactors already in the pipeline. Watts Bar Unit 1 (1996) is the final US commercial reactor commissioned in the 20th century, cementing a fleet of over 100 operating reactors that anchor the baseline grid."
  },
  {
    startYear: 1998,
    endYear: 2005,
    title: "Deregulation & Fleet Consolidation",
    category: "merger",
    description: "Electricity market deregulation sweeps the country. Local utilities merge or sell nuclear assets to specialized merchants. ComEd and PECO merge to form Exelon in 2000. Large consolidators like Constellation and Entergy emerge, creating massive operational efficiencies."
  },
  {
    startYear: 2006,
    endYear: 2015,
    title: "Renaissance, Extensions & Uprates",
    category: "optimize",
    description: "Instead of building new plants, operators optimize existing assets. The NRC approves extensive 'Power Uprates', boosting reactor thermal capacity by 10-15% fleet-wide. Simultaneously, plants secure 20-year license extensions, shifting expiration from 40 to 60 years."
  },
  {
    startYear: 2016,
    endYear: 2025,
    title: "Clean Energy Grid Anchor",
    category: "modern",
    description: "Cheap natural gas and market design issues lead to some early retirements, but state and federal policies step in with production tax credits, recognizing nuclear as an irreplaceable, carbon-free, 24/7 anchor for the decarbonizing electric grid."
  },
  {
    startYear: 2026,
    endYear: 2035,
    title: "The SMR Era & Data Center Power",
    category: "next-gen",
    description: "Artificial Intelligence and data center power demands spark a nuclear renaissance. Constellation signs major direct-supply deals, Palisades undergoes a historic recommissioning, and utilities prepare for next-generation Small Modular Reactors (SMRs) and 80-year license extensions."
  },
  {
    startYear: 2036,
    endYear: 2050,
    title: "The Next Horizon",
    category: "future",
    description: "A dual track unfolds. While early 1970s reactors reach the end of their second license extensions and undergo phased, highly structured decommissioning, a wave of advanced micro-reactors and utility-scale SMR fleets take their place on the grid."
  }
];

/**
 * Dynamic mapping function to return historical plant details.
 * Implements:
 * 1. Fleet Growth: Plants are hidden before commission_year - 5, "Under Construction" (planned) from commission_year - 5 to commission_year, and "Active" after.
 * 2. Decommissioning: Plants are marked "Decommissioned" (slate gray, 0 output) if year > license_expiration_year.
 * 3. Shifting Ownership: Realistic mergers PECO/ComEd -> Exelon -> Constellation, CP&L -> Progress -> Duke, FirstEnergy -> Energy Harbor -> Vistra.
 * 4. Capacity Optimization: Fleet power uprate campaigns in late 90s/2000s, growing from 88% to 100% capacity.
 */
export function getHistoricalPlantProperties(feature, year) {
  const originalProps = feature.properties || {};
  const commYear = Number(originalProps.commission_year) || 1980;
  const expYear = Number(originalProps.license_expiration_year) || 2040;
  const baseCapacity = Number(originalProps.total_mw_capacity) || 1000;
  const baseOutput = Number(originalProps.current_mw_output) || 900;
  const basePrice = Number(originalProps.current_power_cost_usd_mwh) || 30;

  // 1 & 2. Determine Timeline Status
  let timelineStatus = "Active";
  if (year < commYear - 5) {
    timelineStatus = "Planned"; // hidden from view
  } else if (year < commYear) {
    timelineStatus = "Construction"; // faint pulsing schematic dot
  } else if (year > expYear) {
    timelineStatus = "Decommissioned"; // slate gray, retired
  }

  // 3. Optimize Capacity (Power Uprate Campaign, 1998-2008)
  let capacityFactor = 1.0;
  if (year < 1998) {
    capacityFactor = 0.88; // Lower pre-uprate capacity
  } else if (year >= 1998 && year < 2008) {
    // Linear progression of power uprates
    const t = (year - 1998) / 10;
    capacityFactor = 0.88 + t * 0.12;
  }

  const simulatedCapacity = baseCapacity * capacityFactor;

  // Calculate Output and Capacity Percentage based on status
  let simulatedOutput = 0;
  let simulatedCapacityPercent = 0;

  if (timelineStatus === "Active") {
    // Retain live fluctuations from the parent app but scale by our historical capacity factor
    const percentage = Number(originalProps.capacity_percentage) || 90;
    simulatedOutput = (simulatedCapacity * percentage) / 100;
    simulatedCapacityPercent = percentage;
  } else if (timelineStatus === "Construction") {
    simulatedOutput = 0;
    simulatedCapacityPercent = 0;
  } else if (timelineStatus === "Decommissioned") {
    simulatedOutput = 0;
    simulatedCapacityPercent = 0;
  }

  // 4. Shifting Ownership & Corporate Mergers
  let parentCompany = originalProps.parent_company_name || "Unknown Owner";
  let stockTicker = originalProps.stock_ticker || "PRIVATE";
  const originalTicker = String(originalProps.stock_ticker || "").toUpperCase();

  if (originalTicker === "CEG") {
    // Constellation Energy Generation
    const name = originalProps.plant_name || "";
    if (year < 2000) {
      if (name.includes("Limerick") || name.includes("Peach Bottom")) {
        parentCompany = "PECO Energy Company";
        stockTicker = "PECO";
      } else if (name.includes("Calvert") || name.includes("Nine Mile") || name.includes("Ginna")) {
        parentCompany = "Baltimore Gas & Electric";
        stockTicker = "BGE";
      } else if (name.includes("Clinton")) {
        parentCompany = "Illinois Power Company";
        stockTicker = "IPC";
      } else {
        parentCompany = "Commonwealth Edison Company";
        stockTicker = "CWE";
      }
    } else if (year >= 2000 && year < 2022) {
      parentCompany = "Exelon Corporation";
      stockTicker = "EXC";
    } else {
      parentCompany = "Constellation Energy Corporation";
      stockTicker = "CEG";
    }
  } else if (originalTicker === "VST") {
    // Vistra
    const name = originalProps.plant_name || "";
    if (name.includes("Comanche")) {
      if (year < 2016) {
        parentCompany = "Luminant (TXU Corp)";
        stockTicker = "TXU";
      } else {
        parentCompany = "Vistra Corp.";
        stockTicker = "VST";
      }
    } else {
      // Beaver Valley, Davis-Besse, Perry (FirstEnergy -> Energy Harbor -> Vistra)
      if (year < 2020) {
        parentCompany = "FirstEnergy Corp.";
        stockTicker = "FE";
      } else if (year >= 2020 && year < 2024) {
        parentCompany = "Energy Harbor Corp.";
        stockTicker = "EH";
      } else {
        parentCompany = "Vistra Corp.";
        stockTicker = "VST";
      }
    }
  } else if (originalTicker === "DUK") {
    // Duke Energy
    const name = originalProps.plant_name || "";
    if (name.includes("Brunswick") || name.includes("Harris") || name.includes("Robinson")) {
      if (year < 2000) {
        parentCompany = "Carolina Power & Light";
        stockTicker = "CPL";
      } else if (year >= 2000 && year < 2012) {
        parentCompany = "Progress Energy Inc.";
        stockTicker = "PGN";
      } else {
        parentCompany = "Duke Energy Corporation";
        stockTicker = "DUK";
      }
    } else {
      // McGuire, Oconee, Catawba are historical Duke assets
      parentCompany = "Duke Energy Corporation";
      stockTicker = "DUK";
    }
  } else if (originalTicker === "D") {
    // Dominion Energy
    const name = originalProps.plant_name || "";
    if (name.includes("Millstone")) {
      if (year < 2001) {
        parentCompany = "Northeast Utilities";
        stockTicker = "NU";
      } else {
        parentCompany = "Dominion Energy, Inc.";
        stockTicker = "D";
      }
    } else if (name.includes("Summer")) {
      if (year < 2019) {
        parentCompany = "SCANA Corporation";
        stockTicker = "SCG";
      } else {
        parentCompany = "Dominion Energy, Inc.";
        stockTicker = "D";
      }
    } else {
      parentCompany = "Dominion Energy, Inc.";
      stockTicker = "D";
    }
  }

  // Adjust power costs (LMP) slightly based on historical inflation/market trends (lower in the past)
  let simulatedPrice = basePrice;
  if (timelineStatus === "Active") {
    if (year < 1980) {
      simulatedPrice = basePrice * 0.4;
    } else if (year < 2000) {
      simulatedPrice = basePrice * 0.65;
    } else if (year < 2015) {
      simulatedPrice = basePrice * 0.9;
    }
  } else {
    simulatedPrice = 0;
  }

  return {
    ...originalProps,
    timelineStatus,
    total_mw_capacity: simulatedCapacity,
    current_mw_output: simulatedOutput,
    capacity_percentage: simulatedCapacityPercent,
    parent_company_name: parentCompany,
    stock_ticker: stockTicker,
    current_power_cost_usd_mwh: simulatedPrice
  };
}
