---
type: run
run: 0148
status: completed
profile: single-document
wave: 020
---

# Run 0148: save-keeps-the-brackets

Wave 020, W-3. When an edit changes a collection that the file writes in brackets (`qualifiers: [a, b]`, `tags: {zone: north}`, `replaces: [a, b]`), the editor's line-preserving save writes it back in brackets, on its line, when it fits, instead of as a block (GitHub issue tmorin/archicode#145). The command line never writes manifests: no Java change.

## What was measured first (page of `archicode-0.18.0`)

`patchYamlTextAt` opened every flow collection of the file as the block the emitter writes (`openFlowLists`), aligned the lines of the old value with those of the new one (`patchYamlLines`), and put back, by `closeFlowLists`, only the collections whose opened block was untouched, byte for byte. A collection the edit reached therefore stayed the block the aligner had written (since waves 009/010, for every bracketed collection, anchors or not). The model was always right; the author's layout of those lines was not. A comment inside the brackets stayed as a line of the block (#54).

## Decisions

| # | decision | verdict |
|---|---|---|
| 1 | where | after the aligner, before `closeFlowLists`. `openFlowLists` records on each opened collection where it starts (`index`), its kind (`keyed`: `key: [..]`, `item`: `- {..}` / `- [..]`), whether it was empty, what followed the closing bracket (`tail`), the width of its line, the padding of its brackets (`pad`). `markOpenedFlows` puts a mark (`\u0006n\u0007`, in the comment of the first line, as `openYamlDecorations` marks its lines) on the first line of each, so that the block can be found after the edit whatever the aligner did to the lines around it. `bracketChangedFlows` finds each mark, reads the block under it (the lines deeper than the collection's column), and: as opened -> left for `closeFlowLists` (untouched); else `bracketedLine` writes it on one line; else the block stays (`null`) |
| 2 | what is written | `key: [a, b]`, `key: {k: v}`, `- {k: v}`, `- [a, b]` with nesting (`[[a, b], [c]]`, `{zone: [n, e], tier: {level: 1}}`). The values are the tokens of the block lines as they are (quotes, `on`/`yes`, numbers), so what the edit did not touch is spelled as the author spelled it and what it adds is spelled as the block would (the quotes of the lines around it, as before). A plain text with `,` `[` `]` `{` `}` is double-quoted (the brackets cannot hold it); a key likewise. The padding inside the brackets is the file's (`[ a ]`, `{ k: v }` stay padded, by kind). The comment after the closing bracket goes back after it with the blanks the author wrote before it. An emptied collection is `key: []` / `key: {}` with that comment and gap (before: the emitter's gap) |
| 3 | the width rule | the line, comment included, is no wider than **the widest line of the file, clamped to 100..120 columns**, or than **the line was** when the collection was on one line (`bracketWidth`, `start.width`). Rationale: the file's own widest line is "a width the file already uses"; 100 is a floor so that a file of short lines still takes a list of a dozen words, 120 a cap so that one long description does not allow a 400-column list; the second term means an edit that shortens or keeps a line never moves a collection that was already on one. Wider -> the block, as before (a long list stays a block once it is one) |
| 4 | a collection over several lines (`[` ... `]` on lines of its own) | goes on **one line**, where it started, when it has no comment inside and fits: the block it would otherwise become loses the author's layout anyway, and the brackets are what the author chose. Its trailing comment (after the closing bracket) is kept |
| 5 | a comment inside the brackets | **not kept inside, the block stays** (listed case): a comment has no place in a one-line flow, and moving it after the closing bracket would change what it is about. The comments stay as lines of the block as in #54 (`flow-collections-editor.test.js`, `faithful-saves.test.js` unchanged for these). The test is exact: the comment on the first line must be the one that followed the closing bracket, else it was inside (`- {destination: x, # the till` stays a block) |
| 6 | an empty collection that the edit fills | **the block, as before** (listed case): `[]` and `{}` are what the editor's emitter writes for nothing (a new story's `steps: []`, a new element's `relationships: []`), not a layout the author chose, and filling them in brackets (`steps: [{view: a, at: b, against: c}]`) would change what the editor writes for every file it created. Decided on that reason; one line (`if (start.empty) continue`) to reverse |
| 7 | anchors, aliases, tags in the brackets | unchanged: wave 019 writes such a collection as a block (`openDecoratedFlows`) before the aligner; the one the edit changes stays a block that keeps them. They never reach `bracketChangedFlows`. A collection without them beside one with them is in brackets (tested) |
| 8 | safety | every conversion is checked: the flow must parse to the same value as the block it replaces (`bracketedLine`), the whole text must still say the edit (`says`), and if the bracketed attempt fails the save runs again without brackets (`run(false)`: the old path, byte for byte); a file that already has the mark characters, a block with a block scalar, an anchor, something that is not a key, an item or a value, or any exception: the block |
| 9 | what does not change | a save that changes no collection in brackets writes the same bytes as `archicode-0.18.0` on every shipped YAML file (tested against the page of the tag: no edit, a new key, a renamed `name`). Move/cut/paste (`moveBlockInText`, `cutBlockFromText`, `pasteBlockInText`) carry a collection as written and do not call the new code. The reading is not changed |

