// Sky, sun, ambient light, haze. Mid-morning, clear with cumulus.
import * as THREE from 'three/webgpu';
import { SkyMesh } from 'three/addons/objects/SkyMesh.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { ENV, RENDER } from '../config/game';
import { rng } from '../core/rng';

export interface Environment {
  sun: THREE.DirectionalLight;
  sunDir: THREE.Vector3;
  update(focus: THREE.Vector3): void;
}

export function buildEnvironment(scene: THREE.Scene, renderer?: THREE.WebGPURenderer): Environment {
  const az = THREE.MathUtils.degToRad(ENV.sunAzimuthDeg), el = THREE.MathUtils.degToRad(ENV.sunElevationDeg);
  // Azimuth clockwise from north; north is -z, east is +x.
  const sunDir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();

  const sky = new SkyMesh();
  sky.scale.setScalar(50000);
  sky.turbidity.value = 1.6;
  sky.rayleigh.value = 1.25;
  sky.mieCoefficient.value = 0.004;
  sky.mieDirectionalG.value = 0.8;
  sky.sunPosition.value.copy(sunDir);
  sky.cloudCoverage.value = 0.3;
  sky.cloudDensity.value = 0.5;
  sky.cloudScale.value = 0.00016;
  sky.cloudSpeed.value = 0.00001;
  sky.cloudElevation.value = 0.6;
  sky.name = 'sky';
  scene.add(sky);

  // M2.5: a photographed CC0 sky (Poly Haven, kloofendal_48d_partly_cloudy_puresky: deep blue with big cumulus)
  // as background and image-based light. Its sun sits at azimuth 124 degrees, which matches the 9 am sun here.
  const hemi = new THREE.HemisphereLight(0xbcd4f2, 0x5f5a45, 0.45);
  scene.add(hemi);
  if (renderer) {
    new HDRLoader().load('assets/sky/sky_2k.hdr', (tex) => {
      tex.mapping = THREE.EquirectangularReflectionMapping;
      scene.background = tex;
      scene.environment = tex;
      scene.backgroundIntensity = 0.9;
      scene.environmentIntensity = 0.45;
      sky.visible = false;
      clouds.visible = false;
    });
  }
  const sun = new THREE.DirectionalLight(0xffe4c4, 3.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(RENDER.shadowMapSize, RENDER.shadowMapSize);
  const e = RENDER.shadowExtent;
  Object.assign(sun.shadow.camera, { left: -e, right: e, top: e, bottom: -e, near: 1, far: 400 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  sun.shadow.radius = 3;
  scene.add(sun, sun.target);

  scene.fog = new THREE.Fog(ENV.fogColor, ENV.fogNear, ENV.fogFar);
  const clouds = cumulus(sunDir);
  scene.add(clouds);
  scene.add(valleyMist());

  const snapped = new THREE.Vector3();
  return {
    sun,
    sunDir,
    update(focus: THREE.Vector3) {
      // Keep the shadow box on the player, snapped to texels so the edges do not crawl.
      const texel = (2 * e) / RENDER.shadowMapSize;
      snapped.set(Math.round(focus.x / texel) * texel, Math.round(focus.y / texel) * texel, Math.round(focus.z / texel) * texel);
      sun.target.position.copy(snapped);
      sun.position.copy(snapped).addScaledVector(sunDir, 200);
    },
  };
}

/** A cumulus puff drawn on a canvas: soft white lobes, sunlit on top, grey underneath. */
function cloudTexture(seed: number): THREE.CanvasTexture {
  const W = 512, H = 256;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const r = rng(seed);
  const lobes: [number, number, number][] = [];
  for (let i = 0; i < 16; i++) {
    const x = W * (0.18 + r() * 0.64), rad = H * (0.13 + r() * 0.17);
    const y = H * 0.7 - rad * (0.4 + r() * 0.9) * (1 - Math.abs(x / W - 0.5) * 1.2);
    lobes.push([x, y, rad]);
  }
  for (const [x, y, rad] of lobes) {
    const gr = g.createRadialGradient(x, y - rad * 0.35, rad * 0.1, x, y, rad);
    gr.addColorStop(0, 'rgba(255,255,255,0.95)');
    gr.addColorStop(0.55, 'rgba(244,246,250,0.75)');
    gr.addColorStop(1, 'rgba(225,230,238,0)');
    g.fillStyle = gr;
    g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
  }
  // Flat grey base.
  const base = g.createLinearGradient(0, H * 0.5, 0, H * 0.78);
  base.addColorStop(0, 'rgba(160,170,185,0)');
  base.addColorStop(1, 'rgba(160,170,185,0.55)');
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = base; g.fillRect(0, 0, W, H);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Fair-weather cumulus round the horizon, far beyond the ridges, so the peaks can hide them. */
function cumulus(sunDir: THREE.Vector3): THREE.Group {
  const g = new THREE.Group();
  g.name = 'cumulus';
  const r = rng(77);
  const tex = [cloudTexture(1), cloudTexture(2), cloudTexture(3), cloudTexture(4)];
  for (let i = 0; i < 22; i++) {
    const az = r() * Math.PI * 2;
    const dist = 5000 + r() * 6000;
    const elev = THREE.MathUtils.degToRad(14 + r() * 22);
    const m = new THREE.SpriteMaterial({ map: tex[i % 4], transparent: true, depthWrite: false, fog: false });
    // Clouds towards the sun are brighter at the rim, away from it a touch greyer.
    const toward = Math.max(0, Math.cos(az - Math.atan2(sunDir.x, -sunDir.z)));
    m.color.setScalar(1.15 + toward * 0.2);
    const s = new THREE.Sprite(m);
    const w = dist * (0.35 + r() * 0.35);
    s.scale.set(w, w * 0.5, 1);
    s.position.set(Math.sin(az) * dist * Math.cos(elev), Math.sin(elev) * dist, -Math.cos(az) * dist * Math.cos(elev));
    s.renderOrder = -1;
    g.add(s);
  }
  return g;
}

/** Low mist lying in the gorges below the town: soft translucent layers at valley level, off the play area. */
function valleyMist(): THREE.Group {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const g = c.getContext('2d')!;
  const r = rng(5);
  for (let i = 0; i < 40; i++) {
    const x = 40 + r() * 176, y = 70 + r() * 116, rad = 30 + r() * 60;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, 'rgba(255,255,255,0.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.85, color: 0xeef3f8, side: THREE.DoubleSide });
  const grp = new THREE.Group(); grp.name = 'valley-mist';
  // The Bhote Koshi and Dudh Koshi gorges lie 300 to 600 m below Namche, to the west and south.
  const spots: [number, number, number, number][] = [
    [-900, -260, 900, 1400], [-1400, -380, 700, -200], [200, -330, 1700, 1300], [900, -420, 1900, 1100],
    [-1700, -420, 2000, 1500], [-300, -300, 1400, 900], [1500, -380, 900, 1000],
  ];
  for (const [x, y, z, s] of spots) {
    for (let k = 0; k < 3; k++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s * 0.6).rotateX(-Math.PI / 2), mat);
      m.position.set(x + (r() - 0.5) * 300, y + k * 18, z + (r() - 0.5) * 300);
      m.rotation.y = r() * Math.PI; m.renderOrder = 2;
      grp.add(m);
    }
  }
  return grp;
}
