---
title: Sticky walk bar
type: tdd
status: draft
run: 0201
wave: 027
owner: tmorin
date: 2026-10-29
related:
  - 'gh:tmorin/archicode#179'
  - docs/wav/wav-027-editor-layout-and-walk/wav-027-editor-layout-and-walk.md
  - docs/wav/wav-027-editor-layout-and-walk/rfc/rfc-001-diagram-layout-address-and-walk.md
---

# Sticky walk bar

# Summary

On a long comparison the *Previous change* / *Next change* buttons scroll away with the list, so a reader who walks with the mouse scrolls back to them after each press (#179). This design makes the walk row a sticky block under the `Selected | Changes` tabs (RFC-001 rule 5, option A), keeps the selected row in view with `block: 'nearest'` and a `scroll-padding-top` equal to the sticky height, measures the block at 360 x 640, and switches to option B if it is above 35 % of the panel. There is no PRD: the run profile is TDD+pln and the sources are #179, RFC-001 and the P1 gate of the wave manifest, so traceability is incomplete (see PRD Traceability). Diagrams are skipped: the change touches one component's markup and CSS, with no new boundary and no branching flow beyond the 35 % rule.

# Scope

In scope: `renderChangesReadingHtml` (`src/main/editor/presentation/changes-panel.js`), the rules of `.changes-reading`, `.changes-walk` and `.right-tabs` in `src/main/editor/style.css`, the scroll step of `composition/render.js`, a small measuring function in `presentation/right-panel.js`, `names.json`, the generated page `src/main/resources/editor-webapp/standalone.html`, node tests, one e2e spec, and the sentences of `CLAUDE.md` and `src/doc/README.adoc` (`[[editor-changes-panel]]`, `[[editor-small-screen]]`) that describe the panel. Out of scope: the keys `j` and `k` and `handleChangesKeydown`, the filters, the rows, any other panel, the diagram toolbar (W-4), the Changes data and the kernel.

# PRD Traceability

No PRD. Requirements are taken from the wave manifest (phase P1 gate and run W-1 focus) and RFC-001 rule 5:

- `REQ-1` (W-1 focus): a reader presses *Next change* thirty times in a row with the mouse on a 360-change comparison, on any page that lists the changes, without scrolling back to the buttons.
- `REQ-2` (gate 2): after each press, at 1280 px and at 360 px, in Chromium and Firefox, the button box is inside the panel's box and the top of the selected row is at or below the bottom of the sticky block.
- `REQ-3` (gate 3): the run document records the sticky block's height as a share of the panel at 360 x 640 and the verdict, A at most 35 %, otherwise B built instead, with the measure.
- `REQ-4` (gate 4): a node test shows that an empty list renders no sticky block beyond the tabs, and that every page that writes the Changes list gets the bar from `renderChangesPanelHtml`; `j` and `k` behave as before.
- `REQ-5` (gate 1): `editor:build`, `test:unit`, `lint`, `format:check` and `editor:check` pass; `ratchet.max` not above 99; the page is the assembly of its parts.
- `REQ-6` (completion criteria): `CLAUDE.md` and the manual describe the sticky walk bar.

All six are addressed; none is sourced from a PRD (assumed from the plan). Not proved: Safari (see Q-1).

# Technical Goals

- TG-1: the walk row (two buttons, "n of N", *Show all*) stays at the top of the scroll area of the right panel while the rows scroll under it, with the tabs above it when they exist (REQ-1).
- TG-2: a walk step brings the selected row fully below the sticky block, scrolling only when it is out of view (REQ-2).
- TG-3: the sticky height is measured, not estimated, and the 35 % rule decides A or B (REQ-3).
- TG-4: nothing else moves: no saved file, no address, no cache key, no `modelsChanged()`; the markup other than the walk row is unchanged (REQ-4).

# Non-Goals

- Option C, the lateral rail (decided in W-4).
- Making the filters sticky; only the walk row is.
- A keyboard change: `j` and `k` keep their rules.
- Touching the story player (it has no Changes panel).

# Assumptions

- ASM-1: the scroll container is `#panel-right` (`.right-panel`, `overflow: auto`; `max-height: 50vh` under 40rem, `style.css` line 988), so `position: sticky` on a descendant sticks inside it. The existing `.right-tabs` already does this with `top: -1rem` (it cancels the panel's 1rem padding). Validate by the e2e spec on the unfixed page: the buttons leave the panel box after a few presses (the test fails there).
- ASM-2: the walk row must be a direct child of `.changes-panel` to stick for the whole list; inside `.changes-reading` (today) the containing block is only that small block, so it would unstick when the block scrolls out. Validate by the node test on the markup and the e2e.
- ASM-3: the tabs are absent on the page Plateaus and on the story page without a view (the Changes panel is alone), so the walk row's `top` is `-1rem` there and `-1rem + tabs height` elsewhere. The height of the tabs is not a constant (font scaling), so it is measured (DEC-2).
- ASM-4: a list with one change or more shows the bar, as `renderChangesReadingHtml` does today (it returns '' only for no rows); "a list shorter than the panel renders no sticky block more than the tabs" in the gate is read as: with no change, only the tabs are sticky. Q-2 records the other reading.
- ASM-5: the `redraw` of a walk step rewrites the panel's `innerHTML` and `render.js` restores `scrollTop` for the same view before the scroll step runs, so the step starts from the old position (as today). Validate by the e2e.

# Constraints

- CON-1: `standalone.html` is generated; edit `src/main/editor`, run `npm run editor:build`, commit both parts and page (`CLAUDE.md`, editor page paragraph).
- CON-2: Prettier covers `style.css` and the parts; format, then build.
- CON-3: `ratchet.max` stays at 99 or below (a new function in `right-panel.js` that uses only `core`/`model` names adds no upward pair; `names.json` is updated by `node scripts/check-editor.mjs --write-names`).
- CON-4: the redraw contract: nothing below `composition/` calls `render()`; the scroll step stays in `composition/render.js`.
- CON-5: e2e runs with one worker and no retry; assertions must not depend on timing: wait for the selected row (`.change-row.selected`) after each press, then measure.
- CON-6: the WebKit Playwright project runs four named specs only; the new spec runs in Chromium and Firefox (gate 2). No change to `playwright.config.js`.
- CON-7: view only: no `modelsChanged()`, no address key (the contract of the wave: zoom/pan and chrome stay out of it).
- CON-8: commit subject `feat: ...` or `fix: ...` (a change of behaviour, not a `refactor: move`).

# Current State

- `withChangesPanel` (`presentation/right-panel.js`) and `libraryRightHtml` (`presentation/stories-pages.js`) write `.right-tabs` (sticky, `top: -1rem`, `z-index: 3`) above the panel from `renderChangesPanelHtml`; the Plateaus page writes the panel alone.
- `renderChangesPanelHtml` (`presentation/changes-panel.js`) puts, in a flex column `.changes-panel`, the head, counts, toggle, notes, candidates, warnings, cascade, then `renderChangesReadingHtml` (filters, "12 of 167 changes", and `.changes-walk` with the two buttons, "n of N" and *Show all*), the detail of the current change, then the two lists. Everything but the tabs scrolls away.
- `goToChange` sets `scrollChangesToSelection`; `render()` (`composition/render.js`) then calls `scrollIntoView({ block: 'center' })` on `.change-row.selected`. With a centered row, the buttons are far above after a few steps.
- `walkChange` restores focus to the button that is still enabled (`goToChange(row, selector)`).
- e2e: `src/test/e2e/diagram-and-compare.spec.js` walks changes on `domain_plateaus`; no spec has 360 changes. The fixture `src/test/resources/replaces-large-pair` (plateaus `before`, `after-declared`; 360 changes) is read by `reading-changes.test.js` in Node.

# Proposed Design

Markup. `renderChangesReadingHtml` closes `.changes-reading` after the filters and the "n changes" status, then returns the walk row as its own sibling `<div class="changes-walkbar" data-changes-walkbar>` that holds the existing `.changes-walk` (buttons, `.changes-position`, *Show all*). Both are returned in one string, so both are direct children of `.changes-panel`. Classes `changes-walk`, `changes-position` and the `data-action`s are unchanged, so `walkChange`, `handleChangesKeydown` and their tests stay valid.

CSS. `.changes-walkbar { position: sticky; top: calc(-1rem + var(--right-tabs-h, 0px)); z-index: 2; background: var(--panel-bg); padding: 0.35rem 0; border-bottom: 1px solid var(--border); }` (below the tabs' `z-index: 3`). `.right-panel { scroll-padding-top: calc(var(--right-tabs-h, 0px) + var(--right-walk-h, 0px)); }`.

Measuring (DEC-2). A function `syncRightPanelSticky()` in `presentation/right-panel.js` reads `offsetHeight` of `.right-tabs` and `[data-changes-walkbar]` inside `#panel-right` and sets `--right-tabs-h` and `--right-walk-h` on the panel (0 when absent). It runs in `render()` after the panel is written and before the scroll step, and on `window` `resize`, next to `syncDiagramKey`'s existing resize hook.

Scroll step. In `render.js` the scroll to the selected row uses `block: 'nearest'`; with `scroll-padding-top` the browser leaves the row below the sticky block and does not scroll when it is already in view (a mouse reader sees the list move by the least amount).

Fallback B (DEC-3). If the measured block is above 35 % of the panel at 360 x 640, the same markup is kept but `.changes-panel` rows (`ul.change-list`) get their own scroll box (`max-height` from the remaining space; `overflow: auto`), the buttons then sit outside the scrolling part. The run decides from the measure and records it.

# Repository Impact

- IMP-1 — walk bar markup
  - Path(s): `src/main/editor/presentation/changes-panel.js`
  - Change type: modify
  - Why impacted: `renderChangesReadingHtml` splits the walk row from `.changes-reading`.
  - Linked PRD IDs: REQ-1, REQ-4
  - Risks / notes: the three `data-action`s, `.changes-walk`, `.changes-position` and `data-changes-*` attributes keep their names; tests that match `.changes-reading` for the buttons must follow (grep `reading-changes.test.js`, `changes-shortcut.test.js`).
- IMP-2 — styles
  - Path(s): `src/main/editor/style.css`
  - Change type: modify
  - Why impacted: sticky block, `scroll-padding-top`, background and z-order; 360 px wrapping of the row.
  - Linked PRD IDs: REQ-1, REQ-2, REQ-3
  - Risks / notes: `z-index` below the tabs; the dark theme uses `--panel-bg`.
- IMP-3 — measuring and scroll step
  - Path(s): `src/main/editor/presentation/right-panel.js`, `src/main/editor/composition/render.js`, `src/main/editor/names.json`
  - Change type: additive (one function), modify (`block: 'nearest'`)
  - Why impacted: sets the two custom properties before the scroll; the scroll step stops centering.
  - Linked PRD IDs: REQ-2, REQ-3, REQ-5
  - Risks / notes: other users of `scrollChangesToSelection` (`setRightTab`, `right-panel.js` lines 68, 73, 102) now scroll to nearest too; accepted, they list a row that was selected.
- IMP-4 — generated page
  - Path(s): `src/main/resources/editor-webapp/standalone.html`
  - Change type: modify (generated)
  - Why impacted: the assembly of the parts above.
  - Linked PRD IDs: REQ-5
  - Risks / notes: `npm run editor:build` then `editor:check`.
- IMP-5 — tests
  - Path(s): `src/test/javascript/viewpoint-kernel/walk-bar.test.js` (new), `src/test/e2e/changes-walk.spec.js` (new), a small helper for the harbour files in the spec
  - Change type: additive
  - Why impacted: REQ-2, REQ-4.
  - Linked PRD IDs: REQ-2, REQ-4
  - Risks / notes: see Observability and Verification.
- IMP-6 — documentation
  - Path(s): `CLAUDE.md` (the editor paragraph on the Changes list), `src/doc/README.adoc` (`[[editor-changes-panel]]`, `[[editor-small-screen]]`)
  - Change type: modify
  - Why impacted: say the walk bar is sticky, the scroll rule, the 360 px measure and the Safari limit.
  - Linked PRD IDs: REQ-6
  - Risks / notes: `GuideTest`/`ManualExamplesTest` are not affected (no example changes).

# Canonical Impact

None. The repository declares no `arc` or `dom` register in the files read for this run (`docs/CLAUDE.md` is absent); no element or invariant of a canonical register changes. Not applicable — no canonical registers declared.

# Data Model and Contracts

- CTR-1 — Markup of the Changes panel
  - Current contract: `.changes-reading` contains filters, status and `.changes-walk`.
  - Proposed contract: `.changes-reading` contains filters and status; `[data-changes-walkbar]` (class `changes-walkbar`) is its following sibling under `.changes-panel` and contains `.changes-walk`.
  - Affected files: `presentation/changes-panel.js`, `style.css`, tests selecting the buttons.
  - Migration or compatibility notes: no file format, no address, no kernel input changes; the e2e `diagram-and-compare.spec.js` uses `data-action` selectors and is unaffected.
  - Linked PRD IDs: REQ-1, REQ-4
- CTR-2 — Two CSS custom properties on `#panel-right`
  - Current contract: none.
  - Proposed contract: `--right-tabs-h` and `--right-walk-h`, lengths in px, set by `syncRightPanelSticky()`, 0 when the element is absent.
  - Affected files: `presentation/right-panel.js`, `style.css`.
  - Migration or compatibility notes: view only; defaults in `var()` make the page correct before the first measure.
  - Linked PRD IDs: REQ-2, REQ-3

No saved file, schema, kernel contract (5), command-line output or address key changes.

# Interfaces and Behavior

- IF-1: *Next change* / *Previous change* (button or `j`/`k`): the selection moves, the panel redraws, the buttons stay at the top of the panel, and the selected row is at or below the sticky block; the list scrolls only if the row was out of view.
- IF-2: the bar is shown whenever the list has a change (ASM-4); with none, there is no walk row and only the tabs stick.
- IF-3: on a page without tabs (Plateaus; a story with a comparison) the bar sticks at the very top.
- IF-4: error states: none new. If the measure cannot run (no layout, the node harness) the custom properties stay 0 and the page degrades to the CSS defaults.

# Flows and Processing Logic

- FLOW-1 — Walk with the mouse
  - Trigger: the reader presses *Next change* on a long list.
  - Steps: `walkChange('next')` -> `goToChange` -> `scrollChangesToSelection = true`, `requestRedraw()` -> `render()` writes the panel, restores `scrollTop` -> `syncRightPanelSticky()` -> `selectedRow.scrollIntoView({ block: 'nearest' })` honoring `scroll-padding-top`.
  - Branches / failure paths: selected row already visible: no scroll; at the last change *Next* is disabled and the focus goes to *Previous* (unchanged); a refused or pending comparison writes no bar.
  - Final output / rendered result: the bar at the top of the panel, the row just under it.
  - Linked PRD IDs: REQ-1, REQ-2
- FLOW-2 — The 35 % rule
  - Trigger: the e2e spec (or a script of the run) at 360 x 640.
  - Steps: open the harbour comparison, read the heights of `#panel-right` and the sticky block (tabs + bar), compute the share, write it in the run document.
  - Branches / failure paths: above 35 %: build option B (DEC-3) and measure again.
  - Final output / rendered result: the verdict line of the run document.
  - Linked PRD IDs: REQ-3

# Reliability, Performance, and Scalability

The change adds one `offsetHeight` read of two elements per render (forced layout once, already done by `syncDiagramKey`). The sticky block removes no rows; the list renders as before, so the 360-change case costs what `reading-changes.test.js` already walks. Testability: all behavior is CSS plus one measuring function; layout is only checkable in the browser (CON-5), markup in Node.

# Security and Privacy

None material: no input, address, storage or network change.

# Observability and Verification

- Node, `src/test/javascript/viewpoint-kernel/walk-bar.test.js` (the harness of `reading-changes.test.js`): (a) `renderChangesPanelHtml` on the harbour pair has one `[data-changes-walkbar]`, a direct child of `.changes-panel`, outside `.changes-reading`, holding the two `data-action`s and the position; (b) an identical-plateaus comparison (no change) renders no walk bar; (c) the page-level writers (Plateaus, Applications, Environments, Elements, Stories with a view, a story's right panel) all return a panel containing the bar, by calling their writers as `reading-changes.test.js` does; (d) `j`/`k` tests unchanged and green.
- e2e, `src/test/e2e/changes-walk.spec.js` (Chromium and Firefox): serve the harbour files (a helper walks `src/test/resources/replaces-large-pair` into the `files` object of `serve(null, files)`), draw `after-declared` compared with `before` through the band, press *Next change* thirty times at 1280 x 800 and at 360 x 640, after each press wait for `.change-row.selected` and assert: the button's `boundingBox` is inside `#panel-right`'s, and the row's top >= the bottom of the sticky block. A negative run on the unfixed page (the code of today) must fail; it is shown once and recorded.
- Measure: the same spec logs (or a one-shot script) `stickyHeight / panelHeight` at 360 x 640; the number goes in the run document with the verdict.
- Commands: `npm run editor:build`, `npm run test:unit`, `npm run lint`, `npm run format:check`, `npm run editor:check`, `./mvnw verify` (Page job inputs; the Java suite reads the page), `npm run test:e2e` after `./mvnw package`.

# Deployment and Rollout

Code-only, view only, no migration. Verified on the PR's `Page` and `E2E` jobs; the Safari behavior is not proved (Q-1). Backward compatible: no saved or addressed state. Rollback: revert the commit and rebuild the page.

# Risks and Tradeoffs

- RISK-1: the sticky block is too tall at 360 x 640 (estimated 85 to 115 px of a 320 px panel, up to about 36 %). Mitigation: measured; option B via DEC-3. The row may be trimmed first (a single-line bar at narrow width by shortening nothing: the labels are kept).
- RISK-2: the tabs' height is measured after the panel is written; a late font load changes it. Mitigation: the `resize` hook and the next redraw re-measure; the CSS defaults keep the bar visible, at worst overlapping the tabs by a few pixels for one frame.
- RISK-3: `scroll-padding-top` support. Chromium 111, Firefox 121 and Safari 16.2 (ASM-7, `browser-apis.test.js` deny list) support it; the test `browser-apis.test.js` must still pass (run it).
- RISK-4: `block: 'nearest'` changes where a clicked row lands for the other callers of `scrollChangesToSelection`. Accepted (IMP-3).
- RISK-5: sticky inside a scrolling panel in Safari. Not proved (Q-1).

# Design Decisions

- DEC-1 — Option A, a sticky walk row
  - Decision: stick `[data-changes-walkbar]` under the tabs; filters and counts scroll.
  - Rationale: RFC-001 rule 5; the smallest change; the tabs are already sticky in the same container.
  - Alternatives considered: option B (rows in their own scroll box) as the fallback; option C (rail) rejected for this wave.
  - Tradeoffs: the sticky block costs panel height at 360 px (RISK-1).
  - Linked PRD IDs: REQ-1, REQ-3
- DEC-2 — Measure the sticky heights in JS and expose them as custom properties
  - Decision: `syncRightPanelSticky()` sets `--right-tabs-h` and `--right-walk-h`.
  - Rationale: the bar's `top` and `scroll-padding-top` need the tabs' and the bar's real heights; the bar wraps at 360 px, so a constant is wrong.
  - Alternatives considered: fix the heights in CSS (brittle with wrapping and zoom); put the tabs and the bar in one sticky wrapper (they are written by different functions and pages, and the Plateaus page has no tabs).
  - Tradeoffs: one forced layout per render; not testable in Node.
  - Linked PRD IDs: REQ-2
- DEC-3 — The 35 % rule decides B
  - Decision: if the measure (tabs + bar over the panel at 360 x 640) is above 35 %, switch to option B and keep the same markup (CTR-1).
  - Rationale: RFC-001 rule 5 and gate 3.
  - Alternatives considered: shrinking the bar (hiding "n of N") (rejected: loses the position the reader needs).
  - Tradeoffs: B adds a nested scroll area.
  - Linked PRD IDs: REQ-3
- DEC-4 — `block: 'nearest'` for the selected row
  - Decision: replace `'center'` by `'nearest'` in the scroll step of `render()`.
  - Rationale: with a sticky block, centering still moves the list on every press; nearest moves by the least.
  - Alternatives considered: custom `scrollTop` arithmetic (reimplements the browser).
  - Tradeoffs: see RISK-4.
  - Linked PRD IDs: REQ-2

# Open Questions

- Q-1 (stays deferred to the record, not a blocker; not resolvable without Safari, Stage 6 confirmed): does sticky behave the same in Safari/WebKit inside a scrolling panel? The wave marks it not proved; the spec runs in Chromium and Firefox (CON-6). The manual's limits sentence says so.
- Q-2 (tradeoff, resolved by ASM-4): the gate's "a list shorter than the panel renders no sticky block more than the tabs" could mean a short non-empty list drops the bar. Resolved: only the empty list does; a short list's bar is harmless and keeps one behavior. Stage 6 revisited and confirmed: only the empty list drops the bar.
- Q-3: exact `top` offset at the Plateaus page inside `.right-panel` padding; resolved at Stage 6: `.right-panel` has `padding: 1rem` and is the scroll container (`style.css` line 244), so the sticky `top` is `-1rem` to sit flush with the panel edge; the e2e still measures it as the check.

# Deferred Work

- DEF-1: WebKit run of the walk spec and the real Safari.
- DEF-2: folding the filters into the sticky block or the rail (W-4, #179 option C).

# File Placement and Frontmatter

Saved as `docs/wav/wav-027-editor-layout-and-walk/run/run-0201-sticky-walk-bar/tdd-0201-sticky-walk-bar.md`, following the run folders of wave 026 (`tdd-NNNN-slug.md`), with the frontmatter above (`type: tdd`, `run: 0201`, `wave: 027`). Review pass: not run at this stage; Stage 5 is a different agent's KDMLLC review, so the drafter does not review its own text.
