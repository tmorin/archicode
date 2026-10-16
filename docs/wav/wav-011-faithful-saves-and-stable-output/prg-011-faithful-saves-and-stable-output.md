---
type: prg
status: active
date: 2026-10-16
related:
  - docs/wav/wav-011-faithful-saves-and-stable-output/wav-011-faithful-saves-and-stable-output.md
wave: 011
---

# Progress Log: faithful-saves-and-stable-output

## Log

- 2026-10-16: wave drafted from the rulings on the open issues (commented on each issue the same day).
- 2026-10-16: the wave is on branch `feat/faithful-saves-and-stable-output` in the main worktree (one PR for the wave, one commit per run, rebase-and-merge). Runs are executed one at a time even where the plan allows W-1 and W-2 together: they share one working tree, one `target/` and one commit per run. Order: W-1, W-2, W-3, then W-4 and W-5.
- 2026-10-16: batch 1a dispatched: W-1 `editor-faithful-saves` (run 0055), tier `standard`, `run-executor` at the default model, 1 run at a time.
- 2026-10-16: W-1 `editor-faithful-saves` (run 0055) returned `completed`; status file `completed` (single-document run, no pln). Verified by the orchestrator on the tree: `node --test` 909/909, `embed.sh --check` ok, `prettier --check` clean. Reported by the run: `./mvnw -o -q verify` exit 0, `cargo test` 169, 19 new tests (14 fail on the previous `standalone.html`), six edits on 85 YAML files (507 of 510 results byte-identical to HEAD, the 3 others are #52 on one-key `workspace.yaml` files), differential fuzz without other differences, the real page looked at in light and dark. Out-of-path file: `src/doc/README.adoc` (one sentence). Serialized with the rest, so no collision to check; W-2 and W-3 will edit the same README after it. Issue filed: #57.
- 2026-10-16: W-1 committed as one commit on the wave branch.
- 2026-10-16: batch 1b dispatched: W-2 `sorted-query-output` (run 0056), tier `standard`, `run-executor` at the default model, 1 run at a time (W-1 is committed).
- 2026-10-16: W-2 `sorted-query-output` (run 0056) returned `completed`; status file `completed` (single-document). Verified by the orchestrator: `./mvnw -o -q verify` exit 0, `prettier --check` clean, no stray process left. Reported by the run: 20 runs of `query views -f json` and of `query schemas` (workspace, manifest) give one output on each of two clean builds of the tree and across the two; 29 loading workspaces of the 30 tracked in git have the same set of views as the base jar, now ordered by id then layer (`query graph` and all error outputs byte-identical to base); schemas equal as JSON to base, only property order differs; 329 Java tests, `node --test` 909/909. No out-of-path file; serialized, no collision to check. Issues filed: #58, #59. Not verified: the native image (the only GraalVM on the machine is 17), left to W-5's job.
- 2026-10-16: W-2 committed as one commit on the wave branch.
- 2026-10-16: batch 1c dispatched: W-3 `distinct-dashes` (run 0057), tier `standard`, `run-executor` at the default model, 1 run at a time (W-1 and W-2 are committed).
- 2026-10-16: W-3 `distinct-dashes` (run 0057) returned `completed`; status file `completed` (single-document). Verified by the orchestrator on the tree, with `PLANTUML_JAR` set to plantuml-1.2024.7.jar: `./mvnw -o verify` BUILD SUCCESS (333 tests, 0 failures, 0 skipped), `cargo test` 169, `embed.sh --check` ok, `node --test` 913/913, `prettier --check` clean. Reported by the run: pairs `removed` 16-3, `split` 8-8, `merged` 3-9 (each differs from every other state by at least 4 in dash or gap), chosen by rendering seven candidate sets; a new optional style property `line-gap` (without it the gap equals the dash); editor patterns, the CLI legend, the editor's key and words and the two manual tables agree (a node test reads the five places); 87 `views generate` invocations per jar against a jar of 8e84e7e: nothing outside a comparison folder differs, and in the 643 of 853 comparison files that differ only the `LineStyle` of the three states and the legend lines that name them; the real page looked at in light and dark. Out-of-path files: `PlateauComparisonTest.java` and the three regenerated `domain_plateaus` comparison views, both expected. Serialized, no collision to check.
- 2026-10-16: W-3 committed as one commit on the wave branch.
- 2026-10-16: **gate P1 verified.** (1) the per-case tests of W-1 (`faithful-saves.test.js`, 19 tests, 14 of which fail on the previous page) read by the orchestrator in the run's report and run with the suite; (2) the six edits on 85 YAML files (the 80 plus the five added since), 507 of 510 byte-identical, the 3 others being #52 on one-key files, from the run's report, not re-run; (3) 20 runs and two builds for `query views`/`query schemas`, from the run's report, not re-run; (4) `DistinctDashesRenderingTest` renders every state through plantuml-1.2024.7.jar in the orchestrator's `verify`, and the node test reads the five places of the key; (5) byte-identity: W-2 against the base jar, W-3 against 8e84e7e (the head after W-2), each from its run's report; no single jar of the commit before the wave was compared over the three runs, W-1 touching only the editor page; (6) the five commands re-run by the orchestrator, all green; (7) the page looked at in the built-in browser by W-3 (light and dark, removed/split/merged); W-1 looked at its own save cases. Canonical discharge: the three runs answer "None to the architecture model" in their `Canonical impact` section, with a reason (no TDD, no `CI-arc`/`CI-dom` packet). One wording point: the gate says the comparison files differ only on `LineStyle`; they also differ on the legend lines that name the dashes in words, which is the key change the same gate asks for.

## Findings

- #50's single-scalar case was already fixed before the wave (commit `d2849d2`, issue left open); the run closed the remaining gap (several keyless list items rewritten in a row). #53 also covers `~`, `Null` and a bare `key:`. Say both in the closing notes of the issues.
- Still lossy after W-1 (not in this wave): files with anchors or tags, a list at the column of its key (#57), a comment inside an empty collection that an edit fills.

- Note for the release notes (W-2, #48, #49): the order of `query views` (all formats) and the order of the properties in `query schemas` change once, in 0.14.0; the set of views and the content of the schemas do not change; a script that reads `$.[0]` of `query views` should select by `id`. The run's own copy is under "Note for the release notes" in run 0056.
- Cause of #49: the element types are interfaces without fields, so Jackson takes their property order from `getDeclaredMethods`, which the JVM does not fix (about one run in three, not one in twenty). Fixed with a copy of the JSON mapper that sorts properties alphabetically.
- W-2 found #58 (`query graph` output is not sorted, a `HashSet<String>`; stable in practice) and #59 (`query views -f toml` writes invalid TOML, before the wave).

- W-3 gives `query schemas` a new property `line-gap`, so its output changes a second time in the release (after the sort of W-2). Release-notes text: run 0057, "Note for the release notes". `split` moved from 6-6 to 8-8 (2 away from `contains-changes` otherwise) and the editor's `moved` from `14 4` to `12 12`.
- Not verified by W-1, W-2, W-3: other browsers, the native image (W-5), a very large manifest for the cost of the new reading of W-1.

## Lessons Learnt
