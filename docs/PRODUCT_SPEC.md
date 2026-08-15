# Turbok – Produkt- och teknisk specifikation v1.0

**Status:** Initial produktspecifikation  
**Produkt:** Turbok  
**Plattform:** Web/PWA först  
**Utveckling:** Cursor / GitHub  
**Drift:** Egen VPS/server  
**Primär marknad v1:** Sverige, med fokus på flerdagarsvandring i fjällen  
**Första geografiska pilot:** Abisko–Kebnekaise–Nikkaluokta med relevanta alternativa sträckor

---

## 1. Produktidé

Turbok är ett planeringsverktyg för människor som tycker att **själva planeringen är en del av vandringen**.

Användaren ska kunna bygga sin egen flerdagarstur på karta, prova olika vägval, dela upp turen dag för dag och få fram all relevant information om varje sträcka.

När planeringen är klar ska Turbok kunna skapa ett **utskriftsvänligt turhäfte med ett blad per dag**.

Grundprincipen är:

> **Använd tekniken hemma för att kunna använda mindre teknik ute.**

Turbok ska därför inte i första hand konkurrera med Garmin, Min Karta eller andra navigationsappar. Produkten ska vara bäst **före turen**.

---

## 2. Produktlöfte

Turbok ska hjälpa användaren gå från:

> "Jag funderar på att gå från Abisko till Nikkaluokta."

till:

> "Här är min färdiga tur, dag för dag, med karta, distans, höjd, vägval, stugor, proviantering, transporter, viktiga platser, tips och all information jag vill ta med mig."

Användaren ska själv fatta besluten. Turbok ska hjälpa användaren att **undersöka, förstå, jämföra och dokumentera** alternativen.

---

## 3. Målgrupp

### Primär målgrupp

Självständiga vandrare som:

- planerar flerdagarsturer själva
- uppskattar själva planeringen
- använder karta och andra källor inför turen
- kombinerar idag flera verktyg, webbplatser, böcker och forum
- vill kunna göra egna vägval
- ofta vill använda mobilen relativt lite ute
- vandrar solo eller i mindre sällskap

Solo är en viktig initial persona men Turbok ska **inte tekniskt eller varumärkesmässigt begränsas till solovandrare**.

### Sekundära målgrupper (senare)

- par och vänner, familjer
- tältvandrare, stugvandrare
- led- och oledatvandring
- långdistansleder i hela Sverige
- Norge och Finland

---

## 4. Problemet

Planering av en flerdagarstur sker idag ofta genom en kombination av:

- fysisk fjällkarta, Min Karta, Calazo, Garmin Explore
- guideböcker, STF, SMHI/Yr, Google, Facebook, forum, bloggar
- transportföretag, egna anteckningar, Excel/Google Sheets/papper

Informationen finns, men är fragmenterad. Dessutom försvinner mycket värdefull vandrarkunskap i Facebooktrådar, bloggar och forum.

Exempel: *"Vistas–Nallo är en av de finaste sträckorna jag gått."* — värdefull information som idag inte är strukturellt kopplad till sträckan. Turbok ska göra sådan kunskap återanvändbar.

---

## 5. Produktprinciper

### 5.1 Planeringen får inte automatiseras bort

Turbok ska hjälpa användaren planera — inte planera åt användaren. Det ska vara roligt att flytta etapper, prova vägval, lägga in avstickare, jämföra alternativ, undersöka platser och läsa andras erfarenheter.

### 5.2 Karta först

Kartan är huvudarbetsytan. Informationen ska vara knuten till turer, sträckor, segment och platser — inte till ett traditionellt forum.

### 5.3 Community utan forum

Inget generellt forum i v1. Användarnas bidrag kopplas till geografiska objekt (segment, platser, turer).

### 5.4 Offline-first i slutprodukten

Den färdiga planeringen ska kunna tas med som PDF, utskriven på papper, och senare offline digitalt.

### 5.5 Källor och aktualitet ska vara transparenta

Dynamisk information ska visa källa, när informationen hämtades/verifierades, och om den kan ha förändrats.

---

## 6–8. Huvudflöde, kartbaserad planering, dagsetapper

### Skapa tur

Användaren väljer **Ny tur** och anger namn, startdatum, slutdatum, startplats, mål, typ av tur (stuga/tält/blandat).

### Kartbaserad planering

- välj start/mål, lägg till waypoints, dra om rutt, avstickare, alternativa vägval
- manuell/oledad sträcka
- jämför alternativ: km, höjdmeter, gångtid, dagar, stugor, vägtyp, POI

### Dagsetapper

Dela upp i dagar; dra/flytta delningspunkter, vilodag, dagstur, transportdag, slå ihop dagar. Alla efterföljande värden räknas om automatiskt.

---

## 9. Information per dag

Varje dag får automatiskt: datum, start/mål, distans, stigning/nedstigning, högsta punkt, gångtid, karta, höjdprofil; POI längs sträckan; praktisk info (övernattning, proviant, transport, anteckningar, mat).

---

## 10–11. Platser och segment

### Place

Typer: hut, shelter, campsite, water, ford, bridge, viewpoint, waterfall, summit, pass, transport, shop, sauna, rest_place, attraction, custom.

### Segment (återanvändbart objekt)

Exempel: **Vistas → Nallo** — geometri, distans, stigning, terräng, led/oledat, kommentarer, betyg, rapporter, POI.

---

## 12–13. Turer och kopiera

`Trip` med visibility: Private | Shared | Public.

**Använd som utgångspunkt** skapar privat kopia. Originalet förändras aldrig. Systemet visar "Baserad på tur av Anna".

