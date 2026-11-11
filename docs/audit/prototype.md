# Prototype audit: what to reuse from the walkable Namche concept

Audited 2026-11-11 on branch `namche-playable` at commit `ab2abca`. Read in full: `src/game.js`,
`src/template.html`, `src/build.py`, `scripts/shots.py`, `scripts/invented_doc.py`, `scripts/prep_osm.py`,
`docs/INVENTED.md`, `README.md`. Every number below marked "measured" comes from running
`build/namche.html?test` headless on this laptop's RTX 3050 Ti (read-only scripts in `out/audit-prototype/`,
section 8). `build/namche.html` was checked to contain `src/game.js` and `data/data.js` byte for byte.

## 0. The short version

- **What it is.** One 1,950-line async IIFE (`src/game.js`, 168 KB) on three.js r128, fed by one data file
  (`data/data.js`, 1.05 MB). It builds everything at load: terrain, 124 stair flights, 346 buildings,
  landmarks, vegetation, sky, HUD. Measured: build 3.4 to 3.9 s, 2.64 M triangles, 27 to 42 draw calls,
  16.3 to 16.5 ms a frame at 1920x1080 (capped by vsync, so the real headroom is unknown), 322 MB JS heap.
- **`src/template.html` is mostly dead code.** Lines 1 to 203 are the live shell (CSS, HUD markup).
  Lines 204 to 1320 are an older copy of the game that `src/build.py:6-7` throws away. It reads `D.ground`
  and `D.access`, which no longer exist. Never port from it.
- **Worth porting, in order:** stair flight layout, terrain fit under stairs, the walk surface with its
  walk tests, the pipeline fixes in `prep_osm.py` (footprint overlaps, paths off walls, mask pixel
  convention), foundations, the spatial hash and placement helpers, peak line of sight. Details in section 3.
- **Open defects, all reproduced** (section 4): 3 of 124 flights fail the walk test on a 0.25 to 0.27 m
  ledge; 36 doors sit more than 1 m above the ground; 33 pairs of roofs overlap (36 when first counted,
  before the footprint fix); the spawn faces a cut bank and a wall with the stupa hidden.
- **The root cause behind most of them is the ground, not the code on top.** SRTM at 82 x 92 m is a
  smooth bowl with no terraces. The median building footprint spans 3.36 m of ground height (max 12.2 m),
  so the median stone plinth is 4.83 m tall and doors hang in the air. Fix the ground first (level each
  building or terrace row), then doors, steps and lanes fall into place.
- **Doors do not face lanes.** Only 38 of 346 doors are within 3 m of a path centre-line (median 12.1 m).
  OSM has 63 ways for 346 buildings, so access lanes to most doors have to be generated and registered as
  invented.
- **The entrance geography is wrong** and must not be carried over: the stupa is invented at (76.6, 169.6);
  the real one (OSM way/344630942, centre about (-42, 157)) is building index 162, drawn as a 2-storey
  house. There is no Kani gate (the `historic=city_gate` node is dropped by `prep_osm.py:367-374`). The one
  bridge, at (-28.8, 178.4), stands on a culvert.
- **Compression warning.** Flights already have a median grade of 0.544 rise/run, and the stair spec tops
  out at 0.20/0.28 = 0.714. Shrinking the plan to 70 % while keeping heights pushes 80 of 124 flights past
  that limit; at 55 % it is 105 of 124. The layout plan has to scale height as well, or re-route.
- **Scale numbers differ from the brief** (table in section 6): eye 1.65 m, walk 2.6 m/s, storey 2.9 m,
  painted door 2.38 m, risers 0.12 to 0.214 m.

## 1. Map of `src/game.js`

Verdict column: **Port** = carry the algorithm to TypeScript; **Rework** = keep the idea, rebuild it;
**Drop** = replace outright.

