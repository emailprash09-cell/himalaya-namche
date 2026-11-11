# UI and HUD specification (audit task `refs-hud`)

Audited 2026-11-12 on branch `m1-arrival`. Inputs read in full: the eight files in `reference/hud/`
(each viewed whole and in zoomed crops), `src/template.html:1-203` (the prototype shell), M1's
`client/src/ui/hud.ts` and `hud.css`, `client/index.html`, brief sections 3, 4, 10 to 13, the owner's
rules in `docs/audit/history.md` section 2, and `docs/plan/ORCHESTRATOR_BRIEF.md` section 10.
Colours were sampled with Pillow (`$NAMCHE_PY`), never guessed; the scripts and raw numbers are in
`out/audit-refs-hud/` (the stopped run's `samples.txt`, `regions.txt`, `text_heights.txt`,
`fontprobe*.json`, `contrast.txt`, all re-checked) and `out/audit-refs-hud/v2/` (this run: panel
opacity regression `glass.py`, blur test `blur.py`, colour-blindness check `cvd.py`, token contrast
`contrast2.txt`, wireframe `wire_unified_1080p.png`).

All mockups are 1456 x 840 JPEG data (the `.png` and `.webp` names are wrong; every file is JPEG).
Percentages below are of that frame; "@1080" converts to a 1920 x 1080 frame.

---

## 0. The short version

- **Seven mockups share one grammar**: title and mission tracker top left, compass strip top centre
  (34 to 41 % of the width), status chips top right, vitals bottom left or middle left, slots along the
  bottom, item windows on the right third. Panels are near-black cool glass at 64 to 81 % opacity
  (measured), 6 to 10 px radius, white text with a soft shadow, one accent of gold.
- **The brief overrides the mockups on colour and fonts**: HEALTH red, OXYGEN cyan, NAUSEA sickly
  green-yellow, STAMINA white or gold, Teko + Hind, gold `#e8b53a`, prayer-flag colours. No mockup uses
  that bar mapping (health is green, yellow or white in five of them) and none uses Teko or Hind (they are
  set in a Roboto or DIN-like grotesque). NAUSEA, money, reputation and missions-for-money appear in no
  mockup at all.
- **Body panel** = the Oxygen Check body panel (silhouette + inline bars, 368 x 157 @1080) with Push's
  state cues (warning sub-chips) and the brief's four bars, arrows, altitude, hydration and day count.
- **Inventory** = the Everest Camp window (tabs, 4-column grid, detail card, Use / Equip / Drop, numbered
  quick access) plus the Base Camp stats block (total weight, max carry, effects in green and red) plus a
  3D character preview the brief asks for and neither mockup shows.
- **Measured font facts**: Teko cap height 0.63 em, Hind 0.67 em. **Neither font has tabular figures**
  (`tabular-nums` changes nothing; a "1" is 60 % the width of a "0"), so the prototype's
  `font-variant-numeric: tabular-nums` did nothing and numbers must sit in fixed-width boxes.
- **Colour-blind trap**: nausea `#b9c84a` and gold `#e8b53a` are 5 to 8 CIELAB units apart for protan and
  deutan vision. Stamina must not be gold-filled; nausea gets a hatched fill and stage ticks.
- **M1 today** has a 4 px dot, a fading controls line, an F3 stats box, a loading line and an always-on
  data credit, all in `system-ui`, with hard-coded colours and no tokens. Its credit line runs along the
  bottom-right edge where the quick slots and weight must go.
- **Fonts to bundle**: `@fontsource-variable/teko@5.3.0` and `@fontsource/hind@5.3.0` (woff2, OFL 1.1,
  `LICENSE` in each package), or the TTFs in `google/fonts` `ofl/teko/` and `ofl/hind/` with `OFL.txt`.
  Section 4.

---

## 1. The mockups, one by one

Common to all seven HUD mockups: first-person hands in frame, no crosshair, no TPP. Edge margin is
about 1.4 % of the width (21 px of 1456, so 27 px @1080). Text is white `#f1f6fe` to `#fcffff` with a
1 to 2 px dark shadow; secondary text is grey `#a1a9b4` to `#c9cbcd`. Icons are line or solid glyphs
about 18 to 24 px @1080, white or tinted with the bar colour.

### 1.1 Everest Summit Push HUD (`Everest_Summit_Push_HUD.png`) - named in brief section 13

| Region | Box (x, y, w x h px) | % of screen (left, top, w x h) | @1080 |
|---|---|---|---|
| Logo + title "EVEREST EXPEDITION / SURVIVAL SIM" | 12, 0, 278 x 45 | 0.8, 0.0, 19.1 x 5.4 | 367 x 58 |
| Mission tracker | 15, 60, 267 x 118 | 1.0, 7.1, 18.3 x 14.0 | 352 x 152 |
| Compass strip | 430, 0, 570 x 46 | 29.5, 0.0, 39.1 x 5.5 | 752 x 59 |
| Day and time chip | 1137, 10, 139 x 30 | 78.1, 1.2, 9.5 x 3.6 | 183 x 39 |
| Wind chip (2 lines) | 1297, 10, 147 x 51 | 89.1, 1.2, 10.1 x 6.1 | 194 x 66 |
| Altitude card | 1257, 74, 187 x 103 | 86.3, 8.8, 12.8 x 12.3 | 247 x 132 |
| Minimap (rect) | 1202, 191, 242 x 185 | 82.6, 22.7, 16.6 x 22.0 | 319 x 238 |
| Team panel (3 rows) | 12, 545, 198 x 122 | 0.8, 64.9, 13.6 x 14.5 | 261 x 157 |
| Vitals bar (6 cells, full width) | 12, 722, 1432 x 77 | 0.8, 86.0, 98.4 x 9.2 | 1888 x 99 |
| World nameplates | 806, 160, 79 x 30 | 55.4, 19.0, 5.4 x 3.6 | 104 x 39 |

- **Vitals bar**: one glass strip (opacity 0.64, panel `#232b33`, measured) with chamfered ends, six cells
  split by 1 px dividers `#61585d`: icon, label (cap 13 px @1080), **segmented bar of 8 rounded segments**
  (8 px tall), value right (cap 15 px @1080), optional sub-line. Fills: health `#63f3b8`, stamina
  `#35ecef` to `#54bdf4`, oxygen `#54b9f2`, body temp `#ee5f6b`, acclimatisation `#84f6c4`; empty segment
  `#45484e`. Warning sub-chips: "Frostbite Risk - High" in `#e04660` with a `#ff5d64` triangle on a dark
  red chip `#33212c`; "Hypoxia: Moderate" in `#cdc240` with a `#f8d562` lungs icon; grey note
  "(about 2 h 18 m remaining)" `#a1a9b4`. Heart rate is a bare number (cap 21 px @1080).
- **Mission tracker**: gold warning triangle `#f7ca56`, title "Mission - Summit Push" gold `#e2ce5a`
  (cap 15 px @1080), hairline under it fading right; four objectives with 12 px square checkboxes; the
  active one white `#f1f6fe` and heavier, the rest `#b5bfcb`. No box, only a dark gradient scrim.
- **Top right**: chips and cards with **cut (chamfered) corners**, fills `#0b1016` to `#161e28`. Altitude
  card: label, big "8,207 m" (cap 27 px @1080, the largest HUD text in any mockup), second row
  "Mt. Everest (8,848 m)" in `#adb3bc`.
