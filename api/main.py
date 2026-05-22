from __future__ import annotations

import os
from contextlib import contextmanager
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any, Iterator

from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import psycopg
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
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
    with psycopg.connect(database_url(), row_factory=dict_row) as conn:
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
            cur.execute(
                """
                SELECT
                    p.id AS plant_id,
                    p.plant_name,
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
            shareholders = cur.fetchall()

    return {
        "plant": {
            "id": plant["plant_id"],
            "plant_name": plant["plant_name"],
        },
        "parent_company": {
            "id": plant["company_id"],
            "stock_ticker": plant["stock_ticker"],
            "parent_company_name": plant["parent_company_name"],
        },
        "shareholders": [
            {
                "id": row["id"],
                "institutional_investor_name": row["institutional_investor_name"],
                "ownership_percentage": json_value(row["ownership_percentage"]),
                "reported_at": json_value(row["reported_at"]),
            }
            for row in shareholders
        ],
    }
