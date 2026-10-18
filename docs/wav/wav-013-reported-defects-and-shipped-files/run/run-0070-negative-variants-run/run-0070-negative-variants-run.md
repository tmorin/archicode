---
type: run
run: 0070
status: completed
wave: 013
---

# Run 0070: Negative variants run

Wave 013 (`reported-defects-and-shipped-files`), item W-7 (phase P4). Focus: give a workspace that is wrong one clear line from the command line and from the editor, and know it from a test, not from a bug report.
Document profile: `single-document` (the scope is settled by the wave plan; what the run decides is which case is a fix and which an issue). This file carries scope, decisions, canonical impact, review passes, tasks, verification and findings. There is no pln: the task list below is the plan, and its state is the state of the run.

## Scope

1. Run, on today's tools, the negative cases of the Brightcart document that map onto the complete-folder rendition (`settings.plateaus`), on the command line and in the editor harness; add the cases of the same family that are cheap to find.
2. One table, `src/test/resources/brightcart/negative-cases.json`: for each case the alteration of `folders/` (built in a temporary folder by the tests, nothing negative is committed), the commands with exit code and error output, and what the editor says. `BrightcartNegativeCasesTest` (command line, in the process through the real picocli command line) and `brightcart-negative.test.js` (editor harness) run the same file.
3. A case that gives a stack trace, a wrong silence, an exit 0 where it should fail or two sentences for one error is fixed when it is a few lines (test failing before, passing after) and filed as an issue otherwise.
4. The variants table of the document says which variants a tool runs.

## Decisions

