#!/usr/bin/env python3
"""
Build src/data/rb-charts.json from the analytics workbook.

The workbook is the source of truth and lives outside the repo. This script
reads it, computes every summary value the page needs, and writes a plain JSON
file the site renders without arithmetic — §11 does not let a React component
compute a metric, and a median is a metric. Medians, counts and sort order are
all settled here.

The scatter data is 2025 production. The workbook is named for 2026-2027
because that is the season being drafted for; the numbers underneath are last
season's, which is what makes them evidence rather than projection.

Run: python3 scripts/curated/rb_charts.py [path/to/workbook.xlsx]
"""
import json
import re
import statistics
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

N = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
ROOT = Path(__file__).resolve().parents[2]
DEFAULT_WB = Path.home() / "Downloads" / "2026-2027 Fantasy Football Analytics (Original) (2).xlsx"

SHEET = {"rb": "sheet3", "opportunity": "sheet4"}


def load(path):
    z = zipfile.ZipFile(path)
    shared = [
        "".join(t.text or "" for t in si.iter(N + "t"))
        for si in ET.fromstring(z.read("xl/sharedStrings.xml"))
    ]

    def cells(sheet):
        out = {}
        for _, el in ET.iterparse(z.open(f"xl/worksheets/{sheet}.xml"), events=("end",)):
            if el.tag == N + "c":
                m = re.match(r"([A-Z]+)(\d+)", el.get("r") or "")
                if m:
                    v = el.find(N + "v")
                    val = v.text if v is not None else None
                    if el.get("t") == "s" and val is not None:
                        val = shared[int(val)]
                    if val not in (None, ""):
                        out[(int(m.group(2)), m.group(1))] = val
                el.clear()
        return out

    return cells


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def scatter(cells, name_col, x_col, y_col, lo, hi):
    """Points for one scatter, dropping any row missing a name or a coordinate
    rather than plotting a zero that was never measured."""
    pts = []
    for r in range(lo, hi + 1):
        nm = cells.get((r, name_col))
        x, y = num(cells.get((r, x_col))), num(cells.get((r, y_col)))
        if not nm or x is None or y is None:
            continue
        pts.append({"name": str(nm).strip(), "x": round(x, 4), "y": round(y, 4)})
    return pts


def shorten(name):
    """
    "Christian McCaffrey" to "C. McCaffrey".

    Every point is named on the chart, so the width of a name is the budget.
    An initial costs a tenth of the space a first name does and loses nothing —
    the workbook's own RB sheet already writes them this way. Names that are
    already short, or carry a season suffix, are left alone.
    """
    if "'" in name and name.endswith(tuple("0123456789")):
        return name
    parts = name.split()
    if len(parts) < 2 or len(parts[0]) <= 2:
        return name
    return f"{parts[0][0]}. {' '.join(parts[1:])}"


def mark_labels(points, keep=None):
    """
    Order the points for labelling, and give each a short display name.

    Every point is named — a scatter that names only the extremes leaves the
    reader guessing at the middle, and the middle is where most of the argument
    about a back actually happens. Ordering still matters: on a crowded patch
    the renderer places names in this order, so the most unusual seasons get
    the clean spots and anything it cannot fit is the least interesting point
    on the chart rather than an arbitrary one.
    """
    xs = sorted(p["x"] for p in points)
    ys = sorted(p["y"] for p in points)

    def spread(v):
        lo = v[int(len(v) * 0.25)]
        hi = v[int(len(v) * 0.75)]
        return (hi - lo) or 1.0

    mx, my = statistics.median(xs), statistics.median(ys)
    sx, sy = spread(xs), spread(ys)
    ranked = sorted(
        points,
        key=lambda p: -max(abs(p["x"] - mx) / sx, abs(p["y"] - my) / sy),
    )
    for i, p in enumerate(ranked if keep is None else ranked[:keep]):
        p["label"] = True
        p["short"] = shorten(p["name"])
        # Placement priority. Names collide on a crowded scatter, and when one
        # has to be dropped it should be the least extreme, not whichever the
        # renderer happened to reach last.
        p["rank"] = i
    return points


