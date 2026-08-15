# Milestone 1 – Repository, infra, auth, PostGIS

Detta dokument är **bootstrap-prompten** för första kodmilstolpen. Kör denna som en enda Cursor-uppgift när dokumentationen är på plats.

## Mål

Etablera monorepo-grunden så att Milestone 2 (karta + trail dataset) kan byggas ovanpå en fungerande, deploybar bas.

**Leverans:** En utvecklare kan köra hela stacken lokalt med Docker, registrera/logga in via email+lösenord, Google eller Apple, och API svarar `/health` + `/ready`.

## Före du börjar

Läs:

- `docs/PRODUCT_SPEC.md` (särskilt auth §45–51)
- `docs/ARCHITECTURE.md` (autentisering, account linking, datamodell)
- `docs/MVP.md` (P0-krav för auth)
- `.cursor/rules/turbok-auth.mdc`

Följ `.cursor/rules/` — ingen scope creep.

## Uppgift

### 1. Monorepo-bootstrap

Skapa pnpm workspace med:

```text
turbok/
  package.json              # root workspace
  pnpm-workspace.yaml
  apps/
    web/                    # Next.js 15+, App Router, Tailwind
    api/                    # Fastify, TypeScript
    worker/                 # pg-boss consumer (skelett)
  packages/
    db/                     # Kysely, migrations, PostGIS setup
    domain/                 # tom initially, exportera typer
    ui/                     # tom initially
  infra/
    docker-compose.yml      # postgres-postgis, api, web, worker (dev)
    docker-compose.prod.yml # skelett för VPS
    Caddyfile               # skelett
  .github/
    workflows/ci.yml        # lint, typecheck, test, build
```

**Krav:**

- TypeScript strict i alla paket
- Delade ESLint/Prettier-config i root
- Inga hemligheter i repo; `.env.example` med alla variabler dokumenterade (se § Environment)

### Lokal utveckling (två lägen)

**Canonical — hela stacken i Docker:**

```bash
cp .env.example .env
docker compose -f infra/docker-compose.yml up --build
```

Detta startar postgres, api, web och worker. Ingen separat `pnpm dev` krävs.

**Fast dev — valfritt, för snabbare iteration:**

```bash
docker compose -f infra/docker-compose.yml up -d postgres
pnpm install
pnpm db:migrate
pnpm dev          # startar web (:3000) + api (:3001) på hosten
```

PostgreSQL körs i Docker; applikationerna körs på hosten med hot reload.

### 2. PostgreSQL + PostGIS

- Docker image: `postgis/postgis:16-3.4` (eller senare stabil)
- Verifiera PostGIS: `SELECT PostGIS_Version();`
- Första migration: `users`, `auth_identities`, `sessions` (se nedan)

### 3. Databasschema (Milestone 1 scope)

Separera Turbok-konto från inloggningssätt.

```sql
-- users: Turbok-kontot/personen (ingen password_hash)
CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_email text,
  display_name  text,
  role          text NOT NULL DEFAULT 'user',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- auth_identities: inloggningssätt kopplade till user
CREATE TABLE auth_identities (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider          text NOT NULL CHECK (provider IN ('password', 'google', 'apple')),
  provider_subject  text NOT NULL,
  email             text,
  password_hash     text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_subject),
  CHECK (
    (provider = 'password' AND password_hash IS NOT NULL)
    OR
    (provider IN ('google', 'apple') AND password_hash IS NULL)
  )
);

-- sessions: server-side Turbok-sessioner
CREATE TABLE sessions (
  id            text PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at    timestamptz NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sessions_user_id_idx ON sessions(user_id);
CREATE INDEX sessions_expires_at_idx ON sessions(expires_at);
CREATE INDEX auth_identities_user_id_idx ON auth_identities(user_id);
```

**Regler och DB-invariants:**

- `provider` ∈ `password` | `google` | `apple`; `provider_subject` och `user_id` NOT NULL
- `password_hash` NOT NULL endast när `provider = 'password'`; NULL för google/apple (enforced by CHECK)
- `email` nullable för externa providers
- `UNIQUE (provider, provider_subject)` förhindrar dubbla provider-identiteter

**Password identity (`provider = password`):**

- `provider_subject` = **normaliserad email** (deterministisk)
- Normalisering: trim whitespace, lowercase hela adressen
- **Ingen** provider-specifik alias-normalisering (t.ex. ingen Gmail-dot-regel)
- `UNIQUE(provider, provider_subject)` förhindrar dubbelregistrering av samma normaliserade email
- **`users.primary_email` används inte som auth-nyckel** — lookup via `auth_identities`

**Google / Apple:**

- `provider_subject` = verifierat OIDC `sub`
- Google: email är metadata, inte identitetsnyckel
- Apple: stöd Hide My Email; email/name kan saknas efter första login — får inte krävas vid senare callback

- En `user` kan ha flera `auth_identities` (password + google + apple)

