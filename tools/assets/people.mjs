// Builds the CC0 crowd assets for the client (Quaternius, CC0):
//  - client/public/assets/people/<outfit>.glb: the four Modular Character Outfits (Fantasy) bodies,
//    which share the Universal Animation Library skeleton (65 bones, identical names), 1K WebP textures.
//  - client/public/assets/people/anims.glb: just Walk_Loop, Walk_Formal_Loop and Idle_Loop from UAL1.
//   node people.mjs
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune } from '@gltf-transform/functions';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const Q = path.join(ROOT, 'assets-src', 'cc0', 'quaternius');
const OUT = path.join(ROOT, 'client', 'public', 'assets', 'people');
fs.mkdirSync(OUT, { recursive: true });
const outfits = path.join(Q, 'modular-character-outfits-fantasy', 'unzipped', 'Modular Character Outfits - Fantasy[Standard]', 'Exports', 'glTF (Godot-Unreal)', 'Outfits');
const cli = path.join(import.meta.dirname, 'node_modules', '@gltf-transform', 'cli', 'bin', 'cli.js');

for (const n of ['Male_Peasant', 'Female_Peasant', 'Male_Ranger', 'Female_Ranger']) {
  execFileSync(process.execPath, [cli, 'optimize', path.join(outfits, `${n}.gltf`), path.join(OUT, `${n.toLowerCase()}.glb`),
    '--compress', 'meshopt', '--texture-compress', 'webp', '--texture-size', '1024', '--simplify', 'false', '--join', 'false',
    '--instance', 'false', '--flatten', 'false'], { stdio: 'inherit' });
  console.log('outfit', n);
}

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(path.join(Q, 'universal-animation-library', 'unzipped', 'Universal Animation Library[Standard]', 'Unreal-Godot', 'UAL1_Standard.glb'));
const keep = new Set(['Walk_Loop', 'Walk_Formal_Loop', 'Idle_Loop']);
const root = doc.getRoot();
for (const a of root.listAnimations()) if (!keep.has(a.getName())) a.dispose();
for (const node of root.listNodes()) if (node.getMesh()) node.setMesh(null);
for (const m of root.listMeshes()) m.dispose();
await doc.transform(prune());
await io.write(path.join(OUT, 'anims.glb'), doc);
console.log('anims', root.listAnimations().map((a) => a.getName()));
