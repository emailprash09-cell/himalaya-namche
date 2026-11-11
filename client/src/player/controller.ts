// Kinematic capsule on Rapier's character controller. Fixed 60 Hz step; the render interpolates.
import type RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three/webgpu';
import { PLAYER } from '../config/game';
import type { Input } from '../core/input';
import { jumpSpeed, stepHorizontal, type Vec2 } from '../sim/locomotion';
import type { Physics } from '../world/physics';

export class PlayerController {
  readonly body: RAPIER.RigidBody;
  readonly collider: RAPIER.Collider;
  private readonly kcc: RAPIER.KinematicCharacterController;
  private v: Vec2 = { x: 0, z: 0 };
  private vy = 0;
  private sinceGrounded = 0;
  grounded = false;
  yaw = 0;
  /** Feet position now and at the previous fixed step, for render interpolation. */
  readonly feet = new THREE.Vector3();
  readonly prevFeet = new THREE.Vector3();
  readonly halfHeight = PLAYER.height / 2 - PLAYER.radius;
  distanceWalked = 0;
  airTime = 0;

  constructor(phys: Physics, feet: THREE.Vector3, yaw: number) {
    const R = phys.R;
    this.yaw = yaw;
    const c = feet.clone().setY(feet.y + PLAYER.height / 2);
    this.body = phys.world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(c.x, c.y, c.z));
    this.collider = phys.world.createCollider(R.ColliderDesc.capsule(this.halfHeight, PLAYER.radius), this.body);
    this.kcc = phys.world.createCharacterController(0.02);
    this.kcc.enableAutostep(PLAYER.maxStep, 0.12, false);
    this.kcc.enableSnapToGround(PLAYER.snapToGround);
    this.kcc.setMaxSlopeClimbAngle(THREE.MathUtils.degToRad(PLAYER.maxSlopeDeg));
    this.kcc.setMinSlopeSlideAngle(THREE.MathUtils.degToRad(PLAYER.maxSlopeDeg + 6));
    this.kcc.setSlideEnabled(true);
    this.kcc.setApplyImpulsesToDynamicBodies(false);
    this.feet.copy(feet);
    this.prevFeet.copy(feet);
  }

  get speed(): number { return Math.hypot(this.v.x, this.v.z); }
  get velocity(): Readonly<Vec2> { return this.v; }

  teleport(feet: THREE.Vector3, yaw?: number): void {
    this.body.setTranslation({ x: feet.x, y: feet.y + PLAYER.height / 2, z: feet.z }, true);
    this.body.setNextKinematicTranslation({ x: feet.x, y: feet.y + PLAYER.height / 2, z: feet.z });
    this.feet.copy(feet); this.prevFeet.copy(feet);
    this.v = { x: 0, z: 0 }; this.vy = 0;
    if (yaw !== undefined) this.yaw = yaw;
  }

  fixedStep(dt: number, input: Input): void {
    this.prevFeet.copy(this.feet);
    this.v = stepHorizontal(this.v, input.intent, this.yaw, this.grounded, dt, PLAYER);
    if (this.grounded) this.sinceGrounded = 0; else this.sinceGrounded += dt;
    if (input.jumpQueued) {
      input.jumpQueued = false;
      if (this.grounded || this.sinceGrounded < PLAYER.coyoteTime) {
        this.vy = jumpSpeed(PLAYER);
        this.grounded = false;
        this.sinceGrounded = PLAYER.coyoteTime;
      }
    }
    // A small downward push keeps contact; snap-to-ground does the rest on descents. A large push
    // makes slow starts on a 20 % path resolve to no movement at all.
    if (this.grounded && this.vy <= 0) this.vy = -0.05;
    else this.vy -= PLAYER.gravity * dt;
    const want = { x: this.v.x * dt, y: this.vy * dt, z: this.v.z * dt };
    this.kcc.computeColliderMovement(this.collider, want);
    const got = this.kcc.computedMovement();
    const wasGrounded = this.grounded;
    this.grounded = this.kcc.computedGrounded();
    if (this.vy > 0 && got.y < want.y * 0.5) this.vy = 0;    // bumped a ceiling
    if (this.grounded && this.vy < 0) this.vy = 0;
    // Hard blocked (a wall dead ahead): bleed the velocity so we do not lurch when it clears.
    const wantH = Math.hypot(want.x, want.z), gotH = Math.hypot(got.x, got.z);
    if (wantH > 1e-4 && gotH < wantH * 0.15) { this.v.x *= 0.5; this.v.z *= 0.5; }
    const t = this.body.translation();
    const next = { x: t.x + got.x, y: t.y + got.y, z: t.z + got.z };
    this.body.setNextKinematicTranslation(next);
    this.feet.set(next.x, next.y - PLAYER.height / 2, next.z);
    this.distanceWalked += Math.hypot(got.x, got.z);
    this.airTime = this.grounded ? 0 : this.airTime + dt;
    if (!wasGrounded && this.grounded) this.sinceGrounded = 0;
  }

  /** Feet position for rendering, between the last two fixed steps. */
  renderFeet(alpha: number, out: THREE.Vector3): THREE.Vector3 {
    return out.lerpVectors(this.prevFeet, this.feet, alpha);
  }
}
