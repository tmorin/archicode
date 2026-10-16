---
type: run
run: 0048
status: completed
wave: 009
---

# Run 0048: Identity proof

Wave 009 (`element-identity-across-plateaus`), item W-7 (phase P4, the last run). Focus: see the whole story work on an invented
architecture, in the CLI and in the real editor page, and have it documented. Document profile: `single-document` (the scope arrives
settled by the wave's W-7 row; the run documents, extends an invented example and measures); this file carries scope, decisions,
canonical impact, verification, the inventory of what was not verified in the wave and the follow-ups.

## Scope

1. Extend the invented example `src/doc/examples/domain_plateaus` so that it also tells the identity story, keeping what it showed
   (new, changed, removed), and commit its generated views.
2. The manual (`src/doc/README.adoc`): one story for `replaces` in the section "States of an architecture (plateaus)".
3. `CLAUDE.md` (architecture paragraph on plateaus) and `README.md` (only if it lists what the wave changes).
4. Look at the real editor page on the example (built-in browser, light and dark).
5. The final check: every command of the brief, and the byte-identity of a workspace that does not use `replaces` against the release
   made just before the wave (`archicode-0.12.0`).
6. The inventory for the whole wave: "Not verified in this wave" and "Follow-ups", with the GitHub issues.

## Decisions

- **D1. The example grows by what the story needs and nothing more.** The `shop` system keeps its new/changed/removed story (payments new
  with its hand-written `new` tag, mailer removed, catalog reworded, web changed) and gains: `orders` (split into `cart` and `checkout`),
  `invoices` and `receipts` (merged into `billing`), `reviews` and `ratings` (no `replaces`: the candidate that is not accepted), and
  `inventory` with its child `levels`, which moves to a new system, `warehouse` (a second file, `warehouse.yaml`, in both plateaus). Ids
  and names are invented, with no hyphen (issue #38). Result of `archicode diff`: elements +2 ~2 -2, replacing 2 moved, 2 split, 1
  merged, relationships +1 ~1 -1, one candidate (`shop.reviews` to `shop.ratings`, reason `description`).
- **D2. `inventory` is a manifest of its own** (`inventory.yaml`, `header.parent`), in both plateaus. First draft had it nested in
  `shop.yaml`; the editor refused to move it to `warehouse` (a nested element cannot go to a parent in another file, #43), so the story
  could not be walked in the editor. With a manifest of its own, *Move* changes `header.parent` and the example is reproducible in the
  page (done, see "In the editor").
- **D3. Three generated views are committed** (`views-to-be-vs-as-is/plantuml/application/`): `shop_web-overview` (unchanged), `shop-detailed`
  (new, changed, removed, split, merged, with the candidate not drawn) and `warehouse_inventory_levels-overview` (the moved container and
  its moved child). Produced by `archicode views generate --baseline as-is` on a copy and copied, as run 0041 did; the three were
  rendered with PlantUML 1.2024.7 and looked at. The gap files (`gap.md`, `gap.json`) are not committed (the example never committed
  them); the manual quotes the table.
- **D4. One story in the manual.** The overview already held the key, the states, the candidates, the warnings and the rule for state
  tags (runs 0043, 0044, 0046, 0047 wrote their parts in place). This run: the idea says what cannot be computed; the `replaces`
  section uses the example instead of the invented warehouse (the warehouse stays as the second invented workspace of `diff`, where its
  warning and its candidate are pinned by `theManualShowsWhatTheCommandPrintsOnTheWarehouse`); the tutorial goes from 7 to 9 steps (3:
  edit the plateau; 4: say what moved, was split or merged; 5: `diff`, the regenerated table; 6: decide about the candidate; 7: draw, now
  with three diagrams; 8: the editor, with the Changes panel, *Write replaces*, *Not related* and *Move*; 9: go on); the facet sentence
  lists the seven words of `change`; the Features entry and the upgrade note say what is true (one optional key, `replaces`, ignored by
  an older version; and the change of a hand-written state word on an element that does not have the state).
- **D5. Tests re-pinned or added, because the example now uses `replaces`.** `PlateauComparisonTest.aPlateauThatDoesNotUseReplaces...` used
  the example as its workspace without `replaces` (and its candidate); it now copies the example, strips every `replaces`, and asserts
  that no candidate, no `replacing` and no warning is printed, then that the unstripped example lists the candidate. Two new tests pin the
  example: its `diff` content, and the manual's two quotations of the table (tutorial and `diff`) to the command's output. A new JS test,
  `example-identity.test.js`, loads the example in the editor harness and reads the same rows and the same candidate from the table the
  manual quotes. These two files are outside `likely_paths` (reported).
- **D6. `CLAUDE.md`**: the paragraph of run 0042 is rewritten to the state of the wave (contract 4, `replaces`, moved/split/merged,
  candidates with the CLI and editor rule of D-7, the state-tag rule with `StateTagReport`, the editor's *Write replaces*, *Not related* and
  *Move*, the line-preserving save, the version counter `modelsChanged()` and what is still keyed on serialised models, #37). `README.md`:
  its "Compare two plateaus" entry says `diff` tells moved, split and merged.

## Canonical impact

None to the canonical documents of the repository (there is no `docs/arc` or `docs/dom`); the run adds no behaviour. It documents the
behaviour of runs 0042 to 0047. The one canonical statement, "a workspace that does not use `replaces` generates exactly the same files
as before the wave", is the P1 gate criterion and is re-checked here (below).

## Tasks

1. [done] Read the wave plan and log, runs 0042 to 0047 and 0041, the plateau parts of the manual.
2. [done] Extend `domain_plateaus` (D1, D2), regenerate and commit the views (D3).
3. [done] The manual, `README.md`, `CLAUDE.md` (D4, D6); the tests of D5.
4. [done] Look at the editor on a copy of the example, light and dark.
5. [done] Byte-identity against the jar of `archicode-0.12.0`.
6. [done] The suites, the inventory, the issues.

## Acceptance criteria (the W-7 row and the gate of P4)

- The manual describes `replaces`, the new states, the candidates, the move action and the rule for hand-written state tags, and its
  example workspace loads and gives the documented result: yes. `ManualExamplesTest` loads the example; `PlateauComparisonTest` pins the
  manual's quotations of the table to the command; `example-identity.test.js` loads the example in the editor and reads the same rows.
- The example is extended with `replaces`, its generated views are committed, and the editor page was looked at (light and dark) on it with
  a move, a split and a merge: yes (below).
- The `CLAUDE.md` paragraph is up to date; the suites and prettier pass; every "not verified" item of the runs is listed: yes (below).

## Evidence notes

### The example, in the CLI

`archicode diff` on `src/doc/examples/domain_plateaus`: elements +2 ~2 -2 (one of the two changed is wording only), `replacing 2 moved, 2
split, 1 merged`, relationships +1 ~1 -1, one candidate (`shop.reviews` to `shop.ratings`, reason `description`), exit 0, empty error
output (the hand-written `new` of `shop.payments` agrees with the comparison). `picking`, which pointed at `shop.inventory` and now points
at `warehouse.inventory`, has no row. `views generate --baseline as-is` writes `views-to-be` and `views-to-be-vs-as-is` (with `gap.md` and
`gap.json`); the three committed `.puml` are byte-identical to what it generates. `views generate` of the plateau alone says on the error
output that `new` on `shop.payments` is a state of a comparison and nothing is compared (the rule of run 0043, told in the manual).
Rendered with PlantUML 1.2024.7 and looked at (PNG, read by the run): `shop-detailed` draws the dotted `changed`, thick `new`, dashed
struck `removed`, medium-dash `split` boxes `(from shop.orders)` twice and the short-dash `merged` box `(from shop.invoices,
shop.receipts)`, the system as `contains-changes`, the legend with a line each for split and merged, and no candidate; `warehouse_inventory_levels-overview`
draws the long-dash `moved` container and its moved child, each `(from ...)`; `warehouse-detailed` shows `picking` unchanged with its
link to the moved container. Nothing overlaps.

A facet that selects on the new words was tried by hand (not committed): `$.application..elements[?(@.change == 'split')]` with `REMOVE`
removes `shop.cart` and `shop.checkout` from the views of the comparison. Removing an element that a relationship points at (`moved`,
`changed`, or a plain element in 0.12.0) fails with `dangling reference` and a stack trace: not this wave's, issue #46.

### The real editor page

Served with the built jar (`editor serve -w <scratchpad copy>/workspace.yaml`) on copies of the example in the scratchpad (never in the
repository), driven in the built-in browser pane (an 800 x 416 pane: small, so the Map is drawn small; the Changes panel was read as text
and as screenshots; the Map was zoomed to 67%). Light and then dark (emulated `prefers-color-scheme`).

- *Compare to the first plateau.* The header offers `Nothing | Baseline: As is | As is`. With *As is*, the Changes panel counts `+ 2 new`,
  `~ 2 changed`, `- 2 removed`, `-> 2 moved`, `split 2`, `merged 1` for the elements and `+ 1 new`, `~ 1 changed`, `- 1 removed` for the
  relationships; the elements list is the rows of the CLI table, in the same order and the same words (`from shop.inventory`,
  `from shop.orders; split with shop.checkout`, `from shop.invoices, shop.receipts`); one candidate, *Reviews* and *Ratings*, reason
  `close description`, with *Write replaces* and *Not related*. The tree marks `+ ~ -> split merged +-` after the names. The Map, unfolded
  and zoomed, draws the moved container with its moved child, the two split boxes, the merged box, the removed `Reviews`, the new `Ratings`,
  the changed `Web site` and the system as `contains-changes`; the key says `moved 2 boxes`, `split 2 boxes`, `merged 1 box`.
- *Accept the candidate.* *Write replaces* on Reviews/Ratings: the row `Ratings` is `moved` (`from shop.reviews`, `name, description`),
  the counts read `3 moved`, `Save all changes (1)`, one file modified. The comparison then proposes `Mailer`/`Payments` (reason: the
  only two of their kind under the same parent), as the manual now says; *Not related* sets it aside (`Candidates 0`, `1 set aside. Show
  again`), nothing written.
- *One Move.* On a copy whose `to-be` has `inventory.yaml` under `shop` (no `replaces`): Edit, *Move*, the dialog lists `Warehouse` as the
  only parent (the reference changes, 1 reference rewritten in 1 file, and *Move and write replaces* "also writes replaces on 2 elements
  (this one and the ones inside it)"). Choosing it and *Move and write replaces*, then *Save all changes*, changed exactly: `parent:
  warehouse` in `inventory.yaml`, `replaces` on `inventory` and on `levels`, and `destination: warehouse.inventory` in `warehouse.yaml`.
  `archicode diff` on that saved copy prints the same output as on the committed example (compared with `diff`: identical). The
  Changes panel after the move reads the same counts as the CLI. The editor's output differs from the committed files by quoting and
  comment only (issue #45).
- *Refusal seen.* On the first draft of the example (the container nested in `shop.yaml`) the Move dialog listed no parent and said
  "1 more parent is not listed ... the editor does not cut a block out of one file and put it in another": the documented limit (#43),
  which is why the example's container has a manifest of its own (D2).
- *Dark.* The same Changes panel, tree marks, chips, key and Move dialog read in the dark scheme (the moved, split, merged, removed, new and
  changed boxes keep their outline styles, with the lighter colours); the Map at 67% was looked at in light and dark.
- *Wrong or odd.* Nothing wrong in the page was found. A synthetic `change` event on the *Compare to* list set the select but not the
  comparison (the real `form_input` path worked): a test artefact, not looked into. Small pane: the floating toolbar of the Map covers the
  bottom of the drawing and *Fit* shows 10 to 21%: the pane's size, as in earlier runs.

### Review passes

- KDMLLC, inline: K: the manual gained one step for each thing the reader does (say it, ask, decide, draw, edit) and no new section;
  the example gained five elements and one file, no new feature. D: the `replaces` rules stay where runs 0042 to 0047 wrote them and the
  tutorial links; the table is quoted twice and a test pins both quotations to the command. M: every output has its place (CLI, views,
  editor), and the stale sentences were searched for (`does not yet`, `three states`, `next wave`, `not implemented`, `not yet`, `four
  states`: the remaining hits are correct). L: no code changed. U: the tutorial says what each step shows. C: below.
- C scan. Claim of run 0044, "the sample of the manual's `diff` for `domain_plateaus` must be regenerated": done and pinned. Claim of
  run 0045 (S2), "runs 0046 and 0047 inherit the cache": confirmed by the editor test (a move and an accept change the counts at once).
  Claim of the manual about `replaces` warnings, "a duplicate or a malformed entry is a warning": false for the command line (issue
  #40), corrected below. Claim "the editor and the CLI say the same": checked on the example with the rows of the table (JS test and the
  page).
- A second reader, a `general-purpose` subagent that did not write the section, ran the CLI on copies of the example and checked the
  tutorial, the `diff` quotations, the states, the state-tag sentences, the upgrade note and every cross reference; the editor steps it
  only read. It found, and these were fixed in the manual: the layout tree and Step 4 hid the two files `inventory.yaml` and
  `warehouse.yaml` and said "a new system" for one that exists; the NATURES column and the qualifier edit were not explained; Step 6 did
  not show what writing `replaces` does in the CLI (and the second candidate); Step 8's copy instructions were hard to follow; "every
  box and every link says its state" meant the changed ones; the manual said a malformed or duplicate `replaces` is a warning (it is a
  crash of the manifest reader, or nothing: #40); "the computed state is last" and the `written-new` stereotype were not explained;
  the line of `split` differs between the CLI and the editor (#42, now said); a test sentence in the tutorial. It also noted that every error prints a
  Java stack trace (#26, existing).

## Verification

All with the repository's own commands. `JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem`, on the final tree.

- `./mvnw -o -q verify`: exit 0; 275 tests in the surefire reports (273 before this run, one test replaced and two added in
  `PlateauComparisonTest`), 0 failures, 0 errors, 0 skipped (integration tests are skipped by default). The asciidoctor step ran, printed
  no "Could not load PlantUML" in this run, and every `<<...>>` of the manual resolves to an id of the generated page (the only two names
  that do not are the literal `<<changed>> <<external>>` of a code span in the stereotypes section, as before).
- `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`: 160 passed, 0 failed.
- `src/main/rust/viewpoint-kernel/embed.sh --check`: "the committed WebAssembly is the one the sources build (651048 bytes)", exit 0
  (`embed.sh` itself was not run).
- `node --test "src/test/javascript/**/*.test.js"`: 845 tests (842 + the 3 of `example-identity.test.js`), 845 pass, 0 fail; the flaky
  test did not fail.
- `npx prettier --check "src/**/*.java"`: "All matched files use Prettier code style!", exit 0.
- **Byte-identity against the release before the wave.** Old jar: `git archive archicode-0.12.0` extracted in the scratchpad and built
  with `./mvnw -o -q -DskipTests package`. New jar: the jar of this tree (no Java or kernel code is changed by this run; the jar of the
  final tree is the one of the wave). Every command ran on a fresh copy of each workspace at the same absolute path, with each jar. 13
  workspaces, 106 command runs per jar: `views generate` on each; on the four with plateaus (`plateau-comparison` with 3 plateaus,
  `plateau-state-tags`, `domain_plateaus` as it was before this run (from `git archive HEAD`), and `replaces` of the warehouse), each
  plateau with `views generate --plateau`, `diff --plateau` in text, JSON, Markdown and `--no-wording`, and each ordered pair with
  `views generate --plateau P --baseline B` and `diff --plateau P --baseline B` in the three formats. Compared: standard output, error
  output, exit code, and the whole generated folder tree (`diff -rq`).
  - *Identical in every respect (standard output, exit code, error output, generated files):* the nine workspaces without plateaus
    (`domain_application`, `domain_technology`, `domain_viewpoint_views`, `domain_workspace`, `facet_example_step_1` to `4`, and the
    viewpoint-kernel fixture `src/test/resources/viewpoint-kernel/workspace`), and 36 of the 40 commands on `plateau-comparison`.
  - *Same standard output, exit code and files; the error output differs only by a stack-frame line number* (`DiffCommand.run(DiffCommand.java:74` against
    `:78`) of the already expected error of `diff` on a first plateau, which has no baseline: the 4 other commands on `plateau-comparison`
    and 4 on `domain_plateaus` before this run (exit 1 in both).
  - *`domain_plateaus` as it was before this run* (12 of 19 commands identical): `generate`, `gen-to-be` and `gen-as-is-vs-to-be` print the
    intended new warnings about the hand-written `new` of `shop.payments` (on the error output only), and `views generate --plateau
    as-is --baseline to-be`, where `shop.payments` is a removed element that carries `new`, writes `<<written-new>>` in place of `<<new>>`
    in 6 views (the rule of run 0043); standard output and exit codes are the same.
  - *`plateau-state-tags`* (the intended exception: hand-written words): standard output and exit codes identical, the error output gains the
    warnings, and the 2 comparisons whose words disagree write `.written-new` styles and `written-new` stereotypes.
  - *`replaces` of the warehouse*: differs as expected (the 0.12.0 jar does not know the key: 18 of 19 commands differ in output or exit code).
  - Result: no difference in standard output, in exit code or in generated files for any workspace that uses neither `replaces` nor a
    state word written by hand on an element that does not have the state; the only difference is the stack line number in the error output of an
    already failing command. The comparison script, its two result trees and the logs are in the scratchpad, not committed.
- The example in the editor harness: `example-identity.test.js` (3 tests) loads `domain_plateaus` through the page's own loader, compares
  with the baseline, and finds the rows and the candidate of the table the manual quotes.

## Not verified in this wave

Merged from the "not verified" lists of runs 0042 to 0047 and this run. "Seen" means looked at on the real page or in a real output in the
run named; everything else was tested on markup, on text or by reading.

**Browsers and devices.**
- Only the built-in browser pane drew the page in this wave (runs 0046, 0047 and 0048; about 990x514 and 800x416): Firefox, Safari, Edge and
  any other engine were not used for the new states, the Candidates section, the Move dialog and the Replaces form; the CSS is standard.
  Wave 008's Firefox look was not repeated.
- Touch devices, Windows, a screen reader and a colour-vision simulation: the words carry the state (marks, pills, `aria` labels); nothing was
  listened to or simulated.
- Large panes: the Map was looked at in small panes only; the floating toolbar covers part of the drawing and *Fit* shows 10 to 21% there.
- The element form's *Replaces* section, its datalist and the details row, in a real browser (tests only, run 0046); the *Library* page
  with a comparison on; the PNG download of a drawing with the new states (SVG exports are tested on text).

**The File System Access path, the native image and the integration tests (issue #29, wave 008's).**
- *Write replaces* and *Move* through a folder picked by the browser (the runs used the served folder, which has handles of its own).
- `./mvnw verify -Dnative` was never run in this wave: `reflect-config.json` lists the new classes (`NativeReflectionConfigTest` passes),
  but no image was built; the warnings printed through picocli's error output and `StateTagReport` were run on the JVM only. The Failsafe
  integration tests (skipped by default) were not run.

**Real data.**
- No real workspace was read in this wave: the thresholds and the quality of the candidates (issue #33), the wording of the warnings, the
  reading of a split's relationships, and the time of everything on a real pair were not checked. `candidates()` is quadratic in the removed
  times the new elements of a layer (run 0042); `moveIsPossible` and the dialog's scan of manifests run at each render of the form (run
  0047); the comparison cache was measured in Node on 3,060 elements (run 0045). None was measured on a real or a large pair or in a browser.
- The manual's tutorial was followed by its author and checked by a reader subagent (CLI steps only); the editor steps were not read
  by anyone who did not write them, and no person who had not seen the tool read it.

**Drawing and export.**
- PlantUML other than 1.2024.7; the glyphs `⋔` and `⊕` on a machine whose fonts lack them; a very long `(from ...)` title on a merge of many
  elements (run 0044); the cut of the same title in the editor (run 0046); the dash patterns at small zoom on a large workspace.
- Facets on the new states: tried by hand on the example in this run (a `REMOVE` on `split` works), not committed as a test.

**Formats and edits.**
- A save of a manifest that holds a flow collection other than a plain one-line list (`{...}`, a list inside a `- ` item, nested brackets) or a
  tab: the file is rewritten by the emitter (#41); `replaces: ["a: b"]` on one line (run 0046) was not exercised; a move with such
  a block (run 0047).
- A `replaces` that is not a list, or listed twice, through the command line (#40).
- A nested element moved to a parent in another file (#43), to the top level (#44); the quotes lost by a rewritten line (#45).
- A TOML or JSON workspace with `replaces` (the structure checks run on any format and are tested through YAML; the editor reads YAML only).

**Not committed.** The gap files (`gap.md`, `gap.json`) of the example, and a test of a facet that selects on the new words.

## Follow-ups

Every item has a GitHub issue on tmorin/archicode unless it says otherwise. None is started.

| Issue | What | From |
|---|---|---|
| #33 | check the candidates and the relationships of a split element on a real pair | 0042 |
| #34 | the kernel does not say whether `contains-changes` is computed or hand-written | 0043 |
| #35 | the warnings of the application are hidden by the log level `ERROR`: one channel | 0043 |
| #36 | the editor does not tell the author that a hand-written state word disagrees | 0043 |
| #37 | a diagram render still serialises the kernel input to key its cache | 0045 |
| #38 | an element id with a hyphen makes the generated PlantUML invalid (the example avoids it) | 0044 |
| #39 | decide whether the CLI lists candidates for a plateau that does not use `replaces` (D-7 decided it for now) | 0044 |
| #40 | a `replaces` listed twice or malformed never reaches the warnings (a non-list crashes the manifest reader, seen again here) | 0044 |
| #41 | the editor's save rewrites the whole file for a flow collection that is not a plain one-line list | 0046 |
| #42 | align the line style of a split element between the CLI and the editor | 0046 |
| #43 | move a nested element to a parent declared in another file | 0047 |
| #44 | move to the top level, and say why a parent is not offered | 0047 |
| #45 | a line rewritten by a move or a rename, and a line added by *Write replaces*, drop the quoting style of the file (new, this run) | 0047, 0048 |
| #46 | removing an element that a relationship points at, with a facet, fails with a dangling reference and a stack trace (new, this run; not this wave's) | 0048 |

Issues of earlier waves that this wave fulfils, for the pull request to close (this run does not touch GitHub other than filing): #22
(`replaces`), #23 (the move action, with #43 and #44 for what it leaves), #28 (the state tag rule), #32 (the comparison cache; #37 for
what it leaves). Still open and untouched: #24 to #27, #29, #30.

Not filed, on purpose (cosmetic, unmeasured, or no reproduction): the report of the state-word warnings is one sentence per element and
word and could have a summary line (run 0043); the key under a diagram is long in a small pane (0046); the width of the title of a box with
a long `(from ...)` (0044, 0046); the wasm grew by 50 kB and the page by about 67 kB with `compare` (0042; wave 008's size item is in #29);
the kernel's `compute` fails with `dangling reference` for the deep viewpoint when an ancestor is missing from its input (run 0042: the
union of `compare` never produces it, and no workspace reaches it today; the facet case of #46 is the nearest reproduction); a first reader
who did not write the manual.

## For the wave (the orchestrator lands these)

- The example `domain_plateaus` now uses `replaces`: the CLI lists its candidate (D-7), so the quotations of the table in the manual are
  pinned by `PlateauComparisonTest` and read by `example-identity.test.js`; whoever edits the example must regenerate the table and the
  three committed views (`views generate --baseline as-is` on a copy).
- The manual still says in two places that a duplicate or malformed `replaces` is handled differently by the CLI than by the kernel: that is
  #40, and the manual tells the truth for now.
- Files touched outside `likely_paths`: `src/test/java/io/morin/archicode/cli/PlateauComparisonTest.java` (the test that used the example
  as a workspace without `replaces`, re-pinned, and two tests added) and `src/test/javascript/viewpoint-kernel/example-identity.test.js` (new).
  Inside: `src/doc/README.adoc`, the example and its three committed views, `CLAUDE.md`, `README.md`, this document.

