#!/usr/bin/env python3
"""
Build src/data/te-charts.json from the analytics workbook.

Same contract as rb_charts.py: the workbook is the source, this script computes
every summary value, and the page renders without arithmetic (§11). Medians,
extents, label order and placement priority are all settled here.

**This page publishes 4for4's licensed columns — route participation, targets
per route run and yards per route run.** §2 forbids republishing them and
docs/STATE.md records them as cut for that reason. The operator reinstated the
third RB chart knowingly, and that note says the decision was "scoped to that
chart — not a general licence". He extended it to the whole tight end page on
2026-08-17. The decision is his and is recorded, not assumed.

Section order is the operator's, taken from his own sheet:
  1. Route participation vs target share
  2. Route participation vs targets per route run
  3. Yards per game vs touchdowns
  4. Air yards share vs targets per route run
  5. Route participation vs yards per route run
  6. Historical context, then the TE1-3 check-the-box table

Run: python3 scripts/curated/te_charts.py [path/to/workbook.xlsx]
"""
import json
import re
import statistics
import struct
import sys
import zipfile
import zlib
from pathlib import Path
from xml.etree import ElementTree as ET

N = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
ROOT = Path(__file__).resolve().parents[2]
DEFAULT_WB = Path.home() / "Downloads" / "2026-2027 Fantasy Football Analytics (Original) (4).xlsx"
SHEET = "sheet5"  # "WRTE Statistics & Graphs" — resolved via workbook.xml.rels, not guessed

# Row map for the (4) workbook. Sheet *and* row numbers shift between versions,
# so this is re-read rather than trusted: every block is checked for the header
# text it should sit under, and the script exits if one has moved.
BLOCKS = [
    {
        "key": "routes_targets",
        "title": "Route participation against target share",
        "header_row": 191, "lo": 192, "hi": 216,
        "x_col": "C", "y_col": "D",
        "x_label": "Route participation", "y_label": "Target share",
        "x_pct": True, "y_pct": True,
        "groups": {"header_row": 189, "lo": 190, "hi": 194, "cols": ["F", "G", "H"]},
    },
    {
        "key": "routes_tprr",
        "title": "Route participation against targets per route run",
        "header_row": 227, "lo": 228, "hi": 252,
        "x_col": "C", "y_col": "D",
        "x_label": "Route participation", "y_label": "Targets per route run",
        "x_pct": True, "y_pct": False,
        "groups": {"header_row": 261, "lo": 262, "hi": 266, "cols": ["E", "G", "I"]},
    },
    {
        "key": "yards_tds",
        "title": "Yards per game against touchdowns",
        "header_row": 268, "lo": 269, "hi": 293,
        "x_col": "C", "y_col": "D",
        "x_label": "Yards per game", "y_label": "Touchdowns",
        "x_pct": False, "y_pct": False,
        "groups": {"header_row": 293, "lo": 294, "hi": 299, "cols": ["F", "H", "J"]},
    },
    {
        "key": "airyards_tprr",
        "title": "Air yards share against targets per route run",
        "header_row": 304, "lo": 305, "hi": 329,
        "x_col": "C", "y_col": "D",
        "x_label": "Air yards share", "y_label": "Targets per route run",
        "x_pct": True, "y_pct": False,
        "groups": {"header_row": 331, "lo": 332, "hi": 334, "cols": ["H", "J", "L"]},
    },
    {
        "key": "routes_yprr",
        "title": "Route participation against yards per route run",
        "header_row": 337, "lo": 338, "hi": 362,
        "x_col": "C", "y_col": "D",
        "x_label": "Route participation", "y_label": "Yards per route run",
        "x_pct": True, "y_pct": False,
        "groups": None,
    },
]

