# Turbok – Teknisk arkitektur

Detta dokument beskriver den rekommenderade tekniska strukturen för Turbok v1. Det kompletterar `PRODUCT_SPEC.md` §32–58.

## Översikt

```text
                    ┌─────────────┐
                    │   Caddy     │  HTTPS, TLS, reverse proxy
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌────────────┐  ┌────────────┐  ┌────────────┐
    │  apps/web  │  │  apps/api  │  │apps/worker │
    │  Next.js   │  │  Fastify   │  │  pg-boss   │
    └──────┬─────┘  └──────┬─────┘  └──────┬─────┘
           │               │               │
           └───────────────┼───────────────┘
                           ▼
                  ┌─────────────────┐
                  │ PostgreSQL      │
                  │ + PostGIS       │
                  └─────────────────┘
                           │
                  ┌────────┴────────┐
                  ▼                 ▼
           Local/S3 storage    External APIs
           (media)              (SMHI, m.fl.)
```

## Monorepo

| Paket / app | Ansvar |
| --- | --- |
| `apps/web` | Next.js PWA: planering, karta, community UI, PDF-preview, admin |
| `apps/api` | Fastify REST `/api/v1/...`, auth, affärslogik, spatial queries |
| `apps/worker` | PDF, thumbnails, weather refresh, imports, route metrics |
| `packages/db` | Kysely, migrationer, PostGIS-typer |
| `packages/domain` | Delad affärslogik (trip, segment, metrics) |
| `packages/maps` | MapLibre-hjälpare, höjdprofil, routing-graf |
| `packages/pdf` | HTML/CSS-mallar för turblad |
| `packages/integrations` | Adapters: SMHI, Lantmäteriet, Trafiklab, m.fl. |
| `packages/ui` | Delade React-komponenter |
| `infra/` | Docker Compose, Caddy, deploy-skript |

**Verktyg:** pnpm workspaces, TypeScript strict, ESLint, Prettier.

## Frontend (`apps/web`)

- **React 19+**, **Next.js** (App Router), **Tailwind CSS**
- **MapLibre GL JS** för kartrendering
- Desktop prioriteras för planering; mobil för visa tur, kommentarer, bilder
- Server components där möjligt; client components för karta och interaktiv planering

### Viktiga routes (planerat)

```text
/                     Landing / inspiration
/login, /register     Auth
/trips                Mina turer
/trips/new            Skapa tur
/trips/[id]           Redigera/visa tur
/trips/[id]/pdf       Turblad-preview
/explore              Discovery (P1)
/admin/*              Admin (editor/moderator/admin)
```

## Backend (`apps/api`)

- **Fastify** med TypeScript
- REST under `/api/v1/`
- Session-baserad auth (HttpOnly, Secure, SameSite cookies)
- Argon2id för lösenord
- Rate limiting per IP och per användare
- Strukturerad JSON-loggning med request id

### API-grupper (planerat)

```text
/api/v1/auth/*
/api/v1/trips/*
/api/v1/trips/:id/days/*
/api/v1/segments/*
/api/v1/places/*
/api/v1/trails/*          # trail graph, routing
/api/v1/media/*
/api/v1/pdf/*
/api/v1/admin/*
/health
/ready
```

## Databas

**PostgreSQL 16+ med PostGIS 3+** — hårt krav.

### Spatial

- `geometry(Point, 4326)` för platser och noder
- `geometry(LineString, 4326)` för segment och rutter
- Proximity queries, intersection, spatial index (GIST)

### Query layer

- **Kysely** för typade queries
- SQL-filer för migrationer (`packages/db/migrations/`)
- PostGIS-specifika operationer i explicit SQL där Kysely inte räcker

### Routing

Egen vandringsgraf — inte generell bilrouting.

```text
trail_node(id, location, type)
trail_segment(id, from_node, to_node, geometry, distance_m, ascent_m, descent_m, ...)
```

Routing via pgRouting eller server-side graph traversal. Manuellt ritade segment stöds.

### Job queue

**pg-boss** i PostgreSQL — inget Redis-krav i v1.

Jobbtyper: `pdf.generate`, `media.thumbnail`, `weather.refresh`, `import.trail`, `metrics.recalculate`.

## Worker (`apps/worker`)

- Konsumerar pg-boss-jobb
- PDF: renderar HTML-mallar med Playwright/Chromium
- Media: skalning, thumbnails, EXIF-strip
- Idempotent; retry med backoff

## Media storage

```typescript
interface StorageProvider {
  put(key: string, data: Buffer, meta: MediaMeta): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}
```

MVP: lokal filsystem via Docker volume. Arkitekturen ska tillåta byte till S3/MinIO utan API-ändringar.

## PDF-generering

1. API tar emot `POST /api/v1/trips/:id/pdf`
2. Skapar pg-boss-jobb
3. Worker renderar dagblad + översikt med MapLibre static/export + höjdprofil
4. Lagrar PDF i storage; notifierar klient via polling eller webhook

Format: A4 (MVP), A5 (P2). Svartvitt-optimerade mallar.

## Autentisering och behörighet

| Roll | Rättigheter |
| --- | --- |
| `user` | Egna turer, community-bidrag |
| `editor` | Redaktionell fjälldata (platser, segment, stugor) |
| `moderator` | Community-moderering |
| `admin` | System, imports, användare |

## Observability

- `/health` — process lever
- `/ready` — kan nå PostgreSQL och kritiska tjänster
- Loggar: request id, route, status, duration, error code
- Inga lösenord, tokens eller PII i loggar

## Docker Compose (produktion)

```text
services:
  caddy       # :443 → web, api
  web         # Next.js
  api         # Fastify
  worker      # pg-boss consumer
  postgres    # PostGIS image
```

Volumes: `postgres_data`, `media_storage`.

## CI/CD

GitHub Actions på varje PR:

- lint, typecheck, unit tests, integration tests, build

Deploy till VPS från `main`:

1. Backup vid migrationsbehov
2. Build och push images
3. Pull på VPS
4. `pnpm db:migrate`
5. Restart services
6. Verifiera `/health` och `/ready`

## Säkerhet (sammanfattning)

- HTTPS only, HSTS
- Parameteriserade queries
- CSRF på state-changing endpoints
- Upload: MIME-verifiering, max storlek, EXIF-strip
- Secrets via miljövariabler — aldrig i repo
- SSH keys only på VPS

## Vad som medvetet utelämnas i v1

- Redis, Elasticsearch, GraphQL
- Mikrotjänster / Kubernetes
- Separat media-server (kan läggas till senare)
