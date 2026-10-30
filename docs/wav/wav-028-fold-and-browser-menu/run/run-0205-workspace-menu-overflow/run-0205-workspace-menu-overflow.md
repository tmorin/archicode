---
type: run
run: 0205
status: completed
profile: TDD+pln
wave: 028
---

# Run 0205: workspace-menu-overflow

Run of wave 028, manifest id W-1.

## Verification

Stage 11 (2026-10-30), re-run on the committed tree: `npm run editor:check` 0 (99 upward pairs, max 99), `npm run format:check` 0, `npm run lint` 0, `workspace-menu-layout.test.js` 3 pass, `npm run test:unit` 3393 pass, 0 fail, 1 skipped (the timing test), `workspace-menu.spec.js` 21 of 21 in chromium, firefox and webkit; the other end-to-end specs: 48 passed in chromium, and `open-and-pages`, `browser-workspace`, `sample` and `hosted-acceptance` 24 passed in firefox and webkit (JDK 25.0.4 for the served-folder specs; with the shell's Java 21 they fail to start the jar, an environment matter). The sabotage of task-005 (the item `height: auto` removed, then the bar `flex-wrap` set to `nowrap`) failed the spec in the three engines and the restored page passed. The fix is `src/main/editor/style.css` only and `standalone.html` is its assembly. `tooling/docs/check-backlog.py` and `docs/bkg/` do not exist in this repository, so the backlog sweep has nothing to run.

Review pass: inline, because the leaf agents of this run have no Agent tool to dispatch a reviewer; the Stage 5 KDMLLC review of the TDD and the Stage 9 consistency check were done by agents other than the drafter, and each task was verified independently by a later agent.

Files outside likely_paths: playwright.config.js, CLAUDE.md
