(async function(){
'use strict';
const $ = (s) => document.querySelector(s);
const statusEl = $('#status');
const setStatus = (t) => { statusEl.textContent = t; };
const nextFrame = () => new Promise((r) => setTimeout(r, 0));
function fail(msg){ setStatus(msg); statusEl.style.color = '#ffb4a8'; }
if (!window.THREE){ fail('The 3D engine didn’t load. Check your connection, then reload the page.'); return; }
const D = window.NAMCHE;
const coarse = matchMedia('(pointer: coarse)').matches;
if (coarse) document.documentElement.classList.add('coarse');
const TESTMODE = /[?&]test/.test(location.search);

/* ================= maths ================= */
const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const ss = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
function hash2(x, y){ const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); }
function vnoise(x, y){
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y){ return 0.5 * vnoise(x, y) + 0.25 * vnoise(x * 2.03 + 17.1, y * 2.03 + 3.3) + 0.125 * vnoise(x * 4.11 + 5.7, y * 4.11 + 9.2) + 0.0625 * vnoise(x * 8.3, y * 8.3); }
function mulberry(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const C = (h) => new THREE.Color(h);
function shade(hex, amt){ const c = new THREE.Color(hex); if (amt >= 0) c.lerp(new THREE.Color(1, 1, 1), amt); else c.multiplyScalar(1 + amt); return '#' + c.getHexString(); }
function mkCanvas(w, h){ const cv = document.createElement('canvas'); cv.width = w; cv.height = h; return [cv, cv.getContext('2d')]; }
const NOISE_GLSL = 'float gh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\nfloat gn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(gh(i), gh(i + vec2(1.0, 0.0)), f.x), mix(gh(i + vec2(0.0, 1.0)), gh(i + vec2(1.0, 1.0)), f.x), f.y); }\n';

/* ================= elevation ================= */
const dem = D.dem;
const DEMH = (() => { const bin = atob(dem.b64); const buf = new ArrayBuffer(bin.length); const u8 = new Uint8Array(buf); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); return new Int16Array(buf); })();
const NX = dem.nx, NZ = dem.nz, X0 = dem.x0, Z0 = dem.z0, DX = dem.dx, DZ = dem.dz;
const hs = (i, j) => { i = i < 0 ? 0 : (i >= NZ ? NZ - 1 : i); j = j < 0 ? 0 : (j >= NX ? NX - 1 : j); return DEMH[i * NX + j]; };
function farH(x, z){
  const gx = (x - X0) / DX, gz = (z - Z0) / DZ;
  const j = Math.floor(gx), i = Math.floor(gz), u = gx - j, v = gz - i;
  const ha = hs(i, j), hb = hs(i + 1, j), hc = hs(i + 1, j + 1), hd = hs(i, j + 1);
  if (u + v <= 1) return ha + (hd - ha) * u + (hb - ha) * v;
  return hc + (hb - hc) * (1 - u) + (hd - hc) * (1 - v);
}
const cr = (p0, p1, p2, p3, t) => p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)));
function bicubic(x, z){
  const gx = (x - X0) / DX, gz = (z - Z0) / DZ;
  const j = Math.floor(gx), i = Math.floor(gz), u = gx - j, v = gz - i;
  const r = (ii) => cr(hs(ii, j - 1), hs(ii, j), hs(ii, j + 1), hs(ii, j + 2), u);
  return cr(r(i - 1), r(i), r(i + 1), r(i + 2), v);
}

/* ================= renderer ================= */
const canvas = $('#view');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true, powerPreference: 'high-performance' }); }
catch (e) { fail('This browser can’t start WebGL, which the 3D view needs. Try a current Chrome, Edge, Firefox or Safari.'); return; }
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.12, 160000);
camera.rotation.order = 'YXZ';
const MAXANI = Math.min(8, renderer.capabilities.getMaxAnisotropy());
const tex = (cv, rep) => { const t = new THREE.CanvasTexture(cv); if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = MAXANI; return t; };

setStatus('Loading lettering…'); await nextFrame();
try { await Promise.race([Promise.all([document.fonts.load('600 64px Teko'), document.fonts.load('600 48px Hind')]), new Promise((r) => setTimeout(r, 2500))]); } catch (e) { /* fall back to system fonts */ }

/* ================= OpenStreetMap layers ================= */
setStatus('Reading the OpenStreetMap layers…'); await nextFrame();
const MK = D.mask;
const loadImg = (b64) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = 'data:image/png;base64,' + b64; });
const [imA, imB, imC] = await Promise.all([loadImg(MK.a), loadImg(MK.b), loadImg(MK.c)]);
function pix(im){ const [cv, c] = mkCanvas(im.width, im.height); c.drawImage(im, 0, 0); return c.getImageData(0, 0, im.width, im.height).data; }
const PA = pix(imA), PB = pix(imB), PC = pix(imC), MW = MK.w, MH = MK.h, MPX = MK.px;
function ms(P, x, z, ch){
  const fx = (x - MK.x0) / MPX - 0.5, fz = (z - MK.z0) / MPX - 0.5;
  const ix = Math.floor(fx), iz = Math.floor(fz), u = fx - ix, v = fz - iz;
  const g = (i, j) => (i < 0 || j < 0 || i >= MW || j >= MH) ? 0 : P[(j * MW + i) * 4 + ch];
  return (g(ix, iz) * (1 - u) * (1 - v) + g(ix + 1, iz) * u * (1 - v) + g(ix, iz + 1) * (1 - u) * v + g(ix + 1, iz + 1) * u * v) / 255;
}
const mPaved = (x, z) => ms(PA, x, z, 0), mDirt = (x, z) => ms(PA, x, z, 1), mWater = (x, z) => ms(PA, x, z, 2);
const mWood = (x, z) => ms(PB, x, z, 0), mScrub = (x, z) => ms(PB, x, z, 1), mRock = (x, z) => ms(PB, x, z, 2);
function inside(x, z){ const ix = Math.floor((x - MK.x0) / MPX), iz = Math.floor((z - MK.z0) / MPX); if (ix < 0 || iz < 0 || ix >= MW || iz >= MH) return false; return PC[(iz * MW + ix) * 4] > 127; }

/* ================= buildings + spatial index ================= */
const bbOf = (poly) => { let a = 1e9, b = -1e9, c = 1e9, d = -1e9; for (const p of poly){ if (p[0] < a) a = p[0]; if (p[0] > b) b = p[0]; if (p[1] < c) c = p[1]; if (p[1] > d) d = p[1]; } return [a, b, c, d]; };
const BLD = D.buildings.map((b, i) => {
  const poly = b.p.map((p) => [p[0], p[1]]);
  let A = 0; for (let k = 0, j = poly.length - 1; k < poly.length; j = k++) A += poly[j][0] * poly[k][1] - poly[k][0] * poly[j][1];
  if (A > 0) poly.reverse();
  return { i, poly, f: b.f, roof: b.r, wall: b.w, fr: b.fr, kind: b.k, bal: b.b, ux: b.u[0], uz: b.u[1], cx: b.c[0], cz: b.c[1], hw: b.d[0] / 2, hd: b.d[1] / 2, name: b.n || '', bb: bbOf(poly), top: 0 };
});
$('#fb').textContent = String(BLD.length);
function pip(poly, x, z){ let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++){ const xi = poly[i][0], zi = poly[i][1], xj = poly[j][0], zj = poly[j][1]; if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi)) c = !c; } return c; }
function edgeDist(poly, x, z){ let best = 1e9, bx = 0, bz = 0; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++){ const ax = poly[j][0], az = poly[j][1], ex = poly[i][0] - ax, ez = poly[i][1] - az; const t = clamp(((x - ax) * ex + (z - az) * ez) / (ex * ex + ez * ez || 1), 0, 1); const px = ax + ex * t, pz = az + ez * t, d = Math.hypot(x - px, z - pz); if (d < best){ best = d; bx = px; bz = pz; } } return [best, bx, bz]; }
const BH = new Map(), CELLM = 20;
function hashAdd(o){ const bb = o.bb; for (let gx = Math.floor((bb[0] - 1) / CELLM); gx <= Math.floor((bb[1] + 1) / CELLM); gx++) for (let gz = Math.floor((bb[2] - 1) / CELLM); gz <= Math.floor((bb[3] + 1) / CELLM); gz++){ const k = gx + ',' + gz; if (!BH.has(k)) BH.set(k, []); BH.get(k).push(o); } }
for (const b of BLD) hashAdd(b);
function nearBuilding(x, z, r){
  for (let gx = Math.floor((x - r) / CELLM); gx <= Math.floor((x + r) / CELLM); gx++) for (let gz = Math.floor((z - r) / CELLM); gz <= Math.floor((z + r) / CELLM); gz++){
    const L = BH.get(gx + ',' + gz); if (!L) continue;
    for (const o of L){ if (x < o.bb[0] - r || x > o.bb[1] + r || z < o.bb[2] - r || z > o.bb[3] + r) continue; if (pip(o.poly, x, z) || edgeDist(o.poly, x, z)[0] < r) return true; }
  }
  return false;
}
function rectPoly(x, z, hw, hd, ang){ const c = Math.cos(ang), s = Math.sin(ang); return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [x + a * hw * c - b * hd * s, z + a * hw * s + b * hd * c]); }
const SOLIDS = [];
function addSolid(poly, top){ const o = { poly, top, bb: bbOf(poly), solid: true }; SOLIDS.push(o); hashAdd(o); return o; }
function freeAt(x, z, r){ return inside(x, z) && !nearBuilding(x, z, r); }
// T1d: anything with a collision box keeps off the walking line of every path, so no prop can stand on a stair.
// (Only this one rule from the props task; doorways and facades are not checked yet.)
const PSEG = new Map(), PCELL = 10;
for (const p of D.paths) for (let i = 0; i < p.p.length - 1; i++){
  const a = p.p[i], b = p.p[i + 1];
  for (let gx = Math.floor((Math.min(a[0], b[0]) - 2) / PCELL); gx <= Math.floor((Math.max(a[0], b[0]) + 2) / PCELL); gx++) for (let gz = Math.floor((Math.min(a[1], b[1]) - 2) / PCELL); gz <= Math.floor((Math.max(a[1], b[1]) + 2) / PCELL); gz++){ const k = gx + ',' + gz; if (!PSEG.has(k)) PSEG.set(k, []); PSEG.get(k).push([a, b]); }
}
function pathDist(x, z){
  let best = 1e9;
  for (let gx = Math.floor(x / PCELL) - 1; gx <= Math.floor(x / PCELL) + 1; gx++) for (let gz = Math.floor(z / PCELL) - 1; gz <= Math.floor(z / PCELL) + 1; gz++){
    const L = PSEG.get(gx + ',' + gz); if (!L) continue;
    for (const [a, b] of L){ const ex = b[0] - a[0], ez = b[1] - a[1], t = clamp(((x - a[0]) * ex + (z - a[1]) * ez) / (ex * ex + ez * ez || 1), 0, 1); best = Math.min(best, Math.hypot(x - a[0] - ex * t, z - a[1] - ez * t)); }
  }
  return best;
}
const clearOfPaths = (x, z, r) => pathDist(x, z) >= r + 1.0;   // 1.0 m: half the widest stair plus a margin
function findFree(x, z, r, maxR, paths){ const ok = (px, pz) => freeAt(px, pz, r) && (!paths || clearOfPaths(px, pz, r)); if (ok(x, z)) return [x, z]; for (let rad = 2; rad <= (maxR || 70); rad += 2){ const n = Math.max(8, Math.floor(rad * 1.3)); for (let k = 0; k < n; k++){ const a = k / n * Math.PI * 2, px = x + Math.cos(a) * rad, pz = z + Math.sin(a) * rad; if (ok(px, pz)) return [px, pz]; } } return null; }
const corePts = [];
for (const p of D.paths){ if (!p.c) continue; for (let k = 0; k < p.p.length - 1; k++){ const a = p.p[k], b = p.p[k + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.floor(L / 4)); for (let t = 0; t < n; t++){ const f = t / n; corePts.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, Math.atan2(b[1] - a[1], b[0] - a[0])]); } } }

/* ================= landmark positions (before the terrain, so they get flat pads) ================= */
const POI = D.poi, LMK = {}, PADS = [];
{
  let best = null;
  for (const p of POI){ if (p.k !== 'shrine') continue; const d = Math.hypot(p.x - 44, p.z - 160); if (d < 150 && (!best || d < best.d)) best = { d, p }; }
  let s = best ? [best.p.x, best.p.z] : [44, 160]; if (best) best.p.used = true;
  s = findFree(s[0], s[1], 9.5, 90) || s;
  LMK.stupa = s; addSolid(rectPoly(s[0], s[1], 8.6, 8.6, 0), bicubic(s[0], s[1]) + 17);
  PADS.push({ x: s[0], z: s[1], hw: 10.5, hd: 10.5, ux: 1, uz: 0 });
}
LMK.pav = [];
for (const off of [[16, 4], [-15, 6], [4, -16], [-6, 17], [14, -12]]){
  if (LMK.pav.length >= 2) break;
  const q = findFree(LMK.stupa[0] + off[0], LMK.stupa[1] + off[1], 4.4, 16, true);
  if (q){ const ang = Math.atan2(LMK.stupa[1] - q[1], LMK.stupa[0] - q[0]); LMK.pav.push([q[0], q[1], ang, LMK.pav.length === 0]); addSolid(rectPoly(q[0], q[1], 3.1, 3.1, ang), bicubic(q[0], q[1]) + 6); PADS.push({ x: q[0], z: q[1], hw: 3.6, hd: 3.6, ux: Math.cos(ang), uz: Math.sin(ang) }); }
}
{ let best = null; for (const p of corePts){ const d = Math.hypot(p[0] - 30, p[1] - 40); if (!best || d < best.d) best = { d, p }; }
  if (best){ const p = best.p, nx = -Math.sin(p[2]), nz = Math.cos(p[2]); const q = findFree(p[0] + nx * 4.5, p[1] + nz * 4.5, 3.4, 30, true); if (q){ LMK.pav.push([q[0], q[1], p[2], false]); addSolid(rectPoly(q[0], q[1], 2.6, 2.6, p[2]), bicubic(q[0], q[1]) + 6); PADS.push({ x: q[0], z: q[1], hw: 3.0, hd: 3.0, ux: Math.cos(p[2]), uz: Math.sin(p[2]) }); } } }
LMK.mani = [];
{ const q = findFree(LMK.stupa[0], LMK.stupa[1] + 15, 3.2, 26, true); if (q){ const ang = Math.atan2(q[1] - LMK.stupa[1], q[0] - LMK.stupa[0]) + Math.PI / 2; LMK.mani.push([q[0], q[1], ang, 9]); } }
{ const Rm = mulberry(5150); for (let t = 0; t < 400 && LMK.mani.length < 4; t++){ const p = corePts[Math.floor(Rm() * corePts.length)]; if (!p) break; const nx = -Math.sin(p[2]), nz = Math.cos(p[2]); const x = p[0] + nx * 2.9, z = p[1] + nz * 2.9; if (LMK.mani.some((m) => Math.hypot(m[0] - x, m[1] - z) < 60)) continue; let ok = true; for (const u of [-4, 0, 4]) if (!freeAt(x + Math.cos(p[2]) * u, z + Math.sin(p[2]) * u, 1.4) || !clearOfPaths(x + Math.cos(p[2]) * u, z + Math.sin(p[2]) * u, 0.7)) ok = false; if (ok) LMK.mani.push([x, z, p[2], 8]); } }
for (const m of LMK.mani){ addSolid(rectPoly(m[0], m[1], m[3] / 2 + 0.2, 0.7, m[2]), bicubic(m[0], m[1]) + 1.6); PADS.push({ x: m[0], z: m[1], hw: m[3] / 2 + 0.6, hd: 1.1, ux: Math.cos(m[2]), uz: Math.sin(m[2]) }); }
LMK.chortens = [];
for (const p of POI){ if ((p.k === 'shrine' && !p.used) || p.k === 'memorial'){ const q = findFree(p.x, p.z, 2.2, 14, true); if (q){ LMK.chortens.push([q[0], q[1], p.k === 'memorial' ? 1.15 : 0.9]); addSolid(rectPoly(q[0], q[1], 2.0, 2.0, 0), bicubic(q[0], q[1]) + 6); PADS.push({ x: q[0], z: q[1], hw: 2.6, hd: 2.6, ux: 1, uz: 0 }); } } }
LMK.heli = POI.filter((p) => p.k === 'helipad').map((p) => [p.x, p.z, clamp(p.r || 8, 6, 14)]);
for (const h of LMK.heli) PADS.push({ x: h[0], z: h[1], hw: h[2] + 1.5, hd: h[2] + 1.5, ux: 1, uz: 0 });
{ const ev = POI.find((p) => p.k === 'viewpoint' && /everest/i.test(p.n)) || { x: 523.2, z: 270.2 }; const q = findFree(ev.x, ev.z, 3, 40) || [ev.x, ev.z]; LMK.view = q; PADS.push({ x: q[0] + 3, z: q[1] + 3, hw: 8, hd: 8, ux: 1, uz: 0 }); }
{ const r = D.lm.ridge; let best = null; for (let rad = 0; rad <= 260 && !best; rad += 4){ const n = Math.max(1, Math.floor(rad * 1.2)); for (let k = 0; k < n; k++){ const a = k / n * Math.PI * 2, x = r[0] + Math.cos(a) * rad, z = r[1] + Math.sin(a) * rad; if (inside(x, z)){ best = [x, z]; break; } } } LMK.ridge = best || r; PADS.push({ x: LMK.ridge[0], z: LMK.ridge[1], hw: 7, hd: 7, ux: 1, uz: 0 }); }
LMK.views = POI.filter((p) => p.k === 'viewpoint' && !/everest/i.test(p.n) && inside(p.x, p.z)).map((p) => [p.x, p.z]);
for (const p of PADS) p.pad = bicubic(p.x, p.z);

/* ================= terrain grid ================= */
setStatus('Shaping the bowl, the terraces and the stream beds…'); await nextFrame();
const T = D.town, SUBX = coarse ? 16 : 22, SUBZ = coarse ? 18 : 25;
const TX = (T.c1 - T.c0) * SUBX + 1, TZ = (T.r1 - T.r0) * SUBZ + 1, SX = DX / SUBX, SZ = DZ / SUBZ, TX0 = X0 + T.c0 * DX, TZ0 = Z0 + T.r0 * DZ, TN = TX * TZ;
const HB = new Float32Array(TN), H = new Float32Array(TN), FIELD = new Float32Array(TN), PATHW = new Float32Array(TN), WATERW = new Float32Array(TN), WOODW = new Float32Array(TN), SCRUBW = new Float32Array(TN), ROCKW = new Float32Array(TN), PADW = new Float32Array(TN), PADH = new Float32Array(TN), BORD = new Float32Array(TN), NEARB = new Float32Array(TN);
for (let iz = 0; iz < TZ; iz++){ const z = TZ0 + iz * SZ; for (let ix = 0; ix < TX; ix++) HB[iz * TX + ix] = bicubic(TX0 + ix * SX, z); }
for (const b of BLD){
  const R = 8.5, ex = Math.abs(b.ux) * (b.hw + R) + Math.abs(b.uz) * (b.hd + R), ez = Math.abs(b.uz) * (b.hw + R) + Math.abs(b.ux) * (b.hd + R);
  const ix0 = Math.max(0, Math.floor((b.cx - ex - TX0) / SX)), ix1 = Math.min(TX - 1, Math.ceil((b.cx + ex - TX0) / SX));
  const iz0 = Math.max(0, Math.floor((b.cz - ez - TZ0) / SZ)), iz1 = Math.min(TZ - 1, Math.ceil((b.cz + ez - TZ0) / SZ));
  for (let iz = iz0; iz <= iz1; iz++) for (let ix = ix0; ix <= ix1; ix++){
    const dx = TX0 + ix * SX - b.cx, dz = TZ0 + iz * SZ - b.cz, a = dx * b.ux + dz * b.uz, bb = -dx * b.uz + dz * b.ux;
    const dist = Math.hypot(Math.max(Math.abs(a) - b.hw, 0), Math.max(Math.abs(bb) - b.hd, 0));
    const w = 1 - ss(3.0, 8.0, dist), k = iz * TX + ix; if (w > NEARB[k]) NEARB[k] = w;
  }
}
const TER = 2.4;
for (let iz = 0; iz < TZ; iz++){
  const z = TZ0 + iz * SZ;
  for (let ix = 0; ix < TX; ix++){
    const k = iz * TX + ix, x = TX0 + ix * SX, hb = HB[k];
    const gxv = (HB[iz * TX + Math.min(ix + 1, TX - 1)] - HB[iz * TX + Math.max(ix - 1, 0)]) / (2 * SX);
    const gzv = (HB[Math.min(iz + 1, TZ - 1) * TX + ix] - HB[Math.max(iz - 1, 0) * TX + ix]) / (2 * SZ);
    const grad = Math.hypot(gxv, gzv);
    const pv = mPaved(x, z), dt = mDirt(x, z), w = mWater(x, z), wd = mWood(x, z), sc = mScrub(x, z), rk = mRock(x, z);
    PATHW[k] = Math.max(pv, dt * 0.9); WATERW[k] = w; WOODW[k] = wd; SCRUBW[k] = sc; ROCKW[k] = rk;
    const fs = (1 - PATHW[k]) * (1 - w) * (1 - NEARB[k]) * (1 - wd * 0.85) * (1 - ss(0.55, 0.9, grad)) * (1 - ss(3640, 3780, hb + (fbm(x / 90, z / 90) - 0.5) * 70));
    const q = hb / TER, fl = Math.floor(q), fr = q - fl, hq = TER * (fl + ss(0.68, 1.0, fr)) + 0.55;
    FIELD[k] = fs;
    H[k] = hb + (hq - hb) * fs - 1.5 * w;
  }
}
for (const p of PADS){
  const ex = Math.abs(p.ux) * (p.hw + 5) + Math.abs(p.uz) * (p.hd + 5), ez = Math.abs(p.uz) * (p.hw + 5) + Math.abs(p.ux) * (p.hd + 5);
  const ix0 = Math.max(0, Math.floor((p.x - ex - TX0) / SX)), ix1 = Math.min(TX - 1, Math.ceil((p.x + ex - TX0) / SX));
  const iz0 = Math.max(0, Math.floor((p.z - ez - TZ0) / SZ)), iz1 = Math.min(TZ - 1, Math.ceil((p.z + ez - TZ0) / SZ));
  for (let iz = iz0; iz <= iz1; iz++) for (let ix = ix0; ix <= ix1; ix++){
    const dx = TX0 + ix * SX - p.x, dz = TZ0 + iz * SZ - p.z, a = dx * p.ux + dz * p.uz, bb = -dx * p.uz + dz * p.ux;
    const dist = Math.hypot(Math.max(Math.abs(a) - p.hw, 0), Math.max(Math.abs(bb) - p.hd, 0));
    const wgt = dist <= 1.6 ? 1 : 1 - ss(1.6, 5, dist), k = iz * TX + ix;
    if (wgt > PADW[k]){ PADW[k] = wgt; PADH[k] = p.pad; }
  }
}
for (let iz = 0; iz < TZ; iz++){
  const z = TZ0 + iz * SZ;
  for (let ix = 0; ix < TX; ix++){
    const k = iz * TX + ix, x = TX0 + ix * SX;
    const h = H[k] + (PADH[k] - H[k]) * PADW[k];
    const e = Math.min(ix / SUBX, (TX - 1 - ix) / SUBX, iz / SUBZ, (TZ - 1 - iz) / SUBZ), wB = ss(0, 1.5, e); BORD[k] = wB;
    const fh = farH(x, z); H[k] = fh + (h - fh) * wB;
  }
}
// T1d: terrain cells under the stairs are refined to a fine grid (REFN x REFN sub-cells) so the ground can be
// fitted to the steps locally. RCELL maps a coarse cell to its fine patch (-1 = not refined); FH holds fine heights.
const REFN = coarse ? 8 : 12, RCELL = new Int32Array((TX - 1) * (TZ - 1)).fill(-1), RSLOT = [];
let FH = null;
function coarseGround(x, z){
  const gx = (x - TX0) / SX, gz = (z - TZ0) / SZ;
  const ix = clamp(Math.floor(gx), 0, TX - 2), iz = clamp(Math.floor(gz), 0, TZ - 2), u = gx - ix, v = gz - iz;
  const a = H[iz * TX + ix], b = H[(iz + 1) * TX + ix], c = H[(iz + 1) * TX + ix + 1], d = H[iz * TX + ix + 1];
  if (u + v <= 1) return a + (d - a) * u + (b - a) * v;
  return c + (b - c) * (1 - u) + (d - c) * (1 - v);
}
// fine triangle under (x, z) in a refined cell: [i0, i1, i2] fine vertex indices and barycentric weights
function fineTri(slot, x, z){
  const R = RSLOT[slot], fu = clamp(((x - TX0) / SX - R.ix) * REFN, 0, REFN), fv = clamp(((z - TZ0) / SZ - R.iz) * REFN, 0, REFN);
  const i = Math.min(REFN - 1, Math.floor(fu)), j = Math.min(REFN - 1, Math.floor(fv)), u = fu - i, v = fv - j, W = REFN + 1, V = R.v;
  const a = V[j * W + i], b = V[(j + 1) * W + i], c = V[(j + 1) * W + i + 1], d = V[j * W + i + 1];
  return u + v <= 1 ? [a, d, b, 1 - u - v, u, v] : [b, d, c, 1 - u, 1 - v, u + v - 1];
}
function townGround(x, z){
  if (FH){
    const ix = clamp(Math.floor((x - TX0) / SX), 0, TX - 2), iz = clamp(Math.floor((z - TZ0) / SZ), 0, TZ - 2), slot = RCELL[iz * (TX - 1) + ix];
    if (slot >= 0){ const t = fineTri(slot, x, z); return FH[t[0]] * t[3] + FH[t[1]] * t[4] + FH[t[2]] * t[5]; }
  }
  return coarseGround(x, z);
}
const TXmin = TX0, TXmax = TX0 + (TX - 1) * SX, TZmin = TZ0, TZmax = TZ0 + (TZ - 1) * SZ;
const inTown = (x, z, m) => { m = m || 0; return x > TXmin + m && x < TXmax - m && z > TZmin + m && z < TZmax - m; };
const groundAt = (x, z) => inTown(x, z) ? townGround(x, z) : farH(x, z);
const gridK = (x, z) => clamp(Math.round((z - TZ0) / SZ), 0, TZ - 1) * TX + clamp(Math.round((x - TX0) / SX), 0, TX - 1);

/* ================= T1d: stair flights =================
   Laid out before the terrain mesh is built, because the ground is then fitted to the stairs.
   Where:  every highway=steps way, plus any path stretch whose DEM grade, measured over a 3 m window,
           is steeper than 25 degrees (rise/run > 0.466). Below that the path stays a ramp.
   Shape:  a flight runs between bends (a turn of more than 20 degrees starts a new flight, with a flat
           landing at the bend). Risers are constant within a flight, 0.15-0.20 m; each riser sits where the
           terrain profile crosses the next half-riser, so the flight follows the ground; treads are
           0.28-0.35 m, and any spare length is collected into landings of at least 0.9 m.
   Fit:    every tread is a solid stone block down to below the ground. Terrain vertices under a flight are
           lowered just enough that no ground pokes through a tread (they never move up).
   Walk:   the player walks on a smooth invisible ramp over the treads (STAIRHASH, used by playerGround). */