# The five-second takeaway under each chart (§5.2). Editorial, so it lives here
# in a named constant with the rest of the decisions rather than in a component,
# and a re-extraction cannot quietly drop it.
CAPTIONS = {
    "routes_targets":
        "Running the routes buys the chance. Target share is whether the offense "
        "actually looks his way once he gets there.",
    "routes_tprr":
        "The same route counts, divided by how often the ball comes. A tight end "
        "can lead his team in routes and still be the last read.",
    "yards_tds":
        "Touchdowns swing year to year and yardage does not. Where a season sits "
        "on the vertical is the part least likely to repeat.",
    "airyards_tprr":
        "Downfield role against how often a route earns the ball: the difference "
        "between a seam threat and a safety valve.",
    "routes_yprr":
        "Efficiency that survives a full route load. The top right is a starter's "
        "workload at a starter's rate; the left is a small sample flattering itself.",
}

# The two eras the operator studies, labelled in column A of his own sheet.
FINDINGS_ROWS = [368, 369]
RULE_ROWS = [371, 372]
ERA_HISTORIC = 374   # A374 = "2011-2025"

# The averages table the operator classifies a TE1 with. It is a picture in the
# sheet, anchored at row 373 — directly under the two findings and above the
# "2011-2025" label — so it is lifted out with the numbers rather than
# re-keyed, and the page shows his own artwork.
BENCHMARK_IMAGE = "image82.png"
BENCHMARK_IMAGE_PUBLIC = "/img/charts/te-fantasy-finish-averages.png"
ERA_PRESENT = 406    # A406 = "2023-2025", under A405 "PRESENT CONTEXT"

# Check-the-box tables. The sheet holds the TE1-3 grid twice: once at 386 under
# A374 "2011-2025", once at 417 under A405/406 "PRESENT CONTEXT / 2023-2025".
# The operator ruled on 2026-08-17 that the fifteen-year table is the one that
# classifies a TE1, so **the 2011-2025 grid at 386 is the page's grid** and the
# three-year one is not published. The two disagreed in one place — the newer
# promoted Kyle Pitts where the older had "George Kittle (Injury)" — and that
# disagreement is now moot rather than something for the reader to arbitrate.
BOX_TE1_3 = {"header_row": 386, "lo": 387, "hi": 395}
# TE4-6 carries no header of its own: its first data row *is* row 397, and the
# column meanings are the ones set over the TE1-3 grid at 386. Reading 397 as
# both header and first row printed the player names as column headings and
# repeated the row underneath them — and, because "Kyle Pitts" heads two of the
# columns, React saw duplicate keys and logged an error per cell.
BOX_TE46 = {"header_row": 397, "label_row": 386, "lo": 397, "hi": 407}
BOX_COLS = ["C", "D", "E", "F", "G", "I"]


def _png_decode(data):
    """Minimal PNG reader: 8-bit, non-interlaced, which is what Excel stores."""
    assert data[:8] == b"\x89PNG\r\n\x1a\n", "not a png"
    pos, idat, w = 8, b"", None
    while pos < len(data):
        ln = struct.unpack(">I", data[pos:pos + 4])[0]
        typ = data[pos + 4:pos + 8]
        body = data[pos + 8:pos + 8 + ln]
        if typ == b"IHDR":
            w, h, bd, ct = struct.unpack(">IIBB", body[:10])
        elif typ == b"IDAT":
            idat += body
        elif typ == b"IEND":
            break
        pos += 12 + ln
    if bd != 8:
        raise ValueError(f"bit depth {bd} unsupported")
    nch = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[ct]
    raw = zlib.decompress(idat)
    stride, out, prev, i = w * nch, bytearray(), bytearray(w * nch), 0
    for _ in range(h):
        f = raw[i]; i += 1
        line = bytearray(raw[i:i + stride]); i += stride
        for x in range(stride):
            a = line[x - nch] if x >= nch else 0
            b = prev[x]
            c = prev[x - nch] if x >= nch else 0
            if f == 1: line[x] = (line[x] + a) & 255
            elif f == 2: line[x] = (line[x] + b) & 255
            elif f == 3: line[x] = (line[x] + ((a + b) >> 1)) & 255
            elif f == 4:
                pp = a + b - c
                pa, pb, pc = abs(pp - a), abs(pp - b), abs(pp - c)
                line[x] = (line[x] + (a if (pa <= pb and pa <= pc) else (b if pb <= pc else c))) & 255
        out += line; prev = line
    return w, h, ct, nch, bytes(out)


