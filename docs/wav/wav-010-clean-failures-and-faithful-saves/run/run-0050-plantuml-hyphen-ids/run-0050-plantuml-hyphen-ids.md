---
type: run
run: 0050
status: completed
wave: 010
---

# Run 0050: PlantUML hyphen ids

Wave 010 (`clean-failures-and-faithful-saves`), item W-3 (phase P1). Focus: name an element with a hyphen and still get a view that
renders. Document profile: `single-document` (the scope arrives settled by the wave plan, decision D-2, and by issue #38); this file
carries scope, decisions, canonical impact, verification and findings.

## Scope

1. The PlantUML renderer gives every box and every end of a link a name PlantUML reads (D-2(a), #38), in every view the CLI writes:
   plain views, the views of a plateau, the comparison views (`--baseline`), the technology views with deployed applications.
2. A workspace whose ids need no change generates the same files as before, byte for byte.
3. A test that has PlantUML render a view with hyphenated ids, and an invented fixture for it.

Not in scope, not done: the kernel (its ids, and the editor's own ids, are unchanged: contract 4 is not touched), the file names of
the views (they already worked with a hyphen), the manual (see Canonical impact).

## What PlantUML refuses (measured, `plantuml-1.2024.7.jar`)

The jar is the one the issue names (`plantuml-1.2024.7.jar`; the project itself has no PlantUML dependency, the CLI only writes text).
It was found on disk in another checkout of the user; nothing was downloaded. A name in `rectangle <name> [`, or at the end of a link,
is read as far as the first character that is not a letter, a digit, `_` or `.` (tried one by one for every ASCII punctuation
character, `é`, `ß` and `中`): `! # $ % & ' ( ) * + , - / : ; < = > ? @ [ \ ] ^ ` { | } ~` all make the file invalid, `.`, `_`, digits
(also first) and non-ASCII letters are fine. Quoting does not help: `rectangle "shop.report-a" [` and `rectangle "a-b" as ab [` are
refused too (the `[ ... ]` body takes no alias), and a quoted end of a link silently creates another box. So the name has to be
sanitised, not quoted.

## Decisions

- **D1. Sanitise, with a name per view.** `rendering/plantuml/PlantumlNames` (package-private, built once per view by
  `PlantumlViewRenderer` and passed to `ItemRenderer` and `LinkRenderer`): an id made only of letters, digits, `_` and `.` is its own
  name; any other id has each other character replaced by `_`. The label of a box is untouched (it is the element's name, or its id,
  as the author wrote it); only the name PlantUML uses to tie the box and the links together changes.
- **D2. Never merge two boxes.** `shop.report-a` and `shop.report_a` both give `shop.report_a`. The view holds both, so the ids that
  need a change are named in the order of the ids after all the ids that need none have taken theirs: the id that needs no change
  keeps its name, the other gets `shop.report_a_2` (then `_3`, ...). The names are the same from one run to the next (order of the
  ids, no hash). The names are per view: an id can have a different name in a view where its neighbour is absent.
- **D3. The kernel and the editor are untouched.** The ids the kernel gives (`prod.cluster.web.pod-a`, `rack-1_shop_web_x`) are the
  ones the editor draws and the tests of the kernel check; the sanitising is the CLI's own business, at the point where the text for
  PlantUML is written. `src/test/javascript/viewpoint-kernel/conformance.test.js` mirrors the rule (`plantumlNames`) to compare the
  kernel's ids with the boxes of the committed views.
- **D4. The other characters.** Handled by the same function: every character PlantUML does not read is replaced, so `+`, a space,
  `:`, `/`, `$` ... are covered too (`PlantumlNamesTest.everyCharacterPlantumlDoesNotReadIsReplaced`). Left as they were: digits
  first, dots, underscores and non-ASCII letters (all rendered by PlantUML, checked), and a name made only of unreadable characters
  (`---` gives `___`, readable). Not looked at: ids the manifest schema would not let through (it has no pattern; the manual says
  the id "should match the variable name in Java or Javascript"), and very long names.
- **D5. A test with PlantUML, optional.** The project has no PlantUML dependency, the jar is not in `~/.m2`, and the build runs offline,
  so `HyphenIdViewsTest.plantumlRendersEveryViewOfTheFixtures` runs the jar given in `PLANTUML_JAR` (or `-Dplantuml.jar`) and is skipped
  without it. The other tests of the class always run and check, on the text of every generated file, that every box name and every
  end of a link is made of what PlantUML reads. Adding the jar as a test dependency was left out (GPL artefact; a network fetch).
- **D6. Committed views of `viewpoint-kernel/workspace` are regenerated.** The fixture has nodes `pod-a` and `pod-b`: 104 of its 548 committed
  files had a hyphen in a name and are now rewritten (`ViewpointKernelFixtureTest` compares them). Every one of the 104 differs from the old
  file by the renaming only (checked by applying the rule to the old files and comparing with the new ones: 0 differences left);
  the other 444 are untouched.

## Canonical impact

None to the architecture model (`docs/` holds no `CI-arc` or `CI-dom` packet for this run, which has no TDD). The manual and
`CLAUDE.md` were read for anything on ids, hyphens, underscores or the names inside the generated PlantUML: the only sentence on the
format of an id ("should match the variable name in Java or Javascript", Base Element) stays true as advice and does not mention
PlantUML, and the plateau `id` rule (hyphens allowed, for folder names) is about another thing. Nothing said anything the change
contradicts, so neither was edited (option (b) of D-2, "say that ids avoid hyphens", was the one that would have needed a sentence).

## Review passes

- **KDMLLC (inline).** K: one class of about 80 lines, one rule; no option, no quoting scheme, no change to the kernel. D: the same
  rule is written twice (Java, and the JS conformance test that must read the committed views) and says so; nothing else repeats it.
  M: boxes (atomic, composite), link ends, children, deployed applications, comparison views and the `_2` case each have a test;
  the characters are covered by one loop in the rule, not by a list. L: the optional PlantUML test is one extra, justified by D5.
  U: the class comment states the rule and the collision rule. C: below.
- **C scan.** Claim of the `ViewpointKernelFixtureTest` class comment, "the committed files are what the Java algorithms produced
  before the kernel replaced them": true for the content; the names of 104 files now follow the new rule (D6). Claim of the
  `README.md` of `src/test/resources/viewpoint-kernel`, "regenerate with `views generate`": followed. Claim of
  `conformance.test.js`, boxes of the puml are the kernel's ids: now through `plantumlNames`. Claim of `CLAUDE.md`, "`rendering/plantuml`
  (PlantUML output)": unchanged. Claim of issue #38, "the same happens in the plain views of a plateau": confirmed, the failure is
  in the names, in every kind of view (25 of 26 views of the new fixture were refused before, 0 of 26 after). Claim of the wave gate P1,
  "the views of an element with a hyphen in its id are accepted by `plantuml-1.2024.7.jar`": met (below).

## Verification

Run from `/home/tibo/git-perso/archicode`, JDK 25.

- `./mvnw -o -q verify` exits 0 (316 tests run, 0 failures, 1 skipped: the PlantUML-jar test without `PLANTUML_JAR`). New tests:
  `PlantumlNamesTest` 7, `HyphenIdViewsTest` 4 (3 always), one test each in `ItemRendererForAtomicTest`, `ItemRendererForCompositeTest`,
  `LinkRendererTest`; the other renderer tests only gained the `names` argument.
- `PLANTUML_JAR=.../plantuml-1.2024.7.jar ./mvnw -o -q test -Dtest=HyphenIdViewsTest`: 4 run, 0 skipped, 0 failures. It renders every
  view of the new fixture and every comparison view of `plateau-comparison/replaces` (more than 30 files) with the real jar.
- By hand on the new fixture `src/test/resources/hyphen-ids` with `plantuml-1.2024.7.jar -tsvg -failfast2`: the jar built from `HEAD`
  refuses 25 of 26 views, the new jar's 26 views all render.
- `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`: 160 passed. `src/main/rust/viewpoint-kernel/embed.sh --check`:
  "the committed WebAssembly is the one the sources build", exit 0. The Rust and the wasm were not touched.
- `node --test "src/test/javascript/**/*.test.js"`: 845 passed, 0 failed (after the conformance test learnt the rule).
- `npx prettier --check "src/**/*.java"`: clean.
- **Byte-identity against a jar of `HEAD`** (`git archive HEAD`, `./mvnw -o package`, in the scratchpad; the new jar copied from `target`
  at the time of the check). The 13 `workspace.yaml` of the repository (the 9 examples of `src/doc/examples`, `plateau-comparison`,
  `plateau-comparison/replaces`, `plateau-state-tags`, `viewpoint-kernel/workspace`) plus the new fixture, each copied once per jar,
  94 command runs per jar (`views generate`, `query graph`, `query views -f json`, `query schemas`, and for the plateau workspaces
  `diff` in four forms, `views generate --baseline`, `views generate --plateau` and `query graph --plateau` for each plateau).
  Results: exit codes identical in 94 of 94, stderr identical in 94 of 94, generated trees identical for every workspace but three:
  the 9 examples, `plateau-comparison` and `plateau-state-tags`: 0 differing files; `plateau-comparison/replaces` 10 files, `viewpoint-kernel/workspace`
  104 files and the new fixture 25 files differ, and in every file of the first two the difference is the renaming and nothing else
  (the old file with the rule applied equals the new one); the 5 files of the new fixture that are not a plain renaming are the
  ones where two ids collide (`_2`). Stdout identical in 92 of 94; the 2 others are `query schemas`, whose properties come out in
  another order about one run in twenty with the unchanged `HEAD` jar alone (20 runs of the old jar gave one outlier; compared as JSON
  with sorted keys, the two are equal): not caused by this run, filed as #49.
- `git status`: only the files listed in the report; `embed.sh --check` and the other checks changed nothing.

## Not verified

- Another PlantUML version: only `1.2024.7` was run (the one the issue and the gate name). Later versions are expected to accept
  at least what this one does, since the names are now the plainest form.
- Rendering of the *picture*: the check is that PlantUML accepts the file (`-failfast2`, exit 0), not that the layout is the one the
  author wants; a name that PlantUML reads can still be drawn with another label if the same label is used twice (not changed here).
- The native image (the class is registered in `reflect-config.json` and `NativeReflectionConfigTest` passes; no native build).
- A real workspace: only invented fixtures and the repository's examples were used, so how many existing workspaces have hyphenated
  ids (the open point of #38) is unknown.
- Non-BMP characters in an id are handled by code point in the rule, but no test covers one.
- The byte-identity and the 25-of-26 count were measured on the first version of the fixture (system id `back-office`); it was then
  edited so that the collision case shows (system id `backoffice`, which leaves `report_a` readable). The final fixture was rendered by the
  jar through `HyphenIdViewsTest`, not counted by hand again.

## Follow-ups

- Issue #49: `query schemas` property order changes from run to run (filed; same family as #48).
- #38 is fixed by this run; closing it belongs to the wave's pull request.
