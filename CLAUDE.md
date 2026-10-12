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

Entry point is a Picocli `@TopCommand` (`cli/ArchiCode.java`) with two subcommand groups, `ViewsGroup` and `QueryGroup`. Flow:

```
workspace.yaml --> workspace/WorkspaceFactory --> manifest/ManifestParser
                 --> resource/element/{application,technology}, resource/view
                 --> viewpoint/ (view assembly: an adapter around the viewpoint kernel, Rust compiled to WebAssembly)
                 --> rendering/plantuml (PlantUML output)
```

## Conventions

- Lombok is used pervasively: `@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)` + `@RequiredArgsConstructor` for DI-injected fields, `@Slf4j` for logging, `@SneakyThrows` instead of checked-exception boilerplate.
- SonarCloud is no longer part of CI (removed — see git history). Existing `@SuppressWarnings("java:S____")` annotations are inert leftovers from when it was; no new ones need to follow that pattern.

## Commit messages

Conventional Commits, no scope except on release commits: `feat: ...`, `fix: ...`, `chore: ...`. (Early history used `feature:`; that was abandoned in favor of `feat:` — don't revive it.) Release commits from `maven-release-plugin` are the only ones with a scope: `chore(release): archicode-X.Y.Z`.

## Release

Cut via `maven-release-plugin`. Commit messages use a `chore:` prefix, release commits are `chore(release): archicode-X.Y.Z`. Tag pushes trigger publishing the site to GitHub Pages: the presentation page (`src/site/index.html`) at the root, the Asciidoctor manual (`src/doc`, built to `target/generated-docs`) at `/docs/`, and the editor at `/editor/`.
