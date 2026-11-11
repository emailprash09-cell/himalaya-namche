# HIMALAYA: The Summit — Namche concept

A walkable, stylized reconstruction of **Namche Bazaar** (3,440 m, Khumbu, Nepal) that runs in a
browser. Built from OpenStreetMap geometry on NASA SRTM terrain, with every texture painted in code.

![](reference/namche/NAMCHE_INSPO1.png)

## Quick start

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python3 scripts/build_dem.py      # data/raw/*.hgt  -> data/merged.npy
python3 scripts/prep_osm.py       # OSM + DEM       -> data/data.js
python3 src/build.py              # -> build/namche.html
```

Then open `build/namche.html`. Controls: `WASD` walk, mouse look, `Shift` run, `N` day/night,
`M` map, `P` peak names, `Esc` pause. Touch devices get a joystick and drag-to-look.

## Layout

| Path | What it holds |
| --- | --- |
| `src/game.js` | The whole game: terrain, buildings, textures, landmarks, HUD, controls |
| `src/template.html` | Page shell: HTML, CSS, HUD markup, theme variables |
| `src/build.py` | Injects the game and the data into the shell |
| `scripts/prep_osm.py` | Turns the OSM export and the DEM into `data/data.js` |
| `scripts/build_dem.py` | Merges and void-fills the SRTM tiles |
| `scripts/fetch_osm.sh` | Re-pulls the OSM layers from Overpass |
| `data/raw/namche-osm.geojson` | The OpenStreetMap export this build uses |
| `data/raw/*.hgt` | SRTM3 elevation tiles for the Khumbu |
| `reference/namche/` | Street, architecture and aerial photos of Namche |
| `reference/mountains/` | Peak and valley reference |
| `reference/hud/` | Early AI mockups of the survival HUD for the full game |
| `docs/` | The original concept brief |
| `build/namche.html` | The current published page |

## Coordinates

Everything in the game uses a local metre grid: **x** east, **z** south, origin at
27.8050° N, 86.7100° E. Conversions: `1° lat = 110,816 m`, `1° lon = 98,541 m`.

## Data and licensing

- Map data © OpenStreetMap contributors, **ODbL**. The attribution on the page must stay.
- Elevation: NASA SRTM (public domain).
- Reference photos are for art direction only; they are not shipped as textures.

## Roadmap

1. ~~Real building footprints, streets, stairs, landmarks~~ done
2. Lighting and graphics: warmer sun, alpenglow, valley haze, softer shadows
3. NPCs, yaks, shop interiors, ambient sound
4. Port the layout into Unreal 5.8 for the full survival game
