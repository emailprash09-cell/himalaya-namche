// M2.5 building kit: every building of the restored layout (data/namche_layout.json, 310 placed by the
// bake) keeps its position and rotation, and gets real proportions (2 to 4 storeys of 2.6 m, footprint
// 8 to 14 m by 6 to 10 m where its neighbours leave room), a level terrace cut into the slope with a
// dry-stone retaining wall, a stone ground floor, plastered upper floors, 3 to 6 framed windows a floor,
// a wooden door, balconies, signboards, a low corrugated-tin roof with a ridge cap, rooftop clutter and
// yard clutter. All of it is merged per material, so the whole town is a few dozen draw calls.
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from '../core/rng';
import { stoneWall } from '../render/textures';
import { boxM, trs } from './builder';
import type { Grid, Layout, Lodge } from './layout';
import { inGrid, sampleGrid } from './layout';
import type { Physics } from './physics';

export const STOREY = 2.6;
const SIZE = { wMin: 8, wMax: 14, dMin: 6, dMax: 10, storeysMin: 2, storeysMax: 4 };
// Invented lodge and shop names (no real businesses).
const NAMES = [
  'Dawa Tashi Lodge', 'Snow Leopard Rest', 'Pemba Guest House', 'Blue Poppy Lodge', 'Ama Yangji Teahouse',
  'Thamserku View Inn', 'Sonam Bakery', 'Kani Gate Lodge', 'Lhakpa Trekkers Home', 'Juniper House',
  'Prayer Wheel Cafe', 'Yak and Juniper', 'Mingma Mountain Shop', 'Dorje Trek Supply', 'Nima Lodge',
  'High Pass Teahouse', 'Rhododendron Lodge', 'Sherpa Hearth', 'Cloud Terrace Inn', 'Pasang Gear Store',
];

interface Rect { cx: number; cz: number; hw: number; hd: number; yaw: number }

function axes(yaw: number): [number, number, number, number] {
  // Local x maps to (cos yaw, -sin yaw) in the xz plane; local z to (sin yaw, cos yaw).
  return [Math.cos(yaw), -Math.sin(yaw), Math.sin(yaw), Math.cos(yaw)];
}

function overlap(a: Rect, b: Rect, gap: number): boolean {
  const A = axes(a.yaw), B = axes(b.yaw);
  const dx = b.cx - a.cx, dz = b.cz - a.cz;
  for (const [ax, az] of [[A[0], A[1]], [A[2], A[3]], [B[0], B[1]], [B[2], B[3]]]) {
    const ra = Math.abs(a.hw * (A[0] * ax + A[1] * az)) + Math.abs(a.hd * (A[2] * ax + A[3] * az));
    const rb = Math.abs(b.hw * (B[0] * ax + B[1] * az)) + Math.abs(b.hd * (B[2] * ax + B[3] * az));
    if (Math.abs(dx * ax + dz * az) > ra + rb + gap) return false;
  }
  return true;
}

/** Collects geometry per material key with a vertex colour graded from bottom to top (grime at the base). */
class Merge {
  readonly parts = new Map<string, THREE.BufferGeometry[]>();
  add(key: string, geo: THREE.BufferGeometry, m: THREE.Matrix4, top: THREE.Color, bottom: THREE.Color = top): void {
    const g = (geo.index ? geo.toNonIndexed() : geo.clone());
    const pos = g.getAttribute('position') as THREE.BufferAttribute;
    let y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const t = y1 > y0 ? (pos.getY(i) - y0) / (y1 - y0) : 1;
      col[i * 3] = bottom.r + (top.r - bottom.r) * t;
      col[i * 3 + 1] = bottom.g + (top.g - bottom.g) * t;
      col[i * 3 + 2] = bottom.b + (top.b - bottom.b) * t;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    if (!g.getAttribute('uv')) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(pos.count * 2), 2));
    for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(n)) g.deleteAttribute(n);
    g.applyMatrix4(m);
    const list = this.parts.get(key) ?? [];
    list.push(g);
    this.parts.set(key, list);
  }
}

