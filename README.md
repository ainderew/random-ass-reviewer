# Aloft

Study. Earn. Build. A web app that pays students for verified focus and real recall, spent on a persistent 3D island.

The full plan lives in `feature-plans/aloft/`. Start with `00-overview.md`.

## Run it locally

```bash
pnpm install
pnpm db:up          # Postgres 17 in Docker (databases: aloft, aloft_test)
cp .env.example .env.local   # then fill AUTH_SECRET and the Google OAuth pair
pnpm db:migrate
pnpm dev
```

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm test           # domain + ui + server (server needs the Docker DB)
pnpm test:unit      # domain + ui only
pnpm build
```

## Layers

`app -> server -> domain` and `app -> game -> domain`. `domain` imports nothing. `game` never imports `server`. ESLint enforces this.
