---
type: run
run: 0090
status: completed
wave: 015
---

# Run 0090: Cli fail on and only changes

Wave 015 (`editor-reshape-and-loose-ends`), item W-2 (phase P0). Focus: fail a build on a change and draw only what changed, from the command line (#25 first half, #26).

Document profile: `single-document`, as the runs of wave 014 and run 0089: the scope is settled by the plan (the W-2 row, the second criterion of P0, decision T3 and T6), the decisions that need a record are below, and there is no PRD, TDD or pln.

## Scope

In:

- `archicode diff --fail-on <state>[,<state>...]` (#25, first half): the seven state words of `KernelStates` and `any`; exit code 3 when the comparison holds a change of a listed state, 0 otherwise; the output does not change; a difference without the option is still exit 0; an unknown state is one `error:` line and exit 1.
- `archicode views generate --only-changes` (#26, first half): the kernel's `only_changes` option, passed for the views of a comparison.
- Both documented in the command's help; one line per feature in the Native smoke step of `.github/workflows/ci-build.yaml`.

Out (Non-Goals of the wave, T6): `--baseline-ref` (#25, second half), a wrapped text table (#26), the manual (W-18), the `@QuarkusIntegrationTest` classes that replace the script (W-17). #26 also lists two items that earlier waves did (clean errors without a stack trace) or that stay out (`plateau add --adopt`: `plateau add` no longer exists); that is the orchestrator's note when it re-aims the issue.

## Decisions

- **D1. What counts as "a change of a state" is what the table holds.** `diff --fail-on` looks at the rows of the comparison (`Comparison.getChanges()`), the ones `GapReport` prints, and not at the union of elements: an element that a `replaces` replaced is in the union as `removed` only to place a removed element below it, has no row and no count, and must not fail a build on `removed`. A row has the state of its `change` (`new`, `changed`, `removed`, `moved`, `split`, `merged`), for an element or a relationship. `any` is any row. With `--no-wording` the rows that are wording only are left out of the table, so they do not count (a build must not fail on a table that shows nothing); without it a description that changed is a `changed` element, as in the table and in the counts.
- **D2. `contains-changes` is the rule of the kernel.** An element of the union whose own change is `none` and that has below it, in the tree of references and in the same layer, an element that has a change of its own (`contains_changes` of the kernel; an element it draws as changed, such as a replaced one kept to place a removed one, is not a container). Relationships do not make an element contain a change (as in `StateTags.stateOf`). It is a word of its own: `any` means the six states of a row (an element that contains a change always has an element below it with a row, so `any` fails whenever `contains-changes` would).
- **D3. The exit code is 3 (T3), carried by `IExitCodeGenerator`.** `DiffCommand` stays a `Runnable` and says its code after the table is printed (`ErrorOutput.CHANGES_FOUND`, next to `FAILURE`); the error path of `ErrorOutput` runs `RunLast`, which reads the generator. The error output is not touched: a warning still comes out, and no line says "the build failed" (the plan says nothing else changes in the output; the table on the standard output is the report, the exit code is the verdict).
- **D4. The words are read as the kernel says them, nothing is guessed.** The list is checked before anything is loaded (a typo does not cost the load of two plateaus). The words are exactly those of `KernelStates.all()` plus `any`, lower case, spaces around a word are ignored; the option may be repeated (`--fail-on removed --fail-on moved`). An unknown word, an empty word (`removed,`) or an empty value is one `error:` line that lists the words that exist, exit 1. A case-insensitive reading was not added: the words of the tables, the JSON and the manual are lower case, and one spelling is the one a CI file keeps.
- **D5. `--only-changes` trims the views of the comparison, not the views of the plateau.** The kernel keeps, without a comparison, only the focal item (nothing changed), so passing the option to the views of the plateau itself would blank them. `GenerateViewsCommand` passes `onlyChanges && comparison != null`: `views-<plateau>-vs-<against>` and its facets are trimmed (the kernel's `context: true` items stay, greyed), `views-<plateau>`, `gap.md` and `gap.json` are what they were. The views of a comparison that have nothing to show still hold their focal item (the kernel's rule; a view is never left empty), so the set of files is the same.
- **D6. Without a comparison the option is an error, not a no-op.** A workspace with no plateau, or the root plateau without `--against`, gives one `error:` line (`--only-changes` cannot be used: ...), in the sentence form of `--against`'s own, exit 1, and nothing is written. A silent no-op in a script that is copied from one workspace to another would draw full views while the author believes they are trimmed.

## Tasks

- [x] T1. Read the plan, #25, #26, `DiffCommand`, `GenerateViewsCommand`, `ErrorOutput`, `KernelStates`, `Comparison`, the kernel README on `only_changes`.
- [x] T2. `cli/FailOn` (parse and `holds`), `ErrorOutput.CHANGES_FOUND`, `DiffCommand` (option, help, exit code); `DiffFailOnTest`.
- [x] T3. `GenerateViewsCommand` (`--only-changes`, help, errors, the factory call); `OnlyChangesTest`.
- [x] T4. The Native smoke step: `expect_exit`, four lines; run by hand with the JVM jar against the same commands.
- [x] T5. CLAUDE.md where it describes what the run changes (the exit codes, the comparison commands).
- [x] T6. A review pass (a sub-agent), its findings answered; the gate commands on the final tree; byte-identity of the views of the workspaces without plateau; one commit.

## Canonical impact

None to the architecture model (no TDD, no `CI-arc` or `CI-dom` packet; the repository declares no register for it). `CLAUDE.md` is corrected in two sentences (the exit codes of the error path, the comparison commands).

## Shipped files

The run ships no example, fixture or file for the users of the repository. It reads the fixtures that exist and writes, in the temporary folder of two tests, a workspace of two plateaus (a new system; a description changed by a `SET` patch). The forms it adds, and where each is loaded:

| form | command line | editor |
|---|---|---|
| `diff --fail-on` (exit 3, 0, 1) | `DiffFailOnTest` (the bookshop `plateau-comparison`, its `replaces` warehouse, `domain_workspace` for the error of a workspace without plateau, a temporary workspace for the wording and for a lone new system) | none: the page has no command line |
| `views generate --only-changes` | `OnlyChangesTest` (the bookshop; `domain_workspace` for the error) | none |
| the Native smoke lines | `domain_plateaus`, run by hand here with the JVM jar (the native image itself is CI's) | none |

## Verification

Run on the final tree, by me (JDK 25, `PLANTUML_JAR` set to `plantuml-1.2024.7.jar`, so no test is skipped):

| Command | Result |
|---|---|
| `./mvnw -o verify` | BUILD SUCCESS, 646 tests, 0 failures, 0 errors, 0 skipped (the run adds `DiffFailOnTest` 14 and `OnlyChangesTest` 7; integration tests are skipped by default, `skipITs=true`) |
| `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml` | 190 passed (no Rust change) |
| `src/main/rust/viewpoint-kernel/embed.sh --check` | ok, 715537 bytes |
| `node --test "src/test/javascript/**/*.test.js"` | 1462 tests, 1462 pass |
| `npx prettier --check "src/**/*.java"` | clean |

The first `./mvnw -o verify` failed on `NativeReflectionConfigTest` (`cli.FailOn` was not registered for reflection in `reflect-config.json`, as every class of the application must be); registered, the second passed.

*Fail before, pass after.* The two causes put back one at a time in the main code (`DiffCommand` setting no exit code; `drawsOnlyChanges` returning false), the tests kept: 10 of the 21 new tests fail (6 in `DiffFailOnTest`, 4 in `OnlyChangesTest`), with `expected: <3> but was: <0>` and "no view of the comparison was trimmed"; the code was restored from copies and the gate ran after. The tests that pin what must not change (no `--fail-on` is exit 0, the unknown state is one line, the views of the plateau are byte-identical with and without `--only-changes`) pass on both, as they should.

*The Native smoke lines.* The step of `ci-build.yaml` (its helpers and the lines of the comparison, cut out of the file and run against the JVM jar, as a script with `bash -e`, which is the shell a GitHub `run:` step uses): all `ok`, `failed: none`; with the state of the first `--fail-on` line changed to a typo, the check is listed as failed at the end and the step goes on (the first version of `expect_exit` aborted the step under `-e`: found by the review, fixed with `&& rc=0 || rc=$?`). The native image itself is CI's.

*Byte-identity against `25471b3`* (the rule of the repository, a workspace without plateaus). `identity85.py` (scratchpad): the jar built from `git archive 25471b3` outside the repository (`base25`; its `src/` and `pom.xml` were compared with a fresh `git archive 25471b3` extraction: no difference) against the jar of the tree, on the 11 tracked `workspace.yaml` without plateau (`src/doc/examples/domain_application`, `domain_manifest_folders`, `domain_technology`, `domain_viewpoint_views`, `domain_workspace`, `facet_example_step_1` to `_4`, `src/test/resources/hyphen-ids`, `src/test/resources/viewpoint-kernel/workspace`), three commands each on a fresh copy for each jar (`views generate`, `query graph`, `diff`, without the new options): 33 commands, 19 identical (821 files compared), 14 differ, the same 14 as at the end of run 0089 and all known: the 11 `diff` (the reworded error, exit code 1 on both), `domain_manifest_folders views generate` and `query graph` (the old jar cannot read `manifests/**`), `viewpoint-kernel/workspace views generate` (the order of the deprecated-facet warnings, #83). The views of every workspace the old jar can read are the same bytes. The layered workspaces are not byte-compared with the old jar (it does not read layers); `diff` without `--fail-on` and `views generate` without `--only-changes` on them are pinned by `PlateauComparisonTest`, `LayeredCommandsTest` and `BrightcartLayeredDiffTest`, which pass unchanged, and `DiffFailOnTest` compares the output with and without the option byte for byte.

*By hand, with the JVM jar* (a copy of `plateau-comparison` and of `domain_plateaus`): `diff --plateau to-be`: exit 0; `--fail-on new`, `any`, `contains-changes`, `new,changed --fail-on removed`: exit 3, 26 lines out as without; `--fail-on moved,split,merged`: exit 0; `--fail-on bogus` and `--fail-on removed,`: one `error:` line, exit 1. `views generate --plateau to-be -o views --only-changes`: `views-to-be`, `gap.md` and `gap.json` identical to the run without the option, 8 views of `views-to-be-vs-as-is` shorter (the unchanged link `shop.web --> shop.api` gone, the new `shop.mobile` link kept); on `domain_plateaus` the overview of the customer goes from 1492 to 398 bytes.

## Review pass, answered

A `general-purpose` sub-agent at the standard tier, read-only. No S0.

- S1 `expect_exit` in the CI step aborts the step under `bash -e` on the first exit code that is not 0 (the existing `expect` calls its command inside an `if`): true, fixed (`&& rc=0 || rc=$?`) and shown to work under `bash -e` (above).
- S3 `contains-changes` did not follow the kernel in one corner: a replaced element kept only to place a removed one below it is drawn as removed by the kernel (it has a change of its own), and the layers were not kept apart. Fixed: the holders come from the elements of the union that have a change (not wording only, with `--no-wording`), per layer, and the container is an element whose own change is `none`; `FailOn` no longer reads the rows for it. D2 says so.
- S3 the test of `contains-changes` only had a flat workspace: a nested case is added (a new container under a system that did not change). S3 the assertion that nothing is written named one folder: the second is added.
- S3 `onlyChanges && comparison != null` twice: one private method, `drawsOnlyChanges`. The two error blocks of `--only-changes` stay apart: their sentences differ.
- The exit code reaches the process (the review read `RunLast` and the Quarkus runner): the Native smoke line is the end-to-end check, CI's.

## Findings

- F1 (wave, for W-17). `--fail-on` exit codes: 3 for a change, 1 for an error, 2 for a usage error (`ErrorOutput.CHANGES_FOUND`). W-17's `@QuarkusIntegrationTest` for `diff --fail-on` can assert 3 on `domain_plateaus` (`--fail-on moved,removed`, all six states are present there) and 1 on an unknown state; there is no state absent from `domain_plateaus` to assert 0 with, `plateau-comparison`'s `to-be` has none of `moved`, `split` and `merged`.
- F2 (wave, for W-18: what the manual must now say). `diff --fail-on <state>[,<state>...]`: the words (`new`, `changed`, `removed`, `moved`, `split`, `merged`, `contains-changes`, and `any` for any of the first six), repeatable, lower case; exit 3 when the table holds a change of a listed state (with `--no-wording` a wording-only row does not count), 0 otherwise, the table is printed in any case and as it is without the option; an unknown or empty state is one `error:` line and exit 1; a CI line to copy. `views generate --only-changes`: trims the views of the comparison (`views-<plateau>-vs-<against>` and its facets: new, changed, removed, moved, split and merged things, the ends of their links, what holds them, the rest as context), not the views of the plateau nor the table; a view with nothing to show still holds its focal item; it is an error with no comparison (no plateau; the root without `--against`). `--baseline-ref` and the wrapped table are not built: the manual still says so in its limits (#25, #26).
- F3 (wave, the plan). T3 says "the seven state words and `any`": `any` here means the six states of a row; `contains-changes` is not one (it is derived), but whatever it would catch, `any` catches (D2). The plan's sentence "nothing else changes in the output" is read literally: no line on the error output says why the build failed.
- F4 (wave, the issues). #26 lists four items. `--only-changes` is built. The clean errors without a stack trace were done by an earlier wave (`ErrorOutput`); `plateau add --adopt` is moot (`plateau add` no longer exists, layers); the wrapped table stays open. #25: `--fail-on` is built, `--baseline-ref` stays. The commit says which half; the orchestrator re-aims the issues.
- F5. Files outside the `likely_paths`: `src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json` (the entry for `cli.FailOn`, which `NativeReflectionConfigTest` demands for every class), `CLAUDE.md` (two sentences), and this document. The two wave files were not written. No issue was filed: nothing out of scope was found that the wave does not already hold.

## Not verified

- The native image (`expect_exit` and the four new lines run on the native runner): CI only. The lines were run by hand with the JVM jar under `bash -e`.
- That the process exit code of the real Quarkus runner is 3: the tests go through the same `ErrorOutput` and `RunLast` path (`CliHarness`), and the review read the runner; the jar run by hand above printed exit 3 (`try.sh`, the JVM jar through `java -jar`), the native one is CI's.
- `tooling/docs/check-backlog.py` and the `docs/bkg/` close-out sweep of `complete-run`: neither exists in this repository.