/** Low gable roof in the building's frame: ridge along local x, eaves at y = 0, overhang o. UVs in metres:
 *  u along the ridge, v down the slope (the corrugations run down the slope). */
function gableRoof(w: number, d: number, o: number, rise: number): THREE.BufferGeometry {
  const x0 = -w / 2 - o, x1 = w / 2 + o, z = d / 2 + o, slope = Math.hypot(z, rise);
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const quad = (a: number[], b: number[], c: number[], e: number[], ua: number[], ub: number[], uc: number[], ue: number[]) => {
    const n = pos.length / 3;
    pos.push(...a, ...b, ...c, ...e); uv.push(...ua, ...ub, ...uc, ...ue);
    idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
  };
  const L = x1 - x0;
  // South slope (+z), then north slope (-z). Winding gives outward normals.
  quad([x0, 0, z], [x1, 0, z], [x1, rise, 0], [x0, rise, 0], [0, slope], [L, slope], [L, 0], [0, 0]);
  quad([x1, 0, -z], [x0, 0, -z], [x0, rise, 0], [x1, rise, 0], [L, slope], [0, slope], [0, 0], [L, 0]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Gable-end triangle filling the wall between eave and ridge (in the plane x = 0, facing +x). */
function gableEnd(d: number, rise: number): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, d / 2, 0, 0, -d / 2, 0, rise, 0], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, d / 2, 0, d / 4, rise / 2], 2));
  g.setIndex([0, 1, 2]);
  g.computeVertexNormals();
  return g;
}

function panesTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 64; c.height = 96;
  const g = c.getContext('2d')!;
  const grd = g.createLinearGradient(0, 0, 64, 96);
  grd.addColorStop(0, '#5c7488'); grd.addColorStop(0.5, '#25313c'); grd.addColorStop(1, '#3b4b58');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 96);
  g.fillStyle = '#e9e4d8';
  g.fillRect(30, 0, 4, 96); g.fillRect(0, 30, 64, 3); g.fillRect(0, 62, 64, 3);
  g.fillRect(0, 0, 64, 3); g.fillRect(0, 93, 64, 3); g.fillRect(0, 0, 3, 96); g.fillRect(61, 0, 3, 96);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function signTexture(name: string, bg: string, fg: string): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 512; c.height = 112;
  const g = c.getContext('2d')!;
  g.fillStyle = bg; g.fillRect(0, 0, 512, 112);
  g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(8, 8, 496, 96);
  g.fillStyle = fg; g.font = 'bold 44px "Segoe UI", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(name.toUpperCase(), 256, 58, 470);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function solarTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#1b2f5a'; g.fillRect(0, 0, 64, 64);
  g.strokeStyle = '#8ea3c4'; g.lineWidth = 1;
  for (let i = 0; i <= 64; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 64); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(64, i); g.stroke(); }
  return new THREE.CanvasTexture(c);
}

export interface BuildingHandles {
  group: THREE.Group;
  count: number;
  triangles: number;
  /** Chimney-pipe tops (smoke), roof corner points (prayer flags), front door points (life). */
  chimneys: THREE.Vector3[];
  roofCorners: THREE.Vector3[];
  doors: THREE.Vector3[];
  rects: { x: number; z: number; hw: number; hd: number; yaw: number; top: number; base: number }[];
}

