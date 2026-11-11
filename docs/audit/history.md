# Chat history audit: requirements and lessons record

Audit task `chat-history`, branch `namche-playable`, 2026-11-11. Read-and-report only. Nothing in the
repo was changed except this file and scratch files under `out/audit-chat-history/`.

## Sources and limits

- **Transcript:** `C:/Users/prash/.claude/projects/F--MOUNTAIN-himalaya/0f3c2e3f-74ae-4a92-afa1-c0d22300a512.jsonl`
  (3,897 lines, 92 MB, one session, 2026-11-11 13:20 to 17:44 UTC = 19:05 to 23:29 Nepal time).
  `Ln` below means line n of that file.
- **Extract:** `out/audit-chat-history/dialogue.txt` (4,640 lines, read in full) and
  `out/audit-chat-history/owner_messages.txt` (the owner's 13 messages, verbatim). Made by `extract.py` there.
  `crossings.py` in the same folder is a read-only check of the OSM export used in section 4.
- Also read: the 6 memory notes, `docs/INVENTED.md`, `docs/MISSION.md`, `git log --stat` for `main`,
  `fix/geometry` and `namche-playable`, 10 of the 20 chat images in `reference/chat/`, and the renders of
  gate3, stupa2, bridge2 and the character line-up in `assets-src/higgsfield/`.
- **Not available:** this is the only transcript on the machine. The prototype (commit `043d226`) was built
  in an earlier cloud chat (its scripts still had sandbox paths such as `/home/claude/namche/`). That chat
  is not stored here, so whatever the owner asked in it is not in this record. `README.md` and
  `docs/HIMALAYA_The_Summit_Concept_Brief.docx` (plain text, v0.2) are the only traces of it.
- Owner quotes are verbatim, typos included. Line breaks inside pasted briefs are joined with a space.

## The short version

1. **One evening, 13 owner messages, one arc:** verify the prototype, fix its geometry, look at the real
   entrance, make landmark models and characters on Higgsfield, then replace the whole goal with the
   playable-game brief (`docs/MISSION.md`).
2. **Nothing learned about the real entrance was ever coded.** On `fix/geometry` the game still draws an
   invented stupa at (76.6, 169.6), 120 m east of the real one at (-42, 157); it has no gate, a plank
   bridge on a culvert, and the stream as a blue ribbon on the paving.
3. **The owner's only verdict on landmark models** was on the first batch: "they dont look like the real
   ones, Specially the stupa". The second batch (stupa2, bridge2, gate3) was judged good by the assistant
   alone. The owner never commented on it, though the brief's "Kani gate 4.5 m square with a single gold
   finial" (`docs/MISSION.md:16`) matches gate3.
4. **Scale comes from people.** Sizes in section 4 were measured from a 1.75 m walker in the owner's
   photos and are good to about 15%.
5. **No more credits.** About 312 Higgsfield credits left the account in the session; 37.27 remain and
   must not be touched (`docs/MISSION.md:11`).
6. **Task 1 passed every row of its 14-row acceptance table** but left 3 failing stair flights, 36 doors
   over 1 m above the ground, 36 clashing roof pairs and a bad spawn view. The assistant's 10 closing
   questions were never answered. Task 2 (PBR) and Task 3 (baked AO) never started.
7. **The four character models are static, unrigged, 17 to 22 MB each,** with props fused into the mesh
   and guessed backs. The third-person camera now puts the player's back on screen all the time.
8. **Everything generated is in `assets-src/higgsfield/`** (616 MB, git-ignored); the owner's 20 chat
   images are in `reference/chat/`; measuring sheets are in `reference/measure/`.
9. **Two things the owner promised or the paste lost:** `docs/reference/namche_entrance.jpg` does not
   exist, and the brief stops in the middle of acceptance check 8.
10. **The opening scene's bridge is not in the data.** The brief starts the player having "just crossed
    the bridge over the stream" below the gate. The OSM export has no bridge, and the approach trail
    crosses no stream. The only crossing is a culvert 14 m inside the gate. This needs the owner's answer.

## 1. Timeline of what the owner asked

Times are Nepal time on 2026-11-11.

| # | Time | Ln | The owner's words | What followed |
|---|---|---|---|---|
| 1 | 19:05 | L3 | Pasted brief, Tasks 0 to 3. "Read CLAUDE.md and README.md first. This repo is a working browser game of Namche Bazaar built from OpenStreetMap geometry on SRTM terrain. Do not rewrite it from scratch. Work in place." Task 0 ends: "STOP HERE and show me the screenshots before continuing." Rules end: "Stop after each task and wait for my review." | Task 0 run and passed. Seven screenshots sent with nine ranked faults and two questions (invented items, stairs scope). |
| 2 | 19:23 | L291 | Second pasted brief. "Proceed with Task 1 exactly as defined in the original brief (T1a–T1d), with the decisions, rules and checks below added on top. Where this prompt and the original brief conflict, this prompt wins." "DECISION 1 — Invented items: KEEP, but mark them". "DECISION 2 — Stairs scope (T1d)". "Stop before Task 2 and wait." | Task 1 done in 8 commits on `fix/geometry`, reported at 20:24 with 10 questions. |
| 3 | 20:30 | L1613 | "ill look into how the game looks first" | Assistant waited and gave run instructions. The 10 questions stayed unanswered. |
| 4 | 20:34 | L1621 | (1 image: game screenshot at the bridge) "Let's Talk about the bridge section and the pass through of the bridge section how the reallife pass around looks like and the geographical alignmrnt of the buildings pavements, water, Stupa, Bridge etc. And lets use higgs field to create individual 3d render land mark and pavement . Let,s just have a look and compare no code changes just yet." | Look-only comparison of OSM, the 44 files in `reference/namche/` and the game. No code, no credits. |
| 5 | 20:38 | L1767 | (3 photos) "these are aditional images that might help" | Pavilion close-up, entrance view, pavilion row. OSM checked: the stream runs beside the main steps. |
| 6 | 21:08 | L1817 | (8 images) "one more, I can also show you a google earth top pov explaining the geography and the path ways. Yellow colour are the similar archetecture buildings with prayer wheels, And the very opening a yellow similar archetecture building gate, Blue lines is the water flow, Light cyan green lines are sharp edge and line and elevated object, Red line are bridge. White like the main stupa. You can also see a morden lights resturant on the almost top left while entiring Put the himan to scale. WIth the refrences while you make changes next time. This also has the top sky view. Now lets update your memory and execute higgsfield renders. I need renders to fill this perfectly then we can just fill up other using 4 sets, Of render buildings 4 varients and and copying and editing on those mock ups according to the geo graphical locations." | Memory notes written. First batch of 7 models (76 credits). |
| 7 | 21:19 | L2125 | "they dont look like the real ones, Specially the stupa, The prayer wheel building is kinda fine, A bridge and a entrance gate , I don't want to cheap out in this area i want them as close to the real ones, You can also render the paths and the waking area texture. And let,s build to scale, using human size from the images. yes test tripo" | Photos measured. Six ground textures. Tripo failed twice. Concept pictures, then stupa2, bridge2, gate2, gate3. |
| 8 | 21:33 | L2490 | "I've added higgsfield credit its now 200+" | Balance 234.77. |
| 9 | 21:48 | L2862 | "Ok so we have a lot of RENDERS Lets make character design and character render, 6 character render. matching to its game environment." | Six character sheets and six in-scene renders. Cast and style were the assistant's picks. |
| 10 | 22:02 | L3236 | "can you implement it in game without the 3d render of the model charecter? with just the Inspo images can you replicate it just as well??" | Owner interrupted the long answer. |
| 11 | 22:03 | L3242 | Same question, ending "JUst ask yes or no?" | Answer: "No." Landmarks could come close from images alone; characters could not. |
| 12 | 22:05 | L3257 | "Ok then do the renders of the four character, Lets skip the porter and the yak guy. But i want those render clean and fast this has taken alot of credit already." | Four 3D character models (60 credits, 44 had been quoted). Balance 37.27. |
| 13 | 23:13 | L3688 | (8 view photos) The playable-game brief, pasted under the keyword "ultracode", then: "ANALYZE ALL PREVIEWS CHATS AND WORK DONE AND MAKE CHANGES. ADJUST THE BUILDING AND THE CHARACTER TO THE SCALE OF THE CHARACTER AND THE CAMERA ANGLE OF THE PLAYER, Let's maintain everything and we are good, And the views from every angle, Scan all pic given to you of the views, Try to replicate the views and the sharpness , textures, and the scale of the mountain properly. Watch path ways and how they are elevates with the terrain and how they blend with the shrounding buildings. Lets try to simulate a good lighting , Wind physics, Cloud simulation, Weather simulation, Fog, Mist, Clear sun shine, lense Flare, SUnset lighting etc. Water reflection , Water volume, Grass simulation, Grass texture, Wood texture, VOLUME of grenneery, Snow, Chaning weather, 1hr in real life is 1 day in game. Cloth physics. Cloth physics." | Branch `namche-playable`, local Node, `docs/MISSION.md`, new `CLAUDE.md`, this audit. The owner had switched the model to `claude-fable-5-2` at 22:59. |

The brief in message 13 is byte-for-byte the body of `docs/MISSION.md` (checked by diff: 213 lines, the only
difference is the cut-off marker on line 215).

**The chat images** (`reference/chat/`): 01 game screenshot at the bridge; 02 pavilion close-up; 03 the
entrance view the brief describes in section 5 (a web image, 1,400 x 1,050); 04 pavilion row beside the
channel (same bytes as 19); 05 annotated Google Earth top view; 06 the same view without marks; 07 whole
town with the entrance ringed in red; 08 wider town view; 09 the kani gate from outside at dusk; 10 the
same, annotated; 11 the view from just inside the gate; 12 the same, annotated; 13 to 20 the eight view
photos listed in `docs/MISSION.md:223`.

## 2. Standing decisions and preferences

| # | Decision or preference | The owner's words | Where | Status now |
|---|---|---|---|---|
| 1 | Geography comes from data | "Never invent geography. Footprints, paths, streams and POIs come from data/raw/namche-osm.geojson. Elevation comes from SRTM. Comment anything you add." | L3 | In force. The brief allows compressing distances, not reordering. |
| 2 | Invented items are kept but marked | "DECISION 1 — Invented items: KEEP, but mark them". "Every item not backed by OSM or the DEM (the ridge chorten, the terraces, and anything else you placed by judgement) gets `invented: true` in the data, plus a short `reason` string." "Add one switch that hides all invented items" | L291 | Built in the prototype (`?real`). The new game needs the same registry. |
| 3 | Invented items are visible as such | "Minimap legend: invented items get a visually distinct marker." "Create docs/INVENTED.md listing every invented item: name, position, reason, and what real reference would replace it." | L291 | Built. `docs/INVENTED.md` is now partly wrong (section 5, rule 1). |
| 4 | Reference photos stay local | "reference/ is local-only working material. Never commit, publish or embed those photos." | L3 | In force. The owner's photos were never uploaded; only generated pictures were. |
| 5 | Attribution | "Keep the OpenStreetMap ODbL attribution visible on the page." | L3 | In force. |
| 6 | Landmarks must match the real ones | "I don't want to cheap out in this area i want them as close to the real ones" (stupa, bridge, entrance gate) | L2125 | In force. The strongest fidelity statement in the chat. |
| 7 | The pavilion is acceptable | "The prayer wheel building is kinda fine" | L2125 | Only one pavilion model exists. The assistant thought its roof wrong. |
| 8 | Scale from people | "And let,s build to scale, using human size from the images." "Put the himan to scale. WIth the refrences while you make changes next time." "ADJUST THE BUILDING AND THE CHARACTER TO THE SCALE OF THE CHARACTER AND THE CAMERA ANGLE OF THE PLAYER" | L2125, L1817, L3688 | In force. Said three times. |
| 9 | Annotation colour key | "Yellow colour are the similar archetecture buildings with prayer wheels, And the very opening a yellow similar archetecture building gate, Blue lines is the water flow, Light cyan green lines are sharp edge and line and elevated object, Red line are bridge. White like the main stupa." | L1817 | Use it to read `chat_05`, `chat_10`, `chat_12`. |
| 10 | Look-only phases mean no code | "Let,s just have a look and compare no code changes just yet." | L1621 | Standing habit. Ask before coding after a look-only request. |
| 11 | He looks before he reads | "ill look into how the game looks first" | L1613 | He opens the game first. Reports and tables come second. |
| 12 | Fill the town from four building types | "I need renders to fill this perfectly then we can just fill up other using 4 sets, Of render buildings 4 varients and and copying and editing on those mock ups according to the geo graphical locations." | L1817 | Never done. Now a local, no-credit job. |
| 13 | Ground textures matter | "You can also render the paths and the waking area texture." | L2125 | Six textures made; the brief now asks for CC0 PBR materials. |
| 14 | Characters fit the place | "6 character render. matching to its game environment." then "Lets skip the porter and the yak guy." | L2862, L3257 | Four hero models. Porter and yak herder exist as 2D sheets only. |
| 15 | Credits are a worry | "But i want those render clean and fast this has taken alot of credit already." "Do NOT spend any Higgsfield credits. Use local tools only" | L3257, `MISSION.md:11` | Zero credits from now on. |
| 16 | Replicate the views | "Scan all pic given to you of the views, Try to replicate the views and the sharpness , textures, and the scale of the mountain properly." | L3688 | Every reference view is a target. |
| 17 | Paths meet the ground and the buildings | "Watch path ways and how they are elevates with the terrain and how they blend with the shrounding buildings." | L3688 | In force. |
| 18 | Simulation list and clock | "1hr in real life is 1 day in game. Cloth physics. Cloth physics." | L3688 | Cloth physics is the only item he repeated. |
| 19 | Stop and wait; never push | "Stop after each task and wait for my review." "Nothing is pushed to main except the Step 0 pipeline fix." "Commit after each phase. Don't push until I review." | L3, L291, `MISSION.md:196` | In force. `main` is 1 commit ahead of `origin`; nothing else is pushed. |
| 20 | Small commits that can be reverted | "Commit after each sub-task (T1a, T1b, T1c, T1d) with a clear message, so each one can be reverted on its own." | L291 | Habit to keep. |
| 21 | Evidence with every visual change | "One branch and one commit per task. Before/after screenshots for every visual change." Deliverable: "Acceptance table: check \| expected \| measured \| PASS/FAIL." | L3, L291 | In force. |
| 22 | Say what you are unsure of | "Anything you weren't sure about, listed as questions for me." | L291 | In force. |
| 23 | The later instruction wins | "Where this prompt and the original brief conflict, this prompt wins." | L291 | This is why the brief overrides the old single-file rule. |
| 24 | Time-box side quests | "Don't burn time on it beyond ~15 minutes." | L291 | Habit to keep. |
| 25 | Short answers when asked | "JUst ask yes or no?" | L3242 | Answer the question first, in a word if asked. |
| 26 | Player-facing text | "UI text: plain English, typographic apostrophes, no em dashes." | L3 | In force. |
| 27 | Hardware | "Target an RTX 3050 laptop and mid-range phones. Keep the `coarse` path lighter." | L3 | The laptop target stands. The brief never mentions phones (see section 6). |
| 28 | Superseded | "Output stays one self-contained HTML file under 16 MB, three.js r128 from cdnjs only." | L3 | Replaced by the brief's TypeScript, Vite, three.js and Rapier stack. |

## 3. Work done so far and its state

### 3.1 Task 0: verify the baseline (passed)

- DEM `(2401, 1201)`, max 8840 m; 346 buildings; page 1.16 MB with one three.js r128 tag; no `PAGEERROR`;
  status "Ready" in all 7 views.
- Needed first: a path-only fix to `scripts/prep_osm.py` and `src/build.py` (commit `9525b53` on `main`).
- Faults found, worst first: (1) stairs as jagged floating slabs; (2) props placed anywhere, a bench in
  the Everest sightline; (3) invented items not marked; (4) terrace banding across hillsides; (5) buildings
  half buried on slopes; (6) grass on paving; (7) a 45 degree bank beside the stupa; (8) flat look, every
  material `MeshLambertMaterial`; (9) peak labels can sit under the HUD.
- Four more were faults in the screenshot script, not the game: HUD not following the free camera, night
  leaking into the next view, a stale Kongde Ri label, a badly framed gompa view.

### 3.2 Task 1: geometry, on `fix/geometry` (all 14 acceptance rows passed; unreviewed, unpushed)

| Part | Commit | What it did | Measured | Still open |
|---|---|---|---|---|
| T1a overlaps | `30e4ed9` | Cut back overlapping footprints; write footprints at 0.01 m | 9 sliver pairs, all under 0.11 m; 0 overlaps after | Nothing |
| T1b paths | `b3c6095` | Fixed a 1 m mask offset; pushed path centre-lines 1.6 m off walls; clipped masks by footprint plus 0.4 m | 0 path pixels inside a footprint; 22 points in alleys under 3.2 m wide, least clearance 1.19 m | The fix moved the spawn point |
| T1c foundations | `94f098d` | Floor = highest ground sample + 0.15 m; plinth to lowest - 1.0 m; door moved to the uphill wall | 0 of 346 walls buried; door sill median 0.33 m, p90 1.02 m, max 2.47 m | 36 doors over 1 m up, 119 over 0.5 m |
| T1d stairs | `ca39185`, `728935d` | Continuous flights between bends on all 4 `highway=steps` ways and on paths over 25 degrees; solid treads; terrain refined to 0.31 m under stairs; invisible ramp for walking | 124 flights (77 + 47), 2,909 treads; walk test 121 of 124 both ways; main street (424 m) passes; max sink 0.5 cm | Flights 45, 46 near (342, -166) and 101 near (-601, -286) each have one 0.25 to 0.27 m step; 12 flights outside the 0.15 to 0.20 m riser range; 251 short treads; touch devices 109 of 124 |
| Invented switch | `f546c26` | `SHOW_INVENTED` (`src/game.js:15`), `?real`, pink minimap diamonds, `scripts/invented_doc.py`, `docs/INVENTED.md` | 12 categories, 464 placements, 429 of them lamps | Stupa entry is wrong; lamps cluster |
| T1e props | not done | Only one rule borrowed: props keep 1 m off every path | 4 props had stood on stairs | Door and facade clearance; the bench in the Everest sightline |

The main bazaar flight is number 10: 54.4 m long, 10.4 m rise, 60 steps. Page size 1,228,349 bytes. Scene
triangles 2.50 M to 2.63 M. The prototype walks at 2.6 m/s and runs at 5.6 m/s with a 1.65 m eye
(`src/game.js:1611`); the brief asks for 1.3 and 3.5 m/s and a 1.62 m eye.

### 3.3 The screenshot harness (`scripts/shots.py`, commits `74e1eb3`, `cd92c9e`)

- Runs Playwright Chromium on the real GPU (`scripts/shots.py:53`). Renderer string logged on every run.
  Flags: `--use-angle=d3d11 --enable-gpu --ignore-gpu-blocklist --force_high_performance_gpu`.
- **0.2 s a shot and 14 to 20 ms a frame** on the RTX 3050 Ti, against 21.8 s and 2,662 ms on SwiftShader.
- Views: `intro spawn center stairs gompa view2 night2 ridge2 over`.
  Options: `--sw --page --query --suffix --out --poses --save-poses`. Before and after shots replay the
  same saved poses.
- `syncView()` (`src/game.js:1832`) moves player, HUD and line-of-sight to the camera before each shot.
- `?test` API (`src/game.js:1945`): `stairStats`, `walkFlight`, `walkAll`, `walkPath`, `mainStreet`, `stairsPose`.
- Evidence is in `shots/` (git-ignored): matched `_before`, plain and `_real` files. The Task 0 originals
  were overwritten.

### 3.4 Landmark models (Higgsfield; all files in `assets-src/higgsfield/glb/`)

| File | Route | Credits | Size, triangles, maps | Width x height x depth (m) | Verdict | Why |
|---|---|---|---|---|---|---|
| `gate3.glb` | Meshy multi-image from exact front and side pictures | 30 | 20 MB, 101,710, four 2K | 4.5 x 4.59 x 4.48 | **Good** (assistant) | Square, one gold finial, roundels, three red script panels, plaque. Matches `chat_09`. |
| `stupa2.glb` | Hunyuan image-to-3D from picture `stupa_c` | 15 | 50 MB, 198,832, four 4K | 8.76 x 10.8 x 8.43 | **Good with flaws** (assistant) | Right parts: arcade under a blue band, two tiers, eyes on the yellow box, green fringe, gold pyramid. Height to width 1.23 against a measured 0.95, so too tall and narrow. |
| `bridge2.glb` | Hunyuan image-to-3D from picture `bridge_b` | 15 | 49 MB, 200,000, four 4K | 1.62 x 1.21 x 5 | **Good** (assistant) | Maroon rails, white key pattern, curved in plan. 1.6 m wide where 2 m was asked. |
| `pavilion.glb` | Hunyuan text-to-3D, pro | 16 | 65 MB, 500,000, four 4K | 3.22 x 4 x 3.3 | "kinda fine" (owner); redo (assistant) | Pillars, colours and drum right. Chinese curved tile roof with dragons; the real roofs are flat ribbed sheet. |
| `spouts.glb` | Hunyuan text-to-3D, standard | 7 | 0.9 MB, 50,000, none | 3 x 0.89 x 1.07 | Shape only | Four spouts, basin, bench; grey and untextured. |
| `gate.glb` | text-to-3D, pro | 16 | 66 MB, 500,024, four 4K | 4.33 x 5.02 x 5 | Superseded | Close, but roundels too small and front too narrow. |
| `gate2.glb` | image-to-3D, one view | 15 | 53 MB, 199,982, four 4K | 3.26 x 3.33 x 4.5 | **Bad** | Too deep, two finials. |
| `stupa.glb` | text-to-3D, pro | 16 | 58 MB, 498,572, four 4K | 6.96 x 13 x 7.07 | **Bad** (owner) | Tall and thin, eyes on the dome, ringed cone spire. |
| `bridge.glb` | text-to-3D, standard | 7 | 0.9 MB, grey | 4 x 1.4 x 1.38 | **Bad** | Japanese garden bridge. |
| `restaurant.glb` | text-to-3D, standard | 7 | 0.9 MB, grey | 7.39 x 7.92 x 10 | **Bad** | Alpine chalet. Never redone. |
| `paving.glb` | text-to-3D, standard | 7 | 0.9 MB, grey | 6 x 0.7 x 6 | **Bad** | A raised slab. Paving belongs in a texture. |

Concept pictures and their side-by-sides with the photos are in `assets-src/higgsfield/concept/`
(`stupa_a` to `_c`, `gate_a` to `_c`, `gate_front`, `gate_side`, `bridge_a`, `bridge_b`). Job ids are in
the memory note `namche-render-plan.md`.

### 3.5 Ground textures (`assets-src/higgsfield/tex/`, GPT Image 2.6, 1K, said to tile)

`plaza_pale.png` (stupa plaza flagstones, 3 m tile, "a close match to ref_11"), `slabs.png` (trail and
stair slabs, 2 m), `setts.png` (lane setts and rough steps, 2 m), `dirt.png` (packed earth, 2 m),
`drystone_wall.png` (terrace wall, 2 m), `plaza_crazy.png` (first plaza try, rejected as too dark).
Colour only: no normal or roughness maps. Not checked by the owner.

### 3.6 Characters

Six original characters, each with a four-view sheet and an in-scene render in `assets-src/higgsfield/chars/`.

| # | Character | Height | 3D model | Known flaws |
|---|---|---|---|---|
| 1 | Sherpa climbing guide: red down jacket, white khata, orange rope, harness, maroon beanie | 1.68 m | `char_guide.glb`, 21.8 MB, 149,936 triangles | Rope baked into the mesh. His 2D render shows the gate passage taller than the measured 2.2 m. |
| 2 | Porter: bamboo doko on a forehead strap, T-stick, blue fleece | 1.60 m | none (skipped) | 2D only. |
| 3 | Lodge owner: pink blouse, green vest, maroon dress, striped apron, necklace, red thermos | 1.55 m | `char_lodge.glb`, 19.5 MB, 149,910 | Braid missing at the back. Thermos fused to the hand. Skirt is one volume. |
| 4 | Monk: maroon robes, saffron shirt, down vest, beads, round glasses | 1.65 m | `char_monk.glb`, 17.4 MB, 149,522 | Robe is one volume. Beads fused to the hand. |
| 5 | International mountaineer (player candidate): teal hardshell, grey fleece, gaiters, poles | 1.70 m | `char_mountaineer.glb`, 19.3 MB, 149,968 | Back has a small grey daypack instead of the charcoal pack with ice axe. Poles fused into both hands. |
| 6 | Elderly yak herder: wool wrap coat, red sash, felt hat and boots | 1.58 m | none (skipped) | 2D only. |

All four models: made from the front view only, one 4096 colour map, static standing pose, not rigged,
arms close to the body. Line-up at real height: `assets-src/higgsfield/chars/lineup_3d.png`. The wrong
back and the missing braid were reported in the chat (L3680). The fused props and one-volume robes are
this audit's reading of the line-up picture; they were not measured on the meshes.

### 3.7 After the brief (23:13 onward)

- Branch `namche-playable` cut from `fix/geometry`. Commits `2f30840` (brief, new `CLAUDE.md`, `tools/env.*`,
  ignore rules) and `ab2abca` (`.gitattributes`, LF endings).
- Node was not installed. Node v24.22.3 was put in `.tools/node` with its checksum verified.
- Machine measured: i7-11800H, 15.8 GB RAM with 4.2 GB free, RTX 3050 Ti with 4,096 MiB, F: is exFAT.
- Chat images, measuring sheets and all generated assets were copied out of the temporary scratchpad.
- Memory note `namche-playable-mission.md` written. Audit workflow started.

### 3.8 Credits

| Moment | Balance | Note |
|---|---|---|
| 20:35 | 149.77 | Basic plan. |
| 21:17 | 65.77 | First batch cost 76 (3 x 16 + 4 x 7). Another 8 went on four of the owner's own image jobs. |
| 21:34 | 234.77 | After the owner's 200 top-up. Textures (6 x 1.5) and two Tripo tries came before it. |
| 22:00 | 97.27 | Concept pictures, three image-to-3D jobs, the Meshy gate (30), 12 character pictures (2.75 each). |
| 22:18 | 37.27 | Four character models at 15 each. |

Not determined: an exact ledger. The log shows refunds of 5 + 5 for Tripo, but the balance arithmetic
leaves about 16 credits unexplained before the top-up (Tripo may have charged more than it refunded).

## 4. Measured real-world facts

Game grid: x east, z south, in metres, origin 27.8050 N, 86.7100 E (1 degree of latitude = 110,816 m, of
longitude = 98,541 m). Photo measurements assume a 1.75 m person and are good to about 15%.

| Feature | Fact | Source |
|---|---|---|
| Kani gate, position | OSM node/13793755901 `historic=city_gate` at (-25, 192). Trail way/551441451 passes through it with `tunnel=yes`. | OSM query, L1640 |
| Kani gate, front | About 4.5 m wide. Whitewashed walls about 2.6 m tall on a dark stone footing. | `chat_09`, 137 px per metre from the walker; `reference/measure/gate_scale.png` |
| Kani gate, passage | 2.1 m wide, 2.2 m high, between red posts. Stone steps visible through it. | same |
| Kani gate, frieze and eaves | Painted frieze about 0.33 m deep with three red script panels. Dark eave band about 0.65 m with 16 to 18 white roundels about 0.25 m across, about 0.29 m apart. | same |
| Kani gate, roof | Red clay-tile hipped roof, ridge 3.8 to 4.0 m. One gold finial on a red base, top about 4.5 m. | same |
| Kani gate, depth | Not visible in any photo. About 4 m assumed; gate3 came out 4.48 m deep and 4.59 m tall; the brief says 4.5 m square. | memory note; `MISSION.md:16` |
| Kani gate, surroundings | A black plaque left of the passage. Left of the gate: a stone trough with 3 to 4 brass spouts and a blue bench. Right: a stone retaining wall. | `chat_09` |
| Main stupa, position | OSM way/344630942 `man_made=stupa`, centroid (-42.4, 156.6), area 100.7 m2, bounding box 14.6 x 13.7 m, best-fit box 11.8 x 8.6 m. Up and to the left after the gate. | OSM query, L1665 |
| Main stupa, size | Base about 11 m across. Height about 0.95 x base, so 10 to 11 m. Dome about 0.6 x base (6.5 to 7 m). Spire about half the total height. Squat and broad, not tall and thin (the memory note's words). | `chat_03` and the top view; memory note |
| Main stupa, parts | Stepped white base whose lowest level is a prayer-wheel arcade under a deep blue band; two white tiers; round dome; yellow square box with the Buddha's eyes; green fringe; gold four-sided spire; small finial. | `ref_11`, `chat_03`, `chat_11` |
| Plaza round the stupa | About 26 x 16 m. Pale flagstones 40 to 120 cm, mostly rough rectangles, joints 5 to 10 mm. | Size: top view at 6.5 px per metre, calibrated on the 23.6 m stupa to fountain gap. Flagstones: the assistant's reading of `ref_11` for the texture prompt (L2321), not measured. |
| Fountain and pool | OSM node/11775705677 `amenity=fountain` at (-23, 170); water polygon way/1267933037 at (-21, 171). A sunken stone-lined rectangular pool with one tall jet. | L1640; `ref_11` |
| Lit restaurant | OSM node/12801708793 `amenity=cafe`, "Stupa cafe", at (-39, 177). Front-left as you enter, terrace with string lights. | L1640; `chat_09`, `chat_11` |
| Steps inside the gate | 4 to 5 m wide, about 6 risers (about 1 m) up to a landing between two railings. Water channels on both sides. A pavilion straight ahead, a small yellow-roofed kiosk, the stone wall on the right. | `chat_11`, `chat_12` |
| Bridge railings | 0.8 to 0.9 m high. Solid top band about 0.25 m deep with a continuous white key pattern, a matching lower rail, square posts about 0.3 m apart. Dark maroon. Curved in plan. Two of them, either side of the steps. | `chat_11`, `ref_11`, `ref_31` |
| Footbridge span | About 5 m long and 2 m wide. These were prompt figures, not measured. | L2536 |
| Bridges in OSM | None. The export has 0 bridge features. In the whole export a path crosses a waterway exactly once: way/1373254109 over the culverted way/1267933035 at (-29, 178), 14 m inside the gate. | L1665; this audit's check, `out/audit-chat-history/crossings.py` |
| Approach trail | way/551441452, 1,711 m, from (574, 1350) up to the gate at (-24, 194). The gate passage is way/551441451, 6 m long, to (-24, 188). Then way/1373254109, 14 m, to the foot of the main steps at (-30, 176). The trail never crosses a stream; it comes no nearer than 16.4 m to the stream below the gate (way/312775993, 852 m, from (-40, 191) to (-545, 813)). | this audit's check, `crossings.py` |
| Main steps | way/551442828 `highway=steps`, `surface=sett`, `width=2`, from (-30, 176) to (41, 74), 124.9 m long. | L1640, L1794 |
| Stream, course | Comes down from the north-east beside the main steps, 3.5 to 10 m from them, for about 70 m. Five culverts of 3.9 to 4.6 m alternate with open stretches of 4.3 to 6.8 m (ways 1267933025 to 1267933033). Then 21.7 m open past the fountain (way/1267933034), 24.7 m in culvert under the steps just inside the gate (way/1267933035), then open again from (-40, 191) south-west downhill (way/312775993). | L1640, L1805 |
| Stream, whole export | 15 stream ways, 6 of them `tunnel=yes`, 46 m in tunnel. | L1665 |
| Stream, look | A narrow sunken channel between two low concrete kerbs topped with dark slate. Not an open ribbon. Running water is not visible in any photo. | `ref_09`, `chat_04` |
| Prayer-wheel pavilions | 2.2 to 2.8 m square, about 3.5 m tall. Drum about person height and about 1 m across, red with gold lettering. A row of about 5 over about 35 m, 7 to 8 m apart, stepping down beside the channel, plus one beside the stupa. Not in OSM. | top view; `chat_02`, `chat_04`, `ref_09` |
| Pavilion look | Square stone plinth, low maroon railing, four maroon pillars with painted capitals, stacked painted block frieze, ribbed sheet roof (dark grey with a green edge, or red with a gold finial). | `chat_02` |
| Are the wheels water-driven? | Unconfirmed. The five 4 m culverts match the five pavilions, which suggests it. The brief speaks of "the stream with water-powered prayer wheels". | L1810; `MISSION.md` section 7 |
| Memorial chorten | OSM node/11704172271 at (-32, 163), Pemba Doma Sherpa memorial. This is the white chorten in the owner's game screenshot. | L1640 |
| Ground types | Flagstones on the plaza, rectangular slab stairs, rough block steps in lanes, bare dirt on the market ground in front of the stupa, concrete kerbs, boulder retaining walls 1.5 to 2 m high. | photo scan, L1728 |
| Buildings | Low-pitched gables with deep eaves. Dressed light-grey stone. Window frames green, blue, red or maroon. Timber upper storeys and balconies. Roofs mostly blue or turquoise and green, then red or orange, some grey sheet. | photo scan, L1728 |
| Entrance view (`chat_03`) | From the path below the gate: stupa centre, red-roofed gate right, flagstone path right foreground, dirt ground with tents left, boulder lower left. The gate is about 2 to 2.5 people tall. | `chat_03`; `MISSION.md` section 5 |
| Prototype numbers | 346 buildings; 21,910 m of paths; 4 `highway=steps` ways; DEM `(2401, 1201)`, max 8840 m; HUD read 3,399 m at 27.8033 N, 86.7097 E by the gate. | Task 0 and 1 logs |
| Photos not to trust for the entrance | `ref_16`, `ref_17` (may not be Namche), `ref_21` (Syangboche), `ref_23`, `ref_24` (which kani is unknown), `ref_03`, `ref_04` (game screenshots). `ref_32` and `ref_33` are the same file. | photo scan, L1728 |

**What the owner's marks show** (this audit's reading of `chat_05`, `chat_10` and `chat_12`, using his key):

- White: the stupa, west of the junction.
- Yellow: one pavilion on the stupa's east side; five boxes in a row running north along the water; an
  L-shaped red-roofed building south-west of the junction (it sits where OSM has the Stupa cafe); the gate
  south-east of the junction.
- Blue: water from the north down the pavilion row, through the fountain, then on to the south-south-west,
  passing west of the gate. Seen from inside the gate it comes down from the upper right along the top of
  the stone wall and leaves to the left below the left-hand railing.
- Red: one long railing on the west side of the water north of the fountain and one short curved one at
  the junction just south of it. From inside the gate these are the railings on either side of the steps.
- Light green: the kerb round the stupa plaza, the wall west of the pavilion row, the wall running south
  from the gate, step edges and the restaurant terrace edge.

**Where sources disagree**

| Subject | One source | Another | Note |
|---|---|---|---|
| Stupa in OSM | `docs/INVENTED.md:15`: no stupa mapped within 150 m | OSM way/344630942 `man_made=stupa` at (-42, 157) | OSM is right. The doc predates the entrance work. |
| Gate depth | Brief: "4.5 m square" | Photos show only the 4.5 m front | Depth is an assumption taken from gate3. |
| Stupa proportions | stupa2: 10.8 m tall on an 8.8 m base | Measured: about as tall as its 11 m base | Rebuild to the measured shape. |
| Stupa spire | Photos (`reference/measure/stupa_tops.png`): a smooth four-sided gold pyramid | Brief section 5: "a tall golden spire with tiers" | The photos show no tiers. Follow the photos and tell the owner. |
| Pavilion height | Photo scan: 2 to 2.5 m | Measured with a person: about 3.5 m | Use 3.5 m; the drum alone is person height. |
| Stair risers | Task 1: 0.15 to 0.20 m (built 0.12 to 0.214 m) | Brief: 0.17 to 0.20 m | The brief is newer. |
| Eye height and speed | Prototype: 1.65 m, 2.6 and 5.6 m/s | Brief: 1.62 m, 1.3 and 3.5 m/s | The brief is newer. |
| Where the models are | Brief and memory: "the Claude scratchpad glb folder" | `assets-src/higgsfield/glb/` | Copied at 23:22. The scratchpad is temporary. |
| Fountain jet height | Photo scan: "roughly 3-4 storeys" | No other source | Unverified. |

## 5. Mistakes and lessons, as rules for the build

1. **Read every OSM tag before calling something missing.** The real stupa was in the data as a building
   polygon tagged `man_made=stupa`. The pipeline drew a two-storey house there and invented a stupa 120 m
   away. `docs/INVENTED.md:15` and `scripts/prep_osm.py:412` still say no stupa is mapped. That is wrong.
2. **Honour `tunnel=yes` on waterways.** `scripts/prep_osm.py:71` takes every waterway as an open stream,
   so culverts became ribbons and the one path crossing got a plank bridge on top of a culvert.
3. **Do not put a bridge wherever a path meets a stream.** OSM maps no bridges here. The real ones are two
   short railinged crossings just inside the gate.
4. **Never trust a generic idea of "Himalayan".** Unguided models gave a Chinese dragon roof, a Japanese
   garden bridge and an Alpine chalet. Build from the photos and the measured sizes.
5. **Measure first, then model.** The first stupa was 13 m tall on a 7 m base; the real one is about as
   tall as it is wide. Measuring from a person in the photo found this in minutes.
6. **Put the result beside the photo before showing it.** Each good result in the second batch came after
   a side-by-side with the reference. The first batch was shown without one and was rejected.
7. **Model anything with depth from front and side, never one view.** The one-view gate came out too deep
   with two finials. The one-view characters have invented backs.
8. **Check all sides of a character.** The assistant accepted the mountaineer's wrong back because "her
   back is rarely on screen" in first person. Third person is now required, so that reasoning is void.
9. **Quote costs exactly or not at all.** Estimates were wrong twice (76 expected against 84 gone; 44
   quoted against 60 charged). The owner's next message was about credits.
10. **Do not overwrite evidence.** The Task 0 screenshots were overwritten by the Task 1 batch. Write each
    run to its own folder or suffix and keep matched poses.
11. **One convention for pixel centres.** Data prep and the game disagreed by half a pixel, which put every
    mask 1 m off. Share the convention and test it with an exact per-pixel check.
12. **Round late and finely.** Writing footprints at 0.1 m brought back overlaps that had just been removed.
13. **After moving floors, re-check doors.** Raising floors left doors a median 3.3 m in the air until the
    door wall was changed, and 36 are still over 1 m up. The orchestrator's note 3 (thresholds at door
    height) comes straight from this.
