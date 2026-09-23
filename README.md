# PomoGP · Pomodoro / Focus Timer a tema Formula 1

Single-page statica: timer Pomodoro configurabile + mappa circuito F1 che si colora
di rosso man mano che la fase avanza. Nessun backend, nessun build.

**Perché vanilla HTML/CSS/JS (niente React/Vite):** l'app è una sola pagina con un
solo state machine (timer + SVG). Vanilla elimina build step e dipendenze, rende il
loop `requestAnimationFrame` + `getPointAtLength()` diretto sul DOM, e il deploy è un
semplice hosting statico. React avrebbe aggiunto complessità senza benefici.

## 1. Struttura delle cartelle

```
PomoGP/
  index.html            → markup semantico (header, timer, circuito, modale pilota)
  css/styles.css        → design system (token Ferrari/F1, layout 2 colonne, responsive)
  js/app.js             → timer timestamp-based, SVG progress, pilota, storage, audio
  data/drivers.json     → 22 piloti stagione 2026 (id, numero, nome, scuderia, colore, team radio)
  data/circuits.json    → 24 circuiti calendario 2026 (id, nome, paese, lunghezza km, path SVG reale)
  assets/drivers/       → 22 ritratti piloti self-hosted (512px PNG, © Sky — uso personale)
  tools/convert.py      → pipeline GeoJSON → SVG (proiezione, RDP 2 m, winding, start/finish)
  tools/overrides.json  → calibrazione documentata (senso di marcia, nodi S/F)
  tools/analyze.py      → verifica senso di marcia via tag oneway di OpenStreetMap
  vendor/geojson/       → geometrie sorgente (bacinger/f1-circuits, MIT — non modificare a mano)
  fonts/README.md       → dove mettere i woff2 con licenza (Formula1 Display + FerrariSans)
  README.md             → questo file
```

## 2. Esecuzione in locale

Serve un server http (i `fetch()` dei JSON non funzionano da `file://`):

```bash
cd PomoGP
npx serve .            # oppure: python3 -m http.server 8080
# apri http://localhost:3000 (o :8080)
```

## 3. Deploy

Sito 100% statico, nessun env, nessuna build.

- **Vercel**: `vercel` nella cartella (framework preset: Other / static), output `.`
- **Netlify**: drag & drop della cartella, oppure `netlify deploy --dir=. --prod`
- **GitHub Pages**: push del repo → Settings → Pages → Deploy from branch → root `/`

## 4. Funzioni principali

- Timer 25/5/15 × 4 configurabile, autostart on/off, `localStorage` chiave `pomogp:v1`
- Precisione via `performance.now()` + `requestAnimationFrame`; `setInterval` 1s solo per il titolo tab in background
- Tab title `mm:ss · Focus`, beep WebAudio + `Notification` opzionali
- Circuito: doppio path (bianco sotto, `#E10600` sopra) con `stroke-dashoffset`,
  car dot con `getPointAtLength()`, start/finish a scacchi, tacche settori a 1/3 e 2/3,
  overlay pit giallo in pausa, overlay `P1 · Session complete` a fine ciclo
- Pilota: modale alla prima visita, chip sempre visibile, watermark numero, team radio start/mid/end
- Tastiera: `Spazio` start/pausa, `R` reset, `S` salta · `aria-live` per annunci · `prefers-reduced-motion` rispettato

## 5. Dati e licenze — tracciati REALI

Le geometrie in `data/circuits.json` sono reali, non disegnate a mano:

