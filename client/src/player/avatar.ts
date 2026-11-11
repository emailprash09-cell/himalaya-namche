// Third-person stand-in: a 1.75 m trekker built from primitives in bright trekking colours,
// with a simple walk cycle. Replaced by a rigged character in a later milestone.
import * as THREE from 'three/webgpu';
import { PLAYER } from '../config/game';

export class Avatar {
  readonly root = new THREE.Group();
  private readonly legs: THREE.Object3D[] = [];
  private readonly arms: THREE.Object3D[] = [];
  private readonly torso: THREE.Object3D;
  private phase = 0;

  constructor() {
    const H = PLAYER.height;
    const m = (c: number, r = 0.8) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
    const jacket = m(0xe0562a, 0.7), trousers = m(0x2f4a6e), boots = m(0x5a3a22), skin = m(0xb98463, 0.6);
    const pack = m(0x2f9aa0, 0.75), hat = m(0xf0b429, 0.8), strap = m(0x1f2a33);
    this.root.name = 'avatar';
    // Proportions for a 1.75 m adult: legs 0.86 m to the hip, head about 0.23 m.
    const hip = 0.88;
    for (const s of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(s * 0.1, hip, 0);
      const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.68, 4, 8), trousers);
      thigh.position.y = -0.42;
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.27), boots);
      boot.position.set(0, -0.82, -0.04); // toes point forward (-z)
      leg.add(thigh, boot);
      this.legs.push(leg);
      this.root.add(leg);
    }
    this.torso = new THREE.Group();
    this.torso.position.y = hip;
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.42, 4, 10), jacket);
    body.scale.set(1.05, 1, 0.75);
    body.position.y = 0.33;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.105, 16, 12), skin);
    head.position.y = H - hip - 0.13;
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), hat);
    cap.position.y = head.position.y + 0.02;
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.5, 0.2), pack);
    bag.position.set(0, 0.38, 0.19);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.2), strap);
    lid.position.set(0, 0.64, 0.19);
    this.torso.add(body, head, cap, bag, lid);
    for (const s of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(s * 0.23, 0.58, 0);
      const a = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.52, 4, 8), jacket);
      a.position.y = -0.3;
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), skin);
      hand.position.y = -0.6;
      arm.add(a, hand);
      this.arms.push(arm);
      this.torso.add(arm);
    }
    this.root.add(this.torso);
    this.root.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  }

  update(feet: THREE.Vector3, yaw: number, speed: number, grounded: boolean, dt: number): void {
    this.root.position.copy(feet);
    // Turn smoothly towards the movement facing.
    let d = yaw - this.root.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.root.rotation.y += d * Math.min(1, dt * 10);
    const stride = speed > 2 ? 1.6 : 1.1;
    this.phase += (speed / stride) * Math.PI * dt;
    const amp = Math.min(0.6, speed * 0.32) * (grounded ? 1 : 0.3);
    const sw = Math.sin(this.phase) * amp;
    this.legs[0].rotation.x = sw; this.legs[1].rotation.x = -sw;
    this.arms[0].rotation.x = -sw * 0.8; this.arms[1].rotation.x = sw * 0.8;
    this.torso.rotation.x = speed > 2 ? -0.12 : -0.03;
    this.torso.position.y = 0.88 + Math.abs(Math.cos(this.phase)) * amp * 0.04;
  }

  setVisible(v: boolean): void { this.root.visible = v; }
}
