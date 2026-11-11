# Visual references B: art bible from `reference/namche/ref_21` to `ref_39` and `NAMCHE_INSPO1` to `_5`

Audit task `refs-town-b`, 2026-11-12. Read-only audit: nothing in `client/`, `tools/` or the reference folder was
changed. Scratch work, scripts and colour-check sheets are in `out/audit-refs-town-b/v2/` (`sample.py`,
`palette.py`, `peaks.py`, `aspect.py`, `s1.tsv` to `s4.tsv` with `s*_sheet*.png` proof tiles).

Every colour below is the **median of a small patch of real pixels** (radius 2 to 15 px), checked on a proof
tile. Sizes judged from people assume a 1.75 m adult and are good to about 15 %. Peak angles come from SRTM
(`data/merged.npy`) with summit positions typed in the prior audit's `skyline.py`.

## 0. The ten facts that matter most

1. **The big mountain over the town in most of these photos is Kongde Ri, not Thamserku.** `ref_26`, `ref_27`,
   `ref_34`, `ref_36`, `ref_37`, `ref_38` and `NAMCHE_INSPO_2` look WSW from the east or north side of town at
   Kongde Ri's NE face. Thamserku is in `ref_32`, `ref_35`, `NAMCHE_INSPO_3` and (probably) `ref_28`, `ref_29`.
   The proof: SRTM aspect shows the bowl opens to the SSW (west side faces 145 deg, east side 254 deg, head
   167 deg), so the forested arm on the right of a WSW view is the west arm; and sunrise alpenglow can only
   light Kongde's NE face (`ref_27`) while sunset lights Thamserku's west face (`NAMCHE_INSPO_3`).
2. **Both peaks stand about 22 deg above the horizontal from anywhere in town.** Thamserku: bearing 101 to 105 deg,
   elevation 21.3 to 23.7 deg, 7.0 to 7.9 km. Kongde Ri summit: bearing 256 to 262 deg, elevation 20.0 to 22.6
   deg, 6.5 to 7.3 km; its crest is a wall about 42 deg wide (about 225 to 267 deg). Table in section B9.
3. **Light direction by time of day:** in the morning Kongde Ri's face is front-lit (white to peach) and
   Thamserku is backlit; in the evening Thamserku's face glows and Kongde is backlit. The town sits in the
   shadow of the rim for the first and last hour while the opposite arm and the peaks are lit (`ref_26`).
4. **Roof colours** (from the clearest aerials, `ref_39` and `ref_32`, plus the street photos): blue 35 %,
   turquoise or teal-green 25 %, deep green 15 %, red or crimson 12 %, maroon or pink-red 5 %, bare grey or
   white tin 8 %. M1's palette (`client/src/world/lodges.ts:8`) is close; its roof pitch is too steep.
5. **Lodges are 3 to 5 storeys (big ones 6 to 7), packed shoulder to shoulder** on stepped terraces with dry-stone
   retaining walls; many are bare dressed grey stone, not white. M1 builds 2 to 4 storeys
   (`tools/geo/bake_entrance.py:391`) as free-standing blocks in a lawn.
6. **The ground is dry and brown for most of the year** (terraces `#9b847f`, dry grass `#9d7351`, dirt
   `#c7a784`); green only in the monsoon (`NAMCHE_INSPO1`). M1's slopes are one uniform lawn (`#5b5f27`).
7. **Forest is dense and dark**: continuous blue pine and fir on both arms (`#273738` in shade, `#2c2e1d` lit),
   junipers on the ridges, rhododendron trees in the lanes. M1 has a sparse scatter of cones.
8. **The main steps inside the gate are deep slab treads** (about 1.0 to 1.5 m deep, risers about 0.18 to
   0.22 m of coursed rough stone), flanked by the prayer-wheel pavilion row over a concrete water channel and a
   curved maroon railing with a white key pattern (`ref_31`, `NAMCHE_INSPO_4`).
9. **Clear-sky colour at 3,400 m is deep**: zenith `#286bc0` to `#497ede`, horizon `#a7cdff`. M1's top-of-frame
   sky is `#a2cded`, too pale.
10. **`ref_21` is Syangboche, not Namche** (its sign reads "You have reached Syangboche 3,860 m"), and
    `ref_32` and `ref_33` are byte-identical (md5 `988d720c8ad2e687aafcce610d2b0d1e`). No image in this set carries
    the owner's hand annotations.

---

## A. Catalogue

Bearings are compass degrees. "Video still" means a frame from a travel video with an overlaid title or logo.

