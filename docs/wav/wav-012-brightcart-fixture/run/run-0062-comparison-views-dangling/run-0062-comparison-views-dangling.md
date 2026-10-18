---
type: run
run: 0062
status: completed
wave: 012
---

# Run 0062: Comparison views dangling

Wave 012 (`brightcart-fixture`), item W-3 (phase P2). Focus: generate the comparison views of a plateau whose elements replace others, instead of stopping on a dangling reference.
Document profile: `single-document` (the scope arrives settled by the wave plan and by section 12 of `docs/fixtures/brightcart-spec.md`; the cause was found by reproduction, not by design choice between live alternatives except
the one the wave plan names, decided in D1; the work is one sequence). This file carries scope, decisions, canonical impact, review passes, tasks, verification and findings.

## Scope

Reproduce E1 with the document's four-file workspace as a test that fails first; find the cause; fix it in the layer that owns it; say what a removed node's `applications` and `uses` point at in a comparison; look at the second
error of the document; re-embed the kernel if it changes; extend the Brightcart tests (comparison views of `inhouse` and `marketplace` generated, identical across two runs, the `deep` technology views of the editor kernel compute,
N13 in P2 and P3) and remove the exclusions of run 0061; file E1 as an issue (tmorin/archicode#67).

## Decisions

- **D1. A removed element says its references as the target does (the wave plan's open question).** Of the three choices (drop the entries that point at a replaced element, point them at the replacing one, keep the replaced
  element in the union), the run takes the second, and it is the only one that keeps the contract at no cost: `compare` already says every changed or unchanged element, and every relationship, through `Rewrite` (an entry
  that points at an element that exactly one element replaces points at that one; one that points at a split element is left out). A removed element and the place of a replaced box were the only two that took their properties
  from the base unchanged (`props_of` instead of `base_props_of`). So a removed node `n` that deployed `s.x`, which `s.y` replaced, now deploys `s.y` in the comparison (it is drawn removed, next to the new node that deploys the
  same `s.y`), and one that deployed an application that was split deploys none of the parts. Dropping would have lost what the removed node hosted; keeping the replaced element in the union would have made it appear in
  views, in counts and in the table as something the author said is not removed (rule 6, and `expected/changes.json`). Output shape: unchanged (same fields, same counts, same table; only the values of `applications` and `uses`
  of a removed element), contract version 4 stays (#34 not touched).
- **D2. Two more places held the same cause in Java, and are fixed there, not in the kernel.** (a) `KernelViewpointFactory.unionOf` (the views of a facet of a comparison) overwrote the `applications` and `uses` of each union
  element with the ones of the faceted model, which for a node of the baseline are the baseline's raw references: it now keeps the union's entries that the faceted workspace still has (the facet's effect is the same: what it
  removed is gone). (b) `WorkspaceFactory.createUnion` added a removed element of the baseline with everything it held, so that the workspace of the comparison had elements the union does not (a child another element
  replaced: `shop.web` under the place `shop`); the views are generated for every element of that workspace, and the kernel refused them (`dangling reference: shop.web`, the second error of the document, found when the first
  was out; the document's `shop.app.inventory` is the same cause). It now adds a copy that holds only what the comparison holds, when the element holds something else (the same object, as before, otherwise).
- **D3. The exclusions of run 0061 go.** `Brightcart.E1`, the exit-code branch of `BrightcartViewsTest` and the `stopped` filter of `BrightcartStableOutputTest`. The tests assert the four plateaus exit 0 with an empty error
  output, the comparison folders of `inhouse` and `marketplace` (the table equals `archicode diff -f json`, `gap.md` exists, PlantUML in both layers), two runs identical for every folder (the two comparisons among them), and
  N13 for P1, P2 and P3 in the PlantUML of the comparison views.

## Canonical impact

None to the architecture model (no TDD, no `CI-arc` or `CI-dom` packet). The kernel README and the header of `compare.rs` say what a removed element points at. `docs/fixtures/brightcart-spec.md` (E1 marked fixed with the
commit, section 12) is W-4's, per the wave plan; this run does not edit it.

## Review passes

- **KDMLLC (inline).** K: two lines in the kernel, one filter and one copy in Java. D: the rewrite is the one that existed (`base_props_of`), not a second one. M: the kernel owns the references of a union element, Java owns which
  elements the workspace of a comparison holds. L: no option, no new field. U: README and `compare.rs` say it. C: the wave plan's list for W-3 is covered one for one (see the C scan).
- **C scan.** Wave plan W-3 against what exists: reproduction as a test that fails first (`ReplacedElementsViewsTest`, node `replaces.test.js`, Rust tests); fix in the layer that owns it (kernel for the values, Java for the
  workspace of the comparison and for the facet views: the plan says "the kernel's `compare` or the Java side that hands it the plateaus"); the second error looked at and fixed (D2b); wasm and `standalone.html` re-embedded;
  `brightcart/` test generates the comparison views; E1 is issue #67. "A removed node keeps an application that another element replaced": true for the kernel; it was also true of the Java model for facets and the Java
  workspace kept replaced children (D2).

## Tasks

- [x] T1. Read the plan, the document, runs 0060 and 0061, the kernel and the Java side.
- [x] T2. File E1 (tmorin/archicode#67) and reproduce it with the four-file workspace (Java test fails: `dangling application reference: s.x`).
- [x] T3. Kernel fix, tests in Rust (4) and node (3), `embed.sh`.
- [x] T4. The Java causes of D2 and their tests.
- [x] T5. Remove run 0061's exclusions, extend the Brightcart tests.
- [x] T6. Byte-identity against a jar of the commit before the wave; full verification.

## Verification

Run on the final tree, JDK 25 for Maven and the jars, 2026-10-17.

- Fails first: the new Java test class `ReplacedElementsViewsTest` on a copy of `HEAD` (before the fix): 3 of 3 fail, `error: dangling application reference: s.x` (the four-file workspace of the document). The three new node tests
  (`replaces.test.js` E1, `brightcart-kernel.test.js` E1 x2) against the `HEAD` wasm: 3 fail, the 36 others pass. After the fix all pass.
- `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`: 173 passed, 0 failed (4 new).
- `embed.sh` then `embed.sh --check`: exit 0 (the first `--check` had failed: a comment edit of `compare.rs` after the last embed moved the line numbers; re-embedded).
- `node --test "src/test/javascript/**/*.test.js"`: 970 tests, 969 pass, 1 fail: `folders.test.js` "Open on a folder of the list asks the permission..." (the flaky one, #66); alone, three runs: 34/34.
- `./mvnw -o verify`: BUILD SUCCESS, 412 tests, 0 failures (integration tests are skipped by default). `npx prettier --write "src/**/*.java"`: no change.
- Byte-identity: jar of `ebc4195` (`git archive`, built in a scratch copy, sources identical to `ebc4195`) against the jar of this tree, `scripts/identity.sh` over the 18 `workspace.yaml` files of the repository (`git ls-files "*workspace.yaml"`):
  `src/doc/examples/{domain_application,domain_plateaus,domain_technology,domain_viewpoint_views,domain_workspace,facet_example_step_1..4}`, `src/test/resources/{brightcart/folders,brightcart/layered,hyphen-ids,
  plateau-comparison,plateau-comparison/replaces,plateau-state-hints,plateau-state-tags,replaces-large-pair,viewpoint-kernel/workspace}`. Commands on each copy: `views generate` and `query views`; with plateaus, per plateau
  `views generate --plateau P`, `diff --plateau P`, `diff --plateau P --format json`, `query views --plateau P`; stdout, stderr, exit code and the whole tree compared. 112 lines: 16 trees identical and all streams identical,
  except `brightcart/folders` (`views generate --plateau inhouse|marketplace`) and `replaces-large-pair` (`views generate --plateau after-declared`): old exit 1 with `dangling ... reference`, new exit 0; in these two trees
  the only differences are files present only in the new tree (the comparison views the old jar never wrote), no file differs in content.

## Findings

- Cause: in the union, a removed element took its `applications` and `uses` from the baseline unchanged, so it named an element that another one replaced and that the union does not hold. Two Java places repeated it (D2).
- The second error of the document (`dangling reference: shop.web`, `shop.app.inventory`) was the same cause in `WorkspaceFactory.createUnion` (D2b), not a separate defect.
- The unstable partial output after E1 is gone with E1: the stable-output test now compares the two comparison folders.
- Shape of the kernel output and contract version 4: unchanged (#34 untouched).
- Not verified: no native image built; `docs/fixtures/brightcart-spec.md` section 12 still says E1 is open (W-4's, per the wave plan); the editor was not looked at in a browser (W-4's).
