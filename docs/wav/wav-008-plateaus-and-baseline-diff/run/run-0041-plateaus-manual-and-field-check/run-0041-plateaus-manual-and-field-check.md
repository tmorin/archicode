---
type: run
run: 0041
status: completed
wave: 008
---

# Run 0041: Plateaus manual and field check

Wave 008 (`plateaus-and-baseline-diff`), item W-8 (phase P4, the last run). Focus: trust the feature on a real baseline and target,
and learn how to use it from the manual. Document profile: `single-document` (the scope arrives settled by the wave's W-8 row;
there is no design to draw: the run writes documentation, extends an invented example and measures); this file carries scope,
decisions, canonical impact, verification, the inventory of what was not verified and the follow-ups.

## Scope

1. The manual (`src/doc/README.adoc`): make the feature teachable as one story.
2. The invented example `src/doc/examples/domain_plateaus`: illustrate the finished feature.
3. A field check on the author's real baseline and target, copied to the scratchpad and arranged as two plateaus by following only
   the manual (the originals are read-only client data; nothing of them is committed).
4. The final inventory: "Not verified in this wave" and "Follow-ups".

## Decisions

- **D1. Where the story lives.** A new top-level section `== States of an architecture (plateaus)` (`[[plateaus-overview]]`), placed after
  the Domain section and before the Editor (a reader has met manifests, layers and views by then, and the tutorial points forward to the
  Editor and Commands sections). It holds: the idea, the layout, the settings in short, the four states (with how a hand-written tag keeps
  working and what wins), a seven-step tutorial and the upgrade note (`[[plateaus-upgrade]]`). It repeats the rules only in a compact table
  and points to the existing detailed sections (`[[plateaus]]`, `[[plateau-comparison]]`, `[[plateau-add]]`, `[[diff]]`,
  `[[generate-views]]`, `[[editor-*]]`), which were correct and are not rewritten. The Features list got one entry; `[[plateaus]]` got a
  pointer to the overview and its `IMPORTANT` breaking-change paragraph a pointer to `[[plateaus-upgrade]]`.
- **D2. The tutorial quotes real output.** `scratchpad/r41/doc/gen.sh` rebuilds the tutorial from the example (one plateau, `plateau add`,
  the to-be files, `diff`, `views generate --baseline`) and writes the output that the manual quotes (`plateau add`, `diff`, the `ls` of the
  output folders); the `diff` snippet of `[[diff]]` is the same regenerated output (it said `+1 ~1 -0` for the first, smaller, example).
- **D3. The example grows minimally** (`src/doc/examples/domain_plateaus`): the files of `shop.yaml` only. as-is has `shop.web` (reads
  `shop.catalog`, sends mails with `shop.mailer`), `shop.catalog` and `shop.mailer`; to-be reworded the catalog description (wording
  only), added the qualifier `React` and the new link `pays with` to `shop.web`, changed the label `reads` to `browses`, dropped the
  mailer (removed element and removed relationship) and added `shop.payments` with a hand-written `rendering-stereotypes: "new"`. The
  system `shop` is the `contains-changes` box. Counts: elements +1 ~2 -1 (1 wording only), relationships +1 ~1 -1. The default previous
  plateau is the baseline (no `baseline` key in the file: the key is shown in `[[plateau-comparison]]` and by `plateau add --baseline` in
  step 7). `ManualExamplesTest` is untouched and passes (it loads the default plateau of every `workspace.yaml` under the examples).
- **D4. One generated view is committed** in the example (`views-to-be-vs-as-is/plantuml/application/shop_web-overview.puml`, the way the
  design examples commit theirs) and drawn in the tutorial with `[plantuml]`, so a reader sees the four states in one picture. It renders
  with PlantUML 1.2024.7 (looked at as a PNG; the manual build run with `DIAGRAM_PLANTUML_CLASSPATH` pointing at that jar renders every
  diagram with no error; without the jar this environment prints the same "Could not load PlantUML" error for it as for the 15 older ones).
