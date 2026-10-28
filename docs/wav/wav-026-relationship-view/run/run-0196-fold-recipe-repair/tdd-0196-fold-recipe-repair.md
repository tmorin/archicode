---
title: Fold recipe repair
type: tdd
status: draft
run: 0196
wave: 026
owner: tmorin
date: 2026-10-28
related:
  - 'gh:tmorin/archicode#65'
  - docs/wav/wav-026-relationship-view/wav-026-relationship-view.md
  - docs/wav/wav-025-hosted-editor/run/run-0190-plateau-fold-analysis/run-0190-plateau-fold-analysis.md
---

# Fold recipe repair

# Summary

The manual's recipe for folding a plateau into the one above by hand (`[[fold-by-hand]]`, `src/doc/README.adoc`) is wrong in three places, found by run 0190 on a copy of the layered Brightcart: it does not compose the `replaces` of the plateau above that name an element the folded plateau declared, it says one column of the cascade changes where two do, and its step 4 invites a rewrite that gives two plateaus compared with themselves. This design repairs the recipe and nothing else: a documentation change, proved by running the corrected recipe on a scratch copy of the layered Brightcart and recording `plateau list`, `diff` and `views generate` before and after. There is no PRD (profile TDD+pln); the sources are #65, the wave plan (W-2) and the Findings of run 0190, so traceability is incomplete (see PRD Traceability).

# Scope

In scope: the bullet `[[fold-by-hand]]` of `src/doc/README.adoc` (the four steps and the check paragraph that follows them), the sentence that points to it from the editor's refusal and from `[[plateau-limits]]` only if their wording becomes untrue, the before/after record in the run document of run 0196. Out of scope: any command (`plateau fold` stays unbuilt, #65 stays open), any change under `src/main`, `src/test`, `pom.xml`, `CLAUDE.md`, the editor's dialogs, the kernel, `--archive`, the operation "make the future the new root".

# PRD Traceability

No PRD. Requirements are taken from the wave plan (W-2 focus, P1 gate third criterion) and run 0190's Findings, labelled here so the plan can cite them:

- `REQ-1` (run 0190 finding 1): the recipe tells the reader to compose the `replaces` of the plateau above.
- `REQ-2` (run 0190 finding 2; P1 gate): the recipe names the two columns that change, PLATEAU and PATCH.
- `REQ-3` (run 0190 finding 3): step 4 does not lead to a plateau compared with itself and says that a step told at the folded plateau draws more afterwards.
- `REQ-4` (P1 gate): the run document records `plateau list`, `diff` and `views generate` before and after the corrected recipe on a copy of the layered Brightcart, equal but for those two columns.
- `REQ-5` (wave scope): the manual still builds and no shipped example or fixture changes.

All five are addressed. They are assumed rather than sourced from a PRD.

# Technical Goals

- TG-1: after the recipe, `diff --plateau later --against <parent of to-be>` has no warning about an ignored `replaces` and the same numbers as before (REQ-1, REQ-4).
- TG-2: the manual names the PLATEAU and PATCH columns, with the reason for the second (REQ-2).
- TG-3: step 4 tells the reader the replacement is a choice and gives the rule that avoids a self-comparison (REQ-3).
- TG-4: the claim "the table is the same, row for row" is true as written, on the fixture and on the example the manual cites (REQ-4).

# Non-Goals

- Building `plateau fold` or its dry run (the author has not asked; run 0190 recommends later).
- Moving the folded plateau's files out of their folder (the recipe says it is tidying and no tool complains).
- Fixing the order swap of `commerce.cart` and `commerce.catalog` in `query graph --plateau marketplace` after the fold (cause not looked for; the drawn views are identical; noted as a limit of `query graph` as a check).
- Any editor behaviour.

# Assumptions

- ASM-1: run 0190's observations hold on the working tree of this branch (same fixture, `archicode 0.21.0-SNAPSHOT`). Validated by redoing the run in Stage 10.
- ASM-2: a `replaces` entry names a reference of the plateau the manifest builds on (`[[plateau-replaces]]`); after the fold the plateau above builds on the parent of the folded plateau, so an entry naming an element the folded plateau declared names nothing. Validated by the observed warning in run 0190.
- ASM-3: every `replaces` of the plateau above sits in a manifest (`replaces:` in the content of an element) or in a patch (`value` of a `SET` on `replaces`). Validated for a manifest and for a `SET` patch in Stage 6 (Q-1); `ADD` and `MERGE` on `replaces` were not run.

# Constraints

