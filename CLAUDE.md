# CAMP 4: Namche Bazaar playable game — project rules

Read this first, every session. It is the standing contract for this repo.

## What this is
A first- and third-person game set entirely in **Namche Bazaar** (3,440 m, Khumbu, Nepal). Project name
**CAMP 4**. The owner (Pz) is based in Nepal and knows the town. There is no climbing in this build.

- The brief, in the owner's words: `docs/MISSION.md`. Never edit the brief itself.
- The build plan: `docs/NAMCHE_PLAN.md`. Module contracts: `docs/ARCHITECTURE.md` and `client/src/contracts/`.
- What the audit of the repo, the earlier chats and the reference photos found: `docs/audit/`.

Read the parts that concern your task before you write anything.

## Branch and history
Work happens on `namche-playable` (cut from `fix/geometry`). The older single-file prototype
(`src/game.js`, `src/template.html`, `scripts/*.py`, `build/namche.html`, three.js r128) stays as it is.
It is a reference and a source of proven algorithms (terrain fitting, stair flights, footprint and path
fixes, the invented-items registry). Port from it. Do not extend it.

## Stack
TypeScript (strict) + Vite + three.js (latest; `WebGPURenderer` with automatic WebGL2 fallback, TSL node
materials) + Rapier physics. A multi-file project under `client/`. Scripts: `npm run dev`, `build`,
`test`, `e2e`, `perf`. It must run on Windows.

## This machine
- **Node is project-local** (`.tools/node`, v24 LTS) and is not on the global PATH. In Bash, begin every
  command that needs it with `source /f/MOUNTAIN/himalaya/tools/env.sh && ...`. In PowerShell:
  `. F:\MOUNTAIN\himalaya\tools\env.ps1; ...`. The script also sets `$BLENDER` (Blender 4.5.3, run it
  headless with `-b`), `$NAMCHE_PY` (the `.venv` Python 3.10) and `PYTHONUTF8=1`.
- Windows 11, drive F: is **exFAT** (no symlinks). i7-11800H, **16 GB RAM with often only about 4 GB
  free**, RTX 3050 Ti laptop GPU with 4 GB VRAM. This laptop is the target hardware.
- **Be frugal. Other agents share the machine.** Close every browser, Blender and server you start.
  Never leave a watcher running. Run one heavy process at a time.
- Headless rendering uses the real GPU: Playwright Chromium with
  `--use-angle=d3d11 --enable-gpu --ignore-gpu-blocklist --force_high_performance_gpu`.
  Once the repo has a shot tool, use it instead of writing your own.
- Put scratch output in `out/<your-task-name>/` (git-ignored). Do not write temp files anywhere else.

## Hard rules
- **Never invent geography.** Footprints, paths, streams and POIs come from
  `data/raw/namche-osm.geojson`; elevation comes from SRTM or the Copernicus DEM. The town is compressed
  (see the plan), which moves things closer but must never reorder them or turn them round. Anything not
  in the data (tents, stalls, interiors, people, a landmark OSM lacks) is registered as invented, with a
  reason, the way `docs/INVENTED.md` does today.
- **Attribution stays visible in the game:** © OpenStreetMap contributors (ODbL) and the elevation
  source, in the credits and on the map screen.
- **Reference photos are local-only.** `reference/`, `docs/reference/` and `assets-src/` are git-ignored.
  Never commit, publish or embed the photos, and never use them as textures. They are for looking at.
- **No real brands, logos or real people.** Signboards, gear and characters use invented names.
- **No paid or generative services.** Never call Higgsfield or any other connector or MCP tool, for any
  reason. Use local tools (Blender CLI, gltf-transform, meshoptimizer, Python, Node), CC0 assets from
  Poly Haven, ambientCG, Quaternius and Kenney, and open geodata with attribution. Record every
  third-party asset and data source in `docs/CREDITS.md` with its licence and URL.
- **Human scale is fixed.** Player capsule 1.75 m, eye height 1.62 m. NPCs 1.55 to 1.85 m. Storey 2.4 to
  2.7 m. Doors 1.70 to 1.85 m; doorways the player walks through at least 1.85 m. Stair risers 0.17 to
  0.20 m. Kani gate 4.5 m square. The town is fitted round people, never the other way.
- **Clock:** one real hour is one game day.
- **Performance is a gate** (RTX 3050 laptop, 1080p): Medium at 60 fps or more with 100+ NPCs, under
  1,500 draw calls and 3 GB VRAM, first load within 25 s. Instance, batch, LOD and cull by default, and
  count what you add.
- **Text the player reads:** British-leaning plain English, typographic apostrophes and quotes, no em
  dashes. Nepali and Sherpa terms must be correct.
- **Culture with respect:** clockwise round stupas, mani walls and prayer wheels. Nothing mocking.

## Working alongside other agents
Many agents work in this tree at the same time.
- **Stay inside the files and folders your task gives you.** If you need a change somewhere else (a
  contract, `package.json`, shared config, another module), do not make it. Describe it in your report.
- **Do not run git commands that change state** (`add`, `commit`, `checkout`, `switch`, `stash`, `reset`,
  `restore`, `clean`, `merge`, `rebase`). The orchestrator commits. Nobody pushes.
- Do not install system software or change system settings.
- Game rules live in `client/src/sim/`: pure TypeScript, deterministic, no three.js and no DOM, unit
  tested. Tuning numbers live in config files, not in the middle of code.

## Verifying a change
- Type-check and run the tests for what you touched.
- For anything visual, render it and **look at the PNG** before you call it done.
- The page must load with no console errors or warnings from your code.
- Report honestly: a failing test is reported as failing, with its output. Say what you did not verify.
