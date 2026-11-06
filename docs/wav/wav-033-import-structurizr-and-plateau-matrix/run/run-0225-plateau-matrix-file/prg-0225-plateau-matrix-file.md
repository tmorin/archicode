---
type: prg
status: completed
run: 0225
wave: 033
---

# Progress Log: Run 0225

## Log

- 2026-11-06: Stage 4 drafted tdd-0225-plateau-matrix-file.md (no PRD, traceability incomplete: R-1 to R-8 assumed from the wave plan, #24 and run 0206); command `plateau matrix` with DEC-1 to DEC-7, CTR-1 matrix.json; open questions Q-1 to Q-3 resolved inline, Q-4 an assumption checked by the first test; no blocker. Run status set to designing.
- 2026-11-06: Stage 5 KDML review of tdd-0225-plateau-matrix-file.md done by a leaf agent (fresh context, not the Stage 4 drafter), referent read in the code: overall acceptable; 17 findings (no S3, 7 S2, the rest S1 or S0) returned to the main agent to apply, none applied here; top concerns: the reflect-config entries are all classes (NativeReflectionConfigTest), the default folder name reads a views.path that is already `views-<plateau>`, and the derived path needs settings.current before any load; no blocker.
- 2026-11-06: Stage 6 read the Open Questions of tdd-0225-plateau-matrix-file.md: none is open (Q-1 to Q-3 resolved inline by DEC-6, DEC-2, DEC-4; Q-4 is assumption ASM-3, checked by the first test and changing the test, not the design); nothing to research or decide, TDD unchanged; no blocker. The Stage 5 findings are still to be applied by the main agent.
- 2026-11-06: Stage 8 drafted pln-0225-plateau-matrix-file.md (8 tasks: facts, model and writer, command, oracle matrix-cases.json, IT, manual and golden, architecture model, gates; one parallel group; no autonomy override so no human_required task; block-style YAML, complete_wave.py run --stage implement exits 0); run status set to planned; no blocker.
- 2026-11-06: Stage 9 consistency check of pln-0225-plateau-matrix-file.md done by a leaf agent against the TDD and the repository: every source_requirements ID (R-1 to R-8, TG, DEC, IMP, CTR, IF, FLOW, CON, RISK, ASM, Q-4, CI-arc-1) exists in the TDD, no invented scope, every R, DEC, IMP, CTR and IF is carried by a task; likely_files exist or are new files under existing folders, and the named tests, scripts and npm scripts exist; two edits: TDD ASM-2 now names the public fields appIndex and techIndex (there is no getAppIndex), and the pln conflict_risks now say that tasks 004 to 007 all build in the same target folder and run one after another; blocking_gaps is empty (gap-002 to gap-004 are not blocking and stay with tasks 001 and 003); the Stage 5 findings of the TDD are still to be applied by the main agent; complete_wave.py run --stage implement exits 0; no blocker.
- 2026-11-06: implement workflow stopped, state awaiting-operator: task-008 not started by their agent, nothing written, the tasks stay pending. Read the reasons, fix the cause, then regenerate. [{"task":"task-008","title":"Gates of the run: the whole suite, byte identity, format, lint, builds","reason":"format:check fails on src/test/java/io/morin/archicode/it/PlateauMatrixIT.java (belongs to the matrix integration-test task); needs prettier --write, then re-run format:check."}]
- 2026-11-06: Stage 11 verification: pln criteria all hold (verify -DskipITs=false green, format, lint, unit tests, byte identity, backlog check exit 0; the native image was not proved); pln execution_manifest.status done, run and prg completed; Files outside likely_paths recorded in the run document; check_run.py --as-completed run before the status was set.

## Facts

Task-001 (2026-11-06). Method: the packaged jar (`diff -f json` per pair) and a throwaway `@QuarkusTest` that loaded baseline, inhouse and marketplace of `src/test/resources/brightcart/layered/.archicode.yaml`, printed `Comparison.getElements()` and rebuilt the rows by the TDD rule (predecessors = `replaces` present in the previous column, else the same reference; a row per terminal node). The test is deleted; nothing is kept in the repository. The jar needs Java 25 to run (`JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem`; the shell Java 21 fails with class file version 69).

### Assumptions

- ASM-1 true. `getElements()` gives the union with `Change` and `replaces` (`ElementChange.replaces`). baseline->inhouse: 67 elements (NONE 34, NEW 17, CHANGED 5, REMOVED 1, MOVED 7, SPLIT 2, MERGED 1); `counts` added 17, changed 5, removed 1, moved 7, split 2, merged 1. inhouse->marketplace: 88 elements (NONE 44, NEW 21, CHANGED 12, REMOVED 6, MOVED 5); counts 21, 12, 5, 5, 0, 0. baseline->marketplace (the span): 89 elements (NONE 27, NEW 38, CHANGED 3, REMOVED 7, MOVED 11, SPLIT 2, MERGED 1); counts 38, 3, 6, 11, 2, 1, equal to `diff --plateau marketplace --against baseline` (+38 ~3 -6, 11 moved, 2 split, 1 merged). The union REMOVED is one more than the count when an element is replaced but something below it was removed (`shop`, `replacedBy=[storefront]`, no row, no count): a reader of the union must skip an element with `replacedBy` non-empty and `replaces` empty. Replaces seen: merged `accounts.profiles` <- `shop.app.customers`, `shop.app.loyalty`; split `orders.history` and `orders.placement` <- `shop.app.orders`; moved `commerce.{cart,cart-store,catalog,checkout,pricing}`, `payments.orchestrator`, `commerce.search`; in the second pair `discovery.search` <- `commerce.search`, `fulfilment.inventory`, `platform.notifications`, `storefront` <- `shop`, `storefront.web` <- `shop.web`. A chain (`shop.app.search` -> `commerce.search` -> `discovery.search`) is one MOVED in the span.
- ASM-2 true. References per plateau read from `Workspace.appIndex.elementByReferenceIndex` and `techIndex...`: baseline 28 + 22 = 50, inhouse 36 + 30 = 66, marketplace 48 + 34 = 82; equal to `src/test/resources/brightcart/expected/sizes.json` (50, 66, 82).
- ASM-3 true. Rows by the Span state (first plateau against last, by the row's terminal reference, or by its baseline origin for a row that ends before the last column): new 38, changed 3, removed 6, moved 11, split 2, merged 1, none 27; equal to the counts of the span comparison, `split` and `merged` included (a split origin is drawn on one row per result, so 2 rows; the merge is 1 row). The six removed rows end in column 0 (`prod.dc.cache-vm`) or column 1 (`shop.app`, `shop.db`, `prod.dc.app-vm`, `prod.dc.db-vm`, `prod.dc.web-vm`) and each starts in baseline. Q-4 closes: the test can compare all six counts with `diff`, not only four.
- ASM-4 true. 88 rows (82 in the last column + 1 ending in baseline + 5 ending in inhouse; 87 lineages, `shop.app.orders` drawn twice), 61 with a state (88 - 27 none). Write the numbers of `matrix-cases.json` from the run.

### Lines W-1 left in the shared files (edit by anchors, keep them)

Working tree, uncommitted; counts are lines added (new-side line numbers in the working tree of 2026-11-06).

- `src/main/java/io/morin/archicode/cli/ArchiCode.java`: line 22 `ImportGroup.class,` in the subcommands list. Task 003 does not touch this file (`PlateauGroup` is registered in `PlateauGroup.java`: its `subcommands = { ListPlateausCommand.class, FoldCommand.class }`).
- `src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json`: lines 3430-3636, 207 lines, one entry per class: `cli.ImportGroup`, `cli.ImportStructurizrCommand`, `importer.*` (the last entry is `importer.StructurizrReader`, the file ends `}\n]`). Existing anchors: `cli.PlateauGroup` at line 372, `viewpoint.kernel.PlateauComparer` at 2100, `workspace.PlateauFoldService` at 3324. Add the new entries before the final `]`, after a comma on the last entry, or in the sorted place; do not move W-1's block.
- `src/doc/README.adoc`: line 2455 (one line in the list of commands), lines 2503-2521 (section `[[import-structurizr]]` `=== Import a Structurizr workspace`, ends just before `[[errors-and-warnings]]`), line 3085 (`import   Import a model ...` in the `Commands:` block), lines 3378-3407 (the `.archicode import` / `Usage: archicode import ...` usage blocks, 30 lines, after the end of the plateau section text "the plateau of a step lacks is a warning and the step is skipped.").
- `src/test/resources/guide/golden.md`: lines 218-220, three lines (`archicode import`, `archicode import structurizr <workspace.json>`, `-o, --output=folder`), between `archicode guide` and `archicode init`. The new `plateau matrix` lines go in command order among the `archicode plateau ...` entries.
- `src/test/java/io/morin/archicode/it/HelpIT.java`: lines 39-44, the test `helpOfTheImportCommandStartsWithItsPath` (`firstLine(payload(result)).startsWith("Usage: archicode import structurizr")`); a help test for `plateau matrix` is a new method after it.
- `src/main/java/io/morin/archicode/CLAUDE.md`: line 50 (one line changed) and lines 65-71 (section `## import`, 7 lines). Lines 8-9 hold `name = "plateau"` in `PlateauGroup`; the facet-name rule is at line 23, the view/facet rule at 29.
- `src/test/CLAUDE.md`: lines 46-49, section `## The Structurizr import golden`.
- `src/main/java/io/morin/archicode/workspace/CLAUDE.md`: not touched by W-1.
- `docs/architecture/manifests/archicode.yaml`: lines 38-40 (relationship `imports the package` to `archicode.commandline.importer`), 62-71 (component `import_structurizr`, `tags.path` of two cli files), 118-127 (10 lines, the importer component). `src/main/resources/editor-webapp/samples/archicode.yaml` mirrors them (lines 57-59, 81-90, 136-145) and is regenerated by `npm run sample:build` after the edit of the manifest.
- `src/test/javascript/architecture/impact-questions.json`: line 71 `"archicode.commandline.importer",`.
- `src/test/java/io/morin/archicode/doc/ManifestRoundTripCorpusTest.java`: line 74, "each of the 440" (was 422). A new shipped manifest or fixture changes this number: count it, do not guess. `MistakeSweepTest.java`: `keyAt` helper at lines 145-162 and edits at 167-197: leave.
- `src/test/CLAUDE.md`, `src/test/java/io/morin/archicode/importer/`, `src/test/resources/structurizr/`, `src/main/java/io/morin/archicode/importer/` and `cli/ImportGroup.java`, `cli/ImportStructurizrCommand.java` are W-1's, untracked. `git diff --stat` on the four shared paths of the verification now: README.adoc 51+, ArchiCode.java 1+, reflect-config.json 207+, golden.md 3+ (262 insertions, no deletions); task-003 to task-007 compare with these numbers before and after.
- Read: `PlateauOption` holds the single option `--plateau` (field `plateauId`, package-private, null means `settings.current` else the last plateau when they form one line). `PlateauTree` gives `ids()`, `node(id)`, `chain(id)`, `ancestors(id)`, `children(id)`, `onOneChain(first, second)`, `standsOn(target, other)`, `isLayered()`, `warnings()`; `WorkspaceFactory.create(path, viewsDirPath, plateauId)` loads one plateau, `plateauTree(path)` and `facts(path)` load no plateau (`facts` also gives `settings.current`). `PlateauGroup` is a bare group, `subcommands = { ListPlateausCommand.class, FoldCommand.class }`: the new command is added to that list. `DiffCommand` loads target and base with `workspaceFactory.create(path, null, id)` and compares with `new PlateauComparer(mapperFactory.createLazy(MapperFormat.JSON)).compare(base, target)`.

### The three Stage 5 corrections (task-002 and task-003 apply them, one test each)

1. Every entry of `reflect-config.json` is a class (`NativeReflectionConfigTest`): add `cli.PlateauMatrixCommand`, `cli.MatrixPath` and each `rendering.matrix.*` class that is serialised or reflected as its own entry, nested records as `Outer$Inner` entries, never a package, a wildcard or a method-only entry.
2. The default folder name must not read a `views.path` that is already of the form `views-<plateau>`: the layered Brightcart writes its views as `views-<plateau>`, so deriving the default output folder from `views.path` would give `views-<plateau>-<plateau>`; derive it from the workspace folder or the last plateau id, not from a `views.path` that already carries a plateau.
3. The derived path needs `settings.current` before any load: when `--path` is absent the path of plateaus is derived from `settings.current` and the tree (`WorkspaceFactory.facts(path)` gives `current` without loading a plateau), so the choice is made, and its refusals told, before the first `create(path, null, id)`; a missing or unknown `current` is one `error:` line and nothing is loaded or written.

### Verification seen

`JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q -DskipTests package` exits 0; `java -jar target/quarkus-app/quarkus-run.jar diff --plateau marketplace --against baseline -w src/test/resources/brightcart/layered/.archicode.yaml -f json` exits 0 with counts elements new 38, changed 3, removed 6, moved 11, split 2, merged 1 (run with Java 25); the diff stat of the four shared paths is as above. The throwaway test is deleted and `git status` shows no file of it.

## Results

Task-008 (2026-11-06), gates run from the repository root with `JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem`. Every command exited 0; no failure to attribute to a task.

| Command | Exit | Seen |
|---|---|---|
| `./mvnw verify -DskipITs=false` | 0 | 1860 unit tests, 0 failures, 0 errors, 2 skipped; 58 integration tests, 0 failures; BUILD SUCCESS |
| `./mvnw test-compile pmd:check` | 0 | BUILD SUCCESS |
| `scripts/byte-identity.sh` | 0 | 21 workspaces, 344 commands compared, 274 identical, 69 accepted by the exceptions, 0 unexpected, self-check ok |
| `npm run test:unit` | 0 | |
| `npm run format:check` | 0 | |
| `npm run lint` | 0 | |
| `npm run editor:build && npm run sample:build` | 0 | `git status --short` identical before and after |
| `git diff --stat -- src/main/rust src/main/wasm src/test/resources/brightcart/expected scripts/byte-identity-exceptions.txt` | 0 | empty: the four paths are unchanged |

The native image was not proved by this run: `./mvnw verify -Dnative` (the Native job of CI, which needs Mandrel or GraalVM) was not run, so the reflect-config entries of the matrix classes are checked only by `NativeReflectionConfigTest` in the unit suite.

## Findings

## Lessons Learnt

- Nothing yet.
