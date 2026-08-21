#!/usr/bin/env python3
"""
Build src/data/qb-charts.json from the QB Statistics PDF.

Unlike the other extractors this one reads a PDF, because the QB sheet is not in
the workbook — sheet 5 is WR/TE and there is no QB tab. The operator exported it
separately, so the export is the source.

The PDF stores text as CID codes offset by 29 from ASCII, inside Flate streams.
Both are handled here rather than by a dependency: the machine has no poppler
and no PIL, and a 60-line reader beats asking for an install.

Everything the page needs is computed here — correlations, medians, extents,
label order (§11). Components draw.

**Six rows carry rushing YARDS in the rush-attempts column.** See CORRECTIONS.

Run: python3 scripts/curated/qb_charts.py [path/to/QB Statistics.pdf]
"""
import json
import re
import statistics
import sys
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_PDF = (Path.home() / "Downloads" /
               "2026-2027 Fantasy Football Analytics (Original) - QB Statistics.pdf")

# The PDF's glyph ids sit 29 below ASCII. Verified across the whole document:
# every decoded string is a real name, number or English header.
CID_OFFSET = 29

# ---------------------------------------------------------------------------
# CORRECTIONS
#
# The "rush attempts" column holds rushing *yards* for six quarterbacks. Each
# was checked against Sleeper's 2025 season stats (the same public endpoint
# scripts/audit-teams.mjs audits teams against) and in every case the printed
# figure equals that player's rushing yards exactly, while his real attempt
# count is different. Stafford is the one that made it visible — 1 "attempt"
# against 597 dropbacks produced -5.69 designed carries, which is impossible —
# but he was not alone, and the other five were silently wrong rather than
# absurd.
#
# Correcting them matters: all six are pocket passers whose inflated rushing
# volume flattened the relationship the page is about.
#
# Herbert is deliberately NOT corrected. The PDF says 86, Sleeper says 83; that
# is a three-attempt disagreement between sources, not a column swap, and
# overriding the operator's number on that basis would be a guess.
# ---------------------------------------------------------------------------
CORRECTIONS = {
    "Aaron Rodgers":    {"was": 61, "rush_att": 21, "note": "61 is his rushing yards"},
    "Jared Goff":       {"was": 45, "rush_att": 19, "note": "45 is his rushing yards"},
    "Joe Burrow":       {"was": 41, "rush_att": 14, "note": "41 is his rushing yards"},
    "Joe Flacco":       {"was": 35, "rush_att": 21, "note": "35 is his rushing yards"},
    "Matthew Stafford": {"was": 1,  "rush_att": 29, "note": "1 is his rushing yards"},
    "Tua Tagovailoa":   {"was": 43, "rush_att": 20, "note": "43 is his rushing yards"},
}

# One glyph in the passing-volume table decodes with a stray character.
NAME_FIXES = {"Box Nix": "Bo Nix", "Byrce Young": "Bryce Young"}

# Row ranges in the decoded run list. Each is validated against the header text
# that should sit above it, so a re-export that moves things fails loudly.
SECTIONS = {
    "attempts":  (8, 141, 2, "Attempts"),
    "rushing":   (145, 225, 2, "Rushing Volume"),
    "ypa":       (229, 330, 2, "Passing Yards/Att"),
    "scramble":  (334, 399, 2, "Scramble Rate"),
    "ttt":       (403, 477, 2, "Time to Throw"),
    "cpoe":      (483, 573, 2, "EPA/Dropback"),
    "designed":  (712, 897, 5, "% Designed"),
    "perdrop":   (904, 1035, 3, "FPTS/Dropback"),
}
TEAM_RANGE = (579, 703)

NAME_RE = r"[A-Z][A-Za-z0-9'\.]+(?:\s+[A-Z][A-Za-z]+)*"

# 2025 rushing lines for the table under chart 1. Not in the export: pulled from
# StatMuse and checked row by row against Sleeper, which agrees on all but five
# yards of Caleb Williams. Kept as a file next to dst-history.json rather than
# fetched here, so the page does not depend on a third party being reachable.
RUSHING_FILE = Path(__file__).resolve().parent / "data" / "qb-rushing-2025.json"
NUM_RE = r"-?\d+(?:\.\d+)?%?"


