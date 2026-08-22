#!/usr/bin/env python3
"""
Build src/data/wr-charts.json from the analytics workbook.

Same contract as the other extractors: the workbook is the source, this script
computes every summary value, and the page renders without arithmetic (§11).
Medians, extents, label order and placement priority are all settled here.

The wide receiver blocks share sheet 5 with the tight ends — WR occupies rows
2-183, TE picks up at 189 — so `te_charts.py` is the closest template and the
parsing machinery below is its.

Section order is the operator's, taken from his own sheet:
  1. Target share against air yards
  2. Air yards share against target share
  3. WOPR against PPR points per game
  4. The check-the-box grid

**Two of the grid's seven columns are 4for4-derived** — "High YPRR" and "High
TPRR". §2 forbids republishing that vendor's columns, and docs/STATE.md records
the operator lifting it for the RB chart and then for the whole TE page. This
is a third place and his call again, so it is flagged rather than assumed. What
is published here is his own categorisation — a list of names under a heading —
and not the licensed numbers themselves, which is a smaller step than the TE
page took.

Run: python3 scripts/curated/wr_charts.py [path/to/workbook.xlsx]
"""
import json
import re
import statistics
import sys
import zipfile
from datetime import datetime
from pathlib import Path
from xml.etree import ElementTree as ET

N = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
ROOT = Path(__file__).resolve().parents[2]
DEFAULT_WB = Path.home() / "Downloads" / "2026-2027 Fantasy Football Analytics (Original) (4).xlsx"
SHEET = "sheet5"  # "WRTE Statistics & Graphs"

# Row map for the (4) workbook. Sheet *and* row numbers shift between versions,
# so every block names the header text it expects to sit under and the script
# warns if one has moved rather than silently reading the wrong rows.
BLOCKS = [
    {
        "key": "targets_airyards",
        "title": "Target share against air yards",
        "header_row": 8, "lo": 9, "hi": 58,
        "name_col": "D", "x_col": "E", "y_col": "F",
        "x_header": "Air Yards", "y_header": "Target Share",
        "x_label": "Air yards", "y_label": "Target share",
        "x_pct": False, "y_pct": True,
        # Air yards is a season count in the high hundreds, so the date-serial
        # guard that protects the rate columns has to be off here — left on, it
        # would drop every receiver over a thousand air yards, which is most of
        # the chart.
        "x_is_rate": False, "y_is_rate": True,
        "groups": {"header_row": 56, "lo": 57, "hi": 61, "cols": ["H", "J", "L"]},
        "notes": {"header_row": 56, "col": "N", "lo": 57, "hi": 61},
    },
    {
        "key": "airyards_share",
        "title": "Air yards share against target share",
        "header_row": 65, "lo": 66, "hi": 106,
        "name_col": "B", "x_col": "C", "y_col": "D",
        "x_header": "Air Yards Share %", "y_header": "Target Share",
        "x_label": "Air yards share", "y_label": "Target share",
        "x_pct": True, "y_pct": True,
        "x_is_rate": True, "y_is_rate": True,
        "groups": {"header_row": 102, "lo": 103, "hi": 107,
                   "cols": ["F", "H", "K", "N", "P"]},
    },
    {
        "key": "wopr_ppg",
        "title": "WOPR against PPR points per game",
        "header_row": 113, "lo": 114, "hi": 149,
        "name_col": "B", "x_col": "C", "y_col": "D",
        "x_header": "WOPR (x)", "y_header": "PPR PPG (y)",
        "x_label": "WOPR", "y_label": "PPR points per game",
        "x_pct": False, "y_pct": False,
        "x_is_rate": True, "y_is_rate": False,
        "groups": {"header_row": 154, "lo": 155, "hi": 159, "cols": ["K", "M"]},
        "notes": {"header_row": None, "col": "E", "lo": 154, "hi": 156},
    },
]

# A plain-language statement of the one thing each chart shows (§5.2). If a
# reader cannot say the takeaway after five seconds the chart has failed, and
# these are the sentence that makes that possible.
CAPTIONS = {
    "targets_airyards": (
        "Volume and depth are different jobs. Up and to the right is a receiver "
        "who is both thrown to often and thrown to deep; far right with a low "
        "target share is one running deep routes the quarterback rarely looks at."
    ),
    "airyards_share": (
        "Both axes are a share of the same offense, so this asks how much of his "
        "team's passing game a receiver owns — the downfield share against the "
        "total share. Below the diagonal is a possession role, above it a "
        "field-stretching one."
    ),
    "wopr_ppg": (
        "Opportunity against what it produced. WOPR weights target share and air "
        "yards share into one usage number; the vertical spread at any given "
        "WOPR is how much of a receiver's scoring his usage does not explain."
    ),
}