14. **Props need a clearance test against paths, doors and facades.** Four stood on stairs and blocked the
    walk test. Lamps placed by spacing alone clustered to 429.
15. **Define spawn and hero cameras outright and screenshot them.** The spawn was a side effect of a mask,
    so a mask fix turned it to face a wall.
16. **Test walking with the real controller.** The walk test drove the same `movePlayer()` code as play,
    and it found faults that the geometry statistics had passed.
17. **Use the real GPU for screenshots.** It is over 100 times faster than SwiftShader, and slow frames
    had caused a false bug (the stale label). The old `CLAUDE.md` line "There is no GPU here" was wrong.
18. **Write long scripts to a file.** Long inline heredocs failed twice in Git Bash on quoting.
19. **Resolve paths from the repo root.** The imported scripts had another machine's absolute paths.
20. **Check a claim against the repo before acting on it.** The second brief said of the gompa framing
    "the view was already changed". It had not been.
21. **Keep durable facts in the repo.** The session ran out of context once (968,372 tokens compacted). The
    memory notes carried the entrance layout across; anything only in chat would have been lost.
22. **Hero models are heavy by default.** 17 to 66 MB and 100,000 to 500,000 triangles each. Budget size
    and triangles before using any of them.
23. **Stale rules can reach an agent.** This audit was handed the old `CLAUDE.md` text (single HTML file,
    three.js r128, SwiftShader) in its context, while the file on disk is the rewritten one. Agents should
    read `CLAUDE.md` from disk.

