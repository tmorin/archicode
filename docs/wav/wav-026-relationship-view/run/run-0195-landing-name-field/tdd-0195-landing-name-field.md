---
title: Landing name field
type: tdd
status: draft
run: 0195
wave: 026
owner: tmorin
date: 2026-10-28
related:
  - 'gh:tmorin/archicode#177'
  - docs/wav/wav-026-relationship-view/wav-026-relationship-view.md
---

# Landing name field

# Summary

The name field of *New workspace in this browser* and of *Rename* on the landing card is drawn about 10rem tall instead of one line (#177). This design fixes the sizing rule in `style.css`, pins the field height in the browser e2e spec at desktop width and at 360 px in Chromium, Firefox and WebKit, and rebuilds the page. There is no PRD: the run profile is TDD+pln and the sources are issue #177 and the wave plan, so traceability is incomplete (see PRD Traceability).

# Scope

In scope: the rules `.landing-browser-label` and `.landing-browser-input` of `src/main/editor/style.css`, the generated page `src/main/resources/editor-webapp/standalone.html`, `src/test/e2e/browser-workspace.spec.js`, and the sentence of `CLAUDE.md` or the manual only if one describes the field (none found by grep of `src/doc/*.adoc`). Out of scope: the markup of `renderBrowserNameFieldHtml` (`presentation/landing.js`), the flows, the store, any other landing control.

# PRD Traceability

No PRD. The requirements are taken from #177 and the P1 gate of the wave manifest:

- `REQ-1` (#177 expected): the field is one line high and as wide as the form allows, with *Create* and *Cancel* (or *Rename* and *Cancel*) next to it, in the new-workspace form and in the rename row.
- `REQ-2` (#177 to do, P1 gate): an e2e check in Chromium, Firefox and WebKit that the field is no taller than one line of text plus its padding, at desktop width and at 360 px, for the new-workspace field and for the rename field.
- `REQ-3` (#177 to do): the 360 px layout keeps working: no horizontal scroll of the page, buttons reachable.
- `REQ-4` (#177 to do, P1 gate): `npm run editor:build` is run and the page committed with the part; `test:unit`, `lint`, `format:check`, `editor:check` pass, `ratchet.max` not above 99.

All four are addressed; they are assumed rather than sourced from a PRD.

# Technical Goals

- TG-1: the input takes its height from its font and padding, never from a flex basis (REQ-1).
- TG-2: its width comes from the form: it fills the label, and the label takes the row's free width (REQ-1, REQ-3).
- TG-3: an e2e assertion fails on the code of today and passes on the fix, in the three engines, at two widths, for both forms (REQ-2).
- TG-4: nothing else moves: no markup, no saved file, no address, no cache (view only).

# Non-Goals

- Redesigning the landing card or its buttons.
- A node test of the height: the node harness has no layout, so a pixel check cannot be written there (see DEC-3).
- Testing the real Safari (a pass in Playwright's WebKit is not a pass in Safari).

# Assumptions

- ASM-1: the cause is the one the issue names. `.landing-browser-label` is a column flex container, and `.landing-browser-input { flex: 1 1 10rem }` is a flex item of it, so the 10rem basis is a height. Validate first by measuring the input in the e2e spec on the unfixed page (the test must fail there) and then by the fix turning it green.
- ASM-2: the global rule `input[type="text"]` (line 80) gives `padding: 0.3rem 0.5rem` and a 1px border with `!important`, and the text height is the inherited `font: inherit`; so "a line plus padding" is `line-height + 2 * 0.3rem + 2 * 1px`. The test allows a margin rather than computing it exactly (DEC-2).
- ASM-3: the row of the form (`.landing-browser-edit`, a wrapping row flex) keeps the label at `flex: 1 1 10rem`, which is a width there; at 360 px the card's inner width (about 360 - 2 * 1rem of page padding - 2 * 1.75rem of card padding, about 270 px) holds the label at 160 px and one button, so the buttons may wrap under the field. This is accepted: REQ-1 asks for the buttons on the same row where the form is wide enough, and REQ-3 asks only that the layout works. Validate by a screenshot at 360 px and by the no-horizontal-scroll check.

# Constraints

- CON-1: `standalone.html` is generated; edit `src/main/editor/style.css` and run `npm run editor:build`, commit both (`CLAUDE.md`, the editor page paragraph).
- CON-2: `npm run format:check` covers `style.css` (Prettier) and the spec; format before the build.
- CON-3: `ratchet.max` in `layers.json` stays at 99 or below; a CSS-only change does not touch it.
- CON-4: the e2e specs run with one worker and no retry; the new assertions must not be timing-dependent (measure after the field is visible, with `toBeVisible` then `boundingBox`).
- CON-5: the commit subject is `fix: ...` (Conventional Commits); it is a change in style only, not a `refactor: move`.
- CON-6: no file under `src/doc` is written by this run (the wave's overlap verdict with W-2).

# Current State

`src/main/editor/style.css`, lines 131 to 134:

- `.landing-browser-edit`: `display: flex; flex-wrap: wrap; align-items: flex-end; gap: 0.4rem 0.5rem; min-width: 0` (the form, a row).
- `.landing-browser-label`: `flex: 1 1 10rem; min-width: 0; display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.8rem` (the label with its caption and the input, a column).
- `.landing-browser-input`: `flex: 1 1 10rem; min-width: 0; max-width: 100%; box-sizing: border-box`.

`renderBrowserNameFieldHtml(draft, className)` (`presentation/landing.js`, line 163) writes `form.landing-browser-edit > label.landing-browser-label > (span, input.landing-browser-input)`, then the two buttons and the optional problem paragraph. It is used by *New workspace* (under the section "In this browser") and by the rename row of the list (`renderBrowserRowHtml`). The row of the form is `align-items: flex-end`, so the buttons sit at the foot of the label.

The e2e spec `src/test/e2e/browser-workspace.spec.js` creates a workspace (`page.getByRole('textbox').fill(...)`, line 39) and renames one (line 97) but never measures the field. Its project matrix already includes WebKit.

# Proposed Design

Change the one rule so that the input is not a flex item with a basis:

```css
.landing-browser-input { width: 100%; min-width: 0; box-sizing: border-box; }
```

`flex` is dropped (an item of a column flex container with `flex: none` default `auto` basis takes its content height, which is one line), `width: 100%` makes it fill the label (which is stretched by the column's default `align-items: stretch`, so `width: 100%` is only a guard for the browsers that size an input by its `size` attribute), and `max-width: 100%` is redundant with `width: 100%` plus `box-sizing: border-box` and is removed. The label keeps `flex: 1 1 10rem` in the row of the form, where it is a width, as intended.

No change to the markup or to the label rule is needed (DEC-1). The text pins the cause in a short comment above the rules, so a later edit does not put the basis back.

The e2e assertion (DEC-2) is a helper `expectOneLineField(page, input)` in the spec: it reads `boundingBox()` of the input and `getComputedStyle` of the same element (`lineHeight`, `paddingTop`, `paddingBottom`, `borderTopWidth`, `borderBottomWidth`, `fontSize`) through `locator.evaluate`, and expects `box.height <= lineHeight + paddings + borders + 2` (the line height `normal` is turned into `1.5 * fontSize`, the largest `normal` takes in common fonts). The 10rem fault is 160 px, against an expected height near 30 px, so the margin is no weakness. It also expects the input's width to be at least half of the form's width at desktop, and no horizontal scroll of the document (`scrollWidth <= clientWidth`) at 360 px.

# Repository Impact

- IMP-1 — the sizing rule
  - Path(s): `src/main/editor/style.css` (rule `.landing-browser-input`, line 133, and one comment line)
  - Change type: modify
  - Why impacted: the flex basis is read as a height in a column container (ASM-1).
  - Linked PRD IDs: REQ-1, REQ-3
  - Risks / notes: the same rule serves the rename row; both are in the e2e check. Dark mode and the `!important` padding of the global input rule are unaffected.
- IMP-2 — the generated page
  - Path(s): `src/main/resources/editor-webapp/standalone.html`
  - Change type: modify (regenerated by `npm run editor:build`)
  - Why impacted: the page is the assembly of `style.css`.
  - Linked PRD IDs: REQ-4
  - Risks / notes: committed with IMP-1 so that `npm run editor:check` and the `--statements HEAD` test see a page equal to its parts (run 0189 saw that test fail until the change was committed; the orchestrator commits).
- IMP-3 — the e2e pin
  - Path(s): `src/test/e2e/browser-workspace.spec.js`
  - Change type: additive (one helper, one new test; the existing test is unchanged)
  - Why impacted: REQ-2.
  - Linked PRD IDs: REQ-2, REQ-3
  - Risks / notes: the new test opens the card with an empty store (a fresh page in `hosted`), so it needs no JVM.
- IMP-4 — documentation
  - Path(s): none planned (`CLAUDE.md` describes the store and flows, not the field's CSS; grep of `src/doc/*.adoc` finds no sentence on the field).
  - Change type: none
  - Why impacted: not impacted; re-check with `grep -rn "landing-browser" CLAUDE.md src/doc` at implementation and report in the run document.
  - Linked PRD IDs: REQ-1
  - Risks / notes: if a sentence is found, change it and say so in the run document.

# Canonical Impact

Not applicable: no canonical registers declared (`docs/CLAUDE.md` does not exist in this repository).

# Data Model and Contracts

None. No data structure, file format, address, saved file, API or configuration changes. The markup contract of `renderBrowserNameFieldHtml` (the classes `landing-browser-edit`, `landing-browser-label`, `landing-browser-input`, the attributes `data-browser-name`, `data-browser-name-form`, `data-action`) is unchanged, and the existing node tests that read it (`browser-workspaces-flows.test.js`, `sample-landing.test.js`) stay as they are.

# Interfaces and Behavior

- IF-1: *New workspace in this browser* opens a form whose text field is one line high and fills the label; *Create* and *Cancel* are on the row at the foot of the field when the width allows, else on the next row.
- IF-2: *Rename* opens the same form in the row of the workspace, with the same sizes.
- IF-3: a refusal sentence (`landing-folder-problem`) is drawn under the row as before; the field keeps its height when the sentence appears (`aria-invalid` is set, nothing else).

# Flows and Processing Logic

- FLOW-1 — measure the field
  - Trigger: the e2e test opens the hosted page at a viewport (desktop 1280 x 800 by the Playwright default, then 360 x 740) and presses *New workspace in this browser*.
  - Steps: wait for the textbox to be visible; measure it (`boundingBox`, computed style); assert the height and, at 360 px, the document's scroll width; create the workspace (so the rename test has one); close it; press *Rename*; wait for the textbox; measure again; press Escape to leave.
  - Branches / failure paths: on the unfixed page the height is 160 px or more and the first assertion fails with the measured height in the message.
  - Final output / rendered result: no state is kept; each test uses a fresh page, hence an empty store.
  - Linked PRD IDs: REQ-2, REQ-3

# Decisions

- DEC-1 — fix the input rule, not the label or the markup
  - Decision: replace `flex: 1 1 10rem; max-width: 100%` of `.landing-browser-input` by `width: 100%`; leave the label and the markup alone.
  - Rationale: the label's `flex: 1 1 10rem` is a correct width in the row; only the input's basis is wrong. The smallest change that removes the cause.
  - Alternatives considered: (a) `flex: none` on the input (works, but leaves the width to the `size` attribute in some engines); (b) make the label a block and drop its flex column (changes the caption layout and the gap rule); (c) set `height: auto` (does not defeat a flex basis in a column).
  - Tradeoffs: `width: 100%` plus the label's stretch is redundant by design; the comment says so.
  - Linked PRD IDs: REQ-1, REQ-3
- DEC-2 — measure with a margin, in the e2e spec, on both forms
  - Decision: assert `height <= line + padding + border + 2 px` and a width and scroll check, for the new-workspace and the rename field, at 1280 and 360 px, in the three projects (the spec is in the WebKit `testMatch` already).
  - Rationale: a pixel-exact value depends on the engine's font; the fault is a factor of five, so a small margin keeps the test stable and still fails on the fault.
  - Alternatives considered: a fixed `< 60 px` limit (simpler, but blind to a font-size change); a screenshot comparison (engine-dependent, no baseline kept in this repository).
  - Tradeoffs: the helper reads computed styles; it is longer than a constant but it states the rule of the issue ("a line of text plus its padding").
  - Linked PRD IDs: REQ-2
- DEC-3 — no node test
  - Decision: the pin is the e2e spec only.
  - Rationale: the node harness loads the page with no DOM and no layout, so it cannot see a height. A node test of the CSS text (a regex on the rule) would pin the spelling, not the behavior, and would fail a correct different fix.
  - Alternatives considered: a test that reads `style.css` for the absence of `flex: 1 1 10rem` on `.landing-browser-input`; rejected for the reason given.
  - Tradeoffs: the guard runs in the E2E job only, not in `npm run test:unit`.
  - Linked PRD IDs: REQ-2
- DEC-4 — buttons may wrap at 360 px
  - Decision: do not force the buttons onto the field's row at 360 px.
  - Rationale: the card's inner width there (ASM-3) cannot hold a 10rem label and two buttons; forcing it would shrink the field below usable or overflow. The issue's "expected" applies where the form allows.
  - Alternatives considered: a smaller label basis (`flex: 1 1 6rem`) so that one button fits; rejected, it changes the desktop look for no stated need.
  - Tradeoffs: at 360 px the buttons are on a second row.
  - Linked PRD IDs: REQ-1, REQ-3

# Reliability, Performance, and Scalability

CSS only; no cost. The e2e test adds two short page loads per project (about a second each, no JVM).

# Security and Privacy

None. No input handling changes.

# Observability and Verification

- Red first: write the spec, run it on the unfixed built page in Chromium (`npx playwright test src/test/e2e/browser-workspace.spec.js --project=chromium`), see it fail with the measured height; record the output in the run document.
- Fix, `npm run format`, `npm run editor:build`; run the spec in `--project=chromium --project=firefox --project=webkit`.
- `npm run test:unit` (the pretest hook builds the page), `npm run lint`, `npm run format:check`, `npm run editor:check` (upward pairs not above 99).
- Look at the card at 1280 and 360 px once, in a browser, and record that the field is one line and nothing scrolls sideways (ASM-3).
- Not run: the tag run, the real Safari.

# Deployment and Rollout

Code-only (CSS and a test), shipped with the page on the next tag. No migration. Rollback is a revert of the commit; the page and the source revert together. Backward compatibility: nothing stored depends on it.

# Risks and Tradeoffs

- RISK-1: the engines size the input differently (the `size` attribute default of 20 characters): covered by `width: 100%` and by the three-engine run (DEC-1, DEC-2).
- RISK-2: a margin that is too tight fails on a font fallback in CI: the margin is 2 px over line, padding and border, with `normal` read as 1.5 times the font size; if CI shows a flake, widen the margin, never retry (the suite has no retry).
- RISK-3: the rename row sits in a list item (`li.landing-folder`, a wrapping row flex): the label's `flex: 1 1 10rem` there is a width as well; checked by the rename measurement.
- RISK-4: the page committed with a stale build fails `editor:check`; run `npm run editor:build` last.

# Open Questions

None open. The 360 px button placement is decided in DEC-4; the exact margin of DEC-2 is a tuning value and not a question.

# Deferred Work

- DEF-1: a visual regression baseline for the landing card (screenshots per engine); not in this repository's practice today.

# File Placement and Frontmatter

Saved as `docs/wav/wav-026-relationship-view/run/run-0195-landing-name-field/tdd-0195-landing-name-field.md`, `type: tdd`, `run: 0195`, `wave: 026`, following the run folders of wave 025.
