"""
extract.py -- build step for the ATS Linear Track View.

Reads timetable.xlsx and emits ats-data.js: a single JS object literal holding
the DMRC Line 7 corridor (43 distinct stations) and every scheduled trip in the
sheet, split by direction.

Sheet layout
------------
  Upper table  rows 1-58    -> DN (Down) line. Odd trip numbers.
  Lower table  rows 61-113  -> UP line.        Even trip numbers.
  Time grid    one column per trip, one row per station.
  Column A     station-code labels, NOT a trip column.
  Column B     spacer / route note, NOT a trip column.

Cells are read as raw Excel serials straight out of sheet1.xml rather than via
openpyxl. openpyxl coerces time cells into datetimes according to the cell's
number format, so a 00:38 value can surface as 1900-01-01 00:38:11 and a
midnight-spanning value as 1900-12-31 06:04:25. The serials underneath are
clean day-fractions, so we use those and do the arithmetic ourselves.
"""

import io
import base64
import json
import os
import re
import time
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
XLSX = os.path.join(HERE, "timetable.xlsx")
OUT_JS = os.path.join(HERE, "l7-data.js")
TEMPLATE = os.path.join(HERE, "l7-template.html")
OUT_HTML = os.path.join(HERE, "line7-timetable-timesync.html")
OUT_ADMIN = os.path.join(HERE, "line7-timetable-admin.html")
ADMIN_TEMPLATE = os.path.join(HERE, "l7-admin-template.html")
META_JSON = os.path.join(HERE, "l7-meta.json")
MARKER = "/*__L7_DATA__*/"
META_MARKER = "/*__L7_META__*/"
BASE_MARKER = "/*__L7_BASE__*/"
UPLOAD_MARKER = "/*__L7_UPLOAD__*/"
UPLOAD_JS = os.path.join(HERE, "l7-upload.js")
CSS_MARKER = "/*__L7_CSS__*/"
STYLE_CSS = os.path.join(HERE, "style.css")

# Timetable registry. The source workbook holds exactly ONE timetable
# (sheet 07WDC09_24092026 = Thursday 24-Sep-2026), so saturday / sunday /
# special ship as honest "not loaded" stubs rather than invented services.
# Dropping a real extraction into one of these slots needs no template change.
TABLE_ORDER = ["weekday", "saturday", "sunday", "special"]
TABLE_LABEL = {"weekday": "WEEKDAY", "saturday": "SATURDAY",
               "sunday": "SUNDAY", "special": "SPECIAL"}
SOURCE_SHEET = "07WDC09_24092026"
SOURCE_DATE = "2026-09-24"     # sheet name decodes as 24-Sep-2026
SOURCE_DOW = 4                 # 0=Sun .. 4=Thu

# WEF = "with effect from", the standard Indian Railways term for the date a
# timetable comes into force. Only the weekday table has a real WEF here,
# because it is the only table the workbook actually contains.
DEFAULT_META = {
    "corridor": "DMRC LINE 7 - PINK CORRIDOR",
    "authority": "",
    # When true the viewer refuses to fall back to a different timetable than
    # the one the date programme asked for; it renders an explicit refusal
    # instead of silently showing substitute service.
    "strict": False,
    # Date -> timetable overrides, written by the admin console and baked into
    # the end-user file. The end user has no selector, so these ARE the only
    # way a non-weekday timetable ever gets shown.
    "program": [],
    "tables": {
        "weekday":  {"label": "WEEKDAY",  "wef": SOURCE_DATE, "weto": "", "note": ""},
        "saturday": {"label": "SATURDAY", "wef": "", "weto": "",
                     "note": "No Saturday service data supplied."},
        "sunday":   {"label": "SUNDAY",   "wef": "", "weto": "",
                     "note": "No Sunday service data supplied."},
        "special":  {"label": "SPECIAL",  "wef": "", "weto": "",
                     "note": "No special / holiday service data supplied."},
    },
}


