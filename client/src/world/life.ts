// M2.5 life (no AI yet): prayer flags on the rooftops and across the lanes, fluttering on a GPU wind shader;
// villagers and trekkers walking the lanes, the entrance trail and the kora; porters with doko baskets; two
// yak trains with herders; chimney smoke; choughs circling; laundry in the wind; turning prayer wheels in the
// pavilions the owner marked yellow. People are Quaternius CC0 outfits on the Universal Animation Library
// skeleton (Walk_Loop and Idle_Loop shared); yaks are the Quaternius CC0 cow, darkened and given a hump-less
// yak colouring (a stand-in until a yak model exists).
import * as THREE from 'three/webgpu';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { attribute, cos, float, instanceIndex, positionLocal, sin, texture, time, uv, vec3 } from 'three/tsl';
import { rng } from '../core/rng';
import type { BuildingHandles } from './buildings';
import type { Grid, Layout } from './layout';
import { inGrid, sampleGrid } from './layout';
import type { Physics } from './physics';

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const LUNGTA = [0x2a5fc4, 0xf4f1e8, 0xc8281e, 0x2f8f3c, 0xf0c419]; // blue, white, red, green, yellow

/** Cloth on a wind shader: hangs from its top edge, ripples more towards the free edge. */
function clothMaterial(amp: number): THREE.MeshStandardNodeMaterial {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.9, side: THREE.DoubleSide });
  const ph = float(instanceIndex).mul(0.71);
  const hang = positionLocal.y.negate().max(0); // 0 at the string, grows downwards
  const wave = sin(time.mul(6.0).add(ph).add(positionLocal.x.mul(9))).mul(hang).mul(amp);
  const gust = sin(time.mul(1.3).add(ph.mul(0.3))).mul(0.5).add(0.6);
  m.positionNode = positionLocal.add(vec3(0, cos(time.mul(5).add(ph)).mul(hang).mul(amp * 0.25), wave.mul(gust)));
  return m;
}

export interface LifeHandles {
  group: THREE.Group;
  update(dt: number, t: number, camera: THREE.Camera, player: THREE.Vector3): void;
  counts: Record<string, number>;
  /** For audio: yak positions, people near a point. */
  yaks(): THREE.Vector3[];
  peopleNear(p: THREE.Vector3, r: number): number;
  streams: THREE.Vector3[];
}

type Walker = {
  root: THREE.Object3D; mixer: THREE.AnimationMixer; pts: THREE.Vector3[]; s: number; dir: number; speed: number;
  len: number; cum: number[]; loop: boolean; idle?: THREE.AnimationAction; walk: THREE.AnimationAction; meshes: THREE.Mesh[];
  pause: number; offset: number;
};

