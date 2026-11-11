// M2.5 nature: pine and rhododendron forest on the upper slopes and the ridge, juniper and shrubs between the
// houses, grass tufts that move in the wind, rocks, and puddles on the open ground. All instanced and cut into
// 200 m chunks so whole chunks are culled off screen. CC0 models: Quaternius Stylized Nature MegaKit.
// Detail level: full pines within NEAR_TREES_M of the town centre, cheap cone pines beyond.
import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { cos, float, instanceIndex, positionLocal, sin, time, vec3 } from 'three/tsl';
import { fbm2, rng } from '../core/rng';
import type { Grid, Layout } from './layout';
import { inGrid, sampleGrid } from './layout';
import type { BuildingHandles } from './buildings';

const NEAR_TREES_M = 340;
const CHUNK = 200;
type Part = { geo: THREE.BufferGeometry; mat: THREE.Material };

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
async function parts(name: string): Promise<Part[]> {
  const g = await loader.loadAsync(`assets/nature/${name}.glb`);
  const out: Part[] = [];
  g.scene.updateMatrixWorld(true);
  g.scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const geo = m.geometry.clone().applyMatrix4(m.matrixWorld);
    out.push({ geo, mat: m.material as THREE.Material });
  });
  return out;
}

/** Wind sway for instanced foliage: displacement grows with height, phase varies per instance. */
function windy(mat: THREE.Material, amp: number, freq: number): THREE.Material {
  const src = mat as THREE.MeshStandardMaterial;
  const m = new THREE.MeshStandardNodeMaterial();
  m.map = src.map ?? null; m.color.copy(src.color ?? new THREE.Color(1, 1, 1));
  m.alphaTest = src.alphaTest || (src.map ? 0.4 : 0); m.transparent = false;
  m.side = THREE.DoubleSide; m.roughness = 0.9; m.metalness = 0;
  const ph = float(instanceIndex).mul(0.37);
  const h = positionLocal.y.max(0);
  m.positionNode = positionLocal.add(vec3(
    sin(time.mul(freq).add(ph)).mul(h).mul(amp),
    float(0),
    cos(time.mul(freq * 0.8).add(ph.mul(1.3))).mul(h).mul(amp * 0.6)));
  return m;
}

export interface NatureHandles { group: THREE.Group; triangles: number; counts: Record<string, number> }

