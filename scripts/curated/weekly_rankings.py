#!/usr/bin/env python3
"""Weekly rankings, from the workbook's Rankings sheet.

    python3 scripts/curated/weekly_rankings.py                  # -> src/data/rankings/week-N.json
    python3 scripts/curated/weekly_rankings.py --sync-players   # also adds new players + headshots

Reads the **Rankings** sheet of the Vantage workbook. The sheet holds a Draft
block and then one block per week, each a header row ("Week 1") over a
QB/RB/WR/TE/DEF/Kicker header and up to 25 ranked rows. Only the weeks named in
`PUBLISHED` are written, each to one file carrying all six positions and the
date the operator gave for it.

## Found by name, never by number

The sheet is located by its name and each week by its header text. The
workbook is versioned and **sheet numbers and row numbers both shift between
versions** (docs/STATE.md) — this one is the first to be called "Vantage"
rather than "Fantasy" Football Analytics — so a hard-coded `sheet4.xml` or
`rows 32-56` would silently read the wrong block on the next file.

## What it validates before writing anything

  * every name resolves to exactly one player in `src/data/players.json`, or,
    with `--sync-players`, to exactly one player on the current nflverse roster
    at the same position;
  * **no player appears twice in one list** — the check that caught the two
    duplicates in the Week 1 sheet, and one `validateContent` did not make
    until it was added alongside this script;
  * every entry in `CORRECTIONS` still finds the value it expects to replace,
    so a correction the workbook has since fixed fails loudly instead of
    overwriting the fix.

## --sync-players

Players new to the weekly lists are added to `players.json` append-only —
nothing already there is modified. Team and headshot come from the nflverse
roster release, which is openly licensed and published as CSV, so this stays
on the standard library.

Headshots are **NFL.com's**, from the Cloudinary URL nflverse carries for each
player, not ESPN's. ESPN's robots.txt names `anthropic-ai` with `Disallow: /`,
the same block recorded for ESPN in docs/STATE.md. The NFL.com image CDN
publishes no robots.txt. The resize is done by the CDN
(`f_png,fl_png32,c_fill,w_320,h_232`), which returns exactly the format of the
existing set — 320x232, 8-bit RGBA — at about 64 KB instead of a 3400px
original. `fl_png32` matters: without it the CDN sends 16 bits a channel at
157 KB, and with `q_auto` it quantises to a 256-colour palette, which bands on
skin.
"""
from __future__ import annotations

import csv
import io
import json
import re
import sys
import unicodedata
import urllib.request
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_WB = Path.home() / "Downloads" / "Vantage Weekly Rankings.xlsx"
PLAYERS = ROOT / "src" / "data" / "players.json"
TEAMS = ROOT / "src" / "data" / "teams.json"
OUT_DIR = ROOT / "src" / "data" / "rankings"
HEADSHOTS = ROOT / "public" / "img" / "headshots"

SHEET_NAME = "Rankings"
ROSTER_URL = "https://github.com/nflverse/nflverse-data/releases/download/rosters/roster_2026.csv"
UA = "VantageFootballAnalytics/1.0 (personal, non-commercial)"
N = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
R = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"

# Weeks to publish, and the date the operator gave for each. The workbook does
# not carry a date, so a week with rankings in it but no entry here is reported
# and left unpublished rather than stamped with a guess.
PUBLISHED = {
    1: "2026-09-08",
    2: "2026-09-16",
    3: "2026-09-24",
}

# The sheet's column header, in order, onto the site's positions.
COLUMNS = {"QB": "QB", "RB": "RB", "WR": "WR", "TE": "TE", "DEF": "DST", "Kicker": "K"}

# Editorial corrections to the sheet: (week, position, rank) -> (expected, replacement).
#
# The two Week 1 duplicates settled by the operator on 2026-09-19 (Bears at
# DST #17 -> Cowboys, Will Reichard at K #16 -> Ryan Fitzgerald) are gone from
# here because the 2026-09-24 export already carries both fixes at the source.
CORRECTIONS: dict[tuple[int, str, int], tuple[str, str]] = {}

