# HIMALAYA: The Summit — project rules

Read this first, every session. It is the standing contract for this repo.

## What this is
A first-person mountaineering survival game set in the Khumbu, Nepal. Project name **CAMP 4**.
The owner (Pz) is based in Nepal. The current deliverable is a **walkable stylized concept of
Namche Bazaar** that runs in a browser. The photoreal Unreal build comes later; see `docs/`.

## Current state
`build/namche.html` is a finished, self-contained page: ~346 real buildings, stone streets and
stairs, gompa, stupa, prayer wheels, mani walls, bridges, a running stream, vegetation, a
day/night toggle, a compass, a minimap, peak labels with real line-of-sight, and touch controls.

## Pipeline
1. `scripts/build_dem.py` → `data/merged.npy` (SRTM 90 m, voids filled)
2. `scripts/prep_osm.py` → `data/data.js` (buildings, paths, masks, POIs, peaks, DEM, all base64)
3. `src/build.py` → `build/namche.html` (injects `src/game.js` + `data/data.js` into `src/template.html`)

Run them in that order. `src/game.js` is the game; `src/template.html` is the shell (HTML, CSS, HUD).

## Hard rules
- **Never invent geography.** Building footprints, paths, streams and POIs come from
  `data/raw/namche-osm.geojson`. Elevation comes from SRTM. If something is not in the data,
  either leave it out or mark it clearly as invented in a comment.
- **Keep the OpenStreetMap attribution** visible on the page (ODbL requires it).
- **Do not embed the reference photos as textures.** They are screenshots of videos and stock
  images. All textures are painted procedurally in `game.js` using the photos only as reference.
- **One self-contained HTML file.** No build step for the end user, no external assets except
  three.js r128 from cdnjs and Google Fonts. Keep the file under 16 MB.
- **Target hardware is a laptop RTX 3050 with 16 GB RAM**, and phones. Before adding geometry,
  check the instance counts near the top of each section. `coarse` (touch devices) must stay lighter.
- **British-leaning plain English in UI text.** Typographic apostrophes and quotes in anything
  the player reads. No em dashes.
- **Light and dark**: the page renders inside a viewer with its own theme. Keep the CSS variables
  and the `prefers-color-scheme` block in `template.html` intact.

## Verifying a change
There is no GPU here. Use headless Chromium with SWiftShader:
`python3 scripts/shots.py <view>` (see the file) renders a view and saves a PNG. It is slow
(minutes per frame) — take few shots, and batch them.
Always check: page loads without a `PAGEERROR`, `#status` reaches "Ready", and the shot looks right.

## Style of work
- Prefer editing `game.js` in place over rewriting it.
- Commit after each working step. Use Git LFS for anything binary over ~5 MB.
- When a change is visual, show a before/after screenshot.
