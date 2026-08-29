#!/usr/bin/env python3
"""Run-defence matchup tables for the running back page.

    python3 scripts/curated/rb_matchups.py     # -> src/data/rb-matchups.json

Reads `scripts/curated/data/rb-matchups.json`, the hand transcription of two
workbook blocks the operator screenshotted on 2026-08-28: rushing yards per game
allowed, and opponent rushing play rate, each as a top ten and a bottom ten for
2021-2025.

## Why this is not part of rb_charts.py

That script still names the `(2)` workbook in `DEFAULT_WB` while everything else
targets `(4)` (docs/STATE.md, open item 10). Re-running it would regenerate every
RB chart from a two-versions-old sheet, which is a much larger blast radius than
this addition deserves. These two blocks are also not in the workbook at all —
they arrived as images, the same way `data/dst-history.json` did.

## What it validates before writing anything

A hand transcription of ten names times twenty lists is exactly where a silent
error lives, so nothing is emitted unless all of this holds:

  * every list has exactly ten entries;
  * no team appears in both the top and the bottom list of the same season —
    the error already found in the kicker field-goal columns, where four clubs
    were in the top 16 and bottom 5 of one year and could not be both;
  * every name resolves to one of the 32 clubs.

## What it computes, and why here rather than in a component

§11: the page draws, the extractor works things out. Three things are derived:

  * **Persistence.** Of the teams in a list one season, how many are in the same
    list the next? Against a chance baseline of 10/32, this is the number that
    says whether last year's soft run defence tells you anything about this one.
  * **Appearances.** How many of the five seasons each club spent in each list,
    which is what "consistently soft" actually means.
  * **The overlap.** Teams in the bottom ten of *both* blocks in the same
    season: they allow the most rushing yards and get run at the most. That
    intersection is the point of putting the two tables next to each other, and
    it is the only thing here that is more than a restatement of one column.
"""
from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = Path(__file__).resolve().parent / "data" / "rb-matchups.json"
OUT = ROOT / "src" / "data" / "rb-matchups.json"
TEAMS_JSON = ROOT / "src" / "data" / "teams.json"

# The operator's shorthand -> the nickname `teams.json` keys on. Only the names
# that differ need an entry; everything else matches already.
ALIASES = {
    "Jags": "Jaguars",
    "Bucs": "Buccaneers",
    "49ers": "49ers",
    "Commanders": "Commanders",
}


def load_teams() -> dict[str, dict]:
    raw = json.loads(TEAMS_JSON.read_text())
    data = raw["data"] if isinstance(raw, dict) and "data" in raw else raw
    return {t["nickname"]: t for t in data}


def resolve(name: str, teams: dict[str, dict]) -> dict:
    nickname = ALIASES.get(name, name)
    if nickname not in teams:
        raise SystemExit(
            f"unresolved team name {name!r} (tried {nickname!r}). "
            f"Add it to ALIASES or fix the transcription."
        )
    return teams[nickname]


def validate(blocks: dict, teams: dict[str, dict]) -> None:
    problems: list[str] = []
    for bkey, block in blocks.items():
        for season, lists in block["seasons"].items():
            for side in ("least", "most"):
                names = lists[side]
                if len(names) != 10:
                    problems.append(f"{bkey} {season} {side}: {len(names)} entries, expected 10")
                if len(set(names)) != len(names):
                    dupes = [n for n, c in Counter(names).items() if c > 1]
                    problems.append(f"{bkey} {season} {side}: duplicated {dupes}")
                for n in names:
                    resolve(n, teams)
            # The kicker-columns error: a club cannot be in both lists of one year.
            both = set(lists["least"]) & set(lists["most"])
            if both:
                problems.append(
                    f"{bkey} {season}: {sorted(both)} appear in BOTH the top and bottom ten"
                )
    if problems:
        print("transcription does not reconcile:", file=sys.stderr)
        for p in problems:
            print(f"  - {p}", file=sys.stderr)
        raise SystemExit(1)


def persistence(block: dict) -> dict:
    """Carry-over from one season to the next, against a 10-of-32 chance rate."""
    years = sorted(block["seasons"], reverse=True)  # newest first
    out = {}
    for side in ("least", "most"):
        pairs, carried = 0, 0
        for newer, older in zip(years, years[1:]):
            a = set(block["seasons"][newer][side])
            b = set(block["seasons"][older][side])
            pairs += 1
            carried += len(a & b)
        out[side] = {
            "pairs": pairs,
            "retained": carried,
            "per_season": round(carried / pairs, 2) if pairs else None,
            "chance": round(10 * 10 / 32, 2),
        }
    return out


def appearances(block: dict, teams: dict[str, dict]) -> dict:
    out = {}
    for side in ("least", "most"):
        c: Counter[str] = Counter()
        for lists in block["seasons"].values():
            for n in lists[side]:
                c[resolve(n, teams)["abbr"]] += 1
        out[side] = [
            {"abbr": a, "seasons": n}
            for a, n in sorted(c.items(), key=lambda kv: (-kv[1], kv[0]))
        ]
    return out


def main() -> int:
    raw = json.loads(SRC.read_text())
    blocks = raw["blocks"]
    teams = load_teams()
    validate(blocks, teams)

    yards = blocks["rush_yards_allowed"]
    rate = blocks["opponent_rush_play_rate"]
    years = sorted(yards["seasons"], reverse=True)

    # The intersection: most yards allowed AND run at most, same season.
    overlap = []
    for y in years:
        both = sorted(
            set(yards["seasons"][y]["most"]) & set(rate["seasons"][y]["most"])
        )
        overlap.append({
            "season": int(y),
            "teams": [
                {"abbr": resolve(n, teams)["abbr"], "nickname": resolve(n, teams)["nickname"]}
                for n in both
            ],
        })

    def table(block):
        return {
            "title": block["title"],
            "operator_note": block["operator_note"],
            "least_label": block["least_label"],
            "most_label": block["most_label"],
            "seasons": [
                {
                    "season": int(y),
                    "least": [resolve(n, teams)["abbr"] for n in block["seasons"][y]["least"]],
                    "most": [resolve(n, teams)["abbr"] for n in block["seasons"][y]["most"]],
                }
                for y in years
            ],
            "persistence": persistence(block),
            "appearances": appearances(block, teams),
        }

    payload = {
        "schema_version": 1,
        "updated": raw["transcribed"],
        "source": raw["source"],
        "note": raw["note"],
        "seasons": [int(y) for y in years],
        "yards_allowed": table(yards),
        "rush_rate": table(rate),
        "overlap": overlap,
        "overlap_per_season": round(
            sum(len(o["teams"]) for o in overlap) / len(overlap), 1
        ),
    }

    OUT.write_text(json.dumps(payload, indent=1) + "\n")
    print(f"wrote {OUT.relative_to(ROOT)}")
    print(f"  {len(years)} seasons, 2 blocks, all lists 10 long, every name resolved")
    for key, label in (("yards_allowed", "yards allowed"), ("rush_rate", "rush rate")):
        p = payload[key]["persistence"]["most"]
        print(f"  {label}: {p['per_season']} of 10 bottom-ten teams repeat "
              f"year to year (chance {p['chance']})")
    print(f"  in both bottom tens: {payload['overlap_per_season']} teams per season")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
