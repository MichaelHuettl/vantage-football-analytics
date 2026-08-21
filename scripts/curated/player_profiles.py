#!/usr/bin/env python3
"""
Build src/data/player-profiles.json from the NFL Verse Data export.

Written for the player pages, which have carried an empty chart slot since the
site was scaffolded. The brief was to profile each ranked player the way an
analyst would: what his role was, what he did with it, and how that has moved.

**Source is outside the repo**, in `~/Desktop/Claude Code/NFL Verse Data/`, and
covers 2022-2025. Nothing here is projected — every figure is something that
happened, which is the only kind of number this site publishes (§1).

Joining is the part that lies to you, and it did.

The season files carry **no player id at all** — only the play-by-play name
convention, `A.Brown`. A first pass keyed on that string and merged four
different players into A.J. Brown's page: Antonio Brown's Pittsburgh and Tampa
Bay years, Andre Brown's Giants years, and a 2003 Buffalo season belonging to
someone else entirely. Eleven of seventy-nine profiles were wrong the same way.

An abbreviated name is not an identifier and cannot be treated as one. So every
season is now **verified against a source that does carry an id**: Next Gen
Stats publishes `player_gsis_id`, season and team for 2016-2025, and a season
row is kept only when that player really was on that team that year. Anything
unverifiable is dropped, including legitimate seasons before 2016 — an
unprovable number is worth less than an absent one on a site whose argument is
that the reader can check the work.

Run: python3 scripts/curated/player_profiles.py
"""
import csv
import json
import re
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path

csv.field_size_limit(10**7)

ROOT = Path(__file__).resolve().parents[2]
SRC = Path.home() / "Desktop" / "Claude Code" / "NFL Verse Data "
if not SRC.exists():
    SRC = Path.home() / "Desktop" / "Claude Code" / "NFL Verse Data"

F_QB = SRC / "1999-2025 QB Data.csv"
F_SKILL = SRC / "1999-2025 RB:WR:TE.csv"
F_WEEKLY = SRC / "2025 Weekly Stats.csv"
F_NGS_REC = SRC / "2016-2025 Next Gen Stats Receiving.csv"
F_NGS_RUSH = SRC / "2016-2025 Next Gen Stats Rushing.csv"
F_NGS_PASS = SRC / "2016-2025 Next Gen Stats Passing.csv"
F_SNAPS = SRC / "2025 Snaps.csv"

SEASON = 2025
SUFFIXES = {"jr", "sr", "ii", "iii", "iv", "v"}

# The only abbreviation the two sources disagree on. Without this every Rams
# season fails verification and Stafford silently loses four years.
TEAM_ALIAS = {"LA": "LAR", "LAR": "LAR"}
team_key = lambda t: TEAM_ALIAS.get(str(t).strip(), str(t).strip())


def norm(name):
    n = unicodedata.normalize("NFD", str(name).lower())
    n = re.sub(r"[^a-z ]", "", n)
    return "".join(p for p in n.split() if p and p not in SUFFIXES)


def abbrev(full):
    """
    "Bo Nix" -> "B.Nix", the convention the season files use.

    Suffixes are dropped: the play-by-play name for Harold Fannin Jr is
    "H.Fannin", so carrying the "Jr" through produced a key that matched
    nothing and silently cost him a profile.
    """
    parts = [p for p in str(full).split() if p.strip(".").lower() not in SUFFIXES]
    return f"{parts[0][0]}.{' '.join(parts[1:])}" if len(parts) >= 2 else str(full)


def num(v):
    try:
        f = float(v)
        return None if f != f else f
    except (TypeError, ValueError):
        return None


def rows(path, **where):
    if not path.exists():
        return []
    out = []
    for r in csv.DictReader(open(path, encoding="utf8", errors="replace")):
        if all(str(r.get(k)) == str(v) for k, v in where.items()):
            out.append(r)
    return out


# Which figures matter for whom, and how to say them in English. The site does
# not print a raw column name at a reader (§8).
QB_FIELDS = [
    ("dropbacks", "Dropbacks", 0), ("attempts", "Attempts", 0),
    ("pass_yards", "Passing yards", 0), ("pass_td", "Passing TDs", 0),
    ("interceptions", "Interceptions", 0), ("epa_per_db", "EPA per dropback", 3),
    ("cpoe", "CPOE", 1), ("success_rate", "Success rate", 3),
    ("adot", "Average depth of target", 1), ("ypa", "Yards per attempt", 1),
    ("scrambles", "Scrambles", 0), ("designed_carries", "Designed carries", 0),
    ("rush_yards", "Rushing yards", 0), ("rush_td", "Rushing TDs", 0),
    ("rz_pass_td", "Red-zone passing TDs", 0),
    ("team_neutral_proe", "Team neutral pass rate over expected", 1),
]
SKILL_FIELDS = [
    ("targets", "Targets", 0), ("receptions", "Receptions", 0),
    ("rec_yards", "Receiving yards", 0), ("rec_td", "Receiving TDs", 0),
    ("target_share", "Target share", 3), ("air_yards_share", "Air yards share", 3),
    ("wopr", "Weighted opportunity rating", 3), ("adot", "Average depth of target", 1),
    ("racr", "RACR", 2), ("catch_rate", "Catch rate", 3),
    ("yac", "Yards after catch", 0), ("rec_epa", "Receiving EPA", 1),
    ("rz_targets", "Red-zone targets", 0), ("endzone_targets", "End-zone targets", 0),
    ("carries", "Carries", 0), ("rush_yards", "Rushing yards", 0),
    ("rush_td", "Rushing TDs", 0), ("ypc", "Yards per carry", 1),
    ("carry_share", "Carry share", 3), ("opportunity_share", "Opportunity share", 3),
    ("hvt", "High-value touches", 0), ("touches", "Touches", 0),
    ("i5_carries", "Inside-5 carries", 0),
]


