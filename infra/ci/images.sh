#!/bin/sh
set -eu
mkdir -p infra/validation/reports
scanner=aquasec/trivy@sha256:790fd66d1697395d8693d1acaa1ea702406a20f109b6fc7bac8db623eca6c06c
for component in backend gateway; do
    docker build -f "infra/docker/$component.Dockerfile" -t "goevent-$component:infra-check" "./$component"
    docker save "goevent-$component:infra-check" -o "infra/validation/$component-image.tar"
done
docker build -f infra/docker/caddy.Dockerfile -t goevent-caddy:infra-check infra/docker
docker save goevent-caddy:infra-check -o infra/validation/caddy-image.tar
failure=0
for component in backend gateway caddy; do
    # Each scan has a fresh private cache; never concurrently share a writable Trivy cache.
    # First capture JSON with gating, then print it using a trusted local parser.
    result=0
    docker run --rm -v "$PWD/infra/validation/$component-image.tar:/image.tar:ro" "$scanner" image --input /image.tar --db-repository ghcr.io/aquasecurity/trivy-db:2 --java-db-repository ghcr.io/aquasecurity/trivy-java-db:1 --timeout 20m --list-all-pkgs --scanners vuln,secret --severity HIGH,CRITICAL --exit-code 1 --format json > "infra/validation/$component-scan.raw.json" || result=$?
    if python3 infra/ci/scan_summary.py "infra/validation/$component-scan.raw.json" "infra/validation/reports/$component.json"; then
        docker run --rm --network none -v "$PWD/infra/validation/reports/$component.json:/report.json:ro" "$scanner" convert --format cyclonedx /report.json > "infra/validation/reports/$component-sbom.json" || failure=1
    else
        failure=1
    fi
    test "$result" -eq 0 || failure=1
done
# Runtime dependencies are pinned third-party images, and must pass the same vulnerability/secret gate.
CADDY_IMAGE=acrgoevent.azurecr.io/goevent/caddy@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa GOEVENT_API_DOMAIN=scan.example.invalid docker compose -f infra/compose/dependencies.yml config --format json > infra/validation/dependencies.json
component=redis
image=$(python3 -c 'import json,sys; print(json.load(open("infra/validation/dependencies.json"))["services"][sys.argv[1]]["image"])' "$component")
result=0
docker run --rm "$scanner" image "$image" --db-repository ghcr.io/aquasecurity/trivy-db:2 --timeout 20m --list-all-pkgs --scanners vuln,secret --severity HIGH,CRITICAL --exit-code 1 --format json > "infra/validation/$component-scan.raw.json" || result=$?
if python3 infra/ci/scan_summary.py "infra/validation/$component-scan.raw.json" "infra/validation/reports/$component.json"; then
    docker run --rm --network none -v "$PWD/infra/validation/reports/$component.json:/report.json:ro" "$scanner" convert --format cyclonedx /report.json > "infra/validation/reports/$component-sbom.json" || failure=1
else
    failure=1
fi
test "$result" -eq 0 || failure=1
infra/validate-images.sh || failure=1
exit "$failure"