const STAIR = { GRADE: Math.tan(25 * Math.PI / 180), RISE: [0.15, 0.20], RUN: [0.28, 0.35], LAND: 0.9, DS: 0.25, BEND: 20 * Math.PI / 180 };
const FLIGHTS = [], LANDINGS = [], STAIRLOG = { stepsWays: 0, stepsWaysWithStairs: 0, flightsSteps: 0, flightsGrade: 0, treads: 0, landings: 0, bendLandings: 0, tooSteep: 0, narrowed: 0, carvedVerts: 0, carveMax: 0, stepsWayCover: [] };
function wallClear(x, z){
  let best = 1e9;
  for (let gx = Math.floor((x - 3) / CELLM); gx <= Math.floor((x + 3) / CELLM); gx++) for (let gz = Math.floor((z - 3) / CELLM); gz <= Math.floor((z + 3) / CELLM); gz++){
    const L = BH.get(gx + ',' + gz); if (!L) continue;
    for (const o of L){ if (o.solid || x < o.bb[0] - 3 || x > o.bb[1] + 3 || z < o.bb[2] - 3 || z > o.bb[3] + 3) continue; if (pip(o.poly, x, z)) return 0; best = Math.min(best, edgeDist(o.poly, x, z)[0]); }
  }
  return best;
}
{
  const placed = new Map(), PC4 = 2;   // stations of flights already built, to skip a second way over the same ground
  const occKey = (x, z) => Math.floor(x / PC4) + ',' + Math.floor(z / PC4);
  const occupied = (x, z, r, path) => { for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++){ const L = placed.get((Math.floor(x / PC4) + i) + ',' + (Math.floor(z / PC4) + j)); if (L) for (const q of L) if (q[3] !== path && Math.hypot(q[0] - x, q[1] - z) < r + q[2]) return true; } return false; };   // only other ways count
  const order = D.paths.map((p, i) => i).sort((a, b) => (D.paths[b].s - D.paths[a].s) || (D.paths[b].c - D.paths[a].c));
  for (const pi of order){
    const p = D.paths[pi], P = p.p;
    if (p.s) STAIRLOG.stepsWays++;
    // stations every DS metres along the centre-line
    const st = []; let acc = 0;
    const bendAt = new Set();
    for (let i = 0; i < P.length - 1; i++){
      const a = P[i], b = P[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 1e-3) continue;
      if (i > 0){ const a0 = P[i - 1], h0 = Math.atan2(a[1] - a0[1], a[0] - a0[0]), h1 = Math.atan2(b[1] - a[1], b[0] - a[0]); let dh = Math.abs(h1 - h0); if (dh > Math.PI) dh = 2 * Math.PI - dh; if (dh > STAIR.BEND) bendAt.add(st.length); }
      const n = Math.max(1, Math.round(L / STAIR.DS));
      for (let k = 0; k < n; k++){ const t = k / n; st.push({ x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, s: acc + L * t }); }
      acc += L;
    }
    const last = P[P.length - 1]; st.push({ x: last[0], z: last[1], s: acc });
    const n = st.length; if (n < 3) continue;
    const at = (s) => { s = clamp(s, 0, acc); let lo = 0, hi = n - 1; while (hi - lo > 1){ const m = (lo + hi) >> 1; if (st[m].s <= s) lo = m; else hi = m; } const A = st[lo], B = st[hi], t = (s - A.s) / ((B.s - A.s) || 1); return [A.x + (B.x - A.x) * t, A.z + (B.z - A.z) * t]; };
    const demAt = (s) => { const q = at(s); return bicubic(q[0], q[1]); };
    // flag stations: inside the walkable town, not in water, and steps-tagged or steeper than 25 degrees over 3 m
    const flag = new Uint8Array(n);
    let stepsLen = 0, stepsStair = 0;
    for (let i = 0; i < n; i++){
      const q = st[i], ok = inTown(q.x, q.z, 20) && inside(q.x, q.z) && mWater(q.x, q.z) < 0.3;
      let s0 = q.s - 1.5, s1 = q.s + 1.5; if (s0 < 0){ s1 -= s0; s0 = 0; } if (s1 > acc){ s0 -= s1 - acc; s1 = acc; } s0 = Math.max(0, s0);
      const grade = (s1 - s0) >= 3 - 1e-6 ? Math.abs(demAt(s1) - demAt(s0)) / (s1 - s0) : 0;
      q.grade = grade; flag[i] = ok && (p.s || grade > STAIR.GRADE) ? 1 : 0;
      if (p.s && ok) stepsLen += STAIR.DS;
    }
    // close gaps under 1.5 m, drop runs under 1.2 m
    for (let i = 0; i < n; ){ if (flag[i]){ i++; continue; } let j = i; while (j < n && !flag[j]) j++; if (i > 0 && j < n && (j - i) * STAIR.DS < 1.5) for (let k = i; k < j; k++) if (inside(st[k].x, st[k].z)) flag[k] = 1; i = j; }
    for (let i = 0; i < n; ){ if (!flag[i]){ i++; continue; } let j = i; while (j < n && flag[j]) j++; if ((j - i) * STAIR.DS < 1.2) for (let k = i; k < j; k++) flag[k] = 0; i = j; }
    // nominal width: OSM width tag, else 1.6 m in the built-up bazaar, 1.0 m elsewhere
    const runs = [];
    for (let i = 0; i < n; ){ if (!flag[i]){ i++; continue; } let j = i; while (j < n && flag[j]) j++; runs.push([i, j - 1]); i = j; }
    const dirAt = (s0, s1) => { const q0 = at(s0), q1 = at(s1); const fx = q1[0] - q0[0], fz = q1[1] - q0[1], l = Math.hypot(fx, fz) || 1; return [fx / l, fz / l]; };
    for (const [r0, r1] of runs){
      // one width for the whole run so flights and landings line up
      const mid = at((st[r0].s + st[r1].s) / 2);
      let nb = 0; for (const b of BLD) if (Math.hypot(b.cx - mid[0], b.cz - mid[1]) < 18) nb++;
      const main = !!(p.s || nb >= 4);
      let hw = (p.w ? p.w : (main ? 1.6 : 1.0)) / 2;
      let minClr = 1e9; for (let k = r0; k <= r1; k++) minClr = Math.min(minClr, wallClear(st[k].x, st[k].z));
      if (minClr - 0.08 < hw){ hw = Math.max(0.4, minClr - 0.08); STAIRLOG.narrowed++; }
      // nodes: the two ends of the run, and one landing per bend. Bends closer together than a stair width plus
      // 0.3 m share one landing, so two landings never face each other across a gap too small for a step.
      const nodes = [{ a: st[r0].s, b: st[r0].s, end: true }];
      for (let k = r0 + 1; k < r1; k++){
        if (!bendAt.has(k)) continue;
        const sk = st[k].s, last = nodes[nodes.length - 1];
        if (!last.end && sk - last.b < 2 * hw + 0.3) last.b = sk; else nodes.push({ a: sk, b: sk, end: false });
      }
      nodes.push({ a: st[r1].s, b: st[r1].s, end: true });
      const nn = nodes.length, land = [];
      for (let c = 1; c < nn - 1; c++){
        const N0 = nodes[c], sm = (N0.a + N0.b) / 2, q = at(sm), y = townGround(q[0], q[1]);
        // the landing covers the path from a stair half-width before the first bend to one after the last
        const pts = [];
        for (let ss = N0.a - hw; ss <= N0.b + hw + 1e-6; ss += 0.25){
          const f = dirAt(clamp(ss - 0.3, N0.a - hw - 0.6, N0.b + hw + 0.6), clamp(ss + 0.3, N0.a - hw - 0.6, N0.b + hw + 0.6)), c0 = at(ss);
          const fi = ss < N0.a ? dirAt(N0.a - hw - 0.6, N0.a - hw) : ss > N0.b ? dirAt(N0.b + hw, N0.b + hw + 0.6) : f;
          pts.push([c0[0] - fi[1] * hw, c0[1] + fi[0] * hw], [c0[0] + fi[1] * hw, c0[1] - fi[0] * hw]);
        }
        { const pa = at(N0.a - hw), pb = at(N0.b + hw), di = dirAt(N0.a - hw - 0.6, N0.a - hw), dout = dirAt(N0.b + hw, N0.b + hw + 0.6);
          pts.push([pa[0] - di[1] * hw, pa[1] + di[0] * hw], [pa[0] + di[1] * hw, pa[1] - di[0] * hw], [pb[0] - dout[1] * hw, pb[1] + dout[0] * hw], [pb[0] + dout[1] * hw, pb[1] - dout[0] * hw]);
          const bx = di[0] - dout[0], bz = di[1] - dout[1], bl = Math.hypot(bx, bz);   // outward bisector of the turn
          if (bl > 1e-3) pts.push([q[0] + bx / bl * hw * 1.45, q[1] + bz / bl * hw * 1.45]); }
        // convex hull (monotone chain)
        pts.sort((u, v) => u[0] - v[0] || u[1] - v[1]);
        const cr = (o, u, v) => (u[0] - o[0]) * (v[1] - o[1]) - (u[1] - o[1]) * (v[0] - o[0]), lo = [], hi = [];
        for (const pt of pts){ while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], pt) <= 0) lo.pop(); lo.push(pt); }
        for (let i = pts.length - 1; i >= 0; i--){ const pt = pts[i]; while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], pt) <= 0) hi.pop(); hi.push(pt); }
        const hull = lo.slice(0, -1).concat(hi.slice(0, -1));
        const Ld = { poly: hull, y, bb: bbOf(hull), s: sm, path: pi };
        land[c] = Ld; LANDINGS.push(Ld); STAIRLOG.bendLandings++;
      }
      // the stretch between two nodes, trimmed by a half-width at each landing
      const seg = [];
      for (let c = 0; c < nn - 1; c++){
        const bendLo = c > 0, bendHi = c + 1 < nn - 1;
        let sLo = nodes[c].b + (bendLo ? hw : 0), sHi = nodes[c + 1].a - (bendHi ? hw : 0);
        const rawLen = sHi - sLo;
        // skip ground another (higher-priority) way's flight already covers, e.g. where two ways share a junction
        if (!bendLo) while (sLo < sHi){ const q = at(sLo); if (!occupied(q[0], q[1], 0.9, pi)) break; sLo += STAIR.DS; }
        if (!bendHi) while (sHi > sLo){ const q = at(sHi); if (!occupied(q[0], q[1], 0.9, pi)) break; sHi -= STAIR.DS; }
        const connector = bendLo || bendHi, need = connector ? 0.3 : 1.2;
        seg.push({ bendLo, bendHi, sLo, sHi, connector, ok: sHi - sLo >= need, short: rawLen < need });
      }
      // landing heights. Pinned first: a landing with no room for a step between it and the run's end takes the
      // end's ground height; a landing next to ground another way's flight covers keeps its own ground height.
      // The rest start at the ground of the bend and move just enough that no flight between two nodes is steeper
      // than 0.20 m rise per 0.30 m tread (the run's ends stay on the ground).
      if (nn > 2){
        const GMAX = STAIR.RISE[1] / 0.30, y = [], fixed = [], len = [];
        for (let c = 0; c < nn; c++){ const q = at(nodes[c].a); fixed.push(nodes[c].end); y.push(land[c] ? land[c].y : townGround(q[0], q[1])); }
        for (let c = 0; c < nn - 1; c++){
          if (seg[c].short){
            if (fixed[c] && !fixed[c + 1]){ y[c + 1] = y[c]; fixed[c + 1] = true; }
            else if (fixed[c + 1] && !fixed[c]){ y[c] = y[c + 1]; fixed[c] = true; }
          } else if (!seg[c].ok){ fixed[c] = true; fixed[c + 1] = true; }
          len.push(Math.max(0.05, seg[c].sHi - seg[c].sLo));
        }
        for (let it = 0; it < 2000; it++){
          let worst = 0;
          for (let c = 0; c < nn - 1; c++){
            if (!seg[c].ok) continue;
            const d = y[c + 1] - y[c], lim = GMAX * len[c], ex = Math.abs(d) - lim; if (ex <= 1e-4) continue; worst = Math.max(worst, ex);
            const sg = Math.sign(d), fa = fixed[c], fb = fixed[c + 1];
            if (!fa && !fb){ y[c] += sg * ex / 2; y[c + 1] -= sg * ex / 2; } else if (!fa) y[c] += sg * ex; else if (!fb) y[c + 1] -= sg * ex;
          }
          if (worst < 1e-3) break;
        }
        for (let c = 1; c < nn - 1; c++){ STAIRLOG.landingShift = Math.max(STAIRLOG.landingShift || 0, Math.abs(y[c] - land[c].y)); land[c].y = y[c]; }
      }
      for (let c = 0; c < nn - 1; c++){
        const { bendLo, bendHi, sLo, sHi, connector, ok } = seg[c];   // a connector touches a landing, so it is built even if short or nearly level
        if (!ok){ if (connector) STAIRLOG.shortConnector = (STAIRLOG.shortConnector || 0) + 1; continue; }
        // terrain profile along the flight (ground before fitting), tilted so its ends meet the landing heights
        const prof0 = (s) => { const q = at(s); return townGround(q[0], q[1]); };
        const yLo = bendLo ? land[c].y : prof0(sLo), yHi = bendHi ? land[c + 1].y : prof0(sHi), cLo = yLo - prof0(sLo), cHi = yHi - prof0(sHi);
        const prof = (s) => prof0(s) + cLo + (cHi - cLo) * clamp((s - sLo) / (sHi - sLo), 0, 1);
        let A = sLo, B = sHi, hA = yLo, hB = yHi;
        if (hB < hA){ const t = A; A = B; B = t; const u = hA; hA = hB; hB = u; }
        const dir = B > A ? 1 : -1, L = Math.abs(B - A), dH = hB - hA;
        if (!connector && dH < 2 * STAIR.RISE[0]){ STAIRLOG.tooLow = (STAIRLOG.tooLow || 0) + 1; continue; }   // under two risers: leave it a ramp
        // riser count: one that puts the riser inside 0.15-0.20 m if any does, else the one nearest that range
        // (a short connector to a landing may have one riser, or none if it is within 7.5 cm of level)
        const minN = connector ? (dH < 0.075 ? 0 : 1) : 2;
        let N = minN, bestV = 1e9;
        if (minN > 0) for (let m = Math.max(minN, Math.floor(dH / STAIR.RISE[1])); m <= Math.ceil(dH / STAIR.RISE[0]) + 1; m++){
          const rr = dH / m, tt = (L - 0.3) / Math.max(1, m - 1);
          const viol = 2 * (rr > STAIR.RISE[1] ? rr - STAIR.RISE[1] : rr < STAIR.RISE[0] ? STAIR.RISE[0] - rr : 0) + (m > 1 && tt < STAIR.RUN[0] ? STAIR.RUN[0] - tt : 0);
          if (viol < bestV - 1e-9 || (Math.abs(viol - bestV) < 1e-9 && Math.abs(rr - 0.175) < Math.abs(dH / N - 0.175))){ bestV = viol; N = m; }
        }
        const r = N ? dH / N : 0;
        // riser k (1..N) where the rising envelope of the profile first reaches hA + (k - 0.5) r
        const sr = [0]; let env = hA, k = 1;
        for (let d = 0; d <= L + 1e-6 && k <= N; d += 0.05){ env = Math.max(env, prof(A + dir * d)); while (k <= N && env >= hA + (k - 0.5) * r){ sr.push(d); k++; } }
        while (sr.length <= N) sr.push(L);
        sr.push(L);   // sr[0] = 0, sr[1..N] risers, sr[N+1] = L
        const endMin = Math.min(0.15, L / (N + 1) / 2);
        if (N >= 1){
          // treads at least RUN[0]; the end treads at least 0.15 m
          sr[1] = Math.max(sr[1], endMin); for (let i = 2; i <= N; i++) sr[i] = Math.max(sr[i], sr[i - 1] + STAIR.RUN[0]);
          if (sr[N] > L - endMin){
            sr[N] = L - endMin; for (let i = N - 1; i >= 1; i--) sr[i] = Math.min(sr[i], sr[i + 1] - STAIR.RUN[0]);
            if (sr[1] < endMin){ STAIRLOG.tooSteep++; const t = (L - 2 * endMin) / Math.max(1, N - 1); for (let i = 1; i <= N; i++) sr[i] = endMin + (i - 1) * t; }
          }
          // treads between RUN[1] and LAND become a normal tread or a landing, whichever keeps the flight nearer the ground
          // (error diffusion: each choice moves every later riser by the same amount, cum tracks the total drift)
          let cum = 0;
          for (let i = 1; i < N; i++){
            const t = sr[i + 1] - sr[i];
            if (t > STAIR.RUN[1] && t < STAIR.LAND){
              const dShort = 0.32 - t, dLong = STAIR.LAND - t, roomLong = sr[N] + dLong <= L - endMin;
              const pick = (!roomLong || Math.abs(cum + dShort) <= Math.abs(cum + dLong)) ? dShort : dLong;
              for (let j = i + 1; j <= N; j++) sr[j] += pick;
              cum += pick;
            }
          }
        }
        // geometry frame at distance d from the bottom; the direction is measured inside this flight only,
        // never across a bend, so the end edges match the landing edges
        const s0f = Math.min(A, B), s1f = Math.max(A, B);
        const frame = (d) => { const s = A + dir * d, q = at(s), f = dirAt(clamp(s - 0.6, s0f, s1f), clamp(s + 0.6, s0f, s1f)), fx = f[0] * dir, fz = f[1] * dir; return { x: q[0], z: q[1], fx, fz, nx: -fz, nz: fx }; };
        const edges = sr.map(frame), ys = []; for (let i = 0; i <= N; i++) ys.push(hA + i * r);
        const F = { path: pi, kind: p.s ? 'steps' : 'grade', main, hw, r, N, L, dH, sr, edges, ys, A, B, dir, at, s0: s0f, s1: s1f, connector };
        FLIGHTS.push(F); STAIRLOG.treads += N + 1;
        for (let i = 1; i < N; i++) if (sr[i + 1] - sr[i] >= STAIR.LAND - 1e-6) STAIRLOG.landings++;
        if (p.s) STAIRLOG.flightsSteps++; else STAIRLOG.flightsGrade++;
        if (p.s) stepsStair += L;
        for (let ss = s0f; ss <= s1f + 1e-6; ss += STAIR.DS){ const q = at(ss), key = occKey(q[0], q[1]); if (!placed.has(key)) placed.set(key, []); placed.get(key).push([q[0], q[1], hw, pi]); }
      }
    }
    if (p.s){ if (stepsStair > 0) STAIRLOG.stepsWaysWithStairs++; STAIRLOG.stepsWayCover.push({ path: pi, inTownM: +stepsLen.toFixed(1), stairM: +stepsStair.toFixed(1) }); }
  }
}
// tread quads: corners in order (left-bottom, right-bottom, right-top, left-top), height y
function treadQuad(F, i, grow, growEnd){
  const e0 = F.edges[i], e1 = F.edges[i + 1], h = F.hw + (grow || 0), g = growEnd || 0;
  const b0 = [e0.x - e0.fx * g, e0.z - e0.fz * g], b1 = [e1.x + e1.fx * g, e1.z + e1.fz * g];
  return [[b0[0] + e0.nx * h, b0[1] + e0.nz * h], [b0[0] - e0.nx * h, b0[1] - e0.nz * h], [b1[0] - e1.nx * h, b1[1] - e1.nz * h], [b1[0] + e1.nx * h, b1[1] + e1.nz * h]];
}
// fit the ground: terrain may not poke through any tread or landing.
// (1) every coarse cell within 0.6 m of a tread or landing is refined to a fine grid that follows the coarse
//     surface exactly, so its edges meet the neighbouring coarse triangles without cracks;
// (2) each sample point P under a tread gives a constraint  sum_j w_j(P) (FH_j - drop_j) <= top(P) - 0.03  on the
//     three fine vertices j around it. Start from a safe answer, then give back as much of each drop as the
//     constraints allow (Gauss-Seidel on the slack). Vertices only move down; vertices on the edge of the refined
//     area are pinned, so the coarse terrain outside is untouched.
{
  const CLEAR = 0.03, W = REFN + 1, FW = (TX - 1) * REFN + 1;
  const footprints = [];
  for (const F of FLIGHTS) for (let i = 0; i <= F.N; i++) footprints.push({ q: treadQuad(F, i, 0.1, i === 0 || i === F.N ? 0.05 : 0), top: F.ys[i] });
  const markPt = (x, z) => { const ix = Math.floor((x - TX0) / SX), iz = Math.floor((z - TZ0) / SZ); if (ix < 0 || iz < 0 || ix > TX - 2 || iz > TZ - 2) return; const c = iz * (TX - 1) + ix; if (RCELL[c] < 0){ RCELL[c] = RSLOT.length; RSLOT.push({ ix, iz, v: null }); } };
  const eachIn = (q, step, fn) => { const nu = Math.max(2, Math.ceil(Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]) / step) + 1), nv = Math.max(2, Math.ceil(Math.hypot(q[3][0] - q[0][0], q[3][1] - q[0][1]) / step) + 1);
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++){ const u = i / (nu - 1), v = j / (nv - 1); fn(lerp(lerp(q[0][0], q[1][0], u), lerp(q[3][0], q[2][0], u), v), lerp(lerp(q[0][1], q[1][1], u), lerp(q[3][1], q[2][1], u), v)); } };
  for (const fp of footprints) eachIn(fp.q, 0.3, (x, z) => { for (const dx of [-0.6, 0, 0.6]) for (const dz of [-0.6, 0, 0.6]) markPt(x + dx, z + dz); });
  for (const Ld of LANDINGS){ const [a, b, c, d] = Ld.bb; for (let x = a - 0.6; x <= b + 0.6; x += 0.3) for (let z = c - 0.6; z <= d + 0.6; z += 0.3) markPt(x, z); }
  // fine vertices, shared between neighbouring refined cells
  const key2i = new Map(), fx = [], fz = [], fh = [], pinned = [];
  const isRef = (cx, cz) => cx >= 0 && cz >= 0 && cx <= TX - 2 && cz <= TZ - 2 && RCELL[cz * (TX - 1) + cx] >= 0;
  for (const R of RSLOT){
    R.v = new Int32Array(W * W);
    for (let j = 0; j <= REFN; j++) for (let i = 0; i <= REFN; i++){
      const gx = R.ix * REFN + i, gz = R.iz * REFN + j, key = gz * FW + gx; let v = key2i.get(key);
      if (v === undefined){
        v = fh.length; key2i.set(key, v); const x = TX0 + gx * SX / REFN, z = TZ0 + gz * SZ / REFN; fx.push(x); fz.push(z); fh.push(coarseGround(x, z));
        const cxs = gx % REFN === 0 ? [gx / REFN - 1, gx / REFN] : [Math.floor(gx / REFN)], czs = gz % REFN === 0 ? [gz / REFN - 1, gz / REFN] : [Math.floor(gz / REFN)];
        let pin = false; for (const cx of cxs) for (const cz of czs) if (!isRef(cx, cz)) pin = true; pinned.push(pin);
      }
      R.v[j * W + i] = v;
    }
  }
  FH = new Float64Array(fh);
  // constraints
  const SV = [], SW = [], ST = [];
  const addP = (x, z, top) => { const ix = clamp(Math.floor((x - TX0) / SX), 0, TX - 2), iz = clamp(Math.floor((z - TZ0) / SZ), 0, TZ - 2), slot = RCELL[iz * (TX - 1) + ix]; if (slot < 0) return; const t = fineTri(slot, x, z); SV.push(t[0], t[1], t[2]); SW.push(t[3], t[4], t[5]); ST.push(top - CLEAR); };
  for (const fp of footprints) eachIn(fp.q, 0.1, (x, z) => addP(x, z, fp.top));
  for (const Ld of LANDINGS){ const [a, b, c, d] = Ld.bb; for (let x = a; x <= b; x += 0.1) for (let z = c; z <= d; z += 0.1) if (pip(Ld.poly, x, z)) addP(x, z, Ld.y); }
  const NV = FH.length, NS = ST.length, drop = new Float64Array(NV), slack = new Float64Array(NS);
  for (let p = 0; p < NS; p++){
    let h = 0, wfree = 0; for (let k = 0; k < 3; k++){ h += SW[p * 3 + k] * FH[SV[p * 3 + k]]; if (!pinned[SV[p * 3 + k]]) wfree += SW[p * 3 + k]; }
    const ex = h - ST[p]; if (ex > 0 && wfree > 1e-6) for (let k = 0; k < 3; k++){ const v = SV[p * 3 + k]; if (!pinned[v]) drop[v] = Math.max(drop[v], ex / wfree); }
  }
  for (let p = 0; p < NS; p++){ let h = 0; for (let k = 0; k < 3; k++) h += SW[p * 3 + k] * (FH[SV[p * 3 + k]] - drop[SV[p * 3 + k]]); slack[p] = ST[p] - h; }
  const cnt = new Int32Array(NV + 1); for (let i = 0; i < NS * 3; i++) cnt[SV[i] + 1]++;
  for (let v = 0; v < NV; v++) cnt[v + 1] += cnt[v];
  const fp2 = cnt.slice(), inc = new Int32Array(NS * 3); for (let i = 0; i < NS * 3; i++) inc[fp2[SV[i]]++] = i;
  const verts = []; for (let v = 0; v < NV; v++) if (drop[v] > 0) verts.push(v);
  for (let sweep = 0; sweep < 80; sweep++){
    let moved = 0;
    for (const v of verts){
      if (drop[v] <= 0) continue;
      let dmax = drop[v];
      for (let q = cnt[v]; q < cnt[v + 1]; q++){ const i = inc[q], w = SW[i]; if (w > 1e-6) dmax = Math.min(dmax, slack[(i / 3) | 0] / w); }
      if (dmax > 1e-6){ drop[v] -= dmax; moved += dmax; for (let q = cnt[v]; q < cnt[v + 1]; q++){ const i = inc[q]; slack[(i / 3) | 0] -= SW[i] * dmax; } }
    }
    if (moved < 1e-4) break;
  }
  let unsat = 0; for (let p = 0; p < NS; p++) if (slack[p] < -1e-4) unsat++;
  for (let v = 0; v < NV; v++) if (drop[v] > 0){ FH[v] -= drop[v]; STAIRLOG.carvedVerts++; STAIRLOG.carveMax = Math.max(STAIRLOG.carveMax, drop[v]); }
  STAIRLOG.carveSamples = NS; STAIRLOG.unsatisfied = unsat; STAIRLOG.refinedCells = RSLOT.length; STAIRLOG.fineVerts = NV;
  window.__fine = { fx, fz };
}
// walkable ramp over the treads, looked up by playerGround
const STAIRHASH = new Map(), SCELL = 4;
for (const F of FLIGHTS) for (let i = 0; i <= F.N; i++){
  const q = treadQuad(F, i, 0.05), bb = bbOf(q), o = { F, i, poly: q, bb };
  for (let gx = Math.floor(bb[0] / SCELL); gx <= Math.floor(bb[1] / SCELL); gx++) for (let gz = Math.floor(bb[2] / SCELL); gz <= Math.floor(bb[3] / SCELL); gz++){ const key = gx + ',' + gz; if (!STAIRHASH.has(key)) STAIRHASH.set(key, []); STAIRHASH.get(key).push(o); }
}
for (const Ld of LANDINGS){ const bb = Ld.bb; for (let gx = Math.floor(bb[0] / SCELL); gx <= Math.floor(bb[1] / SCELL); gx++) for (let gz = Math.floor(bb[2] / SCELL); gz <= Math.floor(bb[3] / SCELL); gz++){ const key = gx + ',' + gz; if (!STAIRHASH.has(key)) STAIRHASH.set(key, []); STAIRHASH.get(key).push({ land: Ld, poly: Ld.poly, bb }); } }
// height of the visible stone surface (tread top) and of the smooth ramp the player walks on; null off the stairs
function stairAt(x, z){
  const L = STAIRHASH.get(Math.floor(x / SCELL) + ',' + Math.floor(z / SCELL)); if (!L) return null;
  let land = null;
  for (const o of L){
    if (x < o.bb[0] || x > o.bb[1] || z < o.bb[2] || z > o.bb[3] || !pip(o.poly, x, z)) continue;
    if (o.land){ land = o.land; continue; }
    const F = o.F, i = o.i, e0 = F.edges[i], T = F.sr[i + 1] - F.sr[i], y = F.ys[i], r = F.r;
    const d = clamp((x - e0.x) * e0.fx + (z - e0.z) * e0.fz, 0, T);
    let a = i > 0 ? 0.16 : 0, b = i < F.N ? 0.16 : 0; if (a + b > T){ const k = T / (a + b); a *= k; b *= k; }
    let ramp = y; if (a > 0 && d < a) ramp = y - r / 2 + (r / 2) * (d / a); else if (b > 0 && d > T - b) ramp = y + (r / 2) * ((d - (T - b)) / b);
    return { top: y, ramp, F, i };
  }
  return land ? { top: land.y, ramp: land.y, land } : null;
}

