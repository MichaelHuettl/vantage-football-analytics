#!/usr/bin/env python3
"""What Green Bay's offense did, across the one published film breakdown.

    python3 scripts/curated/film_summary.py   # -> src/data/film-summary-gb-det-2025-w1.json

Reads `src/data/film-gb-det-2025-w1.json` — the 47 charted plays of Lions at
Packers, Week 1 2025, transcribed from the operator's own deck — and works out
what the offense ran. §11: the extractor computes, the component draws.

## The deck charts the defense, so this reads the offense out of two fields

Every slide carries a pre-snap picture and a post-snap coverage, and **no slide
records offensive personnel or formation**. So there is no formation or
personnel rate here and none is claimed. What the offense did is recovered from
`outcome` (the call and what it gained) and `downDistance` (the situation it was
called in), which between them support a real read: the run-pass balance, how
that balance moved with the game, what the passing game's shape was, and whether
the running game was earning the carries it got.

The coverage block is kept as context for the offense rather than as a study of
Detroit: it is what the quarterback was throwing against.

## The judgement calls, each of which moves a percentage by two points

Forty-seven plays is small enough that every classification decision is visible
in the output, so each is a named constant rather than an inline test.

  * `SCRAMBLE_IS_A_DROPBACK` — play 39's "3 yard QB scramble" is a called pass
    that broke down. Official stats score a scramble as a rush; film study cares
    what was called, so it is a dropback here, and it is excluded from pass
    *attempts* because no ball was thrown. The panel prints the count so a
    reader can put it back the other way.
  * `STUFFED_AT` — a carry gaining zero or less. Six of twenty-three, which is
    the number that decides whether the second-half run commitment was working.
  * `MOTION_PLAYS` — the 47 plates read one by one for the grey motion line,
    since no field in the JSON records motion. `MOTION_DRAWN_RED` holds the one
    play whose motion is drawn red because that player carried the ball, which
    is the known and stated undercount in the grey-line method.
  * `MAN_BY_DEFINITION` / `ZONE_BY_DEFINITION` — Cover 0 and Cover 1 have no
    deep zone structure and Cover 3 has three deep zone defenders, so the deck
    omitting the word is shorthand. **Cover 2 is in neither list**: it is
    genuinely played both ways and the deck says which on all but one snap.

## What is deliberately not computed

**Field position and drive stats.** The parenthetical in `downDistance` is a
yard line, but it reconciles against the previous snap's gain on only 30 of 41
checks. The script measures that and prints it; it is a hand-typed field in a
teaching deck, not a play-by-play export.

**Whether this is every offensive snap.** It is not. The quarter counts are
printed and they are lopsided, so the summary says "charted" throughout.
"""
from __future__ import annotations

import json
import re
import sys
from collections import Counter
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src" / "data" / "film-gb-det-2025-w1.json"
OUT = ROOT / "src" / "data" / "film-summary-gb-det-2025-w1.json"

# A scramble is a called pass that broke down: a dropback, but not an attempt.
SCRAMBLE_IS_A_DROPBACK = True

# A carry gaining nothing or losing ground.
STUFFED_AT = 0

EXPLOSIVE = 15  # yards, the conventional cut for an explosive play
SHORT_PASS = 5  # a completion under this is the short game

# Coverages whose man/zone character is fixed by the structure. Cover 2 is
# absent on purpose: it is played both ways and the deck names which.
MAN_BY_DEFINITION = {0, 1}
ZONE_BY_DEFINITION = {3}

ORDINAL = {"1st": 1, "2nd": 2, "3rd": 3, "4th": 4}
DOWN_LABEL = {1: "1st down", 2: "2nd down", 3: "3rd down", 4: "4th down"}

# Pre-snap motion, read off the plates rather than the text.
#
# The deck draws motion as a **grey line with a wavy coil in it**, the standard
# chalkboard notation, and it is the only grey mark on the field: routes and
# blocks are orange, the ball carrier's path is red, and the field's own lines
# are straight and span the full width. No field in the JSON records motion, so
# the only way to get this number was to look at all 47 plates and judge each
# one. This list is that hand transcription, the same way `rb_matchups.py`
# carries a transcription from screenshots.
#
# **Play 10 is the known miss and is deliberately not in the list.** It is a jet
# touch pass, so it has motion by definition, but the motioning player carried
# the ball and his path is therefore drawn in red rather than grey. Counting
# grey lines undercounts by exactly this play. It is reported separately rather
# than folded in, because the operator asked for the grey line and the grey line
# is what this counts.
MOTION_PLAYS = [
    1, 2, 3, 5, 6, 11, 12, 16, 17, 23,
    29, 30, 32, 33, 36, 37, 38, 39, 44, 45,
]