| Lines | Section | What it does | Verdict |
| --- | --- | --- | --- |
| 1-18 | Boot, flags | `$`, `setStatus`, `coarse` (touch), `TESTMODE` (`?test`), `SHOW_INVENTED`, `SHOWINV` (`?real` hides), `INV`, `invMark(id, x, z)` | Port the registry |
| 20-36 | Maths | `clamp`, `lerp`, `ss` (smoothstep), `hash2`, `vnoise`, `fbm`, `mulberry` (seeded RNG), `shade`, `mkCanvas`, `NOISE_GLSL` | Port (not the GLSL) |
| 38-56 | Elevation | Decode DEM; `hs(i, j)` clamped sample; `farH(x, z)` triangle-split bilinear; `cr` + `bicubic(x, z)` Catmull-Rom | Port |
| 58-74 | Renderer | `WebGLRenderer` with log depth, PCF soft shadows, camera 70 deg, near 0.12, far 160 km; font preload | Drop |
| 76-91 | OSM masks | Decode 3 PNG masks through a canvas; `ms()` bilinear sampler; `mPaved/mDirt/mWater/mWood/mScrub/mRock`; `inside()` walkable test | Port sampler, drop canvas decode |
| 93-117 | Buildings + spatial index | `BLD` records, `bbOf`, `pip`, `edgeDist`, hash `BH` (20 m cells), `hashAdd`, `nearBuilding`, `rectPoly`, `SOLIDS`, `addSolid`, `freeAt` | Port |
| 118-136 | Props vs paths | `PSEG` (10 m cells), `pathDist`, `clearOfPaths` (1 m + radius), `findFree` (ring search), `corePts` | Port |
| 138-168 | Landmark positions | `LMK` (stupa, pavilions, mani walls, chortens, helipads, viewpoints, ridge) and flat `PADS`, placed before the terrain | Drop positions, keep pad idea |
| 170-221 | Terrain grid | `HB` (bicubic DEM at 3.73 x 3.69 m), `NEARB`, invented terraces (`TER` 2.4 m), stream bed -1.5 m, pads, border blend to `farH` | Rework |
| 222-250 | Fine-grid refinement | `REFN`, `RCELL`, `RSLOT`, `FH`, `coarseGround`, `fineTri`, `townGround`, `inTown`, `groundAt`, `gridK` | Port |
| 252-452 | Stair flights | `STAIR` constants, `wallClear`, flights between bends, merged bend landings, landing-height relaxation, riser placement | Port |
| 453-458 | `treadQuad(F, i, grow, growEnd)` | Plan corners of tread `i` | Port |
| 459-520 | Ground fit | Refine cells near stairs, build constraints, down-only Gauss-Seidel solve | Port |
| 521-542 | Walk ramp | `STAIRHASH` (4 m cells), `stairAt(x, z)` | Port as collider + query |
| 544-563 | Palettes | `PAL`, `farColor` (altitude, slope, aspect, snow line) | Port rules to TSL |
| 565-577 | Far terrain | One 550 x 468 vertex mesh, vertex colours, town cells cut out | Rework (LOD rings) |
| 579-906 | Painted textures | 20 canvas textures: paving, dry stone, 8 x 8 facade atlas (+ emissive), tin roof, signs, friezes, drum, mani, rail, eyes, soil | Drop most, keep signs and ritual art |
| 908-990 | Town terrain mesh | Coarse + fine vertices, `yard` attribute, Lambert shader patched to mix paving, dirt, dry stone by masks | Rework in TSL |
| 992-1040 | Geometry helpers | `GeoB` (non-indexed builder), `box`, `frustum`, `dome`, `cylUV`, `boxO`, bucket `G` | Drop |
| 1042-1056 | Prayer flags (collect) | `FLAGC`, `flagString(A, B, sag)`, `pole` | Rework (cloth) |
| 1058-1192 | Buildings | Floor level, plinth, door wall, bays, sills, awnings, gable roof, gompa dressing, balconies, signs | Port foundation + bay rules, rework the rest |
| 1193-1201 | Roof-to-roof flag strings | 70 strings between roofs 14 to 34 m apart | Rework |
| 1203-1304 | Landmarks | `stupaBuild`, `pavilion`, `chorten`, `maniWall`, mani boulders, helipads, `bench`, viewpoint and ridge dressing | Drop (GLB models) |
| 1306-1328 | Stair meshes | Tread blocks with skirts to 0.3 m below ground; landing fans | Port |
| 1329-1350 | Bridges | `segX`, path x stream crossings, plank deck, `DECKS` | Drop (wrong place) |
| 1351-1368 | Lamps, signpost | 429 lamps beside "core" paths; one signpost | Drop |
| 1370-1384 | Stream ribbon | 1.8 m wide quads, 0.34 m above the bed | Drop |
| 1386-1423 | Materials, meshes | 19 `MeshLambertMaterial` buckets, water and grass shader patches | Drop |
| 1425-1488 | Trees, shrubs, rocks | 4 tree species, bush, rock; scatter by masks, slope, noise | Port rules |
| 1489-1513 | Grass | 13,000-instance ring, radius 40 m, rebuilt every 7 m walked | Rework |
| 1515-1522 | Flags mesh | Vertex sway by sine | Drop |
| 1524-1578 | Sky, sun, night | Gradient dome, 2,200 stars, 14 cloud sprites, hemisphere + sun, `setNight` two-state toggle | Drop |
| 1580-1594 | Peaks | `PEAKS`, DOM labels, `lineOfSight` | Port |
| 1596-1627 | Player | `SPAWN`, `playerGround`, `collide` (circle 0.38 m vs polygons) | Drop (Rapier) |
| 1629-1685 | HUD | `drawCompass`, minimap (`mapBase`, `drawMap`, `toggleMap`), `toast` | Port look and logic |
| 1687-1726 | Input | Pointer lock, drag-look fallback, keys, touch stick + look, buttons | Rework |
| 1728-1757 | Start, pause, intro | `start`, `pause`, intro camera above the trail | Rework |
| 1759-1826 | Loop | `movePlayer(dt, fwd, side, running)`, `frame()` (shadow snap, LOS every 0.35 s, HUD every 0.12 s) | Rework |
| 1830-1842 | `syncView()` | Test hook: sync player, HUD, grass, LOS to `freeCam` | Port idea |
| 1843-1946 | `TEST` API | `stairStats`, `walkFlight`, `walkAll`, `walkPath`, `mainStreet`, `mainFlight`, `stairsPose`, `flightInfo`, `gapMax`, `nFlights` | Port as tests |
| 1947-1950 | Exports | `window.__namche = { INV, SHOWINV, BLD, SPAWN, renderer, syncView, test, dbg, scene, farH, player, setNight, camera, PEAKS, start, groundAt, townGround, LMK, D, freeCam, rebuildGrass }` | Port idea |

`dbg` (only with `?test`): `inside`, `nearBuilding`, `stairAt`, `playerGround`, `coarseGround`, `bicubic`,
`inTown`, `mWater`, `pathDist`, `solidAt`, `SOLIDS`, `LANDINGS`, `FLIGHTS`.

**Build order matters** and must survive the port: landmark pads, then the terrain grid, then stair layout
(reads the ground before fitting), then refine + fit (changes the ground), then everything else samples
the fitted ground. Buildings never change the ground.

**Where `SHOWINV` gates things:** stupa and its pad (146), pavilions (149-155), mani walls (157-158),
viewpoint and ridge pads (165-166), terraces (196), flags and poles (1046, 1056), mani boulders (1278),
viewpoint dressing (1291), ridge lookout (1298), benches (1304), lamps (1354), signpost (1365), tree and
shrub density outside OSM wood and scrub (1459, 1464, 1479), grass (1504). Nine ids carry positions
(464 placements, 429 of them lamps); `prayer_flags`, `terraces` and `vegetation` are rules without positions.

### Supporting files

| File | Role | Notes |
| --- | --- | --- |
| `src/build.py` (16 lines) | Splices `game.js` and `data.js` into the shell | Also rewrites two strings, one of them the OSM attribution line (10-11) |
| `scripts/shots.py` (101 lines) | Headless screenshots | GPU flags `--use-angle=d3d11 --enable-gpu --ignore-gpu-blocklist --force_high_performance_gpu`, SwiftShader fallback; views return a pose `[x, y, z, pitch, yaw]`; `--save-poses` / `--poses` replay exact cameras for before/after pairs. Reuse this pattern |
| `scripts/invented_doc.py` (57 lines) | Writes `docs/INVENTED.md` from the live page | Categories from `prep_osm.py:410-448`, positions from `window.__namche.INV` |
| `scripts/prep_osm.py` (456 lines) | OSM + DEM to `data/data.js` | Holds proven fixes T1a and T1b (section 3.4) |

## 2. The data contract (`data/data.js`)

Written by `scripts/prep_osm.py:449-455` as `window.NAMCHE = {...};` (1,048,791 bytes, minified JSON).

**Coordinates.** Local metres, **x east, z south, y up** (metres above sea level). Origin 27.8050 N,
86.7100 E. `x = (lon - 86.71) * 98541`, `z = -(lat - 27.805) * 110816`. Yaw 0 looks north (-z); forward is
`(-sin yaw, -cos yaw)`; compass heading is `-yaw` in degrees.

