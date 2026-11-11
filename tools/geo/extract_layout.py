"""Extract the old walkable prototype's town (data/data.js, made by scripts/prep_osm.py) into
data/namche_layout.json, cross-checked against the OSM export, at REAL scale (no compression).

  "$NAMCHE_PY" tools/geo/extract_layout.py

One entry per building: id, osmId, x, z (centroid, local metres: x east, z south, origin 27.8050 N
86.7100 E), rotationDeg (compass bearing of the footprint's long axis), width (long side) and depth
(short side) in metres, storeys, roofColour, wallColour, frameColour, wall (stone, whitewash, wood,
plaster), type, balcony, name, footprint ring, and source ("prototype" or "osm-added").
Storeys and colours are the prototype's seeded choices (OSM has no levels or colours here).
"""
import json, math, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parents[2]
G = {'lat0': 27.805, 'lon0': 86.71, 'mlat': 110816.0, 'mlon': 98541.0}

# Palettes from src/game.js (ROOFC at line 1061, the wall styles at 635-642, styleOf at 1062).
ROOFC = ['#2f66b0', '#2c8c84', '#3b8853', '#ae3a2f', '#a5acb0', '#2d5d44']
STYLES = [
    ('stone', '#b9ad99', '#2f7d4f'), ('stone', '#b9ad99', '#b3332b'), ('stone', '#aaa69d', '#2a62a8'),
    ('whitewash', '#f0eee8', '#2a7ab8'), ('whitewash', '#efede6', '#2f8a57'), ('wood', '#3a86b4', '#f1ede4'),
    ('plaster', '#ead9c3', '#a8322a'), ('temple', '#f4f1ea', '#241c18'),
]
KINDS = ['house', 'lodge', 'shop', 'gompa', 'civic', 'museum']


def style_of(kind, wall, fr):
    if kind == 'gompa':
        return 7
    if wall == 0:
        return [1, 0, 2, 0][fr]
    if wall == 1:
        return [3, 4, 3, 4][fr]
    return 5 if wall == 2 else 6


def ring_info(ring):
    n = len(ring)
    a = cx = cz = 0.0
    for i in range(n):
        x0, z0 = ring[i]; x1, z1 = ring[(i + 1) % n]
        c = x0 * z1 - x1 * z0
        a += c; cx += (x0 + x1) * c; cz += (z0 + z1) * c
    a /= 2
    if abs(a) < 1e-9:
        return sum(p[0] for p in ring) / n, sum(p[1] for p in ring) / n, 0.0
    return cx / (6 * a), cz / (6 * a), abs(a)


def osm_buildings():
    g = json.loads((ROOT / 'data/raw/namche-osm.geojson').read_text(encoding='utf-8'))
    out = []
    for f in g['features']:
        p = f.get('properties') or {}
        if 'building' not in p:
            continue
        geom = f['geometry']
        rings = [geom['coordinates'][0]] if geom['type'] == 'Polygon' else \
            [poly[0] for poly in geom['coordinates']] if geom['type'] == 'MultiPolygon' else []
        for r in rings:
            ring = [((lon - G['lon0']) * G['mlon'], -(lat - G['lat0']) * G['mlat']) for lon, lat in r[:-1]]
            x, z, area = ring_info(ring)
            out.append({'id': p.get('@id') or f.get('id'), 'tags': p, 'ring': ring, 'x': x, 'z': z, 'area': area})
    return out


def min_rect(ring):
    """Long axis bearing and the long and short sides of the minimum-area bounding rectangle."""
    best = None
    n = len(ring)
    for i in range(n):
        dx = ring[(i + 1) % n][0] - ring[i][0]; dz = ring[(i + 1) % n][1] - ring[i][1]
        L = math.hypot(dx, dz)
        if L < 1e-6:
            continue
        ux, uz = dx / L, dz / L
        a = [p[0] * ux + p[1] * uz for p in ring]; b = [-p[0] * uz + p[1] * ux for p in ring]
        w, d = max(a) - min(a), max(b) - min(b)
        if best is None or w * d < best[0]:
            best = (w * d, w, d, ux, uz) if w >= d else (w * d, d, w, -uz, ux)
    _, w, d, ux, uz = best
    return math.degrees(math.atan2(ux, -uz)) % 180, w, d


