// Converts the CC0 PBR sets in assets-src/cc0 into 1K WebP maps for the client (client/public/assets/tex).
// KTX2 needs the toktx binary (KTX-Software), which is not installed here, so WebP is used.
//   node textures.mjs
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const SRC = path.join(ROOT, 'assets-src', 'cc0');
const OUT = path.join(ROOT, 'client', 'public', 'assets', 'tex');
fs.mkdirSync(OUT, { recursive: true });
const acg = (id, map) => path.join(SRC, 'ambientcg', id, `${id}_2K-JPG`, `${id}_2K-JPG_${map}.jpg`);
const ph = (id, map) => path.join(SRC, 'polyhaven', id, `${id}_${map}_2k.${map.startsWith('nor') || map === 'disp' ? 'png' : 'jpg'}`);

const jobs = [
  ['plaster_col', acg('PaintedPlaster017', 'Color'), { grey: true }],
  ['plaster_nor', acg('PaintedPlaster017', 'NormalGL')],
  ['iron_col', ph('corrugated_iron', 'diff'), { grey: true }],
  ['iron_nor', ph('corrugated_iron', 'nor_gl')],
  ['iron_arm', ph('corrugated_iron', 'arm')],
  ['planks_col', ph('weathered_planks', 'diff')],
  ['planks_nor', ph('weathered_planks', 'nor_gl')],
  ['grass_col', acg('Grass004', 'Color')],
  ['grass_nor', acg('Grass004', 'NormalGL')],
  ['rock_col', acg('Rock030', 'Color')],
  ['rock_nor', acg('Rock030', 'NormalGL')],
  ['mud_col', ph('brown_mud_dry', 'diff')],
  ['mud_nor', ph('brown_mud_dry', 'nor_gl')],
  ['paving_col', acg('PavingStones069', 'Color')],
  ['paving_nor', acg('PavingStones069', 'NormalGL')],
  ['snow_col', ph('snow_02', 'diff')],
];
for (const [name, src, opt = {}] of jobs) {
  if (!fs.existsSync(src)) { console.log('missing', src); continue; }
  let img = sharp(src).resize(1024, 1024);
  if (opt.grey) img = img.grayscale().linear(1.15, 0); // tinted per building at runtime
  await img.webp({ quality: name.endsWith('_nor') ? 92 : 85 }).toFile(path.join(OUT, `${name}.webp`));
  console.log('wrote', name);
}
