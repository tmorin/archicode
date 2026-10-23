---
type: run
run: 0162
status: completed
profile: single-document
wave: 022
---

# Run 0162: save-block-scalar-in-list

Wave 022, W-5 (decision T8; P2 gate criterion 1; GitHub issues tmorin/archicode#154 and #155 L2). Focus: the editor's save keeps the comments of a file that holds `- |` and keeps a block scalar when the first key of a list item changes; the time guard of the generated test of wave 021 stops failing under load. The command line and Java are not touched. Profile `single-document`: scope arrives settled (two issues with minimal repros), the design has no live alternative worth recording, one sequence.

## Measured first

Both repros reproduce on the page of `archicode-0.19.0`. #154: any save of a file with `- |` writes the emitter's text, because `locateEmittedLines` and the `header` regex that five functions share (`patchYamlTextPlain`, `markKeyColumnLists`, `mergeBareDashItems`, `readFlowStart` via `openFlowLists`, `yamlQuotingVotes`, `keepStrayCommentsOutOfBlockScalars`) want a key before `: |`. #155 L2: the line that comes (`- note: "one\ntwo\n"`) is a new line for the aligner, so the block is written as the emitter's quoted text.

## Decisions

| # | decision | verdict |
|---|---|---|
| 1 | one header test | `yamlBlockHeader(line)` replaces the five copies of the regex: the keyed form as before (so every file with a key is read as it was), plus `- |`, `- >-`, `- - |`, whose column is the last dash (the text only has to go past the list). |
| 2 | locate `- |` | in `locateEmittedLines`, a candidate line that is a keyless block header (`yamlKeylessBlockHeader`) is the line the emitter wrote when its lead is the same and the text read from the block equals the text read from the emitted line (`yamlKeylessBlockIsLine`, so a folded `>-` too); the span is the lines past the dash. Keyed blocks are untouched. |
| 3 | identity of a dropped `- |` | `going` (the comment pairing) takes the emitted line of a dropped keyless block as its identity, so a comment of a line that goes is not copied to the quoted text that comes (found by the generator: `- w15 # c` removed next to a re-indented `- |`). Keyed blocks keep their old identity. |
| 4 | L2 | at the end of the edit's passes, and only in the pass that follows the quotes of the file (`styled`), an added line `key: "text\nwith newline"` whose key and text equal those of a dropped block scalar (`key: |` read from the original lines) is replaced by the original header (comment kept) and the text lines moved to the new column (`step.addLines`, counted in `styled.lines`, so a result that does not say the edit falls back to the pass without it). The add step is moved after the lines that go only when nothing but drops lies between them (the comments above the key stay above the block; an add must not pass another add: found by the generator on a wrap). |
| 5 | fallback | unchanged: the emitter's text stays wherever the result does not read as the edit, and for the layouts the fix does not follow (`- - |` on one line, a folded block read differently). |
| 6 | the generator | `save-generator.js`: `- |` items are generated (the `!inList` restriction is gone), nearly half of the maps that are list items get a block scalar on their second key, and a `first-key` edit (add or remove the first key of such a map) is chosen often; `limitOf` no longer lists `dash-line-of-a-block-scalar`; `run` counts the two shapes in `stats.shapes`. |
| 7 | the tests | the two 'known limit' tests (#154, L2) are ordinary tests (`#154: ...`, `#155 L2: ...`), L3 and L4 keep their 'known limit' tests; the generated test asserts at least 100 cases with `- |` and 40 with the first key before a block; new tests compare with the page of `archicode-0.19.0` (`git show`, skipped with a stated reason when the tag is absent): the shipped files are the same bytes (`sweepShipped`, shared with the 0.18.0 comparison) and the page of the tag fails the generated test for the two shapes and for no other (410 of 2000 cases). |
| 8 | the deflake | the assertion `Date.now() - started < 60000` of the generated test is removed, with the `started` it used: the property is what the save writes, not its speed (5 s alone, 68 s in the full parallel run of this machine). A bound generous enough not to fail would assert nothing. |

## Verification (see the report; the figures are the run's)

- Generator, seed 154 (wave 021's), 2000 cases: 0 failures (1987 cases, 12 + 1 left to the known limits); 4000 cases with seeds 154, 1, 7, 42, 2026, 9001: 0 failures each.
- Identity (V7): 4890 edits over the 399 shipped YAML files without brackets, and 5520 edits over all 444 the editor reads, write the same bytes as the page of `archicode-0.19.0`. No shipped file has `- |` or a block scalar behind a first key that an edit removes, so the shapes where the bytes differ are only the fixed ones, which the generator shows.
- The page of `archicode-0.19.0` fails the generated test on those shapes only.

## Canonical impact

`CLAUDE.md`: the sentence on the kept limits of the save (L1 and L2 are fixed, L3 and L4 stay) and the list of open issues (#154 and #155 L2 fixed by this run). The manual (limits of the save) is W-6's. No `dom` packet, no `arc` item.
