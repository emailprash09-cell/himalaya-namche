"""Bake the M1 entrance area: terrain grids and layout from open data.

Inputs : data/raw/dem/Copernicus_DSM_COG_10_N27_00_E086_00_DEM.tif (Copernicus GLO-30)
         data/raw/namche-osm.geojson (OpenStreetMap, ODbL)
         client/src/config/world.json (tuning)
Outputs: client/public/assets/entrance/{near.bin, near_ground.bin, mid.bin, far.bin, layout.json}

World frame: x east, y up, z south, metres. world = real * s about the origin (27.805 N, 86.71 E),
and y = (h - hRef) * s, so every slope and sight line keeps its real angle. Human-scale things
(gate, stupa, people, steps) are not scaled; only positions and terrain are.

Run:  "$NAMCHE_PY" tools/geo/bake_entrance.py
"""
import json, hashlib, math, os
import numpy as np
import tifffile
from scipy.ndimage import gaussian_filter, map_coordinates
from shapely.geometry import Polygon, LineString, Point
from shapely.affinity import rotate

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CFG = json.load(open(os.path.join(ROOT, 'client/src/config/world.json'), encoding='utf8'))
OUT = os.path.join(ROOT, 'client/public/assets/entrance')
os.makedirs(OUT, exist_ok=True)

G = CFG['geo']; S = CFG['worldScale']
LAT0, LON0, MLAT, MLON = G['lat0'], G['lon0'], G['mlat'], G['mlon']

# ---------------------------------------------------------------- DEM
tif = tifffile.TiffFile(os.path.join(ROOT, 'data/raw/dem/Copernicus_DSM_COG_10_N27_00_E086_00_DEM.tif'))
page = tif.pages[0]
DEM = page.asarray().astype(np.float32)
TP = page.tags['ModelTiepointTag'].value
PS = page.tags['ModelPixelScaleTag'].value
# GLO-30 is a surface model (it includes roofs and trees). Smooth it a little for the town so the
# ground under the generated lodges is not lumpy with the real roofs.
DEM_S = gaussian_filter(DEM, 1.1)


def dem_rc(lat, lon):
    # RasterPixelIsPoint: pixel (r, c) sits exactly on the tie point plus r*scale.
    return (TP[4] - lat) / PS[1], (lon - TP[3]) / PS[0]


def h_real(xr, zr, smooth=True):
    """Height in metres above sea level at real local metres (x east, z south)."""
    lat = LAT0 - np.asarray(zr, float) / MLAT
    lon = LON0 + np.asarray(xr, float) / MLON
    r, c = dem_rc(lat, lon)
    return map_coordinates(DEM_S if smooth else DEM, [np.atleast_1d(r), np.atleast_1d(c)], order=3, mode='nearest')


def xz_real(lonlat):
    return ((lonlat[0] - LON0) * MLON, -(lonlat[1] - LAT0) * MLAT)


# ---------------------------------------------------------------- OSM
OSM = json.load(open(os.path.join(ROOT, 'data/raw/namche-osm.geojson'), encoding='utf8'))
BY_ID = {f['id']: f for f in OSM['features']}


def way_pts(fid):
    gm = BY_ID[fid]['geometry']
    cs = gm['coordinates'][0] if gm['type'] == 'Polygon' else gm['coordinates']
    return np.array([xz_real(c) for c in cs])


GATE_NODE = np.array(xz_real(BY_ID['node/13793755901']['geometry']['coordinates']))
H_REF = float(h_real(*GATE_NODE)[0])
H_REF = round(H_REF, 1)


def to_world_xz(p):
    return np.asarray(p, float) * S


def wy(h):
    return (np.asarray(h, float) - H_REF) * S


def resample(pts, step):
    pts = np.asarray(pts, float)
    seg = np.linalg.norm(np.diff(pts, axis=0), axis=1)
    s = np.concatenate([[0], np.cumsum(seg)])
    n = max(2, int(math.ceil(s[-1] / step)) + 1)
    t = np.linspace(0, s[-1], n)
    return np.stack([np.interp(t, s, pts[:, 0]), np.interp(t, s, pts[:, 1])], 1), t


def smooth1d(v, sigma_samples):
    if sigma_samples <= 0:
        return v
    pad = int(3 * sigma_samples) + 1
    vp = np.concatenate([np.full(pad, v[0]), v, np.full(pad, v[-1])])
    return gaussian_filter(vp, sigma_samples)[pad:-pad]