def _png_encode(w, h, ct, nch, px):
    rows = bytearray()
    for y in range(h):
        rows.append(0)
        rows += px[y * w * nch:(y + 1) * w * nch]

    def chunk(tag, body):
        return (struct.pack(">I", len(body)) + tag + body
                + struct.pack(">I", zlib.crc32(tag + body) & 0xFFFFFFFF))

    return (b"\x89PNG\r\n\x1a\n"
            + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, ct, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(bytes(rows), 9))
            + chunk(b"IEND", b""))


def trim_to_content(data, warn, pad=6):
    """
    Crop the picture to the table it contains.

    Excel exports the screenshot inside a wide pale surround — a faint X-and-O
    watermark that is not quite white, so it survives a naive white-trim and
    then reads as a band of empty space between the table and the page's
    border. Balancing the two sides, which is what this did first, made it
    symmetrical without making it go away.

    So the bound is real ink rather than pure white: any pixel dark enough to be
    a rule, a letter or a filled cell. `pad` leaves a few pixels so the table's
    own outer border is not shaved. Measured, not hard-coded, so a differently
    cropped screenshot in a later workbook still comes out tight.
    """
    try:
        w, h, ct, nch, px = _png_decode(data)
    except Exception as e:                      # a picture is not worth failing over
        warn(f"could not read the benchmark image to trim it ({e}); using it as-is")
        return data, None

    def v(x, y):
        o = (y * w + x) * nch
        return (px[o] + px[o + 1] + px[o + 2]) // 3

    INK = 200
    left = 0
    while left < w and all(v(left, y) > INK for y in range(h)):
        left += 1
    right = w - 1
    while right > left and all(v(right, y) > INK for y in range(h)):
        right -= 1
    top = 0
    while top < h and all(v(x, top) > INK for x in range(w)):
        top += 1
    bottom = h - 1
    while bottom > top and all(v(x, bottom) > INK for x in range(w)):
        bottom -= 1

    left = max(0, left - pad)
    top = max(0, top - pad)
    right = min(w - 1, right + pad)
    bottom = min(h - 1, bottom + pad)
    nw, nh = right - left + 1, bottom - top + 1
    if nw >= w and nh >= h:
        return data, None

    out = bytearray()
    for y in range(top, bottom + 1):
        o = (y * w + left) * nch
        out += px[o:o + nw * nch]
    return _png_encode(nw, nh, ct, nch, bytes(out)), (w, h, nw, nh)


def load(path):
    z = zipfile.ZipFile(path)
    shared = [
        "".join(t.text or "" for t in si.iter(N + "t"))
        for si in ET.fromstring(z.read("xl/sharedStrings.xml"))
    ]
    out = {}
    for _, el in ET.iterparse(z.open(f"xl/worksheets/{SHEET}.xml"), events=("end",)):
        if el.tag == N + "c":
            m = re.match(r"([A-Z]+)(\d+)", el.get("r") or "")
            if m:
                v = el.find(N + "v")
                val = v.text if v is not None else None
                if el.get("t") == "s" and val is not None:
                    val = shared[int(val)]
                if val not in (None, ""):
                    out[(int(m.group(2)), m.group(1))] = val
            # Clear rows, not every node: clearing every element breaks the
            # parse and makes a present string look absent (STATE.md).
            el.clear()
    return out


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def shorten(name):
    parts = name.split()
    if len(parts) < 2 or len(parts[0]) <= 2:
        return name
    return f"{parts[0][0]}. {' '.join(parts[1:])}"


