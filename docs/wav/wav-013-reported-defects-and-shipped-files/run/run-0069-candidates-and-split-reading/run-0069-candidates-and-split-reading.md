---
type: run
run: 0069
status: completed
wave: 013
---

# Run 0069: Candidates and split reading

Wave 013 (`reported-defects-and-shipped-files`), item W-6 (phase P3). Focus: get fewer wrong candidates of replaces, none between two alternatives, and a table of changes that says where a split element's relationships come from.
Document profile: `single-document` (the scope arrives settled by the wave plan and by issues tmorin/archicode#60, #70 and #61, with the numbers of run 0058 in #33); this file carries scope, decisions, canonical impact,
review passes, tasks, verification and findings, as runs 0056 and 0068 did.

## Scope

1. **#60.** A name that repeats among the removed or among the new elements of a kind makes n x m candidates for n answers. Measure the two options of the issue ("name unique among the removed and among the new"; "the
   parents are themselves a pair") with `generate.mjs --sweep` and `ReplacesLargePairTest`, take one, record the numbers. Target: precision above 0.45, recall not below 0.70.
2. **#70.** Two sibling plateaus propose, on the reason `parent` alone, the pair of nodes that are alternatives. Find out whether the kernel can know the plateaus are siblings from what it is given; if the fix needs a
   new input or a change of the output (contract 4), stop that part (#34).
3. **#61.** The relationships of a split element read as new in `gap.md` with nothing that says they were its. Mark them and count them, without touching rule 6 and without changing the kernel's output shape.
4. Byte-identity of the views and of the outputs against a jar built from `6575892`; the five commands.

## Decisions

- **D1. #60: the name is a reason only when it is unique (option 1), in `candidates()`.** Measured on the large invented pair (`before` to `after`, no `replaces`; `generate.mjs --sweep`, which at its default prints the
  kernel's own 137 pairs, and `ReplacesLargePairTest`, which records them). Names rows of the sweep, all other thresholds as before (`close` 0.6, `least` 3 words, lone-sibling rule on):

  | Rule for a pair that has only the name to say for it | pairs | right | wrong | missed | precision | recall |
  | --- | ---: | ---: | ---: | ---: | ---: | ---: |
  | every one (kernel until this run) | 169 | 76 | 93 | 21 | 0.450 | 0.784 |
  | **A. only when the name is unique among the removed and among the new of that kind (taken)** | 137 | 76 | 61 | 21 | **0.555** | **0.784** |
  | B. only when the parents are themselves a pair (found one level above, or the same parent element) | 131 | 76 | 55 | 21 | 0.580 | 0.784 |
  | B. without "the same parent element" | 129 | 74 | 55 | 23 | 0.574 | 0.763 |
  | A or B (unique, or the parents are a pair) | 137 | 76 | 61 | 21 | 0.555 | 0.784 |
  | A and B | 129 | 74 | 55 | 23 | 0.574 | 0.763 |
  | no name rule at all | 129 | 74 | 55 | 23 | 0.574 | 0.763 |

  By level, A takes the false pairs of the components from 53 to 26 and those of the nodes from 19 to 14; among the planted false friends, "same name under another parent" goes from 8 listed of 8 to 6 of 8.
  **Why A and not B although B reads 0.025 better in precision at the same recall.** B's extra gain is only the unique-name pairs across unrelated parents it drops (6 of the planted decoys "same name under another parent").
  The pair plants no true answer of the kind "moved to another parent, name kept, description written again" (all 8 planted moves that keep the name also keep the description, so the description finds them whatever the
  name rule), so the instrument cannot see what B costs. `generate.mjs --sweep --rewrite-moves` is the what-if the pair does not plant: the description of those 8 moved elements is written again.
  There, A reads 132 pairs, 74 right, precision 0.561, recall 0.763 (it loses 2 pairs that only the name found), B reads 120 pairs, 68 right, precision 0.567, recall 0.701 (it loses 8), B without the same-parent case
  118, 66, 0.559, 0.680 (below the 0.70 of the gate). So A is as precise as B once the move does not keep the description, and keeps the recall. A is also the defect #60 reports (n x m for a repeated name) and no more: a
  unique name stays a reason. "A or B" is A on this pair (nothing is rescued by the parents because every generic-named true pair is also found by its description) and costs a second pass ordered by depth, so it was not built.
  **Gate P3 second criterion, #60 half: precision 0.555 > 0.45, recall 0.784 >= 0.70, holds.** The numbers are recorded in `recorded-candidates.txt` and `ReplacesLargePairTest` asserts them (the file) and a floor of
  precision > 0.5 and recall >= 0.7 under them. `recorded-declared.txt`: candidates left on `after-declared` 30 to 28.
  What changes for a user of `replaces`: fewer candidates, never another shape, never a candidate that was not listed before; once the author declares one of several same-named elements, the others become unique and
  tell again (a Rust test pins it).
- **D2. #70: stopped, not built.** The kernel is given `{ base, target }`, each one list of elements per layer, and nothing else; no plateau identity, no `baseline` chain. What it could infer:
  - From the elements alone nothing: `commerce-live`/`tax-live` of `saas` against `baseline` (the swap N15, to be proposed) and of `inhouse` against `saas` (two alternatives, not to be proposed) are the same shape
    (one removed and one new node of the same kind, only two under `partners`, no description or name in common).
  - From the `replaces` of the target: the target of P5 (`inhouse`) has seven `replaces` that name references `saas` does not have, which the kernel already reports as warnings ("not an element of the base plateau,
    ignored"). That looks like a signal and is not one: P6 (`marketplace` against `baseline`, a step skipped, an ancestor and not a sibling) also has a `replaces` that names a reference the base does not have (it names
    `inhouse`'s), and a pair of siblings whose target has no `replaces` at all gives none. A suppression of a candidate built on it would be a guess about the author's intent in a kernel whose contract is "never a
    guess" (rule 6), and wrong for P6.
  - So the relation of the two plateaus (`baseline` keys of `settings.plateaus`, known to the CLI in `Plateaus` and to the editor) must be handed to the kernel: a new optional input, or the candidates filtered by the
    host after the call. The first changes the kernel's input contract (`CompareInput`, kernel contract 4 in CLAUDE.md, #34's family of changes); the second duplicates a rule of the kernel in Java and in the page, so
    that the two stop being "the very same function" (`PlateauComparer`'s promise), and the editor would need the chain computed in JavaScript. Neither is mine to decide inside this run, and the wave plan says to stop.
  - Nothing of #70 was changed: P5 (`inhouse` against `saas`) still lists `partners.commerce-live`/`partners.tax-live` and `sandbox.commerce-sandbox`/`sandbox.tax-sandbox` on `parent`; P1 (`saas` against `baseline`) still
    proposes them. **Gate P3 second criterion, #70 half: not met, stopped as the wave plan prescribes; recorded here and in the report.** The issue stays open for the author with this analysis; the direction that
    does not touch the kernel's contract (the host filters the candidates when it knows the plateaus are siblings) is the one to weigh against a new optional input when #34 is next worked.
  - The expected files of the Brightcart fixture were not regenerated: nothing in them changed (no candidates are pinned in `expected/`, and the new name rule does not change what the CLI lists on the folders; compared
    with the jar of `6575892`, see Verification; `node src/test/resources/brightcart/generate.mjs` leaves `git status src/test/resources/brightcart` empty).
- **D3. #61 is the host's job, not the kernel's.** The kernel already says everything needed (the rows with `change: split`, the rows of the relationships with their `reference` and `destination`), so the note is computed
  from the rows of the comparison; the kernel's output, its shape and its contract version are unchanged.
  - *What belongs to a split element:* a relationship of the table whose change is `new` and whose source or destination is an element whose change is `split` (rule 6: a base relationship that starts or ends at a split
    element is dropped, so every relationship of a half, or that ends at one, has nothing to be compared with). Not `changed`/`removed` rows: they cannot touch a split element for the same reason.
  - *`gap.md` and the text of `archicode diff`:* the row ends with `of the split <element>` in its Details (both elements, source first, when both ends are split); the header has a line `of a split  N of the M new
    relationships belong to split elements (not compared with the baseline)` in the text form and a sentence under the counts in Markdown. On the invented harbour (`after-declared`) N = 31 and M = 60, as #61 counted.
  - *`gap.json`:* `counts.relationships.of_split` (N) and, on those rows, `of_split` (a list of the references). It is a Java-side field of the gap report; the kernel's output is not read differently. Both exist only
    when there is a split element with a new relationship, so a comparison without one is written byte for byte as before (compared with the jar of `6575892`, see Verification).
  - *The editor's Changes panel:* done, it was cheap: the row of such a relationship ends with the same `of the split X` (the `change-from` slot of the row, where a split element says `from ...`), and a line
    under the counts says `N of the M new relationships belong to split elements ...` (`ofSplitOf`, `newRelationshipsOfSplits` in `standalone.html`, 21 lines). Rule 6 itself is untouched.
  - The word "new" in the counts is unchanged: the 31 are still counted as new relationships, and the header now says how many of the new ones they are.
- **D4. The wasm is re-embedded (`embed.sh`), because `compare.rs` changed (D1).** `standalone.html` is edited for that and for D3's panel note only.

## Canonical impact

None to the architecture model (no TDD, no `CI-arc` or `CI-dom` packet). `CLAUDE.md`'s paragraph on plateaus said a candidate has "a name"; it now says a name that no other removed and no other new element of that kind has
(one clause). The manual (`src/doc/README.adoc`) says the same where it describes the candidates (command line and editor) and describes `of the split` where it describes `diff` and the relationships of a split element.
The kernel's README (candidates) says it.

## Note for the release notes

> The candidates of `replaces` are fewer: a name is no longer a reason for a pair when another removed element, or another new element, of the same kind has the same name (a `Cache` in every service, a `Message Broker`
> in every environment): such a name would pair every removed one with every new one and tell nothing about which is which. A pair can still be listed for its description or its parent. On the large invented pair of the
> repository the candidates go from 169 to 137, all the right pairs stay (76), and precision from 0.45 to 0.56. And in the table of changes (`archicode diff`, `gap.md`, `gap.json`, the editor's Changes panel), a new
> relationship of an element that was split says `of the split <element>` and the header counts them: the comparison never compared them (which half would own them is a guess), they were always listed as new. The sets of
> new, changed and removed things do not change.

## Review passes

- **KDMLLC (inline).** K: one counting function in the kernel (`count_names`), one name test; the host side is one set of split elements and one rule; no option, no flag. D: the rule of "belongs to a split element" is
  written once in Java and once in the page (two hosts of one rule, `ofSplit` in `GapReport`, `ofSplitOf` in the page; the sentence of the header differs on purpose, the Details text is the same); the numbers are
  recorded once, in `recorded-candidates.txt`. M: #60 (kernel), #61 (host) and #70 (stopped) do not overlap; the table of D1 covers the options and their combinations. L: no second pass ordered by depth, no new
  input. U: the Rust header (rule 7), the manual, the Javadoc of `GapReport`, the comment of the sweep and the test names say what changed. C: below.
- **C scan.** Wave plan W-6 scope: "a measured choice between ... (#60), using `generate.mjs --sweep` and `ReplacesLargePairTest`": D1. "no pair whose only reason is the shared parent when the two plateaus compared are not
  on the same chain (#70) ... if the output shape of the kernel or its contract would change, the run stops and records it (#34)": D2. "`gap.md` marks the relationships of a split element and the header counts them (#61)":
  D3. "the wasm re-embedded, the expected candidates of the Brightcart folder regenerated by the generator": the wasm yes (D4); the expected candidates unchanged because nothing in them changed (D2, Verification).
  Dispatch brief: "gap.json may carry the same ONLY if it does not change the kernel's output shape": D3. "Keep the edit of standalone.html to the re-embedded wasm plus anything strictly necessary": D3's panel note is
  the one addition, 21 lines, called out in the report. "No change to rule 6 itself": none.

## Tasks

- [x] T1. Read the wave plan, #60, #70, #61, #33 and the comment of run 0058; read `candidates()`, rule 6, `Comparison`, `GapReport`, the Changes panel.
- [x] T2. #60: extend the sweep (parents-pair variants, `--rewrite-moves`), choose (D1).
- [x] T3. #60: `candidates()` and rule 7 of `compare.rs`, Rust tests (a repeated name is no reason; becomes one again once the author settles the others), `embed.sh`.
- [x] T4. `ReplacesLargePairTest` and the recorded files record the new numbers; floor of the test raised.
- [x] T5. #70: find out whether the kernel can know (D2); stop.
- [x] T6. #61: `GapReport` (text, Markdown, JSON), the invented fixture `src/test/resources/split-relationships`, Java tests; the page's Changes panel and its node test.
- [x] T7. The manual, the kernel's README, one clause of `CLAUDE.md`.
- [x] T8. Byte-identity against `6575892`, the five commands (below).

## Verification

Run from `/home/tibo/git-perso/archicode`, JDK 25 (`JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem`), offline. Jars: `base` is built from `git archive 6575892` extracted in the scratchpad (the commit before
the wave; no worktree); `newA` and `newB` are two `clean package` builds of copies of the final tree. Every command ran in a copy of the tracked tree in the scratchpad (nothing generated next to the repository's files).

**Fail-first and tests.**
- Rust: `a_name_that_repeats_among_the_removed_or_the_new_is_no_reason` fails with the name rule forced on (the pre-run behaviour) and passes after; `a_name_is_a_reason_again_once_the_author_has_settled_the_others_that_share_it`
  pins the second half of D1. `cargo test`: 175 passed (173 before).
- `ReplacesLargePairTest` (3 tests) records `found=137 true-positives=76 false-positives=61 misses=21 precision=0.555 recall=0.784` and `candidates left=28`, and asserts a floor of precision > 0.5 and recall >= 0.7.
- `PlateauComparisonTest`: 3 new tests on the invented fixture `src/test/resources/split-relationships` (the full text of `diff`, the Markdown sentence and rows, the JSON `of_split` count and rows and the absence of the key
  when there is no split, `gap.md` and `gap.json` written by `views generate --baseline` equal to `diff`'s). `split-relationships-editor.test.js` (2 tests) and a test in `replaces.test.js` (the embedded wasm) for the page.

**Gate P3, second criterion (#60, #70).**
- #60: precision 0.555 (> 0.45) and recall 0.784 (>= 0.70) on the large invented pair, recorded; the table of options and the what-if are in D1. **Holds.**
- #70: **not met, stopped on purpose** (D2): `archicode diff --plateau inhouse --baseline saas` on the Brightcart folders still lists `partners.commerce-live`/`partners.tax-live` and
  `sandbox.commerce-sandbox`/`sandbox.tax-sandbox` (reason `parent`), seen in `bc.diff-inhouse-vs-saas.out` of the final jar; the editor's candidates are those of the kernel, unchanged. The wave plan prescribes this
  stop when the fix needs a new input to the kernel. The kernel's input, output shape and contract version (4) are unchanged by this run.

**Gate P3, third criterion (#61).** A relationship that belongs to a split element carries `of the split <element>` in `gap.md` (and in the text of `diff`), the header counts them (`of a split  31 of the 60 new
relationships belong to split elements ...` on the invented harbour, the 31 and 60 of #61; `6 of the 25` for `inhouse` against `saas`, `6 of the 17` against `baseline` on Brightcart), `gap.json` has
`counts.relationships.of_split` and `of_split` on the rows (a Java-side field), the editor's panel says it. The output shape of the kernel and its contract are unchanged (no Rust change touches `OutRelationship`,
`Counts` or `CONTRACT_VERSION`; the candidates are fewer, not another shape). **Holds.**

**Gate P3, fourth criterion: byte-identity against the jar of `6575892`.**
- 34 workspace files: the 33 of run 0068 (`src/doc/examples/**` 20 files: `design_example_step_1..3` (8), `domain_application`, `domain_configuration/default_settings`, `domain_plateaus`, `domain_technology`,
  `domain_viewpoint_views`, `domain_workspace/{default,empty,workspace}`, `facet_example_step_1..4`; `src/test/resources/{brightcart/folders, hyphen-ids, plateau-comparison, plateau-comparison/replaces,
  plateau-state-hints, plateau-state-tags, replaces-large-pair, viewpoint-kernel/workspace}/workspace.yaml`; `src/test/workspaces/case_{a,b,c,graph_dangling,graph_ok}.yaml`) and the new
  `src/test/resources/split-relationships/workspace.yaml`. Commands, 397 per jar (1191 files: standard output, error output, exit code of each): `views generate` (and per plateau, for the 8 workspaces that have plateaus, the
  ones with a `baseline` key writing `views-<plateau>-vs-<base>` with `gap.md` and `gap.json`, `replaces-large-pair` `after` and `after-declared` included), `diff` per plateau in text, json and markdown,
  `query views` in json, yaml and toml (and per plateau), `query views -q '$.[0]' -f toml`, `query graph` (and per plateau), `query schemas workspace|manifest` three times, the error outputs of a missing
  workspace, an unknown format, `-f` on `query graph` and on `query schemas`, the two `--help`, and on the Brightcart folders the seven comparisons `diff --plateau X --baseline Y` for (inhouse, saas),
  (marketplace, baseline), (saas, baseline), (inhouse, baseline), (marketplace, inhouse), (saas, inhouse), (baseline, saas) in text, json and markdown.
- `newA` against `newB` (two builds, two complete runs): **byte-identical on all 1191 files, and the generated trees identical (0 differing files).**
- `base` against `newA`: **1072 of the 1191 files identical**, the **generated trees identical but four files**: the `views` of every plateau and every comparison (PlantUML, `plantuml/**`) are byte-identical for all
  34 workspaces, `gap.md` and `gap.json` differ only for the two comparisons that have split elements: `brightcart/folders/views-inhouse-vs-baseline` and
  `replaces-large-pair/views-after-declared-vs-before`. The 119 other files that differ:
  - 103 are `query graph` and `query views -f toml` outputs: wave 013's own run 0068 (W-5, #58 and #59), not this run's. Shown: against the same 1062 commands run on the jar of run 0068
    (`w5/run/newA`), **only 6 of 1062 outputs differ**, and those 6 are listed next.
  - 15 are the `diff` of comparisons with a split element, in text, json and markdown (`diff-inhouse`, `bc.diff*-inhouse-vs-baseline`, `bc.diff*-inhouse-vs-saas`, `replaces-large-pair` `after-declared`,
    `split-relationships`): the only changed lines are the header line `of a split`, `of the split ...` on the relationship rows (and `of_split` in json), and, on `after-declared`, the two candidates
    `sandbox.batch-runner`/`staging.batch-runner` -> `test.batch-runner` (reason `name`, two removed of the same name) that are no longer listed (30 to 28). Read by `diff` of the two outputs.
  - 1 is the order of three `deprecated facet syntax` warnings on the error output of `views generate` on `viewpoint-kernel/workspace`: **not this run's**, see F1 (the jar of `6575892` gives three different orders
    in eight concurrent runs, and so does the final jar).
- `views generate` on `replaces-large-pair` for `after` (no `replaces`: candidates are not listed in a plateau that does not use them) is byte-identical to `base`: gap.md and gap.json of `views-after-vs-before` do not change.

**Gate P3, fifth criterion: the five commands, on the final tree.**
- `./mvnw -o verify`: BUILD SUCCESS, 428 tests, 0 failures, 0 errors, 0 skipped (16 min on a loaded machine).
- `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`: 175 passed, 0 failed.
- `src/main/rust/viewpoint-kernel/embed.sh --check`: "the committed WebAssembly is the one the sources build (658369 bytes)" (was 655544 bytes in run 0058; `embed.sh` was run once after the Rust change).
- `node --test "src/test/javascript/**/*.test.js"`: 1042 pass, 0 fail (1038 before, plus 4).
- `npx prettier --check "src/**/*.java"`: clean.

Not verified: the editor page in a browser (the pane is not used; the note is checked by the node harness without a DOM, the markup and the text, not the look); the native image; a JDK other than 25; the candidates on a real workspace
(the pair is invented, and the proportions of the cases are the generator's); `views generate --plateau after` time on the large pair (about 10 minutes of wall clock for each of the three plateaus with two jars running at once on a
loaded machine, not measured on its own).

## Findings

- **F1. The order of the warnings on the error output of `views generate` is not stable under load** (not this run's; the jar of `6575892` has it too). `viewpoint-kernel/workspace` prints three `deprecated facet syntax`
  warnings; eight concurrent runs gave three different orders, with the jar of `6575892` and with the final one; four sequential runs of each gave one. The facets are generated in parallel and the `Warnings` bean prints them
  in the order they arrive. A test or a script that compares the error output byte for byte is exposed. Not filed.
- **F2. The large pair cannot see what a rule that needs the parents costs.** It plants no "moved to another parent, name kept, description written again" answer, so option B of #60 looked better than it is.
  `generate.mjs --sweep --rewrite-moves` is the what-if (D1); planting that case in the pair would change the seeded draws and so every recorded number, so it was not done here. A real workspace may have
  more or fewer of them.
- **F3. #70 stays open with a path that does not touch the kernel's contract.** The host knows the chain of plateaus (the CLI in `Plateaus`/`WorkspaceFactory`, the editor in `AppState`): filtering the candidates
  whose only reason is `parent` when neither plateau is the other's ancestor would be a Java filter in `PlateauComparer` and a JavaScript one in the page, with no change to the kernel. The cost is two copies of one
  rule (against the promise of `PlateauComparer`, "the very same function"); the alternative is an optional input to `compare` (`relation: "chain" | "siblings"`), which is a change of the kernel's input contract (#34's
  family) and should be taken with the next bump. To weigh when #34 is next worked.
- **F4. The command line lists the candidates only for a plateau that uses `replaces`**, so `archicode diff --plateau saas` (P1) prints none, and the swap pair of N15 is seen in the editor (which proposes them for any
  comparison), not on the command line. The wording of the gate ("`saas` against `baseline` still proposes them") holds for the kernel and the editor, and nothing here changes it.
- **F5. The count of `of a split` is a count of relationships the comparison could not compare, not of relationships that were there before the split.** A relationship that a half really added after the split is in it
  too, and nothing can tell it apart (rule 6). The sentence says "not compared with the baseline" for that reason.
- **F6. Note for the release notes (#60, #61)**: see above. The note's second half is also in the manual, where `diff` is described.
- **F7. Files touched outside `likely_paths`**: `CLAUDE.md` (one clause of the paragraph on plateaus), `src/test/resources/split-relationships/**` (the invented fixture of #61; the wave lists `replaces-large-pair/**`
  and `brightcart/**` under `src/test/resources`, not a new folder). Both are read by existing tests (`shipped-files`, the YAML round trip of the editor) and pass.