def decode_pdf(path):
    """Flate streams -> CID text -> ASCII runs, in document order."""
    data = path.read_bytes()
    blob = b""
    for s in re.findall(rb"stream\r?\n(.*?)endstream", data, re.S):
        try:
            blob += zlib.decompress(s) + b"\n"
        except zlib.error:
            pass

    runs = []
    for m in re.finditer(rb"(?:\[(.*?)\]\s*TJ)|(?:\((.*?)\)\s*Tj)", blob, re.S):
        raw = (b"".join(re.findall(rb"\((.*?)\)", m.group(1), re.S))
               if m.group(1) else m.group(2))
        raw = raw.replace(b"\\(", b"(").replace(b"\\)", b")").replace(b"\\\\", b"\\")
        raw = re.sub(rb"\\([0-7]{1,3})", lambda x: bytes([int(x.group(1), 8) & 0xFF]), raw)
        runs.append("".join(chr((raw[i + 1] + CID_OFFSET) & 0xFF)
                            for i in range(0, len(raw) - 1, 2) if raw[i] == 0))
    return runs


def tokens(line):
    return [m.group(0).strip() for m in re.finditer(rf"({NAME_RE})|({NUM_RE})", line)]


def flatten(runs, lo, hi):
    out = []
    for line in runs[lo - 1:hi]:
        line = line.strip()
        if not line:
            continue
        t = tokens(line)
        out.extend(t if t else [line])
    return out


is_num = lambda x: bool(re.fullmatch(NUM_RE, x))
to_num = lambda x: float(x.rstrip("%"))


def parse_rows(runs, lo, hi, n_vals):
    """A name followed by exactly n numbers."""
    flat = flatten(runs, lo, hi)
    out, i = {}, 0
    while i < len(flat):
        if is_num(flat[i]):
            i += 1
            continue
        name = NAME_FIXES.get(flat[i], flat[i])
        vals, j = [], i + 1
        while j < len(flat) and is_num(flat[j]) and len(vals) < n_vals:
            vals.append(to_num(flat[j]))
            j += 1
        if len(vals) == n_vals:
            out[name] = vals
        i = max(j, i + 1)
    return out


def pearson(pairs):
    if len(pairs) < 6:
        return None
    xs = [p[0] for p in pairs]
    ys = [p[1] for p in pairs]
    mx, my = statistics.mean(xs), statistics.mean(ys)
    num = sum((x - mx) * (y - my) for x, y in pairs)
    den = (sum((x - mx) ** 2 for x in xs) * sum((y - my) ** 2 for y in ys)) ** 0.5
    return round(num / den, 3) if den else None


def shorten(name):
    parts = name.split()
    if len(parts) < 2 or len(parts[0]) <= 2:
        return name
    return f"{parts[0][0]}. {' '.join(parts[1:])}"


def scatter(points, x_label, y_label, caption, note=None):
    """Medians, extents and label order settled here, never in a component."""
    xs = sorted(p["x"] for p in points)
    ys = sorted(p["y"] for p in points)
    spread = lambda v: (v[int(len(v) * .75)] - v[int(len(v) * .25)]) or 1.0
    mx, my = statistics.median(xs), statistics.median(ys)
    sx, sy = spread(xs), spread(ys)
    for i, p in enumerate(sorted(points,
                                 key=lambda p: -max(abs(p["x"] - mx) / sx, abs(p["y"] - my) / sy))):
        p["label"] = True
        p["short"] = shorten(p["name"])
        p["rank"] = i
    body = {
        "x_label": x_label, "y_label": y_label, "caption": caption,
        "x_median": round(mx, 3), "y_median": round(my, 3),
        "x_min": min(xs), "x_max": max(xs), "y_min": min(ys), "y_max": max(ys),
        "r": pearson([(p["x"], p["y"]) for p in points]),
        "points": points,
    }
    if note:
        body["note"] = note
    return body