# ---------------------------------------------------------------- paths (world)
# The trail from below, reversed so it runs from the far end up to the gate.
trail_real = way_pts('way/551441452')
if np.linalg.norm(trail_real[0] - GATE_NODE) < np.linalg.norm(trail_real[-1] - GATE_NODE):
    trail_real = trail_real[::-1]
# Keep the last 120 world metres below the gate.
tw, tt = resample(to_world_xz(trail_real), 0.5)
keep = tt >= tt[-1] - 120
tw = tw[keep]
gate_pass = to_world_xz(way_pts('way/551441451'))           # south face -> north face
if np.linalg.norm(gate_pass[0] - tw[-1]) > np.linalg.norm(gate_pass[-1] - tw[-1]):
    gate_pass = gate_pass[::-1]
foot = to_world_xz(way_pts('way/1373254109'))                # gate north -> foot of main steps
if np.linalg.norm(foot[0] - gate_pass[-1]) > np.linalg.norm(foot[-1] - gate_pass[-1]):
    foot = foot[::-1]
kora_side = to_world_xz(way_pts('way/56081261'))
steps_main = to_world_xz(way_pts('way/551442828'))

# One continuous route: trail -> gate passage -> footbridge path.
route = np.concatenate([tw, gate_pass[1:], foot[1:]])
route, rs = resample(route, 0.5)
gate_world = to_world_xz(GATE_NODE)
# Gate yaw: along the passage (south face to north face).
gdir = gate_pass[-1] - gate_pass[0]
gate_yaw = math.atan2(-gdir[0], -gdir[1])  # yaw so that local -z points up the passage
gate_mid = (gate_pass[0] + gate_pass[-1]) / 2
i_gate = int(np.argmin(np.linalg.norm(route - gate_mid, axis=1)))
s_gate = rs[i_gate]

# Height profile along the route: smoothed ground, the gate floor flat, then a short flight inside.
prof = wy(h_real(*(route / S).T))
prof = smooth1d(prof, 10)  # sigma 5 m
gate_floor = float(prof[i_gate])
half_gate = 2.25
for i, s in enumerate(rs):
    if abs(s - s_gate) <= half_gate + 1.0:
        prof[i] = gate_floor
# Below the gate, blend the last 10 m into the gate floor so the ramp meets it.
for i, s in enumerate(rs):
    d = s_gate - half_gate - 1.0 - s
    if 0 < d < 10:
        t = d / 10
        prof[i] = gate_floor * (1 - t * t * (3 - 2 * t)) + prof[i] * (t * t * (3 - 2 * t))

# Stupa and plaza.
stupa_poly_real = way_pts('way/344630942')
stupa_c = to_world_xz(Polygon(stupa_poly_real).centroid.coords[0])
plaza_y = float(wy(h_real(*(stupa_c / S)))[0])
# Inside the gate: a flight of six 0.17 m risers up to the landing (measured), then the path
# continues at landing height across the footbridge to the plaza.
RISER, TREAD, N_RISERS = 0.17, 0.32, 6
flight_start = s_gate + half_gate + 1.4
landing_y = gate_floor + RISER * N_RISERS
# Plaza must be at or above the landing; any remainder is a gentle ramp to the plaza.
plaza_y = max(plaza_y, landing_y + 0.3)
s_end = rs[-1]
for i, s in enumerate(rs):
    if s < flight_start:
        continue
    k = int((s - flight_start) / TREAD) + 1
    if k <= N_RISERS:
        prof[i] = gate_floor + RISER * k
    else:
        t = min(1.0, (s - (flight_start + TREAD * N_RISERS)) / max(1.0, s_end - flight_start - TREAD * N_RISERS))
        prof[i] = landing_y + (plaza_y - landing_y) * t

steps = []
for k in range(1, N_RISERS + 1):
    s0 = flight_start + TREAD * (k - 1)
    i0 = int(np.argmin(abs(rs - s0)))
    i1 = min(len(rs) - 1, i0 + 2)
    d = route[i1] - route[i0]
    steps.append(dict(x=float(route[i0][0]), z=float(route[i0][1]), y=gate_floor + RISER * k,
                      yaw=math.atan2(-d[0], -d[1]), w=3.0, d=TREAD, top=True))

