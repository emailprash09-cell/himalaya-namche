// Forest on the ridge above the town and shrubs on the verges. Two instanced draw calls.
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { fbm2, rng } from '../core/rng';
import type { Grid, Layout } from './layout';
import { inGrid, sampleGrid } from './layout';

function tinted(g: THREE.BufferGeometry, hex: number): THREE.BufferGeometry {
  const c = new THREE.Color(hex);
  const n = g.getAttribute('position').count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}

export function buildVegetation(L: Layout, near: Grid, mid: Grid, ground: Uint8Array): { group: THREE.Group; triangles: number } {
  const group = new THREE.Group();
  group.name = 'vegetation';
  const toReal = (y: number) => y / L.scale + L.hRef;

  // Conifer: two stacked cones and a trunk, about 9 m before per-instance scale.
  const tree = mergeGeometries([
    tinted(new THREE.CylinderGeometry(0.18, 0.25, 2.2, 5).translate(0, 1.1, 0), 0x4a3524),
    tinted(new THREE.ConeGeometry(1.9, 4.6, 7).translate(0, 3.9, 0), 0x2f5228),
    tinted(new THREE.ConeGeometry(1.35, 3.6, 7).translate(0, 6.6, 0), 0x355c2c),
  ].map((g) => { g.deleteAttribute('uv'); return g; }))!;
  const R = rng(1234);
  const mats: THREE.Matrix4[] = [];
  const cols: THREE.Color[] = [];
  const lodgeNear = (x: number, z: number) => L.lodges.some((l) => Math.hypot(l.x - x, l.z - z) < Math.max(l.w, l.d) * 0.8 + 3);
  const q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  const x1 = mid.x0 + (mid.nx - 1) * mid.step, z1 = mid.z0 + (mid.nz - 1) * mid.step;
  let tries = 0;
  while (mats.length < 4200 && tries++ < 60000) {
    const x = mid.x0 + R() * (x1 - mid.x0), z = mid.z0 + R() * (z1 - mid.z0);
    if (inGrid(near, x, z, -4)) continue;
    const y = sampleGrid(mid, x, z);
    const real = toReal(y);
    const n = fbm2(x * 0.012, z * 0.012, 3);
    // Forest above the town; patches lower down on the steep sides.
    const line = 3575 + (n - 0.5) * 120;
    if (real < line && !(real > 3420 && n > 0.66)) continue;
    if (real > 3950 + n * 150) continue;
    const gx = sampleGrid(mid, x + 3, z) - sampleGrid(mid, x - 3, z), gz = sampleGrid(mid, x, z + 3) - sampleGrid(mid, x, z - 3);
    if (Math.hypot(gx, gz) / 6 > 1.4) continue;
    if (lodgeNear(x, z)) continue;
    const sc = 0.75 + R() * 0.65;
    q.setFromAxisAngle(up, R() * 6.283);
    mats.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y - 0.2, z), q, new THREE.Vector3(sc, sc * (0.85 + R() * 0.4), sc)));
    cols.push(new THREE.Color().setHSL(0.27 + R() * 0.06, 0.35, 0.36 + R() * 0.18));
  }
  const trees = new THREE.InstancedMesh(tree, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }), mats.length);
  mats.forEach((m, i) => { trees.setMatrixAt(i, m); trees.setColorAt(i, cols[i]); });
  trees.name = 'forest';
  trees.castShadow = true;
  trees.receiveShadow = true;
  trees.computeBoundingSphere();
  group.add(trees);

  // Shrubs on grass in the near area, kept off paths, water and paving.
  const shrub = new THREE.IcosahedronGeometry(0.7, 1);
  shrub.deleteAttribute('uv');
  const smats: THREE.Matrix4[] = [];
  const scols: THREE.Color[] = [];
  const nx1 = near.x0 + (near.nx - 1) * near.step, nz1 = near.z0 + (near.nz - 1) * near.step;
  tries = 0;
  while (smats.length < 260 && tries++ < 20000) {
    const x = near.x0 + R() * (nx1 - near.x0), z = near.z0 + R() * (nz1 - near.z0);
    const ix = Math.round((x - near.x0) / near.step), iz = Math.round((z - near.z0) / near.step);
    const t = ground[iz * near.nx + ix];
    if (t !== 0 && t !== 4) continue;
    // Clear a ring round every path cell.
    let blocked = false;
    for (let k = -6; k <= 6 && !blocked; k += 3) for (let j = -6; j <= 6; j += 3) {
      const tt = ground[Math.min(near.nz - 1, Math.max(0, iz + k)) * near.nx + Math.min(near.nx - 1, Math.max(0, ix + j))];
      if (tt === 1 || tt === 2 || tt === 3) { blocked = true; break; }
    }
    if (blocked || lodgeNear(x, z)) continue;
    if (Math.hypot(x - L.stupa.x, z - L.stupa.z) < 14) continue;
    const y = sampleGrid(near, x, z);
    const sc = 0.45 + R() * 0.7;
    q.setFromAxisAngle(up, R() * 6.283);
    smats.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y + 0.2 * sc, z), q, new THREE.Vector3(sc * 1.2, sc * 0.8, sc)));
    scols.push(new THREE.Color().setHSL(0.24 + R() * 0.06, 0.32, 0.17 + R() * 0.08));
  }
  const shrubs = new THREE.InstancedMesh(shrub, new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true }), smats.length);
  smats.forEach((m, i) => { shrubs.setMatrixAt(i, m); shrubs.setColorAt(i, scols[i]); });
  shrubs.name = 'shrubs';
  shrubs.castShadow = true;
  shrubs.receiveShadow = true;
  shrubs.computeBoundingSphere();
  group.add(shrubs);

  return { group, triangles: mats.length * 34 + smats.length * 80 };
}
