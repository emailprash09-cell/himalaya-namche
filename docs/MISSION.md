<!-- Saved verbatim from the owner's message of 2026-11-11. Do not edit the brief; add notes at the bottom. -->

# MISSION: NAMCHE BAZAAR — PLAYABLE GAME (no climbing yet)

Build a complete, polished, playable game set entirely in Namche Bazaar. No mountain climbing in this build. The player starts just outside the bridge and the Kani gate at the entrance of Namche. They can play in first person (FPP) or third person (TPP) and walk a living town full of people, do missions for money, carry loads, jump and sprint. They also have to manage their body at altitude (Health, Oxygen, Nausea, Stamina), and they spend earnings on climbing gear for later. Namche is the star: a near-replica of the real town, recognizable to anyone who has been there, crowded with NPCs going about their day, with breathtaking far views of the Himalaya and top-tier lighting. You already have the project context, assets, characters and reference images in this repo. Use all of them. The bar: someone plays for 45+ minutes, finishes a full mission chain, buys a full gear kit, feels the altitude, stops to watch the town's life, and takes screenshots of the view.

## 0. START HERE
- Repo: F:\MOUNTAIN\himalaya (himalaya-namche). Make a new branch `namche-playable` from `fix/geometry`. If git complains on exFAT: `git config --global --add safe.directory F:/MOUNTAIN/himalaya`.
- Study every reference image closely before coding: NAMCHE INSPO 1–5, MT INSPO 1–3, every HUD/inventory mockup, the existing Namche walkable prototype, the Kani gate model, the 4 character models (guide, lodge owner, monk, mountaineer), and the ENTRANCE REFERENCE in §5 (I'll drop the photo into /docs/reference/namche_entrance.jpg; if it isn't there, follow the written description exactly).
- Write docs/NAMCHE_PLAN.md before coding: what you'll reuse, what you'll build, the town layout, the opening-shot plan, the player character and camera plan, the altitude body-systems design, the NPC population plan, the far-view plan, the lighting plan and the mission list.
- Do NOT spend any Higgsfield credits. Use local tools only (Blender CLI, gltf-transform, meshoptimizer), plus CC0 assets (Poly Haven, ambientCG, Quaternius, Kenney). Log every asset's license in docs/CREDITS.md.
- Stack: TypeScript (strict) + Vite + Three.js (latest; WebGPURenderer with automatic WebGL2 fallback) + Rapier physics. Multi-file project, not a single HTML file. Scripts `npm run dev`, `npm run build`, `npm run test`, `npm run e2e`, `npm run perf`. Must run on Windows.

## 1. SCALE: NEAR-REPLICA, NOT 1:1
- Town layout keeps the real shape: the horseshoe amphitheatre of terraces, the lane network, every landmark's relative position, the compass orientation. Compress distances so it's fun to walk: footprint about 55–70% of real size (tune by playtesting; end to end takes about 2–3 minutes on foot). Keep the steep stepped terraces and the height difference pronounced.
- Human proportions stay realistic: player capsule 1.75 m, eye height 1.62 m. NPCs 1.55–1.85 m, feet exactly on the ground, boots the right way round, no twisted or mirrored limbs. Kani gate 4.5 m square with a single gold finial. Lodge storey 2.4–2.7 m. Doors 1.70–1.85 m (doorways the player walks through ≥1.85 m). Stair risers 0.17–0.20 m. Prayer wheels 1.0–1.5 m. Lanes can be up to 15% wider for gameplay, crowd flow and the third-person camera.
- Far mountains match the real view: if a peak is moved closer, scale it down by the same factor so its angular size and skyline position match reality. Test: peak elevation angle and bearing from 3 viewpoints (the entrance spawn, town centre, the ridge viewpoint) within ±1° of real values.
- An automated bounding-box test covers human-proportion assets (characters, doors, stairs, props).

## 2. CHARACTER MODELS: MAKE THEM GAME-READY (locally, no credits)
- The 4 Higgsfield GLBs (17–22 MB, ~150k triangles, 4K texture each; local copies are in the Claude scratchpad glb folder and IDs are in memory) must be reduced to 5,000–10,000 triangles with a 2K texture (1K at LOD1), Draco/Meshopt + KTX2, ≤2 MB each. Make LOD0/LOD1/LOD2 versions plus a far-distance impostor. Visually compare before and after, and keep faces, hands and feet clean.
- Rigging: auto-rig in Blender (headless) or transfer weights onto a CC0 rigged humanoid base (e.g. Quaternius) so all characters, including the player, share one skeleton and one animation library. If a hero NPC can't be rigged cleanly, use it as a static NPC with procedural motion (breathing, head turn toward the player). Never ship stretched or broken limbs.

