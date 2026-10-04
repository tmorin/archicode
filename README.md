# ArchiCode

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

**Serve the manifest editor**

```shell
docker run \
  -u "$(id -u):$(id -g)" \
  -v "$(pwd):/workdir" -w "/workdir" \
  -p 127.0.0.1:8080:8080 \
  --rm ghcr.io/tmorin/archicode editor serve
```

`editor serve` has no authentication, so the host-side port mapping above is
the only guard against exposure: `-p 127.0.0.1:8080:8080` keeps the server
reachable from this machine only. The container itself must still listen on
`0.0.0.0` internally for Docker's `-p` to forward traffic at all — mapping
to `-p 8080:8080` instead would expose it to the whole LAN.

Opening `http://127.0.0.1:8080/` in a browser serves the manifest editor
webapp itself: browse the manifest tree, view the resolved dependency
graph, and edit and save a manifest with validation errors shown inline.

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
