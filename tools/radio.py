#!/usr/bin/env python3
"""Scarica 1 team-radio 'box/pit' per pilota da formuladream.app nell'app PomoGP.

Uso:  python3 tools/radio.py [driver-slug]   (senza argomenti: tutti i 22)
Output: assets/radio/<id>.mp3 + tools/radio_map.json

Fonte: Formula Dream Team Radio Archive (audio originali F1).
ATTENZIONE LEGALE: gli audio sono materiale FOM (c) Formula One — inclusi qui
solo per uso personale. Vedi credits.html. Non ridistribuire oltre questo repo.
"""
import json, re, sys, time, urllib.request, urllib.parse

BASE = "/Users/francescomonticone/projects/PomoGP"
CDN = "https://d1bntksftjpew6.cloudfront.net"
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126.0 Safari/537.36"}

# pilota PomoGP -> slug pagina formuladream
SLUGS = {
    "leclerc": "charles-leclerc", "hamilton": "lewis-hamilton",
    "verstappen": "max-verstappen", "tsunoda": "yuki-tsunoda",
    "norris": "lando-norris", "piastri": "oscar-piastri",
    "russell": "george-russell", "antonelli": "kimi-antonelli",
    "alonso": "fernando-alonso", "stroll": "lance-stroll",
    "gasly": "pierre-gasly", "colapinto": "franco-colapinto",
    "albon": "alexander-albon", "sainz": "carlos-sainz",
    "lawson": "liam-lawson", "hadjar": "isack-hadjar",
    "hulkenberg": "nico-hulkenberg", "bortoleto": "gabriel-bortoleto",
    "ocon": "esteban-ocon", "bearman": "oliver-bearman",
    "perez": "sergio-perez", "bottas": "valtteri-bottas",
}

BOX = re.compile(r"\bbox\b|box box|pit (lane|stop|entry|now|this lap|confirm)|come in|we pit|staying out|push now|great job|well done|cool down|thanks guys|thank you", re.I)
BAD = re.compile(r"retire|red flag|crash|damage|penalty|leak|no power|slow puncture|brake fail|fire", re.I)

CODES = {
    "leclerc": "LEC", "hamilton": "HAM", "verstappen": "VER", "tsunoda": "TSU",
    "norris": "NOR", "piastri": "PIA", "russell": "RUS", "antonelli": "ANT",
    "alonso": "ALO", "stroll": "STR", "gasly": "GAS", "colapinto": "COL",
    "albon": "ALB", "sainz": "SAI", "lawson": "LAW", "hadjar": "HAD",
    "hulkenberg": "HUL", "bortoleto": "BOR", "ocon": "OCO", "bearman": "BEA",
    "perez": "PER", "bottas": "BOT",
}
# Scelte manuali (clipId) quando l'auto-pick e' debole
PIN = {
    "russell": "2026__Monaco_Grand_Prix__Race__RUS_63_20260607_162906",
    "antonelli": "2026__Barcelona_Grand_Prix__Practice_3__ANT_12_20260613_132300",
    "ocon": "2024__Las_Vegas_Grand_Prix__Qualifying__ESTOCO01_31_20241122_224434",
    "hadjar": "2025__Abu_Dhabi_Grand_Prix__Qualifying__ISAHAD01_6_20251206_184235",
}

def fetch(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode("utf-8", errors="ignore")

def extract_clips(html):
    """Estrae i clip piatti {clipId, audio, snippet...} dopo il marker initial.clips."""
    m = re.search(r'\\"clips\\":\[', html)
    if not m:
        return []
    seg = html[m.end():m.end() + 3000000]
    out = []
    for raw in re.findall(r"\{([^{}]*)\}", seg):
        try:
            d = json.loads("{" + raw.replace('\\"', '"').replace("\\'", "'") + "}")
        except Exception:
            continue
        if d.get("clipId") and d.get("audio"):
            out.append(d)
        if len(out) > 5000:
            break
    return out

def pick(pid, clips):
    """Preferisce clip corte con sapore 'box/pit' del pilota giusto, sessione Race."""
    if pid in PIN:
        hit = [c for c in clips if c.get("clipId") == PIN[pid]]
        if hit:
            return hit[0]
    pool = [c for c in clips if (c.get("code") or "") == CODES[pid]] or clips
    scored = []
    for c in pool:
        try:
            dur = float(c.get("duration") or 99)
        except Exception:
            dur = 99
        sn = c.get("snippet") or ""
        s = 0
        if BOX.search(sn):
            s += 50
        if re.search(r"box,\s*box", sn, re.I):
            s += 30
        if BAD.search(sn):
            s -= 40
        if (c.get("session") or "") == "Race":
            s += 10
        if dur <= 4 or dur > 30:
            s -= 30
        else:
            s += max(0, 15 - abs(dur - 9))
        try:
            s += int(str(c.get("year") or 0)) / 1000.0
        except Exception:
            pass
        scored.append((s, c))
    scored.sort(key=lambda t: -t[0])
    return scored[0][1] if scored else None

def page_path(pid):
    return f"{BASE}/tools/radio_pages/{pid}.html"

def main():
    only = sys.argv[1:] or list(SLUGS)
    try:
        radio_map = json.load(open(f"{BASE}/tools/radio_map.json"))
    except Exception:
        radio_map = {}
    for pid in only:
        slug = SLUGS[pid]
        url = f"https://www.formuladream.app/f1-interactive/tools/team-radio/driver/{slug}"
        import os
        os.makedirs(f"{BASE}/tools/radio_pages", exist_ok=True)
        os.makedirs(f"{BASE}/tools/radio_clips", exist_ok=True)
        pp = page_path(pid)
        if os.path.exists(pp):
            html = open(pp).read()
        else:
            try:
                html = fetch(url)
                open(pp, "w").write(html)
            except Exception as e:
                print(f"{pid}: fetch fail {e}", flush=True)
                continue
        clips = extract_clips(html)
        print(f"{pid}: {len(clips)} clip", flush=True)
        if not clips:
            continue
        json.dump(clips, open(f"{BASE}/tools/radio_clips/{pid}.json", "w"), indent=1)
        best = pick(pid, clips)
        audio = (best.get("audio") or "").strip()
        if not audio.startswith("http"):
            audio = CDN + "/" + urllib.parse.quote(audio)
        dest = f"{BASE}/assets/radio/{pid}.mp3"
        import os as _os
        prev = radio_map.get(pid, {}).get("clip")
        if _os.path.exists(dest) and prev == best.get("clipId"):
            print(f"  = invariato [{(best.get('snippet') or '')[:90]}]", flush=True)
            time.sleep(1)
            continue
        try:
            req = urllib.request.Request(audio, headers=UA)
            with urllib.request.urlopen(req, timeout=60) as r, open(dest, "wb") as f:
                data = r.read()
                f.write(data)
            print(f"  -> {dest} ({len(data)//1024}KB) [{best.get('snippet','')[:90]}]", flush=True)
            radio_map[pid] = {"src": audio, "clip": best.get("clipId"),
                              "snippet": best.get("snippet"), "duration": best.get("duration")}
        except Exception as e:
            print(f"  download fail {e}", flush=True)
        time.sleep(2)
    json.dump(radio_map, open(f"{BASE}/tools/radio_map.json", "w"), indent=1)
    print("map scritta")

if __name__ == "__main__":
    main()
