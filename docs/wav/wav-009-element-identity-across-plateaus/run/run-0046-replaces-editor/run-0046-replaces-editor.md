---
type: run
run: 0046
status: completed
wave: 009
---

# Run 0046: Replaces in the editor

Wave 009 (`element-identity-across-plateaus`), item W-5 (phase P3). Focus: see in the Changes panel what moved, split or merged, and accept a
proposed match in one click. Document profile: `single-document`, as runs 0042 to 0045: the scope arrives settled (the W-5 row and D-1 to D-7 of
the wave plan, the interfaces runs 0042, 0044 and 0045 left, issues tmorin/archicode#22, #36 and #39 as background), the work is one file
(`standalone.html`), its tests and the manual, and there was no live alternative worth a PRD, a TDD or a pln. This file carries scope, decisions,
canonical impact, verification and findings. The review passes were run inline (no subagent), see "Review passes". Run 0047 (move an element) is
not started: it reuses `replacesWith` and the Changes panel of this run.

## Context

The kernel (run 0042) answers `moved`, `split` and `merged` elements, `replaces`/`replaced_by`, `candidates` and `warnings`; the CLI (run 0044) draws
them with `→`, `⋔`, `⊕`, its own line style per state and `(from ...)` in the title, and the cache (run 0045) is keyed on `modelVersion`. The editor
knew three states (`CHANGE_STATES`), so a moved box was drawn unmarked, not counted, not listed, and nothing could write `replaces`. The manual said
so in one sentence.

## Scope

In: the three states everywhere the page enumerates states; the candidates (any comparison, D-7) with "Write replaces" and "Not related"; `replaces`
edited by hand in the element form; the kernel's warnings in the Changes panel; the line-preserving save for a list written on one line; the manual
(`editor-replaces`, the table, the sentence of `plateau-replaces`); tests. Out: moving an element under another parent (run 0047), the wasm and the
kernel (`embed.sh` not run), Java, the CLI, `CLAUDE.md` (W-7), the example `domain_plateaus` (W-7), a "replaced by" for an element that is not drawn
at all (see E5 of run 0042: it has no row and no box).

## Decisions

Taken by the wave (not reopened): D-1 to D-3, D-6, D-7.

Taken by this run:

- **P1. One table of states, three lists.** `RELATIONSHIP_STATES = [new, changed, removed]`, `IDENTITY_STATES = [moved, split, merged]`,
  `CHANGE_STATES = RELATIONSHIP_STATES + IDENTITY_STATES`. Every place that read `CHANGE_STATES` was read: those about elements keep it (trees,
  What changed, `referencesAboveChanges`, `changeStateOfItem`, the counts row), those about links (the changed relationships of an element, the
  relationship change block, the link marks, the arrowhead markers, the link counts of the key) now read `RELATIONSHIP_STATES`, because the kernel
  refuses the three words on a relationship. Also extended: `CHANGE_GLYPHS`, `CHANGE_WORDS`, `CHANGE_DEFAULT_LOOK`, `CHANGE_STATE_ORDER`
  (new, changed, moved, split, merged, removed: removed stays last), the three `--chg-*` colours in the three theme blocks (the test of the dark
  blocks and its "comment before a declaration" trap were respected), `.tree-change`, the SVG export (`svg{--chg-moved..}` is its own rule, the
  existing rule of the four colours is byte-for-byte what a test pins).
- **P2. The look, as the command line, with the editor's own dashes.** Glyphs `→ ⋔ ⊕` (the command line's), width 2px for the three, tint, pill with
  the word, `(from a, b)` after the title (the command line's `(from ...)`), `(replaced by ...)` after the struck name of a place that was only
  kept for what it held. A test asserts that the seven states are pairwise different in glyph and in (width, dash) and that each colour has 3:1
  against its page. Dash patterns: moved `14 4` (long), split `9 3 2 3` (dash-dot), merged `4 2` (short). The command line gives split "medium
  dashes", which in the editor would be `7 4` = the removed state's pattern, so the editor uses dash-dot; the colours are the Okabe-Ito hues of the
  command line darkened (light theme) or lightened (dark) to read as a line; the words in the key say what each line is.
- **P3. Where the editor learns what a box replaces.** The answer of `compute` does not carry it, the union does. `tellRemovedItems` (called at every
  drawing, and by the tests) now also sets `item.replaces` for a box in an identity state and `item.replacedBy` for a removed box that is a place; the
  title, the tooltip and the box text read them. A title longer than the box is cut with an ellipsis, as any title is (leaf boxes are at most 280px,
  "Wrap" breaks them); the tooltip, the panel and the inspector have it whole. A line of a wrapped title that is only the place-of note is not struck.
- **P4. The key lists the three states only when the drawing has a box in one.** `comparisonCountsOf` creates `moved/split/merged` entries only when
  seen, so `deepEqual` on the counts of every other drawing is what it was, and the key of a drawing without them is the key it had (existing
  tests untouched). The long phrases of the key were shortened after the first look in the browser made the key a column of wrapped lines.
- **P5. Candidates: the kernel's, in the panel, for any comparison (D-7).** `comparisonState()` returns `candidates` and `warnings` as the answer
  gave them. The section sits under the toggle and above the lists (it is what a reviewer acts on), each pair as Removed / New with name and reference, the
  reasons in words, and two buttons. A new section heading carries the class `changes-subhead` besides `inspection-subhead`: the heading classes are
  how an existing test counts the two lists (`panel.split('<h4 class="inspection-subhead">')`), and an existing assertion must not change because a
  section was added above them.
- **P6. "Write replaces" = `acceptCandidate`.** Checks (each refusal sets `candidateMessage`, shown in the panel with `role="alert"`, and writes
  nothing, marks nothing): a comparison exists; the baseline is not after the plateau drawn in the list of plateaus (`replaces` goes on the more
  recent plateau); the new element is in the plateau drawn (else, if the baseline has it, the message says the baseline is read-only and never
  written); the replaced one is in the baseline and not still in the plateau drawn; the content node is found; an existing `replaces` is a list.
  Then `commitElementEdit(to, node => node.replaces = replacesWith(node.replaces, from), layer)`, the edit every other element edit uses: it
  reserializes the file through `patchYamlText`, marks it dirty, ends in `rebuildIndexAndRender` which calls `modelsChanged()` (run 0045's
  choke point: a test asserts `modelVersion` moved and that the comparison then says `moved`). The disk is written by "Save all changes", as for every
  other edit; the panel does not save by itself. "Which plateau is the more recent" is the order of `settings.plateaus` (the default baseline rule of
  the command line also reads it); a `baseline:` key that points forward is the author's, and is refused the same way. Rejected: refusing nothing and
  letting the kernel ignore a wrong-direction `replaces` (the hint would sit in the older plateau's file naming a newer element, silently).
- **P7. "Not related" = a `Set` in the page.** Key `base|target|layer|from|to`, never persisted (D-7: no new persistence), "Show again" brings the
  pairs of the pair of plateaus back. The kernel is not told and nothing is dirty.
- **P8. By hand.** The edit form has a Replaces section (list with a remove button each, an add field completing with a `<datalist>` of the baseline's
  references, offered only while a baseline is read) when the workspace has several plateaus or the element already has a `replaces`; a workspace
  with one plateau has the form it had. Validation: not empty, no spaces, not itself, not listed twice; an unknown reference is allowed and flagged
  ("not in “Base”"), one the plateau drawn still has is flagged "still in this plateau: ignored" (D-1). Same writer (`replacesWith`), through
  `commitElementWithDraft` like the other lists, so nothing typed elsewhere in the form is lost. Removing the last entry takes the key out. The read-only
  details of an element list `replaces` too, only when there is one (the rows of that page are otherwise unchanged).
- **P9. The line-preserving save follows a list written on one line.** The test of the hard requirement exposed that `patchYamlText` returned the
  emitter's text (comments, quotes, blank lines lost) for any file that has a list on one line (`replaces: [a, b]`, `qualifiers: [Redis]`), as its
  own doc comment said. That is the likeliest way for an author to write `replaces`, so the accept would have rewritten the whole file. Fix, kept
  small: `patchYamlText` first does what it did (`patchYamlLines`, the old body; it now answers `null` instead of the emitter's text when it cannot
  follow); if that fails, `openFlowLists` reads each single-line list of plain scalars as the block the emitter writes (the comment goes on the key's
  line), `patchYamlLines` runs on that text, and `closeFlowLists` puts every list the edit left alone back on its line (a list the edit changed stays
  a block, and a list the edit extended is not put back). The result is accepted only if re-reading it gives the emitter's own text of the new
  value; otherwise the emitter's text, as before. The behaviour of every file the old code followed is unchanged. A list of other shapes (inside a
  `- ` item, with nested brackets) still falls back as before.
- **P10. What changed / inspector.** An identity element says which it is in a sentence, then Replaces (name and reference, an unknown reference
  flagged), then, if it also changed, "Also changed" and Before/After as for a changed one. A removed place adds "Replaced by" with the names of what
  replaced it. The replaced elements themselves are not in the union (E5 of run 0042), so there is nothing to click on to read "replaced by" except
  that place; the row of the replacing element says `from ...` and, for a split, `split with ...` (the CLI's wording).
- **P11. Warnings** are the kernel's sentences, listed in the panel under the candidates, with their count; nothing goes to the console (the page's
  `compare` call writes none).
- **P12. The hand-written tag rule (run 0043) holds for the new words by construction**: the default look comes from `item.change` of the answer of
  `compute`, never from a stereotype name; a test draws an unchanged box that carries `rendering-stereotypes: moved` and finds no glyph, dash, tint or pill,
  then a `styles` entry named `moved` gives it only the author's own line, and gives the really moved box the default under the author's entry.

## Canonical impact

`src/doc/README.adoc`: updated (the new `editor-replaces` section, the state table of `editor-compare`, the counts/rows/What changed/tree paragraphs, and
the sentence "The editor does not draw these three states yet" of run 0044, removed; a test pins that sentence's absence and the words
"Write replaces" and "Not related"). `CLAUDE.md`: not edited (W-7 owns it; it may say the editor proposes candidates for any comparison, writes
`replaces` through `commitElementEdit`, and that `patchYamlText` follows single-line lists). No other canonical document.

## Tasks

| Id | Task | Status |
|----|------|--------|
| T1 | Read the wave (D-1 to D-7, gate P3), runs 0042 to 0045 and wave 008's editor runs, the Changes panel, the state encoding, `commitElementEdit` and the line-preserving save | done |
| T2 | States: one table, glyphs, looks, colours in three theme blocks, tree, key, SVG export, titles, tooltips | done |
| T3 | Changes panel: counts, rows with `from`, candidates, warnings; What changed for the identity states | done |
| T4 | `acceptCandidate`, `dismissCandidate`, `replacesWith`, refusals | done |
| T5 | The Replaces section of the element form, the datalist, the details row | done |
| T6 | `patchYamlText` follows a list on one line | done |
| T7 | `replaces-editor.test.js` (31 tests) | done |
| T8 | The manual | done |
| T9 | The real page, light and dark, on an invented workspace, with an accept and a save | done |
| T10 | All suites, prettier, embed check, wasm block byte-identical | done |

## Acceptance criteria (the W-5 row and the gate of P3, first bullet)

- AC1. The Changes panel shows moved, split and merged elements: `the counts and the rows of the Changes panel...`, `the tab strip counts...`, `Changes
  only keeps...`; the drawing, the key, the export, the trees: `the map draws a moved...`, `the key lists a state of identity only when...`, `the SVG export
  defines...`, `the trees mark...`, `the editor knows moved, split and merged as states...`, `the three colours are defined...`.
- AC2. Candidates listed, each with both buttons, none applied: `the Changes panel lists the candidates of the kernel...`.
- AC3. Accept writes the key through the line-preserving save and changes only that line (the gate's test compares the saved file with the original):
  `"Write replaces" writes exactly one replaces...` (the file differs by exactly `  replaces:` and `    - library.loans`, comments, quotes, blank line and
  final line kept; the comparison then says `moved`; the models version moved), `a list written on one line gets the new reference appended...`,
  `other flow lists of a file the edit does not touch stay on their line...`.
- AC4. Dismiss hides, writes nothing, comes back: `"Not related" sets the pair aside...`.
- AC5. The baseline is read-only: three tests of refusals (`...in the baseline, which is only read`, `...comes before the one it is compared with`, `...still in
  the plateau drawn, unknown, not a list`), each asserting nothing is dirty and nothing is written.
- AC6. By hand: `the edit form... has a Replaces section...`, `adding a reference by hand...`, `removing a reference by hand...`, `a list that is not a list...`.
- AC7. Warnings listed: `the warnings of the kernel are a short list...`.
- AC8. A workspace without `replaces` and without candidates behaves as before: `a comparison with no replaces and no candidate is the Changes panel it
  was...`, `with Compare to Nothing none of it is on the page`, and the 778 existing tests, none modified.
- AC9. The inspector: the four `What changed`/`unknown reference` tests. The rule of run 0043 for the new words: `a state written by hand on a box...`.
- AC10. The manual: `the manual no longer says that the editor has three states`.

## Review passes

Run inline (one document; no subagent dispatched, as in runs 0042 to 0045).

- **KDMLLC.** K: one function per behaviour (`identityTextOf`, `renderCandidatesHtml`, `acceptCandidate`, `replacesWith`, `renderReplacesEditionHtml`),
  the writer is shared by the panel and the form; the look is three entries in tables that exist. D: the state words are one table (`CHANGE_STATES`
  and its two halves), the writer of a `replaces` is `replacesWith`, the way the kernel's sentences are shown is the kernel's. M: each behaviour has a test
  (AC list), each refusal its own message and its own assertion that nothing was written. L: no persistence, no "move" (run 0047), no wasm, no Java.
  U: the messages name both plateaus and say what to do. C: below.
- **C scan.** Claim of the brief, "the editor behaves exactly as before for a workspace without replaces and without candidates": true, and measured by the 778
  tests that were not edited; but the invented bookshop of wave 008's tests *does* have a candidate, so its Changes panel gains a section; the one existing test
  that counts headings was protected by the class of the new heading rather than edited (P5). Claim of run 0044, "the editor does not draw these states":
  no longer true, the sentence is gone. Claim of run 0045 (S2), "runs 0046 and 0047 need nothing more when they end in `rebuildIndexAndRender`": true for
  the accept and the form (both end there; a test asserts the version moved after an accept). Claim of the comment of `patchYamlText`, "a flow list falls
  back to the emitter's text": true before this run, now true only for a list that is not a plain one-line list (P9). Claim of the brief, "Library marks": the
  Library page has no tree of elements; the trees that carry the marks (Elements, Map) are done; the Library page gets the inspector block through
  `inspectionPanelHtml` (a test reads the removed-place panel there). Claim "dismiss: remembered in memory only": a module constant, reset by reloading the page.
- **Open questions.** None left that blocks. The title cut and the wording of the key in a very small pane are the findings below.

## Verification

All with the repository's own commands. `JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem`.

### Results

- `node --test "src/test/javascript/**/*.test.js"`: exit 0, 809 tests (778 before, 31 new), 809 pass, 0 fail; the flaky "Open on a folder of the list"
  test passed. No existing test file was edited.
- `src/main/rust/viewpoint-kernel/embed.sh --check`: "the committed WebAssembly is the one the sources build (651048 bytes)", exit 0. `embed.sh` itself
  was not run. The base64 line of `standalone.html` is byte-identical to `HEAD`'s (md5 of the line equal; the other lines around it too).
- `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`: 160 passed, 0 failed.
- `./mvnw -o -q verify` with JDK 25: exit 0, 273 tests in the surefire reports, 0 failures, 0 errors, 0 skipped (integration tests are skipped by default; no Java was
  changed, the jar embeds the new `standalone.html`). `npx prettier --check "src/**/*.java"`: "All matched files use Prettier code style!", exit 0.
- **The real page.** The jar was built (`./mvnw -o -q package -DskipTests`) and served with `editor serve` on a copy of the invented library in the scratchpad (never
  in the repository), and driven in the built-in browser (a pane of about 990x514): Compare to Base on the plateau Target. The Changes panel shows the
  chips `+ 2 new`, `~ 0 changed`, `− 3 removed`, `→ 1 moved`, `⋔ 2 split`, `⊕ 1 merged`, two candidates with their buttons, two warnings, then the rows; the maximized
  Map draws the moved box (long dashes, blue tint, `→ Counter (from library.desk)`), the split boxes (dash-dot, pink), the merged box (short dashes), the removed
  place `Catalog (replaced by library.…` with its name struck, and the key with the three new entries; a click on "Write replaces" for the lending turned its row
  to `moved`, the key to "2 boxes" of moved, the header to "Save all changes (1)"; the save wrote one file, `app.library.lending.yaml`, which differs
  from the original by the two lines `replaces:` / `- library.loans`. The dark scheme (emulated `prefers-color-scheme`) reads the same with the lighter colours.
  Looked at: light and dark Map and panel. Not looked at: the element form's Replaces section and the read-only details in the browser (tested through the harness only).
- `-Dnative`, failsafe integration tests: not run.

## Findings

- **A defect of the save, found and fixed here (P9).** Any edit of a manifest that has a list on one line (`qualifiers: [Redis]`) used to rewrite the whole
  file (comments, quotes, blank lines lost). Now followed. Anything with another shape of flow collection (`{...}`, a list in a `- ` item, nested brackets)
  still falls back.
- **For run 0047 (move).** Reuse `replacesWith` and the refusal messages of `acceptCandidate`; the children of a moved container need their own `replaces` (run 0042's
  finding); a moved element's own children that are *not* drawn are replaced elements without a row, so after a move the Changes panel will list them as removed
  places (`Replaced by`) only if they held something removed.
- **The title of a box with a long `(from ...)` is cut** at the box width (280px for a leaf), as any title is, and in a compound box at the width the layout gives;
  the tooltip and the panel are whole, "Wrap" breaks it. Same on the command line (PlantUML wraps at `wrapWidth`).
- **Candidates and `replaces` that point forward.** The refusal reads the order of `settings.plateaus`; a plateau with a `baseline:` key that names a later
  plateau is refused too. If that order is not chronological in someone's workspace the message tells them to draw the other plateau; it does not stop them
  writing the key by hand in the form (the form has no such guard: the form edits the plateau drawn, whatever its baseline).
- **The key** under a diagram is long for a small pane (nine entries with their counts); its phrases for the new states were shortened. Not redesigned.
- **Files touched outside `likely_paths`:** none (`standalone.html`, `replaces-editor.test.js`, `src/doc/README.adoc`, this document).
- **Issues filed:** tmorin/archicode#41 (the save still rewrites a whole file for other shapes of flow collection), #42 (the line style of `split` differs between the CLI and the editor).
- **Not verified.**
  - The element form's Replaces section, the datalist and the details row in a real browser (tests only).
  - Other browsers, the native image (`-Dnative`), the folder picker (wave 008's #29).
  - The look of the three states on a real, large workspace, and the legibility of the dash patterns at small zoom (looked at on an invented library at 39% and 80%).
  - A list written on one line with an item that needs quotes (`replaces: ["a: b"]`): `parseYaml` reads it and the result is checked against the emitter, so a mistake
    falls back to the emitter's text, but it was not exercised.
