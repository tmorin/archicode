# ArchiCode

CLI tool (Quarkus + Picocli) for architecture-as-code: reads a `workspace.yaml` + manifests and renders C4/ArchiMate views (PlantUML).

## Build & Test

```bash
./mvnw clean install       # build
./mvnw test                 # unit tests only
./mvnw verify                # unit + integration tests (what CI runs)
```

Integration tests (Failsafe) are skipped by default (`skipITs=true` in pom.xml) unless run with `-Dnative` or on the `native` profile.

Viewpoint kernel (Rust compiled to WebAssembly, shared by the CLI and the standalone editor — see `src/main/rust/viewpoint-kernel/README.md`):

```bash
cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml
src/main/rust/viewpoint-kernel/embed.sh                  # after changing the Rust: rebuilds and re-embeds the .wasm
node --test "src/test/javascript/**/*.test.js"           # kernel and standalone editor vs. the views the CLI generates
```

Maven needs no Rust: `src/main/wasm/viewpoint_kernel.wasm` is committed.

Format Java sources (no npm script is wired up, so call Prettier directly):

```bash
npx prettier --write "src/**/*.java"
```

## JDK version

This project builds and runs on Java 25 — `.sdkmanrc`, `pom.xml` (`maven.compiler.release`), and CI (`.github/workflows/ci-build.yaml`) all pin or target Java 25 consistently. There is no version drift between them to work around.

## Architecture

Entry point is a Picocli `@TopCommand` (`cli/ArchiCode.java`) with the subcommand groups `ViewsGroup`, `QueryGroup`, `EditorGroup` and `PlateauGroup` and the command `DiffCommand`. Flow:

```
workspace.yaml --> workspace/WorkspaceFactory --> manifest/ManifestParser
                 --> resource/element/{application,technology}, resource/view
                 --> viewpoint/ (view assembly: an adapter around the viewpoint kernel, Rust compiled to WebAssembly)
                 --> rendering/plantuml (PlantUML output)
```

Facets (`settings.facets`) are evaluated by the same kernel, as standard JSONPath (RFC 9535, `serde_json_path`): `WorkspaceFactory` hands it the JSON of the workspace (`apply_facet`), the editor hands it the elements of the view. Jayway is still used by the `query` commands only. An action that removes an element removes in the same step what points at it (relationships, `uses`, `applications`), so a facet can hide an element without a `dangling reference`; it is silent about it. The earlier Jayway dialect of facets (`anyof`, `noneof`, `== null`) is rewritten with a warning, until a future major version removes it.

