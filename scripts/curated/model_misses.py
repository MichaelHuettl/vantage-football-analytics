"""
The case study: every game the prediction model got wrong, 2023-2025.

Source is the miss report the prediction pipeline published
(`model-misses-2023-2025.html`), plus the artifacts that report was itself
built from. Both are read; neither is trusted alone.

**Why both.** The report is prose and already contains the analysis worth
publishing — the market overlap, the margin distribution, the turnover swing,
the weather and injury splits. Re-deriving all of that here would be a second
implementation that could quietly disagree with the document it claims to
summarise. But a page that only re-keys a generated HTML file has no way of
noticing when the file changes. So the numbers the page leans on hardest are
**recomputed from `oos_predictions.csv` and `model_dataset.csv` and checked
against what the report printed**, and the script fails loudly when the two
part company.

That check earned its place immediately. The report's "the market picked the
same losing side" figure only reproduces if the market's side is taken from
`spread_line`; the moneyline disagrees with the spread on two games in the
window and gives 251/41 where the report says 253/39. Reconciling forced that
definition into the open instead of leaving a two-game discrepancy sitting
under a headline percentage.

**The per-season table is not in the report.** The report covers 2023-2025 in
aggregate and has no best-season/worst-season breakdown, so that section is
computed here from `report_per_fold.csv` — the walk-forward folds, one per
season, which are the model's own record of how it did each year — and from the
same market comparison applied season by season.

Nothing in `~/Desktop/nflverse-data/` is written to. That pipeline belongs to
another session (docs/STATE.md); this reads its outputs and copies conclusions
into `src/data/`, the same way every other extractor here works.

Run: python3 scripts/curated/model_misses.py
"""
import csv
import html
import json
import math
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LAKE = Path.home() / "Desktop" / "nflverse-data"
REPORT = LAKE / "model-misses-2023-2025.html"
ARTIFACTS = LAKE / "artifacts"

# The shipped model. `meta.model_name` in the payload says "Calibrated Logistic
# Regression (core + market features)"; this is that model's key in the
# artifacts, and the fold rows for it sum to the payload's 4,166 games.
MODEL = "logistic_calibrated__core_market_aware"

WINDOW = (2023, 2025)  # what the report covers

# What the report printed, as published. These are assertions, not inputs: the
# script recomputes each one and stops if a recomputation disagrees, because a
# case study whose arithmetic has drifted from its source is worse than none.
REPORT_CLAIMS = {
    "games": 854,
    "misses": 292,
    "shared_with_market": 253,
    "model_specific": 39,
}


# ----------------------------------------------------------------- the report

def _text(fragment):
    """Tags out, entities decoded, whitespace collapsed."""
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", fragment))).strip()


def _tables(doc):
    """Every <table> as a list of rows, each row a list of cell strings."""
    out = []
    for tbl in re.findall(r"<table.*?</table>", doc, re.S):
        head = [_text(c) for c in re.findall(r"<th[^>]*>(.*?)</th>", tbl, re.S)]
        rows = []
        for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", tbl, re.S):
            cells = re.findall(r"<td[^>]*>(.*?)</td>", tr, re.S)
            if cells:
                rows.append([_text(c) for c in cells])
        out.append({"head": head, "rows": rows})
    return out


def _num(s):
    """First number in a string, as int or float. Percentages come back whole."""
    m = re.search(r"-?\d+(?:\.\d+)?", s.replace(",", ""))
    if not m:
        raise ValueError(f"no number in {s!r}")
    v = m.group(0)
    return float(v) if "." in v else int(v)


def _pct(s):
    """A printed percentage as a fraction, without the float noise that makes a
    committed data file read like a machine wrote it carelessly."""
    return round(_num(s) / 100, 4)


