# Marketing website

Static marketing site served at https://voics.nl (bucket `discordy-site` in cluster MinIO).

## Layout
- `brand.json`: the single source of branding (name, tagline, description, domain, logo path, colors, download links, contact, year).
- `src/`: HTML/CSS templates using `{{tokens}}` (e.g. `{{name}}`, `{{colors.accent}}`). No brand strings are hard-coded.
- `scripts/build.mjs`: renders `src/` into `dist/` (Node 18+, no dependencies). `scripts/check.mjs` verifies no hard-coded brand name, brand base domain (voics.nl) or unresolved token in `src/`.
- `deploy/deploy.sh`: publishes `dist/` to the MinIO bucket via an in-cluster Job.

## Rename / rebrand
1. Edit `brand.json` (`name`, `downloads.*`, `contact.*`, `tagline`, `description`, `domain`, `colors.*`, `logo`).
2. To change the logo, replace `src/assets/logo.svg` (or point `logo` at another file under `src/`).
3. `npm run build && npm run check`, then deploy.

## Privacy policy and support pages
`src/privacy.html` and `src/support.html` are plain pages built like the home page (links come from `pages.*` and `contactEmail` in `brand.json`; English in `privacy.html` and Dutch in `privacy-nl.html`, linked to each other; the rest of the site is English only). The privacy policy is final text (company, address, KvK number and minimum age come from the owner). The text must be kept in step with the apps and infrastructure: data stored, retention, delivery modes, push, email (Brevo, Cloudflare Email Routing) and other third parties are described from the code, the gitops config and the backup runbook. The KvK number was taken from a third-party directory, not the KvK register, and should be re-checked there.

## Downloads
The Windows Download buttons link to `downloads.windows` and the Android buttons to `downloads.android` in brand.json (stable URLs of the latest installer and APK; the APK is published by the client `android-apk` workflow). macOS/Linux are shown as coming soon.

## Invite page
`npm run build` copies `../gitops/site/invite/index.html` into `dist/invite/index.html` so it is always published with the site (skipped with a warning if the gitops checkout is absent).

## Server template page

`template.html?code=<code>` previews a shared server template without signing
in. It uses `apiUrl` and `protocolScheme` from `brand.json`, shows saved roles
and channels, and offers an explicit app link. The page never creates a server
or launches the app automatically. Invalid/deleted links cannot open the app;
connection errors offer retry. API support is delivered in the api#44 completion
increment and contracts#43. The existing static-object route serves the page;
no ingress rewrite is needed.

For browser tests, run `npm ci`, `npx playwright install chromium`, then
`npm test`. Six headless Chromium checks cover desktop/mobile previews,
untrusted text, explicit deep links, deleted/invalid links and retry. They use
intercepted API responses and never contact the live API. Screenshots are saved
under `output/playwright/`. CI installs Chromium and runs the same suite.

## Deploy
```
npm run build
KUBECONFIG=~/.kube/discordy-gen-serv.yaml bash deploy/deploy.sh
```
The script uploads `dist/` as a temporary ConfigMap and runs a Job (`pgsty/mc`, same image as gitops `minio-buckets`) that reads the `voics-data/minio` secret inside the cluster and mirrors files into `discordy-site`. No credentials leave the cluster. It does not delete other objects in the bucket (e.g. `invite/index.html` owned by gitops).

## CI
`.github/workflows/ci.yml` builds and checks the site on every push and PR (GitHub-hosted runner) and uploads `dist` as an artifact.

## Git hooks

Install [lefthook](https://github.com/evilmartians/lefthook) once and run `lefthook install` to enable the pre-push hook in `lefthook.yml`: it builds, checks and browser-tests the site before every push. CI repeats those checks. Skip once with `LEFTHOOK=0 git push` after running the same checks manually.