/* ================= palettes ================= */
const PAL = {
  forest: C('#2f472b'), forest2: C('#3b5631'), meadow: C('#8f7f5c'), grass: C('#7d8250'), alpine: C('#8a7d62'),
  rock: C('#7a726a'), rockDark: C('#5c5652'), snow: C('#f1f4f8'), snowShade: C('#dfe6ef'),
  earth: C('#a28f6a'), field: C('#a48f5e'), fieldGreen: C('#88874f'), riser: C('#8a8374'), pad: C('#a39a8a'), scrub: C('#6f7445'), floor: C('#3e4a30')
};
const tmpC = new THREE.Color(), tmpF = new THREE.Color(), farOut = new THREE.Color();
function farColor(out, x, z, h, ny, nzv){
  const n = fbm(x / 700, z / 700), n2 = vnoise(x / 180, z / 180), slope = 1 - ny;
  out.copy(PAL.meadow).lerp(PAL.grass, n2 * 0.6);
  const forestAmt = (1 - ss(3650, 4050, h + (n - 0.5) * 320)) * ss(0.06, 0.2, slope + (n2 - 0.5) * 0.18) * ss(2000, 2300, h + 400);
  out.lerp(tmpF.copy(PAL.forest).lerp(PAL.forest2, n2), clamp(forestAmt, 0, 1));
  out.lerp(PAL.alpine, ss(3950, 4400, h + (n - 0.5) * 250) * 0.85);
  out.lerp(PAL.rock, clamp(ss(4500, 5100, h + (n - 0.5) * 300) + ss(0.34, 0.55, slope) * ss(3600, 4300, h), 0, 1));
  const snowLine = 5050 + (n - 0.5) * 520 - 260 * Math.max(0, -nzv), steepLimit = lerp(0.42, 0.66, ss(5600, 7600, h));
  const snow = ss(snowLine - 160, snowLine + 260, h) * (1 - ss(steepLimit - 0.12, steepLimit + 0.06, slope + (n2 - 0.5) * 0.1));
  out.lerp(tmpF.copy(PAL.snow).lerp(PAL.snowShade, n2 * 0.6), snow);
  if (snow < 0.5 && h > 5600) out.lerp(PAL.rockDark, 0.35);
  return out;
}

/* ================= far terrain ================= */
setStatus('Raising Everest, Lhotse, Kongde Ri and Thamserku…'); await nextFrame();
{
  const pos = new Float32Array(NX * NZ * 3);
  for (let i = 0; i < NZ; i++) for (let j = 0; j < NX; j++){ const k = (i * NX + j) * 3; pos[k] = X0 + j * DX; pos[k + 1] = DEMH[i * NX + j]; pos[k + 2] = Z0 + i * DZ; }
  const idx = [];
  for (let i = 0; i < NZ - 1; i++) for (let j = 0; j < NX - 1; j++){ if (i >= T.r0 && i < T.r1 && j >= T.c0 && j < T.c1) continue; const a = i * NX + j, b = (i + 1) * NX + j, c = (i + 1) * NX + j + 1, d = i * NX + j + 1; idx.push(a, b, d, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const nrm = g.attributes.normal.array, col = new Float32Array(NX * NZ * 3);
  for (let v = 0; v < NX * NZ; v++){ farColor(farOut, pos[v * 3], pos[v * 3 + 2], pos[v * 3 + 1], nrm[v * 3 + 1], nrm[v * 3 + 2]); col[v * 3] = farOut.r; col[v * 3 + 1] = farOut.g; col[v * 3 + 2] = farOut.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true })); m.matrixAutoUpdate = false; scene.add(m);
}

/* ================= painted textures ================= */
setStatus('Painting stone, whitewash, timber and tin…'); await nextFrame();
function speckle(c, x, y, w, h, n, a, R){ for (let i = 0; i < n; i++){ const v = R() < 0.5 ? 0 : 255; c.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + (a * R()).toFixed(3) + ')'; c.fillRect(x + R() * w, y + R() * h, 1 + R() * 2, 1 + R() * 2); } }
function rrect(c, x, y, w, h, r){ r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r); c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h); c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r); c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath(); }
const MANTRA = 'ॐ मणि पद्मे हूँ';

const paveTex = (() => {
  const [cv, c] = mkCanvas(512, 512), R = mulberry(77);
  c.fillStyle = '#55514b'; c.fillRect(0, 0, 512, 512);
  let y = 0;
  while (y < 512){
    const rh = Math.min(512 - y, 46 + Math.floor(R() * 56)); let x = -Math.floor(R() * 90);
    while (x < 512){
      const w = 58 + Math.floor(R() * 120), g = 120 + Math.floor((R() - 0.5) * 40), bl = R() < 0.35 ? 10 : 0, wr = R() < 0.2 ? 8 : 0;
      const col = 'rgb(' + (g + wr) + ',' + (g - 2) + ',' + (g + bl - 4) + ')', crack = R() < 0.3, cx1 = R(), cx2 = R();
      for (const ox of [-512, 0, 512]){
        const sx = x + ox; if (sx + w < 0 || sx > 512) continue;
        c.fillStyle = col; rrect(c, sx + 3, y + 3, w - 6, rh - 6, 7); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.11)'; c.fillRect(sx + 7, y + 4, w - 14, 3);
        c.fillStyle = 'rgba(0,0,0,0.24)'; c.fillRect(sx + 7, y + rh - 7, w - 14, 3);
        if (crack){ c.strokeStyle = 'rgba(40,36,32,0.4)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(sx + 8 + cx1 * (w - 16), y + 5); c.lineTo(sx + 8 + cx2 * (w - 16), y + rh - 5); c.stroke(); }
      }
      x += w;
    }
    y += rh;
  }
  speckle(c, 0, 0, 512, 512, 9000, 0.12, R);
  return tex(cv, true);
})();
const dryTex = (() => {
  const [cv, c] = mkCanvas(512, 512), R = mulberry(91);
  c.fillStyle = '#3d3933'; c.fillRect(0, 0, 512, 512);
  let y = 0;
  while (y < 512){
    const rh = Math.min(512 - y, 30 + Math.floor(R() * 42)); let x = -Math.floor(R() * 60);
    while (x < 512){
      const w = 36 + Math.floor(R() * 78), t = R(), base = t < 0.4 ? [128, 120, 106] : t < 0.75 ? [112, 108, 102] : [142, 129, 104], kk = (R() - 0.5) * 30;
      const col = 'rgb(' + (base[0] + kk | 0) + ',' + (base[1] + kk | 0) + ',' + (base[2] + kk | 0) + ')', hh = rh - 4 - R() * 6, yy = y + 2 + R() * 3, lich = R() < 0.25, lx = R(), ly = R(), lr = R();
      for (const ox of [-512, 0, 512]){
        const sx = x + ox; if (sx + w < 0 || sx > 512) continue;
        c.fillStyle = col; rrect(c, sx + 2, yy, w - 4, hh, 9); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.13)'; c.fillRect(sx + 7, yy + 2, w - 14, 3);
        c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(sx + 6, yy + hh - 5, w - 12, 4);
        if (lich){ c.fillStyle = 'rgba(176,176,92,0.38)'; c.beginPath(); c.arc(sx + 8 + lx * (w - 16), yy + 4 + ly * Math.max(1, hh - 8), 3 + lr * 6, 0, Math.PI * 2); c.fill(); }
      }
      x += w;
    }
    y += rh;
  }
  speckle(c, 0, 0, 512, 512, 7000, 0.14, R);
  return tex(cv, true);
})();

