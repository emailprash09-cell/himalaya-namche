# Status

## M1 "Arrive at Namche": done (2026-11-12, branch `m1-arrival`)

The player spawns on the stone path just past a small bridge below the Kani gate and can walk up through
the gate to the big stupa and round it, in first or third person.

**How to play**
```
cd client
npm install
npm run dev        # then open the printed URL, click to look around
```
WASD move, Shift sprint, Space jump, V first/third person, F3 fps and draw calls, mouse to look.

**What is in it**
- About 150 x 150 m of playable entrance (invisible walls at the edges) on Copernicus GLO-30 terrain, with
  the town bowl and the far peaks (to about 27 km) from the same DEM. Town scale 0.65 in all three axes.
- From OSM: the trail and its line, the gate position and passage, the footbridge path, the stupa and its
  plaza, the stream channels, the side path, 24 lodge footprints.
- Kani gate rebuilt from primitives to the measured sizes (4.5 m square, 2.1 x 2.2 m passage, frieze,
  roundel band, red hipped roof, one gold finial at 4.5 m). Gate3.glb is 20 MB, over the 3 MB limit.
- Stupa about 11 m: stepped white base with the blue band, dome, painted box with the eyes, green fringe,
  13 gold tiers, umbrella and finial; eight strings of prayer flags (blue, white, red, green, yellow) that sway.
- Open ground on the left with 3 white tents, blue and grey tarps, a tin-roofed shed, a red-roofed hut and
  a big boulder. Low dry-stone wall on the left of the path. Six risers inside the gate.
- Lodges instanced (6 draw calls for all 24), forest instanced on the ridge, shrubs on the verges.
- Sky with sun at 135 deg / 40 deg, soft shadows, haze, cumulus above the ridge.
- Rapier kinematic capsule (1.75 m, eye 1.62 m), walk 1.3, sprint 3.5 m/s, jump 0.45 m with coyote time.
  TPP spring arm 3 m over the right shoulder that pulls in against colliders.

**Verified (2026-11-12, this laptop, headless Chromium on the RTX 3050 Ti via ANGLE D3D11)**
- `npm run build` passes, `npm test` 6/6.
- Spawn shots: `docs/screenshots/m1_spawn_fpp.png`, `m1_spawn_tpp.png`. Stupa centre, gate right, path right
  foreground, open ground with tents left, blue sky with cumulus over the ridge (compare
  `reference/chat/chat_03.webp`).
- Walk test (`npm run e2e`): from below the bridge, over it, up the path, through the gate, up the flight,
  round the stupa clockwise. FPP walking: 20/20 waypoints, 98 m in 80 s. TPP sprinting: 20/20, 31 s. Never
  stuck, never below the ground, kora signed area positive (clockwise).
- Perf (`npm run perf`, 1920 x 1080, frame cap off, WebGL2 backend): 323 to 359 fps mean at five poses,
  worst p95 frame 10.4 ms, 46 to 80 draw calls, about 1.0 M triangles drawn including the shadow pass. Boot to
  first frame about 0.5 s on the dev server.
- TPP camera: arm 3.0 m in the open, 0.8 m under the gate lintel, 1.1 m with the back to the stupa; the
  camera was never inside a collider.

**Not verified / known gaps**
- Headless Chromium could not create a WebGPU device (dxcompiler.dll), so every run above used the WebGL2
  fallback. WebGPU in desktop Chrome was not tested.
- Two of the three tents sit behind the bank from the spawn; only one is clearly in the first frame.
- The bridge and the rill under it are invented (OSM has no bridge here); see `docs/INVENTED.md`.
- Lodges are plain blocks (stone ground floor, painted storeys, window frames, gable roofs), no balconies.
- The production bundle is 5.2 MB (Rapier's wasm is inlined); no code splitting yet.
- No rigged character: the TPP avatar is a primitive trekker with a simple walk swing.

## Next: M2, the body at altitude

Health, Oxygen (SpO2), Nausea and Stamina bars, as `docs/MISSION.md` section 4 states them: a pure, tested
`client/src/sim/body.ts` with rates in `config/body.ts`, fed by what the player is doing (walk, sprint,
jump, stairs), plus the HUD bars and the screen-edge effects below 85 % and 80 % SpO2.