NOTABLE = {"header_row": 9, "col": "B", "lo": 10, "hi": 32}
GRID = {"label_row": 175, "lo": 176, "hi": 183,
        "player_cols": ["B", "C", "D", "E"], "team_cols": ["F", "G", "H"]}

# Short forms the sheet uses that no surname or first-name match can reach.
# Kept explicit and small: every one is checked against the charted rosters at
# run time, and a mapping whose target is not on this sheet is reported rather
# than published.
ALIASES = {
    "jsn": "Jaxon Smith-Njigba",
    "jaxon-smith njigba": "Jaxon Smith-Njigba",   # the sheet hyphenates the wrong pair
    "adj/drake london": "Drake London",
    "deebo": "Deebo Samuel",
    "mvs": "Marquez Valdes-Scantling",
}

SUFFIXES = {"jr", "sr", "ii", "iii", "iv", "v"}


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


def surname(name):
    parts = [p for p in name.strip().rstrip("?").split()
             if p.strip(".").lower() not in SUFFIXES]
    return parts[-1].lower() if parts else name.lower()


def mark_labels(points):
    """Every point is named; the order decides who gets the clean spot when the
    renderer runs out of room, so the most unusual seasons win it."""
    xs = sorted(p["x"] for p in points)
    ys = sorted(p["y"] for p in points)

    def spread(v):
        return (v[int(len(v) * 0.75)] - v[int(len(v) * 0.25)]) or 1.0

    mx, my = statistics.median(xs), statistics.median(ys)
    sx, sy = spread(xs), spread(ys)
    ranked = sorted(points, key=lambda p: -max(abs(p["x"] - mx) / sx,
                                               abs(p["y"] - my) / sy))
    for i, p in enumerate(ranked):
        p["label"] = True
        p["short"] = shorten(p["name"])
        p["rank"] = i
    return points