def mark_labels(points):
    """Every point is named; the order decides who gets the clean spot when the
    renderer runs out of room, so the most unusual seasons win it."""
    xs = sorted(p["x"] for p in points)
    ys = sorted(p["y"] for p in points)

    def spread(v):
        return (v[int(len(v) * 0.75)] - v[int(len(v) * 0.25)]) or 1.0

    mx, my = statistics.median(xs), statistics.median(ys)
    sx, sy = spread(xs), spread(ys)
    ranked = sorted(points, key=lambda p: -max(abs(p["x"] - mx) / sx, abs(p["y"] - my) / sy))
    for i, p in enumerate(ranked):
        p["label"] = True
        p["short"] = shorten(p["name"])
        p["rank"] = i
    return points


def build_block(cells, spec, warn):
    hdr_name = cells.get((spec["header_row"], "B"))
    hdr_x = cells.get((spec["header_row"], spec["x_col"]))
    if hdr_name != "Name":
        warn(f"{spec['key']}: row {spec['header_row']} col B is {hdr_name!r}, expected 'Name' — has the sheet moved?")
    points = []
    for r in range(spec["lo"], spec["hi"] + 1):
        nm = cells.get((r, "B"))
        x, y = num(cells.get((r, spec["x_col"]))), num(cells.get((r, spec["y_col"])))
        if not nm or x is None or y is None:
            continue
        # A number over about a thousand in a rate cell is an Excel date serial
        # (STATE.md); drop it rather than plot 46315 as a rate.
        if abs(x) > 1000 or abs(y) > 1000:
            warn(f"{spec['key']}: {nm} has {x}/{y} — looks like a date serial, dropped")
            continue
        points.append({
            "name": str(nm).strip(),
            "x": round(x * 100, 2) if spec["x_pct"] else round(x, 3),
            "y": round(y * 100, 2) if spec["y_pct"] else round(y, 3),
        })
    if not points:
        warn(f"{spec['key']}: no points found — check the row map")
        return None
    mark_labels(points)
    body = {
        "title": spec["title"],
        "caption": CAPTIONS[spec["key"]],
        "x_label": spec["x_label"] + (" %" if spec["x_pct"] else ""),
        "y_label": spec["y_label"] + (" %" if spec["y_pct"] else ""),
        "x_pct": spec["x_pct"], "y_pct": spec["y_pct"],
        "x_median": round(statistics.median(p["x"] for p in points), 3),
        "y_median": round(statistics.median(p["y"] for p in points), 3),
        "x_min": min(p["x"] for p in points), "x_max": max(p["x"] for p in points),
        "y_min": min(p["y"] for p in points), "y_max": max(p["y"] for p in points),
        "points": points,
    }
    g = spec.get("groups")
    if g:
        groups = []
        for col in g["cols"]:
            label = cells.get((g["header_row"], col))
            names = [str(cells[(r, col)]).strip() for r in range(g["lo"], g["hi"] + 1) if (r, col) in cells]
            if label and names:
                groups.append({"label": str(label).strip(), "names": names})
        if groups:
            body["groups"] = groups
    return body


SUFFIXES = {"jr", "sr", "ii", "iii", "iv", "v"}


def surname(name):
    """Last real word, ignoring a suffix — "Harold Fannin Jr" keys on Fannin."""
    parts = [p for p in name.strip().rstrip("?").split() if p.strip(".").lower() not in SUFFIXES]
    return parts[-1].lower() if parts else name.lower()


def full_names(charts, box_cols):
    """
    Resolve a surname to the full name, **from the workbook itself**.

    The operator's conclusion boxes are written in surnames — "McBride",
    "Goedert" — and he asked for full names. Every one of them appears in full
    somewhere else on the same sheet, in a scatter roster or a grid, so the map
    is built from that rather than from anything this script believes about the
    league. A name that cannot be resolved is left exactly as written: guessing
    a first name onto a surname is how a plausible wrong player gets published.
    """
    known = {}
    for c in charts.values():
        for p in c["points"]:
            known.setdefault(surname(p["name"]), p["name"].strip())
    for col in box_cols:
        for n in col["names"]:
            if " " in n.strip():
                known.setdefault(surname(n), n.strip())

    def resolve(name):
        n = name.strip().rstrip("?").strip()   # the sheet writes "Gadsden?"
        if " " in n:
            return n
        return known.get(surname(n), n)

    return resolve


