// Shared fingerprint with gitops/scripts/check-friend-invite.mjs. Change both PRs together.
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
const root = fileURLToPath(new URL('..', import.meta.url));
const expected = '16405140a2f906cba5b73f3515da45b418328e371a569e30bfd6a831137ee5ab';
const brand = JSON.parse(readFileSync(join(root, 'brand.json'), 'utf8'));
const normalize = (text) => text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
const digest = (text) => createHash('sha256').update(normalize(text)).digest('hex');
const source = readFileSync(join(root, 'src/friend-invite/index.html'), 'utf8').replaceAll('{{protocolScheme}}', brand.protocolScheme);
if (digest(source) !== expected) throw new Error('Website friend invite landing differs from the coordinated gitops fingerprint.');
const gitops = process.env.GITOPS_DIR || join(root, '..', 'gitops');
const other = join(gitops, 'site/friend-invite/index.html');
if (existsSync(other) && digest(readFileSync(other, 'utf8')) !== expected) throw new Error('The supplied gitops friend invite landing differs from the website copy.');
