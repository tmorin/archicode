---
type: run
run: 0154
status: completed
profile: single-document
wave: 021
---

# Run 0154: save-keeps-quotes-and-comments

Wave 021, W-3 (decision T7; GitHub issues tmorin/archicode#150 and #151). The editor's line-preserving save keeps the quotes and the comments of what an edit does not touch, and a generated test guards it. The command line never writes manifests: no Java change.

## What was measured first (page of `archicode-0.18.0` and the page before the run)

Both issues reproduced, and #150 is not what its title says.

- **#150** is not the unstyled retry nor the aligner copying a wrong indentation. The quotes are lost when a collection **changes shape**: `value: {destination: "c", label: "l"}` that becomes a list of two maps was written `[{destination: c, label: l}, ...]`. The aligner sees every line of the old value go (it is re-indented, or has a dash now) and every line of the new one come, and the quote of a new line came from the line that stood in its place (same prefix and key) or from votes, never from the same text. The same loss hit the quotes of a **key**, the quotes of items a **reorder** moved, and `k: "v"` becoming `k:` with `- v` (and back).
- **#151**: removing the first of two items whose lines read the same (`- [a, b]  # row a`, `- [c, d]  # row c`, opened as `-`, `- a`, `- b`, `-`, `- c`, `- d`) left `- [c, d]  # row a`: the common start of the two texts takes the first `-`, so it is the second item's lines that go, and the comment of the first stays on the second (a comment on the wrong item, worse than lost). Removing `- [a, b]` above `# about c` rewrote the next item as a bare `-` and a nested block. The same ambiguity hits an item **added** in front of the one that keeps the comment, and a list of maps whose first lines read the same (`kind: container`, which is in `save-keeps-anchors-in-brackets.test.js`).
- **The generator found more**, and these were not in either issue (listed in the section "Found by the generator"): the comment of a key line (`k: v  # c`, `k: {..}  # c`) is lost when the line becomes `k:` (or the other way); the comment of an item changes owner when the lists around it are re-indented; and a comment left above a line that goes can land right under a block scalar (`key: |`), where the reader takes it for the text of the scalar, `says` fails and **the whole file falls back to the emitter's text** (the comments and layout of every line of the file lost).

## Decisions

| # | decision | verdict |
|---|---|---|
| 1 | the generated test (T7) | `save-generator.js` (a helper, not a test) and `save-keeps-quotes-and-comments.test.js`. A seeded generator (mulberry32; `SEED = 154`, `CASES = 2000`, about 5 seconds, the same files on every machine: a test pins the first numbers and a file) writes a small tree of nodes in every layout the save claims to follow, with a unique word, key and comment per node: plain, double- and single-quoted values and keys; block scalars (`key: \|`); block and bracketed maps and lists; lists of maps (the first key on the dash line); lists of lists; lists at the column of their key; comments above (one or two lines), after (one to three blanks) and blank lines. Then one random edit (set a value, add or remove an item, add or remove a key, wrap a node in a list, unwrap a list, replace a collection by a scalar, reorder) described as plain data (`chooseEdit`, `applyEdit`), so that a failing case can be **reduced** (`reduce`: items, keys, comments, quotes, blank lines and block scalars taken out while the same problem remains) and the test prints the smallest file |
| 2 | the properties | (1) **model**: the file reads back as the edit and as the emitter writes it, key order included; (2) **quote**: a scalar or a key the edit did not change and that is still in the value, wherever it went, has its quotes; (3) **comment**: the comment after a line is on the line of its own key or item, and nowhere when it is gone (and not twice); the comment above a line is directly above the line of its own key or item; (4) **line**: a line whose key or item is still there and whose scalar, bracketed collection or header the edit did not change is in the result byte for byte (indentation and a leading dash aside); (5) **idempotent**: saving the result again changes nothing. Reorder is checked for model, quote and idempotence only (its comments are not claimed). What a node's line is, and which comment is its own, is the generator's own bookkeeping (slots), not the page's |
| 3 | quotes follow the scalar text (#150) | `movedYamlQuote`: for every line that comes, before any other rule, a line that goes anywhere in the edit with the same key (or one of them with none: `k: v` becomes `k:` and `- v`) and the same text gives its quote; the line is used up. Asked of every line of the edit before the style of the line that stood in its place (`quoteYamlAddedLine`), so that a line which only sits where another stood does not take its quotes. Quote `''` (plain) is a quote too. A key that comes back on a line that is new is written as it was (`writtenKeys`: one form among the lines that go for that key, else nothing is guessed) |
| 4 | comments follow their line (#151) | (a) a line that comes back with the same key and text, or the same key for a collection (`identityOf`), within three kept lines of the one that goes and the only one of its kind there, takes its comment (re-indented, a dash given or taken, a collection wrapped or unwrapped); the first line of an item in brackets (marked by `markOpenedFlows`) goes to the first line of an item only. (b) the line of a key that becomes a collection takes the comment and the way the key is written, and a scalar that replaces a collection key does too (`k: {..}  # c` becomes `k: none  # c`). (c) a scalar that is found elsewhere is not the replacement of the one that stood in its place: that line is not a twin. (d) the item of a list in brackets (marked) or a bare dash (`-  # why`) whose first line is another one after the edit (first key removed, `- {}`, `- []`) keeps its comment, when one item goes and one comes in that column |
| 5 | the run slides (#151) | `slideAmbiguousRuns`, before the lines that are replaced are paired: a run of lines that only goes, or only comes, slides over the lines that read the same (the text written is the same wherever it is) to the position, the nearest to the diff's own, where it starts at its shallowest line and the line after it is not deeper: whole items. A run that already is, or that has none, stays. The pairing that follows puts a line that comes back as it was (same identity) right after the line that goes, in the order of both, so that the comments between the lines that go stay above their own line; lines that come before it with none left that goes are written after it |
| 6 | a comment left under a block scalar | `keepStrayCommentsOutOfBlockScalars`: a comment that a line which goes left behind and that now follows the text of a `key: \|` at the indentation of that text is moved to the column of the key (the column that ends the scalar). Without it the result does not say the edit, and the whole file is the emitter's text |
| 7 | the reorder limit | **lifted for the quotes, for free**: decision 3 carries the quotes by text, so `[Sack, "Cart", 'Belt']` reversed is `['Belt', "Cart", Sack]` (it was `[Belt, Cart, Sack]`; `save-keeps-the-brackets.test.js` pinned the loss and is updated). The comments of a reordered line are not claimed (a comment travels with its scalar when the text is the same, which is the usual case, but the generator does not check it) |
| 8 | the block fallback | kept wherever the fix is not safe: a collection in brackets that the bracketed attempt cannot place, a result that does not read as the edit (`says`), a mark that lands on the wrong line is not detected (a limit below). No new fallback was needed |
| 9 | what does not change | for the 399 YAML files the repository ships that the editor reads and that have no collection in brackets (those with brackets are wave 020's business) a save with a set value, an added item, a first and a last item removed, an added key, a first and a last key removed (4 890 edits) writes the same bytes as the page of `archicode-0.18.0` (a test, skipped with a stated reason when the tag is absent); against the page before the run, **every** shipped file with those edits (8 280 edits) differs in 3 edits only, all of them the cases the run fixes (the first of several `REMOVE` patches that read the same, the flow map `{destination, label}` whose first key goes) |

## Found by the generator beyond the two issues

Fixed (they share the cause: a line written again does not take what its text and its place had):

1. the comment of `k: {..}  # c` / `k: [..]  # c` / `k: v  # c` is lost when the line becomes `k:` plus a block, or the block becomes a scalar (decision 4b);
2. the quotes of a **key** are lost when its line is written again (`{"zone": north}` that becomes a list of maps);
3. a comment follows the wrong item when an item is added in front (the same ambiguity as #151, for adds) and when lists are re-indented around a scalar (decision 4a, 4c);
4. **a comment left above a line that goes lands under a block scalar and the whole file falls back to the emitter's text**: minimal repro, with the page of the tag too: `k7: |` / `  w6 one` / `  w6 two` / `k44:` / `  k37:` / `    - {k34: w33}` / `  # a42.` / `  k40: w39 one`, with `k44` deleted (decision 6).

**Not fixed, left out of the generator, pinned by a test each (`save-keeps-quotes-and-comments.test.js`, "known limit"), to be filed as issues by the orchestrator:**

- **L1.** A block scalar that is an item of a list (`- \|`, then its text) is a layout the save does not follow: **any** save of the file, even with no edit to that list, writes the emitter's text (every comment and the layout of the whole file lost). Repro: `content:  # top` / `  id: a` / `  notes:` / `    - \|` / `      one` / `      two` / `  name: N # why`, then set `name`. Present on the tag and before the run. The cause is the block-scalar test of `locateEmittedLines` and the `header` regex, which want a key before `: \|`.
- **L2.** When the first key of a map that is an item of a list changes (a key is added in front, or the first one is removed), the key that comes second takes the dash line, and a **block scalar** on it (`note: \|`) is written again as a quoted text (`"one\ntwo\n"`). Repro: `- drop: y` / `  note: \|` / `    one` / `    two`, with `drop` removed.
- **L3.** A comment on an **item that is a list** (`-  # first row` then its items, or `- [c, d]  # second row`) is lost, or taken by the new item above, when the lists around it are nested again (a list wrapped in a list, or unwrapped). It was already so before the run; the rule "within three kept lines, the only one of its kind" refuses to guess among several dashes.
- **L4.** A list that holds a list in brackets as an item, wrapped in another list, is written in brackets **as a whole** (`- ["w9", [w23]]`): the mark of the collection lands on a dash line that stayed (the aligner keeps the first of two lines that read `-`). The model is right; the layout is not the block's, and a quote of the plain item changes. Before the run it was `[w9, ["w23"]]` (the quote of the nested item changed instead).

Not a defect but left as it is: the comments **between the lines of an item that is removed** stay where they are (by design: "a comment above a dropped line is not its own"); the generator does not check them for removed nodes.

## Review passes (the trio's, answered here)

- **KDMLLC.** KISS: three small mechanisms on the existing aligner (the quote carried by text, the comment carried by identity, the run slid), no change to `closeFlowLists`, `bracketChangedFlows`, `openFlowLists` and the layers above them. DRY: the identity of a line is one function (`identityOf`), used by the pairing and by the comment pass; the quote carry reads `readYamlScalarLine`, which gained `text`. MECE: each added line is exactly one of: kept, twin of a line that goes (same prefix and key), moved (same key and text), the line of a collection that comes back (same key), or new; a gone line is used once. LEAN: no option; one fixed distance (three kept lines). LUCID: the doc comments of `patchYamlText`, `movedYamlQuote`, `slideAmbiguousRuns` and `keepStrayCommentsOutOfBlockScalars` say the rules; `CLAUDE.md` says them in two sentences. CONSISTENT: the marks and the bracketed attempt are the ones of wave 020; the block fallback is unchanged.
- **Open questions.** Should a comment of a removed item follow the next item? No: it is on a line that goes. Should a comment above a removed line move with it? No (existing rule, pinned). Should reorder keep comments? Not claimed. Should the generator cover `- \|` and the dash-line cases? No: they are listed limits with a test each; the generator says "nothing else".
- **C scan against the repository.** The callers of `patchYamlLines`: `patchYamlTextAt` (twice, with and without `styled`) only; `quoteYamlAddedLine`: one caller; `readYamlScalarLine`: its new `text` field is read by the new code only. `moveBlockInText`, `cutBlockFromText` and `pasteBlockInText` do not call the changed functions.
- **Canonical impact.** `CLAUDE.md` (two sentences of the paragraph on the save, one of them replaced because it described the old ambiguity as the aligner's rule); the manual in W-6 (below). No `dom` packet, no `arc` item.

## Tasks

| id | task | status | verification |
|---|---|---|---|
| T-1 | the generator and its properties (`save-generator.js`) | done | `save-keeps-quotes-and-comments.test.js` |
| T-2 | quotes carried by text (`movedYamlQuote`, key forms) | done | same |
| T-3 | comments carried by identity; the line of a collection key; the item that is emptied | done | same |
| T-4 | `slideAmbiguousRuns` and the pairing of lines that come back | done | same |
| T-5 | comments out of block scalars | done | same |
| T-6 | the existing tests that pinned a loss are updated and listed | done | `node --test` (below) |
| T-7 | `CLAUDE.md` | done | two sentences |

## Tests updated (they pinned a loss or the old ambiguity; that is the intended change)

- `editor-writes-layers.test.js`, *a list the plateau sets whole stays a SET ...*: the `value: {destination: "commerce-saas", ... "HTTPS"}` that becomes a list of two maps keeps `"commerce-saas"`, `"maintains products in"` and `"HTTPS"` (it was written plain; this is the case #150 names).
- `save-keeps-the-brackets.test.js`, *an item removed, and items reordered, in a list in brackets*: the reverse of `[Sack, "Cart", 'Belt']` is `['Belt', "Cart", Sack]` (it pinned `[Belt, Cart, Sack]`: the reorder limit, lifted).
- `save-keeps-anchors-in-brackets.test.js`, *an item whose map starts below its dash: a key added, an item added, an item removed*: removing the second of three items whose first line reads the same removes the lines of the second (its dash line, the comment between its dash and its first key, its keys); the third keeps its own dash line `-   # deeper` and its columns (it pinned that the next item takes the dash line, the comment and the columns of the removed one).
- `faithful-saves.test.js`, *#57: when the aligner keeps the line of a key for another value ...*: `# c3` stays on the `- note:` of the second item (it pinned that it went with the first); `# c2`, which the first item left in the middle of its lines, stays on a line of its own.
- No existing test was weakened: each of the four still checks that the file reads back as the edit and that every other line is as it was.

## Verification (final tree)

- `./mvnw -o verify -DskipITs=false '-Dtest=!CustomRenderingTest' -Dsurefire.failIfNoSpecifiedTests=false` (JDK 25): 1348 unit tests (0 failures, 2 skipped), 27 integration tests (0 failures), build success.
- `cargo test` (viewpoint kernel): 240 passed. `embed.sh --check`: the committed wasm is the one the sources build (794709 bytes). `npx prettier --check "src/**/*.java"`: clean.
- `node --test "src/test/javascript/**/*.test.js"`: 2562 tests, 2562 passed (2547 before the run + 15 new).
- **The generated test fails where it should.** With the page of `archicode-0.18.0` (`ARCHICODE_EDITOR_HTML=<that page>`): 9 of the 15 tests of the new file fail (the three tests of #150, the two of #151, the lines that come back, the comment under a block scalar, the generated test and the wrapped list of lists, whose output differs) and 4 pass (the determinism of the generator and the three limits that the tag shares); the two tests that compare with the tag are skipped under the variable. The generated test finds 465 failing cases of 1981 on the page of the tag: 295 values lost their quotes when a collection became a list (#150), 97 when a list gave its item back, 99 over a reorder, about 200 comments were lost when the lines of an item are written again, and 2 comments went to the wrong item or were lost when an item of a list was removed (#151; the explicit examples of #151 are in the tests). The new file also runs the generator against the page of the tag by itself and asserts the failures by kind (skipped with a stated reason when the tag is absent or another page is run).
- **Seeds.** The generator was run with 8 other seeds of 4 000 cases each (32 000 cases) on the final page: no failure (20260 and 1 to 7). The shipped test uses one seed, 2000 cases.
- **Byte identity.** See decision 9. The shipped-file comparison with the tag is a test (`save-keeps-quotes-and-comments.test.js`); the comparison with the page before the run (8 280 edits on 444 files) was made by hand: 3 edits differ, all of them fixed cases.
- Not verified: a real browser (the page runs in the Node harness); the Native job (no Java or resource configuration changed); the `.archicode.yaml` and manifests of the author's own workspaces.

## What changed

- `src/main/resources/editor-webapp/standalone.html`: `patchYamlLines` (new parameter `itemMarks`; the pairing of lines that come back; the identity and the comment passes; the key forms; the stray comments), `slideAmbiguousRuns`, `movedYamlQuote` (new), `quoteYamlAddedLine` (takes the moved quote), `readYamlScalarLine` (the `text` of the scalar), `keepStrayCommentsOutOfBlockScalars` (new), `patchYamlTextAt` (hands `itemMarks`); the doc comment of `patchYamlText`.
- Tests: `save-keeps-quotes-and-comments.test.js` and `save-generator.js` (new), the four updated files above.
- `CLAUDE.md`: the sentences on the save.

## For the manual (W-6)

- `src/doc/README.adoc` line 1639, in the paragraph that starts "Changes stay in memory": after "a line that is added is written like the lines around it (double quotes, single quotes or none, as the file does), and plain when the file quotes nothing." add: "A value that comes back on a line that is new (a map in brackets that becomes a list of maps, an item that moves, a list that gives back its item) keeps the quotes it had, and so does a key; a comment stays on the line of its own key or item when the line is written again, and removing the first of two items that read the same removes the first, with its comment."
- The same paragraph, "a comment or a blank line above a line that is rewritten stays above it": still true. Add after it: "A comment on a line of its own between two lines of an item that is removed stays where it was."
- `[[plateau-limits]]`, the bullet "*The save of the editor writes a file again in its own layout* in a few cases" (line 1556): add the case "a block scalar that is an item of a list (`- |`)" to the list of layouts written again entirely (comments of the whole file lost); add a bullet "*A few comments and block scalars are lost or move when the lists around them are nested again.*": a comment on an item that is itself a list is lost or taken by the item above when the list around it is wrapped or unwrapped; a block scalar written after the first key of a map that is an item of a list is written as a quoted text when that key goes or another comes before it; a list that holds a list in brackets, wrapped in another list, is written in brackets as a whole. The file reads the same either way.
- `src/doc/README.adoc` line 1840 ("a flow list or map that an edit changes becomes a block") is already stale since wave 020: reword to "a list or map in brackets that an edit changes stays in brackets on its line when it fits".
- Release notes block ("what changes for a reader who knows 0.18.0"): the editor keeps the quotes and the comments of a line it writes again; removing the first of two alike items removes the right one; nothing is lost either way.

## Findings for the wave

- #150's title is wrong (the cause is the shape change, not the retry); #151 is the diff's tie, not the aligner's copy. Both are closed by this run; the PR closes them.
- The generator's cost was in the checker, not the generator: a property that is stated per node and not per line (a comment is the node's, not the line's) needed a bookkeeping of slots that survive an edit. Worth reusing for any further change of the save.
- The four limits L1 to L4 are to be filed (the first is the only one with a whole-file effect and is cheap: the block-scalar test of `locateEmittedLines` and the `header` regex that three functions share want a key before `: |`).
- Commit subject proposed: `fix: the editor's save keeps the quotes of a value that moves and the comment of its own item, with a generated test of the save`.