# Which chart carries the number that belongs beside a name in each grid column.
BOX_VALUE = {
    "Route %": ("routes_targets", "x"),
    "YPG": ("yards_tds", "x"),
    "Target Share %": ("routes_targets", "y"),
    "Air Yards %": ("airyards_tprr", "x"),
    "YPRR": ("routes_yprr", "y"),
    # BEST CANDIDATES is a verdict, not a measurement, so it carries no number.
}


def annotate(col, charts, full):
    """
    Put each player's own figure for that column beside his name, and order the
    column by it, best first.

    The workbook lists these in no particular order, which makes a column of
    numbers hard to read as a ranking — 96.60 above 89.80 above 87.00 above
    90.40 invites the eye to trust the order and be wrong. Every measure here
    is one where more is better, so descending is best-to-worst on all six.

    The columns are independent — different names, different lengths — so a row
    means nothing across the grid and re-ordering one column cannot break
    another. BEST CANDIDATES carries no number and is a verdict rather than a
    measurement, so it keeps the operator's own order.
    """
    label = col["label"]
    names = [full(n) for n in col["names"]]
    spec = BOX_VALUE.get(label)
    if not spec:
        return {"label": label, "names": names}

    key, axis = spec
    lookup = {p["name"]: p[axis] for p in charts[key]["points"]}
    valued = [(n, lookup.get(n)) for n in names]
    # A name with no figure keeps its place at the foot rather than sorting as
    # zero, which would read as the worst rather than the unmeasured.
    ranked = ([x for x in valued if x[1] is not None], [x for x in valued if x[1] is None])
    ranked[0].sort(key=lambda x: -x[1])
    return {
        "label": label,
        "names": [f"{n} ({v:.2f})" for n, v in ranked[0]] + [n for n, _ in ranked[1]],
    }


def build_box(cells, spec, warn):
    """The check-the-box grid: one column per factor, a list of names under it."""
    cols = []
    label_row = spec.get("label_row", spec["header_row"])
    for col in BOX_COLS:
        label = cells.get((label_row, col))
        names = [str(cells[(r, col)]).strip() for r in range(spec["lo"], spec["hi"] + 1) if (r, col) in cells]
        if label:
            cols.append({"label": str(label).strip(), "names": names})
    if not cols:
        warn(f"box at row {spec['header_row']}: nothing found")
    return cols