def load_meta():
    """Defaults, overlaid with l7-meta.json when the admin has exported one."""
    m = json.loads(json.dumps(DEFAULT_META))
    if not os.path.exists(META_JSON):
        return m
    try:
        with io.open(META_JSON, encoding="utf8") as fh:
            over = json.load(fh)
    except Exception as exc:
        print("WARNING: %s is unreadable (%s), using defaults" % (META_JSON, exc))
        return m
    for k, v in (over.get("tables") or {}).items():
        if k in m["tables"] and isinstance(v, dict):
            for f in ("label", "wef", "weto", "note"):
                if isinstance(v.get(f), str):
                    m["tables"][k][f] = v[f]
    for f in ("corridor", "authority"):
        if isinstance(over.get(f), str):
            m[f] = over[f]
    if isinstance(over.get("strict"), bool):
        m["strict"] = over["strict"]
    m["program"] = clean_program(over.get("program"), m["tables"])
    return m


def clean_program(raw, tables):
    """Keep only entries that can actually resolve, and say what was dropped.

    Ambiguity is a collision of specificity: two exact rules on one date, or two
    annual rules on one MM-DD, cannot both apply, so the later one is dropped
    here rather than left for the viewer's table-id tie-break to decide. An exact
    date and an annual recurrence that share a calendar day are different rules
    and both survive -- the exact one is the more specific and wins.
    """
    out = []
    for e in (raw if isinstance(raw, list) else []):
        if not isinstance(e, dict):
            continue
        d, t = e.get("date"), e.get("table")
        if not isinstance(d, str) or not re.match(r"^\d{4}-\d{2}-\d{2}$", d):
            print("   programme: dropped %r -- date must be YYYY-MM-DD" % (d,))
            continue
        if t not in tables:
            print("   programme: dropped %s -> %r -- no such timetable" % (d, t))
            continue
        annual = bool(e.get("annual"))
        clash = None
        for o in out:
            if bool(o["annual"]) != annual:
                continue
            same = o["date"][5:] == d[5:] if annual else o["date"] == d
            if same:
                clash = o
                break
        if clash:
            print("   programme: dropped %s -> %s -- %s rule for %s already set to %s"
                  % (d, t, "annual" if annual else "exact",
                     d[5:] if annual else d, clash["table"]))
            continue
        out.append({"date": d, "table": t, "annual": annual})
    out.sort(key=lambda x: (x["date"], x["table"]))
    return out

FIRST_COL = 3           # C -- column A holds labels, B is a spacer
LAST_COL = 194          # GL -- real data stops here
MIN_CELLS = 5           # a trip must cover at least this many stations

# (label, trip_row, depot_row, md_row, first_grid_row, last_grid_row, direction)
BLOCKS = [
    ("DN",  1,  7,  8,   9,  52, "dn"),
    ("UP", 62, 66, 67,  68, 111, "up"),
]

# Cells are matched by the opening tag first, then the reference is read out of
# the attribute list. Every writer puts r="..." somewhere, but not necessarily
# first -- <c s="1" r="C9" t="s"> is legal SpreadsheetML -- and a regex anchored
# on r="..." at the start of the tag would silently skip every such cell.
CELL_RE = re.compile(r'<c\b([^>]*?)(?:/>|>(.*?)</c>)', re.S)
REF_RE = re.compile(r'\br="([A-Z]+)(\d+)"')
VAL_RE = re.compile(r"<v>(.*?)</v>", re.S)
SI_RE = re.compile(r"<si>(.*?)</si>", re.S)
T_RE = re.compile(r"<t[^>]*>(.*?)</t>", re.S)
ROW_RE = re.compile(r'<row[^>]*\br="(\d+)"[^>]*>(.*?)</row>', re.S)

# Ceilings for the source workbook and for any single part read out of it. The
# real file is ~0.45 MB with a ~3 MB worksheet, so these are generous; they exist
# to stop a malformed or hostile workbook expanding without bound.
MAX_WORKBOOK = 16 * 1024 * 1024
MAX_XML = 32 * 1024 * 1024
ALLOWED_METHODS = (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED)


