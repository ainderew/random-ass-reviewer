# Aloft

A mobile-first study app with source-backed flashcards, spaced review, focus sessions, and Toast, an interactive study cat.

Read `PRODUCT.md` for the current scope and `DESIGN.md` for the interface. The dated handoffs in `feature-plans/aloft/` are historical records.

The app has four destinations: Today, Focus, Review, and Notes. Progress opens within Review. Streaks and cat care reflect recorded study activity. The former island, currencies, XP, levels, and loot have been retired; `/island` redirects to Today. Migration `0012_retire_island.sql` removes their storage while preserving study sessions, quizzes, review history, streaks, and pet care.

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
