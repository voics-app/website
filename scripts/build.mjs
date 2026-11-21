// Renders src/ into dist/ by substituting {{path.to.value}} tokens from brand.json.
// This is the only place brand values enter the site; src/ contains no hard-coded brand strings.
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import './check-friend-invite.mjs';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const brand = JSON.parse(readFileSync(join(root, 'brand.json'), 'utf8'));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

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
// The invite landing page is owned by the gitops repo; publish it together with the site so a deploy
// never leaves a different /invite/ behind. Skipped (with a warning) when the sibling checkout is absent (e.g. CI).
const gitops = process.env.GITOPS_DIR || join(root, '..', 'gitops');
const invite = join(gitops, 'site', 'invite', 'index.html');
if (existsSync(invite)) { mkdirSync(join(out, 'invite'), { recursive: true }); cpSync(invite, join(out, 'invite', 'index.html')); }
else console.warn('warning: ../gitops/site/invite/index.html not found; dist/invite not populated');
const friendInvite = join(gitops, 'site', 'friend-invite', 'index.html');
if (existsSync(friendInvite)) { mkdirSync(join(out, 'friend-invite'), { recursive: true }); cpSync(friendInvite, join(out, 'friend-invite', 'index.html')); }
else console.warn('warning: gitops friend-invite page not found; using checked-in site copy');
// Cloudflare caches .css/.js/.svg for hours, so a deploy would pair new HTML with old styles.
// Local asset references in the site's HTML get ?v=<content hash>, which changes whenever the file does.
for (const f of readdirSync(out).filter((f) => extname(f) === '.html')) {
  const page = join(out, f);
  const html = readFileSync(page, 'utf8').replace(/(href|src)="((?!https?:|\/\/|#|mailto:)[^"?#]+\.(?:css|js|svg|png|webp|ico))"/g, (m, attr, ref) => {
    const asset = join(out, ref);
    if (!existsSync(asset)) return m;
    return `${attr}="${ref}?v=${createHash('sha256').update(readFileSync(asset)).digest('hex').slice(0, 10)}"`;
  });
  writeFileSync(page, html);
}
console.log(`Built ${brand.name} -> dist/`);
