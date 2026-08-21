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

# Corrections the operator has made to the sheet's own columns.
#
# The workbook lists some teams in both the top 16 and the bottom 5 of the same
# season, which cannot both be true. Where he has given the corrected column it
# is recorded here rather than edited into the JSON, so it survives the next
# re-extraction. `bottom` runs 28 to 32, matching the sheet's own row order —
# he gave 2021 worst-first, so it is reversed here.
#
# Delete an entry once the workbook itself is fixed; the script says so when a
# correction has become redundant.
CORRECTIONS = {
    "2021": {
        "top": [
            "Raiders", "Steelers", "Patriots", "Vikings", "Ravens", "Cardinals",
            "Cowboys", "Colts", "Rams", "Bengals", "Packers", "Eagles",
            "Giants", "Commanders", "Bills", "Chiefs",
        ],
        "bottom": ["Texans", "Jaguars", "Jets", "Seahawks", "Browns"],
    },
    "2023": {
        "top": [
            "Rams", "Seahawks", "Colts", "Jets", "Cowboys", "Bears", "Texans",
            "Browns", "Falcons", "Ravens", "Jaguars", "Saints", "Chiefs",
            "Broncos", "Chargers", "Cardinals",
        ],
        # Given with explicit ranks 28 to 32, so stored in that order as-is.
        "bottom": ["Dolphins", "49ers", "Patriots", "Commanders", "Lions"],
    },
}


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


# Surname to full name. The sheet keys on surnames; the site prints people's
# names. Resolved against the live roster, with two decided by hand: the
# workbook's "Carlson" is Daniel — he is on the dome and 60-plus lists and
# finished K10 in 2024, none of which fits Anders — and "Elliot" is Jake
# Elliott, spelled with one t in the sheet.
FULL_NAME = {
    "Aubrey": "Brandon Aubrey", "Bass": "Tyler Bass", "Bates": "Jake Bates",
    "Borregales": "Andy Borregales", "Boswell": "Chris Boswell",
    "Butker": "Harrison Butker", "Carlson": "Daniel Carlson",
    "Dicker": "Cameron Dicker", "Elliot": "Jake Elliott",
    "Fairbairn": "Ka'imi Fairbairn", "Folk": "Nick Folk", "Gay": "Matt Gay",
    "Gonzalez": "Zane Gonzalez", "Grupe": "Blake Grupe",
    "Hopkins": "Dustin Hopkins", "Karty": "Joshua Karty", "Koo": "Younghoe Koo",
    "Little": "Cam Little", "Loop": "Tyler Loop", "Lutz": "Wil Lutz",
    "McLaughlin": "Chase McLaughlin", "McManus": "Brandon McManus",
    "McPherson": "Evan McPherson", "Mevis": "Harrison Mevis",
    "Myers": "Jason Myers", "Pineiro": "Eddy Pineiro",
    "Reichard": "Will Reichard", "Ryland": "Chad Ryland",
    "Sanders": "Jason Sanders", "Santos": "Cairo Santos",
    "Shrader": "Spencer Shrader", "Slye": "Joey Slye",
    "Smyth": "Charlie Smyth", "Tucker": "Justin Tucker",
    "Zuerlein": "Greg Zuerlein",
}


# Where each listed kicker plays in 2026, so a kicker column can carry the same
# team chip a team column does. Resolved against the live roster. A kicker
# without a job gets no chip rather than a stale one.
KICKER_TEAM = {
    "Andy Borregales": "NE", "Brandon Aubrey": "DAL", "Cam Little": "JAX",
    "Cameron Dicker": "LAC", "Chad Ryland": "ARI", "Charlie Smyth": "NO",
    "Chase McLaughlin": "TB", "Chris Boswell": "PIT", "Daniel Carlson": None,
    "Eddy Pineiro": "SF", "Evan McPherson": "CIN", "Harrison Butker": "KC",
    "Harrison Mevis": "LAR", "Jake Bates": "DET", "Ka'imi Fairbairn": "HOU",
    "Nick Folk": "ATL", "Spencer Shrader": "IND", "Will Reichard": "MIN",
    "Zane Gonzalez": "MIA",
}


