// M2.5 lanes: the old prototype's 63 OSM paths (21.9 km; the 4 highway=steps ways are 701 m) drawn as
// packed-dirt lanes draped on the terrain, and the steps as stone staircases (a tread every 0.18 m of rise).
// Only the parts inside the detailed town grid are drawn. The entrance route keeps its own flagstone ribbon.
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Grid, Layout } from './layout';
import { inGrid, sampleGrid } from './layout';

export interface TownData {
  paths: { p: [number, number][]; steps: boolean; core: boolean; w: number | null }[];
  streams: [number, number][][];
}

export async function loadTown(): Promise<TownData> {
  const r = await fetch('assets/entrance/town.json');
  if (!r.ok) throw new Error('Missing assets/entrance/town.json');
  return (await r.json()) as TownData;
}

function resample(pts: [number, number][], step: number): [number, number][] {
  const out: [number, number][] = [pts[0]];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / step));
    for (let k = 1; k <= n; k++) out.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]);
  }
  return out;
}

/** Ribbon draped on the ground: width w, metric UVs (u across, v along). */
function drape(pts: [number, number][], w: number, yAt: (x: number, z: number) => number, lift: number): THREE.BufferGeometry {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  let along = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0], dz = b[1] - a[1]; const len = Math.hypot(dx, dz) || 1; dx /= len; dz /= len;
    const rx = -dz, rz = dx;
    if (i > 0) along += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    for (const sgn of [-1, 1]) {
      const x = pts[i][0] + rx * sgn * w / 2, z = pts[i][1] + rz * sgn * w / 2;
      pos.push(x, yAt(x, z) + lift, z); uv.push((sgn + 1) * w / 4, along / 2);
    }
    if (i > 0) { const n = i * 2; idx.push(n - 2, n - 1, n, n - 1, n + 1, n); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

export interface LaneHandles { group: THREE.Group; triangles: number; polylines: [number, number][][]; stepsCount: number }

export async function buildLanes(L: Layout, near: Grid, town: TownData): Promise<LaneHandles> {
  const yAt = (x: number, z: number) => sampleGrid(near, x, z);
  const tl = new THREE.TextureLoader();
  const tex = async (n: string, srgb: boolean) => {
    const t = await tl.loadAsync(`assets/tex/${n}.webp`); t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  };
  const [mudC, mudN, pavC, pavN] = await Promise.all([tex('mud_col', true), tex('mud_nor', false), tex('paving_col', true), tex('paving_nor', false)]);
  const dirtMat = new THREE.MeshStandardMaterial({ map: mudC, normalMap: mudN, roughness: 0.95, color: 0xd9c9b4,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const stoneMat = new THREE.MeshStandardMaterial({ map: pavC, normalMap: pavN, roughness: 0.9, color: 0xdedad2 });

  // Keep clear of the entrance route ribbon and the plaza (they have their own surfaces).
  const nearRoute = (x: number, z: number) => {
    if (Math.abs(x - L.plaza.x) < L.plaza.w / 2 + 1 && Math.abs(z - L.plaza.z) < L.plaza.d / 2 + 1) return true;
    for (const p of L.route.pts) if (Math.abs(p[0] - x) < 2.6 && Math.abs(p[1] - z) < 2.6) return true;
    return false;
  };
  const dirt: THREE.BufferGeometry[] = [], stone: THREE.BufferGeometry[] = [];
  const polylines: [number, number][][] = [];
  let stepsCount = 0;
  for (const path of town.paths) {
    const pts = resample(path.p, 1.0);
    // Split into runs inside the detailed grid and away from the entrance ribbon.
    let run: [number, number][] = [];
    const flush = () => {
      if (run.length > 2) {
        polylines.push(run);
        const w = path.w ?? (path.steps ? 2.0 : path.core ? 2.2 : 1.4);
        if (!path.steps) dirt.push(drape(run, w, yAt, 0.06));
        else {
          stone.push(drape(run, w + 0.4, yAt, 0.02));
          // Treads: a stone block each time the ground rises 0.18 m along the run.
          let last = yAt(run[0][0], run[0][1]);
          for (let i = 1; i < run.length; i++) {
            const y = yAt(run[i][0], run[i][1]);
            if (Math.abs(y - last) < 0.18) continue;
            const [ax, az] = run[i - 1], [bx, bz] = run[i];
            const yaw = Math.atan2(-(bx - ax), -(bz - az));
            const top = Math.max(y, last);
            const g = new THREE.BoxGeometry(w, 0.2, 0.42).translate(0, -0.1, 0);
            g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(bx, top + 0.02, bz),
              new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), new THREE.Vector3(1, 1, 1)));
            stone.push(g); stepsCount++;
            last = y;
          }
        }
      }
      run = [];
    };
    for (const p of pts) {
      if (inGrid(near, p[0], p[1], 2) && !nearRoute(p[0], p[1])) run.push(p);
      else flush();
    }
    flush();
  }
  const group = new THREE.Group(); group.name = 'lanes';
  let triangles = 0;
  for (const [list, mat, name] of [[dirt, dirtMat, 'dirt'], [stone, stoneMat, 'stone']] as const) {
    if (!list.length) continue;
    const norm = list.map((g) => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k); return n; });
    const g = mergeGeometries(norm, false)!;
    g.computeBoundingSphere();
    triangles += g.getAttribute('position').count / 3;
    const m = new THREE.Mesh(g, mat); m.name = `lanes:${name}`; m.receiveShadow = true; m.castShadow = name === 'stone';
    group.add(m);
  }
  return { group, triangles, polylines, stepsCount };
}
