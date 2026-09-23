#!/usr/bin/env python3
"""Vota il senso di marcia reale usando i tag oneway di OSM e cerca i nodi start/finish.

Per ogni circuito street (strade pubbliche con oneway): confronta la direzione
dei way oneway con la tangente della centerline nel punto piu' vicino.
Maggioranza dei voti -> senso di marcia reale (confronto con winding dei dati).

Secondo passo: nodi raceway=start/finish intorno al centroide -> candidati S/F.
Output: report stampato + tools/osm_votes.json (riuso in convert.py).
"""
import json, math, time, sys, urllib.request, urllib.parse

OVERPASS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]
GEO = "/Users/francescomonticone/projects/PomoGP/vendor/geojson"
OUT = "/Users/francescomonticone/projects/PomoGP/tools/osm_votes.json"

STREET = ["monaco", "baku", "singapore", "jeddah", "miami", "vegas", "melbourne", "montreal", "austin"]

def post(query):
    data = urllib.parse.urlencode({"data": query}).encode()
    last = None
    for base in OVERPASS:
        try:
            req = urllib.request.Request(base, data=data, method="POST",
                                         headers={"User-Agent": "PomoGP-track-calibration/1.0"})
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except Exception as e:
            last = e
            time.sleep(2)
    raise RuntimeError(f"overpass fail: {last}")

def centroid(coords):
    return (sum(p[0] for p in coords) / len(coords),
            sum(p[1] for p in coords) / len(coords))

def heading(a, b):
    return math.atan2(b[0] - a[0], b[1] - a[1])

def angdiff(a, b):
    d = a - b
    while d > math.pi: d -= 2 * math.pi
    while d < -math.pi: d += 2 * math.pi
    return d

def load_line(cid):
    d = json.load(open(f"{GEO}/{cid}.geojson"))
    return d["features"][0]["geometry"]["coordinates"]

def project(coords):
    lon0 = sum(p[0] for p in coords) / len(coords)
    lat0 = sum(p[1] for p in coords) / len(coords)
    kx = math.cos(math.radians(lat0)) * 111320.0
    ky = 110540.0
    return [((p[0] - lon0) * kx, (p[1] - lon0 * 0 + lat0 - lat0) * 0 + (p[1] - lat0) * ky) for p in coords], (lon0, lat0)

def main(which=None):
    report = {}
    cids = [which] if which else STREET
    for cid in cids:
        coords = load_line(cid)
        (lon0, lat0) = centroid(coords)
        # --- oneway vote ---
        r = 0.012
        q = (f"[out:json][timeout:40];way[\"highway\"][\"oneway\"=\"yes\"]"
             f"({lat0-r},{lon0-r},{lat0+r},{lon0+r});out geom;")
        try:
            res = post(q)
        except Exception as e:
            print(f"{cid}: overpass errore {e}", flush=True)
            report[cid] = {"error": str(e)}
            continue
        ways = [el for el in res.get("elements", []) if el.get("type") == "way" and "geometry" in el]
        # tangenti della centerline (lon/lat -> heading grezzo, ok per confronti locali)
        segs = [(coords[i], coords[i + 1]) for i in range(len(coords) - 1)]
        votes_same = votes_opp = 0
        for w in ways:
            g = [(n["lon"], n["lat"]) for n in w["geometry"]]
            for i in range(len(g) - 1):
                mx, my = (g[i][0] + g[i+1][0]) / 2, (g[i][1] + g[i+1][1]) / 2
                # segmento centerline piu' vicino (entro ~40m)
                best, bd = None, 1e9
                for s in segs[::3]:
                    dx, dy = mx - s[0][0], my - s[0][1]
                    dd = dx * dx + dy * dy
                    if dd < bd: bd, best = dd, s
                if best is None or bd > (0.0004 ** 2):
                    continue
                if abs(angdiff(heading(g[i], g[i+1]), heading(best[0], best[1]))) < math.pi / 2:
                    votes_same += 1
                else:
                    votes_opp += 1
        # --- start/finish nodes ---
        q2 = (f"[out:json][timeout:40];node[\"raceway\"~\"start|finish\"]"
              f"(around:3000,{lat0},{lon0});out;")
        try:
            res2 = post(q2)
            sf = [{"lat": e["lat"], "lon": e["lon"], "tags": e.get("tags", {})}
                  for e in res2.get("elements", []) if e.get("type") == "node"]
        except Exception:
            sf = []
        verdict = "SAME" if votes_same > votes_opp else ("OPP" if votes_opp > votes_same else "TIE")
        report[cid] = {"oneway_same": votes_same, "oneway_opp": votes_opp,
                       "verdict": verdict, "n_ways": len(ways), "start_nodes": sf}
        print(f"{cid:10s} ways={len(ways):4d} same={votes_same:4d} opp={votes_opp:4d} -> {verdict} | sf_nodes={len(sf)}", flush=True)
        time.sleep(3)
    json.dump(report, open(OUT, "w"), indent=1)
    print("scritto", OUT)

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else None)
