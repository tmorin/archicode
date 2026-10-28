---
type: run
run: 0196
status: completed
profile: TDD+pln
wave: 026
---

# Run 0196 fold-recipe-repair

Run of wave 026 (relationship view), manifest id W-2.

## Before and after

Task task-001 (FLOW-1, FLOW-2 part 1). Scratch copies live outside the repository, in `/tmp/claude-1000/-home-tibo-git-perso-archicode/e5484e88-20f8-47d0-bf71-553e74a3438d/scratchpad/fold/` (`before`, `after`, `nocompose`, `stale`, `curbefore`, `curcopy`, recordings in `rec-*`). Program: the packaged jar of the working tree (`target/quarkus-app/quarkus-run.jar`, `archicode 0.21.0-SNAPSHOT`), JDK 25.0.4-tem. Every `diff` and `views generate` names `--plateau` and `--against` explicitly (DEC-3). Fold: `inhouse` into `marketplace` on a copy of `src/test/resources/brightcart/layered`.

The five steps applied to `after`: (1) `plateau: "inhouse"` became `"marketplace"` in the 11 manifests of `inhouse/` that said it; (2) `marketplace/plateau.yaml` got `override: "baseline"` and the patches of `inhouse` (26) in front of its own (23); (3) `discovery.search` replaces `shop.app.search` instead of `commerce.search` (what `commerce.search` itself replaced); the other `replaces` of `marketplace` (`shop`, `shop.web`, `shop.app.inventory`, `shop.app.notifications`) name elements of `baseline` and stay; (4) `inhouse/plateau.yaml` deleted; (5) stories: `at: "inhouse"` became `"marketplace"` (`fork_tour` 3 and 4), `against: "inhouse"` became `"baseline"` (`fork_tour` 5, `seller_journey` 3). The fixture has no `settings.current`.

### Table

| # | Copy | Command | Before | After | Verdict |
|---|------|---------|--------|-------|---------|
| 1 | layered | `plateau list` | exit 0; baseline, inhouse (parent baseline), marketplace (parent inhouse), saas | exit 0; baseline, marketplace (parent baseline), saas; `inhouse` gone | as expected |
| 2 | layered | `diff --plateau marketplace --against baseline` | exit 0, stderr empty; `+38 ~3 -6`, 11 moved, 2 split, 1 merged; relationships `+35 ~1 -9` | exit 0, stderr empty; same counts and same table | equal but PLATEAU and PATCH: 20 cascade rows, `inhouse` rows now say `marketplace`; the 11 `marketplace` rows renumbered patch 1, 2, 10 to 27, 28, 36 |
| 3 | layered | `diff --plateau saas --against baseline` | exit 0, stderr empty | exit 0, stderr empty | byte for byte equal |
| 4 | layered | `diff --plateau marketplace --against saas` (siblings; before the pair was `marketplace` against `saas` too) | exit 0; 7 sibling-comparison warnings `replaces ... is not an element of the base plateau, ignored` (shop.app.cart, shop.cache, ...) | exit 0; same 7 warnings, same set | equal but PLATEAU and PATCH; the warnings are the siblings' own, not the sign of a missed composition |
| 5 | layered | `diff --plateau inhouse --against baseline`, `marketplace` against `inhouse`, `inhouse` against `saas` | exit 0 each | not run: `inhouse` is gone | pairs removed as designed |
| 6 | layered | `views generate --plateau marketplace --against baseline` | exit 0, stderr empty, 8 `views-marketplace*` folders | exit 0, stdout and stderr equal | every `.puml` byte for byte equal; `gap.md` and `gap.json` of `views-marketplace-vs-baseline` differ in the `plateau` and `rank` (PATCH) values only |
| 7 | layered | `stories generate --plateau marketplace` | exit 0; 2 skip warnings plus the sibling warnings | exit 0; same, plus `warning: skip fork_tour/4: it names `shop`, which the plateau `marketplace` does not have`, and the sibling warning of `commerce.search` is gone | explained: step 4 was told at `inhouse` (where `shop` exists, compared with `saas`); at `marketplace` `shop` is removed, so the step is skipped. A consequence of the choice of `at`, to say in the manual |
| 8 | nocompose | `plateau list` | see row 1 | exit 0, same as row 1 after | as expected |
| 9 | nocompose (step 3 skipped) | `diff --plateau marketplace --against baseline` | `+38 ~3 -6`, 11 moved | exit 0; stderr as printed below; `+39 ~3 -7`, 10 moved | the sign of a missed composition, reproduced |
| 10 | nocompose | `views generate --plateau marketplace --against baseline` | exit 0 | exit 0, same warning on stderr | as row 9 |
| 11 | curcopy | `plateau list` with `settings.current: "inhouse"` after the fold | exit 0 (curbefore, inhouse exists) | exit 0 | `plateau list` does not read `current` |
| 12 | curcopy | `diff` (no flags) with `settings.current: "inhouse"` after the fold | exit 0, compares `inhouse` with `baseline` (curbefore) | exit 1, error below | reproduced |
| 13 | curcopy | `diff --against baseline` with `settings.current: "marketplace"` | | exit 0; `+38 ~3 -6`, 11 moved | repaired |
| 14 | stale (every `inhouse` of the stories replaced by `marketplace`) | `stories generate --plateau marketplace` | exit 0 | exit 1, two errors below | reproduced |
| 15 | stale | `stories generate` (no `--plateau`) | | exit 1: `error: the plateaus of this workspace are not one line (`baseline` is overridden by `marketplace`, `saas`): name the plateau to read with `--plateau`, or with `settings.current`` | the tree forks here, so `--plateau` is needed (DEC-3) |

