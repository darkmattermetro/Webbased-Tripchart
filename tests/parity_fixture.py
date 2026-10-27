"""tests/parity_fixture.py -- helper for tests/parity.test.js.

Imports extract.py directly and runs its build() on the fixture workbook,
emitting the full in-memory data object (stops, ring, dn, up, _stats) as JSON
so the Node side can deep-compare it against l7-upload.js's buildFromCells.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, ROOT)

import extract  # noqa: E402  (import after path insert)

XLSX = os.path.join(ROOT, "timetable.xlsx")


def main():
    cells = extract.load_sheet(XLSX)
    data = extract.build(cells)
    out = {
        "stops": data["stops"],
        "ring": data["ring"],
        "dn": data["dn"],
        "up": data["up"],
        "_stats": data["_stats"],
    }
    print(json.dumps(out))


if __name__ == "__main__":
    main()
