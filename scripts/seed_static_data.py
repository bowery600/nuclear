from __future__ import annotations

import json
import os
import re
import unicodedata
from dataclasses import dataclass
from difflib import SequenceMatcher
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import pandas as pd
import psycopg
from dotenv import load_dotenv


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"

HIFLD_LAYER_URL = (
    "https://services.arcgis.com/XG15cJAlne2vxtgt/ArcGIS/rest/services/"
    "Power_Plants/FeatureServer/0/query"
)
NRC_OPERATING_REACTORS_URL = "https://www.nrc.gov/reactors/operating/list-power-reactor-units"

COMPANY_BY_NRC_OWNER = {
    "Arizona Public Service Co.": ("PNW", "Pinnacle West Capital Corporation"),
    "Ameren UE": ("AEE", "Ameren Corporation"),
    "Constellation Energy Generation, LLC": ("CEG", "Constellation Energy Corporation"),
    "DTE Electric Company": ("DTE", "DTE Energy Company"),
    "Dominion Generation": ("D", "Dominion Energy, Inc."),
    "Duke Energy Carolinas, LLC": ("DUK", "Duke Energy Corporation"),
    "Duke Energy Progress, LLC": ("DUK", "Duke Energy Corporation"),
    "Energy Harbor Nuclear Corp.": ("VST", "Vistra Corp."),
    "Energy Northwest": ("ENW", "Energy Northwest"),
    "Entergy Nuclear Operations, Inc.": ("ETR", "Entergy Corporation"),
    "FirstEnergy Nuclear Operating Co.": ("VST", "Vistra Corp."),
    "Florida Power & Light Co.": ("NEE", "NextEra Energy, Inc."),
    "Holtec Palisades, LLC": ("HOLTEC", "Holtec International"),
    "Indiana/Michigan Power Co.": ("AEP", "American Electric Power Company, Inc."),
    "Nebraska Public Power District": ("NPPD", "Nebraska Public Power District"),
    "NextEra Energy Point Beach, LLC": ("NEE", "NextEra Energy, Inc."),
    "NextEra Energy Seabrook, LLC": ("NEE", "NextEra Energy, Inc."),
    "Northern States Power Company - Minnesota": ("XEL", "Xcel Energy Inc."),
    "Pacific Gas & Electric Co.": ("PCG", "PG&E Corporation"),
    "PSEG Nuclear, LLC": ("PEG", "Public Service Enterprise Group Incorporated"),
    "South Carolina Electric & Gas Co.": ("D", "Dominion Energy, Inc."),
    "Southern Nuclear Operating Co.": ("SO", "The Southern Company"),
    "Southern Nuclear Operating Co., Inc.": ("SO", "The Southern Company"),
    "STP Nuclear Operating Co.": ("STP", "STP Nuclear Operating Company"),
    "Susquehanna Nuclear, LLC": ("TLN", "Talen Energy Corporation"),
    "Tennessee Valley Authority": ("TVA", "Tennessee Valley Authority"),
    "Vistra Corporation": ("VST", "Vistra Corp."),
    "Vistra Operations Company, LLC": ("VST", "Vistra Corp."),
    "Wolf Creek Nuclear Operating Corp.": ("WCNOC", "Wolf Creek Nuclear Operating Corporation"),
}

HIFLD_SITE_ALIASES = {
    "ARKANSAS NUCLEAR ONE": "ARKANSAS NUCLEAR",
    "BRAIDWOOD GENERATION STATION": "BRAIDWOOD",
    "BYRON GENERATING STATION": "BYRON",
    "CALVERT CLIFFS NUCLEAR POWER PLANT": "CALVERT CLIFFS",
    "CLINTON POWER STATION": "CLINTON",
    "DONALD C COOK": "COOK",
    "DRESDEN GENERATING STATION": "DRESDEN",
    "GRAND GULF": "GRAND GULF",
    "HARRIS": "SHEARON HARRIS",
    "JAMES A FITZPATRICK": "FITZPATRICK",
    "JOSEPH M FARLEY": "FARLEY",
    "LASALLE GENERATING STATION": "LA SALLE",
    "NINE MILE POINT NUCLEAR STATION": "NINE MILE POINT",
    "PLANT EDWIN I HATCH": "HATCH",
    "PPL SUSQUEHANNA": "SUSQUEHANNA",
    "PSEG HOPE CREEK GENERATING STATION": "HOPE CREEK",
    "QUAD CITIES GENERATING STATION": "QUAD CITIES",
    "R E GINNA NUCLEAR POWER PLANT": "GINNA",
    "ST LUCIE": "SAINT LUCIE",
    "V C SUMMER": "SUMMER",
    "WATTS BAR NUCLEAR PLANT": "WATTS BAR",
    "WOLF CREEK GENERATING STATION": "WOLF CREEK",
}

