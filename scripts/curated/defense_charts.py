#!/usr/bin/env python3
"""
Build src/data/defense-charts.json from the workbook's "Defense and Kicker
Stats" sheet, rows 87 down.

Same contract as the other two extractors: the workbook is the source, anything
arithmetic is settled here, and the site renders without computing (§11).

Nine blocks live in this region and they are shaped differently from each
other — a scored top ten, seven leaderboards ten deep, two pass-rush tables,
five coverage columns ranked all thirty-two, ten teams of offseason movement, a
verdict on who improved, four favourable schedules, and three strength-of-
schedule lists from different sources. Each is parsed on its own terms rather
than forced into one shape.

Run: python3 scripts/curated/defense_charts.py [path/to/workbook.xlsx]
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
    for c in ET.fromstring(z.read(f"xl/worksheets/{sheet}.xml")).iter(N + "c"):
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
    at = lambda r, c: (str(g[(r, c)]).strip() if (r, c) in g else None)  # noqa: E731

    nicks = {
        t["nickname"]: t["abbr"]
        for t in json.loads((ROOT / "src/data/teams.json").read_text())["data"]
    }

    def team_entry(raw):
        """One cell from a leaderboard. Ties are typed as "Saints/Chargers", so
        a cell can name more than one club and is returned as a list."""
        if not raw:
            return None
        names = [p.strip() for p in raw.split("/") if p.strip()]
        return {
            "label": raw,
            "teams": [{"name": n, "abbr": nicks.get(n)} for n in names],
        }

    def column(header_row, col, first, last):
        label = at(header_row, col)
        entries = [team_entry(at(r, col)) for r in range(first, last + 1)]
        return {"label": label, "entries": [e for e in entries if e]}

    # ---- 1. fantasy scoring, top 10 ----
    fantasy = [
        {
            "rank": int(num(at(r, "A"))),
            "team": at(r, "B"),
            "abbr": nicks.get(at(r, "B")),
            "fpts": num(at(r, "C")),
            "ppg": num(at(r, "D")),
        }
        for r in range(91, 101)
        if at(r, "B")
    ]

    # What the top of the position is worth. Only the top ten are recorded, so
    # this is the spread inside the startable tier rather than against a
    # replacement defense — the sheet cannot support the second claim.
    spread = (
        {
            "top": fantasy[0],
            "tenth": fantasy[-1],
            "points": round(fantasy[0]["fpts"] - fantasy[-1]["fpts"], 1),
            "per_game": round((fantasy[0]["fpts"] - fantasy[-1]["fpts"]) / 17, 2),
        }
        if len(fantasy) >= 2
        else None
    )

    # ---- 2. the seven leaderboards, ten deep ----
    leaders = [column(103, c, 104, 113) for c in "BCDEFGH"]

    # ---- 3. pass rush ----
    simulated = [
        {
            "team": at(r, "B"),
            "abbr": nicks.get(at(r, "B")),
            "frequency": num(at(r, "C")),
            "efficiency": num(at(r, "D")),
        }
        for r in range(119, 129)
        if at(r, "B")
    ]
    box = [column(118, c, 119, 128) for c in "FGH"]

    # ---- 4. coverage and run defense, all 32 ranked ----
    coverage = [column(131, c, 132, 163) for c in "CDEFG"]

    # ---- 5. offseason movement, one block per team ----
    #
    # Blocks are found rather than hard-coded: a team name alone in column B,
    # followed by a Departures/Additions header. Each list runs until the column
    # goes quiet, and the two sides are different lengths more often than not.
    offseason = []
    r = 167
    while r < 240:
        name = at(r, "B")
        if name in nicks and at(r + 1, "B") == "Departures":
            dep, add, k = [], [], r + 2
            while k < 240 and (at(k, "B") or at(k, "C")):
                if at(k, "B"):
                    dep.append(at(k, "B"))
                if at(k, "C"):
                    add.append(at(k, "C"))
                k += 1
            offseason.append(
                {
                    "team": name,
                    "abbr": nicks.get(name),
                    "departures": dep,
                    "additions": add,
                }
            )
            r = k
        r += 1

    # ---- 6. the verdict ----
    verdict = {
        "improved": [
            {"name": at(r, "B"), "abbr": nicks.get(at(r, "B"))}
            for r in range(241, 247)
            if at(r, "B") in nicks
        ],
        "regressed": [
            {"name": at(r, "C"), "abbr": nicks.get(at(r, "C"))}
            for r in range(241, 247)
            if at(r, "C") in nicks
        ],
    }

    # ---- 7. favourable stretches, one column per team ----
    strong = []
    for c in "BCDE":
        name = at(249, c)
        if not name:
            continue
        weeks = []
        for r in range(250, 258):
            v = at(r, c)
            if not v:
                continue
            m = re.match(r"Week\s*(\d+)\s*:?\s*(.+)", v)
            if m:
                opp = m.group(2).strip()
                weeks.append(
                    {"week": int(m.group(1)), "opponent": opp, "abbr": nicks.get(opp)}
                )
        strong.append(
            {"team": name, "abbr": nicks.get(name), "weeks": weeks}
        )

    # ---- 8. three strength-of-schedule lists ----
    def sos(header_row, first, last):
        return {
            "source": at(header_row, "B"),
            "easiest": [
                {"name": at(r, "B"), "abbr": nicks.get(at(r, "B"))}
                for r in range(first, last + 1)
                if at(r, "B")
            ],
            "hardest": [
                {"name": at(r, "C"), "abbr": nicks.get(at(r, "C"))}
                for r in range(first, last + 1)
                if at(r, "C")
            ],
        }

    schedules = [sos(259, 261, 270), sos(272, 274, 278), sos(280, 282, 291)]

    out = {
        "schema_version": 1,
        "updated": "2026-08-15",
        "source": (
            "2026-2027 Fantasy Football Analytics workbook — 'Defense and Kicker "
            "Stats', defense section. Advanced columns credited to "
            "sumersports.com in the sheet. Rebuilt by "
            "scripts/curated/defense_charts.py."
        ),
        "note": (
            "2025 production and 2026 offseason movement. A leaderboard cell can "
            "name two clubs where the sheet records a tie; those are kept as "
            "written and split for display."
        ),
        "data": {
            "fantasy": fantasy,
            "spread": spread,
            "leaders": leaders,
            "leaders_source": at(102, "C"),
            "pass_rush": {"simulated": simulated, "box": box},
            "coverage": coverage,
            "offseason": offseason,
            "verdict": verdict,
            "strong_schedules": strong,
            "schedules": schedules,
        },
    }

    dest = ROOT / "src" / "data" / "defense-charts.json"
    dest.write_text(json.dumps(out, indent=1) + "\n")

    print(f"fantasy      {len(fantasy)} teams | DST1-DST10 spread "
          f"{spread['points']} pts ({spread['per_game']}/wk)")
    print(f"leaders      {len(leaders)} columns: {', '.join(c['label'] for c in leaders)}")
    print(f"simulated    {len(simulated)} teams | box {len(box)} columns")
    print(f"coverage     {len(coverage)} columns x {len(coverage[0]['entries'])} teams")
    print(f"offseason    {len(offseason)} teams: {', '.join(o['team'] for o in offseason)}")
    print(f"verdict      {len(verdict['improved'])} improved, {len(verdict['regressed'])} regressed")
    print(f"schedules    {len(strong)} favourable stretches, {len(schedules)} SOS lists")

    unknown = sorted(
        {
            t["name"]
            for col in leaders + coverage + box
            for e in col["entries"]
            for t in e["teams"]
            if not t["abbr"]
        }
    )
    if unknown:
        print(f"WARNING      names that are not a club: {', '.join(unknown)}")
    print(f"wrote {dest.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
