# Hyperframes Composition Brief: PomoGP

## Objective
Create a 20-second cinematic launch-style brag video for PomoGP.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 20 seconds

## Source Material
- Project root: /Users/francescomonticone/projects/PomoGP
- Primary files read: index.html, css/styles.css, README.md, data/
- Product name: PomoGP
- Tagline / strongest claim: Train your focus like a race weekend.
- Key UI or visual moment to recreate: start-lights gantry, giant countdown + red track progress, pit radio karaoke subtitles, P1 overlay
- Copy that must appear verbatim:
  - LIGHTS OUT.
  - Train your focus like a race weekend.
  - BOX, BOX, BOX.
  - P1 · SESSION COMPLETE
  - francescomonticone.github.io/pomoGP

## Creative Direction
- Tone preset: cinematic
- Creative direction: F1 race-weekend trailer for a productivity timer
- Interpretation: wide shots, big condensed type, dramatic reveals; humor only from the premise
- Angle: the most over-engineered Pomodoro timer ever built — five red lights just to start studying
- Hook: five red dots with beeps, then LIGHTS OUT (first 2-3 seconds)
- Outro / punchline: checkered P1 + URL, hard stop at 20s
- Avoid:
  - Generic SaaS language
  - Abstract filler visuals
  - Unrelated visual redesign

## Visual Identity
- Background: #0B0B0F
- Text: #FFFFFF (dim #A7A7B3)
- Accent: #E10600 (pit yellow #FFF500 for the pit scene)
- Display font: Barlow Condensed 700/900 italic (Google Fonts, closest free match to the project's display face)
- Body font: Titillium Web
- Visual references from the project: telemetry grid background, sharp 0px corners, uppercase tracked labels, glowing red track, checkered flag pattern

## Storyboard
Use the storyboard in `brag-output/brag-plan.md` as the creative contract.

Scene summary:
1. Lights out hook — 3s — 5 red dots + beeps, LIGHTS OUT + tagline
2. Setup flow — 5s — 3 cards arrive sequentially (team/driver/tyre)
3. Focus lap — 6s — countdown + red track fill + sectors
4. Pit radio — 3.5s — karaoke BOX BOX BOX + equalizer
5. P1 outro — 2.5s — checkered + P1 + URL (beat-locked ~18.55)

## Audio
- Audio role: cinematic support with real team radios as featured moments
- Audio arc: beep tension → driving bed → voices front → climax hit → hard stop
- Music: happy-beats-business-moves-vol-10-by-ende-dot-app.mp3 (excerpt 0–20s)
- Music treatment: full energy from 0, duck under radio moments (scenes 3b/4), climax into P1, hard cut at 20s
- Music cue guidance: preset read (110 BPM); P1 reveal beat-locked near 18.55 strong cue; card arrivals on beat grid ~3.6/4.7/5.8 (every other beat, readability first)
- Audio-reactive treatment: subtle — track glow and title presence breathe with energy
- Audio-coupled moments:
  - Hook lights — beep per dot
  - Setup cards — arrival ticks on beat grid
  - Pit karaoke — real hamilton.mp3 with word lighting
  - Focus motion — real leclerc-start2.mp3 ("All right, let's do it.") under the lap
  - P1 — hit + celebration tail
- SFX selection guidance: sparse professional kit (beeps, whoosh, hit); motion-matched; restraint when busy
- Exact SFX choice: Hyperframes chooses filenames/timestamps/density/volume
- Audio files: copy music + selected SFX + the two real radio MP3s (from /Users/francescomonticone/projects/PomoGP/assets/radio/) into `brag-output/composition/assets/`

## Hyperframes Instructions
Load the composition-building Hyperframes domain skills (`hyperframes-core`, `hyperframes-animation`, `hyperframes-creative`, `hyperframes-keyframes`, `hyperframes-cli`). /brag is its own workflow: do not enter the `hyperframes` entry-point intent interview and do not route into its generic promo / launch-video workflow. Prefer native Hyperframes conventions over anything in `/brag`.

Requirements:
- Show at least one real UI, copy, or visual element from the source project.
- Keep all text readable in the final render.
- Keep the video within 15-25 seconds.
- Include the planned music/SFX layer.
- Treat /brag audio notes as guidance, not a fixed cue sheet.
- Major reveals may move toward nearby strong cues within about 0.15s; sequential entrances snap within ±0.10s; 1–3 strong cue locks total.
- Use SFX to support motion; restraint when busy.
- Honor music ducking under radio voices using the best supported implementation.
- Consider subtle audio-reactive glow on the track/title.
- Use local assets for audio and runtime dependencies.
- Run `hyperframes check` before render — the single gate.
- Keep creation and rendering local.
