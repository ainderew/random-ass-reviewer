#!/bin/sh
set -e
# Migrations first, from the same journal drizzle-kit uses. Then the server.
node scripts/migrate.mjs
exec node server.js
