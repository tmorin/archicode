---
type: run
run: 0207
status: completed
profile: TDD+pln
wave: 028
---

# Run 0207 plateau-fold-dry-run

Wave 028, manifest id W-3.

## Verification

Stage 11 (2026-10-30), re-run on the working tree: `./mvnw verify -DskipITs=false` with JDK 25.0.4-tem exits 0 (unit tests, PMD, the JaCoCo floors and the `*IT` classes, `PlateauFoldIT` among them); `npm run format:check` exits 0. Read back from the files: `fold-cases.json` (seven cases), `Fold`, `FoldReport`, `PlateauFoldService`, `FoldCommand` registered in `PlateauGroup` and in `reflect-config.json`, the guide and its golden file (26,183 bytes of 30 KB), `[[plateau-fold]]` and `[[upgrade-0-21]]` in the manual, CLAUDE.md. The unchanged-folder proof and the two sabotage checks are task-009's (logged in the prg). Not re-run here: `scripts/byte-identity.sh` (task-008's), the editor suites (no editor file is touched), the native runner. The repository has no `docs/bkg` and no `tooling/docs/check-backlog.py`, so the backlog sweep does not apply; the deferred writer (W-4, DEF-5) is in the wave manifest.

Review pass: inline, because the leaf agents of this run have no Agent tool to dispatch a reviewer; the Stage 5 KDMLLC review of the TDD was done by a fresh agent other than the drafter and each task was verified independently by a later agent.

Files outside likely_paths: none
