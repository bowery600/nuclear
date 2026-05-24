from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from datetime import date, datetime
from decimal import Decimal
from email.utils import parsedate_to_datetime
from html import unescape
from pathlib import Path
from typing import Any, Iterator

from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import psycopg
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from psycopg.rows import dict_row


LIBPQ_QUERY_KEYS = {
    "host", "hostaddr", "port", "dbname", "user", "password", "passfile",
    "channel_binding", "connect_timeout", "client_encoding", "options",
    "application_name", "fallback_application_name", "keepalives",
    "keepalives_idle", "keepalives_interval", "keepalives_count",
    "tcp_user_timeout", "replication", "gssencmode", "sslmode",
    "requiressl", "sslcompression", "sslcert", "sslkey", "sslpassword",
    "sslcertmode", "sslrootcert", "sslcrl", "sslcrldir", "sslsni",
    "requirepeer", "ssl_min_protocol_version", "ssl_max_protocol_version",
    "krbsrvname", "gsslib", "gssdelegation", "service", "target_session_attrs",
    "load_balance_hosts",
}


PROJECT_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(PROJECT_ROOT / ".env")

DEFAULT_CORS_ORIGINS = (
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
)


def _clean_libpq_url(url: str) -> str:
    parts = urlsplit(url)
    if not parts.query:
        return url
    kept = [(k, v) for k, v in parse_qsl(parts.query, keep_blank_values=False) if k and k in LIBPQ_QUERY_KEYS]
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(kept), parts.fragment))


def database_url() -> str:
    url = (
        os.getenv("DATABASE_URL")
        or os.getenv("POSTGRES_URL_NON_POOLING")
        or os.getenv("POSTGRES_URL")
    )
    if not url:
        raise RuntimeError(
            "DATABASE_URL (or POSTGRES_URL from the Vercel Supabase integration) is required."
        )
    return _clean_libpq_url(url)


def cors_origins() -> list[str]:
    raw_origins = os.getenv("API_CORS_ORIGINS")
    if not raw_origins:
        return list(DEFAULT_CORS_ORIGINS)
    return [origin.strip() for origin in raw_origins.split(",") if origin.strip()]


@contextmanager
def db_connection() -> Iterator[psycopg.Connection]:
    with psycopg.connect(database_url(), row_factory=dict_row, prepare_threshold=None) as conn:
        yield conn


