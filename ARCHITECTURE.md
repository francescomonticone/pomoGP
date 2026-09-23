# PomoGP — Come funziona (schema del progetto)

Documento in italiano per chi non segue i dettagli implementativi.
Il codice commentato in inglese è nei file; qui c'è la mappa.

## 1. Idea in una frase

PomoGP è un **timer Pomodoro vestito da Formula 1**: studi a stint (FOCUS),
riposi ai pit stop, e un tracciato reale che si colora di rosso man mano che
il tempo passa. Nessun server, nessun account: tutto gira nel browser.

## 2. Mappa delle cartelle

```
PomoGP/
├── index.html          → la pagina (struttura + testi, tutto in inglese)
├── css/styles.css      → tutto il design (colori, layout, wizard, semaforo)
├── js/app.js           → TUTTA la logica (838 righe, vedi sotto)
├── data/
│   ├── drivers.json    → 22 piloti: numero, nome, team, colore, foto, 5 audio, team radio
│   └── circuits.json   → 24 circuiti: nome, paese, km, tracciato SVG reale
├── assets/
│   ├── drivers/        → 22 foto piloti (Sky, 512px)
│   ├── cars/           → 11 foto monoposto 2026 (formula1.com)
│   └── radio/          → 110 MP3: per pilota 3 partenze + 1 box + 1 arrivo
├── fonts/README.md     → dove mettere i font con licenza (non inclusi)
├── privacy/cookies/terms/credits.html → pagine legali + crediti
├── tools/              → script di costruzione dati (si usano una tantum, vedi §7)
└── vendor/geojson/     → geometrie originali dei circuiti (fonte, MIT)
```

**Regola d'oro:** `data/*.json` sono la verità per piloti e circuiti.
`js/app.js` contiene una *copia di riserva* degli stessi dati (FALLBACK_*)
che serve solo se apri il file senza server.

## 3. Il flusso utente (cosa succede, in ordine)

```
Prima visita ──► Wizard (3 step) ──► App pronta ──► Semaforo ──► Timer
                     │                                  │
              1. Team (foto macchina)            5 luci rosse, poi
              2. Pilota (foto + numero)          LIGHTS OUT e via
              3. Gomma + strategia
                 (Soft 15/3 · Medium 25/5 · Hard 45/10 · Custom)
```

Tutto quello scelto nel wizard finisce in `localStorage` (chiave `pomogp:v2`):
alla visita successiva il wizard **non** ricompare. Il chip in alto lo riapre.

## 4. Il timer (macchina a stati)

Il cuore è una macchina a 3 fasi che gira in tondo:

```
        ┌──────────────────────────────────────────────┐
        │                                              ▼
   ┌─────────┐  finisce   ┌──────────────┐  finisce  ┌──────────────┐
   │  FOCUS  │ ─────────► │ PIT STOP     │ ────────► │ PIT STOP     │
   │ 25 min  │  "Box box!"│ BREVE 5 min  │  torni in │ LUNGO 15 min │
   └─────────┘  (audio)   │  giallo      │  pista    │  giallo      │
        ▲                 └──────────────┘           └──────────────┘
        │                        │                         │
        └──── dopo N giri ───────┴── N = "laps" scelto ─────┘
                        (di default 4)

        Ultimo giro completato → overlay "P1 · Session complete" + audio festa
```

Dettagli importanti:

- **Precisione**: non conta i secondi con un orologetto impreciso. All'avvio
  fotografa l'istante esatto (`performance.now()`) e calcola sempre
  `tempo rimasto = ora di fine − ora attuale`. Anche se il tab va in
  background, al ritorno il conto è esatto (niente deriva).
- **Fluidità**: il tracciato si aggiorna 60 volte/sec (`requestAnimationFrame`),
  mentre testi e titolo della tab solo quando cambiano davvero (altrimenti il
  browser si ingolfa — bug vero, già corretto).
- **Tastiera**: Spazio = start/pausa, R = reset, S = salta fase.

## 5. Il circuito (come si colora)

1. Il file `circuits.json` contiene per ogni pista un unico `path` SVG, cioè
   una sequenza di punti reali (ex coordinate GPS, semplificate a scarto
   max 2 metri e adattate al riquadro 1000×600).
