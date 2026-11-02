---
type: run
run: 0217
status: completed
profile: TDD+pln
wave: 030
---

# Run 0217 toolbar-structure

Run of wave 030, manifest id W-7.

Canonical impact: none, see `# Canonical Impact` of the tdd (`CI-arc-1`, `CI-dom-1`): the toolbar is inside the presentation layer, no coupling between layers changes, `sample:check` and the architecture tests pass.

Files outside likely_paths: playwright.config.js, src/test/CLAUDE.md

Review pass: dispatched (Stage 5 KDML review and Stage 9 consistency check by leaf agents other than the drafter; each task verified by an independent agent).

## Verification

Stage 11 on the working copy (JDK 25): `npm run editor:build` twice leaves `git status --short` unchanged; `editor:check`, `format:check`, `lint`, `test:unit` (3,494 tests, 0 fail, 1 skipped), `test:coverage`, `sample:check` and `./mvnw test -Dtest=ManualExamplesTest` exit 0; `grep -rc data-lit src/main/editor` is 0 everywhere; `toolbar.test.js` 10 pass; the two address specs have 0 removed lines against ff3bacd; every anchor of the old manual is still defined. `npx playwright test` (three projects) and `scripts/byte-identity.sh` were run by task-010 (see the prg) and not rerun here; `./mvnw verify` was not run.
