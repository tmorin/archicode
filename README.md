# ArchiCode

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=tmorin_archicode&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=tmorin_archicode)

> Streamline architectural design and visualization with an as-code approach. Integrates C4 Model and ArchiMate for efficient workflow.

## Run

The following commands assume the ArchiCode workspace is located in the current directory.

**Show the help information**

```shell
docker run \
  -u "$(id -u):$(id -g)" \
  -v "$(pwd):/workdir" -w "/workdir" \
  --rm ghcr.io/tmorin/archicode --help
```

**Generate all views**

```shell
docker run \
  -u "$(id -u):$(id -g)" \
  -v "$(pwd):/workdir" -w "/workdir" \
  --rm ghcr.io/tmorin/archicode views generate
```

**Get the JSON schema for the Workspace resource**

```shell
docker run \
  -u "$(id -u):$(id -g)" \
  -v "$(pwd):/workdir" -w "/workdir" \
  --rm ghcr.io/tmorin/archicode query schemas workspace
```

**Get the JSON schema for the Manifest resource**

```shell
docker run \
  -u "$(id -u):$(id -g)" \
  -v "$(pwd):/workdir" -w "/workdir" \
  --rm ghcr.io/tmorin/archicode query schemas manifest
```

## Maintenance

**Dependencies upgrade**

```shell
./mvnw versions:display-dependency-updates
```

**Quarkus update**

```shell
./mvnw quarkus:update
```

**Release**

```shell
./mvnw --batch-mode release:clean \
&& ./mvnw --batch-mode release:prepare \
  -DreleaseVersion=X.Y.Z \
  -DdevelopmentVersion=Y.X.Z-SNAPSHOT
```

**Build package and OIC image**

```shell
./mvnw package -Dquarkus.container-image.build=true
```

**Build package and OIC image without test execution**

```shell
./mvnw package -Dquarkus.container-image.build=true -Dmaven.test.skip
```

```shell
./mvnw clean package -Dquarkus.container-image.build=true
```
