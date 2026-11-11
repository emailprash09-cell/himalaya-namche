// First person at the eyes, third person on a spring arm that never passes through colliders.
import type RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three/webgpu';
import { CAMERA, PLAYER } from '../config/game';
import type { Physics } from '../world/physics';

export type CamMode = 'fpp' | 'tpp';

export function verticalFov(hDeg: number, aspect: number): number {
  return THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(hDeg) / 2) / aspect));
}

export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  mode: CamMode = 'fpp';
  yaw = 0;
  pitch = 0;
  /** Current spring-arm length, smoothed. */
  arm: number = CAMERA.tpp.distance;
  /** Debug only: a fixed camera position that overrides both modes. */
  free: THREE.Vector3 | null = null;
  private readonly phys: Physics;
  private readonly ball: RAPIER.Ball;
  private readonly exclude: RAPIER.Collider;

  constructor(phys: Physics, playerCollider: RAPIER.Collider, aspect: number) {
    this.phys = phys;
    this.exclude = playerCollider;
    this.ball = new phys.R.Ball(CAMERA.tpp.probeRadius);
    this.camera = new THREE.PerspectiveCamera(verticalFov(CAMERA.fovHorizontalDeg, aspect), aspect, CAMERA.near, CAMERA.far);
    this.camera.rotation.order = 'YXZ';
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.fov = verticalFov(CAMERA.fovHorizontalDeg, aspect);
    this.camera.updateProjectionMatrix();
  }

  look(dx: number, dy: number): void {
    this.yaw -= dx * CAMERA.mouseSensitivity;
    this.pitch -= dy * CAMERA.mouseSensitivity;
    const lim = this.mode === 'fpp' ? 1.48 : 1.15;
    this.pitch = Math.max(-lim, Math.min(lim * (this.mode === 'fpp' ? 1 : 0.75), this.pitch));
  }

  toggle(): void {
    this.mode = this.mode === 'fpp' ? 'tpp' : 'fpp';
    this.pitch = Math.max(-1.1, Math.min(0.85, this.pitch));
  }

  /** Free length along a segment from `a` to `b`, keeping a probe sphere clear of colliders. */
  private sweep(a: THREE.Vector3, b: THREE.Vector3): number {
    const d = new THREE.Vector3().subVectors(b, a);
    const len = d.length();
    if (len < 1e-4) return 0;
    d.divideScalar(len);
    const hit = this.phys.world.castShape(
      { x: a.x, y: a.y, z: a.z }, { x: 0, y: 0, z: 0, w: 1 }, { x: d.x, y: d.y, z: d.z },
      this.ball, 0.02, len, true, undefined, undefined, this.exclude,
    );
    return hit ? Math.max(0, hit.time_of_impact) : len;
  }

  update(feet: THREE.Vector3, dt: number): { distanceToHead: number } {
    const cam = this.camera;
    cam.rotation.set(this.pitch, this.yaw, 0);
    if (this.free) { cam.position.copy(this.free); return { distanceToHead: 99 }; }
    const eye = new THREE.Vector3(feet.x, feet.y + PLAYER.eyeHeight, feet.z);
    if (this.mode === 'fpp') {
      cam.position.copy(eye);
      this.arm = CAMERA.tpp.distance;
      return { distanceToHead: 0 };
    }
    const T = CAMERA.tpp;
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const back = new THREE.Vector3(0, 0, 1).applyEuler(cam.rotation);
    const head = eye.clone().setY(eye.y + T.height * 0.4);
    // Shoulder pivot, then the arm behind it.
    const pivotWant = head.clone().addScaledVector(right, T.shoulder).setY(head.y + T.height * 0.6);
    const sideFree = this.sweep(head, pivotWant);
    const pivot = head.clone().lerp(pivotWant, Math.min(1, sideFree / head.distanceTo(pivotWant)));
    const armWant = pivot.clone().addScaledVector(back, T.distance);
    const free = Math.max(T.minDistance, this.sweep(pivot, armWant) - 0.05);
    // Pull in at once, ease back out.
    if (free < this.arm) this.arm = free;
    else this.arm += (free - this.arm) * (1 - Math.exp(-T.followLag * 0.35 * dt));
    cam.position.copy(pivot).addScaledVector(back, this.arm);
    return { distanceToHead: cam.position.distanceTo(head) };
  }
}
