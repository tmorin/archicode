---
type: run
run: 0055
status: completed
wave: 011
---

# Run 0055: Editor faithful saves

Wave 011 (`faithful-saves-and-stable-output`), item W-1 (phase P1). Focus: save a manifest from the editor and see only the lines I changed differ, comments included.
Document profile: `single-document` (the scope arrives settled by the wave plan and by issues tmorin/archicode#50, #52, #53 and #54, ruled "together, in one run"; runs 0052 and
0053 of wave 010 changed the same functions the same way); this file carries scope, decisions, canonical impact, review passes, tasks, verification and findings.

## Scope

All in `patchYamlLines` / `patchYamlText` and the flow-collection reader of `standalone.html`, the line-preserving save every edit goes through.

1. **#50.** A line that the edit rewrites keeps its end-of-line comment and the spaces before it. The case of one rewritten scalar was already carried by `d2849d2` (the commit
   before the wave; the issue was still open); what stayed lost was a run of rewritten items of a list that have no key (`- "a"  # one`, `- "b" # two` both renamed): the
   rule paired an item only when exactly one went and one came.
2. **#52.** A comment or a blank line above a line that is rewritten stays above the line that replaces it.
3. **#53.** A boolean written `yes`, `no`, `on`, `off` (any case the reader accepts) is found by the aligner for the `true` / `false` the emitter writes, so the save is not
   abandoned for the emitter's text of the whole file; the author's word stays on every line the edit does not set, and `true` / `false` is written only for a value the edit sets.
4. **#54.** A flow collection that an edit changes keeps, as the lines of the block it becomes: the comments inside its brackets, the quotes of its keys and the original word of a
   boolean the edit did not set.
5. The rule of wave 010 stays: a result is accepted only if re-reading it gives the emitter's text of the new value (`patchYamlText`'s `says`, and the check at opening of each collection).

Added with #53, same mechanism, same reason (the file is otherwise rewritten whole and loses its comments): the null words (`~`, `Null`) and a key with no value and nothing
below it (`description:`) are found for the `null` the emitter writes. See D3.

