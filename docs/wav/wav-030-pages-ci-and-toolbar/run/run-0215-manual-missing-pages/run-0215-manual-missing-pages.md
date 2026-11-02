---
type: run
run: 0215
status: completed
profile: TDD+pln
wave: 030
---

# Run 0215: manual-missing-pages

Run of wave 030 (pages-ci-and-toolbar), manifest id W-5.

Files outside likely_paths: src/test/javascript/manual-howto.test.js, src/test/javascript/manual-voice.test.js, docs/wav/wav-030-pages-ci-and-toolbar/run/run-0215-manual-missing-pages (the node test, the removed exemption and the run folder; the wave named only README.adoc and llms.txt)

## Verification

Stage 11 on the files as they are (2026-11-01): `node --test` of manual-howto, manual-skeleton, manual-voice and site 55 of 55; `npm run test:unit`, `npm run format:check` and `npm run lint` exit 0; `ManualExamplesTest` (1 test) and `PlateauComparisonTest` (43 tests) 0 failures with JDK 25; `./mvnw -o generate-resources` prints no Asciidoctor warning line (0, not more than before); `grep -c "Pluggable Viewpoint Service"` prints 0; `[[howto-ci]]` (line 876) and `[[howto-agent]]` (937) come after `= How-to guides` (874) and before `== Best Practices` (983); `[[reference]]` and `[[concepts]]` come before their part headings; llms.txt links the four addresses; no `BEST_PRACTICES_CI_BULLET`, `#_reference` or `#_concepts` in src or README.md; every id of ff3bacd is still defined (`plateaus-overview` is defined inline as `[[plateaus-overview,Plateaus]]`); `git diff` shows no file of src/doc/examples, src/main, src/site/index.html, src/site/sitemap.xml, manual-skeleton.test.js, manual-anchors.json or .github. Not rerun here: the commands on the jar and the mutation checks, read from the record of task-006 and task-007 above. Render in the browser pane: not checked (see the reader pass). This repository has no `docs/bkg` and no `tooling/docs/check-backlog.py`: the backlog sweep does not apply. No CLAUDE.md changed.

Review pass: dispatched (the TDD review of Stage 5 was done by an agent other than the Stage 4 drafter; each task was verified by a separate agent).

Canonical impact: none (the TDD, section Canonical Impact: no `arc` or `dom` register, the model names neither the manual nor llms.txt).
