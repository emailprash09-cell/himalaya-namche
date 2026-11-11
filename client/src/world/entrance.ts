// The entrance: path, invented bridge, Kani gate, the stupa and its flags, the open ground with tents.
// Sizes are the measured ones in docs/audit/history.md; positions come from the baked layout (OSM).
import * as THREE from 'three/webgpu';
import { rng } from '../core/rng';
import { corrugated, flagstones, gateFrieze, stoneWall, stupaEyes, whitewash } from '../render/textures';
import { StaticBuilder, boxM, ribbon, trs } from './builder';
import type { Grid, Layout } from './layout';
import { sampleGrid } from './layout';
import type { Physics } from './physics';
import { Hero, loadModel, type HeroSpec } from './models';

type P3 = [number, number, number];
const xyz = (p: [number, number, number]): P3 => [p[0], p[2], p[1]]; // baked [x, z, y] -> [x, y, z]

function std(color: number, rough = 0.85, extra: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });
}

export interface EntranceHandles {
  group: THREE.Group;
  flags: THREE.InstancedMesh;
  updateFlags(t: number): void;
  triangles: number;
  stupaTop: THREE.Vector3;
  /** Resolves when the generated models have loaded (or failed and kept the M1 version). */
  modelsReady: Promise<{ loaded: string[]; failed: string[]; heroes: HeroSpec[] }>;
  updateHeroes(t: number, dt: number, player: THREE.Vector3): void;
}