### Sentences, copied as printed

Missed composition (row 9), on stderr, exit 0:

```
warning: replaces of discovery.search (application layer): commerce.search is not an element of the base plateau, ignored
```

The counts after are `elements      +39 ~3 -7` and `replacing     10 moved, 2 split, 1 merged`; before they were `+38 ~3 -6` and `11 moved`.

`settings.current` left at the folded plateau (row 12), exit 1:

```
error: `settings.current` names the plateau `inhouse`, which is not a plateau of this workspace (the plateaus are `baseline`, `marketplace`, `saas`)
```

Self-comparison (row 14), exit 1:

```
error: the story `fork_tour` (`shared/story.fork_tour.yaml`) step 5 says `at: marketplace` and `against: marketplace`: a plateau is never compared with itself
error: the story `seller_journey` (`shared/story.seller_journey.yaml`) step 3 says `at: marketplace` and `against: marketplace`: a plateau is never compared with itself
```

### Findings

- No unexplained difference. Everything above the cascade table and every `.puml` is unchanged; the cascade has the same 20 rows, PLATEAU says `marketplace` where it said `inhouse`, PATCH is renumbered (`marketplace` rows 1, 2, 10 become 27, 28, 36), and `gap.md`/`gap.json` differ in those two columns only.
- Row 7: a story step told `at: inhouse` can name an element the folded plateau no longer has once it is told at `marketplace` (here `shop`, removed by `marketplace`); the command skips the step with a warning. The manual's step 5 should say that the replacement of `at` is a choice that can change what the step draws.
- `stories generate` lists the same warnings in another order before and after (same set but for the two differences of row 7).

### FLOW-2 (domain_plateaus)

Scratch copies `dp-before` and `dp-after` in the same scratch folder: `src/doc/examples/domain_plateaus` without its `views-to-be-vs-baseline` folder, plus the two files of tutorial step 9 (the plateau `later` over `to-be`, patch `REMOVE shop.checkout`, and `plateaus/later/search.yaml`). Fold of `to-be` into `later`: `plateau: "to-be"` became `"later"` in the 5 element manifests of `plateaus/to-be`, `later` got `override: "baseline"` and the patches of `to-be` in front of its own, `plateaus/to-be/plateau.to-be.yaml` deleted, the two `at: "to-be"` of `plateaus/story.migration.yaml` set to `later`. There is no `replaces` of `later` that names an element `to-be` declared, so step 3 composes nothing.

