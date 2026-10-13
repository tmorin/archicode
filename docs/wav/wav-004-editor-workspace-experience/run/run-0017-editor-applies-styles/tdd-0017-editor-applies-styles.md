---
title: Editor — the boxes, tree rows, legend and export carry the look of the workspace styles
type: tdd
status: completed
date: 2026-10-13
run: 0017
wave: 004
related:
  - docs/wav/wav-004-editor-workspace-experience/wav-004-editor-workspace-experience.md
  - docs/wav/wav-004-editor-workspace-experience/run/run-0013-kernel-stereotypes/run-0013-kernel-stereotypes.md
  - docs/wav/wav-004-editor-workspace-experience/run/run-0014-editor-theme-setting/run-0014-editor-theme-setting.md
---

# Editor — the boxes, tree rows, legend and export carry the look of the workspace styles

# Summary

The editor reads `styles` from `workspace.yaml` (kept as-is and written back on save) but draws nothing from it. The
command line styles a box through `styles.by-tags` / `styles.by-qualifiers`, whose keys are **stereotype** names (the
qualifiers and the words of `rendering-stereotypes`, which the kernel has been returning per item since run 0013). This
design makes the editor draw a box with the fill, stroke and text of the styles of its stereotypes, label every styled
stereotype with a **text badge** (a colour is never the only carrier), and carry the same look to the rows of the
Elements tree and of the Map scope tree, to the diagram legend and to the SVG / PNG export. A custom fill is a fixed
colour, so the editor **derives a readable text colour** from it instead of asking for a dark variant of `styles`.
Scope arrives settled from the wave plan (row W-6), so there is no PRD.

# Scope

In: `src/main/resources/editor-webapp/standalone.html` (a "stereotypes and styles" block of functions, the diagram
boxes and their layout, the two tree renderers, the legend, `diagramExportCss`, the stylesheet); the tests of
`src/test/javascript/viewpoint-kernel/**`; the manual (`src/doc/README.adoc`, section "Stereotypes and styles" and the
editor sections).

Out: any change to the Rust kernel, to `Styles.java` or to the PlantUML renderer; editing `styles` from the editor;
`styles.atomic` / `styles.composite` (they style every box of a kind, not a stereotype); the inspection panel (W-7
reuses the badge function written here); the details header of an element.

# PRD Traceability

No PRD: traceability is **incomplete by design**. The requirements are the "Scope" and "Verified by" cells of row W-6
of the wave plan and the instructions of the dispatch brief:

- R1. A box drawn with a stereotype styled in `by-tags` / `by-qualifiers` gets its fill, stroke and the other
  properties the editor can draw, in the editor SVG.
- R2. A text badge with the stereotype name (colour is never the only carrier).
- R3. The same look and badge in the Elements tree rows and, where it applies, in the Map scope tree, in the diagram
  legend, and in the SVG / PNG export (which has its own CSS, `diagramExportCss`).
- R4. Readable text on custom fills in the dark theme: decide dark variant versus derived text colour, and document it
  in the manual.
- R5. The mapping is read from the workspace; nothing is hard-coded to `new` / `changed` / `external`; the stereotypes
  of a diagram box come from the kernel's `item.stereotypes`.
- R6. Not confused with `modified-dot` (unsaved changes). Manual updated.

All six are addressed (R1 DEC-2/5, R2 DEC-6, R3 DEC-6/7/8, R4 DEC-3, R5 DEC-1, R6 DEC-7 and Repository Impact).

# Technical Goals

- TG-1. The look of a box is a pure function of its stereotypes and of `styles`; the same function feeds the diagram,
  the trees, the legend and the export, so they cannot disagree.
- TG-2. The text of a box and of a badge (title, kind line, description, pill) is readable (WCAG contrast of 4.5 or
  more) on any custom fill, in the light and in the dark theme. All of it is one colour: nothing is dimmed by opacity.
- TG-3. A value read from `workspace.yaml` never reaches the markup unless the editor has parsed it as a colour or a
  number (no injection into a `style` attribute).
- TG-4. Hover, focus, selection and focal outlines of a box keep winning over its custom stroke.

# Non-Goals

- Matching PlantUML pixel for pixel (shapes such as actor, database or person are not drawn by the editor either).
- A theme-aware fill. The fill is the author's colour, as it is in the PlantUML the CLI generates.
- Showing stereotypes that `styles` does not mention (nothing about them is "styled"; the tooltip still lists them).

# Assumptions

