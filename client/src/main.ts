// CAMP 4, M1 "Arrive at Namche": boot, compose the entrance, run the loop.
import * as THREE from 'three/webgpu';
import worldCfg from './config/world.json';
import { RENDER } from './config/game';
import { Input } from './core/input';
import { installDebug } from './core/debug';
import { buildEnvironment } from './render/environment';
import { loadEntrance } from './world/layout';
import { buildTerrain } from './world/terrain';
import { Physics } from './world/physics';
import { buildEntrance } from './world/entrance';
import { buildBuildings } from './world/buildings';
import { buildNature } from './world/nature';
import { buildLanes, loadTown } from './world/lanes';
import { buildLife } from './world/life';
import { startAmbience } from './audio/ambience';
import { PlayerController } from './player/controller';
import { CameraRig } from './player/camera';
import { Avatar } from './player/avatar';
import { Hud } from './ui/hud';
import { buildPost } from './render/post';

const FIXED_DT = 1 / 60;

async function boot(): Promise<void> {
  const t0 = performance.now();
  const hud = new Hud();
  const app = document.getElementById('app')!;
  const params = new URLSearchParams(location.search);
  const renderer = new THREE.WebGPURenderer({
    antialias: true,
    reversedDepthBuffer: true,
    forceWebGL: params.has('webgl'),
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, RENDER.pixelRatioCap));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = RENDER.exposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  app.appendChild(renderer.domElement);
  await renderer.init();
  const backend = (renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend ? 'WebGPU' : 'WebGL2';

  const scene = new THREE.Scene();
  const [data, phys] = await Promise.all([loadEntrance(), Physics.create()]);
  const { layout, near, mid, far, ground } = data;
  const env = buildEnvironment(scene, renderer);
  scene.add(buildTerrain(layout, near, mid, far, ground));
  phys.addHeightfield(near);
  const entrance = buildEntrance(layout, near, phys);
  scene.add(entrance.group);
  const lodges = await buildBuildings(layout, phys, near, mid);
  scene.add(lodges.group);
  const lanes = await buildLanes(layout, near, await loadTown());
  scene.add(lanes.group);
  const veg = await buildNature(layout, near, mid, lodges, lanes.polylines);
  scene.add(veg.group);
  const life = await buildLife(layout, near, mid, lodges, lanes.polylines, phys);
  scene.add(life.group);
  const ambience = startAmbience();
  (window as unknown as { __TOWN__: unknown }).__TOWN__ = { buildings: lodges.count, lanes: lanes.polylines.length,
    steps: lanes.stepsCount, nature: veg.counts, chimneys: lodges.chimneys.length, life: life.counts };

  // Invisible walls round the playable entrance area.
  const P = worldCfg.play;
  const wallH = 400;
  phys.addBox((P.x0 + P.x1) / 2, 0, P.z0 - 0.5, (P.x1 - P.x0) / 2, wallH, 0.5);
  phys.addBox((P.x0 + P.x1) / 2, 0, P.z1 + 0.5, (P.x1 - P.x0) / 2, wallH, 0.5);
  phys.addBox(P.x0 - 0.5, 0, (P.z0 + P.z1) / 2, 0.5, wallH, (P.z1 - P.z0) / 2);
  phys.addBox(P.x1 + 0.5, 0, (P.z0 + P.z1) / 2, 0.5, wallH, (P.z1 - P.z0) / 2);
  phys.world.step();

  // Spawn on the path just past the bridge, facing between the stupa and the gate.
  const spawnFeet = new THREE.Vector3(layout.spawn.x, layout.spawn.y + 0.05, layout.spawn.z);
  const toStupa = Math.atan2(-(layout.stupa.x - layout.spawn.x), -(layout.stupa.z - layout.spawn.z));
  // Look just right of the stupa so the gate sits on the right, as in the entrance photo.
  const spawnYaw = toStupa - THREE.MathUtils.degToRad(4);
  const player = new PlayerController(phys, spawnFeet, spawnYaw);
  const input = new Input(renderer.domElement);
  const rig = new CameraRig(phys, player.collider, window.innerWidth / window.innerHeight);
  rig.yaw = spawnYaw;
  rig.pitch = THREE.MathUtils.degToRad(worldCfg.spawn.lookPitchDeg);
  const post = buildPost(renderer, scene, rig.camera, !params.has('nopost'));
  const avatar = new Avatar();
  scene.add(avatar.root);

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    rig.resize(window.innerWidth / window.innerHeight);
  });

  const feet = new THREE.Vector3();
  let acc = 0, last = performance.now(), time = 0;
  let fpsFrames = 0, fpsTime = 0, fps = 0, frameMs = 0;
  let avatarYaw = spawnYaw;
  const frameTimes: number[] = [];

  const debug = installDebug({ renderer, scene, layout, player, rig, input, hud, phys, backend, frameTimes,
    tris: () => entrance.triangles + lodges.triangles + lanes.triangles + veg.triangles });

  const frame = () => {
    const now = performance.now();
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    frameTimes.push(now);
    if (frameTimes.length > 600) frameTimes.shift();
    time += dt;

    if (input.toggleCameraQueued) { input.toggleCameraQueued = false; rig.toggle(); }
    if (input.toggleStatsQueued) { input.toggleStatsQueued = false; hud.toggleStats(); }
    const look = input.consumeLook();
    rig.look(look.dx, look.dy);
    player.yaw = rig.yaw;

    acc += dt;
    while (acc >= FIXED_DT) {
      player.fixedStep(FIXED_DT, input);
      phys.world.step();
      acc -= FIXED_DT;
      debug.afterStep(FIXED_DT);
    }
    player.renderFeet(acc / FIXED_DT, feet);

    const { distanceToHead } = rig.update(feet, dt);
    if (player.speed > 0.2) avatarYaw = Math.atan2(-player.velocity.x, -player.velocity.z);
    avatar.update(feet, avatarYaw, player.speed, player.grounded, dt);
    avatar.setVisible(rig.mode === 'tpp' && distanceToHead > 0.9);
    env.update(feet);
    entrance.updateFlags(time);
    entrance.updateHeroes(time, dt, feet);
    life.update(dt, time, rig.camera, feet);
    let streamDist = 999;
    for (let i = 0; i < life.streams.length; i += 4) streamDist = Math.min(streamDist, life.streams[i].distanceTo(feet));
    ambience.update(dt, rig.camera, { yaks: life.yaks(), peopleNear: life.peopleNear(feet, 25), streamDist });
    hud.update(dt, rig.mode, input.locked);

    post.render();

    fpsFrames++; fpsTime += dt;
    if (fpsTime >= 0.5) { fps = fpsFrames / fpsTime; frameMs = (fpsTime / fpsFrames) * 1000; fpsFrames = 0; fpsTime = 0; }
    if (hud.statsVisible) {
      const info = renderer.info.render;
      const real = feet.y / layout.scale + layout.hRef;
      hud.setStats(
        `${fps.toFixed(0)} fps  ${frameMs.toFixed(1)} ms  ${backend}\n` +
        `draw calls ${info.drawCalls}  triangles ${(info.triangles / 1000).toFixed(0)}k\n` +
        `pos ${feet.x.toFixed(1)} ${feet.y.toFixed(2)} ${feet.z.toFixed(1)}  alt ${real.toFixed(0)} m\n` +
        `${rig.mode.toUpperCase()}  speed ${player.speed.toFixed(2)} m/s  ${player.grounded ? 'ground' : 'air'}`,
      );
    }
    debug.afterFrame(info0(renderer), fps);
    requestAnimationFrame(frame);
  };
  // The generated models stream in after the terrain; wait for them (at most 20 s) so the first frame
  // shows them. A model that fails keeps its M1 primitive version.
  const models = await Promise.race([
    entrance.modelsReady,
    new Promise<null>((r) => setTimeout(() => r(null), 20000)),
  ]);
  (window as unknown as { __MODELS__: unknown }).__MODELS__ = models ?? { timedOut: true };
  hud.ready();
  debug.markReady(performance.now() - t0);
  requestAnimationFrame(frame);
}

function info0(r: THREE.WebGPURenderer): { drawCalls: number; triangles: number } {
  return { drawCalls: r.info.render.drawCalls, triangles: r.info.render.triangles };
}

boot().catch((e) => {
  console.error(e);
  document.body.insertAdjacentHTML('beforeend', `<pre style="color:#f88;position:fixed;top:40%;left:5%;">${String(e)}</pre>`);
});