| Key | Type and size | Units, encoding | How `game.js` reads it |
| --- | --- | --- | --- |
| `dem` | `{nx: 550, nz: 468, x0: -18065.85, z0: -27057.57, dx: 82.1175, dz: 92.3467, b64}` | Heights in whole metres, little-endian int16, row-major (row = z index, north to south; column = x). 514,800 bytes as base64. Range 1,862 to 8,840 m. Covers 45.1 x 43.1 km | `atob` to `Int16Array` (line 40); `hs`, `farH`, `bicubic` |
| `town` | `{c0: 209, c1: 234, r0: 280, r1: 301}` | DEM column and row range replaced by the detailed town mesh: 25 x 21 cells = x -903.3 to 1149.6, z -1200.5 to 738.8 (2,053 x 1,939 m) | Line 172-173 |
| `mask` | `{w: 1026, h: 969, px: 2, x0: -903.29, z0: -1200.51, a, b, c}` | 2 m pixels over the town box. Pixel `i` is centred at `x0 + (i + 0.5) * px`. `a`: RGBA PNG, R paved, G dirt, B water. `b`: RGBA PNG, R wood, G scrub, B rock or grassland. `c`: 8-bit grey PNG, over 127 = walkable. All base64 | Drawn to a canvas, `getImageData` (79-82); `ms()` bilinear, `inside()` nearest |
| `buildings` | 346 x `{p, f, r, w, fr, k, b, u, c, d, n}` | `p` footprint ring `[[x, z]...]` at 0.01 m, 4 to 12 vertices, not closed; `f` storeys 1 to 5; `r` roof colour 0-5; `w` wall 0 stone, 1 whitewash, 2 wood, 3 plaster; `fr` frame colour 0-3; `k` kind; `b` balcony 0/1; `u` unit long axis of the bounding box; `c` its centre; `d` its `[long, short]` size in m; `n` name, up to 38 characters | Line 95-100. Rings with positive shoelace area are reversed so `(-az, ax)` is the outward normal |
| `paths` | 63 x `{p, s, c, w?}` | `p` polyline at 0.01 m; `s` 1 = `highway=steps` (4 ways, 701 m); `c` 1 = "core" (56 ways); `w` OSM width in m (1 way, 2 m). 21.9 km in total | Stairs, `PSEG`, `corePts`, bridges |
| `walls` | 2 polylines | 0.1 m | **Never read** |
| `streams` | 15 polylines, 10.5 km | 0.1 m; reach x -4,949 | Water ribbon, bridges |
| `poi` | 26 x `{x, z, k, n, r?}` | `k`: viewpoint 10, shrine 5, info 3, memorial 3, helipad 3, water 2; `r` radius for helipads | `LMK` |
| `peaks` | 8 x `{n, h, x, z, y}` | `h` published height, `y` SRTM height at the typed summit position | Labels, line of sight |
| `lm` | `{spawn, face, view, ridge, gompa}` | `[x, z]` each; `ridge` is hand-typed | Only `spawn`, `face`, `ridge` are read; `gompa` is used by `shots.py` |
| `invented` | 12 x `{id, name, reason, replace, invented: true, x?, z?}` | | Docs only |
| `geo` | `{lat0: 27.805, lon0: 86.71, mlat: 110816, mlon: 98541}` | Metres per degree | HUD coordinates |

Measured content: kinds are house 274, lodge 54, shop 13, gompa 2, civic 2, museum 1; storeys 1: 71,
2: 135, 3: 100, 4: 29, 5: 11; 52 buildings are named; footprints lie within x -414 to 621, z -639 to 591.
Mask areas: paved 8.80 ha, dirt 0.03 ha, water 0.19 ha, wood 45.5 ha, scrub 55.8 ha; walkable 0.795 km2 of
the 3.977 km2 box.

**What the contract loses or bends** (the new pipeline should not):

- No OSM ids anywhere, so nothing can be traced back to a way or node.
- Tags dropped: `historic=city_gate`, `man_made=stupa`, `amenity=fountain`, `tunnel`, `surface`, bridges.
  The stupa way becomes a plain `house`.
- `c` ("core") is set for a whole way if its bounding box touches x -430 to 640, z -430 to 420
  (`prep_osm.py:55-58`). 56 of 63 ways qualify, including 5 trails that run more than 700 m out. Result:
  8.8 ha "paved", and 294 of the 429 lamps stand more than 300 m from the town centre.
- Storeys, roof, wall and frame colours and balconies are seeded random choices (`rng = default_rng(7)`,
  lines 191-200), not data.
- `u`, `c`, `d` come from `cv2.minAreaRect`. 65 footprints are not 4-sided and 61 fill under 90 % of that
  box; roofs are built on the box (defect 4.3).
- Path vertices have been moved off walls (T1b), so they no longer match OSM exactly. On the current file:
  0 vertices inside a footprint, 0 segments crossing one, 21 vertices nearer than 1.55 m, minimum 0.66 m.
- Masks are decoded through a 2D canvas, which leaves pixel values at the mercy of the browser. Decode
  PNGs in the bake step and ship raw bytes.

## 3. Algorithms worth porting, ranked

### 3.1 Stair flight layout (`game.js:252-452`, plus `wallClear` 265-272, `treadQuad` 454-458)

The most valuable code in the repo. It is an anonymous block today; port it as a pure function
`layoutStairs(paths, ground, env) -> { flights, landings, log }`.

**Inputs.** `D.paths` (`p`, `s`, `c`, `w`); ground before fitting (`townGround`, here equal to
`coarseGround`); raw DEM (`bicubic`) for the grade test; `inTown(x, z, 20)`, `inside`, `mWater < 0.3`;
building hash for `wallClear`; building centres for the "main" test.

**Steps.**

1. **Order** (277): steps ways first, then core ways, then the rest.
2. **Stations** (281-292): one every `DS` = 0.25 m along the centre-line; a vertex that turns more than
   `BEND` = 20 deg is a bend. `at(s)` interpolates by arc length.
3. **Where** (295-307): a station is stair if it is in the walkable town, not in water, and either the way
   is steps-tagged or the DEM grade over a 3 m window exceeds `GRADE` = tan 25 deg = 0.466. Gaps under
   1.5 m are closed; runs under 1.2 m are dropped.
4. **Width** (312-319), one per run: OSM `width`, else 1.6 m if steps-tagged or 4+ buildings lie within
   18 m, else 1.0 m; narrowed to wall clearance minus 0.08 m, never under 0.8 m.
5. **Nodes** (320-328): the run's two ends plus one landing per bend. Bends closer than a stair width plus
   0.3 m along the path share one landing.
6. **Landing polygons** (329-351): convex hull of the stair edges sampled every 0.25 m from half a width
   before the first bend to half a width after the last, plus a point 1.45 half-widths out on the outward
   bisector. Height = ground at the middle.
7. **Segments** (352-363): the stretch between two nodes, trimmed by half a width at each landing and, at
   free ends, wherever another way's flight already stands (`occupied`, 0.9 m radius, 2 m cells).
   A segment that touches a landing is a "connector" and needs 0.3 m; a free one needs 1.2 m.