## Known limits kept, with their reasons

- Quotes are not carried over a **reorder** of items (`[Sack, "Cart", 'Belt']` reversed is `[Belt, Cart, Sack]`): the aligner sees a line that moves as a line that goes and a line that comes. It is the same in a block and not this run's; pinned by the reorder test.
- A new text takes the quotes of the items around it (`'Crate'` after `'Belt'`), as in a block.
- A collection of maps or a very long list that does not fit stays a block, and stays one on the next save (a block is not turned into brackets: only a collection that was in brackets in the file is).
- A save in two steps can lose a quote that the first save would have kept in the block: the aligner copies the indentation of the line it replaces, writes a wrong column, and `says` fails, so the unstyled retry (no quotes) is what is kept. Seen in `editor-writes-layers.test.js` (`"HTTPS"` -> `HTTPS`) once the first save of the pair keeps `["React", "Next.js", "PWA"]` in brackets; the page of `archicode-0.18.0` gives the same `HTTPS` for the same starting text. Pre-existing (the retry in `patchYamlTextAt`), not fixed here: a wave finding.

## Review passes (the trio's, answered here)

- **KDMLLC.** KISS: three small functions (`markOpenedFlows`, `bracketChangedFlows`, `bracketedLine`) and a block-to-flow converter (`yamlBlockLinesToFlow`) on top of the existing open/align/close; no change to the aligner or to `closeFlowLists` (it only receives fewer lists). DRY: the marks follow `openYamlDecorations`'s; the quotes and words come from the block the aligner already wrote, none is recomputed; the comment/quote rules are not written a second time. MECE: each opened collection is exactly one of untouched / bracketed / block, and each "block" case has one reason (decisions 5 to 8). LEAN: no option, no setting, one width function. LUCID: the doc comments of `patchYamlText`, `bracketChangedFlows`, `bracketedLine`, `bracketWidth` say the rule; `CLAUDE.md` says it in one sentence. CONSISTENT: the empty rule, the comment rule and the anchor rule are the ones of waves 009/010/019 stated once.
- **Open questions.** Width rule: decided (3). Several-line originals: decided (4). Comments inside: decided (5). Empties: decided (6). Should a block be turned into brackets when the file has it as a block? No: the issue is about what the author wrote in brackets. Should `Move` write a changed collection in brackets? It does not change one.
- **C scan against the repository.** `grep` for the writers of a collection: every edit of a manifest goes through `patchYamlText` (`writeManifestFile`, `writeWorkspaceYaml`, the story and view writers), so one place; `openFlowLists` has three callers outside the save (move/cut/paste), which ignore the new fields. The tests that pinned "a change writes it as a block" are listed below.
- **Canonical impact.** `CLAUDE.md` (the sentence on the save); the manual in W-6 (below). No `dom` packet, no `arc` item.

## Tasks

| id | task | status | verification |
|---|---|---|---|
| T-1 | `openFlowLists` records `index`, `kind`, `empty`, `tail`, `width`, `pad` on each list | done | `save-keeps-the-brackets.test.js` |
| T-2 | `markOpenedFlows`, `bracketChangedFlows`, `bracketedLine`, `bracketWidth`, `yamlBlockLinesToFlow`; `patchYamlTextAt` runs the bracketed attempt, then the old one | done | same |
| T-3 | the existing tests that pinned the block are updated and listed | done | `node --test` (below) |
| T-4 | new test file: add / remove / reorder an item, an empty result, a list that does not fit, a comment inside, nested brackets, a map, an item of a list of maps, padding and quoting, empties, anchors, CRLF and BOM, twins, `.archicode.yaml`, the mark characters, a randomized round trip, byte identity with the page of the tag, an edit of every collection in brackets of every shipped file | done | same |
| T-5 | the tests fail on the page of `archicode-0.18.0` | done | below |
| T-6 | `CLAUDE.md` | done | one sentence |

## Tests updated (they pinned "a change writes it as a block"; that is the intended change)

- `flow-collections-editor.test.js`: *a flow map: kept ... in brackets on its line*, *a list in an item of a sequence of maps*, *a list with nested brackets*, *a list on several lines* (the tags over several lines without comment is on one line; the `replaces` with comments inside stays the block), *a flow map that is an item of a list*, *a key written in quotes ...*, *the lines of a block scalar ...*, *a file with Windows line breaks ...*, *the quotes of a list written on one line stay ...*, *removing the collection of one of two that read the same ...* (the changed twin is `{ zone: south }`). Titles of five of them say "in brackets".
- `faithful-saves.test.js`: *#54: a map that an edit changes keeps the quotes ...* (a map in brackets, `size: big` added, `heat: false`). The other #54 tests (comments inside, an item that is a flow map with a comment inside, a nested list with comments, empties that are filled) are unchanged and pass.
- `replaces-editor.test.js`: *a list written on one line gets the new reference appended* (`replaces: [archive.ghost, archive.rack]`); the title of *other flow lists ...* says what it tests (a new key is a block).
- `editor-writes-layers.test.js`: *a list the plateau sets whole stays a SET with the new list ...* (the `value: ["React", "Next.js", "PWA"]` stays on its line; the list of two maps is over 100 columns and stays a block).
- Comments only: `save-keeps-anchors-in-brackets.test.js` (header), `brightcart-editor.test.js` (a comment).
- `add-to-story-plateaus.test.js` was changed by the first version of the code (empties were bracketed) and is unchanged now (decision 6).

