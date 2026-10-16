---
type: run
run: 0052
status: completed
wave: 010
---

# Run 0052: Editor keeps quotes

Wave 010 (`clean-failures-and-faithful-saves`), item W-4 (phase P2). Focus: move or rename in the editor and see only the value change in the pull request.
Document profile: `single-document` (the scope arrives settled by the wave plan and by issue tmorin/archicode#45); this file carries scope, decisions,
canonical impact, review passes, tasks, verification and findings. Seen in wave 009 (run 0047 noted it, run 0048 reproduced it in the real page).

## Scope

1. A value that a save writes anew is written in the quoting the file uses: the `parent` of a move, the `id` of a rename, a reference that follows
   (`destination`, `uses`, `applications`, a view's `element`), the items of a `replaces` that a move or *Write replaces* adds. Before, each came out in the
   emitter's style (plain), so a diff showed lines that changed in two ways (value and quoting) and a consistently quoted file stopped being one.
2. The rule lives in `patchYamlLines` of `standalone.html` (the line-preserving save, the only path every edit goes through), with `patchYamlText` as the
   acceptance gate. Nothing in the kernel, the Java or the manifest format changes.
3. A workspace edited without any rewritten or added scalar (a no-op save, an edit of a non-scalar, a file with no quotes) saves exactly as before.

Not in scope, not done: other flow-collection shapes (#41, run W-5, which changes the same functions after this one), the state hints (W-6), the trailing
comment of a rewritten line and the move of a block in a file with a one-line list (found here, filed as #50 and #51).

## Reproduction (before the change)

Invented copy of `src/doc/examples/domain_plateaus` in the scratchpad, with the to-be plateau's `inventory.yaml` and `warehouse.yaml` put back to the as-is
text (the example as committed already says the move). Editor served by `archicode editor serve`, *Compare to* As is, `inventory` selected, *Move*,
*Warehouse*, *Move and write replaces*, *Save all changes*. With the jar built from the working tree the saved files differ from the originals by (see
Verification): `parent: "shop"` -> `parent: "warehouse"`; the two added lists with quoted items; `destination: "shop.inventory"` ->
`destination: "warehouse.inventory"`. Before the change (the unit tests below, which fail on `HEAD`'s `standalone.html`, 8 of 11): the same lines without
quotes, as filed in #45.

## Decisions

- **D1. Where the style comes from, in order.** For a scalar line the edit writes anew (a `drop` and an `add` of the aligner), the first of:
  1. *the line it replaces*: a dropped line of the same hunk with the same indentation, dashes and key gives its quote (`"`, `'` or none) when that quote is a
     choice of the author (the emitter would have written the string plain); so a plain `- destination: shop.till.screen` stays plain in a file that quotes the
     other reference. A quote the text needs (`"1"`, `"a: b"`) is not a choice and says nothing.
  2. *a sibling*: the line that stays just before or just after the hunk, with the same prefix and key, for a new item of a list that is being added to;
     not used when the hunk starts a list of its own (a new `replaces:` has no sibling in the list above it).
  3. *the lines with the same key* in the file (`id`, `parent`, `destination`, and for a list item the other items), majority wins.
  4. *every scalar line of the file whose quoting is a choice*, majority wins.
  5. plain (a file with no quote of its own, a tie).
  Alternative rejected: a single file-wide majority, because the files mix styles on purpose (a plain `kind` beside quoted ids is common) and the line being
  rewritten is the best evidence of what its author wants.
- **D2. What is touched.** Only a string that the emitter writes plain. A number, a boolean, a null, an empty `[]`/`{}`, a text the emitter had to quote
  (a colon, a leading indicator, a number-like string, a newline) keep the emitter's token. Double quotes use the emitter's own escaping
  (`escapeYamlDoubleQuoted`), single quotes double the `'`. A block scalar's text is not read as a vote.
- **D3. Acceptance.** The rule kept from earlier runs: a result is accepted only if re-reading it gives the emitter's own text of the new value. The strict
  path used to return without that check; it now does it only when a line was actually styled (`styled.lines > 0`), and if the check fails the same patch is
  made again without styling, i.e. the previous behaviour. A save that styles nothing is therefore byte-identical to before by construction, with no
  extra cost.
- **D4. The lists opened for a one-line list** (`openFlowLists`): the votes are read in the text as the author wrote it, not in the expanded lists the
  emitter wrote (those would vote "plain" for a file that quotes everything else); the sibling and twin rules still read the expanded lines, so a list the
  edit changes stays consistent. A flow list of quoted items becomes a block of plain items, as before; W-5's business.
- **D5. No change to the manifest format, the kernel or the Java.** `embed.sh --check` passes; `standalone.html`'s embedded wasm is untouched.
- **D6. The manual** (`src/doc/README.adoc`, editor section) already said "a file that is saved keeps ... the quotes of the values"; one clause says what a
  value written anew does. `CLAUDE.md` stays true ("Every edit goes through the line-preserving save") and is not changed.

## Canonical impact

None to the architecture model (no `CI-arc` or `CI-dom` packet: this run has no TDD). One sentence of the manual's editor section (D6).

## Review passes

- **KDMLLC (inline).** K: one reader of a scalar line (`readYamlScalarLine`), one chooser (`quoteYamlAddedLine`), one vote collector, applied to the `add`
  steps of the existing aligner; no option, no new input. D: the move, the rename and *Write replaces* share the path, no second copy of the rule; the votes
  reuse `stripYamlComment`, `scanYamlKey`, `yamlStringNeedsQuoting`, `escapeYamlDoubleQuoted`. M: double, single, plain, mixed, a text that needs quotes, a
  number, a boolean, a block scalar, a quote inside a value, a no-op, a deletion, a flow-list file, and the refused-result fallback each have a test. L: no
  comment carry-over (#50), no new move layouts (#51, #43, #44). U: the rule is stated at the top of `quoteYamlAddedLine` and in the manual. C: below.
- **C scan.** The wave plan says "a quote-preserving emitter for the value of a changed or added scalar line in `patchYamlLines`/`patchYamlText`": done there.
  Nine existing assertions encoded the quote loss as expected output (`move-editor`, `replaces-editor`, `yaml-preserve`, `library-view-edit`): they now say
  the file's quoting; each is the behaviour #45 reports as a defect, none was about something else. The gate P2's first criterion ("a move, a rename and *Write
  replaces* on a file with double quotes") is met, and the single-quote and plain cases are added. The issue says "files that mix styles (keep the style of
  the line being rewritten ...)": D1.1. The issue's instruction "write with double quotes when the neighbouring lines use them" is D1.3-4.

## Tasks

- [x] T1. Reproduce #45 in a test (a file in each style; move with replaces, rename, *Write replaces*) and see it fail on `HEAD`.
- [x] T2. `readYamlScalarLine`, `yamlQuotingVotes`, `dominantYamlQuote`, `quoteYamlAddedLine`; `patchYamlLines` styles the `add` steps per hunk when asked
  (`styled`), `patchYamlText` accepts a styled result only if it reads back as the emitter's text.
- [x] T3. Update the nine assertions that expected the quote loss; add `quotes-editor.test.js` (11 tests).
- [x] T4. Before/after comparison of the saved text with the editor of `HEAD` on every YAML file of the repository.
- [x] T5. The real page, light and dark, on an invented copy: *Move and write replaces* on `inventory`, diff of the files saved.
- [x] T6. The manual's one clause; file the two findings (#50, #51); full verification.

## Verification

Run from `/home/tibo/git-perso/archicode`, JDK 25 (`JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem`), offline.

- `./mvnw -o -q verify`: exit 0, run twice (before and after the manual's clause); 319 Java tests, 0 failures, 0 errors, 1 skipped (the PlantUML-jar test
  without `PLANTUML_JAR`, as in run 0051).
- `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`: 168 passed. `src/main/rust/viewpoint-kernel/embed.sh --check`: "the committed
  WebAssembly is the one the sources build", exit 0.
- `node --test "src/test/javascript/**/*.test.js"`: 861 passed, 0 failed (850 before; `quotes-editor.test.js` adds 11). One run of the suite, made while
  `./mvnw verify` was using every core, reported 1 failure that I did not capture; the suite was then run four more times (the last on the final tree), 861 of 861 each
  time. Not identified (a timer-based test under load is the likely cause; unconfirmed).
- `npx prettier --check "src/**/*.java"`: clean (no Java file changed).
- The new tests fail on `HEAD`'s `standalone.html` (8 of 11 fail; the 3 that pass are the plain file, the byte-for-byte test and the refused-result test,
  which assert behaviour that must not change).
- **No-change proof (scratchpad `cmp/compare.js`).** The editor of `HEAD` (`git show HEAD:...standalone.html` in the harness) against the working tree,
  `patchYamlText` on the 80 YAML files of the repository (`src/doc/examples`, `src/test/workspaces`, `src/test/resources`), six edits each. Edits that write
  no string: no-op, set a number and a boolean, drop the last key, drop the first item of every list: **80 of 80 byte-identical** for each of the four.
  Edits that write a string (set a string and add a key; append `-x` to the first string): 77 and 76 files differ, **every difference only in quote
  characters** (the texts are equal once quotes are removed), the 3 and 4 other files are identical (nothing quoted to keep). All 480 results re-read as the
  edit. This is the run-0048-style before/after comparison; the existing `yaml-preserve.test.js` (every YAML file of the repository, unchanged is identical,
  an edit reads back; 200 random edits read back) also passes.
- **The real page** (`archicode editor serve`, jar of the working tree, built-in browser, light and dark, invented copy in the scratchpad): *Compare to* As
  is, `inventory` -> *Move* -> *Warehouse* -> *Move and write replaces* -> *Save all changes*: "Saved.", 2 files written, comparison shows "2 moved". The
  Move dialog and the tree look as before in both schemes (this change has no visual part). `diff -ru` of the copy against its original:

  ```
  plateaus/20_to-be/inventory.yaml
  -  parent: "shop"
  +  parent: "warehouse"
  +      replaces:
  +        - "shop.inventory.levels"
  +  replaces:
  +    - "shop.inventory"
  plateaus/20_to-be/warehouse.yaml
  -        - destination: "shop.inventory"
  +        - destination: "warehouse.inventory"
  ```

  Only the value changes on each rewritten line, the added lines carry the file's quotes, no other line of either file differs, no other file is written.
- **Refused move changes nothing**: unchanged (`move-editor.test.js`, 33 tests, still green; no code of the validation changed).

## Not verified

- Nothing was run on a real workspace; every file is invented or one of the repository's examples and fixtures.
- The quoting in the three paths was shown in the page for one case (*Move and write replaces*, double quotes). Rename, *Write replaces* and the single-quote
  and plain files are proven by the harness (the real kernel and the page's own functions, no DOM), not in the browser.
- Other browsers than the built-in one, and Windows line breaks with a styled line (the aligner keeps the file's `eol`; no test writes a styled line into
  a CRLF file).
- The cost of reading the file's quoting for a very large manifest: the votes are read at most once per save and only when a scalar line is added, never
  measured on a file larger than the fixtures.
- The unidentified single failure of the node suite under load (see Verification).

## Follow-ups

- #50: a line rewritten by a save loses its end-of-line comment (pre-existing; visible in the example's `replaces` lines).
- #51: moving a nested element in a file that holds a one-line list falls back to the ordinary patch and displaces comments (pre-existing, same root as #41).
- #45 is fixed by this run; closing it belongs to the wave's pull request.
