# Entrance annotations: the owner's marks, decoded

What the owner drew on his entrance pictures, what each mark means by his colour key, and where each
one sits in the local metre frame, so the generated models (gate3, stupa2, bridge2, pavilion, spouts)
can be placed at their true positions on the Copernicus terrain.

- Machine-readable result: `docs/plan/entrance_features.json` (25 features).
- Scratch, crops and scripts (git-ignored, local only): `out/entrance-decode/`.
  `build_features.py` (masks, registration, top-view features), `assemble.py` (eye-level features, the JSON,
  the check plot `decoded_local.png`), `ov06_crop.png` (OSM drawn through the fit onto chat_06).
- Frame: local metres, x east, z south, origin 27.8050 N 86.7100 E (the frame of `docs/audit/landmarks.json`).
  Game world = local x 0.65 about the origin; human-scale sizes are never scaled.
- The reference photos stay local. Nothing here embeds them; crop paths point into `out/`.

## 1. The colour key

The owner's words (chat L1817): yellow = buildings of the same architecture with prayer wheels, and the
yellow building at the very opening is the gate; blue lines = water flow; light cyan green lines = sharp
edges, walls and raised objects; red lines = bridges; white = the main stupa.

Sampled stroke colours (median RGB of each mask):

| Class | Top view (chat_05) | Eye-level views (chat_10, chat_12) | Mask rule used |
|---|---|---|---|
| Yellow | 254, 230, 4 | 254, 230, 4 | R > 190, G > 165, B < 90 |
| Green ("light cyan green") | 43, 228, 3 (pure green) | 126, 255, 158 (mint) | top: G > 180, R < 110, B < 80; eye: within 45 of the mint |
| Blue | 2, 77, 226 | 2, 77, 232 | B > 170, R < 60, 40 < G < 130 |
| Red | 227, 28, 30 | 226, 28, 27 | R > 180, G < 80, B < 80 |
| White | 255, 255, 255 | 255, 255, 255 | all channels > 235 (top view); dark night photos make the eye-level strokes easy to separate |

There is no separate cyan stroke anywhere: "light cyan green" is one class, drawn pure green on the top
view and mint on the night stills. Caution: `reference/measure/*.png` carry cyan and yellow grid lines and
labels drawn by the assistant earlier; they are not the owner's marks and were excluded.

## 2. Every mark

### chat_05 (Google Earth top view, annotated; chat_06 is the same view unmarked, panned by 354, 3 px)

