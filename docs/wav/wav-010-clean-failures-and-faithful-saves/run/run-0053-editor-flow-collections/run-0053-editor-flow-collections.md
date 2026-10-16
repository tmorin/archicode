---
type: run
run: 0053
status: completed
wave: 010
---

# Run 0053: Editor flow collections

Wave 010 (`clean-failures-and-faithful-saves`), item W-5 (phase P2). Focus: save a manifest that holds a flow map or a nested list without losing its comments.
Document profile: `single-document` (the scope arrives settled by the wave plan and by issues tmorin/archicode#41 and #51; run 0052, which changed the same functions just
before, did the same); this file carries scope, decisions, canonical impact, review passes, tasks, verification and findings.

## Scope

1. `patchYamlText` (the line-preserving save, the only path every edit goes through) follows every flow collection, not only a plain list on one line: a flow map
   (`tags: {a: b}`), a list in a `- ` item of a sequence of maps (on the dash line or after the first key), a list with brackets inside (`[[a, b], [c]]`), a list or a map
   that spans several lines (comments inside it, a trailing comment), a flow map or list that is itself an item of a list (`- {destination: x, label: y}`), a key written in
   quotes or with a space in front of one, and an empty collection written with a blank (`[ ]`). One that the edit does not reach is saved as written; one that it changes
   is a block of the emitter's layout, its values in the quotes the author gave them, the comment of its last line on the key's line.
2. The rule is kept: a result is accepted only if re-reading it gives the emitter's text of the new value; any layout this cannot follow is the emitter's text, as before.
3. #51: `moveBlockInText` follows a file that holds flow collections the same way (opens them, moves the block, puts them back, checks the result), so the block of a moved
   nested element is carried over as written and the comment of the next element stays on it. Fixed here, with tests.
4. Quoting is kept for the items of the collections handled (the finding of run 0052, its D4): `["a", 'b']` is a block of `"a"`, `'b'`, not of plain items.
5. A workspace edited without a flow collection involved saves exactly as before; a plain one-line list saves as before (see Verification for how it is shown).