def read_member(zf, name, limit=MAX_XML):
    """Read one zip member as text.

    Refuses a compression method the browser engine cannot decode too, so the
    two parsers accept and reject exactly the same workbooks, and caps the bytes
    actually produced rather than trusting a declared size.
    """
    try:
        info = zf.getinfo(name)
    except KeyError:
        return None
    if info.compress_type not in ALLOWED_METHODS:
        raise SystemExit("timetable.xlsx member %s uses compression method %d, which "
                         "is not supported (only stored and deflate entries can be read)"
                         % (name, info.compress_type))
    if info.file_size and info.file_size > limit:
        raise SystemExit("timetable.xlsx member %s declares %d bytes uncompressed, over the "
                         "%d byte limit" % (name, info.file_size, limit))
    data = zf.read(name)
    if len(data) > limit:
        raise SystemExit("timetable.xlsx member %s decompressed to %d bytes, over the "
                         "%d byte limit" % (name, len(data), limit))
    return data.decode("utf8", "replace")


def col_to_num(letters):
    n = 0
    for ch in letters:
        n = n * 26 + (ord(ch) - 64)
    return n


def unescape(s):
    return (s.replace("&lt;", "<").replace("&gt;", ">")
             .replace("&quot;", '"').replace("&apos;", "'")
             .replace("&amp;", "&"))


def load_shared_strings(zf):
    raw = read_member(zf, "xl/sharedStrings.xml")
    if raw is None:
        return []
    return ["".join(unescape(t.group(1)) for t in T_RE.finditer(si.group(1)))
            for si in SI_RE.finditer(raw)]


def load_sheet(path):
    """Return {(row, col): str | float}. Numerics stay as raw serials."""
    if os.path.getsize(path) > MAX_WORKBOOK:
        raise SystemExit("timetable.xlsx is %d bytes, over the %d byte limit"
                         % (os.path.getsize(path), MAX_WORKBOOK))
    zf = zipfile.ZipFile(path)
    try:
        shared = load_shared_strings(zf)
        xml = read_member(zf, "xl/worksheets/sheet1.xml")
        if xml is None:
            raise SystemExit("timetable.xlsx has no xl/worksheets/sheet1.xml")
    finally:
        zf.close()

    cells = {}
    for rm in ROW_RE.finditer(xml):
        row = int(rm.group(1))
        for cm in CELL_RE.finditer(rm.group(2)):
            attrs, inner = cm.group(1) or "", cm.group(2) or ""
            ref = REF_RE.search(attrs)
            if not ref:
                continue
            col = col_to_num(ref.group(1))
            vm = VAL_RE.search(inner)
            if not vm:
                continue
            raw = unescape(vm.group(1))
            if 't="s"' in attrs:
                try:
                    cells[(row, col)] = shared[int(raw)]
                except (ValueError, IndexError):
                    pass
            else:
                try:
                    cells[(row, col)] = float(raw)
                except ValueError:
                    cells[(row, col)] = raw
    return cells


def to_secs(v):
    """Excel day-fraction -> seconds after midnight.

    Values above 1.0 are trips that run past midnight into the next service
    day; they are kept as 86400+ so the replay stays monotonic.
    """
    if not isinstance(v, float) or v < 0.0 or v >= 2.0:
        return None
    return int(round(v * 86400.0))