| # | Colour | Shape | Image px (bbox) | Means |
|---|---|---|---|---|
| 1 | Yellow | Pentagon (house shape) round a small red roof at the end of the trail | 353-423, 504-594 | The Kani gate |
| 2 | Yellow | L-shaped outline round an L red roof | 228-311, 494-605 | The L building left of the gate: the lit restaurant (OSM "Stupa cafe") |
| 3 | Yellow | Small box east of the stupa | 255-289, 420-471 | Prayer-wheel pavilion beside the stupa |
| 4-8 | Yellow | Column of 5 boxes (D, box, ")" shape, house shape, box), top to bottom | 331-385, 135-369 | The 5 water-driven prayer-wheel pavilions; bottom box = pavilion 1 |
| 9 | White | Filled scribble | 160-244, 410-490 | The main stupa |
| 10 | Blue | Line down the pavilion column, visible in 4 pieces between the yellow boxes, ending at the fountain | 324-352, 172-472 | Stream down the pavilion row to the fountain |
| 11 | Blue | Filled dot painted over the Google fountain pin | about 324-352, 386-412 | The fountain (on Google's label pin) |
| 12 | Blue | Line from the bridge south-west to the image edge | 247-334, 496-734 | Stream below the fountain, between cafe and gate, on down the ravine |
| 13 | Green | Line along the west side of the pavilion column | 306-335, 125-332 | Edge along the main stone steps |
| 14 | Green | Closed loop round the stupa and the side pavilion | 127-311, 399-506 | Raised stupa platform (plaza) |
| 15 | Green | Line up the trail to the gate's south-east corner | 400-423, 586-707 | Wall on the east side of the trail below the gate |
| 16 | Red | Short curved stroke between gate and fountain, across a gap in the blue line | 313-364, 475-506 | Bridge where the steps cross the stream just inside the gate |
| 17 | Red | Straight stroke continuing the green steps edge down to the plaza | 295-313, 338-406 | A second bridge or railed edge beside pavilion 1 |

### chat_10 (outside the gate at dusk, annotated; chat_09 unmarked)

| Colour | Shape | Image px | Means |
|---|---|---|---|
| Yellow | Outline of the whole gate: roof, finial, walls, with the passage as an inner loop | 310-965, 32-579 | The gate (front 4.5 m, finial top 4.5 m; see `reference/measure/gate_scale.png`) |
| Yellow | Small roof outline left of the gate, right of the stupa | 202-300, 150-325 | Side pavilion seen past the gate eave |
| White | Outline of the stupa spire and dome | 16-224, 13-291 | Main stupa |
| Mint | Lines along the restaurant terrace with short ticks below | 0-315, 178-327 | Raised cafe terrace and its railing posts |
| Mint | Long line down the right of the gate | 812-966, 218-652 | Stone retaining wall east of the trail |
| Mint | Lines inside the passage | 501-589, 354-440 | Steps rising beyond the gate |
| Mint | Line along the bottom left | 69-452, 593-655 | Edge of the paved apron where it drops to the water-spout yard |
| Red | Small loop inside the passage, top left | 487-545, 321-361 | Bridge rail seen through the gate |

### chat_12 (from just inside the gate, looking up the steps; chat_11 unmarked)

| Colour | Shape | Image px | Means |
|---|---|---|---|
| White | Outline of the stupa spire | 221-401, 151-350 | Main stupa |
| Yellow | Pavilion outline (roof plus posts), centre | 380-610, 303-493 | Side pavilion |
| Yellow | Roof outline at the right edge | 1070-1189, 303-375 | Row pavilion 1 (the nearest of the row; the others are behind the wall) |
| Yellow | Small hut shape | 662-725, 432-473 | Small yellow-roofed kiosk on the plaza |
| Yellow | Tall narrow loop | 824-866, 354-428 | Yellow notice board on posts by the fountain |
| Red | Long loop round the rails at the bottom left, rising at the steps | 2-507, 474-627 | West parapet of the bridge and the rail along the downstream channel |
| Red | Loop round the rail across the top of the first flight | 616-808, 471-559 | East parapet of the bridge (top-view mark 16) |
| Blue | Line along the top of the right wall, up to the right | 734-1112, 376-534 | Stream from pavilion 1 down to the bridge |
| Blue | Line under the left rails | 102-417, 550-578 | Stream leaving under the bridge to the west |
| Mint | Several lines along the right wall top and terraces | 805-1189, 368-511 | Top of the retaining wall and the terrace edges above it |
| Mint | Curve down the right of the steps | 810-925, 520-644 | Foot of the right retaining wall |
| Mint | Horizontal and vertical lines at the left | 66-370, 311-535 | Cafe terrace edge; the vertical stroke at x 358 is its corner |
| Mint | Short lines on the treads | 491-628, 491-644 | Step and landing edges |

### Other pictures

- chat_07: a red ellipse round the entrance area on the whole-town view. A highlight, not a bridge.
- chat_01 (old game screenshot), chat_02 (pavilion close-up), chat_03 (entrance view from the trail),
  chat_04 = chat_19 (pavilion row beside the steps), chat_06, chat_08, chat_09, chat_11: no owner marks.
  Used as unmarked evidence: chat_19 shows the pavilions on the right of the steps behind low maroon
  railings; chat_03 shows the stupa on a raised platform above the open ground; chat_09 shows the
  water-spout trough and blue bench left of the gate.
- `reference/measure/*`: earlier measurement sheets, not owner marks. `gate_scale.png` gives the gate sizes,
  `stupa_tops.png` the stupa shape, `plaza_grid.png` the kiosk, notice board, fountain jet and the curved
  bridge rail from the plaza.

## 3. Registering the top view to OSM

Method:

1. Separate each stroke colour with the masks above; label connected components; fill the yellow and white
   loops to get their areas and centroids.
2. Pair the owner's own marks with the OSM features they plainly denote (9 control points: gate, stupa,
   side pavilion, the 5 row pavilions in order, the cafe L) and fit an affine transform from chat_05 pixels to
   local metres by least squares.
3. Check it independently: draw every OSM building, path and water line through the fit onto chat_06
   (`out/entrance-decode/ov06_crop.png`). Roofs west of the stupa, the L-shaped cafe roof, the gate roof and the
   pavilion roofs over the channel land inside their OSM outlines to about 1 to 3 m.
4. Push every mark through the fit. Lines are traced as the median of the stroke every 6 px.

Result: `x = 0.137151 u - 0.083310 v - 31.1312`, `z = 0.107234 u + 0.156620 v + 63.9974`.
Scale 0.174 x 0.177 m per pixel; the top of the image points to bearing 28 deg (the view looks up the
pavilion row, which runs at 27 deg in OSM). A 4-parameter similarity fit gives 0.172 m/px, 29.1 deg and
RMS 2.5 m. A homography was unstable on these points and is not used.