## Verification

- `./mvnw -o verify -DskipITs=false '-Dtest=!CustomRenderingTest' -Dsurefire.failIfNoSpecifiedTests=false`: 1347 unit tests (0 failures, 2 skipped), 27 integration tests (0 failures), build success.
- `cargo test`: 240 passed. `embed.sh --check`: the committed wasm is the one the sources build (794709 bytes). `npx prettier --check "src/**/*.java"`: clean. `node --test "src/test/javascript/**/*.test.js"`: 2498 tests, 2498 passed (2479 before the run + 19 new).
- **The new tests fail where they should.** `ARCHICODE_EDITOR_HTML=<page of archicode-0.18.0> node --test save-keeps-the-brackets.test.js`: 14 of the 19 fail (add / remove / reorder an item, a map, an empty result, a list that does not fit, a comment inside, nested brackets, an item of a list of maps, padding and quoting, anchors beside a plain collection, CRLF/BOM, twins, `.archicode.yaml`, and the edit of every collection in brackets of the shipped files). The ones that pass on it are the ones that pin what must not change: empties filled stay a block, the mark characters, the randomized round trip, and the byte identity with the page of the tag (trivial there); the page-of-the-tag test is skipped under the variable. The existing tests that pinned the block fail on the old rule and were updated (list above).
- **Byte identity (T1).** For every YAML file the repository ships under `src/doc/examples` and `src/test/resources` that the editor reads (more than 100 files, more than 20 with brackets): `patchYamlText` with no edit, with a new key at the root of `content`, and with a renamed `name` writes the same bytes with this page and with the page of `git show archicode-0.18.0:...standalone.html` (`save-keeps-the-brackets.test.js`, skipped with a stated reason when the tag is absent). No Java was changed, so `views generate`, `stories generate`, `query graph` and `diff` were not run with both jars: the command line does not write manifests and no `src/main` Java file is in the diff (`git status`).
- **Round trips.** A randomized test (500 files of every mix of block and flow shapes, comments, quotes, words, an edit at a random place): every result reads back as the edit, saving the result again changes nothing, no mark character is left; a second test edits each collection (up to 60 per file) of every shipped file that holds brackets (more than 200 edits, more than 20 keep brackets): each reads back, no mark is left.
- Not verified: a real browser (the page runs in the Node harness); the Native job (no Java or resource config changed); the `.archicode.yaml` of the author's own workspaces (not read by the wave).

## What changed

- `src/main/resources/editor-webapp/standalone.html`: `patchYamlTextAt`, `openFlowListsRead` (extra fields), `markOpenedFlows`, `bracketChangedFlows`, `bracketedLine`, `bracketWidth`, `yamlBlockLinesToFlow` (new); doc comments of `patchYamlText`, `closeDecoratedFlows`.
- Tests: `save-keeps-the-brackets.test.js` (new), the updated files above.
- `CLAUDE.md`: the sentence on the save in the paragraph on the editor.

## For the manual (W-6)

- `src/doc/README.adoc` line 1621, in the paragraph that starts "Changes stay in memory": replace "A list or a map written in square or curly brackets (...) stays as written when the change does not reach it; a change to it writes it as a block, in which the comments that were inside its brackets stay as lines of the block (a comment above a value above it, a comment after a value at the end of its line), and the quotes of its values and of its keys and the words of its booleans (`on`, `yes`) are the ones you wrote, except for a value the change sets." by: such a list or map stays as written when the change does not reach it; when a change reaches it, it is written in brackets again, on the line where it starts (the comment after the closing bracket, the quotes and words of its values and the spacing inside the brackets stay), when the line is no wider than the widest line of the file (100 to 120 columns); a list that no longer fits, one with a comment inside its brackets (the comments stay as lines of a block), an empty `[]` or `{}` that a change fills, and one with an anchor, an alias or a tag in it are written as a block.
- "the comment after `[]`, `{}` or a key with no value stays on the line when a change fills the collection" in the same paragraph is still true.
- Release notes block ("what changes for a reader who knows 0.18.0"): the editor keeps the brackets of a collection it changes; nothing is lost either way.

## Findings for the wave

- The first version bracketed `[]` that a change fills; it changed `add-to-story-plateaus.test.js` (`steps: [{view: ..}]` for a new story). Decision 6 reverses it: `[]` is the emitter's own spelling.
- The unstyled retry of `patchYamlTextAt` loses quotes when the aligner copies a wrong indentation (limits above): pre-existing, small, not on the wave's list.
- Commit subject proposed: `fix: the editor's save writes a collection it changed back in brackets, on its line, when it fits`.
