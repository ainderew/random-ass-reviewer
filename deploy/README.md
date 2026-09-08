# Deploying StudyDash (Aloft) to the shared VPS

Host: `194.233.79.158` (Contabo), Ubuntu 24.04, host nginx + certbot, Postgres 16 on the host, Docker for apps. SSH with the `gamedash_deploy` key.

## First time

```bash
# On the VPS
sudo -u postgres psql -c "CREATE ROLE aloft LOGIN PASSWORD '<generate>'"
sudo -u postgres psql -c "CREATE DATABASE aloft OWNER aloft"
mkdir -p /root/studydash
```

Copy the tree from a workstation (no node_modules, no .next, no .env files):

```bash
rsync -az --delete --exclude-from=.dockerignore --exclude .git ./ root@194.233.79.158:/root/studydash/
```

Write `/root/studydash/.env.production` (mode 600) from `.env.example`:

- `DATABASE_URL=postgres://aloft:<password>@host.docker.internal:5432/aloft`
- `AUTH_SECRET`, `ENCRYPTION_KEY`: 32+ random characters each
- `AUTH_URL=https://studydash.workdash.site`, `AUTH_TRUST_HOST=true`
- `AUTH_GOOGLE_ID=placeholder`, `AUTH_GOOGLE_SECRET=placeholder` until a Google OAuth client exists (email sign-in works regardless)
- `LLM_PROVIDER=anthropic-api` and `ANTHROPIC_API_KEY` for platform-paid generation, or leave the key unset and let users bring their own in settings

Then:

```bash
cd /root/studydash
docker compose -f docker-compose.vps.yml up -d --build
cp deploy/studydash.nginx.conf /etc/nginx/sites-available/studydash
ln -s /etc/nginx/sites-available/studydash /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d studydash.workdash.site
```

## Every deploy

Push to `main`. The `deploy` job in `.github/workflows/ci.yml` runs after the checks pass: it rsyncs the tree to `/root/studydash` with a dedicated CI key and runs `deploy/vps-deploy.sh` there, which builds the image, restarts the container, and waits for it to be healthy. Secrets it needs on the repo: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_KNOWN_HOSTS`.

By hand, the same two steps:

```bash
rsync -az --delete --exclude-from=.dockerignore --exclude .git --exclude .next --exclude node_modules ./ root@194.233.79.158:/root/studydash/
ssh root@194.233.79.158 bash /root/studydash/deploy/vps-deploy.sh
```

The container runs `scripts/migrate.mjs` (pg only, the same journal and hashes as drizzle-kit) on boot, then the server. Health: `https://studydash.workdash.site/api/healthz`. Watch the first boot with `docker logs -f studydash-web`.

## Still to decide

- Google OAuth: create a client with redirect URI `https://studydash.workdash.site/api/auth/callback/google`, put the id and secret in `.env.production`, restart. The button appears on its own.
- `ANTHROPIC_API_KEY`: without it, uploads ask users to add their own key in settings.