| File | What it shows | Taken from, looking | Time, season, weather | Tags |
|---|---|---|---|---|
| `ref_21_…png` (1797 x 927) | A small kani gate (orange door posts, orange-red corrugated roof, painted frieze with the eight auspicious symbols, one gold finial) set in a dry-stone wall; a yellow board "You have reached Syangboche 3,860 m"; behind it a house with an orange timber gable, green fascia, white walls, orange window frames; big junipers either side; bare dirt yard; woman in a navy down jacket. | Syangboche, about 420 m above Namche. Not Namche. | Late morning, dry season, clear with cumulus; snow peak hidden in cloud behind. | entrance (Syangboche), architecture-detail, vegetation, people |
| `ref_22_…png` (1116 x 886) | The stupa's prayer-wheel arcade: white stepped base, deep blue soffit band, a row of small copper wheels with embossed script in niches; a trekker turning them clockwise; tall white banner flag on a pole; prayer-flag strings; town and forest above. | Stupa plaza, at the base, looking roughly N up into town. Action-camera wide angle. | Midday, Nov 2024 (caption), clear. | landmark, architecture-detail, people |
| `ref_23_…png` (1156 x 527) | Inside a kani gate: lintel with red panels of gold script and blue panels of gold scrollwork, red pleated valance, yellow cloth panel, red posts, a dark band of white roundels; dark mural walls; through the far arch a stone wall, a maroon railing and trekkers. | Inside a gate passage, looking through it. The railing and wall beyond match the view inside Namche's gate (`chat_11`), but which gate is not proven. | Daytime, clear. | landmark, architecture-detail, people |
| `ref_24_…png` (1243 x 438) | Gate ceiling and walls: three painted mandalas in coffers framed by orange and green beams, a frieze of 14 seated Buddhas in roundels, wall murals of deities, red posts with carved gold bracket arches; through the arch a white stepped chorten base and trekkers. | Inside a gate, looking up and out. Same uncertainty as `ref_23`. | Daytime, bright. | landmark, architecture-detail |
| `ref_25_…png` (851 x 550) | A narrow stepped lane between a dressed-stone house (tall green-framed casements) and a rubble-stone house (red frames, green surrounds); cobbled treads, a drain grating, low dry-stone walls, a yellow lodge board on a post under a blue tin canopy; faded red and mint tin roofs below; a dark conifer and a yellow-leaved tree; a trekker in a teal bucket hat. | Inside town, a side lane, looking downhill (probably S to SW) at the valley haze. | Late morning, autumn (yellow leaves), clear. | street, ground, architecture-detail, vegetation, people |
| `ref_26_…png` (577 x 806, portrait) | Kongde Ri's snow face top left; a forested slope lit gold by low sun with a diagonal shadow line; the dark gorge far left; the town below in cool shadow, roofs slate-green, blue, red, maroon. | Upper east side of town, looking WSW (about 250 deg). | Early morning (sun from the ESE lights the SE-facing west arm; the town is still in the rim's shadow), clear, dry season. | vista, town |
| `ref_27_…png` (1037 x 507) | Kongde Ri with the first sun on its summit (peach) while the face below is blue; peach-lit clouds; the forested west arm on the right with a boulder and a cable; the town lower right in shade; a big cyan tin roof and a stone parapet with a lamp post in front; a man in a lime down jacket. | A rooftop terrace on the east side, looking about 265 deg. | Sunrise, dry season (bare deciduous tree, brown terraces), clear. | vista, people, architecture-detail |
| `ref_28_…png` (1265 x 458) | A big pyramid with fresh snow dusting on dark rock, summit in cloud; a forested hill in front with lodges, light-blue roofs, a two-storey green building and a long green-walled building; bare earth tracks and dry fields. | Probably from the Syangboche side looking SE at Thamserku over the army and national-park hill. Same video as `ref_21`. Medium confidence. | Overcast, dry season, fresh snow. | vista, town |
| `ref_29_…png` (1177 x 560) | A viewpoint: juniper scrub, dry grass, a white flagpole, a small white-framed shelter or panel stand, a dark sign board, a man on a rock; a row of snow peaks rising out of billowing valley cloud. | A ridge viewpoint above Namche (flagpole suggests the national-park hill or Everest View Point), looking roughly ESE to SE. Centre massif most likely Thamserku; side peaks not identified. | Morning, dry season, clear above with convective valley cloud. | vista, vegetation, people |
| `ref_30_…png` (722 x 835) | Drone view of the horseshoe bowl with Ama Dablam right and the Everest and Lhotse group centre-left on the skyline; dense roofs (red, blue, white), dry terraces at the head of the bowl, dark forest on both arms. Watermark "Gaurab Bhandari". | Drone well SW of and above town, looking about 40 deg. | Afternoon, dry season, clear. | vista, town, map-like |
| `ref_31_…png` (557 x 746, portrait) | Just inside the gate: deep slab steps, the pavilion row with red roofs, a carved mani boulder, a rhododendron in full bloom, a yellow multi-arrow signpost with a blue canopy on a solar street lamp with a CCTV camera, the curved maroon railing; a big lodge with dressed-stone floors and a blue glass top storey; taller lodges right. | Foot of the main steps inside the gate, looking up NNE. | Spring (rhododendron in bloom), morning, clear. | entrance, street, ground, landmark, vegetation |
| `ref_32_…png` = `ref_33_…png` (593 x 395) | Thamserku over the whole bowl, Ama Dablam's tip peeking over the east ridge on the left; packed roofs of teal, blue, red; dry terraces; forested east arm. Logo "Discovery World Trekking". | High on the NW side (Syangboche trail or a drone), looking about 100 deg. | Late morning, dry season, clear. | vista, town |
| `ref_34_…jpg` (2252 x 1977) | Kongde Ri's jagged wall with cloud banners against a violet and salmon dusk sky; the whole town lit below, cool-white LED points and warm windows; a string of lights on the right ridge. Title says 1 Dec 2023. | Upper NE side of town, looking about 250 deg. | Blue hour after sunset, 1 Dec 2023, partly cloudy. | vista, night, town |
| `ref_35_NAMCHE_INSPO_10.jpg` (1024 x 768) | The whole amphitheatre: Thamserku top right, Ama Dablam's tip in the gap, the stupa and open ground bottom centre-right, dry stepped terraces at the head of the bowl, forested east arm, green terraces far right. | West slope trail above town, about (-370, 175), looking about 77 deg. | Morning, dry season (Nov to Mar), clear, light haze in the gorge. | vista, town, entrance, vegetation |
| `ref_36_NAMCHE_INSPO_9.webp` (1200 x 750) | Kongde Ri's full face (rock towers, hanging snow, a dark gorge wall streaked with snow) over the town after snowfall: snow on roofs and terraces in front, lodges on the right in sun. | Upper east side, looking about 245 deg. | Winter, the morning after snowfall, clear deep-blue sky. | vista, town |
| `ref_37_…webp` (1600 x 676) | Graded panorama (teal sky, warm rock) from the head of the bowl: Kongde Ri's massive wall right, a jagged range far left in haze, the whole town filling the bowl, chimney smoke, patches of snow on terraces. | Head of the bowl, high, looking about 200 deg, very wide (pano). | Winter, late afternoon (warm side light), patchy cloud. Colour grade is artificial. | vista, town |
| `ref_38_…webp` (1200 x 675) | Kongde Ri's NE face with waterfalls and snow above the bowl; the town small at lower centre; forested and rocky slopes; hazy valley left. Caption "Namche Bazaar - 11,286 ft". | High on the NE side (Syangboche trail), looking about 245 deg. | Late morning, dry season, clear. | vista, town |
| `ref_39_…webp` (1200 x 900) | Looking steeply down on the whole horseshoe: cyan, blue and red roofs, the stupa, dry terraces, zigzag trails up the NW slope, a huge forested gorge wall behind; a string of prayer flags and a fir in the foreground. | High on the east-arm hill, looking about W to NW and down. | Autumn, overcast flat light. | vista, town, map-like, vegetation |
| `NAMCHE_INSPO1.png` (1372 x 644) | Strongly graded wide view of the bowl: green and gold terraces, roofs cyan, blue, orange-red, green; the stupa bottom right; dark rain clouds. | West slope, looking about NE. | Monsoon or just after, overcast. Grade is artificial (orange and teal). | vista, town, vegetation |
| `NAMCHE_INSPO_2.png` (1148 x 700) | Moonlit night: Kongde Ri bright white under the moon, deep blue sky with short star trails, warm sodium-coloured town lights, green roofs in front, dry slope foreground. | Upper east side, looking about 255 deg. | Night, full or near-full moon, long exposure, dry season. | vista, night, town |
| `NAMCHE_INSPO_3.png` (364 x 420) | Thamserku with the last pink-gold light on its summit over the lit town (warm windows). Credit "Steve Robson". | Upper west side, looking about 100 deg, longish lens. | Dusk just after sunset, clear. | vista, night, town |
| `NAMCHE_INSPO_4.png` (672 x 448) | The pavilion row: maroon pillars with painted capitals, a deep multicolour bracket frieze, red tin roofs with gold finials, dark drums with gold script, low maroon railings, a concrete water chute under the pavilions; a dirt and gravel path; a dressed-stone 6-storey lodge; laundry; a rhododendron in bloom. | Just inside the gate beside the main steps, looking about NNE. | Spring, morning, clear. | entrance, landmark, ground, architecture-detail |
| `NAMCHE_INSPO_5.png` (672 x 532) | The entrance hero view (brief section 5): white stupa with a smooth gold spire centre, white gate with red roof right, flagstone path right foreground, dirt ground with tents left, boulder lower left, red-roofed hut bottom, pink and blue-roofed lodges behind, forested ridge, cumulus. | Trail about 20 to 30 m below the gate, left edge of the path, looking 350 deg. | Mid-morning, dry season, cumulus over the ridge. | entrance, landmark, people |

