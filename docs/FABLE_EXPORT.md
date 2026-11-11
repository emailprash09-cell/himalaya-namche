# Fable / Higgsfield export

Everything the earlier sessions made is kept in `assets-src/fable-export/`. That folder is git-ignored and
local only, because it holds the owner's reference-derived images and 449 MB of models. This file is the
index. No Higgsfield credits were spent to make it: every model and image was already on disk from the
sessions that generated it.

## Best spawn camera (in use today)

There is **no camera grid-search result for the entrance photo** (`reference/chat/chat_03.webp`) on disk.
The grid fits that do exist (`alignment/camera-fits/v2/fit_chat_13|16|17|18.json`) are for the mountain
vistas. The spawn below is M1's hand-set camera, from `client/public/assets/entrance/layout.json` and
`client/src/main.ts`.

| Value | Game | Real |
| --- | --- | --- |
| Feet position (x east, y up, z south) | (-20.26, -4.12, 141.69) m | about 27.80368 N, 86.70979 E, 3,387.5 m (y / 0.65 + hRef 3,393.8) |
| Eye height | 1.62 m above the feet | |
| Yaw | 6.35 deg, 4 deg right of the stupa (stupa at 10.35 deg; yaw 0 looks north, positive turns west) | looking about N 6 W |
| Pitch | +4 deg | |
| Field of view | 78 deg horizontal, about 49 deg vertical at 16:9 | |
| World scale | 0.65 in all three axes, about (0, hRef) | |

## Models (`models/higgsfield/`)

| File | What it is | Triangles · size | Quality | In the game |
| --- | --- | --- | --- | --- |
| gate3.glb | Kani gate, Meshy multi-image from exact front and side views | 101,710 · 20.1 MB, 2K PBR | **Good**: 4.5 m square, one finial, correct plan | Not yet. M1 builds the gate from primitives. Being reduced and placed (entrance-real-models) |
| stupa2.glb | Main stupa, Hunyuan image-to-3D | 198,832 · 50.3 MB | **Good**. The spire is about 20 % too tall | Not yet. M1 builds it from primitives. Being reduced and placed |
| bridge2.glb | Curved footbridge with the key-pattern railing | 200,000 · 49.1 MB | **Good**. 1.6 m wide, real is about 2 m | Not yet. Being reduced and placed |
| pavilion.glb | Prayer-wheel pavilion, Hunyuan text-to-3D pro | 500,000 · 64.8 MB | **Fair**. Drum and colours right, roof Chinese-style with dragons ("kinda fine") | Not yet. Being reduced and placed |
| spouts.glb | Stone trough with brass water spouts | 50,000 · 0.9 MB, untextured | Usable geometry | Not yet |
| char_guide.glb | Sherpa climbing guide, 1.68 m | 149,936 · 21.8 MB, 4K colour, unrigged | Good front, back guessed | Not yet. Being reduced to a static NPC |
| char_lodge.glb | Lodge owner, 1.55 m | 149,910 · 19.5 MB | Good front. Braid missing at the back | Not yet. Same |
| char_monk.glb | Monk, 1.65 m | 149,522 · 17.4 MB | Good | Not yet. Same |
| char_mountaineer.glb | International mountaineer, 1.70 m | 149,968 · 19.3 MB | Good front. Grey daypack instead of the charcoal pack and axe | Not yet. Same |
| gate.glb, gate2.glb | Earlier gates | 500,024 · 66 MB / 199,982 · 53 MB | Rejected: gate2 is elongated with two finials | Never |
| stupa.glb | First stupa | 498,572 · 57.9 MB | Superseded by stupa2 | Never |
| bridge.glb, restaurant.glb, paving.glb | Untextured first-batch tries | about 50k each · 0.9 MB | Rejected: Japanese bridge, Alpine chalet, raised slab | Never |

Job ids for every model are in the memory notes `namche-render-plan` and `namche-characters`.

## Decimation trial (`models/decimation-trial/`, report `notes/json` and `_geo_report*.json`)

The trial used the monk (149,522 triangles) and measured deviation from the original surface.

| Method | Triangles | Mean / p95 error | Clean mesh |
| --- | --- | --- | --- |
| **B collapse, welded first** | 8,000 | 0.69 / 1.76 mm | yes, 1 island |
| F two-pass (head and hands protected) | 8,614 | 0.80 / 2.17 mm | yes |
| C weighted protect, w75 f1 | 8,000 | 1.23 / 3.55 mm | yes |
| A naive (unwelded) | 8,000 | 1.37 / 3.56 mm | **no**: 1,979 islands, torn |
| D quadriflow 4,000 | 7,477 | 5.97 / 22.5 mm | no |

Lesson: weld the vertices before decimating. Then a plain collapse to 8k keeps the face, hands and feet
within 2 mm.

## Renders (`renders/`)

| Folder / file | What it is |
| --- | --- |
| models/*_0.png, *_1.png | Two views of every model beside a 1.75 m figure (gate3_0.png is the best gate) |
| characters/lineup_3d.png | The four 3D characters at real height, front and back, on a height chart |
| characters/board_renders.jpg, board_sheets.jpg | All six character designs: in-scene renders and turnaround sheets |
| characters/*_sheet.png, *_render.png, front/ | Full-size sheets, renders and the front crops used for image-to-3D |
| concepts/ | Gate, stupa and bridge concept views and the comparisons with the photos (`*_vs_real.png`) |
| textures/ | Six generated ground and wall textures with tiling checks. plaza_pale is the closest match |

## Alignment (`alignment/`)

| Folder / file | What it is |
| --- | --- |
| map-registration/map4_reg.pkl, map_reg.pkl | Registration of the annotated map screenshot `ref_04` (and the top view) to OSM, from the audit of `reference/namche/ref_01` to `ref_20`. `ref_04` is a screenshot of the old game's minimap with the owner's red and yellow marks, not a photo. Includes `osm_buildings.pkl`, the scripts and overlays |
| annotations/ | The colour-mark decode of `chat_05`, `chat_10` and `chat_12` (yellow pavilions and gate, white stupa, blue water, cyan edges, red bridges). Copied when the entrance workflow finishes. Live copy: `docs/plan/entrance_features.json` |
| camera-fits/v2, reg/ | Camera pose fits and skyline matches for the vistas chat_13, 16, 17 and 18, plus DEM truth (`truth_peaks.json`, `viewpoints_final.json`, horizon tables) |
| measure/ | Measurement grids over the owner's photos (gate scale, stupa tops, steps, plaza) |
| geodata/ | `namche-osm.geojson` (Overpass export), SRTM `.hgt`, Copernicus GLO-30 tiles with metadata, `peaks_truth.json` |
| m1-review/ | M1's spawn compared with the entrance photo on a grid |

## Notes (`notes/`)

`ORCHESTRATOR_BRIEF.md`, the raw mission text, `glbview.py` and `lineup.py` (render helpers), `m2-spec/` (the body-model
numeric checks), and the asset audit's per-model glTF stats, section profiles and Blender scripts.
