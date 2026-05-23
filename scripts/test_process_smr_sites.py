import json
import os
import sys
import tempfile
import unittest

THIS_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, THIS_DIR)

from process_smr_sites import process_csv, ValidationError  # noqa: E402


VALID_ROW = {
    "site_id": "test-site",
    "site_name": "Test Site",
    "state": "TN",
    "lat": "35.9",
    "lon": "-84.4",
    "vendor": "GE Hitachi",
    "reactor_model": "BWRX-300",
    "owner": "Test Utility",
    "offtaker": "",
    "module_count": "1",
    "capacity_mwe_total": "300",
    "phase": "nrc_engaged",
    "target_cod": "2032",
    "nrc_docket": "52-049",
    "source_url": "https://example.com/source"
}


def write_csv(rows, path):
    import csv as csvmod
    fieldnames = list(VALID_ROW.keys())
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csvmod.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


class ProcessSmrSitesTests(unittest.TestCase):
    def test_valid_row_produces_json_record(self):
        with tempfile.TemporaryDirectory() as tmp:
            in_path = os.path.join(tmp, "in.csv")
            out_path = os.path.join(tmp, "out.json")
            write_csv([VALID_ROW], in_path)

            process_csv(in_path, out_path)

            with open(out_path, encoding="utf-8") as f:
                data = json.load(f)

            self.assertEqual(len(data), 1)
            rec = data[0]
            self.assertEqual(rec["site_id"], "test-site")
            self.assertEqual(rec["lat"], 35.9)
            self.assertEqual(rec["lon"], -84.4)
            self.assertEqual(rec["module_count"], 1)
            self.assertEqual(rec["capacity_mwe_total"], 300.0)
            self.assertEqual(rec["target_cod"], 2032)
            self.assertIsNone(rec["offtaker"])

    def test_invalid_phase_raises(self):
        bad = dict(VALID_ROW, phase="planning")
        with tempfile.TemporaryDirectory() as tmp:
            in_path = os.path.join(tmp, "in.csv")
            out_path = os.path.join(tmp, "out.json")
            write_csv([bad], in_path)
            with self.assertRaises(ValidationError) as ctx:
                process_csv(in_path, out_path)
            self.assertIn("test-site", str(ctx.exception))
            self.assertIn("phase", str(ctx.exception))

    def test_lat_out_of_us_bounds_raises(self):
        bad = dict(VALID_ROW, lat="60.0")
        with tempfile.TemporaryDirectory() as tmp:
            in_path = os.path.join(tmp, "in.csv")
            out_path = os.path.join(tmp, "out.json")
            write_csv([bad], in_path)
            with self.assertRaises(ValidationError) as ctx:
                process_csv(in_path, out_path)
            self.assertIn("test-site", str(ctx.exception))
            self.assertIn("lat", str(ctx.exception))

    def test_missing_source_url_raises(self):
        bad = dict(VALID_ROW, source_url="")
        with tempfile.TemporaryDirectory() as tmp:
            in_path = os.path.join(tmp, "in.csv")
            out_path = os.path.join(tmp, "out.json")
            write_csv([bad], in_path)
            with self.assertRaises(ValidationError) as ctx:
                process_csv(in_path, out_path)
            self.assertIn("source_url", str(ctx.exception))

    def test_zero_module_count_raises(self):
        bad = dict(VALID_ROW, module_count="0")
        with tempfile.TemporaryDirectory() as tmp:
            in_path = os.path.join(tmp, "in.csv")
            out_path = os.path.join(tmp, "out.json")
            write_csv([bad], in_path)
            with self.assertRaises(ValidationError):
                process_csv(in_path, out_path)


if __name__ == "__main__":
    unittest.main()
