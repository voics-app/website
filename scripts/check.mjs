// Sanity checks: no unresolved tokens in dist, and src has no hard-coded brand name or domain.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const brand = JSON.parse(readFileSync(join(root, 'brand.json'), 'utf8'));
// Parent domain of the brand host (discordy.voics.nl -> voics.nl); src must reach it only through {{tokens}}.
const baseDomain = brand.domain.split('.').slice(-2).join('.');
const files = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? files(join(d, f)) : [join(d, f)]));
let bad = 0;
for (const f of files(join(root, 'src')).filter((f) => /\.(html|css)$/.test(f))) {
  if (readFileSync(f, 'utf8').toLowerCase().includes(brand.name.toLowerCase())) { console.error('hard-coded brand name in', f); bad++; }
  if (readFileSync(f, 'utf8').includes(baseDomain)) { console.error('hard-coded brand domain in', f); bad++; }
}
for (const f of files(join(root, 'dist')).filter((f) => /\.(html|css)$/.test(f))) {
  if (/\{\{[\w.]+\}\}/.test(readFileSync(f, 'utf8'))) { console.error('unresolved token in', f); bad++; }
}
if (!readFileSync(join(root, 'dist', 'index.html'), 'utf8').includes('<h1>')) { console.error('missing h1'); bad++; }
process.exit(bad ? 1 : 0);
