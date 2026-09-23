#!/usr/bin/env python3
"""Converte i GeoJSON reali (bacinger/f1-circuits, licenza MIT) nel formato PomoGP.

Pipeline per ogni circuito:
  lon/lat -> metri (equirettangolare) -> RDP simplify -> winding check
  -> rotazione start/finish -> fit in viewBox 0 0 1000 600 -> path SVG

Calibrazione documentata in tools/overrides.json:
  - senso di marcia verificato (Overpass oneway + fonti: Wikipedia/StatsF1/F1DB)
  - start/finish: nodo OSM raceway=start-finish dove mappato, altrimenti
    indice 0 del dataset (verificato <50 m dal nodo S/F a Melbourne e Austin)

Uso:  python3 tools/convert.py
Output: data/circuits.json (solo campo path sostituito)
        tools/fallback_circuits.js (array da incorporare in js/app.js per uso offline)
"""
import json, math, sys

BASE = "/Users/francescomonticone/projects/PomoGP"
VIEW_W, VIEW_H, PAD = 1000, 600, 70
RDP_TOL_M = 2.0  # fedelta' alta: scarto max 2 m dalla geometria reale

# Senso di marcia reale (visto su mappa nord-su): CW = orario, CCW = antiorario.
# Verifiche: oneway OSM (jeddah/miami/montreal/austin SAME forte, monaco SAME),
# Wikipedia/StatsF1/F1DB per gli altri. Solo Singapore richiede inversione.
RACE_WINDING = {
    "bahrain": "CW", "jeddah": "CCW", "melbourne": "CW", "suzuka": "CW",
    "shanghai": "CW", "miami": "CCW", "imola": "CCW", "monaco": "CW",
    "barcelona": "CW", "montreal": "CW", "spielberg": "CW", "silverstone": "CW",
    "spa": "CW", "budapest": "CW", "zandvoort": "CW", "monza": "CW",
    "baku": "CCW", "singapore": "CCW", "austin": "CCW", "mexico": "CW",
    "saopaulo": "CCW", "vegas": "CCW", "qatar": "CW", "abudhabi": "CCW",
}
# Start/finish verificati via nodo OSM (lon, lat). Gli altri: indice 0 del dataset.
START_LONLAT = {
    "monaco": [7.42719, 43.73785],  # nodo "Monaco Grand Prix Start/Finish Line"
}

def project(coords):
    lon0 = sum(p[0] for p in coords) / len(coords)
    lat0 = sum(p[1] for p in coords) / len(coords)
    kx = math.cos(math.radians(lat0)) * 111320.0
    ky = 110540.0
    return [((p[0] - lon0) * kx, -(p[1] - lat0) * ky) for p in coords], (lon0, lat0)

def signed_area(pts):
    return sum((pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1])
               for i in range(len(pts) - 1)) / 2

def rdp(pts, tol):
    """Ramer-Douglas-Peucker iterativo su anello aperto (ultimo punto = primo)."""
    if len(pts) < 3:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        if b - a < 2:
            continue
        ax, ay = pts[a]
        bx, by = pts[b]
        dx, dy = bx - ax, by - ay
        norm = math.hypot(dx, dy) or 1e-9
        dmax, idx = -1.0, -1
        for i in range(a + 1, b):
            d = abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / norm
            if d > dmax:
                dmax, idx = d, i
        if dmax > tol:
            keep[idx] = True
            stack.append((a, idx))
            stack.append((idx, b))
    return [p for p, k in zip(pts, keep) if k]

def nearest_index(pts_m, lonlat, origin):
    lon0, lat0 = origin
    kx = math.cos(math.radians(lat0)) * 111320.0
    tx = (lonlat[0] - lon0) * kx
    ty = -(lonlat[1] - lat0) * 110540.0
    return min(range(len(pts_m)), key=lambda i: (pts_m[i][0] - tx) ** 2 + (pts_m[i][1] - ty) ** 2)