| Control point | Image px | OSM local (x, z) | Fitted | Residual m | Leave-one-out m |
|---|---|---|---|---|---|
| Gate (pentagon) | 386.4, 553.8 | -24.7, 191.1 | -24.3, 192.2 | 1.17 | 4.26 |
| Stupa (white) | 201.0, 449.9 | -42.4, 156.6 | -41.0, 156.0 | 1.52 | 3.82 |
| Side pavilion | 270.5, 447.8 | -31.2, 163.4 | -31.3, 163.1 | 0.32 | 0.37 |
| Row pavilion 1 | 355.1, 341.7 | -12.1, 158.9 | -10.9, 155.6 | 3.51 | 4.13 |
| Row pavilion 2 | 356.3, 282.9 | -6.7, 149.0 | -5.8, 146.5 | 2.66 | 3.13 |
| Row pavilion 3 | 360.0, 244.4 | -2.1, 140.4 | -2.1, 140.9 | 0.50 | 0.60 |
| Row pavilion 4 | 353.8, 199.2 | 1.8, 131.2 | 0.8, 133.1 | 2.15 | 2.91 |
| Row pavilion 5 | 353.4, 149.9 | 5.5, 123.8 | 4.8, 125.4 | 1.75 | 2.63 |
| Cafe L | 266.9, 557.2 | -38.9, 178.3 | -40.9, 179.9 | 2.56 | 3.95 |
| **RMS** | | | | **2.05** | **3.18** |