# Names the sheet spells differently from the player. Only what `norm` cannot
# absorb needs an entry: case, punctuation, hyphen placement and generational
# suffixes are already ignored, which is what makes "Jaxon-Smith Njigba",
# "Ceedee Lamb" and "Travis Etienne Jr" resolve without one.
NAME_FIXES = {
    "Will Lutz": "Wil Lutz",  # one L; the sheet spells it like Will Reichard
}

# nflverse team codes that differ from teams.json.
TEAM_FIXES = {"LA": "LAR", "AZ": "ARI"}


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    s = re.sub(r"\b(jr|sr|ii|iii|iv|v)\b\.?", "", s)
    return re.sub(r"[^a-z]", "", s)


def slug(name: str) -> str:
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode().lower()
    s = re.sub(r"['.]", "", s)  # De'Von -> devon, St. -> st, as the existing ids do
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


# ------------------------------------------------------------------ workbook --

def read_sheet(path: Path, name: str) -> dict[tuple[int, str], str]:
    """Cells of the sheet called `name`, as {(row, col): text}."""
    with zipfile.ZipFile(path) as z:
        wb = ET.fromstring(z.read("xl/workbook.xml"))
        rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
        target = None
        for sh in wb.iter(N + "sheet"):
            if sh.get("name") == name:
                rid = sh.get(R + "id")
                for rel in rels:
                    if rel.get("Id") == rid:
                        target = rel.get("Target").lstrip("/").removeprefix("xl/")
        if target is None:
            # A dedicated single-tab export (unlike the full workbook, which
            # always carries a "Rankings" tab by that name) has nothing to
            # disambiguate — one sheet is unambiguous no matter its name.
            sheets = list(wb.iter(N + "sheet"))
            if len(sheets) == 1:
                print(f"  note: {path.name} has one sheet, {sheets[0].get('name')!r}, not {name!r} — using it")
                rid = sheets[0].get(R + "id")
                for rel in rels:
                    if rel.get("Id") == rid:
                        target = rel.get("Target").lstrip("/").removeprefix("xl/")
        if target is None:
            sys.exit(f"no sheet named {name!r} in {path.name}")
        shared = [
            "".join(t.text or "" for t in si.iter(N + "t"))
            for si in ET.fromstring(z.read("xl/sharedStrings.xml"))
        ]
        cells = {}
        for _, el in ET.iterparse(z.open(f"xl/{target}"), events=("end",)):
            if el.tag != N + "c":
                continue
            m = re.match(r"([A-Z]+)(\d+)", el.get("r") or "")
            if m:
                t, v = el.get("t"), el.find(N + "v")
                val = v.text if v is not None else None
                if t == "s" and val is not None:
                    val = shared[int(val)]
                elif t == "inlineStr":
                    val = "".join(x.text or "" for x in el.iter(N + "t"))
                if val not in (None, ""):
                    cells[(int(m.group(2)), m.group(1))] = val.strip()
            el.clear()
    return cells


def week_blocks(cells: dict) -> dict[int, dict[str, list[tuple[int, str]]]]:
    """{week: {position: [(rank, name), ...]}} for every week block with data."""
    heads = sorted(
        (r, int(m.group(1)))
        for (r, c), v in cells.items()
        if c == "B" and (m := re.fullmatch(r"Week\s+(\d+)", v))
    )
    blocks = {}
    for i, (row, wk) in enumerate(heads):
        end = heads[i + 1][0] if i + 1 < len(heads) else max(r for r, _ in cells) + 1
        header = row + 1
        cols = {c: COLUMNS[v] for (r, c), v in cells.items() if r == header and v in COLUMNS}
        if len(cols) != len(COLUMNS):
            sys.exit(f"Week {wk}: header row {header} does not carry all six positions")
        # Rank is the row's position within its own column, not a stored
        # number: the single-tab weekly export carries no rank column, and a
        # dense per-position list (no gaps) makes position equivalent to the
        # full workbook's explicit numbers anyway.
        lists = {pos: [] for pos in COLUMNS.values()}
        for c, pos in cols.items():
            rank = 0
            for r in range(header + 1, end):
                if (r, c) in cells:
                    rank += 1
                    lists[pos].append((rank, cells[(r, c)]))
        if any(lists.values()):
            blocks[wk] = lists
    return blocks


# ------------------------------------------------------------------- players --

