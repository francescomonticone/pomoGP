#!/usr/bin/env python3
"""Raccoglie clip extra per pilota dalle pagine GP dell'archivio Formula Dream.
Uso: python3 tools/radio_harvest.py leclerc 2024 monaco-grand-prix italian-grand-prix ...
Output: tools/radio_pool/<id>.json (clip aggiuntive, dedup per clipId)
"""
import json, os, re, sys, time, urllib.request

BASE = "/Users/francescomonticone/projects/PomoGP"
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126.0 Safari/537.36"}

def fetch(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode("utf-8", errors="ignore")

def extract(html):
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
    return out

def main():
    pid = sys.argv[1]
    gps = sys.argv[2:]
    if not gps:
        # default: gare forti Leclerc
        jobs = [("2024", "monaco-grand-prix"), ("2024", "italian-grand-prix"),
                ("2024", "united-states-grand-prix"), ("2025", "monaco-grand-prix"),
                ("2025", "italian-grand-prix"), ("2026", "monaco-grand-prix"),
                ("2026", "spanish-grand-prix"), ("2025", "united-states-grand-prix")]
    else:
        it = iter(gps)
        jobs = list(zip(it, it))
    pool = {}
    for year, gp in jobs:
        url = f"https://www.formuladream.app/f1-interactive/tools/team-radio/{year}/{gp}/race"
        try:
            clips = extract(fetch(url))
        except Exception as e:
            print(year, gp, "fail", e)
            continue
        n = 0
        for c in clips:
            if c.get("clipId") not in pool:
                pool[c["clipId"]] = c
                n += 1
        print(year, gp, len(clips), "clip,", n, "nuove")
        time.sleep(2)
    os.makedirs(f"{BASE}/tools/radio_pool", exist_ok=True)
    json.dump(list(pool.values()), open(f"{BASE}/tools/radio_pool/{pid}.json", "w"), indent=1)
    print("pool:", len(pool))

if __name__ == "__main__":
    main()