- CON-1: the manual is Asciidoctor in `src/doc/README.adoc`; it builds in `./mvnw verify` (job `Java`) and an unresolved `<<id>>` must not appear. Examples quoted in it are `include::examples/...[]` of shipped, loaded files; this run adds none.
- CON-2: the manual's statements about the tools must be run, not guessed (the repository rule: what is shipped is tested); the corrected statements are proved by the before/after record.
- CON-3: the manual says what the tools do and do not do (`[[plateau-limits]]`); the recipe must keep saying that it is for one plateau above and that the folding loses a comparison, a views folder and the `against` of a step.
- CON-4: no change outside `src/doc/README.adoc` and `docs/wav/wav-026-relationship-view/run/run-0196-fold-recipe-repair/`; the scratch copies live outside the repository.

# Current State

`[[fold-by-hand]]` (line 1956 of `src/doc/README.adoc`) has four numbered steps: (1) change `plateau: "to-be"` to `"later"` in the manifests that say it, (2) in the plateau manifest of `later`, change `override` and put the `patches` of `to-be` in front of those of `later`, (3) delete the plateau manifest of `to-be`, (4) change every `at`, `against` and `plateau` naming `to-be`. The paragraph under it says to check with `plateau list` and `diff --plateau later --against baseline` before and after, that "the only line that changes is the column PLATEAU of the cascade" on a copy of `domain_plateaus` with the tutorial's plateau `later` (step 9 of the tutorial), and that it is for one plateau above. Two other places point to it: the editor's refusal paragraph (line 1563) and `[[plateau-limits]]` (line 1604). `CLAUDE.md` says only that the manual "tells how to fold by hand and checks it with `plateau list` and `diff`", which stays true.

Run 0190 ran the recipe on `src/test/resources/brightcart/layered` (`inhouse` into `marketplace`). `marketplace/application/discovery.yaml` says `discovery.search` replaces `commerce.search`, declared by `inhouse` (it replaces `shop.app.search`). After the recipe as written, `diff --plateau marketplace` printed a warning that `commerce.search` "is not an element of the base plateau, ignored", the move became new plus removed (`+39 ~3 -7`, 10 moved instead of `+38 ~3 -6`, 11 moved) and the exit code was 0. With the entry written as `shop.app.search`, everything above the cascade table and every `.puml` was byte for byte the same; the cascade had two columns different, PLATEAU and PATCH (the 23 patches of `marketplace` renumbered 27 to 49 behind the 26 of `inhouse`). Step 4 on the four steps naming `inhouse` (`fork_tour` 3, 4, 5, `seller_journey` 3) gave two self-comparisons when `inhouse` was replaced by `marketplace` everywhere.

# Proposed Design

A rewrite of the one bullet, in the manual's voice, with generic names (`to-be`, `later`, and invented references such as `shop.search`; no Brightcart content in the manual, the fixture is cited only in the run document). No diagram: the change is textual and touches one component.

The recipe gets one new step between the current 2 and 3 and rewrites the check and step 4:

1. Step 1 unchanged.
2. Step 2 unchanged, with its sentence on `override` and the order of the patches.
3. New step: compose the `replaces`. Look in the plateau `later` (its manifests and the `value` of its `SET` patches on `replaces`, Q-1) for a `replaces` entry that names an element `to-be` declared (an element with `plateau: "to-be"` in its header, or a nested one inside such an element). That entry names nothing once `to-be` is gone: `later` is now read over the plateau `to-be` overrode. Replace the entry by what that element itself replaced (its own `replaces`, in its manifest or set by a patch of `to-be`), or take it out when the element replaced nothing. Entries that name an element of the plateau below stay. Say what happens if forgotten: `archicode diff` prints `warning: replaces of ... is not an element of the base plateau, ignored`, exits 0 and reads the move as one new and one removed element.
4. Delete the manifest of `to-be` (current 3).
5. Steps of stories (current 4), rewritten: say the replacement is a choice; give the rule (`at: to-be` becomes `later`, but then the step draws `later`, which is `to-be` plus the layer above; an `against: to-be` becomes the plateau `to-be` overrode, or the key is dropped, because `later` against `later` is an error; the `plateau` of a view or story is read as nothing and may be left); keep the sentence that `archicode` lists the forgotten ones, one `error:` line each.
6. The check paragraph: run `plateau list`, `diff --plateau later --against <parent of to-be>` (an explicit `--against` both times, since the default `--against` of `later` is `to-be` before and the parent after) and `views generate`. State the result: `to-be` is gone, `later` has the parent `to-be` had; the text above the table and the `.puml` files are the same; the cascade table has the same rows and two columns differ, PLATEAU (the rows of `to-be` say `later`) and PATCH (the patches of `later` are numbered after those of `to-be`); `gap.md` and `gap.json` differ in those two columns only. Add: a `warning: replaces ... ignored` after the fold means step 3 was missed; `query graph` is not a byte check (the order of siblings declared in two files of the folded plateau can change). Keep the closing sentences (one plateau above only; what the fold loses).

