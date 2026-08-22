"""
Copy the fantasy projection model's payload into the site.

    python3 scripts/curated/fantasy_model.py   # -> src/data/fantasy-model.json

Like `game-predictions.json`, this file is produced elsewhere and copied here.
The model lives at `~/Desktop/Claude Code/fantasy-model/` with its own virtual
environment — pandas, scikit-learn, twenty-seven seasons of nflverse — and this
repo has none of that. `export_site_payload.py` over there computes every
derived number and writes `artifacts/site_payload.json`; this script validates
it and writes it into `src/data/`.

**Nothing is computed here.** Not the lifts, not the correlations, not the
board orderings — they arrive settled, which is the only way a site with no
scientific Python can publish a model's output without keeping a second
implementation of its arithmetic (§11).

Re-run it after re-running the model. The site reads the copy; nothing watches
the source.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = Path.home() / "Desktop" / "Claude Code" / "fantasy-model" / "artifacts" / "site_payload.json"
DEST = ROOT / "src" / "data" / "fantasy-model.json"

POSITIONS = ("QB", "RB", "WR", "TE", "K", "DST")

# Blocks the page cannot render without. Checked rather than assumed, because a
# half-written payload fails as a missing chart rather than an error.
REQUIRED = ("config", "scoring", "positions", "backtest", "history_vs_window",
            "calibration", "coverage", "drivers", "boards", "ranking_quality",
            "board_totals", "data_span")


def main():
    if not SOURCE.exists():
        sys.exit(f"no payload at {SOURCE}\n"
                 f"run: ./.venv/bin/python export_site_payload.py in the model repo")

    payload = json.loads(SOURCE.read_text())

    missing = [k for k in REQUIRED if k not in payload]
    if missing:
        sys.exit(f"payload is missing {missing} — regenerate it")

    for pos in POSITIONS:
        if pos not in payload["positions"]:
            print(f"  WARNING: no metrics for {pos}")
        for season in ("season_2025", "season_2026"):
            board = payload["boards"].get(season, {}).get(pos)
            if not board:
                print(f"  WARNING: {season} has no {pos} board")

    span = payload["data_span"]
    cfg = payload["config"]
    print(f"  {span['player_weeks']:,} player-weeks, {span['from']}-{span['to']}")
    print(f"  trained {min(cfg['train_seasons'])}-{max(cfg['train_seasons'])}, "
          f"validated {cfg['valid_season']}, tested {cfg['test_season']}")
    print(f"  {len(payload['backtest'])} back-test rows across "
          f"{len({r['season'] for r in payload['backtest']})} seasons")
    for season in ("season_2025", "season_2026"):
        sizes = {p: len(payload["boards"][season].get(p, [])) for p in POSITIONS}
        print(f"  {season}: " + ", ".join(f"{p} {n}" for p, n in sizes.items()))

    out = {
        "schema_version": 1,
        "updated": payload.get("generated_at", "")[:10],
        "source": ("fantasy-model/export_site_payload.py — a 1-point-PPR projection "
                   "model over nflverse player-week data, copied rather than recomputed"),
        "note": ("Every figure arrives settled from the model repo. The site computes "
                 "nothing here (§11). Boards are capped at the model's own limit; the "
                 "full tables live in that repo as CSV."),
        "data": payload,
    }
    DEST.write_text(json.dumps(out, indent=1) + "\n")
    print(f"wrote {DEST.relative_to(ROOT)} ({DEST.stat().st_size/1024:.0f} KB)")


if __name__ == "__main__":
    main()