- **D1. The table is data read by both tests, in `src/test/resources/brightcart/negative-cases.json`, next to `generate.mjs` and not in `variants/`**, because `generate.mjs` empties `variants/` on every run. A test builds each altered folder from `folders/` by the stated operations (`replace`, `write`, `copy`, `delete`). No negative `workspace.yaml` is committed, so `src/test/resources/shipped-files/exceptions.json` stays empty (it has nothing to list). The file is 20 KB for 23 cases.
- **D2. The editor says the sentence of the command line, or its stated equivalent**: the banner of the editor starts with a capital and ends with a full stop (`The folder ... does not exist.`), and the rules of the plateaus come under `Could not read the plateaus of workspace.yaml:`. A node test compares both lists of sentences after removing exactly those three differences, so that a sentence cannot drift in one tool only.
- **D3. A baseline cycle is accepted** (N3). The `baseline` key names the one plateau a plateau is compared with by default; nothing follows a chain (`Plateaus.baseline` is one hop, the editor's `@baseline` too), so `baseline: saas` on `baseline` and `baseline: baseline` on `saas` mean that each is compared with the other, which is what `--baseline` already asks for (P5). The case pins it: exit 0, and the output equals that of the explicit `--baseline`. If the author wants a cycle refused, it is one more rule in `Plateaus.select` and `selectPlateau` and a decision, not a defect: it is in the report.
- **D4. The unknown key of a manifest header in the editor** (the finding F2 of run 0065): `parseManifestText` says ``unknown key `foo` (known: kind, parent, version) at `header.foo` `` (the sentence of the command line without the line and the column, which the page does not have), after the `plateau` refusal of run 0065 and before `Missing content.id`. The command line message is unchanged.
- **D5. A missing required key of a manifest is told in the words the editor already had**, on the command line: `Missing header.kind`, `Missing header.version`, `Missing content.id` (also for a manifest with no `content`, as the editor does), `Missing content.elements[0].id` for a nested element, and `Missing header.kind` for an empty file. The editor learns `Missing header.version` (it accepted a manifest the command line refuses). This replaces the reader's `Cannot construct instance of `io.morin...$HeaderBuilder`, problem: kind is marked non-null but is null` and `No content to map due to end-of-input`.
- **D6. A nested element of an unknown kind says ``unknown kind `containr` (known: container, group)``** on the command line, in place of ``Could not resolve type id 'containr' as a subtype of `io.morin...SystemElement` ...``.
- **D7. Left as they are, filed:** the editor does not check the keys, kinds and shapes inside the content of a manifest or in `settings` (#75); an unknown `header.kind` gets two sentences, the command line's long one (with a class name) being pinned by run 0065's `LayeredPlateauRefusalTest` as "unchanged" (#76).

## Canonical impact

None to the architecture model (no TDD, no `CI-arc` or `CI-dom` packet): tests, three sentences of the command line, two of the editor, the document of the fixture.

## Review passes

- **KDMLLC (inline).** K: one table, one test per tool. D: the sentences exist in Java, the page and the table; the table pins both, and a test keeps the two lists equal. M: each case is one alteration with one expected result; the cases that the layered engine will own are not in it. L: no new class, three helper functions. U: every refusal names the file or the key and says what is wrong. C: the wave plan W-7 scope and the P4 gate (below) are covered one for one; the document's variants table and `variants/*.json` say the same (they are generated from one `run`/`kin` field of `description.mjs`).
- **C scan.** The gate says the folders live in `variants/`: they are built by the test from `folders/` and the table sits next to `variants/` (D1).

## Cases

Expected: exit 1 and one `error:` line, no stack trace (a warning and exit 0 where it is a warning); the same sentence in the editor.

| Case | Variant | What | Result |
| --- | --- | --- | --- |
| N1 | V11 | a plateau id declared twice | passed as is |
| N2 | - | a `baseline` that names no plateau | passed as is |
| N3 | - | a `baseline` cycle | passed as is: accepted, D3 |
| N4 | - | the folder of the plateau drawn is missing | passed as is (the editor draws it empty and says so) |
| N5 | - | the folder of the baseline is missing | passed as is |
| N6 | - | `settings.current` names no plateau | passed as is |
| N7 | V2 | a reference declared twice in one plateau | passed as is |
| N8 | - | `replaces` names nothing of the baseline | passed as is: a warning, exit 0, same sentence from the kernel |
| N9 | - | `--plateau`, `--baseline` mistyped; baseline = the plateau | passed as is on the command line; no typed id in the editor |
| N10 | - | an unknown key in a header | **fixed** (editor, D4) |
| N11-N14 | - | `..`, absolute, shared path, unknown plateau key | passed as is |
| N15 | - | `plateau add` with an id that exists | passed as is (command line only) |
| N16-N20 | - | no `header.kind`, no `header.version`, no `content`, no `content.id`, an empty file | **fixed** (D5; the editor also for the version) |
| N21 | - | a nested element of an unknown kind | **fixed** on the command line (D6); the editor does not check: filed #75 |
| N22 | - | a nested element without `id` | **fixed** on the command line (D5); the editor does not check: filed #75 |
| N23 | - | a relationship to an element that is not there (V8 in one folder) | passed as is (`dangling reference`; the editor counts it) |

## Tasks

- [x] T1. Read the wave plan, the fixture, runs 0064-0069, `Plateaus`, `WorkspaceFactory`, `ManifestParser`, the editor's plateau and parse paths, the harness.
- [x] T2. Probe some 35 alterations on the jar and in the harness (the table above is what they gave).
- [x] T3. `negative-cases.json`, `BrightcartNegativeCasesTest`, `brightcart-negative.test.js`.
- [x] T4. The fixes D4, D5, D6, each with its case failing before and passing after.
- [x] T5. Issues #75 and #76.
- [x] T6. The variants table of the document, `variants/*.json` (through `description.mjs` and `generate.mjs`), the README of the fixture.
- [x] T7. The five commands of the P4 gate on the final tree.

## Verification

With `JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem` and `PLANTUML_JAR=/home/tibo/git-perso/plantuml-libs/.workdir/.cache/plantuml-1.2024.7.jar`, on the final tree.

- Gate 1 (the folders and the test). 23 cases in `negative-cases.json`; `BrightcartNegativeCasesTest` 24 tests (23 cases and the coverage test), `brightcart-negative.test.js` 25 tests (19 cases that the editor runs, 4 that it does not and says why, 2 on the sentences). Nothing negative is committed: the folders are built in a temporary folder.
- Gate 2 (the sentences). Failing before, passing after: N10 in the editor (`manifestErrors` empty: the page accepted `foo`; 1 failure with the old `standalone.html`), N16-N20 on the command line (5 failures with the old `ManifestParser.java`: the reader's ``Cannot construct instance of `io.morin...$HeaderBuilder` ...`` and ``No content to map due to end-of-input``). Seen in the probes and fixed with the same code, without a separate before/after run: N21 and N22 on the command line (a class name in the first), `Missing header.version` in the editor (the page said nothing for a manifest without a version). A change of one word of `Plateaus.java` (`used` -> `declared`) fails N1 on the command line.
- Gate 3 (the document). The variants table has a "Run today" column; `variants/*.json` carry a `status` from the same words; the generator ran and changed nothing but those files (`folders/` and `expected/` are byte-identical).
- Gate 4. `./mvnw -o verify`: BUILD SUCCESS, 452 tests, 0 failures, 0 errors, 0 skipped (6 min 13 s). `cargo test`: 175 passed. `embed.sh --check`: "the committed WebAssembly is the one the sources build (658369 bytes)", exit 0. `node --test "src/test/javascript/**/*.test.js"`: 1067 pass, 0 fail. `npx prettier --check "src/**/*.java"`: clean.
- Byte-identity: only failing paths changed (the three catches of the reader, the reason of a type id, the page's parse of a manifest that was accepted although the command line refuses it); no view or output of a workspace that loads is produced differently. The tests that compare the outputs of the Brightcart folders pass unchanged.

## Findings

- **F1. `Missing header.version` makes the editor refuse a manifest it accepted.** Every shipped manifest has a version (the shipped-files test passes); one fixture of `yaml.test.js` had none and gained `version: "1"`.
- **F2. The cycle of `baseline` is accepted** (D3); no rule refuses it in either tool. A decision for the author of the wave, not a defect.
- **F3. `diff` and `views generate` say a dangling reference in two sentences** (``dangling reference: x (relationship of agent, in the target plateau)`` and ``dangling reference: x``). One line each, same tool; both pinned by N23. Not changed.
- **F4. The editor keeps no line and column for a manifest error** (the command line has them); it names the file and the key.
- **F5. The variants that wait**: V1, V3, V6-V10 for the layered engine; V12-V14 and M1-M3 for `plateau merge` (#65); V4 and V5 have a nearest case that is run.