# ---------------------------------------------------------------- spawn, invented rill and bridge
sp_cfg = CFG['spawn']
s_spawn = s_gate - half_gate - sp_cfg['downTrail']
i_sp = int(np.argmin(abs(rs - s_spawn)))
i_br = int(np.argmin(abs(rs - (s_spawn - sp_cfg['bridgeBehind']))))
br_dir = route[min(i_br + 2, len(route) - 1)] - route[max(i_br - 2, 0)]
br_dir /= np.linalg.norm(br_dir)
br_perp = np.array([br_dir[1], -br_dir[0]])  # points right of the walking direction... sign fixed below
bridge = route[i_br]
stream_below = to_world_xz(way_pts('way/312775993'))
# The rill runs from the slope on the east of the trail, under the bridge, down west to the mapped stream.
west = br_perp if br_perp[0] < 0 else -br_perp
join = stream_below[int(np.argmin(np.linalg.norm(stream_below - (bridge + west * 25), axis=1)))]
rill = np.array([bridge - west * 14, bridge - west * 4, bridge, bridge + west * 6, (bridge + west * 6 + join) / 2, join])
rill, _ = resample(rill, 0.5)

# ---------------------------------------------------------------- grids
NEAR = CFG['near']; MID = CFG['mid']


def grid_xy(x0, z0, sx, sz, step):
    nx = int(round(sx / step)) + 1; nz = int(round(sz / step)) + 1
    xs = x0 + np.arange(nx) * step; zs = z0 + np.arange(nz) * step
    X, Z = np.meshgrid(xs, zs)
    return X, Z, nx, nz


def seg_dist(P, a, b):
    """Distance from points P (N,2) to segment ab, and the parameter t along it."""
    ab = b - a; L2 = float(ab @ ab) or 1e-9
    t = np.clip(((P - a) @ ab) / L2, 0, 1)
    proj = a + t[:, None] * ab
    return np.linalg.norm(P - proj, axis=1), t


def poly_dist(P, pts):
    best = np.full(len(P), 1e9); idx = np.zeros(len(P), int); tt = np.zeros(len(P))
    for i in range(len(pts) - 1):
        d, t = seg_dist(P, pts[i], pts[i + 1])
        m = d < best
        best[m] = d[m]; idx[m] = i; tt[m] = t[m]
    return best, idx, tt


def sstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


# Near grid.
X, Z, nxn, nzn = grid_xy(NEAR['x0'], NEAR['z0'], NEAR['size'], NEAR['size'], NEAR['step'])
P = np.stack([X.ravel(), Z.ravel()], 1)
Hn = wy(h_real(P[:, 0] / S, P[:, 1] / S)).astype(np.float64)
ground = np.zeros(len(P), np.uint8)  # 0 grass, 1 dirt, 2 stone paving, 3 stream bed, 4 rock

# Market ground: flatten to its mean, bare dirt.
mk = next(l for l in json.load(open(os.path.join(ROOT, 'docs/audit/landmarks.json'), encoding='utf8')) if l['key'] == 'market_ground')
mk_c = to_world_xz([mk['x'], mk['z']])
MW, MD = CFG['market']['w'], CFG['market']['d']
dxm = np.abs(P[:, 0] - mk_c[0]) - MW / 2; dzm = np.abs(P[:, 1] - mk_c[1]) - MD / 2
dm = np.maximum(dxm, dzm)
inside_m = dm < 0
mk_y = float(np.median(Hn[inside_m]))
wm = 1 - sstep(0, 6, dm)
Hn = Hn * (1 - wm) + mk_y * wm
ground[dm < 1.5] = 1

# Stupa plaza: flat paving.
PW, PD = CFG['plaza']['w'], CFG['plaza']['d']
dp = np.maximum(np.abs(P[:, 0] - stupa_c[0]) - PW / 2, np.abs(P[:, 1] - stupa_c[1]) - PD / 2)
wp = 1 - sstep(0, 4, dp)
Hn = Hn * (1 - wp) + plaza_y * wp
ground[dp < 0] = 2

