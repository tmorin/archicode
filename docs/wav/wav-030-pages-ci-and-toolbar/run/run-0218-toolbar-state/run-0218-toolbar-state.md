---
type: run
run: 0218
status: completed
profile: TDD+pln
wave: 030
---

# Run 0218 toolbar-state

Run of wave 030, manifest id W-8.

Canonical impact: none, see `# Canonical Impact` of the tdd (`CI-arc-1`, `CI-dom-1`): the toolbar is inside the presentation layer, no coupling between layers changes, `ArchitectureDriftTest` (run by `./mvnw verify`) and `sample:check` pass.

Files outside likely_paths: scripts/changes.mjs, src/test/CLAUDE.md

Review pass: dispatched (Stage 5 KDMLLC review and Stage 9 consistency check by leaf agents other than the drafter; each task verified by an independent agent).

## Verification

Stage 11 on the working copy (JDK 25 for Maven, byte-identity and Playwright): `npm run editor:build` twice leaves `git status --short` unchanged; `editor:check`, `format:check`, `lint`, `test:unit` (3,510 tests, 0 fail, 1 skipped), `test:coverage` (holds the floor), `sample:check`, `./mvnw verify` and the two manual node tests (19 pass) exit 0; `toolbar.test.js` and `toolbar-origin.test.js` 26 pass; `grep -rc data-lit src/main/editor` is 0 everywhere; the two address specs have 0 removed lines against ff3bacd; every anchor of the old manual is still defined and `editor-toolbar` is not in the manual; `scripts/byte-identity.sh` exit 0 (332 commands, 326 identical, 5 accepted, 0 unexpected, no exception file changed); `npx playwright test` exit 0, 186 passed on chromium, firefox and webkit. Not proved: Firefox and WebKit look of the toolbar by eye, the panel over a diagram drawn by ELK on an element page, and `npx prettier --check src/main/editor/style.css` (cannot exit 0, HEAD fails the same way; see the prg).
