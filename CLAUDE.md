# ArchiCode

CLI tool (Quarkus + Picocli) for architecture-as-code: reads a `.archicode.yaml` + manifests and renders C4/ArchiMate views (PlantUML).

## Where to read more

This file keeps what every session needs. The rest is in the `CLAUDE.md` of the folder you work in, which is loaded when you read files there. Read the one that matches your task before you change anything.

| If you work on | Read |
|---|---|
| The editor page: `src/main/editor`, the generated `standalone.html`, its layers, its checks and coverage, the browser workspace and the samples, links, highlight, columns and the address | [src/main/editor/CLAUDE.md](src/main/editor/CLAUDE.md) |
| The command line: the workspace file, facets, errors and warnings, the schema of the manifests, `guide`, `init`, static analysis | [src/main/java/io/morin/archicode/CLAUDE.md](src/main/java/io/morin/archicode/CLAUDE.md) |
| Plateaus, the discovery of manifests, the layered load, `plateau fold` | [src/main/java/io/morin/archicode/workspace/CLAUDE.md](src/main/java/io/morin/archicode/workspace/CLAUDE.md) |
| Viewpoints and the Map, its links and its highlight | [src/main/java/io/morin/archicode/viewpoint/CLAUDE.md](src/main/java/io/morin/archicode/viewpoint/CLAUDE.md) |
| The Rust kernel compiled to WebAssembly | [src/main/rust/viewpoint-kernel/CLAUDE.md](src/main/rust/viewpoint-kernel/CLAUDE.md) |
| Tests: integration tests, Java coverage, the end-to-end suite, the byte-identity harness | [src/test/CLAUDE.md](src/test/CLAUDE.md) |
| The CI workflow and the release of the binaries | [.github/CLAUDE.md](.github/CLAUDE.md) |

The manual is `src/doc/README.adoc`. The ArchiCode model of ArchiCode is in `docs/architecture/` (see below). The records of each wave and run are under `docs/wav/`.

## Rules that cross every area

- The command line and the editor read the same files and say the same sentences. The cases they share are JSON files under `src/test/javascript/viewpoint-kernel/` (and `src/test/resources/`), each read by a Java test and a node test: a change to a rule is a change to the cases file.
- `src/main/resources/editor-webapp/standalone.html` is generated. Edit `src/main/editor` and run `npm run editor:build`; a command that does not go through an npm `pre` script reads the committed page as it is.
- The kernel's WebAssembly (`src/main/wasm/viewpoint_kernel.wasm`) is committed and Maven needs no Rust.
- `scripts/byte-identity.sh` compares what the program writes with the jar of an earlier tag: an output that changes on purpose needs a declared exception.

## Build & Test

```bash
./mvnw clean install       # build
./mvnw test                 # unit tests only
./mvnw verify                # unit tests; the job `Java` of CI runs this
./mvnw verify -DskipITs=false  # unit tests, then the integration tests against the packaged jar
./mvnw verify -Dnative       # the native image and the integration tests against it, no unit tests (the Native job of CI; needs Mandrel or GraalVM)
./mvnw test-compile pmd:check  # PMD on src/main/java and src/test/java, nothing else: the command to run before a pull request (verify runs it too)
```