export async function buildBuildings(L: Layout, phys: Physics, near: Grid, mid: Grid): Promise<BuildingHandles> {
  const ground = (x: number, z: number) => inGrid(near, x, z, 1) ? sampleGrid(near, x, z) : sampleGrid(mid, x, z);
  const src: Lodge[] = L.lodges;

  // ------------------------------------------------ sizes: clamp to real proportions, grow small ones if room
  const rects: Rect[] = src.map((l) => {
    let w = l.w, d = l.d, yaw = l.yaw;
    if (d > w) { [w, d] = [d, w]; yaw += Math.PI / 2; } // local x is always the long side
    return { cx: l.x, cz: l.z, hw: Math.min(w, SIZE.wMax) / 2, hd: Math.min(d, SIZE.dMax) / 2, yaw };
  });
  for (let pass = 0; pass < 2; pass++) {
    rects.forEach((r, i) => {
      const want = { ...r, hw: Math.max(r.hw, SIZE.wMin / 2), hd: Math.max(r.hd, SIZE.dMin / 2) };
      if (want.hw === r.hw && want.hd === r.hd) return;
      for (const k of [1, 0.66, 0.33]) {
        const t = { ...r, hw: r.hw + (want.hw - r.hw) * k, hd: r.hd + (want.hd - r.hd) * k };
        if (!rects.some((o, j) => j !== i && Math.hypot(o.cx - t.cx, o.cz - t.cz) < 25 && overlap(t, o, 0.4))) {
          rects[i] = t; return;
        }
      }
    });
  }

  // ------------------------------------------------ materials and textures
  const tl = new THREE.TextureLoader();
  const load = async (n: string, srgb: boolean) => {
    const t = await tl.loadAsync(`assets/tex/${n}.webp`);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const [plasterC, plasterN, ironC, ironN, ironA, planksC, planksN] = await Promise.all([
    load('plaster_col', true), load('plaster_nor', false), load('iron_col', true), load('iron_nor', false),
    load('iron_arm', false), load('planks_col', true), load('planks_nor', false)]);
  const stoneT = stoneWall(512, 23); stoneT.wrapS = stoneT.wrapT = THREE.RepeatWrapping;
  const solarT = solarTexture(); solarT.colorSpace = THREE.SRGBColorSpace;
  const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, ...o });
  const mats: Record<string, THREE.Material> = {
    stone: std({ map: stoneT, roughness: 0.95 }),
    plaster: std({ map: plasterC, normalMap: plasterN, normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.88 }),
    roof: std({ map: ironC, normalMap: ironN, roughnessMap: ironA, metalnessMap: ironA, metalness: 0.55, roughness: 1, side: THREE.DoubleSide }),
    ridge: std({ roughness: 0.6, metalness: 0.4 }),
    paint: std({ roughness: 0.65 }),
    glass: std({ map: panesTexture(), roughness: 0.18, metalness: 0.25 }),
    wood: std({ map: planksC, normalMap: planksN, roughness: 0.85 }),
    plain: std({ roughness: 0.8 }),
    metal: std({ roughness: 0.45, metalness: 0.6 }),
    solar: std({ map: solarT, roughness: 0.3, metalness: 0.4 }),
  };
  const signMats = NAMES.map((n, i) => new THREE.MeshStandardMaterial({
    map: signTexture(n, ['#1f4f8c', '#7a1f1a', '#20603a', '#f2ead8'][i % 4], i % 4 === 3 ? '#7a1f1a' : '#f6efe0'), roughness: 0.7 }));

  const M = new Merge();
  const C = (hex: string | number) => new THREE.Color(hex);
  const chimneys: THREE.Vector3[] = [], roofCorners: THREE.Vector3[] = [], doors: THREE.Vector3[] = [];
  const outRects: BuildingHandles['rects'] = [];
  const signParts = NAMES.map(() => [] as THREE.BufferGeometry[]);
  const UPPER: Record<string, string[]> = {
    whitewash: ['#f4f1ea', '#efe9dc', '#f6f2e6'], plaster: ['#efe0c6', '#f1d9cf', '#ecd2d2'],
    wood: ['#c9dbe8', '#b9d0e3', '#d6e3ec'], stone: ['#c9bfae', '#efe7d6', '#d8cfbf'], temple: ['#f4f1ea'],
  };
  const FRAMES = ['#2a5fa8', '#2f7d46', '#6b4524', '#245a8c', '#3d8a52', '#7a3f22'];

  rects.forEach((r, i) => {
    const l = src[i];
    const R = rng(l.seed);
    const storeys = Math.max(SIZE.storeysMin, Math.min(SIZE.storeysMax, l.storeys));
    const w = r.hw * 2, d = r.hd * 2, yaw = r.yaw;
    const [ux, uz, vx, vz] = axes(yaw);
    const at = (lx: number, lz: number): [number, number] => [r.cx + ux * lx + vx * lz, r.cz + uz * lx + vz * lz];
    // Ground under the footprint and just outside each side.
    let gmin = Infinity, gmax = -Infinity;
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0], [0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const [x, z] = at(a * r.hw, b * r.hd); const g = ground(x, z);
      gmin = Math.min(gmin, g); gmax = Math.max(gmax, g);
    }
    // Cut into the slope: the floor sits 60 % of the way up the ground under the footprint, so the uphill
    // wall is dug in and the downhill side stands on a dry-stone terrace wall (not a perched block).
    const pad = gmin + 0.6 * (gmax - gmin) + 0.15;
    const sides = [[0, -1], [0, 1], [-1, 0], [1, 0]].map(([a, b]) => {
      const [x, z] = at(a * (r.hw + 2.5), b * (r.hd + 2.5));
      return ground(x, z);
    });
    // Terrace: the yard reaches out 1.2 m on the downhill sides; dry-stone wall from below ground to the pad.
    const ext = sides.map((g) => (g < pad - 0.3 ? 1.2 : 0.2));
    const tx0 = -r.hw - ext[2], tx1 = r.hw + ext[3], tz0 = -r.hd - ext[0], tz1 = r.hd + ext[1];
    const base = Math.min(gmin, ...sides) - 0.6;
    const [tcx, tcz] = at((tx0 + tx1) / 2, (tz0 + tz1) / 2);
    const stoneTone = C('#c9c0b0').offsetHSL(0, 0, (R() - 0.5) * 0.06);
    M.add('stone', boxM(tx1 - tx0, pad - base, tz1 - tz0, 2.2), trs(tcx, (pad + base) / 2, tcz, yaw), stoneTone, stoneTone.clone().multiplyScalar(0.72));
    phys.addBox(tcx, (pad + base) / 2, tcz, (tx1 - tx0) / 2, (pad - base) / 2, (tz1 - tz0) / 2, yaw);

    // Ground floor in grey stone, upper floors plastered.
    const H = storeys * STOREY;
    M.add('stone', boxM(w, STOREY, d, 2.2), trs(r.cx, pad + STOREY / 2, r.cz, yaw), stoneTone.clone().multiplyScalar(1.05), stoneTone.clone().multiplyScalar(0.8));
    const pal = UPPER[l.kind === 'gompa' ? 'temple' : (wallKind(l.wall))] ?? UPPER.whitewash;
    const upper = C(pal[Math.floor(R() * pal.length)]).offsetHSL(0, 0, (R() - 0.5) * 0.04);
    if (storeys > 1) M.add('plaster', boxM(w, H - STOREY, d, 3), trs(r.cx, pad + STOREY + (H - STOREY) / 2, r.cz, yaw), upper, upper.clone().multiplyScalar(0.92));
    // A painted band between the floors.
    const band = C(R() < 0.5 ? '#7a2420' : '#24508a');
    for (let s = 1; s < storeys; s++) M.add('paint', boxM(w + 0.06, 0.16, d + 0.06, 1), trs(r.cx, pad + s * STOREY, r.cz, yaw), band);
    phys.addBox(r.cx, pad + H / 2, r.cz, r.hw, H / 2, r.hd, yaw);

    // Roof: low corrugated tin, overhang 0.5 to 0.8 m, ridge along the long side, with a ridge cap.
    const o = 0.5 + R() * 0.3, rise = Math.max(0.6, 0.2 * (r.hd + o));
    const roofCol = C(l.roof ?? '#2f66b0').offsetHSL(0, -0.08 + R() * 0.06, (R() - 0.5) * 0.08);
    const top = pad + H;
    M.add('roof', gableRoof(w, d, o, rise), trs(r.cx, top + 0.05, r.cz, yaw), roofCol, roofCol.clone().multiplyScalar(0.8));
    M.add('ridge', boxM(w + 2 * o, 0.1, 0.32, 1), trs(r.cx, top + rise + 0.07, r.cz, yaw), C('#4a4f55'));
    for (const sx of [-1, 1]) {
      const [gx, gz] = at(sx * r.hw, 0);
      M.add('plaster', gableEnd(d, rise), trs(gx, top + 0.02, gz, yaw + (sx < 0 ? Math.PI : 0)), upper);
    }
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const [x, z] = at(a * (r.hw + o), b * (r.hd + o)); roofCorners.push(new THREE.Vector3(x, top, z));
    }

    // Door side: the face whose outside ground is highest (no doors hanging above a drop).
    const faces: { a: number; b: number; len: number; nx: number; nz: number }[] = [
      { a: 0, b: -1, len: w, nx: -vx, nz: -vz }, { a: 0, b: 1, len: w, nx: vx, nz: vz },
      { a: -1, b: 0, len: d, nx: -ux, nz: -uz }, { a: 1, b: 0, len: d, nx: ux, nz: uz }];
    // Door: the side whose outside ground is closest to the floor level (a long side if it is close enough).
    let front = 0;
    const doorCost = (k: number) => Math.abs(sides[k] - pad) - (faces[k].len > 7.5 ? 0.3 : 0);
    for (let k = 1; k < 4; k++) if (doorCost(k) < doorCost(front)) front = k;
    const frame = C(FRAMES[Math.floor(R() * FRAMES.length)]);
    const lintel = R() < 0.5 ? C('#8f8676') : C('#5a3a22');
    faces.forEach((f, k) => {
      const long = f.len > 7.5;
      const n = Math.max(1, Math.min(long ? 6 : 3, Math.round(f.len / (long ? 2.4 : 2.8))));
      const fyaw = Math.atan2(f.nx, f.nz);
      const off = (f.a !== 0 ? r.hw : r.hd);
      const doorSlot = k === front ? Math.floor(n / 2) : -1;
      const doorShift = (R() - 0.5) * 0.4 * (f.len / n);
      for (let s = 0; s < storeys; s++) {
        for (let j = 0; j < n; j++) {
          const t = (j - (n - 1) / 2) * (f.len / n) + (s === 0 && j === doorSlot ? doorShift : 0);
          const lx = f.a !== 0 ? f.a * off : t * (f.b > 0 ? -1 : 1);
          const lz = f.b !== 0 ? f.b * off : t * (f.a > 0 ? 1 : -1);
          const [x, z] = at(lx, lz);
          if (s === 0 && j === doorSlot) {
            // Wooden door with a painted frame and a stone step.
            const dy = pad + 1.0;
            M.add('paint', boxM(1.25, 2.2, 0.14, 1), trs(x + f.nx * 0.04, dy + 0.1, z + f.nz * 0.04, fyaw), frame);
            M.add('wood', boxM(0.95, 2.0, 0.1, 1), trs(x + f.nx * 0.09, dy, z + f.nz * 0.09, fyaw), C('#9a6a42'));
            M.add('stone', boxM(1.4, 0.18, 0.6, 1), trs(x + f.nx * 0.32, pad + 0.09, z + f.nz * 0.32, fyaw), stoneTone);
            doors.push(new THREE.Vector3(x + f.nx * 0.9, pad, z + f.nz * 0.9));
            if (['lodge', 'shop', 'civic', 'museum'].includes(l.kind ?? '') ) {
              const si = (l.seed >>> 3) % NAMES.length;
              const sg = new THREE.PlaneGeometry(2.6, 0.57).applyMatrix4(trs(x + f.nx * 0.12, pad + STOREY - 0.25, z + f.nz * 0.12, fyaw));
              signParts[si].push(sg);
            }
            continue;
          }
          const ww = s === 0 ? 0.8 : 1.0, wh = s === 0 ? 0.95 : 1.25;
          const y = pad + s * STOREY + (s === 0 ? 1.45 : 1.35);
          M.add('paint', boxM(ww + 0.2, wh + 0.2, 0.14, 1), trs(x + f.nx * 0.03, y, z + f.nz * 0.03, fyaw), frame);
          M.add('glass', boxM(ww, wh, 0.02, 1).scale(1, 1, 1), trs(x + f.nx * 0.105, y, z + f.nz * 0.105, fyaw), C('#ffffff'));
          M.add('plain', boxM(ww + 0.5, 0.14, 0.2, 1), trs(x + f.nx * 0.08, y + wh / 2 + 0.19, z + f.nz * 0.08, fyaw), lintel);
        }
      }
      // Balcony with a railing on the front of taller buildings.
      if (k === front && storeys >= 3 && R() < 0.45) {
        const bl = Math.min(f.len - 1.0, 6 + R() * 3), by = pad + STOREY * (storeys - 1);
        const [bx, bz] = at(f.a * (off + 0.55), f.b * (off + 0.55));
        M.add('wood', boxM(bl, 0.14, 1.1, 1), trs(bx, by, bz, fyaw), C('#8a5a36'));
        const [rx, rz] = at(f.a * (off + 1.05), f.b * (off + 1.05));
        M.add('paint', boxM(bl, 0.08, 0.08, 1), trs(rx, by + 1.0, rz, fyaw), frame);
        const posts = Math.floor(bl / 0.35);
        for (let q = 0; q <= posts; q++) {
          const t = -bl / 2 + (q * bl) / posts;
          const px = rx + Math.cos(fyaw) * t, pz = rz - Math.sin(fyaw) * t;
          M.add('paint', boxM(0.05, 0.95, 0.05, 1), trs(px, by + 0.5, pz, fyaw), frame);
        }
      }
    });

    // Rooftop clutter: chimney pipe, water tank, solar panel, satellite dish.
    const roofY = (lz: number) => top + 0.05 + rise * (1 - Math.abs(lz) / (r.hd + o));
    if (R() < 0.5) {
      const lx = (R() - 0.5) * w * 0.6, lz = (R() < 0.5 ? -1 : 1) * r.hd * 0.4;
      const [x, z] = at(lx, lz); const y0 = roofY(lz);
      M.add('metal', new THREE.CylinderGeometry(0.08, 0.08, 1.5, 8), trs(x, y0 + 0.6, z), C('#3a3633'));
      M.add('metal', new THREE.ConeGeometry(0.18, 0.16, 8), trs(x, y0 + 1.4, z), C('#2e2a28'));
      chimneys.push(new THREE.Vector3(x, y0 + 1.45, z));
    }
    if (R() < 0.35) {
      const lx = (R() - 0.5) * w * 0.5; const [x, z] = at(lx, 0); const y0 = top + rise;
      M.add('plain', new THREE.CylinderGeometry(0.55, 0.55, 1.1, 12), trs(x, y0 + 0.75, z), C('#1d1e20'));
      M.add('metal', boxM(1.0, 0.25, 1.0, 1), trs(x, y0 + 0.1, z, yaw), C('#55585c'));
    }
    if (R() < 0.3) {
      const lx = (R() - 0.5) * w * 0.5, lz = r.hd * 0.45; const [x, z] = at(lx, lz);
      M.add('solar', boxM(1.6, 0.05, 1.0, 1.6), trs(x, roofY(lz) + 0.35, z, yaw, 1, 1, 1, -0.45), C('#ffffff'));
    }
    if (R() < 0.2) {
      const lx = (R() - 0.5) * w * 0.6, lz = -r.hd * 0.45; const [x, z] = at(lx, lz);
      M.add('metal', new THREE.CylinderGeometry(0.4, 0.05, 0.12, 14), trs(x, roofY(lz) + 0.6, z, yaw, 1, 1, 1, 0.8), C('#d8d8d4'));
      M.add('metal', new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6), trs(x, roofY(lz) + 0.3, z), C('#8a8a88'));
    }

    // Yard clutter on the terrace: firewood, potted plants, a ladder.
    const f = faces[front];
    const fyaw = Math.atan2(f.nx, f.nz);
    const foff = f.a !== 0 ? r.hw : r.hd;
    if (R() < 0.35) {
      const side = R() < 0.5 ? -1 : 1, t = side * (f.len / 2 - 1.2);
      const lx = f.a !== 0 ? f.a * (foff + 0.45) : t, lz = f.b !== 0 ? f.b * (foff + 0.45) : t;
      const [x, z] = at(lx, lz);
      M.add('wood', boxM(1.6, 0.9, 0.55, 0.5), trs(x, pad + 0.45, z, fyaw), C('#a77b52'), C('#6a4a30'));
    }
    if (R() < 0.4) {
      const pots = 2 + Math.floor(R() * 3);
      for (let q = 0; q < pots; q++) {
        const t = (q - pots / 2) * 0.55 + f.len * 0.2;
        const lx = f.a !== 0 ? f.a * (foff + 0.3) : t, lz = f.b !== 0 ? f.b * (foff + 0.3) : t;
        const [x, z] = at(lx, lz);
        M.add('plain', new THREE.CylinderGeometry(0.17, 0.12, 0.3, 10), trs(x, pad + 0.15, z), C('#a5532f'));
        M.add('plain', new THREE.IcosahedronGeometry(0.22, 0), trs(x, pad + 0.42, z), C(R() < 0.3 ? '#c23a5a' : '#3f7a35'));
      }
    }
    if (R() < 0.15) {
      const [x, z] = at(f.a !== 0 ? f.a * (foff + 0.5) : -f.len * 0.3, f.b !== 0 ? f.b * (foff + 0.5) : -f.len * 0.3);
      for (const sx of [-0.22, 0.22]) {
        const lx2 = x + Math.cos(fyaw) * sx, lz2 = z - Math.sin(fyaw) * sx;
        M.add('wood', boxM(0.06, 3.2, 0.06, 1), trs(lx2, pad + 1.55, lz2, fyaw, 1, 1, 1, -0.28), C('#7d5a3a'));
      }
      for (let q = 0; q < 8; q++) M.add('wood', boxM(0.5, 0.05, 0.05, 1), trs(x - f.nx * (q * 0.1), pad + 0.3 + q * 0.37, z - f.nz * (q * 0.1), fyaw), C('#7d5a3a'));
    }
    outRects.push({ x: r.cx, z: r.cz, hw: r.hw, hd: r.hd, yaw, top: top + rise, base: pad });
  });

  // ------------------------------------------------ merge per material
  const group = new THREE.Group(); group.name = 'buildings';
  let triangles = 0;
  for (const [key, list] of M.parts) {
    const g = mergeGeometries(list, false);
    list.forEach((x) => x.dispose());
    if (!g) continue;
    g.computeBoundingSphere();
    triangles += g.getAttribute('position').count / 3;
    const mesh = new THREE.Mesh(g, mats[key]);
    mesh.name = `buildings:${key}`;
    mesh.castShadow = !['glass', 'paint'].includes(key);
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  signParts.forEach((list, i) => {
    if (!list.length) return;
    const g = mergeGeometries(list, false); list.forEach((x) => x.dispose());
    if (!g) return;
    const mesh = new THREE.Mesh(g, signMats[i]); mesh.name = `buildings:sign${i}`;
    group.add(mesh); triangles += list.length * 2;
  });
  return { group, count: rects.length, triangles, chimneys, roofCorners, doors, rects: outRects };
}

function wallKind(hex: string | undefined): string {
  // The layout stores the prototype's wall colour; map it back to its family.
  if (!hex) return 'whitewash';
  const h = hex.toLowerCase();
  if (['#f0eee8', '#efede6'].includes(h)) return 'whitewash';
  if (h === '#3a86b4') return 'wood';
  if (h === '#ead9c3') return 'plaster';
  if (h === '#f4f1ea') return 'temple';
  return 'stone';
}