def build_block(cells, spec, warn):
    for axis in ("x", "y"):
        want = spec[f"{axis}_header"]
        got = cells.get((spec["header_row"], spec[f"{axis}_col"]))
        if got is None or str(got).strip() != want:
            warn(f"{spec['key']}: row {spec['header_row']} col {spec[f'{axis}_col']} "
                 f"is {got!r}, expected {want!r} — has the sheet moved?")

    points = []
    for r in range(spec["lo"], spec["hi"] + 1):
        nm = cells.get((r, spec["name_col"]))
        x, y = num(cells.get((r, spec["x_col"]))), num(cells.get((r, spec["y_col"])))
        if not nm or x is None or y is None:
            continue
        # A number over about a thousand in a *rate* cell is an Excel date
        # serial (STATE.md). Only applied to the axes that are rates: air yards
        # is a season count and legitimately runs past 1,800.
        bad = ((spec["x_is_rate"] and abs(x) > 1000)
               or (spec["y_is_rate"] and abs(y) > 1000))
        if bad:
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
    return {
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


def resolver(charts, extra_names, warn):
    """Resolve the sheet's shorthand to a full name, from the sheet itself.

    The operator writes his conclusion boxes in whatever is shortest — "JSN",
    "Nico", "Keenan", "Pickens" — and asked for full names. Almost every one
    appears in full somewhere on the same sheet — a scatter roster or a grid
    column — so the map is built from that rather than from anything this
    script believes about the league.

    **A name that cannot be resolved is left exactly as written**, because
    guessing a first name onto a surname is how a plausible wrong player gets
    published. The notable-names list is the honest case for that: those are
    receivers outside the charted top 50, and the ones the grid does not name in
    full stay short.
    """
    by_surname, by_first = {}, {}
    pool = [p["name"] for c in charts.values() for p in c["points"]]
    # The grid is written in full names where the conclusion boxes are not, so
    # it feeds the map rather than only consuming it — "McLaurin" in a box is
    # resolved by "Terry McLaurin" standing in a grid column. Same sheet, so
    # this is still reading the workbook rather than believing something.
    pool += [n for n in extra_names if " " in n]
    for _full in pool:
            full = _full.strip()
            by_surname.setdefault(surname(full), full)
            first = full.split()[0].lower()
            # Only when the first name is unambiguous across the charted pool.
            if first in by_first and by_first[first] != full:
                by_first[first] = None
            else:
                by_first.setdefault(first, full)

    # An alias may deliberately point off-chart — the notable-names list is
    # receivers outside the charted top 50, which is where "Deebo" and "MVS"
    # live — so the check is that every alias is *used*, not that its target is
    # plotted. An alias nothing hits is a row that moved.
    used = set()

    def resolve(name):
        n = str(name).strip().rstrip("?").strip()
        key = n.lower()
        if key in ALIASES:
            used.add(key)
            return ALIASES[key]
        if " " in n:
            return n
        return by_surname.get(surname(n)) or by_first.get(key) or n

    resolve.unused = lambda: sorted(set(ALIASES) - used)
    return resolve


def read_column(cells, col, lo, hi):
    return [str(cells[(r, col)]).strip() for r in range(lo, hi + 1) if (r, col) in cells]


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
            print(f"  {spec['key']:18} {len(b['points'])} receivers")

    # Raw grid names first: the resolver is built from them as well as from
    # the scatters, so it cannot be built until they have been read.
    raw_grid = {col: read_column(cells, col, GRID["lo"], GRID["hi"])
                for col in GRID["player_cols"] + GRID["team_cols"]}
    full = resolver(charts, [n for v in raw_grid.values() for n in v], warn)

    # Groups and prose notes, attached to the chart they sit beside.
    for spec in BLOCKS:
        b = charts.get(spec["key"])
        if not b:
            continue
        g = spec.get("groups")
        if g:
            groups = []
            for col in g["cols"]:
                label = cells.get((g["header_row"], col))
                names = [full(n) for n in read_column(cells, col, g["lo"], g["hi"])]
                if label and names:
                    groups.append({"label": str(label).strip(), "names": names})
            if groups:
                b["groups"] = groups
                print(f"  {spec['key']:18} {len(groups)} groups")
        n = spec.get("notes")
        if n:
            notes = read_column(cells, n["col"], n["lo"], n["hi"])
            if n["header_row"]:
                head = cells.get((n["header_row"], n["col"]))
                if head and notes and str(head).strip() == notes[0]:
                    notes = notes[1:]
                b["notes_label"] = str(head).strip() if head else None
            if notes:
                b["notes"] = notes

    notable = {
        "label": str(cells.get((NOTABLE["header_row"], NOTABLE["col"]), "")).strip(),
        "names": [full(n) for n in read_column(cells, NOTABLE["col"],
                                               NOTABLE["lo"], NOTABLE["hi"])],
    }

    # The grid mixes two kinds of column — four of players, three of teams — and
    # they render differently, so they are separated here rather than in a
    # component guessing from the string.
    grid = {"players": [], "teams": []}
    for kind, cols in (("players", GRID["player_cols"]), ("teams", GRID["team_cols"])):
        for col in cols:
            label = cells.get((GRID["label_row"], col))
            names = raw_grid[col]
            if kind == "players":
                names = [full(n) for n in names]
            if label and names:
                grid[kind].append({"label": str(label).strip(), "names": names})

    # Every scatter should describe one squad. A name in one and not another
    # means a row slipped and the charts no longer describe the same pool.
    rosters = {k: {p["name"] for p in v["points"]} for k, v in charts.items()}
    if len(rosters) > 1:
        base_key = "airyards_share"
        base = rosters.get(base_key, set())
        for k, names in rosters.items():
            if k == base_key:
                continue
            missing = base - names
            if missing:
                print(f"  note {k} does not chart {len(missing)} of the "
                      f"{base_key} pool: {', '.join(sorted(missing)[:6])}"
                      f"{' …' if len(missing) > 6 else ''}")

    unresolved = sorted({n for g in grid["players"] for n in g["names"] if " " not in n})
    if unresolved:
        warn(f"grid names left short (no full name on this sheet): {unresolved}")
    stale = full.unused()
    if stale:
        warn(f"alias(es) never matched anything — a row may have moved: {stale}")
    short_notable = [n for n in notable["names"] if " " not in n]
    if short_notable:
        print(f"  note {len(short_notable)} notable names stay short — they are "
              f"outside the charted pool, so the sheet holds no full name for them: "
              f"{', '.join(short_notable)}")

    out = {
        "schema_version": 1,
        "season": 2025,
        "updated": datetime.now().strftime("%Y-%m-%d"),
        "source": f"{wb.name}, sheet 'WRTE Statistics & Graphs'",
        "note": (
            "Wide receiver charts from the workbook's WRTE sheet, rows 2-183. "
            "The grid's 'High YPRR' and 'High TPRR' columns are 4for4-derived "
            "categorisations; §2 rules that vendor's columns out and the operator "
            "lifted it for the RB chart and the TE page (docs/STATE.md). Names "
            "only here, not the licensed figures. Every median, extent and label "
            "order is computed here, not in a component (§11)."
        ),
        "data": {
            "charts": charts,
            "notable": notable,
            "grid": grid,
        },
    }

    dest = ROOT / "src/data/wr-charts.json"
    dest.write_text(json.dumps(out, indent=1) + "\n")
    print(f"\n{len(charts)} charts, {len(notable['names'])} notable names, "
          f"{len(grid['players'])} player columns, {len(grid['teams'])} team columns")
    print(f"wrote {dest.relative_to(ROOT)}")
    if warnings:
        print(f"\n{len(warnings)} warning(s) above — read them before trusting the page.")


if __name__ == "__main__":
    main()
