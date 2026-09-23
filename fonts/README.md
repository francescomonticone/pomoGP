# /fonts — font self-hosted (con licenza)

L'app usa ESATTAMENTE due famiglie, verificate sui siti ufficiali:

| Uso | Nome esatto | Fonte |
|-----|-------------|-------|
| Timer, pulsanti, etichette, testi | **Formula1 Display** (Regular 400, Bold 700) — il font di f1experiences.com / formula1.com | Font proprietario F1 (Marc Rouault). Licenza a pagamento, non ridistribuibile. |
| Titoli, nome pilota, wordmark PomoGP | **FerrariSans** (Regular 400, Medium 500) — il font di ferrari.com | Font proprietario Ferrari. Licenza interna, non ridistribuibile. |

## File attesi (woff2, `font-display: swap` già configurato in `css/styles.css`)

```
fonts/
  Formula1-Display-Regular.woff2  → @font-face 'Formula1 Display' 400
  Formula1-Display-Bold.woff2     → @font-face 'Formula1 Display' 700
  FerrariSans-Regular.woff2       → @font-face 'FerrariSans' 400
  FerrariSans-Medium.woff2        → @font-face 'FerrariSans' 500
```

## Dove procurarli (a cura tua — NON committarli se la licenza lo vieta)

1. **Formula1 Display**: acquistabile presso il type designer / rivenditori ufficiali
   (cerca "Formula1 Display Marc Rouault" o "F1 Turbo / Formula1 font license").
   Scarica i woff2 e rinominali come sopra.
2. **FerrariSans**: font proprietario Ferrari, non in vendita pubblica.
   Alternativa legittima: sostituiscilo con un sans condensato simile
   (es. Barlow Condensed SemiBold) rinominato `FerrariSans-*.woff2`,
   oppure lascia i fallback — il layout non si rompe.

## Fallback automatici (già attivi senza i woff2)

```css
--font-f1: 'Formula1 Display', 'Titillium Web', 'Barlow Condensed', system-ui, sans-serif;
--font-ferrari: 'FerrariSans', 'Barlow Condensed', -apple-system, sans-serif;
--font-nums: 'Formula1 Display', 'Titillium Web', ui-monospace, Menlo, monospace;
```

Titillium Web + Barlow Condensed sono caricati da Google Fonts in `index.html`.
Il countdown usa `font-variant-numeric: tabular-nums` così le cifre non "saltano".

## Verifica

1. Metti i 4 woff2 in questa cartella.
2. Ricarica `index.html` → in DevTools > Network > Font devi vedere i 4 file locali (Status 200),
   non più solo i fallback Google Fonts.