def build(cells):
    # Corridor: col A rows 9..52. The last slot repeats the first (MKPR) --
    # that repetition is the sheet closing the ring, so KEEP it. The board then
    # starts at MKPR and finishes at MKPR, and the closing link (BURI -> MKPR)
    # is drawn as real track instead of being hidden.
    raw = [cells.get((r, 1)) for r in range(9, 53)]
    raw = [s.strip() for s in raw if isinstance(s, str) and s.strip()]
    stops = raw
    ring = bool(len(stops) > 1 and stops[0] == stops[-1])

    data = {"stops": stops, "ring": ring, "dn": [], "up": []}
    st = {"parity": [], "dropped": [], "repaired": 0, "partial": 0, "zero": 0}

    for label, trip_r, depot_r, md_r, r0, r1, key in BLOCKS:
        for col in range(FIRST_COL, LAST_COL + 1):
            no = cells.get((trip_r, col))
            if not isinstance(no, float):
                continue
            no = int(no)

            times = [to_secs(cells.get((r, col))) for r in range(r0, r1 + 1)]
            filled = [i for i, t in enumerate(times) if t is not None]
            if len(filled) < MIN_CELLS:
                st["dropped"].append((label, no, len(filled)))
                continue

            a, b = filled[0], filled[-1]
            if a != 0 or b != len(times) - 1:
                st["partial"] += 1

            # Forward-fill interior gaps, then force non-decreasing so a train
            # can never jump backwards on screen.
            repaired = False
            for i in range(a + 1, b + 1):
                if times[i] is None:
                    times[i] = times[i - 1]
                    repaired = True
                elif times[i] < times[i - 1]:
                    times[i] = times[i - 1]
                    repaired = True
            if repaired:
                st["repaired"] += 1

            # Two adjacent calls at the same instant are a zero-second link. They
            # are legal (this workbook has two, both a station with no booked time
            # that the fill above carries forward), so they are counted for review
            # and left exactly as booked. Counted after the fill, because that is
            # the shape the board will actually draw.
            for i in range(a + 1, b + 1):
                if times[i] == times[i - 1]:
                    st["zero"] += 1

            depot = cells.get((depot_r, col))
            md = cells.get((md_r, col))
            rec = {"n": no, "a": a, "b": b, "t": times}
            if isinstance(depot, str) and depot.strip() and depot.strip() != "DEPOT":
                rec["d"] = depot.strip()
            if isinstance(md, str) and md.strip() in ("M", "D"):
                rec["m"] = md.strip()
            if (no % 2 == 0) == (key == "dn"):
                rec["x"] = 1          # parity mismatch, kept but flagged
                st["parity"].append((label, no))
            data[key].append(rec)

    data["_stats"] = st
    return data


