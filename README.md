# PomoGP · Formula 1 Pomodoro / Focus Timer

A static single page: a configurable Pomodoro timer plus an F1 circuit map that
fills up in red as the phase progresses. No backend, no build step.

**Why vanilla HTML/CSS/JS (no React/Vite):** the app is a single page with one
state machine (timer + SVG). Vanilla removes build steps and dependencies, keeps
the `requestAnimationFrame` + `getPointAtLength()` loop directly on the DOM, and
deploys as plain static hosting. React would add complexity with no benefit.

## 1. Folder structure

```
PomoGP/
  index.html            → semantic markup (header, timer, circuit, setup wizard, lights)
  css/styles.css        → design system (Ferrari/F1 tokens, 2-column responsive layout)
  js/app.js             → timestamp-based timer, SVG progress, driver, storage, audio, lights
  data/drivers.json     → 22 drivers, 2026 season (id, number, name, team, color, photo, audio, team radio)
  data/circuits.json    → 24 circuits, 2026 calendar (id, name, country, length km, real SVG path)
  assets/drivers/       → 22 self-hosted driver portraits (512px PNG, © Sky — personal use)
  assets/cars/          → 11 official 2026 car photos (formula1.com, © Formula One — personal use)
  assets/radio/         → 110 original team radio MP3s (© Formula One — personal use)
  tools/convert.py      → GeoJSON → SVG pipeline (projection, 2 m RDP, winding, start/finish)
  tools/overrides.json  → documented calibration (race direction, S/F nodes)
  tools/analyze.py      → race-direction check via OpenStreetMap oneway tags
  tools/radio.py        → downloads 1 "box" clip per driver (Formula Dream archive)
  tools/radio_moments.py→ downloads 3 start + 1 finish jingle per driver
  tools/radio_map.json  → chosen clips with transcripts (pin alternatives via PIN / PIN_MOMENT)
  vendor/geojson/       → source geometries (bacinger/f1-circuits, MIT — don't edit by hand)
  fonts/README.md       → where licensed woff2 fonts go (Formula1 Display + FerrariSans)
  privacy/cookies/terms/credits.html → legal pages + attributions
  ARCHITECTURE.md       → how the project works (Italian)
  README.md             → this file
```

## 2. Run locally

Any static server works (`fetch()` for the JSON files fails on `file://`):

```bash
cd PomoGP
npx serve .            # or: python3 -m http.server 8080
# open http://localhost:3000 (or :8080)
```

## 3. Deploy

100% static site, no env, no build.

- **Vercel**: `vercel` in the folder (framework preset: Other / static), output `.`
- **Netlify**: drag & drop the folder, or `netlify deploy --dir=. --prod`
- **GitHub Pages**: Settings → Pages → Deploy from branch → `main` / root

## 4. Features

- First-run setup wizard: Team (with car photo) → Driver (photo slideshow) → Tyre compound
  (Soft 15/3 · Medium 25/5 · Hard 45/10 · Custom) + laps & pit durations
- F1 start lights gantry: 5-light FIA sequence with random hold on every fresh focus
  start, auto-closes into “Lights out and away we go!” (ESC aborts, Space jumps the start)
- Timestamp-accurate timer (`performance.now()` + `requestAnimationFrame`); 1 s `setInterval`
  only for the background tab title
- Tab title `mm:ss · Focus`, synthesized WebAudio beeps + optional `Notification`
- Real team radio per driver: rotating start jingles, “Box, box!” on pit entry,
  P1 celebration at cycle end (Settings → “Real pit team radio”, falls back to beeps)
- Circuit: white base + `#E10600` progress path with `stroke-dashoffset`,
  car dot via `getPointAtLength()`, checkered start/finish, sector ticks at 1/3 and 2/3,
  yellow pit overlay on breaks, `P1 · Session complete` overlay at cycle end
- Driver chip, watermark number, team radio text at start/mid/end
- Keyboard: `Space` start/pause, `R` reset, `S` skip · `aria-live` announcements ·
  `prefers-reduced-motion` respected · settings in `localStorage` (`pomogp:v2`)

## 5. Data & licenses — REAL tracks

The geometries in `data/circuits.json` are real, not hand-drawn:

- **Source**: [bacinger/f1-circuits](https://github.com/bacinger/f1-circuits) —
  F1 circuit GeoJSON, **MIT** license (© 2019–2025 Tomislav Bacinger).
  Attribution required if you redistribute the data.
- **Conversion**: `python3 tools/convert.py` — equirectangular projection to meters,
  Ramer-Douglas-Peucker simplification at 2 m tolerance, fit into `viewBox 0 0 1000 600`.
- **Race direction verified** for all 24 GPs (OpenStreetMap oneway tags via
  `tools/analyze.py` + Wikipedia/StatsF1/F1DB entries; documented in `tools/overrides.json`).
- **Start/finish**: OSM `raceway=start-finish` node where mapped (Monaco, exact);
  otherwise dataset index 0 (verified <50 m from the S/F node at Melbourne and Austin).
- The `FALLBACK_CIRCUITS` array in `js/app.js` is an auto-generated mirror
  (`tools/fallback_circuits.js`) so the app also works from `file://`.

## 6. Third-party assets (personal use — see credits.html)

- Driver portraits in `assets/drivers/` — © Sky Italia / Sky Sport.
- Team car photos in `assets/cars/` — © Formula One (formula1.com).
- Team radio MP3s in `assets/radio/` — © Formula One (via Formula Dream archive).
- “Formula1 Display” and “FerrariSans” typefaces are proprietary and **not** bundled;
  the UI falls back to Titillium Web + Barlow Condensed (see `fonts/README.md`).

⚠️ Committing these to a **public** repo carries takedown risk. If in doubt, delete
`assets/radio/*.mp3` before pushing — the app falls back to synthesized beeps.

## 7. Your TODOs before going public

1. **Licensed fonts** (see `fonts/README.md`):
   - `Formula1-Display-Regular.woff2` + `Formula1-Display-Bold.woff2` (f1experiences.com font — proprietary, paid)
   - `FerrariSans-Regular.woff2` + `FerrariSans-Medium.woff2` (ferrari.com font — proprietary, not public; Barlow Condensed fallback is fine)
2. **Replace placeholders** (required by GDPR Art. 13):
   `[YOUR NAME]` and `[YOUR EMAIL]` in `privacy.html`, `terms.html`, `credits.html`, `LICENSE`
3. **2026 contents**: update `data/drivers.json` once the final line-up is set;
   upstream already has Madrid (`es-2026.geojson`) if you want to add it:
   download into `vendor/geojson/madrid.geojson`, add the id in
   `tools/convert.py` + one row in `data/circuits.json`, then re-run the conversion.
