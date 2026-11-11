# Orchestrator brief: decisions the plan must build on

Written by the orchestrator before the audit finished. The architect turns this into
`docs/NAMCHE_PLAN.md`, `docs/ARCHITECTURE.md` and the TypeScript contracts. Facts from `docs/audit/`
override guesses here; decisions here stand unless an audit fact makes one impossible, and then the
architect says so in the plan.

## 1. What matters most, in order

1. **It runs and can be played end to end** on this laptop: new game to finale, saves and reloads.
2. **Namche looks like Namche** from the player's eye and from the third-person camera: scale, the
   entrance view, the terraces, the roofs, the paths meeting the buildings, the peaks at their real size.
3. **The town is alive**: 80 to 120 people by day, each with somewhere to go.
4. **Light and air**: sun, sky, clouds, fog, weather, wind, water, grass, cloth. The owner listed these
   by name and asked for cloth twice.
5. **The body at altitude** is felt and is fair.
6. **Performance gates** hold on Medium.

When time or the machine forces a choice, give up breadth before depth: a smaller thing that works and
looks right beats a larger thing that is half there. Never fake a result in a report.

## 2. Principles

- **Rules are pure.** Everything that decides the game (body, clock, weather state, economy, inventory,
  missions, dialogue state, reputation, NPC timetables, save) lives in `client/src/sim/`: no three.js, no
  DOM, deterministic (seeded RNG, explicit `dt`), serialisable, unit tested in Node. The 3D game feeds it
  *what the player is physically doing* and *commands* (interact, pick up, buy), and draws what it says.
  This is what makes the balance bots, the save system and the e2e test cheap.
- **Data over code.** Missions, dialogue, gear, NPC archetypes, timetables, tuning: JSON or config
  modules. No magic numbers in the middle of logic.
- **Bake what is static.** Stair fitting, terrain refinement, layout compression, far terrain, navmesh,
  ambient occlusion: computed by tools into `client/public/assets/`, not at every page load. First load
  must stay within 25 s.
- **One renderer path.** `WebGPURenderer` with TSL materials everywhere; the WebGL2 backend is the
  fallback and the test backend. Anything that needs compute shaders has a CPU or vertex-shader fallback.
- **One material library, one environment.** World geometry takes its materials from
  `render/materials`, so wetness, snow cover, fog and night behave the same on every surface. Sun, sky,
  fog, wind and weather are read from one `EnvironmentState` (CPU values plus TSL uniforms).
- **Everything visual has a sandbox page** (`client/sandbox/<module>.html`) that loads only that module on
  a small stage, and a headless shot of it. Agents verify there before the full game exists.
- **Instancing and batching are the default**, LOD and culling are designed in, and every package states
  its budget (draw calls, triangles, texture memory) and measures it.

## 3. World scale and coordinates

- Axes as in the prototype: **x east, y up, z south**, metres. Origin stays at 27.8050 N, 86.7100 E.
- **One uniform world scale `s`** (config `WORLD_SCALE`, in 0.55 to 0.70; start from the value
  `docs/audit/osm_data.md` recommends) applied to terrain and layout positions in **all three axes**
  about the origin at a reference altitude. Uniform scaling keeps every slope and every sight line
  exactly as in reality, so peaks keep their true bearing and angular size from anywhere in town with no
  special cases, and there is no seam between town terrain and far terrain.
- **Human-scale things are never scaled**: people, doors, storeys, steps, railings, prayer wheels, the
  gate, lane widths (real width or up to 15% wider). The town therefore has fewer, true-sized buildings
  in the same pattern: footprints are scaled gently about their centroids, overlaps are resolved by
  priority (landmarks, lane frontage, hero buildings first), buildings that still collide are merged or
  dropped. At least 60 buildings must remain; aim for 150 or more. Order, rows, lanes and landmarks'
  relative positions never change.
- Terraces must still read as steps: flat pads, retaining walls, stairs between. The prototype's pad,
  plinth, door and stair rules are the starting point.
