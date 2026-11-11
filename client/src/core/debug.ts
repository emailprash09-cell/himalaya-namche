// ?test=1 exposes window.__NAMCHE__ so shots, the walk test and the perf run can drive the game.
import * as THREE from 'three/webgpu';
import type { Input } from './input';
import type { Hud } from '../ui/hud';
import type { Layout } from '../world/layout';
import type { Physics } from '../world/physics';
import type { PlayerController } from '../player/controller';
import type { CameraRig, CamMode } from '../player/camera';

interface Ctx {
  renderer: THREE.WebGPURenderer; scene: THREE.Scene; layout: Layout; player: PlayerController; rig: CameraRig;
  input: Input; hud: Hud; phys: Physics; backend: string; frameTimes: number[]; tris: () => number;
}

interface WalkOpts { sprint?: boolean; timeoutS?: number; radius?: number; mode?: CamMode }
interface WalkResult {
  reached: number; total: number; stuckAt: number | null; fellThrough: boolean; seconds: number;
  minClearance: number; maxBelowGround: number; path: number[][];
}

export function installDebug(c: Ctx) {
  let ready = false, loadMs = 0;
  let walk: null | {
    pts: [number, number][]; i: number; opts: WalkOpts; t: number; best: number; bestT: number;
    res: WalkResult; resolve: (r: WalkResult) => void;
  } = null;
  const last = { drawCalls: 0, triangles: 0, fps: 0 };

  const groundBelow = (x: number, y: number, z: number): number | null => {
    const ray = new c.phys.R.Ray({ x, y: y + 1.2, z }, { x: 0, y: -1, z: 0 });
    const hit = c.phys.world.castRay(ray, 60, true, undefined, undefined, c.player.collider);
    return hit ? y + 1.2 - hit.timeOfImpact : null;
  };

  const api = {
    get ready() { return ready; },
    get loadMs() { return loadMs; },
    backend: c.backend,
    layout: c.layout,
    quiet() { c.hud.quiet(); },
    setMode(m: CamMode) { if (c.rig.mode !== m) c.rig.toggle(); },
    look(yawDeg: number, pitchDeg: number) {
      c.rig.yaw = THREE.MathUtils.degToRad(yawDeg); c.rig.pitch = THREE.MathUtils.degToRad(pitchDeg);
    },
    ground(x: number, z: number) { return c.phys.groundAt(x, z, 60); },
    overlap(x: number, y: number, z: number, r: number) {
      const out: unknown[] = [];
      c.phys.world.intersectionsWithShape({ x, y, z }, { x: 0, y: 0, z: 0, w: 1 }, new c.phys.R.Ball(r), (col) => {
        out.push({ type: col.shapeType(), t: col.translation(), he: col.shapeType() === c.phys.R.ShapeType.Cuboid ? col.halfExtents() : null, player: col.handle === c.player.collider.handle });
        return true;
      });
      return out;
    },
    sweep(dist: number, up = 0) {
      const t = c.player.body.translation(), yaw = c.rig.yaw;
      const d = { x: -Math.sin(yaw), y: up, z: -Math.cos(yaw) };
      const h = c.phys.world.castShape({ x: t.x, y: t.y + 0.03, z: t.z }, { x: 0, y: 0, z: 0, w: 1 }, d, c.player.collider.shape, 0.0, dist, true, undefined, undefined, c.player.collider);
      if (!h) return null;
      const col = h.collider;
      return { toi: h.time_of_impact, n: h.normal1, w: h.witness1, type: col.shapeType(), t: col.translation(), he: col.shapeType() === c.phys.R.ShapeType.Cuboid ? col.halfExtents() : null };
    },
    kcc() { return (c.player as unknown as { kcc: unknown }).kcc; },
    hit(x: number, z: number) {
      const h = c.phys.world.castRay(new c.phys.R.Ray({ x, y: 60, z }, { x: 0, y: -1, z: 0 }), 200, true);
      if (!h) return null;
      const col = h.collider, t = col.translation(), r = col.rotation();
      const he = col.shapeType() === c.phys.R.ShapeType.Cuboid ? col.halfExtents() : null;
      return { y: 60 - h.timeOfImpact, type: col.shapeType(), t, r, he };
    },
    fly(x: number | null, y = 0, z = 0) { c.rig.free = x === null ? null : new THREE.Vector3(x, y, z); },
    teleport(x: number, z: number, yawDeg?: number) {
      const h = c.phys.world.castRay(new c.phys.R.Ray({ x, y: 300, z }, { x: 0, y: -1, z: 0 }), 1000, true, undefined, undefined, c.player.collider);
      const g = h ? 300 - h.timeOfImpact : 0;
      c.player.teleport(new THREE.Vector3(x, g + 0.05, z));
      if (yawDeg !== undefined) c.rig.yaw = THREE.MathUtils.degToRad(yawDeg);
    },
    state() {
      const f = c.player.feet;
      return { x: f.x, y: f.y, z: f.z, yawDeg: THREE.MathUtils.radToDeg(c.rig.yaw), mode: c.rig.mode,
        grounded: c.player.grounded, speed: c.player.speed, walked: c.player.distanceWalked,
        arm: c.rig.arm, cam: c.rig.camera.position.toArray().map((v) => +v.toFixed(3)) };
    },
    stats() {
      return { ...last, backend: c.backend, loadMs, staticColliders: c.phys.staticCount, sceneTris: c.tris() };
    },
    /** Average over the last `n` frames: fps, mean and 95th-percentile frame time. */
    frameStats(n = 240) {
      const t = c.frameTimes.slice(-n - 1);
      const d: number[] = [];
      for (let i = 1; i < t.length; i++) d.push(t[i] - t[i - 1]);
      d.sort((a, b) => a - b);
      const mean = d.reduce((a, b) => a + b, 0) / Math.max(1, d.length);
      return { frames: d.length, fps: 1000 / mean, meanMs: mean, p95Ms: d[Math.floor(d.length * 0.95)] ?? 0,
        drawCalls: last.drawCalls, triangles: last.triangles };
    },
    hold(intent: Partial<Input['intent']>) {
      c.input.override = true;
      Object.assign(c.input.intent, { forward: false, back: false, left: false, right: false, sprint: false }, intent);
    },
    jump() { c.input.jumpQueued = true; },
    release() { c.input.override = false; Object.assign(c.input.intent, { forward: false, back: false, left: false, right: false, sprint: false }); },
    /** Walk through waypoints [x, z] steering like a player. Resolves when done, stuck or timed out. */
    walkRoute(pts: [number, number][], opts: WalkOpts = {}): Promise<WalkResult> {
      if (opts.mode) api.setMode(opts.mode);
      return new Promise((resolve) => {
        c.input.override = true;
        walk = { pts, i: 0, opts, t: 0, best: Infinity, bestT: 0, resolve,
          res: { reached: 0, total: pts.length, stuckAt: null, fellThrough: false, seconds: 0, minClearance: Infinity, maxBelowGround: 0, path: [] } };
      });
    },
  };

  const finish = () => {
    if (!walk) return;
    api.release();
    const w = walk; walk = null;
    w.res.seconds = w.t;
    w.resolve(w.res);
  };

  const afterStep = (dt: number) => {
    if (!walk) return;
    const w = walk, f = c.player.feet;
    w.t += dt;
    const [tx, tz] = w.pts[w.i];
    const dist = Math.hypot(tx - f.x, tz - f.z);
    if (Math.round(w.t * 60) % 15 === 0) w.res.path.push([+f.x.toFixed(2), +f.y.toFixed(2), +f.z.toFixed(2), +c.player.speed.toFixed(2), w.i, +dist.toFixed(2)]);
    const g = groundBelow(f.x, f.y, f.z);
    if (g !== null) {
      w.res.maxBelowGround = Math.max(w.res.maxBelowGround, g - f.y);
      if (c.player.grounded) w.res.minClearance = Math.min(w.res.minClearance, f.y - g);
    }
    if (f.y < -200 || (g !== null && g - f.y > 0.6)) { w.res.fellThrough = true; finish(); return; }
    if (dist < (w.opts.radius ?? 0.8)) {
      w.i++; w.res.reached = w.i; w.best = Infinity; w.bestT = w.t;
      if (w.i >= w.pts.length) { finish(); return; }
      return;
    }
    if (dist < w.best - 0.25) { w.best = dist; w.bestT = w.t; }
    if (w.t - w.bestT > 5) { w.res.stuckAt = w.i; finish(); return; }
    if (w.t > (w.opts.timeoutS ?? 240)) { w.res.stuckAt = w.i; finish(); return; }
    const [nx, nz] = w.pts[w.i];
    c.rig.yaw = Math.atan2(-(nx - f.x), -(nz - f.z));
    c.input.intent.forward = true;
    c.input.intent.sprint = !!w.opts.sprint;
  };

  const afterFrame = (info: { drawCalls: number; triangles: number }, fps: number) => {
    last.drawCalls = info.drawCalls; last.triangles = info.triangles; last.fps = fps;
  };

  if (new URLSearchParams(location.search).has('test')) (window as unknown as { __NAMCHE__: typeof api }).__NAMCHE__ = api;
  return { afterStep, afterFrame, markReady(ms: number) { ready = true; loadMs = ms; } };
}