export async function buildLife(L: Layout, near: Grid, mid: Grid, town: BuildingHandles, lanes: [number, number][][],
  phys: Physics): Promise<LifeHandles> {
  const group = new THREE.Group(); group.name = 'life';
  const R = rng(909);
  const groundAt = (x: number, z: number) => inGrid(near, x, z, 1) ? sampleGrid(near, x, z) : sampleGrid(mid, x, z);
  const counts: Record<string, number> = {};
  const cx = town.rects.reduce((a, r) => a + r.x, 0) / town.rects.length;
  const cz = town.rects.reduce((a, r) => a + r.z, 0) / town.rects.length;

  // ---------------------------------------------------------------- prayer flags and laundry (one instanced set)
  type Piece = { p: THREE.Vector3; yaw: number; c: number; w: number; h: number };
  const pieces: Piece[] = [];
  const strings: number[] = [];
  const hang = (a: THREE.Vector3, b: THREE.Vector3, colours: number[], w: number, h: number, gap: number, sag: number) => {
    const d = a.distanceTo(b); const n = Math.floor(d / gap);
    if (n < 2) return;
    const yaw = Math.atan2(b.x - a.x, b.z - a.z) + Math.PI / 2;
    let prev = a.clone();
    for (let k = 1; k <= n; k++) {
      const t = k / (n + 1);
      const p = new THREE.Vector3().lerpVectors(a, b, t); p.y -= Math.sin(Math.PI * t) * d * sag;
      pieces.push({ p, yaw, c: colours[(k + strings.length) % colours.length], w, h });
      strings.push(prev.x, prev.y, prev.z, p.x, p.y, p.z); prev = p;
    }
    strings.push(prev.x, prev.y, prev.z, b.x, b.y, b.z);
  };
  // Rooftops: a pole on the ridge with strings to two eave corners, on about half the houses.
  town.rects.forEach((r, i) => {
    if (R() > 0.5) return;
    const c = town.roofCorners.slice(i * 4, i * 4 + 4);
    if (c.length < 4) return;
    const top = new THREE.Vector3(r.x, r.top + 2.6, r.z);
    hang(top, c[Math.floor(R() * 4)], LUNGTA, 0.24, 0.3, 0.34, 0.04);
    hang(top, c[Math.floor(R() * 4)], LUNGTA, 0.24, 0.3, 0.34, 0.04);
  });
  // Across the lanes: from a roof corner on one side to the nearest roof corner on the other side.
  let across = 0;
  for (const pl of lanes) {
    for (let i = 4; i < pl.length - 4; i += 28) {
      const [x, z] = pl[i];
      const dx = pl[i + 1][0] - pl[i - 1][0], dz = pl[i + 1][1] - pl[i - 1][1], len = Math.hypot(dx, dz) || 1;
      const nx = -dz / len, nz = dx / len;
      let best: [THREE.Vector3 | null, THREE.Vector3 | null] = [null, null], bd = [14, 14];
      for (const c of town.roofCorners) {
        const ox = c.x - x, oz = c.z - z, dist = Math.hypot(ox, oz);
        if (dist > 14) continue;
        const side = ox * nx + oz * nz > 0 ? 0 : 1;
        if (dist < bd[side]) { bd[side] = dist; best[side] = c; }
      }
      if (best[0] && best[1]) { hang(best[0], best[1], LUNGTA, 0.26, 0.32, 0.36, 0.06); across++; }
    }
  }
  // Laundry: a line on the terrace of some houses (shirts, a chuba, socks in bright colours).
  let laundry = 0;
  for (const dpt of town.doors) {
    if (R() > 0.12) continue;
    const a = dpt.clone().add(new THREE.Vector3(R() - 0.5, 1.9, R() - 0.5).multiplyScalar(1));
    a.y = dpt.y + 1.9;
    const yaw = R() * Math.PI;
    const b = a.clone().add(new THREE.Vector3(Math.cos(yaw) * 3, 0, Math.sin(yaw) * 3));
    hang(a, b, [0xd2453a, 0x2f6fb5, 0xe8c03a, 0xf1ece0, 0x7a3a8f, 0x3f8f5a], 0.5, 0.65, 0.6, 0.03);
    laundry++;
  }
  const flagGeo = new THREE.PlaneGeometry(1, 1, 4, 3).translate(0, -0.5, 0);
  const flagMat = clothMaterial(0.35);
  const flags = new THREE.InstancedMesh(flagGeo, flagMat, pieces.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), sc = new THREE.Vector3(), col = new THREE.Color();
  pieces.forEach((f, i) => {
    flags.setMatrixAt(i, m4.compose(f.p, q.setFromAxisAngle(up, f.yaw), sc.set(f.w, f.h, 1)));
    flags.setColorAt(i, col.set(f.c));
  });
  flags.instanceMatrix.needsUpdate = true; flags.computeBoundingSphere(); flags.name = 'life:flags';
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(strings, 3));
  const lines = new THREE.LineSegments(sg, new THREE.LineBasicMaterial({ color: 0x3a3530 })); lines.name = 'life:strings';
  group.add(flags, lines);
  counts.flags = pieces.length; counts.flagStringsAcrossLanes = across; counts.laundryLines = laundry;

  // ---------------------------------------------------------------- prayer-wheel pavilions (yellow marks)
  const wheels: THREE.Mesh[] = [];
  {
    const feats = await (await fetch('assets/entrance/features.json')).json() as { features: { id: string; kind: string; center: [number, number] | null; yawDeg: number | null }[] };
    const drumTex = (() => {
      const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d')!;
      g.fillStyle = '#9e2a22'; g.fillRect(0, 0, 256, 128);
      g.fillStyle = '#d9a63a'; g.fillRect(0, 0, 256, 14); g.fillRect(0, 114, 256, 14); g.fillRect(0, 56, 256, 6);
      g.fillStyle = '#f0d27a'; g.font = 'bold 30px serif';
      for (let k = 0; k < 6; k++) g.fillText('ༀ', 10 + k * 42, 46);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; return t;
    })();
    const drumMat = new THREE.MeshStandardMaterial({ map: drumTex, roughness: 0.5, metalness: 0.2 });
    const post = new THREE.MeshStandardMaterial({ color: 0x5c1f1c, roughness: 0.8 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xb8462a, roughness: 0.7 });
    const trim = new THREE.MeshStandardMaterial({ color: 0x2d6a3e, roughness: 0.7 });
    for (const f of feats.features) {
      if (f.kind !== 'pavilion' || !f.center) continue;
      const [x, z] = f.center; const side = f.id === 'pavilion_side';
      const y = groundAt(x, z), s = side ? 3.0 : 2.5;
      const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = -THREE.MathUtils.degToRad(f.yawDeg ?? 0);
      for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.7, 0.18), post); p.position.set(a * s / 2, 1.35, b * s / 2); g.add(p);
      }
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(s + 0.4, 0.3, s + 0.4), new THREE.MeshStandardMaterial({ color: 0xbdb5a6, roughness: 0.95 }));
      plinth.position.y = 0.05; g.add(plinth);
      const band = new THREE.Mesh(new THREE.BoxGeometry(s + 0.5, 0.35, s + 0.5), trim); band.position.y = 2.85; g.add(band);
      const roof = new THREE.Mesh(new THREE.ConeGeometry((s + 1.4) / Math.SQRT2, 0.9, 4, 1, false, Math.PI / 4), roofMat); roof.position.y = 3.45; g.add(roof);
      const fin = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), new THREE.MeshStandardMaterial({ color: 0xd6a73a, metalness: 0.7, roughness: 0.35 }));
      fin.position.y = 3.95; g.add(fin);
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(side ? 0.65 : 0.5, side ? 0.65 : 0.5, side ? 1.8 : 1.5, 24), drumMat);
      drum.position.y = side ? 1.25 : 1.1; g.add(drum); wheels.push(drum);
      g.traverse((o) => { (o as THREE.Mesh).castShadow = true; (o as THREE.Mesh).receiveShadow = true; });
      group.add(g);
      if (!side) phys.addBox(x, y + 1.4, z, s / 2, 1.4, s / 2, -THREE.MathUtils.degToRad(f.yawDeg ?? 0));
    }
    counts.prayerWheels = wheels.length;
  }

  // ---------------------------------------------------------------- people
  const [anims, ...outfits] = await Promise.all(['anims', 'male_peasant', 'female_peasant', 'male_ranger', 'female_ranger']
    .map((n) => loader.loadAsync(`assets/people/${n}.glb`))) as GLTF[];
  const clip = (n: string) => anims.animations.find((a) => a.name === n)!;
  const CLOTHES = ['#d23b2c', '#e07a1f', '#e8b923', '#2b6cb0', '#1f8a8a', '#3f9142', '#8e3fa0', '#c2417a', '#7a2a24', '#f2ede0', '#4a6fd1', '#b0362e'];
  const walkers: Walker[] = [];
  const route3 = (pts: THREE.Vector3[]) => { const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1])); return cum; };
  const makePerson = (kind: 'local' | 'trekker' | 'porter' | 'herder') => {
    const src = outfits[kind === 'trekker' ? 2 + Math.floor(R() * 2) : Math.floor(R() * 2)];
    const root = SkeletonUtils.clone(src.scene);
    const box = new THREE.Box3().setFromObject(root); const h = box.max.y - box.min.y;
    root.scale.setScalar((1.55 + R() * 0.28) / h);
    const meshes: THREE.Mesh[] = [];
    const tint = new THREE.Color(CLOTHES[Math.floor(R() * CLOTHES.length)]);
    const tint2 = new THREE.Color(CLOTHES[Math.floor(R() * CLOTHES.length)]);
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.frustumCulled = false; m.castShadow = true; meshes.push(m);
      const mat = (m.material as THREE.MeshStandardMaterial).clone();
      // Clothes take a bright tint; skin keeps its colour. Legs get a second colour (trousers, chuba).
      if (!/Regular/i.test(mat.name)) mat.color.copy(/Legs/i.test(m.name) ? tint2 : tint).lerp(new THREE.Color(1, 1, 1), 0.25).multiplyScalar(1.25);
      m.material = mat;
    });
    if (kind === 'porter') {
      let spine: THREE.Object3D | undefined; root.traverse((o) => { if (o.name === 'spine_03') spine = o; });
      const basket = new THREE.Group();
      const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.22, 0.8, 12, 1, true), new THREE.MeshStandardMaterial({ color: 0x9b7643, roughness: 0.95, side: THREE.DoubleSide }));
      const load = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.35, 10), new THREE.MeshStandardMaterial({ color: R() < 0.5 ? 0x6b4a2e : 0xd9cfb8, roughness: 0.95 }));
      load.position.y = 0.5; basket.add(wick, load);
      if (spine) {
        const s = 1 / root.scale.x; basket.scale.setScalar(s);
        basket.position.set(0, 0.05 * s, -0.32 * s); basket.rotation.x = 0.25;
        spine.add(basket);
      }
    }
    const mixer = new THREE.AnimationMixer(root);
    const walk = mixer.clipAction(clip(kind === 'porter' ? 'Walk_Formal_Loop' : 'Walk_Loop'));
    walk.play(); walk.time = R() * 2;
    const idle = mixer.clipAction(clip('Idle_Loop'));
    group.add(root);
    return { root, mixer, walk, idle, meshes };
  };
  const addWalker = (kind: 'local' | 'trekker' | 'porter' | 'herder', pts: THREE.Vector3[], loop: boolean, speed: number, start = R()) => {
    if (pts.length < 2) return null;
    const p = makePerson(kind); const cum = route3(pts); const len = cum[cum.length - 1];
    const w: Walker = { ...p, pts, s: start * len, dir: R() < 0.5 ? 1 : -1, speed, len, cum, loop, pause: 0, offset: (R() - 0.5) * 0.8 };
    walkers.push(w); counts[kind] = (counts[kind] ?? 0) + 1;
    return w;
  };
  const ground3 = (pl: [number, number][], lift = 0) => pl.map(([x, z]) => new THREE.Vector3(x, groundAt(x, z) + lift, z));
  // Entrance trail: trekkers and porters going up and down between the bridge and the stupa.
  const trail = L.route.pts.map((p) => new THREE.Vector3(p[0], p[2] + 0.03, p[1]));
  for (let i = 0; i < 5; i++) addWalker('trekker', trail, false, 1.05 + R() * 0.3);
  for (let i = 0; i < 3; i++) addWalker('porter', trail, false, 0.7 + R() * 0.15);
  // Kora round the stupa, clockwise seen from above.
  {
    const st = L.stupa, hw = L.plaza.w / 2 - 1.5, hd = L.plaza.d / 2 - 1.2, y = L.plaza.y + 0.02;
    const k = [[0, hd], [-hw, hd], [-hw, -hd], [hw, -hd], [hw, hd], [0, hd]].map(([dx, dz]) => new THREE.Vector3(st.x + dx, y, st.z + dz));
    for (let i = 0; i < 5; i++) { const w = addWalker(i < 3 ? 'local' : 'trekker', k, true, 0.85 + R() * 0.25, i / 5); if (w) w.dir = 1; }
  }
  // Town lanes: longer lanes near the centre get locals, a few porters.
  const townLanes = lanes.filter((pl) => pl.length > 40 && Math.hypot(pl[0][0] - cx, pl[0][1] - cz) < 500);
  for (let i = 0; i < 26 && townLanes.length; i++) {
    const pl = townLanes[Math.floor(R() * townLanes.length)];
    addWalker(i % 7 === 0 ? 'porter' : R() < 0.75 ? 'local' : 'trekker', ground3(pl, 0.06), false, i % 7 === 0 ? 0.75 : 1.0 + R() * 0.35);
  }

  // ---------------------------------------------------------------- yak trains (CC0 cow as a stand-in, darkened)
  const yakGltf = await loader.loadAsync('assets/people/yak.glb');
  const yakWalk = yakGltf.animations.find((a) => /Walk$/.test(a.name)) ?? yakGltf.animations[0];
  type Yak = { root: THREE.Object3D; mixer: THREE.AnimationMixer; lead: Walker; gap: number };
  const yaks: Yak[] = [];
  const trains: [THREE.Vector3[], number][] = [[trail, 0.2]];
  if (townLanes.length) trains.push([ground3(townLanes[0], 0.06), 0.5]);
  for (const [pts, start] of trains) {
    const herder = addWalker('herder', pts, false, 0.75, start);
    if (!herder) continue;
    for (let k = 1; k <= 3; k++) {
      const root = SkeletonUtils.clone(yakGltf.scene);
      const b = new THREE.Box3().setFromObject(root); const len = Math.max(b.max.x - b.min.x, b.max.z - b.min.z);
      root.scale.setScalar(2.2 / len);
      root.traverse((o) => {
        const m = o as THREE.Mesh; if (!m.isMesh) return;
        m.castShadow = true; m.frustumCulled = false;
        const mat = (m.material as THREE.MeshStandardMaterial).clone();
        mat.color.set(/Pink/i.test(mat.name) ? 0x6b5a50 : /White/i.test(mat.name) ? (k === 2 ? 0x2a211c : 0x3b2e26) : 0x1a1512);
        m.material = mat;
      });
      const mixer = new THREE.AnimationMixer(root);
      if (yakWalk) { const a = mixer.clipAction(yakWalk); a.play(); a.time = k * 0.37; }
      group.add(root);
      yaks.push({ root, mixer, lead: herder, gap: k * 3.0 });
    }
  }
  counts.yaks = yaks.length;

  // ---------------------------------------------------------------- chimney smoke
  const smokeTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')!;
    const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(235,235,235,0.9)'); gr.addColorStop(1, 'rgba(235,235,235,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
  })();
  const chim = town.chimneys.slice().sort((a, b) => Math.hypot(a.x - L.stupa.x, a.z - L.stupa.z) - Math.hypot(b.x - L.stupa.x, b.z - L.stupa.z)).slice(0, 10);
  const PUFFS = 14;
  const smokeMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
  const fade = new THREE.InstancedBufferAttribute(new Float32Array(chim.length * PUFFS), 1);
  smokeMat.colorNode = vec3(0.86, 0.86, 0.85);
  smokeMat.opacityNode = texture(smokeTex, uv()).a.mul(attribute('fade', 'float'));
  const smokeGeo = new THREE.PlaneGeometry(1, 1); smokeGeo.setAttribute('fade', fade);
  const smoke = new THREE.InstancedMesh(smokeGeo, smokeMat, chim.length * PUFFS);
  smoke.frustumCulled = false; smoke.name = 'life:smoke'; smoke.renderOrder = 3;
  group.add(smoke); counts.smokingChimneys = chim.length;

  // ---------------------------------------------------------------- choughs circling
  const birdGeo = new THREE.BufferGeometry();
  birdGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.15, -0.45, 0.08, -0.05, 0, 0, -0.1, 0, 0, 0.15, 0, 0, -0.1, 0.45, 0.08, -0.05], 3));
  birdGeo.computeVertexNormals();
  const birds = new THREE.InstancedMesh(birdGeo, new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.DoubleSide }), 12);
  birds.frustumCulled = false; birds.name = 'life:birds'; group.add(birds);
  const birdPhase = Array.from({ length: 12 }, () => [R() * 6.28, 40 + R() * 60, 25 + R() * 35, 0.15 + R() * 0.1] as const);
  counts.birds = 12;

  // ---------------------------------------------------------------- update
  const tmp = new THREE.Vector3(), camQ = new THREE.Quaternion(), e = new THREE.Euler();
  const placeOn = (w: Walker, s: number, out: THREE.Vector3): number => {
    let i = 1; while (i < w.cum.length - 1 && w.cum[i] < s) i++;
    const a = w.pts[i - 1], b = w.pts[i], t = Math.min(1, Math.max(0, (s - w.cum[i - 1]) / ((w.cum[i] - w.cum[i - 1]) || 1)));
    out.lerpVectors(a, b, t);
    return Math.atan2(b.x - a.x, b.z - a.z);
  };
  const update = (dt: number, t: number, camera: THREE.Camera, player: THREE.Vector3) => {
    for (const w of walkers) {
      const d = w.root.position.distanceTo(player);
      const far = d > 260;
      w.root.visible = !far;
      if (far) { w.s += w.speed * dt * w.dir; } else {
        w.s += w.speed * dt * w.dir;
      }
      if (w.loop) { w.s = ((w.s % w.len) + w.len) % w.len; } else if (w.s > w.len || w.s < 0) { w.dir *= -1; w.s = Math.min(w.len, Math.max(0, w.s)); }
      let yaw = placeOn(w, w.s, tmp);
      if (w.dir < 0) yaw += Math.PI;
      // Keep to one side of the lane.
      tmp.x += Math.cos(yaw) * w.offset; tmp.z -= Math.sin(yaw) * w.offset;
      w.root.position.copy(tmp);
      w.root.rotation.y = yaw;
      if (!far && d < 140) { w.walk.timeScale = w.speed / 1.25; w.mixer.update(dt); }
      for (const m of w.meshes) m.castShadow = d < 45;
    }
    for (const y of yaks) {
      const s = Math.min(y.lead.len, Math.max(0, y.lead.s - y.gap * y.lead.dir));
      let yaw = placeOn(y.lead, s, tmp); if (y.lead.dir < 0) yaw += Math.PI;
      y.root.position.copy(tmp); y.root.rotation.y = yaw;
      if (y.root.position.distanceTo(player) < 160) y.mixer.update(dt * 0.9);
    }
    for (const wh of wheels) wh.rotation.y += dt * 0.9;
    // Smoke: puffs rise 6 m, drift with the wind to the north-west, grow and fade; always face the camera.
    camera.getWorldQuaternion(camQ);
    chim.forEach((c, ci) => {
      for (let k = 0; k < PUFFS; k++) {
        const life = ((t * 0.12 + k / PUFFS + ci * 0.137) % 1);
        tmp.set(c.x - life * 3.5, c.y + life * 7, c.z - life * 2.2);
        const s2 = 0.5 + life * 2.6;
        smoke.setMatrixAt(ci * PUFFS + k, m4.compose(tmp, camQ, sc.set(s2, s2, s2)));
        fade.setX(ci * PUFFS + k, Math.sin(Math.PI * life) * 0.38);
      }
    });
    smoke.instanceMatrix.needsUpdate = true; fade.needsUpdate = true;
    birdPhase.forEach(([ph, r, hgt, spd], i) => {
      const a = ph + t * spd;
      tmp.set(cx + Math.cos(a) * r * 2, groundAt(cx, cz) + 110 + hgt + Math.sin(t * 0.7 + ph) * 6, cz + Math.sin(a) * r * 2);
      e.set(0, -a, 0); q.setFromEuler(e);
      const flap = 0.6 + 0.4 * Math.sin(t * 9 + ph * 3);
      birds.setMatrixAt(i, m4.compose(tmp, q, sc.set(1.6, flap * 1.6, 1.6)));
    });
    birds.instanceMatrix.needsUpdate = true;
  };
  const yakPos = () => yaks.map((y) => y.root.position);
  const peopleNear = (p: THREE.Vector3, r: number) => walkers.reduce((n, w) => n + (w.root.position.distanceTo(p) < r ? 1 : 0), 0);
  const streams = L.water.flatMap((w) => w.pts.map((p) => new THREE.Vector3(p[0], p[2], p[1])));
  counts.people = walkers.length;
  return { group, update, counts, yaks: yakPos, peopleNear, streams };
}