def summarise(points, x_label, y_label, caption, note=None):
    """Medians travel with the points. §5.2 wants median crosshairs on the
    chart, and the component may not work them out itself."""
    points = mark_labels(points)
    body = {
        "x_label": x_label,
        "y_label": y_label,
        "caption": caption,
        "x_median": round(statistics.median(p["x"] for p in points), 4),
        "y_median": round(statistics.median(p["y"] for p in points), 4),
        "x_min": min(p["x"] for p in points),
        "x_max": max(p["x"] for p in points),
        "y_min": min(p["y"] for p in points),
        "y_max": max(p["y"] for p in points),
        "points": points,
    }
    if note:
        body["note"] = note
    return body


def historic(cells):
    """
    The 'Historic RB 1-3' block: the top three fantasy backs of each season
    since 2017, one row per finish, with the workbook's own distribution
    underneath it.

    It lives on the RB sheet at row 260, not on the sheet named 'Historical
    2025 Fantasy Stats' — that one is an empty template.
    """
    seasons = []
    for r in range(262, 289):
        name = cells.get((r, "B"))
        year = num(cells.get((r, "A")))
        if not name or year is None:
            continue
        seasons.append(
            {
                "name": str(name).strip(),
                "season": int(year),
                "attempts": num(cells.get((r, "C"))) or 0,
                "rush_yards": num(cells.get((r, "D"))) or 0,
                "rush_td": num(cells.get((r, "E"))) or 0,
                "receptions": num(cells.get((r, "F"))) or 0,
                "targets": num(cells.get((r, "G"))) or 0,
                "rec_yards": num(cells.get((r, "H"))) or 0,
            }
        )

    labels = ["median", "p25", "p75", "min", "max"]
    fields = ["attempts", "rush_yards", "rush_td", "receptions", "targets", "rec_yards"]
    dist = {}
    for i, key in enumerate(labels):
        row = 290 + i
        dist[key] = {f: num(cells.get((row, c))) for f, c in zip(fields, "CDEFGH")}

    def profile(first_row, label):
        """The workbook's benchmark for a tier: the value each stat has to
        clear. Read by row label rather than by offset, because the two blocks
        do not line up."""
        out = {}
        for r in range(first_row, first_row + 8):
            k = cells.get((r, "B"))
            v = num(cells.get((r, "C")))
            if not k or v is None:
                continue
            # 46315 is an Excel date serial sitting in a rank cell — the value
            # was lost to a cell format, so it is dropped rather than printed.
            if v > 1000:
                continue
            out[str(k).strip()] = v
        names = [
            str(cells.get((r, "D"))).strip()
            for r in range(first_row, first_row + 8)
            if cells.get((r, "D"))
        ]
        return {"label": label, "thresholds": out, "candidates": names}

    return {
        "seasons": seasons,
        "distribution": dist,
        "tiers": [
            profile(297, "RB 1-3"),
            profile(313, "Value RB (4-10)"),
        ],
    }


def col_name(i):
    s = ""
    i += 1
    while i:
        i, r = divmod(i - 1, 26)
        s = chr(65 + r) + s
    return s


def col_index(s):
    n = 0
    for ch in s:
        n = n * 26 + (ord(ch) - 64)
    return n - 1


def team_blocks(cells):
    """The opportunity sheet repeats a five-column block per team, starting at
    G and stepping six columns, with the team name two columns into the block."""
    start = col_index("G")
    blocks = []
    for b in range(32):
        c_name = col_name(start + b * 6)
        c_att = col_name(start + b * 6 + 1)
        c_tgt = col_name(start + b * 6 + 2)
        c_opp = col_name(start + b * 6 + 3)
        team = cells.get((2, c_tgt))
        if not team:
            continue
        rows = []
        for r in range(4, 40):
            nm = cells.get((r, c_name))
            if nm == "Totals":
                break
            if not nm:
                continue
            rows.append(
                {
                    "name": str(nm).strip(),
                    "attempts": num(cells.get((r, c_att))) or 0,
                    "targets": num(cells.get((r, c_tgt))) or 0,
                    "share": num(cells.get((r, c_opp))) or 0,
                }
            )
        if rows:
            blocks.append({"team": str(team).strip(), "rows": rows})
    return blocks


