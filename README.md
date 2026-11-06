# Marketing website

Static marketing site served at https://discordy.voics.nl (bucket `discordy-site` in cluster MinIO).

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
`src/privacy.html` and `src/support.html` are plain pages built like the home page (links come from `pages.*` and `contactEmail` in `brand.json`; English in `privacy.html` and Dutch in `privacy-nl.html`, linked to each other; the rest of the site is English only). The privacy policy is a **draft**: it carries `noindex`, a visible draft banner and highlighted `[OWNER: ...]` fields (postal address, KvK number, DPO check, server location, off-site backup provider, email switch-on, transfer safeguards, retention of reports and logs, deletion timers). The owner must have it checked and fill those in, then remove the banner and the robots tag, before it is published or given to the App Store as the privacy URL. The text must be kept in step with the apps: data stored, retention, delivery modes, push and third parties are described from the code and the backup runbook.

## Downloads
All Download buttons link directly to `downloads.windows` in brand.json (stable URL of the latest installer). macOS/Linux are shown as coming soon.

## Invite page
`npm run build` copies `../gitops/site/invite/index.html` into `dist/invite/index.html` so it is always published with the site (skipped with a warning if the gitops checkout is absent).

## Deploy
```
npm run build
KUBECONFIG=~/.kube/discordy-gen-serv.yaml bash deploy/deploy.sh
```
The script uploads `dist/` as a temporary ConfigMap and runs a Job (`pgsty/mc`, same image as gitops `minio-buckets`) that reads the `voics-data/minio` secret inside the cluster and mirrors files into `discordy-site`. No credentials leave the cluster. It does not delete other objects in the bucket (e.g. `invite/index.html` owned by gitops).

## CI
`.github/workflows/ci.yml` builds and checks the site on every push and PR (GitHub-hosted runner) and uploads `dist` as an artifact.

## Git hooks

Tests run locally, not in CI. Install [lefthook](https://github.com/evilmartians/lefthook) once and run `lefthook install` to enable the pre-push hook in `lefthook.yml`: it runs this repository's lint and unit tests before every push. CI repeats only the slim gate on pull requests. Skip once with `LEFTHOOK=0 git push`.