---

## 14–17. Community, betyg, erfarenhet vs lägesrapport, officiell info

- Community kopplad till Trip, Segment, Place — inte forum
- Femstjärnigt betyg + strukturerad info (framkomlighet, navigation, naturupplevelse)
- **Erfarenhet** = bestående; **Lägesrapport** = tidskänslig med expiration och bekräftelse
- Officiell information separerad och väger tyngre än community

---

## 18–21. Bilder, inspiration, mina turer, turblad

- Bilder kopplade till tur/segment/plats; EXIF tas bort
- Discovery: geografiskt och planeringsorienterat — inte social feed
- **Turblad:** PDF, ett blad per dag, A4/A5, svartvitt, dubbelsidigt

---

## 22–24. Dagblad och turhäfte

Dagblad: karta, höjdprofil, metrics, viktiga punkter, mål, anteckningar.

Turhäfte: framsida, översiktskarta, tidplan, transporter, kontakter.

Dynamisk info i utskrift med källa och tidstämpel. QR för att kontrollera ändringar sedan utskrift.

---

## 25–31. Datakällor (översikt)

Se `docs/DATA_SOURCES.md` för detaljer.

- **Lantmäteriet:** topografi, höjd, hydrografi, stigar, ortofoto
- **SMHI:** väder, cachelagrat
- **Naturvårdsverket:** skyddade områden
- **Länsstyrelser:** ledstatus, avstängningar
- **STF:** normaliserad stugdatabas (egen, ingen automatisk återpublicering utan avtal)
- **Trafiklab + fjälltransportörer:** kollektivtrafik och fjällspecifik transport
- **Egen redaktionell data:** egenproducerad, användargenererad eller licensierad

---

## 32–38. Teknisk arkitektur och datamodell

```text
turbok/
  apps/web, api, worker
  packages/db, domain, maps, pdf, integrations, ui
  infra/, docs/
```

Se `docs/ARCHITECTURE.md`.

Kärntabeller: users, sessions, trips, trip_days, trip_segments, trip_places, trail_nodes, trail_segments, places, ratings, comments, photos, condition_reports, official_alerts, huts, transports, data_sources, pdf_exports.

---

## 39–44. Entiteter och media

- Trip: draft | planned | completed | archived
- Trip day: dagnummer, metrics, anteckningar
- Comment: target_type trip | segment | place; ingen HTML
- Rating: en aktiv per objekt/besök
- Condition report: category, expires_at, status
- Media: StorageProvider (lokal → S3/MinIO); MIME, storlek, thumbnails, EXIF-strip

---

## 45–51. PDF, job queue, auth, behörighet, admin, sök

- PDF: HTML/CSS + Playwright (worker)
- Job queue: pg-boss (PDF, thumbnails, imports, weather, sync)
- Auth MVP: email/lösenord, Argon2id, server-side session cookies
- Roller: user, moderator, editor, admin
- Sök: PostgreSQL full-text + trigram

---

## 52–61. Drift, deploy, backup, observability, säkerhet, integritet, moderering

- VPS: Ubuntu, Docker Compose, Caddy
- Services: reverse-proxy, web, api, worker, postgres-postgis
- GitHub Actions deploy från `main`; `/health`, `/ready`
- Backuper: PostgreSQL daglig (30 dagar), media, off-site
- HTTPS, HSTS, rate limiting, CSRF, inga hemligheter i repo
- Turer private by default; radera konto, exportera data
- Moderering: report, hide, remove, suspend

---

## 62. Vad Turbok INTE ska göra i MVP

Forum, messaging, followers, social feed, likes, challenges, badges, träningsstatistik, turn-by-turn, SOS, live tracking, bokningsplattform, marknadsplats, automatisk AI-guide.

---

## 63–66. MVP-scope

### P0 (första release)

Konto, planera tur på karta, dagsetapper, beräkna distans/höjd/gångtid, visa platser/stugor/alerts, generera A4 PDF (ett blad/dag), spara turer.

### P1

Publicera, dela, kopiera tur, kommentarer, betyg, bilder, condition reports, discovery.

### P2/P3

Se full lista i originalspec — A5, offline-PWA, transport, SMHI route weather, native apps, m.m.

---

## 67. Första geografiska dataset

**Abisko–Nikkaluokta-korridoren** med hög kvalitet på litet område före expansion.

Minst: Abisko, Abiskojaure, Alesjaure, Tjäktja, Sälka, Singi, Kebnekaise, Nikkaluokta, Vistas, Nallo + alternativa segment, pass, broar, rastskydd, transporter, POI.

---

## 68–73. Metrik, användarresor, definition of done

**North-star:** Completed Trip Plan (skapa tur → minst 2 dagsetapper → spara → generera PDF).

**Journey A:** första tur på <10 minuter.  
**Journey B:** Turblad utan manuell efterredigering.  
**Journey C:** kopiera publicerad tur.  
**Journey D:** bidra med tips på <1 minut.

**Private beta DoD:** konto, dataset, karta, rutt, dagar, metrics, stugdata, PDF, backup, auto-deploy, healthcheck, E2E.

---

## 74. Cursor-arbetsprinciper

Milstolpar 1–10 (se README). Ingen P2/P3 innan P0 end-to-end.

---

## 75–76. Designregel och produktdefinition

> Hjälper detta användaren planera en bättre tur eller bevara kunskap som hjälper nästa vandrare?

**Turbok** = kartbaserat planeringsverktyg för självplanerade flerdagarsvandringar. **Planera digitalt. Vandra analogt.**