- **Minimap**: 3D-shaded terrain in `#111e2b` to `#1e2b39` with pale contour lines `#a8bca3`, dashed gold
  route `#f4d01e` with dots, gold triangle waypoints with two-line white labels, green player arrow
  `#4cdb94` with a green walked trail, "N" arrow top right, "1 km" scale bar bottom right, 1 px frame
  `#8795aa`.
- **Compass**: ticks every 5 deg, numbers every 15 (`#c4d0e0`), letters (`#e8f4ff`), white pointer at top
  centre, gold objective marker `#fdcf48` under the strip. Ends fade out.
- **Team panel**: rows with green status dot `#66e392`, name, distance, tiny bar (`#3fa47c`, "You"
  `#3c92c8`), heartbeat glyph.

### 1.2 Everest Base Camp Oxygen Check (`Everest_Base_Camp_Oxygen_Check.png`) - named in brief section 13

| Region | Box | % | @1080 |
|---|---|---|---|
| Mission panel | 18, 19, 216 x 134 | 1.2, 2.3, 14.8 x 16.0 | 285 x 172 |
| Compass strip | 450, 8, 550 x 40 | 30.9, 1.0, 37.8 x 4.8 | 725 x 51 |
| Location card "Base Camp 5,364 m" | 1142, 19, 139 x 57 | 78.4, 2.3, 9.5 x 6.8 | 183 x 73 |
| Weather card (temp, wind, sky) | 1290, 20, 148 x 84 | 88.6, 2.4, 10.2 x 10.0 | 195 x 108 |
| Item panel "Oxygen Cylinder (6 L)" | 1043, 124, 387 x 516 | 71.6, 14.8, 26.6 x 61.4 | 510 x 663 |
| **Body panel** | 18, 679, 279 x 122 | 1.2, 80.8, 19.2 x 14.5 | 368 x 157 |
| Hotbar, 8 slots + numbers below | 458, 735, 541 x 71 | 31.5, 87.5, 37.2 x 8.5 | 713 x 91 |

- **Body panel** (the model for ours): rounded 8 px, glass opacity about 0.86 (panel `#242227`), a white
  line-art **body silhouette** on the left (about 11 % of screen height), then five rows at a 2.5 %
  pitch (27 px @1080): icon, label (cap 12 px @1080), **inline bar 6 px** between label and value, value
  right-aligned (cap 13 px @1080). O2 `#5fd9f1` cyan, Health `#ca4954` red, Stamina `#e6c442` yellow,
  Temp has no bar, Hydration an almost empty dim bar. Track `#3e373c`.
- **Item panel**: glass 0.78 over `#0d0f11` (measured), title row with icon and divider, item render left,
  stat label `#c0c4cd` and values (green `#77ce7a` for good), stat sub-cards `#1d2025`, gradient bar
  `#65e1c2` to `#6ee39e`. "Attachments" list: rows 33 px @840 (3.9 %), selected row lighter `#272e36`,
  **focus row with a 2 px gold border `#c3a451`**, green ticks `#9ce77c`, empty checkboxes. Footer key
  hints: light keycaps `#c7c8ca` with dark letters `#545456`, labels `#ededef`.
- **Hotbar**: slots 59 x 53 (4.1 x 6.3 %, 78 x 68 @1080), fill `#101213`, border `#424143`, active slot
  gold border `#dec259` with warm fill `#1f1a14`, numbers under the slots `#d2d3d7`.
- **Mission panel**: "Everest Expedition" white, subtitle gold `#c2ba5c`, ticked objective with a
  yellow-green tick `#d0e48e`.

### 1.3 Everest Base Camp Backpack Inventory (`Everest_Base_Camp_Backpack_Inventory.png`) - "Backpack A"

| Region | Box | % | @1080 |
|---|---|---|---|
| Info card (title, place, time, temp, wind, sky) | 21, 16, 183 x 152 | 1.4, 1.9, 12.6 x 18.1 | 241 x 195 |
| Compass strip (thin) | 410, 7, 590 x 26 | 28.2, 0.8, 40.5 x 3.1 | 778 x 33 |
| Section menu (7 items) | 36, 228, 169 x 244 | 2.5, 27.1, 11.6 x 29.0 | 223 x 314 |
| Vitals stack (5 rows) | 21, 628, 201 x 164 | 1.4, 74.8, 13.8 x 19.5 | 265 x 211 |
| Inventory panel | 1101, 105, 342 x 479 | 75.6, 12.5, 23.5 x 57.0 | 451 x 616 |
| Key hints (E Use, R Rotate, F Inspect, ESC Close) | 1105, 767, 333 x 27 | 75.9, 91.3, 22.9 x 3.2 | 439 x 35 |

- **Inventory panel** (glass 0.81 over `#0e1216`): header "Backpack (48 L)" + "27.4 / 30.0 kg" (`#b6bbbb`)
  and a 6 px capacity bar `#67b3e5`; **4 x 3 grid** of cells 76 x 77 px (5.2 x 9.2 %, 100 x 99 @1080), fill
  `#161415`, 1 px border `#212226`, item renders with counts "x1" bottom right; **stats list**: Total
  Weight, Max Carry (values `#d5dee6`), Mobility 72 % (green `#6a8b5a`), Stamina Drain +28 % and Climb Speed
  -18 % (red `#be3248`, `#c03c46`, with a red icon `#d06053`), divided by hairlines `#2e3136`.
- **Section menu**: Inventory (selected: 31 px row, blue-grey fill `#4c505c`, border `#569bc4`), Equipment,
  Loadout, Status, Skills, Expedition, Journal; icon + label (cap 12 px @1080).
- **Vitals stack**: each row label + value on one line, a full-width 5 px bar below. O2 `#5abed6`, Health
  **yellow** `#f6de51`, Stamina yellow-green `#c1ca5f`, Body Temp blue `#4aa2e2`, Altitude row with an
  orange icon `#ca6841`. Stamina icon is a gold bolt `#eac482`.
- **Info card**: title in muted khaki-grey `#a5a7a4`, place in white, then icon rows (clock, sun `#ebd26b`,
  wind, cloud).

### 1.4 Everest Camp Backpack Inventory (`Everest_Camp_Backpack_Inventory.png`) - "Backpack B"

| Region | Box | % | @1080 |
|---|---|---|---|
| Title and tracker | 22, 15, 240 x 155 | 1.5, 1.8, 16.5 x 18.5 | 316 x 199 |
| Compass with boxed heading "328" | 500, 15, 490 x 37 | 34.3, 1.8, 33.7 x 4.4 | 646 x 48 |
| Status pill (temp, wind, time) | 1132, 19, 306 x 34 | 77.7, 2.3, 21.0 x 4.0 | 404 x 44 |
| **Inventory window** | 879, 96, 559 x 501 | 60.4, 11.4, 38.4 x 59.6 | 737 x 644 |
| Vitals stack (4 cards + altitude chip) | 16, 628, 164 x 172 | 1.1, 74.8, 11.3 x 20.5 | 216 x 221 |
| Key hints (TAB Close, mouse Use, R Drop, mouse Split) | 1093, 768, 337 x 24 | 75.1, 91.4, 23.1 x 2.9 | 444 x 31 |

