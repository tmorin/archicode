---
type: run
run: 0043
status: completed
wave: 009
---

# Run 0043: State tag rule

Wave 009 (`element-identity-across-plateaus`), item W-2 (phase P1). Focus: a hand-written new or changed tag looks the same in the CLI
and in the editor. Document profile: `single-document`, as run 0042 and the runs of wave 008: the scope arrives settled (the W-2 row
and D-5 of the wave plan, issue tmorin/archicode#28), the work is one rule in the PlantUML renderer plus a report on the error
output, and there was no live alternative worth a PRD, a TDD or a pln. This file carries scope, decisions, canonical impact,
verification and findings. The review passes were run inline (no subagent), see "Review passes".

## Context

With a comparison on, a tag `rendering-stereotypes: "new"` (or `changed`, `removed`, `contains-changes`, and since run 0042 `moved`,
`split`, `merged`) written by hand on an element that did not get that state was drawn differently by the two tools. The CLI writes
the default look of a state as the style of the stereotype of the same name, so any box with the stereotype `new` got the thick
outline of `new` in a view that has something new; the editor gives the default look only to a box that has the state computed
(`changeStateOfItem` / `stereotypeLookOf` in `standalone.html`). The manual said so (the last sentence of "The states and the tags you
wrote by hand"). D-5 of the wave decided the rule is the editor's, and that a contradicting word is reported where the user sees it.

## Scope

In: the PlantUML renderer gives the default look of a state only to the box that has the state; a word written by hand that is the
name of a state but not the state of its box keeps its place and the author's own style; the report of the disagreements, on the
error output of `views generate` and `diff`; Java and JS tests on the same invented case; the manual. Out: the editor's code (it
already follows the rule, proven below), a warning in the editor, the look of `moved`/`split`/`merged` (W-3), the CLAUDE.md paragraph (W-7).

## Decisions

Taken by the wave (not reopened): D-5.

Taken by this run:

- **S1. The rule.** A box gets the default look of a state only when the state is computed for it. A word that is the name of a
  state (`new`, `changed`, `removed`, `moved`, `split`, `merged`, `contains-changes`) and is not the state of its box (no state at
  all, another state, or no comparison) is the author's own stereotype: the style of the author's `styles.by-tags` /
  `by-qualifiers` entry of that name, property by property, and nothing of the default. On a box that changed, the computed state is
  last and has the last word over it, as the editor does. The word is read from the stereotypes of the item, so qualifiers named
  like a state follow the same rule as the tag (the kernel puts both in the stereotypes, and the editor's rule is on stereotypes).
- **S2. How the CLI does it: another stereotype name, only where needed.** PlantUML gives a style to a class name, so the default
  look cannot be kept apart from a box that carries the same class. In a view that compares, a state word that the box does not have
  is written `<<written-new>>` (its place in the list is kept, so the order rule of `generateStereotypes` is unchanged), and the
  style block `.written-new` is the author's own style of `new` (both maps merged, `by-tags` over `by-qualifiers`) without the
  default; no block is written when the author has no style for the name. A box that has the state keeps `<<new>>` and the style
  `.new` (default under the author's), so the file of a view without a hand-written state word is byte-identical to before.
  `ChangeMarks.stereotypes`, `ChangeMarks.writtenStates`, and a third argument of `PlantumlUtilities.stereotypeStyles`.
  Rejected: renaming the computed state (`<<state-new>>`, and the default under that name): it changes the bytes of every view of
  every comparison; dropping the word from the box: the author's own style (and a style of the author named `new` on a box that
  agrees) would be lost, and the editor keeps it as a badge and a style; rewriting the default look as inline `skinparam` per box:
  PlantUML 1.2024.7 gives no per-box line style except through stereotypes.
- **S3. Where the warning goes: the error output of the command (picocli's `getErr()`), not the log.** `quarkus.log.level=ERROR`
  hides `log.warn`; this is why the existing facet-dialect warning (`WorkspaceFactory`, `log.warn`) and the warnings of the kernel's
  comparison (`Comparison.getWarnings()`, which nothing prints yet: W-3) are not seen by a user. `DiffCommand` already prints its table
  with `System.out` for that reason. The standard output stays what it was (the table, nothing for `views generate`), so a script
  that reads the files and the table is not affected. `StateTagReport` (cli) prints, `StateTags` (workspace) computes the sentences.
  The existing `log.warn` calls are not changed (out of scope); see the issue filed.
- **S4. What is reported.** One line per element and word, sorted (layer, reference, order of the words), when the word is not the
  state the comparison computes for the element: the state is the change of the element, else `contains-changes` when an element
  below it in the tree of references has a change (the kernel's rule), else none. The line names the element, the word and where it
  was written (tag or qualifier), the two plateaus, what the comparison finds, what the box is drawn with, and that the word can be
  dropped. A word that agrees is not reported. Without a comparison, for a workspace that declares `settings.plateaus`, every state
  word is reported ("nothing is compared here"). A workspace without `settings.plateaus` is never told anything: no comparison can
  ever disagree with the word, which has been the author's own stereotype since before comparisons existed, and a message on every
  run of an existing workspace would be noise (this narrows the brief, which said to report "when there is no comparison"; the case
  of a plateau that is not compared is reported). `diff` checks the plateau it compares (the baseline's own words are not read);
  `views generate --baseline` checks the union (a removed element's word is read from the baseline, which draws it); `views
  generate` of a plateau alone checks that plateau, once, not once per view or per facet.
- **S5. The editor needs no change.** Checked, not assumed: `state-tags.test.js` draws the same files in the editor and the result is
  the rule (below). `standalone.html` and the wasm are untouched. What the editor does not do yet is know `moved`, `split`, `merged`
  as states (`CHANGE_STATES` has three words until W-5), so a hand-written `moved` there is also only a badge and a style; when W-5
  adds the states it must keep this rule (its `changeStateOfItem` already does it by construction: the default look comes from
  `item.change`, not from the stereotype).

## The same case in both tools

The invented ticket office, `src/test/resources/plateau-state-tags` (before -> after; the style `new` of the author sets a purple
line colour). The counter did not change and carries `new`; the queue did not change and carries `changed`; the printer changed (a
name) and carries `new`; the window is new and carries `new`; the kiosk is new. Outcome asserted by both tests:

| Box | State | Word | CLI (`StateTagRuleTest`) | Editor (`state-tags.test.js`) |
|-----|-------|------|--------------------------|-------------------------------|
| kiosk | new | - | `<<new>>`, `.new`: thick line, purple line colour | `--st-width: 3px`, author's stroke, tint, glyph |
| window | new | `new` | `<<new>>` only (no `written-`), no warning | `--st-width: 3px` |
| counter | none | `new` | `<<written-new>>`, `.written-new`: purple line colour only; no `+` | author's stroke only; no width, tint, glyph |
| queue | none | `changed` | `<<written-changed>>`, no style block | no `dg-styled` |
| printer | changed | `new` | `<<changed>> <<written-new>>` | `--st-width: 2px` (changed), glyph |

## Canonical impact

The user manual `src/doc/README.adoc`: updated in the three places that spoke of it (the command line section, "The states and the
tags you wrote by hand" which now states the rule and the report, the editor section), plus an anchor `plateau-state-tags`.
`CLAUDE.md`: not edited (not in this run's paths; W-7 owns the architecture paragraph, which may say that the default look of a state
is for the box that has the state). No other canonical document.

## Tasks

| Id | Task | Status |
|----|------|--------|
| T1 | Read the wave, run 0042, wave 008's docs, issue #28, the renderer, the editor's look code and the warning paths | done |
| T2 | Build a jar from `git archive` of HEAD, before any change, for the byte-identity check | done |
| T3 | `ChangeMarks` / `PlantumlUtilities` / `ItemRenderer` / `PlantumlViewRenderer`: the rule | done |
| T4 | `StateTags` (sentences), `StateTagReport`, `GenerateViewsCommand`, `DiffCommand` | done |
| T5 | Fixture `plateau-state-tags`, `StateTagRuleTest`, `ChangeMarksTest` additions | done |
| T6 | `state-tags.test.js` on the same files | done |
| T7 | Manual | done |
| T8 | Byte-identity against the jar of HEAD | done |
| T9 | Full suites, prettier, cargo, embed check | done |

## Acceptance criteria (the W-2 row)

- AC1. The CLI gives the default look of a state only to a box that has it: `StateTagRuleTest.aWordWrittenByHand...`, `ChangeMarksTest`
  (`aStateWrittenByHand...`, `theAuthorsStyleOfAWrittenState...`, `aViewKnowsTheStatesItHasWrittenByHand`).
- AC2. The editor does the same on the same case: `state-tags.test.js` (3 tests).
- AC3. A contradicting word is reported where it is seen, and the test proves it is seen: `StateTagRuleTest.theAuthorIsToldOnTheErrorOutput...`,
  `diffSaysItOnTheErrorOutput...`, `withoutAComparison...` read the error output of the real command line (picocli), the standard
  output being unchanged.
- AC4. A workspace without a comparison, and one with a comparison and no hand-written state word, generate byte-identical files:
  the byte-identity check (Verification), `aWorkspaceWithoutPlateausHasNothingToDisagreeWithAndSaysNothing`.
- AC5. The manual states the rule: see Canonical impact.

## Review passes

Run inline (one document; no subagent dispatched, as in runs 0042 and the runs of wave 008).

- **KDMLLC.** K: one rule in one class (`ChangeMarks`), one computed list of sentences (`StateTags`), one printer; no new option, no
  new format. D: the list of state words is in `ChangeMarks.STATES` (rendering) and `StateTags.STATES` (workspace): two copies of seven
  words, kept apart because `workspace` does not depend on `rendering`; the kernel's own list is a third (Rust). Noted in the issue
  filed. M: every case of the table above has a test; the warning's three situations (compared, plateau not compared, no plateaus) each
  have one. L: no change to the editor, the kernel, or the existing `log.warn` calls. U: the rule is the first line of the Javadoc of
  `ChangeMarks` and of `StateTags`, and the manual's paragraph. C: see below.
- **C scan.** Claim of the manual before this run, "the editor leaves your hand-written `new` as you wrote it, the command line gives it
  the default look": true before, false now (the sentence is replaced). Claim "the editor already follows the rule": measured by
  `state-tags.test.js`, which passed on the first run without a change to the page. Claim "a word that is the last stereotype and equals
  `contains-changes` is the computed state": not provable from the output (the kernel keeps `contains_changes` to itself), so a
  hand-written `contains-changes` on a box that holds no change is drawn as computed in both tools and is not reported; written down in
  the findings. Claim of `StateTags` that its "contains-changes" rule is the kernel's: same text as `above_changes` (every proper
  prefix of the reference of an element with a change, in the same layer); the union includes the replaced-with-removed-child elements,
  as the kernel does. Claim in the brief that `log.warn` is hidden: measured, the facet-dialect warning appears in no output of the
  built jar at the default level.
- **Open questions.** None left. S4's narrowing (no report for a workspace without plateaus) is this run's judgement and one condition
  in `StateTags.warnings`.

## Verification

All with the repository's own commands. `JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem` for Maven.

### Results

- `./mvnw -o -q verify` with JDK 25: exit 0; 259 tests in the surefire reports (251 before this run's), 0 failures, 0 errors, 0 skipped
  (integration tests are skipped by default). The first run failed in a dozen tests of `cli` because `StateTagReport.print` required a
  non-null command spec and several tests call `command.run()` directly (picocli not involved): the spec may now be null (the error
  output of the process is then used). The second run failed in `NativeReflectionConfigTest` for the two new classes
  (`StateTagReport`, `StateTags`), registered in `reflect-config.json`; the third is green.
- `src/main/rust/viewpoint-kernel/embed.sh --check`: "the committed WebAssembly is the one the sources build (651048 bytes)", exit 0
  (the wasm and `standalone.html` are untouched: `git status` shows neither).
- `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`: 160 passed, 0 failed (as before this run).
- `node --test "src/test/javascript/**/*.test.js"`: 767 tests, 767 pass, 0 fail (764 before plus the 3 of `state-tags.test.js`); the flaky
  "Open on a folder..." test passed.
- `npx prettier --check "src/**/*.java"`: clean.
- **Byte-identity (hard requirement 1).** A jar built from a `git archive` of HEAD (a1af032, before any change) against the jar of this
  run, on every workspace of `src/doc/examples` and `src/test/resources` (12 workspaces, 37 commands: `views generate`; and for the three with
  plateaus, each plateau with `views generate --plateau`, with `--baseline` the first plateau, `diff --plateau` in text and in JSON), the
  invented ticket office of this run excluded (only the new jar is meant to draw it differently). Result: the output folders are
  identical file by file (`diff -r`) in all 37, and the standard output and the exit code of the 37 commands are identical (six `diff` runs
  exit 1 in both: the first plateau has no baseline). The error output differs in 8: six are the stack frames of those expected errors
  (line numbers of `DiffCommand.run` moved), two are the new warning of this run on `domain_plateaus` (`views generate`, with and without
  `--plateau to-be`: `shop.payments` carries `new` and nothing is compared, see S4). With `--baseline as-is` on the same example the word
  agrees with the comparison and nothing is said, as in every comparison of the fixtures (none of them has a hand-written state word).
  The script is in the scratchpad, not committed.
- Before/after on the invented case, same files drawn by the old jar and the new one: only the stereotype of the counter and the style
  blocks differ (`diff -r` of the two output folders), which is the point.
- The manual's sample warning was produced by the built jar on a copy of `domain_plateaus` with the tag added to `customer`, and the text
  of the manual is that output.
- Not run: `-Dnative`, `failsafe` integration tests, a real browser (the editor is exercised by the harness with the real embedded kernel
  and the real page code, on a fake layout).

## Findings

- **For the wave (W-3 to W-7).**
  - *The warnings of the comparison (`Comparison.getWarnings()`, run 0042) still go nowhere.* The channel exists now: `StateTagReport`
    prints sentences on the error output of the command (`spec.commandLine().getErr()`; null spec falls back to `System.err`).
    W-3 can print the `replaces` warnings through it. Issue #35 asks for one channel for all the warnings.
  - *Every `log.warn` is invisible in the built application.* Measured on the facet-dialect warning (the fixture whose facets use `anyof`
    prints nothing on either stream). Not changed here; issue #35.
  - *W-3 draws `moved`/`split`/`merged`:* `ChangeMarks.STATES` already includes the three words, so a hand-written `moved` on a box that
    is not moved is `written-moved` today; a W-3 that adds the look of the three states keeps the rule by giving the look to the
    computed state only.
  - *W-5 adds the three states to `CHANGE_STATES`:* the editor's rule needs no change (the look comes from `item.change`), but a test
    on a hand-written `moved` there should be added with the states.
  - *The last stereotype is not proof of a computed `contains-changes`* (the kernel does not expose its flag): a hand-written
    `contains-changes` on an element that holds no change is drawn as computed in both tools and is not reported. Issue #34.
  - *The editor says nothing about a disagreeing word.* Issue #36.
- **The report is long (one sentence of about 300 characters per element and word).** A workspace with many hand-written tags gets many
  lines; the manual says the words can be dropped. A summary line would be a polish of the same channel.
- **Issues filed:** tmorin/archicode#34 (the kernel does not say whether `contains-changes` is computed), #35 (the warnings are hidden by
  the log level, one channel), #36 (the editor does not tell the author that a word disagrees).
- **Files touched outside `likely_paths`:** `src/main/java/io/morin/archicode/cli/GenerateViewsCommand.java` and `DiffCommand.java` (the
  warning must be printed by the commands; the new `cli/StateTagReport.java`), `src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json`
  (two classes), `src/test/javascript/viewpoint-kernel/state-tags.test.js` and `src/test/resources/plateau-state-tags/**` (the JS test and the
  shared invented case; `src/test/resources/**` is not in the paths of the brief, `src/test/javascript/**` belongs to W-1/W-4/W-5/W-6).
  `standalone.html` and the wasm were not touched.
- **Not verified.**
  - The editor in a real browser: the harness has no DOM layout; the look of a hand-written word in the page is proven on the variables of
    the box (`--st-*`) and the markup, not on pixels. The CLI look is proven on the `.puml`, not on a rendered PlantUML image (PlantUML
    1.2024.7 resolving `.written-new` as a style class is expected, since it is the same mechanism as any author's stereotype, but no image
    was rendered).
  - The native image (`-Dnative`): not built; `reflect-config.json` is checked by `NativeReflectionConfigTest` only. `StateTagReport`
    reads `spec.commandLine().getErr()` through picocli, which is covered by the real command line in the tests, not in a native binary.
  - A hand-written word on a deployed application shown under a node (the item of the technology layer has the application's reference):
    the check reads the elements of both indexes once each, the rendering renames per item; not exercised by an invented technology layer.
  - The wording of the warning on a real workspace (not read).
