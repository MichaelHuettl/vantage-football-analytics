#!/bin/bash
# Pull both feeds on a timer, for a repo that has no git remote.
#
# STATE.md open item 1: .github/workflows/news.yml is correct and committed, but
# GitHub Actions only runs on GitHub and this repo is local-only, so it has never
# run once. The feeds are as fresh as the last time someone typed the command.
# This is that someone, on a launchd timer.
#
# It writes only the two JSON files the fetch scripts already write, and it never
# commits. The repo is local, and a bot commit every half hour would bury the
# reasoning `git log` is supposed to carry (STATE.md, "Start here").
#
# Nitter blocks X periodically, so a beat failure is logged and tolerated rather
# than fatal — that section goes stale rather than empty, which is the behaviour
# fetch-beat.mjs is already written for.
#
# launchd starts with almost no PATH, so node is addressed absolutely. Override
# with NODE_BIN if this machine's node ever moves.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_BIN="${NODE_BIN:-/opt/homebrew/bin/node}"
LOG="${VANTAGE_FEED_LOG:-$HOME/Library/Logs/vantage-feeds.log}"
MAX_LOG_LINES=2000

mkdir -p "$(dirname "$LOG")"

# Dated in Eastern, not UTC. An evening run stamped in UTC reads as tomorrow,
# which is the exact failure a freshness stamp exists to prevent (STATE.md).
stamp() { TZ=America/New_York date "+%Y-%m-%d %H:%M:%S %Z"; }
log() { echo "[$(stamp)] $*" >> "$LOG"; }

if [ ! -x "$NODE_BIN" ]; then
  log "FAIL node not executable at $NODE_BIN — set NODE_BIN"
  exit 1
fi

cd "$ROOT" || { log "FAIL cannot cd to $ROOT"; exit 1; }

log "start"

if out=$("$NODE_BIN" scripts/fetch-news.mjs 2>&1); then
  log "news  ok  $(echo "$out" | tail -2 | tr '\n' ' ')"
else
  log "news  FAILED  $(echo "$out" | tail -3 | tr '\n' ' ')"
fi

# Tolerated on purpose — see the header.
if out=$("$NODE_BIN" scripts/fetch-beat.mjs 2>&1); then
  log "beat  ok  $(echo "$out" | tail -2 | tr '\n' ' ')"
else
  log "beat  failed (tolerated)  $(echo "$out" | tail -2 | tr '\n' ' ')"
fi

log "done"

# Keep the log from growing without bound.
if [ "$(wc -l < "$LOG")" -gt "$MAX_LOG_LINES" ]; then
  tail -n "$MAX_LOG_LINES" "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
fi
