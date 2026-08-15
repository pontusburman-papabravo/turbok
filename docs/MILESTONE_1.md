# Milestone 1 – Repository, infra, auth, PostGIS

Detta dokument är **bootstrap-prompten** för första kodmilstolpen. Kör denna som en enda Cursor-uppgift när dokumentationen är på plats.

## Mål

Etablera monorepo-grunden så att Milestone 2 (karta + trail dataset) kan byggas ovanpå en fungerande, deploybar bas.

**Leverans:** En utvecklare kan köra hela stacken lokalt med Docker, skapa konto, logga in, och API svarar `/health` + `/ready`.

## Före du börjar

Läs:

- `docs/PRODUCT_SPEC.md` (särskilt §32–38, §47–49, §52–58)
- `docs/ARCHITECTURE.md`
- `docs/MVP.md` (P0-krav för auth)

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
- Inga hemligheter i repo; `.env.example` med alla variabler dokumenterade

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
- Första migration: `users`, `sessions` (se nedan)

### 3. Databasschema (Milestone 1 scope)

```sql
-- users
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
email         text UNIQUE NOT NULL
password_hash text NOT NULL
role          text NOT NULL DEFAULT 'user'
created_at    timestamptz NOT NULL DEFAULT now()
updated_at    timestamptz NOT NULL DEFAULT now()

-- sessions
id            text PRIMARY KEY  -- random token
user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
expires_at    timestamptz NOT NULL
created_at    timestamptz NOT NULL DEFAULT now()
```

> **Email-verifiering ingår inte i Milestone 1.** Ingen `email_verified_at`, verifieringstoken, mailadapter eller verify-endpoint. Det krävs före publik beta (se `docs/MVP.md`).

- Lösenord: Argon2id
- Migrationer via `packages/db` (SQL-filer, numrerade)
- Kysely codegen eller manuella typer

### 4. API (`apps/api`)

Endpoints:

```text
POST   /api/v1/auth/register     { email, password }
POST   /api/v1/auth/login        { email, password }
POST   /api/v1/auth/logout
GET    /api/v1/auth/me
GET    /health
GET    /ready                      # pingar PostgreSQL
```

**Krav:**

- Session cookie: HttpOnly, Secure (dev: lax OK), SameSite=Lax
- Rate limiting på auth-endpoints
- Strukturerad JSON-loggning
- Validering med zod eller liknande
- CORS konfigurerat för web-appens origin

### 5. Web (`apps/web`)

Sidor:

```text
/              Enkel landing ("Turbok – Planera digitalt. Vandra analogt.")
/register      Registreringsformulär
/login         Inloggningsformulär
/trips         Skyddad: "Mina turer" (tom lista, placeholder)
```

**Krav:**

- Tailwind CSS
- Auth-state via cookie (server-side session check mot API)
- Redirect till /login om oautentiserad på /trips
- Responsiv men enkel — ingen karta ännu

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
    - pnpm test        # minst 1 enhetstest (t.ex. password hash)
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

- Unit: Argon2id hash/verify
- Integration: register → login → /me → logout
- `/ready` returnerar 200 när DB är uppe

### 10. Dokumentation och Cloud Agent

Uppdatera `README.md` med båda utvecklingslägena (canonical Docker + optional fast dev).

Uppdatera `.cursor/environment.json` så att `install` kör riktig projektsetup:

```json
{
  "name": "turbok",
  "install": "pnpm install && pnpm db:migrate"
}
```

Detta gör att Cursor Cloud kan installera projektet automatiskt efter monorepo-bootstrap. Tills Milestone 1 är klar förblir filen documentation-only.

## Definition of Done

- [ ] `pnpm install && pnpm build` grönt
- [ ] **Canonical:** `docker compose -f infra/docker-compose.yml up --build` startar hela stacken
- [ ] **Fast dev:** PostgreSQL i Docker + `pnpm dev` startar web (:3000) och api (:3001) på hosten
- [ ] Registrering och inloggning fungerar i webbläsare
- [ ] `/health` och `/ready` svarar korrekt
- [ ] CI workflow grön på PR
- [ ] Inga secrets i repo
- [ ] README uppdaterad med lokal start (båda lägena)
- [ ] `.cursor/environment.json` uppdaterad med riktig `pnpm install` (och ev. `pnpm db:migrate`)

## Vad du INTE ska bygga i Milestone 1

- Karta, MapLibre, trail data
- Trip builder, dagsetapper
- PDF-generering
- Community, discovery
- Externa integrationer (SMHI, Lantmäteriet)
- Email-verifiering (token, mailadapter, verify-endpoint)
- Admin UI (kommer i Milestone 5)
- Produktionsdeploy till VPS (kommer i Milestone 10)

## Nästa steg efter Milestone 1

**Milestone 2:** Map + trail dataset för Abisko–Nikkaluokta-korridoren.

Prompt att använda:

> Implementera Milestone 2 enligt docs/MVP.md och docs/ARCHITECTURE.md. Lägg till MapLibre i web, trail_nodes/trail_segments i PostGIS, och rendera pilotområdets leder på kartan. Ingen trip builder ännu.

## Cursor-körning

Klistra in följande som uppgift till Cursor:

---

**Implementera Milestone 1 enligt `docs/MILESTONE_1.md`.**

Skapa monorepo med apps/web (Next.js), apps/api (Fastify), apps/worker (pg-boss), packages/db (Kysely + PostGIS). Implementera auth (email/lösenord, Argon2id, sessions — utan email-verifiering). Docker Compose för lokal utveckling. CI med lint/typecheck/test/build. Uppdatera README med startinstruktioner och `.cursor/environment.json` med riktig pnpm-install.

Följ `docs/PRODUCT_SPEC.md`, `docs/ARCHITECTURE.md` och `.cursor/rules/`. Bygg inte karta, trips eller PDF.

---