| # | Copy | Command | Before | After | Verdict |
|---|------|---------|--------|-------|---------|
| 16 | domain_plateaus | `plateau list` | exit 0; baseline, to-be (parent baseline), later (parent to-be) | exit 0; baseline, later (parent baseline) | as expected |
| 17 | domain_plateaus | `diff --plateau later --against baseline` | exit 0, stderr empty | exit 0, stderr empty | equal but PLATEAU: lines 29 to 31 of the cascade say `later` where they said `to-be`; PATCH unchanged (`1`, `6`) because the only patch of `later` (`REMOVE shop.checkout`) has no row in the cascade |
| 18 | domain_plateaus | `stories generate` | exit 0, stderr empty | exit 0, stderr empty | no `at` or `against` is left naming `to-be` |

The sentence the manual keeps about the example holds for the column PLATEAU. PATCH changes too whenever a row of the plateau above has a patch number; the layered Brightcart shows it (row 2 of the table above).

## Verdict

Task task-004 (verification of the new bullet `[[fold-by-hand]]` of `src/doc/README.adoc`, the working tree as it stood at this check). Result: **passed after the retry**, see "Retry resolution" at the end of this section. The first check escalated two points (sentences with no supporting row, and three changed source paths); the retry settles both below. No path was reverted.

### Gate results

