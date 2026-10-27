---
type: run
run: 0190
status: completed
profile: single-document
wave: 025
---

# Run 0190 plateau-fold-analysis

Run of wave 025 (wav-025-hosted-editor), manifest id W-2, document profile `single-document`: this file is the run's status record and carries its scope, decisions, canonical impact, verification and findings. Issue: tmorin/archicode#65 (`plateau fold`). The author decided on 2026-10-23 (D13 of wave 021) that an analysis comes before any code; the by-hand recipe is `[[fold-by-hand]]` in `src/doc/README.adoc`.

## Scope

**Question.** Should `archicode plateau fold <plateau> [--dry-run]` be built, and with what semantics? The reader of this document is the author, who decides on a comment of #65.

**Done when.** The P1 gate of the wave (`wav-025-hosted-editor.md`) owns the criteria; this run adds what makes them checkable:

1. The recipe of `[[fold-by-hand]]` is run on a copy of the layered Brightcart fixture (`src/test/resources/brightcart/layered`), and `plateau list` and `diff` (the same `--plateau` and `--against` before and after) are compared. The commands and the observed difference are recorded.
2. A section each for: a plateau with several plateaus above it; a plateau with siblings; `--archive`; views and stories that name the plateau; the plateaus a fold cannot apply to (the root, and a plateau that no other overrides, which has no plateau above) and the plateau that `settings.current` names.
3. The checks a command would need, a size, and a recommendation: build, build later, or close #65.
4. The oracle a build would use is named (`plateau list` and `diff` before and after).
5. A comment on #65 links this document and states the recommendation.

**Not in scope.** Any change under `src/`, `pom.xml` or the manual (the wave forbids code for `plateau fold`); the editor action; the operation "make the future plateau the new root" (`merge F into P`), which #65 keeps out until a fold is built and the author asks for it.

**Decisions (Stage 3, 2026-10-27).** Each question is resolved from the repository (the manual's `[[fold-by-hand]]`, section 14 of `docs/fixtures/brightcart-spec.md`, `PlateauTree.redeclared`, the editor's `plateauDeletion`). They are working assumptions of the analysis: Stage 10 runs the recipe and either confirms each one in Findings or reverses it with the observed output. None is left open. "The plateau above" of `X` is the plateau whose `override` is `X`.

