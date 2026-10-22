---
type: run
run: 0142
status: completed
profile: single-document
wave: 019
---

# Run 0142: save-keeps-anchors-in-brackets

Wave 019, W-6. The line-preserving save keeps an anchor, an alias or a tag inside brackets, a tag on a multi-line text and an anchor on a list item whose map starts on the next line, as written (#78, decision T7).

## Scope

The section "Read, but written again in the editor's own layout when a file is saved" of #78. Each of its three forms made `patchYamlText` give up and write the whole file in the emitter's layout (comments lost, aliases written as their values):

1. an anchor, an alias or a tag inside square or curly brackets (`qualifiers: [&a oven, *a]`, `tags: {zone: &z north, other: *z}`);
2. a tag on a plain or quoted text that goes over several lines, when the tag changes what the text reads as;
3. an anchor on a list item whose map starts on the line below (`- &s`, then the keys).

Only `standalone.html` (the save and the notes its reader leaves for it) and the node tests change. Reading is not changed in either tool; the forms the editor refuses stay refused; an anchor or a tag on a key of a block stays refused (W-9 documents it as not planned); the merge key `<<` is untouched.

## Decisions

- **D1. Brackets: written as the block they would be, then put back.** A flow collection that holds an anchor, an alias or a tag is first written as the block it would be, with them, in the emitter's layout (`openDecoratedFlows`, `decoratedFlowBlock`, `emitDecoratedFlow`: keys and scalars as written, `&a`, `!!str`, `*a` where they were). The existing machinery of anchors in a block (`openYamlDecorations` / `closeYamlDecorations`, wave 014 run 0071) then follows them, and `closeFlowLists` (the one that puts back the flow collections without them) puts the brackets back where the edit left the block as it was. The reader leaves for it, only when the save asks (`notes`), how each node of a flow collection is written (`parseYamlFlowNode` gives an `ast`); what it reads is the same. The block must read as the brackets do, else the fallback.
- **D2. A collection in brackets that the edit changes stays a block.** That is the rule of every flow collection since waves 009 and 010 ("one that the edit changes stays a block"); a decorated one follows it, and keeps its anchors, aliases and tags by the rules of a block. Writing a changed collection back in brackets would be a new behaviour for all flow collections, not a fix of #78: proposed as a follow-up, not built.
- **D3. An edit of the value that carries the anchor** (the question of the brief): the anchor stays on the edited value; every alias of it is written as the value it had, since the alias would now say the new value (the rule of run 0071). The anchor and its aliases edited together stay an anchor and aliases. An item that carries the anchor removed: the aliases are their values.
- **D4. A text over several lines is followed, with or without a tag (wider than the wording of T7, by necessity).** Measured before the change: a plain or quoted text over several lines was not followed at all, with or without a tag (the aligner looks for the one line the emitter writes), so the whole file was written again; #78's "when the tag changes what the text reads as" was only the part that was named. Case 2 cannot be kept without following the text itself, so `openYamlDecorations` now reads any text over several lines (its reader notes it: `kind: 'lines'`, or the `props` note with its `last` line) as the one line the emitter writes, in its quotes, with the comment of its last line, and `closeYamlDecorations` puts its lines back when the edit left the line alone. A text the edit changes is one line, in its quotes, with its comment and with its tag when the new value still reads so (else the tag goes: the text must say the edit). This also keeps files whose only unusual layout is a text over several lines, which were written again entirely before; a strict improvement, guarded by the same read-back check.
- **D5. An item whose map starts below its dash.** `mergeBareDashItems` writes `-` (or `- &s`, already opened by `openYamlDecorations`) and the first key on one line, `- key: ...`, with the lines of the map moved to the column the emitter gives them when they were deeper, and a mark in the comment; `splitBareDashItems` puts the dash line, the comments between it and the first key, and the columns back. It runs in `patchYamlTextPlain` for every file, with or without an anchor (the issue says the layout was not followed either way). A marked line that is no longer the first key of an item, or a result that does not read as the edit, gives the old path.
- **D6. Safety.** Every new path ends in the existing read-back check (the text must read as what the emitter writes for the edit) or gives the previous path's text. An exception in `openDecoratedFlows` gives the emitter's text; one in `mergeBareDashItems` or `splitBareDashItems` gives the unmerged path (`patchYamlTextColumns`); one in `closeDecoratedFlows` keeps the block layout, already checked to read as the edit. A file that already holds the new mark characters (`\u0004`, `\u0005`) is not merged (the transform is skipped).

## Kept now vs fallback

Kept as written (every line the edit does not reach is byte for byte the file's; `save-keeps-anchors-in-brackets.test.js`):

- brackets (D1 to D3): on one line or several, nested, with comments inside, as the value of a key or an item of a list, a map item with an anchor (`[&s {k: v}, *s]`), with CRLF and a byte-order mark;
- texts over several lines (D4): plain, single or double quoted; with a tag that changes what they read as (`!!binary aGVs` / `bG8=`, `!!float "1` / `"`), one that does not, or none;
- items below their dash (D5): with an anchor or none, keys at dash + 2 or deeper, a comment on the dash line, comments between the dash and the first key.

Still the fallback (the emitter's text, which reads back as the edit), pinned in the same test with the reason:

- an anchor or a tag on a key inside brackets (`{&k zone: north}`): the editor's reader takes it there only and refuses it on a key of a block, so it cannot be written as a block;
- a single pair in a list (`[&a one: two]`), with an anchor, an alias or a tag in the brackets: not a layout the block writer writes;
- a tagged text over several lines inside brackets: its tag cannot be put on one line that says the same;
- an item below its dash inside the map of another such item: only the outer one is merged, the inner layout is not one the aligner follows.

Effects pinned rather than changed (they are the aligner's, as in any list): an item removed whose first line reads as the next item's first line (`kind: container`) gives the next item the dash line, the comments and the columns of the removed one; a comment on a line of its own between two keys of a removed item stays. Removing the first key of an item that was merged gives the item the emitter's layout (`- name: ...`), and the comment of its dash line goes with the line removed.

## Evidence

- `src/test/javascript/viewpoint-kernel/save-keeps-anchors-in-brackets.test.js` (new, 21 tests): each form saved with an edit elsewhere, with an edit of an item, an item added, an item removed, the anchored value edited, the alias edited, both edited, compared with the expected file (every other line byte for byte) and read back as the edit; the shapes of a real workspace (an anchored item in brackets in one element and its alias in brackets in another, a map in brackets whose values are aliases); the fallback cases with their reasons; the reader unchanged (a key anchor in a block refused, `<<` a key); a corpus with random edits (reads back as the edit, no mark left); two editor tests (`commitElementEdit` / rename, `saveAllChanges`, the bytes written).
- Against the page of `archicode-0.17.0` (`git show archicode-0.17.0:src/main/resources/editor-webapp/standalone.html`, `ARCHICODE_EDITOR_HTML=<it>`): 19 of the 21 tests fail (the page writes the layout again, or cannot read `!!binary`); the two that pass are the fallback cases and the unchanged reader, as they should.
- Existing tests changed. The wave plan's row for W-6 says "every existing save test is unchanged"; three existing tests pinned the very fallback that #78 asks to remove, so they could not stay unchanged, and they are read as outside that criterion (the orchestrator decides whether the plan is amended; this run does not write the plan). They are: in `anchors-tags-save.test.js`, "an anchor, an alias or a tag inside brackets, or a tag on a text over several lines, gives the emitter's text" (now: they stay as written) and "in the editor, a file whose anchor the save cannot follow is written as the emitter writes it" (now on an anchor on a key in brackets, which still falls back); in `flow-collections-editor.test.js`, "a layout the aligner cannot follow gives the emitter's text ..." (its last case, `tags: {a: &x b}` edited, is now a block that keeps `&x`; a case with an anchor on a key in brackets is added, which falls back). One test is widened, not changed in what it checks: "no edit is the file, byte for byte, for every form the save follows" in `anchors-tags-save.test.js` no longer skips the bracketed forms. One test is added there: "in the editor, a file with an anchor and an alias in brackets is saved with only the edited line changed". Every other save test is unchanged and passes.
- Generated fuzz (scratch, not shipped): 14 000 generated files with decorated flows, texts over several lines with and without tags, bare-dash items with and without anchors, comments and aliases, of which 12 237 are readable; for every readable one, no edit gives the file byte for byte, and 61 185 random edits read back as the edit with no mark left (manifest reading, `workspace.yaml` reading, CRLF). An edit of the `id` alone changes only that line in 2788 of 2788 readable files of one run of 3000; on the page of HEAD before this run, with a run of 500 generated files (463 readable), 175 of 463.

## Manual passages for W-9

- `src/doc/README.adoc` line 1520, `[[plateau-limits]]`: the bullet "The save of the editor writes a file again in its own layout ... (#78)": the three forms are kept now; what stays is the fallback list above, and the key anchor (read by the command line, refused by the editor, not planned) and `<<` (refused by both).
- line 1597 (`[[editor-elements]]`, the paragraph on the save): "The editor does not follow an anchor, an alias or a tag inside square or curly brackets (`[&a one, *a]`), nor a tag on a text that goes over several lines: such a file is written again entirely ..." and "When a file is laid out in a way the editor does not write ... it is written again entirely": add that a text over several lines and an item whose map starts below its dash are followed, and that a collection in brackets with anchors that a change reaches is written as a block that keeps them.
- line 1944 (`[[editor-move]]`): "A file whose layout the move cannot follow (an anchor, an alias, a tag, a list written at the column of its key) is written by the ordinary save": still true for the move (unchanged); the ordinary save now keeps more of such a file (a file with a text over several lines included).

## Canonical impact

None: no architecture or domain packet; the editor's save is described by `CLAUDE.md`, whose paragraph on the reading of YAML gains one sentence on what the save keeps (the #78 sentence there is kept; its removal from the "filed" list of `[[plateau-limits]]` is W-9's).

## Deferred, worth an issue

- A collection in brackets that an edit changes could be written back in brackets (with its anchors), for every flow collection, not only the decorated ones (D2).
- The aligner keeps the first of two lines that read the same when an item is removed (D5 effects): an item removed in the middle of a list gives its layout to the next one. A general property of the aligner, older than this run.

## Tasks

- [x] reader notes (`parseYamlFlowNode` `ast`, `flow` and `lines` notes, `scalarEnd`), no change to what is read
- [x] `openDecoratedFlows` / `closeDecoratedFlows` (brackets)
- [x] text over several lines in `openYamlDecorations` / `closeYamlDecorations`
- [x] `mergeBareDashItems` / `splitBareDashItems` in `patchYamlTextPlain`
- [x] tests: new file, three existing tests updated, run against the 0.17.0 page
- [x] `CLAUDE.md`
- [x] verification set on the final tree (the tree of the commit of this run; JDK 25.0.4-tem; run one after the other after the last change to the code, `CLAUDE.md` and the tests; only this document changed after): `./mvnw -o verify -DskipITs=false '-Dtest=!CustomRenderingTest' -Dsurefire.failIfNoSpecifiedTests=false` BUILD SUCCESS, 1258 unit tests (2 skipped) and 27 integration tests, no failure; `cargo test` 233 passed; `embed.sh --check` 0 (the committed wasm is the one the sources build; the kernel is not touched); `node --test "src/test/javascript/**/*.test.js"` 2399 of 2399; `npx prettier --check "src/**/*.java"` clean. Not verified: a real browser (the node harness runs the page's script in a sandbox with an in-memory folder).