> **Email-verifiering och password reset ingår inte i Milestone 1.** Krävs före publik beta (se `docs/MVP.md`).

- Migrationer via `packages/db` (SQL-filer, numrerade)
- Kysely codegen eller manuella typer

### 4. API (`apps/api`)

#### Email + password

```text
POST   /api/v1/auth/register     { email, password }
POST   /api/v1/auth/login        { email, password }
```

- Argon2id för lösenord
- Skapar `users` + `auth_identities` (provider=password) vid register
- Normalisera email enligt policy i `docs/ARCHITECTURE.md` innan lookup/insert

#### Google OAuth 2.0 / OIDC

```text
GET    /api/v1/auth/google/start
GET    /api/v1/auth/google/callback
```

- Authorization Code flow
- `state`, `nonce`, PKCE där tillämpligt
- Verifiera issuer, audience/client_id, signatur, expiry
- Google-token får **aldrig** bli Turbok-session
- Identitet = verifierat OIDC `sub` (`provider_subject`); email är metadata

#### OAuth/OIDC transient state (Google + Apple)

Lagras server-side eller kryptografiskt säkert:

- `state`, `nonce`, PKCE `code_verifier` (där tillämpligt)
- Kortlivat, single-use, bundet till auth-försök, ogiltigt efter callback, replay-skyddat

#### Callback- och redirect-säkerhet

- `redirect_uri` / `GOOGLE_REDIRECT_URI` / `APPLE_REDIRECT_URI` allowlistad via env — klienten får inte skicka valfri redirect
- Efter login: endast godkända interna destinationsvägar; inga open redirects

#### Sign in with Apple / OIDC

```text
GET    /api/v1/auth/apple/start
POST   /api/v1/auth/apple/callback
```

- Authorization Code flow (Apple kräver POST callback)
- `state`, `nonce`; verifiera issuer, audience/client_id, signatur, expiry
- Stöd **Hide My Email**; `provider_subject` (sub) är primär identitet
- Email/name kan vara tillgängligt endast första gången — får inte krävas vid senare login
- Implementationen får inte förlita sig på att Apple alltid returnerar email

#### Session-säkerhet (alla providers)

- Kryptografiskt säker session-id; lagras server-side i `sessions`
- **Rotera/skapa ny session vid lyckad login** — återanvänd inte OAuth access/ID token
- Absolut `expires_at`; invalidera vid logout
- Cookie: HttpOnly, Secure (prod), SameSite=Lax, restriktiv Path/Domain

#### Gemensamt

```text
POST   /api/v1/auth/logout
GET    /api/v1/auth/me
GET    /health
GET    /ready                      # pingar PostgreSQL
```

Alla tre auth-vägar skapar samma server-side Turbok-session (`sessions` + HttpOnly-cookie).

**Krav:**

- Session cookie: HttpOnly, Secure (prod), SameSite=Lax
- Rate limiting på auth-endpoints
- Strukturerad JSON-loggning
- Validering med zod eller liknande
- CORS konfigurerat för web-appens origin
- Account linking enligt policy i `docs/ARCHITECTURE.md`:
  - ingen auto-merge på email
  - linking till inloggad user kräver giltig session + lyckad provider-auth
  - identity som tillhör annan user flyttas aldrig automatiskt → explicit fel

### 5. Web (`apps/web`)

Sidor:

```text
/              Enkel landing ("Turbok – Planera digitalt. Vandra analogt.")
/register      Registreringsformulär (email + lösenord)
/login         Inloggning: email/lösenord + "Fortsätt med Google" + "Fortsätt med Apple"
/trips         Skyddad: "Mina turer" (tom lista, placeholder)
```

**Krav:**

- Tailwind CSS
- Auth-state via cookie (server-side session check mot API `/me`)
- Redirect till /login om oautentiserad på /trips
- Responsiv men enkel — ingen karta ännu
- Ingen provider link/unlink-UI (kommer senare)

### 6. Worker (`apps/worker`)

- pg-boss setup, ansluter till samma PostgreSQL
- Ett no-op test-jobb som loggar "worker alive"
- Körs som separat process i docker-compose

### 7. CI

GitHub Actions workflow:

```yaml
on: [push, pull_request]
jobs:
  ci:
    - pnpm install
    - pnpm lint
    - pnpm typecheck
    - pnpm test
    - pnpm build
```

### 8. Docker (dev)

`infra/docker-compose.yml`:

```text
postgres   :5432
api        :3001
web        :3000
worker     (ingen port)
```

**Canonical:** `docker compose -f infra/docker-compose.yml up --build` ska ge fungerande stack utan manuella steg utöver `cp .env.example .env`.

**Fast dev:** PostgreSQL i Docker + `pnpm dev` på hosten (se ovan).

### 9. Tester (minimum)

Externa Google/Apple-anrop **mockas** i tester. CI ska inte kräva riktiga provider-konton.

#### Email/password