Read every converted mark as good to about 3 m: Google Earth is a slightly oblique 3D view, the strokes are
about 1 m wide, and the outlines are loose (the gate's pentagon is 15 x 9 m round a 4.5 m building).
Row pavilion 1 is the worst point: the owner's bottom box sits 3.5 m north of OSM.

## 4. Features in local coordinates

Centre and points in local metres (world = x 0.65). Size in real metres. yawDeg is a compass bearing,
clockwise from north; in three.js `rotation.y = -yawDeg * PI / 180`. Crops are in `out/entrance-decode/crops/`.

| id | kind | colour | centre (x, z) | world (x, z) | size m | yaw | OSM | conf. | crop |
|---|---|---|---|---|---|---|---|---|---|
| gate | gate | yellow | -24.4, 191.5 | -15.86, 124.48 | outline 15 x 9; real 4.5 sq | 0 (passage N-S, front south) | way/344630686, 0.5 m | high | c05_gate, eye_gate |
| stupa | stupa | white | -41.2, 155.9 | -26.78, 101.34 | scribble 14; real base 11 | - | way/344630942, 1.4 m | high | c05_stupa, eye_stupa |
| pavilion_side | pavilion | yellow | -30.7, 162.8 | -19.96, 105.82 | OSM 5.8 x 5.4 | 29 | way/1050011454, 0.8 m | high | c05_pavilion_side, eye_pavilion_side |
| pavilion_row_1 | pavilion | yellow | -11.2, 155.6 | -7.28, 101.14 | OSM 4.5 x 4.4 | 33 | way/344630709, 3.4 m | high | c05_pavilion_row_1, eye_pavilion_row_1 |
| pavilion_row_2 | pavilion | yellow | -5.4, 146.4 | -3.51, 95.16 | OSM 4.6 x 4.5 | 33.5 | way/344630875, 2.9 m | high | c05_pavilion_row_2 |
| pavilion_row_3 | pavilion | yellow | -2.1, 140.8 | -1.37, 91.52 | OSM 4.6 x 4.5 | 30.7 | way/344630877, 0.4 m | high | c05_pavilion_row_3 |
| pavilion_row_4 | pavilion | yellow | 1.1, 133.1 | 0.72, 86.52 | OSM 4.7 x 3.8 | 32.2 | way/344630878, 2.0 m | high | c05_pavilion_row_4 |
| pavilion_row_5 | pavilion | yellow | 5.3, 125.5 | 3.44, 81.58 | OSM 4.4 x 4.2 | 33.1 | way/344630879, 1.7 m | high | c05_pavilion_row_5 |
| cafe_l_building | other | yellow | -39.3, 179.4 | -25.54, 116.61 | OSM L 12.3 x 12.1 | 35 | way/1050011453, 1.2 m | medium | c05_cafe_l_building, eye_cafe_l_building |
| water_channel_upper | water | blue | line (1.7, 128.5) to (-24.0, 174.0) | | 25 pts | flows SW | way/1267933025..34, 2-3 m | high | c05_water_upper, eye_water_channel_upper |
| fountain_marker | water | blue | -18.1, 162.9 | -11.77, 105.89 | point | - | 8.7 m from pool way/1267933037 | low | c05_fountain |
| water_stream_lower | water | blue | line (-27.4, 177.5) to (-57.8, 205.7) | | 40 pts | flows SW | way/1267933035 + way/312775993, about 3 m | high | c05_water_lower, eye_water_stream_lower |
| edge_main_steps_east | edge | green | line (3.4, 119.4) to (-16.3, 149.2) | | high side east | - | on way/551442828 to 1 m | medium | c05_edge_steps |
| edge_stupa_platform | edge | green | -38.7, 158.7 (closed loop) | -25.16, 103.16 | 33 x 18 | 129 | not in OSM | medium | c05_edge_platform |
| edge_trail_east_wall | edge | green | line (-24.5, 199.8) to (-32.8, 219.9) | | high side east | - | on way/551441452 to 1 m | medium | c05_edge_trail, eye_edge_trail_east_wall |
| bridge_gate_inner | bridge | red | -25.0, 177.0; ends (-27.6, 172.7) and (-23.0, 181.7) | -16.25, 115.05 | 10.2 long, bowed 0.5, stair 4.5 wide | 153 | crossing of way/1373254109 over way/1267933035; no bridge tag | medium | c05_bridge_gate_inner, eye_bridge_gate_inner |
| bridge_steps_pav1 | bridge | red | -20.2, 155.4; ends (-17.0, 150.6) and (-24.0, 159.8) | -13.13, 101.01 | 11.6 long, straight | 37 | on the steps line; not in OSM | low | c05_bridge_steps_pav1 |
| bridge_gate_west_parapet | bridge | red | -28.0, 180.5 (eye-level estimate) | -18.2, 117.33 | about 9 long | 153 | not in OSM | low | eye_bridge_gate_west_parapet |
| edge_inner_east_wall | edge | mint | line (-21.9, 188.0) to (-20.3, 174.0) | | high side east, 2-3 m | - | not in OSM | low | eye_edge_inner_east_wall |
| edge_cafe_terrace | edge | mint | line (-34.1, 172.8) to (-32.7, 182.5) | | high side west | 172 | not in OSM | low | eye_edge_cafe_terrace |
| edge_inner_steps | edge | mint | (-24.3, 187.9) to (-26.2, 185.1) | -16.38, 121.23 | 6 risers, 4.5 wide | 155 | follows way/1373254109 | medium | eye_edge_inner_steps |
| edge_apron_kerb_west | edge | mint | line (-24.8, 195.8) to (-31.5, 196.5) | | - | - | not in OSM | low | eye_edge_apron_kerb_west |
| kiosk_yellow_roof | other | yellow | -26.5, 166.5 (bearing only, +/- 5 m) | -17.23, 108.23 | about 1.2 | - | not in OSM | low | eye_kiosk_yellow_roof |
| signboard_yellow | other | yellow | -22.0, 166.0 (+/- 6 m) | -14.3, 107.9 | about 1 x 0.2 | - | not in OSM | low | eye_signboard_yellow |
| entrance_area_ring | other | red | about -30, 165 | | highlight | - | - | high | eye_entrance_area_ring |

Count by kind: gate 1, stupa 1, pavilion 6, water 3, edge 7, bridge 3, other 4 (25 in all; 17 from the top
view, 8 from the eye-level views only).

## 5. What the eye-level views add

**Which pavilion is which.** The yellow box next to the stupa in the top view is the pavilion in the
centre of chat_12 (straight up the steps, right of the stupa) and the roof peeking past the gate's west eave
in chat_10. It looks larger than the row pavilions, which fits its larger OSM outline (5.8 x 5.4 m against
4.4 to 4.7 m). The roof at the right edge of chat_12, where the blue line ends on the wall top, is row
pavilion 1; pavilions 2 to 5 are hidden behind the right-hand wall from the gate. Order up the row is the
OSM order: 1 nearest the fountain, 5 at the top by the head pool. The owner's box for pavilion 2 is drawn
larger with a pointed top; nothing in the photos explains it.

**The bridge just inside the gate.** In chat_12 the steps climb between two red-outlined rails. The right
one spans the bearings of top-view mark 16, and its 0.85 m rail is about 65 px tall, which puts it about 9 m
from the camera: it is the east parapet, mark 16. The left one, close on the left and running on as a long
low rail along the channel, is the west parapet; the top view does not draw it. The blue lines confirm the
stream passes under the stair here: it arrives along the top of the right wall from pavilion 1 and the
fountain, and leaves under the left rails to the south-west. So the opening's "bridge" is this crossing,
10 to 14 m inside the gate, not a bridge on the trail below it.

**Heights and order** (from the measured sheets, all with people for scale): gate front 4.5 m, walls 2.6 m,
passage 2.1 x 2.2 m, ridge 3.8 to 4.0 m, finial top 4.5 m; bridge rails 0.8 to 0.9 m; pavilions about 3.5 m
with the drum at person height; stupa about 10.5 m. From the gate looking north the order left to right is:
cafe terrace (raised 1.5 to 2.5 m), stupa, side pavilion, kiosk, notice board, fountain, the right retaining
wall with the stream on top (2 to 3 m at the gate), row pavilion 1.

**What the eye-level views could not fix.** A full camera solve for chat_12 was tried and did not converge
(the outlines are too loose and the lens is unknown), so the eye-level-only features carry bearings and
rough distances, not surveyed positions. They are marked low confidence.

## 6. Against OSM, landmarks.json and M1

**Agrees**

- Gate, stupa, side pavilion, the 5 row pavilions and the cafe all land on their OSM footprints
  (0.4 to 3.4 m). Count and order of the row match. Row bearing 29 deg from the marks, 27 deg in OSM.
- The stream: the owner's blue runs through every row pavilion (OSM has a culvert under each), through the
  fountain, under the steps just inside the gate and south-west between the cafe and the gate, within
  2 to 3 m of OSM all the way.
- Edges 13 and 15 lie on the OSM main steps and trail centrelines to about 1 m, so they are the kerbs or walls
  along those ways.
- M1 places the gate at local (-24.3, 191.1) and the stupa at (-42.4, 156.6): both agree. M1's six risers
  inside the gate agree with the step lines in chat_10 and chat_12.

**New (not in OSM): register as invented, reason "owner annotation" plus the picture**

- `bridge_gate_inner`, `bridge_gate_west_parapet`: OSM maps the crossing as a path over a culvert with no
  bridge tag. landmarks.json `footbridge_plaza` (-28.8, 178.4) is the deck centre; the east parapet sits 4 m
  east of it.
- `bridge_steps_pav1`: the "second footbridge further up the channel" that landmarks.json could not
  locate. Now placed at (-20.2, 155.4), but whether it crosses the channel or only rails the steps is unclear.
- `edge_stupa_platform` (33 x 18 m raised plaza), `edge_main_steps_east`, `edge_trail_east_wall`,
  `edge_inner_east_wall`, `edge_cafe_terrace`, `edge_inner_steps`, `edge_apron_kerb_west`.
- `kiosk_yellow_roof`, `signboard_yellow`.

**Conflicts**

1. **M1's invented footbridge and rill below the gate** (world (-21.1, 144.6) = local (-32.5, 222.4), 31 m
   down the trail; `docs/INVENTED.md`) has no support in the owner's marks. Neither of his red marks and none
   of his blue lines is below the gate; his lower stream stays 20 to 30 m west of the trail. The real crossing
   is `bridge_gate_inner`. Recommend moving the bridge2 model there and dropping the rill, or keeping the
   invented one clearly marked. The same goes for landmarks.json `bridge_below_gate`.
