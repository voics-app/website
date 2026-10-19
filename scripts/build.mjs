// Renders src/ into dist/ by substituting {{path.to.value}} tokens from brand.json.
// This is the only place brand values enter the site; src/ contains no hard-coded brand strings.
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const brand = JSON.parse(readFileSync(join(root, 'brand.json'), 'utf8'));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const d = brand.downloads ?? {};
const btn = (href, label, ghost) => `<a class="btn${ghost ? ' ghost' : ''}" href="${esc(href)}">${esc(label)}</a>`;
let downloadBlock;
if (d.available) {
  const parts = [['windows', 'Windows'], ['macos', 'macOS'], ['linux', 'Linux']].filter(([k]) => d[k]).map(([k, l]) => btn(d[k], l));
  if (!parts.length && d.releasesUrl) parts.push(btn(d.releasesUrl, 'Download'));
  downloadBlock = '<p class="lead">Get the desktop client.</p><div class="cta">' + parts.join('') + '</div>' +
    (d.releasesUrl && parts.length ? `<p><a href="${esc(d.releasesUrl)}">All releases</a></p>` : '');
} else {
  downloadBlock = '<p class="lead">The desktop client is coming soon. Request early access and we will get in touch.</p><div class="cta">' +
    btn(d.requestAccessUrl || brand.links.contact, 'Request access') + '</div>';
}

// Flatten brand.json into dotted keys; brand strings may themselves contain {{tokens}}.
const flat = {};
(function walk(o, p) {
  for (const [k, v] of Object.entries(o)) typeof v === 'object' && v ? walk(v, p + k + '.') : (flat[p + k] = String(v));
})(brand, '');
const resolve = (k, depth = 0) => {
  if (depth > 5) throw new Error('Token recursion: ' + k);
  return flat[k].replace(/\{\{([\w.]+)\}\}/g, (_, n) => resolve(n, depth + 1));
};
const render = (s) => s.replace(/\{\{([\w.]+)\}\}/g, (m, k) => {
  if (k === 'downloadBlock') return downloadBlock;
  if (!(k in flat)) throw new Error('Unknown token ' + m);
  return k.startsWith('colors.') ? resolve(k) : esc(resolve(k));
});

const out = join(root, 'dist');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
(function copy(dir, rel) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f), r = join(rel, f);
    if (statSync(p).isDirectory()) { mkdirSync(join(out, r), { recursive: true }); copy(p, r); continue; }
    if (['.html', '.css'].includes(extname(f))) writeFileSync(join(out, r), render(readFileSync(p, 'utf8')));
    else cpSync(p, join(out, r));
  }
})(join(root, 'src'), '');
console.log(`Built ${brand.name} -> dist/`);