# Route corridor: path half-width 1.3 m, shoulders blend over 3 m.
d_r, i_r, t_r = poly_dist(P, route)
s_proj = rs[i_r] + t_r * (rs[np.minimum(i_r + 1, len(rs) - 1)] - rs[i_r])
p_at = np.interp(s_proj, rs, prof)
# Inside the gate and the flight, the corridor is wider so the flight sits in a cutting.
wr = 1 - sstep(1.6, 4.5, d_r)
# Under the inner flight the ground sits 0.3 m below a straight ramp through the step nosings,
# so the visible steps stand clear and the physics ramp (built at runtime) is the only surface.
f_end = flight_start + TREAD * (N_RISERS - 1)
in_flight = (s_proj > flight_start - TREAD - 0.2) & (s_proj < f_end + 0.25) & (d_r < 2.4)
ramp = gate_floor + np.clip((s_proj - (flight_start - TREAD)) / (TREAD * N_RISERS), 0, 1) * RISER * N_RISERS
p_at = np.where(in_flight, ramp - 0.3, p_at)
Hn = Hn * (1 - wr) + (p_at - 0.03) * wr
ground[(d_r < 2.2) & (ground == 0)] = 1

# Side path round the north of the stupa (the kora side), gentle blend only.
d_k, _, _ = poly_dist(P, kora_side)
ground[(d_k < 1.2) & (ground == 0)] = 1

# Streams: carve the mapped open stretches and the invented rill.
water = []
for wid in ['way/312775993', 'way/1267933034', 'way/1267933032']:
    pts = to_world_xz(way_pts(wid))
    water.append(dict(id=wid, invented=False, pts=pts))
water.append(dict(id='rill_below_gate', invented=True, pts=rill))
for w in water:
    pts, _ = resample(w['pts'], 0.5)
    w['pts'] = pts
    d_w, i_w, t_w = poly_dist(P, pts)
    bed = wy(h_real(*(pts / S).T))
    bed = smooth1d(bed, 6) - 0.75
    # Never let the bed rise downstream (water must flow).
    bed = np.minimum.accumulate(bed) if bed[0] > bed[-1] else np.minimum.accumulate(bed[::-1])[::-1]
    w['bed'] = bed
    b_at = bed[i_w]
    cut = 1 - sstep(0.7, 2.6, d_w)
    Hn = np.where(cut > 0, np.minimum(Hn, Hn * (1 - cut) + b_at * cut), Hn)
    ground[(d_w < 1.1)] = 3

Hn = Hn.reshape(nzn, nxn).astype(np.float32)
ground = ground.reshape(nzn, nxn)
# Rock on steep ground.
gy, gx = np.gradient(Hn, NEAR['step'])
slope = np.hypot(gx, gy)
ground[(slope > 1.0) & (ground == 0)] = 4
Hn.tofile(os.path.join(OUT, 'near.bin'))
ground.tofile(os.path.join(OUT, 'near_ground.bin'))


def near_h(x, z):
    fx = (np.asarray(x) - NEAR['x0']) / NEAR['step']; fz = (np.asarray(z) - NEAR['z0']) / NEAR['step']
    return map_coordinates(Hn, [np.atleast_1d(fz), np.atleast_1d(fx)], order=1, mode='nearest')


# Mid grid: plain smoothed ground, sunk 1.5 m inside the near window so the near mesh covers it.
Xm, Zm, nxm, nzm = grid_xy(MID['x0'], MID['z0'], MID['sizeX'], MID['sizeZ'], MID['step'])
Hm = wy(h_real(Xm.ravel() / S, Zm.ravel() / S)).reshape(nzm, nxm).astype(np.float32)
inner = ((Xm > NEAR['x0'] + 3) & (Xm < NEAR['x0'] + NEAR['size'] - 3) &
         (Zm > NEAR['z0'] + 3) & (Zm < NEAR['z0'] + NEAR['size'] - 3))
Hm[inner] -= 1.5
Hm.tofile(os.path.join(OUT, 'mid.bin'))

# Far grid: raw DEM (unsmoothed) for crisp ridges, in world units.
FAR = CFG['far']
lat_a, lat_b = FAR['lat']; lon_a, lon_b = FAR['lon']
xa, xb = (lon_a - LON0) * MLON * S, (lon_b - LON0) * MLON * S
za, zb = -(lat_b - LAT0) * MLAT * S, -(lat_a - LAT0) * MLAT * S
fstep = FAR['step']
Xf, Zf, nxf, nzf = grid_xy(xa, za, xb - xa, zb - za, fstep)
Hf = wy(h_real(Xf.ravel() / S, Zf.ravel() / S, smooth=False)).reshape(nzf, nxf).astype(np.float32)
mid_inner = ((Xf > MID['x0'] + fstep) & (Xf < MID['x0'] + MID['sizeX'] - fstep) &
             (Zf > MID['z0'] + fstep) & (Zf < MID['z0'] + MID['sizeZ'] - fstep))