- **D5. The hand-written tag, as the code does it** (read, then run): a tag `rendering-stereotypes: "new"` is a stereotype like another;
  the kernel moves a computed state already in the list to the end, so it is written once and last, and the entry of `styles.by-tags` named
  like the state wins over the default look property by property. One difference between the tools, written in the manual and listed as a
  finding: the editor gives the default look of a state only to a box that has that state, the CLI emits the look as a style of the
  stereotype, so a hand-written `new` on an unchanged box gets the thick outline in a view that has something new (checked on the example
  with `new` written on the unchanged `customer`: the `.puml` says `<<new>>` and carries the `.new` style).
- **D6. Outside the declared paths**, because they document the feature and nothing else: `CLAUDE.md` (architecture paragraph: the
  subcommands list, which still said two groups, and one paragraph on plateaus, the kernel's three entry points and the states) and
  `README.md` (a "Compare two plateaus" entry in its list of commands). `src/site/index.html` was checked and left alone: it has no list of
  features that this belongs in and no upgrade or release notes. No changelog file was created.

## Canonical impact

None to the canonical documents of the repository: there is no `docs/arc` or `docs/dom` in it, and the run adds no behaviour. It
documents the behaviour of runs 0034 to 0040 in the manual, the example, `CLAUDE.md` and `README.md`. The one thing that reads as a
canonical statement, "a workspace without plateaus is byte-identical to before", is the P1 and P2 gate criterion and is re-checked here (see
the field check, c).

## Tasks

1. [done] Read the wave plan, the wave log, runs 0034 to 0040 and the whole plateau parts of the manual.
2. [done] Extend `domain_plateaus` (D3), check `archicode diff`, `views generate --baseline` and `plateau add` on it.
3. [done] Write the overview section, the tutorial and the upgrade note (D1, D2); regenerate the quoted output; commit one view (D4).
4. [done] Field check on the copies of the real baseline and target (below); fix the manual where it was not enough.
5. [done] The wasm growth: cause found (below), nothing shrunk.
6. [done] `CLAUDE.md` and `README.md` (D6); the inventory and the follow-ups (below).
7. [done] Verification (below).

## Acceptance criteria (the W-8 row and the P4 gate)

- The manual describes plateaus, the comparison and the breaking change, and its example workspace loads: yes. The new section
  `plateaus-overview` and the upgrade note `plateaus-upgrade`; `ManualExamplesTest` passes in `./mvnw -o verify`.
- On the copy of the real pair arranged as two plateaus the counts are the study's, or the difference is explained: yes (below).
- Every "not verified" item of the runs is listed: yes (section "Not verified in this wave").
- The manual builds with no new `possible invalid reference` info: yes, none at all (the two of before the wave were removed by escaping one sentence).

## Evidence notes

### The manual, read as a first-time reader

Read in full order (Introduction to the Appendix, with the plateau parts of runs 0034, 0035, 0038, 0039 and 0040 in context). What was
found and done:

- The feature was told in five places (the duplicate paragraph, `Plateaus`, `Comparing two plateaus`, the commands, the editor) with no
  place that said what it is for, how to start and what breaks. The overview, the tutorial and the upgrade note are that place (D1); the
  parts written by the runs were correct and are untouched, apart from three pointers and the `diff` snippet (regenerated, D2).
- Names, option spellings, output folders and glyphs agree between the parts: `--plateau`, `--baseline`, `--format`/`-f`, `--no-wording`,
  `views-<plateau>` and `views-<plateau>-vs-<baseline>`, the glyphs `+ ~ - ±` (the minus is U+2212 everywhere), *Compare to*, *Baseline:
  <name>*, *Changes only*, *Hide wording-only changes*. One inconsistency found and fixed: the `[[diff]]` snippet was the output for the
  first, smaller example (`+1 ~1 -0`) and would have disagreed with the example as it now is.
- Three titles were the same twice (`Plateaus`, `Comparing two plateaus`: domain and editor), so the overview names the cross references
  (`<<editor-compare,Comparing two plateaus in the editor>>`); the two titles themselves were left alone (anchors are used by the site's
  links and by other runs' tests).
- The asciidoctor build printed the two `possible invalid reference` infos that exist since before the wave (`changed`, `external`). Their
  cause is one sentence of the stereotypes section that writes `<<changed>> <<external>>` (the stereotypes of a `.puml`) in backticks, which
  asciidoctor reads as two cross references. It was escaped as literal text (`` `+<<changed>> <<external>>+` ``): the page reads the same and
  the build now prints **no** `possible invalid reference` (this run added none, and removed the two). Every `<<...>>` of the new section
  resolves (checked against the ids of the generated HTML).
- The PlantUML diagram of the tutorial is the 16th the environment cannot draw without the jar; with
  `DIAGRAM_PLANTUML_CLASSPATH=<plantuml-1.2024.7.jar>` the build draws all of them with no error.

### The example

`archicode diff` on `src/doc/examples/domain_plateaus`: elements +1 ~2 -1 (one of the two changed is wording only), relationships +1 ~1 -1,
exit 0. Its to-be plateau carries a hand-written `rendering-stereotypes: "new"` on the new element; the `.puml` of the comparison says
`<<new>>` once. `views generate --baseline as-is` writes `views-to-be` and `views-to-be-vs-as-is` (with `gap.md`, `gap.json`) in 2 s;
`plateau add later --from to-be --baseline as-is` writes `plateaus/30_later` and the `baseline` key (the diff of the file is the new entry).
The overview of `shop.web` was rendered with PlantUML 1.2024.7 and looked at: thick green box with `+ Payments`, dotted orange boxes with
`~`, a dashed grey box with a struck `- Mailer`, the system with a thin dashed outline and `±`, the three links with their marks and the legend
below; nothing overlaps.

### The field check

Method. The originals (`as-is`, `to-be`: 91 files) were never written (`md5sum` of the 91 files before and after: identical, the list taken
at the start of the run). A copy was arranged by following only the tutorial I had written: both `manifests` folders became plateau
folders (`plateaus/10_as-is`, `plateaus/20_to-be`), one `workspace.yaml` (the target's) with `manifests.paths` deleted and the two plateaus
listed. Nothing of the data, no name or text, is in this run document or in the repository.

Where the manual was not enough or wrong (each fixed in `README.adoc`):

1. *Two workspaces already exist.* The tutorial assumed one workspace plus `plateau add`. Nothing said which `workspace.yaml` to keep (only
   one is read; its settings, styles, formatters and facets apply to every plateau), that the other one is dropped, nor that `plateau add`
   never adopts a folder that exists, so the second plateau must be listed by hand. Added to step 1.
2. *Several `manifests.paths`.* A plateau is one folder; a workspace that listed several would have to merge them. Said in step 1.
3. *`manifests.paths` left behind.* An empty `manifests:` key is fine, but `paths: []` counts as written and is refused. Said in step 2.
4. *Long lines.* The text table is as wide as the longest reference (447 characters on the real pair): the manual now says to read it with
   `less -S` or to take `markdown`.
5. *Time.* `views generate --baseline` roughly doubles the time (the manual only said the number of views): said, with the measured order of
   magnitude (about 40 to about 90 seconds on 3,400 views).
6. *The folder of the comparison.* A workspace that disables its global views (`settings.facets.global-enabled: false`) has only `gap.md` and
   `gap.json` in `views-<plateau>-vs-<baseline>`; the manual did not say it, and a reader would look for the views there. Said under
   `--baseline`.
7. *The default view folder moves.* Listing the first plateau changes `views` into `views-<plateau>`; the tutorial said "works as before".
   Corrected in step 2.

Found and not a manual matter (findings): the CLI gives the default look of `new` to an unchanged box that carries a hand-written `new`,
the editor does not (D5); the manual says so.

(a) `archicode diff`, text and `--format json`, on the arranged copy: elements **38 new, 26 changed (10 wording-only), 5 removed**;
relationships **71 new, 12 changed, 15 removed**; 167 rows. These are the study's numbers as runs 0036, 0038, 0039 and 0040 got them
(79 and 23 in the study count the 8 label-only pairs as one removed plus one new: 71 + 8 and 15 + 8); no difference to explain. The 26
changed elements are the study's 25 minus the 4 that only carried the hand-written tag, plus 5 that only changed by their relationships;
10 of them are wording-only at element level (14 at property level), as run 0036 explained. `diff` takes 2.4 s with the JVM start. A
`diff --no-wording` hides the 10 and says so.

(b) `views generate --baseline as-is` (the plateau `to-be`, the default): 6,923 files in 91 s (`/usr/bin/time`: 1 min 31 s, 372 MB resident):
nine plateau folders, one per facet (`views-to-be-<facet>`), of 379 files each (3,411 `.puml`), nine comparison folders
(`views-to-be-vs-as-is-<facet>`) of 390 files each (11 more: the views of the removed elements) and `views-to-be-vs-as-is` with `gap.md` and
`gap.json` only (that workspace disables the global views, so there is no `views-to-be` folder). The 3,512 files
of run 0038 are the comparison's share (3,510 + 2). The plain plateau alone takes 39 s, so the comparison costs about 52 s. The 9 plateau
facet folders are byte-identical to the 9 folders of the plain to-be generated with the wave 007 jar.

(c) Byte-identity of workspaces without plateaus, a jar built from `git archive 06d5104` (the wave 007 tip: `./mvnw -o -q -DskipTests package`
in the scratchpad, 32 s) against the current jar, `views generate` run in place on copies, `diff -rq`: the real to-be (3,411 `.puml`):
**empty**; the real as-is (927 `.puml`): **empty**; the nine fixtures of the repository that have views (743 `.puml`): **empty**. 5,081
`.puml` in all, the same totals as runs 0035 and 0037.

(d) The editor, on a copy of only the arranged folders (90 files, no generated views), `editor serve` on a local port, a headless Firefox
over the snap geckodriver (the method of runs 0035, 0039 and 0040), following the editor steps of the tutorial in light and then dark.
Every screenshot was opened. The built-in browser was not used (its screenshot times out here). The server was stopped afterwards, and the
`md5sum` of the 90 files of the copy is the same before and after (nothing was written).
- *Plateau selector* (light and dark): the header reads `Plateau [As is 2026-Q3] [To be 2027-Q1]`, then `Compare to [Nothing]` and the Map; `To
  be` is pressed (the last plateau); a click on `As is` draws the Map of the first plateau (11 items, no marks, no state pills, only the
  author's own `external`), and back.
- *Compare to the baseline* (light and dark): `Baseline: As is` is the option after `Nothing`; a `Reload` button and the group `Everything |
  Changes only` appear in the header. The Map draws the union: new boxes with a thick green outline, a `+` and a pill `new`, changed ones
  dotted orange with `~` and the pill `changed`, the author's light fills showing through; the new links thick green with a `+` beside them,
  the changed ones dotted with `~`. A hand-written `changed` pill sits before the computed `new` on a box that has both. In dark the same
  boxes keep the author's light fills (they never followed the theme), the lines are a lighter green, orange and grey and read on the dark
  background, the pills and glyphs read.
- *The legend* (the key under the drawing, light and dark): the author's stereotypes, then `To be compared with As is:` and one entry per
  state with a sample of its box and its link, its mark, its name, how its line is drawn and how many boxes and links the drawing shows (new: 2
  boxes, 3 links; changed: 5 boxes, 4 links; removed: 1 box, 2 links; contains changes: 0 boxes), and the sentence that red dashed is kept
  for dangling references.
- *The Changes panel* (nothing selected): `CHANGES`, the line "To be compared with As is.", the chips `+ 38 new`, `~ 26 changed`, `- 5 removed`
  and `+ 71 new`, `~ 12 changed`, `- 15 removed`, the checkbox *Hide wording-only changes*, "10 of the changed elements are changes of
  wording only", then `ELEMENTS 69` and the rows (a `+ new` chip, the name in bold, the reference in grey).
- *What changed* (a click on a changed row): the panel gets the tabs `Selected | Changes 167`, the name with its pills, the block `WHAT CHANGED
  ~ CHANGED` with "Changed: description (wording only)", then `- Before` (the old text struck through) and `+ After`, then kind, layer,
  id and reference; the box is outlined on the Map (a dotted blue ring over its dotted line). Light and dark read the same.
- *Changes only* (light and dark): the Map falls from 13 items to 10: the removed box (dashed grey, struck title, `removed`) appears where it was,
  new and changed boxes stay, two unchanged boxes that are ends of changed links are drawn faded with no pill and no mark, their tree rows are
  greyed; the key adds "context faded: shown to place the changes, 2 boxes". The focal box is not faded.
- No defect was found in the page in this run.

(e) *Timing and size.* CLI: 2.4 s for `diff`, 91 s for `views generate --baseline` (above), 39 s for the plain plateau. In the editor the
comparison took 58 to 111 ms in runs 0037 and 0039 and was not timed again.
*Why the wasm grew from 495,062 bytes (wave 007, commit 06d5104) to 601,247.* Both numbers were rebuilt here with `embed.sh`'s flags and
are exact. `Cargo.toml`, `Cargo.lock` and `rust-toolchain.toml` are unchanged since the wave 007 tip, so the cause is neither a new
dependency nor a build profile (`opt-level = "z"`, `lto`, `codegen-units = 1`, `panic = "abort"`, `strip` were already on). The same sources
with the `compare` export removed give 505,043 bytes: the `compare` module is **+96,204 bytes**, and the work of run 0037 in `compute`
(`change` on every item and link, `only_changes`, the container marker) is **+9,981**. Inside the 96 kB (a build with symbols, 93.8 kB of code
only in the `compare` build, grouped by hand from the function names): about 39 kB are the functions of the module itself (the matching
`run`, `check`, the relationship comparison, the serde `Deserialize` of its inputs and `Serialize` of its output), about 19 kB are monomorphised
copies of the standard library's stable sort (about 560 bytes each, one per sorted type: relationships, output elements, strings, pairs of
string and JSON value) and about 19 kB the `BTreeMap` and `BTreeSet` code for the `String`-keyed maps of the module, the rest is `hashbrown`,
iterator adapters and `serde_json` serialisation. `standalone.html` went from 1,325,495 to 1,572,515 bytes (+247,020): the wasm in base64 is
+141,580 of that (601,247 bytes make 801,664 characters), the rest, about 105 kB, is the editor of runs 0038 to 0040 (the comparison, the
Changes panel, their styles). Nothing was shrunk (not asked). What a later look could try, none measured: a `sort_unstable_by` or a single
sort helper in place of the one-per-type sorts, `Vec` and sorted slices in place of the `BTreeMap`s, `wasm-opt -Oz` (not installed here).

### Verification

- `./mvnw -o verify` with JDK 25 (`JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem`): BUILD SUCCESS, **238 tests, 0 failures, 0 errors,
  0 skipped** (integration tests are skipped by default, as `CLAUDE.md` says); `ManualExamplesTest` passes (it loads the default plateau of
  every `workspace.yaml` of the examples, the new example included); the asciidoctor step ran and printed no `possible invalid reference` (the two of before the wave were removed, see above).
- `node --test "src/test/javascript/**/*.test.js"`: 750 tests, 750 pass, 0 fail (it includes the test that reads every YAML file of the
  repository, the manual examples included, and writes it back unchanged).
- `npx prettier --check "src/**/*.java"`: clean (no Java was touched).
- `cargo test` and `embed.sh --check`: not run, the Rust and the wasm were not touched (`git status` shows neither). The two rebuilds above
  were done in a scratchpad copy with its own target directory.
- The example and the tutorial: `scratchpad/r41/doc/gen.sh` rebuilds the tutorial from the example and writes the output the manual quotes.
- The editor servers were stopped; no geckodriver was killed (idle snap geckodriver processes remain).


## Not verified in this wave

Merged from the "not verified" lists of runs 0034 to 0040 and this run, grouped by what stands in the way. "Seen" means looked at on the real
page or in a real output in the run named; everything else was tested on markup, on text or by reading.

**Browsers and devices.**
- Chromium, Edge, Brave, Opera and Safari: the editor was looked at in Firefox only (headless, over the snap geckodriver) in runs 0034, 0035,
  0039, 0040 and 0041; the CSS of the new parts is standard but no other engine drew it.
- The built-in browser pane: its screenshot times out in this environment, so it never drew the page (every run).
- Touch devices, Windows, and a screen reader: the labels carry the state in words (`aria-label` of a box and a link, the word in a chip, the
  tree marks `aria-hidden` with the word in the row's label, tabs with `aria-pressed`), and nothing was listened to or run on those.
- Colour-vision simulation: the colours were chosen for contrast and are never the only carrier (mark, line, pill, word); no simulator ran.

**The File System Access path.**
- The published page with a folder picked by the browser (run 0035: the plateau choice is keyed by the folder's id, the tests and the real
  page used the served folder keyed by its name; run 0039: the second plateau is read through the same root handle, tried on the served
  folder's handles only; the `confirm` when changing plateau with unsaved changes was tested with a stub, not clicked).
- Saving from a plateau that was read through a picked folder (runs 0035, 0039: tested, not clicked in a picker).

**Drawing and export.**
- The PNG download itself (run 0039; run 0040 for a Changes only drawing): the SVG was taken from the page and drawn, the PNG is that SVG on a
  canvas.
- A pair larger than the real one (about 170 elements; the comparison took 58 to 111 ms, the unfolded Map of 81 items and 160 links drew
  within 3 seconds, the Changes list of 167 rows rendered with no visible delay); ELK on a union of a larger pair was not measured. The
  harness of the node tests has no ELK, so positions were checked on the real page only.
- The Changes only drawing with a pin or a hidden element of the author's own, on the real page (the kernel composes them, tested; not looked at).
- PlantUML other than 1.2024.7: dashed, dotted and struck text were checked on that version only (run 0038); the comparison view of the manual
  example was rendered with it again here. The default colours (green, orange, grey) are a cosmetic choice not settled by evidence.
- A technology-layer comparison view in Java (covered by the kernel's cargo and JS tests, not by a Java test; run 0037).
- The Library page of a saved view with a comparison on a real saved view, drawing only (run 0040 looked at one; run 0039 could not).

**Formats, paths and loaders.**
- A TOML or JSON workspace with `plateaus` through the CLI (the structure check runs on the tree of any format and is tested through YAML
  only; the editor reads `workspace.yaml` only); a duplicate between a TOML or JSON manifest and a YAML one (the CLI sees it, the editor does
  not read those files and says so; run 0034).
- Windows path separators on a real Windows machine (a backslash is treated as a separator by the checks, tested as text), and a plateau folder
  that is a symlink leaving the folder of the workspace (the rule is lexical: no `..`, not absolute; run 0035).
- Not caught by the duplicate check, by decision (run 0034): an inline element of `workspace.yaml` with the reference of a manifest, and a
  view or story of `workspace.yaml` with the id of a manifest's.
- The duplicate panel of the file detail and the view and story variants on the real page (markup only; run 0034).

**The native image.** `./mvnw verify -Dnative` (or the `native` profile) was never run in this wave: every new class is registered in
`reflect-config.json` and `NativeReflectionConfigTest` passes (runs 0035, 0037, 0038), the wasm is translated by the same Chicory plugin as
before, and the new Java uses `JsonNode` and no reflection of its own, but no image was built and the integration tests (`skipITs=true` by
default, run by Failsafe only with `-Dnative`) were not run. To check it: GraalVM or Mandrel for JDK 25 on the machine (or the container-build
route Quarkus offers), `./mvnw verify -Dnative`, then run `diff`, `plateau add`, `views generate --baseline` and `editor serve` from the
binary on the example `domain_plateaus` and compare the files with the JVM's. Expect it to be slow and to want several GB of memory.

**Evidence not obtained in this run (4).**
- The tutorial's `plateau add` step was not run on the real data (the target folder existed, so both plateaus were listed by hand); it was run
  on the example only, and on the fixtures by runs 0035 and 0038.
- The `baseline` key and a third plateau were not exercised on the real data (the real pair has two plateaus); they were on the invented
  bookshop of `src/test/resources/plateau-comparison` and on the manual's example.
- The tutorial was followed by its author. The gaps listed above were found by trying to apply it to data the example does not look like,
  but nobody who had not written it read it; the real test of "learn from the manual" is a reader who did not.
- Elements views and the Library page were not looked at again here (looked at in runs 0039 and 0040).
- The site page `src/site/index.html` was read, not rendered.

## Follow-ups

What the wave's business case and the runs defer, each with one line of why. None is started.

- **`replaces` and its proposals** (matching a renamed, moved, split or merged element with its old self, and the editor's trace on rename):
  today these are a removed plus a new, so a rename looks like two changes; they need a notion of identity across plateaus that the wave
  deliberately did not add.
- **The editor's move action** (move an element under another parent): the author wants it; with `replaces` it would make a move one
  change, not two; it is an editor feature of its own.
- **The chain of N plateaus and a timeline:** the wave compares two plateaus at a time (`baseline` per plateau); a view of the whole list
  needs a layout and a reading of cumulative changes.
- **The `compare` property of views and stories:** a saved view that always shows a comparison; it needs a place in the manifest format, which
  the wave promised not to change.
- **A baseline from git** (`--baseline-ref`): compares with the plateau as it was in a commit; it needs a checkout of old files in a
  temporary folder, and a decision on what a ref is in a workspace that is a sub-folder.
- **A CI `--fail-on`** (for example fail when something is removed): needs a vocabulary of what may fail a build, and a decision on the exit codes.
- **A `--only-changes` flag of the CLI** (run 0038): the kernel option exists (`only_changes`) and `GenerateViewsCommand` passes `false`; one
  line and a test, deferred because the plan did not ask for it.
- **A wrapped text table** for `archicode diff` (run 0038): the text is as wide as the longest reference (447 characters on the real pair);
  `markdown` and `json` work, and the manual says `less -S`; wrapping needs a width and a rule for a reference.
- **Next and previous change buttons** in the editor (run 0040): reading a long list one change at a time; the list and a click do the work.
- **Filters of the Changes list** by state or by layer (run 0040): 167 rows on the real pair read with the sort order alone.
- **The Changes tab on the Library page** (run 0040): that page has the "What changed" block but not the list, whose panel is the view's.
- **Dropping the hand-written `new` and `changed` tags:** the author's real `styles` and tags still carry them; they work beside the computed
  states (the box says both) and the comparison does not read them; removing them is the author's edit of the workspace, not a feature.
- **The same look in both tools for a hand-written state tag on an unchanged element** (D5): the CLI draws the default look of `new` on such a
  box in a view that has something new, the editor does not; one rule should win, which is a design choice for the next wave.
- **`from`, layers, tombstones and `fold`** (option F): `from` is reserved and refused with a message; an increment on top of another plateau.
- **Migration manifests** (Plateau, Work Package, Deliverable): the ArchiMate elements that describe the move; out of scope for the wave.
- **Errors without a stack trace** (run 0038): the commands print the exception and its stack for an `ArchiCodeException`, as the other
  commands do; a clean message and an exit code would be better for all of them.
- **Where `plateau add` meets an existing folder:** it never adopts one (the tutorial says so); an `--adopt` that lists an existing folder
  would save the hand edit found in the field check.
- **The size of the wasm** (above): +106 kB for the comparison and the change on every item; a look at the sorts, the maps and `wasm-opt`
  would tell what can go. Not started, not asked.
- **A first-time reader:** have someone who did not write the tutorial follow it.
- **Client names in earlier run documents** (found here, not changed): runs 0026, 0030, 0033, 0038 and 0039 and the wave 006 and 007
  documents name elements of the author's real workspace (a handful of system and person names), against the rule that no client text is
  in the repository. They are in other runs' documents and in committed history; the author should decide whether to rewrite them.

## Review passes

- The KDMLLC pass over this document and the manual's new section was done by the author of the run (the document says what was done and
  what was not; the follow-ups repeat the not-verified list only where one item is both: the native image, a larger pair; no client text).
- A second reader, a `general-purpose` subagent that did not write the section, ran the CLI on copies of the example and checked the
  section's claims: the quoted outputs, the folder names, the upgrade note's error cases and all 14 cross references held, nothing was
  false. It found three things, all fixed in the manual: "two small differences remain" described one (now "one"); step 7 read as if `--from`
  defaulted and did not say the new plateau becomes the default one that `diff` compares; the `ls` of step 5 does not say that a folder that
  already had `manifests` or `views` keeps them. It did not check the editor steps, the "wins property by property" rule or the 3,411 figure
  (this run did, above).