export async function buildNature(L: Layout, near: Grid, mid: Grid, town: BuildingHandles,
  lanes: [number, number][][]): Promise<NatureHandles> {
  const group = new THREE.Group(); group.name = 'nature';
  const toReal = (y: number) => y / L.scale + L.hRef;
  const groundAt = (x: number, z: number) => inGrid(near, x, z, 1) ? sampleGrid(near, x, z) : sampleGrid(mid, x, z);
  const slopeAt = (x: number, z: number) => Math.hypot(groundAt(x + 1.5, z) - groundAt(x - 1.5, z), groundAt(x, z + 1.5) - groundAt(x, z - 1.5)) / 3;

  // Keep-outs: buildings (with their terraces) and lanes, on a 4 m hash.
  const H = 4, blocked = new Set<number>();
  const key = (x: number, z: number) => (Math.floor(x / H) + 4096) * 8192 + (Math.floor(z / H) + 4096);
  for (const r of town.rects) {
    const R = Math.max(r.hw, r.hd) + 3;
    for (let x = r.x - R; x <= r.x + R; x += H / 2) for (let z = r.z - R; z <= r.z + R; z += H / 2) blocked.add(key(x, z));
  }
  const laneSet = new Set<number>();
  for (const pts of lanes) for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 1.5);
    for (let k = 0; k <= n; k++) { const x = ax + ((bx - ax) * k) / n, z = az + ((bz - az) * k) / n; laneSet.add(key(x, z)); }
  }
  const free = (x: number, z: number) => !blocked.has(key(x, z)) && !laneSet.has(key(x, z));
  // Entrance keep-out: route, plaza, market ground.
  const entranceClear = (x: number, z: number) => {
    if (Math.abs(x - L.plaza.x) < L.plaza.w / 2 + 4 && Math.abs(z - L.plaza.z) < L.plaza.d / 2 + 4) return false;
    if (Math.abs(x - L.market.x) < L.market.w / 2 + 3 && Math.abs(z - L.market.z) < L.market.d / 2 + 3) return false;
    for (const p of L.route.pts) if (Math.abs(p[0] - x) < 4 && Math.abs(p[1] - z) < 4) return false;
    return true;
  };
  const cx = town.rects.reduce((a, r) => a + r.x, 0) / town.rects.length;
  const cz = town.rects.reduce((a, r) => a + r.z, 0) / town.rects.length;

  // Chunked instancing: one InstancedMesh per (chunk, part).
  type Inst = { m: THREE.Matrix4; c?: THREE.Color };
  const chunks = new Map<string, Map<string, Inst[]>>();
  const push = (kind: string, x: number, z: number, m: THREE.Matrix4, c?: THREE.Color) => {
    const ck = `${Math.floor(x / CHUNK)},${Math.floor(z / CHUNK)}`;
    const byKind = chunks.get(ck) ?? new Map<string, Inst[]>(); chunks.set(ck, byKind);
    const list = byKind.get(kind) ?? []; byKind.set(kind, list); list.push({ m, c });
  };
  const q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), s = new THREE.Vector3(), p = new THREE.Vector3();
  const mtx = (x: number, y: number, z: number, yaw: number, sc: number, syk = 1) =>
    new THREE.Matrix4().compose(p.set(x, y, z), q.setFromAxisAngle(up, yaw), s.set(sc, sc * syk, sc));

  // ---------------------------------------------------------------- forest
  const R = rng(4242);
  const counts: Record<string, number> = { pineNear: 0, pineFar: 0, rhodo: 0, juniper: 0, grass: 0, rock: 0 };
  const SPACING = 7, EXTENT = 1700;
  for (let x = cx - EXTENT; x < cx + EXTENT; x += SPACING) for (let z = cz - EXTENT; z < cz + EXTENT; z += SPACING) {
    const jx = x + (R() - 0.5) * SPACING * 0.9, jz = z + (R() - 0.5) * SPACING * 0.9;
    const d = Math.hypot(jx - cx, jz - cz);
    if (d > EXTENT) continue;
    const y = groundAt(jx, jz), real = toReal(y), sl = slopeAt(jx, jz);
    if (sl > 1.25 || real > 4150) continue;
    // Forest thickens up the ridge above the town and on the shaded slopes; open terraces in the bowl.
    const n = fbm2(jx * 0.006, jz * 0.006, 4);
    const up = Math.min(1, Math.max(0, (real - 3470) / 120));
    const dens = up * 0.85 + (d > 700 ? 0.35 : 0) + (n - 0.5) * 0.9;
    if (R() > dens) continue;
    // Far away, one cone stands for several trees (fewer, larger instances).
    if (d >= NEAR_TREES_M && R() > 0.3) continue;
    if (!free(jx, jz) || !entranceClear(jx, jz)) continue;
    const yaw = R() * Math.PI * 2, sc = 0.8 + R() * 0.6;
    if (d < NEAR_TREES_M) {
      if (real < 3540 && R() < 0.4) { push('rhodo', jx, jz, mtx(jx, y - 0.1, jz, yaw, 1.6 + R() * 1.2)); counts.rhodo++; }
      else { push(R() < 0.5 ? 'pine_a' : 'pine_b', jx, jz, mtx(jx, y - 0.2, jz, yaw, sc * 1.4)); counts.pineNear++; }
    } else {
      const c = new THREE.Color().setHSL(0.29 + R() * 0.05, 0.35 + R() * 0.15, 0.17 + R() * 0.06);
      push('cone', jx, jz, mtx(jx, y - 0.3, jz, yaw, sc * 1.35, 1.1 + R() * 0.4), c); counts.pineFar++;
    }
  }

  // ---------------------------------------------------------------- juniper and shrubs between the houses
  for (const r of town.rects) {
    const n = Math.floor(R() * 4);
    for (let k = 0; k < n; k++) {
      const a = R() * Math.PI * 2, dist = Math.max(r.hw, r.hd) + 1.8 + R() * 2.5;
      const x = r.x + Math.cos(a) * dist, z = r.z + Math.sin(a) * dist;
      if (laneSet.has(key(x, z)) || !entranceClear(x, z)) continue;
      push(R() < 0.7 ? 'juniper' : 'rhodo', x, z, mtx(x, groundAt(x, z) - 0.05, z, R() * 6.28, 0.8 + R() * 0.7));
      counts.juniper++;
    }
  }

  // ---------------------------------------------------------------- grass tufts (wind) and rocks in the near grid
  for (let i = 0; i < 6500; i++) {
    const x = near.x0 + R() * (near.nx - 1) * near.step, z = near.z0 + R() * (near.nz - 1) * near.step;
    if (Math.hypot(x - cx, z - cz) > 520) continue;
    if (!free(x, z) || !entranceClear(x, z) || slopeAt(x, z) > 0.9) continue;
    if (fbm2(x * 0.05, z * 0.05, 2) < 0.42) continue;
    push('grass', x, z, mtx(x, groundAt(x, z) - 0.02, z, R() * 6.28, 0.3 + R() * 0.35));
    counts.grass++;
  }
  for (let i = 0; i < 1300; i++) {
    const x = near.x0 + R() * (near.nx - 1) * near.step, z = near.z0 + R() * (near.nz - 1) * near.step;
    if (!free(x, z) || !entranceClear(x, z)) continue;
    const big = R() < 0.1;
    push(R() < 0.5 ? 'rock_a' : 'rock_b', x, z, mtx(x, groundAt(x, z) - (big ? 0.5 : 0.15), z, R() * 6.28, big ? 1.0 + R() * 0.9 : 0.25 + R() * 0.45, 0.75));
    counts.rock++;
  }

  // ---------------------------------------------------------------- meshes
  const lib: Record<string, Part[]> = {};
  const names = ['pine_a', 'pine_b', 'rhodo', 'juniper', 'grass', 'rock_a', 'rock_b'];
  const loaded = await Promise.all(names.map((n) => parts(n)));
  names.forEach((n, i) => { lib[n] = loaded[i]; });
  // Foliage sways; trunks and rocks stay put.
  for (const n of ['pine_a', 'pine_b']) lib[n] = lib[n].map((pt) => ({ geo: pt.geo, mat: (pt.mat as THREE.MeshStandardMaterial).map && /leaf|leaves/i.test(pt.mat.name) ? windy(pt.mat, 0.012, 1.1) : pt.mat }));
  for (const n of ['rhodo', 'juniper']) lib[n] = lib[n].map((pt) => ({ geo: pt.geo, mat: windy(pt.mat, 0.03, 1.6) }));
  lib.grass = lib.grass.map((pt) => ({ geo: pt.geo, mat: windy(pt.mat, 0.18, 2.2) }));
  for (const n of ['rock_a', 'rock_b']) lib[n] = lib[n].map((pt) => {
    const m = (pt.mat as THREE.MeshStandardMaterial).clone(); m.color.set(0xb8b2a8); m.roughness = 0.95; return { geo: pt.geo, mat: m };
  });
  const coneGeo = new THREE.ConeGeometry(2.1, 9.5, 6, 1, true).translate(0, 4.6, 0);
  lib.cone = [{ geo: coneGeo, mat: new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true }) }];

  let triangles = 0;
  for (const [, byKind] of chunks) for (const [kind, list] of byKind) {
    for (const pt of lib[kind] ?? []) {
      const im = new THREE.InstancedMesh(pt.geo, pt.mat, list.length);
      list.forEach((it, i) => { im.setMatrixAt(i, it.m); if (it.c) im.setColorAt(i, it.c); });
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingSphere();
      im.castShadow = kind.startsWith('pine') || kind === 'rhodo';
      im.receiveShadow = kind !== 'cone';
      im.name = `nature:${kind}`;
      group.add(im);
      const idx = pt.geo.index; triangles += ((idx ? idx.count : pt.geo.getAttribute('position').count) / 3) * list.length;
    }
  }

  // ---------------------------------------------------------------- puddles on the open ground
  const puddleMat = new THREE.MeshStandardMaterial({ color: 0x39424a, roughness: 0.05, metalness: 0.3 });
  const PR = rng(77);
  for (let i = 0; i < 7; i++) {
    const x = L.market.x + (PR() - 0.5) * L.market.w * 0.8, z = L.market.z + (PR() - 0.5) * L.market.d * 0.8;
    const pud = new THREE.Mesh(new THREE.CircleGeometry(0.6 + PR() * 1.1, 18).rotateX(-Math.PI / 2), puddleMat);
    pud.scale.set(1, 1, 0.5 + PR() * 0.5); pud.rotation.y = PR() * 6.28;
    pud.position.set(x, groundAt(x, z) + 0.03, z); pud.receiveShadow = true;
    group.add(pud);
  }
  return { group, triangles, counts };
}