8. **Landing heights** (364-389): pinned where no step fits; the rest relax (up to 2,000 passes) until no
   segment is steeper than 0.20 m rise per 0.30 m run. Measured largest shift: 0.953 m.
9. **Profile** (393-399): ground along the centre-line, tilted linearly so both ends meet their landing
   heights, then ordered bottom to top.
10. **Riser count** (401-410): the `N` that keeps `dH / N` in 0.15 to 0.20 m and treads at least 0.28 m,
    else the least bad; ties go to the riser nearest 0.175 m. Non-connector flights under 0.30 m rise stay
    ramps.
11. **Riser positions** (411-415): walk the running maximum of the profile in 0.05 m steps; riser `k` goes
    where it first reaches `hA + (k - 0.5) * r`. This is what makes a flight follow the ground.
12. **Tread rules** (416-435): at least 0.28 m, end treads at least `min(0.15, L / (N + 1) / 2)`; if that
    cannot fit, spread evenly and count `tooSteep`. Treads between 0.35 and 0.9 m snap to 0.32 m or to a
    0.9 m landing, with error diffusion so later risers do not drift.
13. **Frames** (437-441): each riser line gets a local frame whose direction is measured only inside the
    flight (0.6 m window), so the end edges line up with the landing edges.

**Output.** `FLIGHTS[]` = `{ path, kind: 'steps' | 'grade', main, hw, r, N, L, dH, sr[], edges[], ys[], A, B,
dir, at, s0, s1, connector }` (`sr` riser distances from the bottom, `edges` frames `{x, z, fx, fz, nx, nz}`,
`ys` tread heights); `LANDINGS[]` = `{ poly, y, bb, s, path }`; `STAIRLOG` counters.

**Tunables.** `STAIR = { GRADE: tan 25 deg, RISE: [0.15, 0.20], RUN: [0.28, 0.35], LAND: 0.9, DS: 0.25,
BEND: 20 deg }` (263), plus the literals named above. For the brief set `RISE` to `[0.17, 0.20]`.

**Measured result.** 124 flights (77 on the 4 steps ways, 47 from the grade rule), 94 connectors, 1,057 m
of flights rising 502 m, 2,909 treads, 235 landings inside flights, 90 bend landings. Widths: 71 at 1.6 m,
45 at 1.0 m, 6 at 0.94 m, 2 at 2.0 m. Median riser 0.177 m; 103 flights already sit in 0.17 to 0.20 m.

**Weak points.**

- Two flights leaving one landing at a hairpin can overlap in plan (defect 4.1a). Bends merge by distance
  along the path, not by distance in plan.
- A flight's free end is set to the ground before fitting, and the fit only lowers ground, so ends can be
  left on a ledge (defect 4.1b).
- 12 flights have risers outside 0.15 to 0.20 m (range 0.12 to 0.214 m): short connectors and ground
  steeper than 0.667. 251 interior treads on 11 flights are shorter than 0.28 m (down to 0.215 m).
- Only the centre-line profile is read. Cross slope is ignored, so one side is cut in and the other stands
  proud: stone is a median 0.16 m above the ground beside it, 0.36 m at the 90th percentile, 1.35 m at
  worst, with no kerb, parapet or retaining wall.
- Stairs appear only where OSM says steps or the 90 m DEM is steeper than 25 deg. Real Namche has far
  more. Thresholds need re-tuning on a 30 m DEM and after compression (section 0).
- The grade test uses the raw DEM, the profile uses the terraced ground. Use one surface.
- Flights never branch to doors.
- Names are shadowed inside the block (`ss` and `cr` hide the smoothstep and the spline; `n`, `T`, `R` are
  reused). Rename on the way in.

### 3.2 Terrain fit under the stairs (`game.js:222-246` and `459-520`)

Port as `refineCells(grid, footprints)` and `fitGround(fine, constraints)`.

1. **Refine** (466-474): every coarse cell within 0.6 m of a tread (sampled every 0.3 m) or of a landing's
   bounding box is replaced by `REFN x REFN` sub-cells (`REFN` = 12, or 8 on touch: 0.31 m, or 0.64 m).
   `RCELL[cell]` gives a slot in `RSLOT`, whose `v` holds the fine vertex ids.
2. **Fine vertices** (475-490) are shared between neighbouring refined cells and start exactly on the coarse
   surface (`coarseGround`), so the patch meets its coarse neighbours without cracks. Vertices on the rim of
   the refined area are pinned.
3. **Constraints** (491-495): a point every 0.1 m under each tread (grown 0.1 m sideways, 0.05 m at flight
   ends) and inside each landing says "the ground here, interpolated from its 3 fine vertices, is at most
   the stone top minus `CLEAR` = 0.03 m".
4. **Solve** (496-515): give every free vertex of a violated triangle a safe drop, then hand back as much
   of each drop as the slack allows, Gauss-Seidel, up to 80 sweeps. Vertices only move down.
5. **Query**: `fineTri(slot, x, z)` returns 3 vertex ids and weights; `townGround` uses it in refined cells
   and `coarseGround` elsewhere. Both split a cell along the same diagonal as the render mesh
   (`a, b, d` / `b, c, d`).

**Measured.** 765 refined cells, 116,297 fine vertices, 272,800 constraints, 0 unsatisfied, 14,423 vertices
lowered, deepest cut 1.479 m, ground never more than 0.5 cm above a tread. The terrain mesh grows to
796,290 triangles.

**Weak points.** Down-only, so it cannot raise ground to meet a flight end. The answer is feasible, not
minimal, and depends on sweep order. Deep cuts leave step-shaped banding beside flights. On touch the
0.64 m grid fails 15 flights (109 of 124 pass): bake the fine grid once, never per device. A physics
heightfield must use the same triangles, or the 3 cm clearance is lost. The block hands arrays to the mesh
builder through `window.__fine` (519, 943-951).

### 3.3 Walk surface and walk tests (`game.js:521-542`, `1609`, `1844-1946`)

- `stairAt(x, z)` returns `{ top, ramp, F, i }` on a tread or `{ top, ramp, land }` on a landing. `ramp` is
  the tread height with a linear half-riser ramp over 0.16 m each side of every interior riser, so the
  player walks a continuous surface. `playerGround` (1609) = ramp, else ground, lifted to a bridge deck.
- In the new build this becomes one ramp collider per flight and one flat collider per landing. Keep the
  query for foot IK and NPC height.