Hf[mid_inner] -= 25.0
Hf.tofile(os.path.join(OUT, 'far.bin'))

# ---------------------------------------------------------------- lodges from OSM footprints
LC = CFG['lodges']
EXCLUDE = {'way/344630942', 'way/344630686', 'way/1050011453', 'way/1050011454'}
corridors = [LineString(route).buffer(3.2), LineString(kora_side).buffer(2.0),
             LineString(steps_main).buffer(2.0),
             Polygon([(stupa_c[0] - PW / 2, stupa_c[1] - PD / 2), (stupa_c[0] + PW / 2, stupa_c[1] - PD / 2),
                      (stupa_c[0] + PW / 2, stupa_c[1] + PD / 2), (stupa_c[0] - PW / 2, stupa_c[1] + PD / 2)]).buffer(1.0),
             Polygon([(mk_c[0] - MW / 2, mk_c[1] - MD / 2), (mk_c[0] + MW / 2, mk_c[1] - MD / 2),
                      (mk_c[0] + MW / 2, mk_c[1] + MD / 2), (mk_c[0] - MW / 2, mk_c[1] + MD / 2)]).buffer(2.0)]
for w in water:
    corridors.append(LineString(w['pts']).buffer(1.5))
cands = []
for f in OSM['features']:
    p = f['properties']
    if 'building' not in p or f['id'] in EXCLUDE or f['geometry']['type'] != 'Polygon':
        continue
    if any(k in p for k in ('man_made', 'historic', 'amenity')):
        continue
    pr = way_pts(f['id'])
    c = Polygon(pr).centroid
    # North of the plaza, the slope the entrance view looks at.
    if not (-190 < c.x < 70 and -40 < c.y < 168):
        continue
    poly = Polygon(to_world_xz(pr))
    mrr = poly.minimum_rotated_rectangle
    q = np.array(mrr.exterior.coords)[:4]
    e1 = q[1] - q[0]; e2 = q[2] - q[1]
    l1, l2 = np.linalg.norm(e1), np.linalg.norm(e2)
    # Footprints are scaled gently about their centroids (human-scale things are never shrunk much).
    k = LC['footprintScale'] / S
    w_ = float(np.clip(l1 * k, LC['minSide'], LC['maxSide'])); d_ = float(np.clip(l2 * k, LC['minSide'] * 0.8, LC['maxSide']))
    yaw = -math.atan2(e1[1], e1[0])
    cx, cz = poly.centroid.x, poly.centroid.y
    rect = Polygon([(-w_ / 2, -d_ / 2), (w_ / 2, -d_ / 2), (w_ / 2, d_ / 2), (-w_ / 2, d_ / 2)])
    rect = rotate(rect, -yaw, origin=(0, 0), use_radians=True)
    rect = Polygon([(x + cx, z + cz) for x, z in rect.exterior.coords])
    cands.append(dict(id=f['id'], cx=cx, cz=cz, w=w_, d=d_, yaw=yaw, poly=rect, area=poly.area))
# Priority: closest to the line of sight from the spawn to the stupa first, then size.
spawn_xz = route[i_sp]
for c in cands:
    v = np.array([c['cx'], c['cz']]) - spawn_xz
    c['dist'] = float(np.linalg.norm(v))
    c['score'] = c['area'] / (1 + c['dist'] / 60)
cands.sort(key=lambda c: -c['score'])
chosen = []
for c in cands:
    if any(c['poly'].intersects(k) for k in corridors):
        continue
    if math.hypot(c['cx'] - stupa_c[0], c['cz'] - stupa_c[1]) < 17:
        continue
    if any(c['poly'].buffer(1.2).intersects(o['poly']) for o in chosen):
        continue
    chosen.append(c)
    if len(chosen) >= LC['max']:
        break


