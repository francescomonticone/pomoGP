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
            ok += 1
            print(f"{base}: {len(slim['words'])} parole", flush=True)
        except Exception as e:
            print(f"{base} fail: {e}", flush=True)
            fail += 1
        time.sleep(0.5)
    print(f"fatto: {ok} nuovi, {skip} esistenti, {fail} falliti")

if __name__ == "__main__":
    main()
