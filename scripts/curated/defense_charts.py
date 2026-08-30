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
# Names the workbook spells wrong, keyed on the wrong spelling so the entry
# stops firing the moment the sheet is fixed. Same contract as CORRECTIONS in
# kicker_charts.py: it announces itself when it has become redundant rather than
# sitting there forever.
NAME_CORRECTIONS = {
    "Chirs O'Leary": "Chris O'Leary",
}
_name_corrections_used: set[str] = set()


def correct_name(name: str) -> str:
    fixed = NAME_CORRECTIONS.get(name)
    if fixed:
        _name_corrections_used.add(name)
        return fixed
    return name


DEFAULT_WB = (
    Path.home() / "Downloads" / "2026-2027 Fantasy Football Analytics (Original) (4).xlsx"
)
SHEET = "sheet8"

# Which end of each coverage column is the good end.
#
# Nothing in the sheet marks this and it is not consistent: three of the five
# run worst-first. It was established by inspecting which end the known top-ten
# scoring defenses cluster at — reading "Down conversion rate allowed" the wrong
# way round turns the third-best predictor in the data into the worst.
COVERAGE_DIRECTION = {
    "Down Conversion Rate Allowed": "worst-first",
    "Middle Closed Rate": "worst-first",
    "Middle Open Rate": "best-first",
    "Pressure Rate": "best-first",
    "Rush Stuff Rate": "worst-first",
}

