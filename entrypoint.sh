#!/bin/sh
# Runs as root before the app starts.
# Bind mounts from the host replace the image's data dir ownership with
# whatever the host directory has (often root). Re-chown at startup so
# the bun process can write the SQLite file.
set -e
mkdir -p /app/data
chown -R bun:bun /app/data 2>/dev/null || true
exec "$@"
