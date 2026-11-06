---
type: run
run: 0224
status: completed
profile: TDD+pln
wave: 033
---

# Run 0224: structurizr-json-import

Run of wave 033, manifest id W-1.

## Recorded deviation

The wave plan (W-1 scope) says the manifests are written with `FoldFiles`. The design does not extend it: `FoldFiles.commit` rewrites files that already exist and creates none, and an import creates every file, so a new seam `ImportFiles` writes the folder (TDD DEC-7). The wave verification reads this as a decision, not a miss.

## Canonical impact

Not applicable: the repository declares no canonical register (`docs/` has no `arc` or `dom` register; the TDD section "Canonical Impact" says the same), so the TDD carries no `CI-arc-n` or `CI-dom-n` item and no analysis was fulfilled. The model of ArchiCode in `docs/architecture/` is not a register; its update was IMP-11 and `ArchitectureDriftTest` and `ArchitectureImpactTest` pass.

## Verification

Stage 11, read back on 2026-11-06 from the working tree: `JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw verify -DskipITs=false` exit 0 (BUILD SUCCESS, 53 integration tests, 0 failures, PMD and JaCoCo inside verify); `scripts/byte-identity.sh` exit 0 (21 workspaces, 344 commands, 274 identical, 69 accepted by the existing exceptions, 0 unexpected, self-check ok; `scripts/byte-identity-exceptions.txt` unchanged); `npm run test:unit` exit 0 (3520 tests, 3519 pass, 1 skipped, 0 fail); `npm run format:check` exit 0; `npm run lint` exit 0; `npm run editor:build` and `npm run sample:build` exit 0 and `git status --short` and `git diff` identical before and after; `npm run sample:check` exit 0. On the packaged jar: the Big Bank import exits 0, prints 5 warning lines (views 8, deployment nodes 5, styles 11, properties 45, implied relationships 5), `query graph` lists 18 elements as the sample's 3 people + 4 systems + 5 containers + 6 components; the output folder equals `src/test/resources/structurizr/expected` (`diff -r`); a `.dsl` input and a non-empty output folder are each one `error:` line, exit 1, nothing written, the folder unchanged. Not confirmed: the Native job of CI (not run on a branch) and the `export -workspace ... -format json` command of Structurizr on a DSL (Q-1, no Structurizr tool installed, the sentence of DEC-6 is unconfirmed by a run).

Review pass: dispatched, the Stage 5 KDMLLC review of the TDD ran in a leaf agent other than the drafter (13 findings, F1 to F13, absorbed at Stage 9); each task of the implement workflow was verified by a separate agent.

Files outside likely_paths: src/test/java/io/morin/archicode/doc/ManifestRoundTripCorpusTest.java, src/test/java/io/morin/archicode/doc/MistakeSweepTest.java, src/test/resources/guide/golden.md, src/test/CLAUDE.md
