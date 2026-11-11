// Pure locomotion rules: no three.js, no DOM. Deterministic given dt.

export interface MoveIntent {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
}

export interface LocoTuning {
  walkSpeed: number;
  sprintSpeed: number;
  accel: number;
  airAccel: number;
  jumpHeight: number;
  gravity: number;
}

export interface Vec2 { x: number; z: number }

/** Unit direction in the world for the intent, given the facing yaw (0 looks towards -z, north). */
export function wishDirection(intent: MoveIntent, yaw: number): Vec2 {
  const f = (intent.forward ? 1 : 0) - (intent.back ? 1 : 0);
  const s = (intent.right ? 1 : 0) - (intent.left ? 1 : 0);
  if (f === 0 && s === 0) return { x: 0, z: 0 };
  // Forward is -z rotated by yaw; right is +x rotated by yaw.
  const sin = Math.sin(yaw), cos = Math.cos(yaw);
  let x = -sin * f + cos * s;
  let z = -cos * f - sin * s;
  const len = Math.hypot(x, z);
  x /= len; z /= len;
  return { x, z };
}

/** Target speed: sprint only counts when moving forwards. */
export function targetSpeed(intent: MoveIntent, t: LocoTuning): number {
  const moving = intent.forward || intent.back || intent.left || intent.right;
  if (!moving) return 0;
  return intent.sprint && intent.forward && !intent.back ? t.sprintSpeed : t.walkSpeed;
}

/** Move the horizontal velocity towards the wish velocity with a bounded acceleration. */
export function stepHorizontal(v: Vec2, intent: MoveIntent, yaw: number, grounded: boolean, dt: number, t: LocoTuning): Vec2 {
  const dir = wishDirection(intent, yaw);
  const speed = targetSpeed(intent, t);
  const tx = dir.x * speed, tz = dir.z * speed;
  const a = (grounded ? t.accel : t.airAccel) * dt;
  const dx = tx - v.x, dz = tz - v.z;
  const d = Math.hypot(dx, dz);
  if (d <= a || d === 0) return { x: tx, z: tz };
  return { x: v.x + (dx / d) * a, z: v.z + (dz / d) * a };
}

/** Initial upward speed that lifts the soles by `jumpHeight` under `gravity`. */
export function jumpSpeed(t: LocoTuning): number {
  return Math.sqrt(2 * t.gravity * t.jumpHeight);
}