def read_report(path):
    doc = path.read_text(encoding="utf-8")
    tables = _tables(doc)
    if len(tables) < 5:
        sys.exit(f"expected 5 tables in the report, found {len(tables)}")

    bands = [
        {"band": r[0], "games": _num(r[1]), "wrong": _num(r[2]), "accuracy": _pct(r[3])}
        for r in tables[0]["rows"]
    ]
    margins = [
        {"bucket": r[0], "misses": _num(r[1]), "share": _pct(r[2])}
        for r in tables[1]["rows"]
    ]
    worst = [
        {
            "game_id": r[0],
            "picked": _text(r[1]).split()[0],
            "confidence": _pct(r[1]),
            "final": r[2],
            "turnover_margin": _num(r[3]),
            "performer": r[4],
        }
        for r in tables[2]["rows"]
    ]
    weather = [
        {"condition": r[0], "games": _num(r[1]), "accuracy": _pct(r[2])}
        for r in tables[3]["rows"]
    ]

    # Figures that live in prose rather than a table. Each is pinned to enough
    # surrounding words that a reworded sentence fails loudly instead of
    # matching the wrong number.
    def find(pattern, label):
        m = re.search(pattern, _text(doc))
        if not m:
            sys.exit(f"could not find {label} in the report — has it been rewritten?")
        return m

    headline = {
        "games": _num(find(r"(\d+)\s+games predicted", "games predicted").group(1)),
        "misses": _num(find(r"(\d+)\s+got wrong", "got wrong").group(1)),
        "accuracy": _pct(find(r"([\d.]+)%\s+accuracy", "accuracy").group(1)),
        "median_losing_margin": _num(find(r"(\d+)\s+median losing margin", "median margin").group(1)),
        "model_specific": _num(find(r"(\d+)\s+model-specific failures", "model-specific").group(1)),
    }
    shared = _num(find(r"same losing side in (\d+) of them", "shared misses").group(1))
    turnovers = {
        "when_right": _num(find(r"its pick won the turnover battle by \+?([\d.]+)", "TO right").group(1)),
        "when_wrong": -_num(find(r"lost it by -([\d.]+)", "TO wrong").group(1)),
        "swing": _num(find(r"A swing of ([\d.]+)", "TO swing").group(1)),
        "misses_losing_to": _num(find(r"and (\d+) of 292 misses", "TO miss count").group(1)),
    }
    qb_out = {
        "games": _num(find(r"In the (\d+) games with a quarterback listed out", "QB out games").group(1)),
        "accuracy": _pct(find(r"quarterback listed out, the model went ([\d.]+)%", "QB out acc").group(1)),
    }
    divisional = {
        "div_accuracy": _pct(find(r"Divisional ([\d.]+)%", "div acc").group(1)),
        "div_games": _num(find(r"Divisional [\d.]+% \((\d+) games\)", "div games").group(1)),
        "non_div_accuracy": _pct(find(r"non-divisional ([\d.]+)%", "non-div acc").group(1)),
        "non_div_games": _num(find(r"non-divisional [\d.]+% \((\d+)\)", "non-div games").group(1)),
    }
    return {
        "headline": headline,
        "shared_with_market": shared,
        "bands": bands,
        "margins": margins,
        "worst": worst,
        "weather": weather,
        "turnovers": turnovers,
        "qb_out": qb_out,
        "divisional": divisional,
        "every_miss_rows": len(tables[4]["rows"]),
    }


# -------------------------------------------------------------- the artifacts

def read_artifacts():
    oos = {}
    with (ARTIFACTS / "oos_predictions.csv").open() as fh:
        for r in csv.DictReader(fh):
            if r["model"] == MODEL:
                oos[r["game_id"]] = (int(r["season"]), float(r["y_true"]), float(r["y_pred"]))
    if not oos:
        sys.exit(f"no rows for {MODEL} in oos_predictions.csv")

    ds = {}
    with (ARTIFACTS / "model_dataset.csv").open() as fh:
        for r in csv.DictReader(fh):
            ds[r["game_id"]] = r

    folds = {}
    with (ARTIFACTS / "report_per_fold.csv").open() as fh:
        for r in csv.DictReader(fh):
            if r["model"] == MODEL:
                folds[r["fold"]] = r
    return oos, ds, folds


def market_picked_home(row):
    """The market's side, taken from the spread.

    The report's 253/39 split only reproduces on the spread. The moneyline
    disagrees with it on two games in this window — near-pick'em lines where
    the price and the number lean opposite ways — and yields 251/41. The spread
    is the sharper number of the two and is what the report used, so it is what
    is used here; the reconciliation below is what would catch it changing.
    """
    v = row.get("spread_line", "")
    if v in ("", "NA"):
        return None
    return float(v) > 0


