#!/bin/sh
set -eu

# Materialize runtime config from env so the same image works on any host.
# STORAGE_PROVIDER must mirror the host's Postiz setting ('local' | 'cloudflare').
STORAGE_PROVIDER="${STORAGE_PROVIDER:-local}"
case "$STORAGE_PROVIDER" in
  local|cloudflare) ;;
  *)
    echo "postiz-mobile: invalid STORAGE_PROVIDER='$STORAGE_PROVIDER' (use 'local' or 'cloudflare'); defaulting to local" >&2
    STORAGE_PROVIDER="local"
    ;;
esac

printf '{ "storageProvider": "%s" }\n' "$STORAGE_PROVIDER" > /srv/config.json

if [ -z "${POSTIZ_UPSTREAM:-}" ]; then
  echo "postiz-mobile: POSTIZ_UPSTREAM is required (e.g. http://host.docker.internal:4007)" >&2
  exit 1
fi

echo "postiz-mobile: storage=$STORAGE_PROVIDER upstream=$POSTIZ_UPSTREAM listen=${LISTEN_PORT:-8080}"
exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
