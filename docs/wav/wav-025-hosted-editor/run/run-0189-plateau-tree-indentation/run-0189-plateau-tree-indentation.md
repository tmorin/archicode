---
type: run
run: 0189
status: completed
profile: TDD+pln
wave: 025
---

# Run 0189 plateau-tree-indentation

Run of wave 025 (wav-025-hosted-editor), manifest id W-1.

## Checks

- Test against the capped code (`Math.min(depth, 6)` put back in `plateau-band.js`, page rebuilt): `node --test .../plateau-tree-indentation.test.js` exit 1 (assertion: actual vs expected depth lists). File and page restored (page compared byte for byte with the backup); the test then exits 0, 3 tests pass.
- `npm run test:unit` first run (change uncommitted): exit 1, 2684 pass, 1 fail: `check-editor-statements.test.js`, "the real page: --statements HEAD passes", which compares the page with `HEAD`. After the change was committed (325c3d7, `fix: the indentation of the plateau tree grows with the depth (#175)`, made by the orchestrator because the workflow does not commit): exit 0, 2686 tests, 2685 pass, 0 fail, 1 skipped by design.
- `npm run lint`: exit 0. `npm run format:check`: exit 0.
- `npm run editor:check`: exit 0; upward pairs 99 (max 99, `ratchet.max` 99).
- `scripts/byte-identity.sh` not run: the command line is untouched.

## Canonical impact

Canonical impact: none; the change is a presentation fix and two sentences of documentation, no register is declared.

Files outside likely_paths: none

Review pass: dispatched, the Stage 5 review of the TDD was made by an agent independent of its drafter; the commit 325c3d7 was read by the orchestrator against the TDD and the pln (three `Math.min(depth, 6)` caps removed, one rule in the existing narrow query, two existing tests updated).

## Verification

- `npm run editor:check`, `npm run lint`, `npm run format:check`, `npm run test:unit`: exit 0 after the commit (above); `ratchet.max` unchanged at 99.
- Not done: task-005, the look at 360 px in a browser. The jar in `target/` predates the change and the page needs an open folder, so no honest look was possible in this run. The narrow-window rule is covered as CSS text by `plateau-tree-indentation.test.js`; the 0.5rem step is the choice of DEC-1 and has not been seen on screen.
