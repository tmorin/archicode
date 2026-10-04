# ArchiCode

CLI tool (Quarkus + Picocli) for architecture-as-code: reads a `workspace.yaml` + manifests and renders C4/ArchiMate views (PlantUML).

## Build & Test

```bash
./mvnw clean install       # build
./mvnw test                 # unit tests only
./mvnw verify                # unit + integration tests (what CI runs)
```

Integration tests (Failsafe) are skipped by default (`skipITs=true` in pom.xml) unless run with `-Dnative` or on the `native` profile.

Format Java sources (no npm script is wired up, so call Prettier directly):

```bash
npx prettier --write "src/**/*.java"
```

## JDK version gotcha

`.sdkmanrc` pins Java 17.0.8-tem, but `pom.xml` requires `maven.compiler.release=21`. The 17 pin is stale — use JDK 21 to build. Don't "fix" the JDK down to 17 to match `.sdkmanrc`.

## Architecture

Entry point is a Picocli `@TopCommand` (`cli/ArchiCode.java`) with two subcommand groups, `ViewsGroup` and `QueryGroup`. Flow:

```
workspace.yaml --> workspace/WorkspaceFactory --> manifest/ManifestParser
                 --> resource/element/{application,technology}, resource/view
                 --> viewpoint/{deep,detailed,overview} (view assembly)
                 --> rendering/plantuml (PlantUML output)
```

## Conventions

- Lombok is used pervasively: `@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)` + `@RequiredArgsConstructor` for DI-injected fields, `@Slf4j` for logging, `@SneakyThrows` instead of checked-exception boilerplate.
- SonarCloud (`tmorin_archicode` project) gates CI. Accepted/false-positive findings are suppressed inline with `@SuppressWarnings("java:S____")` rather than disabled project-wide — follow that pattern instead of broadening suppression scope.

## Commit messages

Conventional Commits, no scope except on release commits: `feat: ...`, `fix: ...`, `chore: ...`. (Early history used `feature:`; that was abandoned in favor of `feat:` — don't revive it.) Release commits from `maven-release-plugin` are the only ones with a scope: `chore(release): archicode-X.Y.Z`.

## Release

Cut via `maven-release-plugin`. Commit messages use a `chore:` prefix, release commits are `chore(release): archicode-X.Y.Z`. Tag pushes trigger publishing the Asciidoctor site (`src/doc`, built to `target/generated-docs`) to GitHub Pages.
