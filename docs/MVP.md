# Turbok – MVP-scope

Detta dokument definierar exakt vad som ska levereras i första versionen, med geografiskt fokus på **Abisko–Kebnekaise–Nikkaluokta**.

## Geografisk pilot

### Korridor

Abisko → Nikkaluokta via Kungsleden och relevanta alternativ, inklusive:

| Plats / segment | Typ |
| --- | --- |
| Abisko | Start, transport |
| Abiskojaure | Stuga |
| Alesjaure | Stuga |
| Tjäktja | Stuga |
| Sälka | Stuga |
| Singi | Stuga |
| Kebnekaise | Mål/avstickare |
| Nikkaluokta | Mål, transport |
| Vistas | Stuga (avstickare) |
| Nallo | Stuga (avstickare) |

### Alternativa sträckor (minst i dataset)

- **Standard:** Alesjaure → Tjäktja → Sälka
- **Vistas/Nallo:** Alesjaure → Vistas → Nallo → Sälka
- Relevanta pass, broar, rastskydd, vad, tältplatser

### Kvalitetskrav

Hög kvalitet på litet område före geografisk expansion. Varje segment ska ha geometri, distans, ascent/descent och minst grundläggande metadata.

---

## P0 – Första release (måste fungera)

### Konto

- [ ] Skapa konto (email + lösenord)
- [ ] Logga in / logga ut
- [ ] Session via säkra cookies

> **Email-verifiering** ingår inte i P0. Milestone 1 levererar register/login/logout/session utan verifieringsflöde. Verifierad email krävs **före publik beta** (se nedan).

### Planera

- [ ] Skapa tur (namn, datum, start, mål, typ)
- [ ] Visa karta (MapLibre, pilotområde)
- [ ] Välj start och mål på karta
- [ ] Bygga rutt längs trail graph
- [ ] Lägga till waypoints
- [ ] Dela upp i dagsetapper
- [ ] Flytta daggränser (automatisk omberäkning)
- [ ] Lägga till vilodag

### Beräkna

- [ ] Distans per dag och totalt
- [ ] Stigning / nedstigning
- [ ] Höjdprofil
- [ ] Uppskattad gångtid

### Information

- [ ] Visa relevanta platser längs rutten
- [ ] Grundläggande stugdata (namn, plats, butik ja/nej)
- [ ] Officiella alerts (manuellt kuraterade initialt)
- [ ] Egna anteckningar per dag

### Turblad (PDF)

- [ ] Generera A4 PDF
- [ ] Ett blad per vandringsdag
- [ ] Karta per dag (korrekt etapp)
- [ ] Metrics (km, höjd, tid)
- [ ] Viktiga punkter längs sträckan
- [ ] Anteckningsfält
- [ ] Fungerar i svartvitt / dubbelsidig utskrift

### Spara

- [ ] Turer sparas på konto
- [ ] Turer kan redigeras senare
- [ ] Private by default

---

## P1 – Efter fungerande planner/PDF

- [ ] Publicera tur (visibility: public)
- [ ] Dela via unik länk (shared)
- [ ] Kopiera publicerad tur ("Använd som utgångspunkt")
- [ ] Kommentarer på segment/platser
- [ ] Betyg (strukturerat)
- [ ] Bilduppladdning (EXIF-strip)
- [ ] Tips på segment och platser
- [ ] Condition reports med expiration
- [ ] Grundläggande discovery (turer, segment, platser)

---

## Explicit utanför MVP

Se `PRODUCT_SPEC.md` §62. Särskilt:

- Forum, messaging, followers, feed
- Turn-by-turn navigation, SOS, live tracking
- Bokning, marknadsplats
- Automatisk AI-guide
- Hela Sverige / Norge / Finland
- A5-format (P2)
- Offline-PWA (P2)
- SMHI route weather (P2)
- Transportintegrationer live (P2; manuella poster OK i P0)

---

## North-star metric

**Completed Trip Plan:**

1. Användaren skapar tur
2. Minst två dagsetapper
3. Sparar tur
4. Genererar Turblad/PDF

---

## Kritiska användarresor (acceptanskriterier)

### Journey A – första turen (< 10 min)

1. Besök Turbok → skapa konto → ny tur
2. Välj Abisko → Nikkaluokta via Alesjaure/Sälka
3. Dela upp i dagar, se km/höjdmeter
4. Lägg in Nallo som alternativ, jämför
5. Spara

### Journey B – Turblad

1. Öppna färdig tur → Skapa Turblad → A4
2. Preview → generera PDF → ladda ner
3. PDF komplett utan manuell efterredigering

### Journey C – kopiera tur (P1)

1. Utforska → öppna publicerad tur
2. "Använd som utgångspunkt" → privat kopia
3. Ändra datum och etapper → spara

### Journey D – bidra (P1)

1. Öppna segment → betygsätt → kort kommentar → bild
2. Publicera på < 1 minut

---

## Definition of Done – privat beta

Produkten är redo för privat beta när P0 ovan är uppfyllt plus:

- [ ] **Email-verifiering** implementerad (verifieringstoken, endpoint, mailadapter)
- [ ] Abisko–Nikkaluokta-dataset finns i databasen
- [ ] Karta renderas korrekt i pilotområdet
- [ ] Databasbackup konfigurerad (daglig, 30 dagar retention)
- [ ] Produktion deployas automatiskt från GitHub (`main`)
- [ ] `/health` och `/ready` svarar korrekt
- [ ] Kritiska flöden täcks av E2E-test (Journey A + B)