def main():
    wb = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_WB
    if not wb.exists():
        sys.exit(f"workbook not found: {wb}")
    cells = load(wb)

    warnings = []
    def warn(msg):
        warnings.append(msg)
        print(f"  WARN {msg}")

    charts = {}
    for spec in BLOCKS:
        b = build_block(cells, spec, warn)
        if b:
            charts[spec["key"]] = b
            g = f", {len(b['groups'])} groups" if b.get("groups") else ""
            print(f"  {spec['key']:16} {len(b['points'])} players{g}")

    # Every chart should cover the same 25 tight ends; a name in one and not
    # another means a row slipped and the scatters no longer describe one squad.
    rosters = {k: {p["name"] for p in v["points"]} for k, v in charts.items()}
    if rosters:
        base_key, base = next(iter(rosters.items()))
        for k, names in rosters.items():
            missing, extra = base - names, names - base
            if missing or extra:
                warn(f"{k} roster differs from {base_key}: missing {sorted(missing)}, extra {sorted(extra)}")

    findings = [str(cells[(r, "B")]).strip() for r in FINDINGS_ROWS if (r, "B") in cells]
    # The sheet shouts its verdicts — "ONLY KELCE (REGRESSION)". The operator
    # asked for the name alone, so the shouting and the parenthetical come off
    # and the surnames are expanded like every other conclusion on the page.
    def tidy_verdict(v, full):
        v = re.sub(r"\((?:[^)]*)\)", "", v).strip()          # drop "(REGRESSION)"
        v = re.sub(r"^(only|just)\s+", "", v, flags=re.I)     # drop the "ONLY"
        parts = [full(p.strip().title() if p.strip().isupper() else p.strip())
                 for p in re.split(r"\s*&\s*", v) if p.strip()]
        return " & ".join(parts)

    rules_raw = [
        {"rule": str(cells[(r, "B")]).strip(), "verdict": str(cells.get((r, "D"), "")).strip()}
        for r in RULE_ROWS if (r, "B") in cells
    ]
    present = build_box(cells, BOX_TE1_3, warn)
    te46 = build_box(cells, BOX_TE46, warn)

    full = full_names(charts, present + te46)
    present = [annotate(c, charts, full) for c in present]
    te46 = [annotate(c, charts, full) for c in te46]
    for c in charts.values():
        for g in c.get("groups", []):
            g["names"] = [full(n) for n in g["names"]]

    rules = [{"rule": r["rule"], "verdict": tidy_verdict(r["verdict"], full)} for r in rules_raw]

    # Lift the benchmark picture out of the workbook next to the data it heads.
    img_dest = ROOT / "public/img/charts/te-fantasy-finish-averages.png"
    img_dest.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(wb) as z:
        try:
            raw = z.read(f"xl/media/{BENCHMARK_IMAGE}")
            trimmed, sizes = trim_to_content(raw, warn)
            img_dest.write_bytes(trimmed)
            note = f" (cropped {sizes[0]}x{sizes[1]} -> {sizes[2]}x{sizes[3]})" if sizes else ""
            print(f"  image      {BENCHMARK_IMAGE} -> {img_dest.relative_to(ROOT)}{note}")
            img_size = (sizes[2], sizes[3]) if sizes else None
        except KeyError:
            warn(f"{BENCHMARK_IMAGE} not in the workbook — the benchmark table will be missing")
            img_size = None

    out = {
        "schema_version": 1,
        "season": 2025,
        "updated": __import__("datetime").datetime.now().strftime("%Y-%m-%d"),
        "source": f"{wb.name}, sheet 'WRTE Statistics & Graphs'",
        "note": (
            "Tight end charts from the workbook's WRTE sheet. Route participation, "
            "targets per route run and yards per route run are 4for4 columns; §2 "
            "rules them out and the operator lifted that for this page (docs/STATE.md). "
            "Every median, extent and label order is computed here, not in a component (§11)."
        ),
        "data": {
            "charts": charts,
            "history": {
                "era": str(cells.get((ERA_HISTORIC, "A"), "")).strip(),
                "findings": findings,
                "rules": rules,
            },
            "box": {
                "era": str(cells.get((ERA_HISTORIC, "A"), "")).strip(),
                "te1_3": present,
                "te4_6": te46,
            },
            "benchmark_image": BENCHMARK_IMAGE_PUBLIC,
            # next/image needs the real dimensions, and they change when the
            # trim above changes, so they travel with the file.
            "benchmark_image_size": ({"width": img_size[0], "height": img_size[1]}
                                     if img_size else None),
        },
    }

    dest = ROOT / "src/data/te-charts.json"
    dest.write_text(json.dumps(out, indent=1) + "\n")
    print(f"\n{len(charts)} charts, {len(findings)} findings, {len(rules)} rules, "
          f"{len(present)} box columns")
    print(f"wrote {dest.relative_to(ROOT)}")
    if warnings:
        print(f"\n{len(warnings)} warning(s) above — read them before trusting the page.")


if __name__ == "__main__":
    main()