HIFLD_OPERATOR_TICKER_KEYWORDS = {
    "ALABAMA POWER": "SO",
    "ARIZONA PUBLIC SERVICE": "PNW",
    "CALVERT CLIFFS": "CEG",
    "DOMINION": "D",
    "DUKE": "DUK",
    "ENTERGY": "ETR",
    "EXELON": "CEG",
    "FIRSTENERGY": "VST",
    "FLORIDA POWER LIGHT": "NEE",
    "GEORGIA POWER": "SO",
    "INDIANA MICHIGAN POWER": "AEP",
    "LUMINANT": "VST",
    "NEXTERA": "NEE",
    "NORTHERN STATES POWER": "XEL",
    "PACIFIC GAS ELECTRIC": "PCG",
    "PPL SUSQUEHANNA": "TLN",
    "PROGRESS": "DUK",
    "PSEG": "PEG",
    "SOUTH CAROLINA ELECTRIC GAS": "D",
    "SYSTEM ENERGY RESOURCES": "ETR",
    "TENNESSEE VALLEY AUTHORITY": "TVA",
    "THE DTE ELECTRIC": "DTE",
    "UNION ELECTRIC": "AEE",
    "VIRGINIA ELECTRIC POWER": "D",
    "WOLF CREEK": "WCNOC",
}


@dataclass(frozen=True)
class MatchedSite:
    hifld: pd.Series
    nrc_site_name: str
    nrc_owner_operator: str
    nrc_reactor_count: int
    company_ticker: str
    parent_company_name: str
    match_score: float


def fetch_json(url: str, params: dict[str, str]) -> dict:
    full_url = f"{url}?{urlencode(params)}"
    request = Request(full_url, headers={"User-Agent": "nuclear-static-seed/1.0"})
    with urlopen(request, timeout=60) as response:
        return json.loads(response.read().decode("utf-8"))


def download_hifld_power_plants() -> pd.DataFrame:
    features = []
    offset = 0
    page_size = 2000

    while True:
        payload = fetch_json(
            HIFLD_LAYER_URL,
            {
                "where": "1=1",
                "outFields": "*",
                "returnGeometry": "true",
                "f": "json",
                "orderByFields": "NAME",
                "resultOffset": str(offset),
                "resultRecordCount": str(page_size),
            },
        )
        page_features = payload.get("features", [])
        features.extend(page_features)
        if len(page_features) < page_size:
            break
        offset += page_size

    if not features:
        raise RuntimeError("HIFLD returned no power plant records.")

    rows = []
    for feature in features:
        attrs = feature["attributes"]
        geometry = feature.get("geometry") or {}
        attrs["geometry_x"] = geometry.get("x")
        attrs["geometry_y"] = geometry.get("y")
        rows.append(attrs)

    df = pd.DataFrame(rows)
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    (RAW_DIR / "hifld_power_plants.json").write_text(
        json.dumps({"features": features}, indent=2),
        encoding="utf-8",
    )
    df.to_csv(RAW_DIR / "hifld_power_plants.csv", index=False)
    return df


def download_nrc_operating_reactors() -> pd.DataFrame:
    tables = pd.read_html(NRC_OPERATING_REACTORS_URL)
    if not tables:
        raise RuntimeError("NRC operating reactors page did not contain any tables.")

    df = tables[0]
    if len(df.columns) == 6 and str(df.columns[0]) == "Plant Name Docket Number":
        plant_and_docket = df.iloc[:, 0].astype(str).str.extract(r"^(?P<plant_name>.+?)\s+(?P<docket_number>\d{8})$")
        df.insert(0, "plant_name", plant_and_docket["plant_name"])
        df.insert(1, "docket_number", plant_and_docket["docket_number"])
        df = df.drop(columns=[df.columns[2]])

    df.columns = [
        "plant_name",
        "docket_number",
        "license_number",
        "reactor_type",
        "location",
        "owner_operator",
        "nrc_region",
    ]
    df = df.dropna(subset=["plant_name", "owner_operator"]).copy()
    df["plant_name"] = df["plant_name"].astype(str).str.strip()
    df["owner_operator"] = df["owner_operator"].astype(str).str.strip()

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    df.to_csv(RAW_DIR / "nrc_operating_reactor_units.csv", index=False)
    return df


