#!/usr/bin/env bash
set -euo pipefail

# Prunes old releases in an application directory, keeping the K most recent.
# Guarded against deleting the currently active release pointed to by $APP_DIR/current.
#
# Usage: prune-releases.sh <app_dir> [keep_count]
# Example: prune-releases.sh /var/www/front 3

APP_DIR="${1:-}"
KEEP_COUNT="${2:-3}"

if [ -z "$APP_DIR" ]; then
  echo "Error: APP_DIR argument is required." >&2
  exit 1
fi

RELEASES_DIR="$APP_DIR/releases"
CURRENT_SYMLINK="$APP_DIR/current"

if [ ! -d "$RELEASES_DIR" ]; then
  echo "Error: Directory '$RELEASES_DIR' does not exist." >&2
  exit 1
fi

CURRENT_REALPATH=""
if [ -e "$CURRENT_SYMLINK" ] || [ -L "$CURRENT_SYMLINK" ]; then
  CURRENT_REALPATH=$(readlink -f "$CURRENT_SYMLINK" 2>/dev/null || true)
fi

cd "$RELEASES_DIR"

START_LINE=$((KEEP_COUNT + 1))
CANDIDATES=$(ls -1dt */ 2>/dev/null | tail -n "+$START_LINE" || true)

if [ -z "$CANDIDATES" ]; then
  echo "No releases to prune (count <= $KEEP_COUNT)."
  exit 0
fi

for old_dir in $CANDIDATES; do
  old_realpath=$(readlink -f "$old_dir" 2>/dev/null || true)
  if [ -n "$CURRENT_REALPATH" ] && [ "$old_realpath" = "$CURRENT_REALPATH" ]; then
    echo "Warning: Skipping active release: $old_dir"
    continue
  fi
  echo "Pruning old release: $old_dir"
  rm -rf "$old_dir"
done