- **Keep the tests.** `walkFlight(k, up)` drives the real controller along the centre-line from 3 m before
  to 3 m after a flight and fails on: stuck 2 s, standing more than half a riser off the stone, a
  frame-to-frame height jump above `GAPMAX` (tallest riser + 0.03 = 0.244 m), inside a wall, never on the
  steps. `walkAll()` does every flight both ways (0.2 s here). `stairStats()` reports sink, gaps under
  stone, fill, riser range. `walkPath(mainStreet())` walks the 424 m main street both ways (passes, largest
  step 0.15 m). Port all of it to unit tests on the pure functions, and add the scale checks.

### 3.4 Pipeline fixes in `scripts/prep_osm.py` (Python, keep or port)

| Lines | Fix | Method | Result on this export |
| --- | --- | --- | --- |
| 123-182 (T1a) | Overlapping footprints | Overlap depth = 2 x radius of the largest circle inside the overlap. Under 1.5 m the smaller footprint is cut back, over 1.5 m the two are merged. Coordinates written at 0.01 m | 9 slivers cut, none merged, 0 overlaps left |
| 210-300 (T1b) | Paths through walls | Segments near walls get a vertex every 1 m; any vertex within 1.6 m of a wall is pushed straight out; in alleys under 3.2 m it takes the spot with the most clearance; corners get a vertex on the outward bisector | 0 vertices inside, 0 segments crossing |
| 34-47 | Mask pixel convention | Draw with OpenCV sub-pixel coordinates so pixel `i` is centred at `x0 + (i + 0.5) * px` | Removed a 1 m shift of every mask |
| 325-343 | Paths out of buildings in the masks | Clear paved and dirt pixels inside each footprint grown 0.4 m, then re-check | 0 pixels left |
| 87-108 | Kinds | POI tags are attached to the footprint that contains them; `kind_of` maps tags and names to 7 kinds | |
| 309-318 | Walkable area | Paths 9 m wide + footprints grown 16 m, closed with a 34 m disc, holes filled, largest piece kept | 0.795 km2 |

`scripts/build_dem.py` (void fill by nearest value then 200 passes of a 3 x 3 mean) is only needed if SRTM
stays in use.

### 3.5 Foundations and the door wall (`game.js:1063-1093`)

Ground is sampled at every footprint vertex, every edge midpoint and the centroid. Floor = highest sample
+ 0.15 m, so no wall is buried (0 of 346). The plinth runs from 1 m below the lowest sample to 0.32 m above
the floor, 0.14 m proud of the wall. `fac` = the edge of 4 m or more whose ground 3 m outside is lowest
(the downhill face: sign and balcony). `door` = the edge whose centre bay (0.6 m outside) has the highest
ground. Port the sampling and the tests; replace the rest once buildings stand on levelled ground
(defect 4.2).

### 3.6 DEM sampling and the town grid (`game.js:38-56`, `170-221`)

`farH` and `coarseGround` interpolate on the same two triangles the mesh draws, so feet match pixels.
`bicubic` (Catmull-Rom) upsamples 82 x 92 m cells to the 3.73 x 3.69 m town grid without facets. The town
grid blends into the far mesh over 1.5 DEM cells at its rim (218-219), so there is no seam. Pads flatten
ground under landmarks: full weight within 1.6 m of the rectangle, gone by 5 m (209). That 3.4 m blend is
too short on steep ground: it is the 45 deg "grey ramp" in the spawn shot.

### 3.7 Spatial hash and placement helpers (`game.js:94-134`, `1330`)

`pip`, `edgeDist`, `bbOf`, `rectPoly`, `segX`, the monotone-chain hull (343-348); a string-keyed hash
(`BH` 20 m for buildings and solids, `PSEG` 10 m for path segments, `STAIRHASH` 4 m). `nearBuilding(x, z, r)`,
`freeAt`, `pathDist`, `clearOfPaths(x, z, r)` (path distance at least `r + 1.0`), `findFree(x, z, r, maxR,
paths)` (rings every 2 m). Small, correct, used everywhere. Missing: clearance from doors and facades, and
from sight lines (the unfinished "T1e").

### 3.8 Peak line of sight and labels (`game.js:1585-1594`, `1799-1813`)

`lineOfSight` marches eye to summit: the first 320 m in 1.5 m steps against building and prop prisms
(`top`, footprint), then 340 samples spaced quadratically against `groundAt` with 1.5 m tolerance. Run
every 0.35 s for 8 peaks. Labels are sorted (Everest first, then nearest) and lifted in 30 px steps until
they stop overlapping each other. They do not avoid HUD panels.

### 3.9 Smaller pieces

| Piece | Lines | Keep |
| --- | --- | --- |
| Seeded RNG and noise (`mulberry`, `hash2`, `vnoise`, `fbm`) | 24-32 | Yes: everything is reproducible from seeds |
| Facade bay grammar: `BAY` 3.0 m, row per bay per floor, per-building seed `1000 + i * 7919`, `styleOf` | 1060-1108 | The rules, as instanced parts |
| Ground shading rules: paving, dirt, yard, dry stone on slopes, by mask and steepness | 961-988 | The rules, in TSL |
| `farColor`: forest, alpine, rock, snow by altitude, slope, aspect, noise | 551-563 | The rules |
| Vegetation scatter: density from wood and scrub masks, slope, noise; exclusions by path, water, building, pad | 1447-1488 | The rules |
| Shadow frustum snapped to texels | 1788-1789 | The trick, per cascade |
| Compass strip and minimap drawing | 1630-1682 | Yes |
| Painters for signs, mantra bands, key-pattern rail, kyimbu band, Buddha eyes | 777-892 | As decals; signs need invented names |
| Stair meshes: tread block = top, riser, two skirts, back on the top tread | 1310-1328 | Yes |

## 4. Open defects

### 4.1 Three flights fail the walk test on a 0.25 to 0.27 m step

Measured: 121 of 124 pass (`?real`: 122; touch: 109). The failing step is a jump in the walk surface, not
a riser. Two different causes.

**(a) Flights 45 and 46, at (342.1, -165.7), steps way 50.** Both leave the same bend landing
(y 3592.444) at a hairpin whose two bends are 2.31 m apart along the path. That is more than the merge
distance (`2 * hw + 0.3` = 1.9 m, line 326), so they stay separate, yet their 1.6 m wide treads overlap in
plan. Walking flight 45, the player goes from tread `45:0` (3592.53) straight onto tread `46:2` (3592.80).
`stairAt` returns the first tread that contains the point (533-539), and `occupied` ignores the same way
(276). **Fix:** test tread quads of different flights for overlap in plan; where they overlap, merge the
bends into one landing or clip the later flight. Add a test: no two treads overlap unless their heights
differ by less than one riser.