// ---- facade atlas: 8 house styles (columns) x 8 bay types (rows) ----
const CELL = coarse ? 128 : 256;
const STY = [
  { wall: 'stone', tones: ['#b9ad99', '#ab9f8b', '#c5baa5', '#9f9585', '#b4a48c'], frame: '#2f7d4f', inner: '#efece4', trim: '#23593a' },
  { wall: 'stone', tones: ['#b9ad99', '#ab9f8b', '#c5baa5', '#9f9585', '#b4a48c'], frame: '#b3332b', inner: '#efece4', trim: '#7e221c' },
  { wall: 'stone', tones: ['#aaa69d', '#9b978f', '#b6b2a9', '#8f8b83', '#a39e94'], frame: '#2a62a8', inner: '#efece4', trim: '#1e4778' },
  { wall: 'white', tones: ['#f0eee8'], frame: '#2a7ab8', inner: '#ffffff', trim: '#1f5d8e' },
  { wall: 'white', tones: ['#efede6'], frame: '#2f8a57', inner: '#ffffff', trim: '#236b42' },
  { wall: 'wood', tones: ['#3a86b4', '#357fae', '#4090bd'], frame: '#f1ede4', inner: '#ffffff', trim: '#2a6a93' },
  { wall: 'plaster', tones: ['#ead9c3'], frame: '#a8322a', inner: '#fbf6ee', trim: '#7a241e' },
  { wall: 'temple', tones: ['#f4f1ea'], frame: '#241c18', inner: '#c8962e', trim: '#6e2420' }
];
function drawSurface(c, x0, y0, w, h, S, R, k){
  if (S.wall === 'stone'){
    c.fillStyle = '#6c645a'; c.fillRect(x0, y0, w, h);
    let y = y0;
    while (y < y0 + h){
      const ch = (15 + Math.floor(R() * 13)) * k; let x = x0 - Math.floor(R() * 34 * k);
      while (x < x0 + w){
        const cw = (24 + Math.floor(R() * 44)) * k;
        c.fillStyle = shade(S.tones[Math.floor(R() * S.tones.length)], (R() - 0.5) * 0.16); c.fillRect(x + 1.4 * k, y + 1.4 * k, cw - 2.8 * k, ch - 2.8 * k);
        c.fillStyle = 'rgba(255,255,255,0.11)'; c.fillRect(x + 1.4 * k, y + 1.4 * k, cw - 2.8 * k, 2 * k);
        c.fillStyle = 'rgba(0,0,0,0.17)'; c.fillRect(x + 1.4 * k, y + ch - 4 * k, cw - 2.8 * k, 2.4 * k);
        x += cw;
      }
      y += ch;
    }
    speckle(c, x0, y0, w, h, 900 * k * k, 0.1, R);
  } else if (S.wall === 'white' || S.wall === 'temple'){
    c.fillStyle = S.tones[0]; c.fillRect(x0, y0, w, h);
    c.strokeStyle = 'rgba(0,0,0,0.035)'; c.lineWidth = 1;
    for (let yy = y0 + 18 * k; yy < y0 + h; yy += 22 * k){ c.beginPath(); c.moveTo(x0, yy); c.lineTo(x0 + w, yy); c.stroke(); }
    speckle(c, x0, y0, w, h, 700 * k * k, 0.06, R);
    const g = c.createLinearGradient(0, y0 + h * 0.7, 0, y0 + h); g.addColorStop(0, 'rgba(120,100,70,0)'); g.addColorStop(1, 'rgba(120,100,70,0.16)'); c.fillStyle = g; c.fillRect(x0, y0 + h * 0.7, w, h * 0.3);
  } else if (S.wall === 'wood'){
    const bh = 20 * k;
    for (let yy = y0; yy < y0 + h; yy += bh){
      c.fillStyle = shade(S.tones[Math.floor(R() * S.tones.length)], (R() - 0.5) * 0.12); c.fillRect(x0, yy, w, bh);
      c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(x0, yy + bh - 2 * k, w, 2 * k);
      c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(x0, yy, w, 1.5 * k);
      if (R() < 0.35){ c.fillStyle = 'rgba(225,218,205,0.35)'; c.fillRect(x0 + R() * w, yy + 3 * k, (10 + R() * 40) * k, bh - 7 * k); }
    }
    c.fillStyle = 'rgba(0,0,0,0.2)'; c.fillRect(x0 + w * (0.2 + R() * 0.6), y0, 2 * k, h);
  } else {
    c.fillStyle = S.tones[0]; c.fillRect(x0, y0, w, h);
    for (let i = 0; i < 40; i++){ c.fillStyle = 'rgba(' + (R() < 0.5 ? '255,255,255' : '90,70,50') + ',' + (0.04 + R() * 0.05).toFixed(3) + ')'; c.beginPath(); c.arc(x0 + R() * w, y0 + R() * h, (6 + R() * 22) * k, 0, Math.PI * 2); c.fill(); }
    speckle(c, x0, y0, w, h, 600 * k * k, 0.06, R);
  }
}
function drawWin(c, x, y, w, h, S, k, em, lit, R){
  const f = 9 * k;
  if (!em){
    if (S.wall === 'temple'){ c.fillStyle = '#1d1714'; c.beginPath(); c.moveTo(x - f * 2.2, y + h + f * 2.6); c.lineTo(x + w + f * 2.2, y + h + f * 2.6); c.lineTo(x + w + f * 0.9, y - f * 1.2); c.lineTo(x - f * 0.9, y - f * 1.2); c.closePath(); c.fill(); }
    const ly = y - f - 17 * k, lw = w + 2 * f + 18 * k;
    c.fillStyle = shade(S.frame, -0.3); c.fillRect(x - f - 9 * k, ly, lw, 17 * k);
    const n = Math.floor(lw / (9 * k));
    for (let i = 0; i < n; i++){ c.fillStyle = i % 2 ? (S.wall === 'temple' ? '#c8962e' : S.inner) : shade(S.frame, 0.2); c.fillRect(x - f - 9 * k + i * 9 * k + 1.5 * k, ly + 4 * k, 5 * k, 8 * k); }
    c.fillStyle = S.frame; c.fillRect(x - f, y - f, w + 2 * f, h + 2 * f);
    c.fillStyle = 'rgba(255,255,255,0.2)'; c.fillRect(x - f, y - f, w + 2 * f, 2.5 * k); c.fillRect(x - f, y - f, 2.5 * k, h + 2 * f);
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(x - f, y + h + f - 2.5 * k, w + 2 * f, 2.5 * k); c.fillRect(x + w + f - 2.5 * k, y - f, 2.5 * k, h + 2 * f);
    const g = c.createLinearGradient(x, y, x + w * 0.6, y + h); g.addColorStop(0, '#506b7c'); g.addColorStop(0.42, '#25343f'); g.addColorStop(0.5, '#5d7789'); g.addColorStop(0.58, '#2a3a46'); g.addColorStop(1, '#1a252e');
    c.fillStyle = g; c.fillRect(x, y, w, h);
    if (R() < 0.6){ c.fillStyle = 'rgba(235,225,205,0.22)'; c.fillRect(x + 3 * k, y + 3 * k, w * 0.22, h - 6 * k); }
    c.strokeStyle = S.inner; c.lineWidth = 3.5 * k; c.strokeRect(x + 1.75 * k, y + 1.75 * k, w - 3.5 * k, h - 3.5 * k);
    c.beginPath(); c.moveTo(x + w / 2, y); c.lineTo(x + w / 2, y + h); c.moveTo(x, y + h / 3); c.lineTo(x + w, y + h / 3); c.moveTo(x, y + h * 2 / 3); c.lineTo(x + w, y + h * 2 / 3); c.stroke();
    c.fillStyle = shade(S.trim, 0.1); c.fillRect(x - f - 5 * k, y + h + f, w + 2 * f + 10 * k, 6 * k);
    c.fillStyle = 'rgba(0,0,0,0.22)'; c.fillRect(x - f - 5 * k, y + h + f + 6 * k, w + 2 * f + 10 * k, 5 * k);
  } else if (lit){
    const L = ['#ffb35a', '#ffc979', '#ffd9a0', '#f7a54c'][Math.floor(R() * 4)];
    const g = c.createLinearGradient(x, y, x, y + h); g.addColorStop(0, shade(L, 0.15)); g.addColorStop(1, shade(L, -0.25)); c.fillStyle = g; c.fillRect(x, y, w, h);
    c.strokeStyle = '#000'; c.lineWidth = 3.5 * k; c.strokeRect(x + 1.75 * k, y + 1.75 * k, w - 3.5 * k, h - 3.5 * k);
    c.beginPath(); c.moveTo(x + w / 2, y); c.lineTo(x + w / 2, y + h); c.moveTo(x, y + h / 3); c.lineTo(x + w, y + h / 3); c.moveTo(x, y + h * 2 / 3); c.lineTo(x + w, y + h * 2 / 3); c.stroke();
    if (R() < 0.5){ c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(x + 3 * k, y + 3 * k, w * 0.25, h - 6 * k); }
  }
}
function drawDoor(c, x, y, w, h, S, k, em){
  const f = 10 * k, panes = (fn) => { for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) fn(x + 6 * k + i * (w / 2), y + 6 * k + j * (h * 0.16), w / 2 - 12 * k, h * 0.14); };
  if (!em){
    const lw = w + 2 * f + 16 * k; c.fillStyle = shade(S.frame, -0.3); c.fillRect(x - f - 8 * k, y - f - 18 * k, lw, 18 * k);
    const n = Math.floor(lw / (8 * k)); for (let i = 0; i < n; i++){ c.fillStyle = ['#c8962e', '#b3332b', '#2a62a8', '#2f8a57'][i % 4]; c.fillRect(x - f - 8 * k + i * 8 * k + 1.5 * k, y - f - 14 * k, 5 * k, 9 * k); }
    c.fillStyle = S.frame; c.fillRect(x - f, y - f, w + 2 * f, h + f);
    c.fillStyle = S.wall === 'temple' ? '#9e2a22' : '#a8743f'; c.fillRect(x, y, w, h);
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(x + w / 2 - 1.5 * k, y, 3 * k, h);
    c.fillStyle = '#2d3c47'; panes((a, b, cw, ch) => c.fillRect(a, b, cw, ch));
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x + 6 * k, y + h * 0.6, w / 2 - 12 * k, h * 0.3); c.fillRect(x + w / 2 + 6 * k, y + h * 0.6, w / 2 - 12 * k, h * 0.3);
    c.fillStyle = '#d6b25a'; c.beginPath(); c.arc(x + w / 2 - 8 * k, y + h * 0.58, 3 * k, 0, Math.PI * 2); c.fill(); c.beginPath(); c.arc(x + w / 2 + 8 * k, y + h * 0.58, 3 * k, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#8f8a82'; c.fillRect(x - f - 6 * k, y + h - 6 * k, w + 2 * f + 12 * k, 6 * k);
  } else { c.fillStyle = '#ffbe6b'; panes((a, b, cw, ch) => c.fillRect(a, b, cw, ch)); }
}
function drawShop(c, x, y, w, h, S, k, em, R){
  if (!em){
    c.fillStyle = S.frame; c.fillRect(x - 6 * k, y - 6 * k, w + 12 * k, h + 6 * k);
    c.fillStyle = '#2b3a45'; c.fillRect(x, y, w * 0.62, h * 0.62);
    for (let i = 0; i < 26; i++){ c.fillStyle = ['#c94a3c', '#e2b33c', '#3f7fbf', '#3f9a62', '#e7e2d8', '#9a4ca8'][Math.floor(R() * 6)]; c.fillRect(x + 4 * k + R() * (w * 0.62 - 12 * k), y + 6 * k + Math.floor(R() * 3) * h * 0.2, 6 * k, h * 0.14); }
    c.strokeStyle = S.inner; c.lineWidth = 3 * k; c.strokeRect(x, y, w * 0.62, h * 0.62); c.beginPath(); c.moveTo(x + w * 0.31, y); c.lineTo(x + w * 0.31, y + h * 0.62); c.stroke();
    c.fillStyle = '#a8743f'; c.fillRect(x + w * 0.68, y, w * 0.3, h); c.fillStyle = '#2d3c47'; c.fillRect(x + w * 0.71, y + 6 * k, w * 0.24, h * 0.45);
    for (let i = 0; i < 9; i++){ c.fillStyle = ['#c23a30', '#e8b53a', '#2a5caa', '#2f8a57', '#d65b9a', '#f2efe6'][Math.floor(R() * 6)]; c.fillRect(x + 4 * k + i * (w * 0.62 / 9), y + h * 0.66, w * 0.05, h * (0.18 + R() * 0.14)); }
  } else { c.fillStyle = '#ffd08a'; c.fillRect(x, y, w * 0.62, h * 0.62); c.fillStyle = '#ffbe6b'; c.fillRect(x + w * 0.71, y + 6 * k, w * 0.24, h * 0.45); }
}
function drawMural(c, cx, cy, r, ci, k){
  const kind = ci % 3;
  if (kind === 0){
    c.save(); c.translate(cx, cy); c.rotate(Math.PI / 4); const s = r * 0.62, n = 3;
    for (const [col, lw] of [['#d9a52f', 7 * k], ['#a52a22', 2 * k]]){
      c.strokeStyle = col; c.lineWidth = lw;
      for (let i = 0; i <= n; i++){ const t = -s + 2 * s * i / n; c.beginPath(); c.moveTo(-s, t); c.lineTo(s, t); c.stroke(); c.beginPath(); c.moveTo(t, -s); c.lineTo(t, s); c.stroke(); }
      for (const [ax, ay, rot] of [[-s, -s, 0], [s, -s, 1], [s, s, 2], [-s, s, 3]]){ c.beginPath(); c.arc(ax, ay, s / n, Math.PI * 0.5 * rot + Math.PI, Math.PI * 0.5 * rot + Math.PI * 2.5); c.stroke(); }
    }
    c.restore();
  } else if (kind === 1){
    c.strokeStyle = '#d9a52f'; c.fillStyle = '#d9a52f'; c.lineWidth = 6 * k;
    c.beginPath(); c.arc(cx, cy, r * 0.6, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.arc(cx, cy, r * 0.16, 0, Math.PI * 2); c.fill();
    for (let i = 0; i < 8; i++){ const a = i / 8 * Math.PI * 2; c.beginPath(); c.moveTo(cx + Math.cos(a) * r * 0.16, cy + Math.sin(a) * r * 0.16); c.lineTo(cx + Math.cos(a) * r * 0.6, cy + Math.sin(a) * r * 0.6); c.stroke(); c.beginPath(); c.arc(cx + Math.cos(a) * r * 0.74, cy + Math.sin(a) * r * 0.74, 5 * k, 0, Math.PI * 2); c.fill(); }
  } else {
    c.fillStyle = 'rgba(165,42,34,0.92)'; c.fillRect(cx - r * 1.3, cy - r * 0.38, r * 2.6, r * 0.76);
    c.fillStyle = '#e8c04a'; c.font = '600 ' + Math.round(26 * k) + 'px Hind, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(MANTRA, cx, cy + 2 * k);
  }
}
function drawCell(c, ci, ri, S, em){
  const W = CELL, x0 = ci * W, y0 = ri * W, k = W / 256, R = mulberry(ci * 97 + ri * 13 + 5);
  c.save(); c.beginPath(); c.rect(x0, y0, W, W); c.clip();
  if (!em) drawSurface(c, x0, y0, W, W, S, R, k); else { c.fillStyle = '#000'; c.fillRect(x0, y0, W, W); }
  const lit = ri === 1 || ri === 2 || ri === 3 || ri === 6;
  if (ri === 1 || ri === 4) drawWin(c, x0 + W * 0.24, y0 + W * 0.22, W * 0.52, W * 0.51, S, k, em, lit, R);
  if (ri === 2 || ri === 5){ drawWin(c, x0 + W * 0.08, y0 + W * 0.22, W * 0.38, W * 0.51, S, k, em, lit, R); drawWin(c, x0 + W * 0.54, y0 + W * 0.22, W * 0.38, W * 0.51, S, k, em, lit && R() < 0.6, R); }
  if (ri === 3) drawDoor(c, x0 + W * 0.3, y0 + W * 0.18, W * 0.4, W * 0.82, S, k, em);
  if (ri === 6) drawShop(c, x0 + W * 0.06, y0 + W * 0.2, W * 0.88, W * 0.8, S, k, em, R);
  if (ri === 7 && !em) drawMural(c, x0 + W / 2, y0 + W * 0.45, W * 0.34, ci, k);
  if (!em){ c.fillStyle = S.trim; c.fillRect(x0, y0 + W - 9 * k, W, 9 * k); c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(x0, y0, W, 5 * k); }
  c.restore();
}
function buildAtlas(em){ const [cv, c] = mkCanvas(CELL * 8, CELL * 8); for (let ci = 0; ci < 8; ci++) for (let ri = 0; ri < 8; ri++) drawCell(c, ci, ri, STY[ci], em); return tex(cv, false); }
const atlas = buildAtlas(false), atlasEm = buildAtlas(true);
const cellUV = (st, row) => { const e = 0.003; return [st / 8 + e, (st + 1) / 8 - e, 1 - (row + 1) / 8 + e, 1 - row / 8 - e]; };

const roofTex = (() => {
  const [cv, c] = mkCanvas(128, 256), R = mulberry(5);
  for (let x = 0; x < 128; x++){ const v = 0.74 + 0.26 * Math.sin((x / 16) * Math.PI * 2), g = Math.round(255 * v); c.fillStyle = 'rgb(' + g + ',' + g + ',' + g + ')'; c.fillRect(x, 0, 1, 256); }
  for (let i = 0; i < 22; i++){ const x = R() * 128, w = 2 + R() * 7, gr = c.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(80,60,40,0)'); gr.addColorStop(1, 'rgba(80,60,40,' + (0.12 + R() * 0.2).toFixed(2) + ')'); c.fillStyle = gr; c.fillRect(x, R() * 128, w, 256); }
  for (let i = 0; i < 260; i++){ c.fillStyle = 'rgba(255,255,255,' + (R() * 0.15).toFixed(3) + ')'; c.fillRect(R() * 128, R() * 256, 1, 2 + R() * 6); }
  c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(0, 252, 128, 4);
  return tex(cv, true);
})();
const signNames = [];
for (const b of BLD){ if (b.name && b.kind !== 'gompa' && signNames.length < 64){ b.signSlot = signNames.length; signNames.push(b.name); } }
const signTex = (() => {
  const [cv, c] = mkCanvas(2048, 2048);
  const styles = [['#b3332b', '#f6f1e6'], ['#2a5caa', '#f6f1e6'], ['#2f7d4f', '#f6f1e6'], ['#efe6d2', '#b3332b'], ['#1f1b18', '#e2b33c'], ['#e2b33c', '#1f2a44']];
  signNames.forEach((name, i) => {
    const x = (i % 4) * 512, y = Math.floor(i / 4) * 128, R = mulberry(i * 31 + 7), st = styles[Math.floor(R() * styles.length)];
    c.fillStyle = shade(st[0], -0.35); c.fillRect(x, y, 512, 128); c.fillStyle = st[0]; c.fillRect(x + 8, y + 8, 496, 112);
    c.strokeStyle = st[1]; c.globalAlpha = 0.8; c.lineWidth = 3; c.strokeRect(x + 16, y + 16, 480, 96); c.globalAlpha = 1;
    const txt = /[A-Za-z]/.test(name) ? name.toUpperCase() : name;
    let fs = 84; c.font = '600 ' + fs + 'px Teko, Hind, sans-serif'; while (c.measureText(txt).width > 450 && fs > 28){ fs -= 4; c.font = '600 ' + fs + 'px Teko, Hind, sans-serif'; }
    c.fillStyle = st[1]; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, x + 256, y + 70);
    speckle(c, x, y, 512, 128, 1400, 0.08, R);
  });
  return tex(cv, false);
})();
const ornateTex = (() => {
  const [cv, c] = mkCanvas(1024, 256);
  c.fillStyle = '#1f6b4a'; c.fillRect(0, 0, 1024, 44);
  for (let x = 0; x < 1024; x += 16){ c.fillStyle = ['#d9a52f', '#c23a30', '#2a5caa', '#f2efe6'][(x / 16) % 4]; c.fillRect(x + 3, 10, 10, 24); c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x + 3, 30, 10, 4); }
  c.fillStyle = '#a8261f'; c.fillRect(0, 44, 1024, 70); c.fillStyle = '#e8c04a'; c.font = '600 44px Hind, sans-serif'; c.textBaseline = 'middle'; c.textAlign = 'left';
  for (let x = 12; x < 1024; x += 300) c.fillText(MANTRA, x, 82);
  c.fillStyle = '#1f3f86'; c.fillRect(0, 114, 1024, 60);
  for (let x = 0; x < 1064; x += 40){ c.fillStyle = ['#e46a8f', '#f2efe6', '#e8c04a'][(x / 40) % 3]; c.beginPath(); c.ellipse(x, 174, 18, 50, 0, Math.PI, Math.PI * 2); c.fill(); c.strokeStyle = '#7a1c3a'; c.lineWidth = 2; c.stroke(); }
  c.fillStyle = '#25744d'; c.fillRect(0, 174, 1024, 82);
  c.strokeStyle = '#e8c04a'; c.lineWidth = 4;
  for (let x = 30; x < 1024; x += 64){ c.beginPath(); for (let t = 0; t < 4 * Math.PI; t += 0.15){ const r = 4 + t * 2.2, px = x + Math.cos(t) * r, py = 214 + Math.sin(t) * r * 0.8; if (t === 0) c.moveTo(px, py); else c.lineTo(px, py); } c.stroke(); }
  c.fillStyle = '#d9a52f'; c.fillRect(0, 250, 1024, 6);
  return tex(cv, true);
})();
const drumTex = (() => {
  const [cv, c] = mkCanvas(512, 256);
  c.fillStyle = '#d9a52f'; c.fillRect(0, 0, 512, 256);
  c.fillStyle = '#a8261f'; c.fillRect(0, 28, 512, 88); c.fillStyle = '#1f3f86'; c.fillRect(0, 140, 512, 88);
  c.fillStyle = '#2f8a57'; c.fillRect(0, 116, 512, 24); c.fillRect(0, 228, 512, 10);
  c.fillStyle = '#e8c04a'; c.font = '600 60px Hind, sans-serif'; c.textBaseline = 'middle'; c.textAlign = 'left'; c.fillText(MANTRA, 12, 74); c.fillText(MANTRA, 40, 186);
  for (let x = 0; x < 512; x += 24){ c.fillStyle = '#c23a30'; c.beginPath(); c.arc(x + 12, 128, 7, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(0, 0, 512, 6); c.fillRect(0, 250, 512, 6);
  return tex(cv, true);
})();
const copperTex = (() => {
  const [cv, c] = mkCanvas(256, 128), g = c.createLinearGradient(0, 0, 256, 0); g.addColorStop(0, '#6e4528'); g.addColorStop(0.5, '#b07a4a'); g.addColorStop(1, '#6e4528');
  c.fillStyle = g; c.fillRect(0, 0, 256, 128); c.fillStyle = '#3a2416'; c.fillRect(0, 10, 256, 6); c.fillRect(0, 112, 256, 6);
  c.font = '600 38px Hind, sans-serif'; c.textBaseline = 'middle'; c.textAlign = 'left'; c.fillStyle = 'rgba(40,24,14,0.7)'; c.fillText('ॐ मणि पद्मे', 8, 66); c.fillStyle = 'rgba(240,200,150,0.5)'; c.fillText('ॐ मणि पद्मे', 6, 64);
  return tex(cv, true);
})();
const maniTex = (() => {
  const [cv, c] = mkCanvas(512, 256), R = mulberry(41);
  c.fillStyle = '#6e6a63'; c.fillRect(0, 0, 512, 256); speckle(c, 0, 0, 512, 256, 6000, 0.18, R);
  for (let i = 0; i < 18; i++){ c.fillStyle = 'rgba(' + (R() < 0.5 ? '40,38,34' : '150,146,138') + ',0.12)'; c.beginPath(); c.arc(R() * 512, R() * 256, 20 + R() * 60, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = '#f2efe6'; c.font = '600 54px Hind, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('ॐ मणि', 256, 70); c.fillText('पद्मे हूँ', 256, 150);
  c.fillStyle = '#e8c04a'; c.fillText('ॐ', 256, 222);
  return tex(cv, false);
})();
const kyimbuTex = (() => {
  const [cv, c] = mkCanvas(512, 128);
  c.fillStyle = '#5a1d19'; c.fillRect(0, 0, 512, 128); c.fillStyle = '#1d1714'; c.fillRect(0, 40, 512, 56);
  for (let x = 16; x < 512; x += 32){ c.fillStyle = '#f2efe6'; c.beginPath(); c.arc(x, 68, 11, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = '#c8962e'; c.fillRect(0, 0, 512, 8); c.fillRect(0, 120, 512, 8); c.fillStyle = '#a8261f'; c.fillRect(0, 12, 512, 20);
  return tex(cv, true);
})();
const railTex = (() => {
  const [cv, c] = mkCanvas(512, 64); c.fillStyle = '#6e1f1d'; c.fillRect(0, 0, 512, 64);
  c.strokeStyle = '#f2efe6'; c.lineWidth = 5;
  for (let x = 0; x < 512; x += 64){ c.beginPath(); c.moveTo(x + 6, 50); c.lineTo(x + 6, 14); c.lineTo(x + 40, 14); c.lineTo(x + 40, 38); c.lineTo(x + 22, 38); c.lineTo(x + 22, 26); c.stroke(); c.beginPath(); c.moveTo(x + 40, 50); c.lineTo(x + 70, 50); c.stroke(); }
  return tex(cv, true);
})();
const heliTex = (() => {
  const [cv, c] = mkCanvas(256, 256); c.fillStyle = '#9a968e'; c.beginPath(); c.arc(128, 128, 127, 0, Math.PI * 2); c.fill(); speckle(c, 0, 0, 256, 256, 3000, 0.15, mulberry(3));
  c.strokeStyle = '#e8b53a'; c.lineWidth = 10; c.beginPath(); c.arc(128, 128, 100, 0, Math.PI * 2); c.stroke();
  c.fillStyle = '#f2efe6'; c.font = '700 130px Hind, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('H', 128, 138);
  return tex(cv, false);
})();
const plankTex = (() => {
  const [cv, c] = mkCanvas(256, 256), R = mulberry(8);
  for (let y = 0; y < 256; y += 32){
    c.fillStyle = shade('#8a5a33', (R() - 0.5) * 0.25); c.fillRect(0, y, 256, 32); c.fillStyle = 'rgba(0,0,0,0.4)'; c.fillRect(0, y + 30, 256, 2);
    for (let i = 0; i < 6; i++){ c.strokeStyle = 'rgba(60,35,20,0.25)'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, y + 4 + R() * 24); c.bezierCurveTo(80, y + R() * 32, 170, y + R() * 32, 256, y + 4 + R() * 24); c.stroke(); }
  }
  return tex(cv, true);
})();
const grassTex = (() => {
  const [cv, c] = mkCanvas(128, 128), R = mulberry(17); c.clearRect(0, 0, 128, 128);
  for (let i = 0; i < 26; i++){
    const x = 8 + R() * 112, h = 50 + R() * 74, w = 3 + R() * 4, lean = (R() - 0.5) * 30, g = c.createLinearGradient(0, 128, 0, 128 - h);
    g.addColorStop(0, '#4f5a2c'); g.addColorStop(1, R() < 0.5 ? '#b9b06a' : '#93a356'); c.fillStyle = g;
    c.beginPath(); c.moveTo(x - w, 128); c.quadraticCurveTo(x + lean * 0.3, 128 - h * 0.5, x + lean, 128 - h); c.quadraticCurveTo(x + lean * 0.3 + w * 0.4, 128 - h * 0.5, x + w, 128); c.closePath(); c.fill();
  }
  return tex(cv, false);
})();
const gompaDoorTex = (() => {
  const [cv, c] = mkCanvas(512, 512);
  c.fillStyle = '#7a2a22'; c.fillRect(0, 0, 512, 512);
  for (const sx of [10, 382]){ c.fillStyle = '#1f3f86'; c.fillRect(sx, 30, 120, 470); for (let i = 0; i < 3; i++){ c.fillStyle = ['#e8c04a', '#e46a8f', '#2f8a57'][i]; c.beginPath(); c.arc(sx + 60, 110 + i * 150, 44, 0, Math.PI * 2); c.fill(); c.fillStyle = '#c23a30'; c.beginPath(); c.arc(sx + 60, 100 + i * 150, 20, 0, Math.PI * 2); c.fill(); c.fillStyle = '#f2efe6'; c.fillRect(sx + 50, 124 + i * 150, 20, 26); } }
  c.fillStyle = '#d9a52f'; c.fillRect(140, 60, 232, 440); c.fillStyle = '#2a5caa'; c.fillRect(152, 72, 208, 428); c.fillStyle = '#b3332b'; c.fillRect(166, 90, 180, 410);
  for (let x = 140; x < 372; x += 12){ c.fillStyle = ['#e8c04a', '#2f8a57', '#c23a30'][((x - 140) / 12) % 3]; c.fillRect(x + 2, 40, 8, 18); }
  c.fillStyle = '#e8c04a'; for (let y = 120; y < 490; y += 36) for (const x of [190, 230, 282, 322]){ c.beginPath(); c.arc(x, y, 4, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(254, 90, 4, 410);
  c.strokeStyle = '#e8c04a'; c.lineWidth = 6; c.beginPath(); c.arc(236, 300, 14, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.arc(276, 300, 14, 0, Math.PI * 2); c.stroke();
  return tex(cv, false);
})();
const postTex = (() => {
  const [cv, c] = mkCanvas(256, 512), names = signNames.filter((n) => /[A-Za-z]/.test(n)).slice(0, 7);
  c.fillStyle = '#3a3026'; c.fillRect(0, 0, 256, 512);
  names.forEach((n, i) => {
    const y = 8 + i * 70; c.fillStyle = '#e8c04a'; c.fillRect(6, y, 244, 60); c.strokeStyle = '#6b5420'; c.lineWidth = 3; c.strokeRect(8, y + 2, 240, 56);
    let fs = 40; const t = n.toUpperCase(); c.font = '600 ' + fs + 'px Teko, sans-serif'; while (c.measureText(t).width > 220 && fs > 18){ fs -= 2; c.font = '600 ' + fs + 'px Teko, sans-serif'; }
    c.fillStyle = '#2a2018'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(t, 128, y + 33);
  });
  return tex(cv, false);
})();
const eyesTex = (() => {
  const [cv, c] = mkCanvas(128, 96); c.fillStyle = '#f3f0e9'; c.fillRect(0, 0, 128, 96);
  c.strokeStyle = '#1d2433'; c.lineWidth = 5; c.lineCap = 'round';
  for (const ex of [36, 92]){ c.beginPath(); c.moveTo(ex - 20, 38); c.quadraticCurveTo(ex, 22, ex + 20, 38); c.stroke(); c.fillStyle = '#1d2433'; c.beginPath(); c.ellipse(ex, 46, 15, 7, 0, 0, Math.PI); c.fill(); c.fillStyle = '#2a63b3'; c.beginPath(); c.arc(ex, 48, 4.5, 0, Math.PI * 2); c.fill(); }
  c.lineWidth = 4; c.beginPath(); c.moveTo(66, 52); c.quadraticCurveTo(56, 60, 64, 66); c.quadraticCurveTo(72, 72, 62, 82); c.stroke();
  return tex(cv, false);
})();
const glowTex = (() => { const [cv, c] = mkCanvas(64, 64), g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,220,160,1)'); g.addColorStop(0.3, 'rgba(255,190,110,0.5)'); g.addColorStop(1, 'rgba(255,170,80,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); return tex(cv, false); })();
const soilTex = (() => {
  const [cv, c] = mkCanvas(512, 512), R = mulberry(303);
  c.fillStyle = '#808080'; c.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 260; i++){ const v = 96 + Math.floor(R() * 64); c.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',0.35)'; c.beginPath(); c.arc(R() * 512, R() * 512, 10 + R() * 40, 0, Math.PI * 2); c.fill(); }
  for (let i = 0; i < 1400; i++){ const x = R() * 512, y = R() * 512, r = 1.5 + Math.pow(R(), 3) * 9, v = 120 + Math.floor(R() * 90);
    c.fillStyle = 'rgba(40,40,40,0.35)'; c.beginPath(); c.ellipse(x + r * 0.35, y + r * 0.4, r, r * 0.75, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')'; c.beginPath(); c.ellipse(x, y, r, r * 0.72, R() * 3, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.25)'; c.beginPath(); c.ellipse(x - r * 0.25, y - r * 0.25, r * 0.4, r * 0.28, 0, 0, Math.PI * 2); c.fill(); }
  for (let i = 0; i < 900; i++){ const x = R() * 512, y = R() * 512, l = 4 + R() * 12, a = R() * Math.PI; c.strokeStyle = 'rgba(' + (R() < 0.5 ? '200,190,140' : '60,60,40') + ',0.5)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); }
  speckle(c, 0, 0, 512, 512, 16000, 0.2, R);
  return tex(cv, true);
})();
const whiteTex = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); whiteTex.needsUpdate = true;

/* ================= town terrain mesh ================= */
setStatus('Laying stone streets, dirt trails and fields…'); await nextFrame();
const maskTex = new THREE.Texture(imA); maskTex.wrapS = maskTex.wrapT = THREE.ClampToEdgeWrapping; maskTex.minFilter = THREE.LinearFilter; maskTex.generateMipmaps = false; maskTex.needsUpdate = true;
{
  const pos = new Float32Array(TN * 3), col = new Float32Array(TN * 3), fc = new THREE.Color(), tc = new THREE.Color();
  for (let iz = 0; iz < TZ; iz++){
    const z = TZ0 + iz * SZ;
    for (let ix = 0; ix < TX; ix++){
      const k = iz * TX + ix, x = TX0 + ix * SX;
      pos[k * 3] = x; pos[k * 3 + 1] = H[k]; pos[k * 3 + 2] = z;
      const gbx = (HB[iz * TX + Math.min(ix + 1, TX - 1)] - HB[iz * TX + Math.max(ix - 1, 0)]) / (2 * SX);
      const gbz = (HB[Math.min(iz + 1, TZ - 1) * TX + ix] - HB[Math.max(iz - 1, 0) * TX + ix]) / (2 * SZ);
      const ny = 1 / Math.sqrt(1 + gbx * gbx + gbz * gbz), nzv = -gbz * ny, grad = Math.hypot(gbx, gbz);
      farColor(fc, x, z, HB[k], ny, nzv);
      const lvl = Math.floor(HB[k] / TER);
      tc.copy(PAL.earth).lerp(PAL.grass, ss(0.42, 0.72, fbm(x / 40, z / 40)) * 0.6);
      tc.multiplyScalar(0.9 + 0.18 * vnoise(x / 6, z / 6));
      const fieldShade = 0.9 + 0.2 * hash2(lvl, Math.floor((x + z * 0.3) / 38));
      tmpC.copy(PAL.field).lerp(PAL.fieldGreen, ss(0.4, 0.8, hash2(lvl * 1.7, Math.floor(x / 45)))).multiplyScalar(fieldShade);
      tc.lerp(tmpC, FIELD[k] * 0.85);
      tc.lerp(PAL.pad, Math.max(PADW[k] * 0.8, NEARB[k] * 0.55));
      tc.lerp(PAL.floor, WOODW[k] * 0.85);
      tc.lerp(PAL.scrub, SCRUBW[k] * 0.55);
      tc.lerp(PAL.rock, ROCKW[k] * 0.6);
      tc.lerp(PAL.forest, ss(0.5, 0.8, grad) * (1 - FIELD[k]) * (1 - NEARB[k]) * 0.35 * (1 - ss(3800, 3950, HB[k])));
      tc.lerp(fc, ss(3780, 3950, HB[k]) * 0.8);
      tc.lerp(fc, 1 - BORD[k]);
      col[k * 3] = tc.r; col[k * 3 + 1] = tc.g; col[k * 3 + 2] = tc.b;
    }
  }
  const yard0 = new Float32Array(TN); for (let k = 0; k < TN; k++) yard0[k] = clamp(NEARB[k] * 1.25 + PADW[k], 0, 1) * (1 - FIELD[k]) * BORD[k];
  const NF = FH ? FH.length : 0, NT = TN + NF, nRef = RSLOT.length;
  const pos2 = new Float32Array(NT * 3), col2 = new Float32Array(NT * 3), yard = new Float32Array(NT);
  pos2.set(pos); col2.set(col); yard.set(yard0);
  if (NF){
    const fx = window.__fine.fx, fz = window.__fine.fz;
    for (let v = 0; v < NF; v++){
      const x = fx[v], z = fz[v], gx = (x - TX0) / SX, gz = (z - TZ0) / SZ, ix = clamp(Math.floor(gx), 0, TX - 2), iz = clamp(Math.floor(gz), 0, TZ - 2), u = clamp(gx - ix, 0, 1), w = clamp(gz - iz, 0, 1);
      const k00 = iz * TX + ix, k10 = k00 + 1, k01 = k00 + TX, k11 = k01 + 1, o = (TN + v) * 3;
      pos2[o] = x; pos2[o + 1] = FH[v]; pos2[o + 2] = z;
      for (let ch = 0; ch < 3; ch++) col2[o + ch] = (col[k00 * 3 + ch] * (1 - u) + col[k10 * 3 + ch] * u) * (1 - w) + (col[k01 * 3 + ch] * (1 - u) + col[k11 * 3 + ch] * u) * w;
      yard[TN + v] = (yard0[k00] * (1 - u) + yard0[k10] * u) * (1 - w) + (yard0[k01] * (1 - u) + yard0[k11] * u) * w;
    }
    delete window.__fine;
  }
  const idx = new Uint32Array(((TX - 1) * (TZ - 1) - nRef) * 6 + nRef * REFN * REFN * 6); let q = 0;
  for (let iz = 0; iz < TZ - 1; iz++) for (let ix = 0; ix < TX - 1; ix++){ if (RCELL[iz * (TX - 1) + ix] >= 0) continue; const a = iz * TX + ix, b = (iz + 1) * TX + ix, c = (iz + 1) * TX + ix + 1, d = iz * TX + ix + 1; idx[q++] = a; idx[q++] = b; idx[q++] = d; idx[q++] = b; idx[q++] = c; idx[q++] = d; }
  for (const R of RSLOT){ const V = R.v, W = REFN + 1; for (let j = 0; j < REFN; j++) for (let i = 0; i < REFN; i++){ const a = TN + V[j * W + i], b = TN + V[(j + 1) * W + i], c = TN + V[(j + 1) * W + i + 1], d = TN + V[j * W + i + 1]; idx[q++] = a; idx[q++] = b; idx[q++] = d; idx[q++] = b; idx[q++] = c; idx[q++] = d; } }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos2, 3)); g.setAttribute('color', new THREE.BufferAttribute(col2, 3)); g.setAttribute('yard', new THREE.BufferAttribute(yard, 1)); g.setIndex(new THREE.BufferAttribute(idx, 1)); g.computeVertexNormals();
  STAIRLOG.terrainTris = idx.length / 3;
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, map: paveTex });
  const ORX = Math.round(TX0) + '.0', ORZ = Math.round(TZ0) + '.0';
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.maskTex = { value: maskTex }; sh.uniforms.dryTex = { value: dryTex }; sh.uniforms.soilTex = { value: soilTex };
    sh.uniforms.mOff = { value: new THREE.Vector4(MK.x0, MK.z0, 1 / (MW * MPX), 1 / (MH * MPX)) };
    sh.vertexShader = 'attribute float yard;\nvarying float vYard;\nvarying vec3 vWPos;\nvarying float vSteep;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvWPos = position;\nvSteep = 1.0 - normal.y;\nvYard = yard;');
    sh.fragmentShader = 'uniform sampler2D maskTex;\nuniform sampler2D dryTex;\nuniform sampler2D soilTex;\nuniform vec4 mOff;\nvarying float vYard;\nvarying vec3 vWPos;\nvarying float vSteep;\n' + NOISE_GLSL + sh.fragmentShader
      .replace('#include <map_fragment>', [
        'vec2 wp = vWPos.xz - vec2(' + ORX + ', ' + ORZ + ');',
        'float n1 = gn(wp * 0.8), n2 = gn(wp * 3.1 + 7.1), n3 = gn(wp * 0.19 + 3.7);',
        'vec3 base = vColor * (0.84 + 0.16 * n1 + 0.1 * n2 + 0.08 * n3 - 0.08);',
        'float soil = texture2D(soilTex, wp * 0.42).r * 0.65 + texture2D(soilTex, wp * 0.11 + 0.37).r * 0.35;',
        'base *= 0.62 + 0.76 * soil;',
        'float steep = smoothstep(0.30, 0.55, vSteep);',
        'vec3 dry = texture2D(dryTex, vec2((wp.x + wp.y) * 0.36, vWPos.y * 0.36)).rgb;',
        'base = mix(base, dry, steep * 0.92);',
        'vec2 muv = vec2((vWPos.x - mOff.x) * mOff.z, 1.0 - (vWPos.z - mOff.y) * mOff.w);',
        'vec4 m = texture2D(maskTex, muv);',
        'vec3 pave = texture2D(map, wp * 0.3).rgb * (0.92 + 0.12 * n1);',
        'vec3 dirt = vec3(0.56, 0.47, 0.35) * (0.82 + 0.28 * n2) * (0.9 + 0.1 * n1);',
        'float yd = smoothstep(0.25, 0.75, vYard) * (1.0 - steep * 0.9);',
        'vec3 yardCol = mix(dirt * 1.06, pave * 0.94, smoothstep(0.35, 0.65, gn(wp * 0.35 + 11.0)));',
        'base = mix(base, yardCol, yd * 0.85);',
        'base = mix(base, dirt, smoothstep(0.18, 0.62, m.g) * (1.0 - steep * 0.9));',
        'base = mix(base, pave, smoothstep(0.22, 0.6, m.r) * (1.0 - steep * 0.9));',
        'base = mix(base, vec3(0.36, 0.38, 0.37) * (0.8 + 0.4 * n2), smoothstep(0.25, 0.7, m.b) * 0.7);',
        'diffuseColor.rgb *= base;'
      ].join('\n'))
      .replace('#include <color_fragment>', '');
  };
  const m = new THREE.Mesh(g, mat); m.receiveShadow = true; m.matrixAutoUpdate = false; scene.add(m);
}

/* ================= geometry helpers ================= */
class GeoB {
  constructor(){ this.p = []; this.n = []; this.c = []; this.u = []; }
  tri(a, b, c, col, ua, ub, uc){
    const e1x = b[0] - a[0], e1y = b[1] - a[1], e1z = b[2] - a[2], e2x = c[0] - a[0], e2y = c[1] - a[1], e2z = c[2] - a[2];
    let nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const cc = col || WHITE;
    for (const [v, uv] of [[a, ua], [b, ub], [c, uc]]){ this.p.push(v[0], v[1], v[2]); this.n.push(nx, ny, nz); this.c.push(cc.r, cc.g, cc.b); this.u.push(uv ? uv[0] : 0, uv ? uv[1] : 0); }
  }
  quad(a, b, c, d, col, ua, ub, uc, ud){ this.tri(a, b, c, col, ua, ub, uc); this.tri(a, c, d, col, ua, uc, ud); }
  build(){ const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2)); return g; }
}
const WHITE = C('#f3f0e9'), GOLDC = C('#d4a23a');
function box(B, cx, cy, cz, sx, sy, sz, col, rot, us){
  const c = Math.cos(rot || 0), s = Math.sin(rot || 0), hx = sx / 2, hz = sz / 2, U = us || 1;
  const P = (x, y, z) => [cx + x * c - z * s, cy + y, cz + x * s + z * c];
  const v = [P(-hx, 0, -hz), P(hx, 0, -hz), P(hx, 0, hz), P(-hx, 0, hz), P(-hx, sy, -hz), P(hx, sy, -hz), P(hx, sy, hz), P(-hx, sy, hz)];
  const uv = (a, b) => [a / U, b / U];
  B.quad(v[4], v[7], v[6], v[5], col, uv(0, 0), uv(0, sz), uv(sx, sz), uv(sx, 0));
  B.quad(v[0], v[1], v[2], v[3], col, uv(0, 0), uv(sx, 0), uv(sx, sz), uv(0, sz));
  B.quad(v[0], v[4], v[5], v[1], col, uv(0, cy), uv(0, cy + sy), uv(sx, cy + sy), uv(sx, cy));
  B.quad(v[1], v[5], v[6], v[2], col, uv(0, cy), uv(0, cy + sy), uv(sz, cy + sy), uv(sz, cy));
  B.quad(v[2], v[6], v[7], v[3], col, uv(0, cy), uv(0, cy + sy), uv(sx, cy + sy), uv(sx, cy));
  B.quad(v[3], v[7], v[4], v[0], col, uv(0, cy), uv(0, cy + sy), uv(sz, cy + sy), uv(sz, cy));
}
function frustum(B, cx, cy, cz, r0, r1, h, seg, col){
  for (let i = 0; i < seg; i++){
    const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2;
    const p0 = [cx + Math.cos(a0) * r0, cy, cz + Math.sin(a0) * r0], p1 = [cx + Math.cos(a1) * r0, cy, cz + Math.sin(a1) * r0];
    const q0 = [cx + Math.cos(a0) * r1, cy + h, cz + Math.sin(a0) * r1], q1 = [cx + Math.cos(a1) * r1, cy + h, cz + Math.sin(a1) * r1];
    B.quad(p0, q0, q1, p1, col);
    if (r1 > 0.001) B.tri([cx, cy + h, cz], q1, q0, col);
  }
}
function dome(B, cx, cy, cz, r, col){ const rings = 9, seg = 30; for (let i = 0; i < rings; i++){ const t0 = i / rings * Math.PI / 2, t1 = (i + 1) / rings * Math.PI / 2; frustum(B, cx, cy + Math.sin(t0) * r, cz, Math.cos(t0) * r, Math.cos(t1) * r, (Math.sin(t1) - Math.sin(t0)) * r, seg, col); } }
function cylUV(B, cx, cy, cz, r, h, seg, col, ur){
  for (let i = 0; i < seg; i++){
    const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2;
    const p0 = [cx + Math.cos(a0) * r, cy, cz + Math.sin(a0) * r], p1 = [cx + Math.cos(a1) * r, cy, cz + Math.sin(a1) * r], q0 = [p0[0], cy + h, p0[2]], q1 = [p1[0], cy + h, p1[2]];
    const u0 = (seg - i) / seg * ur, u1 = (seg - i - 1) / seg * ur;
    B.quad(p0, q0, q1, p1, col, [u0, 0], [u0, 1], [u1, 1], [u1, 0]);
  }
}
function boxO(B, px, pz, ax, az, nx, nz, w, d, y0, y1, col){
  const hx = ax * w / 2, hz = az * w / 2, a = [px - hx, pz - hz], b = [px + hx, pz + hz], c2 = [b[0] + nx * d, b[1] + nz * d], d2 = [a[0] + nx * d, a[1] + nz * d], v = (p, y) => [p[0], y, p[1]];
  B.quad(v(d2, y0), v(c2, y0), v(c2, y1), v(d2, y1), col); B.quad(v(a, y1), v(d2, y1), v(c2, y1), v(b, y1), col);
  B.quad(v(a, y0), v(b, y0), v(c2, y0), v(d2, y0), col); B.quad(v(a, y0), v(d2, y0), v(d2, y1), v(a, y1), col); B.quad(v(c2, y0), v(b, y0), v(b, y1), v(c2, y1), col);
}
const G = { walls: new GeoB(), roofs: new GeoB(), det: new GeoB(), stones: new GeoB(), glass: new GeoB(), sign: new GeoB(), kyim: new GeoB(), orn: new GeoB(), mural: new GeoB(), gold: new GeoB(), lm: new GeoB(), drum: new GeoB(), wheel: new GeoB(), rail: new GeoB(), mani: new GeoB(), plank: new GeoB(), steps: new GeoB(), water: new GeoB(), poles: new GeoB() };

