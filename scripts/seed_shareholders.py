from __future__ import annotations

import argparse
import os
import re
from dataclasses import dataclass
from datetime import date
from decimal import Decimal, InvalidOperation
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any

import pandas as pd
import psycopg
import yfinance as yf
from dotenv import load_dotenv


PROJECT_ROOT = Path(__file__).resolve().parents[1]
NON_PUBLIC_TICKERS = {
    "ENW": "Energy Northwest is not publicly traded.",
    "HOLTEC": "Holtec International is privately held.",
    "NPPD": "Nebraska Public Power District is not publicly traded.",
    "STP": "STP Nuclear Operating Company is not publicly traded.",
    "TVA": "Tennessee Valley Authority is not publicly traded.",
    "WCNOC": "Wolf Creek Nuclear Operating Corporation is not publicly traded.",
}
COMMON_COMPANY_WORDS = {
    "co",
    "company",
    "corp",
    "corporation",
    "energy",
    "group",
    "holdings",
    "inc",
    "incorporated",
    "international",
    "llc",
    "ltd",
    "plc",
    "the",
}


@dataclass(frozen=True)
class Company:
    id: int
    stock_ticker: str
    parent_company_name: str


@dataclass(frozen=True)
class Shareholder:
    institutional_investor_name: str
    ownership_percentage: Decimal
    reported_at: date | None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Fetch top institutional holders from yfinance and upsert shareholders."
    )
    parser.add_argument(
        "--top-n",
        type=int,
        default=10,
        help="Number of institutional holders to keep per ticker.",
    )
    parser.add_argument(
        "--tickers",
        nargs="*",
        help="Optional ticker allowlist. Defaults to every ticker in companies.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Fetch and print results without writing to the database.",
    )
    return parser.parse_args()


def database_url() -> str:
    load_dotenv(PROJECT_ROOT / ".env")
    url = os.getenv("DATABASE_URL")
    if not url:
        raise SystemExit("DATABASE_URL is required. Copy .env.example to .env first.")
    return url


def load_companies(cur: psycopg.Cursor, ticker_allowlist: set[str] | None) -> list[Company]:
    cur.execute(
        """
        SELECT id, stock_ticker, parent_company_name
        FROM companies
        ORDER BY stock_ticker
        """
    )
    companies = [
        Company(
            id=int(row[0]),
            stock_ticker=str(row[1]).upper().strip(),
            parent_company_name=str(row[2]),
        )
        for row in cur.fetchall()
    ]

    if ticker_allowlist is None:
        return companies

    return [company for company in companies if company.stock_ticker in ticker_allowlist]


def canonical_column_name(value: object) -> str:
    return "".join(ch for ch in str(value).lower() if ch.isalnum())


def canonical_company_name(value: object) -> str:
    text = str(value or "").lower().replace("&", " and ")
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def distinctive_company_tokens(value: object) -> set[str]:
    tokens = set(canonical_company_name(value).split())
    return {token for token in tokens if token not in COMMON_COMPANY_WORDS}


def validate_yfinance_identity(
    ticker: str,
    stock: yf.Ticker,
    expected_company_name: str,
) -> None:
    info = stock.get_info()
    quote_type = str(info.get("quoteType") or "").upper()
    if quote_type and quote_type != "EQUITY":
        raise RuntimeError(f"{ticker} is a {quote_type} quote, not an equity quote")

    market_name = " ".join(
        str(info.get(key) or "")
        for key in ("longName", "shortName")
        if info.get(key)
    )
    if not market_name:
        raise RuntimeError(f"{ticker} has no yfinance company name metadata")

    expected_name = canonical_company_name(expected_company_name)
    candidate_name = canonical_company_name(market_name)
    name_score = SequenceMatcher(None, expected_name, candidate_name).ratio()
    shared_tokens = distinctive_company_tokens(expected_company_name) & distinctive_company_tokens(
        market_name
    )

    if name_score < 0.45 and not shared_tokens:
        raise RuntimeError(
            f"{ticker} resolved to {market_name!r}, not {expected_company_name!r}"
        )


def find_column(df: pd.DataFrame, candidates: tuple[str, ...]) -> str | None:
    canonical_columns = {canonical_column_name(column): str(column) for column in df.columns}
    for candidate in candidates:
        column = canonical_columns.get(canonical_column_name(candidate))
        if column is not None:
            return column
    return None


def parse_percentage(value: Any) -> Decimal | None:
    if value is None or pd.isna(value):
        return None

    as_text = str(value).strip()
    has_percent_sign = "%" in as_text
    as_text = as_text.replace("%", "").replace(",", "").strip()
    if not as_text:
        return None

    try:
        percentage = Decimal(as_text)
    except InvalidOperation:
        return None

    if not has_percent_sign and percentage <= 1:
        percentage *= Decimal("100")

    if percentage < 0 or percentage > 100:
        return None

    return percentage.quantize(Decimal("0.0001"))