- **Window** (glass 0.80 over `#0b0d11`, about 10 px radius): **tab bar** 43 px (INVENTORY active, white
  `#f9ffff` caps, letter-spaced, **gold underline `#ceca80`**, lighter tab fill; LOADOUT, TEAM, JOURNAL in
  `#caced8`), close "X" top right; left column "Backpack (42.7 / 50.0 kg)" + 8 px bar (green `#5fac74`,
  grey start cap `#525358`, track `#14191e`); **4 x 3 grid**, cells 72 x 77 (95 x 99 @1080) fill `#14171a`,
  border `#292e32`, counts "x2", rope shows "30 m"; **selected cell: pale gold 2 px border `#dedea0`**;
  "Quick Access" heading and **5 numbered slots** 59 x 66 (78 x 85 @1080) with outlined number badges
  top left. Right column **detail card** 202 x 415 (266 x 534 @1080), fill `#0c1013`: big render, name
  (cap 15 px @1080, `#feffff`), category `#c9cbcd`, divider, "Remaining: 92%" (green `#6c977c`), bar
  `#69cb8a`, two stat lines, **buttons** 175 x 25 (231 x 32 @1080): Use = primary (olive fill `#585536`,
  border `#726e34`, text `#f4f2de`), Equip and Drop = secondary (`#323335`, text `#ced0cf`).
- **Vitals**: separate dark cards per row with an icon tile on the left; O2 blue `#5ab0de` (lungs icon
  `#40a5da`), Stamina green `#69e099`, Health **white-grey** `#b0b1b3`, Temp red `#ee4c51` then grey;
  altitude chip "6,400 m" (cap 17 px @1080).
- **Tracker**: gold diamond `#ecc402`, title gold `#baaf2e`, an in-progress checkbox with a gold border.
- **Status pill**: full capsule, three segments split by hairlines, fill about `#2e353e`.

### 1.5 Himalayan Summit Expedition HUD (`Himalayan_Summit_Expedition_HUD.png`) - named in brief section 13

| Region | Box | % | @1080 |
|---|---|---|---|
| Title card (logo, "Reach Camp IV") | 21, 22, 244 x 58 | 1.4, 2.6, 16.8 x 6.9 | 322 x 75 |
| Objectives card (3 checkboxes) | 21, 82, 244 x 89 | 1.4, 9.8, 16.8 x 10.6 | 322 x 114 |
| Compass with gold heading "327" | 440, 12, 600 x 34 | 30.2, 1.4, 41.2 x 4.0 | 791 x 44 |
| Weather chips (temp, wind) | 1216, 23, 219 x 34 | 83.5, 2.7, 15.0 x 4.0 | 289 x 44 |
| Time and day chip "14:28 Day 18" | 1263, 60, 172 x 35 | 86.7, 7.1, 11.8 x 4.2 | 227 x 45 |
| Vitals stack, 4 cards | 21, 442, 220 x 194 | 1.4, 52.6, 15.1 x 23.1 | 290 x 249 |
| Quick slots 1-4 | 22, 710, 257 x 71 | 1.5, 84.5, 17.7 x 8.5 | 339 x 91 |
| Carried weight "19.8 / 25.0 kg" | 1285, 745, 147 x 48 | 88.3, 88.7, 10.1 x 5.7 | 194 x 62 |
| Diegetic altimeter watch | 548, 455, 242 x 235 | 37.6, 54.2, 16.6 x 28.0 | 319 x 302 |
| Diegetic GPS handheld | 880, 350, 382 x 460 | 60.4, 41.7, 26.2 x 54.8 | 504 x 591 |

- **Vitals cards**: 220 x 47 each (290 x 60 @1080), glass about 0.72 over `#131a1d`, solid light icon on
  the left, label and value on one line (cap 15 px @1080), 6 px rounded bar below. Oxygen **green**
  `#66d35c`, Stamina amber `#f8c246`, Health green `#5ec658`, Core Temp green; track `#333940`.
- **Quick slots**: exactly the brief's **four**, 58 x 56 (76 x 72 @1080), light number badge `#bfc0be`
  with a dark digit above the top-left corner, active slot 2 with a pale gold border.
- **Carried weight**: backpack icon `#bfbfbd`, "19.8 / 25.0 kg" (cap 17 px @1080), green bar `#75d266`.
- **Compass**: heading readout in gold in the middle of the strip, pointer `#f4ce46`.
- **GPS handheld** shows a 3D route map with waypoints, zoom +/-, and a footer "Dist. to Camp IV 0.8 km |
  Ascent 108 m | ETA 22 min": a good model for the full-screen town map's route footer.

### 1.6 Everest Camp III Stormbound Survival (`Everest_Camp_III__Stormbound_Survival.png`)

| Region | Box | % | @1080 |
|---|---|---|---|
| Title card | 22, 19, 176 x 47 | 1.5, 2.3, 12.1 x 5.6 | 232 x 60 |
| Tracker with counters "0/1" | 22, 86, 216 x 97 | 1.5, 10.2, 14.8 x 11.5 | 285 x 125 |
| Compass with white heading "345" | 440, 2, 570 x 46 | 30.2, 0.2, 39.1 x 5.5 | 752 x 59 |
| Status chips (temp, wind, altitude) | 1331, 19, 114 x 101 | 91.4, 2.3, 7.8 x 12.0 | 150 x 130 |
| **Interaction prompt** (E Cook Meal, R Boil Water, F Pack Stove) | 846, 447, 144 x 113 | 58.1, 53.2, 9.9 x 13.5 | 190 x 145 |
| Vitals cluster (ring + 4 rows) | 20, 685, 272 x 110 | 1.4, 81.5, 18.7 x 13.1 | 359 x 141 |
| Hotbar, 6 slots | 548, 733, 362 x 58 | 37.6, 87.3, 24.9 x 6.9 | 477 x 75 |
| Route profile (camp ladder) | 1190, 640, 250 x 160 | 81.7, 76.2, 17.2 x 19.0 | 330 x 206 |

- **Prompt**: dark card `#0f1113` (glass about 0.79), 1 px border `#4e4f4c`, three rows of light keycap
  `#cacbce` (cap 23 px @1080) + label `#f5f6f7` (cap 13 px @1080), placed beside the object it acts on.
- **Vitals ring**: a circular gauge (teal arc `#4eb8da`, track `#1c2024`) round a small silhouette with
  a teal highlight; rows: Stamina `#6aa472`, Oxygen `#37b2de`, Health `#e9464a`, Temp `#4b7856`.
- Warm interior: panels pick up a brown cast (`#24140a`): the glass is tinted by what is behind it.

### 1.7 Everest Expedition Above the Clouds (`Everest_Expedition__Above_the_Clouds-1.png`)

| Region | Box | % | @1080 |
|---|---|---|---|
| Tracker (title, mission, 2 objectives) | 23, 25, 227 x 113 | 1.6, 3.0, 15.6 x 13.5 | 299 x 145 |
| Compass (no box) | 450, 0, 500 x 40 | 30.9, 0.0, 34.3 x 4.8 | 659 x 51 |
| Status text (temp, wind, altitude) | 1228, 28, 204 x 62 | 84.3, 3.3, 14.0 x 7.4 | 269 x 80 |
| Vitals stack, 4 rows | 23, 372, 177 x 176 | 1.6, 44.3, 12.2 x 21.0 | 233 x 226 |
| **Circular minimap** | 24, 607, 174 x 174 | 1.6, 72.3, 12.0 x 20.7 | 229 x 224 |
| Hotbar, 5 slots, numbers below | 1119, 724, 319 x 74 | 76.9, 86.2, 21.9 x 8.8 | 421 x 95 |

