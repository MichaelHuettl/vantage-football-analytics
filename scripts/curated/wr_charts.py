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
import csv
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

# Two supplementary charts come from the operator's nflverse export rather than
# the workbook. **This is the only extractor reading two sources**, and it does
# so because both charts belong to this page: one proves the claim the third
# workbook chart makes, and the other shows the week-to-week shape all three of
# them average away. The trailing space in the directory name is real (STATE.md).
EXPORT = Path.home() / "Desktop" / "Claude Code" / "NFL Verse Data "
YOY_FILE = EXPORT / "1999-2025 RB:WR:TE YOY Data.csv"
SEASON_FILE = EXPORT / "1999-2025 RB:WR:TE.csv"

# The three computed grid columns, and the pool they are drawn from. Eight
# names each, matching the width of the operator's own columns.
GRID_SEASON = 2025
GRID_POOL_MIN_TARGETS = 40
GRID_POOL_MIN_GAMES = 8
GRID_COLUMN_DEPTH = 8
WEEKLY_FILE = EXPORT / "2025 Weekly Stats.csv"

# Paired seasons from 2015 on. The file reaches back to 1999, but a receiver's
# job in 2003 is not the job being described on this page, and the era the
# charts above are drawn from is the era this should be measured over.
STICKY_FROM = 2015
STICKY_MIN_GAMES = 8
STICKY_MIN_TARGETS = 40

# What counts as a big week and a wasted one, in PPR. Twenty is roughly a WR1
# week; five or under is a start that cost you the matchup.
BOOM, BUST = 20.0, 5.0
CONSISTENCY_MIN_GAMES = 8

GRID = {"label_row": 175, "lo": 176, "hi": 183,
        "player_cols": ["B", "C", "D", "E"], "team_cols": ["F", "G", "H"]}

