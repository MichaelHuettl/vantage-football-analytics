#!/usr/bin/env bash
# Interactive weekly update: run the curated workbook extractors you choose,
# verify the build, review the diff, then commit and push so Vercel deploys.
#
# Before running this for a new workbook version: update DEFAULT_WB (and, for
# weekly_rankings.py, the PUBLISHED dates) in the extractor(s) you plan to
# run. See docs/STATE.md's "Start here" section — sheet and row numbers shift
# between workbook versions, and that's a judgment call this script won't
# make for you.

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

confirm() {
    read -r -p "$1 [y/N] " reply
    [[ "$reply" =~ ^[Yy]$ ]]
}

echo "== Vantage weekly update =="
echo

if [[ -n "$(git status --porcelain)" ]]; then
    echo "Working tree is not clean:"
    git status --short
    confirm "Continue anyway?" || exit 1
    echo
fi

echo "-- pulling main (the news bot may have committed since you last pulled) --"
if ! git pull --rebase; then
    echo "git pull --rebase failed — resolve that by hand, then re-run this script."
    exit 1
fi
echo

extractors=(
    "weekly_rankings.py|Weekly rankings -> rankings/week-N.json, players.json"
    "rb_charts.py|RB charts"
    "kicker_charts.py|Kicker charts"
    "defense_charts.py|Defense charts"
    "te_charts.py|TE charts"
    "wr_charts.py|WR charts"
    "qb_charts.py|QB charts"
    "player_profiles.py|Player profiles"
    "rb_matchups.py|RB matchups (hand transcription, validated before it emits)"
    "model_misses.py|Model misses case study"
    "fantasy_model.py|Fantasy model payload (copies from ~/Desktop/Claude Code/fantasy-model/)"
    "game_predictions_full_season.py|Game predictions, all 18 weeks"
    "film_summary.py|Film summary"
)

echo "Which extractors do you want to run this week?"
for i in "${!extractors[@]}"; do
    IFS='|' read -r file desc <<< "${extractors[$i]}"
    printf "  %2d) %-32s %s\n" "$((i + 1))" "$file" "$desc"
done
echo
read -r -p 'Numbers separated by spaces (e.g. "1 5"), "all", or blank to skip extractors: ' selection
echo

selected_files=()
if [[ "$selection" == "all" ]]; then
    for entry in "${extractors[@]}"; do
        IFS='|' read -r file _ <<< "$entry"
        selected_files+=("$file")
    done
elif [[ -n "$selection" ]]; then
    for n in $selection; do
        idx=$((n - 1))
        if [[ -z "${extractors[$idx]:-}" ]]; then
            echo "Skipping invalid choice: $n"
            continue
        fi
        IFS='|' read -r file _ <<< "${extractors[$idx]}"
        selected_files+=("$file")
    done
fi

ran=()
if [[ ${#selected_files[@]} -gt 0 ]]; then
    sync_flag=""
    for f in "${selected_files[@]}"; do
        [[ "$f" == "weekly_rankings.py" ]] || continue
        confirm "Run weekly_rankings.py with --sync-players (adds new players + headshots from the nflverse roster)?" && sync_flag="--sync-players"
    done

    for f in "${selected_files[@]}"; do
        args=()
        [[ "$f" == "weekly_rankings.py" && -n "$sync_flag" ]] && args+=("$sync_flag")
        echo "-- python3 scripts/curated/$f ${args[*]} --"
        if python3 "scripts/curated/$f" "${args[@]}"; then
            ran+=("$f")
        else
            echo
            echo "$f exited non-zero — read the message above (it's usually a workbook"
            echo "correction that no longer reconciles). Fix that before re-running; nothing"
            echo "has been committed."
            exit 1
        fi
        echo
    done
else
    echo "No extractors selected — skipping straight to build/commit in case you already"
    echo "have hand-edited files staged."
    echo
fi

echo "-- verifying the site still builds --"
if ! npm run build; then
    echo
    echo "Build failed. Nothing has been committed — fix the error above and re-run."
    exit 1
fi
echo

echo "-- changes in src/data and public/img/headshots --"
if [[ -z "$(git status --porcelain -- src/data public/img/headshots)" ]]; then
    echo "Nothing changed there — nothing to commit."
    exit 0
fi
git status --short -- src/data public/img/headshots
echo
git diff --stat -- src/data public/img/headshots
echo

if confirm "Show the full diff before committing?"; then
    git diff -- src/data public/img/headshots
    echo
fi

if [[ ${#ran[@]} -gt 0 ]]; then
    joined=$(IFS=', '; echo "${ran[*]}")
    default_msg="Update $joined"
else
    default_msg="Weekly data update"
fi
read -r -p "Commit message [$default_msg]: " msg
msg="${msg:-$default_msg}"
echo

git add -- src/data public/img/headshots

if ! confirm "Commit and push to origin/main now?"; then
    echo "Left staged, not committed. Run 'git commit' yourself when ready."
    exit 0
fi

git commit -m "$msg"

echo "-- pulling once more before push (in case the news bot beat us to it) --"
git pull --rebase

git push
echo
echo "Pushed. Vercel will pick up the new commit on main and redeploy automatically."
