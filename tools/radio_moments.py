#!/usr/bin/env python3
"""Scarica start/finish jingle per pilota riusando le pagine cachate da radio.py.

Uso:  python3 tools/radio_moments.py
Output: assets/radio/<id>-start.mp3, assets/radio/<id>-finish.mp3
        + update tools/radio_map.json
"""
import json, os, re, sys, time, urllib.request

sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
from radio import SLUGS, CODES, CDN, UA, BASE  # noqa

START_RX = re.compile(r"lights out|away we go|good start|great start|formation|let.s go|go go|green green|start (of|the race)|ready to (go|race)|boxes|grid", re.I)
FINISH_RX = re.compile(r"chequer|p1\b|winner|champion|victor|well done|fantastic|what a race|get in there|beaut|mega|proud|congrats|yess|woo", re.I)
BAD = re.compile(r"retire|red flag|crash|damage|penalty|leak|no power|slow puncture|brake fail|fire|investigat|kill|stuck|fell off|scared|lost everything|failing|nothing worked|spin|stupid|idiot|fuck|shit|hell|hate|wrong|problem|issue|struggling|snap|weird|jump|vibrat|backs out|flat spot|lock-up|lockup|understeer|oversteer|no grip|sliding|save me|bring it (in|back|to)|come in (now|please)|abort|slow down|lift|cool the|save the|manage|delta|target|pushing too|too hot|too cold|warnings?|track limits|delete", re.I)

# Pin manuali per-kind quando l'auto-pick e' debole
PIN_MOMENT = {
    "alonso": {"finish": "2025__Abu_Dhabi_Grand_Prix__Qualifying__FERALO01_14_20251206_191414"},
    "hulkenberg": {"finish": "2025__Austrian_Grand_Prix__Race__NICHUL01_27_20250629_170515"},
    "stroll": {
        "start": "2024__Las_Vegas_Grand_Prix__Practice_1__LANSTR01_18_20241121_203833",
        "finish": "2024__Mexico_City_Grand_Prix__Race__LANSTR01_18_20241027_155433",
    },
    "norris": {"start": "2026__Barcelona_Grand_Prix__Practice_2__NOR_1_20260612_174620"},
    "colapinto": {"finish": "2026__Canadian_Grand_Prix__Race__COL_43_20260524_174314"},
    "leclerc": {"finish": "2025__United_States_Grand_Prix__Race__CHALEC01_16_20251019_154035"},
}

def score(sn, session, dur, year, rx):
    s = 0
    if rx.search(sn):
        s += 50
    if BAD.search(sn):
        s -= 40
    if (session or "") == "Race":
        s += 10
    if dur <= 3 or dur > 30:
        s -= 30
    else:
        s += max(0, 15 - abs(dur - 10))
    try:
        s += int(str(year or 0)) / 1000.0
    except Exception:
        pass
    return s

def used_clips(pid):
    """ClipId gia' usati per pit/finish di questo pilota (niente duplicati)."""
    try:
        m = json.load(open(f"{BASE}/tools/radio_map.json")).get(pid, {})
    except Exception:
        return set()
    out = {m.get("clip"), (m.get("finish") or {}).get("clip")}
    return {c for c in out if c}

def pick_top(pid, clips, rx, kind, n):
    """Top-N clipId distinti (per varieta' start); rispetta PIN_MOMENT per il #1."""
    used = used_clips(pid)
    ordered = []
    if pid in PIN_MOMENT and kind in PIN_MOMENT[pid]:
        hit = [c for c in clips if c.get("clipId") == PIN_MOMENT[pid][kind]]
        ordered.extend(hit[:1])
    pool = [c for c in clips if (c.get("code") or "") == CODES[pid]] or clips
    scored = []
    for c in pool:
        try:
            dur = float(c.get("duration") or 99)
        except Exception:
            dur = 99
        scored.append((score(c.get("snippet") or "", c.get("session"), dur, c.get("year"), rx), dur, c))
    scored.sort(key=lambda t: (-t[0], t[1]))
    for _, _, c in scored:
        if c.get("clipId") in used:
            continue
        if c not in ordered and len(ordered) < n:
            ordered.append(c)
    return [c for c in ordered if (score(c.get("snippet") or "", c.get("session"), float(c.get("duration") or 99), c.get("year"), rx) > 0)][:n] or ordered[:1]

def pick(pid, clips, rx, kind):
    top = pick_top(pid, clips, rx, kind, 1)
    return top[0] if top else None

def dl(audio, dest):
    if not audio.startswith("http"):
        audio = CDN + "/" + urllib.parse.quote(audio)
    req = urllib.request.Request(audio, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r, open(dest, "wb") as f:
        data = r.read()
        f.write(data)
    return audio, len(data)

def main():
    radio_map = json.load(open(f"{BASE}/tools/radio_map.json"))
    for pid in SLUGS:
        fp = f"{BASE}/tools/radio_clips/{pid}.json"
        if not os.path.exists(fp):
            print(pid, "no clips cache, skip")
            continue
        clips = json.load(open(fp))
        rx_by_kind = {"start": START_RX, "finish": FINISH_RX}
        jobs = [("finish", [f"{pid}-finish.mp3"])]
        # 3 jingle di partenza diversi per varieta'
        jobs.append(("start", [f"{pid}-start.mp3", f"{pid}-start2.mp3", f"{pid}-start3.mp3"]))
        for kind, files in jobs:
            if kind == "start":
                wanted = pick_top(pid, clips, rx_by_kind[kind], kind, 3)
            else:
                best = pick(pid, clips, rx_by_kind[kind], kind)
                wanted = [best] if best else []
            if not wanted:
                print(f"{pid} {kind}: nessun candidato")
                continue
            for clip, fname in zip(wanted, files):
                dest = f"{BASE}/assets/radio/{fname}"
                recorded = {e.get("file"): e.get("clip")
                            for e in radio_map.get(pid, {}).get("starts", [])}
                if kind == "finish":
                    recorded[fname] = (radio_map.get(pid, {}).get("finish") or {}).get("clip")
                if os.path.exists(dest) and recorded.get(fname) == clip.get("clipId"):
                    continue
                try:
                    audio, size = dl(clip.get("audio") or "", dest)
                    print(f"{pid} {fname}: {size//1024}KB [{(clip.get('snippet') or '')[:80]}]", flush=True)
                    entry = {"file": fname, "src": audio, "clip": clip.get("clipId"),
                             "snippet": clip.get("snippet"), "duration": clip.get("duration")}
                    if kind == "finish":
                        radio_map.setdefault(pid, {})["finish"] = entry
                    else:
                        radio_map.setdefault(pid, {}).setdefault("starts", [])
                        for i, e in enumerate(radio_map[pid]["starts"]):
                            if e.get("file") == fname:
                                radio_map[pid]["starts"][i] = {**entry, "file": fname}
                                break
                        else:
                            radio_map[pid]["starts"].append({**entry, "file": fname})
                except Exception as e:
                    print(f"{pid} {fname} fail: {e}", flush=True)
                time.sleep(1)
    json.dump(radio_map, open(f"{BASE}/tools/radio_map.json", "w"), indent=1)
    print("moments ok")

if __name__ == "__main__":
    main()
