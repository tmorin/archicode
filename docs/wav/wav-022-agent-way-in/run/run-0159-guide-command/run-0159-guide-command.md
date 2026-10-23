---
type: run
run: 0159
status: completed
wave: 022
profile: single-document
---

# Run 0159: guide-command

Wave 022, W-2 (decisions T2, T4, T6, T9; validation oracle V4 and the IT of the guide, corpus C4; P1 gate; GitHub issue tmorin/archicode#144, second item of the author's order). Focus: `archicode guide` prints a versioned guide generated from the schema and the command list, in the jar and the native image, with examples that the tests load and run.

Profile: `single-document` (as run 0158): one page carries scope, decisions, canonical impact, tasks, verification and findings. The review passes were kept as inline passes (see Findings).

## Scope

In: the command `archicode guide` (a subcommand of the top command); the generated sections (kinds and commands); the resource text of the conventions; a small workspace in the guide whose files and commands are tested; the view `properties` the schema types `any`; golden file, size budget, V4, C4 and `GuideIT` (V5). Out: `init` (W-3), the walk and the cold-agent trial (W-4), `validate`, any change to another command's output, to the editor or to the schema.

## Decisions

- **D1 (Q3, generated and text).** Generated: the header and the ten kinds with keys, required keys, enums, shapes and nesting (`ManifestSchema`), the value types (named from the descriptions of `@Identifier` and `@Reference`), and every command and option (the Picocli spec, first sentence of the help, 220 characters at most). Text (`src/main/resources/guide/guide.md`, markers `{{kinds}}` and `{{commands}}`): the loop, exit codes, the `error:`/`warning:` lines, the first-error-only fact, `.archicode.yaml`, ids and references, plateaus, `replaces`, patches, stories, what the schema cannot say, the worked workspace. No generated paragraph was better as text; the reverse (the settings of `.archicode.yaml`) stays text because the workspace schema is not in this guide's scope and the keys are named in backticks that a human can check against `query schemas workspace`.
- **D2 (view properties).** The code reads them by name from a `JsonNode`, so nothing can derive them. They are a table in the text, held to the code from two sides by `GuideViewPropertiesTest`: from the command line (each key the guide says is read changes the drawn file; each it says is ignored changes nothing; `properties: {}` on an element view is the `has no element` error), and from the editor (every key of `VIEW_PROPERTY_ORDER`, `MAP_PARTS`, `DIAGRAM_SHOW_NAMES` is in the guide). The table: `element` (overview, detailed, deep), `pinned`, `hidden`, `opened` (map), `applications`, `relationships` (map of the technology layer, `false` leaves out). `facet`, `hide-unlinked`, `labels`, `qualifiers`, `descriptions`, `wrap` are the editor's and ignored by the command line.
- **D3 (size).** Budget 30 KB (30 * 1024 bytes), held by `GuideTest` and `GuideIT`; the guide is about 22 KB.
- **D4 (golden file).** `src/test/resources/guide/golden.md`, first line `archicode guide @VERSION@` so that a release does not change it. It cannot be `guide.md`: a test resource at `guide/guide.md` hides the application's resource on the test class path (found when the golden test saw the placeholder in the output).
- **D5 (output).** `System.out.print` of the text (one line feed at the end, line feeds only), as the other commands write: the jar, the in-process tests and the native runner capture the same stream.
- **D6 (examples).** The `yaml` blocks of the guide that start with `# file: <path>` are the files of one workspace (`GuideBlocks.write`); the `bash` blocks are commands with `# exit <n>`. `GuideTest` writes the files, runs every command with `-w` on the copy and asserts each exit code (0, 3 for `diff --fail-on new,removed`, 1 for `views generate --plateau nowhere` with one `error:` line); the manifests are `ManifestCorpus.guide` (C4) and conform to the schema (`GuideCorpusTest`).

## Tasks (all done)

1. `cli/Guide` (generation and assembly), `cli/GuideCommand`, registration in `ArchiCode`; `guide/guide.md`. Tier standard, inline in this session (the run is one session; no task is `hard_judgment`).
2. Native: `guide/**` in `quarkus.native.resources.includes`; `Guide` and `GuideCommand` in `reflect-config.json` (`NativeReflectionConfigTest`).
3. Tests: `GuideTest`, `GuideViewPropertiesTest`, `GuideCorpusTest` (with `GuideBlocks` and `ManifestCorpus.guide`), `GuideIT`; golden `src/test/resources/guide/golden.md`.
4. `CLAUDE.md`: a paragraph on the guide.

## Canonical impact

`CLAUDE.md` (the paragraph "The guide"); no `arc` or `dom` packet (no TDD in this profile). The manual is W-6's.

## Verification

Run on the final tree (JDK 25), one command at a time:

- `./mvnw -o verify -DskipITs=false '-Dtest=!CustomRenderingTest' -Dsurefire.failIfNoSpecifiedTests=false`: BUILD SUCCESS, 1387 unit tests (2 skipped, as before) and 37 integration tests (including `GuideIT`, 4) pass. The new unit tests: `GuideTest` (7), `GuideViewPropertiesTest` (5), `GuideCorpusTest` (1); `NativeReflectionConfigTest` (the two new classes and `guide/**`) passes.
- `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`: 240 passed. `embed.sh --check`: exit 0.
- `node --test --test-concurrency=2 "src/test/javascript/**/*.test.js"`: 2562 of 2562 pass (concurrency 2, as the log of the wave says; the default concurrency makes the timing guard of `generated: 2000 files` fail under load, not run here).
- `npx prettier --check "src/**/*.java"`: clean.
- V7 (byte identity), `sweep.py` (scratch) against the jar of `archicode-0.19.0`: 308 commands over the 20 shipped workspaces, same exit codes, standard output and error output, same sha256 for the 15252 files of the trees afterwards, `--help` of the 14 commands identical except the top command, which gains exactly the one entry `guide`.
- The guide from another folder (`/tmp`) is the golden file byte for byte; `-w` of a missing file does not change it (`GuideTest`, `GuideIT`).
- P1 criterion 1 (guide): first line `archicode guide <pom version>`, 21199 bytes of the 30720 budget, every command and option of the Picocli spec and every kind with its `holds` and top flag in it (`GuideTest`); the jar prints the golden file (`GuideIT`). Criterion 2 (examples): all 11 files of the guide's workspace are written and its 9 commands run with the exit codes the guide gives (0, 3, 1) in `GuideTest`; the 10 manifest blocks are in the corpus and conform to the schema (`GuideCorpusTest`).

Not verified: the native runner (no Mandrel in the shell: `GuideIT` under `-Dnative` and the resource `guide/**` in the native image are for the `Native` job of the pull request); the cold-agent trial and the scripted walk (W-4); the editor loading the guide's manifests (W-3, which owns `init`).

## Findings

- The properties of a view are read by name from a `JsonNode` (`KernelViewpointFactory`, `ViewInPlateau`, `GenerateViewsCommand`), so they cannot be derived: the guide has a table, held to the code by behaviour (`GuideViewPropertiesTest`) and to the editor's key lists. The CLI ignores `facet`, `hide-unlinked` and the show names (`labels`, `qualifiers`, `descriptions`, `wrap`): the editor writes them, facets for the command line come from `settings.facets`.
- Existing bug, not fixed (T1: no other command moves): a saved view of an element viewpoint with no `properties` at all (`viewpoint: overview` and nothing else) ends in `error: unexpected java.lang.NullPointerException` and a stack trace (`KernelViewpointFactory.create`, `Objects.requireNonNull(view.getProperties())`), while `properties: {}` gives the sentence `the view v has no element`. To file as an issue for the author: it is the first mistake an agent that writes a view makes.
- A saved view is drawn only with `-i <id>`, and into the file of its id (`<id>.puml`), whatever its viewpoint; `views generate` alone draws the three element viewpoints of every element. The guide says both.
- A test resource at `guide/guide.md` hides the application's resource of the same name on the test class path; the golden file is `guide/golden.md`.
- The id rule of an element in the schema is `^[^.]+$` while its description advises lowercase letters, digits, `_` and `-`; the guide says what the loader holds (no dot) and what to write.
- The guide's last line says `init` is not built yet: W-3 changes it with its quick-start line (and the golden file).
- Inline review passes instead of dispatched agents (as run 0158): the claims of the resource text are checked by tests that read the code (commands, kinds, nesting, view keys, exit codes, examples), so the KDMLLC review and the consistency scan were done by reading the generated guide against those tests. No agent was dispatched.
- Files touched outside `likely_paths`: none. Production Java touched: `cli/Guide`, `cli/GuideCommand`, `cli/ArchiCode` (one subcommand), `application.properties`, `reflect-config.json`, `CLAUDE.md`, the resource `guide/guide.md`; test side: `GuideTest`, `GuideViewPropertiesTest`, `doc/GuideCorpusTest`, `doc/GuideBlocks`, `doc/ManifestCorpus` (a method), `it/GuideIT`, `src/test/resources/guide/golden.md`.