2. A schermo ci sono **due linee sovrapposte**: sotto bianca tenue (tutta la
   pista), sopra rossa `#E10600`. La rossa è "tagliata" con la tecnica
   `stroke-dashoffset`: più tempo passa, più si allunga dalla partenza.
3. La **monoposto** (puntino bianco/rosso) è posizionata ogni frame con
   `getPointAtLength()` — chiede alla linea "dove sei al 42%?" e ci mette il
   puntino. Stesso meccanismo per le tacche dei settori S1/S2/S3 (a 1/3 e 2/3).
4. Il **senso di marcia è quello reale** (verificato circuito per circuito;
   solo Singapore nei dati era al contrario ed è stata girata).
5. In pausa il rosso si spegne e compare l'overlay giallo pit.

## 6. Gli audio (quando parte cosa)

| Momento              | Audio                              | Dove sta il file          |
|----------------------|------------------------------------|---------------------------|
| Semaforo, ogni luce  | beep sintetizzato                  | generato al volo (codice) |
| Lights out           | beep acuto                         | generato al volo          |
| Inizio focus         | jingle del pilota (1 di 3 a caso)  | `radio/<id>-start{,2,3}.mp3` |
| Ingresso pit         | "Box, box!" del pilota             | `radio/<id>.mp3`          |
| Fine ciclo (P1)      | festeggiamento del pilota          | `radio/<id>-finish.mp3`   |
| Pulsanti/complet.    | beep sintetizzati                  | generati al volo          |

Interruttore unico: Settings → **Real pit team radio**. Se un MP3 manca,
l'app ricade sui beep senza rompersi. Gli audio originali sono © Formula One
(uso personale — vedi `credits.html`).

## 7. Gli script in `tools/` (si usano una tantum)

Non servono per far girare il sito. Servono per **rigenerare i dati**:

| Script              | Cosa fa                                                        |
|---------------------|----------------------------------------------------------------|
| `convert.py`        | GeoJSON → tracciati SVG + controlli senso di marcia            |
| `analyze.py`        | verifica il senso di marcia coi dati OpenStreetMap             |
| `radio.py`          | scarica 1 "box" per pilota dall'archivio Formula Dream         |
| `radio_moments.py`  | scarica 3 partenze + 1 arrivo per pilota                       |
| `overrides.json`    | calibrazione documentata (Singapore invertita, S/F di Monaco)  |
| `radio_map.json`    | quali clip sono state scelte, con trascrizione                  |
| `radio_pages/`, `radio_clips/` | cache delle pagine/transcrizioni scaricate           |

Esempio: per cambiare il "box" di Russell, trovi il `clipId` in
`radio_map.json`, lo fissi in `PIN` dentro `radio.py` e rilanci.

## 8. Dati di terze parti (licenze in `credits.html`)

| Dato               | Fonte                    | Licenza / nota                          |
|--------------------|--------------------------|-----------------------------------------|
| Geometrie piste    | bacinger/f1-circuits     | MIT (attribuzione dovuta)               |
| Foto piloti        | Sky Sport                | © Sky, uso personale + takedown         |
| Foto monoposto     | formula1.com             | © Formula One, uso personale + takedown |
| Team radio MP3     | Formula Dream / FOM      | © Formula One, uso personale + takedown |
| Font F1 / Ferrari  | proprietari              | **non inclusi** (fallback gratuiti attivi) |

## 9. Per modificare le cose comuni

| Voglio...                          | Dove metto le mani                                    |
|------------------------------------|-------------------------------------------------------|
| Cambiare tempi default             | wizard step 3, oppure pannello Settings nella pagina  |
| Aggiungere/cambiare un pilota      | `data/drivers.json` (+ foto in `assets/drivers/`)     |
| Aggiungere Madrid 2026             | vedi istruzioni in README (file già esistente upstream)|
| Cambiare un audio                  | `tools/radio_map.json` + `PIN` e rilancio script      |
| Cambiare colori/stile              | `:root` in cima a `css/styles.css`                    |
| Pubblicare su GitHub Pages         | istruzioni in README ("Publish on GitHub")            |