## 6. Open items and promises not yet kept

**From Tasks 0 to 3**
- Task 2 (PBR materials, tone mapping, environment map, normal maps) and Task 3 (baked ambient occlusion)
  were specified in L3 and never started. The brief's section 9 now covers the same ground.
- T1e props pass not done.
- The 10 questions at the end of the Task 1 report (L1609) have no answers: props, gompa view, 36 clashing
  roof pairs (14 by more than 1.5 m), door steps, spawn rule, stylised features, lamp thinning, short
  treads on steep ground, banding beside flights, the Task 0 night shot.
- Peak labels under the HUD, grass on paving and terrace banding were reported in Task 0 and not shown fixed.
- `fix/geometry` has never been reviewed by the owner. `main` holds one unpushed commit.

**From the entrance work**
- The real entrance is not built anywhere: stupa on way/344630942, gate on node/13793755901, fountain and
  pool, culverted channel, two railinged crossings, steps and landing, five pavilions, spouts and bench,
  the Stupa cafe, the dirt market ground.
- `docs/INVENTED.md` needs its stupa entry corrected and the pavilions, bridges, spouts and tents registered.
- The four building variants were promised and never made. The assistant's proposed four: a 3 to 4 storey
  grey stone lodge with a blue gable roof and glass top floor; a whitewashed house with a timber upper
  storey and red roof; a long 4 to 5 storey lodge block with a green roof; a small dry-stone house.