**(b) Flight 101, bottom end at (-601.2, -286.3), a grade stair on a dirt trail** (49 risers of 0.198 m,
treads 0.276 m, grade 0.72). The bottom tread is at 3558.875; the ground 6 cm beyond is 3558.594, a 0.28 m
ledge. The end height comes from the ground before fitting (395), the fit then lowers the ground round the
end, and `stairAt` gives no ramp at a flight's first and last edge (537). With terraces off (`?real`) this
flight passes, so the invented terrace riser is part of it. **Fix:** end every free flight end on a short
landing whose height the terrain is fitted to in both directions (pin the fine vertices along the end edge
to the stone), or add a bottom riser to the ground.

The same weakness is wider than the three failures: **12 flight ends meet the ground with a jump over
0.20 m** (flights 9, 94, 97, 98, 99, 101 twice, 103, 105, 108, 120, 123), the worst 0.44 m at the foot of
flight 9 at (-29.9, 175.7). That is the foot of the main steps beside the stream, inside the opening shot
of the new game.

### 4.2 Thirty-six doors more than 1 m above the ground

Code: floor level `pad = gmax + 0.15` (1072); door wall chosen at 1084-1089. Measured over 346 doors: sill
(floor minus ground 0.6 m outside the door) minimum -0.20 m, median 0.33 m, maximum 2.47 m; 197 over 0.3 m,
119 over 0.5 m, 36 over 1 m, 2 over 2 m. Had the door stayed on the downhill face, the median would be
3.28 m.

Cause: the ground under the median footprint spans 3.36 m (282 buildings over 2 m, 144 over 4 m), because
buildings stand on the raw SRTM slope (median 19.4 deg at building centres). No wall of such a building has
ground near floor level along its whole length.

Fix needs, in this order: (1) level the ground per building or per terrace row, with retaining walls, before
placing anything; (2) choose the door wall by the nearest lane, not the highest ground; (3) where the sill
is still 0.2 to 1.5 m up, generate a stoop with the stair generator; (4) tests: every door within one riser
of walkable ground or served by steps, and every door reachable from a lane. Today 344 of 346 doors are on
a different wall from the sign and balcony, and only 78 are within 5 m of any path.

### 4.3 Roof clashes (33 pairs now, 36 when first measured)

Code: roof and gables at 1128-1151, built from `ux, uz, hw, hd`, the footprint's bounding box
(`prep_osm.py:116-120`), with a 0.6 m overhang; the walls follow the real footprint. Measured on the current
data: 33 pairs of boxes overlap with no overhang (14 by more than 1.5 m, worst 11.4 m between buildings 203
and 204), involving 49 buildings; 25 of the 33 pairs include a footprint that fills under 90 % of its box.
With the overhang it is 91 pairs. The original count of 36 was taken before T1a trimmed nine footprints.

Fix needs: build the roof from the footprint. Keep the gable for 4-sided footprints; split L and T shapes
into rectangles or use a straight-skeleton hip roof; limit each eave overhang to half the gap to the
neighbour; test that no roof triangle lies inside another building's volume. This also closes the gap
between wall tops and gable ends on non-rectangular buildings.

### 4.4 Poor spawn view

Code: `SPAWN` (1597-1605) takes the first clear spot 20 to 35 m from the invented stupa on the side away
from the building-weighted centre of town, and faces that centre. Measured: spawn (59.4, 190.4), heading
11.4 deg, 4.8 m from the nearest path. The stupa is 27.0 m away but 28.2 deg off the view axis and hidden by
a one-storey building 4.5 m away. Straight ahead the ground climbs 2.1 m within 6.25 m (the stupa pad's cut
bank, painted as paving). See `shots/spawn.png`.

Fix needs: do not port this rule. The brief's start is on the paved trail below the Kani gate. Author the
spawn and hero camera from OSM anchors (gate node near (-25, 192), stupa way centre near (-42, 157), the
trail through the gate), store them as data, and test them: stupa and gate in frame, clear sight lines to
both, feet on the path, slope under the feet below a limit.

### 4.5 Other defects found or confirmed

| Defect | Where | Evidence |
| --- | --- | --- |
| Bench in the Everest sight line | 1295: `bench(v[0] + 2, v[1] - 2.5, ...)` | 3.2 m from the viewpoint, 6.5 deg off the bearing to Everest; `shots/view2.png`. Benches have no collision |
| 429 lamps, most out of town | 1351-1364 and the `c` flag | 294 are over 300 m from the centre; spacing only checks the previous lamp |
| No rhododendrons at all | 1470-1473 | 0 instances: only 1 of 1,280 candidate spots passes the three tests |
| Terrace banding | 196-199 | Contour stripes across hillsides in `shots/view2.png`; invented |
| Stream is a floating ribbon | 1370-1384 | 0.34 m above a bed cut 1.5 m by a blurred 2 m mask |
| Peak labels hide under HUD panels | 1807-1813 | Labels avoid each other only |
| Clouds drift away | 1823 | +6 m/s in x with no wrap |
| Short treads on steep ground | 416-423 | 251 treads under 0.28 m on 11 flights |
| Props ignore doors and facades | 118-119 | Only path clearance is checked |

## 5. Visual identity to carry over

**Fonts.** Teko (400, 500, 600) for names, numbers and headings; Hind (400, 500, 600) for body text and
Devanagari. Loaded from Google Fonts (`template.html:9`); the new build should self-host them. Body is
Hind 15 px / 1.45. Place names are Teko 500 at 30 px; the title is Teko 500 at `clamp(46px, 8vw, 64px)`,
line-height 0.86; numbers use `font-variant-numeric: tabular-nums`.

**CSS tokens** (`template.html:11-44`).

| Token | Light | Dark |
| --- | --- | --- |
| `--ink` | `#f6f4ef` | same |
| `--ink-soft` | `rgba(246,244,239,.76)` | same |
| `--ink-faint` | `rgba(246,244,239,.5)` | same |
| `--panel` | `rgba(21,33,58,.68)` | `rgba(13,21,38,.74)` |
| `--panel-strong` | `rgba(17,27,48,.88)` | `rgba(10,16,30,.9)` |
| `--line` | `rgba(246,244,239,.16)` | same |
| `--gold` | `#e8b53a` | same |
| `--flag-blue`, `-white`, `-red`, `-green`, `-yellow` | `#2a5caa`, `#f4f1ea`, `#c23a30`, `#2f8a57`, `#e8b53a` | same |
| `--page` | `#1b2a45` | `#0f1828` |
| `--invented` | `#f08cb4` | same |

Dark values apply under `prefers-color-scheme: dark` unless `data-theme="light"`, and under
`data-theme="dark"`.

