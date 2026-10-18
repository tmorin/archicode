---
type: run
run: 0065
status: completed
wave: 013
---

# Run 0065: Shipped files loaded

Wave 013 (`reported-defects-and-shipped-files`), item W-2 (phase P1). Focus: learn from a test, not by opening the file, that a shipped fixture does not load, and why.
Document profile: `single-document` (the scope arrives settled by the wave plan; the open question is the wording of a refusal). This file carries scope, decisions, canonical impact, review passes, tasks, verification and findings.

## Scope

1. A Java test (`ShippedFilesTest`) loads with `WorkspaceFactory`, on every plateau, each `workspace.yaml` under `src/doc/examples` and `src/test/resources`, and each workspace file the manual includes under another name; a node test (`shipped-files.test.js`) opens the same list in the editor harness, on every plateau, each compared with its baseline. Both read one list of exceptions, each entry with a reason (`src/test/resources/shipped-files/exceptions.json`).
2. A manifest of `kind: plateau` and one with a `plateau` header key are refused: on the command line with exit 1 and one `error:` line, in the editor with the same sentence on the manifest. They are not recognised. Every other unknown kind or key keeps its message.
3. The manual says the two names are reserved and refused for now (#30).
4. Nothing else in `src/main` changes.

## Decisions

- **D1. The wording of the refusal (the open question of the wave plan).** One sentence, the end of which is shared by both tools: `<key> is not supported yet: layered plateaus (a plateau written as an increment on top of another one) are reserved for a later version of ArchiCode (see #30). Give each plateau its own folder of manifests in `settings.plateaus` instead`. `<key>` is `` `kind: plateau` `` or `` `header.plateau` ``. The command line puts the file in front, in the form every unreadable manifest has (`` error: `manifests/x.yaml` is not valid: ... ``), so the sentence the editor shows is what follows `is not valid: `. It follows the wording of the `from` of a plateau (reserved, later version, what to do instead).
- **D2. Detected from what the reader said, not by reading the file twice.** `ManifestParser.layeredPlateau(e)` recognises the `UnrecognizedPropertyException` at `header.plateau` and the `InvalidFormatException` at `header.kind` whose value is `plateau` (with or without the `archicode.morin.io/` prefix, any case). Everything else goes the way it went. `ManifestKind` and `Manifest.Header` are untouched: the keys are not recognised.
- **D3. In the editor the check is in `parseManifestText`** (so the load, the reload of a file and the raw edit of a manifest all show it), before the kind is looked up; `Unrecognized header.kind` in `buildIndex` is unchanged.
- **D4. The exceptions are one JSON file read by both tests**, in `src/test/resources/shipped-files/`, with `workspace`, `tools` (`cli`, `editor` or both) and `reason`. It is empty: nothing shipped is meant not to open. The mechanism is checked (an entry with no reason, an entry that names no file, and a listed workspace that opens, each fail).
- **D5. A workspace file that is not called `workspace.yaml` is in the list too.** CLAUDE.md says every file, example or fixture; the manual includes `design_example_step_*/workspace_*.yaml`, `domain_workspace/{default,empty}.yaml` and `domain_configuration/default_*.yaml`, which are workspace files or parts of one. Each is loaded as the `workspace.yaml` of an empty folder.
- **D6. Plateaus.** The Java test calls `create(path, null, plateauId)` for each plateau of `settings.plateaus`; the editor test opens the folder, then `switchPlateau(id)` and `setCompareTo('@baseline')` for each, so that the folder of the baseline is read too. The kernel is not asked for the comparison (that is the job of `plateau-compare.test.js` and the Brightcart tests).

## Canonical impact

None to the architecture model (no TDD, no `CI-arc` or `CI-dom` packet): tests, a refusal message and a sentence of the manual.

## Review passes

- **KDMLLC (inline).** K: one list, one sentence, one helper in the parser and one in the page. D: the sentence exists twice (Java, page) because the page cannot read Java; both tests pin the same literal, and each constant points at the other. M: the three groups of files (workspace.yaml, other names, altered copies) do not overlap. L: no new recognised kind, no new class. U: the sentence names the key, says not supported yet, points at #30 and says what to do. C: wave plan W-2 scope, P1 gate third, fourth and sixth criteria covered one for one in Verification.
- **C scan.** The scope names `Unrecognized header.kind`/`unknown key` as what the editor shows; the editor shows only the first (it accepts an unknown header key the command line refuses): F2.

## Tasks

- [x] T1. Read the wave plan, the parser, the editor's parse path, the harness, `ManualExamplesTest`.
- [x] T2. `ShippedFilesTest` and `shipped-files.test.js`, the exceptions file; the altered-fixture proofs.
- [x] T3. `ManifestParser.layeredPlateau`, `layeredPlateauProblem` in the page.
- [x] T4. `LayeredPlateauRefusalTest` (command line), `shipped-files-layered-plateau.test.js` (editor); other messages unchanged.
- [x] T5. The sentence in the manual.
- [x] T6. The five commands of the P1 gate on the final tree.

## Verification

With `JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem` and `PLANTUML_JAR=/home/tibo/git-perso/plantuml-libs/.workdir/.cache/plantuml-1.2024.7.jar`, on the final tree.

- Gate 3 (loaded). `ShippedFilesTest` loads 17 `workspace.yaml` (9 of the manual, 8 fixtures; 28 workspace-and-plateau pairs, the four plateaus of Brightcart among them) and the 13 workspace files of the manual under other names; `shipped-files.test.js` opens the same, each plateau compared with its baseline. The list of exceptions is empty. Altered on purpose and restored (`git status` of the fixture clean after): `src/test/resources/brightcart/folders/plateaus/saas/app.agent.yaml` with `unknown-key: x` in its header fails `ShippedFilesTest` with `plateaus/saas/app.agent.yaml is not valid: unknown key `unknown-key` (known: kind, parent, version) at `header.unknown-key``; the editor test does **not** fail on that key (F2) and fails on the same file with an unknown kind (`plateau `saas`: `plateaus/saas/app.agent.yaml` is not valid: Unrecognized header.kind "archicode.morin.io/nothing"`) and on a `plateau` key. An exception with no reason, one that names no file, and a listed workspace that opens each fail the node test.
- Gate 4 (the refusal). On the jar of the final tree, run on a copy outside the repository: `kind: archicode.morin.io/plateau` and `plateau: x` in the header each give exit 1 and one `error:` line (the messages are in the report); `foo: bar` in the header gives, as before, `unknown key `foo` (known: kind, parent, version) at `header.foo` (line 4, column 11)`. Before the change the same two files gave the reader's `Cannot deserialize value of type ...ManifestKind from String "archicode.morin.io/plateau"...` and `unknown key `plateau` (known: kind, parent, version)`. `LayeredPlateauRefusalTest` (5 tests) pins the exact line for `query graph` and `views generate`, the bare `plateau` kind, and the unchanged messages of another unknown key and another unknown kind; `shipped-files-layered-plateau.test.js` (6 tests) pins the editor sentence on load, for the three spellings of the kind and for the header key, on the raw edit path, and the unchanged `Unrecognized header.kind`.
- Gate 6. `./mvnw -o verify`: BUILD SUCCESS, 422 tests, 0 failures, 0 errors, 0 skipped (6 min 34 s). `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`: 173 passed. `src/main/rust/viewpoint-kernel/embed.sh --check`: "the committed WebAssembly is the one the sources build (655569 bytes)", exit 0. `node --test "src/test/javascript/**/*.test.js"`: 1009 pass, 0 fail. `npx prettier --check "src/**/*.java"`: clean.
- Byte-identity: only the text of the error for the two keys changed (a failing path of the parser); no view or output of a workspace that loads is produced differently. Not compared against a jar of `6575892` (nothing on the success path changed).

## Findings

- **F1. `src/doc/examples/domain_workspace/empty.yaml` did not load**: `settings.manifests.path` where the key is `paths` (a list). It is not included in the manual nor read by any test; fixed (three lines).
- **F2. The editor accepts an unknown key in a manifest header (and in the content) that the command line refuses** (`unknown key ... (known: kind, parent, version)`). The gate says "an unknown key fails both tests"; the Java test fails on an unknown key, the node test fails on an unknown kind and on the `plateau` key, but not on `unknown-key`. Not changed here (a new message for the editor is out of this run's scope). Candidate follow-up: the editor says the same line for an unknown header key.