- ASM-1. `item.stereotypes` is present on every kernel item (contract version 2, run 0013) and absent on the ghost
  boxes the editor adds itself; both are handled (`Array.isArray`). Validated: `conformance.test.js` reads it today.
- ASM-2. The editor's `AppState.workspace.styles` is the parsed `styles` mapping as written in the file (any YAML
  scalar may appear as a value; a key may be an empty entry, i.e. `null`). Validated: `workspaceRaw.styles` is kept as
  is (`standalone.html`, `loadWorkspace`).
- ASM-3. The fill of a box does not depend on the theme; only the text colour must. Validated by reading the CLI: the
  generated PlantUML carries the author's colours and one fixed look.
- ASM-4. PlantUML's `LineStyle: N` is a dash of N pixels and a gap of N pixels, and its `RoundCorner: N` is drawn as
  an SVG radius of N/2. **Unchecked**: from PlantUML's source as remembered, not run (no PlantUML jar in this
  environment). The manual says the editor's `line-style` and `round-corner` are an approximation of the command line's;
  a human comparison is DEF-1.

# Constraints

- CON-1. One file, `standalone.html`; its base64 kernel block is not touched (`embed.sh --check` must pass).
- CON-2. `renderDiagramSvg` and `buildElkGraph` both lay out boxes from `diagramItemText` and `diagramLeafLayout`: the
  space a badge needs has to be asked of the layout in both places or the boxes overlap.
- CON-3. The export is an SVG with its own `<style>` and no access to the page's custom properties: it carries
  resolved colours (`diagramExportCss`), plus the per-box `--st-*` variables written inline on the boxes.
- CON-4. The node harness has no layout and no real CSS cascade: tests read markup and the CSS text. Contrast is
  computed, so it is tested on numbers.
- CON-5. Base `button` rules and several tree rules are `!important` or position-sensitive; the new badge rules sit
  next to `.tree-node-kind`.

# Current State

`renderDiagramSvg` draws a leaf as `rect.dg-box` + title/sub/description texts, a compound as `rect.dg-group` +
`rect.dg-header` + one text; all colours come from CSS variables (`--bg`, `--border`, `--fg`, `--muted`).
`diagramItemText` gives title, kind line, description and tooltip. `diagramExportCss` writes the same rules with resolved
colours of the current theme. The tree rows (`renderTreeNodeHtml`, `renderMapScopeNodeHtml`) show a kind abbreviation,
the label, and a `modified-dot` for unsaved changes. `diagramLegendHtml` draws the key to the line styles. The kernel
returns `stereotypes` per item; the editor does not read them. The diagram cache key is the kernel input, the display
options and `diagramModelFingerprint()`, which does not include `styles`. `styles.by-tags` / `by-qualifiers` are used only by the
CLI (`PlantumlViewRenderer` merges both maps' entries, in a `HashSet`, and emits one `<style>` block per stereotype and
shape).

# Proposed Design

One block of functions, placed before `diagramItemText`:

1. **Colour reading** — `parseCssColor(text)`: `#rgb`, `#rrggbb`, `rgb(r, g, b)`, `transparent`, and the 141 CSS colour
   names (a compact table; `grey` is read as `gray`); anything else is `null` and the property is ignored.
   `cssColorOf(rgb)` writes `#rrggbb`, or `transparent`. `contrastRatio(a, b)` is WCAG 2's; `readableTextColor(fill,
   preferred)` is `preferred` if it reaches 4.5, otherwise the better of pure black and pure white (the worst case of the
   two is 4.58; a near-black such as `#111` would fall to 4.37 on a mid-grey).
2. **Style lookup** — `stereotypeStyleOf(name)`: the entry of `styles.by-qualifiers`, overlaid by the entry of
   `styles.by-tags` for the same key (own properties only; a non-mapping entry is "declared, no properties");
   `null` when neither declares the key.
3. **The look of a list of stereotypes** — `stereotypeLookOf(names)` returns `{ styled: [names], vars: {...}, rx,
   shadow }`: the properties of the styled stereotypes merged in the order of the list, **a later stereotype
   overriding an earlier one property by property**. `vars` are CSS custom properties (`--st-fill`, `--st-stroke`,
   `--st-stroke-opacity`, `--st-width`, `--st-dash`, `--st-text`, `--st-fstyle`, `--st-weight`).
   `stereotypeBadgeVarsOf(name)` is the same for one stereotype (what its badge looks like).