def main():
    pdf = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PDF
    if not pdf.exists():
        sys.exit(f"PDF not found: {pdf}")
    runs = decode_pdf(pdf)
    print(f"  decoded {len(runs)} text runs")

    warnings = []
    def warn(m):
        warnings.append(m)
        print(f"  WARN {m}")

    # Validate each range still sits under the header it claims.
    for key, (lo, hi, _, header) in SECTIONS.items():
        window = " ".join(runs[max(0, lo - 8):lo])
        if header not in window:
            warn(f"{key}: '{header}' not found above row {lo} — has the export changed?")

    D = {}
    def put(rows, keys):
        for nm, vals in rows.items():
            d = D.setdefault(nm, {})
            for k, v in zip(keys, vals):
                d.setdefault(k, v)

    put(parse_rows(runs, *SECTIONS["attempts"][:3]), ["att", "ppg"])
    put(parse_rows(runs, *SECTIONS["rushing"][:3]), ["rush", "ppg"])
    put(parse_rows(runs, *SECTIONS["ypa"][:3]), ["ypa", "ppg"])
    put(parse_rows(runs, *SECTIONS["scramble"][:3]), ["scramble_pct", "ppg"])
    put(parse_rows(runs, *SECTIONS["ttt"][:3]), ["ttt", "ppg"])
    put(parse_rows(runs, *SECTIONS["cpoe"][:3]), ["cpoe", "epa"])
    put(parse_rows(runs, *SECTIONS["designed"][:3]),
        ["dropbacks", "scramble_pct2", "rush2", "designed_raw", "pct_designed_raw"])
    put(parse_rows(runs, *SECTIONS["perdrop"][:3]), ["fpts", "dropbacks2", "fpts_per_db"])

    # Surname-keyed tables (CPOE/EPA) fold into the full-name records.
    full = {k: v for k, v in D.items() if " " in k}
    last = {k.split()[-1]: k for k in full}
    for s, v in {k: v for k, v in D.items() if " " not in k}.items():
        if s in last:
            for k, val in v.items():
                full[last[s]].setdefault(k, val)

    # Apply the rushing-yards-in-the-attempts-column corrections.
    applied = []
    for name, fix in CORRECTIONS.items():
        rec = full.get(name)
        if not rec:
            warn(f"correction for {name} has nobody to apply to")
            continue
        printed = rec.get("rush", rec.get("rush2"))
        if printed is None:
            continue
        if abs(printed - fix["rush_att"]) < 0.5:
            print(f"  correction now matches the source for {name} — delete it")
            continue
        if abs(printed - fix["was"]) > 0.5:
            warn(f"{name}: expected {fix['was']} to correct, found {printed} — NOT applying")
            continue
        rec["rush"] = rec["rush2"] = float(fix["rush_att"])
        applied.append(f"{name} {fix['was']}→{fix['rush_att']} ({fix['note']})")
    for a in applied:
        print(f"  CORRECTED   {a}")

    # Designed carries recomputed from corrected attempts.
    for name, rec in full.items():
        if "rush" in rec and "dropbacks" in rec and "scramble_pct2" in rec:
            scr = rec["dropbacks"] * rec["scramble_pct2"] / 100
            rec["scrambles"] = round(scr, 2)
            rec["designed"] = round(rec["rush"] - scr, 2)
    neg = [n for n, r in full.items() if r.get("designed", 0) < 0]
    if neg:
        warn(f"still negative designed carries (impossible): {neg}")

    Q = {k: v for k, v in full.items() if "ppg" in v}
    pts = lambda xk, yk: [{"name": n, "x": round(v[xk], 3), "y": round(v[yk], 3)}
                          for n, v in Q.items() if xk in v and yk in v]

    charts = {
        "rushing": scatter(
            pts("rush", "ppg"), "Rush attempts", "Fantasy points per game",
            "Carries, not completions, are what separate the top of the position."),
        "scrambles": scatter(
            pts("scrambles", "ppg"), "Scrambles", "Fantasy points per game",
            "The scrambles a quarterback actually runs, not the rate he runs them at."),
        "efficiency": scatter(
            pts("epa", "ppg"), "EPA per dropback", "Fantasy points per game",
            "Playing well and scoring fantasy points are related, not the same."),
    }

    # Team passing environment.
    flat = flatten(runs, *TEAM_RANGE)
    teams, i = [], 0
    while i < len(flat):
        if is_num(flat[i]):
            i += 1
            continue
        nm, vals, j = flat[i], [], i + 1
        while j < len(flat) and is_num(flat[j]) and len(vals) < 3:
            vals.append(to_num(flat[j]))
            j += 1
        if len(vals) == 3:
            teams.append({"name": nm, "x": vals[0], "redzone": vals[1], "y": vals[2]})
        i = max(j, i + 1)
    charts["environment"] = scatter(
        [{"name": t["name"], "x": t["x"], "y": t["y"]} for t in teams],
        "Neutral pass rate over expected", "QB fantasy points per game",
        "A pass-happy offense is a weaker signal than it sounds.")

    # Correlations the page quotes, computed once here.
    def r_of(xk):
        return pearson([(v[xk], v["ppg"]) for v in Q.values() if xk in v and "ppg" in v])
    corrs = {k: r_of(k) for k in
             ("rush", "att", "epa", "ypa", "cpoe", "scramble_pct", "scrambles",
              "designed", "ttt", "fpts_per_db")}
    counts = {k: sum(1 for v in Q.values() if k in v) for k in corrs}

    # Per-attempt value: two-variable least squares of PPG on pass and rush volume.
    both = [(v["att"], v["rush"], v["ppg"]) for v in Q.values()
            if "att" in v and "rush" in v]
    per_attempt = None
    if len(both) >= 10:
        m1 = statistics.mean(b[0] for b in both)
        m2 = statistics.mean(b[1] for b in both)
        my_ = statistics.mean(b[2] for b in both)
        s11 = sum((b[0] - m1) ** 2 for b in both)
        s22 = sum((b[1] - m2) ** 2 for b in both)
        s12 = sum((b[0] - m1) * (b[1] - m2) for b in both)
        s1y = sum((b[0] - m1) * (b[2] - my_) for b in both)
        s2y = sum((b[1] - m2) * (b[2] - my_) for b in both)
        det = s11 * s22 - s12 * s12
        if det:
            bp = (s22 * s1y - s12 * s2y) / det
            br = (s11 * s2y - s12 * s1y) / det
            per_attempt = {"pass": round(bp, 4), "rush": round(br, 4),
                           "ratio": round(br / bp, 1) if bp else None, "n": len(both)}

    rushing_rows = []
    if RUSHING_FILE.exists():
        doc = json.loads(RUSHING_FILE.read_text())
        rushing_rows = doc["data"]
        # The table and the scatter must not disagree about a carry count.
        by_pdf = {n: v.get("rush") for n, v in full.items() if "rush" in v}
        for row in rushing_rows:
            pdf_att = by_pdf.get(row["name"])
            if pdf_att is not None and abs(pdf_att - row["att"]) > 0.5:
                warn(f"{row['name']}: chart says {pdf_att:.0f} carries, table says {row['att']}")
        print(f"  rushing table {len(rushing_rows)} quarterbacks from {doc['source'].split('/')[2]}")
    else:
        warn(f"{RUSHING_FILE.name} missing — the rushing table will be empty")

    out = {
        "schema_version": 1,
        "season": 2025,
        "updated": __import__("datetime").datetime.now().strftime("%Y-%m-%d"),
        "source": pdf.name,
        "note": (
            "Quarterback charts from the operator's QB Statistics export. Rushing "
            "attempts for six quarterbacks were rushing yards in the source and are "
            "corrected here against Sleeper's 2025 season stats; see CORRECTIONS in "
            "scripts/curated/qb_charts.py. One season, so every correlation below is "
            "a description of 2025 rather than a law. Nothing is computed in a "
            "component (§11)."
        ),
        "data": {
            "charts": charts,
            "correlations": corrs,
            "counts": counts,
            "per_attempt": per_attempt,
            "rushing_table": rushing_rows,
            "corrections": [
                {"name": n, "printed": f["was"], "actual": f["rush_att"], "why": f["note"]}
                for n, f in CORRECTIONS.items()
                if any(a.startswith(n) for a in applied)
            ],
        },
    }
    dest = ROOT / "src/data/qb-charts.json"
    dest.write_text(json.dumps(out, indent=1) + "\n")
    print(f"\n  {len(Q)} quarterbacks, {len(teams)} teams, {len(charts)} charts")
    print("  correlations with fantasy PPG:")
    for k, v in sorted(corrs.items(), key=lambda kv: -(abs(kv[1]) if kv[1] else 0)):
        if v is not None:
            print(f"     {k:16}{v:>+7.2f}  n={counts[k]}")
    if per_attempt:
        print(f"  a rush attempt is worth {per_attempt['ratio']}x a pass attempt "
              f"(n={per_attempt['n']})")
    print(f"  wrote {dest.relative_to(ROOT)}")
    if warnings:
        print(f"\n  {len(warnings)} warning(s) — read them before trusting the page.")


if __name__ == "__main__":
    main()