## 3. PLAYER CHARACTER AND CAMERA: FPP + TPP
Player character:
- A full-body rigged player model based on the mountaineer hero model, or the modular kit if the hero can't be rigged cleanly. Realistic, colourful trekking clothes (never all black). Bought gear shows on the body: jacket, down suit, backpack, helmet, goggles, boots, gloves, ice axe strapped to the pack, crampons clipped on the pack.
- A simple appearance screen at new game: body, skin tone, face, hair, starting jacket colour.
- Animation set (shared library, blend trees, root-motion or speed-matched to avoid foot sliding): idle, idle variations, walk, jog, sprint, crouch idle/walk, jump start/air/land (soft and hard landing), stairs up/down, turn in place, carry-in-hands (idle/walk), doko-loaded walk (bent forward, slower), pick up, put down, throw, interact (open door, hand over item, spin prayer wheel), sit, wave/greet, look at the view, take a photo. Altitude body states: hands-on-knees catching breath, heavy-breathing idle, dizzy stagger, kneel and vomit, sit down to recover, collapse/faint and get-up.
- Foot IK on stairs, slopes and uneven stone: both feet planted correctly, no floating, sinking, sliding, or rotated or mirrored feet. Also hand IK on carried objects, look-at IK for head and eyes, and a slight lean into turns.
Camera modes (toggle with V / gamepad D-pad; saved in settings; also selectable in the pause menu):
- FPP: eye height 1.62 m, FOV 78° default (slider from 70 to 95). Full-body awareness: you see your own legs, boots and the carried load when looking down, and your arms and hands when interacting or carrying. Subtle head-bob (with a reduce-motion option). Near plane 0.05 m, no clipping into walls or your own body.
- TPP: over-the-shoulder camera with a 2.5–4.0 m distance (scroll to zoom), shoulder swap (Q), and a default pitch slightly above head height. Spring-arm camera collision that never goes through walls, roofs or NPCs and stays smooth in narrow lanes and doorways (auto pull-in, fades the character out if the camera gets too close). Smooth follow with lag, rotate freely around the character when idle, auto-align behind the player when moving (option to turn this off).
- Interiors: TPP pulls in automatically to a tighter shoulder view inside lodges, shops and the gompa. Optional setting to force FPP indoors.
- Switching modes is instant and smooth (≤0.3 s blend), keeps aim direction, and works mid-movement.
- Movement, interaction prompts, carry system, altitude effects and missions behave the same in both modes. Interaction targeting uses a centre-screen ray in FPP and a camera-aimed ray with a character-proximity check in TPP.
- Photo mode supports both modes plus a free camera.