def json_value(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    return value


def plant_feature(row: dict[str, Any]) -> dict[str, Any]:
    properties = {
        "id": row["id"],
        "plant_name": row["plant_name"],
        "state": row["state"],
        "company_id": row["company_id"],
        "parent_company_name": row["parent_company_name"],
        "stock_ticker": row["stock_ticker"],
        "total_mw_capacity": row["total_mw_capacity"],
        "current_mw_output": row["current_mw_output"],
        "capacity_percentage": row["capacity_percentage"],
        "current_power_cost_usd_mwh": row["current_power_cost_usd_mwh"],
        "output_observed_at": row["output_observed_at"],
        "price_observed_at": row["price_observed_at"],
        "iso_code": row["iso_code"],
        "lmp_market": row["lmp_market"],
        "lmp_location": row["lmp_location"],
        "lmp_location_type": row["lmp_location_type"],
        "commission_year": row["commission_year"],
        "license_expiration_year": row["license_expiration_year"],
        "overnight_capex_usd_kw": row["overnight_capex_usd_kw"],
        "fixed_om_usd_kw_yr": row["fixed_om_usd_kw_yr"],
        "variable_om_usd_mwh": row["variable_om_usd_mwh"],
        "fuel_cost_usd_mwh": row["fuel_cost_usd_mwh"],
    }
    return {
        "type": "Feature",
        "id": row["id"],
        "geometry": {
            "type": "Point",
            "coordinates": [
                json_value(row["longitude"]),
                json_value(row["latitude"]),
            ],
        },
        "properties": {key: json_value(value) for key, value in properties.items()},
    }


app = FastAPI(
    title="Nuclear Data API",
    version="0.1.0",
    description="Lightweight JSON endpoints for nuclear plant map and ownership data.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins(),
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)


NUCLEAR_TICKERS: tuple[tuple[str, str], ...] = (
    # Utilities / IPPs with major nuclear fleets
    ("CEG",  "Constellation"),
    ("VST",  "Vistra"),
    ("TLN",  "Talen"),
    ("DUK",  "Duke"),
    ("SO",   "Southern Co"),
    ("EXC",  "Exelon"),
    ("D",    "Dominion"),
    ("AEP",  "AEP"),
    ("XEL",  "Xcel"),
    ("ETR",  "Entergy"),
    ("PEG",  "PSEG"),
    ("NEE",  "NextEra"),
    ("PCG",  "PG&E"),
    # SMR / advanced reactor developers
    ("SMR",  "NuScale"),
    ("OKLO", "Oklo"),
    ("NNE",  "Nano Nuclear"),
    ("GEV",  "GE Vernova"),
    ("LEU",  "Centrus"),
    ("BWXT", "BWX Tech"),
    ("BW",   "Babcock & Wilcox"),
    # Uranium miners / fuel cycle
    ("CCJ",  "Cameco"),
    ("UEC",  "Uranium Energy"),
    ("DNN",  "Denison"),
    ("UUUU", "Energy Fuels"),
    ("URG",  "Ur-Energy"),
    ("NXE",  "NexGen Energy"),
    # Uranium / nuclear ETFs
    ("URA",  "Global X Uranium"),
    ("URNM", "Sprott Uranium Miners"),
    ("NLR",  "VanEck Nuclear"),
)

_QUOTES_CACHE: dict[str, Any] = {"at": 0.0, "data": []}
_QUOTES_TTL_SECONDS = 60.0
_QUOTE_HISTORY_CACHE: dict[tuple[str, str, str], dict[str, Any]] = {}
_QUOTE_HISTORY_TTL_SECONDS = 300.0
_NEWS_CACHE: dict[str, Any] = {"at": 0.0, "data": []}
_NEWS_TTL_SECONDS = 600.0

YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
NEWS_FEEDS: tuple[tuple[str, str], ...] = (
    (
        "Google News",
        "https://news.google.com/rss/search?"
        "q=nuclear%20energy%20OR%20uranium%20OR%20SMR%20OR%20reactor%20when:7d"
        "&hl=en-US&gl=US&ceid=US:en",
    ),
    (
        "NRC",
        "https://www.nrc.gov/reading-rm/doc-collections/news/rss/news.xml",
    ),
)


def _request_json(url: str, timeout: float = 5.0) -> dict[str, Any] | None:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; nuclear-map/1.0)",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, ValueError):
        return None


def _fetch_yahoo_chart(symbol: str, range_value: str = "1d", interval: str = "1d") -> dict[str, Any] | None:
    params = urlencode({"interval": interval, "range": range_value})
    payload = _request_json(f"{YAHOO_CHART_URL.format(symbol=symbol)}?{params}")
    if not payload:
        return None

    try:
        return payload["chart"]["result"][0]
    except (KeyError, IndexError, TypeError):
        return None


def _fetch_yahoo_quote(symbol: str) -> dict[str, Any] | None:
    result = _fetch_yahoo_chart(symbol, "1d", "1d")
    if not result:
        return None

    meta = result.get("meta") or {}
    price = meta.get("regularMarketPrice")
    prev = meta.get("chartPreviousClose") or meta.get("previousClose")
    if price is None or prev is None or prev == 0:
        return None

    change = float(price) - float(prev)
    pct = (change / float(prev)) * 100.0
    market_time = meta.get("regularMarketTime")
    return {
        "symbol": symbol,
        "price": float(price),
        "previous_close": float(prev),
        "change": change,
        "change_percent": pct,
        "open": json_value(meta.get("regularMarketOpen")),
        "day_high": json_value(meta.get("regularMarketDayHigh")),
        "day_low": json_value(meta.get("regularMarketDayLow")),
        "volume": json_value(meta.get("regularMarketVolume")),
        "market_time": datetime.utcfromtimestamp(market_time).isoformat() + "Z" if market_time else None,
        "currency": meta.get("currency", "USD"),
        "exchange": meta.get("exchangeName"),
        "source": "Yahoo Finance chart",
    }