def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def headshot(url: str, dest: Path) -> None:
    """The player's NFL.com headshot, resized by the CDN to the existing format."""
    sized = url.replace("f_auto,q_auto", "f_png,fl_png32,c_fill,w_320,h_232")
    if sized == url:
        raise ValueError(f"unexpected headshot URL shape: {url}")
    data = fetch(sized)
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"not a PNG: {sized}")
    w, h = int.from_bytes(data[16:20], "big"), int.from_bytes(data[20:24], "big")
    depth, ctype = data[24], data[25]
    if (w, h, depth, ctype) != (320, 232, 8, 6):
        raise ValueError(f"{sized}: got {w}x{h} depth {depth} type {ctype}, want 320x232 8-bit RGBA")
    dest.write_bytes(data)


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    sync = "--sync-players" in sys.argv
    wb = Path(args[0]) if args else DEFAULT_WB
    problems: list[str] = []

    blocks = week_blocks(read_sheet(wb, SHEET_NAME))
    for wk in sorted(blocks):
        if wk not in PUBLISHED:
            print(f"  note: Week {wk} has rankings in the sheet but no date in PUBLISHED; not written")
    missing = sorted(set(PUBLISHED) - set(blocks))
    if missing:
        sys.exit(f"PUBLISHED names week(s) {missing} with no rankings in the sheet")

    for (wk, pos, rank), (expected, replacement) in CORRECTIONS.items():
        lst = blocks[wk][pos]
        idx = next((i for i, (r, _) in enumerate(lst) if r == rank), None)
        if idx is None or norm(lst[idx][1]) != norm(expected):
            got = lst[idx][1] if idx is not None else "nothing"
            sys.exit(f"correction for Week {wk} {pos} #{rank} expected {expected!r}, sheet has "
                     f"{got!r}. Remove it from CORRECTIONS if the workbook now has it right.")
        lst[idx] = (rank, replacement)

    players_file = json.loads(PLAYERS.read_text())
    players = players_file["data"]
    teams = json.loads(TEAMS.read_text())["data"]
    nickname = {norm(t["nickname"]): t for t in teams}

    def index():
        out: dict[tuple[str, str], list[dict]] = {}
        for p in players:
            out.setdefault((p["position"], norm(p["name"])), []).append(p)
        return out

    by_name = index()

    def resolve(pos: str, raw: str):
        name = NAME_FIXES.get(raw, raw)
        if pos == "DST":
            t = nickname.get(norm(name))
            if t is None:
                return None, f"{raw!r} is not a club nickname"
            return f"def-{t['abbr'].lower()}", None
        hits = by_name.get((pos, norm(name)), [])
        if len(hits) == 1:
            return hits[0]["id"], None
        return None, ("ambiguous" if hits else "unresolved")

    # Collect everything that does not resolve yet.
    unresolved: dict[tuple[str, str], str] = {}
    for wk in PUBLISHED:
        for pos, lst in blocks[wk].items():
            for _, raw in lst:
                pid, why = resolve(pos, raw)
                if pid is None or (pos == "DST" and not any(p["id"] == pid for p in players)):
                    unresolved[(pos, NAME_FIXES.get(raw, raw))] = why or "new defense"

    if unresolved and not sync:
        for (pos, name), why in sorted(unresolved.items()):
            print(f"  ! {pos} {name}: {why}", file=sys.stderr)
        sys.exit(f"{len(unresolved)} name(s) are not in players.json. "
                 "Re-run with --sync-players to add them from the nflverse roster.")

    added = []
    if unresolved:
        roster: dict[tuple[str, str], list[dict]] = {}
        for row in csv.DictReader(io.StringIO(fetch(ROSTER_URL).decode("utf-8"))):
            roster.setdefault((row["position"], norm(row["full_name"])), []).append(row)
        latest = max(int(r["week"]) for rows in roster.values() for r in rows if r.get("week"))
        print(f"  nflverse roster: current through week {latest}")
        by_abbr = {t["abbr"]: t for t in teams}

        for (pos, name), _ in sorted(unresolved.items()):
            if pos == "DST":
                t = nickname[norm(name)]
                added.append({"id": f"def-{t['abbr'].lower()}", "name": f"{t['city']} {t['nickname']}",
                              "position": "DST", "team": t["abbr"]})
                continue
            rows = [r for r in roster.get((pos, norm(name)), []) if int(r["week"] or 0) == latest]
            if len(rows) != 1:
                problems.append(f"{pos} {name}: {len(rows)} matches on the week-{latest} roster")
                continue
            r = rows[0]
            team = TEAM_FIXES.get(r["team"], r["team"])
            if team not in by_abbr:
                problems.append(f"{pos} {name}: roster team {r['team']!r} is not a club")
                continue
            pid = slug(name)
            if any(p["id"] == pid for p in players):
                problems.append(f"{pos} {name}: id {pid!r} is already taken")
                continue
            dest = HEADSHOTS / f"{pid}.png"
            entry = {"id": pid, "name": name, "position": pos, "team": team}
            # Always fetched, never reused. A file already at this path belongs
            # to a player who is only now being added, so it predates this
            # sync: Daniel Carlson's was committed on 2026-08-12, when he was a
            # Raider, and the first run kept it beside a New Orleans chip.
            try:
                headshot(r["headshot_url"], dest)
            except Exception as e:  # a missing photo falls back to initials, not a failure
                print(f"  ! {name}: no headshot ({e})", file=sys.stderr)
            if dest.exists():
                entry["photo"] = f"/img/headshots/{pid}.png"
            added.append(entry)

        if problems:
            for p in problems:
                print(f"  ! {p}", file=sys.stderr)
            sys.exit("stopping before anything is written")

        players.extend(added)
        players_file["note"] = players_file["note"].rstrip() + (
            f" Weekly rankings added {len(added)} more on 2026-09-19 via "
            "scripts/curated/weekly_rankings.py --sync-players: team from the nflverse roster "
            f"current through week {latest}, headshot from the NFL.com image CDN."
        )
        PLAYERS.write_text(json.dumps(players_file, indent=1, ensure_ascii=False) + "\n")
        by_name = index()

    # Resolve, validate, write.
    written = []
    for wk, updated in sorted(PUBLISHED.items()):
        lists = {}
        for pos in COLUMNS.values():
            entries, seen_ids, seen_ranks = [], {}, set()
            for rank, raw in blocks[wk][pos]:
                pid, why = resolve(pos, raw)
                if pid is None:
                    problems.append(f"Week {wk} {pos} #{rank} {raw!r}: {why}")
                    continue
                if pid in seen_ids:
                    problems.append(f"Week {wk} {pos}: {raw!r} is ranked {seen_ids[pid]} and {rank}")
                if rank in seen_ranks:
                    problems.append(f"Week {wk} {pos}: rank {rank} is used twice")
                seen_ids[pid], _ = rank, seen_ranks.add(rank)
                entries.append({"rank": rank, "player_id": pid})
            lists[pos] = sorted(entries, key=lambda e: e["rank"])
        written.append((wk, updated, lists))

    if problems:
        for p in problems:
            print(f"  ! {p}", file=sys.stderr)
        sys.exit("stopping before anything is written")

    for wk, updated, lists in written:
        out = OUT_DIR / f"week-{wk}.json"
        if out.exists():
            print(f"kept {out.relative_to(ROOT)} (already published; delete it to regenerate)")
            continue
        out.write_text(json.dumps({
            "schema_version": 1,
            "season": 2026,
            "week": wk,
            "format": "PPR",
            "updated": updated,
            "source": f"{wb.name}, Week {wk} block",
            "note": f"Week {wk} rankings, PPR scoring, the operator's own order.",
            "lists": lists,
        }, indent=1) + "\n")
        sizes = ", ".join(f"{p} {len(v)}" for p, v in lists.items())
        print(f"wrote {out.relative_to(ROOT)}  (updated {updated}: {sizes})")

    if added:
        print(f"added {len(added)} players to players.json "
              f"({sum(1 for a in added if a.get('photo'))} with a headshot, "
              f"{sum(1 for a in added if a['position'] == 'DST')} defenses):")
        for a in added:
            print(f"    {a['position']:<3} {a['name']:<24} {a['team']:<4} {'photo' if a.get('photo') else '-'}")
    for key, (exp, rep) in CORRECTIONS.items():
        print(f"  correction applied: Week {key[0]} {key[1]} #{key[2]} {exp} -> {rep}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