- Circular minimap: 1 px ring `#a2aab0`, "N" above, terrain photo dimmed, white route, **gold player
  arrow `#ead424`**, gold objective diamond `#d4b622` with a label "Camp III / 7,200 m".
- Oxygen bar is the purest cyan of any mockup (`#04bafc`); hydration bar `#49b2cf`.
- Hotbar: active slot white border `#dcdcdc`, white number badges `#f4f4f4` below each slot.

### 1.8 The photo (`everest-nepal-closed_h.webp`)

No HUD. A back-lit stock photo of a high Himalayan massif with a snow plume, glacier and icefall below
(by eye it is the Everest and Nuptse group from the Kala Patthar side; not verified). It is not a view
from Namche. Use it only as **mood and palette** for the main menu, loading screen and title card: warm
haze `#c5bfb3`, lit cloud `#e5c19b`, cool sky `#7c8b9e`, shadowed snow `#8b8c8a`, dark rock `#424143`.
Never as a texture or menu backdrop (project rule: reference photos are local-only).

### 1.9 What the seven agree on

| Element | Consensus | Spread |
|---|---|---|
| Edge margin | 1.4 % of width (27 px @1080) | 0.8 to 1.6 % |
| Compass | top centre, 34 to 41 % wide, 3 to 5.5 % tall, ticks 5 deg, numbers 15 deg, letters 45 deg | heading readout boxed (B), gold (Him) or white (Storm) |
| Panel glass | near-black, faintly cool, opacity 0.64 to 0.81 (edge regression, `v2/glass.py`) | panel colour `#0b0d11` to `#232b33` |
| Radius | 6 to 10 px @1080 | Push alone uses cut corners |
| Bar | 5 to 8 px, rounded ends, dark track | Push alone segments it |
| Accent | gold or pale gold for mission title, selection, pointer | `#baaf2e` to `#f7d20a` |
| Labels | Title Case, cap 12 to 15 px @1080 | only Push uses caps for its title |
| Big numbers | cap 17 to 27 px @1080 | |
| Blur | not provable: attenuation inside panels (high-frequency ratio 0.31 to 0.33) is what opacity alone gives | |

The mockups are AI renders with glitches that must not be copied: the Base Camp compass reads
"W W 285 300 NW 328 345" (two Ws, uneven spacing, no 315/330 in places), text uses hyphen-minus for
negative temperatures, en dashes as separators and "m" for both metres and minutes.

---

## 2. Unified specification (brief section 13)

### 2.1 Principles

1. Brief first, mockups second, prototype palette as the colour base (brief section 13).
2. Diegetic hints, not diegetic devices: no wrist watch or GPS in this build (both camera modes must
   read the same HUD). The watch and GPS become the full-screen map's styling ideas.
3. Same HUD in FPP and TPP. The TPP avatar occupies roughly x 34 to 47 %, y 54 to 100 % of the frame in
   M1 (`docs/screenshots/m1_spawn_tpp.png`), so nothing persistent goes bottom-centre.
4. Everything scales with the viewport height: `--u = clamp(0.75, 100vh / 1080, 1.5) * hudScale` (user
   setting 75 to 150 %); every size below is CSS px at 1080 tall, multiplied by `--u`.
5. DOM overlay in plain TS and CSS (orchestrator 10). Text and bars update at 10 Hz from a sim snapshot;
   compass and minimap draw to canvases every frame. Bar fills use `transform: scaleX()`, text nodes are
   written only when the formatted string changes.

### 2.2 Layout at 1920 x 1080 (wireframe: `out/audit-refs-hud/v2/wire_unified_1080p.png`)

| Id | Component | Anchor, offset | Size @1080 | Source |
|---|---|---|---|---|
| A1 | Location + day card ("Namche Bazaar", Devanagari, area name) | top-left 24, 24 | 340 x 64 | prototype `#loc`, Him title card |
| A2 | Mission tracker | top-left 24, 96 | 340 x up to 150 | Push, Oxy, Him |
| B | Compass strip with heading readout | top-centre, 16 | 720 x 44 (37.5 %) | all; prototype canvas |
| I | Toast, tips, "new objective" | top-centre, 84 | up to 600 x 48 | prototype `#toast` |
| C1 | Status pill: time, day name, weather + temperature | top-right 24, 24 | 400 x 40 | Backpack B pill, Him chips |
| C2 | Money and reputation | top-right 24, 72 | 260 x 36 | new |
| D | Minimap, north-up | top-right 24, 120 | 320 x 240 (16.7 x 22.2 %) | Push minimap, prototype map |
| J | Group panel (mission 10) or carried-person card | left 24, bottom 320 | 300 x 120 | Push team panel |
| E | **Body panel** | bottom-left 24, 24 | 368 x 162 | Oxy body panel |
| F | Carried weight | bottom-right 24, 128 | 200 x 52 | Him weight |
| G | Quick-use slots 1-4 | bottom-right 24, 24 | 312 x 96 | Him slots, Oxy hotbar |
| H | Interaction prompt | FPP: centre, 60 below the dot; TPP: at the target | up to 240 x 3 rows | Storm prompt |
| K | Dialogue box, subtitles above it | bottom-centre, 24 | 1040 x up to 220 | new |
| . | Centre dot (FPP only) | centre | 4 px, `--ink` at 80 % | prototype, M1 |
| . | Data credit | minimap caption, map screen, pause, credits | 11 px | rule |

Gaps between stacked HUD pieces: 8. Nothing persistent in the band x 30 to 70 %, y 50 to 100 %
except the dot and transient prompts and dialogue.

### 2.3 Design tokens

**Colour** (CSS custom properties on `:root`, one set: the HUD floats over a 3D scene, so it does not
switch with `prefers-color-scheme`; menus may honour `data-theme` but default to these).

