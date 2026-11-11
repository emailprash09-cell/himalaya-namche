// The owner's generated landmark and character models (Higgsfield), reduced locally with
// tools/assets/reduce.py and compressed with gltf-transform (Meshopt geometry, WebP textures).
// Every model is already at its real size, origin at the base centre, y up. If a file fails to
// load, the caller keeps M1's primitive version.
import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

/** Loads assets/models/<name>.glb. Shadows on; generated metalness is toned down so the
 *  whitewash and paint do not turn grey-metallic under the sky light. */
export async function loadModel(name: string): Promise<THREE.Object3D> {
  const gltf = await loader.loadAsync(`assets/models/${name}.glb`);
  const root = gltf.scene;
  root.name = `model:${name}`;
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      const s = m as THREE.MeshStandardMaterial;
      if (!s.isMeshStandardMaterial) continue;
      if (s.map) s.map.colorSpace = THREE.SRGBColorSpace;
      s.metalness = Math.min(s.metalness, 0.6);
      s.roughness = Math.max(s.roughness, 0.45);
    }
  });
  return root;
}

export interface HeroSpec {
  name: string;          // model file, for example char_guide
  x: number; y: number; z: number;
  /** Facing as a game yaw: 0 looks north (-z), positive turns west, like the player. */
  yaw: number;
}

/** A static hero NPC: breathes, and turns gently towards the player when close. The models
 *  face +z in their own frame, so the figure is rotated by yaw + PI to face `yaw`. */
export class Hero {
  readonly root = new THREE.Group();
  private readonly baseYaw: number;
  private yaw: number;
  private readonly phase: number;

  constructor(readonly spec: HeroSpec, model: THREE.Object3D, phase: number) {
    this.root.name = `hero:${spec.name}`;
    this.root.position.set(spec.x, spec.y, spec.z);
    this.root.add(model);
    this.baseYaw = spec.yaw;
    this.yaw = spec.yaw;
    this.phase = phase;
    this.root.rotation.y = this.yaw + Math.PI;
  }

  update(t: number, dt: number, player: THREE.Vector3): void {
    // Breathing: about 15 breaths a minute, a few millimetres of chest rise.
    const b = Math.sin((t + this.phase) * (Math.PI * 2) / 4.0);
    this.root.scale.set(1 - 0.002 * b, 1 + 0.004 * b, 1 - 0.002 * b);
    // Head turn: within 6 m, turn the whole figure up to 40 degrees towards the player.
    const dx = player.x - this.root.position.x, dz = player.z - this.root.position.z;
    let want = this.baseYaw;
    if (dx * dx + dz * dz < 36) {
      const toPlayer = Math.atan2(-dx, -dz);
      let d = toPlayer - this.baseYaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      want = this.baseYaw + Math.max(-0.7, Math.min(0.7, d));
    }
    let e = want - this.yaw;
    e = Math.atan2(Math.sin(e), Math.cos(e));
    this.yaw += e * (1 - Math.exp(-2.5 * dt));
    this.root.rotation.y = this.yaw + Math.PI;
  }
}