4. **Drawing** — the box `<g>` of a styled box carries `class="dg-styled"` and `style="--st-…"`; the stylesheet reads
   the variables with the old values as fallbacks (`.dg-styled > .dg-box { fill: var(--st-fill, var(--bg)); … }`),
   placed before the focal/selected rules (the hover rule is more specific and wins whatever the order). Corner radius
   is the `rx` attribute. Shadow is the `dg-shadow` class. A box that contains others (`.dg-group`, no `.dg-box`) takes
   the same variables: fill (default none), stroke and width; its title and kind line take the derived text colour; it
   keeps `pointer-events: visibleStroke` so that a filled group does not swallow the pan of the canvas. The stack behind
   a folded leaf (`.dg-stack`) takes the fill like the box in front of it. The fold button is a sibling of the box, so
   it carries `--st-text` itself and its chevron is drawn in that colour (found on the replica: a light chevron on a
   pale fill was invisible in the dark theme).
5. **Badges** — a row of pills (`g.dg-badge`: `rect` + `text`, own `--st-*`) under the lines of a leaf (the leaf grows
   by 22 px, the layout and the drawing ask the same function), at the right of the header of a compound. Pills that
   do not fit the box are replaced by a `+N` pill. The box's `aria-label` and tooltip list every stereotype.
6. **Trees** — `stereotypesOfRecord(record)` (qualifiers, then the words of `rendering-stereotypes`, once each) and
   `stereotypeBadgesHtml(names)`: `span.stereotype-badge` (text = the name, `title`) with the `--st-*` variables; after
   the label in both tree renderers; the styled stereotypes are added to the row's spoken label.
7. **Legend** — the stereotypes drawn in the diagram, styled ones, as the same badges, after the line key.
8. **Export** — `diagramExportCss` gets the `dg-styled`, `dg-badge`, `dg-shadow` rules with the theme's colours as
   fallbacks; the inline `--st-*` stay in the cloned SVG.

## Decisions

- **DEC-1 — Where the stereotypes come from.** Diagram boxes read `item.stereotypes` from the kernel output. The tree
  rows have no kernel output (they exist before and without any view; the Map is application only) so
  `stereotypesOfRecord` mirrors the kernel's rule in six lines on top of `kernelStringsOf` / `kernelTagsOf` (qualifiers whole, tag split on whitespace, no duplicate).
  A conformance test compares it with the kernel's `stereotypes` for **every element of the fixture, in both layers**, so
  a divergence fails a test rather than the user's eyes. Alternative considered: a kernel call per tree render;
  rejected: asynchronous, a flash of unbadged rows, and it needs a viewpoint that returns every element of the
  technology layer, which the kernel does not offer.
- **DEC-2 — Which style wins.** `by-qualifiers` then `by-tags` for the same key (the tag is the more specific
  statement); several stereotypes on a box: **later overrides earlier, property by property** (`external changed` is
  `changed`'s fill with `external`'s unset properties). The CLI's order is not defined (`HashSet` in
  `PlantumlViewRenderer`), so the editor picks a deterministic, documented rule; making the CLI deterministic is a
  finding for the wave, not done here.
- **DEC-3 — Dark theme: derive the text colour, no dark variant** (the open question of the wave plan). Reasons:
  (a) the fill is an author's fixed colour, in the CLI's PlantUML too; the text is what has to adapt, and it can be
  computed from the fill alone, so no key is needed; (b) a dark variant would be a new key in `Styles.java` and every
  author would write each colour twice to get what a one-line contrast rule gives; (c) the derivation is theme
  independent (black or white over the fill), so light and dark give the same readable result and the tests can pin it.
  `font-color` is the author's wish: it is kept when it reaches a contrast of 4.5 on the fill, otherwise replaced; without a
  `background-color` it is ignored (the box is the theme's, and the author's colour was chosen against the CLI's white;
  the CLI, which has one white page, does apply it). A dark variant stays possible later as an additive key (DEF-2).
- **DEC-4 — Which values are drawn.** Colours the editor can parse (Proposed Design, 1) and numbers (`line-style`,
  `line-thickness`, `round-corner`, integers; `shadowing` a boolean; `font-style` the words `bold`, `italic`,
  `plain` / `normal`). Everything else is ignored, never written into the markup (TG-3). Mapping: `line-style: N` → dash
  `N N` (0 → solid); `line-thickness` → stroke width in px; `round-corner: N` → `rx = N / 2` (ASM-4);
  `shadowing` → a drop shadow (the CLI emits `skinparam …Shadowing<<stereotype>> true` for it, `StyleShapeRenderer`); a bold style makes title and kind line bold, italic all texts italic, normal/plain the
  title regular.