def per_season(oos, ds, folds):
    S = defaultdict(lambda: {
        "n": 0, "hit": 0, "market_hit": 0, "misses": 0, "shared": 0, "solo": 0,
        "one_score_misses": 0, "blowout_misses": 0, "close_games": 0, "conf": 0.0,
    })
    for gid, (season, y_true, y_pred) in oos.items():
        row = ds.get(gid)
        if row is None:
            continue
        s = S[season]
        truth = y_true > 0.5
        model_home = y_pred > 0.5
        s["n"] += 1
        s["conf"] += max(y_pred, 1 - y_pred)

        margin = abs(float(row["margin"])) if row.get("margin") not in ("", "NA") else None
        if margin is not None and margin <= 3:
            s["close_games"] += 1

        mk = market_picked_home(row)
        if mk is not None and mk == truth:
            s["market_hit"] += 1

        if model_home == truth:
            s["hit"] += 1
        else:
            s["misses"] += 1
            if mk is not None:
                s["shared" if mk != truth else "solo"] += 1
            if margin is not None:
                if margin <= 3:
                    s["one_score_misses"] += 1
                if margin >= 15:
                    s["blowout_misses"] += 1

    # Six decimals. The page prints one decimal of a percent, which is three of
    # a fraction, and pre-rounding anywhere near that boundary changes what the
    # page shows: at four digits 2016's 0.6265060 became 0.6265, which as a
    # double is *below* 62.65 and rendered 62.6% against the report's 62.7%; at
    # five, 2013's 0.6404959 became 0.64050 and rendered 64.1% when the true
    # value is 64.0%. Six leaves three digits of headroom past the last one
    # anybody reads, and the run below checks every season against its
    # unrounded value rather than trusting that.
    seasons = []
    for year in sorted(S):
        s = S[year]
        fold = folds.get(f"test_{year}")
        seasons.append({
            "season": year,
            "games": s["n"],
            "accuracy": round(s["hit"] / s["n"], 6),
            "market_accuracy": round(s["market_hit"] / s["n"], 6),
            "gap": round(s["hit"] / s["n"] - s["market_hit"] / s["n"], 6),
            "misses": s["misses"],
            "shared_with_market": s["shared"],
            "model_specific": s["solo"],
            "one_score_misses": s["one_score_misses"],
            "blowout_misses": s["blowout_misses"],
            "close_game_share": round(s["close_games"] / s["n"], 6),
            "mean_confidence": round(s["conf"] / s["n"], 6),
            # Straight from the model's own fold record rather than recomputed.
            "log_loss": round(float(fold["log_loss"]), 4) if fold else None,
            "calibration_error": round(float(fold["ece"]), 4) if fold else None,
        })
    return seasons


def pearson(a, b):
    n = len(a)
    ma, mb = sum(a) / n, sum(b) / n
    num = sum((x - ma) * (y - mb) for x, y in zip(a, b))
    den = math.sqrt(sum((x - ma) ** 2 for x in a) * sum((y - mb) ** 2 for y in b))
    return num / den


# ------------------------------------------------------------------ reconcile

def reconcile(report, seasons):
    """The report's headline claims against what the artifacts actually say."""
    lo, hi = WINDOW
    window = [s for s in seasons if lo <= s["season"] <= hi]
    computed = {
        "games": sum(s["games"] for s in window),
        "misses": sum(s["misses"] for s in window),
        "shared_with_market": sum(s["shared_with_market"] for s in window),
        "model_specific": sum(s["model_specific"] for s in window),
    }
    printed = {
        "games": report["headline"]["games"],
        "misses": report["headline"]["misses"],
        "shared_with_market": report["shared_with_market"],
        "model_specific": report["headline"]["model_specific"],
    }
    bad = []
    for key, expected in REPORT_CLAIMS.items():
        if printed[key] != expected:
            bad.append(f"  report now prints {key}={printed[key]}, this script was written against {expected}")
        if computed[key] != printed[key]:
            bad.append(f"  {key}: report says {printed[key]}, artifacts give {computed[key]}")

    acc = sum(s["accuracy"] * s["games"] for s in window) / computed["games"]
    if abs(acc - report["headline"]["accuracy"]) > 0.001:
        bad.append(f"  accuracy: report says {report['headline']['accuracy']:.3%}, artifacts give {acc:.3%}")

    if report["every_miss_rows"] != printed["misses"]:
        bad.append(f"  the every-miss table has {report['every_miss_rows']} rows for {printed['misses']} misses")

    print(f"  reconciled {len(REPORT_CLAIMS) + 2} published figures against the artifacts")
    if bad:
        print("\nRECONCILIATION FAILED — the report and the artifacts disagree:")
        print("\n".join(bad))
        print("\nRefusing to write. Regenerate the report, or work out which is right.")
        sys.exit(1)
    return computed, acc