# Motion that is present but not drawn grey, for the reason above.
MOTION_DRAWN_RED = [10]


def coverage(s: str | None) -> tuple[int | None, str | None]:
    """(shell number, 'man'|'zone') from a coverage string."""
    if not s:
        return (None, None)
    t = s.lower()
    n = None
    m = re.search(r"cover\s*(\d)", t)
    if m:
        n = int(m.group(1))
    else:
        # "2 High Shell Man" / "4-3 1 High Man". The lookbehind keeps the 4-3
        # front from being read as a shell number.
        h = re.search(r"(?<!-)\b(\d)\s*high\b", t)
        if h:
            n = int(h.group(1))
    mz = None
    if "zone" in t:
        mz = "zone"
    if "man" in t:
        mz = "man"
    if mz is None and n in MAN_BY_DEFINITION:
        mz = "man"
    if mz is None and n in ZONE_BY_DEFINITION:
        mz = "zone"
    return (n, mz)


def play_type(outcome: str | None) -> str | None:
    if not outcome:
        return None
    t = outcome.lower()
    if "scramble" in t:
        return "pass" if SCRAMBLE_IS_A_DROPBACK else "rush"
    if any(w in t for w in ("completion", "incomplete", "pass", "int")):
        return "pass"
    if any(w in t for w in ("rush", "sneak", "run")):
        return "rush"
    return None


def yards(outcome: str | None) -> int | None:
    if not outcome:
        return None
    t = outcome.lower().strip()
    if t.startswith(("incomplete", "incompletion")):
        return 0
    # Anchored so "0 yard rush (DET Penalty 15 yd)" reads 0, not 15.
    m = re.match(r"(-?\d+)\s*(?:yard|yd)", t)
    return int(m.group(1)) if m else None


def down_distance(s: str | None) -> tuple[int | None, int | None, int | None]:
    if not s:
        return (None, None, None)
    t = s.lower()
    d = None
    m = re.match(r"\s*(1st|2nd|3rd|4th)", t)
    if m:
        d = ORDINAL[m.group(1)]
    dist = None
    g = re.search(r"and\s+(\d+)", t)
    if g:
        dist = int(g.group(1))
    spot = None
    p = re.search(r"\((\d+)\)", t)
    if p:
        spot = int(p.group(1))
    if dist is None and "and goal" in t and spot is not None:
        dist = spot
    return (d, dist, spot)


def quarter(s: str | None) -> int | None:
    if not s:
        return None
    m = re.match(r"\s*q(\d)", s.lower())
    return int(m.group(1)) if m else None


def pct(n: int, d: int) -> float:
    return round(100.0 * n / d, 1) if d else 0.0