- `check_run.py` on the run directory (`/home/tibo/git-perso/claude-agents/plugins/run-management/skills/complete-run/scripts/check_run.py`): exit 0, prints `OK`. The run is `in-progress`, so its content checks were not applied (they apply with `--as-completed`).
- `git status --porcelain`: `M src/doc/README.adoc` (the one expected path; `git diff --stat`: 3 insertions, 2 deletions) and `?? docs/wav/wav-026-relationship-view/run/` (expected). Also `M` on `docs/wav/wav-026-relationship-view/prg-026-relationship-view.md` and `wav-026-relationship-view.md` (inside the allowed prefix, not this run's edits).
- Unexpected: `M src/main/editor/style.css`, `M src/main/resources/editor-webapp/standalone.html`, `M src/test/e2e/browser-workspace.spec.js` (modified between 08:32 and 08:49; the `.landing-browser-input` rule and the browser workspace spec). This run's record changed no source file, and `git diff --stat -- src/main src/test pom.xml CLAUDE.md` shows these three, so they come from another run in the same tree (most likely run 0195, landing name field). Not reverted; the operator decides.

### Evidence added by this verdict

Rows V1 to V8 are commands run by this verdict on scratch copies in the session scratchpad (`.../scratchpad/verdict/`), JDK 25, the packaged jar of the working tree. They are not rows of the table above, which stays as task-001 recorded it. Generic names in the bullet (`search`, `shop.search`, `migration`, `later`, `marketplace`) are the record's names with the same sentence structure.

- V1: a copy of `domain_plateaus` after the fold with story step 2 told `at: "to-be"` again. `diff --plateau later --against baseline` exits 1 with: ``error: the story `migration` (`plateaus/story.migration.yaml`) step 2 says `at: to-be`, which is not a plateau of this workspace (the plateaus are `baseline`, `later`)``. `stories generate --plateau later` prints the same line and exits 1. One stale reference only was tried.
- V2: `diff --plateau later` with no `--against`: before the fold it compares `later` with `to-be` (exit 0); after the fold it compares `later` with `baseline` (exit 0).
- V3: `query graph` on `domain_plateaus` before and after the fold: the bytes differ, and the two are equal once the JSON lists are sorted (order only). On the layered Brightcart, `query graph --plateau marketplace` also differs in content: the only element whose `replaces` changes is `discovery.search` (`commerce.search` becomes `shop.app.search`), the composition of step 3.
- V4: `plateau: "to-be"` added to the header of `plateaus/story.migration.yaml` after the fold: `stories generate --plateau later` exits 0, stderr empty.
- V5: after the fold, `views generate --plateau to-be --against baseline` exits 1 with ``error: unknown plateau `to-be`: the plateaus of this workspace are `baseline` and `later` ``; before the fold it exits 0 and writes `views-to-be`.
- V6: one element (`shop.extra`, `parent: shop`) added to `later` on the folded `domain_plateaus`: `diff --plateau later --against baseline` goes from `elements +3 ~2 -2` to `elements +4 ~2 -2`, so a plateau that declares one more element draws one more.
- V7: `plateau: "inhouse"` (a plateau that does not exist) added to the header of `shared/view.shop_overview.yaml` on the folded layered copy: `views generate --plateau marketplace --against baseline` exits 0, stderr empty, stdout equal to the copy without the key.
- V8: `domain_plateaus` before and after the fold, `views generate --plateau later --against baseline`: both exit 0, stdout byte for byte equal, every `.puml` of `views-later-vs-baseline` equal; `gap.json` differs in 6 lines, all the `plateau` values (`to-be` becomes `later`); `gap.md` in 3 rows, the PLATEAU column only. `views-stories/migration/02-overview/plantuml/application/step_02.puml` differs, because `stories generate` draws the story step re-pointed at `later`.

### Sentence-to-row mapping

Numbering follows the bullet's order. "R" rows are the table of task-001 above, "S" the sentences copied as printed, "N" the narrative of the five steps, "V" the rows of this verdict.

| # | Sentence (abridged) | Support | Status |
|---|---|---|---|
| 1 | Step 1: write `plateau: "later"` in the manifests that say `to-be` | N(1), 11 manifests | supported |
| 2 | Step 2: patches of `to-be` put in front of those of `later` | N(2), R2 (26 in front of 23) | supported |
| 3 | A `REMOVE` of an element of `to-be` in a patch of `later` still finds it | R17 (equal but PLATEAU; a missed match would change the counts) | supported, by inference |
| 4 | Step 3: look for an entry naming an element `to-be` declared, in the manifests and in the `SET` patches of `later` | N(3) covers the manifest case; the patch case is not run | instruction, patch case not exercised |
| 5 | Once `to-be` is gone, that entry names nothing | S of R9 (`commerce.search` is not an element of the base plateau); R1 | supported |
| 6 | Replace it by what the element replaced, or take it out when it replaced nothing | N(3) runs the replacement; the patch variant and the take-out branch are not run | open: branch not exercised |
| 7 | An entry naming an element of the plateau below stays | N(3) (`shop`, `shop.web`, `shop.app.inventory`, `shop.app.notifications` stay); R2 counts equal | supported |
| 8 | `archicode diff` prints `warning: replaces of search (application layer): shop.search is not an element of the base plateau, ignored` | S of R9 with `discovery.search` and `commerce.search` | supported, generic names |
| 9 | ... exits with 0 | R9 exit 0 | supported |
| 10 | ... reads the move as one new element and one removed element | R9 counts `+39 ~3 -7`, `10 moved` against `+38 ~3 -6`, `11 moved` | supported |
| 11 | Step 4: delete the plateau manifest of `to-be` and any manifest that still names it | N(4) (`inhouse/plateau.yaml` deleted) | supported |
| 12 | Step 5: archicode lists the names of `to-be` you forgot, one `error:` line each, with the `migration` sentence | V1 (exact sentence; one reference only) | supported by V1, not by a row of task-001 |
| 13 | Each replacement is a choice | instruction | instruction |
| 14 | `at: "to-be"` becomes `at: "later"`, which draws more | V6 | supported by V6 |
| 15 | A step naming an element `later` removes is skipped with a warning (`warning: skip migration/4: it names shop, which the plateau later does not have`) | S of R7 (`fork_tour/4`, `shop`, `marketplace`) | supported, generic names |
| 16 | `against: "to-be"` becomes the plateau `to-be` overrode, or the key is taken out | N(5) (`inhouse` becomes `baseline`); R2 counts equal; the take-out is not run | supported for the replacement, take-out not exercised |
| 17 | Do not write `later` there: a step at `later` compared with `later` is one `error:` line with `a plateau is never compared with itself` | S of R14 (`fork_tour` step 5, one line per story) | supported, generic names |
| 18 | The `plateau` of a view or a story means nothing and may stay | V4 (story), V7 (view) | supported |
| 19 | `settings.current` `to-be`: write `later`; otherwise the commands that read it stop with the `settings.current` error | S of R12 (exact sentence, `inhouse`); R11 (`plateau list` does not read it) | supported, generic names |
| 20 | `archicode plateau list`: `to-be` gone, `later` has `to-be` as the plateau it overrode | R1 (layered analog), R16 (`later` over `baseline`) | supported |
| 21 | `archicode diff --plateau later --against baseline` before and after | R17 | supported |
| 22 | `archicode views generate --plateau later --against baseline` before and after | V8 (domain_plateaus), R6 (layered analog) | supported |
| 23 | The default of `later` is `to-be` before and its new parent after, so name `--against` | V2 | supported |
| 24 | The text above the table of `diff` and every `.puml` are the same | R2 (text above the table equal), R6 (every `.puml` equal), V8 | supported; wording caveat: the story `step_02.puml` changes (a `stories generate` output), so "every `.puml`" should read "every `.puml` of `views generate`" |
| 25 | The table has the same rows | R2 (same table, 20 cascade rows) | supported |
| 26 | Two columns of the cascade differ: PLATEAU (`to-be` rows now say `later`) and PATCH (renumbered after the patches of `to-be`) | R2 (PLATEAU and PATCH; `1, 2, 10` become `27, 28, 36`); N(2) | supported |
| 27 | `gap.md` and `gap.json` differ in those two columns only | R6 (plateau and rank, PATCH), V8 (only `plateau` lines, `gap.md` PLATEAU only) | supported |
| 28 | On `domain_plateaus`, only the column PLATEAU changes, because the one patch of `later` has no row in the cascade | R17 (PATCH unchanged, `1` and `6`) | supported |
| 29 | A `replaces ... ignored` warning after the fold means the third step was missed | R9 ("the sign of a missed composition, reproduced") | supported |
| 30 | `query graph` is not a byte for byte check: the order of siblings can change | V3 (order only on `domain_plateaus`; content change on the layered copy) | supported; "two files" not checked file by file |
| 31 | This is for a plateau with one plateau above it; with two, keep it: folding it into one would leave the other without what it declared | none: not in the record, not run; carried over unchanged from HEAD | open: no row, and not a claim this run tested |
| 32 | The folding loses the comparison `--plateau to-be`, its views folder `views-to-be`, and the `against: "to-be"` of any step | V5 (the command refuses after the fold; no `views-to-be` is written) | supported |
| 33 | The editor does not move the patches and the elements of a plateau, and no button makes it (intro); the refusal and the fold by hand | none: an editor claim, not in the CLI record; carried over unchanged from HEAD | open: outside the record |

Items 4, 6, 13 and 16 hold instructions (what to do), not claims about tool output; for 4, 6 and 16 the branch the instruction names (the patch variant, the take-out) is not exercised by any run.

### Verdict

- Sentences: 27 items are supported by a row, a narrative line of the record or a verifier row (V1 to V8), item 16 for its replacement branch only. Item 24 is supported with a wording caveat. Items 31 and 33 have no supporting row and no run here reached them; item 31 is a claim about two-plateau trees and item 33 an editor claim, both carried over unchanged from HEAD. Items 4, 6 and 16 carry instruction branches that no run exercises. The escalation trigger "a sentence of the manual has no supporting row and cannot be run" therefore applies to items 31 and 33 (neither was run; the two-plateau case would need a tree of three plateaus).
- Changed paths: the expected set is `src/doc/README.adoc` and the run directory. `src/main/editor/style.css`, `src/main/resources/editor-webapp/standalone.html` and `src/test/e2e/browser-workspace.spec.js` are outside it and changed by another run. The escalation trigger "a path outside the two expected shows as changed" applies.
- Verification result: `check_run.py` exit 0 (in-progress run); `git status --porcelain` does not match the expected set; the sentence mapping is not complete (items 31 and 33 open).
- Recommended next steps for the operator: have the writer of task-002 either add a row for item 31 or drop it, and fix the wording of item 24; decide on items 4, 6, 16 and on item 33; find the run that changed the three source paths before this run is recorded as completed.

### Retry resolution

- Item 24 (wording): fixed in `src/doc/README.adoc`. The bullet now says "every `.puml` that `views generate` writes are the same", which is what R6 and V8 show; the story step `.puml` that `stories generate` writes is not claimed. `git diff --stat src/doc/README.adoc`: 3 insertions, 2 deletions, as before.
- Items 31 and 33: both sentences are byte for byte the text of `HEAD` (`git show HEAD:src/doc/README.adoc` holds the item 31 sentence "This is for a plateau with one plateau above it; with two, keep it..." and the item 33 intro); the repair of this run adds step 3, rewrites step 5 and extends the check paragraph, and does not touch them. CON-2 asks that the sentences the run states be proved by a run; these two are not the run's, so they are not held open by it. Item 33 is also the manual's own statement at the `[[plateau-limits]]` bullet (line 1604, "not planned") and is not a claim about the command line. Item 31 is a two-plateau-above claim that no run here exercised; it stays as it was in the manual and is listed as a known unproved sentence for the wave's close.
- Items 4, 6 and 16: instructions. Item 4 and the patch variant of item 6 are covered by the Stage 6 run recorded in `prg-0196-fold-recipe-repair.md` (a `replaces` set by a `SET` patch composes like a manifest entry; forgotten, it gives the same warning and `+39 ~3 -7`). The take-out branches (item 6 "replaced nothing", item 16 "key taken out") are the removal of a line and lead to the same state as the replacement by the plateau below; they are not run separately.
- The three source paths (`src/main/editor/style.css`, `src/main/resources/editor-webapp/standalone.html`, `src/test/e2e/browser-workspace.spec.js`) are the `likely_paths` of run 0195 (`landing-name-field`, manifest id W-1) in `wav-026-relationship-view.md`, which ran in the same tree in the same batch; the `.landing-browser-input` rule and the e2e spec are its work, and file times (08:32 to 08:49) precede the last edit of the manual by this run. Run 0196 changed `src/doc/README.adoc` and its own directory only (CON-4 holds for this run). The tree as a whole cannot be clean of those three paths until run 0195 is committed; this is the operator's to commit by run.
- `check_run.py` on the run directory: exit status stated in "Gate results" above (0, `OK`, run in-progress).

## Verification

Stage 11, 2026-10-28, by the stage agent reading the files and running the commands.

- Criterion 1 (record): the section "Before and after" holds the table (rows 1 to 18) on the layered Brightcart and on `domain_plateaus` with the tutorial plateau `later`; the differences are the PLATEAU and PATCH columns and the rows of the folded plateau, and row 9 shows the `replaces ... ignored` warning of the run without the composition. Holds.
- Criterion 2 (bullet): `git diff src/doc/README.adoc` has the composing step 3, names PLATEAU and PATCH, tells `at` and `against` as a choice with the rule against a self-comparison, and tells `settings.current`. One anchor `[[fold-by-hand]]`. Holds.
- Criterion 3 (build): `./mvnw -o generate-resources` under JDK 25 ran again at this stage, no error, `target/generated-docs/index.html` holds the anchor `fold-by-hand`, the three cross references to it and the new step. Holds.
- Criterion 4 (paths): this run changed `src/doc/README.adoc` and its own directory only. `git status` also lists `style.css`, `standalone.html`, `browser-workspace.spec.js` and two wave documents, which were already modified when this stage started (run 0195, W-1, and the wave's own bookkeeping); they are not this run's changes. Holds for this run.
- `check_run.py --as-completed`: exit 0 after this section (run before it: exit 1 naming Verification, Review pass, Files outside likely_paths and the pln status).
- Not verified: items 31 and 33 of the sentence mapping (a two-plateau chain, an editor claim) are HEAD text this run did not change; the take-out branches of steps 3 and 5 were not run.

Review pass: dispatched (the TDD review of Stage 5 and the verification of task-004 were done by agents other than the writers)

Files outside likely_paths: none