/* ================= prayer flags (collected, built at the end) ================= */
const FLAGC = [C('#2a5caa'), C('#f4f1ea'), C('#c23a30'), C('#2f8a57'), C('#e8b53a')];
const flagB = { p: [], c: [], s: [] };
function flagString(A, Bp, sag){
  const len = Math.hypot(Bp[0] - A[0], Bp[1] - A[1], Bp[2] - A[2]), n = Math.max(4, Math.floor(len / 0.55));
  for (let i = 1; i < n; i++){
    const t = i / n, t2 = (i + 0.7) / n;
    const pA = [lerp(A[0], Bp[0], t), lerp(A[1], Bp[1], t) - sag * 4 * t * (1 - t), lerp(A[2], Bp[2], t)];
    const pB = [lerp(A[0], Bp[0], t2), lerp(A[1], Bp[1], t2) - sag * 4 * t2 * (1 - t2), lerp(A[2], Bp[2], t2)];
    const hgt = 0.34, col = FLAGC[i % 5], v = [pA, pB, [pB[0], pB[1] - hgt, pB[2]], [pA[0], pA[1] - hgt, pA[2]]], sw = [0, 0, 1, 1];
    for (const k of [0, 1, 2, 0, 2, 3]){ flagB.p.push(v[k][0], v[k][1], v[k][2]); flagB.c.push(col.r, col.g, col.b); flagB.s.push(sw[k]); }
  }
}
function pole(px, pz, h){ const y = groundAt(px, pz); box(G.poles, px, y, pz, 0.14, h, 0.14, C('#5b4330')); return [px, y + h, pz]; }

/* ================= buildings ================= */
setStatus('Raising ' + BLD.length + ' lodges, homes and shops from the map…'); await nextFrame();
const FLOOR = 2.9, BAY = 3.0;
const ROOFC = [C('#2f66b0'), C('#2c8c84'), C('#3b8853'), C('#ae3a2f'), C('#a5acb0'), C('#2d5d44')];
const styleOf = (b) => b.kind === 'gompa' ? 7 : b.wall === 0 ? [1, 0, 2, 0][b.fr] : b.wall === 1 ? [3, 4, 3, 4][b.fr] : b.wall === 2 ? 5 : 6;
for (const b of BLD){
  const poly = b.poly, n = poly.length;
  let cx = 0, cz = 0; for (const p of poly){ cx += p[0]; cz += p[1]; } cx /= n; cz /= n;
  let gmin = 1e9, gmax = -1e9;
  const samp = (x, z) => { const g = townGround(x, z); if (g < gmin) gmin = g; if (g > gmax) gmax = g; };
  for (let i = 0; i < n; i++){ const p = poly[i], q = poly[(i + 1) % n]; samp(p[0], p[1]); samp((p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
  samp(cx, cz);
  // T1c: the floor sits 0.15 m above the highest ground sample (vertices, edge midpoints, centroid),
  // so no wall is ever buried on the uphill side; the stone plinth runs down to 1 m below the lowest sample.
  const pad = gmax + 0.15, floors = b.f, eave = pad + floors * FLOOR;
  const st = styleOf(b), S = STY[st], R = mulberry(1000 + b.i * 7919);
  const tint = new THREE.Color(1, 1, 1).multiplyScalar(0.9 + R() * 0.12), trimC = C(S.trim), lintC = C(shade(S.frame, -0.3));
  const E = [];
  for (let i = 0; i < n; i++){
    const a = poly[i], c2 = poly[(i + 1) % n], ex = c2[0] - a[0], ez = c2[1] - a[1], L = Math.hypot(ex, ez); if (L < 0.4) continue;
    const ax = ex / L, az = ez / L, nx = -az, nz = ax, mx = (a[0] + c2[0]) / 2, mz = (a[1] + c2[1]) / 2;
    E.push({ a, b: c2, L, ax, az, nx, nz, mx, mz, g: townGround(mx + nx * 3, mz + nz * 3) });
  }
  if (!E.length) continue;
  let fac = null; for (const e of E){ if (e.L < 4) continue; if (!fac || e.g < fac.g - 0.3 || (Math.abs(e.g - fac.g) < 0.3 && e.L > fac.L)) fac = e; }
  if (!fac) fac = E.reduce((m, e) => e.L > m.L ? e : m, E[0]);
  // T1c: with the floor above the highest ground, a door on the downhill facade would hang in the air.
  // The door goes on the wall whose ground outside the door bay is highest; balconies and signs stay on fac.
  const doorBay = (e) => { const nb = Math.max(1, Math.round(e.L / BAY)), bw = e.L / nb, t = (Math.floor(nb / 2) + 0.5) * bw; return [e.a[0] + e.ax * t + e.nx * 0.6, e.a[1] + e.az * t + e.nz * 0.6, bw]; };
  let door = null, doorG = -1e9;
  for (const e of E){ const [x, z, bw] = doorBay(e); if (bw < 1.9) continue; const g = townGround(x, z) + (e === fac ? 0.05 : 0); if (g > doorG){ doorG = g; door = e; } }
  if (!door) door = fac;
  for (const e of E){
    const po = 0.14, pa = [e.a[0] + e.nx * po, e.a[1] + e.nz * po], pb = [e.b[0] + e.nx * po, e.b[1] + e.nz * po], yt = pad + 0.32, yb = gmin - 1.0;
    G.stones.quad([pa[0], yb, pa[1]], [pb[0], yb, pb[1]], [pb[0], yt, pb[1]], [pa[0], yt, pa[1]], tint, [0, yb / 1.8], [e.L / 1.8, yb / 1.8], [e.L / 1.8, yt / 1.8], [0, yt / 1.8]);
    G.stones.quad([e.a[0], yt, e.a[1]], [pa[0], yt, pa[1]], [pb[0], yt, pb[1]], [e.b[0], yt, e.b[1]], tint, [0, 0], [0, 0.08], [e.L / 1.8, 0.08], [e.L / 1.8, 0]);
    const nb = Math.max(1, Math.round(e.L / BAY)), bw = e.L / nb, isF = e === door, doorJ = Math.floor(nb / 2);
    for (let fl = 0; fl < floors; fl++){
      const y0 = pad + fl * FLOOR, y1 = y0 + FLOOR;
      for (let j = 0; j < nb; j++){
        let row = 0;
        if (bw >= 1.9){
          if (fl === 0){
            if (isF && j === doorJ) row = (b.kind === 'shop' || (b.kind === 'lodge' && R() < 0.35)) ? 6 : 3;
            else row = R() < 0.48 ? (R() < 0.7 ? 1 : 4) : (R() < 0.15 ? 7 : 0);
          } else {
            const pw = b.kind === 'house' ? 0.66 : 0.84;
            if (R() < pw){ const dbl = bw > 2.7 && R() < 0.24; row = dbl ? (R() < 0.7 ? 2 : 5) : (R() < 0.72 ? 1 : 4); }
            else row = R() < 0.06 ? 7 : 0;
          }
        }
        const t0 = j * bw, t1 = (j + 1) * bw, p0 = [e.a[0] + e.ax * t0, e.a[1] + e.az * t0], p1 = [e.a[0] + e.ax * t1, e.a[1] + e.az * t1];
        const [u0, u1, v0, v1] = cellUV(st, row);
        G.walls.quad([p0[0], y0, p0[1]], [p1[0], y0, p1[1]], [p1[0], y1, p1[1]], [p0[0], y1, p0[1]], tint, [u0, v0], [u1, v0], [u1, v1], [u0, v1]);
        const wins = (row === 1 || row === 4) ? [[0.24, 0.76]] : (row === 2 || row === 5) ? [[0.08, 0.46], [0.54, 0.92]] : [];
        for (const [fa, fb] of wins){
          const wc = (fa + fb) / 2, ww = (fb - fa) * bw, cxw = e.a[0] + e.ax * (t0 + wc * bw), czw = e.a[1] + e.az * (t0 + wc * bw);
          const ys = y0 + 0.27 * FLOOR - 0.1, yl = y0 + 0.78 * FLOOR + 0.1;
          boxO(G.det, cxw, czw, e.ax, e.az, e.nx, e.nz, ww + 0.34, 0.14, ys - 0.07, ys, trimC);
          boxO(G.det, cxw, czw, e.ax, e.az, e.nx, e.nz, ww + 0.42, 0.12, yl, yl + 0.19, lintC);
        }
        if (row === 3 || row === 6){
          const ww = (row === 6 ? 0.9 : 0.5) * bw + 0.5, cxw = e.a[0] + e.ax * (t0 + 0.5 * bw), czw = e.a[1] + e.az * (t0 + 0.5 * bw);
          const yA = y0 + 0.86 * FLOOR, hx = e.ax * ww / 2, hz = e.az * ww / 2, out = 0.95;
          G.roofs.quad([cxw - hx, yA + 0.12, czw - hz], [cxw + hx, yA + 0.12, czw + hz], [cxw + hx + e.nx * out, yA - 0.22, czw + hz + e.nz * out], [cxw - hx + e.nx * out, yA - 0.22, czw - hz + e.nz * out], ROOFC[(b.roof + 1) % 6], [0, 0], [ww, 0], [ww, 0.5], [0, 0.5]);
        }
      }
      if (fl > 0) boxO(G.det, e.mx, e.mz, e.ax, e.az, e.nx, e.nz, e.L + 0.04, 0.06, y0 - 0.18, y0, trimC);
    }
  }
  const isG = b.kind === 'gompa', pitch = isG ? 0.42 : 0.2 + R() * 0.14, ov = 0.6;
  const ux = b.ux, uz = b.uz, vx = -uz, vz = ux, L2 = b.hw + ov, W2 = b.hd + ov, ridgeY = eave + b.hd * pitch, eaveY = eave - ov * pitch;
  const RP = (su, sv, y) => [b.cx + ux * L2 * su + vx * W2 * sv, y, b.cz + uz * L2 * su + vz * W2 * sv];
  const E0 = RP(-1, -1, eaveY), E1 = RP(1, -1, eaveY), E2 = RP(1, 1, eaveY), E3 = RP(-1, 1, eaveY);
  const R0 = [b.cx - ux * L2, ridgeY, b.cz - uz * L2], R1 = [b.cx + ux * L2, ridgeY, b.cz + uz * L2];
  const rc = isG ? C('#c4932c') : ROOFC[b.roof].clone().multiplyScalar(0.86 + R() * 0.2);
  const sl = Math.hypot(W2, ridgeY - eaveY) / 2, ul = 2 * L2;
  G.roofs.quad(E0, E1, R1, R0, rc, [0, 0], [ul, 0], [ul, sl], [0, sl]);
  G.roofs.quad(E2, E3, R0, R1, rc, [ul, 0], [0, 0], [0, sl], [ul, sl]);
  const capC = rc.clone().multiplyScalar(0.78), dn = 0.32;
  const sv1 = [E0[0] - R0[0], E0[1] - R0[1], E0[2] - R0[2]], l1 = Math.hypot(...sv1), sv2 = [E3[0] - R0[0], E3[1] - R0[1], E3[2] - R0[2]], l2 = Math.hypot(...sv2);
  const off = (P, s, l) => [P[0] + s[0] / l * dn, P[1] + s[1] / l * dn + 0.05, P[2] + s[2] / l * dn], lift = (P) => [P[0], P[1] + 0.07, P[2]];
  G.roofs.quad(lift(R0), lift(R1), off(R1, sv1, l1), off(R0, sv1, l1), capC);
  G.roofs.quad(lift(R1), lift(R0), off(R0, sv2, l2), off(R1, sv2, l2), capC);
  const fas = C(S.wall === 'wood' ? '#f1ede4' : shade(S.trim, -0.05)), drop = (P, d) => [P[0], P[1] - d, P[2]];
  G.det.quad(E0, E1, drop(E1, 0.28), drop(E0, 0.28), fas); G.det.quad(E2, E3, drop(E3, 0.28), drop(E2, 0.28), fas);
  G.det.quad(E0, R0, drop(R0, 0.24), drop(E0, 0.24), fas); G.det.quad(R0, E3, drop(E3, 0.24), drop(R0, 0.24), fas);
  G.det.quad(E1, R1, drop(R1, 0.24), drop(E1, 0.24), fas); G.det.quad(R1, E2, drop(E2, 0.24), drop(R1, 0.24), fas);
  const [gu0, gu1, gv0, gv1] = cellUV(st, 0), gh = Math.min(1, (b.hd * pitch) / FLOOR);
  for (const su of [-1, 1]){
    const A = [b.cx + ux * b.hw * su - vx * b.hd, eave, b.cz + uz * b.hw * su - vz * b.hd], Bq = [b.cx + ux * b.hw * su + vx * b.hd, eave, b.cz + uz * b.hw * su + vz * b.hd], Ap = [b.cx + ux * b.hw * su, ridgeY, b.cz + uz * b.hw * su];
    const apUV = [(gu0 + gu1) / 2, gv0 + (gv1 - gv0) * gh];
    if (su < 0) G.walls.tri(A, Bq, Ap, tint, [gu0, gv0], [gu1, gv0], apUV); else G.walls.tri(Bq, A, Ap, tint, [gu0, gv0], [gu1, gv0], apUV);
  }
  if (isG){
    for (const e of E){ const a = [e.a[0] + e.nx * 0.07, e.a[1] + e.nz * 0.07], c2 = [e.b[0] + e.nx * 0.07, e.b[1] + e.nz * 0.07]; G.kyim.quad([a[0], eave - 1.25, a[1]], [c2[0], eave - 1.25, c2[1]], [c2[0], eave, c2[1]], [a[0], eave, a[1]], WHITE, [0, 0], [e.L / 1.6, 0], [e.L / 1.6, 1], [0, 1]); }
    for (const t of [-0.75, 0, 0.75]){ const fx = b.cx + ux * b.hw * t, fz = b.cz + uz * b.hw * t; frustum(G.gold, fx, ridgeY, fz, 0.42, 0.12, 1.9, 10, C('#d8a73a')); frustum(G.gold, fx, ridgeY + 1.9, fz, 0.2, 0, 0.7, 8, C('#e2b545')); }
    const pc = [fac.mx + fac.nx * 1.6, fac.mz + fac.nz * 1.6];
    for (const s of [-1, 1]){ const qx = pc[0] + fac.ax * 1.7 * s + fac.nx * 1.3, qz = pc[1] + fac.az * 1.7 * s + fac.nz * 1.3; box(G.gold, qx, pad, qz, 0.34, 3.0, 0.34, C('#8e2a22')); box(G.gold, qx, pad + 2.7, qz, 0.52, 0.3, 0.52, C('#d8a73a')); }
    const f0 = [pc[0] + fac.ax * 2.1 + fac.nx * 1.3, pc[1] + fac.az * 2.1 + fac.nz * 1.3], f1 = [pc[0] - fac.ax * 2.1 + fac.nx * 1.3, pc[1] - fac.az * 2.1 + fac.nz * 1.3];
    G.orn.quad([f1[0], pad + 3.0, f1[1]], [f0[0], pad + 3.0, f0[1]], [f0[0], pad + 3.9, f0[1]], [f1[0], pad + 3.9, f1[1]], WHITE, [0, 0], [1, 0], [1, 1], [0, 1]);
    const m0 = [fac.mx - fac.ax * 1.6 + fac.nx * 0.09, fac.mz - fac.az * 1.6 + fac.nz * 0.09], m1 = [fac.mx + fac.ax * 1.6 + fac.nx * 0.09, fac.mz + fac.az * 1.6 + fac.nz * 0.09];
    G.mural.quad([m0[0], pad, m0[1]], [m1[0], pad, m1[1]], [m1[0], pad + 3.1, m1[1]], [m0[0], pad + 3.1, m0[1]], WHITE, [0, 0], [1, 0], [1, 1], [0, 1]);
    const pr = (s, out, y) => [pc[0] + fac.ax * 2.3 * s + fac.nx * out, y, pc[1] + fac.az * 2.3 * s + fac.nz * out];
    G.roofs.quad(pr(-1, -1.5, pad + 4.3), pr(1, -1.5, pad + 4.3), pr(1, 1.9, pad + 3.85), pr(-1, 1.9, pad + 3.85), C('#c4932c'), [0, 0], [4.6, 0], [4.6, 1.7], [0, 1.7]);
    for (let i = 0; i < 4; i++){ const a = i / 4 * Math.PI * 2 + 0.4, t = pole(b.cx + Math.cos(a) * (b.hw + 9), b.cz + Math.sin(a) * (b.hd + 9), 2.2); flagString([b.cx, ridgeY + 1.6, b.cz], t, 1.4); }
  }
  if (b.bal && floors >= 3 && fac.L >= 5){
    const fl = floors - 1, y0 = pad + fl * FLOOR + 0.05, y1 = pad + (fl + 1) * FLOOR - 0.08, span = fac.L * 0.72, out = 1.25;
    const hx = fac.ax * span / 2, hz = fac.az * span / 2, a = [fac.mx - hx, fac.mz - hz], c2 = [fac.mx + hx, fac.mz + hz], a2 = [a[0] + fac.nx * out, a[1] + fac.nz * out], c3 = [c2[0] + fac.nx * out, c2[1] + fac.nz * out], gc = C('#2c4a63');
    G.glass.quad([a2[0], y0, a2[1]], [c3[0], y0, c3[1]], [c3[0], y1, c3[1]], [a2[0], y1, a2[1]], gc);
    G.glass.quad([a[0], y0, a[1]], [a2[0], y0, a2[1]], [a2[0], y1, a2[1]], [a[0], y1, a[1]], gc);
    G.glass.quad([c3[0], y0, c3[1]], [c2[0], y0, c2[1]], [c2[0], y1, c2[1]], [c3[0], y1, c3[1]], gc);
    boxO(G.det, fac.mx, fac.mz, fac.ax, fac.az, fac.nx, fac.nz, span + 0.2, out + 0.1, y1, y1 + 0.18, C(S.frame));
    boxO(G.det, fac.mx, fac.mz, fac.ax, fac.az, fac.nx, fac.nz, span + 0.2, out + 0.1, y0 - 0.2, y0, C(S.frame));
    const nm = Math.max(2, Math.round(span / 1.1));
    for (let i = 0; i <= nm; i++){ const t = -span / 2 + span * i / nm; box(G.det, fac.mx + fac.ax * t + fac.nx * out, y0, fac.mz + fac.az * t + fac.nz * out, 0.1, y1 - y0, 0.1, C(S.frame)); }
  } else if ((b.kind === 'shop' || b.kind === 'lodge' || (b.kind === 'house' && R() < 0.12)) && floors >= 2 && fac.L >= 5 && R() < 0.5){
    const y0 = pad + FLOOR, span = fac.L * 0.66, out = 1.1, wood = C('#8a5a33'), rail = C('#f1ede4');
    boxO(G.det, fac.mx, fac.mz, fac.ax, fac.az, fac.nx, fac.nz, span, out, y0 - 0.16, y0, wood);
    boxO(G.det, fac.mx + fac.nx * (out - 0.06), fac.mz + fac.nz * (out - 0.06), fac.ax, fac.az, fac.nx, fac.nz, span, 0.08, y0 + 0.92, y0 + 1.0, rail);
    boxO(G.det, fac.mx + fac.nx * (out - 0.06), fac.mz + fac.nz * (out - 0.06), fac.ax, fac.az, fac.nx, fac.nz, span, 0.06, y0 + 0.45, y0 + 0.5, rail);
    const np = Math.max(3, Math.round(span / 0.45));
    for (let i = 0; i <= np; i++){ const t = -span / 2 + span * i / np; box(G.det, fac.mx + fac.ax * t + fac.nx * (out - 0.05), y0, fac.mz + fac.az * t + fac.nz * (out - 0.05), 0.05, 0.95, 0.05, rail); }
    if (R() < 0.6) flagString([fac.mx - fac.ax * span / 2 + fac.nx * out, y0 + 2.2, fac.mz - fac.az * span / 2 + fac.nz * out], [fac.mx + fac.ax * span / 2 + fac.nx * out, y0 + 2.2, fac.mz + fac.az * span / 2 + fac.nz * out], 0.35);
  }
  if (b.signSlot !== undefined){
    const fl = Math.min(1, floors - 1), y = pad + fl * FLOOR + (fl ? 0.22 : 2.35);
    let w = Math.min(fac.L * 0.8, 3.4), h = w / 4; if (h > 0.85){ h = 0.85; w = 3.4; }
    const hx = fac.ax * w / 2, hz = fac.az * w / 2, o = 0.16, sx = fac.mx + fac.nx * o, sz = fac.mz + fac.nz * o;
    const u0 = (b.signSlot % 4) / 4, v0 = 1 - (Math.floor(b.signSlot / 4) + 1) / 16;
    G.sign.quad([sx - hx, y, sz - hz], [sx + hx, y, sz + hz], [sx + hx, y + h, sz + hz], [sx - hx, y + h, sz - hz], WHITE, [u0, v0], [u0 + 0.25, v0], [u0 + 0.25, v0 + 1 / 16], [u0, v0 + 1 / 16]);
  }
  b.pad = pad; b.eave = eave; b.top = ridgeY + (isG ? 2.6 : 0.3); b.fac = fac; b.door = door; b.gmin = gmin; b.gmax = gmax;
}
// prayer flags between neighbouring ridges
{
  const R = mulberry(4242); let made = 0;
  for (let t = 0; t < 1400 && made < 70; t++){
    const a = BLD[Math.floor(R() * BLD.length)], b = BLD[Math.floor(R() * BLD.length)]; if (a === b) continue;
    const d = Math.hypot(a.cx - b.cx, a.cz - b.cz); if (d < 14 || d > 34) continue;
    flagString([a.cx, a.top + 0.2, a.cz], [b.cx, b.top + 0.2, b.cz], 1.0 + d * 0.04); made++;
  }
}

/* ================= stupa, pavilions, chortens, mani walls ================= */
setStatus('Raising the stupa, prayer wheels and mani walls…'); await nextFrame();
const eyesMeshes = [];
function stupaBuild(sx, sz){
  const sy = groundAt(sx, sz);
  box(G.stones, sx, sy - 0.9, sz, 15.5, 1.5, 15.5, WHITE, 0, 1.8);
  box(G.lm, sx, sy + 0.6, sz, 12.6, 1.1, 12.6, WHITE); box(G.lm, sx, sy + 1.7, sz, 10.4, 1.0, 10.4, WHITE);
  dome(G.lm, sx, sy + 2.7, sz, 4.8, WHITE);
  box(G.lm, sx, sy + 7.4, sz, 2.6, 2.2, 2.6, WHITE);
  box(G.gold, sx, sy + 9.6, sz, 3.0, 0.35, 3.0, GOLDC);
  for (let i = 0; i < 13; i++){ const r0 = 1.25 - i * 0.075; frustum(G.gold, sx, sy + 9.95 + i * 0.4, sz, r0, r0 - 0.06, 0.36, 16, i % 2 ? GOLDC : C('#c99a32')); }
  frustum(G.gold, sx, sy + 15.15, sz, 1.0, 0.95, 0.28, 16, GOLDC); frustum(G.gold, sx, sy + 15.43, sz, 0.3, 0, 1.3, 12, GOLDC);
  const em = new THREE.MeshLambertMaterial({ map: eyesTex }), pl = new THREE.PlaneGeometry(2.62, 2.0);
  for (let i = 0; i < 4; i++){ const p = new THREE.Mesh(pl, em), a = i * Math.PI / 2; p.position.set(sx + Math.sin(a) * 1.315, sy + 8.5, sz + Math.cos(a) * 1.315); p.rotation.y = a; scene.add(p); eyesMeshes.push(p); }
  for (let side = 0; side < 4; side++){
    const a = side * Math.PI / 2, c = Math.cos(a), s = Math.sin(a), Q = (u, v) => [sx + u * c - v * s, sz + u * s + v * c];
    const L = Q(0, -8.15); box(G.lm, L[0], sy + 0.62, L[1], 15.9, 0.18, 0.7, WHITE, a); box(G.lm, L[0], sy + 0.45, L[1], 15.9, 0.17, 0.64, C('#2a5caa'), a);
    for (let i = 0; i < 16; i++){ const q = Q(-7.2 + i * 0.96, -8.25); cylUV(G.wheel, q[0], sy - 0.15, q[1], 0.17, 0.5, 10, WHITE, 1); }
  }
  return [sx, sy + 15.2, sz];
}
const stupaTop = stupaBuild(LMK.stupa[0], LMK.stupa[1]);
for (let i = 0; i < 8; i++){ const a = i / 8 * Math.PI * 2 + Math.PI / 8, t = pole(LMK.stupa[0] + Math.cos(a) * 17, LMK.stupa[1] + Math.sin(a) * 17, 3.0); flagString(stupaTop, t, 1.3); }
function pavilion(px, pz, ang, big){
  const y = groundAt(px, pz), c = Math.cos(ang), s = Math.sin(ang), P = (u, v) => [px + u * c - v * s, pz + u * s + v * c];
  const hw = big ? 2.3 : 1.75, hh = 2.9, y0 = y + 0.38, maroon = C('#7e231f'), goldC = C('#d8a73a');
  box(G.stones, px, y - 0.6, pz, hw * 2 + 1.0, 0.98, hw * 2 + 1.0, WHITE, ang, 1.8);
  for (const [u, v] of [[-hw, -hw], [hw, -hw], [hw, hw], [-hw, hw]]){ const q = P(u, v); box(G.lm, q[0], y0, q[1], 0.26, hh, 0.26, maroon, ang); box(G.gold, q[0], y0 + hh - 0.42, q[1], 0.44, 0.24, 0.44, goldC, ang); }
  const fy0 = y0 + hh - 0.1, fy1 = fy0 + 0.85, fo = hw + 0.18;
  for (let k = 0; k < 4; k++){
    const a0 = ang + k * Math.PI / 2, cc = Math.cos(a0), sn = Math.sin(a0), Q = (u, v) => [px + u * cc - v * sn, pz + u * sn + v * cc], A = Q(-fo, -fo), B2 = Q(fo, -fo);
    G.orn.quad([B2[0], fy0, B2[1]], [A[0], fy0, A[1]], [A[0], fy1, A[1]], [B2[0], fy1, B2[1]], WHITE, [0, 0], [1, 0], [1, 1], [0, 1]);
  }
  const ro = hw + 0.95, ry = fy1, rt = ry + 1.55, apex = [px, rt, pz], r4 = [P(-ro, -ro), P(ro, -ro), P(ro, ro), P(-ro, ro)].map((q) => [q[0], ry, q[1]]), rcol = C(big ? '#c2452f' : '#2f8a57');
  for (let k = 0; k < 4; k++) G.roofs.tri(r4[k], r4[(k + 1) % 4], apex, rcol, [0, 0], [ro * 2, 0], [ro, ro]);
  frustum(G.gold, px, rt - 0.1, pz, 0.28, 0.1, 0.9, 10, goldC); frustum(G.gold, px, rt + 0.8, pz, 0.16, 0, 0.5, 8, goldC);
  const dr = big ? 0.85 : 0.62, dh = big ? 2.0 : 1.55;
  cylUV(G.drum, px, y0 + 0.25, pz, dr, dh, 28, WHITE, 2);
  frustum(G.gold, px, y0 + 0.1, pz, dr + 0.08, dr + 0.08, 0.16, 28, goldC); frustum(G.gold, px, y0 + 0.25 + dh, pz, dr + 0.08, 0.1, 0.22, 28, goldC);
  for (let k = 1; k < 4; k++){
    const a0 = ang + k * Math.PI / 2, cc = Math.cos(a0), sn = Math.sin(a0), Q = (u, v) => [px + u * cc - v * sn, pz + u * sn + v * cc], A = Q(hw, -hw), B2 = Q(-hw, -hw);
    G.rail.quad([A[0], y0, A[1]], [B2[0], y0, B2[1]], [B2[0], y0 + 0.75, B2[1]], [A[0], y0 + 0.75, A[1]], WHITE, [0, 0], [hw * 2 / 1.4, 0], [hw * 2 / 1.4, 1], [0, 1]);
  }
  for (let k = 0; k < 2; k++){ const a = ang + Math.PI / 4 + k * Math.PI, t = pole(px + Math.cos(a) * 7.5, pz + Math.sin(a) * 7.5, 2.4); flagString(apex, t, 0.8); }
}
for (const p of LMK.pav) pavilion(p[0], p[1], p[2], p[3]);
function chorten(px, pz, sc){
  const y = groundAt(px, pz);
  box(G.stones, px, y - 0.4, pz, 3.4 * sc, 0.9 * sc, 3.4 * sc, WHITE, 0, 1.6);
  box(G.lm, px, y + 0.5 * sc, pz, 2.4 * sc, 0.8 * sc, 2.4 * sc, WHITE); box(G.lm, px, y + 1.3 * sc, pz, 1.9 * sc, 0.5 * sc, 1.9 * sc, WHITE);
  dome(G.lm, px, y + 1.8 * sc, pz, 1.1 * sc, WHITE);
  box(G.lm, px, y + 2.85 * sc, pz, 0.7 * sc, 0.5 * sc, 0.7 * sc, WHITE);
  frustum(G.gold, px, y + 3.35 * sc, pz, 0.36 * sc, 0.06 * sc, 2.0 * sc, 10, GOLDC);
  return [px, y + 5.2 * sc, pz];
}
for (const ch of LMK.chortens){ const top = chorten(ch[0], ch[1], ch[2]); for (let i = 0; i < 4; i++){ const a = i * Math.PI / 2 + 0.4, t = pole(ch[0] + Math.cos(a) * 8, ch[1] + Math.sin(a) * 8, 1.8); flagString(top, t, 0.5); } }
function maniWall(x, z, ang, len){
  const y = groundAt(x, z), c = Math.cos(ang), s = Math.sin(ang);
  box(G.stones, x, y - 0.5, z, len, 1.45, 1.0, WHITE, ang, 1.6);
  const n = Math.floor(len / 0.62);
  for (let i = 0; i < n; i++){
    const u = -len / 2 + 0.31 + i * 0.62;
    for (const side of [-1, 1]){
      const v = side * 0.26, cx = x + u * c - v * s, cz = z + u * s + v * c, hx = c * 0.27, hz = s * 0.27, yb = y + 0.95, yt = yb + 0.42;
      if (side > 0) G.mani.quad([cx - hx, yb, cz - hz], [cx + hx, yb, cz + hz], [cx + hx, yt, cz + hz], [cx - hx, yt, cz - hz], WHITE, [0, 0], [1, 0], [1, 1], [0, 1]);
      else G.mani.quad([cx + hx, yb, cz + hz], [cx - hx, yb, cz - hz], [cx - hx, yt, cz - hz], [cx + hx, yt, cz + hz], WHITE, [0, 0], [1, 0], [1, 1], [0, 1]);
    }
  }
}
for (const m of LMK.mani) maniWall(m[0], m[1], m[2], m[3]);
// mani boulders with carved mantras along the trails
const maniRocks = [];
{
  const R = mulberry(9090), allPts = [];
  for (const p of D.paths) for (let k = 0; k < p.p.length - 1; k++){ const a = p.p[k], b = p.p[k + 1]; allPts.push([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.atan2(b[1] - a[1], b[0] - a[0])]); }
  for (let t = 0; t < 600 && maniRocks.length < 16; t++){
    const p = allPts[Math.floor(R() * allPts.length)]; if (!p) break;
    const side = R() < 0.5 ? -1 : 1, nx = -Math.sin(p[2]) * side, nz = Math.cos(p[2]) * side, x = p[0] + nx * 3.0, z = p[1] + nz * 3.0;
    if (!inTown(x, z, 40) || !freeAt(x, z, 1.6) || !clearOfPaths(x, z, 1.2) || maniRocks.some((m) => Math.hypot(m[0] - x, m[1] - z) < 30)) continue;
    const y = groundAt(x, z), face = Math.atan2(-nz, -nx); maniRocks.push([x, y, z, face]);
    const fx = x - nx * 0.9, fz = z - nz * 0.9, tx = -nz * 0.6, tz = nx * 0.6;
    G.mani.quad([fx - tx, y + 0.12, fz - tz], [fx + tx, y + 0.12, fz + tz], [fx + tx, y + 1.0, fz + tz], [fx - tx, y + 1.0, fz - tz], WHITE, [0, 0], [1, 0], [1, 1], [0, 1]);
    addSolid(rectPoly(x, z, 1.2, 1.2, face), y + 1.6);
  }
}
// helipads
for (const h of LMK.heli){ const y = groundAt(h[0], h[1]) + 0.06, g = new THREE.CircleGeometry(h[2], 40); g.rotateX(-Math.PI / 2); g.translate(h[0], y, h[1]); const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: heliTex })); m.receiveShadow = true; scene.add(m); }
function bench(x, z, ang){ const y = groundAt(x, z), wood = C('#7a4f2e'); box(G.det, x, y + 0.42, z, 1.8, 0.08, 0.45, wood, ang); for (const u of [-0.75, 0.75]){ const cx = x + Math.cos(ang) * u, cz = z + Math.sin(ang) * u; box(G.det, cx, y, cz, 0.08, 0.42, 0.4, wood, ang); } }
{ // Everest viewpoint: chorten off the sightline, flags, benches
  const v = LMK.view, top = chorten(v[0] + 5.5, v[1] + 5.5, 1.0);
  const vt = pole(v[0] + 9, v[1] + 9, 7.5);
  for (let i = 0; i < 6; i++){ const a = Math.PI * 0.25 + (i / 5 - 0.5) * 2.4, t = pole(v[0] + 9 + Math.cos(a) * 12, v[1] + 9 + Math.sin(a) * 12, 1.8); flagString(vt, t, 0.8); }
  flagString(top, vt, 0.4); bench(v[0] - 2, v[1] + 2, -Math.PI / 4); bench(v[0] + 2, v[1] - 2.5, -Math.PI / 4);
  addSolid(rectPoly(v[0] + 5.5, v[1] + 5.5, 1.9, 1.9, 0), groundAt(v[0], v[1]) + 5.5);
}
{ // Syangboche ridge lookout
  const r = LMK.ridge, top = chorten(r[0] + 4, r[1] - 3, 1.1), vt = pole(r[0] - 4, r[1] - 4, 8);
  for (let i = 0; i < 7; i++){ const a = i / 7 * Math.PI * 2, t = pole(r[0] - 4 + Math.cos(a) * 13, r[1] - 4 + Math.sin(a) * 13, 1.9); flagString(vt, t, 0.9); }
  flagString(top, vt, 0.5); bench(r[0], r[1] + 3, 0); bench(r[0] + 3, r[1] + 1, Math.PI / 2);
  addSolid(rectPoly(r[0] + 4, r[1] - 3, 2.1, 2.1, 0), groundAt(r[0], r[1]) + 6);
}
for (const v of LMK.views){ if (freeAt(v[0], v[1], 1.5)){ bench(v[0], v[1], 0); const t = pole(v[0] + 2, v[1] + 1.5, 4.5), t2 = pole(v[0] - 4, v[1] + 3, 1.6); flagString(t, t2, 0.4); } }

