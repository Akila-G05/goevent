#!/bin/sh
set -eu
export PATH="$PWD/infra/validation/bin:$PATH"
mkdir -p infra/validation/reports
python3 infra/ci/verify.py
python3 -m unittest discover -s infra/tests -v
actionlint
zizmor --format plain .github/workflows
find infra -path '*/validation/*' -prune -o -name '*.sh' -exec shellcheck {} +
hadolint infra/docker/backend.Dockerfile infra/docker/gateway.Dockerfile
gitleaks git --redact --report-format json --report-path infra/validation/reports/secrets.json
semgrep scan --config infra/security/semgrep.yml --error --metrics=off --json --output infra/validation/reports/sast.json backend/src gateway/src frontend/src
scanner=aquasec/trivy@sha256:790fd66d1697395d8693d1acaa1ea702406a20f109b6fc7bac8db623eca6c06c
docker run --rm -v "$PWD:/src:ro" "$scanner" config --skip-dirs /src/infra/validation --severity HIGH,CRITICAL --exit-code 1 /src/infra
docker run --rm -v "$PWD/frontend:/src:ro" "$scanner" fs --include-dev-deps --scanners vuln --severity HIGH,CRITICAL --exit-code 1 /src