- The HUD altitude is the real altitude (inverse mapping), so it reads about 3,440 m in town.
- `WorldServices.toReal()` / `fromReal()` are the only place the mapping lives. The skyline test uses
  `data/geo/peaks_truth.json`.

## 4. Runtime shape

```
client/
  index.html, sandbox/*.html
  src/
    main.ts            boot
    app/               composition root, loop (fixed 60 Hz sim + physics, variable render), game states
    contracts/         interfaces and event types shared by modules (orchestrator-owned)
    config/            tuning modules
    core/              events, rng, math, input, settings, save store, asset loader, logger, debug API
    sim/               body, clock, weather, economy, inventory, gear, missions, dialogue, reputation,
                       npcsched, worldmodel (graph for headless bots), save
    world/             data loader, terrain, paths, stairs, buildings, landmarks, hero (buildings with
                       interiors), props, vegetation, water, farview, colliders, pois
    render/            renderer, environment, sky, clouds, weatherfx, lighting, shadows, post, wind,
                       cloth, particles, materials
    characters/        kit (factory), anim (library, animator), crowd (instanced GPU skinning), ik
    player/            controller, camera, carry, avatar, gearvisuals, appearance
    npc/               nav, agents, behaviours, animals, reactions
    gameplay/          interactables, items, doors, lodging, shops, mission bindings, photo targets
    ui/                kit, hud, screens, photo
    audio/
    test/              bots and helpers used by e2e and perf
  public/assets/       built assets only (glb, ktx2, bin, json, ogg)
data/                  raw and derived geodata
tools/                 geo/, assets/, bake/, shot, perf, locks
e2e/                   Playwright
```

- A module is `{ name, init(ctx), update?(dt, frame), lateUpdate?, setQuality?, dispose }` and receives a
  `GameContext` (renderer, scene, active camera, events, config, quality, sim, physics, assets, input,
  audio, world, env, wind, debug). Modules talk through contracts and typed events, never by importing
  each other's internals.
- `?test=1` exposes `window.__NAMCHE__`: `ready`, `teleport`, `setTime`, `setWeather`, `setCameraMode`,
  `setQuality`, `state()`, `stats()` (fps, draw calls, triangles, texture memory), `step(dt)`, bots.
  Shots, e2e and perf all drive the game through it.

## 5. Rendering

- Frame: scene pass with the outputs later passes need, then clouds (reduced resolution, depth-aware
  composite), ambient occlusion, atmosphere and volumetric light, bloom and lens flare, exposure and tone
  mapping, time-of-day grade, the altitude effects layer, anti-aliasing. The exact node graph is the
  post package's call, from what `docs/audit/tech_stack.md` verified.
- Depth: near plane 0.05 m and terrain some 20 km away must not fight. Use whatever the tech audit
  verified on both backends (logarithmic or reversed depth, or a far pass).
- Sky: physically based scattering with sun and moon from real ephemeris at Namche's latitude and a
  chosen date, real bright stars, Milky Way. Alpenglow should fall out of it: peaks lit through a long
  red path while the valley is already in terrain shadow (a horizon profile decides when the town loses
  the sun).
- Clouds: volumetric cumulus on Medium and up (ray-marched at reduced resolution with temporal
  reuse), cheaper layers on Low; they cast moving shadows; a low layer can sit in the gorge below town.
  Fog and mist are height-based and lift through the morning.
- Weather is a deterministic state machine in the sim (clear, partly cloudy, valley fog, light snow,
  rain; diurnal habits) that outputs continuous parameters. Rendering follows them: precipitation,
  wetness (darker, shinier, puddles), snow settling on up-facing surfaces and on the player's jacket and
  pack, people reacting.
- Wind is one field (`WindField.sample(pos, t)` on the CPU and the same function as a TSL node). It
  moves flags, grass, shrubs, tarps, laundry, smoke, clouds, precipitation and loose cloth.
