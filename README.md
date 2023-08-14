# ArchiCode

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=tmorin_archicode&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=tmorin_archicode)

> Streamline architectural design and visualization with an as-code approach. Integrates C4 Model and ArchiMate for efficient workflow.

## Run

```shell
docker run -v "$(pwd):/wks" --rm ghcr.io/tmorin/archicode:0.1.0-SNAPSHOT --help
```

```shell
docker run -v "$(pwd):/wks" --rm ghcr.io/tmorin/archicode:0.1.0-SNAPSHOT views generate
```

```shell
docker run -v "$(pwd):/wks" --rm ghcr.io/tmorin/archicode:0.1.0-SNAPSHOT query schemas workspace
```

```shell
docker run -v "$(pwd):/wks" --rm ghcr.io/tmorin/archicode:0.1.0-SNAPSHOT query schemas manifest
```

## Build

```shell
./mvnw package -Dquarkus.container-image.build=true
```

```shell
./mvnw package -Dquarkus.container-image.build=true -Dmaven.test.skip
```

```shell
./mvnw clean package -Dquarkus.container-image.build=true
```