# The team each kicker played for in the season shown, so a chip on a 2023
# row names the club he actually kicked for. Current teams would be wrong for
# eight of these: Jason Sanders was in Miami, Matt Gay in Indianapolis, Blake
# Grupe in New Orleans, and Carlson, Koo, Zuerlein, Hopkins and McManus have all
# since moved or left. Verified against nflverse season rosters; historical and
# therefore fixed.
SEASON_TEAM = {
    "Andy Borregales": {"2025": "NE"},
    "Blake Grupe": {"2023": "NO"},
    "Brandon Aubrey": {"2023": "DAL", "2024": "DAL", "2025": "DAL"},
    "Brandon McManus": {"2023": "JAX"},
    "Cairo Santos": {"2023": "CHI"},
    "Cam Little": {"2025": "JAX"},
    "Cameron Dicker": {"2023": "LAC", "2024": "LAC", "2025": "LAC"},
    "Chase McLaughlin": {"2023": "TB", "2024": "TB", "2025": "TB"},
    "Chris Boswell": {"2024": "PIT", "2025": "PIT"},
    "Daniel Carlson": {"2024": "LV"},
    "Dustin Hopkins": {"2023": "CLE"},
    "Eddy Pineiro": {"2025": "SF"},
    "Evan McPherson": {"2023": "CIN", "2025": "CIN"},
    "Greg Zuerlein": {"2023": "NYJ"},
    "Harrison Butker": {"2023": "KC", "2025": "KC"},
    "Jake Bates": {"2024": "DET", "2025": "DET"},
    "Jake Elliott": {"2023": "PHI", "2024": "PHI"},
    "Jason Myers": {"2023": "SEA", "2024": "SEA", "2025": "SEA"},
    "Jason Sanders": {"2023": "MIA", "2024": "MIA"},
    "Joey Slye": {"2025": "TEN"},
    "Joshua Karty": {"2024": "LAR"},
    "Justin Tucker": {"2023": "BAL", "2024": "BAL"},
    "Ka'imi Fairbairn": {"2024": "HOU", "2025": "HOU"},
    "Matt Gay": {"2023": "IND", "2024": "IND"},
    "Tyler Bass": {"2024": "BUF"},
    "Tyler Loop": {"2025": "BAL"},
    "Wil Lutz": {"2024": "DEN", "2025": "DEN"},
    "Will Reichard": {"2024": "MIN", "2025": "MIN"},
    "Younghoe Koo": {"2023": "ATL"},
}


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

    # A correction that does not reconcile is worse than the contradiction it
    # replaces, so it has to survive three checks before it is trusted: the
    # right number of teams, no team in both halves, and no name the site
    # cannot resolve to a real club.
    nicknames = {
        t["nickname"]
        for t in json.loads((ROOT / "src/data/teams.json").read_text())["data"]
    }
    for y, fix in CORRECTIONS.items():
        both = set(fix["top"]) & set(fix["bottom"])
        unknown = [t for t in fix["top"] + fix["bottom"] if t not in nicknames]
        if len(fix["top"]) != 16 or len(fix["bottom"]) != 5:
            sys.exit(f"{y} correction: expected 16 and 5, got "
                     f"{len(fix['top'])} and {len(fix['bottom'])}")
        if both:
            sys.exit(f"{y} correction still lists {', '.join(sorted(both))} in both halves")
        if unknown:
            sys.exit(f"{y} correction has unknown team(s): {', '.join(unknown)}")
        if len(set(fix["top"] + fix["bottom"])) != 21:
            sys.exit(f"{y} correction has duplicate teams")
        if y not in top:
            continue
        if top[y] == fix["top"] and bottom[y] == fix["bottom"]:
            print(f"NOTE         {y} correction now matches the workbook — remove it")
            continue
        print(f"CORRECTED    {y}: top16 {len(set(fix['top']) - set(top[y]))} in, "
              f"{len(set(top[y]) - set(fix['top']))} out; "
              f"bottom5 {len(set(fix['bottom']) - set(bottom[y]))} in, "
              f"{len(set(bottom[y]) - set(fix['bottom']))} out")
        top[y], bottom[y] = fix["top"], fix["bottom"]

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

    # The sheet contains contradictions worth surfacing rather than silently
    # rendering: a handful of teams are typed into both the top 16 and the
    # bottom 5 of the same season. Recorded, not corrected — which of the two
    # ranks is right is the operator's call.
    contradictions = [
        {
            "year": y,
            "team": t,
            "top_rank": top[y].index(t) + 1,
            "bottom_rank": 28 + bottom[y].index(t),
        }
        for y in years
        for t in top[y]
        if t in bottom[y]
    ]

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
                "full": FULL_NAME.get(at(r, n), at(r, n)),
                "team": SEASON_TEAM.get(FULL_NAME.get(at(r, n), at(r, n)), {}).get(y),
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

    nicks = {
        t["nickname"]: t["abbr"]
        for t in json.loads((ROOT / "src/data/teams.json").read_text())["data"]
    }

    def entry(raw, kind):
        """One list item as {name, team}. A team column names a club; a kicker
        column names a person and carries the club he kicks for, so both render
        the same chip and the column reads as one thing rather than two."""
        if kind == "team" or raw in nicks:
            return {"name": raw, "team": nicks.get(raw)}
        full = FULL_NAME.get(raw, raw)
        return {"name": full, "team": KICKER_TEAM.get(full)}

    advantages = [
        {"label": label, "kind": kind,
         "entries": [entry(e, kind) for e in column(col)]}
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
            current["entries"].append(entry(v, "mixed"))
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
            ("McLaughlin", "Chase McLaughlin", "TB", "chase-mclaughlin"),
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
                "contradictions": contradictions,
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
    if contradictions:
        print(f"WARNING      {len(contradictions)} team(s) listed in both top 16 and bottom 5:")
        for c in contradictions:
            print(f"             {c['year']} {c['team']}: rank {c['top_rank']} and rank {c['bottom_rank']}")
    print(f"favorites    {len(favorites)}   value picks {len(value_picks)}")
    for tier in ("top3", "value"):
        for k in board[tier]:
            yrs = " ".join(f"{x['year']}:K{x['rank']}@{x['ppg']}({x['games']}g)" for x in k["seasons"])
            print(f"  {tier:<6} {k['name']:<18} {k['team']:<4} {k['appearances']}/3  {yrs or 'no top-16 season'}")
    print(f"wrote {dest.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