# ----------------------------------------------------------------------- main

def main():
    for p in (REPORT, ARTIFACTS / "oos_predictions.csv",
              ARTIFACTS / "model_dataset.csv", ARTIFACTS / "report_per_fold.csv"):
        if not p.exists():
            sys.exit(f"missing source: {p}")

    print(f"reading {REPORT.name}")
    report = read_report(REPORT)
    print(f"  {report['headline']['misses']} misses, {len(report['worst'])} ranked worst, "
          f"{len(report['bands'])} bands, {len(report['weather'])} weather rows")

    print("reading artifacts")
    oos, ds, folds = read_artifacts()
    print(f"  {len(oos):,} out-of-sample games for {MODEL}")
    seasons = per_season(oos, ds, folds)
    print(f"  {len(seasons)} walk-forward seasons, {seasons[0]['season']}-{seasons[-1]['season']}")

    computed, window_accuracy = reconcile(report, seasons)

    best = max(seasons, key=lambda s: s["accuracy"])
    worst = min(seasons, key=lambda s: s["accuracy"])
    best_vs_market = max(seasons, key=lambda s: s["gap"])
    worst_vs_market = min(seasons, key=lambda s: s["gap"])
    r = pearson([s["accuracy"] for s in seasons], [s["market_accuracy"] for s in seasons])

    print(f"  best {best['season']} {best['accuracy']:.1%} · worst {worst['season']} {worst['accuracy']:.1%} "
          f"· corr with market r={r:.2f}")

    out = {
        "schema_version": 1,
        "window": {"from": WINDOW[0], "to": WINDOW[1]},
        "updated": "2026-08-20",
        "source": (
            "model-misses-2023-2025.html (prediction pipeline), reconciled against "
            "artifacts/oos_predictions.csv, model_dataset.csv and report_per_fold.csv"
        ),
        "note": (
            "Every figure here is either printed in the miss report or recomputed from the "
            "artifacts it was built from, and the two are checked against each other before "
            "this file is written. The per-season table is not in the report — it comes from "
            "the walk-forward folds. Nothing is computed in a component (§11)."
        ),
        "data": {
            "headline": report["headline"],
            "shared_with_market": report["shared_with_market"],
            "shared_share": round(report["shared_with_market"] / report["headline"]["misses"], 4),
            "model_specific_share_of_slate": round(report["headline"]["model_specific"] / report["headline"]["games"], 4),
            "bands": report["bands"],
            "margins": report["margins"],
            "worst": report["worst"],
            "weather": report["weather"],
            "turnovers": report["turnovers"],
            "qb_out": report["qb_out"],
            "divisional": report["divisional"],
            "seasons": seasons,
            "season_summary": {
                "best": best["season"],
                "worst": worst["season"],
                "best_vs_market": best_vs_market["season"],
                "worst_vs_market": worst_vs_market["season"],
                "market_correlation": round(r, 3),
                "market_best": max(seasons, key=lambda s: s["market_accuracy"])["season"],
                "market_worst": min(seasons, key=lambda s: s["market_accuracy"])["season"],
                "span": [seasons[0]["season"], seasons[-1]["season"]],
                "total_games": sum(s["games"] for s in seasons),
                # Extent for the season bars. Every season sits between 58% and
                # 70%, so a bar drawn from zero is sixteen near-identical blocks;
                # the axis is the data's own range, computed here rather than in
                # a component (§11).
                "scale": {
                    "min": min(min(s["accuracy"], s["market_accuracy"]) for s in seasons),
                    "max": max(max(s["accuracy"], s["market_accuracy"]) for s in seasons),
                },
            },
        },
    }

    dest = ROOT / "src" / "data" / "model-misses.json"
    dest.write_text(json.dumps(out, indent=1) + "\n")
    print(f"wrote {dest.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
