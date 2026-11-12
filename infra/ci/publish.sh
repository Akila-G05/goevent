#!/bin/sh
set -eu
python3 -c 'import os,sys;sys.path.insert(0,"infra/deploy");from policy import guard_environment;guard_environment(os.environ)'
python3 -c 'import json,os,subprocess; assert json.loads(subprocess.check_output(["gh","api","repos/"+os.environ["GITHUB_REPOSITORY"]+"/branches/main"]))["protected"] is True, "main is not protected"'
mkdir -p infra/validation/release
az acr login --name "$AZURE_ACR_NAME" --output none
for component in backend gateway; do
    docker load -i "infra/validation/$component-image.tar"
    python3 infra/ci/acr_tags.py "goevent/$component"
    image="$AZURE_ACR_LOGIN_SERVER/goevent/$component:$GITHUB_SHA"
    docker tag "goevent-$component:infra-check" "$image"
    docker push "$image"
    digest=$(az acr repository show --name "$AZURE_ACR_NAME" --image "goevent/$component:$GITHUB_SHA" --query digest -o tsv)
    # Repository Writer permits metadata/read on this exact repository; no
    # catalog listing or broader registry role is required for digest lookup.
    printf '%s' "$digest" | python3 -c 'import re,sys; value=sys.stdin.read(); sys.exit(0 if re.fullmatch(r"sha256:[0-9a-f]{64}", value) else "invalid registry digest")'
    printf '%s=%s\n' "$component" "$digest" >> "$GITHUB_OUTPUT"
    printf '%s' "$digest" > "infra/validation/release/$component.digest"
done
python3 infra/ci/candidate.py
