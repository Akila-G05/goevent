#!/bin/sh
set -eu
python3 -c 'import os,sys;sys.path.insert(0,"infra/deploy");from policy import guard_environment;guard_environment(os.environ)'
python3 -c 'import json,os,subprocess; assert json.loads(subprocess.check_output(["gh","api","repos/"+os.environ["GITHUB_REPOSITORY"]+"/branches/main"]))["protected"] is True, "main is not protected"'
mkdir -p infra/validation/release
az acr login --name "$AZURE_ACR_NAME" --output none
for component in backend gateway; do
    docker load -i "infra/validation/$component-image.tar"
    az acr repository show-tags --name "$AZURE_ACR_NAME" --repository "goevent/$component" -o json > infra/validation/tags.json
    python3 -c 'import json,os; assert os.environ["GITHUB_SHA"] not in json.load(open("infra/validation/tags.json")), "commit tag already exists"'
    image="$AZURE_ACR_LOGIN_SERVER/goevent/$component:$GITHUB_SHA"
    docker tag "goevent-$component:infra-check" "$image"
    docker push "$image"
    digest=$(az acr repository show --name "$AZURE_ACR_NAME" --image "goevent/$component:$GITHUB_SHA" --query digest -o tsv)
    printf '%s=%s\n' "$component" "$digest" >> "$GITHUB_OUTPUT"
    printf '%s' "$digest" > "infra/validation/release/$component.digest"
done
python3 infra/ci/candidate.py