Not in scope, not done: #50 (the end-of-line comment of a rewritten line), the comments inside an edited collection (#54), the displaced comment above a rewritten line
(#52) and the YAML 1.1 boolean words (#53), these three found here and filed.

## Decisions

- **D1. One mechanism.** `openFlowLists` (now: every line that starts a flow collection, with its extent found by the YAML reader itself, `parseYamlFlowNode`, so
  multi-line, nested, quoted text and comments follow the parser's rules) writes the collection as the block the emitter writes for its value, and remembers it
  (`expanded` lines, `original` lines, the column the collection's lines must be indented past); `closeFlowLists` puts the original back where the edit left the expanded
  lines whole. The aligner (`patchYamlLines`, `locateEmittedLines`) is untouched: it sees an ordinary block file. Alternative rejected: teaching the aligner flow syntax,
  because every rule of it (words, indentation, order) would have needed a second form.
- **D2. What opens.** A line `key: [` or `key: {` (key plain or quoted, after any number of `- `), or `- [` / `- {`; not inside a block scalar (its lines are text);
  only when the reader reads the collection to its end with nothing but a comment after it; and only when re-reading the block gives the collection's value (a check made at
  opening, per collection). Anything else is left as it is and the old fallback applies. Empty collections count (`[ ]` is written back as `[ ]`).
- **D3. Quotes.** The reader notes, for each value of a collection, how it was written (`parseYamlFlowNode` fills `p.leaves` when the cursor asks, the reading is the same
  without it); `emitFlowBlock` applies the quote to the emitter's line only where the emitter wrote the text plain (`readYamlScalarLine`, as run 0052 does), and applies
  nothing if the lines and the values do not match one to one. The expanded text therefore carries the author's quotes, so the sibling rule of run 0052 sees them and a
  new item of an edited list follows them. Keys are not requoted, and a boolean word is written as the emitter writes it (#54).
- **D4. Closing.** `closeFlowLists` finds the expanded lines whole, in order from the last one found and then from the top, at the indentation they were written or at
  another one when the block was carried to another depth (the move): the original lines are then shifted the same (`shiftYamlLine`, shared with the move's carried
  lines). It does not restore a collection whose last line is followed by a deeper line (a key or an item the edit added): that is not the collection that was written.
- **D5. The move (#51).** `moveBlockInText` opens the collections of the file, moves the block in the opened text, closes them in the result and accepts the closed text
  only if it reads back as the emitter's text of the moved model. Without any flow collection nothing changes (it opens nothing).
- **D6. No change to the manifest format, the kernel or the Java.** The embedded wasm is untouched; `embed.sh --check` passes.
- **D7. The manual** says, in the editor section, which shapes keep their lines; it said a list in square brackets rewrites the file and loses its comments, which is no
  longer true. `CLAUDE.md` ("Every edit goes through the line-preserving save") stays true.

## Canonical impact

None to the architecture model (no `CI-arc` or `CI-dom` packet: this run has no TDD). One sentence of the manual's editor section (D7).

## Review passes

- **KDMLLC (inline).** K: one opener, one closer, one quote applier (`emitFlowBlock`), the aligner and the quote chooser of run 0052 unchanged; no option, no new input. D:
  the move and the ordinary save share `openFlowLists`/`closeFlowLists`/`shiftYamlLine` (the move's own shift code was replaced by the shared one); the extent of a
  collection is the parser's, not a second scanner. M: each shape in the scope has a test (flow map, list after the first key, list on the dash line, nested brackets, list
  on several lines, map on several lines, flow items of a list, quoted key, empty, block scalar, CRLF), each with comments and blank lines; the refusals (four-space file,
  unreadable collection, anchor, a closing that does not read back) and #51 (two tests, plus the fallback) too. L: no comment carry-over inside a collection (#54), no
  change to the order of steps (#52), no boolean words (#53), no #50. U: the rules are in the comments of `openFlowLists`, `closeFlowLists`, `emitFlowBlock` and in the
  manual. C: below.
- **C scan.** The wave plan says "`openFlowLists`/`closeFlowLists` extended to the shapes of #41; the rule 'accept only if re-reading gives the emitter's value' kept": done there
  (the acceptance gate of `patchYamlText` and the check at opening). Gate P2's criterion names "the flow shapes of #41 (a flow map, a list in a `- ` item, nested brackets, a
  multi-line list)": one test each, in `flow-collections-editor.test.js`. #41 says "list inside a `- ` item": the case that failed before was the list *on the dash line*
  (`- qualifiers: [a]`); the one after the first key already worked and is tested too. One existing assertion encoded the displaced comment of #51
  (`move-editor.test.js`, "replaces is added to the list the element already has"): it expected the list of the file in the emitter's quotes; it now expects the list as the
  author wrote it (plain) and states the position of the two comments, which is the behaviour #51 asks for.

## Tasks

- [x] T1. Reproduce: flow map, list on the dash line, nested brackets and a multi-line list make the save emit the whole file; the one-line list after a key works; the move
  in a file with a one-line list displaces the comment of the next element (#51).
- [x] T2. `parseYamlFlowNode` notes the way values are written (`p.leaves`); `emitFlowBlock`, `shiftYamlLine`; `openFlowLists`/`closeFlowLists` rewritten (D1-D4); the
  comments of `patchYamlText` updated.
- [x] T3. `moveBlockInText` opens and closes the collections (D5), uses `shiftYamlLine`.
- [x] T4. `flow-collections-editor.test.js` (17 tests); the one assertion of `move-editor.test.js`.
- [x] T5. Before/after comparison against `HEAD`'s `standalone.html` on the 80 YAML files, and a random differential test on generated files.
- [x] T6. The real page, light and dark, on an invented copy: an edit of a description and of a tag, a move with *Move and write replaces*; text diff of the files.
- [x] T7. The manual's sentence; file the findings (#52, #53, #54); full verification.

## Verification

Run from `/home/tibo/git-perso/archicode`, JDK 25 (`JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem`), offline.

- `./mvnw -o -q verify`: exit 0 (319 Java tests, no Java file changed), run twice (before the run document was written, and on the final tree).
- `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`: 168 passed. `src/main/rust/viewpoint-kernel/embed.sh --check`: "the committed WebAssembly is the one
  the sources build", exit 0. `npx prettier --check "src/**/*.java"`: clean.
- `node --test "src/test/javascript/**/*.test.js"`: 878 passed, 0 failed (861 before; `flow-collections-editor.test.js` adds 17); run several times, the last on the final
  tree (see the report for the count).
- The new tests fail on `HEAD`'s `standalone.html` (15 of the 17 fail; the two that pass assert what must not change: a layout that is not followed gives the
  emitter's text, and a closing that is broken gives it too).
- **No-change proof, 1 (scratchpad `w5/compare.js`).** `HEAD`'s editor (`git show HEAD:src/main/resources/editor-webapp/standalone.html`, in the harness) against the working tree:
  `patchYamlText` on the 80 YAML files of the repository (`src/doc/examples`, `src/test/workspaces`, `src/test/resources`), the six edits of run 0052 (no-op, set a number and a
  boolean, drop the last key, drop the first item of every list, set a string and add a key, append `-x` to the first string): **480 of 480 byte-identical**, all read back as
  the edit. The five files of the repository that hold a flow collection are `workspace.yaml` files with empty or one-line lists; none holds a flow map or a multi-line list.
- **No-change proof, 2 (scratchpad `w5/diff-fuzz.js`, 6 seeds of about 800 generated manifests each).** Mixes of block mappings and lists, comments, blank lines, quoted and
  plain strings, one-line lists of scalars, nested and multi-line flow shapes; an edit at random (add or drop an item or a key). `HEAD`'s result against the new one: where
  `HEAD` followed the layout, **identical, or different in quote characters only** (the quotes of the items of an edited one-line list, now kept: 9 to 11 per seed); where `HEAD`
  fell back to the emitter's text (about 175 per seed), the new text follows the file. Zero other difference.
- **Random test.** `w5/fuzz.js` (5 seeds, about 960 generated files each, every shape): saving without an edit is byte-identical for every file; the 4800 random edits read back as
  the edit. A trimmed, seeded version is the test "files made of every mix of block and flow shapes" (about 300 files per run).
- **The real page** (`archicode editor serve`, jar built by the verify of the working tree, built-in browser, light and dark, an invented garden manifest in the scratchpad with a
  flow map, a one-line list, a list on several lines, comments and a blank line). Editing the *Description* of an element (`diff -ru` of the copy against its original):

  ```
  -      description: "Keeps the seedlings warm."
  +      description: "Keeps the seedlings warm all winter."
  ```

  Adding a tag, in the same save session (the one flow map the edit reaches is the one that changes):

  ```
  -      tags: {heat: on}
  +      tags:
  +        heat: true
  +        light: "low"
  ```

  *Move* of the element under another one with *Move and write replaces* (two plateaus, *Compare to* Base): the block is carried one level deeper as written, with its
  comment, its flow map, its list `[Pipe, "Pump"]` and its multi-line list; only the `replaces` list the edit reaches is changed, the new list takes the quotes of the file
  (diff of the target plateau's file: the lines of the block removed from the old place and added under the new parent, then, inside the block, `replaces: [garden.old-greenhouse]  # the old one`
  became `replaces:  # the old one` with two items, and a `replaces` of two lines was added on the element inside). A last edit in dark (the description again) changed that one line
  only. The page looks as before in both schemes (this change has no visual part); the status said "Saved." each time.
- **A refused patch changes nothing more than before**: tests for a four-space file, a collection that does not close, an anchor, and a closing that is broken on purpose (the
  emitter's text comes back); and for a move whose collections cannot be put back (the file is the emitter's text and still reads as the model says).

## Not verified

- Nothing was run on a real workspace; every file is invented, or one of the repository's examples and fixtures.
- Other browsers than the built-in one, and the look of the page was not changed (nothing to compare), so the light and dark screenshots show the save and the move working, not a
  visual difference.
- The cost of opening the collections of a very large manifest (each collection is read once by the parser and once more to check the block, per save); not measured on a file
  larger than the fixtures.
- A flow collection written in a way the editor's reader does not read (an anchor, an alias, a tag) is not opened and the file keeps the old fallback; a list at the same indentation
  as its key (`tags:` then `- a` at the same column) is not followed either, as before (the emitter indents by two).
- The harness has no DOM: the keyboard and mouse path of *Save all changes* was exercised only in the built-in browser, once per scenario above.

## Follow-ups

- #52: a comment or blank line above a rewritten line ends up below it (pre-existing, found here).
- #53: a YAML 1.1 boolean word (`yes`, `on`) makes the save rewrite the whole file and lose its comments (pre-existing, found here).
- #54: an edited flow collection loses the comments inside its brackets, the quotes of its keys and the words of its booleans (a limit of this run).
- #41 and #51 are fixed by this run; closing them belongs to the wave's pull request. #50 is left open, untouched.
