---
type: run
run: 0201
status: completed
profile: TDD+pln
wave: 027
---

# Run 0201: sticky-walk-bar

Run of wave 027, manifest id W-1.

## Sticky share at 360 x 640 (task-004, REQ-3, DEC-3)

Measured in Chromium on the built page (jar classes identical to `standalone.html`), harbour pair of `replaces-large-pair` (360 changes), after one press of Next change, one-shot Playwright script on the spec's own fixture (removed after the run). Heights in px.

| Page | Tabs | Walk bar | Sticky (tabs + bar) | Panel | Share of the panel |
| --- | --- | --- | --- | --- | --- |
| Applications (panel with tabs) | 47.97 | 50.97 | 98.94 | 320 | 30.9 % |
| Plateaus (panel alone) | 0 | 50.97 | 50.97 | 320 | 15.9 % |

The panel is 320 px high at a 640 px window, so the worst case is 98.94 / 320 = 30.9 %, against the 35 % limit of REQ-3.

Verdict: option A (the bar sticky under the tabs) holds; 30.9 % is not above 35 %. Option B is not built and `style.css` is not changed by this task. The margin is about 4 points: a taller tab row or a bar that wraps to a second line would need the measure again.

## Red before the change (Stage 11, REQ-1 to REQ-4)

Reproduced at Stage 11 on the page of `HEAD` (before the change): `ARCHICODE_EDITOR_HTML=<HEAD page> node --test walk-bar.test.js` fails `CTR-1: the walk row is one [data-changes-walkbar], a child of .changes-panel` with `AssertionError: one [data-changes-walkbar] in the panel`; `changes-walk.spec.js` run in Chromium on a copy of the jar holding the `HEAD` page fails all 4 tests (plateaus and applications, 1280 x 800 and 360 x 640). On the changed page the node tests pass (49 of 49 with `changes-panel.test.js`) and the e2e passed in chromium, firefox and webkit (82 passed, task-006 log). The Firefox red run was not repeated.

## Verification

editor:build and editor:check 0 (99 upward pairs, max 99), lint 0, format:check 0, `./mvnw verify` 0 (1587 tests), `npm run test:e2e` 0 (82 passed), `npm run test:unit` 1 with one failure, the known uncommitted-page test `the real page: --statements HEAD passes` (the change is uncommitted). Not proved: Safari (DEF-1). `tooling/docs/check-backlog.py` does not exist in this repository, so it was not run.

Review pass: inline, because the leaf agents of this run have no Agent tool to dispatch a reviewer; the Stage 5 KDMLLC review of the TDD (11 findings, carried into the plan) and the Stage 9 consistency check were done by agents other than the drafter.

Files outside likely_paths: src/main/editor/composition/bootstrap.js, src/test/javascript/viewpoint-kernel/changes-panel.test.js, src/test/javascript/viewpoint-kernel/library-page.js, src/test/javascript/viewpoint-kernel/story-player-scene.test.js, src/test/javascript/viewpoint-kernel/walk-bar.test.js, src/test/e2e/changes-walk.spec.js, CLAUDE.md, src/doc/README.adoc