**Annotations:** none of these 24 files has the owner's coloured marks. The only overlays are video titles,
channel logos, Google image-card chrome (`NAMCHE_INSPO_4`, `_5`) and watermarks.

---

## B. Synthesis: build instructions

### B1. Buildings

| Item | Instruction | Evidence |
|---|---|---|
| Storeys | 3 to 5 for most lodges, 6 to 7 for the large hotels near the main steps; 1 to 2 for sheds, kiosks and old houses. Floor to floor 2.6 to 2.8 m (brief: 2.4 to 2.7). | `ref_31`, `NAMCHE_INSPO_4`, `ref_26`, `ref_22` |
| Massing | Rectangular blocks 8 to 20 m long, gable ends to the slope, set in rows along the contours, 0 to 3 m apart, front walls flush on the lane. | `ref_35`, `ref_39`, `ref_32` |
| Walls | About 45 % bare dressed grey stone (coursed rectangular blocks, light joints), 35 % whitewash or white render, 15 % painted plaster (cream, pale pink, pale green, pale blue), 5 % rubble stone. Ground floor and plinth always stone. | `ref_25`, `ref_31`, `NAMCHE_INSPO_4`, `ref_21` |
| Wall colours | dressed stone lit `#c7bfac`, stone in shade `#877774`, rubble `#ad9e95`, whitewash lit `#f4eee4`, white in shade `#cec9be`, pink lodge `#e7aeb4` (M1 value fits), dry-stone wall `#d5c7ac` lit. | samples |
| Roof type | Low-pitched gables, about 12 to 20 deg, in corrugated tin; deep eaves 0.5 to 0.8 m; ridge along the long side. Some flat roofs with a parapet used as terraces. A few hipped roofs on shrines. | `ref_26`, `ref_31`, `ref_36` |
| Roof colours | blue `#2c7caf` to `#388fc6` (35 %), turquoise or teal-green `#3c8e9c` (25 %), deep green `#3a5935` (15 %), red or crimson `#d6586d` lit / `#9a4e53` shade (12 %), maroon `#574851` (5 %), bare tin `#c8ccd0` or white (8 %). Faded roofs go chalky: faded red `#706070`, mint `#becdcb`. | `ref_39`, `ref_32`, `ref_37`, `ref_25` |
| Windows | Regular grid, 3 to 6 bays a floor, every floor. Tall casements about 1.0 to 1.2 m wide x 1.5 to 1.8 m tall, 2 leaves of 3 to 4 panes, sill about 0.8 m. Frames painted: green, red, blue or maroon (M1's four colours are right), often with a contrasting outer surround (red frame in a green surround in `ref_25`). Above each window a small painted cornice of square blocks (red, white, blue). | `ref_25`, `ref_21`, `ref_31` |
| Top floors | Many lodges have a glass-walled dining room or sun lounge on the top floor (blue-tinted glass `#1678cd`, aluminium mullions). | `ref_31`, `ref_22` |
| Balconies | Timber balconies with orange-brown boards on about 1 lodge in 4; also full-width terraces on roofs with a stone parapet and lamp posts. | `ref_31`, `NAMCHE_INSPO_5`, `ref_27` |
| Gables | Timber-boarded gable triangles stained orange `#fe901d` with a white window, green fascia board along the eaves. | `ref_21` |
| Signboards | Lane-side: a stack of 4 to 8 yellow boards (`#fab226` lit, `#af803e` older) on a steel post, each about 1.0 x 0.25 m, black or orange hand-painted capitals, often with an arrow point at one end, under a small blue tin canopy (`#1581e2`). Big welcome boards: landscape 2 x 1.2 m, pale yellow `#f8ef7d`. Invent all names. | `ref_25`, `ref_31`, `ref_21` |
| Shopfronts | Not visible in this set; see the chat gear-shop photo. | none |
| Rooftop clutter | Seen: stone parapets, lamp posts, solar-panel racks on the ground (`NAMCHE_INSPO_2`), laundry lines (`NAMCHE_INSPO_4`), CCTV and solar street lamps (`ref_31`), chimney smoke (`ref_37`). Water tanks and dishes are too small to read here. | listed |
| On the slope | Each building sits on a terrace pad behind a dry-stone retaining wall 1 to 3 m high; the downhill side shows one extra stone storey. No building floats: the stone plinth runs down to the lower terrace. | `ref_35`, `ref_30`, `ref_39` |

### B2. Ground and paths

| Item | Instruction | Evidence |
|---|---|---|
| Main steps inside the gate | Deep treads 1.0 to 1.5 m, paved with cut rectangular slabs in courses (pieces 0.3 to 0.6 m), risers 0.18 to 0.22 m of coursed rough stone, straight nosings. Width 3 to 4 m judged from the 1.2 m mani boulder (OSM tags 2 m). Colour `#8a8f96` neutral, reads blue `#97b3cf` under open sky. | `ref_31` |
| Short flights | 3 to 6 risers of concrete or slab, about 1.5 m wide, between the main steps and side terraces. | `ref_31`, `NAMCHE_INSPO_4` |
| Side lanes | 1.8 to 2.5 m wide (two people abreast fill half). Cobbled fieldstone treads, stepped every 1 to 3 m on steep parts, concrete strips in places, concrete-framed drain boxes and steel gratings across the lane. | `ref_25` |
| Entrance path | Irregular pale flagstone `#c7b89f`, about 2.5 m wide, a low dry-stone wall on its left (0.5 to 0.8 m), grass verge `#585e2d`. | `NAMCHE_INSPO_5` |
| Open ground | Bare compacted dirt `#c7a784` lit, `#dca981` in strong sun; scattered boulders `#787468`. | `NAMCHE_INSPO_5`, `ref_21` |
| Dirt and gravel paths | Ochre gravel and dirt `#534c44` in shade along the pavilion row. | `NAMCHE_INSPO_4` |
| Retaining walls | Dry stone without mortar, blocks 0.2 to 0.6 m, 1 to 3 m high, often topped with a concrete coping where a channel runs. | `ref_25`, `ref_31` |
| Water channels | A sunken concrete channel with rounded concrete kerbs about 0.3 m high; under the pavilions it runs as a concrete chute with low steps; dark water just visible. | `ref_31`, `NAMCHE_INSPO_4` |
| Railings | Bridge railing: maroon about `#5c1f1c` (photo shade reads `#26282f`), 0.8 to 0.9 m, curved in plan, top band with a white key pattern, square posts. Pavilion railings: maroon timber with square balusters, 0.7 m. | `ref_31`, `NAMCHE_INSPO_4` |
| Doors to lanes | The lane runs straight up to the house wall; the door sill is a single stone or concrete step 0.15 to 0.2 m above the lane tread at the door; where the lane is stepped, the tread in front of the door is widened into a small landing. House walls stand directly on the lane, no pavement. | `ref_25` (close), `ref_31` |

### B3. The entrance (from `NAMCHE_INSPO_5`, `ref_31`, `ref_35`, `NAMCHE_INSPO_4`)

- Order up the trail: flagstone path, the white Kani gate (red roof `#ec605b` lit, walls `#f9f8f3`), then inside the
  gate the deep slab steps with the curved maroon railing and the water channel, the pavilion row on the left of the
  steps going up, and the stupa up and left on its plaza.
- In the hero frame (camera about 20 to 30 m below the gate): stupa centre at 46 % of the width, gate at 85 %,
  path in the right 25 % at the bottom, open dirt ground across the left 45 % between 55 and 72 % height, white
  tents at 30 to 45 % across, boulder in the lower-left 15 %, red-roofed hut bottom 18 to 38 % across.
- Stupa: dome pure white `#fffeff`, base `#e8e6dd`; spire a smooth gold pyramid `#e1ab56` (no visible tiers at this
  distance); prayer-wheel arcade under a deep blue band `#001d4a` (`ref_22`).
- From the west slope (`ref_35`) the stupa sits at the top edge of the open ground; the ground spreads south and
  south-west of it; the gate is below and right; lodges begin immediately north of the plaza.
- Pavilions (`NAMCHE_INSPO_4`): red tin hip-and-gable roofs with green undersides and a gold finial on a red base,
  a four-tier painted bracket frieze (red, blue, green, gold), square maroon pillars `#673520` with painted capitals,
  dark drums with gold script, low maroon railings, set on stone plinths and straddling the channel.

### B4. Religious and cultural objects

| Object | Instruction | Evidence |
|---|---|---|
| Stupa base wheels | A continuous row of small copper wheels about 0.3 m across and 0.5 m tall (hand for scale), copper `#33251b` with embossed script, in white niches under a blue soffit band; vertical axles. | `ref_22` |
| Pavilion wheels | Person-height drums about 1 m across, dark ground with gold script bands. | `NAMCHE_INSPO_4`, `ref_31` |
| Mani stone | Boulders about 1.2 m tall carved and painted: yellow letters on dark green-black stone (`#45615e`). | `ref_31` |
| Gate interior | Red script panels and blue gold-scroll panels on the lintel, red pleated valance `#5b0704`, yellow cloth, white roundels on a dark band, ceiling mandalas in orange `#dd3d07` and green beam coffers, a frieze of seated Buddhas, deity murals on dark grounds, red posts `#f52a24` in sun, `#832c21` in shade. | `ref_23`, `ref_24` |
| Prayer flags | Strings of small flags in the order blue, white, red, green, yellow, repeating (M1 already uses this), slung from the stupa spire to the plaza and across slopes in long sagging runs; one tall white banner flag about 0.6 m wide on a pole with a finial at the stupa. | `ref_22`, `ref_39`, `NAMCHE_INSPO_5` |
| Chortens | A white stepped chorten base seen through the gate arch. | `ref_24` |
| Khata | Not seen in this set. | none |

### B5. Vegetation

| Type | Look and colour | Where and how dense |
|---|---|---|
| Blue pine and fir forest | Fine-textured dark conifer canopy, `#273738` shade, `#2c2e1d` lit, golden `#a7a11a` in low sun; individual firs with layered branches near the camera. | Continuous on both arms above and beside town (`ref_26`, `ref_27`, `ref_39`, `ref_35`). |
| Juniper trees | Big bushy trees 6 to 10 m, olive `#847e46` lit. | Syangboche (`ref_21`). |
| Juniper scrub | Dense rounded bushes 0.5 to 2 m, `#454424`. | Ridges and viewpoints (`ref_29`). |
| Rhododendron trees | 4 to 6 m, crimson-pink flowers in March to April, leathery dark leaves. | Lanes and the pavilion row (`ref_31`, `NAMCHE_INSPO_4`). |
| Deciduous trees | Yellow leaves in autumn, bare in spring. | Scattered in town (`ref_25`, `ref_31`). |
| Grass and terraces | Dry grass `#9d7351`, terraces `#9b847f` to `#77584b` with stone walls, golden-green only in monsoon (`#ce8f3f` graded). | Head of the bowl and lower slopes (`ref_35`, `ref_30`, `NAMCHE_INSPO1`). |

### B6. People and animals in frame

Trekkers in ones and twos with day packs or big rucksacks: down jackets navy, black `#182638`, lime `#4d6a38`,
olive `#b4ad90`, orange; teal and grey caps. No porters, yaks, dzo or dogs appear in this set.

### B7. Vistas

Angular sizes use the hFOV estimated from two peaks of known bearing in the same frame where possible.

| File | Peaks | Est. hFOV | Mountain vs town | Composition (from top) | Sky hex (top, mid, horizon) | Cloud, haze, snow line, rock | Why it looks sharp |
|---|---|---|---|---|---|---|---|
| `ref_35` | Thamserku, Ama Dablam tip | 72 deg (Ama Dablam 68 deg at x 380, Thamserku 102 deg at x 860) | Thamserku massif about 18 deg tall over the east ridge; town spans 0 to -25 deg | sky 0 to 30 %, summit at 8 %, peaks 8 to 45 %, town 45 to 95 % | `#7ba5f0`, `#90b6fc`, `#a7cdff` | cloudless; blue aerial haze in shade (`#4b5e83` on the east arm); continuous snow above about 5,300 m; ochre ridges | strong blue shade vs lit ochre, crisp ridge silhouettes |
| `ref_32` | Thamserku, Ama Dablam tip | 69 deg | Thamserku about 20 deg tall above the forest skyline | summit at 4 %, peaks 4 to 50 %, town 45 to 100 % | `#016add`, `#008efb` near horizon | none; snow above about 5,000 m with brown rock below; fluted summit snow | saturated sky, clean snow-rock edge |
| `ref_26` | Kongde Ri (N end) | about 45 deg (portrait) | Kongde crest at 6 to 10 %, wall to 45 % | sky 0 to 25 %, mountain 6 to 45 %, lit slope 25 to 60 %, town 55 to 100 % | `#286bc0`, `#3183d5` | snow lit `#f3f2f0`, shade `#d1e4e7`; rock `#7c6d3d`; valley shadow `#21334b` | hard sun/shadow line across the forest |
| `ref_27` | Kongde Ri | about 70 deg | summit 21 deg up; camera pitched up about 10 deg | summit at 19 %, wall 19 to 70 %, town 65 to 95 % | `#92e1ff`, `#82aab2` near horizon (video, oversaturated) | peach-lit cloud cap `#fbf7ef`; alpenglow snow `#fbe2c5`; face in blue shade `#b5cbd5`, rock `#516176` | warm summit against a cool face |
| `ref_36` | Kongde Ri full face | about 50 deg | wall fills 4 to 75 % | summit at 4 %, town 55 to 100 % | `#497ede`, `#608feb` | snow to the town; gorge walls dark blue `#1c2557` with vertical snow streaks; rock towers on the crest | high contrast snow on dark rock, no haze |
| `ref_37` | Kongde Ri, distant range left | pano, about 150 deg | massif 7 to 75 % | sky 0 to 45 % | graded: `#486c6f`, `#61a6ad`, `#e5e3d9` | warm rock `#7a5d4e`, teal shade `#283c45`; patchy snow on terraces | the grade; use for mood only |
| `ref_38` | Kongde Ri | about 78 deg | massif 11 to 75 %, town 70 to 90 % | sky 0 to 45 % | `#4c72ac`, `#7ea7da`, haze `#88a3c1` | waterfalls on dark rock `#314259`; haze fills the far valley | layered depth |
| `ref_30` | Ama Dablam, Everest and Lhotse group, others | about 60 deg | peaks 27 to 40 %, a dark ridge 37 to 60 %, town 62 to 95 % | | `#3a508b`, `#3c5ca5`, `#496fb6` | snow `#837f98` in afternoon shade | deep sky, sharp peaks |
| `ref_29` | most likely Thamserku centre | about 70 deg | peaks 16 to 60 % above rising cloud | sky 0 to 55 % | `#72b4f0`, `#8bcbff` | valley cloud `#d9e1e6` rising to the mid-faces; snow lit `#cee2eb` | bright cloud vs dark juniper |
| `ref_28` | probably Thamserku | about 75 deg | mountain 3 to 65 % | overcast sky 0 to 35 % | `#d9e9f3` | dusting to about 4,000 m: snow `#aabece` on rock `#607d96` | flat light; reads soft |
| `ref_34` night | Kongde Ri | about 50 deg | crest 10 to 20 %, dark mass to 60 % | town lights 60 to 95 % | sky `#9f96b6` violet, left `#49557f`, clouds salmon `#bf9ea3` | cloud banners on the crest; twilight snow `#474f81`; rock `#1d1f37` | lights as points; about 240 lit points, a third warm, a third cool LED |
| `NAMCHE_INSPO_2` night | Kongde Ri | about 60 deg | wall 15 to 60 % | town 50 to 90 % | `#334c83`, `#556788` | moonlit snow `#ece5de`, rock `#35302f`; short star trails | moonlit snow almost daylight-bright against a navy sky |
| `NAMCHE_INSPO_3` dusk | Thamserku | about 30 deg | summit 10 %, mountain 10 to 35 % | town 40 to 100 % | `#706f91`, `#8b8ba5` | alpenglow on summit `#d1a990`, face `#533849` | warm summit, cool everything else |

Night lights: cool LED points core `#f9f6e5`, halo `#a5adac`; warm windows core `#f0d8a8`, halo `#b48d5c` to
`#b9aa8e`. `ref_34` has about 240 distinct lights in the town (two-thirds of a full night count); `NAMCHE_INSPO_2`
is mostly warm (89 % of the glow pixels). No moon is in frame; no Milky Way.

### B8. Lighting moods (target palettes)

| Mood | Reference | Palette |
|---|---|---|
| Clear mid-morning (default start) | `NAMCHE_INSPO_5`, `ref_35`, `ref_31` | sky top `#2a6cc4`, sky mid `#5d8fd8`, horizon `#a7cdff`, cumulus lit `#f4f5f9`, cumulus base `#afbbd0`, whitewash `#f4eee4`, flagstone `#c7b89f`, forest `#2c2e1d` |
| Early morning, town in shade | `ref_26` | sky `#286bc0`, lit snow `#f3f2f0`, lit forest `#a7a11a`, lit rock `#7c6d3d`, shaded forest `#2c311e`, valley shadow `#21334b`, roofs in shade `#103e53`, `#194c63` |
| Sunrise alpenglow on Kongde | `ref_27` | alpenglow snow `#fbe2c5`, peach cloud `#fbf7ef`, face shade `#b5cbd5`, rock shade `#516176`, horizon `#82aab2`, forest `#273738`, cyan tin `#01aafd` |
| Dusk alpenglow on Thamserku | `NAMCHE_INSPO_3` | summit `#d1a990`, face `#533849`, sky top `#706f91`, horizon `#8b8ba5`, windows `#b89475` |
| Blue hour with town lights | `ref_34` | sky `#9f96b6`, sky low left `#49557f`, salmon cloud `#bf9ea3`, twilight snow `#474f81`, rock `#1d1f37`, LED `#f9f6e5`, warm window `#b9aa8e` |
| Moonlit night | `NAMCHE_INSPO_2` | sky `#334c83`, sky low `#556788`, moon snow `#ece5de`, rock `#35302f`, warm light `#f0d8a8`, roof green `#3a5935`, ground `#4c2c17` |
| Overcast with fresh snow dusting | `ref_28` | sky `#d9e9f3`, snow `#aabece`, rock `#607d96`, forest `#1d2b2c`, light roofs `#b5f1fc` |
| After snowfall, clear | `ref_36` | sky `#497ede`, `#608feb`, snow lit `#e7e1ea`, snow in shade `#1f336c`, rock shade `#1c2557`, forest `#5a573d` |
| Valley cloud morning on a ridge | `ref_29` | sky `#72b4f0`, horizon `#8bcbff`, cloud `#e0ecf5`, valley cloud `#d9e1e6`, juniper `#454424`, dry grass `#9d7351` |

### B9. Real peak angles from SRTM (camera on the ground plus 1.6 m; curvature and refraction applied)

| From (real x, z) | Thamserku bearing / elev / km | Kongde Ri | Ama Dablam | Everest (only from the ridge) |
|---|---|---|---|---|
| Entrance spawn (-28, 236) | 100.9 / 23.2 / 7.6 | 260.9 / 22.6 / 6.7 | 66.8 / 11.8 / 16.3 | 45.9 / 10.4 / 29.5 |
| Stupa (-42, 157) | 101.4 / 23.0 / 7.6 | 260.2 / 22.5 / 6.7 | 67.1 / 11.8 | 46.0 / 10.3 |
| Town centre (0, 0) | 102.7 / 22.8 / 7.6 | 259.0 / 22.1 / 6.8 | 67.5 / 11.8 | 46.2 / 10.4 |
| East side (200, -100), +10 m | 103.8 / 22.8 / 7.4 | 258.5 / 21.0 / 7.0 | 67.6 / 11.7 | 46.1 / 10.3 |
| West slope (-300, 0) | 102.2 / 21.3 / 7.9 | 258.5 / 22.2 / 6.5 | 67.9 / 11.2 | 46.6 / 10.1 |
| Bowl head (0, -350) | 105.2 / 21.4 / 7.7 | 256.1 / 20.5 / 6.9 | 68.7 / 11.2 | 46.7 / 10.1 |
| Everest View Point (528, 276) | 101.4 / 23.7 / 7.0 | 261.9 / 20.0 / 7.3 | 65.9 / 11.6 | 45.1 / 10.2 |
| Syangboche (88, -860) | 109.1 / 20.2 / 7.7 | 252.3 / 18.8 / 7.1 | 70.3 / 10.8 | 47.3 / 9.9 |

Script: `out/audit-refs-town-b/v2/peaks.py`. Ama Dablam and Everest are hidden by ridges from most of town;
the numbers say where they are, not that they show.

### B10. Rock, snow and texture character

- Kongde Ri's NE face: dark blue-grey rock walls with vertical gullies, each holding a white snow streak or a
  waterfall; hanging snow terraces and seracs high up; a serrated crest of rock towers; snow continuous down to
  about 5,000 m in autumn, to the town in winter (`ref_36`, `ref_38`, `ref_34`).
- Thamserku: sharp summit, fluted snow ribs on the upper face (spindrift flutes a few metres apart), ochre to brown
  rock ribs below with snow in the couloirs (`ref_32`, `ref_35`).
- Sharpness comes from dry air: almost no haze inside 10 km, hard terminators between sun and shade, dark blue
  shadows that never go black, and saturated sky behind white snow. Haze appears only in the deep gorge and
  beyond 15 km.

---

## C. Signature shots (named test cameras)

Positions are real metres (x east, z south, origin 27.8050 N 86.7100 E); multiply by `WORLD_SCALE` (M1: 0.65)
for the game. Heights are ground plus eye unless stated.

| Name | Reference | Camera position | Look bearing, pitch | hFOV | Time, weather | Five things that must match |
|---|---|---|---|---|---|---|
| `entrance_hero` | `NAMCHE_INSPO_5` | about (-30, 212): 20 to 30 m below the gate, 4 to 8 m left (west) of the trail centre, eye 1.6 m | 350 deg, +4 deg | 62 deg | 09:30 to 10:30, clear, cumulus over the ridge | stupa at 46 % across, gate at 85 %, stupa to gate about 26 deg apart; flagstone path in the right quarter; dirt ground with white tents left; boulder lower left; deep blue sky with bright cumulus |
| `stupa_wheels` | `ref_22` | stupa plaza, 1 m from the SE base, eye 1.6 m | about 330 deg along the wheel row, +5 deg | 85 deg | midday, clear | white base and deep blue band filling the right half; copper wheels in niches at hand height; white banner flag on its pole; terraced lodges behind; flagstones |
| `pavilion_steps` | `ref_31`, `NAMCHE_INSPO_4` | foot of the main steps just inside the gate, near (-29, 180) | about 20 deg, +10 deg | 55 deg (portrait) | spring morning, clear | deep slab treads with stone risers; pavilion row left with red roofs; mani boulder; maroon key-pattern railing right; 5 to 7 storey stone lodge with a glass top floor |
| `side_lane` | `ref_25` | any steep side lane in the upper town | downhill, about 200 deg, -15 deg | 75 deg | late morning, clear | 2 m lane between stone walls with tall framed windows; cobbled steps and a drain grating; stacked yellow signboard under a blue canopy; tin roofs below; valley haze |
| `amphitheatre_west` | `ref_35` | about (-370, 175), about 3,510 m (105 m above the stupa) | 77 deg, -2 deg | 72 deg | morning, dry season, clear | Thamserku summit at 8 % from the top and 84 % across; Ama Dablam tip in the gap at 37 % across; stupa at 64 % across, 85 % down; dry stepped terraces at the head of the bowl; dark forest on the east arm |
| `kongde_sunrise_roof` | `ref_27` | rooftop on the east side, about (200, -100), +10 m | about 265 deg, +10 deg | 70 deg | sunrise, clear | only the summit lit peach, face blue below; peach cloud cap; town lower right in shade; forested west arm right; a cyan tin roof in front |
| `kongde_morning` | `ref_26` | upper east side, about (200, -200) | about 250 deg, -5 deg | 45 deg portrait | first hour after sunrise | Kongde snow white with blue shade; the west arm forest lit gold with a hard diagonal shadow; town below fully in shadow; dark gorge left |
| `kongde_snow_day` | `ref_36` | upper NE side, about (150, -250) | about 245 deg, +5 deg | 50 deg | morning after snowfall | whole Kongde face with rock towers; dark gorge wall streaked with snow; snow on roofs and terraces in front; sunlit lodges right; cloudless deep blue |
| `thamserku_nw` | `ref_32` | high on the NW side or Syangboche trail, about (-150, -450), 3,650 m | about 100 deg, -10 deg | 69 deg | late morning, clear | Thamserku top right at 4 % from the top; Ama Dablam tip over the east ridge left; the whole packed bowl below; teal, blue, red roofs; dry terraces |
| `night_blue_hour` | `ref_34` | upper NE side, about (150, -250) | about 250 deg, +5 deg | 50 deg | 20 to 30 min after sunset, December, partly cloudy | violet sky with salmon clouds; cloud banners on Kongde's crest; mountain mass near black; about 240 town lights, mixed cool and warm; lights on the right ridge |
| `night_moonlit` | `NAMCHE_INSPO_2` | upper east side, about (220, -150) | about 255 deg, 0 deg | 60 deg | full moon, clear | snow almost white; navy sky with stars; warm sodium town lights; green roofs in front; dry slope foreground |
| `thamserku_dusk` | `NAMCHE_INSPO_3` | upper west side, about (-250, -150) | about 100 deg, +8 deg | 30 deg | 10 min after sunset | pink-gold summit; violet sky; dark lower face; warm windows; stepped terraces with lodges |
| `ridge_viewpoint` | `ref_29` | Everest View Point (528, 276) or the NP HQ hill | about 120 deg, +5 deg | 70 deg | morning, valley cloud | juniper scrub foreground; flagpole; snow peaks rising out of white valley cloud; deep blue sky; a figure on a rock for scale |

---

## D. M1 against these references (most important first)

Looked at: `docs/screenshots/m1_spawn_fpp.png`, `m1_spawn_tpp.png`, `out/m1-arrival/overview.png`,
`m1_walk_end_fpp.png`, `bridge.png`.

1. **Town density and building height.** M1: 24 lodges of 2 to 4 storeys at 2.55 m (`tools/geo/bake_entrance.py:391`,
   `client/src/config/world.json:10`), free-standing in grass with big gaps. Real: 3 to 5 storeys (6 to 7 near the
   steps), packed in rows on stone-walled terraces, walls flush to lanes. Change the storey rule to 3 to 5 (6 for
   footprints over about 150 m2) and pack rows; fill gaps with terrace walls, sheds and lanes.
2. **Ground colour and terraces.** M1: one uniform bright lawn `#5b5f27` on every slope with scattered rocks. Real
   (dry season, the default start): brown and ochre dirt and dry grass (`#9b847f`, `#9d7351`), stepped terraces with
   dry-stone walls 1 to 3 m, green only on verges. Make the default ground dry and terraced.
3. **Forest volume.** M1: sparse single cones on open grass. Real: a continuous dark conifer canopy (`#273738`,
   `#2c2e1d`) on both arms, with junipers and rhododendrons. Use dense instanced canopy plus far-terrain shading.
4. **Far mountains.** M1 (`m1_walk_end_fpp.png`): smooth low-poly grey-white shapes, soft and blurry. Real: crisp
   rock walls with snow-streaked gullies, fluted snow, serrated crests, about 22 deg tall. Also name them right:
   the wall west of town is Kongde Ri.
5. **Building surfaces.** M1: white or pastel boxes on a beige plinth, square 1.15 x 1.3 m windows
   (`client/src/world/lodges.ts:80`), no cornices, no balconies, roof rise 0.22 x span + 0.4 m (about 27 deg).
   Real: much bare dressed grey stone, tall 1.0 to 1.2 x 1.5 to 1.8 m casements with painted surrounds and block
   cornices, timber balconies, glass top floors, roofs about 12 to 20 deg. M1's roof and frame colour lists are
   already right.
6. **Sky colour.** M1 top of frame `#a2cded`; real zenith `#286bc0` to `#497ede` in clear weather. Raise the
   sky's saturation and darken the zenith (M1: `render/environment.ts:20` turbidity 1.6, rayleigh 1.25).
7. **Paths.** M1: a regular grid of grey rectangles with dark grout and a mortared wall. Real entrance path: pale
   warm irregular flagstones `#c7b89f`; walls dry stone. Inside the gate the steps need deep slab treads and
   coursed risers (`ref_31`).
8. **Bridge and railings.** M1 (`bridge.png`): a brown plank deck on posts with bright red bar railings over an
   invented rill. Real crossings are inside the gate: curved maroon railings with a white key pattern on a stone
   and concrete channel.
9. **Stupa details.** M1's spire is tiered; the photo shows a smooth gold pyramid at this distance. M1's base band is
   a thin blue/white/red stripe; the real base has a full-height prayer-wheel arcade under a deep blue soffit
   (`#001d4a`), wheels about 0.3 x 0.5 m.
10. **Missing objects that these photos show near the entrance:** the pavilion row and its channel, the mani
    boulder, the stacked yellow signposts with blue canopies, solar street lamps, laundry lines, people with packs.

---

## E. Notes for the next agent

- Prior-run colour samples in `out/audit-refs-town-b/s_a.tsv`, `s_b.tsv`, `s_entrance.tsv` are partly wrong
  (several patches missed their target). Use `out/audit-refs-town-b/v2/s1.tsv` to `s4.tsv`, which have proof tiles.
- Camera positions in section C are estimates from frame geometry and bearings, good to about 30 m; fit them in
  the game with the skyline test before locking them.
- Not determined: the exact viewpoint of `ref_29`, the side peaks in `ref_29`, the gate shown in `ref_23` and
  `ref_24`, and which lane `ref_25` is.
