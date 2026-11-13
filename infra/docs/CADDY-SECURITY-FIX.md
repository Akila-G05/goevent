# Caddy dependency remediation and blast radius

The official Caddy 2.11.9 image includes go-jose/v3 3.0.5 and x/net 0.60.0,
reported as HIGH by the mandatory image gate (CVE-2026-116587 and
CVE-2026-78661). There is no patched go-jose/v3 release in the advisory.
The temporary custom build pins upstream Caddy commit
7591cff1fb03202ce022982af020197f3f387220, whose dependency graph removes v3
and uses x/net 0.62.0. The source archive checksum and builder/runtime image
digests are pinned. The existing official runtime supplies CA certificates and
filesystem layout; only its Caddy binary is replaced. This is an unreleased
upstream revision: review its changes and staging behavior before activation.

## Impact and compatibility

- Affected: Caddy binary, dependency smoke, container scans/SBOMs, trusted ACR
  publisher/provenance, and operator-selected dependency image.
- Unchanged: application source/API/DTOs, database schema/migrations, MySQL
  Compose/bootstrap, frontend build, app-pair manifest and rollback algorithm.
- Caddy still proxies the same API prefix, sets the same trusted proxy headers,
  uses the same config/persistence mounts, and retains existing UID, networks,
  ports, resource limits and no-restart policy.
- Failure effects: a build/scan/smoke failure blocks publication of all images;
  Caddy startup failure can interrupt HTTPS ingress. Review config validation,
  HTTPS, redirects, OAuth, forwarded headers, cookies and proxy behavior in
  isolated staging before approving the dependency.
- Rollback: retain the previous approved clean Caddy digest and persistent
  certificate directory. Reverting an application release does not change
  Caddy. Do not reactivate the vulnerable digest as an automatic fallback.

## Publication and operator handoff

The trusted main workflow builds and scans the actual custom image tar, publishes
it as `acrgoevent.azurecr.io/goevent/caddy:<exact Git commit>`, retrieves its
immutable digest, and attests it through the existing OIDC workflow. Candidate
metadata records the Caddy digest separately from the backend/gateway manifest.
No dependency is automatically deployed by this change.

Before publication the Azure owner must extend the existing repository-scoped
publisher Writer ABAC condition to `goevent/caddy`, and grant the VM identity
repository-scoped Reader access for that repository. Keep existing scopes; do
not grant registry-wide/catalog permissions. These Azure changes are not made
by repository scripts. Missing access must fail publication.

Before isolated activation, inspect `caddy-candidate.json` from a successful
trusted publishing run and independently approve its commit and digest. Set
`CADDY_IMAGE` to exactly `acrgoevent.azurecr.io/goevent/caddy@sha256:<64 hex>`.
Verify provenance with the approved commit:

```sh
: "${CADDY_IMAGE:?reviewed immutable Caddy image required}"
: "${APPROVED_COMMIT:?reviewed repository commit required}"
export CADDY_IMAGE APPROVED_COMMIT
python3 -c 'import os,re; assert re.fullmatch(r"acrgoevent\.azurecr\.io/goevent/caddy@sha256:[0-9a-f]{64}",os.environ["CADDY_IMAGE"]); assert re.fullmatch(r"[0-9a-f]{40}",os.environ["APPROVED_COMMIT"])'
gh attestation verify "oci://$CADDY_IMAGE" --repo VinuraY/goevent \
  --signer-workflow VinuraY/goevent/.github/workflows/publish-acr.yml \
  --signer-digest "$APPROVED_COMMIT" --source-digest "$APPROVED_COMMIT" \
  --source-ref refs/heads/main --deny-self-hosted-runners
```

Use the existing disabled staging procedure after verification. Blob delivery
and operator policy remain disabled. Replace this temporary source build with
a scanned official release once available; update smoke and publication together.
