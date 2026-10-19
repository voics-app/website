# Marketing website

Static marketing site served at https://discordy.voics.nl (bucket `discordy-site` in cluster MinIO).

## Layout
- `brand.json`: the single source of branding (name, tagline, description, domain, logo path, colors, download links, contact, year).
- `src/`: HTML/CSS templates using `{{tokens}}` (e.g. `{{name}}`, `{{colors.accent}}`). No brand strings are hard-coded.
- `scripts/build.mjs`: renders `src/` into `dist/` (Node 18+, no dependencies). `scripts/check.mjs` verifies no hard-coded brand name or unresolved token.
- `deploy/deploy.sh`: publishes `dist/` to the MinIO bucket via an in-cluster Job.

## Rename / rebrand
1. Edit `brand.json` (`name`, `tagline`, `description`, `domain`, `colors.*`, `logo`).
2. To change the logo, replace `src/assets/logo.svg` (or point `logo` at another file under `src/`).
3. `npm run build && npm run check`, then deploy.

## Downloads
While `downloads.available` is `false` the page shows a "Request access" call to action (`downloads.requestAccessUrl`).
Set `available` to `true` and fill `windows` / `macos` / `linux` (and/or `releasesUrl`) once public releases exist.

## Deploy
```
npm run build
KUBECONFIG=~/.kube/discordy-gen-serv.yaml bash deploy/deploy.sh
```
The script uploads `dist/` as a temporary ConfigMap and runs a Job (`pgsty/mc`, same image as gitops `minio-buckets`) that reads the `voics-data/minio` secret inside the cluster and mirrors files into `discordy-site`. No credentials leave the cluster. It does not delete other objects in the bucket (e.g. `invite/index.html` owned by gitops).

## CI
`.github/workflows/ci.yml` builds and checks the site on every push and PR (GitHub-hosted runner) and uploads `dist` as an artifact.
