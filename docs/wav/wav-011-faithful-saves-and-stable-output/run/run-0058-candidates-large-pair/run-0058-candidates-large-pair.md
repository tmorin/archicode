---
type: run
run: 0058
status: completed
wave: 011
---

# Run 0058: Candidates large pair

Wave 011 (`faithful-saves-and-stable-output`), item W-4 (phase P2). Focus: know how many candidates of replaces are right on a pair as large as a real one, without a real workspace.
Document profile: `single-document` (the scope arrives settled by the wave plan and by issue tmorin/archicode#33 and the author's ruling of 2026-10-16 in it); this file carries scope, decisions, canonical
impact, review passes, tasks, verification and findings.

## Scope

Issue #33: check the thresholds of the kernel's candidates (`CLOSE_DESCRIPTION` 0.6, `LEAST_WORDS` 3), the lone-sibling rule and the relationships of a split element (rule 6 of `compare.rs`) on a LARGE INVENTED pair of
plateaus kept in the repository, not on a real workspace. Change a threshold or the lone-sibling rule only if the planted answers show a false positive or a miss the rule should not make.

## Decisions

- **D1. The pair** is `src/test/resources/replaces-large-pair`: `workspace.yaml` (three plateaus), `plateaus/10_before`, `20_after`, `30_after-declared`, `answers.json`, `generate.mjs` (the recipe, seeded, deterministic: a second run
  gives the same bytes), `recorded-candidates.txt` and `recorded-declared.txt` (the recorded numbers). An invented harbour: 33 systems with 8-14 containers (some with components), 8 persons, 8 environments with nodes;
  595 elements in `before`, 591 in `after`. `after` has no `replaces` (the pair the candidates are measured on); `after-declared` is the same plateau with `replaces` written for every planted answer (the pair `archicode diff` is
  read on, because the CLI lists candidates only for a plateau that uses `replaces`, and a split is only a split once declared).
- **D2. What is planted** (97 `same` pairs, 41 `notSame` decoys; `answers.json` has the scenario of each): renames of the id only, of id and name with the description kept, touched up, or written again; each alone under its
  parent or among others; moves between systems; a system, an environment and containers renamed with everything inside; 5 splits (one half keeps the description, one keeps the name, none keeps anything, both keep the
  description, three halves); 4 merges (one keeps the name, one the description, none, one across two systems); nodes renamed and moved; persons renamed. Decoys: a lone sibling that is another thing (8 containers and
  components, 2 nodes), the same name in another kind (5), in another layer (2), under another parent (6 containers, 2 nodes), boilerplate descriptions of unrelated things (12), descriptions of two (2) and three (2) words;
  plus unrelated removals and additions in two systems. Not planted: a split where one half keeps the old id (then that half is `changed` and the other is `new`: no removed/new pair exists; a limit of the candidates, not of
  the rule).
- **D3. The test** is `ReplacesLargePairTest` (Java, beside `PlateauComparerTest`, through the real `WorkspaceFactory` and `PlateauComparer`): it compares `before` with `after`, checks the candidates against `answers.json` and
  compares the report (totals, precision, recall, by level of the tree, by decoy, by scenario) to `recorded-candidates.txt`; it compares `before` with `after-declared` and checks that the kernel takes every `replaces`
  (no warning), lists none of the answers as a candidate any more, and counts 78 moved, 11 split, 4 merged (`recorded-declared.txt`). Run it with `-DrecordReplacesLargePair=true` to rewrite the recorded files after a deliberate
  change of the rule. No Java class is read by reflection (the test only), so `reflect-config.json` is untouched.
- **D4. `generate.mjs --sweep`** re-reads the kernel's rule in JavaScript and tries other values; at the kernel's own values it lists the same 169 pairs as the kernel (checked by hand against the Java run, not by a test).
- **D5. No change to the thresholds, to the lone-sibling rule, to `compare.rs`, to the wasm or to the contract.** See the findings: the planted answers show wrong pairs, but none that a threshold or the lone-sibling rule
  separates cleanly, and the biggest source (a repeated name) is a different rule.

## Canonical impact

None to the architecture model (no `CI-arc` or `CI-dom` packet: this run has no TDD). `CLAUDE.md` does not describe the candidate rule's numbers; unchanged. The manual says "close description" and "the only two of their kind
under a parent" without numbers of quality; unchanged because the rule did not change.

## Review passes

- **KDMLLC (inline).** K: one test, one generator, two recorded files; no kernel change. D: the planted answers are written once (`answers.json`) and read by the test; the sweep is the only copy of the rule and says so. M:
  scenarios (what is the same), traps (what looks the same), levels (where the wrong pairs are), each has its own recorded lines. L: no option, no flag in the product. U: the header of `generate.mjs` and the Javadoc of the
  test say what the numbers are and are not. C: the wave plan asks for "the pair and its answers committed, the test, a comment on #33": yes, yes, yes.
- **C scan.** The plan says "several hundred elements, larger than the ~170-element real pair": 595 / 591. "Planted answers: renames, moves, splits, merges, decoys (a lone sibling that is a different thing, the same name in
  different kinds, close descriptions of unrelated things, two elements that share a name under different parents)": D2. "Change a threshold only if the planted answers show a false positive the rule should not
  make": D5, with the sweep as evidence. "Keep the kernel's output shape and contract version unchanged": nothing in the kernel changed.

## Tasks