def main() -> int:
    raw = json.loads(SRC.read_text())
    warn: list[str] = []

    rows = []
    for p in raw["plays"]:
        d, dist, spot = down_distance(p["downDistance"])
        o = p["outcome"] or ""
        rows.append({
            "n": p["n"],
            "q": quarter(p["time"]),
            "down": d, "dist": dist, "spot": spot,
            "type": play_type(o), "yards": yards(o),
            "outcome": o,
            "post_n": coverage(p["defense"])[0],
            "post_mz": coverage(p["defense"])[1],
            "robber": "robber" in (p["defense"] or "").lower(),
            "scramble": "scramble" in o.lower(),
            "td": " td" in o.lower() or "td " in o.lower(),
        })

    # ---- validation, before anything is emitted -------------------------
    for r in rows:
        if r["type"] is None:
            warn.append(f"play {r['n']}: outcome does not classify as run or pass")
        if r["yards"] is None:
            warn.append(f"play {r['n']}: no yardage could be read from the outcome")
        if r["down"] is None:
            warn.append(f"play {r['n']}: no down could be read")
        if r["post_n"] is None:
            warn.append(f"play {r['n']}: defense field names no coverage shell")

    # Does the yard line reconcile with the previous play's gain? This is the
    # test that decides whether field position is usable at all.
    checks = agree = 0
    for a, b in zip(rows, rows[1:]):
        if None in (a["spot"], b["spot"], a["yards"]) or a["q"] != b["q"]:
            continue
        checks += 1
        if (abs(a["spot"] + a["yards"] - b["spot"]) <= 1
                or abs(a["spot"] - a["yards"] - b["spot"]) <= 1):
            agree += 1

    typed = [r for r in rows if r["type"]]
    rush = [r for r in typed if r["type"] == "rush"]
    dropbacks = [r for r in typed if r["type"] == "pass"]
    total_yards = sum(r["yards"] for r in rows if r["yards"] is not None)

    def split(rs, of):
        ys = [r["yards"] for r in rs if r["yards"] is not None]
        return {
            "plays": len(rs),
            "pct": pct(len(rs), of),
            "yards": sum(ys),
            "perPlay": round(sum(ys) / len(ys), 1) if ys else 0.0,
            "yardShare": pct(sum(ys), total_yards),
        }

    # ---- how the call sheet moved with the game -------------------------
    halves = []
    for label, qs in (("First half", (1, 2)), ("Second half", (3, 4))):
        g = [r for r in rows if r["q"] in qs and r["type"]]
        r_ = [x for x in g if x["type"] == "rush"]
        halves.append({
            "label": label,
            "plays": len(g),
            "rush": len(r_),
            "rushPct": pct(len(r_), len(g)),
            "pass": len(g) - len(r_),
            "passPct": pct(len(g) - len(r_), len(g)),
            "yards": sum(x["yards"] for x in g if x["yards"] is not None),
        })

    by_down = []
    for dn in (1, 2, 3, 4):
        g = [r for r in rows if r["down"] == dn and r["type"]]
        if not g:
            continue
        r_ = [x for x in g if x["type"] == "rush"]
        by_down.append({
            "down": dn,
            "label": DOWN_LABEL[dn],
            "plays": len(g),
            "rush": len(r_),
            "rushPct": pct(len(r_), len(g)),
            "pass": len(g) - len(r_),
            "passPct": pct(len(g) - len(r_), len(g)),
        })

    # ---- the passing game ------------------------------------------------
    scrambles = [r for r in dropbacks if r["scramble"]]
    attempts = [r for r in dropbacks if not r["scramble"]]
    incomplete = [r for r in attempts if "incomple" in r["outcome"].lower()]
    completions = [r for r in attempts if r not in incomplete]
    comp_yards = [r["yards"] for r in completions]

    passing = {
        "dropbacks": len(dropbacks),
        "attempts": len(attempts),
        "completions": len(completions),
        "incompletions": len(incomplete),
        "completionPct": pct(len(completions), len(attempts)),
        "yards": sum(r["yards"] for r in dropbacks),
        "perAttempt": round(sum(r["yards"] for r in attempts) / len(attempts), 1),
        "perCompletion": round(sum(comp_yards) / len(completions), 1),
        "longest": max(comp_yards),
        "scrambles": len(scrambles),
        "short": sum(1 for y in comp_yards if y < SHORT_PASS),
        "shortThreshold": SHORT_PASS,
        "explosive": sum(1 for y in comp_yards if y >= EXPLOSIVE),
    }

    # ---- the running game ------------------------------------------------
    carry_yards = [r["yards"] for r in rush]
    stuffed = [y for y in carry_yards if y <= STUFFED_AT]
    rushing = {
        "carries": len(rush),
        "yards": sum(carry_yards),
        "perCarry": round(sum(carry_yards) / len(rush), 1),
        "longest": max(carry_yards),
        "stuffed": len(stuffed),
        "stuffedPct": pct(len(stuffed), len(rush)),
        "explosive": sum(1 for y in carry_yards if y >= EXPLOSIVE),
    }

    # ---- pre-snap motion --------------------------------------------------
    for n in MOTION_PLAYS + MOTION_DRAWN_RED:
        if not any(r["n"] == n for r in rows):
            warn.append(f"motion list names play {n}, which is not in the deck")
    motion_set = set(MOTION_PLAYS)
    for r in rows:
        r["motion"] = r["n"] in motion_set
    with_m = [r for r in rows if r["motion"]]
    without_m = [r for r in rows if not r["motion"]]

    def motion_rate(rs):
        m = [r for r in rs if r["motion"]]
        return {"plays": len(rs), "motion": len(m), "pct": pct(len(m), len(rs))}

    def per_play(rs):
        ys = [r["yards"] for r in rs if r["yards"] is not None]
        return round(sum(ys) / len(ys), 1) if ys else 0.0

    motion = {
        "plays": len(with_m),
        "of": len(rows),
        "pct": pct(len(with_m), len(rows)),
        "onRuns": motion_rate(rush),
        "onPasses": motion_rate(dropbacks),
        "byHalf": [
            {"label": lbl, **motion_rate([r for r in rows if r["q"] in qs])}
            for lbl, qs in (("First half", (1, 2)), ("Second half", (3, 4)))
        ],
        "yardsWith": per_play(with_m),
        "yardsWithout": per_play(without_m),
        "drawnRed": len(MOTION_DRAWN_RED),
        "playNumbers": MOTION_PLAYS,
    }

    cov_rows = [r for r in rows if r["post_n"] is not None]
    fam = Counter(f"Cover {r['post_n']}" for r in cov_rows)
    mz = Counter(r["post_mz"] for r in cov_rows if r["post_mz"])
    qcount = Counter(r["q"] for r in rows if r["q"])

    payload = {
        "schema_version": 2,
        "generated_at": date.today().isoformat(),
        "source": "src/data/film-gb-det-2025-w1.json",
        "charted": len(rows),
        "yards": {
            "total": total_yards,
            "perPlay": round(total_yards / len(rows), 1),
            "explosive": sum(1 for r in rows if r["yards"] and r["yards"] >= EXPLOSIVE),
            "explosiveThreshold": EXPLOSIVE,
            "touchdowns": sum(1 for r in rows if r["td"]),
        },
        "playType": {
            "rush": split(rush, len(typed)),
            "pass": split(dropbacks, len(typed)),
            "scrambleCountedAs": "pass",
        },
        "byHalf": halves,
        "byDown": by_down,
        "passing": passing,
        "rushing": rushing,
        "motion": motion,
        "coverage": {
            "charted": len(cov_rows),
            "unreadable": len(rows) - len(cov_rows),
            "families": [
                {"label": k, "plays": v, "pct": pct(v, len(cov_rows))}
                for k, v in sorted(fam.items(), key=lambda kv: (-kv[1], kv[0]))
            ],
            "man": {"plays": mz["man"], "pct": pct(mz["man"], sum(mz.values()))},
            "zone": {"plays": mz["zone"], "pct": pct(mz["zone"], sum(mz.values()))},
            "robber": sum(1 for r in rows if r["robber"]),
        },
        "quarters": [{"q": q, "plays": qcount[q]} for q in sorted(qcount)],
        "fieldPositionUsable": False,
        "reconciliation": {"checked": checks, "agreed": agree, "pct": pct(agree, checks)},
    }

    if warn:
        print("warnings:", file=sys.stderr)
        for w in warn:
            print(f"  ! {w}", file=sys.stderr)

    OUT.write_text(json.dumps(payload, indent=1) + "\n")
    print(f"wrote {OUT.relative_to(ROOT)}")
    print(f"  {len(rows)} charted plays, {total_yards} yards, "
          f"{payload['yards']['perPlay']}/play, {payload['yards']['touchdowns']} TD")
    print(f"  run {rushing['carries']} ({payload['playType']['rush']['pct']}%) for "
          f"{rushing['yards']} ({payload['playType']['rush']['yardShare']}% of yards), "
          f"{rushing['perCarry']}/carry, {rushing['stuffed']} stuffed")
    print(f"  pass {len(dropbacks)} ({payload['playType']['pass']['pct']}%) for "
          f"{passing['yards']} ({payload['playType']['pass']['yardShare']}% of yards), "
          f"{passing['completions']}/{passing['attempts']} ({passing['completionPct']}%), "
          f"{passing['perAttempt']}/attempt, long {passing['longest']}")
    print(f"    shape: {passing['short']} completions under {SHORT_PASS}, "
          f"{passing['explosive']} of {EXPLOSIVE}+, of {passing['completions']}")
    for h in halves:
        print(f"  {h['label']}: {h['plays']} plays, run {h['rush']} ({h['rushPct']}%), "
              f"{h['yards']} yards")
    print("  by down: " + ", ".join(
        f"{b['label']} run {b['rush']}/{b['plays']} ({b['rushPct']}%)" for b in by_down))
    print(f"  motion (grey line): {motion['plays']} of {motion['of']} ({motion['pct']}%)")
    print(f"    on runs {motion['onRuns']['motion']}/{motion['onRuns']['plays']} "
          f"({motion['onRuns']['pct']}%), on passes {motion['onPasses']['motion']}/"
          f"{motion['onPasses']['plays']} ({motion['onPasses']['pct']}%)")
    for h in motion["byHalf"]:
        print(f"    {h['label']}: {h['motion']}/{h['plays']} ({h['pct']}%)")
    print(f"    yards a play with {motion['yardsWith']}, without {motion['yardsWithout']}")
    print(f"    plus {motion['drawnRed']} play with motion drawn red (jet), not counted")
    print("  coverage faced: " + ", ".join(
        f"{f['label']} {f['plays']} ({f['pct']}%)" for f in payload["coverage"]["families"]))
    print(f"  quarters: {dict(sorted(qcount.items()))}")
    print(f"  yard-line reconciliation: {agree}/{checks} "
          f"({payload['reconciliation']['pct']}%) -> field position not used")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
