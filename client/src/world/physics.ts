// Rapier world with the static colliders of the entrance. Everything here is fixed geometry.
import RAPIER from '@dimforge/rapier3d-compat';
import type { Grid } from './layout';

export type Rapier = typeof RAPIER;

export class Physics {
  readonly R: Rapier;
  readonly world: RAPIER.World;
  private readonly fixed: RAPIER.RigidBody;
  staticCount = 0;

  private constructor(R: Rapier) {
    this.R = R;
    this.world = new R.World({ x: 0, y: -9.81, z: 0 });
    this.fixed = this.world.createRigidBody(R.RigidBodyDesc.fixed());
  }

  static async create(): Promise<Physics> {
    await RAPIER.init();
    return new Physics(RAPIER);
  }

  /** Heightfield collider for a baked grid (rows along z, columns along x, column-major heights). */
  addHeightfield(g: Grid): void {
    const R = this.R;
    const heights = new Float32Array(g.nx * g.nz);
    let k = 0;
    for (let ix = 0; ix < g.nx; ix++) for (let iz = 0; iz < g.nz; iz++) heights[k++] = g.h[iz * g.nx + ix];
    const sx = (g.nx - 1) * g.step, sz = (g.nz - 1) * g.step;
    const desc = R.ColliderDesc.heightfield(g.nz - 1, g.nx - 1, heights, { x: sx, y: 1, z: sz })
      .setTranslation(g.x0 + sx / 2, 0, g.z0 + sz / 2)
      .setFriction(0.8);
    this.world.createCollider(desc, this.fixed);
    this.staticCount++;
  }

  /** Box by centre, half extents, yaw about y and pitch about the box's own x (YXZ order). */
  addBox(x: number, y: number, z: number, hx: number, hy: number, hz: number, yaw = 0, pitch = 0): void {
    const R = this.R;
    // q = qYaw * qPitch
    const cy = Math.cos(yaw / 2), sy = Math.sin(yaw / 2), cp = Math.cos(pitch / 2), sp = Math.sin(pitch / 2);
    const q = { x: cy * sp, y: sy * cp, z: -sy * sp, w: cy * cp };
    this.world.createCollider(R.ColliderDesc.cuboid(hx, hy, hz).setTranslation(x, y, z).setRotation(q), this.fixed);
    this.staticCount++;
  }

  addCylinder(x: number, y: number, z: number, halfHeight: number, radius: number): void {
    this.world.createCollider(this.R.ColliderDesc.cylinder(halfHeight, radius).setTranslation(x, y, z), this.fixed);
    this.staticCount++;
  }

  addBall(x: number, y: number, z: number, r: number): void {
    this.world.createCollider(this.R.ColliderDesc.ball(r).setTranslation(x, y, z), this.fixed);
    this.staticCount++;
  }

  addTrimesh(vertices: Float32Array, indices: Uint32Array): void {
    this.world.createCollider(this.R.ColliderDesc.trimesh(vertices, indices), this.fixed);
    this.staticCount++;
  }

  /** Downward ray: ground height under (x, z) or null. */
  groundAt(x: number, z: number, fromY = 500): number | null {
    const ray = new this.R.Ray({ x, y: fromY, z }, { x: 0, y: -1, z: 0 });
    const hit = this.world.castRay(ray, 2000, true);
    return hit ? fromY - hit.timeOfImpact : null;
  }
}