Plateaus (`settings.plateaus`, each a complete folder of manifests; `settings.current`, `--plateau`): `workspace/Plateaus` validates and selects one, `workspace/PlateauAdder` backs `plateau add`, and `WorkspaceFactory` loads one plateau per call (views go to `views-<plateau>`). The kernel has three entry points: `compute` (views), `apply_facet` and `compare` (two plateaus in, the union with a `change` on every element and relationship and a sorted table of changes out; `compute` takes that `change` back). An element of the more recent plateau may say `replaces: [ref, ...]` (references of the baseline; never guessed, read by `compare` only, kernel contract 4): it is then `moved`, `split` or `merged` and the replaced ones are no longer `removed`. `compare` also lists candidates (same kind and a name that no other removed and no other new element of that kind has, a close description or a lone sibling), never applied: the CLI prints them only for a plateau that already uses `replaces`, the editor proposes them for any comparison. The computed states are `new`, `changed`, `removed`, `moved`, `split`, `merged` and, for a box that only contains changes, `contains-changes`: stereotypes added last to the box, with a default style that `styles.by-tags` overrides property by property, and given only to a box that has the state computed (a hand-written state word that disagrees is only the author's stereotype, and the command says so on the error output, as it does for the warnings of `replaces`, see below). `archicode diff` and `views generate --baseline` write the table (`gap.md`, `gap.json`, with the identity and the candidates) and `views-<plateau>-vs-<base>`; the editor compares the drawn plateau with another one under the same root handle (Compare to, Changes panel with *Write replaces* and *Not related*, Changes only) and moves an element under another parent (*Move*: children follow, references rewritten in every file, `replaces` written for the element and each element inside it). Every edit goes through the line-preserving save, and anything that changes a model must end in `rebuildIndexAndRender()` or call `modelsChanged()`: the comparison cache, the diagram cache and the cache of the quiet references are keyed on that version counter (plus the small parts that vary: facet, viewpoint, options), not on the serialised models or the kernel input (issues #32 and #37). A workspace without plateaus is byte-identical to before; `..` and absolute paths in `manifests.paths` are refused, and so is a reference declared twice.

Where the manifests are: an entry of `settings.manifests.paths` that ends in `/**` is read recursively, any other entry reads the files directly in its folder. `manifest/ManifestDiscovery` (the command line) and `readManifestFolder` in `standalone.html` (the editor) apply one rule, run on one list of cases, `src/test/javascript/viewpoint-kernel/discovery-cases.json`, by `ManifestDiscoveryTest` and `discovery.test.js`: files sorted by their path from the folder of `workspace.yaml`, compared by Unicode code point; below a `/**` path, no hidden file or folder, no link to a folder (`link` in the list of `editor serve`), and no folder of the generated views (`views.path` at its depth, and the folders beside it that begin with its name and a dash); `**` anywhere else in an entry is a one-line error (`Plateaus.select`, `selectPlateau`). A change to the rule is a change to the cases file.

Errors and warnings: `cli/ErrorOutput` is the error path of every command (installed on the Quarkus `CommandLine` by `cli/CommandLineConfiguration`, and by the tests through `errorOutput.install(commandLine)`): a failure the author can act on (`ArchiCodeException`, a manifest or workspace file that is not valid or absent, a file or folder the file system refuses, a port in use; the most precise cause in the chain wins, and an `IOException` that is not about a file is a bug) is `error: <one line>` on the error output with exit code 1 and no stack trace, a usage error keeps picocli's code 2, and an unexpected exception keeps its trace. Nothing uses `log.warn` for the user, since `quarkus.log.level=ERROR` hides it: a warning goes through the `Warnings` bean (`warn`, `warnAll`), de-duplicated, and `ErrorOutput` prints it as `warning: ...` when the command ends (before the error, if it fails). Facet rewrites, a story step on an undeclared view, a skipped viewpoint, `Comparison.getWarnings()` and `StateTags` use it. The editor refuses the same manifests and `workspace.yaml` with the same sentences (`READ_SCHEMA` in `standalone.html`: the keys, shapes and kinds of each class; `EditorReadSchemaTest` compares it with the classes, so a class that gains a key fails until the page knows it; the cases both tools run are in `src/test/resources/brightcart/negative-cases.json`). `AbstractElement.replaces` is read as a `Replaces` (a set of the references that also keeps the JSON as written), which `KernelGraph` hands to the kernel, so that the kernel's warnings about a duplicate, a non-reference entry and a non-list fire from the CLI.

## Conventions

- Lombok is used pervasively: `@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)` + `@RequiredArgsConstructor` for DI-injected fields, `@Slf4j` for logging, `@SneakyThrows` instead of checked-exception boilerplate.
- SonarCloud is no longer part of CI (removed — see git history). Existing `@SuppressWarnings("java:S____")` annotations are inert leftovers from when it was; no new ones need to follow that pattern.

- Every file, example or fixture the repository ships is loaded by the command line and by the editor in a test. What fails today is pinned by a test that checks the author's error message (one `error:` line, no stack trace), or it is not shipped. A wave that ships such files names, in its plan, the test that does this for each form of them.

## Commit messages

Conventional Commits, no scope except on release commits: `feat: ...`, `fix: ...`, `chore: ...`. (Early history used `feature:`; that was abandoned in favor of `feat:` — don't revive it.) Release commits from `maven-release-plugin` are the only ones with a scope: `chore(release): archicode-X.Y.Z`.

## Release

Cut via `maven-release-plugin`. Commit messages use a `chore:` prefix, release commits are `chore(release): archicode-X.Y.Z`. Tag pushes trigger publishing the site to GitHub Pages: the presentation page (`src/site/index.html`) at the root, the Asciidoctor manual (`src/doc`, built to `target/generated-docs`) at `/docs/`, and the editor at `/editor/`.