def build():
    players = json.loads((ROOT / "src/data/players.json").read_text())["data"]
    skill = [p for p in players if p["position"] in ("QB", "RB", "WR", "TE")]
    print(f"  {len(skill)} ranked skill players to profile")

    # gsis id + headshot, keyed on name+position from the weekly file. The teams
    # a player actually appeared for in 2025 are collected here too: the weekly
    # file is id-backed, so it is the authority that catches a season row
    # belonging to a different player with the same abbreviation.
    ident, weekly = {}, defaultdict(list)
    teams_2025 = defaultdict(set)
    for r in rows(F_WEEKLY):
        key = (norm(r["player_display_name"]), r["position"])
        ident.setdefault(key, {"gsis": r["player_id"], "headshot": r.get("headshot_url") or None})
        weekly[key].append(r)
        teams_2025[r["player_id"]].add(team_key(r["team"]))

    # Season files, keyed on the abbreviated convention — as a LIST per season,
    # not a single row.
    #
    # Two different players share an abbreviation *within the same season* more
    # often than you would guess: B.Robinson is Bijan at Atlanta and Brian at
    # Washington, both 2023, 2024 and 2025. Storing one row per season quietly
    # kept whichever was read last and threw the other away, so the fix is not
    # only to verify identity but to stop discarding the right row before
    # identity is ever checked.
    qb_seasons = defaultdict(lambda: defaultdict(list))
    skill_seasons = defaultdict(lambda: defaultdict(list))
    for r in rows(F_QB):
        qb_seasons[r["qb"]][int(r["season"])].append(r)
    for r in rows(F_SKILL):
        skill_seasons[r["player"]][int(r["season"])].append(r)

    # next gen serves two purposes: the tracking figures for 2025, and — more
    # importantly — the identity evidence that makes the season history safe.
    ngs = defaultdict(dict)
    verified = set()          # (gsis, season, team) that genuinely happened
    for path, tag in ((F_NGS_REC, "rec"), (F_NGS_RUSH, "rush"), (F_NGS_PASS, "pass")):
        for r in rows(path):
            gid = r.get("player_gsis_id")
            if not gid:
                continue
            verified.add((gid, str(r["season"]), team_key(r["team_abbr"])))
            if r.get("week") == "0" and str(r.get("season")) == str(SEASON):
                ngs[gid][tag] = r
    print(f"  identity evidence: {len(verified):,} verified player-seasons from Next Gen")

    snaps = defaultdict(list)
    for r in rows(F_SNAPS):
        snaps[norm(r["player"])].append(r)

    warnings, profiles, dropped_total = [], {}, [0]
    for p in skill:
        key = (norm(p["name"]), p["position"])
        idm = ident.get(key)
        if not idm:
            warnings.append(f"{p['name']} ({p['position']}): no 2025 weekly stats — no profile")
            continue

        table = qb_seasons if p["position"] == "QB" else skill_seasons
        fields = QB_FIELDS if p["position"] == "QB" else SKILL_FIELDS
        ab = abbrev(p["name"])
        by_season = table.get(ab, {})
        if not by_season:
            warnings.append(f"{p['name']}: no season row under {ab!r}")

        # Keep a season only where this player can be shown to have been on
        # that team that year. 2025 is exempt because the weekly file already
        # tied him to it by id.
        # For each season take the candidate row whose team this player can be
        # shown to have played for. 2025 is checked against the weekly file,
        # which is id-backed; earlier years against Next Gen. Where no candidate
        # can be tied to him the season is dropped rather than guessed at.
        seasons, rejected, traded = [], 0, 0
        for yr in sorted(by_season):
            candidates = by_season[yr]
            if yr == SEASON:
                allowed = teams_2025.get(idm["gsis"], set())
                match = [r for r in candidates if team_key(r.get("posteam")) in allowed]
            else:
                match = [r for r in candidates
                         if (idm["gsis"], str(yr), team_key(r.get("posteam"))) in verified]
            if not match:
                rejected += 1
                continue
            # More than one verified row for a season is a mid-season trade,
            # not a collision — McCaffrey played six games for Carolina and
            # eleven for San Francisco in 2022, and both are his. Keep each,
            # ordered by workload so the fuller stint reads first.
            if len(match) > 1:
                traded += 1
            for row in sorted(match, key=lambda r: -(num(r.get("games")) or 0)):
                seasons.append({
                    "season": yr,
                    "team": row.get("posteam"),
                    "games": num(row.get("games")),
                    "traded_season": len(match) > 1,
                    "stats": {k: num(row.get(k)) for k, _, _ in fields
                              if num(row.get(k)) is not None},
                })
        if traded:
            print(f"  note  {p['name']}: {traded} season(s) split across two teams — both kept")
        if rejected:
            dropped_total[0] += rejected
            if rejected >= 4:
                warnings.append(
                    f"{p['name']}: dropped {rejected} unverifiable season(s) under {ab!r} "
                    f"— that abbreviation is shared with other players"
                )

        # per-week log, for the game-by-game view
        log = []
        for r in sorted(weekly[key], key=lambda x: int(x["week"])):
            if r.get("season_type") != "REG":
                continue
            log.append({
                "week": int(r["week"]),
                "opponent": r.get("opponent_team"),
                "fantasy_ppr": num(r.get("fantasy_points_ppr")),
                "targets": num(r.get("targets")),
                "receptions": num(r.get("receptions")),
                "rec_yards": num(r.get("receiving_yards")),
                "carries": num(r.get("carries")),
                "rush_yards": num(r.get("rushing_yards")),
                "pass_yards": num(r.get("passing_yards")),
                "pass_td": num(r.get("passing_tds")),
                "total_td": (num(r.get("receiving_tds")) or 0)
                            + (num(r.get("rushing_tds")) or 0)
                            + (num(r.get("passing_tds")) or 0),
            })

        n = ngs.get(idm["gsis"], {})
        nextgen = {}
        if "rec" in n:
            nextgen["receiving"] = {
                "Average separation": num(n["rec"].get("avg_separation")),
                "Average cushion": num(n["rec"].get("avg_cushion")),
                "YAC above expectation": num(n["rec"].get("avg_yac_above_expectation")),
                "Share of intended air yards": num(n["rec"].get("percent_share_of_intended_air_yards")),
            }
        if "rush" in n:
            nextgen["rushing"] = {
                "Rush yards over expected per carry": num(n["rush"].get("rush_yards_over_expected_per_att")),
                "Eight-plus defenders faced": num(n["rush"].get("percent_attempts_gte_eight_defenders")),
                "Time to line of scrimmage": num(n["rush"].get("avg_time_to_los")),
                "Efficiency": num(n["rush"].get("efficiency")),
            }
        if "pass" in n:
            nextgen["passing"] = {
                "Time to throw": num(n["pass"].get("avg_time_to_throw")),
                "Aggressiveness": num(n["pass"].get("aggressiveness")),
                "Completion percentage over expected": num(n["pass"].get("completion_percentage_above_expectation")),
                "Air yards to the sticks": num(n["pass"].get("avg_air_yards_to_sticks")),
            }
        nextgen = {k: {kk: vv for kk, vv in v.items() if vv is not None}
                   for k, v in nextgen.items()}
        nextgen = {k: v for k, v in nextgen.items() if v}

        snap = [s for s in snaps.get(norm(p["name"]), []) if s.get("season") == str(SEASON)]
        snap_pct = [num(s.get("offense_pct")) for s in snap]
        snap_pct = [x for x in snap_pct if x is not None]

        profiles[p["id"]] = {
            "player_id": p["id"],
            "name": p["name"],
            "position": p["position"],
            "gsis_id": idm["gsis"],
            "headshot_url": idm["headshot"],
            "labels": {k: lbl for k, lbl, _ in fields},
            "decimals": {k: d for k, _, d in fields},
            "seasons": seasons,
            "seasons_verified_from": 2016,
            "game_log": log,
            "next_gen": nextgen,
            "snap_share_2025": round(sum(snap_pct) / len(snap_pct), 3) if snap_pct else None,
        }

    out = {
        "schema_version": 1,
        "season": SEASON,
        "source": "NFL Verse Data export (nflverse), 2022-2025",
        "note": (
            "Per-player season and weekly figures for the ranked pool. Everything is "
            "recorded production, never a projection. Players joined on first initial, "
            "surname and position; anything ambiguous was dropped rather than guessed."
        ),
        "data": profiles,
    }
    dest = ROOT / "src/data/player-profiles.json"
    dest.write_text(json.dumps(out, indent=1) + "\n")

    print(f"  profiled {len(profiles)} players")
    print(f"  dropped {dropped_total[0]} unverifiable season rows (wrong player behind a shared abbreviation)")
    print(f"  with next-gen stats: {sum(1 for v in profiles.values() if v['next_gen'])}")
    print(f"  with a game log:     {sum(1 for v in profiles.values() if v['game_log'])}")
    print(f"  with 4 seasons:      {sum(1 for v in profiles.values() if len(v['seasons']) >= 4)}")
    print(f"  wrote {dest.relative_to(ROOT)}")
    for w in warnings:
        print(f"  WARN {w}")


if __name__ == "__main__":
    build()
