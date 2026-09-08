#!/usr/bin/env bash
# Runs on the VPS after the source has been rsynced to /root/studydash.
# Builds the image, restarts the container, and waits for it to be healthy.
# Called by .github/workflows/ci.yml; safe to run by hand too.
set -euo pipefail
cd /root/studydash

if [ ! -f .env.production ]; then
  echo "missing /root/studydash/.env.production" >&2
  exit 1
fi

docker compose -f docker-compose.vps.yml up -d --build --remove-orphans

echo "waiting for studydash-web to be healthy"
for _ in $(seq 1 30); do
  status=$(docker inspect studydash-web --format '{{.State.Health.Status}}' 2>/dev/null || echo starting)
  if [ "$status" = "healthy" ]; then
    echo "healthy"
    docker image prune -f >/dev/null
    exit 0
  fi
  if [ "$status" = "unhealthy" ]; then
    echo "container is unhealthy" >&2
    docker logs --tail 40 studydash-web >&2
    exit 1
  fi
  sleep 5
done
echo "timed out waiting for health" >&2
docker logs --tail 40 studydash-web >&2
exit 1
