// Lodge blocks on their terraces, one instanced mesh per part: 5 draw calls for all of them.
import * as THREE from 'three/webgpu';
import { rng } from '../core/rng';
import type { Layout } from './layout';
import type { Physics } from './physics';

const WALLS = [0xf3f0e8, 0xf6efdc, 0xece4d0, 0xf0ece4, 0xe9b9b9, 0xf1d7c6];
const ROOFS = [0x2a6fc0, 0x2a6fc0, 0x2f9a8c, 0x3d8a3e, 0xb3322a, 0x6e2424, 0x2a6fc0, 0x3d8a3e];
const FRAMES = [0x2f7d46, 0x2a5fa8, 0x9e2a22, 0x5c1f1c];

export interface LodgeHandles { group: THREE.Group; count: number; triangles: number }

export function buildLodges(L: Layout, phys: Physics, storey: number): LodgeHandles {
  const lodges = L.lodges;
  const n = lodges.length;
  const box = new THREE.BoxGeometry(1, 1, 1);
  const shape = new THREE.Shape([new THREE.Vector2(-0.5, 0), new THREE.Vector2(0.5, 0), new THREE.Vector2(0, 1)]);
  const prism = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false }).translate(0, 0, -0.5);

  const mat = (rough: number, metal = 0) => new THREE.MeshStandardMaterial({ roughness: rough, metalness: metal });
  const plinth = new THREE.InstancedMesh(box, mat(0.95), n);
  const walls = new THREE.InstancedMesh(box, mat(0.9), n);
  const roofs = new THREE.InstancedMesh(prism, mat(0.55, 0.35), n);
  const eaves = new THREE.InstancedMesh(box, mat(0.8), n);

  type Win = THREE.Matrix4;
  const winM: Win[] = [], winC: THREE.Color[] = [];
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const c = new THREE.Color();

  lodges.forEach((l, i) => {
    const r = rng(l.seed);
    q.setFromAxisAngle(up, l.yaw);
    const base = l.yMin - 0.4, pad = l.yMax + 0.15;
    const H = l.storeys * storey;
    // Plinth: the stone terrace wall up to the pad, then a dressed-stone ground floor.
    const stoneTop = pad + storey;
    m.compose(p.set(l.x, (base + stoneTop) / 2, l.z), q, s.set(l.w + 0.12, stoneTop - base, l.d + 0.12));
    plinth.setMatrixAt(i, m);
    plinth.setColorAt(i, c.setRGB(0.55 + r() * 0.08, 0.54 + r() * 0.06, 0.5 + r() * 0.05, THREE.SRGBColorSpace));
    // Walls.
    m.compose(p.set(l.x, (stoneTop + pad + H) / 2, l.z), q, s.set(l.w, pad + H - stoneTop, l.d));
    walls.setMatrixAt(i, m);
    let wall = WALLS[Math.floor(r() * WALLS.length)];
    let roof = ROOFS[Math.floor(r() * ROOFS.length)];
    if (l.role === 'blueRoof') { wall = 0xf3f0e8; roof = 0x1f63c6; }
    if (l.role === 'pinkWhite') { wall = 0xe7aeb4; roof = 0xb3322a; }
    walls.setColorAt(i, c.set(wall));
    // Low-pitched gable with deep eaves; ridge along the long side.
    const long = l.w >= l.d;
    const rq = new THREE.Quaternion().setFromAxisAngle(up, l.yaw + (long ? Math.PI / 2 : 0));
    const span = long ? l.d : l.w, run = long ? l.w : l.d;
    m.compose(p.set(l.x, pad + H + 0.1, l.z), rq, s.set(span + 1.0, 0.22 * span + 0.4, run + 1.0));
    roofs.setMatrixAt(i, m);
    roofs.setColorAt(i, c.set(roof));
    m.compose(p.set(l.x, pad + H + 0.05, l.z), q, s.set(l.w + 1.0, 0.16, l.d + 1.0));
    eaves.setMatrixAt(i, m);
    eaves.setColorAt(i, c.set(roof).multiplyScalar(0.7));
    // Window rows on all four faces.
    const frame = FRAMES[Math.floor(r() * FRAMES.length)];
    const faces: [number, number, number][] = [[0, l.d / 2, l.w], [Math.PI, l.d / 2, l.w], [Math.PI / 2, l.w / 2, l.d], [-Math.PI / 2, l.w / 2, l.d]];
    for (const [fa, off, len] of faces) {
      const bays = Math.max(1, Math.floor((len - 1.4) / 2.7));
      const fq = new THREE.Quaternion().setFromAxisAngle(up, l.yaw + fa);
      const dirX = Math.sin(l.yaw + fa), dirZ = Math.cos(l.yaw + fa);
      const rx = Math.cos(l.yaw + fa), rz = -Math.sin(l.yaw + fa);
      for (let st = 0; st < l.storeys; st++) for (let b = 0; b < bays; b++) {
        const t = (b - (bays - 1) / 2) * (len / bays);
        const x = l.x + dirX * (off + 0.02) + rx * t, z = l.z + dirZ * (off + 0.02) + rz * t;
        const y = pad + st * storey + 1.45;
        winM.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), fq, new THREE.Vector3(1, 1, 1)));
        winC.push(new THREE.Color(frame));
      }
    }
    phys.addBox(l.x, (base + pad + H) / 2, l.z, l.w / 2 + 0.25, (pad + H - base) / 2, l.d / 2 + 0.25, l.yaw);
  });

  const frameGeo = new THREE.BoxGeometry(1.15, 1.3, 0.08);
  const glassGeo = new THREE.BoxGeometry(0.9, 1.05, 0.1);
  const frames = new THREE.InstancedMesh(frameGeo, mat(0.7), winM.length);
  const glass = new THREE.InstancedMesh(glassGeo, new THREE.MeshStandardMaterial({ color: 0x1d2630, roughness: 0.15, metalness: 0.2 }), winM.length);
  winM.forEach((wm, i) => {
    frames.setMatrixAt(i, wm); frames.setColorAt(i, winC[i]);
    glass.setMatrixAt(i, wm);
  });

  const group = new THREE.Group();
  group.name = 'lodges';
  for (const im of [plinth, walls, roofs, eaves, frames, glass]) {
    im.castShadow = im !== glass && im !== frames;
    im.receiveShadow = true;
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.computeBoundingSphere();
    group.add(im);
  }
  const triangles = n * (12 * 3 + 8) + winM.length * 24;
  return { group, count: n, triangles };
}
