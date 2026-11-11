# OSM data audit: what we have for Namche and where every landmark sits

Audit task `osm-data`, 2026-11-12. Read-only on the repo except this file and `docs/audit/landmarks.json`
(changes listed in section 7). Scratch scripts and maps: `out/audit-osm-data/` (section 8).

**Frame.** Local metres, x east, z south, origin 27.8050 N 86.7100 E; 1 degree of latitude = 110,816 m,
1 degree of longitude = 98,541 m (WGS84 at 27.805 N gives 110,816.3 and 98,538.3, so the error is under
0.003 %). lat = 27.805 - z / 110816, lon = 86.71 + x / 98541. Heights are given as SRTM / GLO-30.
**Entrance** = the shared vertex of the trail from below (way/551441452) and the gate passage
(way/551441451, `tunnel=yes`) at (-24.3, 194.3), the south face of the Kani gate. The task text calls
way/551441451 the trail; it is the 6.4 m passage through the gate, and way/551441452 is the trail.

## 0. Most useful facts

- The export is an overpass-turbo GeoJSON of 2026-11-11T00:22Z with **592 features**: 348 building
  polygons, 63 highway ways (21.9 km), 15 waterways, 137 points. ODbL: keep the OpenStreetMap credit on
  screen and in every derived asset.
- **Every brief landmark except four is in the data**: the trail, Kani gate, the big stupa
  (`man_made=stupa`), fountain and pool, the stream with its culverts, **the five prayer-wheel pavilions
  (untagged buildings that sit exactly on the five culverts)**, the stupa-side pavilion with its memorial
  chorten, the checkpoint, lanes and stairways, gompa, both museums, the Tenzing Norgay memorial and
  viewpoints, three helipads, health post, clinic, pharmacies, bakeries, a gear shop and 69 lodges.
- **Absent** (invented positions needed): the bridge below the gate, the water spouts, the market and
  camping ground, any trekking agency. Best evidence for each is in section 4.
- The trail below the gate **never crosses a stream** (16.4 m from it at the gate, 57 m at 60 m down).
  The owner's "bridges" are inside the gate: the crossing over the culvert at (-28.8, 178.4) and an 11 m
  railing beside the channel north of the fountain.
- Routes from the entrance: town centre **213 m, +30 to 35 m**; top of the bowl **375 to 490 m, +69 to
  106 m**; Everest View Point on the ridge **1,003 m, +145 to 156 m**; checkpoint 554 m down the trail.
