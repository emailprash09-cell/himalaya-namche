// Procedural textures drawn on canvases at load. No photo is ever used as a texture.
import * as THREE from 'three/webgpu';
import { rng } from '../core/rng';

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')!];
}

function finish(c: HTMLCanvasElement, repeat = true, srgb = true): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

/** Grey-ish multi-scale noise, centred on mid grey, multiplied over vertex colours. */
export function detailNoise(size = 256, seed = 7): THREE.CanvasTexture {
  const [c, g] = canvas(size, size);
  const img = g.createImageData(size, size);
  const r = rng(seed);
  const base = new Float32Array(size * size).map(() => r());
  const at = (x: number, y: number) => base[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let v = 0;
    v += at(x, y) * 0.35;
    v += (at(x >> 1, y >> 1) + at((x >> 1) + 1, y >> 1)) * 0.2;
    v += at(x >> 3, y >> 3) * 0.25;
    const k = Math.round(222 + (v - 0.5) * 80);
    const i = (y * size + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.max(0, Math.min(255, k));
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return finish(c, true, false);
}

/** Grey flagstones in irregular courses (seamless), about 3 x 3 m per tile at the path's UV scale. */
export function flagstones(size = 512, seed = 11, tint = [148, 146, 140]): THREE.CanvasTexture {
  const [c, g] = canvas(size, size);
  g.fillStyle = '#3f3c37'; g.fillRect(0, 0, size, size);
  const r = rng(seed);
  // Row heights that add up to the tile so it repeats vertically.
  const hs: number[] = [];
  let tot = 0;
  while (tot < size - 40) { const h = 46 + r() * 52; hs.push(h); tot += h; }
  const k0 = size / tot;
  let y = 0;
  for (const h0 of hs) {
    const rh = h0 * k0;
    let x = -r() * 80;
    const x0 = x;
    while (x < x0 + size) {
      const w = rh * (0.8 + r() * 1.5);
      const k = 0.78 + r() * 0.34, warm = (r() - 0.5) * 14;
      const col = `rgb(${Math.round(tint[0] * k + warm)},${Math.round(tint[1] * k + warm * 0.6)},${Math.round(tint[2] * k)})`;
      const j = () => 3 + r() * 7;
      const quad = [[x + j(), y + j()], [x + w - j(), y + j()], [x + w - j(), y + rh - j()], [x + j(), y + rh - j()]];
      for (const off of [0, size, -size]) {
        g.fillStyle = col;
        g.beginPath();
        quad.forEach(([qx, qy], i) => (i ? g.lineTo(qx + off, qy) : g.moveTo(qx + off, qy)));
        g.closePath(); g.fill();
      }
      for (let s = 0; s < 30; s++) {
        g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${0.04 + r() * 0.06})`;
        const sx = (x + r() * w + size) % size;
        g.fillRect(sx, y + r() * rh, 2 + r() * 6, 2 + r() * 4);
      }
      x += w;
    }
    y += rh;
  }
  return finish(c);
}

/** Dry-stone wall of grey blocks. */
export function stoneWall(size = 256, seed = 23): THREE.CanvasTexture {
  const [c, g] = canvas(size, size);
  g.fillStyle = '#3a3835'; g.fillRect(0, 0, size, size);
  const r = rng(seed);
  let y = 0;
  while (y < size) {
    const h = 18 + r() * 22;
    let x = -r() * 30;
    while (x < size) {
      const w = 26 + r() * 46;
      const k = 0.75 + r() * 0.4;
      g.fillStyle = `rgb(${Math.round(140 * k)},${Math.round(136 * k)},${Math.round(126 * k)})`;
      g.beginPath();
      const rr = 6;
      g.roundRect(x + 2, y + 2, w - 4, h - 4, rr);
      g.fill();
      x += w;
    }
    y += h;
  }
  return finish(c);
}

/** Whitewash with faint streaks. */
export function whitewash(size = 256, seed = 31): THREE.CanvasTexture {
  const [c, g] = canvas(size, size);
  g.fillStyle = '#f2efe7'; g.fillRect(0, 0, size, size);
  const r = rng(seed);
  for (let i = 0; i < 260; i++) {
    g.fillStyle = `rgba(${r() < 0.7 ? '120,110,95' : '255,255,255'},${0.02 + r() * 0.04})`;
    g.fillRect(r() * size, r() * size, 1 + r() * 3, 8 + r() * 50);
  }
  return finish(c);
}

/**
 * The painted box under a stupa spire: on each face, the eyes of the Buddha and the
 * curl between them, in the conventional style. Drawn plainly and respectfully.
 */
export function stupaEyes(): THREE.CanvasTexture {
  const [c, g] = canvas(512, 256);
  g.fillStyle = '#e9c35a'; g.fillRect(0, 0, 512, 256);
  g.fillStyle = '#b8862a'; g.fillRect(0, 0, 512, 10); g.fillRect(0, 246, 512, 10);
  const eye = (cx: number, flip: number) => {
    g.save(); g.translate(cx, 110); g.scale(flip, 1);
    // brow
    g.strokeStyle = '#1c1a18'; g.lineWidth = 9; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-70, -30); g.quadraticCurveTo(0, -78, 70, -40); g.stroke();
    // eye white and outline
    g.fillStyle = '#fbf8f0';
    g.beginPath(); g.moveTo(-72, 8); g.quadraticCurveTo(0, -38, 72, 2); g.quadraticCurveTo(10, 34, -72, 8); g.fill();
    g.lineWidth = 6; g.stroke();
    // iris, lowered gaze
    g.fillStyle = '#2a4f8c';
    g.beginPath(); g.arc(4, 4, 15, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#111'; g.beginPath(); g.arc(4, 5, 7, 0, Math.PI * 2); g.fill();
    g.restore();
  };
  eye(150, 1);
  eye(362, -1);
  // the curl between the eyes, and the dot above
  g.strokeStyle = '#2a5ea8'; g.lineWidth = 10; g.lineCap = 'round';
  g.beginPath();
  g.moveTo(256, 110); g.bezierCurveTo(232, 140, 236, 178, 262, 186); g.bezierCurveTo(284, 192, 286, 168, 270, 164);
  g.stroke();
  g.fillStyle = '#c4301e'; g.beginPath(); g.arc(256, 84, 8, 0, Math.PI * 2); g.fill();
  return finish(c, false);
}

/** Painted frieze for the gate: maroon ground, three red script panels, gold edging. */
export function gateFrieze(): THREE.CanvasTexture {
  const [c, g] = canvas(512, 64);
  g.fillStyle = '#5a1d1a'; g.fillRect(0, 0, 512, 64);
  g.fillStyle = '#d4a63a'; g.fillRect(0, 0, 512, 5); g.fillRect(0, 59, 512, 5);
  const r = rng(5);
  for (let k = 0; k < 3; k++) {
    const x = 26 + k * 162;
    g.fillStyle = '#b8261d'; g.fillRect(x, 12, 136, 40);
    g.fillStyle = '#f0d27a';
    for (let s = 0; s < 9; s++) g.fillRect(x + 10 + s * 14, 22 + r() * 4, 8, 18 - r() * 6);
  }
  for (let x = 0; x < 512; x += 16) { g.fillStyle = x % 32 ? '#2e6db0' : '#3b9a52'; g.fillRect(x, 5, 8, 6); }
  return finish(c, false);
}

/** Tin roof ridges. */
export function corrugated(): THREE.CanvasTexture {
  const [c, g] = canvas(64, 64);
  for (let x = 0; x < 64; x++) {
    const v = 150 + Math.round(Math.sin((x / 64) * Math.PI * 8) * 40);
    g.fillStyle = `rgb(${v},${v + 2},${v + 6})`; g.fillRect(x, 0, 1, 64);
  }
  return finish(c, true, false);
}
