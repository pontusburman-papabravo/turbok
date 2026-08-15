#!/bin/sh
set -e
node packages/db/dist/migrate.js
node apps/api/dist/index.js