/* ================= stairs, bridges, lamps, signposts ================= */
setStatus('Cutting stone stairs and building bridges…'); await nextFrame();
// T1d: each tread is a solid stone block, flat on top, its sides running down to below the (fitted) ground.
// Adjacent treads share their edge lines, so a flight is one continuous run with no gaps or overlaps.
for (const F of FLIGHTS){
  const R = mulberry(9001 + F.path * 131 + Math.round(F.A * 7));
  for (let i = 0; i <= F.N; i++){
    const q = treadQuad(F, i), y = F.ys[i];
    let gmin = 1e9; for (const c of q) gmin = Math.min(gmin, townGround(c[0], c[1])); for (let k = 0; k < 4; k++){ const a = q[k], b = q[(k + 1) % 4]; gmin = Math.min(gmin, townGround((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)); }
    const yb = Math.min(gmin, y) - 0.3, col = new THREE.Color(1, 1, 1).multiplyScalar(0.82 + R() * 0.26), rc = col.clone().multiplyScalar(0.72), sc = col.clone().multiplyScalar(0.8);
    const v = (p, h) => [p[0], h, p[1]], W = F.hw * 2, T = F.sr[i + 1] - F.sr[i], uo = R(), vo = R();
    G.steps.quad(v(q[0], y), v(q[1], y), v(q[2], y), v(q[3], y), col, [uo, vo], [uo + W / 3, vo], [uo + W / 3, vo + T / 3], [uo, vo + T / 3]);
    G.steps.quad(v(q[1], yb), v(q[0], yb), v(q[0], y), v(q[1], y), rc, [uo, 0], [uo + W / 3, 0], [uo + W / 3, (y - yb) / 3], [uo, (y - yb) / 3]);   // riser / front
    G.steps.quad(v(q[0], yb), v(q[3], yb), v(q[3], y), v(q[0], y), sc, [0, 0], [T / 3, 0], [T / 3, (y - yb) / 3], [0, (y - yb) / 3]);           // side
    G.steps.quad(v(q[2], yb), v(q[1], yb), v(q[1], y), v(q[2], y), sc, [0, 0], [T / 3, 0], [T / 3, (y - yb) / 3], [0, (y - yb) / 3]);           // side
    if (i === F.N) G.steps.quad(v(q[3], yb), v(q[2], yb), v(q[2], y), v(q[3], y), rc, [0, 0], [W / 3, 0], [W / 3, (y - yb) / 3], [0, (y - yb) / 3]);   // back of the top tread
  }
}
for (const Ld of LANDINGS){
  const P = Ld.poly, y = Ld.y, col = C('#e6e2da'); let gmin = 1e9; for (const c of P) gmin = Math.min(gmin, townGround(c[0], c[1]));
  for (let k = 1; k < P.length - 1; k++) G.steps.tri([P[0][0], y, P[0][1]], [P[k][0], y, P[k][1]], [P[k + 1][0], y, P[k + 1][1]], col, [P[0][0] / 3, P[0][1] / 3], [P[k][0] / 3, P[k][1] / 3], [P[k + 1][0] / 3, P[k + 1][1] / 3]);
  for (let k = 0; k < P.length; k++){ const a = P[k], b = P[(k + 1) % P.length]; G.steps.quad([a[0], gmin - 0.3, a[1]], [b[0], gmin - 0.3, b[1]], [b[0], y, b[1]], [a[0], y, a[1]], col.clone().multiplyScalar(0.75)); }
}
const DECKS = [];
function segX(a, b, c, d){ const r0 = b[0] - a[0], r1 = b[1] - a[1], s0 = d[0] - c[0], s1 = d[1] - c[1], den = r0 * s1 - r1 * s0; if (Math.abs(den) < 1e-9) return null; const t = ((c[0] - a[0]) * s1 - (c[1] - a[1]) * s0) / den, u = ((c[0] - a[0]) * r1 - (c[1] - a[1]) * r0) / den; if (t < 0 || t > 1 || u < 0 || u > 1) return null; return [a[0] + r0 * t, a[1] + r1 * t, Math.atan2(r1, r0)]; }
const BRIDGES = [];
for (const p of D.paths) for (let i = 0; i < p.p.length - 1; i++) for (const s of D.streams) for (let j = 0; j < s.length - 1; j++){
  const x = segX(p.p[i], p.p[i + 1], s[j], s[j + 1]); if (!x || !inTown(x[0], x[1], 40)) continue;
  if (BRIDGES.some((b) => Math.hypot(b[0] - x[0], b[1] - x[1]) < 14)) continue; BRIDGES.push([x[0], x[1], x[2], p.c]);
}
for (const [x, z, dir, core] of BRIDGES){
  const len = 9, w = core ? 2.6 : 1.9, c = Math.cos(dir), s = Math.sin(dir), e1 = [x - c * len / 2, z - s * len / 2], e2 = [x + c * len / 2, z + s * len / 2];
  const y = Math.max(groundAt(e1[0], e1[1]), groundAt(e2[0], e2[1])) + 0.25;
  box(G.plank, x, y - 0.18, z, len, 0.18, w, WHITE, dir, 1.0);
  for (const e of [e1, e2]) box(G.stones, e[0], y - 2.4, e[1], 1.6, 2.4, w + 0.8, WHITE, dir, 1.6);
  for (const side of [-1, 1]){
    const ox = -s * (w / 2 + 0.05) * side, oz = c * (w / 2 + 0.05) * side, np = Math.round(len);
    for (let i = 0; i <= np; i++){ const t = -len / 2 + len * i / np; box(G.det, x + c * t + ox, y, z + s * t + oz, 0.12, 1.0, 0.12, C('#6e1f1d'), dir); }
    const A = [x - c * len / 2 + ox, z - s * len / 2 + oz], B2 = [x + c * len / 2 + ox, z + s * len / 2 + oz];
    G.rail.quad([A[0], y + 0.5, A[1]], [B2[0], y + 0.5, B2[1]], [B2[0], y + 0.92, B2[1]], [A[0], y + 0.92, A[1]], WHITE, [0, 0], [len / 1.4, 0], [len / 1.4, 1], [0, 1]);
    box(G.det, x + ox, y + 0.92, z + oz, len, 0.08, 0.14, C('#5a1817'), dir);
    flagString([A[0], y + 1.05, A[1]], [B2[0], y + 1.05, B2[1]], 0.25);
  }
  const dp = rectPoly(x, z, len / 2, w / 2, dir); DECKS.push({ poly: dp, y, bb: bbOf(dp) });
}
const lampHeads = [];
{
  let last = null;
  for (let i = 0; i < corePts.length; i += 7){
    const p = corePts[i]; if (last && Math.hypot(p[0] - last[0], p[1] - last[1]) < 22) continue;
    const nx = -Math.sin(p[2]), nz = Math.cos(p[2]), x = p[0] + nx * 1.9, z = p[1] + nz * 1.9;
    if (!freeAt(x, z, 0.8) || !clearOfPaths(x, z, 0.25)) continue; last = p;
    const y = groundAt(x, z), dark = C('#3a3f44'), a = Math.atan2(-nz, -nx), c = Math.cos(a), s = Math.sin(a);
    box(G.det, x, y, z, 0.12, 4.6, 0.12, dark); box(G.det, x + c * 0.45, y + 4.45, z + s * 0.45, 0.9, 0.08, 0.1, dark, a);
    box(G.det, x + c * 0.85, y + 4.3, z + s * 0.85, 0.42, 0.14, 0.26, C('#d9dde0'), a); box(G.det, x, y + 4.75, z, 0.7, 0.05, 0.45, C('#1f2f4a'), a);
    lampHeads.push(x + c * 0.85, y + 4.22, z + s * 0.85);
    addSolid(rectPoly(x, z, 0.25, 0.25, 0), y + 4.8);
  }
}
{ // signpost by the stupa, like the yellow lodge boards in town
  let best = null; for (const p of corePts){ const d = Math.hypot(p[0] - LMK.stupa[0], p[1] - LMK.stupa[1]); if (d > 11 && (!best || d < best.d)) best = { d, p }; }
  if (best){ const p = best.p, nx = -Math.sin(p[2]), nz = Math.cos(p[2]), q = findFree(p[0] + nx * 2.2, p[1] + nz * 2.2, 0.6, 8, true); if (q){ const y = groundAt(q[0], q[1]); box(G.det, q[0], y, q[1], 0.12, 3.6, 0.12, C('#3a3f44')); const pg = new THREE.PlaneGeometry(1.2, 2.4); const pm = new THREE.Mesh(pg, new THREE.MeshLambertMaterial({ map: postTex, side: THREE.DoubleSide })); pm.position.set(q[0], y + 2.3, q[1]); pm.rotation.y = -p[2]; scene.add(pm); addSolid(rectPoly(q[0], q[1], 0.3, 0.3, 0), y + 3.6); } }
}

/* ================= running water ================= */
{
  let vlen = 0;
  for (const s of D.streams){
    for (let i = 0; i < s.length - 1; i++){
      const a = s[i], b = s[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.3 || !inTown(a[0], a[1], 8) || !inTown(b[0], b[1], 8)) continue;
      const n = Math.max(1, Math.ceil(L / 2)), ax = (b[0] - a[0]) / L, az = (b[1] - a[1]) / L, nx = -az, nz = ax, hw = 0.9;
      for (let k = 0; k < n; k++){
        const t0 = k * L / n, t1 = (k + 1) * L / n, p0 = [a[0] + ax * t0, a[1] + az * t0], p1 = [a[0] + ax * t1, a[1] + az * t1];
        const y0 = townGround(p0[0], p0[1]) + 0.34, y1 = townGround(p1[0], p1[1]) + 0.34, v0 = vlen, v1 = vlen + (t1 - t0); vlen = v1;
        G.water.quad([p0[0] - nx * hw, y0, p0[1] - nz * hw], [p0[0] + nx * hw, y0, p0[1] + nz * hw], [p1[0] + nx * hw, y1, p1[1] + nz * hw], [p1[0] - nx * hw, y1, p1[1] - nz * hw], WHITE, [0, v0], [1, v0], [1, v1], [0, v1]);
      }
    }
  }
}

/* ================= materials and meshes ================= */
const wallMat = new THREE.MeshLambertMaterial({ vertexColors: true, map: atlas, emissiveMap: atlasEm, emissive: new THREE.Color(0x000000) });
const glassMat = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: new THREE.Color(0x000000), side: THREE.DoubleSide });
const signMat = new THREE.MeshLambertMaterial({ map: signTex, emissiveMap: signTex, emissive: new THREE.Color(0x000000) });
const waterU = { value: 0 };
const waterMat = new THREE.MeshLambertMaterial({ map: whiteTex });
waterMat.onBeforeCompile = (sh) => {
  sh.uniforms.uTime = waterU;
  sh.fragmentShader = 'uniform float uTime;\n' + NOISE_GLSL + sh.fragmentShader.replace('#include <map_fragment>', [
    'float fl = vUv.y * 0.55 - uTime * 1.9;',
    'float wn = gn(vec2(vUv.x * 3.0, fl * 2.2)) * 0.6 + gn(vec2(vUv.x * 8.0 + 3.0, fl * 5.0)) * 0.4;',
    'float edge = 1.0 - abs(vUv.x - 0.5) * 2.0;',
    'float foam = smoothstep(0.58, 0.86, wn) * (0.55 + 0.45 * edge);',
    'vec3 wc = mix(vec3(0.16, 0.33, 0.38), vec3(0.40, 0.60, 0.64), wn * edge);',
    'wc = mix(wc, vec3(0.93, 0.96, 0.97), foam);',
    'diffuseColor.rgb = wc;'
  ].join('\n'));
};
function addMesh(B, mat, cast){ if (!B.p.length) return null; const m = new THREE.Mesh(B.build(), mat); m.castShadow = cast !== false; m.receiveShadow = true; m.matrixAutoUpdate = false; scene.add(m); return m; }
addMesh(G.walls, wallMat);
addMesh(G.roofs, new THREE.MeshLambertMaterial({ vertexColors: true, map: roofTex, side: THREE.DoubleSide }));
addMesh(G.det, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
addMesh(G.stones, new THREE.MeshLambertMaterial({ vertexColors: true, map: dryTex }));
addMesh(G.glass, glassMat, false);
addMesh(G.sign, signMat, false);
addMesh(G.kyim, new THREE.MeshLambertMaterial({ map: kyimbuTex }), false);
addMesh(G.orn, new THREE.MeshLambertMaterial({ map: ornateTex, side: THREE.DoubleSide }));
addMesh(G.mural, new THREE.MeshLambertMaterial({ map: gompaDoorTex }), false);
addMesh(G.gold, new THREE.MeshLambertMaterial({ vertexColors: true }));
addMesh(G.lm, new THREE.MeshLambertMaterial({ vertexColors: true }));
addMesh(G.drum, new THREE.MeshLambertMaterial({ map: drumTex }));
addMesh(G.wheel, new THREE.MeshLambertMaterial({ map: copperTex }));
addMesh(G.rail, new THREE.MeshLambertMaterial({ map: railTex, side: THREE.DoubleSide }));
addMesh(G.mani, new THREE.MeshLambertMaterial({ map: maniTex, side: THREE.DoubleSide }), false);
addMesh(G.plank, new THREE.MeshLambertMaterial({ vertexColors: true, map: plankTex }));
addMesh(G.steps, new THREE.MeshLambertMaterial({ vertexColors: true, map: paveTex, side: THREE.DoubleSide }));
addMesh(G.water, waterMat, false);
addMesh(G.poles, new THREE.MeshLambertMaterial({ vertexColors: true }));

/* ================= trees, shrubs, rocks, grass ================= */
setStatus('Planting pine, fir, juniper, rhododendron and grass…'); await nextFrame();
function mergeParts(parts){
  let n = 0; const geos = parts.map(([g, c]) => { const ng = g.index ? g.toNonIndexed() : g; ng.computeVertexNormals(); n += ng.attributes.position.count; return [ng, c]; });
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3), Cc = new Float32Array(n * 3); let o = 0;
  for (const [g, c] of geos){ P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); for (let i = 0; i < g.attributes.position.count; i++){ Cc[(o + i) * 3] = c.r; Cc[(o + i) * 3 + 1] = c.g; Cc[(o + i) * 3 + 2] = c.b; } o += g.attributes.position.count; }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(P, 3)); out.setAttribute('normal', new THREE.BufferAttribute(N, 3)); out.setAttribute('color', new THREE.BufferAttribute(Cc, 3)); return out;
}
const tr = (g, x, y, z, sx, sy, sz) => { g.scale(sx || 1, sy || 1, sz || 1); g.translate(x, y, z); return g; };
const pineGeo = mergeParts([[tr(new THREE.CylinderGeometry(0.16, 0.26, 3.4, 6), 0, 1.7, 0), C('#5a3e2b')], [tr(new THREE.ConeGeometry(2.3, 3.8, 8), 0, 3.9, 0), C('#2f4a2e')], [tr(new THREE.ConeGeometry(1.85, 3.3, 8), 0, 5.6, 0), C('#355433')], [tr(new THREE.ConeGeometry(1.3, 2.8, 8), 0, 7.3, 0), C('#3c5c37')], [tr(new THREE.ConeGeometry(0.7, 1.8, 7), 0, 8.7, 0), C('#42633b')]]);
const firGeo = mergeParts([[tr(new THREE.CylinderGeometry(0.14, 0.22, 2.4, 6), 0, 1.2, 0), C('#4e3626')], [tr(new THREE.ConeGeometry(1.55, 3.6, 7), 0, 3.1, 0), C('#243d2a')], [tr(new THREE.ConeGeometry(1.2, 3.2, 7), 0, 4.9, 0), C('#28442d')], [tr(new THREE.ConeGeometry(0.85, 2.8, 7), 0, 6.5, 0), C('#2c4a30')], [tr(new THREE.ConeGeometry(0.45, 2.0, 6), 0, 8.0, 0), C('#305034')]]);
const junGeo = mergeParts([[tr(new THREE.CylinderGeometry(0.15, 0.22, 1.6, 6), 0, 0.8, 0), C('#5a3e2b')], [tr(new THREE.IcosahedronGeometry(1.4, 0), 0, 2.3, 0, 1, 0.85, 1), C('#3b5232')], [tr(new THREE.IcosahedronGeometry(1.1, 0), 0.6, 3.2, 0.2, 1, 0.9, 1), C('#42593a')], [tr(new THREE.IcosahedronGeometry(0.9, 0), -0.5, 3.6, -0.3), C('#486040')]]);
const rhoGeo = mergeParts([[tr(new THREE.CylinderGeometry(0.14, 0.2, 1.8, 6), 0, 0.9, 0), C('#5a3e2b')], [tr(new THREE.IcosahedronGeometry(1.5, 1), 0, 2.6, 0, 1, 0.8, 1), C('#3f5c34')], [tr(new THREE.IcosahedronGeometry(1.25, 1), 0.3, 3.1, 0.2, 1, 0.75, 1), C('#c8344a')], [tr(new THREE.IcosahedronGeometry(0.9, 1), -0.5, 3.4, -0.3, 1, 0.8, 1), C('#d94a5e')]]);
const bushGeo = mergeParts([[tr(new THREE.IcosahedronGeometry(1, 0), 0, 0.45, 0, 1, 0.62, 1), C('#ffffff')]]);
const rockGeo = mergeParts([[tr(new THREE.DodecahedronGeometry(1, 0), 0, 0.2, 0, 1, 0.6, 1), C('#ffffff')]]);
function instanced(geo, list, tintFn, cast){
  if (!list.length) return null;
  const m = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }), list.length);
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), Pv = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), col = new THREE.Color();
  list.forEach((t, i) => { Q.setFromAxisAngle(up, t[4] * 6.283); S.set(t[3], t[3] * (t[5] || 1), t[3]); Pv.set(t[0], t[1], t[2]); M4.compose(Pv, Q, S); m.setMatrixAt(i, M4); m.setColorAt(i, tintFn(col, t, i)); });
  m.castShadow = cast !== false; m.receiveShadow = true; scene.add(m); return m;
}
{
  const R = mulberry(777), pines = [], firs = [], juns = [], rhos = [], bushes = [], rocks = [];
  const target = coarse ? 3600 : 8000;
  for (let tries = 0; pines.length + firs.length + juns.length < target && tries < target * 40; tries++){
    let x, z;
    if (R() < 0.58){ x = TXmin + R() * (TXmax - TXmin); z = TZmin + R() * (TZmax - TZmin); }
    else { const r = 600 + Math.pow(R(), 0.7) * 2800, a = R() * Math.PI * 2; x = 120 + Math.cos(a) * r; z = -200 + Math.sin(a) * r; }
    const h = groundAt(x, z); if (h > 3980 || h < 2650) continue;
    let dens;
    if (inTown(x, z)){
      const k = gridK(x, z);
      if (PATHW[k] > 0.2 || WATERW[k] > 0.15 || NEARB[k] > 0.25 || PADW[k] > 0.05) continue;
      dens = Math.max(WOODW[k] * 0.95, SCRUBW[k] * 0.25, 0.05 + 0.35 * ss(0.5, 0.7, fbm(x / 120, z / 120))) * (1 - FIELD[k] * 0.85);
      if (inside(x, z)) dens *= 0.5;
      if (R() > dens || nearBuilding(x, z, 2.2)) continue;
    } else {
      const e = 3, gx = (farH(x + e, z) - farH(x - e, z)) / (2 * e), gz = (farH(x, z + e) - farH(x, z - e)) / (2 * e), grad = Math.hypot(gx, gz);
      dens = ss(0.3, 0.55, grad) * (1 - ss(1.4, 1.8, grad)) * ss(0.42, 0.55, fbm(x / 160, z / 160));
      if (R() > dens) continue;
    }
    const t = [x, h - 0.3, z, 0.75 + R() * 0.6, R(), 0.85 + R() * 0.35], pick = R();
    if (h > 3800 || pick < 0.18) juns.push(t); else if (pick < 0.62) pines.push(t); else firs.push(t);
  }
  for (let i = 0; i < corePts.length && rhos.length < 70; i += 8){
    const p = corePts[i], nx = -Math.sin(p[2]), nz = Math.cos(p[2]);
    for (const side of [-1, 1]){ const x = p[0] + nx * 3.4 * side, z = p[1] + nz * 3.4 * side; if (R() < 0.45 && inside(x, z) && !nearBuilding(x, z, 1.8) && mPaved(x, z) < 0.2) rhos.push([x, groundAt(x, z) - 0.2, z, 0.7 + R() * 0.4, R(), 1]); }
  }
  const nb = coarse ? 2200 : 5200, nr = coarse ? 700 : 1700;
  for (let tries = 0; (bushes.length < nb || rocks.length < nr) && tries < 200000; tries++){
    const x = TXmin + 40 + R() * (TXmax - TXmin - 80), z = TZmin + 40 + R() * (TZmax - TZmin - 80), k = gridK(x, z);
    if (PADW[k] > 0.05 || NEARB[k] > 0.35 || PATHW[k] > 0.12 || WATERW[k] > 0.08) continue;
    const h = townGround(x, z); if (h > 4100) continue;
    if (R() < 0.25){ if (rocks.length < nr && (FIELD[k] < 0.5 || R() < 0.15)) rocks.push([x, h - 0.15, z, 0.4 + Math.pow(R(), 2) * 1.9 * (1 + ROCKW[k]), R(), 0.55]); }
    else { if (FIELD[k] > 0.55 && R() < 0.9) continue; if (R() > Math.max(SCRUBW[k], WOODW[k] * 0.7, 0.18 + 0.5 * ss(0.4, 0.7, fbm(x / 38, z / 38)))) continue; if (bushes.length < nb) bushes.push([x, h - 0.1, z, 0.5 + R() * 0.9, R(), 1]); }
  }
  for (const m of maniRocks) rocks.push([m[0], m[1] - 0.2, m[2], 1.25, m[3] / 6.283, 0.75]);
  const greens = (col, t, i) => col.setScalar(0.85 + hash2(i, 1) * 0.3);
  instanced(pineGeo, pines, greens); instanced(firGeo, firs, greens); instanced(junGeo, juns, greens); instanced(rhoGeo, rhos, greens);
  instanced(bushGeo, bushes, (col, t, i) => col.set(['#3d5233', '#4a5e35', '#5b6a3a', '#344a30', '#6b6a3c'][i % 5]));
  instanced(rockGeo, rocks, (col, t, i) => col.set(['#8d877e', '#7c766e', '#9a948a', '#6f6a63'][i % 4]));
}
const GRASSN = coarse ? 6000 : 13000;
const grassGeo = (() => { const g = new THREE.BufferGeometry(), P = [], U = []; for (let k = 0; k < 2; k++){ const a = k * Math.PI / 2, c = Math.cos(a) * 0.45, s = Math.sin(a) * 0.45; P.push(-c, 0, -s, c, 0, s, c, 0.55, s, -c, 0, -s, c, 0.55, s, -c, 0.55, -s); U.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1); } g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.computeVertexNormals(); const n = g.attributes.normal; for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0); return g; })();
const grassMat = new THREE.MeshLambertMaterial({ map: grassTex, alphaTest: 0.5, side: THREE.DoubleSide });
grassMat.onBeforeCompile = (sh) => { sh.uniforms.uTime = waterU; sh.fragmentShader = sh.fragmentShader.split('( gl_FrontFacing ) ? vLightFront : vLightBack').join('vLightFront').split('( gl_FrontFacing ) ? vIndirectFront : vIndirectBack').join('vIndirectFront'); sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n#ifdef USE_INSTANCING\nvec2 ip = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);\n#else\nvec2 ip = vec2(0.0);\n#endif\nfloat sw = sin(uTime * 2.1 + ip.x * 0.37 + ip.y * 0.29) * 0.07 * uv.y;\ntransformed.x += sw; transformed.z += sw * 0.6;'); };
const grass = new THREE.InstancedMesh(grassGeo, grassMat, GRASSN);
{ const c = new THREE.Color(1, 1, 1); for (let i = 0; i < GRASSN; i++) grass.setColorAt(i, c); }
grass.count = 0; grass.frustumCulled = false; scene.add(grass);
let grassAt = null;
function rebuildGrass(cx, cz){
  grassAt = [cx, cz];
  const step = 0.8, RAD = 40, M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), Pv = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), col = new THREE.Color(), gA = C('#8f9a4e'), gB = C('#b6a964');
  let n = 0;
  for (let gz = Math.floor((cz - RAD) / step); gz <= Math.floor((cz + RAD) / step) && n < GRASSN; gz++) for (let gx = Math.floor((cx - RAD) / step); gx <= Math.floor((cx + RAD) / step) && n < GRASSN; gx++){
    const hx = hash2(gx, gz), hz = hash2(gz * 1.7, gx * 0.3), x = gx * step + (hx - 0.5) * step, z = gz * step + (hz - 0.5) * step;
    const dx = x - cx, dz = z - cz; if (dx * dx + dz * dz > RAD * RAD || !inTown(x, z, 2)) continue;
    const k = gridK(x, z); if (NEARB[k] > 0.55 || PADW[k] > 0.4) continue;
    if (mPaved(x, z) > 0.2 || mDirt(x, z) > 0.4 || mWater(x, z) > 0.12) continue;
    const dens = 0.35 + 0.55 * fbm(x / 18, z / 18) - FIELD[k] * 0.35 + WOODW[k] * 0.1;
    if (hash2(gx * 0.71, gz * 1.31) > dens) continue;
    const s = 0.65 + hash2(gx * 3.1, gz * 2.3) * 0.75;
    Q.setFromAxisAngle(up, hx * 6.283); S.set(s, s * (0.8 + hz * 0.6), s); Pv.set(x, townGround(x, z) - 0.03, z);
    M4.compose(Pv, Q, S); grass.setMatrixAt(n, M4); grass.setColorAt(n, col.copy(gA).lerp(gB, clamp(fbm(x / 9, z / 9) * 1.3 - 0.15 + FIELD[k] * 0.4, 0, 1))); n++;
  }
  grass.count = n; grass.instanceMatrix.needsUpdate = true; if (grass.instanceColor) grass.instanceColor.needsUpdate = true;
}

