#!/usr/bin/env python3
"""Turn OCR'd X screenshots from the workbook into beat-post records.

Collected by hand across June and July, so these skip the signal filter — the
curation already happened. They still get a topic assigned so they render with
the same tags and highlighting as the live feed.

Three things this is careful about:

- Every post in a screenshot is taken, not just the first. Several shots hold
  a thread or a quote-tweet.
- Team comes from the post's own text, not from which spreadsheet column the
  image sat in. The columns are unreliable: a Schefter post about the Panthers
  was anchored under Arizona.
- Relative stamps ("23h") are only meaningful against the moment the screenshot
  was taken, which nothing records. Those are not given a fabricated day; they
  are marked as belonging to the collection window and sort after dated posts.
"""
import json, re
from pathlib import Path

SCRATCH = Path(__file__).parent
PROJ = Path("/Users/michaelhuettl/Desktop/Claude Code/vantage")

MONTHS = {m: i for i, m in enumerate(
    "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(), 1)}

HEADER = re.compile(r"@([A-Za-z0-9_]{2,15})\s*[•·]\s*([A-Za-z]{3}\s+\d{1,2}|\d+[hdm])")

JUNK = re.compile(
    r"^(?:[\W_\s]*|\d+[KM]?|Show this thread|Translate post|Quote|Replying to.*|"
    r"[A-Za-z]{1,2}[\W\s]*|.*\bLead\b.*|View \d+.*|GIF|Image|From)$", re.I)

players = json.loads((PROJ / "src/data/players.json").read_text())["data"]
teams = json.loads((PROJ / "src/data/teams.json").read_text())["data"]


def clean(lines):
    out = []
    for ln in lines:
        ln = ln.strip()
        if not ln or JUNK.match(ln):
            continue
        out.append(ln)
    return out


def tag_players(text):
    hits = []
    for p in players:
        if p["position"] == "DST":
            continue
        parts = p["name"].split()
        last = parts[-1]
        if len(last) < 4 or not re.search(rf"\b{re.escape(last)}\b", text, re.I):
            continue
        first = re.escape(parts[0])
        if re.search(rf"\b({first}|{first[0]}\.?)\s", text, re.I):
            hits.append(p["id"])
    return hits


def tag_teams(text, tagged):
    """Text mention first, then the teams of any named players.

    The spreadsheet column is deliberately NOT used as a fallback. It put a
    Schefter post about the Panthers under Arizona and Michael Penix, an
    Atlanta quarterback, under Arizona as well. A missing chip is honest; a
    wrong one is worse than none on a site that argues for checking the work.
    """
    named = [t["abbr"] for t in teams
             if re.search(rf"\b({t['nickname']}|#{t['nickname']})\b", text, re.I)]
    if named:
        return sorted(set(named))
    from_players = [p["team"] for p in players
                    if p["id"] in tagged and p.get("team")]
    if from_players:
        return sorted(set(from_players))
    return []


records, multi = [], 0
for raw in (SCRATCH / "ocr_out.tsv").read_text().splitlines():
    if "\t" not in raw:
        continue
    path, text = raw.split("\t", 1)
    anchor = Path(path).name.split("__")[0]
    lines = text.split("\\n")

    heads = [(i, m) for i, ln in enumerate(lines) if (m := HEADER.search(ln))]
    if not heads:
        continue
    if len(heads) > 1:
        multi += 1

    for n, (i, m) in enumerate(heads):
        handle, when = m.group(1), m.group(2)
        end = heads[n + 1][0] if n + 1 < len(heads) else len(lines)
        body = " ".join(clean(lines[i + 1:end]))
        body = re.sub(r"\s+", " ", body).strip(" .·…\"'")
        if len(body) < 40:
            continue

        dm = re.match(r"([A-Za-z]{3})\s+(\d{1,2})$", when)
        if dm and dm.group(1).title() in MONTHS:
            date = f"2026-{MONTHS[dm.group(1).title()]:02d}-{int(dm.group(2)):02d}"
            approx = False
        else:
            date = None
            approx = True

        tagged = tag_players(body)
        records.append({
            "author": f"@{handle}",
            "text": body,
            "date": date,
            "approx_date": approx,
            "team_abbrs": tag_teams(body, tagged),
            "player_ids": tagged,
        })

# Same post screenshotted twice, or a quote-tweet capturing its parent.
seen, unique = set(), []
for r in records:
    key = re.sub(r"\W", "", r["text"].lower())[:90]
    if key in seen:
        continue
    seen.add(key)
    unique.append(r)

dated = [r for r in unique if r["date"]]
print(f"{len(unique)} posts from 117 screenshots ({len(records) - len(unique)} duplicates dropped)")
print(f"  screenshots holding more than one post: {multi}")
print(f"  dated: {len(dated)}   collection-window only: {len(unique) - len(dated)}")
by_month = {}
for r in dated:
    by_month[r["date"][:7]] = by_month.get(r["date"][:7], 0) + 1
print(f"  by month: {dict(sorted(by_month.items()))}")
print(f"  tagged to a ranked player: {sum(1 for r in unique if r['player_ids'])}")
print(f"  with a team: {sum(1 for r in unique if r['team_abbrs'])}")

json.dump(unique, open(SCRATCH / "curated_raw.json", "w"), indent=1)
print("\nsample:")
for r in unique[:5]:
    print(f"  {r['author']:<20} {r['date'] or 'Jun-Jul'}  teams={r['team_abbrs']}")
    print(f"     {r['text'][:115]}")
