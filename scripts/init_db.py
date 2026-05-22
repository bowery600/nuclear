from __future__ import annotations

import os
from pathlib import Path

import psycopg
from dotenv import load_dotenv


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SQL_DIR = PROJECT_ROOT / "sql"


def main() -> None:
    load_dotenv(PROJECT_ROOT / ".env")

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise SystemExit("DATABASE_URL is required. Copy .env.example to .env first.")

    sql_dir = Path(os.getenv("SQL_DIR", DEFAULT_SQL_DIR))
    if not sql_dir.exists():
        raise SystemExit(f"SQL directory not found: {sql_dir}")

    sql_files = sorted(sql_dir.glob("*.sql"))
    if not sql_files:
        raise SystemExit(f"No SQL files found in {sql_dir}")

    with psycopg.connect(database_url, prepare_threshold=None) as conn:
        for sql_file in sql_files:
            sql = sql_file.read_text(encoding="utf-8")
            with conn.cursor() as cur:
                cur.execute(sql)
            print(f"Applied {sql_file}")
        conn.commit()


if __name__ == "__main__":
    main()