def hhmmss(s):
    s = int(s)
    return "%02d:%02d:%02d" % (s // 3600, (s % 3600) // 60, s % 60)


def js_literal(obj):
    """JSON for a <script> context.

    json.dumps leaves "<" alone, so a station code or a label containing
    "</script>" would close the viewer's script element early when the built file
    is parsed as HTML and the rest of the payload would spill into the document
    as markup. "<" escaped as \\u003c is inert once the literal is parsed as JS
    and cannot end the element. ensure_ascii (the default) already escapes every
    non-ASCII code point, including the U+2028/U+2029 line terminators.
    """
    return json.dumps(obj, separators=(",", ":")).replace("<", "\\u003c")


def active_at(trips, T):
    return sum(1 for t in trips if t["t"][t["a"]] <= T <= t["t"][t["b"]])


def main():
    data = build(load_sheet(XLSX))
    st = data["_stats"]
    dn, up = data["dn"], data["up"]

    print("corridor   : %d slots  %s" % (len(data["stops"]), "RING" if data["ring"] else "open"))
    print("              %s -> ... -> %s" % (data["stops"][0], data["stops"][-1]))
    print("DN trips   : %d      UP trips : %d      total %d"
          % (len(dn), len(up), len(dn) + len(up)))
    print("partial    : %d (inducted / short-turn workings)" % st["partial"])
    print("dropped    : %d  (fewer than %d stop times)" % (len(st["dropped"]), MIN_CELLS))
    print("monotonic  : %d trips repaired" % st["repaired"])
    print("zero links : %d adjacent calls share a booked time (allowed, flagged)"
          % st["zero"])
    print("parity     : %d flagged  %s" % (len(st["parity"]), st["parity"][:10]))

    lo = min(t["t"][t["a"]] for t in dn + up)
    hi = max(t["t"][t["b"]] for t in dn + up)
    print("window     : %s .. %s" % (hhmmss(lo), hhmmss(hi)))
    for hhmm in ("05:30", "07:30", "12:00", "18:00", "22:00"):
        h, m = (int(x) for x in hhmm.split(":"))
        T = h * 3600 + m * 60
        print("   %s  DN %2d   UP %2d   total %2d"
              % (hhmm, active_at(dn, T), active_at(up, T), active_at(dn, T) + active_at(up, T)))

    payload = {
        "meta": {
            "corridor": data["stops"],
            "source": SOURCE_SHEET,
            "validFor": SOURCE_DATE,
            "dow": SOURCE_DOW,
            "built": time.strftime("%Y-%m-%d %H:%M"),
        },
        "tables": {
            "weekday": {
                "loaded": True, "label": TABLE_LABEL["weekday"],
                "sheet": SOURCE_SHEET, "validFor": SOURCE_DATE,
                "dow": SOURCE_DOW, "window": [lo, hi],
                "dn": dn, "up": up,
            },
            "saturday": {"loaded": False, "label": TABLE_LABEL["saturday"]},
            "sunday":   {"loaded": False, "label": TABLE_LABEL["sunday"]},
            "special":  {"loaded": False, "label": TABLE_LABEL["special"]},
        },
        "order": TABLE_ORDER,
    }
    js = "window.L7_DATA = " + js_literal(payload) + ";\n"
    with open(OUT_JS, "w", encoding="utf8") as fh:
        fh.write(js)
    print("\nwrote %s  (%.1f KB)" % (OUT_JS, os.path.getsize(OUT_JS) / 1024.0))

    for key in TABLE_ORDER:
        tb = payload["tables"][key]
        if tb.get("loaded"):
            print("table %-9s LOADED   %d trips  %s"
                  % (key, len(tb["dn"]) + len(tb["up"]), tb["sheet"]))
        else:
            print("table %-9s NOT LOADED (no source data in workbook)" % key)

    meta = load_meta()
    meta["tables"]["weekday"]["loaded"] = True
    for k in TABLE_ORDER:
        meta["tables"][k]["loaded"] = bool(payload["tables"][k].get("loaded"))
    mjs = "window.L7_META = " + js_literal(meta) + ";\n"
    with io.open(os.path.join(HERE, "l7-meta.js"), "w", encoding="utf8") as fh:
        fh.write(mjs)

    tpl = io.open(TEMPLATE, encoding="ascii").read()
    for mk, what in ((MARKER, "L7_DATA"), (META_MARKER, "L7_META"),
                     (CSS_MARKER, "L7_CSS")):
        if mk not in tpl:
            raise SystemExit("template is missing the %s marker (%s)" % (mk, what))

    # The stylesheet is edited as its own file but shipped inline, because the
    # end user has to be able to open this from disk with no network. A <link>
    # or an @import would both break under file://, and gate() below refuses
    # them, so the split is a source-code convenience only -- never a runtime
    # dependency.
    css_all = io.open(STYLE_CSS, encoding="ascii").read()
    css = css_all
    MARK_CSS = "CUT HERE ==== build input ends"
    if MARK_CSS in css_all:
        css = css_all.split(MARK_CSS, 1)[1].split("*/", 1)[1].lstrip("\n")
    # Strip comments before checking. A comment cannot load anything, and this
    # file's own header has to be able to mention @import and url() by name --
    # otherwise documenting the rule would trip the rule.
    css_code = re.sub(r"/\*.*?\*/", " ", css, flags=re.S)
    for pat, why in ((r"@import", "CSS import"),
                     (r"url\(\s*['\"]?(?!data:)[a-z]+:", "CSS url()")):
        m = re.search(pat, css_code, re.I)
        if m:
            raise SystemExit("style.css must not reference anything external -- %s at offset %d: %r"
                             % (why, m.start(), css_code[max(0, m.start() - 40):m.start() + 40]))
    print("stylesheet: %d lines inlined from style.css (%d line header kept out of the build)"
          % (len(css.splitlines()), len(css_all.splitlines()) - len(css.splitlines())))

    html = (tpl.replace(MARKER, js, 1).replace(META_MARKER, mjs, 1)
               .replace(CSS_MARKER, css, 1))
    with io.open(OUT_HTML, "w", encoding="utf8") as fh:
        fh.write(html)
    print("\nwrote %s  (%.1f KB)" % (OUT_HTML, os.path.getsize(OUT_HTML) / 1024.0))
    for k in TABLE_ORDER:
        t = meta["tables"][k]
        print("   %-9s wef %-10s  %s" % (k, t["wef"] or "-", t["note"] or "-"))
    if meta["program"]:
        print("   programme : %d programmed date%s" % (
            len(meta["program"]), "" if len(meta["program"]) == 1 else "s"))
        for e in meta["program"]:
            print("      %s -> %-9s %s" % (e["date"], e["table"],
                                           "(annually)" if e["annual"] else ""))
    else:
        print("   programme : none, the end user follows the day of the week")
    gate(OUT_HTML)

    # The admin file carries a base64 copy of the finished end-user page. That
    # keeps a single source of truth for the data (no second copy to drift) and
    # lets the admin export an updated end-user file with new metadata baked in.
    atpl = io.open(ADMIN_TEMPLATE, encoding="ascii").read()
    if BASE_MARKER not in atpl:
        raise SystemExit("admin template is missing the %s marker" % BASE_MARKER)

    # The upload engine lives in its own file so it can be gated on its own and
    # so the parsing rules stay readable. It must remain dependency-free: the
    # admin page has to work from disk with no network at all.
    engine = io.open(UPLOAD_JS, encoding="ascii").read()
    if UPLOAD_MARKER not in atpl:
        raise SystemExit("admin template is missing the %s marker" % UPLOAD_MARKER)
    if re.search(r"https?://", engine) or re.search(r"\bATS\b", engine):
        raise SystemExit("upload engine failed the self-contained gate")
    print("upload engine: %d bytes, self-contained" % len(engine))

    b64 = base64.b64encode(html.encode("utf8")).decode("ascii")
    ahtml = atpl.replace(UPLOAD_MARKER, engine, 1).replace(BASE_MARKER, b64, 1)
    with io.open(OUT_ADMIN, "w", encoding="utf8") as fh:
        fh.write(ahtml)
    print("wrote %s  (%.1f KB)" % (OUT_ADMIN, os.path.getsize(OUT_ADMIN) / 1024.0))
    gate(OUT_ADMIN)


def gate(path):
    """Refuse to ship a file that breaks the two hard promises: it is fully
    self-contained (no network), and it does not present itself as an ATS."""
    html = io.open(path, encoding="utf8").read()
    if path == OUT_ADMIN:
        # The embedded base64 payload is opaque, so audit the template around it.
        # By this point the marker has already been replaced, so the payload has
        # to be recognised by the assignment it sits in and blanked, not by
        # splitting on a marker that is no longer there.
        html = re.sub(r'window\.L7_BASE = "[^"]*";', 'window.L7_BASE = "";', html)
    problems = []

    for pat, why in ((r"https?://", "external URL"),
                     (r"<script[^>]+\ssrc\s*=", "external script"),
                     (r"<link[^>]+\shref\s*=", "external stylesheet"),
                     (r"@import", "CSS import"),
                     (r"url\(\s*['\"]?(?!data:)[a-z]+:", "CSS url()")):
        for m in re.finditer(pat, html, re.I):
            problems.append("%s at offset %d: %r"
                            % (why, m.start(), html[max(0, m.start() - 40):m.start() + 40]))

    # branding: flag ATS only where it reads as a product claim
    for m in re.finditer(r"ATS", html):
        ctx = html[max(0, m.start() - 30):m.start() + 30].replace("\n", " ")
        problems.append("ATS branding: ...%s..." % ctx)

    if problems:
        print("\nBUILD GATE FAILED (%d):" % len(problems))
        for p in problems[:20]:
            print("   " + p)
        raise SystemExit(1)
    print("gate       : OK  (self-contained, no ATS branding)")


if __name__ == "__main__":
    main()
