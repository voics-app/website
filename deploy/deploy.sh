#!/usr/bin/env bash
# Publishes dist/ to the MinIO bucket discordy-site, which the cluster serves at https://<domain>/
# (ingress minio-site in namespace voics-data). Secrets never leave the cluster: the upload Job reads
# the voics-data/minio secret itself. Requires kubectl access via $KUBECONFIG and a prior `npm run build`.
set -euo pipefail
cd "$(dirname "$0")/.."
NS=voics-data
BUCKET=discordy-site
IMAGE=pgsty/mc:RELEASE.2026-09-16T00-00-00Z   # same image as the minio-buckets Job in gitops
[ -f dist/index.html ] || { echo "dist/ missing: run 'npm run build' first" >&2; exit 1; }

# ConfigMap keys cannot contain '/', so nested paths are mapped back with volume items.
args=(); items=""
while IFS= read -r f; do
  rel="${f#dist/}"; key="${rel//\//__}"
  args+=(--from-file="$key=$f")
  items+="          - {key: \"$key\", path: \"$rel\"}"$'\n'
done < <(find dist -type f | sort)

kubectl -n "$NS" delete job site-publish --ignore-not-found >/dev/null
kubectl -n "$NS" delete configmap site-dist --ignore-not-found >/dev/null
kubectl -n "$NS" create configmap site-dist "${args[@]}" >/dev/null

kubectl -n "$NS" apply -f - <<EOF >/dev/null
apiVersion: batch/v1
kind: Job
metadata:
  name: site-publish
  namespace: $NS
spec:
  backoffLimit: 3
  ttlSecondsAfterFinished: 600
  template:
    spec:
      restartPolicy: OnFailure
      securityContext: {runAsNonRoot: true, runAsUser: 1000, seccompProfile: {type: RuntimeDefault}}
      containers:
      - name: publish
        image: $IMAGE
        command: ["/bin/sh", "-c"]
        args:
        - |
          set -eu
          export HOME=/tmp
          mkdir /tmp/site
          cp -rL /site/* /tmp/site/
          mc alias set discordy http://minio.$NS.svc.cluster.local:9000 "\$MINIO_ROOT_USER" "\$MINIO_ROOT_PASSWORD" >/dev/null
          mc mb --ignore-existing discordy/$BUCKET
          mc anonymous set download discordy/$BUCKET
          mc mirror --overwrite /tmp/site discordy/$BUCKET
          mc ls --recursive discordy/$BUCKET
        envFrom: [{secretRef: {name: minio}}]
        securityContext: {allowPrivilegeEscalation: false, capabilities: {drop: ["ALL"]}}
        resources: {requests: {cpu: 10m, memory: 32Mi}, limits: {memory: 128Mi}}
        volumeMounts: [{name: site, mountPath: /site}]
      volumes:
      - name: site
        configMap:
          name: site-dist
          items:
$items
EOF

kubectl -n "$NS" wait --for=condition=complete job/site-publish --timeout=180s
kubectl -n "$NS" logs job/site-publish
kubectl -n "$NS" delete configmap site-dist --ignore-not-found >/dev/null