- **Cloth is simulated**, not only animated: position-based cloth with wind and simple colliders for the
  hero pieces near the player (prayer-flag strings, the stupa's flags, tent flaps and tarps, laundry,
  khata), with a seamless vertex-shader version for the hundreds that are far away.
- Water: the stream and channels flow, with depth colour and absorption (volume), refraction, foam at
  drops, reflections (planar where flat and close, cheaper otherwise), wet banks. Water-driven prayer
  wheels turn. Rain makes puddles that reflect.
- Greenery has volume: instanced grass on verges and terraces, shrubs, conifers and rhododendron on the
  slopes, forest carried to the horizon by far-terrain shading.
- Shadows: cascades with soft edges; the player casts a shadow in both camera modes. Baked ambient
  occlusion and bounce for the static town, applied as an ambient term that follows the sky. Characters
  pick up local ambient from a baked sky-visibility map and interior probes.
- Night: lit windows, lanterns, string lights, the player's headlamp, stove glow, moonlit peaks. Real
  lights are few; most glow is emissive plus baked pools.

## 6. Characters

- **One shared skeleton and one animation library** from the CC0 pack the audit verified. Player, hero
  characters and crowd all use it.
- The four owned hero models are reduced locally (5k to 10k triangles, 2K texture, LODs, impostor). A
  hero that cannot be rigged cleanly is a static hero with breathing and head-turn, exactly as the brief
  allows. No stretched limbs ship.
- The crowd comes from a modular kit on the shared skeleton: bodies, heads, hair, hats, jackets, down
  coats, robes, chuba and apron, packs, doko. Colour varies per person. Never all black or grey.
- Three tiers: full skeletal with IK near the player; instanced GPU skinning from baked animation
  textures in the middle distance; impostors beyond. Clips are shared.
- Clips the library lacks (hands on knees, dizzy stagger, kneel and vomit, collapse, doko walk, spin a
  prayer wheel) are authored locally on the same skeleton.

## 7. Player

- Rapier kinematic capsule (1.75 m; eye 1.62 m), auto-step for 0.17 to 0.20 m risers, ground snap,
  slopes. Walk 1.3, sprint 3.5 m/s, crouch, jump with 0.45 m clearance and 0.1 s coyote time.
- A **gym level** (flat, stairs, slopes, doorway, narrow lane, low ceiling, interior room) is a permanent
  test fixture for movement, carry and camera tests.
- First person sees its own body (head hidden, never the inside of the mesh). Third person is a spring
  arm that sweeps against colliders, pulls in indoors, fades the character when too close. Switching
  takes 0.3 s or less and keeps the aim.
- Foot IK, hand IK on carried objects, look-at, lean. Gear bought in the shop appears on the body.

## 8. People and animals

- Timetables come from the sim (archetype, home, work, haunts, weather and market-day changes). The
  runtime walks them on a baked navmesh with crowd avoidance, plays activities at points of interest that
  the world packages publish as data, and reacts to the player.
- Updates are time-sliced and tiered. People far away or out of sight advance cheaply along their route.
- Yak and dzo trains with a herder block lanes until they pass. Dogs. Crows and choughs on roofs.

## 9. Sim specifics

- Clock: 3,600 real seconds per game day. New game starts on a Friday at mid-morning in clear weather so
  that the first sleep leads into the Saturday market.
- Body rates are in real seconds exactly as the brief states them; all in `config/body.ts`.
- Missions are JSON: steps with objective type, parameters, timers and bonuses, bound to place, person
  and item ids published by the world. The sim owns progress. A headless bot can finish every mission
  through sim commands on a graph model of the town; that is the balance test.
- Save: versioned sim state in localStorage with an IndexedDB copy, both wrapped in try/catch; settings
  separately. The expedition kit and acclimatisation level are documented in `docs/SAVE_FORMAT.md`.

## 10. UI and audio