Format (Prettier, pinned by `package-lock.json`; run `npm ci` once; options in `.prettierrc.yaml`, files left out in `.prettierignore`: the generated editor page `standalone.html` stays out, since it is the output of `editor:build`; its sources in `src/main/editor` (`**/*.js`, `*.mjs` and `style.css`; not `page.html`, whose include lines are not HTML for Prettier) are covered since wave 024, run 0188, so format a part, then `npm run editor:build`, and commit both). `format:check` is the step "Check the format" of the job `Page` of CI; it covers `src/**/*.java`, `src/test/javascript/**/*.js`, the sources of the editor page and the generators `src/test/resources/**/*.mjs` (wave 023 run W-5, #160 step 2; the options for `*.js` and `*.mjs` are in `.prettierrc.yaml`; the reformatting is one commit of formatter output only, so `git blame --ignore-rev` can skip it; Prettier's member-chain layout may need two `--write` passes on a file, the committed files are fixed points):

```bash
npm run format          # writes
npm run format:check    # checks, exit 1 on a file that Prettier would change
```

Lint (ESLint 10, flat config `eslint.config.mjs`, pinned by `package-lock.json`; wave 023 run W-6, #160 step 4, decisions T8 and T9): bug rules only, none that Prettier owns (ESLint's recommended set plus `no-shadow` and `eqeqeq`; `no-unused-vars` ignores arguments and caught errors). `npm run lint` first runs `scripts/extract-editor-script.mjs`, which copies the three executable inline scripts of `standalone.html` (`theme-boot.js`, `module.mjs`, `page.js`) to `target/eslint-editor/` padded with blank lines, so that a finding `page.js:12345` is line 12345 of the HTML, then lints `src/test` (the JavaScript tests and the `.mjs` generators), the copies, the config and `scripts/`, with `--max-warnings 0`. It is the step "Lint the JavaScript" of the job `Page`, after the format check. There is no baseline file: a finding is fixed (in the page only by a rename or a deletion, the node suite and the comparison with the released page guarding it), or its rule is turned off in `eslint.config.mjs` with its count and its reason (today one: `no-control-regex` in the editor script, 16 findings that are the point of the code). `format:check` also covers `eslint.config.mjs` and `scripts/**/*.mjs`.

```bash
npm run lint            # extracts the page script, then ESLint; exit 1 on a finding
```

## JDK version

This project builds and runs on Java 25 — `.sdkmanrc`, `pom.xml` (`maven.compiler.release`), and CI (`.github/workflows/ci-build.yaml`) all pin or target Java 25 consistently. There is no version drift between them to work around.

## The model of ArchiCode

`docs/architecture/` is the ArchiCode model of ArchiCode, as it is (application layer: the command line by package, the kernel by entry point, the editor by its six layers, the contracts that couple them; a small technology layer; the saved views of `manifests/views/`; `tags.path` names the code of an element). To ask what a change touches, run `archicode query graph -w docs/architecture/.archicode.yaml` (from a build, `java -jar target/quarkus-app/quarkus-run.jar` stands for `archicode`) and follow the `relationships` whose `source` or `destination` is the element, with their `qualifiers` (the qualifiers the manifests use: `calls`, `generated from`, `imports`, `mirror of`, `query graph`, `reads`, `serves`, `upward`, `uses`, `validated by`). `ArchitectureImpactTest` fixes such questions in `src/test/javascript/architecture/impact-questions.json`, and `ArchitectureDriftTest` fails when a modeled editor layer is not in `src/main/editor/layers.json` in the same order or a `tags.path` does not exist. When a coupling changes on purpose, change the model and the question in the same commit. The model is also the second sample of the hosted editor (*Open the ArchiCode model*, `sample=archicode`, `samples/archicode.yaml`, a bundle made by `scripts/build-sample.mjs` like the Brightcart one, served as `GET /samples/archicode.yaml`): after any change under `docs/architecture` run `npm run sample:build`, or the step "Check the samples are the bundles of their folders" of the job `Page` fails.

## Architecture

Entry point is a Picocli `@TopCommand` (`cli/ArchiCode.java`; `-V`/`--version` is its alone and prints the one line `archicode <version>` through `cli/VersionProvider`, which reads `quarkus.application.version`, the `<version>` of the `pom.xml` fixed by the Quarkus build, so the jar, the image and the native runner each tell what they were built from, with nothing to read at run time and no resource to add to `quarkus.native.resources.includes`; exit 0, no workspace loaded; wave 021, run 0155, #149; the usage of every other command is unchanged) with the subcommand groups `ViewsGroup`, `QueryGroup`, `EditorGroup`, `PlateauGroup` and `StoriesGroup` and the command `DiffCommand`. Flow:

```
.archicode.yaml --> workspace/WorkspaceFactory --> manifest/ManifestParser
                 --> resource/element/{application,technology}, resource/view
                 --> viewpoint/ (view assembly: an adapter around the viewpoint kernel, Rust compiled to WebAssembly); the viewpoints are `overview`, `detailed`, `deep` and `map` (a view of `viewpoint: map` draws a whole layer, application or technology, folded, with the `pinned`, `hidden` and `opened` elements of its properties; the editor draws the same view on its pages Applications and Environments, the command line draws it when it is asked for by its id (`views generate --view`); the Map of the technology layer also draws the applications deployed on the nodes and the relationships, and each can be left out with `applications: false` and `relationships: false` in the properties of the view, see below; `src/test/resources/technology-map/expected-boxes.json` is the contract of the boxes and the links both tools draw on the saved maps of the example `domain_technology_map` and of the layered Brightcart, with the variants that leave the two parts out)
                 --> rendering/plantuml (PlantUML output)
```

## Conventions

- Lombok is used pervasively: `@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)` + `@RequiredArgsConstructor` for DI-injected fields, `@Slf4j` for logging, `@SneakyThrows` instead of checked-exception boilerplate.

- No Sonar server is part of CI (SonarCloud was removed, see git history). The `@SuppressWarnings("java:S...")` annotations that named it are gone (wave 023, run 0177); PMD is the analysis (see "Build & Test"), a rule is turned off in `src/main/pmd/ruleset.xml` with its count and its reason and never with an annotation, and a `// NOPMD` or `@SuppressWarnings("PMD...")` is not used. A comment says why a thing is as it is where the code cannot (a Picocli command injects its services into fields, as its options are).

- Every file, example or fixture the repository ships is loaded by the command line and by the editor in a test. What fails today is pinned by a test that checks the author's error message (one `error:` line, no stack trace), or it is not shipped. A wave that ships such files names, in its plan, the test that does this for each form of them.

## Commit messages

Conventional Commits, no scope except on release commits: `feat: ...`, `fix: ...`, `chore: ...`. (Early history used `feature:`; that was abandoned in favor of `feat:` — don't revive it.) Release commits from `maven-release-plugin` are the only ones with a scope: `chore(release): archicode-X.Y.Z`.

## Release

Cut via `maven-release-plugin`. Commit messages use a `chore:` prefix, release commits are `chore(release): archicode-X.Y.Z`. Tag pushes trigger publishing the site to GitHub Pages: the presentation page (`src/site/index.html`) at the root, the Asciidoctor manual (`src/doc`, built to `target/generated-docs`) at `/docs/`, and the editor at `/editor/`.
