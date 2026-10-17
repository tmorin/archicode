---
type: run
run: 0067
status: completed
wave: 013
---

# Run 0067: Save list at key column

Wave 013 (`reported-defects-and-shipped-files`), item W-4 (phase P2). Focus: save a manifest whose lists are written at the column of their key, or that has anchors, tags or a comment in an empty list, and see only my lines change.
Document profile: `single-document` (the scope arrives settled by the wave plan and by issue tmorin/archicode#57; runs 0052, 0053 and 0055 changed the same functions the same way); this file
carries scope, decisions, canonical impact, review passes, tasks, verification and findings.

## Scope

In `standalone.html`, the line-preserving save (`patchYamlText` and its helpers) and nothing else of the page.

1. **#57.** A list written at the column of its key (`tags:` then `- a` at the same column) is followed by the aligner: the items an edit does not touch stay as the author wrote them,
   with their comments and blank lines, and an item the edit adds is written at the column the list already uses. The rule of waves 010/011 stays: a result is accepted only if
   re-reading it gives the emitter's value.
2. **Wave 011's two cases that no issue named.** (a) A file with YAML anchors, aliases or tags. (b) A comment inside an empty collection (`tags: [] # note`, `tags: # note`, an empty
   block with a comment line, empty brackets with a comment inside) that an edit fills.
3. The six edits of run 0055 on the YAML files of the repository, again.

## Decisions