- register → login → `/me` → logout
- fel lösenord → 401
- duplicate normaliserad email vid register → reject (409/conflict)
- Argon2id hash/verify (unit)
- logout invalidates session
- ny login roterar/skapar ny session

#### Google (mockad)

- lyckad callback → Turbok-session skapad
- felaktig `state` → avvisad
- felaktig `nonce` → avvisad
- **replay av redan använd state** → avvisad
- callback med fel redirect/state → avvisad
- ogiltig token → avvisad
- `provider_subject` redan kopplad till annan user → får inte flyttas; explicit fel

#### Apple (mockad)

- lyckad callback → Turbok-session skapad
- Hide My Email-scenario (relay-email, stabil `sub`; email saknas vid uppföljande login)
- felaktig `state` → avvisad
- felaktig `nonce` → avvisad
- **replay av redan använd state** → avvisad
- callback med fel redirect/state → avvisad
- ogiltig token → avvisad
- `provider_subject` redan kopplad till annan user → får inte flyttas; explicit fel

#### Övrigt

- `/ready` returnerar 200 när DB är uppe

### 10. Environment / secrets

Dokumentera i `.env.example` (inga riktiga värden):

```text
DATABASE_URL=postgres://turbok:turbok@localhost:5432/turbok
SESSION_SECRET=

# API
API_HOST=0.0.0.0
API_PORT=3001
WEB_ORIGIN=http://localhost:3000
NODE_ENV=development

# Web
NEXT_PUBLIC_API_URL=http://localhost:3001

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3001/api/v1/auth/google/callback

# Sign in with Apple
APPLE_CLIENT_ID=
APPLE_TEAM_ID=
APPLE_KEY_ID=
APPLE_PRIVATE_KEY=          # secret; aldrig i repository
APPLE_REDIRECT_URI=http://localhost:3001/api/v1/auth/apple/callback
```

`APPLE_PRIVATE_KEY` hanteras som secret (miljövariabel / secrets manager) — aldrig committad.

### 11. Dokumentation och Cloud Agent

Uppdatera `README.md` med båda utvecklingslägena och auth-metoder.

Uppdatera `.cursor/environment.json`:

```json
{
  "name": "turbok",
  "install": "pnpm install && pnpm db:migrate"
}
```

## Definition of Done

- [ ] `pnpm install && pnpm build` grönt
- [ ] **Canonical:** `docker compose -f infra/docker-compose.yml up --build` startar hela stacken
- [ ] **Fast dev:** PostgreSQL i Docker + `pnpm dev` startar web (:3000) och api (:3001) på hosten
- [ ] **Email/password:** register, login, logout, `/me` fungerar
- [ ] **Google:** start + callback skapar Turbok-session (mockade tester i CI)
- [ ] **Apple:** start + callback skapar Turbok-session; Hide My Email-scenario testat (mockat)
- [ ] Datamodell: `users`, `auth_identities`, `sessions` med `UNIQUE (provider, provider_subject)`
- [ ] Inga provider-token används som Turbok-session
- [ ] DB CHECK constraint på `auth_identities.password_hash` vs `provider`
- [ ] Session roteras vid login; logout invalidierar session
- [ ] OAuth transient state: single-use, replay-skyddat
- [ ] Inga open redirects; allowlistad `redirect_uri`
- [ ] `/health` och `/ready` svarar korrekt
- [ ] CI workflow grön på PR
- [ ] Inga secrets i repo; `.env.example` komplett
- [ ] README uppdaterad
- [ ] `.cursor/environment.json` uppdaterad

## Vad du INTE ska bygga i Milestone 1

- Karta, MapLibre, trail data
- Trip builder, dagsetapper
- PDF-generering
- Community, discovery
- Externa integrationer (SMHI, Lantmäteriet)
- Admin UI (kommer i Milestone 5)
- Produktionsdeploy till VPS (kommer i Milestone 10)
- Email-verifiering
- Password reset
- UI för provider linking/unlinking ("Koppla Google", "Ta bort inloggningssätt")

## Nästa steg efter Milestone 1

**Milestone 2:** Map + trail dataset för Abisko–Nikkaluokta-korridoren.

## Cursor-körning

---

**Implementera Milestone 1 enligt `docs/MILESTONE_1.md`.**

Skapa monorepo med apps/web (Next.js), apps/api (Fastify), apps/worker (pg-boss), packages/db (Kysely + PostGIS). Implementera multi-provider auth: email/lösenord (Argon2id), Google OIDC, Apple OIDC — med `users` + `auth_identities` + `sessions`. Alla vägar skapar server-side Turbok-session. Mockade provider-tester i CI. Docker Compose, lint/typecheck/test/build. Uppdatera README och `.cursor/environment.json`.

Följ `docs/PRODUCT_SPEC.md`, `docs/ARCHITECTURE.md`, `.cursor/rules/turbok-auth.mdc`. Bygg inte karta, trips, PDF, email-verifiering eller provider-linking-UI.

---
