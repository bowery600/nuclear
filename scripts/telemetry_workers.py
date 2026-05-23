from __future__ import annotations

import argparse
import inspect
import json
import os
import re
import time
import unicodedata
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any
from urllib.parse import urljoin
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

import pandas as pd
import psycopg
from dotenv import load_dotenv


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / "data"
PROCESSED_DIR = DATA_DIR / "processed"

NRC_REACTOR_STATUS_PAGE = "https://www.nrc.gov/reading-rm/doc-collections/event-status/reactor-status/"
NRC_POWER_STATUS_URL = (
    "https://www.nrc.gov/reading-rm/doc-collections/event-status/reactor-status/"
    "PowerReactorStatusForLast365Days.txt"
)
NRC_REPORT_TIMEZONE = ZoneInfo("America/New_York")


@dataclass(frozen=True)
class Plant:
    id: int
    plant_name: str
    state: str | None
    total_mw_capacity: Decimal
    source_plant_code: str | None


@dataclass(frozen=True)
class NRCUnitStatus:
    observed_at: datetime
    unit_name: str
    site_name: str
    power_percentage: Decimal


@dataclass(frozen=True)
class PlantNRCStatus:
    plant: Plant
    observed_at: datetime
    capacity_percentage: Decimal
    realtime_output_mw: Decimal
    unit_count: int


@dataclass(frozen=True)
class GridNode:
    iso_code: str
    location: str
    location_type: str | None
    market: str


@dataclass(frozen=True)
class PlantLMP:
    plant: Plant
    observed_at: datetime
    price_usd_mwh: Decimal
    node: GridNode


PLANT_MARKET_DEFAULTS = {
    "arkansas": GridNode("MISO", "ARKANSAS.HUB", "Hub", "REAL_TIME_5_MIN"),
    "callaway": GridNode("MISO", "ILLINOIS.HUB", "Hub", "REAL_TIME_5_MIN"),
    "clinton": GridNode("MISO", "ILLINOIS.HUB", "Hub", "REAL_TIME_5_MIN"),
    "cook": GridNode("MISO", "MICHIGAN.HUB", "Hub", "REAL_TIME_5_MIN"),
    "cooper": GridNode("SPP", "SPPNORTH_HUB", "hub", "REAL_TIME_5_MIN"),
    "d c cook": GridNode("MISO", "MICHIGAN.HUB", "Hub", "REAL_TIME_5_MIN"),
    "fermi": GridNode("MISO", "MICHIGAN.HUB", "Hub", "REAL_TIME_5_MIN"),
    "grand gulf": GridNode("MISO", "MS.HUB", "Hub", "REAL_TIME_5_MIN"),
    "monticello": GridNode("MISO", "MINN.HUB", "Hub", "REAL_TIME_5_MIN"),
    "palisades": GridNode("MISO", "MICHIGAN.HUB", "Hub", "REAL_TIME_5_MIN"),
    "point beach": GridNode("MISO", "MICHIGAN.HUB", "Hub", "REAL_TIME_5_MIN"),
    "prairie island": GridNode("MISO", "MINN.HUB", "Hub", "REAL_TIME_5_MIN"),
    "river bend": GridNode("MISO", "LOUISIANA.HUB", "Hub", "REAL_TIME_5_MIN"),
    "south texas": GridNode("ERCOT", "HB_SOUTH", "Trading Hub", "REAL_TIME_15_MIN"),
    "waterford": GridNode("MISO", "LOUISIANA.HUB", "Hub", "REAL_TIME_5_MIN"),
    "wolf creek": GridNode("SPP", "SPPNORTH_HUB", "hub", "REAL_TIME_5_MIN"),
}

STATE_MARKET_DEFAULTS = {
    "IL": GridNode("PJM", "51217", None, "REAL_TIME_5_MIN"),
    "MD": GridNode("PJM", "51217", None, "REAL_TIME_5_MIN"),
    "NJ": GridNode("PJM", "51217", None, "REAL_TIME_5_MIN"),
    "OH": GridNode("PJM", "51217", None, "REAL_TIME_5_MIN"),
    "PA": GridNode("PJM", "51217", None, "REAL_TIME_5_MIN"),
    "VA": GridNode("PJM", "51217", None, "REAL_TIME_5_MIN"),
    "TX": GridNode("ERCOT", "HB_NORTH", "Trading Hub", "REAL_TIME_15_MIN"),
    "NY": GridNode("NYISO", "CENTRL", None, "REAL_TIME_5_MIN"),
}