- **Q1. Several plateaus above: refused.** A fold needs exactly one plateau above. With two or more (`X` overridden by `A` and `B`, which do not stack) folding into `A` leaves `B` without what `X` declared, and folding into both declares the same references in two plateaus, which `PlateauTree.redeclared` allows only for plateaus that do not stack and which duplicates history. The manual already says "keep it". The command refuses and names the plateaus above. Check for Stage 10: the manifests of `X` are read before its patches in the recipe, so a patch of `X` moved into `A` is now read with `A`'s elements loaded and a selector that matched only `X`'s elements could match more; the command must resolve every plateau of the tree before and after and write nothing unless each one resolves to the same state (the "write everything or nothing" rule of section 14).
- **Q2. Siblings: a fold does not touch them.** Siblings of `X` (same parent) do not stand on `X`, and after the fold `A` hangs under the parent of `X`, so they stay as they are. The one real effect is a comparison made from outside the files: `--against X`, or a sibling compared with `X`, names a plateau that is gone and fails with the loader's unknown-plateau sentence. The command prints the plateaus it removed and does not rewrite command lines. A plateau with no plateau above (`saas`) and the root cannot be folded (Q1 refusal, with its own sentence). `settings.current` naming `X`: refused. The editor's delete takes the line out in that case (`plan.current`); the editor takes the line out because a `current` that names no plateau stops both tools, and for a fold the author chooses the new current, so the command refuses and says to change it (alternative to weigh in Stage 10: write `A`).
- **Q3. No `--archive` for a fold.** `--archive` appears once, in section 14, as an option of `merge F into P`, where a descendant is folded down into an ancestor, `P` keeps its name and takes the state of `F`. A fold of #65 goes up: `X` disappears into `A`, which keeps its name and state. The history of `X` is in git. So the fold has no archive option, `--archive` stays with the "new root" operation that this run keeps out of scope, and M1 to M3 and V12 to V14 describe that other operation and do not constrain a fold (they stay waiting, with #65 noted as their dependency only if the author builds the new root). They remain a source of cases: M2 (`marketplace` into `inhouse`) gives the same resolved state as folding `inhouse` into `marketplace`, with the survivor named `inhouse` instead of `marketplace`, so its numbers (82 elements, P4) are the oracle for the state after the fold, up to the name.
- **Q4. Views and stories: refuse a step, leave the inert key.** A step with `at` or `against` naming `X` drawn at `A` would show `A`'s additions, so a rewrite changes what the step draws and the manual leaves the choice to the author ("or the plateau that fits"): the command refuses and lists each step with its story and file, like the editor's refusal. The `plateau:` of a view or a story is read as nothing since wave 016 (no warning, no error), so the command leaves it as written; the recipe step that changes it is a tidy-up, not a need.
- **Q5. Writing: textual edits, no re-emission.** The command line has no line-preserving writer (it is JavaScript in the editor; Jackson would write the whole manifest again and lose comments, quotes and flow lists, which the author's waves 021 and 022 made a point of keeping). A command would therefore make two kinds of edit on the text: replace the value on the `plateau:` header line of each manifest of `X` (a line substitution that keeps quotes and comment), and cut the `patches` block of the `Kind: Plateau` manifest of `X` and paste it in front of the one of `A` (the cut and paste of `cutBlockFromText` / `pasteBlockInText`, ported). Moving the patches of `X` in front of those of `A` is the concatenation of section 14, which that section accepts only as a shortcut checked by state equality (derivation is its general method): the check of Q1 is that equality. It refuses, naming the file, a layout it cannot follow (flow lists, anchors, aliases, tags in the `patches` or the header), and the by-hand recipe stays the way for those files. Stage 10 sizes this port and says whether a smaller design (headers and a file move, patches left in a block that the author merges) is enough.

## Tasks (Stage 10)

1. Copy the layered Brightcart fixture to a scratch folder outside the repository; record `plateau list` and `diff` for the plateau pairs the fold touches.
2. Run the four steps of the recipe by hand on `inhouse` (one plateau above it, `marketplace`) and record the same commands after.
3. Run the recipe where it does not apply and record what the tools say: a sibling (`saas`, beside `inhouse`) and the plateaus with no plateau above (`saas`) and the root (`baseline`). The Brightcart fixture has no plateau other than the root with two plateaus above it (`baseline` has two, `inhouse` and `saas`, but it is the root), so the case of two plateaus above is built on the scratch copy by adding a plateau `inhouse-alt` that overrides `inhouse` beside `marketplace`; record that the copy loads (`plateau list`) before folding `inhouse`.
4. Read section 14 of `docs/fixtures/brightcart-spec.md` and the code and docs a command would reuse (`LayerLoader`, `PlateauTree`, `Patch`, `PlateauComparer`, `ListPlateausCommand`, the editor's `commitPlateauDelete`) and size the command.
5. Write the sections of Findings and the recommendation, and the text of the comment on #65. Posting a comment is publishing: the agent that does it needs the author's permission in the session that runs it, and when it does not have it, the text stays in Findings and the gate's last criterion is reported open.

Status at the end of Stage 10: tasks 1 to 4 done, task 5 written (the sections of Findings and the text of the comment) but the comment is not posted, since posting needs the author's permission; the last criterion of the P1 gate (`gh issue view 65 --json comments`) is open until the author posts it or says to.

## Canonical impact

None for the code, the manual and `CLAUDE.md`: this run writes documents under `docs/wav/wav-025-hosted-editor/run/` only, and the scratch copies live outside the repository. If the recommendation is to build, the build is a later wave with its own canonical impact; this document says which parts of the manual it would touch (`[[fold-by-hand]]`, `[[plateau-limits]]`, `[[editor-plateau-delete]]`) without changing them.

## Verification

- The gate's third and fourth criteria, read from this file and from `gh issue view 65 --json comments`.
- `git status` shows no change outside `docs/wav/wav-025-hosted-editor/`.
- `check_run.py --as-completed` on the run directory.

Files outside likely_paths: none

### Verification result (Stage 11, 2026-10-27)

Run by one agent; the commands were read, not all re-run.

- Done-when 1 to 4 hold in Findings: the recipe run on a copy of the layered Brightcart with `plateau list`, `diff`, `views generate` and `query graph` before and after; a section each for several plateaus above one, siblings, `--archive`, views and stories, and the plateaus a fold cannot apply to (root, leaf, `settings.current`); the checks, the size and the recommendation (build later, fix the manual first); the oracle (`plateau list`, `diff` and `views generate` before and after). Spot-checked against the repository: `inhouse` has 26 patches and `marketplace` 23 (`src/test/resources/brightcart/layered`), `discovery.search` carries a `replaces`, `inhouse` declares `commerce.search`, `PlateauTree.redeclared`, `ListPlateausCommand`, `PlateauGroup`, `filePlateauFolderWarning` and `[[fold-by-hand]]` exist, and `--archive` appears in section 14 of `docs/fixtures/brightcart-spec.md` as an option of `merge F into P` only.
- (Superseded, see the next bullet.) Done-when 5 did not hold when this was written. `gh issue view 65 --json comments` returns 3 comments and none links this document. The text is in Findings; posting is publishing and no session gave the permission. The last criterion of gate P1 stays open until the author posts it or says to.
- `git status` shows no change made by this run outside `docs/wav/wav-025-hosted-editor/run/`: the other modified files (CLAUDE.md, `src/doc/README.adoc`, the editor sources, page and tests) belong to W-1 (run 0189) and the wave documents.
- No pln exists (profile `single-document`), so there is no `execution_manifest.status` to set. Status stays `in-progress` because done-when 5 is unmet.

## Review pass

Review pass: inline, not independent. The run document was an empty stub when Stage 2 started and no stage drafts it under `single-document`, so the agent that ran Stage 2 wrote this scope first and then reviewed it with `review-kdmllc-content` (a leaf agent has no `Agent` tool to dispatch). The drafter and the reviewer are one agent. The findings and the rewrite applied are in the prg; a later stage or the author may want a second reading.

## Findings

Stage 10, 2026-10-27, run by one agent on a scratch copy outside the repository (`<scratch>/fold`), with the packaged application of the working tree (`archicode 0.21.0-SNAPSHOT`, JDK 25). Nothing under `src/`, `pom.xml` or the manual was changed. The workspace is `src/test/resources/brightcart/layered` (plateaus: `baseline`; `inhouse` and `saas` over `baseline`; `marketplace` over `inhouse`). The folder `inhouse` is the plateau folded, `marketplace` the plateau above it.

### Recommendation

**Build later. Correct the manual's recipe now.** `plateau fold` is worth building only in two steps, the first of which writes nothing, and only when the author has a plateau to fold in a workspace that is not a fixture. Reasons, each below:

1. The by-hand recipe works for a plateau with exactly one plateau above it, and it is checked by commands that already exist (`plateau list`, `diff`, `views generate`): the oracle is cheap, so doing it by hand is safe when it is done right.
2. The recipe is incomplete, and the part it leaves out is the part a command could do and a reader would miss: the `replaces` of the plateau above that name an element the folded plateau declared. On the fixture the fold, done as the manual says, changed what `diff` says about `discovery.search` and exited 0 (see "The recipe, run on the fixture"). That is a correction to the manual (it costs nothing), not a reason to write a command.
3. What a command needs is a Java writer of YAML text that keeps comments, quotes and layout (the editor has one in JavaScript, 2,400 lines across `core/yaml-patch-text.js`, `core/yaml-block-moves.js`, `core/yaml-patch-flow.js` and `application/plateau-commands.js`; the command line has none, `InitCommand` writes fixed resources). That is the cost, and it buys a task the author does once per plateau.
4. If it is built, the first step is `plateau fold <id> --dry-run` only: it reads the workspace, refuses or lists the files to edit, the `replaces` entries to rewrite and the steps to repair, and writes nothing. The risky parts (the refusals, the `replaces`, the steps) are all there; the writer is the expensive part and can wait until the author has used the report.

The options for the author, on a comment of #65: (a) build now, both steps, about one large run (sizing below); (b) build later as recommended, with the manual fixed first; (c) close #65 and keep the manual's recipe as the answer. (c) is defensible if the author folds a plateau rarely; (b) keeps the door open at the price of a few lines in the manual.

### The recipe, run on the fixture (task 1 and 2)

Commands, in `<scratch>/fold/before` then `<scratch>/fold/after` (a copy where the four steps were done by hand and by a script of a few lines):

- Before: `plateau list`; `diff --plateau P` and `diff --plateau P --against Q` for P and Q in `baseline`, `inhouse`, `marketplace`, `saas` (16 runs); `views generate --plateau marketplace --against baseline`; `query graph --plateau P`.
- The four steps for `inhouse` into `marketplace`: (1) `plateau: "inhouse"` became `plateau: "marketplace"` in the 11 manifests of the folder `inhouse` that say it; (2) `override: "inhouse"` taken out of `marketplace/plateau.yaml` (`inhouse` overrode the root), the 26 patches of `inhouse` put in front of the 23 of `marketplace` (49); (3) `inhouse/plateau.yaml` deleted; (4) the steps (below).
- After: `plateau list` (`inhouse` gone, `marketplace` has parent `baseline`, `saas` as it was) and the same `diff`, `views generate` and `query graph`.

Observed:

| What | Result |
| --- | --- |
| `plateau list` | `inhouse` is gone, `marketplace` has the parent `baseline`, `saas` and `baseline` rows unchanged. Exit 0. |
| `diff` for the plateaus that stay (`baseline`, `saas`, `marketplace`: nine outputs, the default `--against` and each pair) | The six outputs with `baseline` or `saas` as the plateau read (default, against each other, against `marketplace`) are byte for byte the same. The three with `marketplace` as the plateau read differ (next rows). |
| `diff --plateau marketplace` (before: against `inhouse` by default; after: against `baseline`) | After the recipe as written: `+39 ~3 -7`, `10 moved`, and a `warning: replaces of discovery.search (application layer): commerce.search is not an element of the base plateau, ignored` at the end; before, compared with `baseline`: `+38 ~3 -6`, `11 moved`. Exit 0. |
| The same after the `replaces` of `discovery.search` is written `shop.app.search` (see below) | `diff --plateau marketplace --against baseline` before and after: the text above the cascade table is byte for byte the same; the cascade table has the same 21 rows, and only two columns differ: PLATEAU (`inhouse` rows say `marketplace`) and PATCH (the 23 patches of `marketplace` are numbered 27 to 49 where they were 1 to 23, since the 26 patches of `inhouse` are in front of them). `--against saas` is the same, with 23 rows. Default `--against` after the fold equals `--against baseline` before. |
| `views generate --plateau marketplace` | `views-marketplace` and its three facet folders, and `views-marketplace-vs-baseline` with its facet folders: every `.puml` file byte for byte the same; `gap.md` and `gap.json` differ (the two columns above). |
| `query graph --plateau saas` and `--plateau baseline` | byte for byte the same. |
| `query graph --plateau marketplace` | not the same: the two siblings `commerce.cart` and `commerce.catalog` (declared in two files of the folded plateau) swap places, and the rewritten `replaces` shows. The drawn views are identical, so the order does not reach them; the cause of the swap was not looked for. The graph is therefore no oracle by bytes. |
| The numbers of the state after | `marketplace` against `baseline`: `+38 ~3 -6`, `11 moved, 2 split, 1 merged`, which are the numbers of P4 and of M2 in section 14 of `docs/fixtures/brightcart-spec.md`: the fold of `inhouse` into `marketplace` gives the state that M2 describes (`marketplace` into `inhouse`), up to the name. |

**Three things the manual's recipe does not say or says wrongly (`[[fold-by-hand]]` in `src/doc/README.adoc`):**

1. **`replaces`.** A `replaces` entry in the plateau above that names an element the folded plateau declared is read against a plateau that no longer exists as a layer. `marketplace/application/discovery.yaml` says `discovery.search` replaces `commerce.search`; `commerce.search` is declared by `inhouse` (it replaces `shop.app.search`) and removed by a patch of `marketplace`. Before the fold the two layers compose (a move then a move, `discovery.search` is `moved` from `shop.app.search`). After the recipe, `commerce.search` is no element of the plateau `marketplace` builds on, the entry is ignored with a warning, and `discovery.search` is `new` and `shop.app.search` is `removed`: the numbers change (`+39 ~3 -7`, `10 moved`) and the exit code is 0. The repair is to write the entry the composed way: the entries of the element it names (`shop.app.search`), or none when that element had no `replaces`. One entry of this fixture is concerned (every `replaces` of the folder `marketplace` was read with `grep`; its 23 patches carry none); the rule applies to every `replaces` of the plateau above, in a manifest or in a patch `value`.
2. **The table changes in two columns, not one.** The manual says the only line that changes is the column PLATEAU of the cascade. The column PATCH changes too: the patches of the folded plateau are in front of the others, so every patch of the plateau above is renumbered by their count.
3. **Step 4 is a choice, and the obvious rewrite is wrong.** With `inhouse` gone, `diff` stops with one `error:` line per step that names it (four lines on the fixture: `fork_tour` steps 3, 4 and 5, `seller_journey` step 3). Changing every `inhouse` to `marketplace` gives two new errors, `step 5 says at: marketplace and against: marketplace: a plateau is never compared with itself` (`fork_tour`) and the same for `seller_journey` step 3; those two need `against: baseline` (the new parent) or no `against`. The two steps told `at: inhouse` (`fork_tour` 3 and 4) change what they draw: they draw `marketplace`, which is `inhouse` plus the layer above. A command cannot choose; it can list them.

The recipe also leaves the folder `inhouse` holding manifests that say `plateau: marketplace`. No tool complains (the command line does not look at folders, and from reading `filePlateauFolderWarning` the editor's warning only fires for a folder named like a plateau of the tree, which `inhouse` no longer is; the editor was not run); moving the files is tidying and the command line should not do it.

### A plateau with several plateaus above it (Q1, confirmed)

Built on the copy: a plateau `inhouse-alt` over `inhouse`, next to `marketplace`, with two patches (`SET` of the description of `commerce.cart` and of `commerce.search`); the copy loads (`plateau list` shows five plateaus, `diff --plateau inhouse-alt` is `~2`, both changes wording only). Then `inhouse` was folded into `marketplace` with the recipe:

- As the recipe is written: `plateau list` stops with `error: the plateau inhouse-alt (inhouse-alt/plateau.yaml) overrides inhouse, which is not a plateau of this workspace`. The tools find the damage, loudly, and nothing is silently wrong.
- If the author also moves `inhouse-alt` over `marketplace` (the other way to repair it): the tree loads, with a new warning about a horizon, and `diff --plateau inhouse-alt` stops with `error: plateau inhouse-alt: patch 2 (SET target commerce.search): selects nothing, there is no element commerce.search in the application layer`, because `marketplace` removed it. Even where it loads, `inhouse-alt` now stands on `marketplace` and draws everything it adds: its state changed.

So a plateau with two plateaus above cannot be folded into one without changing the other; the command refuses and names the plateaus above (`inhouse-alt`, `marketplace`). Folding into both would declare the same references twice (a plateau cannot redeclare a reference of its ancestor, and two plateaus that do not stack would each carry the history). The manual's "keep it" stands. The remaining check of Q1, that a patch of the folded plateau which selects by a `where` or a pattern could match more once the elements of the plateau above are loaded with it, was not met on the fixture (every patch targets one reference); it stays a reason for the post-condition below, not a finding.

### A plateau with siblings (Q2, confirmed)

`saas` stands on `baseline` beside `inhouse`. After the fold, every `diff` and every `query graph` that does not name the folded plateau or `marketplace` is byte for byte the same as before (`saas` against `baseline`, `baseline` against `saas`, `saas` against `marketplace`, `marketplace` against `saas` after the `replaces` repair). Only a command line from outside the files breaks: `diff --plateau saas --against inhouse`, `diff --plateau inhouse` and `views generate --plateau inhouse` stop with `error: unknown plateau inhouse: the plateaus of this workspace are baseline, marketplace and saas`. The fold does not touch the siblings, prints the plateau it removed, and does not rewrite command lines or CI files.

### Plateaus a fold cannot apply to (done-when item 2)

- **The root (`baseline`)** has no plateau to fold into on its own side: its plateaus above are `inhouse` and `saas` (two) here, and in a workspace with one chain a fold of the root would be the other operation ("make the future the new root"), out of scope. Refused, with its own sentence.
- **A plateau that no plateau overrides** (`marketplace`, `saas`) has no plateau above, hence nothing to fold into. Refused: the sentence says it is a leaf and that the editor's *Delete* is the removal.
- **A plateau with two or more plateaus above** (Q1): refused, names them.
- **`settings.current` naming the folded plateau** (confirmed by running it): after the fold, every command that reads `current` stops with ``error: `settings.current` names the plateau `inhouse`, which is not a plateau of this workspace (the plateaus are `baseline`, `marketplace`, `saas`)``; `plateau list` still works and `--plateau marketplace` gets past it. The command refuses before writing and says to change `current` first. Writing the plateau above in its place was the alternative; it is rejected because it changes what every default command draws, from the folded plateau to the folded plateau plus the layer above, without the author choosing it.

### `--archive` (Q3, confirmed)

`--archive` exists in one place, section 14 of `docs/fixtures/brightcart-spec.md`, as an option of `merge F into P`, which keeps the old present as a read-only plateau after a descendant is folded down. A fold goes up: the plateau folded disappears into the plateau above, which keeps its id and its state. Nothing is left to archive that git does not hold (the commit before the fold has the folded plateau whole), and the loss the manual already names (its comparison, its `views-<id>` folder, the `against` of a step) is not what an archive would keep. So `plateau fold` has no `--archive`. M1 to M3 and V12 to V14 describe the other operation and do not constrain it; M2 is a useful oracle for the state after (above).

### Views and stories that name the plateau (Q4, confirmed and refined)

A step with `at` or `against` naming the folded plateau is refused by the command, with its story, file and step number (the loader's own sentences already do this after the fact). Not rewritten, because the replacement is the author's choice (above: two of the four steps would be wrong with the obvious replacement, and two change what they draw). The `plateau:` of a view or a story is read as nothing, so it is left; none of the shipped views and stories of the fixture carries one. A saved view that names an element only the folded plateau declares is no problem after the fold (the plateau above keeps those elements); the editor's delete refusals for views and steps (`stepsLosingTheirView`) do not apply to a fold, because the plateau above keeps everything the folded one gave.

### What a command would need (checks, task 4)

Refusals before any write, each one sentence, `error:` and exit 1 (as `ErrorOutput` does): not a plateau; the root; no plateau above (a leaf); more than one plateau above (named); `settings.current` names it; a step `at`/`against` names it (each listed with story, file, step); a layout the writer cannot follow in a file it must edit (flow list, anchor, alias or tag in the `plateau`, `override`, `patches` or `replaces` it touches; the by-hand recipe stays for these); a workspace that does not load. Plan: the manifests whose header says `plateau: <id>`, the `Kind: Plateau` manifest of the plateau and of the plateau above, the `replaces` entries of the plateau above (in manifests and in patch values) that name an element the folded plateau declares, and for each one the entries it is replaced by (its own `replaces`, or none). Post-condition, the oracle: write into a temporary copy, load every plateau that stays, and compare with the state before: for every plateau P that stays and every other Q that stays, `diff --plateau P --against Q` equal but for the PLATEAU and PATCH columns of the cascade (compared by the model, `compare` and the union, not by text), and the drawn views of each P identical; the parent of the plateau above is the parent of the folded one and nothing else of the tree moved. Write the real files only if every comparison holds, otherwise write nothing and say which plateau differs. `--dry-run` runs everything but the last step and prints the plan.

The oracle named for the build, in one line: **`plateau list` and `diff` (and `views generate`) before and after, equal for every plateau that stays, but for the PLATEAU and PATCH columns of the cascade of the removals and the row of the plateau that went.** It was run by hand above and holds exactly when the `replaces` are composed.

### Size (task 4)

Estimates, not measures. Reusable as they are: `PlateauTree` (children, chain, standsOn), `LayerLoader` (`stepPlateauProblems`, `entryProblems`), `ListPlateausCommand` and `PlateauGroup` (where the command goes), the kernel's `compare` with its `chain` (the composition of `replaces` is the kernel's rule 8; a command would read the entries off two loads rather than reimplement it), SnakeYAML with `Mark` (already on the class path, used by `AliasExpandingYamlParser`; it gives the line span of a key and of a sequence, so the JavaScript writer need not be ported whole, only its handling of the comments around a moved block, `lastLineOfBlockWithComments` and `deeperThanItemAfterSibling`). New: the command and its registration (`reflect-config.json`, the guide's command list and its golden file `src/test/resources/guide/golden.md`); a planner (about 250 lines); the text edits (the `plateau` header line, the `override` line, the splice of the `patches` block, the `replaces` entries; about 250 lines, the risky part); the verification on a temporary copy and the all-or-nothing copy back (about 150 lines); tests (the fixture of this run as a case, every refusal, the layouts refused, the `replaces` composition, `PlateauFoldIT` on the jar and on the native runner), under the 0.90 coverage floors. About 650 lines of Java and as many of tests: one large run, two if the dry-run and the writer are separate (recommended). The manual would touch `[[fold-by-hand]]` (corrected, and pointing at the command), `[[plateau-limits]]` and `[[editor-plateau-delete]]`; the editor action is a separate run (its writers exist in JavaScript, but a fold needs `plateauDeletionAbove` and the `replaces` rewrite too).

### The decisions of Stage 3

| Q | Outcome |
| --- | --- |
| Q1 | Confirmed, with the evidence above (two plateaus above). |
| Q2 | Confirmed. `settings.current`: refuse, confirmed by running it. |
| Q3 | Confirmed, no `--archive`. |
| Q4 | Confirmed; refined: the obvious rewrite gives two self-comparisons. |
| Q5 | Textual edits only: confirmed, but the set of edits was incomplete: the `replaces` of the plateau above is a fifth edit (reversed in part). The header line and the cut and paste of the patches are as assumed. A smaller design does exist: dry-run first, writer second. |

### Comment on #65 (done-when item 5)

Not posted: posting is publishing, and this run was not given the author's permission in the session that ran Stage 10. The text, for the author to post or to have posted (the link works once the wave branch is pushed):

> Analysis done (wave 025, run 0190): https://github.com/tmorin/archicode/blob/wave-025-hosted-editor/docs/wav/wav-025-hosted-editor/run/run-0190-plateau-fold-analysis/run-0190-plateau-fold-analysis.md
>
> **Recommendation: build later, and fix the manual's recipe now.** I ran `[[fold-by-hand]]` on a copy of the layered Brightcart (`inhouse` into `marketplace`) and compared `plateau list`, `diff` and `views generate` before and after. It works for a plateau with exactly one plateau above it, with two gaps in the recipe: (1) the `replaces` of the plateau above that name an element the folded plateau declared must be composed (on the fixture `discovery.search` replaces `commerce.search`, which `inhouse` declared; left as written, the entry is ignored with a warning, the move becomes new + removed, and the exit code is 0); (2) the cascade table changes in two columns (PLATEAU and PATCH, since the patches are renumbered), not one. With that repaired, every `diff` and every drawn view of every plateau that stays is the same before and after.
>
> Semantics settled: several plateaus above one: refuse and name them (folding into one changes the others; shown on a copy); siblings: untouched, only `--against <folded>` from outside breaks; `--archive`: none (it belongs to the other operation, "make the future the new root", which stays out); steps with `at`/`against` naming the plateau: refuse and list (the obvious rewrite gives two self-comparisons); `settings.current` naming it, the root and a leaf: refuse.
>
> Size: about one large run (a Java writer of YAML text that keeps comments and quotes is the cost; the command line has none). If built, do `plateau fold <id> --dry-run` first (plan and refusals, no writer), then the writer. Oracle for a build: `plateau list`, `diff` and `views generate` before and after, equal for every plateau that stays but for the PLATEAU and PATCH columns of the cascade.

### Comment posted (done-when item 5)

Posted on 2026-10-27 by the orchestrator with the author's explicit permission in the session, after pushing the branch `wave-025-hosted-editor` so that the link works: https://github.com/tmorin/archicode/issues/65#issuecomment-6453127180 (`gh issue view 65 --json comments` returns 4 comments). The text is the one above, unchanged.

### Not verified

- That the planned post-condition would also catch a patch with a `where` or a pattern that matches more once the plateau above is loaded with it: no such patch exists on the fixture, and none was built.
- The cause of the swap of `commerce.cart` and `commerce.catalog` in `query graph --plateau marketplace` after the fold (the drawn views are identical).
- The sizes under "Size" are estimates; no code was written.
- The editor was not run on the folded copy (only the command line).
