# Credits and sources

Every third-party asset, library and data source the game uses, with its licence. The in-game credit line
(bottom right of the screen) carries the two attributions the data licences require.

## Data

| Source | Use | Licence | URL |
| --- | --- | --- | --- |
| OpenStreetMap, export `data/raw/namche-osm.geojson` | Trail, gate, stupa, paths, streams, lodge footprints | ODbL 1.0, © OpenStreetMap contributors | https://www.openstreetmap.org/copyright |
| Copernicus DEM GLO-30, tile N27 E086 | All terrain heights (near, town, far peaks) | © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018, provided under COPERNICUS by the European Union and ESA; free licence | https://spacedata.copernicus.eu/collections/copernicus-digital-elevation-model |

## Code libraries

| Library | Version | Licence | URL |
| --- | --- | --- | --- |
| three.js | 0.187.0 | MIT | https://github.com/mrdoob/three.js |
| Rapier (`@dimforge/rapier3d-compat`) | 0.21.0 | Apache-2.0 | https://rapier.rs |
| Vite | 8.3.8 | MIT | https://vite.dev |
| TypeScript | 7.0.2 | Apache-2.0 | https://www.typescriptlang.org |
| Vitest | 5.1.0 | MIT | https://vitest.dev |
| Playwright (Python, tools only) | 1.65.0 | Apache-2.0 | https://playwright.dev |

## Art

M1 ships no third-party models or textures. Every texture (flagstones, dry-stone wall, whitewash, the
gate frieze, the painted eyes on the stupa, tin, clouds) is drawn procedurally on a canvas at load, and all
geometry is built from primitives. No reference photo is used as a texture.

Downloaded but not used yet: Quaternius Universal Animation Library and Universal Base Characters (CC0 1.0,
https://quaternius.com), in `assets-src/cc0/` (git-ignored).
