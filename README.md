# PomoGP · Formula 1 Focus Timer

**Train your focus like a race weekend.** PomoGP is a Pomodoro timer dressed as
Formula 1: pick your team, driver and tyre compound, survive the start lights,
push through focus stints, and recover in the pit lane while a real circuit
fills up in red under you.

🌐 **Live:** https://francescomonticone.github.io/pomoGP/

## How it works

1. **Setup** — choose your team (with its 2026 car), your driver (photo gallery)
   and your tyre compound: **Soft** 15/3 · **Medium** 25/5 · **Hard** 45/10 — or
   go Custom with your own timings, laps and pit stops.
2. **Lights out** — every focus stint starts with the 5-light FIA sequence and
   “Lights out and away we go!”.
3. **Focus** — the countdown runs while the real track map fills in red and your
   car moves along it, sector by sector.
4. **Pit stop** — relax to your driver's original “Box, box!” team radio while
   the track cools down.
5. **P1** — finish all your laps to take the chequered flag with a driver
   celebration call.

Shortcuts: `Space` start/pause · `R` reset · `S` skip phase. Your setup is
remembered in your browser — no account, no server, no tracking.

## Run it yourself

The site is 100% static. Easiest: open the live link above. Locally:

```bash
npx serve .   # then open http://localhost:3000
```

## Credits

- Track geometries: [bacinger/f1-circuits](https://github.com/bacinger/f1-circuits) (MIT)
- Driver portraits: © Sky Sport · Team cars: © Formula One · Team radios: © Formula One —
  included for personal, non-commercial use (see `credits.html`)
- Typefaces fall back to Titillium Web + Barlow Condensed (OFL)

Unofficial fan project — not affiliated with or endorsed by Formula 1, the FIA,
or any team or driver (see `terms.html`).

## License

App source code: MIT (see `LICENSE`). Third-party assets listed above are excluded.
