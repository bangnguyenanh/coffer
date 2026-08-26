#!/usr/bin/env bash
# Coffer harness — the enforcement layer.
#
# Runs after every Edit/Write. Turns things that used to be prose an agent had
# to write into an exit code nobody has to read:
#
#   R1  no divide-by-100   VND is exponent 0 — one integer unit is one đồng
#   R2  no toFixed         same reason: there is no subunit to round to
#   TC  typecheck          tsc -b, incremental
#
# Comment lines are stripped first, so the money module can document these rules
# in prose without tripping the rule it documents.
#
# Design note, and it is the point of the file: every check here is expressible
# as an exit code, costs ~1s, and consumes zero agent turns. A check that needs
# a browser does NOT belong here — see .claude/agents/app.md, "Verification bar".
#
# Portable: no absolute paths. Registered as
#   "$CLAUDE_PROJECT_DIR/.claude/hooks/post-edit-check.sh"

set -uo pipefail

# A harness that is silently off is worse than no harness: say so, don't block.
if ! command -v jq >/dev/null 2>&1; then
  echo "harness: jq not found — post-edit checks are OFF (brew install jq)" >&2
  exit 0
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP="$ROOT/../projects/app"

f="$(jq -r '.tool_input.file_path // .tool_response.filePath // empty')"
[ -n "$f" ] || exit 0
case "$f" in */projects/app/src/*) ;; *) exit 0 ;; esac
case "$f" in *.ts|*.tsx) ;; *) exit 0 ;; esac
[ -f "$f" ] || exit 0

code="$(grep -vE '^[[:space:]]*(//|/\*|\*)' "$f")"
fail=""
printf '%s' "$code" | grep -qE '/[[:space:]]*100([^0-9]|$)' \
  && fail="${fail}R1 divide-by-100 — VND is exponent 0, one unit is one đồng. There is no /100 in this product.\n"
printf '%s' "$code" | grep -qE 'toFixed[[:space:]]*\(' \
  && fail="${fail}R2 toFixed — amounts are integers; there is no subunit to round to.\n"

if [ -n "$fail" ]; then
  printf 'money contract violated in %s\n%b' "$f" "$fail" >&2
  exit 2
fi

if [ ! -d "$APP/node_modules/typescript" ]; then
  echo "harness: typescript not installed in projects/app — typecheck SKIPPED (npm install)" >&2
  exit 0
fi

if ! tc="$(cd "$APP" && npx --no-install tsc -b 2>&1)"; then
  printf 'typecheck failed\n%s\n' "$tc" >&2
  exit 2
fi
exit 0