- **Sorgente**: [bacinger/f1-circuits](https://github.com/bacinger/f1-circuits) —
  GeoJSON dei circuiti F1, licenza **MIT** (© 2019–2025 Tomislav Bacinger).
  Citazione obbligatoria se ridistribuisci i dati.
- **Conversione**: `python3 tools/convert.py` — proiezione equirettangolare in metri,
  semplificazione Ramer-Douglas-Peucker con tolleranza 2 m, fit in `viewBox 0 0 1000 600`.
- **Senso di marcia verificato** per tutti i 24 GP (tag oneway di OpenStreetMap via
  `tools/analyze.py` + voci Wikipedia/StatsF1/F1DB; documentato in `tools/overrides.json`).
- **Start/finish**: nodo OSM `raceway=start-finish` dove mappato (Monaco, esatto);
  altrove indice 0 del dataset (verificato <50 m dal nodo S/F a Melbourne e Austin).
- L'array `FALLBACK_CIRCUITS` in `js/app.js` è un mirror auto-generato
  (`tools/fallback_circuits.js`) per far funzionare l'app anche da `file://`.

## 6. Punti da completare a cura tua

1. **Font con licenza** (vedi `fonts/README.md`):
   - `Formula1-Display-Regular.woff2` + `Formula1-Display-Bold.woff2` (font di f1experiences.com — proprietario, da acquistare)
   - `FerrariSans-Regular.woff2` + `FerrariSans-Medium.woff2` (font di ferrari.com — proprietario, non pubblico; ok fallback Barlow Condensed)
2. **Contenuti 2026**: aggiorna `data/drivers.json` (line-up definitiva) a stagione iniziata;
   per il nuovo **Madring** esiste già `vendor` upstream (`es-2026.geojson`) se vuoi aggiungerlo
   al calendario: scaricalo in `vendor/geojson/madrid.geojson`, aggiungi l'id in
   `tools/convert.py` + una riga in `data/circuits.json`, poi rilancia la conversione.

## Driver photos — self-hosted

Driver portraits live in `assets/drivers/<driver-id>.png` (22 files, ~6.6 MB),
downloaded from Sky Sport for personal use — images are © Sky / rights holders.
No external requests: the app works fully offline (except the optional Google
Fonts fallback). To replace a portrait, overwrite the PNG keeping the same
filename; the app degrades gracefully anyway (broken images hide themselves and
the driver number badge remains).

## Publish on GitHub (repo `pomoGP`)

`gh` is not logged in here, so run these commands yourself (or create the repo
on github.com/new and follow the push instructions shown there):

```bash
cd PomoGP
git init
git add .
git commit -m "PomoGP: F1 focus timer with real tracks, setup wizard, legal pages"
gh auth login
gh repo create pomoGP --public --source=. --push
```

Prefer GitHub Pages for hosting? After pushing: repo → Settings → Pages →
Deploy from branch → `main` / root. The site (including privacy/cookies/terms/
credits pages) is 100% static.

Before going public, replace the placeholders (required by GDPR Art. 13):
- `[YOUR NAME]` and `[YOUR EMAIL]` in `privacy.html`, `terms.html`, `credits.html`, `LICENSE`

## Pit team radio — original audio

Full F1 sound scheme — 110 MP3 (~20 MB), 3+ clips per driver:
- `assets/radio/<id>-start{,2,3}.mp3` rotate randomly on every fresh focus start (“Let’s go!”)
- `assets/radio/<id>.mp3` plays on every pit entry (“Box, box!”)
- `assets/radio/<id>-finish.mp3` celebrates the P1 overlay at cycle end
Downloaded with `python3 tools/radio.py` (pit clips) and
`python3 tools/radio_moments.py` (start/finish) from the Formula Dream Team Radio
Archive (formuladream.app, CloudFront CDN). Picks recorded with transcripts in
`tools/radio_map.json`; pin alternatives via `PIN` / `PIN_MOMENT` and re-run.
Toggle: Settings → “Real pit team radio”. Missing files fall back to beeps.

⚠️ Legal: team radio audio is © Formula One (FOM), all rights reserved — personal,
non-commercial use only. Committing it to a **public** repo carries takedown risk:
same takedown promise as the photos applies (see credits.html). If in doubt, delete
`assets/radio/*.mp3` before pushing — the app falls back to synthesized beeps.

## Team car photos + start lights

- Official 2026 car photos from formula1.com (`assets/cars/<team>.webp`, ~412 KB total)
  shown on the team cards in setup step 1. © Formula One — personal use only,
  same takedown promise as driver portraits (see credits.html).
- F1 start lights gantry: pressing Start on a fresh focus stint (or the header
  “Lights out” button) runs the 5-light FIA sequence with random hold, then
  “Lights out and away we go!”, auto-closes and starts the timer. ESC aborts,
  Space triggers an early lights-out, “Instant start” skips the ceremony.