- **D1. The key-column list is read as the emitter writes it (#57).** `markKeyColumnLists` moves every list at the column of its key, and everything under it, two columns to the right
  (a line `key:` with nothing after it, followed by a `- ` line at the column of the key; nested ones add up; the text of a block scalar is not looked at), and puts a mark on the line
  of the key (`\u0001K` after ` #`, or `\u0001L` after the comment it has). The existing aligner then runs unchanged on that text (`patchYamlTextAt` is the old body of `patchYamlText`),
  and `unmarkKeyColumnLists` moves the lines under each marked key two columns back, the items the edit added with them. Alternative rejected: teaching `locateEmittedLines`,
  the quote chooser, the comment carry-over and the flow reader a per-line column delta: it touches five functions that W-6 and W-7 also edit, and it needs the depth of every
  line; the mark is local (three functions and a wrapper) and gives the new items the right column for free.
- **D2. The rule is checked on the final text.** `patchYamlText` accepts the unmarked text only if `serializeYamlValue(parseYaml(text))` is the emitter's text of the new value;
  otherwise it returns the emitter's text, as before. A text that already holds the mark character (U+0001), a line with no room to move back, or a mark left over is the same fallback.
  The strict path of `patchYamlTextAt` itself does not re-read when no quote was styled (as before); the wrapper does, for the files it handles.
- **D3. A mark can end up on a kept line that now stands for another value.** The aligner pairs equal lines, so when the first item of a list of maps goes, the `- note:` line that
  stays is the first one's, with its mark. `unmarkKeyColumnLists` moves what is under a mark only when the first line under it that is not a comment is a `- ` item at the column
  two to the right of the key (or when only comments follow, the stray comments of a list that was emptied); otherwise what is under it is the emitter's and stays where it is
  (found by a differential fuzz, see Verification). The comment of the line that goes is lost with it, as it is for an indented list.
- **D4. The comment of a key line that opens or closes a collection (#b).** In the pairing of a hunk (the #50 rule), an added `key:` or `key: []` / `key: {}` line takes the end-of-line
  comment, and the spaces before it, of the dropped line with the same indentation and key, whether that line was `key: []`, `key: {}`, `key: ~` or `key:` with a value
  below it (`readYamlKeyLine`). So `tags: [] # note` filled is `tags: # note` and the items under it, and `tags:   # why` emptied is `tags: []   # why`. A bare `tags: # note` is already
  the line the emitter writes for a filled list: it stays, the items come under it.
- **D5. Comments inside the brackets of an empty collection (#b).** `openFlowLists` opened an empty `[ ... ]` as one line `key: []` and dropped the comments inside; it now writes them as
  lines under the key, which `closeFlowLists` finds again when no edit fills the collection (the text is then as written) and which stay under the key, after the new items, when one does.
  The comment on a line of its own inside an empty block (`tags:` then `# note`) was already kept, below the new items; it is pinned.
- **D6. Anchors, aliases and tags are not carried; the editor keeps its fallback (#a), filed as #74.** The editor's reader refuses all three (`anchors, aliases and tags are not
  supported`), so such a file is listed as unreadable, left out of the model and never written (byte for byte, tested): there is no line-preserving save to extend. Carrying them
  means reading anchors into the model (an alias would be a copy, which the emitter would write as two copies and the command line does not do either: it reads an alias as its name,
  found here) and writing the aliases back, which is a decision about the model, not a few lines of the aligner. `anchors-tags-save.test.js` pins what the editor does today; #74
  has the reproduction, the gap with the command line (which reads anchors and tags, and reads `*n` as the text `n`), and that a rename leaves the references of an unreadable file behind.
- **D7. The manual** (`src/doc/README.adoc`, editor section) says what the save keeps now and that a manifest with an anchor, an alias or a tag is not read.
- No change to the kernel, the Java, the header or the Map code of W-3. `embed.sh --check` passes.

## Canonical impact

None to the architecture model (no `CI-arc` or `CI-dom` packet: this run has no TDD). The manual's editor section (D7).

## Review passes

- **KDMLLC (inline).** K: three small helpers around an unchanged aligner, one helper for the key line, two changed lines in `patchYamlLines` and `openFlowLists`. D: the comment carry-over
  of #50 is reused for the key lines; the unwritten-list column is not computed anywhere, it is the mark. M: each case has a test (the issue's four operations, a list of maps, a nested
  list at the column of its key, a mixed file, CRLF, a tree of elements, the editor rename, the fallback, the aligner keeping a line for another value; the comment after `[]`, `{}`, `~`
  and a bare key, emptied, inside a block, inside brackets, after a `[ ]`; anchors, aliases, tags, the unreadable file). L: no option, no new setting. U: the rule is in the comments of
  `markKeyColumnLists`, `unmarkKeyColumnLists` and `yamlLastLineUnderKey`. C: below.
- **C scan.** The wave plan asks for "the item of a list at the column of its key for the item the emitter writes two columns deeper, the author's lines for the items an edit does not touch,
  an added item at the column the list already uses": D1 and the tests (rename, add, remove, change another key, each with only the intended lines in the diff). "A file with anchors
  or tags ... fixed if the line-preserving save can carry them under the rule below, else filed with the reproduction": D6, #74. "A comment inside an empty collection that an edit
  fills": D4 and D5. "The rule of wave 010 stays": D2, with a test that stubs the aligner to return a wrong text.

## Tasks

- [x] T1. Reproduce on `HEAD`'s page (scratchpad `repro1.js`, `repro3.js`, `repro4.js`; the tests below fail on `HEAD`): #57 rewrites the whole file; `tags: [] # note`, `tags: # note`, `tags: ~ # note`
  and the comments inside empty brackets lose their comment; the anchored file is unreadable.
- [x] T2. Tests first (`faithful-saves.test.js`, 14 new; `anchors-tags-save.test.js`, 4).
- [x] T3. #57: `markKeyColumnLists`, `unmarkKeyColumnLists`, `yamlLastLineUnderKey`, `yamlBareKeyColumn`, the wrapper `patchYamlText` over `patchYamlTextAt`.
- [x] T4. The comment of a key line that opens or closes a collection (`readYamlKeyLine`), and the comments inside empty brackets (`openFlowLists`).
- [x] T5. Anchors and tags: the pin and issue #74.
- [x] T6. The six edits of run 0055 on the YAML files of the repository; the differential fuzz of key-column files; the fuzzes of run 0055 again.
- [x] T7. The manual's sentence; the five commands of the gate.

## Verification

Run from `/home/tibo/git-perso/archicode`, JDK 25 (`JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem`), offline.

- **Before/after of the tests.** Against `HEAD`'s `standalone.html` (the page of commit 1856803; the new test files run with a harness that loads it), 13 of the 14 new tests of `faithful-saves.test.js` fail
  (the 14th, "a collection that no edit fills is saved as written", asserts what must not change and passes on both); with the change all pass. `HEAD` on the issue's example: the whole file becomes the emitter's text
  (`id: m`, the comment on the id line gone, `tags:` re-indented to `    - a`). `HEAD` on `tags: [] # note` filled: `tags:` with no comment. `anchors-tags-save.test.js` pins what `HEAD` does: 3 of its 4 tests pass on both; the 4th fails on `HEAD` only because the readable file it saves holds a list at the column of its key.
- `./mvnw -o verify`: BUILD SUCCESS (422 unit tests, 0 failures; integration tests skipped by default, as in the pom).
- `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`: 173 passed. `src/main/rust/viewpoint-kernel/embed.sh --check`: "the committed WebAssembly is the one the sources
  build", exit 0. `npx prettier --check "src/**/*.java"`: clean.
- `node --test "src/test/javascript/**/*.test.js"`: 1038 tests, 1038 passed, 0 failed.
- **The six edits of run 0055 (scratchpad `w1/compare.js` and `w1/compare2.js`, the script of run 0055 re-run).** `HEAD`'s editor page (extracted from commit 1856803) against the working tree,
  `patchYamlText` on the **305** tracked YAML files of `src/doc/examples`, `src/test/workspaces` and `src/test/resources` (the 85 of run 0055 and the files added since), the six edits: no edit;
  set a number and a boolean; drop the last key of `content` (or of the file); drop the first item of every list; set a string and add a key; append `-x` to the first string.
  **1830 results**: 634 are an edit that does not change the file's value, and **all 634 are saved byte for byte** (`HEAD`: 631; the three it rewrote are the no-edit save of the
  three files that hold a list at the column of its key); 1196 apply, **1182 are identical to `HEAD`**, 14 differ, **all 14 on those three files** (`domain_configuration/default_settings.yaml`,
  `domain_workspace/default.yaml`, `domain_workspace/empty.yaml`: `HEAD` rewrote the whole file, the lines it changed were 4/4, 17/6, 12/11, now 1/1, 11/0, 2/2, and so on); 0 do not read
  back as the edit. None of the other 302 files holds a list at the column of its key or a comment in an empty collection.
- **Differential fuzz of key-column files (scratchpad `w1/fuzz57.js`, 8 seeds of 600 generated manifests, about 4170 usable cases).** Random trees (maps, lists, lists of maps, empty lists, null
  words), comments at the end of lines, comment lines, blank lines, LF and CRLF; the lists written indented and the same file with every list moved to the column of its key; one or two
  random edits (set, add a key, push, remove an item, empty). The no-edit save is byte-identical for every one; every result reads back as the edit; the saved key-column text equals, line by line
  ignoring indentation, the save of the indented twin in **all** of them (after D3: before, one case in about 1300 fell back to the emitter's text, which the re-read caught).
- **Fuzzes of run 0055 again (`w1/fuzz.js` 3 seeds of 800, `w1/fuzz2.js` 2 seeds of 400, `w1/fuzz2c.js` 300 with CRLF).** No problem; the 6 results that differ from `HEAD` in `fuzz.js` are all a
  comment on an empty `key: []` / `key: {}` that is kept now.

## Not verified

- The real page in a browser (the node harness runs the page's own script on an in-memory folder; nothing in the markup or the styles changed).
- A very large manifest for the cost of the extra pass (one more split and one scan of the lines, only when the text holds a key-column list).
- A list at the column of its key inside a multi-line quoted or plain scalar, or a flow collection written over several lines whose lines look like keys: the result is re-read, so the
  worst case is the emitter's text, but no test builds it.
- `moveBlockInText` (the *Move* of the editor) still does not follow a key-column file: it gives up and the ordinary patch writes the moved lines, as before; not changed.

## Findings

- Filed **#74**: a manifest with an anchor, an alias or a tag is unreadable for the editor (the command line reads it), and a rename leaves the references of such a file behind; found on the way: the command
  line reads an alias as its name (`description: *n` is `n`, Jackson's alias event), not as the anchored value.
- #57 should be closed by the commit of this run. Its example is the first test.
- When the aligner pairs the line of a key with the wrong item (D3), the comment of the line that is really kept goes with the item that goes; the same for an indented list. Not new, now visible
  in a test.
- Lesson: moving the file into the emitter's layout and back, with a mark on the lines that need it, lets an aligner that compares indentation follow a layout it does not write, and the
  re-read rule catches the cases the mark gets wrong; this is the same device as `openFlowLists` / `closeFlowLists`.