export function buildEntrance(L: Layout, near: Grid, phys: Physics): EntranceHandles {
  const B = new StaticBuilder();
  const ground = (x: number, z: number) => sampleGrid(near, x, z);

  // ---------------------------------------------------------------- materials
  const flag = flagstones(512, 11);
  const plazaTex = flagstones(512, 19, [176, 172, 164]);
  plazaTex.repeat.set(1, 1);
  const wallTex = stoneWall();
  const wash = whitewash();
  B.material('path', new THREE.MeshStandardMaterial({ map: flag, roughness: 0.92 }), false);
  B.material('plaza', new THREE.MeshStandardMaterial({ map: plazaTex, roughness: 0.9 }), false);
  B.material('stone', new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.95 }));
  B.material('white', new THREE.MeshStandardMaterial({ map: wash, roughness: 0.9 }));
  B.material('dark', std(0x23201d, 0.9));
  B.material('red', std(0x9e2a22, 0.75));
  B.material('roof', std(0xa3352a, 0.7));
  B.material('maroon', std(0x5c1f1c, 0.8));
  B.material('gold', std(0xd6a73a, 0.35, { metalness: 0.75 }));
  B.material('blue', std(0x1f4f9a, 0.8));
  B.material('green', std(0x2f7d46, 0.8));
  B.material('eyes', new THREE.MeshStandardMaterial({ map: stupaEyes(), roughness: 0.8 }), false);
  B.material('frieze', new THREE.MeshStandardMaterial({ map: gateFrieze(), roughness: 0.8 }), false);
  B.material('wood', std(0x6b4a2e, 0.9));
  B.material('canvas', std(0xeeeae0, 0.95, { side: THREE.DoubleSide }));
  B.material('tarpBlue', std(0x2860b8, 0.7, { side: THREE.DoubleSide }));
  B.material('tarpGrey', std(0x8e9296, 0.8, { side: THREE.DoubleSide }));
  const tin = corrugated(); tin.repeat.set(2, 1);
  B.material('tin', new THREE.MeshStandardMaterial({ map: tin, color: 0xc8ccd0, roughness: 0.45, metalness: 0.6 }));
  B.material('rock', std(0x8a8782, 0.95, { flatShading: true }));
  B.material('water', std(0x55707c, 0.12, { metalness: 0.1 }), false);

  // Gate and stupa visuals go in their own group: the reduced Higgsfield models replace them
  // when they load (world/models.ts). The colliders below stay in either case.
  const BL = new StaticBuilder();
  BL.shareMaterialsFrom(B);

  // ---------------------------------------------------------------- the route
  const pts = L.route.pts.map(xyz);
  const along: number[] = [0];
  for (let i = 1; i < pts.length; i++) along.push(along[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][2] - pts[i - 1][2]));
  const gateS = L.route.gateS, flight0 = L.route.flightStart, flight1 = flight0 + L.flight.length * 0.32;
  const section = (a: number, b: number) => pts.filter((_, i) => along[i] >= a && along[i] <= b);
  B.add('path', ribbon(section(0, gateS - 2.25), 2.4, 0.03, 3));
  B.add('path', ribbon(section(gateS - 2.6, flight0 + 0.2), 2.1, 0.03, 3));
  B.add('path', ribbon(section(flight1 - 0.2, along[along.length - 1]), 2.4, 0.03, 3));
  for (const s of L.flight) {
    const h = 0.17 + 0.35;
    B.add('stone', boxM(s.w, h, s.d + 0.02, 0.8), trs(s.x, s.y - h / 2, s.z, s.yaw));
  }
  // The flight walks as a straight ramp through the nosings (28 degrees), like most games do.
  if (L.flight.length > 1) {
    const f0 = L.flight[0], f1 = L.flight[L.flight.length - 1];
    let dx = f1.x - f0.x, dz = f1.z - f0.z;
    const len = Math.hypot(dx, dz); dx /= len; dz /= len;
    const rx = -dz, rz = dx, hw = f0.w / 2;
    const a = { x: f0.x - dx * f0.d * 1.5, z: f0.z - dz * f0.d * 1.5, y: f0.y - 0.17 };
    const b = { x: f1.x + dx * f1.d * 0.5, z: f1.z + dz * f1.d * 0.5, y: f1.y };
    const v = new Float32Array([
      a.x - rx * hw, a.y, a.z - rz * hw, a.x + rx * hw, a.y, a.z + rz * hw,
      b.x + rx * hw, b.y, b.z + rz * hw, b.x - rx * hw, b.y, b.z - rz * hw,
    ]);
    phys.addTrimesh(v, new Uint32Array([0, 1, 2, 0, 2, 3]));
  }

  // Low dry-stone wall on the left (west) of the path below the gate, broken at the bridge.
  const br = L.bridge;
  // Each piece spans two route samples and is pitched with the path, so the top runs smoothly.
  for (let i = 0; i < pts.length - 1; i++) {
    if (along[i] > gateS - 3.5 || along[i] < 4) continue;
    const a = pts[i], b = pts[i + 1];
    const dx = b[0] - a[0], dz = b[2] - a[2];
    const len = Math.hypot(dx, dz);
    if (len < 0.05) continue;
    const lx = dz / len, lz = -dx / len; // left of the walking direction
    const x = (a[0] + b[0]) / 2 + lx * 1.5, z = (a[2] + b[2]) / 2 + lz * 1.5;
    if (Math.hypot(x - br.x, z - br.z) < 3.2) continue;
    const top = (a[1] + b[1]) / 2 + 0.48;
    const base = Math.min(ground(x, z), a[1], b[1]) - 0.35;
    const h = top - base;
    const yaw = Math.atan2(-dx, -dz), pitch = Math.atan2(b[1] - a[1], len);
    B.add('stone', boxM(0.36, h, len + 0.08, 0.7), trs(x, base + h / 2, z, yaw, 1, 1, 1, pitch));
    phys.addBox(x, base + h / 2, z, 0.18, h / 2, len / 2 + 0.04, yaw);
  }

  // ---------------------------------------------------------------- invented bridge over the rill
  {
    // Align the deck with the chord of the path between its two ends (the path bends here).
    const at = (sv: number): P3 => {
      let i = 1;
      while (i < along.length - 1 && along[i] < sv) i++;
      const t = Math.min(1, Math.max(0, (sv - along[i - 1]) / (along[i] - along[i - 1] || 1)));
      const a = pts[i - 1], b = pts[i];
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    };
    let iBr = 0, bd = Infinity;
    pts.forEach((p, i) => { const d = Math.hypot(p[0] - br.x, p[2] - br.z); if (d < bd) { bd = d; iBr = i; } });
    const up = at(along[iBr] + 3.2), down = at(along[iBr] - 3.2);
    const cxz = { x: (up[0] + down[0]) / 2, z: (up[2] + down[2]) / 2 };
    const yaw = Math.atan2(-(up[0] - down[0]), -(up[2] - down[2]));
    br.x = cxz.x; br.z = cxz.z; br.yaw = yaw;
    const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    // Pitched with the path, which climbs about 20 % here; the deck meets the path at both ends.
    const yUp = up[1], yDown = down[1];
    const pitch = Math.atan2(yUp - yDown, 6.4);
    const y = (yUp + yDown) / 2 + 0.03;
    const yAt = (k: number) => y + Math.tan(pitch) * k;
    B.add('wood', boxM(2.5, 0.12, 6.5, 1), trs(br.x, y - 0.06, br.z, yaw, 1, 1, 1, pitch));
    {
      // Walkable deck as a triangle mesh: the character controller climbs a pitched cuboid badly.
      const corner = (s: number, k: number): [number, number, number] =>
        [br.x + right.x * s * 1.25 + fwd.x * k, yAt(k), br.z + right.z * s * 1.25 + fwd.z * k];
      const v = [corner(-1, -3.3), corner(1, -3.3), corner(1, 3.3), corner(-1, 3.3)].flat();
      phys.addTrimesh(new Float32Array(v), new Uint32Array([0, 2, 1, 0, 3, 2]));
    }
    for (const side of [-1, 1]) {
      const cx = br.x + right.x * side * 1.2, cz = br.z + right.z * side * 1.2;
      B.add('wood', boxM(0.22, 0.3, 6.6, 1), trs(cx, y - 0.25, cz, yaw, 1, 1, 1, pitch));
      B.add('red', boxM(0.09, 0.09, 6.3, 1), trs(cx, y + 0.9, cz, yaw, 1, 1, 1, pitch));
      B.add('red', boxM(0.06, 0.06, 6.3, 1), trs(cx, y + 0.45, cz, yaw, 1, 1, 1, pitch));
      for (let k = -3; k <= 3; k++) {
        const px = cx + fwd.x * k * 1.02, pz = cz + fwd.z * k * 1.02;
        B.add('red', boxM(0.1, 0.95, 0.1, 1), trs(px, yAt(k * 1.02) + 0.47, pz, yaw));
      }
      phys.addBox(cx, y + 0.5, cz, 0.06, 0.5, 3.1, yaw, pitch);
    }
    // Stone abutments either side of the rill.
    for (const end of [-1, 1]) {
      const ax = br.x + fwd.x * end * 3.0, az = br.z + fwd.z * end * 3.0;
      B.add('stone', boxM(2.8, 1.2, 0.8, 0.9), trs(ax, yAt(end * 3.0) - 0.74, az, yaw));
    }
  }

  // ---------------------------------------------------------------- water (stream and the rill)
  for (const w of L.water) B.add('water', ribbon(w.pts.map(xyz), w.invented ? 0.8 : 1.3, 0, 4));

  // ---------------------------------------------------------------- Kani gate (4.5 m square)
  {
    const G = L.gate, y0 = G.y;
    const m = (x: number, y: number, z: number, yaw = 0) => {
      const c = Math.cos(G.yaw), s = Math.sin(G.yaw);
      return trs(G.x + x * c + z * s, y0 + y, G.z - x * s + z * c, G.yaw + yaw);
    };
    const W = 4.5, half = W / 2, pw = 2.1, ph = 2.2, side = (W - pw) / 2;
    for (const sx of [-1, 1]) {
      const cx = sx * (pw / 2 + side / 2);
      BL.add('dark', boxM(side + 0.06, 0.45, W + 0.06, 1), m(cx, 0.2, 0));
      BL.add('white', boxM(side, 2.2, W, 1), m(cx, 0.45 + 1.1, 0));
      for (const sz of [-1, 1]) BL.add('red', boxM(0.2, ph, 0.2, 1), m(sx * (pw / 2 + 0.06), ph / 2, sz * (half - 0.08)));
    }
    BL.add('white', boxM(pw, 0.4, W, 1), m(0, ph + 0.2, 0));
    BL.add('red', boxM(pw + 0.3, 0.12, W + 0.04, 1), m(0, ph + 0.02, 0));
    // Painted frieze on both faces above the passage.
    const fr = new THREE.PlaneGeometry(W - 0.2, 0.34);
    BL.add('frieze', fr, m(0, ph + 0.27, half + 0.012));
    BL.add('frieze', fr, m(0, ph + 0.27, -half - 0.012, Math.PI));
    // Dark eave band with white roundels (17 a side).
    BL.add('dark', boxM(W + 0.3, 0.65, W + 0.3, 1), m(0, 2.6 + 0.325, 0));
    const disc = new THREE.CylinderGeometry(0.115, 0.115, 0.06, 12).rotateX(Math.PI / 2);
    for (let k = 0; k < 17; k++) {
      const t = -2.16 + k * 0.27;
      BL.add('white', disc, m(t, 2.93, half + 0.17));
      BL.add('white', disc, m(t, 2.93, -half - 0.17));
      BL.add('white', disc, m(half + 0.17, 2.93, t, Math.PI / 2));
      BL.add('white', disc, m(-half - 0.17, 2.93, t, Math.PI / 2));
    }
    // Red tiled hipped roof, ridge about 3.95 m, single gold finial on a red base, top 4.5 m.
    const roof = new THREE.ConeGeometry(5.7 / Math.SQRT2 * 1.0, 0.75, 4, 1, false, Math.PI / 4);
    BL.add('roof', roof, m(0, 3.25 + 0.375, 0));
    BL.add('roof', boxM(5.5, 0.08, 5.5, 1), m(0, 3.26, 0));
    BL.add('red', new THREE.CylinderGeometry(0.16, 0.2, 0.18, 12), m(0, 4.05, 0));
    BL.add('gold', new THREE.SphereGeometry(0.13, 14, 10), m(0, 4.22, 0));
    BL.add('gold', new THREE.ConeGeometry(0.09, 0.22, 12), m(0, 4.39, 0));
    BL.add('gold', new THREE.SphereGeometry(0.04, 8, 6), m(0, 4.5, 0));
    // Colliders: two side blocks, the lintel, the roof.
    const c = Math.cos(G.yaw), s = Math.sin(G.yaw);
    const at = (x: number, z: number) => [G.x + x * c + z * s, G.z - x * s + z * c];
    for (const sx of [-1, 1]) {
      const [x, z] = at(sx * (pw / 2 + side / 2), 0);
      phys.addBox(x, y0 + 1.6, z, side / 2, 1.6, half, G.yaw);
    }
    const [lx, lz] = at(0, 0);
    phys.addBox(lx, y0 + ph + 0.5, lz, pw / 2, 0.5, half, G.yaw);
    phys.addBox(lx, y0 + 3.5, lz, 2.8, 0.45, 2.8, G.yaw);
  }

  // ---------------------------------------------------------------- stupa plaza and stupa
  const st = L.stupa, py = L.plaza.y;
  {
    const pz = L.plaza;
    plazaTex.repeat.set(pz.w / 6, pz.d / 6);
    const slab = new THREE.BoxGeometry(pz.w, 0.3, pz.d);
    B.add('plaza', slab, trs(pz.x, py - 0.1, pz.z));
    phys.addBox(pz.x, py - 0.1, pz.z, pz.w / 2, 0.15, pz.d / 2);
  }
  const sm = (y: number) => trs(st.x, py + 0.05 + y, st.z);
  const sy = py + 0.05;
  BL.add('white', boxM(11.0, 1.1, 11.0, 2), sm(0.55));
  BL.add('maroon', boxM(11.04, 0.5, 11.04, 1), sm(0.42));
  BL.add('blue', boxM(11.08, 0.3, 11.08, 1), sm(0.95));
  BL.add('white', boxM(9.2, 0.85, 9.2, 2), sm(1.1 + 0.425));
  BL.add('white', boxM(7.6, 0.75, 7.6, 2), sm(1.95 + 0.375));
  BL.add('white', new THREE.CylinderGeometry(3.35, 3.4, 0.45, 40), sm(2.7 + 0.225));
  BL.add('white', new THREE.SphereGeometry(3.3, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), trs(st.x, sy + 3.15, st.z, 0, 1, 0.95, 1));
  BL.add('gold', boxM(1.95, 1.3, 1.95, 1), sm(6.25 + 0.65));
  const eye = new THREE.PlaneGeometry(1.95, 1.2);
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2;
    BL.add('eyes', eye, trs(st.x + Math.sin(a) * 0.985, sy + 6.9, st.z + Math.cos(a) * 0.985, a));
  }
  BL.add('gold', boxM(2.25, 0.16, 2.25, 1), sm(7.55 + 0.08));
  BL.add('green', new THREE.CylinderGeometry(1.15, 1.3, 0.32, 24), sm(7.71 + 0.16));
  // 13 gold tiers.
  for (let k = 0; k < 13; k++) {
    const r0 = 1.0 - (k / 13) * 0.62, r1 = r0 - 0.04;
    BL.add('gold', new THREE.CylinderGeometry(r1, r0, 0.2, 20), sm(8.03 + k * 0.2 + 0.1));
  }
  BL.add('gold', new THREE.ConeGeometry(0.62, 0.26, 20), sm(10.66 + 0.13));
  BL.add('gold', new THREE.SphereGeometry(0.13, 12, 8), sm(10.9));
  BL.add('gold', new THREE.ConeGeometry(0.07, 0.35, 10), sm(11.15));
  phys.addBox(st.x, sy + 0.55, st.z, 5.5, 0.55, 5.5);
  phys.addBox(st.x, sy + 1.52, st.z, 4.6, 0.43, 4.6);
  phys.addBox(st.x, sy + 2.33, st.z, 3.8, 0.38, 3.8);
  phys.addCylinder(st.x, sy + 4.6, st.z, 1.9, 3.4);

  // Plaza flag poles at the corners and edge midpoints.
  const anchors: THREE.Vector3[] = [];
  {
    const hw = L.plaza.w / 2 - 0.4, hd = L.plaza.d / 2 - 0.4;
    const spots: [number, number][] = [[-hw, -hd], [0, -hd], [hw, -hd], [hw, 0], [hw, hd], [0, hd], [-hw, hd], [-hw, 0]];
    for (const [dx, dz] of spots) {
      const x = st.x + dx, z = st.z + dz;
      B.add('wood', new THREE.CylinderGeometry(0.05, 0.07, 3.6, 8), trs(x, py + 1.8, z));
      phys.addCylinder(x, py + 1.8, z, 1.8, 0.07);
      anchors.push(new THREE.Vector3(x, py + 3.55, z));
    }
  }
  const stupaTop = new THREE.Vector3(st.x, sy + 13.2, st.z); // flags tie on the spire of the 16.5 m model

  // ---------------------------------------------------------------- open ground: tents, tarps, shed, boulder, hut
  const sp = new THREE.Vector2(L.spawn.x, L.spawn.z);
  const look = new THREE.Vector2(st.x - sp.x, st.z - sp.y).normalize();
  const left = new THREE.Vector2(look.y, -look.x);
  // M1 tuned these offsets at world scale 0.65; keep them at the same real distances at any scale.
  const K = 0.65 / L.scale;
  const place = (fwdM: number, leftM: number) => {
    fwdM *= K; leftM *= K;
    const x = sp.x + look.x * fwdM + left.x * leftM, z = sp.y + look.y * fwdM + left.y * leftM;
    return { x, z, y: ground(x, z) };
  };
  const faceYaw = Math.atan2(-look.x, -look.y);
  const R = rng(42);
  const tents: [number, number, number, number, number][] = [ // fwd, left, length, width, yaw offset
    [22, 9.5, 4.2, 3.0, 0.3], [30, 12.8, 3.6, 2.6, -0.2], [31, 20, 3.4, 2.6, 0.9],
  ];
  for (const [f, l, len, wid, yo] of tents) {
    const p = place(f, l), yaw = faceYaw + yo, wallH = 1.5, ridge = 2.55;
    B.add('canvas', boxM(wid, wallH, len, 1), trs(p.x, p.y + wallH / 2, p.z, yaw));
    const roofShape = new THREE.Shape([new THREE.Vector2(-wid / 2 - 0.1, 0), new THREE.Vector2(wid / 2 + 0.1, 0), new THREE.Vector2(0, ridge - wallH)]);
    const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: len + 0.2, bevelEnabled: false }).translate(0, 0, -(len + 0.2) / 2);
    B.add('canvas', roofGeo, trs(p.x, p.y + wallH, p.z, yaw));
    phys.addBox(p.x, p.y + 1.1, p.z, wid / 2, 1.1, len / 2, yaw);
  }
  const tarp = (key: string, f: number, l: number, w: number, d: number, hi: number, lo: number, yo: number) => {
    const p = place(f, l), yaw = faceYaw + yo;
    const pitch = Math.atan2(hi - lo, d);
    B.add(key, new THREE.PlaneGeometry(w, Math.hypot(d, hi - lo)).rotateX(-Math.PI / 2), trs(p.x, p.y + (hi + lo) / 2, p.z, yaw, 1, 1, 1, pitch));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const h = sz < 0 ? hi : lo;
      const c = Math.cos(yaw), s = Math.sin(yaw);
      const lx = sx * (w / 2 - 0.1), lz = sz * (d / 2 - 0.1);
      B.add('wood', new THREE.CylinderGeometry(0.04, 0.04, h, 6), trs(p.x + lx * c + lz * s, p.y + h / 2, p.z - lx * s + lz * c));
    }
  };
  tarp('tarpBlue', 26, 5.6, 3.6, 3.0, 2.2, 1.6, 0.1);
  tarp('tarpBlue', 33, 20.5, 3.0, 2.6, 2.0, 1.5, -0.4);
  tarp('tarpGrey', 37, 12.5, 4.0, 3.2, 2.3, 1.7, 0.2);
  tarp('tarpGrey', 25, 21, 2.6, 2.4, 1.9, 1.4, 0.6);
  {
    const p = place(26, 27), yaw = faceYaw + 0.15;
    B.add('stone', boxM(2.6, 2.0, 2.2, 1), trs(p.x, p.y + 1.0, p.z, yaw));
    B.add('tin', boxM(3.0, 0.06, 2.6, 1), trs(p.x, p.y + 2.12, p.z, yaw, 1, 1, 1, 0.12));
    phys.addBox(p.x, p.y + 1.05, p.z, 1.3, 1.05, 1.1, yaw);
  }
  {
    // Small red-roofed hut in the lower left of the view.
    const p = place(12.5, 7.4), yaw = faceYaw + 0.25;
    B.add('stone', boxM(3.2, 2.2, 2.6, 1), trs(p.x, p.y + 1.1 - 0.3, p.z, yaw));
    const shape = new THREE.Shape([new THREE.Vector2(-1.85, 0), new THREE.Vector2(1.85, 0), new THREE.Vector2(0, 0.85)]);
    const roofGeo = new THREE.ExtrudeGeometry(shape, { depth: 3.1, bevelEnabled: false }).translate(0, 0, -1.55);
    B.add('roof', roofGeo, trs(p.x, p.y + 1.9 - 0.3, p.z, yaw + Math.PI / 2));
    B.add('dark', boxM(0.8, 1.75, 0.05, 1), trs(p.x + Math.sin(yaw) * -1.31, p.y + 0.6, p.z + Math.cos(yaw) * -1.31, yaw));
    phys.addBox(p.x, p.y + 1.2, p.z, 1.7, 1.5, 1.4, yaw);
  }
  {
    // Big grey boulder, lower left.
    const p = place(13, 9.0);
    const g = new THREE.IcosahedronGeometry(2.3, 2);
    const pos = g.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(pos, i);
      const k = 0.82 + 0.3 * Math.sin(v.x * 1.7 + 1) * Math.cos(v.z * 1.3) + R() * 0.06;
      v.multiplyScalar(k); v.y *= 0.72;
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    B.add('rock', g, trs(p.x, p.y + 0.9, p.z, 0.4, 1.15, 1, 1));
    phys.addBall(p.x, p.y + 0.6, p.z, 2.0);
  }

  // ---------------------------------------------------------------- side path round the north of the stupa
  if (L.sidePath.length > 1) B.add('path', ribbon(L.sidePath.map(xyz), 1.6, 0.05, 3));

  const group = B.build('entrance');
  const prims = BL.build('landmark-primitives');
  group.add(prims);

  // ---------------------------------------------------------------- the owner's models (Higgsfield, reduced)
  // Positions: the gate and stupa stay on their OSM footprints (way/344630686, way/344630942); the decoded
  // colour marks (docs/plan/entrance_features.json) put them within 0.3 m and 0.9 m of the same spots.
  const heroes: Hero[] = [];
  const loaded: string[] = [], failed: string[] = [];
  const swap = async (name: string, place: (o: THREE.Object3D) => void, hide: () => void) => {
    try {
      const o = await loadModel(name);
      place(o);
      group.add(o);
      hide();
      loaded.push(name);
    } catch (err) {
      failed.push(name);
      console.warn(`model ${name} failed to load, keeping the M1 version`, err);
    }
  };
  // Primitive meshes are merged per material across gate and stupa, so they are hidden together once
  // both models are in; if only one loads, both primitives stay (no landmark is ever missing).
  let landmarksIn = 0;
  const hidePrims = () => { if (++landmarksIn === 2) prims.visible = false; };
  const gateP = swap('gate', (o) => {
    o.position.set(L.gate.x, L.gate.y, L.gate.z);
    o.rotation.y = L.gate.yaw;
  }, hidePrims);
  const stupaP = swap('stupa', (o) => {
    o.position.set(st.x, sy, st.z);
  }, hidePrims);

  // Hero NPCs at real height, feet on the ground; capsules so the player cannot walk through them.
  const groundY = (x: number, z: number) => phys.groundAt(x, z, 400) ?? ground(x, z);
  const routeAt = (s: number): P3 => {
    let i = 1;
    while (i < along.length - 1 && along[i] < s) i++;
    const t = Math.min(1, Math.max(0, (s - along[i - 1]) / (along[i] - along[i - 1] || 1)));
    const a = pts[i - 1], b = pts[i];
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  };
  let sSpawn = 0, bestD = Infinity;
  pts.forEach((p, i) => { const d = Math.hypot(p[0] - L.spawn.x, p[2] - L.spawn.z); if (d < bestD) { bestD = d; sSpawn = along[i]; } });
  const offPath = (s: number, side: number, m: number): { x: number; z: number; yaw: number } => {
    const a = routeAt(s - 0.5), b = routeAt(s + 0.5), c = routeAt(s);
    const dx = b[0] - a[0], dz = b[2] - a[2], len = Math.hypot(dx, dz) || 1;
    const rx = -dz / len, rz = dx / len; // right of the walking direction
    return { x: c[0] + rx * side * m, z: c[2] + rz * side * m, yaw: Math.atan2(-dx, -dz) };
  };
  const heroSpecs: HeroSpec[] = [];
  {
    // The guide waits on the right verge a few steps up the path, facing down towards the player.
    const g = offPath(sSpawn + 6.5, 1, 1.75);
    heroSpecs.push({ name: 'char_guide', x: g.x, y: 0, z: g.z, yaw: g.yaw + Math.PI - 0.5 });
    // A trekker (the mountaineer) resting on the right verge just below the gate, looking across the
    // path at the stupa. (The left side is the dry-stone wall, which she would stand on.)
    const m = offPath(gateS - 3.2, 1, 1.9);
    heroSpecs.push({ name: 'char_mountaineer', x: m.x, y: 0, z: m.z, yaw: m.yaw + Math.PI / 2 });
    // The monk on the east edge of the stupa plaza, outside the kora lane, facing the stupa.
    const mx = st.x + L.plaza.w / 2 - 0.5, mz = st.z + 2.5;
    heroSpecs.push({ name: 'char_monk', x: mx, y: 0, z: mz, yaw: Math.atan2(-(st.x - mx), -(st.z - mz)) });
    // The lodge owner in front of the lodge nearest the plaza, facing the stupa.
    let lodge = L.lodges[0], ld = Infinity;
    for (const l of L.lodges) { const d = Math.hypot(l.x - st.x, l.z - st.z); if (d < ld) { ld = d; lodge = l; } }
    if (lodge) {
      const dx = st.x - lodge.x, dz = st.z - lodge.z, len = Math.hypot(dx, dz) || 1;
      const r = Math.max(lodge.w, lodge.d) / 2 + 1.1;
      const ox = lodge.x + (dx / len) * r, oz = lodge.z + (dz / len) * r;
      heroSpecs.push({ name: 'char_lodge', x: ox, y: 0, z: oz, yaw: Math.atan2(-dx, -dz) });
    }
  }
  const heroP = Promise.all(heroSpecs.map(async (h, i) => {
    try {
      const o = await loadModel(h.name);
      h.y = groundY(h.x, h.z);
      const hero = new Hero(h, o, i * 1.37);
      heroes.push(hero);
      group.add(hero.root);
      phys.addCylinder(h.x, h.y + 0.87, h.z, 0.6, 0.27);
      loaded.push(h.name);
    } catch (err) {
      failed.push(h.name);
      console.warn(`model ${h.name} failed to load`, err);
    }
  }));
  const modelsReady = Promise.all([gateP, stupaP, heroP]).then(() => ({ loaded, failed, heroes: heroSpecs }));
  const updateHeroes = (t: number, dt: number, player: THREE.Vector3) => { for (const h of heroes) h.update(t, dt, player); };

  // ---------------------------------------------------------------- prayer flags (instanced)
  const lungta = [0x2a5fc4, 0xf4f1e8, 0xc8281e, 0x2f8f3c, 0xf0c419]; // blue, white, red, green, yellow
  const flagGeo = new THREE.PlaneGeometry(0.26, 0.32).translate(0, -0.16, 0);
  const flagMat = new THREE.MeshStandardMaterial({ roughness: 0.9, side: THREE.DoubleSide });
  type F = { p: THREE.Vector3; yaw: number; phase: number };
  const flagList: F[] = [];
  const lineVerts: number[] = [];
  const top = stupaTop.clone().setY(stupaTop.y - 0.5);
  for (const a of anchors) {
    const d = a.distanceTo(top);
    const n = Math.floor(d / 0.36);
    const yaw = Math.atan2(a.x - top.x, a.z - top.z) + Math.PI / 2;
    let prev = top.clone();
    for (let k = 1; k <= n; k++) {
      const t = k / (n + 1);
      const p = new THREE.Vector3().lerpVectors(top, a, t);
      p.y -= Math.sin(Math.PI * t) * d * 0.06; // sag
      flagList.push({ p, yaw, phase: R() * Math.PI * 2 });
      lineVerts.push(prev.x, prev.y, prev.z, p.x, p.y, p.z);
      prev = p;
    }
    lineVerts.push(prev.x, prev.y, prev.z, a.x, a.y, a.z);
  }
  const flags = new THREE.InstancedMesh(flagGeo, flagMat, flagList.length);
  flags.name = 'prayer-flags';
  flags.castShadow = true;
  const col = new THREE.Color();
  flagList.forEach((_, i) => flags.setColorAt(i, col.set(lungta[i % 5])));
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(lineVerts, 3));
  const lines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ color: 0x3a3530 }));
  lines.name = 'flag-strings';
  group.add(flags, lines);
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
  const updateFlags = (t: number) => {
    for (let i = 0; i < flagList.length; i++) {
      const f = flagList[i];
      const sway = Math.sin(t * 2.3 + f.phase) * 0.35 + Math.sin(t * 5.1 + f.phase * 2) * 0.12;
      e.set(sway * 0.8, f.yaw + sway * 0.3, 0, 'YXZ');
      mtx.compose(f.p, q.setFromEuler(e), one);
      flags.setMatrixAt(i, mtx);
    }
    flags.instanceMatrix.needsUpdate = true;
  };
  updateFlags(0);

  return { group, flags, updateFlags, triangles: B.triangles + BL.triangles + flagList.length * 2, stupaTop, modelsReady, updateHeroes };
}
