#!/usr/bin/env bash
#
# Kick off an EAS build for every customer app.
#
# Usage: ./scripts/build-all.sh [profile]
#   profile defaults to "production".
#
# Builds are submitted with --no-wait, so this returns as soon as every job
# is queued rather than serialising on EAS's build queue.

set -euo pipefail

PROFILE="${1:-production}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MOBILE_DIR="$REPO_ROOT/apps/mobile"

if ! command -v eas >/dev/null 2>&1; then
  echo "Error: the EAS CLI is not on PATH. npm i -g eas-cli" >&2
  exit 1
fi

failed=()
built=0

for dir in "$MOBILE_DIR"/*/; do
  slug="$(basename "$dir")"

  # The template is a scaffold, not a customer: it has placeholder values and
  # no EAS project, so building it would either fail or ship a grey app.
  if [ "$slug" = "template" ]; then
    continue
  fi

  echo ""
  echo "── $slug ($PROFILE) ─────────────────────────────────────────────"

  if ( cd "$dir" && eas build --platform all --profile "$PROFILE" --non-interactive --no-wait ); then
    built=$((built + 1))
  else
    # Keep going rather than aborting: one customer's expired credentials
    # should not block every other customer's release.
    failed+=("$slug")
  fi
done

echo ""
echo "Queued $built build(s)."

if [ ${#failed[@]} -gt 0 ]; then
  echo "Failed to queue: ${failed[*]}" >&2
  exit 1
fi