The sentence about `domain_plateaus` is kept only if reproduced in Stage 10 (see DEC-4, Q-2).

# Repository Impact

- IMP-1 — The fold bullet of the manual
  - Path(s): `src/doc/README.adoc` (bullet `[[fold-by-hand]]`, about 8 lines)
  - Change type: modify
  - Why impacted: REQ-1 to REQ-3.
  - Linked PRD IDs: REQ-1, REQ-2, REQ-3
  - Risks / notes: keep the anchor name (`CLAUDE.md`, the editor's refusal and `[[plateau-limits]]` link to it); the bullet is a list item inside a list, so the `+` continuations and the numbering must keep rendering as a nested ordered list.
- IMP-2 — Neighbouring wording
  - Path(s): `src/doc/README.adoc` lines near 1563 and 1604
  - Change type: modify only if needed
  - Why impacted: they say folding is "done by hand" and "tells how to fold"; they stay true. Changed only if the new step makes a sentence there false.
  - Linked PRD IDs: REQ-5
  - Risks / notes: expected no change.
- IMP-3 — The run document
  - Path(s): `docs/wav/wav-026-relationship-view/run/run-0196-fold-recipe-repair/run-0196-fold-recipe-repair.md`
  - Change type: additive
  - Why impacted: the P1 gate reads the before/after record from it (REQ-4).
  - Linked PRD IDs: REQ-4
  - Risks / notes: the record names the commands, the scratch path outside the repository and the diff of outputs, not their full text.

# Canonical Impact

Not applicable — no canonical registers declared (`docs/CLAUDE.md` does not exist in this repository, and the wave says neither the `docs/bkg` nor the `docs/ana` register exists).

# Data Model and Contracts

CTR-1 — The manual's statement of the fold's invariant
  - Current contract: "the table is the same, row for row"; "the only line that changes is the column PLATEAU".
  - Proposed contract: for every plateau that stays, `plateau list` and `diff` (explicit `--against`) and the drawn views are equal before and after, but for the PLATEAU and PATCH columns of the cascade of the removals (and the `gap.*` files that carry them), provided the `replaces` are composed.
  - Affected files: `src/doc/README.adoc`.
  - Migration or compatibility notes: no tool, file format or command changes. A reader who folded by the old recipe may have an ignored `replaces` warning; the new text tells them what it means.
  - Linked PRD IDs: REQ-1, REQ-2, REQ-4

No schema, API or file-format contract changes.

# Interfaces and Behavior

The interface is the recipe as a reader follows it: input a workspace with `to-be` overridden by exactly one plateau `later`; output a workspace where `to-be` is gone and `later` stands on its former parent. Error states the text covers: an ignored `replaces` (warning, exit 0), an `at` or `against` naming `to-be` (one `error:` line each), `later` compared with itself (one `error:` line), a plateau overriding `to-be` besides `later` (`plateau list` fails: "overrides to-be, which is not a plateau of this workspace"; the text keeps its "keep it" advice and adds that the tools say so loudly).

# Flows and Processing Logic

- FLOW-1 — Run the corrected recipe on the fixture (Stage 10, not in the manual)
  - Trigger: implementation of the plan.
  - Steps: (1) copy `src/test/resources/brightcart/layered` to a scratch folder outside the repository, twice (`before`, `after`); (2) record in `before`: `plateau list`, `diff --plateau P --against Q` for P, Q in `baseline`, `inhouse`, `marketplace`, `saas`, `views generate --plateau marketplace --against baseline`; (3) in `after`, do the six steps of the new text for `inhouse` into `marketplace`, writing `discovery.search`'s entry as `shop.app.search`; (4) record the same commands with `inhouse` removed from the pairs; (5) compare: stdout, stderr and exit codes, and the files of `views-marketplace*`; the differences must be the PLATEAU and PATCH columns of the cascade and the `inhouse` rows; (6) repeat step 3 without the `replaces` composition and record the warning and the changed numbers, so the manual's sentence about it is observed, not copied.
  - Branches / failure paths: any other difference stops the run and is analysed before the manual says "the same"; a stderr warning other than the expected one is a finding.
  - Final output / rendered result: a table in the run document, one row per command, and the verdict.
  - Linked PRD IDs: REQ-1, REQ-2, REQ-4
- FLOW-2 — Run the recipe on the example the manual cites
  - Trigger: the same stage.
  - Steps: copy `src/doc/examples/domain_plateaus`, add the plateau `later` of tutorial step 9 (the two files the manual prints), fold `to-be` into it, compare `plateau list` and `diff --plateau later --against baseline` before and after.
  - Branches / failure paths: if the observed difference is not "PLATEAU and PATCH only", the sentence is rewritten to what is observed.
  - Final output / rendered result: a row in the same table.
  - Linked PRD IDs: REQ-2, REQ-4

# Reliability, Performance, and Scalability

Not relevant beyond correctness of the text: the failure mode of the old recipe was silent (exit 0 and changed numbers). The new text names the warning to look for. The recipe stays a by-hand procedure for one plateau above; no scalability claim is made.

# Security and Privacy

Not relevant. The scratch copies hold fixture content only.

# Observability and Verification

- Stage 10 runs FLOW-1 and FLOW-2 with the packaged application of the working tree (`./mvnw package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true` if `target/quarkus-app` is stale; `JAVA_HOME` names JDK 25) and records the table in the run document.
- The manual builds: `./mvnw verify` in the job `Java`; locally, the manual step of the build (`asciidoctor` in `generate-resources`, TBD at implementation which phase produces `target/generated-docs`) and a check that the output holds the anchor `fold-by-hand` and renders the list as nested ordered items.
- `git status` shows changes only in `src/doc/README.adoc` and the run's directory.
- `ManualExamplesTest` and `ShippedFilesTest` run unchanged (no example touched); not required to re-run unless an include changes.
- `check_run.py` on the run directory at close (the wave's convention).

# Deployment and Rollout

Documentation only; the manual is published at `/docs/` by the tag run. Not proved by this run: that publication. Rollback: revert the commit. No compatibility concern.

# Risks and Tradeoffs

- RISK-1: the composition rule is proved on one entry (`discovery.search`); chains of three plateaus, an entry in a patch `value`, and an entry that names a nested element of the folded plateau are not observed. Mitigation: Q-1 observed the patch case; the text states the rule for what was observed and says the warning is the sign of a miss.
- RISK-2: the manual could now over-promise ("the same") for a workspace where a patch of `to-be` selects by pattern and matches more once `later`'s elements are loaded (run 0190, not met on the fixture). Mitigation: the check paragraph tells the reader that the check is the proof, and the recipe is "for a plateau with one plateau above it" as before.
- RISK-3: the step numbering change breaks a reference from another document to "step 4". Mitigation: grep for it in the manual, `CLAUDE.md`, `docs/` before editing (none found by name in this draft: references are to the anchor only).
- Tradeoff: a longer bullet (about 14 lines instead of 8) in a manual that is already dense, accepted since each added sentence is a failure observed on the fixture.

# Open Questions

None open. Both were resolved in Stage 6 by running the packaged application of the working tree (`target/quarkus-app`, JDK 25) on scratch copies outside the repository (see Resolved Questions).

## Resolved Questions

- Q-1 (resolved, observed): a `replaces` set by a patch is composed the same way as one in a manifest. On a copy of the layered Brightcart where `marketplace` set `discovery.search`'s `replaces` with a patch (`SET`, `field: replaces`, `value: ["commerce.search"]`) and no manifest key: before the fold `diff --plateau marketplace --against baseline` read `+38 ~3 -6`, 11 moved; after the fold with that value left as `commerce.search`, `warning: replaces of discovery.search (application layer): commerce.search is not an element of the base plateau, ignored`, exit 0, `+39 ~3 -7`, 10 moved; with the value changed to `shop.app.search` the output equals the before copy but for the cascade rows of `inhouse` and `marketplace` (PLATEAU and PATCH columns). The other side also holds: with the folded element's own `replaces` set by a patch of `inhouse` (`SET` on `commerce.search`, a layer may patch its own elements) and none in its manifest, the entry of `marketplace` composed to that patch's value gave the same numbers (`+38 ~3 -6`, 11 moved) and no warning. Consequence: step 3 says "manifests and patches" for both where to look for the entry in `later` and where to read what the folded element replaced. Not observed: a chain of three plateaus, an entry naming a nested element of the folded plateau (RISK-1 stays).
- Q-2 (resolved, observed): the sentence on `domain_plateaus` holds in part. On a copy of the example with the two files of tutorial step 9 (the plateau `later` over `to-be`), folding `to-be` into `later` (five steps, no `replaces` to compose, the two `at: "to-be"` of `story.migration.yaml` set to `later`; the step compared with `to-be` told at `later` then compares `later` with `baseline`), `plateau list` shows `baseline` and `later` (parent `baseline`), exit 0, and `diff --plateau later --against baseline` is byte for byte the same but for the three cascade rows that said `to-be` and now say `later` (the PLATEAU column). The PATCH column does not move here because the only patch of `later` (`REMOVE shop.checkout`) has no row in the cascade, so the example shows PLATEAU alone. Consequence: the manual's sentence about the example is kept as "the column PLATEAU", with the added sentence that PATCH changes too when a row of the plateau above has a patch number, which the layered Brightcart shows (rows of `marketplace` renumbered 1, 2 to 27, 28, 36). The comparison before is `later` against `baseline` both times, an explicit `--against`.

# Decisions

- DEC-1 — Repair the text, build nothing
  - Decision: change `src/doc/README.adoc` only.
  - Rationale: the wave's non-goals and run 0190's recommendation ("build later, fix the manual now"); the repair costs nothing and removes the one silent failure.
  - Alternatives considered: `plateau fold --dry-run` now (rejected: the author has not asked; the writer is the cost); close #65 (the author's call, not this run's).
  - Tradeoffs: the reader still folds by hand.
  - Linked PRD IDs: REQ-1 to REQ-3
- DEC-2 — Compose by substitution, in the manual's words
  - Decision: the new step says to replace an entry that names an element `to-be` declared by the entries of that element's own `replaces`, or drop it if none.
  - Rationale: it is the rule the kernel applies before the fold (composition of the chain, rule 8 of `compare.rs`) written as a file edit, and it gave the same numbers on the fixture.
  - Alternatives considered: tell the reader to keep `to-be` and compare with `--against` the plateau above (does not fold); tell the reader to add the folded element's references to the entry in addition (would give a duplicate and a different identity).
  - Tradeoffs: it needs the reader to read the folded element's `replaces`; the text says where to look.
  - Linked PRD IDs: REQ-1
- DEC-3 — Always pass an explicit `--against` in the check
  - Decision: the check compares `later` with the parent of `to-be` by name, before and after.
  - Rationale: the default `--against` of `later` changes from `to-be` to the parent, so a default-to-default comparison compares two different pairs (observed in run 0190).
  - Alternatives considered: compare defaults and explain; rejected as the source of the old confusion.
  - Tradeoffs: none.
  - Linked PRD IDs: REQ-2, REQ-4
- DEC-4 — The record of the run is the evidence, the manual quotes only observed sentences
  - Decision: every sentence of the new text that says what a tool prints is taken from a recorded output of FLOW-1 or FLOW-2.
  - Rationale: CON-2 and the repository rule that stated behaviour is pinned by a run.
  - Alternatives considered: copy run 0190's sentences (they were observed on the same fixture, but on an earlier build).
  - Tradeoffs: a second run of the same commands.
  - Linked PRD IDs: REQ-4

# Deferred Work

- DEF-1: `plateau fold <id> --dry-run` and the writer (run 0190 sizes it at one large run, two if split); waits for the author.
- DEF-2: the cause of the sibling order swap in `query graph` after a fold.
- DEF-3: a note on #65 that the recipe is repaired (the wave's completion criteria; posting a comment is publishing and needs the author's permission in the session).

# File Placement and Frontmatter

This file: `docs/wav/wav-026-relationship-view/run/run-0196-fold-recipe-repair/tdd-0196-fold-recipe-repair.md`, `type: tdd`, `run: 0196`, `wave: 026`, as the TDDs of wave 025.

# Review pass

Review pass: dispatched. Stage 5 ran `review-kdmllc-content` over this TDD in an agent other than the drafter of Stage 4 (a leaf agent has no `Agent` tool, so the reviewer worked in its own fresh context; it is independent of the drafting). Referent read for C: `src/doc/README.adoc` (bullet `fold-by-hand` at line 1956, neighbours at 1563 and 1604, tutorial step 9 at 1434), `compare.rs` rule 8, `pom.xml` (asciidoctor `process-asciidoc` in `generate-resources`, `plugin.asciidoctor.skip`), run 0190's document and prg, the wave plan (W-2, P1). Verdict: Acceptable overall, no S3; the findings F-1 to F-7 are logged in `prg-0196-fold-recipe-repair.md` and returned to the main agent, who applies them.
