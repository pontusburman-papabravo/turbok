# Turbok – Datakällor

Detta dokument beskriver externa datakällor, integrationsprinciper och licenshänsyn. Se även `PRODUCT_SPEC.md` §25–31 och §50.

## Principer

1. **Spårbarhet** — varje extern datapost ska kunna besvara "varifrån kommer detta?"
2. **Transparens** — visa källa, hämtad tid, verifierad tid i UI och PDF
3. **Licens** — kontrollera aktuella villkor vid implementation; ingen automatisk återpublicering av skyddat innehåll
4. **Decay** — dynamisk information (väder, ledstatus) cachelagras med tydlig giltighetstid
5. **Separation** — officiell information visas separat från community och väger tyngre

### Källmodell (gemensam)

```text
source_id
source_name
source_url
license
external_id
retrieved_at
verified_at
```

---

## Lantmäteriet

**Primär produkt:** [Topografi 50 Nedladdning, vektor](https://geotorget.lantmateriet.se/dokument/projects/topografi-50-nedladdning-vektor/) (aktuell version t.ex. 2026.05, avgiftsfri/CC0).

**Användning:**

- Topografisk karta (visning)
- Höjdkurvor och höjddata (höjdprofil, ascent/descent)
- Hydrografi
- Stigar och topografisk fjällinformation (referenslager)
- Ortnamn
- Ortofoto (valfritt, P2)

**Viktigt — routing vs kartdata:**

Lantmäteriet Topografi 50 innehåller stigar och annan topografisk data, men Turbok ska **inte** behandla den som en komplett, auktoritativ ledgraf för routing. Turbok bygger, kuraterar och kvalitetssäkrar sin egen `trail_graph` (`trail_nodes` / `trail_segments`). Lantmäteriet-data kan användas som underlag vid import och kartvisning, men routningsbeslut och segmentmetadata ägs av Turbok.

**Implementation:**

- Kontrollera aktuell licens och produktvillkor vid implementation
- Cacha tiles/data lokalt där licens tillåter
- Ange källa i kartattribution
- Separera import av LM-stigar (referens) från Turboks kuraterade trail graph

**Risk:** licensändringar, API-begränsningar. Planera för manuell fallback (egen trail data).

---

## SMHI

**API:** [Meteorologisk prognos `SNOW1gv1`](https://www.smhi.se/data/om-smhis-data/uppdateringar-oppna-data/uppdateringar-i-smhis-oppna-data/2025-09-12-nya-apier-for-meteorologiska-prognoser-och-analyser) (aktuellt öppet API för väderprognoser).

> **Använd inte** det avvecklade API:et `PMP3gv2` (nedlagt 31 mars 2026). All implementation ska utgå från `SNOW1gv1`.

**Användning:**

- Väderprognos (temperatur, vind, nederbörd)
- Historiska observationer (P2)

**Implementation:**

- Integrera via `SNOW1gv1`-endpointen; dokumentera exakt URL och parametrar i `packages/integrations`
- Cachelagra prognoser med `retrieved_at`
- Visa inte väder utanför faktisk prognoshorisont som "planeringsunderlag"
- Uppdatera via worker-jobb (`weather.refresh`)

**I PDF:** dynamiskt block med källa och tidstämpel; QR för att kontrollera ändringar.

---

## Naturvårdsverket

**Användning:**

- Nationalparker
- Naturreservat
- Skyddade områden

**Implementation:**

- Importera som polygon-lager i PostGIS
- Koppla lokala regler till geografiska områden (visning, inte juridisk rådgivning)
- Visa källa och senaste import

---

## Länsstyrelser

**Användning:**

- Statliga leder
- Ledproblem, broproblem, avstängningar, underhåll

**Implementation:**

- Initialt: manuell kurering via admin (editor-roll)
- `official_alerts`-tabell med källa, publicerad datum, giltighet
- På sikt: adapters per länsstyrelse om API/RSS finns

---

## STF (Svenska Turistföreningen)

**Användning:**

- Fjällstugor: plats, öppettider, sängar, butik, bastu, betalning

**Implementation:**

- **Egen normaliserad databas** — ingen automatiserad återpublicering av upphovsrättsskyddat STF-innehåll utan avtal
- Fält: `name`, `operator`, `location`, `opening_from`, `opening_until`, `beds`, `shop`, `shop_level`, `sauna`, `payment`, `official_url`, `last_verified_at`
- Länka till officiell URL för detaljer
- Eftersträva officiellt samarbete/dataflöde på sikt

---

## Trafiklab

**Användning:**

- Tåg, buss, kollektivtrafik till/från fjällområden

**Implementation:**

- Adapter i `packages/integrations/trafiklab`
- Transportpost: `operator`, `route`, `from`, `to`, `valid_from`, `valid_to`, `departure_time`, `booking_url`, `source_url`, `last_verified_at`
- Cache med kort TTL

---

## Fjällspecifika transportörer

**Användning:**

- Fjällbussar (t.ex. till Abisko, Nikkaluokta)
- Fjällbåtar
- Privata transferlösningar

**Implementation:**

- Separata adapters eller manuella dataposter via admin
- Samma transportpost-struktur som Trafiklab
- `last_verified_at` obligatoriskt; flagga inaktuell data i UI

---

## Egen redaktionell data

**Användning:**

- Sträckornas karaktär, alternativa vägval, svårighetsgrad
- Vanliga avstickare, praktiska råd
- Pilotdataset Abisko–Nikkaluokta

**Källor:**

- Egenproducerad (editor-roll)
- Användargenererad (community, P1)
- Licensierad (om avtal finns)

**Viktigt:** Guidebokstexter får **inte** kopieras. All text ska vara original eller licensierad.

---

## Community-genererad data

| Typ | Lagring | Decay |
| --- | --- | --- |
| Kommentar (erfarenhet) | `comments` | Permanent; kan modereras |
| Betyg | `ratings` | Permanent; en per användare/objekt |
| Bild | `photos` + storage | Permanent; EXIF strippas |
| Lägesrapport | `condition_reports` | `expires_at`; tonas ned automatiskt |

---

## Import och synk (worker-jobb)

| Jobb | Frekvens | Källa |
| --- | --- | --- |
| `import.trail` | Vid behov / manuellt | Egen redaktionell + Lantmäteriet |
| `import.huts` | Veckovis / manuellt | STF (manuell kurering) |
| `import.protected_areas` | Månadsvis | Naturvårdsverket |
| `weather.refresh` | Var 1–6 h | SMHI |
| `sync.official_alerts` | Dagligen | Länsstyrelser (manuellt initialt) |

---

## Licenschecklista före go-live

- [ ] Lantmäteriet: produktvillkor granskade, attribution på plats
- [ ] SMHI: API-villkor, rate limits, attribution
- [ ] Naturvårdsverket: öppna data-villkor
- [ ] STF: inget skyddat innehåll utan avtal; länkar till officiella sidor
- [ ] Trafiklab: API-nyckel, villkor
- [ ] Användarbilder: användarvillkor, moderering, EXIF-strip
- [ ] Community: tydlig ansvarsfriskrivning (planeringshjälp, inte navigationsråd)