def main():
    wb = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_WB
    if not wb.exists():
        sys.exit(f"workbook not found: {wb}")
    cells = load(wb)
    rb = cells(SHEET["rb"])
    opp = cells(SHEET["opportunity"])

    hvt = scatter(rb, "B", "D", "E", 6, 52)
    contact = scatter(rb, "B", "C", "D", 72, 119)
    routes = scatter(rb, "B", "C", "D", 145, 192)

    hist = historic(rb)
    # The scatter is one point per top-three finish: carries across, targets up.
    # Both routes to the tier are visible at once — Henry's 378 carries and 31
    # targets, Ekeler's 204 and 127 — which is the argument the block makes.
    hist_points = [
        {
            "name": f"{s['name'].split()[-1]} '{str(s['season'])[2:]}",
            "x": s["attempts"],
            "y": s["targets"],
        }
        for s in hist["seasons"]
    ]

    blocks = team_blocks(opp)
    lead_share = sorted(
        (
            {
                "team": b["team"],
                **max(b["rows"], key=lambda r: r["share"]),
            }
            for b in blocks
        ),
        key=lambda r: -r["share"],
    )
    lead_targets = sorted(
        (
            {
                "team": b["team"],
                **max(b["rows"], key=lambda r: r["targets"]),
            }
            for b in blocks
        ),
        key=lambda r: -r["targets"],
    )

    out = {
        "schema_version": 1,
        "season": 2025,
        "updated": "2026-08-15",
        "source": (
            "2026-2027 Fantasy Football Analytics workbook — 'RB Statistics & "
            "Graphs' and 'Rushing Opportunity Share'. Rebuilt by "
            "scripts/curated/rb_charts.py."
        ),
        "note": (
            "2025 production, which is the evidence for a 2026 draft rather than "
            "a projection of it. Medians and sort order are computed here, not on "
            "the page (§11). Rows missing a name or a coordinate are dropped "
            "rather than plotted as zero."
        ),
        "data": {
            "hvt": summarise(
                hvt,
                "High-value touches per game",
                "PPR points per game",
                "Backs who touch the ball near the goal line and in the passing "
                "game score more. The interesting names are the ones off the line.",
            ),
            "contact": summarise(
                contact,
                "Yards before contact per attempt",
                "Yards after contact per attempt",
                "Horizontal is what the line gave him. Vertical is what he did "
                "with it.",
            ),
            "routes": summarise(
                routes,
                "Route participation",
                "Targets per route run",
                "Being on the field for passing downs is not the same as being "
                "thrown to. High and left is a decoy.",
                note=(
                    "Route participation and targets per route run come from a "
                    "licensed source. Published here on the operator's explicit "
                    "decision for this non-commercial portfolio; see docs/STATE.md."
                ),
            ),
            "historic": {
                **summarise(
                    hist_points,
                    "Rushing attempts",
                    "Targets",
                    "Every top-three fantasy back since 2017. There are two ways "
                    "into this tier and the shaded box is where most of them sit.",
                ),
                "band": {
                    "x0": hist["distribution"]["p25"]["attempts"],
                    "x1": hist["distribution"]["p75"]["attempts"],
                    "y0": hist["distribution"]["p25"]["targets"],
                    "y1": hist["distribution"]["p75"]["targets"],
                },
                "seasons": hist["seasons"],
                "distribution": hist["distribution"],
                "tiers": hist["tiers"],
            },
            "opportunity": {
                "label": "Opportunity share",
                "caption": (
                    "Each team's most-used back, by share of the team's carries "
                    "plus targets. The gap between a bell-cow backfield and a "
                    "committee is the whole draft decision."
                ),
                "rows": lead_share,
            },
            "targets": {
                "label": "Targets",
                "caption": (
                    "Each team's most-targeted back. Receiving work is the part of "
                    "a back's usage that survives a bad game script."
                ),
                "note": (
                    "Raw targets, not target share: the sheet carries backfield "
                    "targets but not team passing volume, so a share cannot be "
                    "derived from it without inventing the denominator."
                ),
                "rows": lead_targets,
            },
        },
    }

    dest = ROOT / "src" / "data" / "rb-charts.json"
    dest.write_text(json.dumps(out, indent=1) + "\n")

    print(f"hvt      {len(hvt):>3} points  median x={out['data']['hvt']['x_median']}")
    print(f"contact  {len(contact):>3} points  median x={out['data']['contact']['x_median']}")
    print(f"routes   {len(routes):>3} points  median x={out['data']['routes']['x_median']}")
    print(f"teams    {len(blocks):>3} blocks -> {len(lead_share)} share rows, {len(lead_targets)} target rows")
    yrs = sorted({s["season"] for s in hist["seasons"]})
    print(f"historic {len(hist['seasons']):>3} finishes, {yrs[0]}-{yrs[-1]}, tiers: "
          + ", ".join(f"{t['label']} ({len(t['thresholds'])} thresholds)" for t in hist["tiers"]))
    print(f"wrote {dest.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
