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
/login, /register     Auth (email/password + Google + Apple buttons)
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
- Multi-provider auth: password, Google OIDC, Apple OIDC → gemensam server-side Turbok-session
- Rate limiting per IP och per användare
- Strukturerad JSON-loggning med request id

### Autentisering

Turbok-sessioner är **alltid** server-side (`sessions`-tabell + HttpOnly-cookie). Provider-token används endast under callback-verifiering, aldrig som applikationssession.

#### Email + password

- Argon2id för `auth_identities.password_hash` (endast `provider = password`)
- `POST /api/v1/auth/register`, `POST /api/v1/auth/login`
- **`provider_subject`** = normaliserad email (deterministisk; se **Password identity** nedan)
- Auth-lookup via `auth_identities`, **inte** via `users.primary_email`

#### Google (OAuth 2.0 / OIDC)

- Authorization Code flow
- `GET /api/v1/auth/google/start` → redirect till Google
- `GET /api/v1/auth/google/callback` → verifiera token, skapa/hitta user via `provider_subject`
- Krav: `state`, `nonce`, PKCE där tillämpligt; verifiera issuer, audience/client_id, signatur, expiry
- **Identitet = verifierat OIDC `sub`** — email är metadata/signal, inte identitetsnyckel
- Google-token får **aldrig** bli Turbok-session

#### Sign in with Apple (OIDC)

- Authorization Code flow
- `GET /api/v1/auth/apple/start` → redirect till Apple
- `POST /api/v1/auth/apple/callback` (Apple kräver POST för callback)
- Krav: `state`, `nonce`; verifiera issuer, audience/client_id, signatur, expiry
- **Identitet = Apple OIDC `sub`**; stöd **Hide My Email**
- Email/name från Apple kan vara tillgängligt endast första gången — får **inte** krävas vid senare login
- Implementationen får inte förlita sig på att Apple alltid returnerar email i callback/token
- Apple-token får **aldrig** bli Turbok-session

#### Gemensamma auth-endpoints

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/logout
GET  /api/v1/auth/me
GET  /api/v1/auth/google/start
GET  /api/v1/auth/google/callback
GET  /api/v1/auth/apple/start
POST /api/v1/auth/apple/callback
```

Session-cookie: HttpOnly, Secure (prod), SameSite=Lax, restriktiv Path/Domain.

### Password identity (normalisering)

För `provider = password`:

| Regel | Detalj |
| --- | --- |
| `provider_subject` | Normaliserad emailadress |
| Normalisering | Deterministisk: trim whitespace, lowercase hela adressen |
| Domän | Lowercase enligt ovan; ingen provider-specifik alias-normalisering (t.ex. ingen Gmail-dot-regel) |
| Unikhet | `UNIQUE(provider, provider_subject)` förhindrar dubbelregistrering av samma normaliserade email |
| Auth-nyckel | **`users.primary_email` används inte** för login/register-lookup |

### OAuth/OIDC transient state

Google- och Apple-flöden ska lagra följande **server-side** eller kryptografiskt säkert (t.ex. signerat, krypterat):

- `state`
- `nonce`
- PKCE `code_verifier` (där tillämpligt)

Krav:

| Egenskap | Krav |
| --- | --- |
| Livslängd | Kortlivat (minuter, inte timmar) |
| Användning | Single-use |
| Bindning | Bundet till specifikt auth-försök |
| Efter callback | Ogiltigförklaras omedelbart |
| Replay | Skydd mot återanvändning av samma state/nonce/code_verifier |

### Callback- och redirect-säkerhet

| Regel | Detalj |
| --- | --- |
| `redirect_uri` | Måste vara explicit allowlistad/konfigurerad (env) |
| Klientinput | Klienten får **inte** skicka valfri `redirect_uri` |
| Post-login redirect | Endast godkända interna destinationsvägar (allowlist); **inga open redirects** |
| Provider callback | Endast konfigurerade callback-URL:er mot Google/Apple |

### Session-säkerhet (Turbok-session)

| Regel | Detalj |
| --- | --- |
| Session-id | Kryptografiskt säker slump (t.ex. 32+ bytes, hex/base64url) |
| Lagring | Server-side i `sessions`; cookie innehåller endast opaque token |
| Rotation | **Ny session skapas vid lyckad login**; gammal session invalideras om relevant |
| Provider-token | OAuth access token och ID token får **aldrig** lagras eller återanvändas som session |
| Expiry | Absolut `expires_at`; ingen sliding-only utan tydlig max-livstid |
| Logout | Raderar/invaliderar server-side session |
| Cookie HttpOnly | Ja — ej läsbar från JavaScript |
| Cookie Secure | Ja i produktion |
| Cookie SameSite | `Lax` som default |
| Cookie Path/Domain | Så restriktiva som praktiskt möjligt |

### Account linking-policy

Arkitekturen ska stödja flera `auth_identities` per `users`-rad:

```text
Pontus (user)
├── password  (auth_identity)
├── google    (auth_identity)
└── apple     (auth_identity)
```

| Scenario | Policy |
| --- | --- |
| Känd `(provider, provider_subject)` | Logga in till kopplad `user` |
| Ny provider-identitet, oinloggad | Skapa ny `user` + ny `auth_identity` |
| Ny provider-identitet, inloggad | Länka till aktuell `user` — kräver **giltig aktuell Turbok-session** + framgångsrik autentisering hos nya providern |
| Samma email från två providers | **Automatisk merge förbjuden** |
| Provider-verifierad email | Signal vid linking; inte enda bevis för att slå ihop två befintliga konton |
| Identity redan kopplad till annan `user` | **Får aldrig flyttas automatiskt** — explicit fel; account-recovery/merge-process senare |

UI för "Koppla Google/Apple" och "Ta bort inloggningssätt" byggs inte i Milestone 1, men datamodellen och API-grunden ska stödja det.

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

### Auth-tabeller (Milestone 1)

```text
users
  id              uuid PK
  primary_email   text nullable
  display_name    text nullable
  role            text NOT NULL DEFAULT 'user'
  created_at      timestamptz
  updated_at      timestamptz

auth_identities
  id                uuid PK
  user_id           uuid NOT NULL FK → users
  provider          text NOT NULL CHECK (provider IN ('password','google','apple'))
  provider_subject  text NOT NULL
  email             text nullable
  password_hash     text nullable
  created_at        timestamptz
  updated_at        timestamptz
  UNIQUE (provider, provider_subject)
  CHECK (
    (provider = 'password' AND password_hash IS NOT NULL)
    OR
    (provider IN ('google', 'apple') AND password_hash IS NULL)
  )

sessions
  id          text PK
  user_id     uuid NOT NULL FK → users
  expires_at  timestamptz NOT NULL
  created_at  timestamptz
```

**Invariants:**

- `provider` ∈ `password` | `google` | `apple`
- `provider_subject` och `user_id` alltid NOT NULL
- `password_hash` NOT NULL endast när `provider = 'password'`; NULL för google/apple
- `email` nullable (särskilt för externa providers och Hide My Email)

### Environment / secrets (auth)

Dokumenteras i `.env.example` — inga riktiga värden i repo:

```text
DATABASE_URL
SESSION_SECRET

GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI

APPLE_CLIENT_ID
APPLE_TEAM_ID
APPLE_KEY_ID
APPLE_PRIVATE_KEY      # secret; aldrig i repository
APPLE_REDIRECT_URI
```

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

Alla inloggningsvägar (password, Google, Apple) slutar i samma Turbok-sessionmodell. Se avsnittet **Autentisering** ovan.

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
- Inga lösenord, OAuth-token, Apple private keys eller PII i loggar

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