def main():
    src = (ROOT / 'data/data.js').read_text(encoding='utf-8')
    N = json.loads(re.search(r'=\s*(\{.*\})\s*;?\s*$', src, re.S).group(1))
    osm = osm_buildings()
    used = set()
    out = []
    for i, b in enumerate(N['buildings']):
        ring = [tuple(p) for p in b['p']]
        x, z, area = ring_info(ring)
        # Match to the nearest OSM footprint (T1a nudged overlapping rings by a few decimetres).
        best, bd = None, 1e9
        for j, o in enumerate(osm):
            d = math.hypot(o['x'] - x, o['z'] - z)
            if d < bd:
                best, bd = j, d
        osm_id = None
        if best is not None and bd < 3.0:
            used.add(best); osm_id = osm[best]['id']
        kind = b['k'] if isinstance(b['k'], str) else KINDS[b['k']]
        s = STYLES[style_of(kind, b['w'], b['fr'])]
        rot, w, d = min_rect(ring)
        out.append({
            'id': f'b{i:03d}', 'osmId': osm_id, 'x': round(x, 2), 'z': round(z, 2), 'rotationDeg': round(rot, 1),
            'width': round(w, 2), 'depth': round(d, 2), 'areaM2': round(area, 1), 'storeys': b['f'],
            'roofColour': ROOFC[b['r']], 'wall': s[0], 'wallColour': s[1], 'frameColour': s[2],
            'type': kind, 'balcony': bool(b['b']), 'name': b.get('n') or None,
            'footprint': [[round(p[0], 2), round(p[1], 2)] for p in ring], 'source': 'prototype',
        })
    added = []
    for j, o in enumerate(osm):
        if j in used or o['area'] < 6:
            continue
        rot, w, d = min_rect(o['ring'])
        t = o['tags']
        kind = 'lodge' if t.get('tourism') in ('hotel', 'guest_house', 'hostel') else \
            'gompa' if t.get('building') in ('temple', 'monastery') or t.get('amenity') == 'place_of_worship' else \
            'shop' if 'shop' in t else 'house'
        lv = t.get('building:levels')
        storeys = int(float(lv)) if lv and re.match(r'^\d+(\.\d+)?$', lv) else (2 if o['area'] < 60 else 3)
        e = {'id': f'b{len(out) + len(added):03d}', 'osmId': o['id'], 'x': round(o['x'], 2), 'z': round(o['z'], 2),
             'rotationDeg': round(rot, 1), 'width': round(w, 2), 'depth': round(d, 2), 'areaM2': round(o['area'], 1),
             'storeys': storeys, 'roofColour': ROOFC[(len(added) * 7) % 6], 'wall': 'stone', 'wallColour': STYLES[0][1],
             'frameColour': STYLES[0][2], 'type': kind, 'balcony': False, 'name': t.get('name'),
             'footprint': [[round(p[0], 2), round(p[1], 2)] for p in o['ring']], 'source': 'osm-added'}
        added.append(e)
    allb = out + added
    xs = [b['x'] for b in allb]; zs = [b['z'] for b in allb]
    doc = {
        'about': 'Namche town layout at real scale, from the walkable prototype (data/data.js) cross-checked against '
                 'data/raw/namche-osm.geojson. Local metres: x east, z south, origin 27.8050 N 86.7100 E. '
                 'Storeys and colours are the prototype\'s seeded choices; OSM has no levels or colours here.',
        'geo': G, 'scale': 1.0,
        'counts': {'buildings': len(allb), 'fromPrototype': len(out), 'addedFromOsm': len(added),
                   'osmBuildings': len(osm), 'matchedToOsm': len(used),
                   'byType': {k: sum(1 for b in allb if b['type'] == k) for k in sorted({b['type'] for b in allb})}},
        'extent': {'x': [round(min(xs), 1), round(max(xs), 1)], 'z': [round(min(zs), 1), round(max(zs), 1)]},
        'paths': N['paths'], 'streams': N['streams'], 'poi': N['poi'], 'landmarks': N['lm'],
        'buildings': allb,
    }
    p = ROOT / 'data' / 'namche_layout.json'
    p.write_text(json.dumps(doc, separators=(',', ':')), encoding='utf-8')
    print(json.dumps(doc['counts']), doc['extent'], f'{p.stat().st_size / 1e6:.2f} MB')
    for e in added:
        print('added', e['id'], e['osmId'], e['type'], e['areaM2'], e['name'])


main()
