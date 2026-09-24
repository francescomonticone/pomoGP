#!/usr/bin/env python3
"""Scarica i transcript word-level per tutti gli MP3 in assets/radio/.

Sorgente: Formula Dream Team Radio Archive (stesso CDN degli audio).
Ogni transcript ha words[] con word/start/end/is_driver/color -> perfetto
per i sottotitoli karaoke sincronizzati.

Uso:  python3 tools/transcripts.py
Output: data/transcripts/<stesso-nome-mp3>.json  (es. norris-start2.json)
Convenzione: assets/radio/X.mp3 <-> data/transcripts/X.json (nessun campo extra nei JSON).
"""
import json, os, time, urllib.request

BASE = "/Users/francescomonticone/projects/PomoGP"
CDN = "https://d1bntksftjpew6.cloudfront.net"
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126.0 Safari/537.36"}

def build_index():
    """clipId -> transcript path da tutte le cache clip."""
    idx = {}
    d = os.path.join(BASE, "tools", "radio_clips")
    for fn in os.listdir(d):
        if not fn.endswith(".json"):
            continue
        try:
            clips = json.load(open(os.path.join(d, fn)))
        except Exception:
            continue
        for c in clips:
            if c.get("clipId") and c.get("transcript"):
                idx[c["clipId"]] = c["transcript"]
    return idx

def apply_fixes(path):
    """Applica tools/transcript_fixes.json a un transcript salvato."""
    try:
        fixes = json.load(open(os.path.join(BASE, "tools", "transcript_fixes.json")))
    except Exception:
        return False
    d = json.load(open(path))
    words = d.get("words") or []
    repl = {k.lower(): v for k, v in (fixes.get("replace") or {}).items()}
    drop = {t.lower() for t in (fixes.get("drop") or [])}
    out = []
    changed = False
    for w in words:
        t = w.get("w", "")
        core = t.strip().strip(".,!?;:\"").lower()
        if core in drop:
            changed = True
            continue
        if core in repl:
            rep = repl[core]
            if t[:1].isupper():
                rep = rep[:1].upper() + rep[1:]
            # riattacca la punteggiatura originale
            pre = t[:len(t) - len(t.lstrip(".,!?;:\""))]
            post = t[len(t.rstrip(".,!?;:\"")):]
            w["w"] = pre + rep + post
            changed = True
        # fonde frammenti tipo ".9" nella parola precedente ("20" + ".9" -> "20.9")
        if fixes.get("merge_leading_dot") and t.startswith(".") and len(t) <= 4 and out:
            out[-1]["w"] += t
            out[-1]["e"] = w.get("e", out[-1].get("e"))
            changed = True
            continue
        out.append(w)
    if changed:
        d["words"] = out
        json.dump(d, open(path, "w"))
    return changed

def main():
    idx = build_index()
    print("clip indicizzate:", len(idx))
    radio_map = json.load(open(os.path.join(BASE, "tools", "radio_map.json")))
    outdir = os.path.join(BASE, "data", "transcripts")
    os.makedirs(outdir, exist_ok=True)
    jobs = []  # (mp3basename, clipId)
    for pid, m in radio_map.items():
        if m.get("clip"):
            jobs.append((pid, m["clip"]))
        for e in m.get("starts", []):
            if e.get("file", "").endswith(".mp3") and e.get("clip"):
                jobs.append((e["file"][:-4], e["clip"]))
        if (m.get("finish") or {}).get("clip"):
            jobs.append((f"{pid}-finish", m["finish"]["clip"]))
    ok = skip = fail = 0
    for base, clip in jobs:
        dest = os.path.join(outdir, base + ".json")
        if os.path.exists(dest):
            skip += 1
            continue
        tpath = idx.get(clip)
        if not tpath:
            print(f"{base}: transcript path sconosciuto ({clip[:50]})")
            fail += 1
            continue
        url = tpath if tpath.startswith("http") else CDN + "/" + tpath
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=30) as r:
                data = json.load(r)
            # compatta: solo ciò che serve ai sottotitoli
            slim = {
                "clip_id": data.get("clip_id", clip),
                "driver": data.get("driver_full_name"),
                "team": data.get("team_name"),
                "team_color": data.get("team_color"),
                "words": [
                    {"w": w.get("word", "").strip(), "s": w.get("start"),
                     "e": w.get("end"), "d": bool(w.get("is_driver"))}
                    for w in (data.get("words") or []) if (w.get("word") or "").strip()
                ],
            }
            json.dump(slim, open(dest, "w"))
            apply_fixes(dest)
            ok += 1
            print(f"{base}: {len(slim['words'])} parole", flush=True)
        except Exception as e:
            print(f"{base} fail: {e}", flush=True)
            fail += 1
        time.sleep(0.5)
    print(f"fatto: {ok} nuovi, {skip} esistenti, {fail} falliti")
    # passo correzioni anche sui file gia' esistenti
    import glob as _glob
    fixed = sum(1 for f in _glob.glob(os.path.join(outdir, "*.json")) if apply_fixes(f))
    print(f"correzioni applicate a {fixed} transcript")

if __name__ == "__main__":
    main()