- Never redone: the pavilion roof, the lit restaurant, the textured water spouts.
- stupa2's proportions and bridge2's width need correcting when they are rebuilt.
- Whether the prayer wheels are water-driven was never settled. The assistant asked for a closer photo.

**From the character work**
- Four models need cutting to 5,000 to 10,000 triangles, a 2K texture, 2 MB or less, and rigging
  (`MISSION.md:21`). Fused props and one-volume robes make clean rigging doubtful.
- Mountaineer's back and lodge owner's braid are wrong. Porter and yak herder have no 3D model, yet the
  brief needs porters and yak herders in the crowd.

**From the brief**
- `docs/reference/namche_entrance.jpg` is not there ("I'll drop the photo into
  /docs/reference/namche_entrance.jpg; if it isn't there, follow the written description exactly").
  `reference/chat/chat_03.webp` shows that view.
- The paste stops inside acceptance check 8. Checks 9 to 14 in `docs/MISSION.md` are the orchestrator's guesses.
- **"The bridge" at the start is ambiguous.** The brief has the player "just crossed the bridge over the
  stream" below the gate. OSM has no bridge, and the approach trail crosses no stream (section 4). The
  only crossing in the data is 14 m inside the gate. The owner calls the whole gate area "the bridge
  section". Which bridge he means cannot be settled from the chats. Ask him, and until then match the
  entrance photo. A bridge below the gate would be an invented item.
- Phones: the first brief targeted "mid-range phones"; the new one never mentions them.
- `NAMCHE_PLAN.md`, `CREDITS.md`, `SAVE_FORMAT.md`, `VISUAL_COMPARE.md` do not exist yet.
- The memory note `namche-render-plan.md` still says the raw models live in a temporary folder. They are
  now in `assets-src/higgsfield/`.

## 7. What the owner will look at first

Inferred from what he sent, what he praised and what he rejected. He opens the game before any report.

1. **The opening view** from the path below the gate against `chat_03`: stupa centre, red-roofed gate
   right, flagstone path right foreground, tents on dirt left, boulder lower left, lodges climbing behind.
2. **The stupa.** Squat, in the right place up and left of the gate, eyes on the yellow box, gold spire,
   prayer wheels under the blue band. It is the thing he singled out as wrong.
3. **The kani gate** against `chat_09`: 4.5 m square, one gold finial, white roundels, three red script
   panels, red posts, and a person who fits the 2.2 m passage.
4. **Walking through the gate** against `chat_11` and `chat_12`: the steps, the two maroon key-pattern
   railings, water on both sides, the pavilion ahead, the lit restaurant front-left, the stone wall right.
5. **People to scale** beside the gate, doors, steps and prayer wheels, from the first-person eye and from
   the third-person camera.
6. **The water.** A narrow sunken channel that goes in and out of culverts, a fountain pool with a jet.
   No blue ribbon on the paving and no plank bridge.
7. **The pavilion row:** about five, stepping down beside the channel, big red drums, the right roof.
8. **Paths and stairs:** sitting on the terrain, meeting door sills, no floating slabs, no buried walls.
9. **Buildings from his top view:** right roof colours in the right places, gables with deep eaves, grey
   stone, coloured window frames, neighbours that differ.
10. **The eight view photos** (`chat_13` to `chat_20`): Thamserku and Kongde Ri at the right size in
    frame, sharp, by day, by night and in snow; the lit town at night.
11. **Cloth.** Prayer flags, tarps and clothing moving in wind. He wrote it twice.
12. **A day passing in an hour:** sunset light, fog and mist, clear sun, lens flare, changing weather.
13. **The four characters** in the world: recognisable from their sheets, colourful, feet on the ground,
    the guide waiting at the entrance, the player's back correct in third person.
14. **Smoothness on his own laptop** (RTX 3050 Ti, 4 GB, about 4 GB of free RAM).
15. **The evidence:** before and after pictures beside his references, honest pass and fail tables, a list
    of what is unsure, nothing pushed, no credits spent.