@app.get("/api/quotes")
def nuclear_quotes() -> dict[str, Any]:
    now = time.time()
    if _QUOTES_CACHE["data"] and (now - _QUOTES_CACHE["at"]) < _QUOTES_TTL_SECONDS:
        return {"quotes": _QUOTES_CACHE["data"], "as_of": _QUOTES_CACHE["at"], "cached": True}

    quotes: list[dict[str, Any]] = []
    name_by_symbol = dict(NUCLEAR_TICKERS)
    with ThreadPoolExecutor(max_workers=8) as pool:
        for q in pool.map(_fetch_yahoo_quote, [s for s, _ in NUCLEAR_TICKERS]):
            if q is None:
                continue
            q["name"] = name_by_symbol.get(q["symbol"], q["symbol"])
            quotes.append(q)

    if quotes:
        _QUOTES_CACHE["data"] = quotes
        _QUOTES_CACHE["at"] = now

    return {"quotes": quotes, "as_of": now, "cached": False}


@app.get("/api/quotes/{symbol}/history")
def quote_history(
    symbol: str,
    range_: str = Query("1mo", alias="range"),
    interval: str = "1d",
) -> dict[str, Any]:
    normalized_symbol = symbol.strip().upper()
    allowed_ranges = {"1d", "5d", "1mo", "6mo", "1y", "5y"}
    allowed_intervals = {"5m", "15m", "1d", "1wk", "1mo"}
    range_value = range_ if range_ in allowed_ranges else "1mo"
    interval_value = interval if interval in allowed_intervals else "1d"
    cache_key = (normalized_symbol, range_value, interval_value)
    now = time.time()

    cached = _QUOTE_HISTORY_CACHE.get(cache_key)
    if cached and (now - cached["at"]) < _QUOTE_HISTORY_TTL_SECONDS:
        return {**cached["payload"], "cached": True}

    result = _fetch_yahoo_chart(normalized_symbol, range_value, interval_value)
    if not result:
        raise HTTPException(status_code=502, detail="Quote history provider unavailable.")

    timestamps = result.get("timestamp") or []
    quote = ((result.get("indicators") or {}).get("quote") or [{}])[0]
    closes = quote.get("close") or []
    opens = quote.get("open") or []
    highs = quote.get("high") or []
    lows = quote.get("low") or []
    volumes = quote.get("volume") or []

    points: list[dict[str, Any]] = []
    for index, ts in enumerate(timestamps):
        close = closes[index] if index < len(closes) else None
        if close is None:
            continue
        points.append({
            "time": datetime.utcfromtimestamp(ts).isoformat() + "Z",
            "close": json_value(close),
            "open": json_value(opens[index]) if index < len(opens) else None,
            "high": json_value(highs[index]) if index < len(highs) else None,
            "low": json_value(lows[index]) if index < len(lows) else None,
            "volume": json_value(volumes[index]) if index < len(volumes) else None,
        })

    payload = {
        "symbol": normalized_symbol,
        "range": range_value,
        "interval": interval_value,
        "currency": (result.get("meta") or {}).get("currency", "USD"),
        "source": "Yahoo Finance chart",
        "as_of": now,
        "points": points,
        "cached": False,
    }
    _QUOTE_HISTORY_CACHE[cache_key] = {"at": now, "payload": payload}
    return payload


