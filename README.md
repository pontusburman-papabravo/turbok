# Turbok

**Planera digitalt. Vandra analogt.**

Turbok är ett kartbaserat planeringsverktyg för självplanerade flerdagarstur i fjällen. Användaren bygger sin egen tur på karta, delar den i dagar och samlar relevant information om sträckor, platser, stugor och vägval. När planeringen är klar skapas ett utskriftsvänligt turhäfte med ett blad per dag.

> Använd tekniken hemma för att kunna använda mindre teknik ute.

## Status

Projektet är i **greenfield-fas**. Denna repository innehåller produktspecifikation, arkitektur och Cursor-regler. Applikationskod (monorepo) implementeras från Milestone 1.

## Dokumentation

| Dokument | Beskrivning |
| --- | --- |
| [docs/PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md) | Fullständig produkt- och teknisk specifikation v1.0 |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Teknisk arkitektur, monorepo-struktur och tjänster |
| [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md) | Externa datakällor, licenser och integrationsprinciper |
| [docs/MVP.md](docs/MVP.md) | MVP-scope: Abisko–Kebnekaise–Nikkaluokta |
| [docs/MILESTONE_1.md](docs/MILESTONE_1.md) | Bootstrap-prompt för första kodmilstolpen |

## Teknisk riktning (översikt)

- **Frontend:** React, TypeScript, Next.js, Tailwind CSS, MapLibre GL JS
- **Backend:** Fastify (TypeScript), REST `/api/v1/...`
- **Databas:** PostgreSQL + PostGIS
- **Worker:** PDF-generering, thumbnails, jobbkö (pg-boss)
- **Drift:** Egen VPS, Docker Compose, Caddy

## Monorepo (planerad struktur)

```text
turbok/
  apps/
    web/          # Next.js PWA
    api/          # Fastify REST API
    worker/       # Bakgrundsjobb
  packages/
    db/           # Kysely, migrationer
    domain/       # Affärslogik
    maps/         # Kart- och routinghjälpare
    pdf/          # Turblad-mallar
    integrations/ # SMHI, Lantmäteriet, m.fl.
    ui/           # Delade UI-komponenter
  infra/          # Docker, Caddy, deploy
  docs/
```

## Lokal utveckling

Applikationskod finns ännu inte. När Milestone 1 är implementerad:

**Canonical — hela stacken i Docker:**

```bash
cp .env.example .env
docker compose -f infra/docker-compose.yml up --build
```

**Fast dev — valfritt (PostgreSQL i Docker, appar på hosten):**

```bash
cp .env.example .env
docker compose -f infra/docker-compose.yml up -d postgres
pnpm install
pnpm db:migrate
pnpm dev
```

Tills dess: läs [docs/MILESTONE_1.md](docs/MILESTONE_1.md) och följ specen i [docs/PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md).

## Milstolpar

1. Repository + infra + auth + PostGIS
2. Map + trail dataset
3. Trip builder
4. Day planner + metrics
5. Places + huts + information
6. Turblad/PDF
7. Sharing
8. Community
9. External integrations
10. Private beta hardening

Ingen milstolpe ska påbörja P2/P3-funktionalitet innan P0-flödet fungerar end-to-end.

## Designregel

> Hjälper detta användaren planera en bättre tur eller bevara kunskap som hjälper nästa vandrare?

Om svaret är nej bör funktionen normalt inte byggas.

## Licens

TBD.
