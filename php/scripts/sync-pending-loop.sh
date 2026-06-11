#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
INTERVAL="${MOLIZHISHU_SYNC_INTERVAL:-60}"
LIMIT="${MOLIZHISHU_SYNC_LIMIT:-20}"

cd "$ROOT_DIR"

while true; do
  php think molizhishu:sync-pending --limit "$LIMIT"
  sleep "$INTERVAL"
done