def _fetch_rss_items(source: str, url: str, limit: int = 30) -> list[dict[str, Any]]:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; nuclear-map/1.0)",
            "Accept": "application/rss+xml, application/xml, text/xml",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            root = ET.fromstring(resp.read())
    except (urllib.error.URLError, TimeoutError, ET.ParseError):
        return []

    out: list[dict[str, Any]] = []
    for item in root.findall(".//item")[:limit]:
        title = unescape(item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        description = unescape(item.findtext("description") or "").strip()
        published_raw = item.findtext("pubDate") or item.findtext("published") or ""
        published_at = None
        if published_raw:
            try:
                published_at = parsedate_to_datetime(published_raw).isoformat()
            except (TypeError, ValueError):
                published_at = None
        if title:
            out.append({
                "id": f"{source}:{link or title}",
                "source": source,
                "topic": "NEWS",
                "headline": title,
                "summary": description,
                "url": link,
                "published_at": published_at,
                "tickers": [],
            })
    return out


@app.get("/api/news")
def nuclear_news() -> dict[str, Any]:
    now = time.time()
    if _NEWS_CACHE["data"] and (now - _NEWS_CACHE["at"]) < _NEWS_TTL_SECONDS:
        return {"items": _NEWS_CACHE["data"], "as_of": _NEWS_CACHE["at"], "cached": True}

    items: list[dict[str, Any]] = []
    with ThreadPoolExecutor(max_workers=4) as pool:
        for feed_items in pool.map(lambda feed: _fetch_rss_items(feed[0], feed[1]), NEWS_FEEDS):
            items.extend(feed_items)

    seen: set[str] = set()
    deduped: list[dict[str, Any]] = []
    for item in items:
        key = item["headline"].lower()
        if key in seen:
            continue
        seen.add(key)
        deduped.append(item)

    deduped.sort(key=lambda item: item.get("published_at") or "", reverse=True)
    deduped = deduped[:40]
    if deduped:
        _NEWS_CACHE["data"] = deduped
        _NEWS_CACHE["at"] = now

    return {"items": deduped, "as_of": now, "cached": False}


@app.get("/api/plants")
def list_plants() -> dict[str, Any]:
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    p.id,
                    p.company_id,
                    p.plant_name,
                    p.latitude,
                    p.longitude,
                    p.total_mw_capacity,
                    p.state,
                    p.commission_year,
                    p.license_expiration_year,
                    p.overnight_capex_usd_kw,
                    p.fixed_om_usd_kw_yr,
                    p.variable_om_usd_mwh,
                    p.fuel_cost_usd_mwh,
                    c.stock_ticker,
                    c.parent_company_name,
                    latest_output.realtime_output_mw AS current_mw_output,
                    latest_output.capacity_percentage,
                    latest_output.observed_at AS output_observed_at,
                    latest_price.local_marginal_price_usd_mwh AS current_power_cost_usd_mwh,
                    latest_price.observed_at AS price_observed_at,
                    latest_price.iso_code,
                    latest_price.lmp_market,
                    latest_price.lmp_location,
                    latest_price.lmp_location_type
                FROM plants p
                JOIN companies c
                    ON c.id = p.company_id
                LEFT JOIN LATERAL (
                    SELECT
                        t.observed_at,
                        t.realtime_output_mw,
                        t.capacity_percentage
                    FROM telemetry t
                    WHERE t.plant_id = p.id
                      AND t.realtime_output_mw IS NOT NULL
                    ORDER BY t.observed_at DESC
                    LIMIT 1
                ) latest_output ON TRUE
                LEFT JOIN LATERAL (
                    SELECT
                        t.observed_at,
                        t.local_marginal_price_usd_mwh,
                        t.iso_code,
                        t.lmp_market,
                        t.lmp_location,
                        t.lmp_location_type
                    FROM telemetry t
                    WHERE t.plant_id = p.id
                      AND t.local_marginal_price_usd_mwh IS NOT NULL
                    ORDER BY t.observed_at DESC
                    LIMIT 1
                ) latest_price ON TRUE
                ORDER BY p.plant_name
                """
            )
            rows = cur.fetchall()

    return {
        "type": "FeatureCollection",
        "features": [plant_feature(row) for row in rows],
    }


@app.get("/api/plants/{plant_id}/ownership")
def plant_ownership(plant_id: int) -> dict[str, Any]:
    with db_connection() as conn:
        with conn.cursor() as cur:
            # 1. Fetch plant and its primary fallback company details
            cur.execute(
                """
                SELECT
                    p.id AS plant_id,
                    p.plant_name,
                    p.operator_name,
                    p.nrc_owner_operator,
                    p.commission_year,
                    p.license_expiration_year,
                    p.overnight_capex_usd_kw,
                    p.fixed_om_usd_kw_yr,
                    p.variable_om_usd_mwh,
                    p.fuel_cost_usd_mwh,
                    c.id AS company_id,
                    c.stock_ticker,
                    c.parent_company_name
                FROM plants p
                JOIN companies c
                    ON c.id = p.company_id
                WHERE p.id = %s
                """,
                (plant_id,),
            )
            plant = cur.fetchone()
            if plant is None:
                raise HTTPException(status_code=404, detail="Plant not found.")

            # 2. Check if there are joint equity stakes
            cur.execute(
                """
                SELECT
                    pes.id AS stake_id,
                    pes.owner_name,
                    pes.equity_percentage,
                    pes.parent_company_id,
                    c.stock_ticker,
                    c.parent_company_name
                FROM plant_equity_stakes pes
                LEFT JOIN companies c
                    ON c.id = pes.parent_company_id
                WHERE pes.plant_id = %s
                ORDER BY
                    pes.equity_percentage DESC,
                    pes.owner_name ASC
                """,
                (plant_id,),
            )
            stakes_rows = cur.fetchall()

            ownership_stakes = []
            is_joint_ownership = len(stakes_rows) > 0

            if is_joint_ownership:
                for row in stakes_rows:
                    stake_shareholders = []
                    if row["parent_company_id"] is not None:
                        cur.execute(
                            """
                            SELECT
                                id,
                                institutional_investor_name,
                                ownership_percentage,
                                reported_at
                            FROM shareholders
                            WHERE company_id = %s
                            ORDER BY
                                ownership_percentage DESC,
                                institutional_investor_name ASC
                            """,
                            (row["parent_company_id"],),
                        )
                        sh_rows = cur.fetchall()
                        stake_shareholders = [
                            {
                                "id": sh["id"],
                                "institutional_investor_name": sh["institutional_investor_name"],
                                "ownership_percentage": json_value(sh["ownership_percentage"]),
                                "reported_at": json_value(sh["reported_at"]),
                            }
                            for sh in sh_rows
                        ]

                    ownership_stakes.append({
                        "id": row["stake_id"],
                        "owner_name": row["owner_name"],
                        "equity_percentage": json_value(row["equity_percentage"]),
                        "parent_company": {
                            "id": row["parent_company_id"],
                            "stock_ticker": row["stock_ticker"],
                            "parent_company_name": row["parent_company_name"],
                        } if row["parent_company_id"] is not None else None,
                        "shareholders": stake_shareholders
                    })
            else:
                # Single ownership fallback
                cur.execute(
                    """
                    SELECT
                        id,
                        institutional_investor_name,
                        ownership_percentage,
                        reported_at
                    FROM shareholders
                    WHERE company_id = %s
                    ORDER BY
                        ownership_percentage DESC,
                        institutional_investor_name ASC
                    """,
                    (plant["company_id"],),
                )
                sh_rows = cur.fetchall()
                fallback_shareholders = [
                    {
                        "id": sh["id"],
                        "institutional_investor_name": sh["institutional_investor_name"],
                        "ownership_percentage": json_value(sh["ownership_percentage"]),
                        "reported_at": json_value(sh["reported_at"]),
                    }
                    for sh in sh_rows
                ]

                owner_name = plant["operator_name"] or plant["nrc_owner_operator"] or plant["parent_company_name"]

                ownership_stakes.append({
                    "id": None,
                    "owner_name": owner_name,
                    "equity_percentage": 100.00,
                    "parent_company": {
                        "id": plant["company_id"],
                        "stock_ticker": plant["stock_ticker"],
                        "parent_company_name": plant["parent_company_name"],
                    },
                    "shareholders": fallback_shareholders
                })

            primary_stake = ownership_stakes[0]
            legacy_parent = primary_stake["parent_company"] or {
                "id": plant["company_id"],
                "stock_ticker": plant["stock_ticker"],
                "parent_company_name": plant["parent_company_name"],
            }
            legacy_shareholders = primary_stake["shareholders"]

    return {
        "plant": {
            "id": plant["plant_id"],
            "plant_name": plant["plant_name"],
            "commission_year": plant["commission_year"],
            "license_expiration_year": plant["license_expiration_year"],
            "overnight_capex_usd_kw": json_value(plant["overnight_capex_usd_kw"]),
            "fixed_om_usd_kw_yr": json_value(plant["fixed_om_usd_kw_yr"]),
            "variable_om_usd_mwh": json_value(plant["variable_om_usd_mwh"]),
            "fuel_cost_usd_mwh": json_value(plant["fuel_cost_usd_mwh"]),
        },
        "is_joint_ownership": is_joint_ownership,
        "ownership_stakes": ownership_stakes,
        "parent_company": legacy_parent,
        "shareholders": legacy_shareholders,
    }