def convert(cid):
    raw = json.load(open(f"{BASE}/vendor/geojson/{cid}.geojson"))
    coords = raw["features"][0]["geometry"]["coordinates"]
    pts_m, origin = project(coords)
    # chiudi l'anello (i dataset sono gia' chiusi, gap 0 m)
    if math.hypot(pts_m[0][0] - pts_m[-1][0], pts_m[0][1] - pts_m[-1][1]) > 0.5:
        pts_m.append(pts_m[0])
    want = RACE_WINDING[cid]
    have = "CW" if signed_area(pts_m) > 0 else "CCW"
    reversed_flag = False
    start_idx = 0
    if cid in START_LONLAT:
        start_idx = nearest_index(pts_m, START_LONLAT[cid], origin)
    if have != want:
        pts_m = pts_m[::-1]
        reversed_flag = True
        if cid in START_LONLAT:
            start_idx = nearest_index(pts_m, START_LONLAT[cid], origin)
        # senza nodo S/F: l'inversione sposta lo start in fondo -> ruota per tenerlo primo
        # (qui: start era indice 0, dopo reverse e' in coda -> rotazione di 1)
    pts_m = pts_m[start_idx:] + pts_m[:start_idx]
    if pts_m[0] != pts_m[-1]:
        pts_m.append(pts_m[0])
    before = len(pts_m)
    # RDP su anello CHIUSO collassa (segmento degenere P0->P0): togli il
    # duplicato di chiusura, semplifica la catena aperta, richiudi.
    body = pts_m[:-1]
    body = rdp(body, RDP_TOL_M)
    pts_m = body + [body[0]]
    final_wind = "CW" if signed_area(pts_m) > 0 else "CCW"
    assert final_wind == want, f"{cid}: winding {final_wind} != atteso {want}"
    xs = [p[0] for p in pts_m]
    ys = [p[1] for p in pts_m]
    minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)
    s = min((VIEW_W - 2 * PAD) / (maxx - minx), (VIEW_H - 2 * PAD) / (maxy - miny))
    ox = (VIEW_W - s * (maxx - minx)) / 2 - s * minx
    oy = (VIEW_H - s * (maxy - miny)) / 2 - s * miny
    norm = [(round(s * x + ox, 1), round(s * y + oy, 1)) for x, y in pts_m]
    d = "M " + " L ".join(f"{x} {y}" for x, y in norm[:-1]) + " Z"
    return d, {"in": before, "out": len(norm), "reversed": reversed_flag,
               "winding": final_wind, "start": "osm-node" if cid in START_LONLAT else "index0"}

def main():
    circuits = json.load(open(f"{BASE}/data/circuits.json"))
    by_id = {c["id"]: c for c in circuits}
    assert set(by_id) == set(RACE_WINDING), "mismatch id calendario"
    fb = []
    print(f"{'id':10s} {'in':>4s} {'out':>4s} rev  wind start")
    for c in circuits:
        cid = c["id"]
        d, info = convert(cid)
        c["path"] = d
        fb.append({"id": cid, "name": c["name"], "country": c["country"],
                   "lengthKm": c["lengthKm"], "path": d})
        print(f"{cid:10s} {info['in']:4d} {info['out']:4d} "
              f"{'YES' if info['reversed'] else 'no ':3s} {info['winding']:4s} {info['start']}")
    json.dump(circuits, open(f"{BASE}/data/circuits.json", "w"), indent=1)
    json.dump({
        "source": "bacinger/f1-circuits (MIT, github.com/bacinger/f1-circuits)",
        "note": "Geometrie reali semplificate (RDP 2 m), normalizzate in viewBox 0 0 1000 600. "
                "Senso di marcia verificato via OSM oneway + Wikipedia/StatsF1. "
                "Start/finish da nodo OSM dove mappato, altrimenti indice 0 del dataset.",
        "race_winding": RACE_WINDING,
        "start_override_lonlat": START_LONLAT,
    }, open(f"{BASE}/tools/overrides.json", "w"), indent=1)
    js = ("/* Auto-generato da tools/convert.py — mirror di data/circuits.json per uso offline (file://). */\n"
          "const FALLBACK_CIRCUITS = " + json.dumps(fb) + ";\n")
    open(f"{BASE}/tools/fallback_circuits.js", "w").write(js)
    print("OK: data/circuits.json, tools/overrides.json, tools/fallback_circuits.js")

if __name__ == "__main__":
    sys.exit(main())
