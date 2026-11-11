// Collects static geometry per material and merges it, so the whole entrance costs a few draw calls.
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export class StaticBuilder {
  private readonly parts = new Map<string, THREE.BufferGeometry[]>();
  private readonly mats = new Map<string, THREE.Material>();
  private readonly shadow = new Map<string, boolean>();
  triangles = 0;

  material(key: string, m: THREE.Material, castShadow = true): void {
    this.mats.set(key, m);
    this.shadow.set(key, castShadow);
  }

  /** Use another builder's materials (same objects), so parts can be built into a separate group. */
  shareMaterialsFrom(other: StaticBuilder): void {
    for (const [k, m] of other.mats) this.material(k, m, other.shadow.get(k));
  }

  add(key: string, geo: THREE.BufferGeometry, m?: THREE.Matrix4): void {
    if (!this.mats.has(key)) throw new Error(`StaticBuilder: no material '${key}'`);
    let g = geo.index ? geo : withIndex(geo);
    g = g === geo ? geo.clone() : g;
    if (m) g.applyMatrix4(m);
    if (!g.getAttribute('uv')) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.getAttribute('position').count * 2), 2));
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    const list = this.parts.get(key) ?? [];
    list.push(g);
    this.parts.set(key, list);
  }

  build(name: string): THREE.Group {
    const group = new THREE.Group();
    group.name = name;
    for (const [key, list] of this.parts) {
      const merged = mergeGeometries(list, false);
      if (!merged) throw new Error(`StaticBuilder: could not merge '${key}'`);
      merged.computeBoundingSphere();
      this.triangles += (merged.index ? merged.index.count : merged.getAttribute('position').count) / 3;
      const mesh = new THREE.Mesh(merged, this.mats.get(key)!);
      mesh.name = `${name}:${key}`;
      mesh.castShadow = this.shadow.get(key)!;
      mesh.receiveShadow = true;
      group.add(mesh);
      list.forEach((g) => g.dispose());
    }
    this.parts.clear();
    return group;
  }
}

function withIndex(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const c = g.clone();
  const n = c.getAttribute('position').count;
  const idx = new Uint32Array(n);
  for (let i = 0; i < n; i++) idx[i] = i;
  c.setIndex(new THREE.BufferAttribute(idx, 1));
  return c;
}

/** Box whose UVs are in metres / tile, so textures keep their scale on any size. */
export function boxM(w: number, h: number, d: number, tile = 1): THREE.BoxGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.getAttribute('uv') as THREE.BufferAttribute;
  // Face order: +x, -x, +y, -y, +z, -z; 4 vertices each.
  const dims: [number, number][] = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) {
    const i = f * 4 + v;
    uv.setXY(i, (uv.getX(i) * dims[f][0]) / tile, (uv.getY(i) * dims[f][1]) / tile);
  }
  return g;
}

export const M = new THREE.Matrix4();
const q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler();

/** Compose a matrix from position, yaw (and optional pitch/roll) and scale. */
export function trs(x: number, y: number, z: number, yaw = 0, sx = 1, sy = 1, sz = 1, pitch = 0, roll = 0): THREE.Matrix4 {
  e.set(pitch, yaw, roll, 'YXZ');
  q.setFromEuler(e);
  return new THREE.Matrix4().compose(p.set(x, y, z), q, s.set(sx, sy, sz));
}

/** A ribbon along a polyline with heights: width w, UVs in metres / tile. */
export function ribbon(pts: [number, number, number][], w: number, lift: number, tile: number): THREE.BufferGeometry {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  let along = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0], dz = b[2] - a[2];
    const L = Math.hypot(dx, dz) || 1;
    dx /= L; dz /= L;
    if (i > 0) along += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][2] - pts[i - 1][2]);
    const nx = -dz, nz = dx;
    pos.push(pts[i][0] + nx * w / 2, pts[i][1] + lift, pts[i][2] + nz * w / 2);
    pos.push(pts[i][0] - nx * w / 2, pts[i][1] + lift, pts[i][2] - nz * w / 2);
    uv.push(0, along / tile, w / tile, along / tile);
    if (i > 0) {
      const k = i * 2;
      idx.push(k - 2, k - 1, k, k - 1, k + 1, k);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  // Make sure the ribbon faces up.
  const n = g.getAttribute('normal');
  if (n.count && n.getY(0) < 0) {
    const ix = g.index!;
    for (let i = 0; i < ix.count; i += 3) { const t = ix.getX(i + 1); ix.setX(i + 1, ix.getX(i + 2)); ix.setX(i + 2, t); }
    g.computeVertexNormals();
  }
  return g;
}