| Token | Value | Use and evidence |
|---|---|---|
| `--glass` | `rgba(16,25,44,.80)` | HUD panels. Prototype navy hue, mockup opacity (0.64 to 0.81). Ink on it over a white wall 8.5:1 |
| `--glass-strong` | `rgba(10,14,22,.86)` | windows, menus, dialogue, status chips with coloured text. Ink 12.1:1 over white |
| `--glass-flat` | `rgba(16,25,44,.90)` | any panel when blur is off (Low preset, reduce transparency) |
| `--glass-row` / `--glass-hover` / `--glass-sel` | `rgba(246,244,239,.04 / .08 / .12)` | list rows, cells (mockup rows `#15191d`, selected `#272e36`) |
| `--line` / `--line-strong` | `rgba(246,244,239,.14 / .28)` | hairlines, cell borders (`#212226` to `#8795aa` in mockups) |
| `--ink` | `#f6f4ef` | primary text (mockup whites `#f1f6fe` to `#fcffff`, prototype ink) |
| `--ink-soft` | `rgba(246,244,239,.78)` | secondary text, 5.7:1 worst case |
| `--ink-faint` | `rgba(246,244,239,.55)` | decorative only (3.5:1 over white wall: fails for text) |
| `--gold` | `#e8b53a` | brief. Mission title, selection border, compass pointer and north, primary button |
| `--gold-hi` | `#f3d27a` | 1 to 2 px gold lines on dark (mockup selection `#dedea0`, `#ceca80`) |
| `--gold-soft` | `rgba(232,181,58,.18)` | selected fill, primary button over glass (mockup `#585536`) |
| `--on-gold` | `#1a2238` | text on gold, 8.3:1 (prototype button) |
| `--health` / `--health-text` | `#e5484d` / `#ff6b6b` | brief red. Bar on track 4.0:1; text uses the lighter red |
| `--oxygen` | `#4fd0ee` | brief cyan (mockups `#5fd9f1`, `#04bafc`) |
| `--nausea` | `#b9c84a` | brief sickly green-yellow, with hatch (2.5) |
| `--stamina` | `#f4f1ea` | brief white; gold only on its icon and its recovering edge |
| `--track` | `rgba(8,12,22,.60)` | bar track |
| `--ok` / `--warn` / `--danger` | `#5fcf8a` / `#f2c94c` / `#ff5d64` | status text and arrows (mockup green `#77ce7a`, hypoxia `#cdc240`, frostbite icon `#ff5d64` exactly) |
| `--flag-blue/white/red/green/yellow` | `#2a5caa #f4f1ea #c23a30 #2f8a57 #e8b53a` | decoration only: 7 px flag strip on cards, map pins. Flag red, blue, green fail as text (2.4 to 3.6:1) |
| `--invented` | `#f08cb4` | hollow diamonds for invented items on maps (owner rule 3) |
| map palette | prototype `docs/audit/prototype.md` section 5 | ground, paved, water, building classes |

Coloured status text (red, green, amber) sits on `--glass-strong` chips, never on `--glass` over the
sky or a white wall: on `--glass` over white, `--danger` is 3.1:1 and `--health-text` 3.4:1.

**Type** (Teko for numbers, names and headings; Hind for labels and prose; sizes @1080 before `--u`).
Measured: Teko cap 0.63 em, x-height 0.49, ascent 0.96, descent 0.48; Hind cap 0.67, x-height 0.51,
ascent 1.06, descent 0.55 (`fontprobe.json`). Mockup cap heights are matched where it matters.

| Token | Font | Size / line | Cap | Use |
|---|---|---|---|---|
| `t-display` | Teko 600 | 64 / 0.86, +0.005em | 40 | menu title |
| `t-title` | Teko 500 | 40 / 0.95 | 25 | screen titles, mission complete |
| `t-num-xl` | Teko 500 | 44 / 1 | 28 | shop total, SpO2 on the body screen (mockup altitude cap 27) |
| `t-heading` | Teko 500 | 30 / 1 | 19 | location name, window headings (mockup titles cap 17 to 18) |
| `t-num` | Teko 500 | 24 / 1 | 15 | bar values, chips, compass heading, money (mockup values cap 13 to 15) |
| `t-tab` | Teko 500 caps, +0.06em | 22 / 1 | 14 | tabs, compass letters (mockup tabs cap 14) |
| `t-label` | Hind 600 caps, +0.07em | 13 / 1.2 | 9 | the four body labels HEALTH, OXYGEN, NAUSEA, STAMINA |
| `t-item` | Hind 500 | 17 / 1.25 | 11 | list rows, objectives, mission title (mockup cap 12 to 13) |
| `t-body` | Hind 400 | 16 / 1.45 | 11 | descriptions, settings help (prototype body 15 / 1.45) |
| `t-dialogue` | Hind 400 | 20 / 1.4 | 13 | dialogue and subtitles |
| `t-small` | Hind 400 | 14 / 1.3 | 9 | units, sub-lines, captions |
| `t-micro` | Hind 600 | 12 / 1 | 8 | keycap letters, slot numbers, counts, credit (11) |

Numbers: neither font has tabular figures (`fontprobe2.json`: ten "1"s 235 vs ten "0"s 390 at 100 px in
Teko 400; tabular-nums identical). Put every changing number in a right-aligned box of fixed `min-width`
(Teko `0` is 0.39 em wide, so 3 digits plus % is about 1.6 em), or set each digit in an inline-block
`0.42em` wide. Use U+2212 for minus and a no-break space between number and unit ("3,440 m",
"−4 °C", "18.4 kg", "Rs 2,450"); glyph coverage of U+2212 and U+202F in the shipped subsets is not yet
verified (section 4.3).

**Space, shape, depth**

| Token | Value |
|---|---|
| spacing | 4, 8, 12, 16, 24, 32 (`--s1` to `--s6`); screen margin 24; panel padding 12 x 16 |
| radius | 2 checkbox, 4 keycap and badge, 8 card, slot and cell, 12 window, 999 pill |
| border | 1 px `--line`; selection 2 px `--gold-hi`; focus ring 2 px `--gold` offset 2 |
| panel shadow | `0 4px 18px rgba(0,0,0,.35)` |
| text shadow | `0 1px 2px rgba(0,0,0,.6)` on all HUD text; world labels keep the prototype's `0 1px 3px rgba(10,16,30,.85), 0 0 12px rgba(10,16,30,.5)` |
| glass | `backdrop-filter: blur(8px) saturate(1.1)` on Medium and up, only on A, B, C, D, E and windows; `--glass-flat` and no blur on Low or with reduce transparency. The canvas changes every frame, so each blurred panel is re-blurred every frame: keep blurred area under about 15 % of the screen |
| motion | 150 ms ease-out for state, 250 ms for panels; all off under reduce motion |

Icons: one open-licence line set at 1.75 px stroke on a 24 px grid (Lucide ISC, Tabler MIT or Phosphor
MIT; pick one and log it in `CREDITS.md`), inlined as an SVG sprite. Custom glyphs needed: doko basket,
khata, prayer wheel, stupa, lungs, nausea (swirl), yak, rupee note.

### 2.4 Components