## 4. ALTITUDE BODY SYSTEMS: HEALTH, OXYGEN, NAUSEA, STAMINA (new core system)
Namche is at ~3,440 m. Air pressure is about 2/3 of sea level, so running hard for a long time causes problems. Build these in /client/sim/body (pure TS, deterministic, unit-tested, all tuning in config):
- OXYGEN bar (blood oxygen, shown as SpO2 %): about 90% at rest at Namche (unacclimatized). Walking −1 to −2%, jogging −4%, sprinting drops it steadily (about −1% per 2 s), carrying heavy loads and climbing stairs make it drop faster. It recovers toward the resting value when you slow down, stop or sit (faster when sitting or resting in a lodge). Below 85% the screen edges darken slightly and breathing gets loud; below 80% you get tunnel vision, muffled sound and slower turning; below 75% for more than 5 s you collapse (§ consequences).
- STAMINA bar (short-term energy): sprinting, jumping and carrying use it; walking slowly or resting recovers it. Recovery is ~15% slower than at sea level. When it's empty you can't sprint or jump and the character stops, hands on knees.
- NAUSEA bar (altitude sickness build-up, AMS-style): rises slowly from overexertion. Rule: sustained sprinting/heavy carrying with Oxygen under 85% adds nausea, so running for a long time (more than ~45–60 s continuous, or repeated sprints without rest) builds it fast. It also rises a little from skipping water or food for long periods and from going up the ridge too fast on your first day. Stages:
   - 0–30: fine.
   - 30–60: mild headache and dizziness. Slight screen sway, occasional camera wobble, a headache pulse at the screen edges, sprint speed −10%.
   - 60–85: strong. Blurry vision pulses, stumbling at random when running, slower controls, NPCs comment ("Bistarai! Slowly, slowly…"), the character holds their head or belly, stops to breathe.
   - 85–100: vomiting (character kneels, can't move for a few seconds) and a big health hit. At 100 you faint.
   - It falls slowly while resting, drinking water or tea, eating (dal bhat, garlic soup at a lodge), walking slowly, and sleeping in a lodge. Going back down below the town toward the bridge lowers it faster (a small but real "descend to recover" lesson).
- HEALTH bar: drops from fainting, vomiting, hard falls or big jumps, staying at high nausea for a long time, and cold exposure at night without warm clothes (a mild chill in town). Recovers by resting, eating, sleeping in a lodge, or buying first aid at the pharmacy.
- Consequences: if you faint (Oxygen collapse, Nausea 100, or Health 0), the screen fades out, you wake up in the nearest lodge or health post. You lose a little money (a care fee) and some game time, carried mission items drop at the faint spot, and a short NPC conversation tells you to take it slow. No permadeath and no game-over screen.
- Acclimatization: a hidden value that slowly goes up with time spent in Namche and with each night slept in a lodge. Each level raises resting SpO2 (90 → up to 94%), slows nausea build-up, and speeds up recovery. Hike to the ridge viewpoint and come back down to sleep ("climb high, sleep low") for a bonus. Show the acclimatization level in the character screen and on a small "day count" in the HUD.
- Hydration and food: simple meters behind the Nausea/Health bars. Drink water or tea and eat at lodges and bakeries. Low hydration speeds up nausea build-up.
- Gear and items help: water bottle (drink on the go), garlic soup, ginger tea, snacks, a down jacket at night, trekking poles (−15% stamina cost on stairs), a pharmacy first-aid kit. Keep it game-like and don't present any of it as medical advice; add a one-line in-game note that real altitude sickness is serious and descending is the real cure.
- Tutorial teaches it: in the opening section the guide NPC says "We're at 3,440 m. Walk slowly, drink water. If your head hurts, rest." The first time the player sprints too long, a short tip pops up.
- Visual and audio feedback in both FPP and TPP: breath fog, louder breathing, a heartbeat at low oxygen, screen effects that can be toned down (reduce-motion and reduce-effects settings).

## 5. GAME START: OUTSIDE THE BRIDGE AND THE KANI GATE (the opening shot)
- New game and the tutorial start on the trail just below Namche: the player has just crossed the bridge over the stream and stands on the stone-paved path that leads up to the town entrance, with the Kani gate ahead. A short intro camera move (5–8 s, skippable) rises from the bridge to reveal the town, then drops into the player's view in their chosen camera mode.
- ENTRANCE REFERENCE: recreate this composition as the first gameplay view, seen from the path below the gate. Match it closely:
  - Right foreground: the paved stone path (grey flagstones, low stone retaining wall on its left edge, grass verge) running uphill toward the Kani gate building: a white-walled square gate building with a red/crimson tiled roof, small dark window openings, a wooden door frame and painted trim. Trekkers walk the path with big rucksacks.
  - Centre: the big white Namche stupa (dome on a stepped white base) topped by a tall golden spire with tiers, a painted square harmika with Buddha eyes, and prayer flags strung from the spire. Below and in front of it are colourful prayer flags, stone steps and people climbing up.
  - Left/centre middle ground: a flat open dirt/earth ground (market and camping area) with white canvas tents, blue and grey tarps, a small corrugated-tin shelter with yellow and red tarps, and a weathered grey boulder in the lower-left foreground. A small red-roofed stone hut sits in the bottom centre. Patches of green shrubs and grass grow between them.
  - Behind the stupa: a pink-and-white multi-storey lodge with wooden balconies, a lodge with a bright blue roof to its left, and more lodges in white, cream and pastel colours.
  - Background: steep terraces of 3–4 storey lodges climbing the green hillside, with roofs in blue, green, red and maroon, white walls and lots of windows, a few trees between them, and a scrubby, forested slope and ridgeline above with a few buildings high on the ridge.
  - Sky: bright Himalayan blue with big white cumulus clouds over the ridge, at mid-morning in clear weather (the default start).
- Save the opening view as a reusable "hero camera" for the main menu background, and screenshot it next to the reference in docs/VISUAL_COMPARE.md.

## 6. A LIVING TOWN FULL OF NPCs (core requirement)
Population:
- 80–120 NPCs visible during the busy daytime (up to 200 on market day), fewer at night. Fully animated within 40 m, a cheaper animation tier from 40–120 m (lower update rate), impostors or crowd-instanced figures beyond that.
- Variety: build a modular CC0 rigged humanoid kit (bodies, heads, hair, hats, jackets, down coats, trekking gear, robes, traditional Sherpa clothing, chuba, aprons, backpacks, doko baskets) with random colours, so no two NPCs look the same. The 4 hero models are named key characters. The guide greets you at the entrance.
- Clothing must look realistic and varied in colour (bright down jackets, red monk robes, patterned aprons). Never default everyone to black or grey.
Types and routines (data-driven schedules on the in-game clock):
- Porters carrying huge doko loads with namlo head straps, moving slowly uphill and resting on stone ledges (they visibly don't run, as a hint to the player).
- Trekkers in groups of 2–6 following a guide, stopping to take photos, buying snacks, sitting on lodge terraces with tea. Some trekkers are out of breath on the stairs, catching their breath.
- Shopkeepers opening shutters in the morning, arranging goods, calling to passers-by, closing at dusk.
- Lodge owners and staff sweeping, carrying water, cooking, serving dal bhat on terraces.
- Monks walking to and from the gompa, spinning prayer wheels, chanting in the prayer hall at set times.
- Kids playing (chasing, football on a flat terrace, a running game around the stupa), going to school in the morning.
- Elders spinning hand prayer wheels, sitting in the sun, circling the stupa clockwise.
- Yak and dzo trains with herders and bells crossing the bridge and coming up the entrance path, blocking lanes until they pass. Dogs napping and wandering. Crows and choughs on rooftops.
- Market vendors on Saturday market day: stalls, haggling, crowds on the open ground below the stupa.
Behaviour:
- Navmesh pathfinding with crowd avoidance (RVO/steering); NPCs flow naturally on stairs and step aside for the player and yak trains. Foot IK on NPCs within 20 m.
- Idle actions at points of interest (sit on benches, lean on walls, chat in pairs and groups, drink tea, look at the view, take photos).
- Interior life inside lodges, teahouses and shops.
- NPCs react to the player: look at you when near, greet you ("Namaste", "Tashi Delek"), complain if you bump into them, laugh if you fall, react if you sprint through a crowd or carry something huge, show concern and offer help if you're visibly sick (stumbling, vomiting).
- Weather changes behaviour: people go indoors or open umbrellas in rain or snow, and gather around stoves when cold.
- Day/night: streets fill up at dawn, busiest mid-morning and late afternoon, people go indoors at night with lit windows, and a few late walkers carry headlamps.
- Ambient crowd audio is spatial (chatter, laughter, footsteps, yak bells, distant music from a lodge).
- Performance: NPC AI and animation are LOD'd and time-sliced, animation uses GPU skinning with shared clips, and agents far from the player are simulated cheaply. No hitches when walking into busy areas.

## 7. NAMCHE MUST BE EXCELLENT
Layout and terrain:
- Use real elevation data (Copernicus GLO-30/SRTM) for the Namche valley and ridges, compressed as in §1. The town faces the valley at its real orientation.
- Real landmarks in the right relative places: the bridge over the stream and the trail entrance from below; the stone path, Kani gate and the big stupa (§5); police/permit checkpoint; the stream with water-powered prayer wheels; terraced central lanes and stone stairways; the open ground and Saturday market area; the gompa; the Sherpa culture museum and national park visitor centre on the ridge; the viewpoint; a helipad; a small health post/pharmacy.
Buildings and detail:
- 60+ buildings: stone lodges and teahouses with blue, green, red and maroon tin roofs, white/cream/pastel walls, painted wooden window frames, signboards with invented names (no real brands), balconies, firewood stacks, water tanks, solar panels, satellite dishes, laundry lines.
- Instanced and procedurally varied (walls, roofs, windows, trims, colours) so neighbours never look identical. Detail has to hold up from both the FPP eye view and the higher TPP camera (rooftops, upper floors, balconies). Prayer flags strung everywhere and moving with the wind. Carved mani stones, spinning prayer wheels, chortens, juniper smoke.
- Interiors for at least 3 lodges, the gear shop, the bakery/teahouse, the health post/pharmacy, the gompa prayer hall and the trekking agency office. Rooms are sized so the TPP camera works inside.
- Culture shown respectfully and accurately: walking clockwise around stupas, mani walls and prayer wheels gives a small reputation bonus; correct Nepali/Sherpa terms throughout.

## 8. FAR VIEWS AND MOUNTAIN SKYLINE
- Thamserku and Kongde Ri dominate across the valley, and Everest, Lhotse, Nuptse and Ama Dablam appear from the ridge above town, all at real bearings and angular sizes (§1).
- Distant terrain: a multi-ring DEM terrain with LODs out to 30+ km of visual distance, with detailed geometry for near ridges and baked high-res heightmap impostors or skyline meshes for the far peaks. Snow and rock follow slope and altitude, with glaciers, cornices, crisp ridgelines and wind-blown snow plumes on the summits. The forested and scrubby hillsides around town match the reference (green slopes, rhododendron and pine, shrubs).
- Aerial perspective: distant ridges fade in blue haze by distance and altitude, with layered valley clouds you can look down on, and fog that sits in the valley in the morning and lifts by midday.
- Signature vistas, composed and tested in both FPP and TPP: the entrance opening shot (§5), the whole amphitheatre seen from across the stream, the ridge viewpoint toward Everest at sunrise, and Thamserku at golden hour from a lodge terrace.

## 9. GRAPHICS AND LIGHTING (top priority alongside NPCs)
- Physically based sky with atmospheric scattering; sun and moon positions follow the time of day at Namche's latitude; stars and Milky Way at night. Volumetric-looking cumulus clouds like in the reference.
- Alpenglow: pink-orange light on the snow peaks at sunrise and sunset while the valley is already in shadow.
- Cascaded shadow maps with soft edges (the player character casts a proper shadow in both modes, including in FPP), contact shadows, and GTAO/SSAO ambient occlusion.
- Baked lightmaps (Blender bake) for the town's static global illumination: warm bounce light in the lanes and interiors. Light probes so the player and NPCs match the lighting around them.
- Volumetric light: god rays through clouds and prayer flags, light shafts through lodge windows, volumetric fog and low clouds.
- Night: warm window glow, lanterns and string lights, headlamps (the player can toggle one), a cozy stove glow inside, moonlit snow peaks.
- Weather: clear (default), partly cloudy, valley fog, light snow, rain. Smooth transitions. Wet surfaces get darker and shinier. Snow builds up on the player's jacket and pack in TPP.
- PBR materials (CC0) for stone flagstones, slate, whitewash, wood, tin, dirt ground, canvas tents, tarps, snow patches and ice, plus detail normals and decals (moss, dirt, wear, yak tracks).
- Post-processing: ACES/AgX tone mapping, auto exposure, subtle bloom, colour grading per time of day, a mild vignette, TAA/FXAA. Depth of field only in photo mode and dialogue. The altitude effects (§4) are layered on top.
- Wind on prayer flags, grass, shrubs, tarps, laundry, smoke and the player's clothing.
- Graphics presets Low/Medium/High/Ultra, where Ultra adds the best volumetrics, shadows and draw distance.

## 10. PLAYER MOVEMENT
- Walk 1.3 m/s, sprint 3.5 m/s, crouch, jump (~0.45 m clearance, coyote time 0.1 s, landing animation, a camera dip in FPP, and sound). Stairs and steep paths cost more stamina and oxygen. All movement feeds the body systems in §4.
- Carry system:
  - Pick up physical objects (E) and carry them in your hands (one bulky item; both hands IK'd onto it, visible in both camera modes), or load a doko basket with a namlo for heavy loads (the basket is shown on the back in TPP and its strap/edge is visible in FPP).
  - Carried mass slows sprint, lowers jump height, drains stamina and oxygen faster, adds head-bob and sway, and makes the character lean forward. Above 30 kg: no sprint, no jump.
  - Items can be dropped, thrown a short distance, and stacked.
  - Load weight shows in the HUD.
- Gamepad plus keyboard/mouse with rebindable keys, and settings that save.

## 11. MISSIONS: EARN MONEY IN NAMCHE (currency: NPR)
At least 15 data-driven (JSON) missions with a quest log, waypoints, minimap markers, NPC dialogue (warm, short, light humour), rewards, and repeatable daily jobs. Missions use the crowds and the altitude: weaving through people, yak trains blocking routes, NPCs giving clues, and timed jobs where you must pace yourself (rushing makes you sick, going too slow loses the bonus). Every mission must be completable and readable in both FPP and TPP.
0. Arrival (tutorial, starts at the bridge): meet the guide on the entrance path, learn movement, the camera toggle, carrying (help a porter with one bag through the Kani gate), the body bars (a short sprint tip), circling the stupa clockwise, checking into a lodge, then taking your first job.
1. Porter run: carry a 20 kg doko load from the bridge up through the gate to a lodge (timed bonus, and pacing matters).
2. Bakery delivery: deliver to 3 lodges before the bread cools.
3. Water duty: carry jerrycans from the stream to a teahouse.
4. Firewood/yak-dung gathering for a lodge stove.
5. Yak wrangler: guide 3 dzos from the market back to their pen through the crowds.
6. Market day trader: buy low and sell high across vendors on the open ground (prices change by day).
7. Monk's errand: deliver butter lamps and incense, then spin all the prayer wheels clockwise in order.
8. Lost trekker: find a missing item by asking NPCs for clues.
9. Sick trekker: a trekker on the stairs is showing altitude sickness. Bring them garlic soup and water, then help them walk down toward the bridge (teaches "descend to recover").
10. Guide a trekker group to the ridge viewpoint for their first Everest view (keep their pace, don't lose anyone, don't wreck yourself on the climb).
11. Photo job: photograph 6 landmarks (the stupa and Kani gate entrance view must be one) plus 3 "town life" moments (yak train, monks chanting, market crowd) for the visitor centre.
12. Fix the prayer flags: use ladders and rooftops to re-hang flags torn by the wind, including the flags on the big stupa.
13. Lodge help: carry supplies upstairs, serve dal bhat to the guests at their tables.
14. Permit runner: checkpoint → trekking agency.
15. Kids' game: hide-and-seek / chase near the stupa (a short running game, where the altitude makes long chases a bad idea).
16. Chain finale: the trekking agency's "Expedition Ready" assessment. Gather a full kit, reach acclimatization level 2+ (sleep in Namche and do one climb-high-sleep-low hike), pass the guide's gear check (the guide inspects the gear on your character), earn "Ready for the Khumbu".
- Economy: a full climbing kit takes about 35–50 minutes of play to afford. Reputation unlocks better-paying jobs and shop discounts. Lodge meals, tea, water and first aid cost money (a small sink that ties into §4).

## 12. GEAR SHOP AND INVENTORY (buy only; no climbing use yet)
- A main gear shop, a rental counter (deposit), a second-hand market stall, and a pharmacy/health post (water purification tablets, first aid, snacks, electrolyte drinks).
- 25+ gear items with config data (weight kg, insulation, price NPR, buy/rent, visual mesh): down suit, down jacket, base layers, fleece, liner gloves and mitts, high-altitude boots, crampons, ice axe, harness, jumar, carabiners, helmet, headlamp, goggles, sunglasses, sleeping bag, stove, fuel, bottles, trekking poles, backpacks, oxygen mask/regulator (display only). Invented brand names only.
- Equipped clothing and gear appear on the player model, visible in TPP, in the inventory preview, and in FPP (gloves, sleeves, boots).
- A try-on mirror/preview in the shop with a rotating 3D character.
- Inventory grid matching my Backpack Inventory mockup: total weight, item details, consumables (water, tea, snacks, garlic soup flask) with quick-use slots 1–4, equip/preview of the loadout on the 3D character.
- Purchases go into a persistent "expedition kit" for the future climbing build, along with the acclimatization level. Document it in docs/SAVE_FORMAT.md.

## 13. UI / HUD
- Matches my HUD mockups (Summit Push HUD, Oxygen Check, Backpack Inventory, Himalayan Summit Expedition HUD) and the prototype palette (Teko + Hind fonts, prayer flag blue/white/red/green/yellow, gold #e8b53a).
- Body panel (bottom-left, compact, readable in both modes), four labelled bars with icons and numbers:
  - HEALTH (red)
  - OXYGEN (cyan, SpO2 %)
  - NAUSEA (sickly green-yellow, fills up as it gets worse)
  - STAMINA (white/gold)
  - Bars pulse and flash when in danger, small arrows show whether each is rising or falling, and there's a tiny altitude readout (3,440 m), the hydration icon and the acclimatization day count.
- Rest of the HUD: carried weight, money, reputation, time of day, compass, minimap, mission tracker, interaction prompts, quick-use slots. A small centre dot in FPP; no crosshair in TPP, with prompts attached to the target instead. HUD opacity and scale settings; a minimal-HUD mode.
- Screens: main menu (with the entrance hero shot from §5 and a flyover at golden hour), character appearance, pause, settings (camera mode FPP/TPP, FOV, TPP distance, shoulder side, auto-align, head-bob, force FPP indoors, altitude effects intensity, reduce motion, graphics presets, sensitivity, invert Y, audio, keybinds), a character/health screen (all body stats, acclimatization level, tips), quest log, town map, inventory, shop with try-on, dialogue, mission complete, and a "woke up in the lodge" screen after fainting.
- Photo mode: hide the HUD, FPP/TPP/free camera within a radius, time-of-day slider, character poses (wave, look at the view, take a photo).
- Saves: autosave plus manual save, with localStorage + IndexedDB wrapped in try/catch.

## 14. PERFORMANCE (hard gates, RTX 3050 laptop, 16 GB, 1080p, measured in both FPP and TPP)
- Medium: ≥60 fps in the busiest crowd spot with 100+ NPCs at midday and at night, and at the entrance opening view. High: ≥45 fps. Ultra is allowed to be heavier.
- Medium: under 1,500 draw calls and 3 GB VRAM. Initial load ≤25 s, with assets cached afterwards.
- Instancing, LOD and impostors, frustum/occlusion culling, time-sliced AI, GPU skinning, KTX2 + Meshopt everywhere.
- Low preset gives 30 fps on integrated graphics.

## 15. HOW TO RUN IT
Phase 1: audit and plan (docs/NAMCHE_PLAN.md).
Phase 2: parallel agents:
  (a) terrain, compressed town layout, buildings, interiors, the bridge and entrance composition (§5)
  (b) far-view skyline and distant terrain
  (c) lighting, sky, weather, post-processing, baking
  (d) character optimization, rigging, modular NPC kit, shared animation library
  (e) player character, FPP/TPP camera system, foot/hand/look IK, gear-on-body
  (f) altitude body systems (§4), screen and audio effects, fainting/recovery flow
  (g) NPC AI: schedules, crowds, navmesh, reactions
  (h) player controller (jump, sprint, carry) wired into the body systems
  (i) missions, dialogue, tutorial, economy, save system
  (j) shop, pharmacy, inventory, gear data, try-on
  (k) UI/HUD/menus/photo mode
  (l) audio
Phase 3: integrate the full loop.
Phase 4: adversarial QA agents try to break every mission, item, collider, crowd, camera and body system (TPP camera clipping through walls or roofs, FPP seeing inside your own body, foot sliding or twisted feet, stuck NPCs, NPCs walking through walls, soft-locks, players falling through floors, frame drops in crowds, body bars that never recover, faint loops, exploits like infinite sprint, a body system that's too punishing or does nothing), then fix everything they find.
Phase 5: a polish pass on looks, lighting, life, animation, camera feel, altitude balance and pacing.
Commit after each phase. Don't push until I review.

## 16. ACCEPTANCE CHECKS (show evidence)
1. Clean `npm install && npm run dev` works on Windows. `npm run build` passes.
2. A new game spawns the player on the stone path just past the bridge, facing the Kani gate and the stupa. The opening view matches the entrance reference (§5) in composition: stupa centre, gate building right, path right foreground, open ground with tents left, boulder lower-left, terraced lodges and green ridge behind, blue sky with cumulus clouds.
3. Playwright e2e (real WebGL): new game → appearance → arrival tutorial at the bridge → at least 5 different missions (at least 2 in FPP and at least 2 in TPP, switching mid-mission once) → earn money → buy 5 items and consumables → items visible on the character → sleep in a lodge (acclimatization goes up) → save → reload → items, money, body stats, acclimatization and camera mode persist → finale completes. No console errors at any point.
4. Body-system unit tests:
   - SpO2 at rest at Namche is about 90% (unacclimatized); sprinting drops it at the configured rate; resting recovers it.
   - Continuous sprinting for 60 s raises nausea into stage 2+.
   - Walking never does. Rest/water/food/descending lower nausea at the configured rates.
   - Nausea 100 or SpO2 <75% for 5 s causes a faint, and the player wakes up at the nearest lodge with the right fee and time loss.
   - Health drops and recovers as specified.
   - Each acclimatization level raises resting SpO2 and slows nausea build-up.
   - Carrying 20 kg+ speeds up oxygen and stamina drain.
   - Trekking poles cut stair stamina cost by 15%.
   - Can't faint-loop: after waking up, the bars start in a safe range.
5. Balance test: a bot that walks and paces itself finishes all missions without fainting. A bot that sprints everywhere faints at least once in the first 10 minutes.
6. Movement tests: jump, sprint, stamina, and carry penalties at 10, 20 and 30+ kg match the specs in both camera modes.
7. Camera tests: a bot walks every lane, staircase, doorway and interior in TPP with zero frames where the camera is inside geometry. Mode switch ≤0.3 s. FPP never shows the inside of the player body.
8. Animation/IK tests: on stairs and slopes, foot height error under 3 cm, no foot sliding above threshold, and no rotated or mirrored [THE PASTE WAS CUT OFF HERE, IN THE MIDDLE OF ACCEPTANCE CHECK 8]

---

## Owner's direction sent with the brief (2026-11-11), verbatim

> ANALYZE ALL PREVIEWS CHATS AND WORK DONE AND MAKE CHANGES. ADJUST THE BUILDING AND THE CHARACTER TO THE SCALE OF THE CHARACTER AND THE CAMERA ANGLE OF THE PLAYER, Let's maintain everything and we are good, And the views from every angle, Scan all pic given to you of the views, Try to replicate the views and the sharpness , textures, and the scale of the mountain properly. Watch path ways and how they are elevates with the terrain and how they blend with the shrounding buildings. Lets try to simulate a good lighting , Wind physics, Cloud simulation, Weather simulation, Fog, Mist, Clear sun shine, lense Flare, SUnset lighting etc. Water reflection , Water volume, Grass simulation, Grass texture, Wood texture, VOLUME of grenneery, Snow, Chaning weather, 1hr in real life is 1 day in game. Cloth physics. Cloth physics.

Eight view photos came with it. They are saved locally as `reference/chat/chat_13.png` to
`reference/chat/chat_20.webp` (night Thamserku over the lit town; night Kongde Ri long exposure, twice;
teal panorama of the amphitheatre; daytime from the west ridge with Thamserku; snowy Kongde Ri day; the
row of prayer-wheel pavilions beside the stream path; a glass-fronted gear shop).

## Orchestrator notes (not the owner's words)

How the owner's direction is read, as extra requirements on top of the brief:

1. **Scale to the character.** Buildings, doors, steps, props and characters must look right from the
   player's own eye (1.62 m) and from the third-person camera. Human scale is fixed; the town is fitted
   round it.
2. **Replicate the views.** Every reference view is a target: composition, mountain scale in frame,
   sharpness, textures, colours and light. Each one becomes a named test camera with a side-by-side in
   `docs/VISUAL_COMPARE.md`.
3. **Pathways.** Lanes and stairs must follow the terrain and meet the buildings beside them cleanly:
   thresholds at door height, no floating or buried paths, retaining walls where the ground steps.
4. **Simulation list.** Lighting, wind physics, cloud simulation, weather simulation, fog, mist, clear
   sunshine, lens flare, sunset lighting, water reflection, water volume, grass simulation, grass texture,
   wood texture, volume of greenery, snow, changing weather, and cloth physics (asked for twice).
5. **Clock.** One real hour is one game day (24 game hours in 3,600 real seconds).

Acceptance checks after number 8 were lost with the cut-off. Until the owner supplies them, these are
inferred from the body of the brief and treated as checks 8 to 14:

8. Animation and IK: foot height error under 3 cm on stairs and slopes, no foot sliding above threshold,
   no rotated or mirrored feet or limbs (completed from section 3).
9. Scale: the automated bounding-box test for human-proportion assets passes (section 1).
10. Skyline: peak bearing and elevation angle within 1 degree of real from the entrance spawn, the town
    centre and the ridge viewpoint (section 1 and 8).
11. NPCs: 80 to 120 visible in the busy daytime, up to 200 on market day, none stuck or inside walls
    (section 6).
12. Performance gates of section 14, measured in both camera modes, written to `docs/PERF_REPORT.md`.
13. Visual comparison: the entrance hero shot beside the reference, and the other signature vistas, in
    `docs/VISUAL_COMPARE.md` (sections 5 and 8).
14. Docs exist and are current: `NAMCHE_PLAN.md`, `CREDITS.md`, `SAVE_FORMAT.md`, `VISUAL_COMPARE.md`.

Where the brief and the older `CLAUDE.md` disagreed (single HTML file, three.js r128), the brief wins:
it is the newer instruction from the owner. `CLAUDE.md` was rewritten on this branch to match.
