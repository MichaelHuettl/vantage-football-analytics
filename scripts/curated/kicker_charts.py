#!/usr/bin/env python3
"""
Build src/data/kicker-charts.json from the analytics workbook's
"Defense and Kicker Stats" sheet.

Same contract as rb_charts.py: the workbook is the source, everything that is
arithmetic is settled here, and the site renders the result without computing
anything (§11).

The persistence numbers are the part worth explaining. Retention is measured
against what chance would produce: a top-16 list drawn from 32 teams would
share 8 names with the next year's list by luck alone, so 8 is the null and
anything near it means last year's list tells you nothing about next year's.

Run: python3 scripts/curated/kicker_charts.py [path/to/workbook.xlsx]
"""
import json
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

N = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
ROOT = Path(__file__).resolve().parents[2]
DEFAULT_WB = (
    Path.home() / "Downloads" / "2026-2027 Fantasy Football Analytics (Original) (3).xlsx"
)
SHEET = "sheet8"


def cells(path, sheet):
    z = zipfile.ZipFile(path)
    shared = [
        "".join(t.text or "" for t in si.iter(N + "t"))
        for si in ET.fromstring(z.read("xl/sharedStrings.xml"))
    ]
    out = {}
    root = ET.fromstring(z.read(f"xl/worksheets/{sheet}.xml"))
    for c in root.iter(N + "c"):
        m = re.match(r"([A-Z]+)(\d+)", c.get("r") or "")
        if not m:
            continue
        v = c.find(N + "v")
        val = v.text if v is not None else None
        if c.get("t") == "s" and val is not None:
            val = shared[int(val)]
        if val not in (None, ""):
            out[(int(m.group(2)), m.group(1))] = val
    return out