**E. Body panel** (368 x 162; Oxygen Check layout with the brief's content)

```
+------------------------------------------------------------+
| [fig] ▲ 3,440 m   (drop) water   (sun) Acclim. day 2        |  header 24
|       (lungs) OXYGEN   [====cyan=========   ]  ▼  89%         |  rows 28 each
|       (bolt)  STAMINA  [====white======      ]  ▲  72      |
|       (swirl) NAUSEA   [//hatched//|   |   |    ]  ▲  34      |  ticks at 30, 60, 85
|       (heart) HEALTH   [====red=================]    100      |
+------------------------------------------------------------+
```

- Silhouette 48 x 120 on the left (Oxy, Storm): line art in `--ink-soft`; head glows `--nausea` from 30,
  chest `--oxygen` below 85 %, whole figure `--health` on a hit, legs fade when stamina is empty. Hidden in
  minimal HUD.
- Row: icon 20 (tinted with the bar colour), label `t-label` in a fixed 76 px column, bar 6 px with 3 px
  radius on `--track`, arrow slot 14, value `t-num` in a 48 px right-aligned box. OXYGEN shows "89%" with
  "SpO2" as a `t-small` tag on the body screen; the others show 0 to 100 without a unit.
- NAUSEA fills left to right as it worsens, with 45 deg hatch (`repeating-linear-gradient`, 2 px of
  `rgba(0,0,0,.25)` every 6 px) and 1 px ticks at 30, 60 and 85 on the track: shape cue for colour-blind
  players and the stage boundaries of brief section 4.
- Header: altitude `t-num` (real altitude via `toReal()`, so about 3,440 m in town), hydration drop icon
  (white ok, `--warn` low, `--danger` very low, with a slow pulse), acclimatisation "Acclim. day 2" in
  `t-small` (brief: "day count in the HUD").
- Row order: the brief lists HEALTH, OXYGEN, NAUSEA, STAMINA, which puts the two fast-moving bars
  apart; recommended order is **OXYGEN, STAMINA, NAUSEA, HEALTH** (fast to slow, top to bottom), with the
  brief's colours (open question 3).

**States of a body row**

| State | Trigger (brief section 4) | Look |
|---|---|---|
| normal | | bar colour, value `--ink` |
| warn | SpO2 < 85; nausea 30 to 59; stamina < 20; health < 35 | value `--warn`; row gets a 1 px `--warn` 40 % outline; slow pulse 0.8 Hz (opacity 1 to 0.75 of a 4 px outer glow) |
| danger | SpO2 < 80; nausea 60 to 84; stamina 0 ("Catch your breath"); health < 15 | value `--danger` on a `--glass-strong` chip; pulse 1.6 Hz with the bar brightening to 1.3x; icon shakes 2 px once on entry |
| critical | SpO2 < 75 (5 s collapse timer); nausea 85+ | a 5 s ring drains round the icon; a sub-chip under the panel like Push's "Frostbite Risk": "Low oxygen: slow down" / "Feeling sick: rest" |
| hit | health drops | lost part stays as a lighter "ghost" segment for 0.4 s, then drains |
| reduce motion | setting | no pulse or shake; danger shows a static 2 px outline and a "!" badge |

**Rising and falling arrows**: rate = exponential moving average of d(value)/dt over 1 s. Show nothing
under the threshold, one chevron above it, two above 4x it, with 0.5 s hysteresis so they do not flicker.
Thresholds in `config/ui.ts`: SpO2 0.15 and 0.6 %/s, stamina 2 and 8 /s, nausea 0.05 and 0.3 /s, health
0.1 and 1 /s. Colour by meaning, not direction: rising nausea and falling SpO2, stamina or health use
`--warn` (one chevron) or `--danger` (two); recovery uses `--ok`. Chevrons are 8 px SVG triangles, up or
down, never colour alone.

**B. Compass**: canvas 720 x 44 inside a `--glass` strip whose ends fade (`mask-image` linear gradient,
15 % each side); visible span ±100 deg (prototype); ticks every 5 deg (1 x 6 px, `--ink-faint`),
numbers every 15 (`t-small`, `--ink-soft`), letters every 45 (`t-tab`, N in `--gold`); heading readout
in a 56 x 28 box in the middle (Backpack B), `t-num` in `--gold` (Him); gold pointer triangle at top
centre; markers on the lower edge: tracked objective (gold diamond + distance in metres under the
strip, `t-small`), visible peaks (gold triangle, prototype line-of-sight rule), lodge where you slept
(bed icon). Markers outside the span stick to the ends as half-diamonds.

**D. Minimap**: 320 x 240, radius 10, frame 1 px `--line-strong`, north-up by default with a
"rotate with view" setting; gold player arrow with `#1a2238` outline and a 25 % gold view cone
(prototype); base drawn once from baked layout data with the prototype's map colours; objective gold
diamond (clamped to the edge with an arrow when off-map), dashed gold route for guided missions (Push),
NPC job-givers as small gold dots, yak trains as brown dots when near, invented items as hollow pink
diamonds when the legend is on. Caption row 18 px: "© OpenStreetMap contributors" `t-micro`
`--ink-soft`, scale bar right ("50 m", in game metres; decision 6.4), N arrow.

**A2. Mission tracker**: header row: gold diamond icon (Backpack B, Clouds) + mission name `t-item`
600 in `--gold`, optional timer right (`t-num`, clock icon; `--ok` while the bonus holds, `--warn` in the
last 25 %, `--ink-faint` struck after it is lost). Up to 3 objective rows: 14 px checkbox (2 px
`--ink-soft` border, radius 2), active objective `--ink` 600, pending `--ink-soft`, done: `--ok` tick and
`--ink-faint` text for 3 s then removed; counters "2/3" right-aligned (Storm). New objective slides in
from the left (reduce motion: fades). Panel is `--glass` (Him, Oxy), not a bare scrim (Push), because
M1's top left is white lodge walls.

**C1, C2. Status**: pill (Backpack B) with three segments split by 1 px `--line`: sun or moon icon +
"07:40" (`t-num`), day "Fri" + "Day 1" (`t-small`), weather icon + "9 °C". Second row, right-aligned:
money "Rs 2,450" (`t-num`, banknote icon; +Rs 300 floats up in `--ok`, spending floats in `--ink-soft`)
and reputation (khata icon + rank name `t-small` + 5 pips in `--gold`). Time ticks every game minute
(2.5 real s at 1 game day per real hour).

**F. Carried weight** (Him): doko or pack icon, "18.4 / 30 kg" `t-num`, 4 px bar; `--ok` under 20 kg,
`--warn` 20 to 30 kg, `--danger` above 30 kg plus a chip "Too heavy to run or jump" (brief 10). Shows
the bulky item's name when carrying in hands ("Jerrycan, 20 kg").

**G. Quick-use slots 1-4**: 72 x 72 cells, gap 8, radius 8, `--glass`; item thumbnail 48 px; number badge
16 x 16 above the top-left corner (Him: light badge, dark digit: `--ink` fill, `--on-gold` text); count
`t-micro` bottom right; empty slot dashed `--line`; use flashes the cell `--gold-soft` and runs a radial
cooldown wipe; a slot whose item is used up greys out. Gamepad: D-pad left, up, right, down = 1 to 4.

**H. Interaction prompt** (Storm): `--glass-strong` card, radius 8, 1 px `--line-strong`; rows of keycap
(22 x 22, radius 4, fill `#cacbce`, letter `t-micro` `#1a2238`, gamepad glyph when a pad is active) +
action `t-item`. Hold actions draw a gold ring round the keycap. FPP: centred 60 px below the dot. TPP:
attached to the target's projected top with an 8 px offset, clamped inside the safe area, and faded by
distance; no crosshair (brief 13).

**K. Dialogue**: `--glass-strong`, radius 12, 1040 wide, bottom 24. Name plate on the top edge
(`t-heading` name + `t-small` role, "Pemba, guide"); text `t-dialogue`, at most 3 lines, optional
type-on (off with reduce motion); choices as rows like the Oxy attachments list: keycap 1 to 4 +
text, focused row 2 px `--gold-hi` border; "Continue" hint bottom right. Nepali and Sherpa words in
italics with a gloss on hover or focus ("Bistarai, slowly"). Ambient barks are small `t-small` bubbles
over NPC heads within 15 m, never boxed (Push nameplates show the scale: 104 x 39 @1080).

**Toasts and tips (I)**: `--glass`, `t-body`, gold for the key word (prototype `#toast b`), 4 s, one at a
time, queued. The first-sprint tip and the one-line note "Real altitude sickness is serious. Descending
is the real cure." use this.

### 2.5 Screens

All screens share one window: `--glass-strong`, radius 12, a 7 px prayer-flag strip on top for
menu-level cards (prototype `#card .flags`), tabs `t-tab` with a 2 px gold underline (Backpack B), close
"X" and key hints bottom right (keycaps + `t-small`). The game behind dims to 55 % and blurs only on
Medium and up.

| Screen | Layout | Notes |
|---|---|---|
| **Pack hub** (Tab) | tabs INVENTORY, LOADOUT, BODY, JOURNAL, MAP | Backpack A's side menu, reduced to what this game has |
| **Inventory** | left 3D character preview 420 x 700 (drag or R to rotate); centre Backpack B column: "Pack (35 L)" + "18.4 / 30.0 kg" + 8 px bar, **4-column grid** of 96 x 96 cells (gap 8, scrolls), category chips (Clothing, Climbing, Camp, Food and drink, Medical), "Quick use" row 1-4; right detail card 300 wide: render, name `t-heading`, category, 2-line description, stats (weight, insulation, value), Backpack A effects list (Sprint, Stamina use, Oxygen use as +x % in `--danger` or −x % in `--ok`), buttons Use (primary), Equip, Drop, Assign to slot | brief 12: total weight, details, consumables with slots 1-4, loadout on the 3D character |
| **Loadout** | the same preview large; body slots round it (head, eyes, hands, torso, legs, feet, back, on-pack); "Expedition kit" list of bought gear for the climbing build | brief 12 |
| **Body** (character and health) | four big readouts (`t-num-xl`), rate graphs of the last 5 game minutes, hydration and food meters, acclimatisation level and nights slept, tips | brief 13 |
| **Journal** (quest log) | list left, detail right: steps, reward, timer, giver, map button | brief 11 |
| **Town map** (M) | full window map; GPS-style footer "To the bakery 180 m, climb 22 m, about 2 min" (Him GPS); legend; OSM and DEM credit line | owner rule 5 |
| **Shop with try-on** | left: mirror preview (rotating character, same renderer path); centre: catalogue grid with price tags `Rs` (`t-num` on a `--glass-strong` chip), Buy / Rent toggle, "Owned" badge; right: detail card with stat deltas against what is worn, deposit for rentals, buttons Try on, Buy, Rent; footer wallet and pack weight after purchase | invented brand names only |
| **Main menu** | over the hero camera: prototype card bottom-left (flag strip, `t-display` "Namche Bazaar", Devanagari "नाम्चे बजार", buttons Continue, New game, Settings, Credits; primary gold `#e8b53a` with `#1a2238`) | brief 13 |
| **Appearance** | preview centre, option rows left (body, skin tone, face, hair, jacket colour as swatches) | brief 3 |
| **Pause** | the same card + Resume, Settings, Save, Load, Quit to menu; credits line | |
| **Settings** | tabs Camera, Display, Graphics, Audio, Controls, Accessibility; rows like the Oxy attachments list (label left, control right, focused row gold border); sliders 4 px track, 16 px gold knob | full list in brief 13, plus HUD opacity 40 to 100 %, HUD scale 75 to 150 %, minimal HUD, reduce transparency, colour-blind bar patterns |
| **Mission complete** | centred card: title `t-title`, reward "+Rs 600" in `--ok`, reputation pips, bonus line, Continue | |
| **Woke up in the lodge** | screen fades to warm dark `#1a120c`; card: where you woke, care fee, hours lost, where carried items fell, the NPC line, the altitude note | brief 4 |
| **Loading** | photo-free: flag strip, title, progress bar in `--gold`, step lines in the prototype's voice ("Shaping the terraces…") | |

**Photo mode** (brief 13): all HUD hidden; a slim `--glass` side panel on the right (320 wide, H hides
it): camera FPP / TPP / Free with radius readout, time-of-day slider with `t-num` clock, poses (wave, look
at the view, take a photo), focus and aperture (depth of field only here), exposure, roll, thirds grid
toggle; shutter key and a 200 ms white flash (off with reduce motion). For the photo job (mission 11) a
checklist chip shows targets and a gold frame corner marks a valid subject.

### 2.6 Minimal HUD, opacity, accessibility

- Minimal HUD: compass, minimap, status and tracker hide; the body panel shows only rows that are not
  normal or are changing, then fades after 4 s; prompts, toasts and dialogue stay.
- HUD opacity scales panel and text alpha together (never text alone). HUD scale changes `--u`.
- Every bar has a label and an icon; nausea has a hatch; arrows are shapes; danger is never colour only.
- Keyboard and gamepad focus order on every screen; focus ring 2 px gold. Text never below 11 px
  @1080 (only the credit line is that small).

---

## 3. Adapting summit-push mockups to a town game, and conflicts with the brief

### 3.1 Drop or repurpose

| In the mockups | In Namche |
|---|---|
| Body temp, core temp, frostbite, heart rate | dropped as bars; cold at night becomes a health drain with a "Cold: put on a jacket" sub-chip |
| Oxygen cylinder remaining, pressure, flow, mask | display-only shop item (brief 12); the item panel layout is reused for item details |
| Wind 62 km/h with gusts, altitude card "vs Mt. Everest" | weather icon and temperature in the status pill; altitude moves into the body panel header |
| Team panel | mission 10 group panel (names, distance, a small breath icon when someone lags) |
| GPS and altimeter devices | styling for the town map and its route footer |
| Route profile Camp II to IV | elevation profile on the acclimatisation hike and mission 10 (Namche, ridge viewpoint) |
| "Expedition", "Survival Sim", "Everest Expedition" titles | "Namche Bazaar" location card; product name CAMP 4 on menus |
| 8, 6 and 5 slot hotbars | 4 slots (brief) |

### 3.2 Add (no mockup has it)

NAUSEA bar with stages, rising and falling arrows, hydration icon, acclimatisation day count, money in
NPR, reputation, timed-job bonus timer, carry weight in town terms (doko, jerrycan), shop with try-on,
dialogue, TPP target-attached prompts, minimal HUD, opacity and scale, the data credit.

### 3.3 Conflicts and how this spec settles them

1. **Bar colours.** Mockups: health green (Push, Him), yellow (Backpack A), white (Backpack B); stamina
   cyan, yellow, green or amber. Brief 13 wins: red, cyan, green-yellow, white or gold.
2. **Stamina gold vs nausea.** Gold and nausea are nearly identical to protan and deutan players
   (CIELAB distance 5 and 8, `v2/cvd.py`), so the stamina fill is white and gold is kept for its icon.
3. **Push's full-width vitals bar** conflicts with "body panel bottom-left, compact". Its segmented bars
   and warning sub-chips are kept as styles, not its placement.
4. **Fonts**: mockups use a grotesque; brief says Teko + Hind. Sizes are converted by cap height.
5. **Palette**: mockups are neutral charcoal with pale gold; brief says the prototype palette. Spec uses
   the prototype's navy hue at the mockups' opacity and `#e8b53a`.
6. **Cut corners** (Push only) vs rounded (the other six and the prototype): rounded.
7. **Which "Backpack Inventory"**: two files carry that name. Spec takes Backpack B's window and Backpack
   A's stats and side menu; confirm with the owner.
8. **Brand-like marks** in the scenes ("MSR" on a pot, "HIMALAYA EXPEDITIONS" tents, "Everest
   Expedition"): project rule forbids real brands; nothing of that carries over.
9. **Text style**: mockups use en dashes as separators, hyphen-minus for negatives, "≈" and "~",
   US "Acclimatization", "m" for minutes. Game text: commas or colons as separators, U+2212 minus, "about",
   "min" for minutes, and one spelling chosen for acclimatisation (British "acclimatisation" suggested;
   the brief writes "acclimatization").
10. **HUD altitude**: the world is scaled by `s` in all axes; the HUD must show real altitude through
    `toReal()` (orchestrator 3), so the readout says about 3,440 m.
11. **TPP**: all mockups are FPP. Bottom-centre hotbars (Oxy, Storm) would sit on the avatar's legs, so
    slots go bottom right.

---

## 4. Bundling Teko and Hind locally

Both are SIL Open Font Licence 1.1 with **no Reserved Font Name**, so subsetting, converting to WOFF2
and keeping the names is allowed. The licence must travel with the font files in the build.

### 4.1 Recommended: Fontsource packages (WOFF2, unicode-range subsets)

Add through `tools/npm-add.sh` (agents never run `npm install` directly):

| Package | Files actually used | Size | Licence file |
|---|---|---|---|
| `@fontsource-variable/teko@5.3.0` | `files/teko-latin-wght-normal.woff2`, `files/teko-latin-ext-wght-normal.woff2`, `files/teko-devanagari-wght-normal.woff2` (weights 300 to 700 in one file), CSS `wght.css` | 15,420 + 7,388 + 63,704 B | `node_modules/@fontsource-variable/teko/LICENSE` (4,384 B) |
| `@fontsource/hind@5.3.0` | `files/hind-latin-400-normal.woff2`, `-500-`, `-600-` (about 16.2, 16.8, 16.6 KB), the matching `latin-ext` and `devanagari` files (devanagari 500 is 71,192 B), CSS `400.css`, `500.css`, `600.css` | about 50 KB Latin | `node_modules/@fontsource/hind/LICENSE` (4,711 B) |

In the UI entry: `import '@fontsource-variable/teko/wght.css'` and `import '@fontsource/hind/400.css'`
(and 500, 600); CSS families are `"Teko Variable"` and `"Hind"`. Vite fingerprints and serves the WOFF2
files; Devanagari downloads only when a Devanagari glyph is drawn. Copy both `LICENSE` files into the
build (for example `client/public/licences/OFL-Teko.txt`, `OFL-Hind.txt`) and list them in the Credits
screen and `docs/CREDITS.md`. Versions and sizes were read from the jsDelivr package listings on
2026-11-12; nothing was downloaded.

### 4.2 Without npm: the upstream TTFs

From `https://github.com/google/fonts` (branch `main`), listing read 2026-11-12:

| Family | Files | Licence text | Copyright line |
|---|---|---|---|
| Teko | `ofl/teko/Teko[wght].ttf` (292,108 B, variable 300 to 700) | `ofl/teko/OFL.txt` (4,385 B) | "Copyright 2023 The Teko Project Authors (https://www.github.com/googlefonts/teko)" |
| Hind | `ofl/hind/Hind-Regular.ttf` (299,532 B), `Hind-Medium.ttf` (277,300), `Hind-SemiBold.ttf` (281,940) | `ofl/hind/OFL.txt` (4,373 B) | "Copyright (c) 2014, Indian Type Foundry (info@indiantypefoundry.com)" |

Raw URLs follow `https://raw.githubusercontent.com/google/fonts/main/ofl/<family>/<file>` (`[` and `]`
encoded as `%5B`, `%5D`). Subset to Latin, Latin-1, General Punctuation, the rupee and degree signs and
Devanagari, and convert to WOFF2 with `pyftsubset` (`fonttools` and `brotli` are **not** in the `.venv`
today), then declare `@font-face` with `font-display: swap` and `unicode-range`. Teko upstream:
`github.com/googlefonts/teko`; Hind upstream: `github.com/itfoundry/hind`.

### 4.3 Checks to run once the files are local

- Glyph coverage for U+2212 (minus), U+202F (narrow no-break space), U+00B0 (degree), U+2082
  (subscript two for SpO2), U+20A8 (₨) and the Devanagari used ("नाम्चे बजार", "रु"). Not verified: no
  font file is on disk. Fall back to `<sub>` for SpO2 and "Rs" for money if any is missing. Never use ₹
  (Indian rupee) for NPR.
- Re-measure tabular figures on the bundled files (the probe used Google-served files; result: none).
- `font-display: swap` plus a preload of the two Latin files keeps first paint inside the 25 s budget.

---

## 5. M1 today, and what should change

| Where | What M1 does | Change |
|---|---|---|
| `client/src/ui/hud.css:4` | `font-family: system-ui, "Segoe UI"`; `color: #fff` | Teko + Hind from section 4, tokens from 2.3 in a `ui/tokens.css` |
| `hud.css:1-17` | hard-coded colours (`#0d1117`, `rgba(10,14,22,.45)`, `rgba(0,0,0,.55)`), no tokens | replace with tokens; loading background becomes the menu card style |
| `hud.css:5-6`, `hud.ts:37` | 4 px dot, white 90 % with shadow, FPP only | keep; colour `--ink` 80 %; hide in TPP (already) and in menus |
| `hud.ts:21`, `hud.css:7-10` | "WASD move · Shift sprint · Space jump · V camera", fades after 9 s | becomes tutorial prompts with keycaps (2.4 H) driven by the Arrival mission |
| `hud.ts:26`, `hud.css:13` | data credit always on, bottom right, 11 px, 75 % | it sits under the planned quick slots and weight (wireframe). Move it to the minimap caption during play (OSM) and keep the full OSM + Copernicus line on the map screen, pause, loading and credits (rule: "in the credits and on the map screen") |
| `hud.ts:24`, `hud.css:14-15` | "Click to look around" | keep, styled as a toast |
| `hud.ts:25` | "Loading Namche…" only | loading screen with progress and steps (2.5) |
| `hud.ts:22`, `hud.css:11-12` | F3 stats, monospace | keep as debug, outside the design system |
| `hud.ts:36` | `update(dt, mode, locked)` | `update(view: HudView)` from a sim snapshot at 10 Hz, plus per-frame `drawCompass(heading)` and `drawMinimap(pose)`; HUD reads the contract, never sim internals |
| `index.html:2,6` | `lang="en-GB"`, title "CAMP 4: Namche Bazaar" | keep; preload the two Latin WOFF2 files |
| missing | everything in 2.2 except the dot | build in waves UI-A (kit, tokens, HUD, settings, shells) and UI-B (screens) |

Port from the prototype (`src/template.html:11-141`, `src/game.js` HUD code): the compass drawing
rules, the minimap base and player arrow, the toast, the flag-strip card and the gold button. Do not port
its light/dark `prefers-color-scheme` switch for the in-game HUD.

---

## 6. Open questions for the owner

1. Which file is "my Backpack Inventory mockup": Base Camp (side menu, stats list) or Camp (tabs, detail
   card, quick access)? The spec merges them.
2. Stamina "white/gold": is a white fill with a gold icon acceptable? A gold fill is indistinguishable
   from nausea for colour-blind players.
3. Body panel row order: OXYGEN, STAMINA, NAUSEA, HEALTH (fast to slow) or the brief's listed order
   HEALTH, OXYGEN, NAUSEA, STAMINA?
4. Minimap scale bar and distances: game metres (what the player walks) or real metres (like altitude)?
5. Money label: "Rs 2,450" (as lodge menus in Namche print it) or "NPR 2,450"?
6. Spelling: "acclimatisation" (British) or "acclimatization" (the brief)?
