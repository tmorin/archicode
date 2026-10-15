---
type: run
run: 0047
status: completed
wave: 009
---

# Run 0047: Move an element in the editor

Wave 009 (`element-identity-across-plateaus`), item W-6 (phase P3). Focus: move an element under another parent without breaking a reference, and
say what it replaces. Document profile: `single-document`, as runs 0042 to 0046: the scope arrives settled (the W-6 row and D-1 to D-7 of the wave
plan, the interfaces runs 0045 and 0046 left, issues tmorin/archicode#23 and #41 as background), the work is one file (`standalone.html`), its tests and
the manual, and there was no live alternative worth a PRD, a TDD or a pln. This file carries scope, decisions, canonical impact, verification and
findings. The review passes were run inline (no subagent), see "Review passes". Phase P3 ends with this run; W-7 (proof) is not started.

## Context

The editor renamed an id and rewrote the references to it (`commitElementEdit` with `renamedTo`, DEC-8 of TDD-0009), but could not put an element
under another parent. By hand, the reference changes, the references to it break, and a comparison shows removed plus new. Run 0046 gave the editor a
writer of `replaces` (`replacesWith`, `acceptCandidate`) and the Changes panel; run 0045 made the comparison cache depend on `modelsChanged()`; run
0042 found that the children of a moved container need their own `replaces`, otherwise they read as removed.

## Scope

In: a *Move* action in the edit form of an element of the plateau drawn; a dialog with a search over the valid parents; the move itself, through the
machinery of a rename; refusals that change nothing; the offer, in the same dialog, to write `replaces` on the element and on each element inside it
(*Move and write replaces* / *Move only*); a text-level move of a nested block so that the file keeps its comments, quotes and blank lines; the
manual (`editor-move`, links from `plateau-replaces`, `editor-replaces` and the Details line); tests. Out: the wasm and the kernel (`embed.sh` not run),
Java, the CLI, `CLAUDE.md` (W-7), the example `domain_plateaus` (W-7), a move across files for a nested element (#43), a move to the top level (#44).

## Decisions

Taken by the wave (not reopened): D-1 to D-7. The risk of W-6 ("a rewrite of references across files is the riskiest edit of the wave: reuse the
machinery of rename and refuse, not guess") is the frame of M1 to M6.

Taken by this run:

- **M1. The edit is a rename with a different mutator.** `commitMoveElement` calls `commitElementEdit(reference, mutator, layer)` and the mutator returns
  `{ renamedTo: { from, to } }`: `rewriteUiReferences` and `rewriteInboundReferences` run exactly as for an id change, and the commit ends in
  `rebuildIndexAndRender()` (so `modelsChanged()`, run 0045's choke point; a test asserts the cache answer is replaced and the comparison says what the
  move is). The places rewritten are therefore the ones a rename rewrites, and nothing else: the `destination` of relationships (same layer), the
  `applications` of technology nodes (application element), the `uses` of environments (technology element), the `header.parent` of the manifests attached
  to the element or below it, the saved views and the steps of stories (`rewriteSavedViewReferences`: the `element` of a view, the pinned, hidden and opened
  elements of a Map view), and the page's own memory (selection, unfolded rows, modified marks, the Map). Facets are JSONPath, not references: not read,
  as for a rename. A reference below the moved element follows on the `.` boundary (`a.b` to `c.b`, never `a2`).
- **M2. How a move is written depends on how the manifest holds the element** (decided from `buildIndex`, `locateContentNode` and
  `commitCreateTopLevelElement`). (a) The element is the root of a manifest file: only `header.parent` changes (one line, added if there was none); the file stays;
  the manifests attached below it keep their own file and get their own `header.parent` from M1. The new parent can be in any file. (b) The element is
  nested in a manifest: its block moves to the `elements` of the new parent, which has to be in the same file (the parent's `elements` key is created if
  there was none; the old parent's is dropped when the element was its last). (c) A nested element whose parent is in another file would need the block cut
  from one file and pasted into another: refused with the reason, listed as follow-up #43; the dialog counts the parents it leaves out for that reason.
- **M3. Valid parents** (`moveParentCandidates`, one function for the list and the refusal): same layer; may hold the kind by the creation rules
  (`childKindOptionsForLevel`; a `group` keeps its level and goes under a record of the same level that holds groups, the rule of the create form for a group
  root); not the element nor anything inside it (prefix on the `.` boundary); not the parent it already has; no element of the same id under it; for a
  nested element, in its own file. An element that can go nowhere has no *Move* (an environment, a solution, a person, a system with no solution in the
  workspace).
- **M4. Everything is judged first, and a refusal changes nothing** (`validateMove`; a test snapshots every manifest's model and text, the model version, the
  modified marks, the disk and the selection before and after each refusal). Refused: an element or a parent that is only in the baseline (read-only, said
  with the plateau names); into itself or into a descendant; the parent it has; a kind it cannot hold; an id it already holds; a reference declared twice; a
  manifest that cannot be read (a reference in it could not be rewritten: stricter than rename, which skips it silently); a nested element asked to go to
  another file; a reference that points into the subtree and is written as a number or a boolean (`destination: 8080`: read as the element, but it cannot be
  rewritten as another element's reference: stricter than rename, which would leave it dangling); with *Move and write replaces*, a `replaces` that is not a
  list. "Rename also refuses" nothing else than a bad or clashing id, so those are the whole of the shared set.
- **M5. Replaces for the element and each element inside it** (`planMoveReplaces`): offered only when the workspace has several plateaus and a comparison is on
  (the key names references of the baseline, like `acceptCandidate`, whose direction check is now one function, `replacesDirectionProblem`, with its message
  unchanged); one entry per element of the subtree that the baseline has, `from` its old reference, `to` its new one; an element new in this plateau gets
  none and the dialog says how many. The writes happen inside the same `commitElementEdit` (one rebuild, one render): the nodes are collected before the
  structure changes, `replacesWith` appends to a list already there. Without a comparison the dialog has one button, *Move*, and says how to get the offer;
  without plateaus it does not mention `replaces`. A reference or direction that cannot be written refuses *Move and write replaces* only; *Move only* works.
- **M6. The file keeps what the move does not touch** (`moveBlockInText`, a new function next to `patchYamlText`; `locateEmittedLines` is the code that
  `patchYamlLines` had for finding the emitter's lines in the original, extracted unchanged). `patchYamlText` is an LCS over the emitter's lines, and on a
  move that is not good enough: identical lines (`- kind: container`) are aligned arbitrarily and a comment ends up between two lines of another element (seen
  on the first try). So for a nested block the editor first moves the original lines themselves: from the first comment line just above the block to its last
  line, re-indented, to the end of the new parent's `elements` (or after a new `elements:` line), and drops the old parent's `elements:` line if it was the
  last; then the ordinary patch applies the small edits (rewritten references, `replaces`) on that text. It is accepted only if re-reading the result gives
  exactly what the emitter writes for the new value (the rule of `openFlowLists`), and falls back to the ordinary patch when the layout is not one it can follow
  (a flow list or map in the block: see #41; the move still works and the file says the right thing). A first attempt that carried lines over inside
  `patchYamlLines` by matching words was written and removed: it paired identical lines of different elements. The rewritten `destination` lines lose their
  quotes, as with a rename: they are changed lines.
- **M7. One dialog, the editor's own** (`appDialog` of kind `move`): a search that filters in place (`hidden`, the focus stays in the field), radio list of the valid
  parents, the numbers (elements that follow, references and files rewritten, saved views), the offer of `replaces`, `role="alert"` for a refusal, the dialog
  stays open with the chosen parent and the search. Enter in the search moves nothing. The form is applied first (`flushPendingDraft`), as *Save all
  changes* does. After the move the selection follows the element (`rewriteUiReferences`), its row and its ancestors are unfolded.
- **M8. Undo.** There is none besides *Cancel* (the folder is read again), as for every other edit; a test moves, cancels, and finds the folder, the index, the
  comparison and the modified count as they were.

## Canonical impact

`src/doc/README.adoc`: updated (`[[editor-move]]` with the valid parents, the places rewritten, how each layout is written, replaces, refusals; links from
the Details line, `plateau-replaces` and `editor-replaces`; a test pins the section's key words and the links). `CLAUDE.md`: not edited (W-7 owns it; it may say
that a move is `commitElementEdit` with `renamedTo`, that `moveBlockInText` carries a nested block, and that every refusal is made by `validateMove` before
anything changes). No other canonical document.

## Tasks

| Id | Task | Status |
|----|------|--------|
| T1 | Read the wave, runs 0042 to 0046, #23 and #41, the rename machinery, the creation rules, the save | done |
| T2 | `validateMove`, `moveParentCandidates`, `scanMoveReferences`, `planMoveReplaces`, `commitMoveElement` | done |
| T3 | `moveBlockInText` and `locateEmittedLines` | done |
| T4 | The dialog, the button, the handlers, the styles | done |
| T5 | `move-editor.test.js` (33 tests) | done |
| T6 | The manual | done |
| T7 | The real page, light and dark, on an invented workspace in the scratchpad, with a move and a save; the CLI reads the result | done |
| T8 | All suites, prettier, embed check, wasm block byte-identical | done |

## Acceptance criteria (the W-6 row and the gate of P3, second bullet)

- AC1. A *Move* in the element's panel, on an element of the plateau drawn: `the edit form of an element that can move has a Move button...`; never on the
  baseline: `an element of the baseline, or a parent of the baseline, is read-only...`.
- AC2. The children follow, the references that point at the element are rewritten in every file, nothing else changes: `moving a container with its children
  puts the block ... as it was written` (six files differ, three are byte-identical, each changed line pinned), `a manifest that is not nested changes one line`,
  `a node of the technology layer moves...` (the application element of the same reference untouched), `a system goes under a solution...`.
- AC3. Refusals change nothing: `an element is not moved into itself...`, `...to the parent it has`, `a parent that already holds an element with the same
  id`, `a parent that cannot hold the kind`, the baseline, `a nested element cannot go to a parent in another file`, `a reference that cannot be rewritten as
  text, a manifest that cannot be read, and a reference declared twice`, `replaces that is not a list`, each through `snapshot` before and after.
- AC4. The offer of `replaces` for the element and its descendants, and the comparison: `a move alone reads as removed plus new...; the move with replaces reads
  as moved`, `only the container told, its children read as removed`, `the lines "Move and write replaces" adds...`, `replaces is added to the list the element
  already has...`, `without a comparison, or without plateaus...`, `a baseline that comes after the plateau drawn...`.
- AC5. Undo and cache: `"Cancel" gives a move up like any other edit`, `the Move offered by the page ends in the choke point of the cache`, `a second move
  after the save, and a move then its undoing...`.
- AC6. The file: `the layouts of a file...` (no `elements` yet, the last child leaving, CRLF, a block the layout cannot follow), `a block with a text over several
  lines...`, `the comments on lines of their own inside the block go with it...`.
- AC7. The dialog: three tests on the markup and the search, one on a confirmed move, one on a refusal in the dialog, one on the form applied first.
- AC8. The manual: `the manual describes the move, and the texts about replaces and rename point at it`.
- AC9. The existing 809 tests are not edited and pass.

## Review passes

Run inline (one document; no subagent dispatched, as in runs 0042 to 0046).

- **KDMLLC.** K: one validator for the list, the refusal and the dialog; one commit that is the rename's; the text move is one function with a verification.
  D: the places rewritten are the rename's (not a second list), the direction check of `replaces` is shared with `acceptCandidate`, the place-finding of the
  save is shared with `patchYamlLines`. M: each refusal has its own test with the "nothing changed" snapshot; each layout of the manifest (own file, nested, no
  `elements`, last child, CRLF, flow list) has one. L: no top level (#44), no cross-file block (#43), no new persistence, no wasm. U: the messages say which
  element, which parent, which file, and "Nothing was changed". C: below.
- **C scan.** Claim of the brief, "handle exactly the same set of places as rename": true for rewriting, and said in M1; the two additions (unreadable manifest,
  numeric reference) are refusals, not rewrites, and are said in M4. Claim "the element's manifest text moves with its comments if the machinery allows": it did
  not (M6), so a function was added; the claim of the comment of `patchYamlText` (the lines the edit did not touch stay) is true again for a move. Claim of run 0042 (the children need
  their own `replaces`): reproduced by a test, which is why M5 writes them. Claim of the brief that rename's `uses` and `applications` are "deployment
  references": the `applications` of a node is the deployment of an application element; both are rewritten, in the layer they belong to.
- **Open questions.** None that blocks.

## Verification

All with the repository's own commands. `JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem`.

### Results

- `node --test "src/test/javascript/**/*.test.js"`: exit 0, 842 tests (809 before, 33 new in `move-editor.test.js`), 842 pass, 0 fail; the flaky "Open on a folder
  of the list" test passed. No existing test file was edited.
- `src/main/rust/viewpoint-kernel/embed.sh --check`: "the committed WebAssembly is the one the sources build (651048 bytes)", exit 0. `embed.sh` itself was not run.
  The base64 line of `standalone.html` is byte-identical to `HEAD`'s (compared as a string).
- `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`: 160 passed, 0 failed.
- `./mvnw -o -q verify` with JDK 25: exit 0, 273 tests in the surefire reports, 0 failures, 0 errors, 0 skipped (integration tests are skipped by default; no Java was
  changed, the jar embeds the new `standalone.html`). `npx prettier --check "src/**/*.java"`: "All matched files use Prettier code style!", exit 0.
- **The real page.** The jar was built (`./mvnw -o -q package -DskipTests`) and served with `editor serve -w <scratchpad>/ws/workspace.yaml -p 8765` on an invented
  copy of the bakery workspace of the test file, in the scratchpad (never in the repository), and driven in the built-in browser (a pane of about 990x514). Light: the
  edit form of the Oven has *Delete | Move | Add child | Back to view*; *Move* opens a dialog that lists the one valid parent (the group Tools), says that 2 more are
  not listed because the oven is written inside `app.bakery.yaml`, that 7 references are rewritten in 5 files and 1 saved view follows, and offers *Cancel*, *Move only*
  and *Move and write replaces* (primary). Typing a search narrows the list in place and keeps the focus in the field ("No parent matches." for a word that matches
  nothing). Dark (emulated `prefers-color-scheme`): the same dialog, readable, same contrast of the primary button. Choosing Tools and *Move and write replaces*: the dialog
  closed, the selection followed the element to `bakery.tools.oven`, the tree shows Oven under Tools with the three `moved` marks, the Changes panel counts "3 moved"
  and lists Oven, Gauge and Timer `from bakery.oven...`, *Save all changes (6)*. The save wrote the scratchpad copy; a `diff` of the target against the base
  folder shows the block moved with its comment and quotes, the destinations, the deployment list and the view rewritten and nothing else; the built jar's
  `archicode diff -w ...` on the saved copy prints `replacing 3 moved, 0 split, 0 merged`, no removed and no new element.
- `-Dnative`, failsafe integration tests: not run.

- **Not verified.**
  - Other browsers, the native image (`-Dnative`), the folder picker (wave 008's #29); the dialog was looked at in one pane size only (about 990x514), where it scrolls
    inside itself.
  - A very large workspace: `moveIsPossible` walks the index at every render of the edit form, and the dialog scans every manifest once per render; not measured.
  - A manifest with tabs, or an element block whose layout the save cannot follow (`{...}`, a list inside a `- ` item): the move works by the ordinary patch, but the
    text is the emitter's for those files (#41); only a flow list in the block was exercised.
  - A real workspace: none was read.

## Findings

- **The save's LCS is not made for moves.** It aligned `- kind: container` of two elements and left a comment between two lines of another one. A block
  that moves has to be moved as text (M6); the LCS is fine for the small edits that follow.
- **Rewritten reference lines lose their quotes** (`destination: "a.b"` becomes `destination: a.c`), as with a rename. They are changed lines. Not changed here.
- **A move in a file with a flow collection in the moved block** falls back to the ordinary patch: the result is right, and for a flow map or a list inside
  a `- ` item the whole file may be rewritten by the emitter (#41, unchanged by this run).
- **Files touched outside `likely_paths`:** none (`standalone.html`, `move-editor.test.js`, `src/doc/README.adoc`, this document).
- **Issues filed:** tmorin/archicode#43 (move a nested element to a parent declared in another file), #44 (move to the top level, and say why a parent is not
  offered).
