"""Process data/raw/smr_sites.csv into frontend/src/data/smr_sites.json.

Validates every row; fails loudly with the offending site_id on any issue.
"""
import csv
import json
import os
import sys

ALLOWED_PHASES = {"announced", "nrc_engaged", "under_construction"}

REQUIRED_FIELDS = [
    "site_id",
    "site_name",
    "state",
    "lat",
    "lon",
    "vendor",
    "reactor_model",
    "owner",
    "module_count",
    "capacity_mwe_total",
    "phase",
    "source_url",
]

OPTIONAL_FIELDS = ["offtaker", "target_cod", "nrc_docket"]

LAT_MIN, LAT_MAX = 18.0, 49.5
LON_MIN, LON_MAX = -180.0, -65.0


class ValidationError(Exception):
    pass


def _parse_float(site_id, field, value):
    try:
        return float(value)
    except (TypeError, ValueError):
        raise ValidationError(f"{site_id}: {field} must be numeric, got {value!r}")


def _parse_int(site_id, field, value):
    try:
        return int(value)
    except (TypeError, ValueError):
        raise ValidationError(f"{site_id}: {field} must be an integer, got {value!r}")


def _validate_and_transform(row):
    site_id = (row.get("site_id") or "").strip()
    if not site_id:
        raise ValidationError("row missing site_id")

    for field in REQUIRED_FIELDS:
        value = (row.get(field) or "").strip()
        if not value:
            raise ValidationError(f"{site_id}: {field} is required")

    lat = _parse_float(site_id, "lat", row["lat"])
    lon = _parse_float(site_id, "lon", row["lon"])
    if not (LAT_MIN <= lat <= LAT_MAX):
        raise ValidationError(f"{site_id}: lat {lat} outside US bounds")
    if not (LON_MIN <= lon <= LON_MAX):
        raise ValidationError(f"{site_id}: lon {lon} outside US bounds")

    module_count = _parse_int(site_id, "module_count", row["module_count"])
    if module_count <= 0:
        raise ValidationError(f"{site_id}: module_count must be positive, got {module_count}")

    capacity = _parse_float(site_id, "capacity_mwe_total", row["capacity_mwe_total"])
    if capacity <= 0:
        raise ValidationError(f"{site_id}: capacity_mwe_total must be positive, got {capacity}")

    phase = row["phase"].strip()
    if phase not in ALLOWED_PHASES:
        raise ValidationError(
            f"{site_id}: phase {phase!r} not in {sorted(ALLOWED_PHASES)}"
        )

    target_cod_raw = (row.get("target_cod") or "").strip()
    target_cod = _parse_int(site_id, "target_cod", target_cod_raw) if target_cod_raw else None

    def opt(name):
        value = (row.get(name) or "").strip()
        return value if value else None

    return {
        "site_id": site_id,
        "site_name": row["site_name"].strip(),
        "state": row["state"].strip(),
        "lat": lat,
        "lon": lon,
        "vendor": row["vendor"].strip(),
        "reactor_model": row["reactor_model"].strip(),
        "owner": row["owner"].strip(),
        "offtaker": opt("offtaker"),
        "module_count": module_count,
        "capacity_mwe_total": capacity,
        "phase": phase,
        "target_cod": target_cod,
        "nrc_docket": opt("nrc_docket"),
        "source_url": row["source_url"].strip(),
    }


def process_csv(input_path, output_path):
    records = []
    seen_ids = set()
    with open(input_path, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rec = _validate_and_transform(row)
            if rec["site_id"] in seen_ids:
                raise ValidationError(f"{rec['site_id']}: duplicate site_id")
            seen_ids.add(rec["site_id"])
            records.append(rec)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2)
        f.write("\n")
    return records


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    repo = os.path.abspath(os.path.join(here, os.pardir))
    in_path = os.path.join(repo, "data", "raw", "smr_sites.csv")
    out_path = os.path.join(repo, "frontend", "src", "data", "smr_sites.json")
    records = process_csv(in_path, out_path)
    print(f"Wrote {len(records)} SMR sites to {out_path}")


if __name__ == "__main__":
    try:
        main()
    except ValidationError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
