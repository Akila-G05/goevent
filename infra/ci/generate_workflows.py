"""Maintainer generator; refs resolved and recorded in tools.lock.json before use."""
import json
from pathlib import Path
lock=json.loads(Path('infra/ci/tools.lock.json').read_text())
def write(name,text):
 for repo,entry in lock.items():
  if isinstance(entry,dict) and 'sha' in entry:text=text.replace('@'+repo+'@',repo+'@'+entry['sha'])
 Path('.github/workflows/'+name).write_text(text)
write('pr-ci.yml','''name: GoEvent gates
on:
  pull_request:
    branches: [main]
  workflow_call:
permissions:
  contents: read
concurrency:
  group: gates-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
jobs:
  java:
    name: Java tests (${{ matrix.module }})
    runs-on: ubuntu-24.04
    timeout-minutes: 30
    strategy:
      fail-fast: false
      matrix:
        module: [backend, gateway]
    steps:
      - uses: @actions/checkout@
        with:
          persist-credentials: false
      - uses: @actions/setup-java@
        with:
          distribution: temurin
          java-version: '21'
      - run: mvn -B -ntp -Dmaven.compiler.release=21 -f "$MODULE/pom.xml" clean verify
        env:
          MODULE: ${{ matrix.module }}
      - uses: @actions/upload-artifact@
        if: always()
        with:
          name: java-results-${{ matrix.module }}
          path: '**/target/surefire-reports/*.xml'
          retention-days: 3
  frontend:
    name: Bun frontend
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    steps:
      - uses: @actions/checkout@
        with:
          persist-credentials: false
      - uses: @oven-sh/setup-bun@
        with:
          bun-version: '1.4.4'
      - working-directory: frontend
        run: |
          bun install --frozen-lockfile
          bun run typecheck
          bun run lint
          bun run test
          bun run build
        env:
          NEXT_PUBLIC_API_BASE_URL: /api/v1
          BACKEND_URL: http://127.0.0.1:8080
  security:
    name: Security policy
    runs-on: ubuntu-24.04
    timeout-minutes: 30
    steps:
      - uses: @actions/checkout@
        with:
          persist-credentials: false
          fetch-depth: 0
      - uses: @actions/setup-python@
        with:
          python-version: '3.13'
      - run: |
          pip install -r infra/ci/requirements.lock
          python3 infra/ci/bootstrap.py
          sh infra/ci/security.sh
        env:
          GH_TOKEN: ${{ github.token }}
      - uses: @actions/upload-artifact@
        if: always()
        with:
          name: security-reports
          path: infra/validation/reports/
          retention-days: 3
  images:
    name: Container security
    runs-on: ubuntu-24.04
    timeout-minutes: 60
    steps:
      - uses: @actions/checkout@
        with:
          persist-credentials: false
      - run: sh infra/ci/images.sh
      - uses: @actions/upload-artifact@
        if: always()
        with:
          name: image-reports
          path: infra/validation/reports/
          retention-days: 3
      - uses: @actions/upload-artifact@
        if: success() && github.event_name == 'push' && github.ref == 'refs/heads/main'
        with:
          name: tested-images
          path: infra/validation/*-image.tar
          retention-days: 3
''')
write('publish-acr.yml','''name: Trusted ACR publication
on:
  push:
    branches: [main]
permissions:
  contents: read
concurrency:
  group: acr-main
  cancel-in-progress: false
jobs:
  gates:
    uses: $/.github/workflows/pr-ci.yml
  publish:
    name: Publish approved digests
    needs: gates
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-24.04
    timeout-minutes: 30
    environment: goevent-publish
    permissions:
      contents: read
      id-token: write
      attestations: write
    env:
      AZURE_CLIENT_ID: ${{ vars.AZURE_CLIENT_ID }}
      AZURE_TENANT_ID: ${{ vars.AZURE_TENANT_ID }}
      AZURE_SUBSCRIPTION_ID: ${{ vars.AZURE_SUBSCRIPTION_ID }}
      AZURE_ACR_NAME: ${{ vars.AZURE_ACR_NAME }}
      AZURE_ACR_LOGIN_SERVER: ${{ vars.AZURE_ACR_LOGIN_SERVER }}
      MIGRATION_BACKWARD_COMPATIBLE: ${{ vars.MIGRATION_BACKWARD_COMPATIBLE }}
      GH_TOKEN: ${{ github.token }}
    steps:
      - uses: @actions/checkout@
        with:
          persist-credentials: false
      - uses: @actions/download-artifact@
        with:
          name: tested-images
          path: infra/validation
      - uses: @actions/download-artifact@
        with:
          name: image-reports
          path: infra/validation/reports
      - run: python3 -c 'import os,sys;sys.path.insert(0,"infra/deploy");from policy import guard_environment;guard_environment(os.environ)'
      - uses: @azure/login@
        with:
          client-id: ${{ vars.AZURE_CLIENT_ID }}
          tenant-id: ${{ vars.AZURE_TENANT_ID }}
          subscription-id: ${{ vars.AZURE_SUBSCRIPTION_ID }}
      - id: publish
        run: sh infra/ci/publish.sh
      - uses: @actions/attest-build-provenance@
        with:
          subject-name: ${{ vars.AZURE_ACR_LOGIN_SERVER }}/goevent/backend
          subject-digest: ${{ steps.publish.outputs.backend }}
          push-to-registry: true
      - uses: @actions/attest-build-provenance@
        with:
          subject-name: ${{ vars.AZURE_ACR_LOGIN_SERVER }}/goevent/gateway
          subject-digest: ${{ steps.publish.outputs.gateway }}
          push-to-registry: true
      - uses: @actions/upload-artifact@
        with:
          name: deployment-candidate
          path: infra/validation/release/
          retention-days: 7
''')
write('promote-production.yml','''name: Approve production intent
on:
  workflow_dispatch:
    inputs:
      build_run_id:
        description: Successful trusted publication run ID (not an image digest)
        type: string
        required: true
permissions:
  contents: read
concurrency:
  group: production-promotion
  cancel-in-progress: false
jobs:
  promote:
    name: Promote trusted candidate
    if: github.ref == 'refs/heads/main'
    environment: goevent-production
    runs-on: ubuntu-24.04
    timeout-minutes: 15
    permissions:
      contents: read
      actions: read
      id-token: write
    env:
      GH_TOKEN: ${{ github.token }}
      BUILD_RUN_ID: ${{ inputs.build_run_id }}
      AZURE_ACR_LOGIN_SERVER: ${{ vars.AZURE_ACR_LOGIN_SERVER }}
      DELIVERY_ENABLED: ${{ vars.GOEVENT_BLOB_DELIVERY_APPROVED }}
      STORAGE_ACCOUNT: ${{ vars.AZURE_RELEASE_STORAGE_ACCOUNT }}
      STORAGE_CONTAINER: ${{ vars.AZURE_RELEASE_CONTAINER }}
    steps:
      - uses: @actions/checkout@
        with:
          persist-credentials: false
      - run: |
          test "$DELIVERY_ENABLED" = true
          test -n "$STORAGE_ACCOUNT"
          test -n "$STORAGE_CONTAINER"
          python3 infra/ci/promote.py
      - uses: @azure/login@
        with:
          client-id: ${{ vars.AZURE_CLIENT_ID }}
          tenant-id: ${{ vars.AZURE_TENANT_ID }}
          subscription-id: ${{ vars.AZURE_SUBSCRIPTION_ID }}
      - run: |
          az storage blob upload --auth-mode login --account-name "$STORAGE_ACCOUNT" --container-name "$STORAGE_CONTAINER" --name "intents/$BUILD_RUN_ID-$GITHUB_RUN_ID.json" --file intent.json --overwrite false --output none
''')
# Preserve legacy job behavior while restricting permissions and pinning actions.
p=Path('.github/workflows/ci.yml');s=p.read_text()
for repo,e in lock.items():
 if isinstance(e,dict) and 'sha' in e:s=s.replace(repo+'@'+e['ref'],repo+'@'+e['sha'])
if '\npermissions:' not in s:s=s.replace('\njobs:', '\npermissions:\n  contents: read\n\nconcurrency:\n  group: legacy-${{ github.workflow }}-${{ github.ref }}\n  cancel-in-progress: true\n\njobs:',1)
p.write_text(s)
# Inline the identical gates in trusted publication: avoids differences between
# GitHub's new self-repository syntax and actionlint's current reusable parser.
p=Path('.github/workflows/publish-acr.yml')
pr=Path('.github/workflows/pr-ci.yml').read_text()
gates=pr.split('jobs:\n',1)[1]
s=p.read_text().replace('jobs:\n  gates:\n    uses: $/.github/workflows/pr-ci.yml\n  publish:', 'jobs:\n'+gates+'  publish:').replace('needs: gates','needs: [java, frontend, security, images]')
p.write_text(s)