# A ten-team list drawn from a 32-team league shares this many names with
# another ten-team list by luck alone. Every hit rate below is judged against it.
LEAGUE = 32


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

    # ---- 1. fantasy scoring, four seasons side by side ----
    #
    # The (4) sheet carries 2022-2025 in parallel blocks four columns apart,
    # each with EPA per play beside the points. 2025 stays the primary table;
    # the rest become the historical grid.
    SEASON_COLS = {"2025": "BCDE", "2024": "GHIJ", "2023": "LMNO", "2022": "QRST"}
    seasons_scoring = {}
    for year, (tc, fc, pc, ec) in SEASON_COLS.items():
        rows_y = []
        for i, r in enumerate(range(91, 101)):
            team = at(r, tc)
            if not team:
                continue
            rows_y.append(
                {
                    "rank": i + 1,
                    "team": team,
                    "abbr": nicks.get(team),
                    "fpts": num(at(r, fc)),
                    "ppg": num(at(r, pc)),
                    # "-0.12 (#2)" — the value and its league rank in one cell.
                    "epa": at(r, ec),
                }
            )
        seasons_scoring[year] = rows_y
    fantasy = seasons_scoring["2025"]

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

    def paired(first_row, last_row, blocks, value_key):
        """A block of "team / value / fantasy finish" columns, one per season.
        The finish is typed as "#4", which is the join back to the scoring
        table and the whole point of the block."""
        out = {}
        for year, (tc, vc, fc) in blocks.items():
            rows_y = []
            for r in range(first_row, last_row + 1):
                team = at(r, tc)
                if not team:
                    continue
                finish = at(r, fc)
                rows_y.append(
                    {
                        "team": team.strip(),
                        "abbr": nicks.get(team.strip()),
                        value_key: num(at(r, vc)),
                        "finish": finish.strip() if finish else None,
                        "finish_rank": num((finish or "").replace("#", "").strip()),
                    }
                )
            out[year] = rows_y
        return out

    TRIPLE = {"2025": "BCD", "2024": "FGH", "2023": "JKL"}
    success = paired(120, 129, TRIPLE, "success_rate")
    dvoa = paired(136, 145, TRIPLE, "dvoa")

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
        for r in range(149, 159)
        if at(r, "B")
    ]
    box = [column(148, c, 149, 158) for c in "FGH"]

    # ---- 4. coverage and run defense, all 32 ranked ----
    # Column F is now blank and pressure rate has moved to G.
    coverage = [column(161, c, 162, 193) for c in "CDEGH"]

    # ---- 5. offseason movement, one block per team ----
    #
    # Blocks are found rather than hard-coded: a team name alone in column B,
    # followed by a Departures/Additions header. Each list runs until the column
    # goes quiet, and the two sides are different lengths more often than not.
    offseason = []
    r = 197
    while r < 270:
        name = at(r, "B")
        if name in nicks and at(r + 1, "B") == "Departures":
            dep, add, k = [], [], r + 2
            while k < 270 and (at(k, "B") or at(k, "C")):
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
            for r in range(271, 277)
            if at(r, "B") in nicks
        ],
        "regressed": [
            {"name": at(r, "C"), "abbr": nicks.get(at(r, "C"))}
            for r in range(271, 277)
            if at(r, "C") in nicks
        ],
    }

    # ---- 7. favourable stretches, one column per team ----
    strong = []
    for c in "BCDEF":
        name = at(306, c)
        if not name:
            continue
        weeks = []
        for r in range(307, 316):
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

    schedules = [sos(316, 318, 327), sos(329, 331, 335), sos(337, 339, 348)]

    # ---- 9. coordinator changes ----
    #
    # Column B lists the hire and his new club, column D his record. Column C is
    # a different thing sharing the same rows: two ranked lists of the jobs
    # inherited, best from row 281 and worst from a second heading part-way
    # down. Parsed as its own structure rather than a fourth field.
    coordinators = []
    for r in range(281, 296):
        raw = at(r, "B")
        if not raw:
            continue
        m = re.match(r"(.+?)\s*\((.+?)\)\s*$", raw)
        name = m.group(1).strip() if m else raw
        name = correct_name(name)
        team = m.group(2).strip() if m else None
        coordinators.append(
            {
                "name": name,
                "team": team,
                "abbr": nicks.get(team) if team else None,
                "record": at(r, "D"),
            }
        )

    inherited, bucket = [], None
    for r in range(280, 296):
        v = at(r, "C")
        if not v:
            continue
        if v.lower().endswith("inherited jobs"):
            bucket = {"label": v, "entries": []}
            inherited.append(bucket)
        elif bucket is not None:
            # "Bills: Leonard" — the club that made the hire, and who they got.
            club, _, who = v.partition(":")
            bucket["entries"].append(
                {
                    "team": club.strip(),
                    "abbr": nicks.get(club.strip()),
                    "coordinator": who.strip() or None,
                }
            )

    dc_note = at(296, "B")
    dc_outlook = {
        "improve": [at(r, "B") for r in range(299, 305) if at(r, "B")],
        "regress": [at(r, "C") for r in range(299, 305) if at(r, "C")],
    }

    # ---- does a measure actually track scoring? ----
    #
    # Only the top ten scorers are recorded, so this can ask whether a measure's
    # leaders overlap the scoring leaders, never how the two correlate across
    # the league. The null is explicit: a ten-team list shares 3.1 names with
    # another ten-team list by chance.
    scorers = {f["team"] for f in fantasy}

    def hit_rate(label, teams, block):
        hits = sorted(t for t in teams if t in scorers)
        size = len(teams)
        expected = round(size * len(scorers) / LEAGUE, 1)
        rate = len(hits) / size if size else 0
        tier = (
            "strong" if rate >= 0.70
            else "moderate" if rate >= 0.55
            else "weak" if rate >= 0.40
            else "none"
        )
        return {
            "label": label,
            "block": block,
            "hits": len(hits),
            "size": size,
            "expected": expected,
            "rate": round(rate, 3),
            "tier": tier,
            "teams": hits,
        }

    measures = []
    for col in leaders:
        names = {t["name"] for e in col["entries"] for t in e["teams"]}
        measures.append(hit_rate(col["label"], names, "leaderboard"))
    for col in box:
        names = {t["name"] for e in col["entries"] for t in e["teams"]}
        measures.append(hit_rate(col["label"], names, "box"))
    for col in coverage:
        order = [e["teams"][0]["name"] for e in col["entries"]]
        direction = COVERAGE_DIRECTION.get(col["label"], "best-first")
        good = order[-10:] if direction == "worst-first" else order[:10]
        m = hit_rate(col["label"], set(good), "coverage")
        m["direction"] = direction
        measures.append(m)
    measures.sort(key=lambda m: (-m["rate"], m["label"]))

    # ---- how much of each top-ten finish the advanced columns support ----
    support = []
    for f in fantasy:
        appears = [
            c["label"]
            for c in leaders
            if any(t["name"] == f["team"] for e in c["entries"] for t in e["teams"])
        ]
        support.append({**f, "appears": appears, "of": len(leaders)})

    # ---- the best underlying play outside the scoring top ten ----
    #
    # Found rather than named: score every club on leaderboard appearances, then
    # take the best one that did not finish top ten. That is the positive
    # regression case, and it stays correct if next year's sheet moves.
    outside = {}
    for c in leaders:
        for e in c["entries"]:
            for t in e["teams"]:
                if t["name"] not in scorers:
                    outside.setdefault(t["name"], []).append(c["label"])
    spotlight = None
    if outside:
        name, appears = max(outside.items(), key=lambda kv: len(kv[1]))
        cov_rank = {}
        for col in coverage:
            order = [e["teams"][0]["name"] for e in col["entries"]]
            if name in order:
                i = order.index(name)
                direction = COVERAGE_DIRECTION.get(col["label"], "best-first")
                cov_rank[col["label"]] = len(order) - i if direction == "worst-first" else i + 1
        spotlight = {
            "team": name,
            "abbr": nicks.get(name),
            "appears": sorted(appears),
            "missing": sorted(c["label"] for c in leaders if c["label"] not in appears),
            "of": len(leaders),
            "coverage_ranks": cov_rank,
        }

    # ---- historical scoring, 2021-2024, with components ----
    #
    # This block does not come from the workbook — it was transcribed from
    # screenshots of a scoring table and lives in scripts/curated/data. It is
    # what makes the difference between asking "which measures describe a good
    # season" and "which of them carry into the next one".
    hist_path = Path(__file__).parent / "data" / "dst-history.json"
    history, hist_analysis = None, None
    if hist_path.exists():
        history = json.loads(hist_path.read_text())
        seasons = history["seasons"]
        rows = [r for yr in seasons.values() for r in yr]

        def corr(xs, ys):
            n = len(xs)
            mx, my = sum(xs) / n, sum(ys) / n
            num = sum((a - mx) * (b - my) for a, b in zip(xs, ys))
            dx = sum((a - mx) ** 2 for a in xs) ** 0.5
            dy = sum((b - my) ** 2 for b in ys) ** 0.5
            return round(num / (dx * dy), 3) if dx and dy else 0.0

        # What produces points in the season it happens. Per game throughout, so
        # the one 16-game season does not distort it.
        ppg = [r["ppg"] for r in rows]
        drivers = []
        for key, label in [
            ("int", "Interceptions"), ("def_td", "Defensive TDs"),
            ("sck", "Sacks"), ("qb_hits", "QB hits"), ("fr", "Fumble recoveries"),
            ("loss", "Tackles for loss"), ("ret_td", "Return TDs"),
            ("sfty", "Safeties"), ("opp_pts", "Opponent points allowed"),
        ]:
            r = corr([x[key] / x["gp"] for x in rows], ppg)
            drivers.append({"label": label, "r": r, "r2": round(r * r, 3)})
        drivers.sort(key=lambda d: -abs(d["r"]))

        # Whether any of it carries. Same club in consecutive top tens.
        surname = lambda n: n.split()[-1]  # noqa: E731
        by_year = {y: {surname(r["team"]): r for r in yr} for y, yr in seasons.items()}
        by_year["2025"] = {f["team"]: {"ppg": f["ppg"]} for f in fantasy}
        order = sorted(by_year)
        repeats = []
        for a, b in zip(order, order[1:]):
            kept = sorted(set(by_year[a]) & set(by_year[b]))
            repeats.append({"from": a, "to": b, "kept": len(kept), "teams": kept})

        pairs = []
        stat_years = sorted(seasons)
        for a, b in zip(stat_years, stat_years[1:]):
            for t in set(by_year[a]) & set(by_year[b]):
                if "sck" in by_year[a][t] and "sck" in by_year[b][t]:
                    pairs.append((by_year[a][t], by_year[b][t]))
        persistence = []
        if len(pairs) >= 4:
            for key, label in [
                ("int", "Interceptions"), ("sck", "Sacks"), ("qb_hits", "QB hits"),
                ("fr", "Fumble recoveries"), ("loss", "Tackles for loss"),
            ]:
                persistence.append({
                    "label": label,
                    "r": corr([a[key] / a["gp"] for a, _ in pairs],
                              [b[key] / b["gp"] for _, b in pairs]),
                })
            persistence.append({
                "label": "Fantasy points per game",
                "r": corr([a["ppg"] for a, _ in pairs], [b["ppg"] for _, b in pairs]),
            })
            persistence.sort(key=lambda d: -d["r"])

        appearances = {}
        for y in by_year:
            for t in by_year[y]:
                appearances[t] = appearances.get(t, 0) + 1

        hist_analysis = {
            "seasons": sorted(seasons),
            "n": len(rows),
            "drivers": drivers,
            "repeats": repeats,
            "repeat_mean": round(sum(r["kept"] for r in repeats) / len(repeats), 2),
            "repeat_null": round(10 * 10 / LEAGUE, 1),
            "persistence": persistence,
            "persistence_n": len(pairs),
            "appearances": dict(sorted(appearances.items(), key=lambda kv: -kv[1])),
        }

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
            "seasons_scoring": seasons_scoring,
            "success": success,
            "dvoa": dvoa,
            "coordinators": coordinators,
            "inherited": inherited,
            "dc_note": dc_note,
            "dc_outlook": dc_outlook,
            "spread": spread,
            "leaders": leaders,
            "leaders_source": at(102, "C"),
            "pass_rush": {"simulated": simulated, "box": box},
            "coverage": coverage,
            "offseason": offseason,
            "verdict": verdict,
            "strong_schedules": strong,
            "schedules": schedules,
            "history": history["seasons"] if history else None,
            "history_note": history["note"] if history else None,
            "history_analysis": hist_analysis,
            "analysis": {
                "scorers": len(scorers),
                "league": LEAGUE,
                "measures": measures,
                "support": support,
                "spotlight": spotlight,
            },
        },
    }

    dest = ROOT / "src" / "data" / "defense-charts.json"
    dest.write_text(json.dumps(out, indent=1) + "\n")

    print("seasons      " + ", ".join(
        f"{y} x{len(v)}" for y, v in sorted(seasons_scoring.items(), reverse=True)))
    print(f"success rate {len(success)} seasons | DVOA {len(dvoa)} seasons")
    for wrong, right in NAME_CORRECTIONS.items():
        if wrong not in _name_corrections_used:
            print(f"  name correction now matches the workbook, delete it: "
                  f"{wrong!r} -> {right!r}")
    print(f"coordinators {len(coordinators)} hires, "
          + ", ".join(f"{b['label']} {len(b['entries'])}" for b in inherited)
          + f" | outlook {len(dc_outlook['improve'])} up / {len(dc_outlook['regress'])} down")
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
    print("measures     " + ", ".join(
        f"{m['label'][:22]} {m['hits']}/{m['size']}" for m in measures[:4]) + " ...")
    weakest = [m for m in measures if m["tier"] == "none"]
    print(f"  {len(weakest)} of {len(measures)} at or below chance: "
          + ", ".join(m["label"] for m in weakest))
    no_support = [s2["team"] for s2 in support if not s2["appears"]]
    print(f"  top-ten finishes with no leaderboard support: {', '.join(no_support) or 'none'}")
    if spotlight:
        print(f"  best play outside the top ten: {spotlight['team']} "
              f"({len(spotlight['appears'])}/{spotlight['of']} leaderboards)")
    if hist_analysis:
        h = hist_analysis
        print(f"history      {h['n']} team-seasons, {h['seasons'][0]}-{h['seasons'][-1]}")
        print("  drives ppg  " + ", ".join(
            f"{d['label']} {d['r']:+.2f}" for d in h["drivers"][:4]))
        print("  persists    " + ", ".join(
            f"{d['label']} {d['r']:+.2f}" for d in h["persistence"]))
        print(f"  top-10 repeat {h['repeat_mean']}/10 against a null of {h['repeat_null']}")
    print(f"wrote {dest.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
