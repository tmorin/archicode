---
type: run
run: 0225
status: completed
profile: TDD+pln
wave: 033
---

# Run 0225: plateau-matrix-file

Run of wave 033, manifest id W-2.

## Verification

Stage 11, 2026-11-06. The pln Verification Plan was run again from the repository root with Java 25: `./mvnw verify -DskipITs=false` exit 0 (1860 unit tests, 0 failures, 2 skipped; 58 integration tests, 0 failures); `npm run format:check`, `npm run lint` and `npm run test:unit` exit 0; `python3 check-backlog.py` exits 0 (the register is `github-issues`, so `docs/bkg/todo/` is not read). Task-008 had also run `test-compile pmd:check`, `scripts/byte-identity.sh` (0 unexpected, no new exception) and `editor:build` plus `sample:build` (git status unchanged). `git diff --stat` on `src/main/rust`, `src/main/wasm`, `brightcart/expected` and `scripts/byte-identity-exceptions.txt` is empty. On the layered Brightcart the command prints the table for baseline inhouse marketplace and refuses `inhouse saas` with one `error:` line. Not proved: the native image (`./mvnw verify -Dnative` needs Mandrel or GraalVM; the reflect-config entries are checked by `NativeReflectionConfigTest` only).

Review pass: inline, by the Stage 11 leaf agent, which is not the agent that implemented the tasks; each task was also verified independently by an earlier agent.

Canonical impact: no CI-arc or CI-dom item in the TDD beyond CI-arc-1, discharged by the new matrix component in `docs/architecture/` and the regenerated sample.

Files outside likely_paths: src/main/java/io/morin/archicode/workspace/WorkspaceFactory.java, src/main/java/io/morin/archicode/workspace/CLAUDE.md, src/test/java/io/morin/archicode/cli/PlateauMatrixCasesTest.java, src/test/java/io/morin/archicode/cli/PlateauMatrixCommandTest.java, src/test/java/io/morin/archicode/viewpoint/kernel/ComparisonSketch.java, src/test/resources/guide/golden.md