TIME_COLUMNS = (
    "time",
    "interval start",
    "interval_start",
    "timestamp",
    "datetime",
    "interval begin",
    "interval_begin",
)
LMP_COLUMNS = (
    "lmp",
    "total lmp",
    "total_lmp",
    "price",
    "spp",
    "settlement point price",
    "settlement_point_price",
)
LOCATION_COLUMNS = (
    "location",
    "location name",
    "location_name",
    "pnode",
    "pnode name",
    "pnode_name",
    "settlement point",
    "settlement_point",
)


def database_url() -> str:
    load_dotenv(PROJECT_ROOT / ".env")
    url = os.getenv("DATABASE_URL")
    if not url:
        raise SystemExit("DATABASE_URL is required. Copy .env.example to .env first.")
    return url


def fetch_text(url: str, attempts: int = 3) -> str:
    import subprocess
    last_error: Exception | None = None
    for attempt in range(1, attempts + 1):
        try:
            print(f"Fetching via curl.exe (attempt {attempt}): {url}")
            result = subprocess.run(
                [
                    "curl.exe",
                    "-sL",
                    "-m",
                    "30",
                    "-A",
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    url,
                ],
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
            )
            if result.returncode == 0 and result.stdout.strip():
                return result.stdout
            raise RuntimeError(f"curl.exe failed with code {result.returncode}: {result.stderr}")
        except Exception as exc:
            last_error = exc
            if attempt < attempts:
                time.sleep(2 * attempt)
    raise RuntimeError(f"Failed to fetch {url} via curl: {last_error}") from last_error


def resolve_nrc_power_status_url() -> str:
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        return NRC_POWER_STATUS_URL

    try:
        html = fetch_text(NRC_REACTOR_STATUS_PAGE)
    except RuntimeError:
        return NRC_POWER_STATUS_URL

    soup = BeautifulSoup(html, "html.parser")
    for link in soup.find_all("a", href=True):
        label = " ".join(link.get_text(" ", strip=True).split()).lower()
        if "power" in label and "status" in label and "raw data" in label:
            return urljoin(NRC_REACTOR_STATUS_PAGE, link["href"])
    return NRC_POWER_STATUS_URL