**HUD look.** A panel is `--panel` + `backdrop-filter: blur(8px)` + a 1 px `--line` border + 10 px radius
(`.panel`, line 54). The intro and pause card carries a 7 px strip of the five flag colours along its top
(101-104). The main button is gold with `#1a2238` text, Hind 600 16 px, 8 px radius. Key chips are
`rgba(246,244,239,.12)` with a `--line` border and 4 px radius. The crosshair is a 4 px dot at 70 % ink.
Errors use `#ffb4a8`. Layout: location card top left (name, Devanagari name, altitude, coordinates),
compass strip top centre (`min(560px, 56vw)` x 52 px), minimap bottom right, key hints bottom left, toast
under the compass.

**Compass and map.** North is gold, other letters ink; ticks every 5 deg, numbers every 15, letters every
45; a gold triangle marks each visible peak. Minimap colours (RGB): ground 38,52,40; wood 30,44,32; walkable
72,88,58; dirt 168,146,112; paved 214,204,182; water 80,150,205. Buildings: gompa `#d9a63a`, lodge
`#f1ebdc`, shop `#e9b98a`, other `#c9c6c0`. Player: gold arrow with a `#1a2238` outline and a
`rgba(232,181,58,.25)` view cone. Invented items: hollow diamonds in `--invented`.

**World palette** (`game.js`).

| Use | Values |
| --- | --- |
| Prayer flags `FLAGC` (1043), in string order | `#2a5caa`, `#f4f1ea`, `#c23a30`, `#2f8a57`, `#e8b53a` |
| Tin roofs `ROOFC` (1061) | `#2f66b0`, `#2c8c84`, `#3b8853`, `#ae3a2f`, `#a5acb0`, `#2d5d44`; gompa `#c4932c` |
| Whitewash and gold (1004) | `#f3f0e9`; `#d4a23a`, with `#c99a32`, `#d8a73a`, `#e2b545` |
| Monastery maroon | `#7e231f`, `#8e2a22`, `#6e1f1d` (rails), `#a8261f` (mantra band) with `#e8c04a` lettering |
| Frame colours (`STY`, 634-643) | green `#2f7d4f`, red `#b3332b`, blue `#2a62a8` and `#2a7ab8`, cream `#f1ede4` |
| Walls (`STY`) | stone `#b9ad99` family, whitewash `#f0eee8`, blue board `#3a86b4`, plaster `#ead9c3` |
| Terrain `PAL` (545-549) | forest `#2f472b`, meadow `#8f7f5c`, grass `#7d8250`, rock `#7a726a`, snow `#f1f4f8`, earth `#a28f6a` |
| Day sky (1525) | top `#2e62b4`, mid `#8fb3d9`, horizon `#c8d9e8`, sun `#fff1d0`, fog `#bfd2e4` |
| Night (1566-1567) | top `#060c1c`, horizon `#1d2c48`, moon `#c9d6ff`, fog `#17243b`; window glow `#ffb35a`, `#ffc979`, `#ffd9a0`, `#f7a54c` |

The mantra string is `ॐ मणि पद्मे हूँ` (583). **Text voice:** short plain sentences, typographic apostrophes,
no em dashes; load steps read like "Shaping the bowl, the terraces and the stream beds…".

The OSM credit is added by `build.py:10-11` to the intro and pause card only, so it is not on screen
during play. The new build must show it in the credits and on the map screen.

## 6. What must not be carried over

**r128 idioms.**

- `window.THREE` from a script tag; `MeshLambertMaterial` on every surface; shader edits by string
  replacement in `onBeforeCompile` (961-988, 1392-1403, 1492, 1520), including the Lambert-only
  `vLightFront` hack for grass. None of this exists for node materials.
- A raw GLSL `ShaderMaterial` sky (1526-1530); `THREE.Points` with a pixel size for stars and lamp glow.
- No colour management: r128 writes linear values and canvas textures are untagged, so every hex colour
  and light intensity was tuned by eye for that. Convert the palette to sRGB inputs and re-tune the lights;
  do not copy the intensities (hemisphere 0.62, sun 0.92).
- One 2048 px shadow map over a 190 m box that follows the camera; a single log-depth frustum from 0.12 m
  to 160 km; a fixed sun (azimuth 128 deg, elevation 34 deg) and a two-state day and night switch.
- Whole-town merged meshes: 19 buckets of non-indexed triangles with flat normals. Nothing can be culled,
  so all 2.64 M triangles are drawn every frame; window sills and lintels alone are 254,928 triangles.

**Single-file constraints.**

- Base64 DEM and masks inside a JS global, decoded with `atob` loops and a canvas; `build.py` string
  splicing; one IIFE with shared mutable state and the `window.__fine` hand-off.
- The `coarse` switch that changes geometry (grid 16 x 18, `REFN` 8, half the trees). Geometry must be the
  same on every device; only rendering may scale.
- The dead script in `template.html:204-1320`.

**Canvas-painted surfaces that should become PBR materials or real geometry.**

- `paveTex`, `dryTex`, `plankTex`, `roofTex`, `soilTex`, `grassTex`: replace with CC0 PBR sets.
- The facade atlas (632-765): windows and doors are flat pictures on a wall quad. The brief needs
  doorways to walk through and interiors, so these become modelled, instanced parts.
- Keep painting in code only where the content is ours: signboards, mantra bands, murals, Buddha eyes.

**Geometry and numbers that contradict the brief.**

| Item | Prototype | Brief |
| --- | --- | --- |
| Eye height | 1.65 m (`EYE`, 1611) | 1.62 m |
| Walk, run | 2.6, 5.6 m/s (1611) | 1.3, 3.5 m/s |
| Storey | 2.9 m (`FLOOR`, 1060) | 2.4 to 2.7 m |
| Door | painted 2.38 m tall, about 1.2 m wide (757) | 1.70 to 1.85 m; walk-through at least 1.85 m |
| Risers | spec 0.15 to 0.20, built 0.12 to 0.214 m | 0.17 to 0.20 m |
| Field of view, near plane | 70 deg, 0.12 m | 78 deg, 0.05 m |
| Stupa | 15.5 m plinth, 16.7 m tall, at an invented spot | about 11 m across and 10 to 11 m tall, at the OSM way |
| Small prayer wheels | 0.5 m | 1.0 to 1.5 m |
| Town scale | 1:1 | 55 to 70 % |
| Sign names | real OSM business names (776-790) | invented names only |

**Invented geography and stand-ins.** The stupa position, the three pavilions, mani walls and boulders,
429 lamps, benches, the plank bridge, the 2.4 m terraces, and every landmark mesh built from boxes and
frustums. The player rules: the walkable-mask leash (`inside`), 2D `collide`, no gravity, no jump.

## 7. Port plan

