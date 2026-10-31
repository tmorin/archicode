---
type: run
run: 0208
status: completed
profile: TDD+pln
wave: 028
---

# Run 0208: plateau-fold-writer

Wave 028, manifest id W-4.

## Verification

Task 009 (DEC-9, REQ-2, ASM-5, RISK-4). `PlateauFoldBeforeAfterTest` (`src/test/java/io/morin/archicode/cli`, `@QuarkusTest`, `CliHarness`) copies the layered Brightcart to a temporary folder, replaces the two stories that name `inhouse` (the files of case F07), then runs the commands below, folds `inhouse` into `marketplace` through `archicode plateau fold inhouse`, deletes the `views-*` folders and runs the same commands again.

Commands, before and after, for the plateaus that remain (`baseline`, `marketplace`, `saas`):

- `plateau list`
- `diff --plateau P --against Q -f json` for each of the 6 ordered pairs
- `query graph --plateau P` for each of the 3 plateaus
- `views generate --plateau P` for `baseline` and `saas`, and `views generate --plateau marketplace --against baseline` (the default `--against` of `marketplace` is `inhouse` before and `baseline` after, so it is named)

Command to repeat it: `JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test -Dtest=PlateauFoldBeforeAfterTest` (about one minute).

Figures (2,648 outputs: 1 `plateau list`, 6 `diff`, 3 `query graph`, 2,638 files written by `views generate`):

| Output | Result |
| --- | --- |
| `plateau list` | `inhouse` row gone, `marketplace` has the parent `baseline`, the `baseline` and `saas` rows are the same |
| 2,642 outputs (4 `diff`, 2 `query graph`, 2,636 files of the views) | byte for byte identical |
| `diff marketplace against baseline`, `diff marketplace against saas`, `views-marketplace-vs-baseline/gap.json`, `views-marketplace-vs-baseline/gap.md` | equal once the cascade rows lose their PLATEAU and PATCH rank (the 23 patches of `marketplace` are numbered 27 to 49 after the fold, `inhouse` rows say `marketplace`) |
| `query graph --plateau marketplace` | equal once the nested `elements` are sorted by id (the query sorts only the top) and one entry is read alike: `discovery.search` replaced `commerce.search` before, and replaces `shop.app.search` after, the composed entry that keeps its comparison with `baseline` (DEC-3); no other line differs |
| every `.puml` of the views of the plateaus and of the comparison | byte for byte identical |

ASM-5 holds: with the `replaces` entry composed, no difference other than the two columns appears in `diff`, `gap.*` and the views. RISK-4: the views are drawn and compared, not only the models. After the fold `plateau list` has no `inhouse`, `inhouse/plateau.yaml` is gone, and a second `plateau fold inhouse` exits 1 with the sentence of F01 (``unknown plateau `inhouse`: the plateaus of this workspace are `baseline`, `marketplace` and `saas` ``), the standard output empty.

## Stage 11 verification

Stage 11 (2026-10-31), run by one leaf agent on the working tree with JDK 25.0.4-tem. Exit codes: `./mvnw verify` 0 (1,694 unit tests, 0 failures, PMD, the JaCoCo floors met); `./mvnw verify -DskipITs=false` 0 (the `*IT` classes, `PlateauFoldIT` among them, 3 tests); `./mvnw test-compile pmd:check` 0; `scripts/byte-identity.sh` 0 (20 workspaces, 332 commands, 326 identical, 5 accepted by the exceptions, 0 unexpected); `npm run test:unit` 0 (3,401 tests, 3,400 pass, 1 skipped, 0 fail); `npm run lint` 0; `npm run format:check` 0; `npm run editor:check` 0. JaCoCo after the run: 98.43 % of the lines, 98.42 % of the instructions, 92.56 % of the branches; no floor was changed (`pom.xml`, `scripts/editor-coverage-floor.json` untouched). `src/main/editor` and `src/main/resources/editor-webapp` show no change. Read back from the files: `FoldRewrite` and `FoldCheck` import no picocli, jakarta.inject or java.nio.file; `FoldFiles.commit` re-reads, stages, moves over the targets, deletes the folded manifest last and puts back from memory; no `NOPMD`; "does not write yet" is gone from `FoldCommand`, the manual, `CLAUDE.md`, `guide.md` and `golden.md`; `[[plateau-fold]]` is in `README.adoc`; `golden.md` is 26,449 bytes (budget 30,000).

Not confirmed here: the native runner and the serialisation of `Manifest` in it (ASM-2, RISK-7), proved only by the Native job; the tag run. One deviation from the plan, recorded in the progress log: sabotage 2 (the check made to skip the warnings) fails `FoldCheckTest.shouldTellAChangedWarning`, not the test of case F24 through the service, which still passes, so the warnings comparison is pinned at the unit level only.

## For the author

Three decisions the run made, told here and not asked: (1) the check runs in the dry run too, which adds a refusal beyond the list of D2 (DEC-4); (2) the patches of the folded plateau stay patches, put before the patches of the plateau above, where D3 said direct values (DEC-3); (3) a rewritten manifest keeps its extension and format and loses its comments, quotes and layout, and the name and horizon of the deleted `Kind: Plateau` manifest are only reported (DEC-2, D3). Also: the cases F20 to F27 of `fold-cases.json` are pinned ids, and the node test `fold-workspace.test.js` is outside the wave's likely paths.

Review pass: dispatched for the TDD (Stage 5, a separate leaf agent with a fresh context, findings R1 to R8 applied at Stage 6) and each of the 14 tasks was verified by a later, independent agent; this Stage 11 verification was done inline by one agent (not independent).

Files outside likely_paths: src/main/java/io/morin/archicode/MapperFactory.java, src/main/java/io/morin/archicode/Warnings.java, src/main/java/io/morin/archicode/manifest/Manifest.java, src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json, src/test/javascript/viewpoint-kernel/fold-workspace.test.js