def canonical_text(value: str) -> str:
    text = unicodedata.normalize("NFKD", value or "").encode("ascii", "ignore").decode("ascii")
    text = text.upper()
    text = re.sub(r"\bNUCLEAR\b|\bPOWER\b|\bPLANT\b|\bSTATION\b|\bGENERATING\b", " ", text)
    text = re.sub(r"\bGENERATION\b|\bENERGY\b|\bCENTER\b|\bPROJECT\b", " ", text)
    text = re.sub(r"\bUNIT\b|\bNO\b", " ", text)
    text = re.sub(r"\b[0-9]+\b", " ", text)
    text = re.sub(r"[^A-Z0-9]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def nrc_site_name(reactor_name: str) -> str:
    text = re.sub(r"\s+[0-9]+$", "", reactor_name.strip())
    text = text.replace("Arkansas Nuclear One", "Arkansas Nuclear")
    return text


def choose_site_owner(owners: pd.Series) -> str:
    owner_counts = owners.value_counts()
    return str(owner_counts.index[0])


def build_nrc_sites(units: pd.DataFrame) -> pd.DataFrame:
    df = units.copy()
    df["site_name"] = df["plant_name"].map(nrc_site_name)
    sites = (
        df.groupby("site_name", as_index=False)
        .agg(
            nrc_reactor_count=("plant_name", "count"),
            nrc_owner_operator=("owner_operator", choose_site_owner),
        )
        .sort_values("site_name")
        .reset_index(drop=True)
    )
    sites["canonical_site_name"] = sites["site_name"].map(canonical_text)
    return sites


def numeric_value(value: object, default: float = 0.0) -> float:
    if value is None or pd.isna(value):
        return default
    return float(value)


def name_match_score(hifld_name: str, nrc_name: str) -> float:
    aliased_name = HIFLD_SITE_ALIASES.get(hifld_name, hifld_name)
    canonical_hifld = canonical_text(aliased_name)
    canonical_nrc = canonical_text(nrc_name)

    if canonical_hifld == canonical_nrc:
        return 1.0
    if canonical_hifld in canonical_nrc or canonical_nrc in canonical_hifld:
        return 0.95
    return SequenceMatcher(None, canonical_hifld, canonical_nrc).ratio()


def map_company(nrc_owner_operator: str) -> tuple[str, str]:
    nrc_owner_operator = nrc_owner_operator.replace("\u2013", "-").replace("\u2014", "-")
    if nrc_owner_operator not in COMPANY_BY_NRC_OWNER:
        raise KeyError(f"No company mapping for NRC owner/operator: {nrc_owner_operator}")
    return COMPANY_BY_NRC_OWNER[nrc_owner_operator]


def hifld_operator_ticker(operator_name: str) -> str | None:
    canonical_operator = canonical_text(operator_name)
    for keyword, ticker in HIFLD_OPERATOR_TICKER_KEYWORDS.items():
        if keyword in canonical_operator:
            return ticker
    return None


def find_hifld_match(
    nrc_site: pd.Series,
    company_ticker: str,
    hifld: pd.DataFrame,
    used_plant_codes: set[str],
) -> tuple[pd.Series, float] | None:
    best_row = None
    best_score = 0.0
    nrc_name = str(nrc_site["site_name"])

    for _, row in hifld.iterrows():
        plant_code = str(row.get("PLANT_CODE") or "")
        if plant_code in used_plant_codes:
            continue

        capacity = numeric_value(row.get("OPER_CAP"))
        if capacity <= 0:
            continue

        hifld_name = str(row.get("NAME") or "")
        score = name_match_score(hifld_name, nrc_name)
        if score < 0.58:
            continue

        operator_ticker = hifld_operator_ticker(str(row.get("OPERATOR") or ""))
        operator_score = 1.0 if operator_ticker == company_ticker else 0.0
        nuclear_bonus = 0.04 if (
            str(row.get("PRIMARY_FU") or "") == "NUC"
            or "NUCLEAR" in str(row.get("NAICS_DESC") or "").upper()
        ) else 0.0
        combined_score = (score * 0.86) + (operator_score * 0.10) + nuclear_bonus

        if combined_score > best_score:
            best_score = combined_score
            best_row = row

    if best_row is None or best_score < 0.70:
        return None

    return best_row, best_score


def build_matched_sites(hifld: pd.DataFrame, nrc_units: pd.DataFrame) -> list[MatchedSite]:
    nrc_sites = build_nrc_sites(nrc_units)
    matches: list[MatchedSite] = []
    review_rows = []
    used_plant_codes: set[str] = set()

    for _, site in nrc_sites.iterrows():
        nrc_name = str(site["site_name"])
        nrc_owner_operator = str(site["nrc_owner_operator"])
        nrc_reactor_count = int(site["nrc_reactor_count"])
        ticker, parent_name = map_company(nrc_owner_operator)
        match = find_hifld_match(site, ticker, hifld, used_plant_codes)
        if match is None:
            review_rows.append(
                {
                    "nrc_site_name": nrc_name,
                    "nrc_owner_operator": nrc_owner_operator,
                    "parent_company_name": parent_name,
                    "status": "needs_hifld_match",
                }
            )
            continue

        hifld_row, match_score = match
        used_plant_codes.add(str(hifld_row["PLANT_CODE"]))
        matches.append(
            MatchedSite(
                hifld=hifld_row,
                nrc_site_name=nrc_name,
                nrc_owner_operator=nrc_owner_operator,
                nrc_reactor_count=nrc_reactor_count,
                company_ticker=ticker,
                parent_company_name=parent_name,
                match_score=match_score,
            )
        )
        review_rows.append(
            {
                "hifld_name": hifld_row.get("NAME"),
                "nrc_site_name": nrc_name,
                "nrc_owner_operator": nrc_owner_operator,
                "parent_company_name": parent_name,
                "hifld_operator": hifld_row.get("OPERATOR"),
                "hifld_primary_fuel": hifld_row.get("PRIMARY_FU"),
                "hifld_plant_code": hifld_row.get("PLANT_CODE"),
                "match_score": round(match_score, 3),
                "status": "matched",
            }
        )

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    review = pd.DataFrame(review_rows)
    review.to_csv(PROCESSED_DIR / "static_seed_match_review.csv", index=False)
    review[review["status"] == "matched"].to_csv(PROCESSED_DIR / "operating_nuclear_plants_seed.csv", index=False)
    return matches


def upsert_company(cur: psycopg.Cursor, ticker: str, parent_company_name: str) -> int:
    cur.execute(
        """
        INSERT INTO companies (stock_ticker, parent_company_name)
        VALUES (%s, %s)
        ON CONFLICT (stock_ticker) DO UPDATE
        SET parent_company_name = EXCLUDED.parent_company_name
        RETURNING id
        """,
        (ticker, parent_company_name),
    )
    return int(cur.fetchone()[0])


def upsert_plant(cur: psycopg.Cursor, match: MatchedSite, company_id: int) -> None:
    h = match.hifld
    latitude = h.get("LATITUDE") or h.get("geometry_y")
    longitude = h.get("LONGITUDE") or h.get("geometry_x")
    plant_code = str(h["PLANT_CODE"])

    cur.execute(
        """
        INSERT INTO plants (
            company_id,
            plant_name,
            latitude,
            longitude,
            total_mw_capacity,
            source_plant_code,
            state,
            operator_name,
            primary_fuel,
            nrc_owner_operator,
            nrc_reactor_count,
            hifld_source,
            nrc_source
        )
        VALUES (
            %(company_id)s,
            %(plant_name)s,
            %(latitude)s,
            %(longitude)s,
            %(total_mw_capacity)s,
            %(source_plant_code)s,
            %(state)s,
            %(operator_name)s,
            %(primary_fuel)s,
            %(nrc_owner_operator)s,
            %(nrc_reactor_count)s,
            %(hifld_source)s,
            %(nrc_source)s
        )
        ON CONFLICT (source_plant_code) DO UPDATE
        SET
            company_id = EXCLUDED.company_id,
            plant_name = EXCLUDED.plant_name,
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            total_mw_capacity = EXCLUDED.total_mw_capacity,
            state = EXCLUDED.state,
            operator_name = EXCLUDED.operator_name,
            primary_fuel = EXCLUDED.primary_fuel,
            nrc_owner_operator = EXCLUDED.nrc_owner_operator,
            nrc_reactor_count = EXCLUDED.nrc_reactor_count,
            hifld_source = EXCLUDED.hifld_source,
            nrc_source = EXCLUDED.nrc_source
        """,
        {
            "company_id": company_id,
            "plant_name": match.nrc_site_name,
            "latitude": latitude,
            "longitude": longitude,
            "total_mw_capacity": h["OPER_CAP"],
            "source_plant_code": plant_code,
            "state": h.get("STATE"),
            "operator_name": h.get("OPERATOR"),
            "primary_fuel": h.get("PRIMARY_FU"),
            "nrc_owner_operator": match.nrc_owner_operator,
            "nrc_reactor_count": match.nrc_reactor_count,
            "hifld_source": HIFLD_LAYER_URL,
            "nrc_source": NRC_OPERATING_REACTORS_URL,
        },
    )


def seed_database(matches: list[MatchedSite]) -> None:
    load_dotenv(PROJECT_ROOT / ".env")
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise SystemExit("DATABASE_URL is required. Copy .env.example to .env first.")

    with psycopg.connect(database_url, prepare_threshold=None) as conn:
        with conn.cursor() as cur:
            for match in matches:
                company_id = upsert_company(cur, match.company_ticker, match.parent_company_name)
                upsert_plant(cur, match, company_id)
        conn.commit()


def main() -> None:
    hifld = download_hifld_power_plants()
    nrc_units = download_nrc_operating_reactors()
    matches = build_matched_sites(hifld, nrc_units)
    seed_database(matches)
    print(f"Seeded {len(matches)} operating nuclear plant sites.")
    print(f"Wrote review file: {PROCESSED_DIR / 'static_seed_match_review.csv'}")


if __name__ == "__main__":
    main()