# Short forms the sheet uses that no surname or first-name match can reach.
# Kept explicit and small, and checked for *use* at run time — an alias nothing
# hits means a row moved, or that the block it served has gone.
ALIASES = {
    "jsn": "Jaxon Smith-Njigba",
    "jaxon-smith njigba": "Jaxon Smith-Njigba",   # the sheet hyphenates the wrong pair
    "adj/drake london": "Drake London",
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


def _ranks(vals):
    """Average ranks, so ties do not tilt the correlation."""
    order = sorted(range(len(vals)), key=lambda i: vals[i])
    out = [0.0] * len(vals)
    i = 0
    while i < len(order):
        j = i
        while j + 1 < len(order) and vals[order[j + 1]] == vals[order[i]]:
            j += 1
        avg = (i + j) / 2.0 + 1.0
        for k in range(i, j + 1):
            out[order[k]] = avg
        i = j + 1
    return out


def spearman(xs, ys):
    """Rank correlation, in the standard library.

    Spearman rather than Pearson because these are skewed — a handful of
    target-share seasons sit far above the rest and would drag a Pearson
    coefficient around by themselves. Rank correlation asks the question the
    page is actually asking: does the *order* hold up next year.
    """
    rx, ry = _ranks(xs), _ranks(ys)
    n = len(xs)
    mx, my = sum(rx) / n, sum(ry) / n
    num = sum((a - mx) * (b - my) for a, b in zip(rx, ry))
    dx = sum((a - mx) ** 2 for a in rx)
    dy = sum((b - my) ** 2 for b in ry)
    return num / ((dx * dy) ** 0.5) if dx and dy else 0.0


# Each metric, how to get it from a year's columns, and which side of the
# argument it sits on. "Opportunity" is what the offense gives a receiver;
# "efficiency" is what he does with it; "output" is the scoring that results.
STICKY_METRICS = [
    ("Target share", "opportunity", lambda r, y: _f(r, f"target_share_{y}")),
    ("Air yards share", "opportunity", lambda r, y: _f(r, f"air_yards_share_{y}")),
    ("WOPR", "opportunity", lambda r, y: _f(r, f"wopr_{y}")),
    ("Targets per game", "opportunity",
     lambda r, y: _div(_f(r, f"targets_{y}"), _f(r, f"games_{y}"))),
    ("PPR points per game", "output", lambda r, y: _f(r, f"ppg_ppr_{y}")),
    ("Catch rate", "efficiency", lambda r, y: _f(r, f"catch_rate_{y}")),
    ("Yards per target", "efficiency",
     lambda r, y: _div(_f(r, f"rec_yards_{y}"), _f(r, f"targets_{y}"))),
    ("Touchdowns per target", "efficiency",
     lambda r, y: _div(_f(r, f"rec_td_{y}"), _f(r, f"targets_{y}"))),
]


def _f(row, key):
    return num(row.get(key))


def _div(a, b):
    return a / b if a is not None and b else None


def build_stickiness(warn):
    """How much of each metric survives into the next season.

    This is the evidence for the claim the WOPR chart makes in prose — that
    opportunity is stickier than the efficiency sitting on top of it. Stated
    without a number it is a slogan; the whole point of this site is that a
    reader should be able to check it.
    """
    if not YOY_FILE.exists():
        warn(f"{YOY_FILE.name} not found — the stickiness chart will be missing")
        return None
    with YOY_FILE.open(newline="") as fh:
        rows = [
            r for r in csv.DictReader(fh)
            if (r.get("position_y1") == "WR"
                and num(r.get("season")) is not None
                and num(r["season"]) >= STICKY_FROM
                and (num(r.get("games_y1")) or 0) >= STICKY_MIN_GAMES
                and (num(r.get("games_y2")) or 0) >= STICKY_MIN_GAMES
                and (num(r.get("targets_y1")) or 0) >= STICKY_MIN_TARGETS
                and (num(r.get("targets_y2")) or 0) >= STICKY_MIN_TARGETS)
        ]
    if len(rows) < 100:
        warn(f"only {len(rows)} paired WR seasons — check the filters")
        return None

    out = []
    for label, kind, get in STICKY_METRICS:
        pairs = [(get(r, "y1"), get(r, "y2")) for r in rows]
        pairs = [(a, b) for a, b in pairs if a is not None and b is not None]
        if len(pairs) < 100:
            warn(f"stickiness: {label} has only {len(pairs)} usable pairs, skipped")
            continue
        out.append({
            "label": label, "kind": kind, "pairs": len(pairs),
            "rho": round(spearman([a for a, _ in pairs], [b for _, b in pairs]), 3),
        })
    out.sort(key=lambda m: -m["rho"])

    # Reconcile against a pairing this script does itself, from the season-level
    # export. The YOY file is the operator's own derived artifact and is what
    # gets published; recomputing the same correlations from the season file and
    # comparing is the only way to know the pairing behind it is doing what the
    # page is about to claim it does. A quiet disagreement here would be a
    # headline correlation nobody could trace.
    check = _crosscheck(warn)
    if check:
        gaps = [(m["label"], abs(m["rho"] - check[m["label"]]))
                for m in out if m["label"] in check]
        if gaps:
            worst = max(gaps, key=lambda g: g[1])
            print(f"  cross-check        {len(gaps)} metrics re-paired from "
                  f"{SEASON_FILE.name}, worst gap {worst[1]:.3f} on {worst[0]}")
            if worst[1] > 0.12:
                warn(f"stickiness: {worst[0]} differs by {worst[1]:.3f} between the "
                     f"YOY file and a fresh pairing — do not publish until that is "
                     f"understood")
            for m in out:
                if m["label"] in check:
                    m["rho_repaired"] = round(check[m["label"]], 3)

    seasons = sorted({int(num(r["season"])) for r in rows})
    return {
        "title": "What carries into next season",
        # Deliberately not "the charts above are the ones that hold". Points per
        # game repeats about as well as the share metrics do, so that reading is
        # wrong and the page says so underneath. The split that survives the data
        # is chances against efficiency, and the caption states only that.
        "caption": (
            "Rank correlation between a receiver's season and his next one, "
            "across every pair since " + str(seasons[0]) + ". The chances a "
            "receiver gets come back; what he did with them mostly does not."
        ),
        "seasons": [seasons[0], seasons[-1] + 1],
        "pairs": len(rows),
        "metrics": out,
    }


def _crosscheck(warn):
    """The same correlations, from the season file, paired here rather than there."""
    if not SEASON_FILE.exists():
        warn(f"{SEASON_FILE.name} not found — stickiness goes out unreconciled")
        return None
    with SEASON_FILE.open(newline="") as fh:
        by = {}
        for r in csv.DictReader(fh):
            if r.get("position") != "WR":
                continue
            sn = num(r.get("season"))
            if sn is not None:
                by[(r["player"], int(sn))] = r
    pairs = []
    for (player, sn), y1 in by.items():
        y2 = by.get((player, sn + 1))
        if not y2 or sn < STICKY_FROM:
            continue
        if min(num(y1.get("games")) or 0, num(y2.get("games")) or 0) < STICKY_MIN_GAMES:
            continue
        if min(num(y1.get("targets")) or 0, num(y2.get("targets")) or 0) < STICKY_MIN_TARGETS:
            continue
        pairs.append((y1, y2))
    if len(pairs) < 100:
        return None

    # The season file has no _y1/_y2 suffixes, so the same accessors are reused
    # against a bare key.
    plain = {
        "Target share": lambda r: num(r.get("target_share")),
        "Air yards share": lambda r: num(r.get("air_yards_share")),
        "WOPR": lambda r: num(r.get("wopr")),
        "Targets per game": lambda r: _div(num(r.get("targets")), num(r.get("games"))),
        "PPR points per game": lambda r: num(r.get("ppg_ppr")),
        "Catch rate": lambda r: num(r.get("catch_rate")),
        "Yards per target": lambda r: _div(num(r.get("rec_yards")), num(r.get("targets"))),
        "Touchdowns per target": lambda r: _div(num(r.get("rec_td")), num(r.get("targets"))),
    }
    out = {}
    for label, get in plain.items():
        vals = [(get(a), get(b)) for a, b in pairs]
        vals = [(x, y) for x, y in vals if x is not None and y is not None]
        if len(vals) >= 100:
            out[label] = spearman([x for x, _ in vals], [y for _, y in vals])
    return out


def build_consistency(charted, warn):
    """The week-to-week shape the season averages above hide.

    Every chart on this page until now is a season aggregate, and a season
    aggregate cannot tell two very different receivers apart: the same points
    per game can be a steady twelve every Sunday or a run of fours with a
    thirty in it. Those are not the same asset and should not be drafted, or
    started, as though they were.
    """
    if not WEEKLY_FILE.exists():
        warn(f"{WEEKLY_FILE.name} not found — the consistency chart will be missing")
        return None
    weeks = {}
    with WEEKLY_FILE.open(newline="") as fh:
        for r in csv.DictReader(fh):
            if r.get("position") != "WR" or r.get("season_type") != "REG":
                continue
            nm = (r.get("player_display_name") or "").strip()
            fp = num(r.get("fantasy_points_ppr"))
            if nm and fp is not None:
                weeks.setdefault(nm, []).append(fp)

    points, skipped = [], []
    for nm in sorted(charted):
        vals = weeks.get(nm)
        if not vals or len(vals) < CONSISTENCY_MIN_GAMES:
            skipped.append(nm)
            continue
        n = len(vals)
        points.append({
            "name": nm,
            "x": round(100.0 * sum(1 for v in vals if v <= BUST) / n, 2),
            "y": round(100.0 * sum(1 for v in vals if v >= BOOM) / n, 2),
            "games": n,
            "ppg": round(sum(vals) / n, 2),
            "median": round(statistics.median(vals), 2),
        })
    if not points:
        warn("consistency: no charted receiver had enough weeks")
        return None
    if skipped:
        print(f"  note consistency drops {len(skipped)} charted receivers with "
              f"under {CONSISTENCY_MIN_GAMES} games: {', '.join(skipped[:6])}"
              f"{' …' if len(skipped) > 6 else ''}")
    mark_labels(points)
    return {
        "title": "Boom weeks against bust weeks",
        "caption": (
            f"Each receiver's 2025, as the share of his weeks over {BOOM:.0f} PPR "
            f"points against the share at {BUST:.0f} or under. Bottom left is "
            "steady, top right is volatile, and top left is the season everyone "
            "wants."
        ),
        "x_label": f"Weeks at {BUST:.0f} points or under %",
        "y_label": f"Weeks at {BOOM:.0f} points or more %",
        "x_pct": False, "y_pct": False,
        "boom": BOOM, "bust": BUST,
        "x_median": round(statistics.median(p["x"] for p in points), 3),
        "y_median": round(statistics.median(p["y"] for p in points), 3),
        "x_min": min(p["x"] for p in points), "x_max": max(p["x"] for p in points),
        "y_min": min(p["y"] for p in points), "y_max": max(p["y"] for p in points),
        "points": points,
    }


def _ols(X, y):
    """Least squares by normal equations, with a small Gaussian solve."""
    n = len(X[0])
    A = [[sum(row[i] * row[j] for row in X) for j in range(n)] for i in range(n)]
    b = [sum(row[i] * t for row, t in zip(X, y)) for i in range(n)]
    M = [A[i][:] + [b[i]] for i in range(n)]
    for i in range(n):
        piv = max(range(i, n), key=lambda r: abs(M[r][i]))
        M[i], M[piv] = M[piv], M[i]
        if not M[i][i]:
            return None
        for r in range(n):
            if r != i:
                fac = M[r][i] / M[i][i]
                for c in range(i, n + 1):
                    M[r][c] -= fac * M[i][c]
    return [M[i][n] / M[i][i] for i in range(n)]


def build_grid_computed(charted, warn):
    """Three columns the workbook does not have, computed from the export.

    The grid already carries the operator's touchdown calls. This adds the
    evidence behind that kind of call, and it exists because of the stickiness
    chart above: touchdowns per target come back year over year at 0.17, but
    the *looks* that produce them are opportunity, which comes back at about a
    half. So the forecastable version of "who scored" is "who was thrown to
    inside the ten".

    Expected touchdowns are fitted across the whole qualifying pool, by field
    zone — an end-zone target, a red-zone target outside the end zone, and
    everything else are worth very different amounts, and the fit says how
    much rather than assuming it. The residual is then the part of a
    receiver's scoring his looks do not account for, which is the part least
    likely to happen again.
    """
    if not SEASON_FILE.exists():
        warn(f"{SEASON_FILE.name} not found — the computed grid columns are missing")
        return None

    # The sheet writes full names, the export writes "P.Nacua". Match on the
    # initial and the surname, and only inside the charted pool, so nothing on
    # the page is a receiver the reader cannot find on a scatter above it.
    lookup = {}
    for full_name in charted:
        parts = full_name.split()
        if len(parts) >= 2:
            lookup[(parts[0][0].lower(), surname(full_name))] = full_name

    with SEASON_FILE.open(newline="") as fh:
        pool = []
        for r in csv.DictReader(fh):
            if r.get("position") != "WR" or num(r.get("season")) != GRID_SEASON:
                continue
            if (num(r.get("targets")) or 0) < GRID_POOL_MIN_TARGETS:
                continue
            if (num(r.get("games")) or 0) < GRID_POOL_MIN_GAMES:
                continue
            pool.append(r)
    if len(pool) < 30:
        warn(f"computed grid: only {len(pool)} qualifying receivers, skipped")
        return None

    def zones(r):
        ez = num(r.get("endzone_targets")) or 0.0
        rz = num(r.get("rz_targets")) or 0.0
        tg = num(r.get("targets")) or 0.0
        return [ez, max(rz - ez, 0.0), max(tg - rz, 0.0)]

    X = [zones(r) for r in pool]
    y = [num(r.get("rec_td")) or 0.0 for r in pool]
    coef = _ols(X, y)
    if not coef:
        warn("computed grid: the touchdown fit is singular, skipped")
        return None
    mean_y = sum(y) / len(y)
    ss_res = sum((t - sum(c * v for c, v in zip(coef, row))) ** 2 for row, t in zip(X, y))
    ss_tot = sum((t - mean_y) ** 2 for t in y)
    r2 = 1 - ss_res / ss_tot if ss_tot else 0.0

    rows, unmatched = [], []
    for r, row, td in zip(pool, X, y):
        nm = (r.get("player") or "").strip()
        # The export writes "P.Nacua" with no space, so the initial has to be
        # split off before the surname is taken — passing the raw string to
        # surname() makes the whole thing one token and matches nothing.
        spaced = " ".join(nm.replace(".", ". ").split())
        parts = spaced.split()
        key = (parts[0][0].lower(), surname(spaced)) if len(parts) >= 2 else None
        full_name = lookup.get(key)
        if not full_name:
            unmatched.append(nm)
            continue
        exp = sum(c * v for c, v in zip(coef, row))
        rows.append({
            "name": full_name, "td": int(td), "expected_td": round(exp, 1),
            "residual": round(td - exp, 1), "endzone_targets": int(row[0]),
            "rz_targets": int(row[0] + row[1]),
        })
    if len(rows) < GRID_COLUMN_DEPTH * 2:
        warn(f"computed grid: only {len(rows)} charted receivers matched the export")
        return None
    if unmatched:
        print(f"  note computed grid ignores {len(unmatched)} qualifying receivers "
              f"who are not on a chart here")

    by_ez = sorted(rows, key=lambda m: -m["endzone_targets"])[:GRID_COLUMN_DEPTH]
    by_res = sorted(rows, key=lambda m: -m["residual"])
    return {
        "season": GRID_SEASON,
        "pool": len(pool),
        "matched": len(rows),
        "fit": {
            "endzone": round(coef[0], 3),
            "red_zone": round(coef[1], 3),
            "elsewhere": round(coef[2], 3),
            "r2": round(r2, 3),
        },
        # Every receiver the fit could rank, so a name of the operator's that is
        # missing can be told apart from one it ranked and placed elsewhere.
        "ranked": sorted(m["name"] for m in rows),
        "columns": [
            {"label": "Most end-zone looks", "kind": "opportunity",
             "blurb": "The repeatable half of scoring: who the offense throws to inside the goal line.",
             "members": by_ez},
            {"label": "Scored above their looks", "kind": "regression",
             "blurb": "Touchdowns beyond what their field position accounts for.",
             "members": by_res[:GRID_COLUMN_DEPTH]},
            {"label": "Scored below their looks", "kind": "improvement",
             "blurb": "The looks arrived and the touchdowns did not.",
             "members": list(reversed(by_res[-GRID_COLUMN_DEPTH:]))},
        ],
    }


# nflverse writes `LA` for the Rams and `AZ` for the Cardinals; teams.json is
# keyed on the league's codes. Same disagreement the site aliases at lookup.
POSTEAM_FIXES = {"LA": "LAR", "AZ": "ARI"}

# Which grid columns argue which way about a receiver. The three offense
# columns are not listed: they attach to a team, and a player inherits them.
UP_COLUMNS = {"TD Improvement", "High YPRR", "High TPRR"}
DOWN_COLUMNS = {"TD Regression"}


def build_verdicts(grid, warn):
    """Who the grid is actually good and bad news for.

    The columns are about metrics; a reader wants the receivers. This crosses
    all seven — the four that name players and the three that name offenses —
    and sorts every name in the grid by which way its entries point.

    A player inherits his offense's columns because that is what those columns
    are for: a scheme is a property of the team, so being in a motion offense is
    a fact about the situation a receiver is walking into. It is also the part
    of the grid most likely to survive the winter, which is why a regression
    call with three scheme columns behind it reads differently from one with
    none.
    """
    players = {c["label"]: set(c["names"]) for c in grid["players"]}
    missing = (UP_COLUMNS | DOWN_COLUMNS) - set(players)
    if missing:
        warn(f"verdicts: grid is missing {sorted(missing)} — column labels may have changed")
        return None

    teams_path = ROOT / "src/data/teams.json"
    if not (teams_path.exists() and SEASON_FILE.exists()):
        warn("verdicts: teams.json or the season export is missing, skipped")
        return None
    nick = {t["nickname"].lower(): t["abbr"]
            for t in json.loads(teams_path.read_text())["data"]}
    offense = {}
    for col in grid["teams"]:
        for raw in col["names"]:
            abbr = nick.get(raw.strip().lower())
            if abbr is None:
                warn(f"verdicts: no team called {raw!r} in teams.json")
                continue
            offense.setdefault(abbr, []).append(col["label"])

    with SEASON_FILE.open(newline="") as fh:
        team_of = {}
        for r in csv.DictReader(fh):
            if num(r.get("season")) != GRID_SEASON:
                continue
            parts = " ".join((r.get("player") or "").replace(".", ". ").split()).split()
            if len(parts) < 2:
                continue
            code = (r.get("posteam") or "").strip().upper()
            team_of.setdefault((parts[0][0].lower(), surname(" ".join(parts))),
                               POSTEAM_FIXES.get(code, code))

    # The site's own roster wins where the two disagree. `players.json` was
    # audited against a live roster endpoint (docs/STATE.md); the export records
    # where a receiver *played* in 2025. A scheme column is a claim about the
    # offense he is walking into, so attributing one to the team he has left
    # would be wrong in the direction that matters.
    ranked_team = {}
    players_path = ROOT / "src/data/players.json"
    if players_path.exists():
        blob = json.loads(players_path.read_text())
        blob = blob.get("data", blob)
        for entry in (blob if isinstance(blob, list) else blob.values()):
            if isinstance(entry, dict) and entry.get("name") and entry.get("team"):
                ranked_team[entry["name"]] = entry["team"]

    rows, unplaced, moved = [], [], []
    for name in sorted({n for v in players.values() for n in v}):
        parts = name.split()
        played = team_of.get((parts[0][0].lower(), surname(name))) if len(parts) >= 2 else None
        team = ranked_team.get(name) or played
        if team and played and team != played:
            moved.append(f"{name} {played}->{team}")
        if team is None:
            unplaced.append(name)
        up = sorted(lab for lab in UP_COLUMNS if name in players[lab])
        down = sorted(lab for lab in DOWN_COLUMNS if name in players[lab])
        schemes = offense.get(team or "", [])
        # A short form of the same thing, so the component renders rather than
        # abbreviates. The long lists stay for anything that wants them.
        short = {"TD Improvement": "TD up", "TD Regression": "TD down",
                 "High YPRR": "YPRR", "High TPRR": "TPRR"}
        tags = [short.get(c, c) for c in down + up]
        if schemes:
            tags.append(f"{len(schemes)} scheme" + ("s" if len(schemes) > 1 else ""))
        rows.append({"name": name, "team": team, "up": up, "down": down,
                     "schemes": schemes, "tags": tags})
    if unplaced:
        print(f"  note verdicts could not place {len(unplaced)} name(s) on a "
              f"{GRID_SEASON} roster: {', '.join(unplaced)}")
    if moved:
        print(f"  note verdicts take the site's audited team over the {GRID_SEASON} "
              f"one for {len(moved)}: {', '.join(moved)}")

    def bucket(r):
        if r["down"] and r["up"]:
            return "both_ways"
        if r["down"]:
            return "falling_supported" if r["schemes"] else "falling_alone"
        return "rising_supported" if r["schemes"] else "rising_alone"

    labels = [
        ("rising_supported", "Everything points the same way",
         "A positive column and an offense that backs it. The strongest read on the grid."),
        ("both_ways", "Flagged in both directions",
         "Efficient enough to make an efficiency column and expected to score less. Both are true."),
        ("falling_supported", "Scoring flagged to fall, offense behind them",
         "The touchdown call is the operator's; the scheme is the part likeliest to survive the winter."),
        ("rising_alone", "Positive on the player, nothing from the offense",
         "The case rests on the receiver alone — no scheme column argues for him."),
        ("falling_alone", "Flagged to fall, with nothing offsetting",
         "A regression call and no column anywhere else on the grid pointing the other way."),
    ]
    grouped = {k: [] for k, _, _ in labels}
    for r in rows:
        grouped[bucket(r)].append(r)
    for v in grouped.values():
        v.sort(key=lambda r: (-(len(r["up"]) + len(r["schemes"])), r["name"]))

    return {
        "counted": len(rows),
        "groups": [
            {"key": k, "label": lab, "blurb": blurb, "members": grouped[k]}
            for k, lab, blurb in labels if grouped[k]
        ],
    }


def _agreement(grid, computed):
    """Where the fitted touchdown call and the operator's own call line up.

    This is the comparison the page exists to make. His two columns are a
    judgement; the residual is a measurement of one specific thing. Publishing
    both and naming the difference is more useful than publishing either alone,
    and it is the only honest way to put a computed column next to a
    hand-written one on the same grid.
    """
    pairs = [
        ("TD Regression", "Scored above their looks", "regression"),
        ("TD Improvement", "Scored below their looks", "improvement"),
    ]
    by_label = {c["label"]: c for c in computed["columns"]}
    out = []
    for wb_label, comp_label, key in pairs:
        wb = next((c["names"] for c in grid["players"] if c["label"] == wb_label), None)
        comp = by_label.get(comp_label)
        if wb is None or comp is None:
            continue
        wb_set = set(wb)
        comp_names = [m["name"] for m in comp["members"]]
        comp_set = set(comp_names)
        # A name of his that the fit never saw is not a disagreement, it is a
        # gap in coverage, and conflating the two would manufacture a dispute.
        # Anything outside the charted pool or under the volume floor is absent
        # from `ranked` entirely.
        ranked = {m["name"] for c in computed["columns"] for m in c["members"]} | set(computed["ranked"])
        only = [n for n in wb if n not in comp_set]
        out.append({
            "key": key,
            "label": wb_label,
            "computed_label": comp_label,
            "both": sorted(wb_set & comp_set),
            # Named rather than counted: which side a receiver falls on is the
            # whole content of a disagreement.
            "workbook_disagrees": [n for n in only if n in ranked],
            "workbook_uncovered": [n for n in only if n not in ranked],
            "computed_only": [n for n in comp_names if n not in wb_set],
        })
    return out


def build_groups(consistency, wopr_chart, warn):
    """Sort the boom/bust field into groups, and cross it with usage.

    Two passes, and they are not equally useful.

    The **four corners** split the field on its own medians: reliable, floor
    without ceiling, boom or bust, neither. Honest but partly circular — better
    receivers boom more, so the corners largely re-describe points per game.
    That is stated on the page rather than dressed up.

    The **usage cross** is where the new information is. Holding each receiver's
    WOPR against his boom rate separates two groups the boom/bust chart cannot
    see on its own: a big role that did not produce, and production that came
    from a small role. The stickiness chart above is what makes that worth
    reading — efficiency comes back at 0.17 to 0.25, so the receiver whose role
    is intact has the better case of the two, and the one who outscored his
    role is the one being asked to do it twice.
    """
    if not consistency:
        return None
    pts = consistency["points"]
    bx, by = consistency["x_median"], consistency["y_median"]

    corners = {
        "reliable": ("Reliable", "Rarely wasted a week, often won one."),
        "floor": ("Floor without a ceiling", "Hard to lose with, hard to win with."),
        "volatile": ("Boom or bust", "Real upside, and a real chance of nothing."),
        "neither": ("Neither", "Below the field on both counts."),
    }
    buckets = {k: [] for k in corners}
    for pt in pts:
        low_bust, high_boom = pt["x"] <= bx, pt["y"] >= by
        key = ("reliable" if (low_bust and high_boom)
               else "floor" if low_bust
               else "volatile" if high_boom
               else "neither")
        buckets[key].append({k: pt[k] for k in ("name", "ppg", "median", "games")}
                            | {"bust": pt["x"], "boom": pt["y"]})
    for v in buckets.values():
        v.sort(key=lambda m: -m["ppg"])

    out = {
        "medians": {"bust": bx, "boom": by},
        "corners": [
            {"key": k, "label": corners[k][0], "blurb": corners[k][1],
             "members": buckets[k]}
            for k in ("reliable", "floor", "volatile", "neither")
        ],
    }

    if not wopr_chart:
        warn("groups: no WOPR chart, the usage cross is missing")
        return out
    wopr = {pt["name"]: pt["x"] for pt in wopr_chart["points"]}
    wm = wopr_chart["x_median"]
    under, over = [], []
    for pt in pts:
        u = wopr.get(pt["name"])
        if u is None:
            continue
        row = {"name": pt["name"], "wopr": u, "ppg": pt["ppg"],
               "bust": pt["x"], "boom": pt["y"]}
        if u >= wm and pt["y"] < by:
            under.append(row)
        elif u < wm and pt["y"] >= by:
            over.append(row)
    under.sort(key=lambda m: -m["wopr"])
    over.sort(key=lambda m: m["wopr"])
    out["usage"] = {
        "wopr_median": wm,
        "matched": sum(1 for pt in pts if pt["name"] in wopr),
        "total": len(pts),
        "groups": [
            {"key": "role_intact", "label": "The role says more should be coming",
             "blurb": ("Top-half usage, bottom-half boom rate. What was missing "
                       "is the part that repeats least."),
             "members": under},
            {"key": "outscored_role", "label": "Outscored the role",
             "blurb": ("Bottom-half usage, top-half boom rate. The scoring "
                       "arrived without the workload behind it."),
             "members": over},
        ],
    }
    return out


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

    # ---- the two supplementary charts, from the nflverse export ----
    stickiness = build_stickiness(warn)
    if stickiness:
        top = stickiness["metrics"][0]
        bot = stickiness["metrics"][-1]
        print(f"  stickiness         {stickiness['pairs']} paired seasons, "
              f"{top['label']} {top['rho']:+.2f} down to {bot['label']} {bot['rho']:+.2f}")
    charted = {p["name"] for p in charts["airyards_share"]["points"]} if "airyards_share" in charts else set()
    consistency = build_consistency(charted, warn)
    if consistency:
        print(f"  consistency        {len(consistency['points'])} receivers")
    groups = build_groups(consistency, charts.get("wopr_ppg"), warn)
    if groups:
        sizes = ", ".join(f"{g['label'].split()[0].lower()} {len(g['members'])}"
                          for g in groups["corners"])
        print(f"  groups             {sizes}")
        if "usage" in groups:
            u = groups["usage"]
            print(f"  usage cross        "
                  + ", ".join(f"{g['key']} {len(g['members'])}" for g in u["groups"])
                  + f" (of {u['matched']}/{u['total']} with a WOPR point)")

    # ---- the computed grid columns, and how they square with his ----
    charted_all = {pt["name"] for c in charts.values() for pt in c["points"]}
    computed = build_grid_computed(charted_all, warn)
    if computed:
        f = computed["fit"]
        print(f"  grid computed      {computed['matched']} of {computed['pool']} "
              f"receivers; TD per look {f['endzone']:.2f} end zone / "
              f"{f['red_zone']:.2f} red zone / {f['elsewhere']:.3f} elsewhere, "
              f"R2 {f['r2']:.2f}")
        computed["agreement"] = _agreement(grid, computed)
        for a in computed["agreement"]:
            print(f"  agreement          {a['label']}: {len(a['both'])} shared, "
                  f"{len(a['workbook_disagrees'])} ranked elsewhere, "
                  f"{len(a['workbook_uncovered'])} not covered, "
                  f"{len(a['computed_only'])} computed only")

    verdicts = build_verdicts(grid, warn)
    if verdicts:
        print("  verdicts           " + ", ".join(
            f"{g['key']} {len(g['members'])}" for g in verdicts["groups"]))

    unresolved = sorted({n for g in grid["players"] for n in g["names"] if " " not in n})
    if unresolved:
        warn(f"grid names left short (no full name on this sheet): {unresolved}")
    stale = full.unused()
    if stale:
        warn(f"alias(es) never matched anything — a row may have moved: {stale}")

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
            "only here, not the licensed figures. The stickiness and consistency "
            "charts come from the operator's nflverse export instead of the "
            "workbook, and touch no licensed source at all. Every median, extent, "
            "correlation and label order is computed here, not in a component (§11)."
        ),
        "data": {
            "charts": charts,
            "stickiness": stickiness,
            "consistency": consistency,
            "groups": groups,
            "grid": grid,
            "grid_computed": computed,
            "verdicts": verdicts,
        },
    }

    dest = ROOT / "src/data/wr-charts.json"
    dest.write_text(json.dumps(out, indent=1) + "\n")
    print(f"\n{len(charts)} charts, {len(grid['players'])} player columns, "
          f"{len(grid['teams'])} team columns")
    print(f"wrote {dest.relative_to(ROOT)}")
    if warnings:
        print(f"\n{len(warnings)} warning(s) above — read them before trusting the page.")


if __name__ == "__main__":
    main()