def canonical_site_key(value: str) -> str:
    text = unicodedata.normalize("NFKD", value or "").encode("ascii", "ignore").decode("ascii")
    text = text.upper().replace("&", " AND ")
    text = re.sub(r"\bNUCLEAR\b|\bPOWER\b|\bPLANT\b|\bSTATION\b|\bGENERATING\b", " ", text)
    text = re.sub(r"\bGENERATION\b|\bENERGY\b|\bCENTER\b|\bUNIT\b|\bNO\b", " ", text)
    text = re.sub(r"\b[0-9]+\b", " ", text)
    text = re.sub(r"[^A-Z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def nrc_site_name(unit_name: str) -> str:
    name = " ".join(unit_name.replace("\r", " ").replace("\n", " ").split())
    name = re.sub(r"\s+[0-9]+$", "", name).strip()
    return name.replace("Arkansas Nuclear One", "Arkansas Nuclear")


def parse_nrc_power_status(text: str) -> list[NRCUnitStatus]:
    text = text.replace("\ufeff", "")
    date_pattern = r"\d{1,2}/\d{1,2}/\d{4}\s+\d{1,2}:\d{2}:\d{2}\s+[AP]M"
    row_pattern = re.compile(
        rf"(?P<date>{date_pattern})\|(?P<unit>[^|]+)\|(?P<power>-?\d+(?:\.\d+)?)"
    )

    rows: list[NRCUnitStatus] = []
    for match in row_pattern.finditer(text):
        observed_at = datetime.strptime(match.group("date"), "%m/%d/%Y %I:%M:%S %p")
        observed_at = observed_at.replace(tzinfo=NRC_REPORT_TIMEZONE).astimezone(timezone.utc)
        unit_name = " ".join(match.group("unit").split())
        rows.append(
            NRCUnitStatus(
                observed_at=observed_at,
                unit_name=unit_name,
                site_name=nrc_site_name(unit_name),
                power_percentage=Decimal(match.group("power")),
            )
        )

    if not rows:
        raise RuntimeError("NRC power status text did not contain any parseable rows.")
    return rows



def load_plants(cur: psycopg.Cursor) -> list[Plant]:
    cur.execute(
        """
        SELECT id, plant_name, state, total_mw_capacity, source_plant_code
        FROM plants
        ORDER BY plant_name
        """
    )
    return [
        Plant(
            id=int(row[0]),
            plant_name=str(row[1]),
            state=str(row[2]).upper().strip() if row[2] else None,
            total_mw_capacity=Decimal(str(row[3])),
            source_plant_code=str(row[4]) if row[4] else None,
        )
        for row in cur.fetchall()
    ]


def latest_nrc_rows_by_site(rows: list[NRCUnitStatus]) -> dict[str, list[NRCUnitStatus]]:
    latest = max(row.observed_at for row in rows)
    by_site: dict[str, list[NRCUnitStatus]] = {}
    for row in rows:
        if row.observed_at != latest:
            continue
        by_site.setdefault(canonical_site_key(row.site_name), []).append(row)
    return by_site


def build_nrc_statuses(plants: list[Plant], rows: list[NRCUnitStatus]) -> tuple[list[PlantNRCStatus], list[str]]:
    by_site = latest_nrc_rows_by_site(rows)
    statuses: list[PlantNRCStatus] = []
    unmatched = sorted({row.site_name for site_rows in by_site.values() for row in site_rows})

    for plant in plants:
        site_rows = by_site.get(canonical_site_key(plant.plant_name))
        if not site_rows:
            continue

        percentages = [row.power_percentage for row in site_rows]
        average = sum(percentages, Decimal("0")) / Decimal(len(percentages))
        average = average.quantize(Decimal("0.001"))
        output_mw = (plant.total_mw_capacity * average / Decimal("100")).quantize(Decimal("0.001"))
        statuses.append(
            PlantNRCStatus(
                plant=plant,
                observed_at=site_rows[0].observed_at,
                capacity_percentage=average,
                realtime_output_mw=output_mw,
                unit_count=len(site_rows),
            )
        )
        for row in site_rows:
            if row.site_name in unmatched:
                unmatched.remove(row.site_name)

    return statuses, unmatched


def upsert_nrc_status(cur: psycopg.Cursor, status: PlantNRCStatus, source: str) -> None:
    cur.execute(
        """
        INSERT INTO telemetry (
            plant_id,
            observed_at,
            realtime_output_mw,
            capacity_percentage,
            source
        )
        VALUES (
            %(plant_id)s,
            %(observed_at)s,
            %(realtime_output_mw)s,
            %(capacity_percentage)s,
            %(source)s
        )
        ON CONFLICT (plant_id, observed_at) DO UPDATE
        SET
            realtime_output_mw = EXCLUDED.realtime_output_mw,
            capacity_percentage = EXCLUDED.capacity_percentage,
            source = CASE
                WHEN telemetry.source IS NULL OR telemetry.source = EXCLUDED.source THEN EXCLUDED.source
                WHEN telemetry.source LIKE '%%' || EXCLUDED.source || '%%' THEN telemetry.source
                ELSE telemetry.source || '; ' || EXCLUDED.source
            END
        """,
        {
            "plant_id": status.plant.id,
            "observed_at": status.observed_at,
            "realtime_output_mw": status.realtime_output_mw,
            "capacity_percentage": status.capacity_percentage,
            "source": source,
        },
    )


def run_nrc_worker(dry_run: bool = False) -> int:
    status_url = resolve_nrc_power_status_url()
    rows = parse_nrc_power_status(fetch_text(status_url))

    with psycopg.connect(database_url(), prepare_threshold=None) as conn:
        with conn.cursor() as cur:
            plants = load_plants(cur)
            statuses, unmatched = build_nrc_statuses(plants, rows)
            if dry_run:
                conn.rollback()
            else:
                for status in statuses:
                    upsert_nrc_status(cur, status, f"NRC {status_url}")
                conn.commit()

    if unmatched:
        PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
        pd.DataFrame({"nrc_site_name": unmatched}).to_csv(
            PROCESSED_DIR / "nrc_status_unmatched.csv",
            index=False,
        )

    print(
        f"NRC worker {'would update' if dry_run else 'updated'} "
        f"{len(statuses)} plant telemetry rows from {status_url}."
    )
    if unmatched:
        print(f"NRC worker found {len(unmatched)} unmatched NRC site names.")
    return len(statuses)


def load_lmp_overrides() -> dict[str, GridNode]:
    load_dotenv(PROJECT_ROOT / ".env")
    raw = os.getenv("TELEMETRY_LMP_NODE_OVERRIDES")
    if not raw:
        return {}

    path = Path(raw) if not raw.lstrip().startswith("{") else None
    if path is not None and path.exists():
        raw = path.read_text(encoding="utf-8")

    payload = json.loads(raw)
    overrides: dict[str, GridNode] = {}
    for key, value in payload.items():
        overrides[override_key(key)] = GridNode(
            iso_code=str(value["iso_code"]).upper(),
            location=str(value["location"]),
            location_type=str(value["location_type"]) if value.get("location_type") else None,
            market=str(value.get("market") or "REAL_TIME_5_MIN"),
        )
    return overrides


def override_key(value: str) -> str:
    text = str(value).strip()
    if text.lower().startswith("source_plant_code:"):
        return text.lower()
    return canonical_site_key(text).lower()


def resolve_grid_node(plant: Plant, overrides: dict[str, GridNode]) -> GridNode | None:
    keys = [override_key(plant.plant_name)]
    if plant.source_plant_code:
        keys.append(override_key(f"source_plant_code:{plant.source_plant_code}"))

    for key in keys:
        if key in overrides:
            return overrides[key]

    default = PLANT_MARKET_DEFAULTS.get(canonical_site_key(plant.plant_name).lower())
    if default:
        return default

    if plant.state:
        return STATE_MARKET_DEFAULTS.get(plant.state)
    return None


def import_gridstatus() -> Any:
    try:
        import gridstatus
    except ImportError as exc:
        raise SystemExit(
            "gridstatus is required for LMP telemetry. Run `pip install -r requirements-dev.txt`."
        ) from exc
    return gridstatus


def flatten_columns(df: pd.DataFrame) -> pd.DataFrame:
    if isinstance(df.columns, pd.MultiIndex):
        df = df.copy()
        df.columns = [" ".join(str(part) for part in column if part) for column in df.columns]
    return df


def normalized_column_name(column: object) -> str:
    return re.sub(r"[^a-z0-9]+", " ", str(column).lower()).strip()


def find_column(df: pd.DataFrame, candidates: tuple[str, ...]) -> str | None:
    normalized = {normalized_column_name(column): str(column) for column in df.columns}
    for candidate in candidates:
        match = normalized.get(normalized_column_name(candidate))
        if match is not None:
            return match
    for column in df.columns:
        normalized_column = normalized_column_name(column)
        if any(normalized_column.endswith(normalized_column_name(candidate)) for candidate in candidates):
            return str(column)
    return None


def call_with_supported_kwargs(method: Any, *args: Any, **kwargs: Any) -> pd.DataFrame:
    signature = inspect.signature(method)
    supported = {key: value for key, value in kwargs.items() if key in signature.parameters}
    return method(*args, **supported)


def fetch_node_dataframe(gridstatus: Any, node: GridNode) -> pd.DataFrame:
    iso_classes = {
        "CAISO": "CAISO",
        "ERCOT": "Ercot",
        "ISONE": "ISONE",
        "MISO": "MISO",
        "NYISO": "NYISO",
        "PJM": "PJM",
        "SPP": "SPP",
    }
    class_name = iso_classes.get(node.iso_code)
    if class_name is None:
        raise RuntimeError(f"{node.iso_code} is not supported by gridstatus.")

    iso = getattr(gridstatus, class_name)()
    method_name = "get_spp" if node.iso_code == "ERCOT" else "get_lmp"
    method = getattr(iso, method_name)
    kwargs = {
        "market": node.market,
        "locations": [node.location],
        "location_type": node.location_type,
        "verbose": False,
    }

    try:
        return call_with_supported_kwargs(method, "latest", **kwargs)
    except Exception:
        return call_with_supported_kwargs(method, "today", **kwargs)


def parse_lmp_dataframe(df: pd.DataFrame, node: GridNode) -> tuple[datetime, Decimal]:
    df = flatten_columns(df)
    if df.empty:
        raise RuntimeError(f"{node.iso_code} returned no LMP rows for {node.location}.")

    location_col = find_column(df, LOCATION_COLUMNS)
    if location_col is not None:
        location_values = df[location_col].astype(str).str.upper().str.strip()
        requested = node.location.upper().strip()
        filtered = df[location_values == requested]
        if not filtered.empty:
            df = filtered

    time_col = find_column(df, TIME_COLUMNS)
    lmp_col = find_column(df, LMP_COLUMNS)
    if time_col is None or lmp_col is None:
        raise RuntimeError(
            f"Could not identify timestamp/LMP columns in {node.iso_code} response: "
            f"{', '.join(str(column) for column in df.columns)}"
        )

    parsed = df.copy()
    parsed[time_col] = pd.to_datetime(parsed[time_col], errors="coerce", utc=True)
    parsed[lmp_col] = pd.to_numeric(parsed[lmp_col], errors="coerce")
    parsed = parsed.dropna(subset=[time_col, lmp_col]).sort_values(time_col)
    if parsed.empty:
        raise RuntimeError(f"{node.iso_code} LMP rows had no usable timestamp/price values.")

    latest = parsed.iloc[-1]
    observed_at = latest[time_col].to_pydatetime()
    price = Decimal(str(latest[lmp_col])).quantize(Decimal("0.0001"))
    return observed_at, price


def upsert_lmp(cur: psycopg.Cursor, lmp: PlantLMP, source: str) -> None:
    cur.execute(
        """
        INSERT INTO telemetry (
            plant_id,
            observed_at,
            local_marginal_price_usd_mwh,
            iso_code,
            lmp_market,
            lmp_location,
            lmp_location_type,
            source
        )
        VALUES (
            %(plant_id)s,
            %(observed_at)s,
            %(price)s,
            %(iso_code)s,
            %(market)s,
            %(location)s,
            %(location_type)s,
            %(source)s
        )
        ON CONFLICT (plant_id, observed_at) DO UPDATE
        SET
            local_marginal_price_usd_mwh = EXCLUDED.local_marginal_price_usd_mwh,
            iso_code = EXCLUDED.iso_code,
            lmp_market = EXCLUDED.lmp_market,
            lmp_location = EXCLUDED.lmp_location,
            lmp_location_type = EXCLUDED.lmp_location_type,
            source = CASE
                WHEN telemetry.source IS NULL OR telemetry.source = EXCLUDED.source THEN EXCLUDED.source
                WHEN telemetry.source LIKE '%%' || EXCLUDED.source || '%%' THEN telemetry.source
                ELSE telemetry.source || '; ' || EXCLUDED.source
            END
        """,
        {
            "plant_id": lmp.plant.id,
            "observed_at": lmp.observed_at,
            "price": lmp.price_usd_mwh,
            "iso_code": lmp.node.iso_code,
            "market": lmp.node.market,
            "location": lmp.node.location,
            "location_type": lmp.node.location_type,
            "source": source,
        },
    )


def run_lmp_worker(dry_run: bool = False) -> int:
    gridstatus = import_gridstatus()
    overrides = load_lmp_overrides()
    skipped: list[dict[str, str]] = []
    updates: list[PlantLMP] = []

    with psycopg.connect(database_url(), prepare_threshold=None) as conn:
        with conn.cursor() as cur:
            plants = load_plants(cur)
            plants_by_node: dict[GridNode, list[Plant]] = {}
            for plant in plants:
                node = resolve_grid_node(plant, overrides)
                if node is None:
                    skipped.append({"plant_name": plant.plant_name, "reason": "no supported ISO mapping"})
                    continue
                plants_by_node.setdefault(node, []).append(plant)

            for node, node_plants in plants_by_node.items():
                try:
                    observed_at, price = parse_lmp_dataframe(fetch_node_dataframe(gridstatus, node), node)
                except Exception as exc:
                    for plant in node_plants:
                        skipped.append({"plant_name": plant.plant_name, "reason": str(exc)})
                    continue

                for plant in node_plants:
                    updates.append(
                        PlantLMP(
                            plant=plant,
                            observed_at=observed_at,
                            price_usd_mwh=price,
                            node=node,
                        )
                    )

            if dry_run:
                conn.rollback()
            else:
                for update in updates:
                    upsert_lmp(cur, update, "gridstatus")
                conn.commit()

    if skipped:
        PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
        pd.DataFrame(skipped).to_csv(PROCESSED_DIR / "lmp_status_skipped.csv", index=False)

    print(
        f"LMP worker {'would update' if dry_run else 'updated'} "
        f"{len(updates)} plant telemetry rows."
    )
    if skipped:
        print(f"LMP worker skipped {len(skipped)} plant-node lookups.")
    return len(updates)


def run_scheduler(timezone_name: str, run_on_start: bool) -> None:
    try:
        from apscheduler.schedulers.blocking import BlockingScheduler
        from apscheduler.triggers.cron import CronTrigger
        from apscheduler.triggers.interval import IntervalTrigger
    except ImportError as exc:
        raise SystemExit(
            "APScheduler is required for the telemetry scheduler. "
            "Run `pip install -r requirements-dev.txt`."
        ) from exc

    scheduler_timezone = ZoneInfo(timezone_name)
    scheduler = BlockingScheduler(timezone=scheduler_timezone)
    scheduler.add_job(
        run_nrc_worker,
        CronTrigger(hour=8, minute=0, timezone=scheduler_timezone),
        id="nrc-daily-power-status",
        replace_existing=True,
    )
    scheduler.add_job(
        run_lmp_worker,
        IntervalTrigger(minutes=15, timezone=scheduler_timezone),
        id="gridstatus-lmp-15-min",
        replace_existing=True,
    )

    if run_on_start:
        run_nrc_worker()
        run_lmp_worker()

    print(
        "Telemetry scheduler started: NRC daily at 08:00 "
        f"{timezone_name}; gridstatus LMP every 15 minutes."
    )
    try:
        scheduler.start()
    except KeyboardInterrupt:
        scheduler.shutdown()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run nuclear plant telemetry workers.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    nrc = subparsers.add_parser("nrc", help="Fetch NRC daily reactor power status once.")
    nrc.add_argument("--dry-run", action="store_true", help="Parse and match without writing rows.")

    lmp = subparsers.add_parser("lmp", help="Fetch gridstatus LMP telemetry once.")
    lmp.add_argument("--dry-run", action="store_true", help="Fetch and match without writing rows.")

    serve = subparsers.add_parser("serve", help="Run APScheduler telemetry jobs.")
    serve.add_argument(
        "--timezone",
        default=os.getenv("TELEMETRY_SCHEDULER_TIMEZONE", "America/New_York"),
        help="Timezone for the 8:00 AM NRC job.",
    )
    serve.add_argument(
        "--run-on-start",
        action="store_true",
        help="Run both workers immediately before scheduling future runs.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    started_at = time.monotonic()

    if args.command == "nrc":
        run_nrc_worker(dry_run=args.dry_run)
    elif args.command == "lmp":
        run_lmp_worker(dry_run=args.dry_run)
    elif args.command == "serve":
        run_scheduler(args.timezone, args.run_on_start)
    else:
        raise SystemExit(f"Unknown command: {args.command}")

    elapsed = time.monotonic() - started_at
    print(f"Finished in {elapsed:.1f}s.")


if __name__ == "__main__":
    main()
