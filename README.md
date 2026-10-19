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

**Compare two plateaus**

A workspace can have states, the plateaus, each a layer over another one: the manifests that say `plateau: <id>`
in their header, and a manifest of kind `archicode.morin.io/plateau` that lists what the layer changes.
`diff` tells what is new, changed and removed in a plateau, compared with the plateau it overrides, and what moved,
was split or merged when an element says what it `replaces`; `--against` names another plateau to compare with, and
`views generate` draws the comparison next to the views, and `diff --fail-on removed,moved` exits with the code 3 when
the comparison holds a change of one of the listed states, to fail a build. See "States of an architecture (plateaus)" in the manual.

```shell
docker run \
  -u "$(id -u):$(id -g)" \
  -v "$(pwd):/workdir" -w "/workdir" \
  --rm ghcr.io/tmorin/archicode diff
```

```shell
docker run \
  -u "$(id -u):$(id -g)" \
  -v "$(pwd):/workdir" -w "/workdir" \
  --rm ghcr.io/tmorin/archicode views generate --against baseline
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

**Open the editor on the workspace folder**

```shell
docker run \
  -u "$(id -u):$(id -g)" \
  -v "$(pwd):/workdir" -w "/workdir" \
  -p 127.0.0.1:48080:48080 \
  --rm ghcr.io/tmorin/archicode editor serve
```

The command prints a URL, `http://127.0.0.1:48080/?token=...`: opening it in a
browser serves the editor and opens the folder of `workspace.yaml` in it, with
nothing to pick (the page is refused without the token; the editor removes it
from the address bar, and a session cookie lets a reload in): browse the elements,
edit them, see their diagrams and the maps of the application and technology layers, and save. It works
in any browser. The same editor is published next to the manual, at
https://tmorin.github.io/archicode/editor/, and is a single file
(`standalone.html`): opened from there, or from a file, it asks for a folder
instead, which needs the File System Access API (Chrome, Edge, Brave, Opera).

The server writes to the folder, so it does not trust the network: the page
and every call carry a token that only the printed URL gives, a request must be addressed
to `localhost`, `127.0.0.1` or `[::1]` (`--allowed-host <name>` adds one, for a
server reached by name), a page of another origin is refused, and the editor
can only reach the `.yaml`, `.yml` and `.json` files below the folder of
`workspace.yaml`, never a hidden entry or a link that leaves it. The container
listens on `0.0.0.0` so that Docker's `-p` forwards traffic: keep the host side
of the mapping on `127.0.0.1` as above, since `-p 48080:48080` would expose the
port to the whole LAN. The workspace file must be named `workspace.yaml`;
`--workspace` points at one in another folder:

```shell
docker run \
  -u "$(id -u):$(id -g)" \
  -v "$(pwd):/workdir" -w "/workdir" \
  -p 127.0.0.1:48080:48080 \
  --rm ghcr.io/tmorin/archicode \
  --workspace ./architecture/workspace.yaml editor serve
```

The same works directly against a locally built jar, with no Docker and no
port mapping to reason about:

```shell
./mvnw package -Dquarkus.container-image.build=false -Dmaven.test.skip
java -jar target/quarkus-app/quarkus-run.jar \
  --workspace "$(pwd)/.custom/workspace.yaml" \
  editor serve --host 127.0.0.1 --port 48080
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