/* ================= flags mesh ================= */
const flagUniform = { value: 0 };
{
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(flagB.p, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(flagB.c, 3)); g.setAttribute('sway', new THREE.Float32BufferAttribute(flagB.s, 1)); g.computeVertexNormals();
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  mat.onBeforeCompile = (sh) => { sh.uniforms.uTime = flagUniform; sh.vertexShader = 'uniform float uTime;\nattribute float sway;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nfloat ph = position.x * 0.9 + position.z * 0.7;\ntransformed.x += sin(uTime * 3.1 + ph) * 0.08 * sway;\ntransformed.z += cos(uTime * 2.6 + ph) * 0.08 * sway;\ntransformed.y += sin(uTime * 4.2 + ph) * 0.025 * sway;'); };
  const m = new THREE.Mesh(g, mat); m.matrixAutoUpdate = false; scene.add(m);
}

/* ================= sky, sun, fog, stars, clouds, lamp glow ================= */
const skyU = { top: { value: C('#2e62b4') }, mid: { value: C('#8fb3d9') }, hor: { value: C('#c8d9e8') }, sunDir: { value: new THREE.Vector3() }, sunCol: { value: C('#fff1d0') }, sunAmt: { value: 1 } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(140000, 48, 24), new THREE.ShaderMaterial({
  uniforms: skyU, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
  vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position.z = gl_Position.w * 0.9999; }',
  fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 hor; uniform vec3 sunDir; uniform vec3 sunCol; uniform float sunAmt; varying vec3 vDir;\nvoid main(){ float y = vDir.y; vec3 c = mix(hor, mid, smoothstep(0.0, 0.18, y)); c = mix(c, top, smoothstep(0.18, 0.75, y)); c = mix(c, hor * 0.92, smoothstep(0.0, -0.2, y));\n float s = max(dot(normalize(vDir), normalize(sunDir)), 0.0); c += sunCol * (pow(s, 900.0) * 1.4 + pow(s, 12.0) * 0.18) * sunAmt; gl_FragColor = vec4(c, 1.0); }'
}));
sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);
const stars = (() => {
  const n = 2200, p = new Float32Array(n * 3), R = mulberry(31337);
  for (let i = 0; i < n; i++){ const u = R() * 2 - 1, a = R() * Math.PI * 2, y = Math.abs(u) * 0.95 + 0.05, r = Math.sqrt(1 - y * y); p[i * 3] = Math.cos(a) * r * 120000; p[i * 3 + 1] = y * 120000; p[i * 3 + 2] = Math.sin(a) * r * 120000; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const m = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xdfe8ff, size: 1.6, sizeAttenuation: false, depthWrite: false, depthTest: false, fog: false }));
  m.renderOrder = -9; m.frustumCulled = false; m.visible = false; scene.add(m); return m;
})();
const lampGlow = (() => {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(lampHeads, 3));
  const m = new THREE.Points(g, new THREE.PointsMaterial({ map: glowTex, size: 3.2, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  m.visible = false; scene.add(m); return m;
})();
const hemi = new THREE.HemisphereLight(0xdbe8ff, 0x6b5a44, 0.62); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1dc, 0.92);
sun.castShadow = true; sun.shadow.mapSize.set(coarse ? 1024 : 2048, coarse ? 1024 : 2048);
{ const sc = sun.shadow.camera; sc.left = -95; sc.right = 95; sc.top = 95; sc.bottom = -95; sc.near = 10; sc.far = 900; }
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.35; scene.add(sun); scene.add(sun.target);
const SUNAZ = 128 * Math.PI / 180, SUNEL = 34 * Math.PI / 180;
const sunDir = new THREE.Vector3(Math.sin(SUNAZ) * Math.cos(SUNEL), Math.sin(SUNEL), -Math.cos(SUNAZ) * Math.cos(SUNEL));
const moonDir = new THREE.Vector3(-0.45, 0.62, -0.64).normalize();
skyU.sunDir.value.copy(sunDir);
scene.fog = new THREE.FogExp2(0xbfd2e4, 2.1e-5);
const clouds = [];
{
  const [cv, c] = mkCanvas(256, 128), R = mulberry(2024);
  for (let i = 0; i < 26; i++){ const x = 40 + R() * 176, y = 50 + R() * 40, r = 18 + R() * 34, gr = c.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
  const ct = tex(cv, false);
  const spots = [[2600, 1800, 3900], [4200, -900, 4300], [-3200, 2600, 4100], [6500, 3800, 4800], [9000, -6000, 5200], [-6000, -4200, 4700], [1500, -4800, 4400], [9000, -9000, 4300], [-9000, 6000, 5400], [5200, 7200, 4600], [14000, -12500, 4800], [3000, 5200, 3800], [-1500, -2500, 3700], [8000, 2000, 5000]];
  for (const [x, z, y] of spots){ const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: ct, color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false, fog: true })), w = 1100 + (Math.abs(x) + Math.abs(z)) * 0.08; s.scale.set(w, w * 0.42, 1); s.position.set(x, y, z); scene.add(s); clouds.push(s); }
}
let night = false;
function setNight(on){
  night = on;
  if (on){
    skyU.top.value.set('#060c1c'); skyU.mid.value.set('#0e1a33'); skyU.hor.value.set('#1d2c48'); skyU.sunAmt.value = 0.25; skyU.sunDir.value.copy(moonDir); skyU.sunCol.value.set('#c9d6ff');
    scene.fog.color.set('#17243b'); scene.fog.density = 2.6e-5; hemi.color.set('#40537e'); hemi.groundColor.set('#1a1a22'); hemi.intensity = 0.42; sun.color.set('#9fb4e8'); sun.intensity = 0.32;
    wallMat.emissive.set(0xffffff); glassMat.emissive.set('#a8743a'); signMat.emissive.set('#3a3a3a'); stars.visible = true; lampGlow.visible = true;
    for (const c of clouds) c.material.color.set('#4a5a78');
  } else {
    skyU.top.value.set('#2e62b4'); skyU.mid.value.set('#8fb3d9'); skyU.hor.value.set('#c8d9e8'); skyU.sunAmt.value = 1; skyU.sunDir.value.copy(sunDir); skyU.sunCol.value.set('#fff1d0');
    scene.fog.color.set('#bfd2e4'); scene.fog.density = 2.1e-5; hemi.color.set('#dbe8ff'); hemi.groundColor.set('#6b5a44'); hemi.intensity = 0.62; sun.color.set('#fff1dc'); sun.intensity = 0.92;
    wallMat.emissive.set(0x000000); glassMat.emissive.set(0x000000); signMat.emissive.set(0x000000); stars.visible = false; lampGlow.visible = false;
    for (const c of clouds) c.material.color.set('#ffffff');
  }
  $('#bNight').classList.toggle('on', on);
}
setNight(false);

/* ================= peaks: labels + line of sight ================= */
const PEAKS = D.peaks.map((p) => ({ ...p, vis: false, el: null }));
const labelsEl = $('#labels');
for (const p of PEAKS){ const el = document.createElement('div'); el.className = 'peak' + (p.n === 'Everest' ? ' big' : ''); el.innerHTML = '<div class="pn"></div><div class="pm"></div><div class="stem"></div>'; el.querySelector('.pn').textContent = p.n; el.style.display = 'none'; labelsEl.appendChild(el); p.el = el; }
let showPeaks = true;
function lineOfSight(ex, ey, ez, p){
  const tx = p.x, ty = p.y - 12, tz = p.z, n = 340, Dd = Math.hypot(tx - ex, tz - ez);
  for (let s = 1.5; s < 320; s += 1.5){
    const t = s / Dd, x = ex + (tx - ex) * t, z = ez + (tz - ez) * t, y = ey + (ty - ey) * t, L = BH.get(Math.floor(x / CELLM) + ',' + Math.floor(z / CELLM));
    if (!L) continue;
    for (const o of L){ if (!o.top || y > o.top) continue; if (x < o.bb[0] || x > o.bb[1] || z < o.bb[2] || z > o.bb[3]) continue; if (pip(o.poly, x, z)) return false; }
  }
  for (let i = 1; i < n; i++){ const t = (i / n) * (i / n), x = ex + (tx - ex) * t, z = ez + (tz - ez) * t, y = ey + (ty - ey) * t; if (groundAt(x, z) > y + 1.5) return false; }
  return true;
}

/* ================= player + collisions ================= */
const SPAWN = (() => {
  let wx = 0, wz = 0, ww = 0; for (const b of BLD){ const w = b.kind === 'lodge' || b.kind === 'shop' ? 3 : 1; wx += b.cx * w; wz += b.cz * w; ww += w; }
  const core = [wx / ww, wz / ww], s = LMK.stupa, dx = core[0] - s[0], dz = core[1] - s[1], l = Math.hypot(dx, dz) || 1, ux = dx / l, uz = dz / l;
  for (const d of [27, 31, 23, 35, 20]) for (const a of [0, 0.3, -0.3, 0.6, -0.6, 0.9, -0.9]){
    const c = Math.cos(a), sn = Math.sin(a), vx = ux * c - uz * sn, vz = ux * sn + uz * c, x = s[0] - vx * d, z = s[1] - vz * d;
    if (freeAt(x, z, 2.6)) return { x, z, face: core };
  }
  return { x: D.lm.spawn[0], z: D.lm.spawn[1], face: D.lm.face };
})();
const player = { x: SPAWN.x, z: SPAWN.z, y: 0, yaw: 0, pitch: -0.02 };
const spawnYaw = Math.atan2(-(SPAWN.face[0] - SPAWN.x), -(SPAWN.face[1] - SPAWN.z));
player.yaw = spawnYaw;
function playerGround(x, z){ const sa = stairAt(x, z); if (sa) return sa.ramp; let g = groundAt(x, z); for (const d of DECKS){ if (x > d.bb[0] && x < d.bb[1] && z > d.bb[2] && z < d.bb[3] && pip(d.poly, x, z)) g = Math.max(g, d.y); } return g; }
player.y = playerGround(player.x, player.z) + 1.65;
const keys = {}, WALK = 2.6, RUN = 5.6, EYE = 1.65;
let runToggle = false, playing = false, bobT = 0;
function collide(x, z){
  const r = 0.38;
  for (let it = 0; it < 3; it++){
    const L = BH.get(Math.floor(x / CELLM) + ',' + Math.floor(z / CELLM)); if (!L) break;
    let moved = false;
    for (const o of L){
      if (x < o.bb[0] - 1 || x > o.bb[1] + 1 || z < o.bb[2] - 1 || z > o.bb[3] + 1) continue;
      const inP = pip(o.poly, x, z), [d, px, pz] = edgeDist(o.poly, x, z);
      if (inP){ const dx = px - x, dz = pz - z, l = Math.hypot(dx, dz) || 1; x = px + dx / l * r; z = pz + dz / l * r; moved = true; }
      else if (d < r){ const dx = x - px, dz = z - pz, l = Math.hypot(dx, dz) || 1; x = px + dx / l * r; z = pz + dz / l * r; moved = true; }
    }
    if (!moved) break;
  }
  return [x, z];
}

/* ================= HUD: compass, map, toast ================= */
const cc = $('#compassc'), cctx = cc.getContext('2d');
const DIRS = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };
function drawCompass(heading){
  const W = cc.width, Hh = cc.height, cx = W / 2, span = 100;
  cctx.clearRect(0, 0, W, Hh); cctx.textAlign = 'center';
  for (let d = 0; d < 360; d += 5){
    const off = ((d - heading + 540) % 360) - 180; if (Math.abs(off) > span) continue;
    const x = cx + off / span * (W / 2 - 20); cctx.globalAlpha = 1 - Math.abs(off) / span * 0.75;
    if (DIRS[d] !== undefined){ cctx.fillStyle = d === 0 ? '#e8b53a' : '#f6f4ef'; cctx.font = '500 40px Teko, sans-serif'; cctx.fillText(DIRS[d], x, 62); }
    else if (d % 15 === 0){ cctx.fillStyle = 'rgba(246,244,239,.7)'; cctx.font = '400 22px Hind, sans-serif'; cctx.fillText(String(d), x, 56); }
    else { cctx.fillStyle = 'rgba(246,244,239,.45)'; cctx.fillRect(x - 1, 72, 2, 12); }
  }
  cctx.globalAlpha = 1;
  for (const p of PEAKS){ if (!p.vis) continue; const b = (Math.atan2(p.x - player.x, -(p.z - player.z)) * 180 / Math.PI + 360) % 360, off = ((b - heading + 540) % 360) - 180; if (Math.abs(off) > span) continue; const x = cx + off / span * (W / 2 - 20); cctx.fillStyle = '#e8b53a'; cctx.beginPath(); cctx.moveTo(x - 9, 104); cctx.lineTo(x + 9, 104); cctx.lineTo(x, 90); cctx.fill(); }
  cctx.fillStyle = '#e8b53a'; cctx.beginPath(); cctx.moveTo(cx - 9, 0); cctx.lineTo(cx + 9, 0); cctx.lineTo(cx, 12); cctx.fill();
}
const mc = $('#mapc'), MAPW = 480, MAPH = Math.round(480 * MH / MW);
mc.width = MAPW; mc.height = MAPH; mc.style.width = '240px'; mc.style.height = Math.round(MAPH / 2) + 'px';
const mctx = mc.getContext('2d');
const toMap = (x, z) => [(x - MK.x0) / (MW * MPX) * MAPW, (z - MK.z0) / (MH * MPX) * MAPH];
const mapBase = document.createElement('canvas'); mapBase.width = MAPW; mapBase.height = MAPH;
{
  const [lc, lx] = mkCanvas(MW, MH), id = lx.createImageData(MW, MH), dd = id.data;
  for (let i = 0; i < MW * MH; i++){
    const w = PC[i * 4] > 127, pv = PA[i * 4], dt = PA[i * 4 + 1], wt = PA[i * 4 + 2], wd = PB[i * 4];
    let r = 38, g = 52, b = 40; if (wd > 90){ r = 30; g = 44; b = 32; } if (w){ r = 72; g = 88; b = 58; }
    if (dt > 70){ r = 168; g = 146; b = 112; } if (pv > 70){ r = 214; g = 204; b = 182; } if (wt > 60){ r = 80; g = 150; b = 205; }
    dd[i * 4] = r; dd[i * 4 + 1] = g; dd[i * 4 + 2] = b; dd[i * 4 + 3] = 255;
  }
  lx.putImageData(id, 0, 0);
  const c = mapBase.getContext('2d'); c.imageSmoothingEnabled = true; c.drawImage(lc, 0, 0, MAPW, MAPH);
  for (const b of BLD){ c.fillStyle = b.kind === 'gompa' ? '#d9a63a' : b.kind === 'lodge' ? '#f1ebdc' : b.kind === 'shop' ? '#e9b98a' : '#c9c6c0'; c.beginPath(); b.poly.forEach((p, i) => { const q = toMap(p[0], p[1]); if (i) c.lineTo(q[0], q[1]); else c.moveTo(q[0], q[1]); }); c.closePath(); c.fill(); }
  const dot = (x, z, col, r) => { const q = toMap(x, z); c.fillStyle = col; c.beginPath(); c.arc(q[0], q[1], r || 4.5, 0, Math.PI * 2); c.fill(); };
  dot(LMK.stupa[0], LMK.stupa[1], '#ffffff', 5); for (const h of LMK.heli) dot(h[0], h[1], '#9a968e', 4);
  dot(LMK.view[0], LMK.view[1], '#e8b53a', 5); dot(LMK.ridge[0], LMK.ridge[1], '#e8b53a', 5);
  c.font = '600 17px Hind, sans-serif'; c.fillStyle = '#f6f4ef'; c.textAlign = 'center'; c.shadowColor = 'rgba(0,0,0,.7)'; c.shadowBlur = 4;
  const lab = (x, z, t, dy) => { const q = toMap(x, z); c.fillText(t, q[0], q[1] + dy); };
  lab(LMK.view[0], LMK.view[1], 'Everest view', 22); lab(LMK.ridge[0], LMK.ridge[1], 'Syangboche ridge', -12); lab(LMK.stupa[0], LMK.stupa[1], 'Stupa', 22);
  c.shadowBlur = 0;
}
function drawMap(){
  mctx.drawImage(mapBase, 0, 0);
  const q = toMap(player.x, player.z);
  mctx.save(); mctx.translate(q[0], q[1]); mctx.rotate(-player.yaw);
  mctx.fillStyle = 'rgba(232,181,58,.25)'; mctx.beginPath(); mctx.moveTo(0, 0); mctx.arc(0, 0, 40, -Math.PI / 2 - 0.55, -Math.PI / 2 + 0.55); mctx.closePath(); mctx.fill();
  mctx.fillStyle = '#e8b53a'; mctx.strokeStyle = '#1a2238'; mctx.lineWidth = 2; mctx.beginPath(); mctx.moveTo(0, -11); mctx.lineTo(8, 9); mctx.lineTo(0, 4); mctx.lineTo(-8, 9); mctx.closePath(); mctx.fill(); mctx.stroke();
  mctx.restore();
}
let mapBig = false;
function toggleMap(){ mapBig = !mapBig; $('#map').classList.toggle('big', mapBig); if (mapBig){ mc.style.width = 'min(720px, 80vw)'; mc.style.height = 'auto'; } else { mc.style.width = '240px'; mc.style.height = Math.round(MAPH / 2) + 'px'; } $('#bMap').classList.toggle('on', mapBig); }
$('#map').addEventListener('click', toggleMap);
const toastEl = $('#toast'); let toastT = 0;
function toast(html, secs){ toastEl.innerHTML = html; toastEl.classList.add('on'); toastT = secs || 5; }

