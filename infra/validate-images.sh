#!/bin/sh
# Run from the repository root after local builds. Never starts an application.
set -eu
backend_image=${1:-goevent-backend:infra-check}
gateway_image=${2:-goevent-gateway:infra-check}

check_image() {
    image=$1
    archive=$2
    actual_user=$(docker image inspect --format '{{.Config.User}}' "$image")
    test "$actual_user" = '10001:10001'
    docker run --rm --network none --read-only \
        --cap-drop ALL --security-opt no-new-privileges=true \
        --tmpfs /tmp:rw,noexec,nosuid,size=64m \
        --tmpfs /app/logs:rw,noexec,nosuid,size=16m,uid=10001,gid=10001,mode=0750 \
        --entrypoint /bin/sh "$image" -ec '
            test "$(id -u)" = 10001
            test -r "$1"
            test ! -w "$1"
            test ! -w /app
            test -w /app/logs
            ! command -v mvn
            ! command -v javac
            java -version
        ' sh "$archive"
    printf 'PASS: %s non-root JRE, immutable archive, restricted offline runtime\n' "$image"
}

check_image "$backend_image" /app/app.war
check_image "$gateway_image" /app/app.jar