def ground_at(x, z):
    inside = (NEAR['x0'] < x < NEAR['x0'] + NEAR['size']) and (NEAR['z0'] < z < NEAR['z0'] + NEAR['size'])
    if inside:
        return float(near_h(x, z)[0])
    return float(wy(h_real(x / S, z / S))[0])


lodges = []
for c in chosen:
    cs = np.array(c['poly'].exterior.coords)[:4]
    hs = [ground_at(x, z) for x, z in list(cs) + [(c['cx'], c['cz'])]]
    hsh = int(hashlib.md5(c['id'].encode()).hexdigest()[:8], 16)
    storeys = 2 + (hsh % 3) if c['w'] * c['d'] > 60 else 2 + (hsh % 2)
    lodges.append(dict(id=c['id'], x=round(c['cx'], 2), z=round(c['cz'], 2), w=round(c['w'], 2), d=round(c['d'], 2),
                       yaw=round(c['yaw'], 4), yMin=round(min(hs), 2), yMax=round(max(hs), 2), storeys=storeys,
                       seed=hsh, role=None))
# Roles from the entrance photo: a blue-roofed lodge left of the stupa, a pink-and-white one behind it.
if lodges:
    def nearest(target):
        return min(lodges, key=lambda l: (l['x'] - target[0]) ** 2 + (l['z'] - target[1]) ** 2)
    nearest(stupa_c + np.array([-16.0, -2.0]))['role'] = 'blueRoof'
    behind = nearest(stupa_c + np.array([2.0, -20.0]))
    if behind['role'] is None:
        behind['role'] = 'pinkWhite'

# ---------------------------------------------------------------- layout
def r2(a):
    return [round(float(v), 3) for v in a]


layout = dict(
    source=dict(osm='data/raw/namche-osm.geojson (OpenStreetMap contributors, ODbL)',
                dem='Copernicus GLO-30 DEM (ESA, Copernicus programme)'),
    scale=S, hRef=H_REF,
    near=dict(x0=NEAR['x0'], z0=NEAR['z0'], step=NEAR['step'], nx=nxn, nz=nzn),
    mid=dict(x0=MID['x0'], z0=MID['z0'], step=MID['step'], nx=nxm, nz=nzm),
    far=dict(x0=float(xa), z0=float(za), step=fstep, nx=nxf, nz=nzf),
    gate=dict(x=float(gate_mid[0]), z=float(gate_mid[1]), y=gate_floor, yaw=gate_yaw, osm='way/344630686'),
    stupa=dict(x=float(stupa_c[0]), z=float(stupa_c[1]), y=plaza_y, osm='way/344630942'),
    plaza=dict(x=float(stupa_c[0]), z=float(stupa_c[1]), y=plaza_y, w=PW, d=PD),
    market=dict(x=float(mk_c[0]), z=float(mk_c[1]), y=mk_y, w=MW, d=MD),
    route=dict(pts=[r2(p) + [round(float(h), 3)] for p, h in zip(route[::2], prof[::2])],
               gateS=float(s_gate), flightStart=float(flight_start)),
    flight=steps,
    sidePath=[r2(p) + [round(float(near_h(*p)[0]), 3)] for p in resample(kora_side, 1.0)[0]],
    spawn=dict(x=float(route[i_sp][0]), z=float(route[i_sp][1]), y=float(prof[i_sp])),
    bridge=dict(x=float(bridge[0]), z=float(bridge[1]), y=float(prof[i_br]),
                yaw=math.atan2(-br_dir[0], -br_dir[1]), invented=True,
                reason='OSM has no bridge below the gate and the trail crosses no mapped stream; the brief opens on a bridge.'),
    water=[dict(id=w['id'], invented=w['invented'], pts=[r2(p) + [round(float(b) + 0.35, 3)] for p, b in zip(w['pts'][::2], w['bed'][::2])])
           for w in water],
    lodges=lodges,
)
json.dump(layout, open(os.path.join(OUT, 'layout.json'), 'w'), indent=1)
print(f'hRef {H_REF} m, gate floor {gate_floor:.2f}, plaza {plaza_y:.2f}, market {mk_y:.2f}')
print(f'spawn {layout["spawn"]}, bridge {bridge}, lodges {len(lodges)} of {len(cands)} candidates')
print(f'near {nxn}x{nzn}, mid {nxm}x{nzm}, far {nxf}x{nzf}')
print('far peak max (real m):', float(Hf.max() / S + H_REF))