/* ================= input ================= */
let locked = false, dragLook = false, lastMX = 0, lastMY = 0;
const look = (dx, dy, k) => { player.yaw -= dx * k; player.pitch = clamp(player.pitch - dy * k, -1.35, 1.35); };
document.addEventListener('pointerlockchange', () => { locked = document.pointerLockElement === canvas; if (!locked && playing && !coarse && !dragLook) pause(); });
document.addEventListener('pointerlockerror', () => { dragLook = true; });
canvas.addEventListener('mousemove', (e) => { if (!playing) return; if (locked) look(e.movementX, e.movementY, 0.0022); else if (dragLook && (e.buttons & 1)) look(e.clientX - lastMX, e.clientY - lastMY, 0.004); lastMX = e.clientX; lastMY = e.clientY; });
canvas.addEventListener('mousedown', (e) => { lastMX = e.clientX; lastMY = e.clientY; if (playing && !locked && !dragLook && !coarse && !TESTMODE) requestLock(); });
function requestLock(){ try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => { dragLook = true; }); } catch (e) { dragLook = true; } }
const keyMap = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r', ShiftLeft: 'run', ShiftRight: 'run' };
window.addEventListener('keydown', (e) => {
  if (keyMap[e.code]){ keys[keyMap[e.code]] = true; if (playing) e.preventDefault(); }
  if (!playing) return;
  if (e.code === 'KeyN') setNight(!night);
  if (e.code === 'KeyM') toggleMap();
  if (e.code === 'KeyP') showPeaks = !showPeaks;
  if (e.code === 'Escape' && dragLook) pause();
});
window.addEventListener('keyup', (e) => { if (keyMap[e.code]) keys[keyMap[e.code]] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
const stick = { id: null, x: 0, y: 0, cx: 0, cy: 0 }, lookT = { id: null, x: 0, y: 0 }, stickEl = $('#stick'), knob = $('#knob');
canvas.addEventListener('touchstart', (e) => {
  if (!playing) return;
  for (const t of e.changedTouches){
    if (t.clientX < window.innerWidth * 0.45 && stick.id === null){ const r = stickEl.getBoundingClientRect(); stick.id = t.identifier; stick.cx = r.left + r.width / 2; stick.cy = r.top + r.height / 2; stick.x = 0; stick.y = 0; }
    else if (lookT.id === null){ lookT.id = t.identifier; lookT.x = t.clientX; lookT.y = t.clientY; }
  }
  e.preventDefault();
}, { passive: false });
canvas.addEventListener('touchmove', (e) => {
  for (const t of e.changedTouches){
    if (t.identifier === stick.id){ let dx = (t.clientX - stick.cx) / 50, dy = (t.clientY - stick.cy) / 50; const l = Math.hypot(dx, dy); if (l > 1){ dx /= l; dy /= l; } stick.x = dx; stick.y = dy; knob.style.transform = 'translate(' + dx * 34 + 'px,' + dy * 34 + 'px)'; }
    else if (t.identifier === lookT.id){ look(t.clientX - lookT.x, t.clientY - lookT.y, 0.005); lookT.x = t.clientX; lookT.y = t.clientY; }
  }
  e.preventDefault();
}, { passive: false });
const endTouch = (e) => { for (const t of e.changedTouches){ if (t.identifier === stick.id){ stick.id = null; stick.x = stick.y = 0; knob.style.transform = ''; } if (t.identifier === lookT.id) lookT.id = null; } };
canvas.addEventListener('touchend', endTouch); canvas.addEventListener('touchcancel', endTouch);
$('#bRun').addEventListener('click', () => { runToggle = !runToggle; $('#bRun').classList.toggle('on', runToggle); });
$('#bNight').addEventListener('click', () => setNight(!night));
$('#bMap').addEventListener('click', toggleMap);

/* ================= start / pause / intro ================= */
const card = $('#card'), goBtn = $('#go');
let started = false, losT = 0, hudT = 0, sawEverest = false, sawRidge = false, t0 = 0, freeCam = null;
function showHud(on){ for (const id of ['#loc', '#compass', '#map', '#dot']) $(id).classList.toggle('hidden', !on); $('#hints').classList.toggle('hidden', !on || coarse); $('#touch').classList.toggle('hidden', !on || !coarse); }
function start(){
  if (!started){
    started = true; player.x = SPAWN.x; player.z = SPAWN.z; player.y = playerGround(player.x, player.z) + EYE; player.yaw = spawnYaw; player.pitch = 0.05;
    setTimeout(() => toast('You’re by the stupa at the foot of the bazaar. The stone stairs climb into town; the trail north leads to the <b>Syangboche ridge</b>.', 9), 600);
  }
  playing = true; losT = 0; for (const p of PEAKS){ p.vis = false; p.el.style.display = 'none'; }
  card.classList.add('hidden'); showHud(true);
  if (!coarse && !dragLook && !TESTMODE) requestLock();
  canvas.focus();
}
function pause(){
  playing = false; for (const k in keys) keys[k] = false;
  $('#ctitle').textContent = 'Paused'; $('#cdesc').textContent = 'Take a breath, it’s 3,440 m. Pick up where you left off.';
  $('#cfacts').classList.add('hidden'); goBtn.textContent = 'Keep walking';
  card.classList.remove('hidden'); showHud(false); $('#loc').classList.remove('hidden');
  if (document.pointerLockElement) document.exitPointerLock();
  goBtn.focus();
}
goBtn.addEventListener('click', start);
const intro = (() => {
  let best = null;
  for (const p of D.paths) for (const q of p.p){ if (q[1] > -760 && q[1] < -470 && inside(q[0], q[1])){ const d = Math.abs(q[0] - 40) + Math.abs(q[1] + 560) * 0.3; if (!best || d < best.d) best = { d, q }; } }
  const q = best ? best.q : [40, -560], y = groundAt(q[0], q[1]) + 26, tx = 70, tz = 60, dist = Math.hypot(tx - q[0], tz - q[1]);
  return { x: q[0], z: q[1], y, yaw: Math.atan2(-(tx - q[0]), -(tz - q[1])), pitch: -Math.atan2(y - 3460, dist) * 0.85 };
})();
rebuildGrass(SPAWN.x, SPAWN.z);

/* ================= loop ================= */
window.addEventListener('resize', () => { renderer.setSize(window.innerWidth, window.innerHeight, false); camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); });
const clock = new THREE.Clock(), altEl = $('#altv'), coordEl = $('#coordv'), geo = D.geo, v3 = new THREE.Vector3();
// one controller step (shared by the render loop and the ?test walk test)
function movePlayer(dt, fwd, side, running){
  let mx = side, mz = fwd; const l = Math.hypot(mx, mz); if (l > 1){ mx /= l; mz /= l; }
  const speed = running ? RUN : WALK, fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw), rx = Math.cos(player.yaw), rz = -Math.sin(player.yaw);
  if (l > 0.01){
    let nx = player.x + (fx * mz + rx * mx) * speed * dt, nz = player.z + (fz * mz + rz * mx) * speed * dt;
    const wasIn = inside(player.x, player.z);
    if (wasIn && !inside(nx, nz)){ if (inside(nx, player.z)) nz = player.z; else if (inside(player.x, nz)) nx = player.x; else { nx = player.x; nz = player.z; } }
    [nx, nz] = collide(nx, nz);
    if (inside(nx, nz) || !wasIn){ player.x = nx; player.z = nz; }
    bobT += dt * speed * 2.1;
  }
  const gy = playerGround(player.x, player.z) + EYE + Math.sin(bobT) * 0.035 * Math.min(1, l);
  player.y += (gy - player.y) * (1 - Math.exp(-dt * 11));
}
function frame(){
  const dt = Math.min(clock.getDelta(), 0.1); t0 += dt; flagUniform.value = t0; waterU.value = t0;
  if (freeCam){ camera.position.set(freeCam[0], freeCam[1], freeCam[2]); camera.rotation.set(freeCam[3], freeCam[4], 0); }
  else if (playing){
    movePlayer(dt, (keys.f ? 1 : 0) - (keys.b ? 1 : 0) - stick.y, (keys.r ? 1 : 0) - (keys.l ? 1 : 0) + stick.x, keys.run || runToggle);
    camera.position.set(player.x, player.y, player.z); camera.rotation.set(player.pitch, player.yaw, 0);
    if (!grassAt || Math.hypot(player.x - grassAt[0], player.z - grassAt[1]) > 7) rebuildGrass(player.x, player.z);
    if (!sawRidge && Math.hypot(player.x - LMK.ridge[0], player.z - LMK.ridge[1]) < 45){ sawRidge = true; toast('<b>Syangboche ridge</b>, ' + Math.round(groundAt(player.x, player.z)).toLocaleString('en-US') + ' m. The Khumbu valley opens up ahead.', 7); }
  } else if (!started){
    camera.position.set(intro.x, intro.y, intro.z); camera.rotation.set(intro.pitch, intro.yaw + 0.3 + Math.sin(t0 * 0.06) * 0.12, 0);
  }
  const snap = 190 / sun.shadow.mapSize.x, fxp = Math.round(camera.position.x / snap) * snap, fzp = Math.round(camera.position.z / snap) * snap, ld = night ? moonDir : sunDir;
  sun.target.position.set(fxp, camera.position.y - 20, fzp); sun.position.set(fxp + ld.x * 400, camera.position.y - 20 + ld.y * 400, fzp + ld.z * 400); sun.target.updateMatrixWorld();
  sky.position.copy(camera.position); stars.position.copy(camera.position);
  losT -= dt;
  if (losT <= 0){
    losT = 0.35;
    for (const p of PEAKS){
      const was = p.vis; p.vis = lineOfSight(camera.position.x, camera.position.y, camera.position.z, p);
      if (p.n === 'Everest' && p.vis && !was && playing && !sawEverest){ sawEverest = true; toast('<b>Everest</b> is in view, ' + (Math.hypot(p.x - player.x, p.z - player.z) / 1000).toFixed(1) + ' km to the northeast, above the Lhotse–Nuptse wall.', 7); }
    }
  }
  const W = window.innerWidth, Hh = window.innerHeight, shown = [];
  for (const p of PEAKS){
    if (!p.vis || !showPeaks || (!playing && started)){ p.el.style.display = 'none'; continue; }
    v3.set(p.x, p.y + 40, p.z).project(camera);
    if (v3.z > 1 || Math.abs(v3.x) > 1.05 || Math.abs(v3.y) > 1.05){ p.el.style.display = 'none'; continue; }
    shown.push({ p, sx: (v3.x + 1) / 2 * W, sy: (1 - v3.y) / 2 * Hh, km: Math.hypot(p.x - camera.position.x, p.z - camera.position.z) / 1000 });
  }
  shown.sort((a, b) => (b.p.n === 'Everest') - (a.p.n === 'Everest') || a.km - b.km);
  const placed = [];
  for (const s of shown){
    const w = Math.max(118, s.p.n.length * 13 + 30), h = 44; let lift = 0;
    for (let tries = 0; tries < 9; tries++){ const top = s.sy - 22 - lift - h, left = s.sx - w / 2; if (!placed.some((r) => left < r.l + r.w && left + w > r.l && top < r.t + r.h && top + h > r.t)){ placed.push({ l: left, t: top, w, h }); break; } lift += 30; }
    const el = s.p.el; el.style.display = ''; el.style.left = s.sx + 'px'; el.style.top = s.sy + 'px'; el.querySelector('.stem').style.height = (22 + lift) + 'px';
    el.querySelector('.pm').textContent = s.p.h.toLocaleString('en-US') + ' m, ' + s.km.toFixed(1) + ' km';
  }
  hudT -= dt;
  if (hudT <= 0 && started){
    hudT = 0.12;
    altEl.textContent = Math.round(groundAt(player.x, player.z)).toLocaleString('en-US');
    coordEl.textContent = (geo.lat0 - player.z / geo.mlat).toFixed(4) + '° N, ' + (geo.lon0 + player.x / geo.mlon).toFixed(4) + '° E';
    let heading = (-player.yaw * 180 / Math.PI) % 360; if (heading < 0) heading += 360;
    drawCompass(heading); drawMap();
  }
  if (toastT > 0){ toastT -= dt; if (toastT <= 0) toastEl.classList.remove('on'); }
  for (const c of clouds) c.position.x += dt * 6;
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
setStatus('Ready. You’re looking down on Namche from the trail to Syangboche.');
goBtn.disabled = false;
window.__namcheReady = true;
// ?test only: put the player, HUD, grass and peak line-of-sight in step with freeCam before a screenshot,
// so nothing depends on how many frames the (possibly very slow) renderer manages between calls.
function syncView(){
  if (freeCam){
    camera.position.set(freeCam[0], freeCam[1], freeCam[2]); camera.rotation.set(freeCam[3], freeCam[4], 0);
    player.x = freeCam[0]; player.z = freeCam[2]; player.y = freeCam[1]; player.yaw = freeCam[4]; player.pitch = freeCam[3];
  }
  camera.updateMatrixWorld(true);
  for (const p of PEAKS) p.vis = lineOfSight(camera.position.x, camera.position.y, camera.position.z, p);
  losT = 0.35; hudT = 0; rebuildGrass(camera.position.x, camera.position.z);
  toastT = 0; toastEl.classList.remove('on');
  return PEAKS.filter((p) => p.vis).map((p) => p.n);
}
// ?test only: stair measurements and an automated walk over every flight with the real controller.
const TEST = !TESTMODE ? null : (() => {
  const treadSamples = (F, i, fn) => { const q = treadQuad(F, i); for (let a = 0; a <= 8; a++) for (let b = 0; b <= 4; b++){ const u = a / 8, v = b / 4; fn(lerp(lerp(q[0][0], q[1][0], u), lerp(q[3][0], q[2][0], u), v), lerp(lerp(q[0][1], q[1][1], u), lerp(q[3][1], q[2][1], u), v)); } };
  let GAPMAX = 0.23; { let rm = 0; for (const F of FLIGHTS) if (F.N >= 1) rm = Math.max(rm, F.r); GAPMAX = rm + 0.03; }
  // walk a whole path (the main street) with the real controller: stuck, walls and steps taller than GAPMAX
  function walkPath(pi, rev){
    const P = D.paths[pi].p, wp = [];
    for (let i = 0; i < P.length - 1; i++){ const a = P[i], b = P[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / 0.4)); for (let k = 0; k < n; k++) wp.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); }
    wp.push(P[P.length - 1]); if (rev) wp.reverse();
    const W = wp.filter((q) => inside(q[0], q[1]) && inTown(q[0], q[1], 20));
    const save = { x: player.x, z: player.z, y: player.y, yaw: player.yaw, pitch: player.pitch, bobT };
    player.x = W[0][0]; player.z = W[0][1]; player.y = playerGround(player.x, player.z) + EYE;
    let idx = 0, t = 0, lastIdx = 0, lastT = 0, lastG = playerGround(player.x, player.z), maxJump = 0, inWall = 0, reason = 'ok', where = null, dist = 0, stairM = 0;
    const dt = 1 / 60;
    while (true){
      for (let j = idx; j < Math.min(W.length, idx + 8); j++) if (Math.hypot(W[j][0] - player.x, W[j][1] - player.z) < Math.hypot(W[idx][0] - player.x, W[idx][1] - player.z)) idx = j;
      if (idx >= W.length - 1 && Math.hypot(W[W.length - 1][0] - player.x, W[W.length - 1][1] - player.z) < 0.6) break;
      const tg = W[Math.min(W.length - 1, idx + 3)]; player.yaw = Math.atan2(-(tg[0] - player.x), -(tg[1] - player.z));
      const bx = player.x, bz = player.z; movePlayer(dt, 1, 0, false); t += dt; const st = Math.hypot(player.x - bx, player.z - bz); dist += st;
      if (stairAt(player.x, player.z)) stairM += st;
      if (idx > lastIdx){ lastIdx = idx; lastT = t; }
      if (t - lastT > 2){ reason = 'stuck'; where = [+player.x.toFixed(1), +player.z.toFixed(1)]; break; }
      if (t > 2000){ reason = 'timeout'; break; }
      const g = playerGround(player.x, player.z); if (Math.abs(g - lastG) > maxJump){ maxJump = Math.abs(g - lastG); if (maxJump > GAPMAX) where = [+player.x.toFixed(1), +player.z.toFixed(1)]; } lastG = g;
      if (nearBuilding(player.x, player.z, 0.05)) inWall++;
    }
    Object.assign(player, { x: save.x, z: save.z, y: save.y, yaw: save.yaw, pitch: save.pitch }); bobT = save.bobT;
    let ok = reason === 'ok'; if (ok && inWall){ ok = false; reason = 'inside a wall'; } if (ok && maxJump > GAPMAX){ ok = false; reason = 'gap or ledge (' + maxJump.toFixed(2) + ' m step)'; }
    return { path: pi, ok, reason, walkedM: +dist.toFixed(0), onStairsM: +stairM.toFixed(0), maxStep: +maxJump.toFixed(3), s: +t.toFixed(0), at: where };
  }
  function mainStreet(){ let best = -1, bn = -1; for (let i = 0; i < D.paths.length; i++){ const p = D.paths[i]; if (!p.c) continue; let n = 0; for (const b of BLD){ let d = 1e9; for (const q of p.p) d = Math.min(d, Math.hypot(q[0] - b.cx, q[1] - b.cz)); if (d < 15) n++; } if (n > bn){ bn = n; best = i; } } return best; }
  function stairStats(){
    let inSpec = 0, landings = 0, odd = 0, rMin = 1, rMax = 0, sink = -1e9, sinkPts = 0, gapViol = 0, fills = [], widths = {};
    for (const F of FLIGHTS){
      if (F.N >= 1){ rMin = Math.min(rMin, F.r); rMax = Math.max(rMax, F.r); } widths[(F.hw * 2).toFixed(2)] = (widths[(F.hw * 2).toFixed(2)] || 0) + 1;
      for (let i = 0; i <= F.N; i++){
        const T = F.sr[i + 1] - F.sr[i];
        if (i > 0 && i < F.N){ if (T >= STAIR.RUN[0] - 1e-3 && T <= STAIR.RUN[1] + 1e-3) inSpec++; else if (T >= STAIR.LAND - 1e-3) landings++; else odd++; }
        const y = F.ys[i]; let gmin = 1e9;
        treadSamples(F, i, (x, z) => { const g = townGround(x, z); sink = Math.max(sink, g - y); sinkPts++; gmin = Math.min(gmin, g); });
        const yb = Math.min(gmin, y) - 0.3; treadSamples(F, i, (x, z) => { if (townGround(x, z) < yb) gapViol++; });
        const e = F.edges[i], e1 = F.edges[i + 1]; fills.push(y - townGround((e.x + e1.x) / 2, (e.z + e1.z) / 2));
      }
    }
    fills.sort((a, b) => a - b); const fq = (p) => +(fills[Math.floor(p * (fills.length - 1))] || 0).toFixed(3);
    let outRiser = 0; for (const F of FLIGHTS) if (F.N >= 1 && (F.r < STAIR.RISE[0] - 1e-3 || F.r > STAIR.RISE[1] + 1e-3)) outRiser++;
    return { ...STAIRLOG, flights: FLIGHTS.length, connectors: FLIGHTS.filter((F) => F.connector).length, flightsRiserOutOfSpec: outRiser, interiorTreadsInSpec: inSpec, interiorLandings: landings, interiorOutOfSpec: odd, riserMin: +rMin.toFixed(3), riserMax: +rMax.toFixed(3),
      maxSinkM: +sink.toFixed(3), sinkSamples: sinkPts, gapUnderStoneSamples: gapViol, fillAboveGroundM: { p50: fq(0.5), p90: fq(0.9), max: fq(1) }, widthsM: widths, carveMax: +STAIRLOG.carveMax.toFixed(3) };
  }
  function flightInfo(F, k){ const b = F.edges[0], t = F.edges[F.edges.length - 1]; return { k, kind: F.kind, main: F.main, path: F.path, x: +b.x.toFixed(1), z: +b.z.toFixed(1), lenM: +F.L.toFixed(1), riseM: +F.dH.toFixed(2), riser: +F.r.toFixed(3), steps: F.N, widthM: +(F.hw * 2).toFixed(2), top: [+t.x.toFixed(1), +t.z.toFixed(1)] }; }
  function walkFlight(k, up, trace){
    const F = FLIGHTS[k], wp = [];
    // centre-line from 3 m before to 3 m after the flight, cut where it leaves the walkable town area
    for (let d = -3; d <= F.L + 3 + 1e-6; d += 0.4){ const q = F.at(F.A + F.dir * d); if (d >= 0 && d <= F.L) wp.push(q); else if (inside(q[0], q[1])) wp.push(q); else if (d < 0) wp.length = 0; else break; }
    for (let i = wp.length - 1; i > 0; i--) if (Math.hypot(wp[i][0] - wp[i - 1][0], wp[i][1] - wp[i - 1][1]) < 0.05) wp.splice(i, 1);
    if (!up) wp.reverse();
    const save = { x: player.x, z: player.z, y: player.y, yaw: player.yaw, pitch: player.pitch, bobT };
    player.x = wp[0][0]; player.z = wp[0][1]; player.y = playerGround(player.x, player.z) + EYE;
    let idx = 0, t = 0, lastIdx = 0, lastT = 0, minE = 1e9, maxE = -1e9, onSteps = 0, offSteps = 0, inWall = 0, reason = 'ok', lastG = playerGround(player.x, player.z), maxJump = 0, maxLag = 0, where = null;
    const dt = 1 / 60, Tmax = (F.L + 6) / WALK * 2.5 + 4;
    while (true){
      for (let j = idx; j < Math.min(wp.length, idx + 8); j++) if (Math.hypot(wp[j][0] - player.x, wp[j][1] - player.z) < Math.hypot(wp[idx][0] - player.x, wp[idx][1] - player.z)) idx = j;
      if (idx >= wp.length - 1 && Math.hypot(wp[wp.length - 1][0] - player.x, wp[wp.length - 1][1] - player.z) < 0.6) break;
      const tg = wp[Math.min(wp.length - 1, idx + 3)]; player.yaw = Math.atan2(-(tg[0] - player.x), -(tg[1] - player.z));
      const bx = player.x, bz = player.z; movePlayer(dt, 1, 0, false); t += dt;
      if (trace && trace.length < 4000) trace.push([+bx.toFixed(2), +bz.toFixed(2), +player.x.toFixed(2), +player.z.toFixed(2), idx, +playerGround(player.x, player.z).toFixed(3), (() => { const q = stairAt(player.x, player.z); return q ? (q.land ? 'L' : FLIGHTS.indexOf(q.F) + ':' + q.i) : '-'; })()]);
      if (idx > lastIdx){ lastIdx = idx; lastT = t; }
      if (t - lastT > 2){ reason = 'stuck'; break; }
      if (t > Tmax){ reason = 'timeout'; break; }
      const sa = stairAt(player.x, player.z), g = playerGround(player.x, player.z);
      if (Math.abs(g - lastG) > maxJump){ maxJump = Math.abs(g - lastG); where = [+player.x.toFixed(1), +player.z.toFixed(1)]; } lastG = g;
      maxLag = Math.max(maxLag, Math.abs(player.y - (g + EYE)));
      if (sa && sa.F === F){ const e = g - sa.top; minE = Math.min(minE, e); maxE = Math.max(maxE, e); onSteps++; }
      else { const along = (player.x - F.edges[0].x) * F.edges[0].fx + (player.z - F.edges[0].z) * F.edges[0].fz; if (along > 0.5 && along < F.L - 0.5) offSteps++; }
      if (nearBuilding(player.x, player.z, 0.05)) inWall++;
    }
    let ok = reason === 'ok';
    if (reason !== 'ok') where = [+player.x.toFixed(1), +player.z.toFixed(1)];
    // the ground the controller stands on must match the stone under it (within half a riser), and never jump
    // by more than one riser between frames (a jump means a gap, a pit or a ledge at the ends of the flight)
    if (ok && minE < -(F.r / 2 + 0.02)){ ok = false; reason = 'below the treads (' + minE.toFixed(2) + ' m)'; }
    if (ok && maxE > F.r / 2 + 0.02){ ok = false; reason = 'above the treads (' + maxE.toFixed(2) + ' m)'; }
    if (ok && maxJump > GAPMAX){ ok = false; reason = 'gap or ledge (' + maxJump.toFixed(2) + ' m step)'; }
    if (ok && inWall > 0){ ok = false; reason = 'inside a wall'; }
    if (ok && onSteps === 0){ ok = false; reason = 'never on the steps'; }
    Object.assign(player, { x: save.x, z: save.z, y: save.y, yaw: save.yaw, pitch: save.pitch }); bobT = save.bobT;
    return { ok, reason, s: +t.toFixed(1), groundVsTread: [+minE.toFixed(3), +maxE.toFixed(3)], maxStep: +maxJump.toFixed(3), eyeLag: +maxLag.toFixed(3), offStepFrames: offSteps, at: where };
  }
  function mainFlight(){
    let best = -1, bs = -1e9;
    for (let k = 0; k < FLIGHTS.length; k++){ const F = FLIGHTS[k]; if (!F.main) continue; const b = F.edges[0], d = Math.hypot(b.x - LMK.stupa[0], b.z - LMK.stupa[1]); const sc = Math.min(F.dH, 6) - d / 40; if (sc > bs){ bs = sc; best = k; } }
    return best;
  }
  function walkAll(){
    const out = []; for (let k = 0; k < FLIGHTS.length; k++){ const u = walkFlight(k, true), d = walkFlight(k, false); out.push({ ...flightInfo(FLIGHTS[k], k), up: u, down: d }); }
    return { main: mainFlight(), flights: out, passed: out.filter((f) => f.up.ok && f.down.ok).length, total: out.length };
  }
  function stairsPose(k){
    if (k === undefined) k = mainFlight(); const F = FLIGHTS[k]; if (!F) return null;
    const b = F.edges[0], x = b.x - b.fx * 4, z = b.z - b.fz * 4, y = playerGround(x, z) + 1.7;
    return [x, y, z, Math.atan2(F.dH, F.L + 4) * 0.75, Math.atan2(b.fx, b.fz) + Math.PI];
  }
  return { gapMax: () => GAPMAX, walkPath, mainStreet, stairStats, walkFlight, walkAll, mainFlight, stairsPose, flightInfo: (k) => flightInfo(FLIGHTS[k], k), nFlights: () => FLIGHTS.length };
})();
window.__namche = { BLD, SPAWN, renderer, syncView, test: TEST, dbg: TESTMODE ? { inside, nearBuilding, stairAt, playerGround, coarseGround, solidAt: (x, z) => SOLIDS.some((o) => x > o.bb[0] && x < o.bb[1] && z > o.bb[2] && z < o.bb[3] && pip(o.poly, x, z)), SOLIDS, LANDINGS, FLIGHTS } : null, scene, farH, player, setNight, camera, PEAKS, start, groundAt, townGround, LMK, D, freeCam: (a) => { freeCam = a; }, rebuildGrass };
requestAnimationFrame(frame);
})().catch((e) => { const s = document.querySelector('#status'); if (s){ s.textContent = 'Something broke while building the town: ' + (e && e.message ? e.message : e); s.style.color = '#ffb4a8'; } console.error(e); });
