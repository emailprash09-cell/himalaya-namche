# Resume notes (2026-11-12, after the stopped Fable run)

**What exists**
- `namche-playable`: project rules (`CLAUDE.md`), owner's brief (`docs/MISSION.md`, which already holds the
  full master spec: FPP/TPP, Health/Oxygen/Nausea/Stamina, living town, missions, shop, far views, lighting),
  local Node 24 (`.tools/node`, `tools/env.*`), the old r128 prototype (`src/`, `scripts/`) as reference.
- Recovered from the stopped run and committed: `docs/audit/history.md` (chat history and measured entrance
  facts), `docs/audit/prototype.md` (what the prototype does, coordinates, pitfalls),
  `docs/audit/landmarks.json` (every POI with OSM id and local x/z), `docs/plan/ORCHESTRATOR_BRIEF.md`.
- Geodata: `data/raw/namche-osm.geojson`, SRTM 3" tiles, Copernicus GLO-30 tiles in `data/raw/dem/`.
- Reference photos (local only): `reference/chat/chat_03.webp` is the entrance view; `chat_09`/`chat_11` the
  gate; `reference/measure/*` the measured grids.
- `assets-src/higgsfield/`: gate, gate2, gate3, stupa, stupa2, bridge2, pavilion (17 to 66 MB each) and four
  character GLBs (17 to 22 MB). No reduced, KTX2 or Meshopt outputs were made.
- `assets-src/cc0/quaternius/`: Universal Animation Library (UAL1_Standard.glb, 7.6 MB, mannequin plus clips),
  Universal Base Characters, nature packs. Kenney, Poly Haven, ambientCG folders are empty.

**Half-done / missing**: no `client/`, no `NAMCHE_PLAN.md`, `ARCHITECTURE.md`, `STATUS.md`, `CREDITS.md`,
`DECISIONS.md`. The audit's tech-stack and UI audits never landed.

**Reused for M1**
- Positions from `landmarks.json` (gate, stupa, trail ways, stream, market ground), heights from Copernicus.
- Measured gate and stupa sizes from `history.md` section on the entrance.
- Coordinates `x east, z south`, origin 27.805 N 86.71 E, uniform town scale (0.55 to 0.70, M1 uses 0.65).
- Gate3 is 20 MB, over the 3 MB limit, so the gate is rebuilt from primitives. No Higgsfield output ships.
- UAL1 mannequin and clips (CC0) for the TPP avatar if it works quickly; capsule otherwise.
- The bridge below the gate is not in OSM: built as an invented item and listed in `docs/INVENTED.md`.