- **DEC-4b — Stereotypes the editor does not style.** The CLI also gives every box the name of its kind and `atomic` /
  `composite` as PlantUML stereotypes, so a `by-tags` key named `atomic` or `person` styles every box there. The editor
  styles the stereotypes the kernel tells (qualifiers and the words of `rendering-stereotypes`) and nothing else; the
  manual says so. `styles.atomic` / `styles.composite` are not drawn either (DEF-4).
- **DEC-5 — CSS custom properties on the box, not inline paint.** An inline `fill` / `stroke` would beat the hover,
  focus and selection rules (TG-4). With `--st-*` on the `<g>` and the fallback chain in the stylesheet, a custom
  stroke is the base look and the outlines win as before, as long as the `.dg-styled` rules come before them
  (a test pins the order). The export keeps the same variables inline.
- **DEC-6 — The badge.** One pill per **styled** stereotype (declared in `by-tags` or `by-qualifiers`, even with no
  property the editor can draw): the stereotype name as text, filled and stroked with the stereotype's own style, text colour per DEC-3.
  Unstyled stereotypes (most qualifiers, such as `Quarkus`) get no badge: the kind line already shows qualifiers and the
  tooltip lists all. Leaf: a row under the text, centred; the leaf's width grows to fit it (up to the 280 px cap).
  Compound: right-aligned in its 36 px header, and the title is cut earlier by the width of the row. A pill is 16 px
  high, 10.5 px bold text, names cut at 16 characters.
- **DEC-7 — Rows and legend.** A tree row shows the same pills after its label (`.stereotype-badge`, shrinkable up to
  7rem with an ellipsis and a `title`), added to the row's spoken label (`label, new, modified`), after the kind. The
  `modified-dot` is untouched and a different thing (class, position, meaning); a test asserts they coexist. The legend
  lists the styled stereotypes **of the diagram on screen**, so it never lists what is not there.
- **DEC-8 — Export.** The legend is not part of the export (neither is the line key today): every box carries its
  badges, which is the text carrier. `diagramExportCss` adds the rules of DEC-5/6 with the colours of the current theme
  as fallbacks, like its other rules.
- **DEC-9 — Cache.** The diagram cache key gains a fingerprint of `styles`, since the look of a cached drawing
  depends on it (a reloaded workspace with other styles must not show the old look).

# Repository Impact

- IMP-1 — `src/main/resources/editor-webapp/standalone.html`. CSS: `.dg-styled`, `.dg-badge`, `.dg-shadow`,
  `.stereotype-badge`. JS: the block of DEC-1…4, `diagramItemText` (+ `stereotypes`, `badges`, `look`),
  `diagramLeafLayout` (badge row), `buildElkGraph` (width, compound minimum), `renderDiagramSvg` (class, style, `rx`,
  pills), `renderTreeNodeHtml`, `renderMapScopeNodeHtml`, `diagramLegendHtml` + its call site, `diagramExportCss`, the
  cache key. Modify, additive. Risk: layout and drawing disagreeing (CON-2).
- IMP-2 — `src/test/javascript/viewpoint-kernel/styles.test.js` (new). Existing tests are touched only if a styled
  fixture element changes their expected markup (the fixture styles `external`).
- IMP-3 — `src/doc/README.adoc`: the section "Stereotypes and styles" (what the editor draws, DEC-2/3/4) and a short
  editor section. Additive.

# Canonical Impact

- CI-arc-1 — None. The repository declares no `arc` register (no `docs/CLAUDE.md`, no `docs/arc`); the change is the
  presentation of an existing model inside one file of the editor, with no element or relationship of the
  architecture involved.
- CI-dom-1 — None. No `dom` register is declared and no domain invariant becomes enforceable: `styles` and
  `rendering-stereotypes` keep their meaning (documented by run 0013); the editor now draws what the CLI already did.

# Data Model and Contracts

