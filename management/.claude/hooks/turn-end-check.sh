#!/usr/bin/env bash
# Coffer harness — the door in the enforcement layer, closed.
#
# post-edit-check.sh runs on PostToolUse "Write|Edit". This session's harness
# instructs agents to edit through Bash (sed, heredocs, short scripts) under
# bypass-permissions -- and a Bash edit fires no Write|Edit matcher, so it
# skipped the money-contract and typecheck gate entirely. Found in ticket 0005,
# 2026-08-27: fourteen source files changed, every one of them through Bash, and
# the only reason the checks ran at all is that the agent remembered to invoke
# the script by hand. That is precisely the failure the hook exists to remove.
#
# So this runs at Stop and SubagentStop -- once per turn, on whatever the turn
# actually changed, no matter which tool changed it. Same three rules:
#
#   R1  no divide-by-100   VND is exponent 0 -- one integer unit is one dong
#   R2  no toFixed         same reason: there is no subunit to round to
#   TC  typecheck          tsc -b, incremental
#
# It is a BACKSTOP, not a replacement: post-edit-check.sh still fires per edit
# and fails faster and closer to the mistake. This one guarantees no path out of
# a turn skips the gate.
#
# Cost: one `git status` plus an incremental tsc, once per turn.

set -uo pipefail

payload="$(cat)"

# A harness that is silently off is worse than no harness: say so, don't block.
if ! command -v jq >/dev/null 2>&1; then
  echo "harness: jq not found — turn-end checks are OFF (brew install jq)" >&2
  exit 0
fi

# Re-entry guard. A blocking Stop hook makes the agent continue; without this the
# second stop would block again and the turn would never end.
if [ "$(printf '%s' "$payload" | jq -r '.stop_hook_active // false')" = "true" ]; then
  exit 0
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP="$ROOT/../projects/app"
[ -d "$APP/src" ] || exit 0

# What this turn touched, tracked or not. Paths come back repo-relative, so they
# are resolved against the repo root rather than assumed to sit under $APP.
repo="$(cd "$APP" && git rev-parse --show-toplevel 2>/dev/null)" || exit 0
changed="$(cd "$repo" && git status --porcelain -- "$APP/src" 2>/dev/null | sed 's/^...//' | sed 's/.* -> //')"
[ -n "$changed" ] || exit 0

fail=""
while IFS= read -r rel; do
  [ -n "$rel" ] || continue
  f="$repo/$rel"
  case "$f" in */projects/app/src/*) ;; *) continue ;; esac
  case "$f" in *.ts|*.tsx) ;; *) continue ;; esac
  [ -f "$f" ] || continue

  code="$(grep -vE '^[[:space:]]*(//|/\*|\*)' "$f")"
  printf '%s' "$code" | grep -qE '/[[:space:]]*100([^0-9]|$)' \
    && fail="${fail}R1 divide-by-100 in ${rel} — VND is exponent 0, one unit is one đồng. There is no /100 in this product.\n"
  printf '%s' "$code" | grep -qE 'toFixed[[:space:]]*\(' \
    && fail="${fail}R2 toFixed in ${rel} — amounts are integers; there is no subunit to round to.\n"
done <<< "$changed"

if [ -n "$fail" ]; then
  printf 'money contract violated — this turn changed files that break it\n%b' "$fail" >&2
  exit 2
fi

if [ ! -d "$APP/node_modules/typescript" ]; then
  echo "harness: typescript not installed in projects/app — typecheck SKIPPED (npm install)" >&2
  exit 0
fi

if ! tc="$(cd "$APP" && npx --no-install tsc -b 2>&1)"; then
  printf 'typecheck failed at end of turn\n%s\n' "$tc" >&2
  exit 2
fi
exit 0