Module names are proposals; `client/` does not exist yet and `docs/ARCHITECTURE.md` will fix the final
names. The main recommendation: put world generation in **pure TypeScript with no three.js and no DOM**,
and run it in a **bake step** (Node) that writes geometry, colliders and nav data. It takes under 4 s today,
it becomes testable without a GPU, it is identical on every device, and its output can go to Blender for
lightmaps.

| From `game.js` | To | Runs | Notes |
| --- | --- | --- | --- |
| 20-32 maths, RNG, noise | `core/math/{interp,noise,rng}.ts` | both | |
| 94-134, 343-348, 1330 geometry and hashes | `core/geom2d.ts`, `core/hashGrid.ts` | both | Integer keys, not strings |
| `geo` conversions | `world/geo.ts` | both | Add the compression transform here, in one place |
| 38-56 DEM | `world/gen/dem.ts` | bake | Accept a 30 m DEM |
| 76-91 masks | `world/gen/masks.ts` | bake | Raw bytes in; keep the half-pixel rule |
| 170-221 town grid | `world/gen/terrainGrid.ts` | bake | Replace terraces with building pads and retaining walls |
| 222-250, 459-520 refine and fit | `world/gen/terrainRefine.ts`, `terrainFit.ts` | bake | Add two-way pinning at flight ends |
| 252-458 stairs | `world/gen/stairs/{stations,layout,landings,relax,risers}.ts` | bake | Config: risers 0.17 to 0.20; add plan-overlap handling |
| 521-542, 1609 walk surface | `world/gen/stairs/walkSurface.ts`, `physics/stairColliders.ts` | bake, run | Ramp collider per flight |
| 1306-1328 stair meshes | `world/gen/stairs/mesh.ts` | bake | Indexed, chunked |
| 1063-1093 foundations, door wall | `world/gen/buildings/{foundation,doors}.ts` | bake | Door by lane; stoops via the stair generator |
| 1094-1127 bays | `world/gen/buildings/facade.ts` | bake | Emits part instances |
| 1128-1151 roofs | `world/gen/buildings/roof.ts` | bake | From the footprint, not the box |
| 118-134 placement | `world/gen/props/placement.ts` | bake | Add door, facade and sight-line clearance |
| 1447-1513 vegetation | `world/gen/vegetation.ts`, `render/grass.ts` | bake, run | |
| 13-18, `INV` | `world/invented.ts` | both | One registry for the game and for `docs/INVENTED.md` |
| 544-563, 961-988 colour rules | `render/materials/{terrain,farTerrain}.ts` | run | TSL |
| 1524-1578 sky, light | `render/sky/*`, `render/lighting/*` | run | New |
| 1042-1056, 1515-1522 flags | `render/flags.ts` | run | Keep `FLAGC` and the sag; cloth is new |
| 1580-1594 line of sight | `world/peaks/lineOfSight.ts` | run | |
| 1799-1813 labels, 1630-1682 compass and map | `ui/hud/{peakLabels,compass,minimap,toast}.ts` | run | |
| `template.html:11-141` | `ui/theme/tokens.css`, `ui/hud/hud.css` | run | Tokens from section 5 |
| 1687-1726 input | `input/{keyboard,pointerLock,touch,gamepad}.ts` | run | Keep the drag-look fallback |
| 1763-1776 `movePlayer` | `player/controller.ts` | run | Rapier character controller |
| 1830-1946 test hooks | `test/api.ts`, unit tests, e2e | test | `walkAll`, `stairStats` as unit tests |
| `scripts/shots.py` | the repo's shot tool | test | Poses in, PNG out, replayable |
| `scripts/prep_osm.py` T1a, T1b | data pipeline | bake | Keep OSM ids and tags |

Suggested order: geometry and hashes, DEM and masks, terrain grid with pads, stairs and fit with their
tests, foundations and doors, then meshes and colliders.

## 8. Measured numbers and how to reproduce

Scene (desktop): 37 meshes, 2 point clouds, 14 sprites; 15,368 instances; 35 geometries, 22 textures
(three of them 2048 px, 14.4 megapixels in all), 17 shader programs. Touch build: 1.66 M triangles.

| Part | Triangles |
| --- | --- |
| Town terrain (406,123 vertices) | 796,290 |
| Far terrain (257,400 vertices) | 511,716 |
| Trees: 2,890 pines, 2,560 firs, 2,550 junipers | 821,130 |
| Sills, lintels, rails, lamp posts (`G.det`) | 254,928 |
| 5,200 bushes and 1,716 rocks | 165,776 |
| Walls about 27,000; stairs about 25,000; everything else | about 87,000 |

Build phases (ms, 3 runs): terrain grid + stair layout + fit 980 to 1,250; far terrain 330 to 360; textures
340 to 450; town mesh 1,000 to 1,060; buildings 210 to 320; landmarks 25; stair meshes and bridges 95 to
155; vegetation 230 to 280.

Peaks as the prototype places them (bearing, elevation angle), from the town centre (20, -20) at eye
height: Everest 46.2, 10.4; Lhotse 51.8, 10.2; Nuptse 44.0, 9.9; Ama Dablam 67.6, 11.8; Thamserku 102.9,
22.5; Kangtega 97.6, 17.5; Kongde Ri 258.8, 21.5; Cholatse 23.6, 12.0. Summit positions are typed
latitude and longitude (`prep_osm.py:384-386`), heights are SRTM. Other viewpoints are in
`out/audit-prototype/probe_misc.json`.

Scripts (all read-only; run with `source tools/env.sh && "$NAMCHE_PY" out/audit-prototype/<script>`):

| Script | Output | What it measures |
| --- | --- | --- |
| `measure.py` + `measure_page.js` | `measure.json` | Stairs, doors, roofs, spawn, scene, frame time, `walkAll` |
| `run_page_js.py stair_trace.js stair_trace.json` | `stair_trace.json` | The three failing flights and all flight-end jumps |
| `run_page_js.py variant_summary.js <out> [real] [--touch]` | `variant_*.json` | Desktop, `?real` and touch variants |
| `run_page_js.py probe_misc.js probe_misc.json` | `probe_misc.json` | Masks, lamps, entrance ground, peaks |
| `run_page_js.py probe_doors.js probe_doors.json` | `probe_doors.json` | Sill distribution, viewpoint benches |
| `phase_times.py` | `phase_times.json` | Build phases |
| `roof_obb_check.py`, `path_clearance_check.py` | console | Roof boxes and path clearance from `data.js` |
| `node out/audit-prototype/data_contract.mjs` | console | Shape of `window.NAMCHE` |

**Not determined.** GPU frame time below the 16.7 ms vsync cap; VRAM use; behaviour on a real phone (touch
was emulated); how many vertices T1b moved and by how much (re-running `prep_osm.py` would overwrite
`data/data.js`); whether headless Chromium on this machine gives WebGPU with the flags above.
