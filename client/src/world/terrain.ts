// Terrain meshes from the baked grids: near (0.5 m, walkable), mid (5 m), far (110 m, the peaks).
import * as THREE from 'three/webgpu';
import { fbm2 } from '../core/rng';
import { detailNoise } from '../render/textures';
import { attribute, mix, positionWorld, texture, vec3 } from 'three/tsl';
import type { Grid, Layout } from './layout';

type ColourFn = (x: number, z: number, y: number, slope: number, i: number) => [number, number, number];
/** Splat weights per vertex: dirt, rock, scree, forest floor (grass is what is left). */
type SplatFn = (x: number, z: number, y: number, slope: number, i: number) => [number, number, number, number];

function gridGeometry(g: Grid, uvScale: number, colour: ColourFn, skip?: (x: number, z: number) => boolean, splat?: SplatFn): THREE.BufferGeometry {
  const { nx, nz, x0, z0, step, h } = g;
  const pos = new Float32Array(nx * nz * 3);
  const col = new Float32Array(nx * nz * 3);
  const uv = new Float32Array(nx * nz * 2);
  const sp = splat ? new Float32Array(nx * nz * 4) : null;
  for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
    const i = iz * nx + ix;
    const x = x0 + ix * step, z = z0 + iz * step, y = h[i];
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    uv[i * 2] = x / uvScale; uv[i * 2 + 1] = z / uvScale;
    const hx = h[iz * nx + Math.min(ix + 1, nx - 1)] - h[iz * nx + Math.max(ix - 1, 0)];
    const hz = h[Math.min(iz + 1, nz - 1) * nx + ix] - h[Math.max(iz - 1, 0) * nx + ix];
    const slope = Math.hypot(hx, hz) / (2 * step);
    const c = colour(x, z, y, slope, i);
    col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
    if (sp && splat) sp.set(splat(x, z, y, slope, i), i * 4);
  }
  const idx: number[] = [];
  for (let iz = 0; iz < nz - 1; iz++) for (let ix = 0; ix < nx - 1; ix++) {
    if (skip && skip(x0 + (ix + 0.5) * step, z0 + (iz + 0.5) * step)) continue;
    const a = iz * nx + ix, b = a + 1, c = a + nx, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  if (sp) geo.setAttribute('splat', new THREE.BufferAttribute(sp, 4));
  geo.setIndex(nx * nz > 65535 ? new THREE.BufferAttribute(new Uint32Array(idx), 1) : idx);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

const lin = (r: number, g: number, b: number): [number, number, number] => {
  const c = new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
  return [c.r, c.g, c.b];
};
const mix3 = (a: number[], b: number[], t: number): [number, number, number] =>
  [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

const GRASS = lin(92, 112, 52), GRASS2 = lin(118, 120, 62), DIRT = lin(132, 108, 80), DIRT2 = lin(110, 92, 70);
const ROCK = lin(112, 106, 98), BED = lin(70, 66, 60), FOREST = lin(48, 66, 34), ALPINE = lin(118, 104, 82);
const SNOW = lin(238, 242, 248), SCREE = lin(126, 122, 118);

export function buildTerrain(layout: Layout, near: Grid, mid: Grid, far: Grid, ground: Uint8Array): THREE.Group {
  const group = new THREE.Group();
  group.name = 'terrain';
  const detail = detailNoise(256, 7);
  const toReal = (y: number) => y / layout.scale + layout.hRef;

  const nearGeo = gridGeometry(near, 3, (x, z, _y, slope, i) => {
    const n = fbm2(x * 0.15, z * 0.15, 3);
    const t = ground[i];
    if (t === 1) return mix3(DIRT, DIRT2, n);
    if (t === 2) return lin(150, 146, 138);
    if (t === 3) return BED;
    if (t === 4 || slope > 0.9) return mix3(ROCK, DIRT2, n * 0.5);
    return mix3(GRASS, GRASS2, n);
  }, undefined, (x, z, _y, slope, i) => {
    const t = ground[i];
    const n = fbm2(x * 0.08, z * 0.08, 3);
    const dirt = t === 1 || t === 2 ? 1 : Math.max(0, (n - 0.62) * 2.2);
    const rock = t === 4 ? 1 : Math.min(1, Math.max(0, (slope - 0.7) * 2.5));
    const scree = t === 3 ? 1 : Math.min(1, Math.max(0, (slope - 0.5) * 1.5)) * 0.5 * (1 - rock);
    return [Math.min(1, dirt), rock, scree, 0];
  });
  const nearMat = splatMaterial(detail, 1);
  const nearMesh = new THREE.Mesh(nearGeo, nearMat);
  nearMesh.name = 'terrain-near';
  nearMesh.receiveShadow = true;
  group.add(nearMesh);

  const nearX1 = near.x0 + (near.nx - 1) * near.step, nearZ1 = near.z0 + (near.nz - 1) * near.step;
  const midGeo = gridGeometry(mid, 24, (x, z, y, slope) => {
    const n = fbm2(x * 0.02, z * 0.02, 4);
    const real = toReal(y);
    // Forest on the ridge above the town, grass and scrub terraces lower down.
    const forest = Math.min(1, Math.max(0, (real - 3560) / 80)) * (0.6 + 0.4 * n);
    let c = mix3(mix3(GRASS, GRASS2, n), FOREST, forest);
    if (slope > 1.1) c = mix3(c, ROCK, Math.min(1, (slope - 1.1) * 2));
    return c;
  }, (x, z) => x > near.x0 + 2 && x < nearX1 - 2 && z > near.z0 + 2 && z < nearZ1 - 2, (x, z, y, slope) => {
    const real = toReal(y);
    const n = fbm2(x * 0.02, z * 0.02, 4);
    const forest = Math.min(1, Math.max(0, (real - 3470) / 120)) * (0.6 + 0.4 * n);
    const rock = Math.min(1, Math.max(0, (slope - 0.9) * 2));
    const scree = Math.min(1, Math.max(0, (real - 4000) / 400));
    return [0, rock, scree, forest];
  });
  const midMat = splatMaterial(detail, 0.35);
  const midMesh = new THREE.Mesh(midGeo, midMat);
  midMesh.name = 'terrain-mid';
  midMesh.receiveShadow = true;
  group.add(midMesh);

  const midX1 = mid.x0 + (mid.nx - 1) * mid.step, midZ1 = mid.z0 + (mid.nz - 1) * mid.step;
  const farGeo = gridGeometry(far, 1e9, (x, z, y, slope) => {
    const real = toReal(y);
    const n = fbm2(x * 0.004, z * 0.004, 4);
    let c: [number, number, number];
    if (real < 4000) c = mix3(FOREST, mix3(GRASS, ALPINE, 0.5), Math.max(0, (real - 3600) / 400));
    else c = mix3(ALPINE, SCREE, Math.min(1, (real - 4000) / 900));
    const snowLine = 5050 + (n - 0.5) * 500;
    const snow = Math.min(1, Math.max(0, (real - snowLine) / 220)) * (slope < 1.25 ? 1 : 0.35);
    if (slope > 1.0) c = mix3(c, ROCK, Math.min(1, (slope - 1.0)) * (1 - snow));
    return mix3(c, SNOW, snow);
  }, (x, z) => x > mid.x0 + 120 && x < midX1 - 120 && z > mid.z0 + 120 && z < midZ1 - 120);
  const farMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
  const farMesh = new THREE.Mesh(farGeo, farMat);
  farMesh.name = 'terrain-far';
  group.add(farMesh);
  return group;
}

const tl = new THREE.TextureLoader();
function tex(name: string): THREE.Texture {
  const t = tl.load(`assets/tex/${name}.webp`);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
let texCache: Record<string, THREE.Texture> | null = null;

/** Terrain splatting (CC0 textures): grass, packed dirt, rock and scree by slope and ground type, forest floor
 *  darkening on the upper slopes, two scales mixed to hide tiling and a large noise for patchiness. */
function splatMaterial(detail: THREE.Texture, detailAmount: number): THREE.MeshStandardNodeMaterial {
  texCache ??= { grass: tex('grass_col'), mud: tex('mud_col'), rock: tex('rock_col') };
  const T = texCache;
  const w = attribute('splat', 'vec4');
  const uvA = positionWorld.xz.mul(1 / 3.5), uvB = positionWorld.xz.mul(1 / 13);
  const two = (t: THREE.Texture) => mix(texture(t, uvA).rgb, texture(t, uvB).rgb, 0.45);
  const grass = two(T.grass).mul(vec3(0.95, 1.0, 0.82));
  let col = mix(grass, two(T.mud), w.x);
  col = mix(col, grass.mul(vec3(0.55, 0.62, 0.5)), w.w);
  col = mix(col, two(T.rock).mul(1.05), w.z);
  col = mix(col, two(T.rock), w.y);
  const macro = texture(detail, positionWorld.xz.mul(1 / 60)).r;
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.97, metalness: 0 });
  m.colorNode = col.mul(mix(1, macro.mul(0.5).add(0.75), detailAmount));
  return m;
}
