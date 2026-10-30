---
title: Workspace menu overflow
type: tdd
status: draft
run: 0205
wave: 028
owner: tmorin
date: 2026-10-30
related:
  - 'gh:tmorin/archicode#182'
  - docs/wav/wav-028-fold-and-browser-menu/wav-028-fold-and-browser-menu.md
  - docs/wav/wav-027-editor-layout-and-walk/run/run-0204-toolbar-review/run-0204-toolbar-review.md
---

# Workspace menu overflow

# Summary

In a browser workspace the *Workspace* menu draws its items on top of each other, and the top bar is wider than the window (#182: *Close workspace* is cut off at a narrow width; run 0204 measured 572 px of bar in a window of 360 px). This design fixes both in CSS: the menu items get back their own box (the cause is the rule `.top-panel button`, which sizes every button inside the bar, the menu's included), and the group of buttons on the right of the bar wraps. A new end-to-end spec in Chromium, Firefox and WebKit, at 1280 px and at 360 px, proves it. There is no PRD: the run profile is TDD+pln and the sources are #182 and the P1 gate of the wave manifest, so traceability is incomplete (see PRD Traceability). Diagrams are skipped: one component's CSS, no new boundary and no branching flow.

# Scope

In scope: the rules of `.workspace-menu`, `.workspace-item`, `.top-actions` and `.top-panel` in `src/main/editor/style.css`; the generated page `src/main/resources/editor-webapp/standalone.html`; one node test, one end-to-end spec, the WebKit `testMatch` of `playwright.config.js`; the sentences of `src/doc/README.adoc` (`[[editor-small-screen]]`) and `CLAUDE.md` that describe the bar. `presentation/top-panel.js` and `names.json` change only if the measurement (task 1) shows the markup must change (see DEC-4). Out of scope: the help menu `.help-menu`, the diagram toolbar (RFC-002, the build waits), the landing card, the behaviour of the Workspace flows, the served-folder bar, any JavaScript behaviour.

# PRD Traceability

No PRD. Requirements are taken from #182 (Expected and Acceptance) and the P1 gate of the wave manifest; assumed rather than sourced, so traceability is incomplete:

- `REQ-1` (#182 Expected): each menu item has its own box and the "Last exported" text sits under its title with no overlap, in the light and the dark theme.
- `REQ-2` (#182 Expected): at 360 px and at about 560 px the top bar wraps; no button is cut off and *Close workspace* is reachable.
- `REQ-3` (gate 2, #182 Acceptance): an end-to-end spec in Chromium, Firefox and WebKit opens the Brightcart sample at 1280 px and at 360 px, opens the menu, asserts that the bounding boxes of its items do not intersect and that every top bar button is inside the window.
- `REQ-4` (#182 Acceptance, gate 1): `npm run editor:build` run and the page committed with the part; `editor:check`, `test:unit`, `lint`, `format:check` pass; `ratchet.max` stays 99.
- `REQ-5` (wave completion): the narrow case of the Workspace menu is described in `[[editor-small-screen]]`.

All five are addressed; none is partial or unresolved.

# Technical Goals

- `TG-1` The items of the Workspace menu are laid out in their own boxes whatever the width (REQ-1).
- `TG-2` The top bar's right-hand group wraps instead of passing the window (REQ-2).
- `TG-3` The menu stays inside the window when the bar wraps (REQ-2, REQ-3).
- `TG-4` A test fails on the page as committed today and passes after the fix, in three engines (REQ-3).

# Non-Goals

- No move of *Close workspace* or *Workspace* into another menu, no icon-only buttons: the wave asks for a wrap or a fold, and the wrap is the smaller change (DEC-2).
- No change to the help menu, even though it has the same absolute-position pattern (Q-2, DEF-1).
- No change to the diagram toolbar or the centre header.
- The ratchet does not rise; no coverage floor is lowered.

# Assumptions

- `ASM-1` The overlap is caused by the cascade, not by the markup: the menu is a descendant of `header.top-panel`, so `.top-panel button { height: 2rem; padding: 0 0.8rem !important; white-space: nowrap }` (`style.css` line 169) applies to every `.workspace-item`. The item rule does not win: its `padding` is not `!important`, its `border: none`, `border-radius: 0` and `background: transparent` lose to the global `button { ... !important }` (lines 82), and nothing sets `height`. A two-line item (label plus note) is therefore a 2 rem box with a 1 px border whose content overflows into the next box. Validate: task 1 measures the computed `height`, `padding-block` and `border-top-width` of an item in a browser before any edit; if they differ, DEC-1 is revisited.
- `ASM-2` The bar is wider than the window because `.top-actions` is `display: flex` with no wrap and its children are `flex-shrink: 0` (lines 219 to 220); the bar itself wraps (line 164) but a single flex item cannot be narrower than its non-shrinking children. Validate: task 1 measures `scrollWidth` of `.top-actions` at 360 px (572 px by run 0204).
- `ASM-3` The Brightcart sample, opened by `SAMPLE_ADDRESS` of `src/test/e2e/hosted.js`, gives the widest bar a browser workspace has (name, tabs, notice, save status, *Save all changes*, *Workspace*, *?*, *Close workspace*), so a bar that fits for it fits for any workspace.
- `ASM-4` Playwright's WebKit lays out like the others for these properties (flex wrap, `min()`); this proves nothing about the real Safari (CON-5).

# Constraints

- `CON-1` The page `standalone.html` is generated; edit `src/main/editor/style.css` and run `npm run editor:build`, commit both (`CLAUDE.md`, The editor page is generated).
- `CON-2` Colours come from the tokens (`--bg`, `--fg`, `--border`, `--accent`, `--muted`, `--panel-bg`) so the dark theme follows; `css-theme-audit` tests read `style.css`.
- `CON-3` The global rule `button { ... !important }` (padding, border, border-radius, background) can be beaten only by another `!important` of higher specificity; the header overflow menu does exactly this (`style.css` line 839) and is the pattern to follow.
- `CON-4` One worker, no retry; the new spec starts no JVM (`startHostedPage`, `hosted.js`), as `hosted-acceptance.spec.js` does.
- `CON-5` Not proved by the run: the tag run, the native runner, the real Safari, a real phone.
- `CON-6` `ratchet.max` of `src/main/editor/layers.json` stays at 99; no new top-level name is expected (CSS only), so `names.json` stays as it is.

# Current State

- `src/main/editor/presentation/top-panel.js`: `renderWorkspaceButtonHtml` writes `<span class="workspace-wrap">` with the *Workspace* button and, when open, `renderWorkspaceMenuHtml()` (`div.workspace-menu`, `role="dialog"`). Each item is `workspaceMenuItemHtml` (`button.workspace-item` with a `span.workspace-item-label` and, when there is a note, `span.workspace-item-note`). In a browser workspace the items are *Export as a file* (note: "Last exported: ..." or the pending sentence) and, for the sample, *Reset to the sample…*. The reset question (`renderWorkspaceResetQuestionHtml`) replaces the items with a paragraph and two buttons in `.workspace-ask-actions`, which are also buttons inside the bar.
- `style.css` lines 227 to 240: `.workspace-wrap { position: relative }`, `.workspace-menu { position: absolute; top: calc(100% + 0.25rem); right: 0; width: min(21rem, calc(100vw - 2rem)) }`, the item rules (column flex, `width: 100%`, `padding: 0.35rem 1rem`, `border: none`, transparent background), `.workspace-item-note`, `.workspace-ask`, `.workspace-ask-actions`.
- The same bar rules size all the buttons the menu holds, including the two buttons of the reset question (`height: 2rem; white-space: nowrap`): "Reset “Brightcart”" is a long single line that `.workspace-reset` allows to wrap (`overflow-wrap: anywhere`), but `white-space: nowrap` and the 2 rem height defeat it.
- `.top-actions { display: flex; align-items: center; gap: 1rem; margin-left: auto; min-width: 0; max-width: 100% }`, children `flex-shrink: 0`; `.top-panel` wraps (`flex-wrap: wrap`).
- The only end-to-end opening of the menu is `openWorkspaceMenu` in `hosted.js`; no test measures boxes. Run 0204 measured the bar at 572 px in a 360 px window; `[[editor-small-screen]]` measured a served folder only, which has none of these buttons.
- `playwright.config.js` runs WebKit on an anchored list: `open-and-pages|browser-workspace|sample|hosted-acceptance`.

# Proposed Design

Two CSS changes and a test.

**The menu.** Inside `.workspace-menu` an item is a block of text, not a bar button. Scope the reset to `.workspace-menu .workspace-item` and `.workspace-ask-actions button` and make it win over `.top-panel button` and the global `button` rule: `height: auto; min-height: 2rem; padding: 0.35rem 1rem !important; border: 0 !important; border-radius: 0 !important; background: transparent !important; white-space: normal;` and the hover and focus rules with `!important`. The label and the note keep their rules; the note keeps `overflow-wrap: anywhere`. The reset question's buttons keep the border and radius of a button (they are buttons), and get `height: auto; min-height: 2rem; white-space: normal` so a long name wraps (DEC-1).

**The bar.** `.top-actions` gets `flex-wrap: wrap; justify-content: flex-end`, so that at a width where the group does not fit it takes a second row and every button stays in the window. Its children stay `flex-shrink: 0` (a button is never squeezed); the status line keeps its ellipsis rule (`.top-panel .save-status`). The group's `max-width: 100%` already caps it at the bar (DEC-2).

**The menu's anchor.** When the bar wraps, *Workspace* may sit at the left of its row and a menu anchored `right: 0` of `.workspace-wrap` would run off the left edge of the window. Under `@media (max-width: 40rem)` (the existing stacked-layout breakpoint, line 985) make `.workspace-wrap` static and `.top-panel` the positioned ancestor, so the menu is as wide as `min(21rem, 100vw - 2rem)` and right-aligned to the bar (DEC-3). At 1280 px nothing changes: the menu stays under its button.

```text
before (360 px)                      after (360 px)
[name/][tabs][..status..][Save]      [name/]
[Workspace][?][Close wor...  <-- cut [tabs]
 +--------------------+              [status][Save all changes]
 |Export as a file    |              [Workspace][?][Close workspace]
 |Last exported: [x] <- overlapped    +----------------------+
 |Reset to the sa..   |               | Export as a file     |
                                      | Last exported: never |
                                      | Reset to the sample… |
```

The sketch is the intended topology, not a measure: the exact row breaks are the browser's. If the measurement of task 1 shows that `.top-actions` with a wrap still leaves a child wider than 360 px (a 20-character folder name is the worst case of the sample, not of an import), the fallback is DEC-2's alternative.

## Design decisions

- `DEC-1` — The menu items are reset with `!important` at the item, not by moving the menu out of the bar.
  - Decision: add `height: auto; min-height: 2rem; padding: 0.35rem 1rem !important; border: 0 !important; border-radius: 0 !important; background: transparent !important; white-space: normal` to `.workspace-menu .workspace-item` (and the hover and focus backgrounds with `!important`), and `height: auto; min-height: 2rem; white-space: normal` to `.workspace-ask-actions button`.
  - Rationale: the header overflow menu (`style.css` line 839) already beats the same rules the same way (CON-3); the cause is the specificity and `!important` of two global rules (ASM-1), and the fix is local to the menu.
  - Alternatives considered: (a) change `.top-panel button` to `.top-panel > .top-actions > button` so it no longer reaches the menu, which narrows the selector for every other bar button and risks the help and tabs buttons; (b) render the menu with `div`/`role="menuitem"` instead of `button`, which changes markup, tab order and the focus code of `patchWorkspaceMenu`; (c) render the menu outside the header, in a body-level layer, which changes the patch function and the focus return.
  - Tradeoffs: more `!important`, which the file already uses for buttons; the reset sits next to the item rules, not in the bar's rule.
  - Linked PRD IDs: REQ-1, TG-1.
- `DEC-2` — The bar's right-hand group wraps; nothing is folded into a menu.
  - Decision: `.top-actions { flex-wrap: wrap; justify-content: flex-end }`.
  - Rationale: the wave's gate says "wraps or folds"; the wrap is one declaration, needs no JavaScript and keeps every button visible; `.top-panel` already wraps the label, the tabs and the group (line 164).
  - Alternatives considered: fold *Close workspace* and *?* into an overflow menu under 40 rem (the centre header's `header-more` pattern), which adds markup, a handler and a focus rule and hides *Close workspace* behind a click; let the status line shrink to nothing under 40 rem, which hides the "Saved." feedback and does not by itself make 572 px fit.
  - Tradeoffs: a second row of buttons at 360 px costs about 2 rem of height; accepted, the bar is already 3 rem and the layout under 40 rem scrolls. If task 1 shows a single child wider than the window, fold is reconsidered (Q-1).
  - Linked PRD IDs: REQ-2, TG-2.
- `DEC-3` — Under 40 rem the menu is anchored to the bar, not to its button.
  - Decision: in the existing `@media (max-width: 40rem)` block set `.top-panel { position: relative }` and `.workspace-wrap { position: static }`; the menu keeps `right: 0` and its width.
  - Rationale: the button's place depends on where the wrap puts it; the bar's right edge does not. The help menu's rule is not changed (Q-2).
  - Alternatives considered: `position: fixed` with `left: 1rem; right: 1rem`, which detaches the menu from the bar on scroll and from the stacked layout; a JavaScript measure on open, which adds code the CSS does not need.
  - Tradeoffs: the menu is not under its button when it wraps to the left; it is under the bar, which is where the eye looks.
  - Linked PRD IDs: REQ-2, TG-3.
- `DEC-4` — The fix is CSS only; the markup and the page's JavaScript do not change.
  - Decision: no change to `top-panel.js`, `names.json` or `layers.json` unless task 1 refutes ASM-1 or ASM-2.
  - Rationale: the markup already holds the items as separate boxes; the ratchet and the names list are untouched by CSS.
  - Alternatives considered: add a `data-menu` class to the buttons of the menu, which names a class for nothing the selector cannot already say.
  - Tradeoffs: a selector that depends on the class `workspace-menu` staying on the container; the e2e spec guards it.
  - Linked PRD IDs: REQ-4.
- `DEC-5` — The spec measures boxes, not pixels.
  - Decision: `src/test/e2e/workspace-menu.spec.js` reads `getBoundingClientRect` of each `.workspace-menu button` (and of each element of the bar) and asserts: no two item rectangles intersect (touching edges allowed), each item is at least as high as its content (`scrollHeight <= clientHeight + 1`), the menu is inside the window, and every `.top-panel button` has `right <= innerWidth` and `left >= 0`, and the document is no wider than the window.
  - Rationale: this is what #182 asks for, and it needs no screenshot baseline, which differs between engines.
  - Alternatives considered: screenshot comparison (fragile across engines and fonts); asserting computed `height` only (passes with a fixed height that clips).
  - Tradeoffs: it does not see a colour error, so the dark theme is covered by a second pass with `colorScheme: 'dark'` that checks the item background is not the button background (`rgba(0, 0, 0, 0)` or `--bg`) and the node test (below).
  - Linked PRD IDs: REQ-1, REQ-2, REQ-3, TG-4.
- `DEC-6` — The spec covers a long workspace name (resolves Q-3).
  - Decision: one import or create in the spec uses a name of 80 characters (the limit), so the ellipsis rule and the wrapping of the item label are exercised; the 60-character figure of RISK-4 is read as 80.
  - Rationale: the worst case the name rule allows is the one that can push a child past 360 px.
  - Linked PRD IDs: REQ-2, REQ-3.

# Repository Impact

- `IMP-1` — Menu and bar rules
  - Path(s): `src/main/editor/style.css`
  - Change type: modify
  - Why impacted: DEC-1, DEC-2, DEC-3.
  - Linked PRD IDs: REQ-1, REQ-2
  - Risks / notes: `style.css` is formatted by Prettier: run `npm run format` on it. `css-theme-audit` tests read the file: the new declarations use no colour literal.
- `IMP-2` — The generated page
  - Path(s): `src/main/resources/editor-webapp/standalone.html`
  - Change type: modify (generated)
  - Why impacted: it is the assembly of `style.css`; `npm run editor:build` writes it, committed with the part.
  - Linked PRD IDs: REQ-4
  - Risks / notes: `npm run editor:check` is the guard against a stale page.
- `IMP-3` — Node test of the rules
  - Path(s): `src/test/javascript/workspace-menu-layout.test.js` (new)
  - Change type: additive
  - Why impacted: the node suite has no DOM, so it reads `style.css` and asserts that the rules that decide the boxes exist and win: the item rule has `height: auto`, `!important` on padding, border and background, and `white-space: normal`; `.top-actions` has `flex-wrap: wrap`; the narrow block anchors the menu to the bar. It is the cheap guard that fails if the declarations are removed; the spec is the proof that they work.
  - Linked PRD IDs: REQ-1, REQ-2, REQ-4
  - Risks / notes: a test of CSS text is brittle to reformatting; it matches declarations by property name inside the rule found by selector, not by whole lines.
- `IMP-4` — End-to-end spec
  - Path(s): `src/test/e2e/workspace-menu.spec.js` (new), `src/test/e2e/hosted.js` (reuse `openWorkspaceMenu`, `SAMPLE_ADDRESS`, `waitForEditor`)
  - Change type: additive
  - Why impacted: REQ-3, DEC-5.
  - Linked PRD IDs: REQ-3
  - Risks / notes: no JVM; uses `startHostedPage()`; the `pageErrors` fixture also fails the test on a console error.
- `IMP-5` — WebKit project match
  - Path(s): `playwright.config.js`
  - Change type: modify
  - Why impacted: WebKit runs an anchored list of specs; the gate asks for three browsers, so `workspace-menu` joins `(open-and-pages|browser-workspace|sample|hosted-acceptance)`.
  - Linked PRD IDs: REQ-3
  - Risks / notes: the paragraph "End-to-end suite" of `CLAUDE.md` names the list (four specs) and must say five.
- `IMP-6` — Documentation
  - Path(s): `src/doc/README.adoc` (`[[editor-small-screen]]`, one measured sentence for the bar and the menu of a browser workspace at 360 px; the release block of the next version if the repository has one open), `CLAUDE.md` (the paragraph of the browser workspace or of the bar: the menu items are boxes of their own, `workspace-menu.spec.js`; the WebKit list)
  - Change type: modify
  - Why impacted: REQ-5; `[[editor-small-screen]]` measured a served folder only.
  - Linked PRD IDs: REQ-5
  - Risks / notes: the figures in the manual are those measured in task 4, not the 572 px of run 0204.
- `IMP-7` — Not changed, listed so nobody looks for them
  - Path(s): `src/main/editor/presentation/top-panel.js`, `src/main/editor/names.json`, `src/main/editor/layers.json`, `src/main/resources/editor-webapp/samples/brightcart.yaml`.
  - Change type: none (DEC-4)
  - Linked PRD IDs: REQ-4

# Canonical Impact

None. The repository declares no `arc` or `dom` register for this change (`docs/CLAUDE.md` is absent), and a stylesheet changes no element, relationship or invariant. `Not applicable — no canonical registers declared` is the more exact entry; it is written here so that silence is not read as an omission.

# Data Model and Contracts

- `CTR-1` — The class contract of the Workspace menu
  - Current contract: `.workspace-menu` (container), `.workspace-item` (button), `.workspace-item-label`, `.workspace-item-note`, `.workspace-ask`, `.workspace-ask-actions`, `.workspace-reset`; `data-action` values `toggle-workspace-menu`, `workspace-export`, `workspace-ask-reset`, `workspace-open-sample`, `workspace-cancel-question`, `workspace-confirm-reset`. Tests and `events.js` select by these.
  - Proposed contract: unchanged. The spec selects `.workspace-menu button`, so adding an item adds a box checked.
  - Affected files: none beyond IMP-1.
  - Migration or compatibility notes: none; no file format, address or storage key changes.
  - Linked PRD IDs: REQ-1

No schema, API, configuration or file-format change.

# Interfaces and Behavior

- `IF-1` — Workspace menu: an item is a block with its label on the first line and, when there is one, its note below; its height is its content's; items follow each other with no gap and no border between them; hover and focus colour the whole row; a disabled item (`aria-disabled="true"`) keeps its muted colour.
- `IF-2` — Top bar: at 1280 px one row as today; below the width where the group does not fit, the group takes a second row, right-aligned; at 360 px *Close workspace* and *?* are reachable without scrolling sideways. The document is never wider than the window.
- `IF-3` — Under 40 rem the open menu sits under the bar's right edge and is at most `100vw - 2rem` wide; at wider windows it sits under its button.
- Error states: none new. A note longer than the menu wraps (`overflow-wrap: anywhere`).

# Flows and Processing Logic

- `FLOW-1` — Open the menu at 360 px
  - Trigger: the visitor opens the sample at 360 x 800 and presses *Workspace*.
  - Steps: the page opens (`SAMPLE_ADDRESS`); the bar wraps its group; the press calls `toggle-workspace-menu`; `patchWorkspaceMenu` inserts the menu after the button; the menu is positioned against the bar (DEC-3); the items are laid out in their own boxes (DEC-1).
  - Branches / failure paths: with unsaved changes the note of *Export as a file* is the pending sentence (longer, wraps); *Reset to the sample…* swaps the items for the question, whose two buttons wrap.
  - Final output / rendered result: the item rectangles do not intersect and the menu is inside the window.
  - Linked PRD IDs: REQ-1, REQ-2, REQ-3
- `FLOW-2` — Reach *Close workspace* at 360 px
  - Trigger: the same page, menu closed.
  - Steps: the bar lays out; *Close workspace* is in the second row; the visitor presses it.
  - Branches / failure paths: with a long workspace name the label ellipsises (`.top-panel > .folder-name`), it does not push the group.
  - Final output / rendered result: `right <= innerWidth` for every button of the bar; the press returns to the card.
  - Linked PRD IDs: REQ-2

# Reliability, Performance, and Scalability

No runtime cost: a stylesheet change. Reliability is the red/green order of the tests (task order below): the spec and the node test fail on the page as committed and pass after the fix. The risk of a regression elsewhere is the reach of `.top-actions { flex-wrap }` on the served-folder bar and on a folder of the disk, which have fewer buttons and fit in one row; the spec for the sample covers the widest case, and `open-and-pages.spec.js` (three browsers) covers the served bar.

# Security and Privacy

Not applicable: no data, request or storage changes.

# Observability and Verification

Order of work, each step checked before the next:

1. Measure, before editing (ASM-1, ASM-2): in the Browser pane, open the sample at 360 px and at 1280 px, read the computed `height`, `padding`, `border-top-width` of an item and `scrollWidth` of `.top-actions`; record them in the run's progress log.
2. Write `workspace-menu.spec.js` and the node test; run them on the committed page and see them fail for the reason of ASM-1 and ASM-2 (red), with the failing assertion recorded in the log.
3. Edit `style.css`; `npm run format`; `npm run editor:build`.
4. Green: `node --test src/test/javascript/workspace-menu-layout.test.js`; `npx playwright test src/test/e2e/workspace-menu.spec.js` for the three projects (the spec starts no JVM, so no jar is needed).
5. Gate commands: `npm run editor:check`, `npm run test:unit`, `npm run lint`, `npm run format:check`, `npm run test:e2e` (the other specs of the three projects still pass), `ratchet.max` still 99.
6. Look at the result in the Browser pane at 360 px and 1280 px, light and dark; record the measured figures for the manual.

Sabotage check (as the earlier runs did): remove the `height: auto` declaration and see the spec fail in the three browsers; restore it.

# Deployment and Rollout

Code-only (a stylesheet and its generated page). Backward compatible: no address, file or storage key changes. Rollback is a revert of the commit. The website carries the page at the tag run, which this run does not prove (CON-5). Planning guidance only; nothing is deployed by this document.

# Risks and Tradeoffs

- `RISK-1` `!important` declarations grow the cascade debt. Mitigation: they sit next to the item rules with a comment that names the two rules they beat; the node test names them.
- `RISK-2` The wrap changes the height of the bar by a row at 360 px, which moves everything under it. Mitigation: the layout under 40 rem scrolls; `open-and-pages.spec.js` and the sticky rules (`--right-tabs-h`) do not read the bar's height; the full e2e run is a gate step.
- `RISK-3` WebKit lays out `flex-wrap` plus `margin-left: auto` differently from Chromium. Mitigation: the spec runs in WebKit; the real Safari stays unproved (ASM-4, CON-5).
- `RISK-4` A very long workspace name or a long status could still push a child past 360 px. Mitigation: the folder name and the status have ellipsis rules; the spec uses the sample and an import with a long name is a case of the spec (an 80-character name, DEC-6).
- `RISK-5` The node test reads CSS text and goes stale if the file is restructured. Mitigation: it matches by selector and property, and the e2e is the proof.

# Open Questions

- `Q-1` Does the wrap alone fit every button of the sample at 360 px, or does one child (the name, the notice "In this browser", the save button) still go past? Impact: if it does, DEC-2's alternative (fold *?* and *Close workspace* into an overflow, or let the notice go under 40 rem) is chosen. Resolved by task 1 and by the spec; I expect it fits because the widest child is *Save all changes* (about 10 rem).
- `Q-2` Does the help menu (`.help-menu`) have the same anchor defect under 40 rem? Read from style.css (lines 219 to 224): `.help-wrap` and `.help-menu` use the same `position: relative` and `right: 0` with the same width rule as the workspace menu, so the same defect is possible once the bar wraps. Whether it shows is a measurement; step 1 notes it and DEF-1 is opened only if it does. Not in scope for #182. Left open, not a blocker.
- `Q-3` Resolved: see DEC-6.

# Deferred Work

- `DEF-1` The same anchor rule for `.help-menu` under 40 rem, if Q-2 finds the defect (a follow-up issue on `tmorin/archicode`).
- `DEF-2` A real phone and the real Safari (CON-5).
- `DEF-3` Folding the bar's buttons into one menu, after the author's decisions on the diagram toolbar (RFC-002).

# File Placement and Frontmatter

This file is `docs/wav/wav-028-fold-and-browser-menu/run/run-0205-workspace-menu-overflow/tdd-0205-workspace-menu-overflow.md`, with `type: tdd`, `run: 0205` and `wave: 028`, as the TDDs of waves 026 and 027 are. The run document, the progress log and the plan sit beside it.

Review pass: dispatched. The Stage 5 KDMLLC review ran in a separate leaf agent with a fresh context, not the drafter (no Agent tool is available to either); its findings (F-1 to F-10, none S3) are in the run's progress log and are applied by the main agent.
