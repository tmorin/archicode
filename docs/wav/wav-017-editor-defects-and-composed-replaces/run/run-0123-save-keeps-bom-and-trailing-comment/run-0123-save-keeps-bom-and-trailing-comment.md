---
type: run
run: 0123
status: completed
wave: 017
---

# Run 0123: save-keeps-bom-and-trailing-comment

Wave 017 (`editor-defects-and-composed-replaces`), item W-5 (phase P0). Focus: the line-preserving save of the editor keeps a UTF-8 byte-order mark, and a comment after the last line of a block that moves goes with the block (GitHub issue #119, findings F2b and F2c of run 0104).

Document profile: `single-document`, as the runs of wave 016. The change is in the page alone (`standalone.html`) and its tests; a prd/tdd/pln would copy the brief. The review passes are answered below.

## Scope

In: `src/main/resources/editor-webapp/standalone.html` (how a file is read, the two writes, the text functions of the moves), `src/test/javascript/viewpoint-kernel/**` (the new test file, the in-memory folder and the harness, the fake servers of three tests), `CLAUDE.md`.

Out: the command line (it already reads a BOM, see D1, and writes no manifest), the manual and the tutorial (W-9 of this wave), the Java and the kernel (untouched).

## Findings that settle the design

- **How a browser gives a file to the page.** `File.text()` and `Response.text()` run the UTF-8 decode of the Encoding standard, which drops one leading U+FEFF. So the page never sees the mark, whether the folder is picked (File System Access API) or served (`archicode editor serve`, whose `GET /api/fs/file` sends the bytes of the file as they are). Node's `File` does the same (checked), so the test folders can model it. `writable.write(string)` writes the characters as UTF-8, so a string that starts with U+FEFF writes the three bytes.
- **Where the mark is lost.** Not in the text functions alone (`patchYamlLines`, `moveBlockInText`, `cutBlockFromText`, `pasteBlockInText` each strip a leading mark and return text without it, which was F2b of run 0104): the mark is lost on reading, so every save of a file that had one wrote it without. This is also true of `workspace.yaml` (`writeWorkspaceYaml`).
- **The command line reads a BOM.** Checked on the jar with a copy of `domain_application`: a manifest with a BOM, and then `workspace.yaml` with a BOM, give the same `query graph` as without, no error (Jackson's YAML parser skips it). The command line never writes a manifest, so the loss is the editor's alone and no case is shared between the tools.

## Decisions

- **D1. The page holds the text without the mark and a flag.** `readTextAndMark(file)` reads the text as the browser gives it and the first three bytes of the file (`file.slice(0, 3).arrayBuffer()`); `bom` is true when they are EF BB BF. A reader that has no `slice` and hands the mark in the text (no browser does) has it taken off and noted. So `rawText`, `savedRawText`, the dirty comparison, the raw-text editor of Files and every text function never see a mark. The flag is on the file record (`bom`, set at the load and at `reloadManifestFile`, copied by the spread of `commitFileEdit` and by the snapshot of `guardedLayerWrite`) and on `AppState.workspace` for `workspace.yaml`. A file created by the editor (a new element, the extract of a move) has none.
- **D2. The write puts it back, once.** `writeManifestFile` and `writeWorkspaceYaml` (the only two `createWritable` of the page) write `withByteOrderMark(bom, text)`: the mark first, unless the text already starts with one. `savedRawText` and the comparison with `rawText` stay on the text without the mark.
- **D3. The served folder keeps the bytes.** `serverFileHandle.getFile` builds its `File` from `response.arrayBuffer()` instead of `response.text()` (which would have dropped the mark before the page could look for it). The `PUT` body already goes as a Blob of the string.
- **D4. The text functions keep a mark they are given.** `patchYamlText`, `moveBlockInText`, `cutBlockFromText` and `pasteBlockInText` take a leading mark off, do their work and put it back. The page does not need it (D1); a caller that holds a text with its mark gets it back instead of losing it silently, which is what F2b of run 0104 left as a trap.
- **D5. The rule for a comment after the last line of a block** (`lastLineOfBlockWithComments`, used by the move in the file, `cutBlockFromText` for a move to another file and for the extract to the top level). The lines after the last line of the block are read while they are blank or comments. A comment goes with the block when it is **indented deeper than the item** (the `- ` line of the block), that is as the keys of the block are; or when it is **at the column of the item and nothing follows it in the list** (the next line that is not a comment is shallower than the item, or there is none): it introduces nothing. A comment at the column of the item **above a sibling** is that sibling's introduction (the case `# the cellar is on its own` of the shipped tests) and **stays**; one **shallower** than the item is the next thing's and stays. The first comment that stays ends the scan: what comes after it stays, even if it is deeper. The blank lines between the block and a comment that goes with it go with it; the blank lines after the last of those stay. The carried lines are re-indented with the block like the rest (and the comment of an extract becomes a comment of the new manifest's `content`).
- **D6. The other side of the rule** (`deeperThanItemAfterSibling`): when a block has a sibling above it, the comments just above it that are deeper than its item are the trailing comments of that sibling (D5), not its introduction; moving the block leaves them. The first child of a parent has no sibling above it: the comment above it is its own, as before, whatever its column.
- **D7. Limits of the heuristic (written, not hidden).** The rule is indentation alone. (a) A comment about the block written at the column of an item that has a sibling after it (`# end of the press` before the next `- kind:`) is read as the sibling's introduction and stays. (b) A comment about the next element indented as the keys of the block is read as the block's and goes with it. (c) A comment at the column of the item, as the last thing of a list and before a shallower thing, goes with the block even if the author meant it for the parent's next key (the parent's keys are shallower than the item, so this needs the comment itself to be at the item's column). (d) A comment deeper than the item that follows a blank line goes with the block (the blank line with it), even if it was meant as a section comment. (e) A block that has a deeper comment above it, moved after a sibling, reads that comment as the sibling's trailing comment (it keeps its column: the comment is carried as written). (f) The layouts the text functions cannot follow (an anchor, a layout that does not re-read the same) fall back to the ordinary patch, which writes the block as the emitter does and carries no comment, before and after this run. The model is never affected.
- **D8. Behaviour change, accepted.** A comment after the last line of a block at a deeper column than its item used to stay where it was (the shipped test `the comments on lines of their own inside the block go with it; the ones after its last line are the next element's` pinned it with `# after the oven` at the column of the last child, which is deeper than the item `oven`). It now goes with the block; the test is renamed and its assertions say so. Files with no BOM and moves with no such comment are written byte for byte as before (see Verification).

## Tasks

- [x] T1. Find where the page reads and writes files (`getFile`, `createWritable`, `rawText`), and what the browser, the fake folders and the server hand over.
- [x] T2. Reading: `readTextAndMark`, the flag on the files and on the workspace, the bytes of the served file (D1, D3).
- [x] T3. Writing: `withByteOrderMark` in the two writes (D2), the text functions (D4).
- [x] T4. The rule for the trailing comment in the three move paths and its mirror (D5, D6).
- [x] T5. Tests: `save-keeps-bom-and-trailing-comment.test.js` (14), the in-memory folder hands a real `File` for a text with a mark, the fake servers answer `arrayBuffer()`, one existing test renamed (D8).
- [x] T6. `CLAUDE.md`; gate commands; identity with the HEAD page; the page served by `archicode editor serve` in a browser; one commit.

## Review pass

- KDMLLC read: one place reads (`readTextAndMark`), one writes (`withByteOrderMark`), one function says which comments follow a block (`lastLineOfBlockWithComments`) for the three move paths; the mirror is a second small function with its own name.
- Open questions: none left. Settled here: where the mark is lost (D1 to D3), whether the command line reads a BOM (yes, so the issue is the editor's alone and nothing is shared), the rule and its limits (D5 to D7).
- C scan against the code: every `createWritable` of the page is in `writeManifestFile`, `writeWorkspaceYaml` (and the server handle's own); every `getFile()` that reads a text goes through `readTextAndMark` (the three others only read `lastModified`); the records of a file made elsewhere (`mf` of a new element, the extract, `adoptRemovedFile`) have no `bom`, which reads as none.

## Canonical impact

`CLAUDE.md` changes: the sentence on the line-preserving save says what keeps the mark and the rule of the comment after the last line with its mirror and where they are pinned. The list `[[plateau-limits]]` of `CLAUDE.md` and the manual still name #119: W-9 takes it out. No domain invariant changes (a view, a story and the model do not know the mark or the comments).

## Verification

- `./mvnw -o verify -DskipITs=false` (JDK 25, `PLANTUML_JAR`): exit 0, BUILD SUCCESS, 902 unit tests and 21 integration tests, 0 failures (the Java is untouched; the count is the one of W-4).
- `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`: 213 passed. `embed.sh --check`: the committed WebAssembly is the one the sources build.
- `node --test "src/test/javascript/**/*.test.js"`: 1946 tests, 1946 pass, 0 fail (1932 before, plus the 14 of the new file; run after Maven had finished).
- `npx prettier --check "src/**/*.java"`: clean.
- The new tests against the HEAD page (`standalone.html` of HEAD swapped in, then put back): 13 of 14 fail, the 14th is the guard that a block with no comment after it is cut as before.
- Identity with the HEAD page: `identity.js` (scratchpad) opens the 20 workspaces of the repository that have a `workspace.yaml` (the examples of `src/doc/examples`, the fixtures of `src/test/resources`, the layered Brightcart among them) in the in-memory folder, and for each of 686 jobs (519 moves, to every parent offered up to 6 and to the top level, and 167 renames of an element, spread over each workspace) saves and hashes every file written. The HEAD page and this page give the same outcome of the move and the same hash for every file written, in all 686 jobs (210 of them wrote files, cross-file pastes and extracts among them): no difference. None of those files has a BOM or a comment after the last line of a moved block that is deeper than its item, so the expected difference does not show there; the new tests are where it shows.
- By hand, in the built-in browser, on the page served by the packaged jar (`archicode editor serve` on a copy of `domain_application` whose `workspace.yaml` and `ArchiTool.yaml` start with EF BB BF): the page reads `bom: true` for those two files and `false` for the others; an element edit and a settings edit saved through the real server give files whose first three bytes are still EF BB BF with only the changed lines different (`diff` against the copy before), and the files with no mark are untouched. `query graph` of the command line on the saved folder reads it, name included.

## Findings

- F1. For **W-9** (the manual and the tutorial): `[[plateau-limits]]` of `src/doc/README.adoc` and the list in `CLAUDE.md` (the sentence "The manual says what the tools do and what they do not yet (`[[plateau-limits]]`: ... #119 ...") still name #119; they lose it, and the manual's description of the *Move* (cut and paste of a block between files) should say that a comment after the last line goes with the block under the rule of D5 (and the limit D7 a, b). `git grep -n "119" -- src/doc CLAUDE.md` finds them.
- F2. The deeper-comment-above rule (D6) changes one thing that is not in the issue: a comment above an element that is deeper than its item and that has a sibling above it is no longer carried when the element moves (it was, before, whatever its column). It is the other side of D5 and is pinned (the test `the other side of the rule`). No file of the repository has such a comment (identity run).
- F3. `File.text()`, `Response.text()` and `TextDecoder` (without `ignoreBOM`) all drop one leading BOM, and `readTextAndMark` is the only place that asks for the bytes. A file that holds two marks in a row (EF BB BF EF BB BF) is read as one mark and a text that starts with U+FEFF; the text functions then strip it as before. Not handled, not worth a case.
- F4. Not verified: a browser that picks the folder with the File System Access API (the built-in browser here was served by `archicode editor serve`; the picker path differs only by the handle, `File.text()`/`slice` being the same objects, and is run in node with a real `File`), the Native job (no class is added, `reflect-config.json` is untouched).
- F5. Files outside `likely_paths`: none but this run's own document. Inside them, beyond the new test file: `mem-folder.js` and `harness.js` (a text with a mark is handed as a real `File`; the fake `File` of the served sandbox is the host's), `discovery.test.js`, `folders.test.js` and `server-mode.test.js` (their fake responses answer `arrayBuffer()`, as `serverFileHandle` now asks for it), and the renamed test of `move-editor.test.js` (D8). Issues filed: none.