- CTR-1 — Kernel output: unchanged; `items[].stereotypes` is read.
- CTR-2 — `workspace.yaml`: unchanged and not edited; `styles` is read only. No new key (DEC-3).
- CTR-3 — Box markup: `g.dg-node` gains `dg-styled` / `dg-shadow` and a `style` of `--st-*` variables only; its
  `data-*`, `role`, `tabindex` are unchanged. A pill is `g.dg-badge > rect + text`, `aria-hidden`, inside the box's `g`
  (the box's `aria-label` carries the stereotypes). The tree badge is `span.stereotype-badge`.

# Interfaces and Behavior

- IF-1. A box with a styled stereotype: its fill, stroke, width, dash, radius, shadow and readable text as above;
  hover / focus / selected / focal outlines as before.
- IF-2. A box with several styled stereotypes: one pill each, in the order of the list; the look per DEC-2.
- IF-3. A workspace with no `styles`, or none of the box's stereotypes in it: markup and layout identical to before
  (a test pins one such box byte for byte against the old output).
- IF-4. The legend lists each styled stereotype of the diagram once.

# Flows and Processing Logic

- FLOW-1 — Draw. `mountDiagramIfNeeded` → kernel result → `buildElkGraph` (`diagramItemText` → badges → widths) → ELK →
  `renderDiagramSvg` (the same `diagramItemText`/`diagramLeafLayout`) → legend from the drawn items → scene. Failure
  path: `styles` malformed (a list, a scalar) → treated as no styles; an entry that is not a mapping → "declared,
  nothing to draw" (a badge without a look).
- FLOW-2 — Tree. `renderTreeNodeHtml` → `stereotypesOfRecord(record)` → styled ones → pills.
- FLOW-3 — Export. `diagramExportDocument` clones the SVG (inline `--st-*` kept) and inserts `diagramExportCss()`.

# Reliability, Performance, and Scalability

The style lookup is two object reads per stereotype; the tree computes it per visible row. Parsing a colour is a table
lookup and a few multiplications. No new asynchronous work.

# Security and Privacy

Values of `workspace.yaml` reach a `style` attribute only after being parsed into `#rrggbb` / numbers (TG-3);
stereotype names reach the markup through `escapeHtml`. A test feeds a hostile value (`red;} x{`, `"><script>`).

# Observability and Verification

- Node tests (`styles.test.js`, with the fixture and its in-memory `styles` set per test): colour reading and contrast
  (numbers, both themes: the derived text colour reaches 4.5 on every named colour, on the user's three colours, and does
  not depend on `data-theme`; "the user's three colours" are `lightgray`, `#DCF3E3` and `#FBEBDA` with the line colours `#2C6842` and `#9E4A17`); the look per property; precedence (tags over qualifiers, later over earlier); the SVG of
  a styled leaf and compound (class, variables, `rx`, pills, `aria-label`); layout and drawing agree on the height;
  the unstyled box is unchanged; tree rows (Elements and Map scope), `modified-dot` coexisting; the legend; the export
  CSS and an exported document; the CSS text (rule order before the outlines, dark-theme blocks unaffected); the
  mirror against the kernel for every fixture element in both layers; hostile values.
- `./mvnw test`, `embed.sh --check`.
- Looked at in the built-in browser on a **replica** (the SVG the editor produces for `external`, `new` and `changed` as the user's workspace styles them, plus the
  real stylesheet) in light and dark.
- Cannot be confirmed: the real page (File System Access picker), the layout engine's use of the grown boxes (ELK is
  not loaded in the harness: widths are computed by the same functions, not by ELK), PlantUML parity of ASM-4.

# Deployment and Rollout

Code and documentation only. Rollback: revert the commit. A workspace without styles looks exactly as before.

# Risks and Tradeoffs

- RISK-1. A badge row wider than a narrow leaf: the `+N` pill and the cap on the width bound it; the tooltip lists all.
- RISK-2. The tree mirror of the kernel rule can drift: the conformance test (DEC-1) is the guard.
- RISK-3. The derived text colour hides the author's `font-color` when it is unreadable: intended, documented.
- RISK-4. Semi-transparent colours (`rgba`) are not read: ignored rather than guessed.

# Open Questions

None open. Answered here: dark variant versus derived text colour (DEC-3), the open question of the wave plan for W-6.

# Deferred Work

- DEF-1. A human look at the page in a Chromium browser, in light and dark, with the user's own workspace, and a
  comparison with the PlantUML of the CLI for `line-style` and `round-corner` (ASM-4).
- DEF-2. An optional dark variant of a style, if authors ask for a theme-specific fill.
- DEF-3. Deterministic order of the CLI's styles (`HashSet` in `PlantumlViewRenderer`), so that the CLI follows DEC-2.
- DEF-4. `styles.atomic` / `styles.composite` in the editor; badges in the details header and the inspection panel (W-7).

# File Placement and Frontmatter

`docs/wav/wav-004-editor-workspace-experience/run/run-0017-editor-applies-styles/tdd-0017-editor-applies-styles.md`.