- [x] T1. Read #33, #22, #39, the ruling, `candidates()` and rule 6; look at the existing fixtures (`plateau-comparison`, `domain_plateaus`) for the shape.
- [x] T2. Write `generate.mjs`, generate the pair and `answers.json`; check by script that every `same` and `notSame` pair is a removed element and a new one, and that no reference is declared twice.
- [x] T3. Write `ReplacesLargePairTest`, record the numbers, compare them with the JavaScript re-reading of the rule.
- [x] T4. Sweep other thresholds; look at the false positives by level; decide (D5).
- [x] T5. Run `archicode diff` on a scratchpad copy of `after-declared` and read the relationships of the split elements.
- [x] T6. File the two follow-ups (#60, #61) and post one comment on #33.
- [x] T7. Full verification (below).

## Verification

- `JAVA_HOME=<sdkman 25.0.4-tem> PLANTUML_JAR=... ./mvnw -o verify`: BUILD SUCCESS, 336 tests, 0 failures, 0 skipped (333 after run 0057, +3 here; integration tests are skipped by default, `skipITs=true`).
- `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`: 169 passed, 0 failed.
- `src/main/rust/viewpoint-kernel/embed.sh --check`: "the committed WebAssembly is the one the sources build (655544 bytes)", exit 0.
- `node --test "src/test/javascript/**/*.test.js"`: 913 pass, 0 fail (the YAML round-trip test also reads the 145 manifests of the new fixture).
- `npx prettier --check "src/**/*.java"`: clean.
- `node src/test/resources/replaces-large-pair/generate.mjs` twice: identical bytes (md5 of every file of the folder).
- `archicode diff --plateau after-declared -f markdown` on a copy in the scratchpad (the repository was not written to).

## Findings

Numbers are for the invented pair; they say how the rule behaves against what was planted, not how it behaves on a real workspace (the proportions of each case are the generator's).

- **F1. Precision and recall.** At the kernel's values, `before` -> `after`: 169 candidates, 76 right, 93 wrong, 21 planted pairs missed: precision 0.450, recall 0.784. By level: containers 46 right / 21 wrong / 19 missed;
  components 16 / 53 / 0; nodes 10 / 19 / 2; persons, systems and environments 4 / 0 / 0.
- **F2. What it finds and misses.** Found: every rename or move that keeps the name (21 of 21) or the description (15 of 15, touched up included), what is inside a renamed system, environment or container, a lone element
  whose name and description were both rewritten (2 of 2). Missed: a rename or a move with both rewritten and not alone (9), a split or a merge whose pieces keep neither the name nor the description (12; a piece that keeps one is
  found). A split never makes a lone-sibling pair (one removed meets several new, so the pair is not the only two of their kind), nor does a move (different parents).
- **F3. Decoys.** Listed: same name under another parent 8 of 8, lone sibling that is another thing 8 of 10, boilerplate descriptions 9 of 12, a three-word description repeated 2 of 2. Rejected: other kind 5 of 5, other
  layer 2 of 2, two-word descriptions 2 of 2.
- **F4. The largest source of wrong pairs is a repeated name, not a threshold.** A name that repeats (nine generic component names planted under 10 percent of the containers, twelve node names shared by eight environments) is
  paired with every removed or new element of that name (n x m pairs for n answers): 53 wrong against 16 right among components. Offering a name-only pair only when the name is unique among the removed and among the new
  gives 137 pairs, the same 76 right, precision 0.555: in this pair the generic-named answers are also found by their description. That is a change of the name rule (neither a threshold nor the lone-sibling rule), so it
  is a follow-up, filed as **tmorin/archicode#60** (with the idea of offering a pair when the parents are a pair).
- **F5. The thresholds are not the lever.** Closeness 0.5 to 0.9: precision 0.447 to 0.469, recall 0.784 to 0.742 (0.7 drops 6 planted boilerplate decoys at no cost in this pair, but the gain is made of decoys written
  for the test and the cost would be touched-up renames written mildly, so it is not evidence enough to move 0.6); least words 2 to 8: 0.444 to 0.455 and 0.784 to 0.773; lone-sibling rule off: 159 pairs, 74 right (it adds 2
  right and 8 wrong pairs here, the ratio planted, so it shows what the rule can and cannot tell, not how often each happens); name rule off: 129 pairs, 74 right, precision 0.574; description rule off: 139 pairs, 58 right.
- **F6. The relationships of a split in `gap.md`** (`after-declared`, 11 split elements): the element rows read well (`split | ... | relationships-added | from X; split with Y`); nothing is invented as removed (rule 6).
  The relationships table reads less well: 31 of the 60 `new` relationships belong to the split elements and were all there before the split, with no hint in the row, and the header count includes them. Acceptable for
  an author who knows the split, misleading for a skimming reader. Rule unchanged; filed as **tmorin/archicode#61**.
- **F7. A lesson on the instrument.** A first version of the generator drew descriptions from small pools; two unrelated descriptions then reached 0.6 by chance ~130 times (a third of the candidates), which no real prose
  does. The final generator draws the free part from pools of 12 to 30 items each; the boilerplate that real workspaces do have is planted separately (12 pairs), so that its share is a choice the reader can see. Real prose
  could sit anywhere between the two; the lesson is that the description rule's precision depends mostly on how formulaic the descriptions are.
- **F8. For the wave.** W-4 filed two issues (#60, #61) and posted one comment on #33, which is left open for the author. No file outside `likely_paths`.