- **Recommendation: keep WORLD_SCALE 0.65** (M1's value). Gate to the head of the bowl is 244 world m:
  3.1 min walking, 1.7 min jogging. With footprints at x0.82 (as M1), 3 m lanes and 1.2 m gaps, **170 of
  313 town buildings survive** (138 at 0.60, 114 at 0.55). Fallback in section 3.6.
- Applied uniformly to everything, 0.65 would cut the median wall-to-wall lane from 7.6 m to 4.9 m (a
  quarter of lane samples under 3 m) and a 2.55 m storey to 1.66 m: lanes, doors and storeys must not scale.
- Data faults the build must handle: 86 % of footprints carry no tag but `building=yes`; 8 of 348 have
  `building:levels`, none a height; raw footprints never overlap (25 share walls) but compression makes
  them collide; only 4 ways are tagged steps although 540 to 565 m of town paths are steeper than 36 %;
  the network has 2 components and 25 dead ends; culverts are `tunnel=yes` and must not be drawn open.
- `scripts/fetch_osm.sh` cannot recreate this file: it asks Overpass for JSON (not GeoJSON) and never
  asked for landuse, leisure, office, man_made or non-building amenity and tourism areas. "Not in the
  export" is therefore not always "not in OSM" (market place, camp site, travel agents, farmland).

## 1. Feature inventory

### 1.1 Counts by class and geometry

| Class | Polygon | Line | Point | Values |
| --- | ---: | ---: | ---: | --- |
| building | 348 | 0 | 1 | yes 343, house 2, detached 1, hospital 1, hotel 1; point: monastery 1 |
| highway | 0 | 63 | 0 | path 59 (21,211 m), steps 4 (698 m) |
| waterway | 0 | 15 | 0 | stream 14, river 1 (Bhote Koshi, 8,475 m, far west) |
| natural | 22 | 0 | 1 | scrub 13 (79.9 ha), wood 4 (129.9 ha), rock 2 + 1 point, water 2, grassland 1 |
| aeroway | 4 | 1 | 0 | helipad 3, aerodrome 1 (Syangboche), runway 1 |
| barrier | 1 | 1 | 0 | wall 2 (both at (-176..-143, -389..-374), on the upper west trail, untyped) |
| amenity | 16 | 0 | 53 | points: cafe 11, restaurant 6, recycling 6, atm 4, place_of_worship 3, bank 2, bench 2, bureau_de_change 2, drinking_water 2, pharmacy 2, toilets 2, and one each of bar, billiard, clinic, dentist, fountain, hospital, library, post_office, pub, school, shelter. Polygons: restaurant 11, cafe 2, monastery 1, police 1, "tourism" 1 (a tagging error) |
| tourism | 31 | 0 | 54 | points: guest_house 37, viewpoint 10, information 3, museum 2, artwork 1, hostel 1; polygons: guest_house 30, museum 1 |
| shop | 0 | 0 | 21 | convenience 5, bakery 3, hairdresser 2, electronics 2, pet 2, and one each of photo, department_store, cosmetics, gift, kiosk, outdoor, yes |
| historic | 0 | 0 | 9 | wayside_shrine 5 (1 chorten, 1 mani rock), memorial 3, city_gate 1 |
| man_made, power | 2 | 0 | 0 | man_made=stupa 1, power=generator 1 (hydro, run-of-the-river) |
| landuse, leisure, office, place | 0 | 0 | 0 | never fetched (section 1.6) |

**Buildings (348 polygons).** With any name 39, `building:levels` 8 (values 1, 2, 3, 3, 3, 3, 4, 4),
`height` 0, `tourism` 31, `amenity` 16, `shop` 0 (shops are points), any of these 43; bare
`building=yes` 301 (86 %). Area median 75.5 m2, mean 107 m2, max 844 m2; best-fit box median
11.9 x 6.7 m; largest inscribed circle (clear width) median 6.6 m. 69 points lie inside a footprint and
25 more business points within 5 m of one. Lodging: 69 features (68 named; 31 polygons, 38 points).

**Highways (63 ways, 21,909 m).** `surface`: ground 7 (1,506 m), sett 1 (the main steps). `width`: only
the main steps (2 m). `tunnel=yes`: 1 (the 6.4 m gate passage). `bridge`: none. `incline`: the 4 steps
ways. `sac_scale` hiking 27, mountain_hiking 2; `trail_visibility` 9; `source=strava` 6 ways (1,422 m);
20 ways (3,196 m) carry nothing but `highway`.

| Steps way | Length | From, to | Rise | Tags |
| --- | ---: | --- | ---: | --- |
| way/551442828 main steps | 124.9 m | (-29.9, 175.7) to (41.0, 74.4) | 20 / 25 m | surface=sett, width=2, incline=up |
| way/451632822 gompa steps | 87.3 m | (-104.8, 74.1) to (-96.5, -5.3) | 27 / 24 m | surface=ground, incline=down |
| way/344864178 upper west | 43.6 m | (-53.0, -61.7) to (-74.8, -86.2) | 18 / 15 m | incline=up |
| way/1268084286 to Syangboche | 442.1 m | (326.8, -40.0) to (400.7, -343.6) | 153 / 175 m | sac_scale=mountain_hiking |

**Water.** The town stream is a chain of 12 ways (way/1267933025 to way/1267933036), 105.0 m from the
head pool (way/1267933038, 13.4 m2, at (16.7, 108.5)) to the culvert outlet at (-40.3, 190.7): 58.7 m open
in 6 pieces and 46.2 m in 6 culverts (`tunnel=yes`, `layer=-1`). It runs 2.3 to 10.2 m east of the main
steps and drops 15 to 22 m. Below the gate it continues as way/312775993 (852 m, south-west to
(-545, 813), falling 43 m in its first 100 m). Water polygons: the fountain pool way/1267933037
(24.3 m2) and the head pool. Nothing is mapped above the head pool; the hydro power house way/344631381
at (167, -71) implies an unmapped channel at the head of the bowl.

### 1.2 Every named feature (131: 88 points, 42 polygons, 1 line)

Real names are reference only: signboards in the game use invented names (brief section 7).

- **Lodging (68):** AD Friendship Lodge, Alpine Lodge Cafe and Grill, Ama-Dablam Lodge, Comfort Inn,
  Danfe Lodge & restaurant, Family Lodge, Footrest Lodge, Green Tara Hotel, The Green Tara Hotel, Hill Top
  Lodge & Restaurant, Himalayan culture home, Himalayan Lodge, Holiday Namche, home away from home (x2),
  Hotel 8848, Hotel Camp de Base (x2), Hotel Everest (x2), Hotel Hill-ten, Hotel Namche, Hotel Norling,
  Hotel Sherpaland, hotel sherwi, Hotel Snowland, Hotel Tibet, Hotel Tibetane Restaurant, International
  Foot Rest Lodge, KalaPatthar Lodge, Khangri Hotel, Khumbtse Lodge (hostel), Khumbu Guest House, Khumbu
  Lodge (x2), Khumbu Resort, Kongde View Lodge, Lhasa Guest House, Magar Hotel & Khaja Ghar, Moonlight
  Lodge and Restaurant, Mountain Dreams, Mountain View Hotel, Mountain View Lodge, Mt. Kailash Lodge &
  Restaurant, Mustang Guest House and Restaurant, Namaste Lodge (x2), Namche Bazaar Guest House &
  Restaurant, Namche Terrace, Nirvana Home, Panorama Lodge, Pumori Guesthouse, Sagarmatha Lodge, Sakura
  Guest House, Sherpa Barista Home, SHERPA HOME, Sherpa Village Hotel, Sona Lodge, Sun Site Lodge, Tamang
  Hotel, Thamersku View Lodge and Restaurant, Thawa lodge, The Nest at Namche, Valley View Lodge, Yak Hotel,
  Yak Hotel & Restaurant, Yeti Mountain Home, Zamling Guesthouse. Every one has an entry `lodge_*` in
  `landmarks.json` with id, position and footprint.
- **Food and drink (20):** Ama-Dablam restaurant, Anju Japanese Restaurant, Cafe de 8848, Highcamp cafe,
  Highcamp cage, Himalayan Java (x2), Himalayan Yard cafe, Hotel Everest restaurant, Irish Pub, Liquid
  Bar, Pizza House & Cake Shop, Sherpa Barista, Solukhumbu Restaurant, Stupa cafe, Syresh Cafe, The Hungry
  Yak, Trek Away Coffee, Ukali Cafe, Yakbuck Coffee.
- **Shops (13):** Everest Bakery, Namche Bakery, Hermann Helmers Baeckerei und Konditorei (bakeries);
  Himali (`shop=outdoor`), Everest Trekking Shop (`department_store`); Checkpoint Tea House; Everest Link
  (electronics); Everest Yak (gift); Himalayan Saloon; Milarepa Massage; Namche Photo Studio; Dog shelter
  Namche and its signpost.
- **Health (5):** Namche Health Post (`building=hospital`), Mountain Medical Institute (clinic), its
  pharmacy, Lord Buddha Pharmacy, Um Hong Gil Namche Community Hospital.
- **Civic and money (6):** Kumari Bank, Nabil ATM, Namche Post Office, Namche Primary School,
  Sagarmatha Community Library, "Sargamatha National Park Entry" (the police checkpost).
- **Religion, museums, memorials (8):** Namche Gompa (polygon and a second point 37 m east), Sherpa
  Culture Museum (point), Tenzing Norgay Sherpa Heritage Center (the park museum polygon), Tenzing Norgay
  memorial, Polish Climbers Memorial, Sagarmatha Next (museum near Syangboche), Namche Art Gallery.
- **Viewpoints (4 named of 10):** Best view point Namche (west spur), Everest View Point, Lookout,
  Lookout Namche Bazaar. **Air (3):** Namche Bazar Helipad, Namche Sagarmatha Murrphy helipad, Syangboche
  Airfield. **Other (4):** Adventure 6000 Farmhouse, Shaky's House, Yak Hotel (polygon), Bhote Koshi.

### 1.3 What the fetch never asked for

`scripts/fetch_osm.sh` posts `[out:json]` to Overpass, which returns Overpass JSON (`elements`), not the
GeoJSON `FeatureCollection` that `prep_osm.py` and `tools/geo/bake_entrance.py` read; re-running it would
overwrite the file with something neither can parse. The file on disk came from overpass-turbo. Its query
takes buildings, highways, waterways, walls, natural, aeroway, and only **nodes** for amenity, tourism,
shop and historic. Never fetched: `landuse` (farmland terraces), `leisure`, `office` (travel agents),
`man_made` (water taps, flagpoles), `place`, amenity or tourism **areas** that are not buildings
(`amenity=marketplace`, `tourism=camp_site`, `amenity=parking`), historic ways (mani walls), barriers other
than walls. The GEO package should pull these into a **new** file (convert to GeoJSON), never over
`data/raw/namche-osm.geojson`, and only with the owner's go-ahead.

## 2. Town extent

| Measure | Value |
| --- | --- |
| All 348 buildings | x -414 to 621, z -639 to 591 (1,036 x 1,230 m), includes Syangboche and the checkpoint |
| Town (bowl + mid slope + Chhorkung ridge, 313 buildings) | x -177 to 511, z -127 to 303 (688 x 430 m); footprints 3.42 ha; convex hull 23.7 ha; built envelope 7.5 ha (gaps under 24 m closed) to 10.8 ha (under 40 m) |
| **Built bowl** (233 buildings, x -200..200) | x -177 to 205, z -127 to 303 (**381 x 430 m**); footprints 2.50 ha (21 % of the hull); **convex hull 11.8 ha**; envelope 5.7 to 7.9 ha |
| Chhorkung and the ridge (69) | x 289 to 511, z -85 to 291; 3,507 to 3,552 m |
| Outside the town (35) | lower trail group (8, 3,370 to 3,390 m), west spur (11, 3,580 to 3,608 m), health post group (3), Syangboche (5, 3,761 to 3,765 m), checkpoint |
| Elevation, bowl buildings | **3,390 to 3,481 m SRTM, 3,378 to 3,487 m GLO-30** (91 to 109 m of relief) |
| Elevation, key points | entrance 3,398 / 3,390; town centre 3,428 / 3,425; highest bowl lane 3,480 / 3,490; park museum 3,551 / 3,554; checkpoint 3,325 / 3,327 m |
| Lane length | whole export 21,909 m (steps 698 m, 3.2 %); town hull 4,492 m (steps 335 m); bowl hull 2,367 m (steps 245 m); box x -200..600, z -140..340: 5,935 m (steps 411 m) |
| Steep untagged path in that box | 540 / 565 m steeper than 36 %, 1,200 / 1,245 m at 20 to 36 % (SRTM / GLO-30, 5 m samples) |

**DEM georeferencing.** `data/merged.npy` (from `scripts/build_dem.py`) is float32 (2401, 1201): SRTM3
tiles N28E086 over N27E086, row r at lat 29 - r/1200, column c at lon 86 + c/1200, cells 3 arc-seconds
(92.3 m north-south by 82.1 m east-west here), voids filled; 3,427 m at the origin. GLO-30
(`data/raw/dem/`, used by M1) is 1 arc-second (30.8 x 27.4 m), pixel-is-point tied at 86.0 E 28.0 N.
Over x -600..700, z -700..700 GLO-30 minus SRTM averages +0.06 m (std 6.9 m, range -24 to +28 m), but at
the gate and stupa GLO-30 is 8 to 10 m lower, and the two disagree on the bowl's valley line by 20 to
40 m in x. GLO-30 is a surface model (roofs, trees).

## 3. The path network, routes and the world scale

### 3.1 Graph

63 ways give 1,621 vertices and 1,650 segments: 78 junctions (73 of degree 3, 5 of degree 4), 25 dead
ends, **2 connected components** (21,261 m; and way/345402350, 647 m on the west slope, whose east end is
23.6 m short of way/1373254110). Collapsing degree-2 chains leaves 103 nodes and 132 edges. Inside the bowl
box (x -200..205, z -140..305): 236 vertices, 2,949 m, 27 junctions, 5 dead ends. Inside the town box
(x -200..600, z -140..340): 50 junctions, 16 dead ends. Two dead ends nearly touch another way (way/344647242
3.7 m from way/344632234; way/539960400 2.1 m from way/25143515): join them. In the bowl only 93 of 233
buildings are within 3 m of a mapped path (median 4.8 m, 13 more than 30 m away), so access lanes to
most doors must be generated and registered as invented.

### 3.2 Routes from the entrance (shortest by lane length; climb = net / total ascent, SRTM then GLO-30)

| Target | Route | Climb | Steps | Via |
| --- | ---: | --- | ---: | --- |
| (a) Town centre, four-way junction (48.8, 17.9) | **213 m** | +30 / +35 (up 31 / 36) | 125 m | passage 6, link 14, main steps 125, main street 68 |
| (a) Middle of the main street (40.8, 46.0) | 177 m | +27 / +30 | 125 m | as above |
| (b) Head of the bowl, NE junction (135.9, -89.6) | **375 m** | +69 / +80 (up 71 / 82) | 125 m | main street, link way/1373254117, main trail way/25143515 |
| (b) Top of the gompa-side steps (-74.8, -86.2) | 447 m | +87 / +106 (up 94 / 117) | 87 m | west lane, gompa steps, upper lanes |
| (b) Farthest lane point in the bowl (-53.0, -61.7) | 490 m | +70 / +92 (up 94 / 117) | 131 m | as above |
| Gompa, top of its steps (-96.5, -5.3) | 300 m | +62 / +78 | 87 m | west lane, gompa steps |
| (c) Sherpa Culture Museum, lane end (426.3, -0.2) | 764 m | +119 / +124 | 125 m | main trail to Chhorkung, ways 56081267, 59428773 |
| (c) Park museum junction (477.6, 192.7) | 903 m | +153 / +162 | 125 m | main trail, way/56081267 |
| (c) Tenzing Norgay memorial (path vertex 7.7 m off) | 927 m | +153 / +162 | 125 m | as above |
| (c) **Everest View Point** (523.2, 270.2) | **1,003 m** | +145 / +156 (up 157 / 164) | 125 m | as above, to the end of way/56081267 |
| Police checkpoint, down the trail (68.1, 586.7) | 554 m | -73 / -62 (up 30 / 22) | 0 | way/551441452 |

From the town centre: gompa 211 m, Sherpa Culture Museum 551 m, park museum 691 m, Everest View Point
791 m, health post 538 m (+104 / +115). Across the bowl: gompa junction to Chhorkung 581 m; rim to rim
across the top 395 m. Route polylines: `out/audit-osm-data/route_polylines.json`.

### 3.3 Time on foot at each scale (minutes; walk 1.3, jog 2.4, sprint 3.5 m/s; M1's walk test averaged 1.23 m/s with stairs)

| Leg (real length) | 0.55 walk / jog | 0.60 walk / jog | **0.65 walk / jog** | 0.70 walk / jog |
| --- | --- | --- | --- | --- |
| Entrance to town centre (213 m) | 1.5 / 0.8 | 1.6 / 0.9 | **1.8 / 1.0** | 1.9 / 1.0 |
| Entrance to head of bowl (375 m) | 2.6 / 1.4 | 2.9 / 1.6 | **3.1 / 1.7** | 3.4 / 1.8 |
| Entrance to gompa-side top (447 m) | 3.2 / 1.7 | 3.4 / 1.9 | **3.7 / 2.0** | 4.0 / 2.2 |
| Entrance to farthest bowl lane (490 m) | 3.5 / 1.9 | 3.8 / 2.0 | **4.1 / 2.2** | 4.4 / 2.4 |
| Rim to rim across the top (395 m) | 2.8 / 1.5 | 3.0 / 1.6 | **3.3 / 1.8** | 3.5 / 1.9 |
| Gompa to Chhorkung, across (581 m) | 4.1 / 2.2 | 4.5 / 2.4 | **4.8 / 2.6** | 5.2 / 2.8 |
| Entrance to Everest View Point (1,003 m) | 7.1 / 3.8 | 7.7 / 4.2 | **8.4 / 4.5** | 9.0 / 4.9 |
| Entrance to checkpoint (554 m) | 3.9 / 2.1 | 4.3 / 2.3 | **4.6 / 2.5** | 5.0 / 2.7 |

Uniform scaling keeps every gradient: the climb to the head of the bowl becomes 45 to 52 world m at 0.65
(41 to 48 at 0.60), and the bowl's 90 to 110 m of relief becomes 59 to 71 m.

### 3.4 What a uniform scale does to lanes and footprints if applied to everything

Wall-to-wall lane widths were sampled every 2 m wherever buildings stand within 12 m on both sides
(452 samples).

| Quantity | Real | x0.55 | x0.60 | x0.65 | x0.70 |
| --- | --- | --- | --- | --- | --- |
| Lane width, median / 10th percentile | 7.57 / 3.35 m | 4.16 / 1.84 | 4.54 / 2.01 | 4.92 / 2.18 | 5.30 / 2.34 |
| Lane samples under 3.0 m / under 2.0 m | 5 % / 1 % | 31 % / 14 % | 28 % / 10 % | 25 % / 6 % | 22 % / 3 % |
| Main street pinch (way/56081262) | 2.4 m | 1.32 | 1.44 | 1.56 | 1.68 |
| Main steps (`width=2`) | 2.0 m | 1.10 | 1.20 | 1.30 | 1.40 |
| Median footprint, area / box | 76.5 m2 / 11.9 x 6.7 m | 23.1 / 6.5 x 3.7 | 27.5 / 7.1 x 4.0 | 32.3 / 7.7 x 4.4 | 37.5 / 8.3 x 4.7 |
| Median clear width (bowl) | 6.6 m | 3.6 | 4.0 | 4.3 | 4.6 |
| A 2.55 m storey, if heights scaled too | 2.55 m | 1.40 | 1.53 | 1.66 | 1.79 |

So positions and terrain scale; people, storeys, doors, steps and lane widths do not (brief section 1).

### 3.5 How many buildings survive at human scale

Method (`out/audit-osm-data/v02_scale_survival.py`): every footprint is placed at s x its real centroid,
keeps its real orientation and shape at factor f of real size, may shrink to 0.9, 0.8 or 0.7 of f (short
side at least 4 m), and must not touch a lane corridor (scaled centre-line, real width 3.0 m; steps
2.3 m; open stream 1.8 m) or another building (gap 0 or 1.2 m). Order: 15 landmarks, 10 hero hosts,
named or POI buildings, then plain ones by size. Greedy, no shifting, so these are **lower bounds**.

| s | f = 1.0 (true size), gap 0 / 1.2 m | f = 0.82 (M1), gap 0 / 1.2 m | f = 0.75, gap 0 / 1.2 m | f = s (uniform), gap 0 / 1.2 m |
| --- | --- | --- | --- | --- |
| 0.55 | 109 / 94 | 137 / 114 | | 227 / 192 |
| 0.60 | 126 / 110 | 158 / 138 | 180 / 156 | 238 / 203 |
| 0.62 | | f = 0.80: 177 / 153 | | |
| **0.65** | 139 / 121 | **194 / 170** | 222 / 189 | 253 / 221 |
| 0.70 | 162 / 146 | 236 / 202 | f = 0.90: 200 / 176 | 273 / 242 |

All out of 313 town buildings (bowl 233). At 0.65, f = 0.82, gap 1.2 m: bowl 122, ridge 40, mid 8; the
survivors cover 12,000 m2 of world ground, 83 % of the uniformly scaled built area, so the town stays as
built-up with fewer, larger buildings. Lane width matters: 2.4 m lanes keep 186, 4.0 m lanes 148. Map:
`out/audit-osm-data/map_survivors_s065.png`; ids: `survivors_s065.json` (also `_s060`, `_s062`).

**The entrance cluster is the tightest place.** At true size the stupa and its side pavilion (4.0 m
apart in reality) overlap at every s up to 0.65 (1.5 m2 at 0.65) and only clear at 0.70 (0.1 m); the
stupa and the Stupa cafe (6.3 m apart) overlap up to 0.65 (0.9 m2); gate to cafe keeps 0.8 m at 0.65;
pavilions 4 and 5 keep 1.3 m. Main-street hero hosts (the Everest Bakery block way/312775920 and the
pharmacy block way/344628778) are dropped by the greedy pass at both 0.60 and 0.65 because the main street
(real pinch 2.4 m) cannot hold a 3 m lane between compressed neighbours.

### 3.6 Recommendation

**WORLD_SCALE = 0.65, unchanged from M1.** It meets "about 2 to 3 minutes end to end" for the defining
walk, gate to the head of the amphitheatre (3.1 min walking, 1.7 min jogging), keeps 170 buildings at
M1's x0.82 footprint (the brief's floor is 60, the orchestrator's aim 150), keeps 65 % of the vertical
relief for the stepped terraces, and needs no re-bake of M1. Then:

- Landmarks at true size (gate 4.5 m, stupa about 11 m, pavilions 2.5 to 4.5 m); hero buildings at
  0.9 to 1.0; other buildings at 0.82 shrinking to 0.6 before they are dropped; lanes 3.0 m (main street
  and main steps 3.5 to 4.0 m, never more than 15 % over real).
- Resolve the stupa, side pavilion and cafe by hand: move the cafe 1 to 2 m south-west and the pavilion
  about 1 m east-south-east (register both as adjusted positions), or bake the plaza at a local scale of
  0.70 or more.
- Move hero hosts on the main street back from the lane by 1 to 2 m rather than dropping them.
- **Fallback:** if playtests find the climb too long, 0.60 with footprints at 0.75 keeps 156 buildings
  (walk to the head of the bowl 2.9 min). Below 0.60 the entrance cluster and the main street break.

## 4. The landmarks of brief sections 5 and 7

Positions are real metres; `landmarks.json` keys in brackets. M1 bakes everything at world = real x 0.65.

| Landmark | In OSM? | id and tags | x, z | lat, lon | Size | Notes and evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Bridge over the stream below the gate [`bridge_below_gate`] | **No** | none; no `bridge=*` anywhere in the export | suggested (-16.4, 252.8) | 27.802718, 86.709833 | | The trail never crosses a stream. The owner's red "bridge" marks (`chat_05`) are inside the gate: [`footbridge_plaza`] (-28.8, 178.4), where way/1373254109 crosses culvert way/1267933035 (the only path-stream crossing in the export), and [`channel_railing_west`] about 11 m along the west side of the open channel north of the fountain, centre (-18.8, 163.8). M1 invents a footbridge and rill at (-32.5, 222.4). Ask the owner which bridge he means. |
| Trail up from below [`trail_from_below`] | Yes | way/551441452 highway=path, sac_scale=hiking, trail_visibility=excellent | (574.3, 1349.8) to (-24.3, 194.3) | gate end 27.803247, 86.709753 | 1,710.6 m | 3,098 to 3,398 m (SRTM). No surface or width. The first 100 m drop 17 m on SRTM but 4 m on GLO-30. Joined 150 m below the gate by the lower east lane way/56081266. |
| Stone path to the gate | Part of the trail | way/551441452, last 50 m | (-27.9, 236.5) at 45 m down [`entrance_spawn`] | 27.802866, 86.709717 | | No surface tag; photo: grey flagstones, low wall on its left. The entrance photo was taken about 40 to 45 m below the gate; M1 spawns 23.8 m below (15.5 world m). |
| Kani gate [`kani_gate`, `kani_gate_node`] | Yes | way/344630686 building=yes; node/13793755901 historic=city_gate; passage way/551441451 tunnel=yes | centroid (-24.7, 191.1); node (-25.0, 192.3) | 27.803275, 86.709749 | 5.6 E-W x 6.4 N-S m (35.3 m2) | Passage runs north-south at x = -24.3. Brief and photos: 4.5 m square front; the OSM outline is probably the roof. |
| Big stupa [`stupa`] | Yes | way/344630942 building=yes, man_made=stupa, religion=buddhist | (-42.4, 156.6) | 27.803587, 86.709570 | 11.8 x 8.6 m (100.7 m2), long sides at 124/304 deg | Photos: base about 11 m, height about the same. Kora loop of mapped paths round it [`stupa_kora_loop`]: 109.5 m, 1.8 to 18.5 m from its wall. |
| Fountain and pool [`fountain`, `fountain_jet`] | Yes | pool way/1267933037 natural=water, water=lake; jet node/11775705677 amenity=fountain | (-23.5, 170.1); jet (-23.4, 169.8) | 27.803465, 86.709762 | round, 5.7 m (24.3 m2) | The open stream way/1267933034 runs through the pool. 23.6 m from the stupa centre. |
| Water spouts [`water_spouts_gate`] | **No** | none | estimate (-31.0, 190.5), within about 5 m | 27.803281, 86.709685 | | `chat_09`: three running brass spouts on a stone wall west of the gate, set back about level with its front, blue bench in front, cafe terrace behind. Culvert way/1267933035 passes beneath to (-35.6, 193.2) and its outlet at (-40.3, 190.7): the likely feed. |
| Police and permit checkpoint [`checkpoint`, `checkpoint_tea_house`] | Yes | way/344931638 building=yes, amenity=police, description=Checkpost, name "Sargamatha National Park Entry" | (68.1, 586.7) | 27.799705, 86.710691 | 7.0 x 6.3 m (44.3 m2) | 549 m down the trail and 62 to 73 m lower, 5.7 m off it. Tea house node/11704178324, toilets, recycling and drinking water node/11245070713 within 23 m. Outside M1's play box. |
| Stream with water-driven prayer wheels [`stream_town`, `stream_head_pool`, `stream_below_gate`] | Yes | 12 stream ways (6 `tunnel=yes`, `layer=-1`), head pool way/1267933038, way/312775993 below | head (16.7, 108.5), outlet (-40.3, 190.7) | | 105 m in town | "Water-driven" is inferred: each of the five pavilions straddles one culvert (3.9 to 4.6 m long) exactly, and the brief says water-powered. |
| Prayer-wheel pavilion row [`prayer_wheel_pavilion_1` to `_5`] | Yes, untagged | way/344630709, 344630875, 344630877, 344630878, 344630879, all building=yes | (-12.1, 158.9), (-6.7, 149.0), (-2.1, 140.4), (1.8, 131.2), (5.5, 123.8) | | 4.4 to 4.7 x 3.8 to 4.5 m (17.7 to 20.8 m2) | Row 39.2 m long, bearing 27 deg up the channel, 8.3 to 11.2 m apart, 3.3 to 9.7 m east of the steps. Photos: 2.2 to 2.8 m body, 3.5 m tall, so the outline is the roof. |
| Stupa-side pavilion and chorten [`stupa_side_pavilion`, `memorial_chorten_stupa`] | Yes | way/1050011454 building=yes; node/11704172271 historic=memorial (Pemba Doma Sherpa) | (-31.2, 163.4); chorten (-31.6, 163.1) | 27.803526, 86.709683 | 5.8 x 5.4 m | 4.0 m from the stupa wall, east-south-east. Photos: red-roofed prayer-wheel pavilion; white memorial chorten. |
| Lit restaurant by the stupa [`stupa_cafe`] | Yes | way/1050011453 building=yes + node/12801708793 amenity=cafe | (-38.9, 178.3) | 27.803391, 86.709605 | L-shape, 12.3 x 12.1 m box, 99.9 m2, clear 6.1 m | Front-left as you walk through the gate; 6.3 m from the stupa, 7.4 m from the gate. |
| Market and camping ground [`market_ground`] | **No** | none (no landuse, marketplace or camp_site in the export) | centre (-75.0, 188.0), good to about 20 m | 27.803303, 86.709239 | 60 x 30 m suggested | Building-free patch of 1.2 ha (x -149..18, z 151..267); flattest band z 165 to 195; `chat_03` shows flat bare ground west of the stupa at its level, tents lower in front. Stream way/312775993 grazes the south-east corner of a 55 x 28 m box here: keep 3 m clear. M1 reads this entry and bakes 36 x 18 world m. |
| Central lanes and stairways [`main_steps`, `main_street`, `lane_*`, `gompa_steps`, `upper_west_steps`] | Yes | main steps way/551442828; main street way/56081262 (67.8 m); west lane way/1373254110 (429 m); east lane way/59428772 (382 m); upper lanes way/56081263, 56081264; lower east lane way/56081266 | town centre (48.8, 17.9) [`town_centre`] | 27.804839, 86.710496 | wall to wall: main street median 5.3 m (pinch 2.4), west lane 6.2 (2.5) | Banks, cafes, bakeries, the clinic and pharmacies lie within 60 m of the four-way junction. |
| Gompa [`gompa`, `gompa_entrance`, `gompa_courtyard_building`, `gompa_upper_shrine`] | Yes | way/312775915 building=yes, amenity=monastery, religion=buddhist, name Namche Gompa; node/1492311484 (same name) | (-129.5, 1.5) | 27.804987, 86.708686 | 13.4 x 9.1 m (121.7 m2) | The node, 37 m east, sits on the lane at the top of the gompa steps. The C-shaped way/344631168 (18.5 x 16.8 m) between them opens towards the hall: probably the compound's courtyard range. A small place of worship node/12818448601 is 14 m north of it. |
| Sherpa Culture Museum [`sherpa_culture_museum`] | Point only | node/736940464 tourism=museum, ele=3517 | (428.4, -4.3) | 27.805039, 86.714347 | no footprint | Chhorkung, on the east ridge. 7.6 m from round building way/344631835 (6.6 m across), 20 m from way/300645643 (39.8 x 24.0 m). Lane way/59428773 ends 4.6 m away. Which building it is cannot be told from the data. |
| National park visitor centre [`park_visitor_centre`] | Yes | way/312775992 building=yes, tourism=museum, ele=3563; Nepali name = "Sagarmatha National Park Museum", name:en "Tenzing Norgay Sherpa Heritage Center" | (468.2, 204.2) | 27.803157, 86.714752 | 37.9 x 18.6 m (376.6 m2), clear 13.3 m | The two names disagree; untagged buildings south of it are presumably park and army offices. |
| Ridge viewpoint, Tenzing Norgay area [`tenzing_memorial`, `everest_view_point`, `ridge_viewpoint_south`, `polish_memorial`] | Yes | node/6992316686 historic=memorial; node/703894933 tourism=viewpoint "Everest View Point"; node/12778065240 viewpoint; node/12778109498 memorial | memorial (499.1, 205.0); view point (523.2, 270.2) | 27.803150, 86.715065 | | Memorial 15.8 m east of the museum. Bench node/12801753648 and toilets node/12778056373 nearby. Also a west-spur viewpoint [`viewpoint_west`] (-345.5, 148.7), the natural camera for the whole amphitheatre. |
| Helipad [`helipad_ridge_north`, `helipad_ridge_south`, `helipad_west`] | Yes | way/344633041 "Namche Sagarmatha Murrphy helipad"; way/378779804; way/539956612 "Namche Bazar Helipad" | (438.4, 119.4); (467.8, 264.3); (-354.8, 156.7) | | 11.3, 11.7, 13.8 m | The ridge pads flank the park museum; the west pad is 624 m by path from the entrance. |
| Health post, clinic, pharmacy [`health_post`, `clinic_centre`, `pharmacy_*`, `hospital_east`, `dentist`] | Yes | way/312775939 building=hospital "Namche Health Post"; clinic node/4529329989 (emergency=yes) and pharmacy node/10206424517 in way/300651644; pharmacy node/4518666091 by way/344628778; hospital node/12801774023 in way/1050011416 | health post (89.8, -215.2); clinic (51.1, 54.9); pharmacy (43.1, 50.6) | 27.806942, 86.710911 | 38.2 x 9.6; 44.6 x 8.4; 34.8 x 12.1 m | The health post is above the bowl (695 m, about 120 m of climb); the clinic and pharmacies are on the main street, 150 to 190 m from the entrance. |
| Bakeries [`bakery_*`] | Yes | shop=bakery: node/4417284096, node/4417284097, node/425189497 | (30.4, 57.7); (45.5, 64.0); (-37.5, 20.1) | | hosts 22.9 x 15.5; 34.8 x 12.1; 64.8 x 25.1 m | Plus a cake shop node/5322573111. |
| Gear shops [`gear_shop`, `gear_shop_alt`] | Yes | node/14356276101 shop=outdoor; node/4516437389 shop=department_store | (10.6, -6.4); (-43.8, 11.0) | | hosts 17.0 x 10.7; 64.8 x 25.1 m | The only `shop=outdoor`; 45 m west-north-west of the centre. |
| Trekking agency [`trekking_agency`] | **No** | none (office=* was never fetched) | suggested host way/345803160 at (69.4, -16.9) | 27.805153, 86.710704 | 20.7 x 9.5 m | Real untagged footprint 40 m north-north-east of the centre, 10.6 m off the main trail out; the use is invented. |
| Lodges [`lodge_*`, 69 entries] | Yes | 30 tourism=guest_house polygons, building=hotel 1, 38 lodging points | | | | Names in 1.2; heroes in section 5. |

**What M1 builds today, and what should change** (from `tools/geo/bake_entrance.py`,
`client/public/assets/entrance/layout.json`, `client/src/world/entrance.ts`):

- Uses OSM ids directly: trail, gate passage, gate node (hRef 3,393.8 m from GLO-30), link path, kora
  side path, main steps (as a corridor), stupa centroid (plaza 19 x 16 world m), three open stream
  stretches (way/312775993, 1267933034, 1267933032) and 24 generic lodges. From `landmarks.json` it reads
  only `market_ground` (`key`, `x`, `z`).
- Not built yet: the five pavilions, the side pavilion and chorten, the fountain and pool, the Stupa cafe
  (excluded), the water spouts, the two railinged crossings, and the other four open stream stretches up
  the pavilion row (way/1267933026, 028, 030, 036; 30.3 m) and the head pool. The ENTRANCE package should
  build them from the ids above.
- The generic lodge pass takes hero hosts: way/300645649 (The Nest, as the blue-roofed lodge),
  way/312775986 (Hotel Sherpaland), way/312775969 (gear shop), way/312775920 (bakery), way/345803160
  (agency host), way/344631168 (gompa courtyard) and way/312775983 (the 64.8 m west block, clamped to a
  15 x 15 m box). Reserve section 5's ids and split long blocks into row segments instead of clamping.
- The checkpoint is 357 world m down the trail, outside the 150 x 150 m play box: extend a trail corridor
  to it (missions 1, 9 and 14 need it) rather than moving it.

## 5. Hero buildings for interiors

A third-person camera at 2 to 2.5 m indoors needs about 6 m of clear room width, so an exterior short
side of at least 7 world m. "x0.82" is the world size at M1's footprint factor. Route = lane distance
from the entrance. All ids are real footprints; uses marked "invented" must be registered.

| Role | Pick | Host id | Real box, area, clear width | World at x0.82 | Route | Alternatives and notes |
| --- | --- | --- | --- | --- | --- | --- |
| Lodge 1 (tutorial check-in) | The Nest at Namche | way/300645649 | 31.6 x 13.6 m, 429 m2, 13.6 m | 25.9 x 11.2 m | 104 m | Nearest big lodge to the gate; M1's blue-roofed lodge. |
| Lodge 2 (centre) | Hotel Sherpaland (`building:levels=3`) | way/312775986 | 35.6 x 17.4 m, 392 m2, 13.3 m | 29.2 x 14.3 m | 253 m | Comfort Inn way/300645655 (25.2 x 10.8, 149 m, by the main steps); Hotel Norling way/312775977 (22.4 x 11.3). |
| Lodge 3 (east, Thamserku terrace) | Hotel Hill-ten | way/300645629 | 22.6 x 17.8 m, 333 m2, 13.5 m | 18.5 x 14.6 m | 352 m | Ama-Dablam Lodge way/300645628 (21.9 x 17.5); Zamling Guesthouse way/300645656 (22.5 x 13.0). |
| Gear shop | Himali (`shop=outdoor`) | way/312775969 | 17.0 x 10.7 m, 159 m2, 10.7 m | 13.9 x 8.8 m | 266 m | Shares the block with a bar and a massage shop. Alt: Everest Trekking Shop on way/312775983 (64.8 x 25.1, 844 m2, seven businesses). |
| Bakery or teahouse | Everest Bakery with a coffee shop | way/312775920 | 22.9 x 15.5 m, 278 m2, 11.5 m | 18.8 x 12.7 m | 169 m | On the main street: shift 1 to 2 m off the lane. Teahouse alt: Stupa cafe way/1050011453 (L-shape, clear 6.1 m: true size only). |
| Health post or pharmacy | Lord Buddha Pharmacy block | way/344628778 | 34.8 x 12.1 m, 295 m2, 10.0 m | 28.5 x 9.9 m | 151 m | Also holds a bakery, a bank and an ATM point. Alt: clinic and pharmacy way/300651644 (44.6 x 8.4, clear 6.9: narrow); the real health post way/312775939 (38.2 x 9.6) is 695 m and 120 m up, far for a wake-up point. |
| Gompa prayer hall | Namche Gompa | way/312775915 | 13.4 x 9.1 m, 122 m2, 9.1 m | 11.0 x 7.5 m (build at true size) | 335 m | Courtyard range way/344631168 (C-shape 18.5 x 16.8, clear 6.3). |
| Trekking agency office | untagged footprint (use invented) | way/345803160 | 20.7 x 9.5 m, 164 m2, 9.5 m | 17.0 x 7.8 m | 288 m | On the main trail 40 m from the centre. Alts: way/300651657 (18.4 x 7.6), way/312775947 (22.0 x 11.0, 29 m from a lane). |

## 6. Data quality problems and what the build must do

| Problem | Numbers | What the prototype pipeline does (`scripts/prep_osm.py`) | What the build must do |
| --- | --- | --- | --- |
| Footprint overlaps | Raw: 0 overlapping pairs; 25 pairs share a wall; nearest-neighbour gap median 2.27 m, 45 % under 2 m | T1a (lines 123-176): after simplifying (0.7 m, 1.6 m over 14 vertices) cuts overlaps under 1.5 m deep and merges deeper ones: today 8 cut, 0 merged, 0 left | The real overlaps come from compression with human-scale footprints (3.5). Resolve at bake by priority, shrink, small shift, then drop; keep shared-wall rows as one terrace mesh; test "no footprint overlaps another or a lane corridor". |
| Paths through buildings | Raw: only the gate passage (6.4 m inside way/344630686, correct); 29 of 1,713 vertices within 1.6 m of a wall | T1b (210-300): moves 443 vertices (max 4.03 m) to 1.6 m clearance, 33 squeezed, 23 still closer (min 0.65 m). It also pushes the gate passage out, so the prototype path walks round the gate at x = -20.3 | Exempt `tunnel=yes` ways and their host; apply clearance after compression in world metres; keep OSM ids on vertices. M1 already uses raw geometry. |
| Path masks inside footprints | 2,833 mask pixels inside footprint + 0.4 m | Clears them (0 left) | Rasterise lanes from vectors at bake and clip by the final footprints. |
| Heights and levels missing | `building:levels` on 8 of 348; `height` 0; no roof or colour tags | Seeded storeys 1 to 5 by kind and area | Seeded rule calibrated on the 8 values and the photos (3 to 4 storeys in the core), storey 2.4 to 2.7 m; listed as stylised. |
| Untagged buildings | 301 of 348 bare `building=yes`; 25 business points lie 0 to 5 m outside their building | Attaches only points strictly inside, so e.g. the pharmacy 1.9 m outside its block is lost | Join points within 3 to 5 m; type the rest by size and place; invented sign names. |
| Bad geometry | way/312775961 traces its ring twice (raw area 430.5 vs true 215.3 m2); 2 footprints under 9 m2; 65 not 4-sided, 61 fill under 90 % of their box (prototype audit) | Drops under 9 m2; builds roofs on the box (33 roof clashes) | Repair with `buffer(0)`; roofs from the footprint, split L and T shapes. |
| Duplicates and tagging errors | Two Hotel Camp de Base, two Khumbu Lodge, two Hotel Everest, two Namaste Lodge, Green Tara twice, Yak Hotel three times, Namche Gompa twice; `amenity=tourism` on way/312775929; "Sargamatha", "restaraunt" | None | Count each footprint once; names only for reference. |
| Network gaps | 2 components; 25 dead ends (16 in town); 2 near misses of 2.1 and 3.7 m; 140 of 233 bowl buildings more than 3 m from a path | None | Join the near misses and way/345402350 (23.6 m); generate access lanes and register them as invented. |
| Stairs under-tagged | 4 steps ways (698 m); 540 to 565 m of town paths steeper than 36 % | Stairs where tagged or where SRTM is steeper than 25 deg | Fit flights from the GLO-30 slope (risers 0.17 to 0.20 m); prototype audit warns 80 of 124 flights break the riser limit unless heights scale with the plan, which uniform scaling does. |
| Widths and surfaces absent | `width` only on the main steps (2 m); `surface` on 8 ways | 3.2 m paved in a "core" box that catches 56 of 63 ways | Use measured corridors (median 7.6 m wall to wall, 10th percentile 3.35 m) and the brief's limit of +15 %. |
| Culverts and bridges | 6 culverts (46.2 m) `tunnel=yes`, `layer=-1`; no `bridge=*` at all | Ignores `tunnel`: all 15 waterways drawn open, a plank bridge put on a culvert | Draw only open stretches (M1 does); pavilions over the culverts; no bridges where paths meet streams. |
| Fetch script and query | Wrong output format; classes never fetched (1.3) | none | Rewrite the fetch to emit GeoJSON into a new file; add the missing classes; diff against this export before use. |

## 7. Changes made to `docs/audit/landmarks.json`

The file stays a list of objects with the same 12 fields (`key, name, osmId, tags, x, z, lat, lon, sizeM,
inOsm, confidence, note`); no key was removed or renamed; 139 entries became 148. `bake_entrance.py`
reads only `market_ground` (`key`, `x`, `z`), whose position is unchanged; checked by repeating its read.
All 148 entries were re-checked against the export: ids exist, tags match, points and polygon centroids
within 0.15 m, sizes match the best-fit box, lat/lon match x, z. A backup of the earlier file is in
`out/audit-osm-data/landmarks_before.json`; the full change log is in `landmarks_changes.txt`.

**Corrected (8 entries):**
- `stupa`: note said the long side bears 56 deg (axes flipped); it is 124/304 deg (WNW to ESE).
- `stupa_side_pavilion`: "8 m south-east of the stupa" became 4.0 m from the wall, 13.0 m centre to
  centre, bearing 121 deg.
- `stupa_kora_loop`: x, z moved from (-44.5, 158.5), which lay on no way, to the loop centre
  (-42.1, 156.3); lat, lon and elevation updated.
- `stream_town`: "3.3 to 9.7 m east of the main steps" (those were the pavilion distances) became 2.3 to
  10.2 m.
- `trail_from_below`: "drops 12 to 17 m" became 17 m on SRTM but 4 m on GLO-30.
- `lane_east`: climb 78 to 79 m became 79 to 80 m. `gear_shop`: 40 m north-west became 45 m
  west-north-west of the centre. `viewpoint_west`: 10 m from the helipad became 4.5 m from its edge.

**Evidence added to notes (14 entries):** `entrance_spawn` (photo position 40 to 45 m below the gate;
M1's spawn), `bridge_below_gate` (M1's invented bridge; the owner's bridges are inside the gate),
`market_ground` (photo reading; the stream grazes its south-east corner), `water_spouts_gate` (culvert
feed, `chat_09`), `fountain` (round in OSM against a rectangular reading of a photo),
`lodge_way_312775961` (ring traced twice), `trekking_agency` (office=* never fetched), `park_visitor_centre`
(name conflict), and "hero interior candidate" on `lodge_node_4866107279`, `lodge_node_6342603098`,
`lodge_way_300645629`, `gear_shop`, `bakery_main_street_west`, `pharmacy_main_street`, `gompa`,
`trekking_agency`.

**Added (9 entries):** `kani_gate_node` (node/13793755901), `channel_railing_west` (not in OSM, low
confidence), `fountain_jet` (node/11775705677), `memorial_chorten_stupa` (node/11704172271),
`checkpoint_tea_house` (node/11704178324), `gompa_upper_shrine` (node/12818448601), `shrine_west_trail`
(node/13838891601), `chorten_upper_trail` (node/6342603190), `sagarmatha_next` (node/7033837230, a museum
near Syangboche that is not a brief landmark).

**Not changed on purpose:** `market_ground` keeps (-75.0, 188.0) because M1's bake reads it and the
evidence does not single out a better point; `entrance_spawn` and `bridge_below_gate` keep their
photo-based positions and now record M1's choices beside them.

## 8. Files

- Report: `docs/audit/osm_data.md` (this file). Registry: `docs/audit/landmarks.json` (148 entries).
- Maps (real metres unless noted): `out/audit-osm-data/map_landmarks.png` (every non-lodge key),
  `map_survivors_s065.png` (world metres at 0.65), `map_entrance.png`, `map_openground.png`,
  `map_gompa.png`, `map_ridge.png`, `map_town.png`.
- Data: `buildings_table.json` (all 348 footprints: size, clear width, elevation, route, POIs),
  `poi_buildings.json`, `graph.json`, `routes.json`, `route_polylines.json`, `corridor_samples.json`,
  `survivors_s060/062/065.json`, `scale_survival.json`.
- Scripts (run with `$NAMCHE_PY`, read-only on the repo): `a01` to `a22` (inventory, extent, graph, routes,
  quality, heroes), `v01_verify_landmarks.py`, `v02_scale_survival.py`, `v03_more_routes.py`,
  `v04_survivors.py`, `v05_named.py`, `v06_checks.py`, `v08_update_landmarks.py`, `v09_maps.py`;
  `prep_osm_copy.py` re-runs the prototype pipeline into scratch (its output is byte-identical to
  `data/data.js`; log in `o_prep_rerun.txt`).