Not in scope, not done: a list written at the column of its key (still the emitter's text; filed as #57), a comment inside an empty collection that an edit then fills.

## Decisions

- **D1. Order of a replaced pair (#52).** After the steps of a hunk are known, the lines that go and the lines that come are interleaved (the first that goes, the first that
  comes, the second that goes, ...). A `drop` copies the comments and blank lines above it before it goes, so the line that replaces it is written below them. Alternative
  rejected: breaking the ties of the longest-common-subsequence table the other way (`>` for `>=`): it orders a whole hunk the same way for every line, so two adjacent rewritten
  lines with a comment between them would put the comment above both. Only the order inside a hunk of lines that go and lines that come changes; a hunk with only adds or only drops, and
  every `keep`, are as before.
- **D2. Items without a key (#50).** The comment of a rewritten item is carried to the item that replaces it when as many items go as come at that indentation (the first to the
  first); with one and one this is the old rule. A different number (a list that is replaced by a longer or a shorter one) is not told apart and nothing is guessed.
- **D3. Words (#53).** `yamlEmittedWordsOf` gives the words of an original line as the emitter would write them: a plain scalar that `resolveYamlPlain` reads as a boolean or
  a null is `true`, `false` or `null`; a key line with nothing after it and nothing deeper below it is `key: null`. `locateEmittedLines` accepts a line whose words or whose emitter's
  words are the emitter's line. A quoted word is a text and is never normalised. The kept lines are the author's, so the words stay without anything else to do; a line the edit
  sets is dropped and added, and the #50 rule gives the added line the comment of the dropped one.
- **D4. Inside a flow collection (#54).** The reader (`parseYamlFlowNode`, `skipYamlFlowSpace`) notes, when the cursor asks, the values (`quote`, plain `word`, where they end),
  the keys as written when quoted, and the comments (`text`, the spaces before it, how many values came before, the value it trails). `emitFlowBlock` applies them to the emitter's
  lines only where the lines match one to one what was read (the same guard as the quotes of run 0053): a quote where the emitter wrote the text plain, a word where it wrote
  `true`, `false` or `null` for the same value, a key quote where it wrote the key plain, a trailing comment at the end of the line of its value, a comment on a line of its own
  above the lines that lead to the value it comes before (below the last line when it came before the closing bracket). The comment of the opening line (`tags: [  # c`) is a line of its own above the first value; the comment after the closing bracket is
  still the comment of the key's line. The aligner is untouched by this; `closeFlowLists` restores the original text when the block is found whole, which now includes the comment lines.
  A key written plain that the emitter quotes (`on:`) is the emitter's, as before.
- **D5. No change to the manifest format, the kernel or the Java.** `embed.sh --check` passes.
- **D6. The manual** says, in the editor section, what the save keeps now; it said the comments inside a changed collection were lost. `CLAUDE.md` stays true as written.

## Canonical impact

None to the architecture model (no `CI-arc` or `CI-dom` packet: this run has no TDD). One sentence of the manual's editor section (D6).

## Review passes

- **KDMLLC (inline).** K: one new helper (`yamlEmittedWordsOf`), one reorder loop, the flow reader notes more and `emitFlowBlock` applies it; the aligner, the quote chooser, the
  opener and the closer are unchanged. D: the comment carry-over of #50 is reused for the line that sets a boolean (#53) and for the item of a changed collection (#54); the
  emitter-words rule is one function used by the save and the move. M: each issue has a test that compares the saved text with the original, each shape of #54 has one (list, map,
  flow map as an item, nested list, key quotes, booleans, comment before the closing bracket, comment on the opening line). L: no option; nothing for the comment of an empty
  collection that is filled; no re-quoting of a plain key. U: the rules are in the comments of `emitFlowBlock`, `yamlEmittedWordsOf`, `skipYamlFlowSpace` and the reorder loop.
  C: below.
- **C scan.** The wave plan says "comments inside the brackets of a changed flow collection, the quotes of its keys and the original word of a boolean the edit did not set (#54)":
  done as D4, one test each. "A YAML 1.1 boolean word found as the editor reads it" (#53): the words are the ones of `resolveYamlPlain`; the null words and the empty value go with
  it (stated above). "The end-of-line comment and its spacing carried to the rewritten scalar (#50)": already true for one scalar at `HEAD` (checked by `git show HEAD:...`), the
  multi-item case was the gap; the issue's two reproductions are tests and pass. #52's warning ("the order also decides where the lines of an add go relative to the comments in the other hunks") holds: see the
  proof below, a hunk with only adds is unchanged. One existing assertion encoded the loss of #54 (`flow-collections-editor.test.js`, "a list on several lines"): it expected the
  comments gone; it now expects them kept.

## Tasks

- [x] T1. Reproduce the four issues on `HEAD` (scratchpad `repro.js`): #50's single case already passes; #52, #53, #54 fail as filed.
- [x] T2. #52: the reorder of a hunk.
- [x] T3. #53: `yamlEmittedWordsOf` and its use in `locateEmittedLines`; the null words and the empty value.
- [x] T4. #50: the items without a key paired when as many go as come.
- [x] T5. #54: `parseYamlFlowNode` / `skipYamlFlowSpace` note comments, keys and words; `emitFlowBlock` applies them; `openFlowLists` passes the cursor.
- [x] T6. `faithful-saves.test.js` (19 tests); the one assertion of `flow-collections-editor.test.js`; the manual's sentence.
- [x] T7. Before/after on the YAML files of the repository, differential and random tests, the real page in light and dark, full verification.

## Verification

Run from `/home/tibo/git-perso/archicode`, JDK 25 (`JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem`), offline.

- `./mvnw -o -q verify`: exit 0 (no Java file changed), run on the final tree.
- `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`: 169 passed. `src/main/rust/viewpoint-kernel/embed.sh --check`: "the committed WebAssembly is the one the
  sources build", exit 0. `npx prettier --check "src/**/*.java"`: clean.
- `node --test "src/test/javascript/**/*.test.js"`: 909 passed, 0 failed (890 before; `faithful-saves.test.js` adds 19). Run against `HEAD`'s `standalone.html` (the harness pointed at
  `git show HEAD:...`), 14 of the 19 new tests fail; the 5 that pass assert what must not change or what `HEAD` already did (a single rewritten scalar with its comment; a line
  that goes with no line that comes; a line added before the trailing comments; a collection no edit reaches; the rename in the real editor of a file whose references each have a comment).
- **No-change proof (scratchpad `w1/compare.js`).** `HEAD`'s editor against the working tree, `patchYamlText` on the **85** YAML files of `src/doc/examples`, `src/test/workspaces` and
  `src/test/resources` (the 80 of run 0053 plus the files added since), the six edits of runs 0052 and 0053: no edit; set a number and a boolean; drop the last key of `content` (or of
  the file); drop the first item of every list; set a string and add a key; append `-x` to the first string. **510 results, 507 byte-identical to `HEAD`**, every one reads back as
  the edit. The 3 that differ are `drop the last key` on three `workspace.yaml` files whose only key is dropped: the file becomes `{}` and its leading comments now stay above it
  (before: `{}` first, the comments under it), which is #52. The no-edit save is byte-identical on all 85. None of the 85 holds a `yes`/`no` word (grep), a flow collection with a comment inside or with quoted keys (the flow collections
  of the 85 are empty ones and one-line lists of quoted texts), so the files these edits do not concern are saved as they were.
- **Differential fuzz (scratchpad `w1/fuzz.js`, 7 seeds of about 800 generated manifests).** Comments, blank lines, quoted and plain strings, booleans and null words, one-line and nested flow
  shapes, an edit at random. A save with no edit is byte-identical for every file; every result reads back as the edit. `HEAD` followed the layout in 250 of the cases
  that differ and fell back to the emitter's text for the rest (the words of #53); the new code followed the layout in all of them. Where `HEAD` followed it: 222 differ only in the place of a
  comment or blank line (#52), 28 only in the word of a boolean or a null in a changed collection (#54), **0 anything else**.
- **Flow collections with comments (scratchpad `w1/fuzz2.js`, 3 seeds of 400, and 300 with CRLF line breaks).** A list or map on several lines with comments above, after and before the
  closing bracket, quoted keys, boolean words, a nested list; an edit that sets or adds a value. No-edit byte-identical, read back, **every comment of the file still in the result**.
- **The real page** (`archicode editor serve`, jar built by the verify of the working tree, built-in browser, an invented garden workspace in the scratchpad). Dark: editing the
  *Description* of a container whose line has a comment, with a comment above it, a boolean `on` below and a list of tags on several lines with comments (`diff -u` of the copy
  against the original):

  ```
  -  description: "Keeps the seedlings warm."  # the first line
  +  description: "Keeps the seedlings warm all winter."  # the first line
  ```

  Then, the tags written as a flow map on several lines (quoted keys, a boolean `yes`, comments inside), a tag added in the form, saved:

  ```
  -  tags: {
  +  tags:  # on several lines
       # the zone first
  -    "zone": north,
  -    "tier": 'gold',   # the second tag
  +    "zone": north
  +    "tier": 'gold'   # the second tag
       warm: yes
  +    light: "low"
       # before the bracket
  -  }  # on several lines
  ```

  Light (`colorScheme` light, reloaded): the description of the system whose file holds `enabled: yes`, `covered: no` and a comment on the edited line changed that line only
  (`diff -u`); the status said "Saved." The page has no visual change from this run; the two screenshots show the form and the save working in both schemes.

## Not verified

- Nothing was run on a real workspace; every file is invented, or one of the repository's examples and fixtures.
- Other browsers than the built-in one. The page was not changed visually (nothing to compare), so the light and dark looks show the save working in each scheme, not a difference.
- The wave gate's "removed, split and merged in the built-in browser" belongs to W-3, not here.
- A file that holds an anchor, an alias or a tag, a list at the column of its key (#57) and a comment inside an empty collection that is filled are still the emitter's text or lose that
  comment, as before.
- The cost of the extra reading on a very large manifest (the reader notes comments and keys for each collection opened): not measured on a file larger than the fixtures.

## Findings

- #50 was already partly fixed by `d2849d2` (before the wave) and its issue left open; this run adds the multi-item case and the test that fixes it. Close #50, #52, #53, #54 with the wave's commit.
- Filed #57: a list written at the column of its key makes the save rewrite the whole file.
- The null words and the empty value (`x:`) were rewritten the same way as the boolean words (the file fell back to the emitter's text and lost its comments). They are fixed with #53; the
  issue text does not name them, the wave's note for the issue closing should.
- A plain key the emitter has to quote (`on:`, `yes:`) is still written quoted by a save that changes its collection: the reader of this editor reads it as text, the Java reader as a
  boolean, so quoting it is the safer line; left as it was.
