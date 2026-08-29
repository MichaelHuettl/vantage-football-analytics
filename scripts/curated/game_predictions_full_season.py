#!/usr/bin/env python
"""Export a full-season game-prediction payload, all 18 weeks.

    ~/Desktop/nflverse-data/.venv/bin/python \
        scripts/curated/game_predictions_full_season.py

Writes `src/data/game-predictions.json` directly.

## Why this script exists instead of the pipeline's own exporter

`~/Desktop/nflverse-data/export_dashboard_payload.py` emits **one week** — the
next unplayed one. That is not an oversight. `FeatureEngineer._prepare_scoring_frame`
filters the scoring frame to the first unplayed week per season, and its author
wrote the reason into the docstring:

    Beyond that horizon both teams' rolling state is stale by construction
    (no results exist to update it), so scoring week N+2 would silently reuse
    week N+1's features. Restricting the frame makes that limit explicit.

That pipeline belongs to a peer session which has asked twice not to have its
Python edited, and for payload changes to come through the operator. He asked
for the full season on 2026-08-28 after the trade-off below was put to him.

So this script **does not modify a single file in that repo**. It imports the
package, replaces `_prepare_scoring_frame` on the class for the duration of one
process, and writes its output into this repo. Their working tree is untouched
and their own exporter still behaves exactly as before.

## What the extra weeks actually are, and why the payload says so

Every team's rolling form features are identical across all 18 weeks, because
no 2026 game has been played and there is nothing to update them with. What
varies week to week is the opponent, rest days, venue, and the market line
where one exists. So week 12's forecast is this-team-versus-that-team at
preseason strength, not a forecast informed by anything that happens in between.

**The accuracy figures on the page were measured on next-week predictions.**
Printing them beside an 18-weeks-ahead forecast without qualification would be
quoting a number measured under different conditions, which is the failure this
project keeps catching. Every game therefore carries `features_current`, true
only for the first unplayed week, and the payload carries `forecast_horizon`
naming that week. The site prints a caveat on every other week off that flag.

Re-run after any pipeline change, and re-check that the docstring quoted above
still says what it says — if the peer session lifts the restriction properly,
this script should be deleted in favour of their exporter.
"""
from __future__ import annotations

import json
import logging
import os
import sys
from pathlib import Path

PIPELINE_DIR = Path.home() / "Desktop" / "nflverse-data"
OUT = Path(__file__).resolve().parents[2] / "src" / "data" / "game-predictions.json"


def main() -> int:
    if not PIPELINE_DIR.exists():
        raise SystemExit(f"prediction pipeline not found at {PIPELINE_DIR}")
    sys.path.insert(0, str(PIPELINE_DIR))
    # Their config uses paths relative to the repo root (`schedules/games.csv`,
    # `artifacts/`), so the process has to run from there. OUT is absolute and
    # was resolved before the chdir, so the payload still lands in this repo.
    os.chdir(PIPELINE_DIR)

    import pandas as pd
    from nfl_predictor import NFLPredictionPipeline, PipelineConfig
    from nfl_predictor.feature_engineer import FeatureEngineer
    import export_dashboard_payload as exporter

    logging.basicConfig(level=logging.WARNING)

    # ---- the one override, applied to the class rather than the file ----
    original = FeatureEngineer._prepare_scoring_frame

    def all_unplayed_weeks(self, scheduled: "pd.DataFrame") -> "pd.DataFrame":
        """Every unplayed game, not just the first week of each season."""
        if scheduled.empty:
            return scheduled
        return scheduled.sort_values("kickoff").reset_index(drop=True)

    FeatureEngineer._prepare_scoring_frame = all_unplayed_weeks
    try:
        cfg = PipelineConfig()
        # Keep their artifacts directory out of it: this run is for the site.
        pipeline = NFLPredictionPipeline(cfg)
        pipeline.run()
        payload = exporter.build_payload(pipeline)
    finally:
        FeatureEngineer._prepare_scoring_frame = original

    games = payload.get("games", [])
    if not games:
        raise SystemExit("pipeline returned no scheduled games")

    weeks = sorted({g["week"] for g in games})
    horizon = weeks[0]

    # Mark what is and is not built on current form, per game and once at the
    # top, so the site never has to infer it from the week number.
    for g in games:
        g["features_current"] = g["week"] == horizon
    payload["forecast_horizon"] = {
        "current_week": horizon,
        "weeks": weeks,
        "note": (
            "Only week "
            f"{horizon} is scored on current form. No 2026 game has been played, "
            "so every team's rolling features are identical across the later "
            "weeks; those forecasts vary only by opponent, rest, venue and the "
            "market line. The accuracy figures on this page were measured on "
            "next-week predictions and do not describe them."
        ),
    }

    OUT.write_text(json.dumps(payload, indent=2))
    kb = OUT.stat().st_size / 1024
    print(f"wrote {OUT} ({kb:.1f} KB)")
    print(f"  {len(games)} games across weeks {weeks[0]}-{weeks[-1]} ({len(weeks)} weeks)")
    print(f"  scored on current form: week {horizon} only "
          f"({sum(1 for g in games if g['features_current'])} games)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
