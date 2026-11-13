# syntax=docker/dockerfile:1
# Temporary upstream fix until an official Caddy release removes go-jose/v3.
FROM golang:1-alpine@sha256:eb61c3873c97416fff0116553fff65d67a3549f72e11d9758849a689cdd8b523 AS build
ADD --checksum=sha256:9d2d509e9d2d5fd1432491264656dee53c19b70ff8fbfd4935166ab672fd6efd https://codeload.github.com/caddyserver/caddy/tar.gz/7591cff1fb03202ce022982af020197f3f387220 /src.tar.gz
WORKDIR /src
RUN tar -xzf /src.tar.gz --strip-components=1 \
    && CGO_ENABLED=0 go build -mod=readonly -trimpath -o /out/caddy ./cmd/caddy
# Retain the official runtime layout, CA certificates and entrypoint contract.
FROM caddy:2-alpine@sha256:78bd35025c7ba85961dd149ae670315129954e77abe2383ac47c89106b35ade9
COPY --from=build --chmod=0555 /out/caddy /usr/bin/caddy
USER 10001:10001