2. **Fountain position.** The blue dot sits on Google's label pin, 8.7 m north-east of the OSM pool and
   fountain node. Keep OSM (-23.3, 170.1).
3. **The cafe is yellow.** By the key it should be a prayer-wheel building; the photos show a modern lit
   restaurant. Read it as "same roof style" until the owner says otherwise.
4. **Plaza size.** M1 lays a 19 x 16 m plaza centred on the stupa. The owner's raised platform is 33 x 18 m and
   takes in the side pavilion, reaching the foot of the main steps at about (-27, 170).
5. **Walls.** M1 builds a low wall on the west of the trail below the gate. The owner marks the east side
   (a stone retaining wall with a high bank, chat_09 and chat_10). chat_03 suggests a kerb on the west too.
6. **Culverts versus open water.** OSM tags the reach under the steps and most of the row as culverts
   (tunnel=yes). The owner draws continuous water and chat_12 shows it open along the wall top and under
   the parapets. Build it open except under the pavilions and the stair.

## 7. Questions for the owner

1. The red stroke beside pavilion 1 (`bridge_steps_pav1`): a footbridge across the channel to the pavilion,
   or a maroon railing along the steps?
2. The cafe outlined in yellow: does it have prayer wheels, or did you mean the same red roof style?
3. The opening scene's bridge: is it the crossing just inside the gate (your two red rails in chat_12), so the
   invented one on the trail below can go?
4. The small yellow-roofed kiosk and the tall yellow board: what are they, and should they be built?
