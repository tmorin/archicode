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

The webapp's **Assist** tab turns a change described in plain language into
an edit of the real manifest files: the `claude` CLI applies it in place and
the result comes back as a diff to review. Nothing is final until the change
is accepted; discarding it restores the files byte-for-byte from a snapshot
taken before the invocation. A change left under review does not survive a
server restart — the files stay in their changed state, and on shutdown the
server prints a warning naming every affected path so they can be
hand-reverted.

This needs the Claude Code CLI (`claude`) on the host running `editor serve`,
and the published container image does not include it, so the `docker run`
example above cannot use this capability; it works when the server runs on a
host that has `claude` installed. The webapp says so on load rather than
failing when a change is submitted. `--no-claude` serves the editor without
the capability at all; otherwise `--claude-executable` (default `claude`),
`--claude-model` (default `sonnet`) and `--claude-timeout` (default `300`
seconds, after which one invocation is terminated) configure the invocation.

The boundary is the directory holding the workspace file, recursively — both
for what an invocation can write and for what a discard restores. A discard
therefore restores everything under that directory, not just the manifests,
and if that directory is a git repository it also reverts commits made during
the review window.

So point `--workspace` at a workspace file in a dedicated directory rather
than at a project root. `--workspace` defaults to `workspace.yaml` resolved
against the process's working directory, which in the `docker run` example
above is Docker's own `-w /workdir` mapped from `-v "$(pwd):/workdir"` — the
whole mounted project. A project root is also what makes the server refuse
the request: the capability will not take custody of a directory holding more
than 5000 files or 64 MiB, and the refusal reports what it actually found
("holds 50123 files, more than the 5000 …") rather than running anyway.

```shell
docker run \
  -u "$(id -u):$(id -g)" \
  -v "$(pwd):/workdir" -w "/workdir" \
  -p 127.0.0.1:8080:8080 \
  --rm ghcr.io/tmorin/archicode \
  --workspace ./architecture/workspace.yaml editor serve
```

(That example needs `claude` inside the image to use the Assist tab, which
the published image does not provide — it shows the `--workspace` form, not a
working Assist invocation.)

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
