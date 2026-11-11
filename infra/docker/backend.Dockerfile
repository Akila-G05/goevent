# syntax=docker/dockerfile:1
# Build from repo root: docker build -f infra/docker/backend.Dockerfile -t goevent-backend:dev ./backend
ARG MAVEN_IMAGE=maven:3.9.9-eclipse-temurin-21@sha256:3a4ab3276a087bf276f79cae96b1af04f53731bec53fb2e651aca79e4b10211e
ARG JAVA_IMAGE=eclipse-temurin:21-jre-jammy@sha256:1eac8b8fee11ca7d6725a48bc5d41992ed1561504ebae25490d2d062847e8269
FROM ${MAVEN_IMAGE} AS build
WORKDIR /build
COPY pom.xml ./pom.xml
COPY src/main/ ./src/main/
# Packaging only: database tests run separately in CI. No Docker socket or DB is needed.
# The existing POM builds a plain WAR; this CLI goal adds a Boot launcher without editing it.
RUN --mount=type=cache,id=goevent-maven-21,target=/root/.m2,sharing=locked \
    mvn -B -ntp -Dmaven.test.skip=true -Dmaven.compiler.release=21 package \
      org.springframework.boot:spring-boot-maven-plugin:4.0.9:repackage
WORKDIR /out
RUN cp /build/target/goevent-1.0-SNAPSHOT.war /out/app.war \
    && jar xf app.war META-INF/MANIFEST.MF \
    && grep -q '^Main-Class: org.springframework.boot.loader.launch.WarLauncher' META-INF/MANIFEST.MF \
    && grep -q '^Start-Class: com.goevent.GoeventApplication' META-INF/MANIFEST.MF

FROM ${JAVA_IMAGE} AS runtime
ARG APT_SECURITY_VERSION=2.4.15ubuntu0.1
# CVE-2026-109518: upstream digest predates the Jammy fix. Disable the
# vulnerable retry behavior while bootstrapping the authenticated package update.
RUN apt-get -o Acquire::Retries=0 update \
    && apt-get -o Acquire::Retries=0 install -y --no-install-recommends --only-upgrade apt=${APT_SECURITY_VERSION} libapt-pkg6.0=${APT_SECURITY_VERSION} \
    && dpkg --compare-versions "$(dpkg-query -W -f='${Version}' apt)" ge 2.4.15ubuntu0.1 \
    && dpkg --compare-versions "$(dpkg-query -W -f='${Version}' libapt-pkg6.0)" ge 2.4.15ubuntu0.1 \
    && rm -rf /var/lib/apt/lists/*
RUN groupadd --system --gid 10001 goevent \
    && useradd --system --uid 10001 --gid goevent --home-dir /app \
      --no-create-home --shell /usr/sbin/nologin goevent \
    && mkdir -p /app/logs \
    && chown 10001:10001 /app/logs \
    && chmod 0750 /app/logs
WORKDIR /app
COPY --from=build --chmod=0444 /out/app.war /app/app.war
USER 10001:10001
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "/app/app.war"]
