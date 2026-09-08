# Aloft on the shared VPS. Mirrors tracker's layout: build the Next.js
# standalone output, ship only that plus static files and the migrations.
#
#   docker compose -f docker-compose.vps.yml up -d --build

# --- deps: pnpm via corepack, full install for the build ---
FROM node:22-slim AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.30.1 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# --- build: standalone server ---
FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.30.1 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Env is validated at boot from the real file; the build only needs shapes.
ENV DATABASE_URL=postgres://build:build@localhost:5432/build
ENV AUTH_SECRET=build-time-placeholder-secret-0000000000000000
ENV AUTH_GOOGLE_ID=placeholder
ENV AUTH_GOOGLE_SECRET=placeholder
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# --- runtime: standalone output, static files, migrations, entrypoint ---
# HOME must be writable: the Agent SDK's bundled claude keeps its state there.
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOME=/root
ENV DISABLE_AUTOUPDATER=1
# The whole dependency tree, not the traced subset: the Agent SDK spawns its
# platform binary (claude-agent-sdk-linux-x64) by name at runtime, which no
# tracer can follow. It has to be the only node_modules in the image: pnpm's
# tree is symlinks, and copying it over the standalone's real directories
# fails on the first collision. So take just the server from the standalone.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next/standalone/server.js ./server.js
COPY --from=build /app/.next/standalone/package.json ./package.json
COPY --from=build /app/.next/standalone/.next ./.next
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/drizzle ./drizzle
COPY scripts/migrate.mjs ./scripts/migrate.mjs
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh
EXPOSE 3000
CMD ["./docker-entrypoint.sh"]
