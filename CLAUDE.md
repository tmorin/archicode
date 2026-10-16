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

Plateaus (`settings.plateaus`, each a complete folder of manifests; `settings.current`, `--plateau`): `workspace/Plateaus` validates and selects one, `workspace/PlateauAdder` backs `plateau add`, and `WorkspaceFactory` loads one plateau per call (views go to `views-<plateau>`). The kernel has three entry points: `compute` (views), `apply_facet` and `compare` (two plateaus in, the union with a `change` on every element and relationship and a sorted table of changes out; `compute` takes that `change` back). An element of the more recent plateau may say `replaces: [ref, ...]` (references of the baseline; never guessed, read by `compare` only, kernel contract 4): it is then `moved`, `split` or `merged` and the replaced ones are no longer `removed`. `compare` also lists candidates (same kind and a name, a close description or a lone sibling), never applied: the CLI prints them only for a plateau that already uses `replaces`, the editor proposes them for any comparison. The computed states are `new`, `changed`, `removed`, `moved`, `split`, `merged` and, for a box that only contains changes, `contains-changes`: stereotypes added last to the box, with a default style that `styles.by-tags` overrides property by property, and given only to a box that has the state computed (a hand-written state word that disagrees is only the author's stereotype, and the command says so on the error output, as it does for the warnings of `replaces`, see below). `archicode diff` and `views generate --baseline` write the table (`gap.md`, `gap.json`, with the identity and the candidates) and `views-<plateau>-vs-<base>`; the editor compares the drawn plateau with another one under the same root handle (Compare to, Changes panel with *Write replaces* and *Not related*, Changes only) and moves an element under another parent (*Move*: children follow, references rewritten in every file, `replaces` written for the element and each element inside it). Every edit goes through the line-preserving save, and anything that changes a model must end in `rebuildIndexAndRender()` or call `modelsChanged()`: the cache of the comparison is keyed on that version counter, not on the serialised models (the diagram caches still are, issue #37). A workspace without plateaus is byte-identical to before; `..` and absolute paths in `manifests.paths` are refused, and so is a reference declared twice.

Errors and warnings: `cli/ErrorOutput` is the error path of every command (installed on the Quarkus `CommandLine` by `cli/CommandLineConfiguration`, and by the tests through `errorOutput.install(commandLine)`): a failure the author can act on (`ArchiCodeException`, a manifest or workspace file that is not valid or absent, an I/O error) is `error: <one line>` on the error output with exit code 1 and no stack trace, a usage error keeps picocli's code 2, and an unexpected exception keeps its trace. Nothing uses `log.warn` for the user, since `quarkus.log.level=ERROR` hides it: a warning goes through the `Warnings` bean (`warn`, `warnAll`), de-duplicated, and `ErrorOutput` prints it as `warning: ...` when the command ends (before the error, if it fails). Facet rewrites, a story step on an undeclared view, a skipped viewpoint, `Comparison.getWarnings()` and `StateTags` use it. `AbstractElement.replaces` is read as a `Replaces` (a set of the references that also keeps the JSON as written), which `KernelGraph` hands to the kernel, so that the kernel's warnings about a duplicate, a non-reference entry and a non-list fire from the CLI.

## Conventions

- Lombok is used pervasively: `@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)` + `@RequiredArgsConstructor` for DI-injected fields, `@Slf4j` for logging, `@SneakyThrows` instead of checked-exception boilerplate.
- SonarCloud is no longer part of CI (removed — see git history). Existing `@SuppressWarnings("java:S____")` annotations are inert leftovers from when it was; no new ones need to follow that pattern.

## Commit messages

Conventional Commits, no scope except on release commits: `feat: ...`, `fix: ...`, `chore: ...`. (Early history used `feature:`; that was abandoned in favor of `feat:` — don't revive it.) Release commits from `maven-release-plugin` are the only ones with a scope: `chore(release): archicode-X.Y.Z`.

## Release

Cut via `maven-release-plugin`. Commit messages use a `chore:` prefix, release commits are `chore(release): archicode-X.Y.Z`. Tag pushes trigger publishing the site to GitHub Pages: the presentation page (`src/site/index.html`) at the root, the Asciidoctor manual (`src/doc`, built to `target/generated-docs`) at `/docs/`, and the editor at `/editor/`.