- DOM overlay in plain TypeScript and CSS with design tokens from `docs/audit/ui_spec.md`; Teko and Hind
  bundled locally. 3D previews (inventory, shop mirror, appearance) render through the main renderer.
- Audio: Web Audio with buses, spatial sources, zone reverb, a procedural layer (wind, water, bells,
  breath, heartbeat, murmur) and CC0 samples. Low oxygen muffles the mix.

## 11. Working on this machine

- 16 GB RAM, often about 4 GB free; 4 GB VRAM. A dozen agents share it. Therefore:
  - one shared Vite dev server (`tools/dev-ensure.sh` starts it if it is not running);
  - every heavy command (headless browser shot, Blender, full type-check, production build, texture
    encoding, perf run) goes through `tools/heavy.sh`, a two-slot lock, so at most two run at once;
  - perf measurements are taken by the orchestrator when nothing else is running.
- Agents never run `npm install <pkg>` directly: `tools/npm-add.sh` serialises it.
- Agents do not commit. The orchestrator commits after each wave.

## 12. Build waves and packages

Each package owns its folders, has a sandbox page, tests, a budget, and a short `README.md` saying what it
provides and how to verify it.

**Wave 0, scaffold (sequential).** Project, contracts, config skeleton, loop, renderer bootstrap on both
backends, debug API, shot tool, locks, test runners, a stub for every module so imports resolve.

**Wave 1, foundations (parallel).**
- GEO: Python pipeline to compressed town data; then terrain, paths, stairs, colliders, `WorldServices`.
- FAR: far terrain from the DEM, peak shading, skyline test.
- SKY: environment state, ephemeris, sky, sun and moon rig, stars, exposure.
- MAT: CC0 textures to KTX2, the material library with wetness and snow hooks, credits.
- CHAR-A: Blender pipeline: CC0 rig and clips, hero reduction and rig attempt, modular kit, missing clips.
- CHAR-B: runtime: character factory, animator and blend trees, crowd instancing, impostors.
- BODY: the altitude body simulation and its tests.
- SIM-A: clock, weather state, economy, inventory, gear data, reputation, lodging, save.
- PLAYER-A: controller, both cameras and carry physics on the gym level, wired to the body contract.
- UI-A: UI kit, tokens, HUD, settings, key rebinding, menu and pause shells.
- AUDIO: engine, procedural layer, samples.

**Wave 2, the town and its systems (parallel).**
- BUILD: procedural lodges and houses, roofs, windows, signs, clutter, lit windows.
- ENTRANCE: bridge, path, Kani gate, stupa, pavilion row, open ground with tents, mani walls, chortens,
  prayer wheels, checkpoint, helipad, viewpoint, museum; the hero camera of brief section 5.
- HERO: the eight buildings with interiors, built hollow with real doors and windows.
- VEG-WATER: grass, shrubs, trees, fields; stream, fountain, water wheels, puddles.
- CLOUDS-WEATHER: volumetric clouds, fog and mist, rain and snow, wetness and snow cover.
- POST: shadows, ambient occlusion, the post chain, lens flare, god rays, night lights, quality presets.
- WIND-CLOTH: wind field, cloth simulation, flags, smoke, breath.
- PLAYER-B: avatar, animation, IK, gear on body, appearance.
- NPC: navmesh, crowd, timetables at runtime, behaviours, reactions, animals.
- SIM-B: mission engine, the 17 missions, dialogue, tutorial, town graph, bots and balance tests.
- UI-B: inventory, shop with try-on, dialogue, quest log, map, character screen, appearance, photo mode.

**Wave 3, integration (mostly sequential).** Compose the game, bind missions and shops to the world,
interactables and items, loading and caching, menu flyover, bakes (navmesh, ambient occlusion), the e2e
run, the perf harness, the scale and skyline tests.

**Then** adversarial QA with fixes, and a polish pass that matches each reference view with a named test
camera and a side-by-side in `docs/VISUAL_COMPARE.md`.
