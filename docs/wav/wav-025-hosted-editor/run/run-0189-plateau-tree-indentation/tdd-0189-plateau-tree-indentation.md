---
title: Plateau tree indentation
type: tdd
status: draft
run: 0189
wave: 025
owner: tmorin
date: 2026-10-27
related:
  - 'gh:tmorin/archicode#175'
  - docs/wav/wav-025-hosted-editor/wav-025-hosted-editor.md
---

# Plateau tree indentation

# Summary

The editor caps the depth of a plateau at 6 when it indents the Plateaus page and the two lists of the band, so a chain longer than seven plateaus reads as siblings (#175). This design removes the cap in the three places, keeps the indentation strictly growing with the depth for a chain of any length, and makes it fit at 360 px. There is no PRD: the run profile is TDD+pln and the sources are issue #175 and the wave plan, so traceability is incomplete (see PRD Traceability).

# Scope

In scope: `timelineItemHtml` (card of the page Plateaus), `bandPlateauSelectHtml` and the "Compare with" list (`plateau-band.js`), the `.timeline-item` rule of `style.css`, the node test, the manual line if one exists, `CLAUDE.md` where it describes the indentation (the paragraph on the band says "indented by its depth with em spaces, `BAND_INDENT`"). Out of scope: any change to the tree (`bandTreeOf`), to the kernel, the command line, `plateau list`.

# PRD Traceability

No PRD. The requirements are taken from the acceptance of #175 and the wave manifest (W-1 focus and the P1 gate); they are labelled here so that the plan can cite them:

- `REQ-1` (#175 acceptance 1): the indentation of a plateau grows with its depth for a chain of any length, on the page Plateaus and in the two band lists.
- `REQ-2` (#175 acceptance 2, P1 gate): a node test with a chain of at least ten plateaus asserts it for the page and for both band lists.
- `REQ-3` (wave scope): checked at 360 px (`[[editor-small-screen]]`), with the reason for the choice said.
- `REQ-4` (P1 gate): `npm run test:unit`, `lint`, `format:check`, `editor:check` pass, `ratchet.max` not above 99.

All four are addressed. The requirements are assumed rather than sourced from a PRD.

# Technical Goals

- TG-1: no `Math.min(depth, 6)` remains; the depth reaches the markup unchanged (REQ-1).
- TG-2: a chain of N plateaus has N distinct, increasing indentations on the page and in both lists (REQ-1, REQ-2).
- TG-3: a long chain does not push the cards out of a 360 px screen (REQ-3).
- TG-4: nothing else in the saved files, the address or the caches changes (view only).

# Non-Goals

- A different presentation of the tree (flat list with an "overrides" link, collapsing). #175 allows it as an alternative; not needed.
- A change of what the band lists show or of their order.

# Assumptions

- ASM-1: the chain depth stays within the hundreds at most; no workspace has thousands of plateaus. Validated by the test with 40 plateaus.
- ASM-2: an `<option>` keeps leading em spaces (the existing comment on `BAND_INDENT` says so); long runs of them are not collapsed. Validated by the string assertion in the node test; the browser behaviour is the existing one.

# Constraints

- CON-1: the page `src/main/resources/editor-webapp/standalone.html` is generated; edit `src/main/editor/` and run `npm run editor:build`, commit sources and page together.
- CON-2: ratchet `ratchet.max` stays at or below 99; no new name crosses a layer upward (no new top-level name is planned).
- CON-3: Prettier formats the sources; `style.css` is covered; `names.json` changes only if a top-level name is added.
- CON-4: the node suite has no layout engine; indentation is asserted from the markup and the CSS text, not from pixels.

# Current State

- `src/main/editor/presentation/pages-plateaus-files.js`, `timelineItemHtml(item, depth)`: writes `style="--depth:` + `Math.min(depth, 6)`. `timelineListHtml` walks the tree from `bandTreeOf(AppState.plateauTree)` with `depth + 1` per child.
- `src/main/editor/style.css` line 177: `.timeline-item { margin-left: calc(var(--depth, 0) * 1rem); ... }`; a `@media (max-width: 40rem)` block exists near line 928.
- `src/main/editor/presentation/plateau-band.js`: `BAND_INDENT = ' '`; `BAND_INDENT.repeat(Math.min(depth, 6))` in `bandPlateauSelectHtml` (line ~60) and in the "Compare with" list (line ~107).
- Result: depth 7 and beyond render at the depth-6 indentation. Existing tests that touch the page (`editor-at-360-px.test.js`, `styles.test.js`) are to be read before editing; none is known to assert the cap.

# Proposed Design

Remove the cap in all three places and bound the width a deep chain takes with CSS only.

- Markup: `--depth:<depth>` uncapped, plus `data-depth="<depth>"` on the `li` (a stable hook for the test and for the CSS; additive).
- Band: `BAND_INDENT.repeat(depth)`.
- CSS: the step stays `1rem` on wide screens; under `max-width: 40rem` the step is `0.5rem`, so a chain of 20 uses 10rem of 22.5rem at 360 px, and a chain of 40 would leave the card narrow but never negative. The card keeps `min-width: 0` and `overflow-wrap: anywhere`, which it has.

DEC-1 — Uncapped linear indentation
- Decision: indentation is `depth * step` with no cap; the step is 1rem, 0.5rem under 40rem.
- Rationale: it is the smallest change that meets #175 acceptance 1 literally, and it keeps one visual rule for the tree (each plateau one step right of its parent). The 360 px case is handled by a smaller step, not by dropping the rule.
- Alternatives considered: (a) a capped step with a depth marker ("level 8") past a threshold: indentation would again stop growing, so a chain reads as siblings except for the marker, and the band `<option>` list would need the marker in its text; (b) a flat list with a visible "overrides" link: a redesign of the page; (c) a step that shrinks as the depth grows so that the total is bounded (`min(depth, k)` is the same cap again; a harmonic step stays increasing but needs `calc` division by a variable and is unreadable at depth 20).
- Tradeoffs: a chain of 30 at 360 px leaves a narrow card (15rem used of 22.5rem); accepted, a chain that long is not in any shipped workspace, and the text wraps (`overflow-wrap: anywhere`).
- Linked PRD IDs: REQ-1, REQ-3.

DEC-2 — Test the markup and the CSS text, not pixels
- Decision: the node test builds a chain of 12 plateaus (and one of 40 for the narrow-screen rule), renders the page list and both band lists through the existing page harness, and asserts the `--depth` values and the em-space counts are strictly increasing 0..N-1; a second assertion reads the CSS text and asserts the `--depth` rule has no cap and that the narrow-screen rule sets the smaller step.
- Rationale: CON-4. The measure of #175 (x=186, 202, 218...) is a layout result; the markup is its cause.
- Alternatives considered: a Playwright spec measuring `getBoundingClientRect` in Chromium and Firefox. More faithful, but the P1 gate names a node test, and the e2e suite is slow; offered as a deferred item (DEF-1).
- Tradeoffs: the node test cannot catch a CSS rule that overrides `margin-left` later in the sheet; mitigated by asserting the rule that defines it is unique.
- Linked PRD IDs: REQ-2, REQ-3.

# Repository Impact

- IMP-1 — Card of the page Plateaus
  - Path(s): `src/main/editor/presentation/pages-plateaus-files.js`
  - Change type: modify
  - Why impacted: remove `Math.min(depth, 6)`, add `data-depth`.
  - Linked PRD IDs: REQ-1
  - Risks / notes: none known beyond tests that compare the page's HTML with a stored one (read `styles.test.js`, `header.test.js`, `editor-structure.test.js` before editing).
- IMP-2 — Band lists
  - Path(s): `src/main/editor/presentation/plateau-band.js`
  - Change type: modify
  - Why impacted: two `Math.min(depth, 6)` removed; update the two doc comments that say the indent is by depth (they stay true).
  - Linked PRD IDs: REQ-1
  - Risks / notes: the drawn plateau stays greyed in "Compare with"; nothing else changes.
- IMP-3 — Style sheet
  - Path(s): `src/main/editor/style.css`
  - Change type: modify
  - Why impacted: a `--timeline-step` custom property (1rem) overridden to 0.5rem in the `max-width: 40rem` block; `.timeline-item` margin uses it.
  - Linked PRD IDs: REQ-3
  - Risks / notes: add the rule to the existing narrow-screen block, no second block.
- IMP-4 — Generated page
  - Path(s): `src/main/resources/editor-webapp/standalone.html`
  - Change type: modify (generated)
  - Why impacted: output of `npm run editor:build`.
  - Linked PRD IDs: REQ-4
  - Risks / notes: commit with the sources.
- IMP-5 — Test
  - Path(s): `src/test/javascript/viewpoint-kernel/plateau-tree-indentation.test.js` (new; the path is the one the run document of W-1 must name)
  - Change type: additive
  - Why impacted: REQ-2.
  - Linked PRD IDs: REQ-2
  - Risks / notes: build the 12-plateau chain with the helper the other plateau tests use (read `plateau-model.test.js` and the harness first); do not invent a loader.
- IMP-6 — Documentation
  - Path(s): `CLAUDE.md` (the band paragraph, "indented by their depth"), `src/doc/**/*.adoc` (`editor-band`, `editor-small-screen`: a line only if they state the cap or the 360 px measures)
  - Change type: modify
  - Why impacted: say the indentation is not capped and the step at 360 px.
  - Linked PRD IDs: REQ-3
  - Risks / notes: none found to say "6" today (to confirm by `grep`).

# Canonical Impact

Not applicable — `docs/CLAUDE.md` does not exist in this repository, so no canonical registers are declared.

# Data Model and Contracts

- CTR-1 — Markup of a plateau card
  - Current contract: `li.timeline-item[style="--depth:0..6"]`.
  - Proposed contract: `li.timeline-item[data-depth="N"][style="--depth:N"]`, N the exact depth (root 0).
  - Affected files: IMP-1, IMP-3.
  - Migration or compatibility notes: view only; no file, address or cache key holds it.
  - Linked PRD IDs: REQ-1
- CTR-2 — Label of a band option
  - Current contract: `depth` capped at 6 em spaces then the label.
  - Proposed contract: exactly `depth` em spaces then the label.
  - Affected files: IMP-2.
  - Migration or compatibility notes: the option `value` is unchanged.
  - Linked PRD IDs: REQ-1

No file format, kernel contract or command-line output changes; `scripts/byte-identity.sh` must show nothing.

# Interfaces and Behavior

- IF-1: the Plateaus page shows each plateau one step right of its parent, at any depth.
- IF-2: the lists *Plateau* and *Compare with* show the same tree with one more em space per level.
- IF-3: at under 40rem the step is half as wide; text wraps in the card.

# Flows and Processing Logic

- FLOW-1 — Render
  - Trigger: any render of the page Plateaus or of the band.
  - Steps: `bandTreeOf` builds the tree; the walk passes `depth`; `timelineItemHtml` writes `--depth` and `data-depth`; the band walks write `BAND_INDENT.repeat(depth)`.
  - Branches / failure paths: no tree (`!root`) returns the empty string, as before.
  - Final output / rendered result: nested cards, indented options.
  - Linked PRD IDs: REQ-1

No diagram: no change in relationships between components.

# Reliability, Performance, and Scalability

`String.prototype.repeat` of a depth of a few hundred is negligible. A depth so large that the row exceeds the select's width is cut by the browser, not an error. Testability: the markup is pure string output.

# Security and Privacy

Not applicable beyond existing escaping: `depth` is a number computed by the walk; ids still go through `escapeHtml`.

# Observability and Verification

- `npm run editor:build`, then `npm run test:unit` (or `node --test src/test/javascript/viewpoint-kernel/plateau-tree-indentation.test.js` after the build), `npm run lint`, `npm run format:check`, `npm run editor:check` (ratchet at most 99).
- The new test asserts: 12 cards with `data-depth` 0..11 and `--depth` equal to it; both band lists with 0..11 leading em spaces; the CSS has no cap and defines the narrow step; a test of the test: with the cap restored the assertions fail (run once, record in the run document).
- By eye once at 360 px with `archicode editor serve` on a copy of a chain of ten plateaus (the issue's reproduction), recorded in the run document; `npm run test:e2e` stays green (no spec is expected to change).
- `scripts/byte-identity.sh` is not needed (the command line is untouched) but costs nothing to skip; state that in the run document.

# Deployment and Rollout

Code-only, view-only change shipped with the page. Backward compatible; rollback is a revert of the commit. Planning guidance only.

# Risks and Tradeoffs

- RISK-1: a stored HTML expectation in an existing test contains `--depth:6` for a deeper plateau or a band label; the full `npm run test:unit` finds it. Low.
- RISK-2: the generated page is stale; `npm run editor:check` catches it.
- RISK-3: very deep chains are cramped at 360 px (DEC-1 tradeoff).

# Open Questions

None open.

- Q-1 (resolved, Stage 6): are the 0.5rem step at under 40rem and the 12/40 plateau chains the right numbers? Resolution: kept as DEC-1 decides. The numbers are a cosmetic choice with no external fact to look up, they are the smallest change that meets #175 acceptance 1, and the 12-chain (beyond the old cap of 6, and past ten as the P1 gate asks) and the 40-chain (narrow-screen rule) are test inputs, not product limits. The look at 360 px stays an implementation check recorded in the run document, as under Observability and Verification; it can only change the step, not the design. Note from the Stage 5 review, to apply when the TDD is revised: the 0.5rem step is better written as one rule in the existing narrow-screen query than as a new custom property, and the "never negative" claim in DEC-1 should say the layout overflows near 45 levels at 360 px. Neither changes the resolution. No blocker.

# Deferred Work

- DEF-1: a Playwright spec that measures the cards' x positions in a browser (the original measure of #175).
- DEF-2: a collapse of a branch of the tree for very long chains, if a workspace ever needs it.

# File Placement and Frontmatter

Saved as `docs/wav/wav-025-hosted-editor/run/run-0189-plateau-tree-indentation/tdd-0189-plateau-tree-indentation.md`, with `type: tdd`, `run: 0189`, `wave: 025`.