def parse_reported_at(value: Any) -> date | None:
    if value is None or pd.isna(value):
        return None

    parsed = pd.to_datetime(value, errors="coerce")
    if pd.isna(parsed):
        return None
    return parsed.date()


def fetch_holders(ticker: str, expected_company_name: str, top_n: int) -> list[Shareholder]:
    stock = yf.Ticker(ticker)
    validate_yfinance_identity(ticker, stock, expected_company_name)
    holders = stock.institutional_holders

    if holders is None or holders.empty:
        get_holders = getattr(stock, "get_institutional_holders", None)
        if callable(get_holders):
            holders = get_holders()

    if holders is None or holders.empty:
        return []

    holder_col = find_column(holders, ("Holder", "Name", "Organization"))
    percentage_col = find_column(holders, ("% Out", "Pct Held", "Percent Out", "Ownership"))
    reported_col = find_column(holders, ("Date Reported", "Reported At", "Report Date"))

    if holder_col is None or percentage_col is None:
        return []

    shareholder_rows: list[Shareholder] = []
    for _, row in holders.head(top_n).iterrows():
        holder_name = str(row[holder_col]).strip()
        percentage = parse_percentage(row[percentage_col])
        reported_at = parse_reported_at(row[reported_col]) if reported_col else None

        if not holder_name or holder_name.lower() == "nan" or percentage is None:
            continue

        shareholder_rows.append(
            Shareholder(
                institutional_investor_name=holder_name,
                ownership_percentage=percentage,
                reported_at=reported_at,
            )
        )

    return shareholder_rows


def upsert_shareholder(cur: psycopg.Cursor, company_id: int, shareholder: Shareholder) -> None:
    cur.execute(
        """
        WITH updated AS (
            UPDATE shareholders
            SET
                ownership_percentage = %(ownership_percentage)s,
                updated_at = NOW()
            WHERE company_id = %(company_id)s
              AND institutional_investor_name = %(institutional_investor_name)s
              AND reported_at IS NOT DISTINCT FROM %(reported_at)s
            RETURNING id
        )
        INSERT INTO shareholders (
            company_id,
            institutional_investor_name,
            ownership_percentage,
            reported_at
        )
        SELECT
            %(company_id)s,
            %(institutional_investor_name)s,
            %(ownership_percentage)s,
            %(reported_at)s
        WHERE NOT EXISTS (SELECT 1 FROM updated)
        ON CONFLICT (company_id, institutional_investor_name, reported_at) DO UPDATE
        SET
            ownership_percentage = EXCLUDED.ownership_percentage,
            updated_at = NOW()
        """,
        {
            "company_id": company_id,
            "institutional_investor_name": shareholder.institutional_investor_name,
            "ownership_percentage": shareholder.ownership_percentage,
            "reported_at": shareholder.reported_at,
        },
    )


def main() -> None:
    args = parse_args()
    if args.top_n < 1:
        raise SystemExit("--top-n must be at least 1.")

    ticker_allowlist = {ticker.upper().strip() for ticker in args.tickers} if args.tickers else None

    with psycopg.connect(database_url()) as conn:
        with conn.cursor() as cur:
            companies = load_companies(cur, ticker_allowlist)
            if not companies:
                raise SystemExit("No matching companies found.")

            total_rows = 0
            skipped: list[str] = []

            for company in companies:
                if company.stock_ticker in NON_PUBLIC_TICKERS:
                    skipped.append(company.stock_ticker)
                    print(f"{company.stock_ticker}: skipped. {NON_PUBLIC_TICKERS[company.stock_ticker]}")
                    if not args.dry_run:
                        cur.execute("DELETE FROM shareholders WHERE company_id = %s", (company.id,))
                    continue

                try:
                    holders = fetch_holders(
                        company.stock_ticker,
                        company.parent_company_name,
                        args.top_n,
                    )
                except Exception as exc:
                    skipped.append(company.stock_ticker)
                    print(f"{company.stock_ticker}: failed to fetch holder data ({exc}).")
                    continue

                if not holders:
                    skipped.append(company.stock_ticker)
                    print(f"{company.stock_ticker}: no institutional holder data found.")
                    continue

                print(
                    f"{company.stock_ticker}: fetched {len(holders)} holders "
                    f"for {company.parent_company_name}."
                )

                if not args.dry_run:
                    for shareholder in holders:
                        upsert_shareholder(cur, company.id, shareholder)

                total_rows += len(holders)

            if args.dry_run:
                conn.rollback()
            else:
                conn.commit()

    mode = "Fetched" if args.dry_run else "Upserted"
    print(f"{mode} {total_rows} shareholder rows across {len(companies)} companies.")
    if skipped:
        print(
            f"Skipped {len(skipped)} tickers without public equity holder data: "
            f"{', '.join(skipped)}"
        )


if __name__ == "__main__":
    main()