def text(v):
    return str(v).strip() if v is not None else None


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def main():
    wb = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_WB
    if not wb.exists():
        sys.exit(f"workbook not found: {wb}")
    g = cells(wb, SHEET)
    at = lambda r, c: text(g.get((r, c)))  # noqa: E731

    # ---- team field goal attempts, top 16 and bottom 5, 2021-2025 ----
    years = ["2021", "2022", "2023", "2024", "2025"]
    ycol = dict(zip(years, "BCDEF"))
    top = {y: [at(r, ycol[y]) for r in range(7, 23) if at(r, ycol[y])] for y in years}
    bottom = {y: [at(r, ycol[y]) for r in range(25, 30) if at(r, ycol[y])] for y in years}

    # How often a team makes the top 16, and how much a top-16 finish carries
    # into the next year. Eight of sixteen is what chance alone would repeat.
    appearances = {}
    for y in years:
        for t in top[y]:
            appearances[t] = appearances.get(t, 0) + 1
    retention = [
        {
            "from": a,
            "to": b,
            "kept": len(set(top[a]) & set(top[b])),
            "of": len(top[b]),
        }
        for a, b in zip(years, years[1:])
    ]
    swings = []
    for a, b in zip(years, years[1:]):
        for t in sorted(set(bottom[a]) & set(top[b])):
            swings.append({"team": t, "from": a, "to": b, "direction": "up"})
        for t in sorted(set(top[a]) & set(bottom[b])):
            swings.append({"team": t, "from": a, "to": b, "direction": "down"})

    # ---- kicker scoring, top 16, 2023-2025 ----
    kyears = ["2023", "2024", "2025"]
    kcol = {"2023": ("B", "C", "D"), "2024": ("E", "F", "G"), "2025": ("H", "I", "J")}
    scoring = {}
    for y in kyears:
        n, f, p = kcol[y]
        scoring[y] = [
            {
                "rank": i + 1,
                "name": at(r, n),
                "fpts": num(g.get((r, f))),
                "ppg": num(g.get((r, p))),
            }
            for i, r in enumerate(range(34, 50))
            if at(r, n)
        ]

    kret = [
        {
            "from": a,
            "to": b,
            "kept": len({k["name"] for k in scoring[a]} & {k["name"] for k in scoring[b]}),
            "of": len(scoring[b]),
        }
        for a, b in zip(kyears, kyears[1:])
    ]
    every_year = sorted(
        set.intersection(*({k["name"] for k in scoring[y]} for y in kyears))
    )
    persistent = [
        {
            "name": nm,
            "seasons": [
                {
                    "year": y,
                    "rank": next(k["rank"] for k in scoring[y] if k["name"] == nm),
                    "ppg": next(k["ppg"] for k in scoring[y] if k["name"] == nm),
                }
                for y in kyears
            ],
        }
        for nm in every_year
    ]
    # What the position is actually worth: K1 against the last startable kicker.
    spread = [
        {
            "year": y,
            "k1": scoring[y][0],
            "k16": scoring[y][-1],
            "points": round(scoring[y][0]["fpts"] - scoring[y][-1]["fpts"], 1),
            "per_game": round((scoring[y][0]["fpts"] - scoring[y][-1]["fpts"]) / 17, 2),
        }
        for y in kyears
    ]

    # ---- the advantage columns ----
    ADV = [
        ("B", "Home field dome", "kicker"),
        ("D", "Lowest 4th-down go rate", "team"),
        ("E", "2024 red zone TD % (low)", "team"),
        ("F", "2025 red zone TD % (low)", "team"),
        ("G", "60+ yard range", "kicker"),
    ]
    def column(col):
        """Names down one advantage column, in sheet order, deduplicated.
        Reichard is entered twice under the dome heading; a name listed twice
        is not twice as domed."""
        seen, out = set(), []
        for r in range(54, 66):
            v = at(r, col)
            if v and v not in seen:
                seen.add(v)
                out.append(v)
        return out

    advantages = [
        {"label": label, "kind": kind, "entries": column(col)}
        for col, label, kind in ADV
    ]
    # Column C mixes two headed sub-lists rather than one column of names.
    weather = []
    current = None
    for r in range(54, 66):
        v = at(r, "C")
        if not v:
            continue
        if v in ("Warm Weather", "High Altitude"):
            current = {"label": v, "entries": []}
            weather.append(current)
        elif current:
            current["entries"].append(v)
    advantages.append(
        {
            "label": "Weather and altitude",
            "kind": "mixed",
            "groups": weather,
            "entries": [],
        }
    )

    favorites = [
        {"name": at(r, "B"), "reason": at(r, "C")}
        for r in range(72, 76)
        if at(r, "B")
    ]
    value_picks = [at(r, "B") for r in range(77, 86) if at(r, "B")]

    # ---- the published board ----
    #
    # Who is on it is an editorial call and is written here by hand. What each
    # of them did is not: the season line is joined from the scoring rows above,
    # so no number on the page is ever retyped. `surname` is the key the
    # workbook uses; `full` is what a reader should see.
    BOARD = {
        "top3": [
            ("Aubrey", "Brandon Aubrey", "DAL", "brandon-aubrey"),
            ("Dicker", "Cameron Dicker", "LAC", "cameron-dicker"),
            ("Fairbairn", "Ka'imi Fairbairn", "HOU", "kaimi-fairbairn"),
        ],
        "value": [
            ("McLaughlin", "Chase McLaughlin", "TB", None),
            ("Pineiro", "Eddy Pineiro", "SF", "eddy-pineiro"),
            ("Boswell", "Chris Boswell", "PIT", "chris-boswell"),
            ("Lutz", "Wil Lutz", "DEN", "wil-lutz"),
            ("Smyth", "Charlie Smyth", "NO", "charlie-smyth"),
        ],
    }

    def line(surname):
        """Every top-16 season this kicker had, with games derived from the two
        columns the sheet does carry. Points divided by points per game is the
        only route to games played here, and it lands within a tenth of an
        integer on every row, which is what makes it trustworthy."""
        out = []
        for y in kyears:
            k = next((k for k in scoring[y] if k["name"] == surname), None)
            if not k:
                continue
            out.append(
                {
                    "year": y,
                    "rank": k["rank"],
                    "fpts": k["fpts"],
                    "ppg": k["ppg"],
                    "games": round(k["fpts"] / k["ppg"], 1) if k["ppg"] else None,
                }
            )
        return out

    # The operator's own write-up for each favourite, matched by the surname the
    # sheet keys on. His words go on the page verbatim; the season line beside
    # them is the workbook's own scoring rows.
    reasons = {f["name"]: f["reason"] for f in favorites}

    board = {
        tier: [
            {
                "surname": s,
                "name": full,
                "team": team,
                "player_id": pid,
                "reason": reasons.get(s),
                "seasons": line(s),
                "appearances": len(line(s)),
                "swing": (
                    round(
                        max(x["ppg"] for x in line(s)) - min(x["ppg"] for x in line(s)), 1
                    )
                    if line(s)
                    else None
                ),
            }
            for s, full, team, pid in picks
        ]
        for tier, picks in BOARD.items()
    }

    out = {
        "schema_version": 1,
        "updated": "2026-08-15",
        "source": (
            "2026-2027 Fantasy Football Analytics workbook — 'Defense and Kicker "
            "Stats'. Rebuilt by scripts/curated/kicker_charts.py."
        ),
        "note": (
            "Team field goal attempts run 2021-2025; kicker scoring 2023-2025. "
            "Retention and spread are computed here, not on the page (§11)."
        ),
        "data": {
            "fg_attempts": {
                "years": years,
                "top": top,
                "bottom": bottom,
                "appearances": appearances,
                "retention": retention,
                "swings": swings,
                "null": 8,
            },
            "scoring": {
                "years": kyears,
                "rows": scoring,
                "retention": kret,
                "persistent": persistent,
                "spread": spread,
            },
            "advantages": advantages,
            "favorites": favorites,
            "value_picks": value_picks,
            "board": board,
            "divisions_note": at(67, "B"),
        },
    }

    dest = ROOT / "src" / "data" / "kicker-charts.json"
    dest.write_text(json.dumps(out, indent=1) + "\n")

    print(f"fg attempts  {len(years)} years, top16 + bottom5")
    print(
        "  retention   "
        + ", ".join(f"{r['from']}->{r['to']} {r['kept']}/{r['of']}" for r in retention)
        + "   (8/16 = chance)"
    )
    print(f"scoring      {len(kyears)} years x 16")
    print(
        "  retention   "
        + ", ".join(f"{r['from']}->{r['to']} {r['kept']}/{r['of']}" for r in kret)
    )
    print(f"  every year  {', '.join(every_year)}")
    print(f"advantages   {len(advantages)} columns")
    print(f"favorites    {len(favorites)}   value picks {len(value_picks)}")
    for tier in ("top3", "value"):
        for k in board[tier]:
            yrs = " ".join(f"{x['year']}:K{x['rank']}@{x['ppg']}({x['games']}g)" for x in k["seasons"])
            print(f"  {tier:<6} {k['name']:<18} {k['team']:<4} {k['appearances']}/3  {yrs or 'no top-16 season'}")
    print(f"wrote {dest.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
