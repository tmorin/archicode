---
title: Editor — inspection panel navigation (declaring element, link in the URL, view, parallel links, header badges)
type: tdd
status: completed
date: 2026-10-13
run: 0024
wave: 005
related:
  - docs/wav/wav-005-follow-ups-and-field-check/wav-005-follow-ups-and-field-check.md
  - docs/wav/wav-004-editor-workspace-experience/run/run-0019-inspection-panel-links/tdd-0019-inspection-panel-links.md
  - docs/wav/wav-004-editor-workspace-experience/run/run-0018-inspection-panel-elements/tdd-0018-inspection-panel-elements.md
  - docs/wav/wav-004-editor-workspace-experience/run/run-0016-center-header-responsive/tdd-0016-center-header-responsive.md
  - docs/wav/wav-004-editor-workspace-experience/run/run-0017-editor-applies-styles/tdd-0017-editor-applies-styles.md
---

# Editor — inspection panel navigation

# Summary

Runs 0018 and 0019 gave the standalone editor an inspection panel for a selected element and for a selected link, and
deferred five small things (tmorin/archicode#17, items 1, 2, 3, 5 and 6; item 4, the roving tab stop, is run 0025's).
This design does them in `standalone.html`: each relationship of the link panel offers its declaring element as a button
(it selects it like a box does); a selected link is carried by the address (`link-from=` and `link-to=`) and restored on
load and on Back/Forward; selecting a link on the Map brings it into view by the least pan it takes, and only then; when
several links join the same two boxes the panel marks the relationships of the one that was clicked; the header of an
element shows its styled stereotype badges without costing the name its room. Scope arrives settled by the issue and the
wave plan (row W-2); there is no PRD.

# Scope

In: `src/main/resources/editor-webapp/standalone.html` (the link panel, `renderDiagramSvg`'s markup of links,
`selectLink`, the `select-link` click, `currentRouteHash`, `applySelectionFromHashRef`, `showDiagramScene`, the header
title, three CSS blocks), `src/test/javascript/viewpoint-kernel/` (a new file `inspection-navigation.test.js`; five
assertions of `inspection-links.test.js` that described the panel without these features are updated deliberately), the
manual paragraph `[[editor-inspection]]` of `src/doc/README.adoc`.

Out: the roving tab stop of the links (run 0025: the tab-stop model of links is left as it is, `tabindex="0"` per link);
editing a relationship from the panel; making the destination navigable; the Rust kernel and its base64 block; the Java
side; a pan that **centres** on the link (see DEC-3).

# PRD Traceability

No PRD (profile `TDD+pln`): **traceability is incomplete** by construction. The requirements come from
tmorin/archicode#17, the wave plan row W-2 and its open question, and the dispatch brief:

- R1 — In the panel of a link, each relationship offers its declaring element: a click selects that element like
  `goto-element`, in the layer of the drawing; keyboard access and an accessible name. (#17 item 1)
- R2 — A selected link is carried by the address and restored on load and on hash change; the key is decided here; a link
  that no longer exists, a lone or empty parameter, and Back/Forward all behave. (#17 item 2, the wave's open question)
- R3 — On the Map, selecting a link brings it into view, without making a selection jump the view where run 0019 pins
  the framing (RISK-1 of run 0018). (#17 item 3) **Relaxed from the issue's "centre on the selected link"** to "bring into
  view by the least pan" (DEC-3 says why); recorded in the Open Questions for the owner of the issue to confirm.
- R5 — Two parallel links between the same two boxes are told apart in the panel; how is the wave's open question.
  (#17 item 5)
- R6 — The header of an element shows its styled stereotype badges, reusing `stereotypeBadgesHtml`, within CTR-1 of
  run 0016 and its responsive states. (#17 item 6, DEF-4 of run 0017)
- R7 — The manual paragraph `[[editor-inspection]]` says all of it; the tests of the header are updated deliberately,
  never loosened.

All are addressed, R3 with the deviation just stated; none is left unresolved. (Numbering follows the issue: there is no R4, the roving tab stop is run 0025's.)

# Technical Goals

- TG-1 — Nothing that run 0019 pinned changes: the selection is still keyed by the pair of boxes, a box click is
  untouched, selecting a link still pushes no history entry and still pins the framing first.
- TG-2 — The address of a view with a link selected, opened elsewhere, shows the same link or nothing, never an error.
- TG-3 — The header contract (actions row, ids, `data-action`s, the three container-query states) is unchanged; the
  badges are an addition to the label side only.

# Non-Goals

- No new selection kind, no new action name: `goto-element` and `select-link` are reused.
- The clicked link is not outlined differently in the drawing (the pair keeps one outline): the panel says it.
- The address does not carry which parallel link was clicked (DEC-4).
- The folds of the Map are not put in the address by this run (they are not today): see RISK-2.

# Assumptions

- ASM-1 — A box id of a drawing is a reference, `ghost:…`, or the reference of a folded box (run 0019 DEC-1): any string,
  so the address cannot use a separator inside one value (DEC-2).
- ASM-2 — `revealDiagramNode` (run 0014-era, used for keyboard focus) pans so that a node is inside the canvas with a
  24 px margin and takes the framing over (`moveDiagramBy`); the canvas is already the width the panel leaves it when
  `showDiagramScene` runs, because `render()` has put the shell in the page before the (cached or computed) scene arrives.
- ASM-3 — `.element-header-label` is a flex row whose `h2` can shrink (it has `overflow: hidden`), and the longest header
  at each container state was sized so that the name keeps 8 rem (run 0016): adding width to that row without a
  shrink priority would break it.
- ASM-4 — A browser's layout and a screen reader cannot be exercised here: the harness has no layout engine; the look is
  checked on a replica in the built-in browser, and says what that did not confirm.

# Constraints

- CON-1 — Everything stays testable in Node against the harness (no DOM): pure functions, fake elements, source pins.
- CON-2 — `standalone.html` is edited by this run, then by run 0025 (same code: diagram links). The markup of a link
  keeps its shape for a link that has no parallel twin; the new attribute is only on parallel ones.
- CON-3 — The kernel block is not touched; no Rust change.

# Current State

- The link panel (`renderLinkInspectionHtml`) lists, per relationship, the label and the path `declaring → destination` as
  text. The relationship list of Details (`renderElementRelationshipsHtml`) already uses `button.relationship-link`
  with `data-action="goto-element"`.
- A link selection is `{kind:'link', key, from, to, layer, mode, focal?}`, made by `selectLink`, dropped by
  `settleLinkSelection` (render start) and `reconcileLinkSelection` (after a drawing without the pair). It pushes no history
  entry, and on the Map with the framing on Center pins it first (`takeOverDiagramFraming`).
- The address (`currentRouteHash`) reads `elementSelection()`: a link selected in Elements leaves `ref=` as it is; on the
  Map it says nothing. `applySelectionFromHashRef` resolves `ref=` and `layer=` into an element or file selection.
- Links of a pair are drawn one `<g class="dg-link">` per link; two links with the same `(from, to)` are in the same
  `pair.links` and indistinguishable in the markup and in the selection.
- The header title (`renderElementTitleHtml`, shared by Details and the three diagram tabs) is name, kind, tabs; the
  inspection panel and the tree rows show `stereotypeBadgesHtml(...)`.

# Proposed Design

## DEC-1 — The declaring element is a button, in the layer of the drawing

`renderDeclaringElementHtml(reference, layer)` is `renderReferenceLinkHtml` (the existing builder of the Details page's
`button.relationship-link[data-action=goto-element][data-ref][data-layer]`, which gains an optional `description`) with the
reference as its text, `aria-label="Open <ref>, the element that declares this relationship"` (the visible text is inside the
name) and a title, plus the guard below; no second builder. The path stays `declaring → destination`, the
destination as text. The click is the existing `goto-element` case, **unmodified** (a test already pins its source):
history entry if the key changes, framing pin on the Map, the element selected in the layer carried by `data-layer`,
ancestors expanded, tree scrolled. The layer is the selection's (`sel.layer`, the layer of the drawing): a reference that
exists in both layers is two elements and the relationship belongs to the drawing's. When the drawing's layer has no such
element (cannot happen for a kernel relationship; a defence) the reference stays plain text.
It is a native `<button>`: Tab, Enter and Space work, no new key code. A link with a folded end lists the declaring
elements inside it (`…service.indexer`): they are navigable too.
Rejected: also the destination (not asked; a ghost destination has no element); a new action (`goto-element` already
does everything, including the tree).
After the click the panel is replaced (a link panel gives way to the element's), so the focus falls to the body like for
the relationship buttons of Details; accepted, not worse than today (RISK-4).

## DEC-2 — The link in the address: `link-from=` and `link-to=`, the pair of boxes (the wave's open question)

- **Key.** Two parameters, the two ids of the drawing, quoted by `URLSearchParams` (`encodeURIComponent` on write). Not one
  parameter with a separator (`a>b`, `a,b`): an id can contain any character a reference can and a ghost id holds the
  text the author typed, so no separator is safe, whereas two parameters need no parsing rule. The pair, not the link
  object, not a position: it is the identity run 0019 chose because it survives a redraw (DEC-1 there).
  The layer is not in the address: on the Map it is `application`; in Elements it is the one `ref=`/`layer=` name.
- **Written** (`currentRouteHash` via `linkInRoute()`): only where the selection can live, i.e. the Map without `focal`, or
  Elements with a `focal` and a diagram tab shown. The guard is a function of the state alone, not of the caller: the
  address is also written before drawing by `setPerspective`, `goToStoryStep`, `openSavedView` and the `library-tab`
  click, when `settleLinkSelection` has not run yet; without the guard `#/elements?link-…` would be written for a Map
  link, or `#/library/views?link-…`. A view or a story step opened **on the Map** leaves a selected link selected (it does not
  touch the selection), so it stays in the address, and the next drawing drops it if it lacks the pair: accepted (the same
  as for a selected element). In Elements the element and tab params stay as they were.
- **Read** (`applySelectionFromHashRef` = the former body, now `selectFromHashRef`, then `restoreLinkFromHash`): both
  parameters non-empty, else ignored (a lone `link-from` names nothing). On the Map the link replaces whatever `ref=`
  selected (a selection is one thing). In Elements it applies only over an element selected in view mode on a diagram tab
  whose record exists (the places `settleLinkSelection` keeps one); on Details, the edit form or another perspective it is
  ignored. The selection is made as a click would make it, with `focal` and the layer of the element in Elements.
- **A link that does not exist.** The drawing is not known at read time (load: nothing drawn; hash change: the drawing on
  screen may be about to be replaced). So the selection is made optimistically and the existing machinery decides: the
  panel renders "Reading the link…", and `reconcileLinkSelection` — after the drawing is on screen — drops it when the
  pair is absent (Map: nothing selected; Elements: the element), calls `syncHashFromState` (the address loses the link) and
  removes the panel. No new code path for a bad link; a test drives it.
- **History.** Selecting a link still pushes no entry: `syncHashFromState` rewrites the current entry (`replaceState`), as
  for a zoom or a pin. A link is a refinement of the place, not a place; the cost, accepted, is that Back after clicking two
  links does not step through them but leaves the view. Back/Forward **do** restore a link: an entry written with a link keeps
  it, and `hashchange` re-reads it. A later `goto-element` pushes a copy of the current address (link included) before
  changing the selection, so Back from an element selected through DEC-1 returns to the link (a tested round trip).
  `hashchange` is ignored when the address already equals `currentRouteHash()` (unchanged), so the app's own writes do not re-apply.
- Rejected: one `link=a>b` parameter (ambiguity, above); the index of the link in the drawing (not stable: it changes with
  a facet or a fold); pushing a history entry per selection (it would make the Escape/Close deselection and the Back button
  fight, and run 0019 decided otherwise).

## DEC-3 — Bring the selected link into view; centring is not done

`revealLinkAfterDrawing` is `false` or `{ nth }`. It is set when a link is selected on the Map by a click (`select-link`;
`nth` = the `data-nth` of the link or caption clicked, null for a link with no twin) and when the address restores one
(`nth` null); it is cleared by `settleLinkSelection` whenever the selection is not (or no longer) a link, and consumed by
`revealSelectedLink(canvas)`, called in `showDiagramScene` right after `markLinkSelection()`. It finds the link `<g>` of the
pair whose `data-nth` equals `nth` (else the first of the pair: an address does not say which, and a position the drawing does
not have is no error) and calls the existing `revealDiagramNode`, which pans by the least amount that puts the node inside the
canvas with its 24 px margin, and does nothing when it already is. The position is what identifies the clicked link here, not
`via` (twins can carry identical relationships): it is valid because the first drawing after the click is the one clicked on.
What this decides:
- Run 0019's pin stays: a click still calls `takeOverDiagramFraming` first, so the view does not jump to a new Center. The
  new pan happens afterwards and **only when the link would be hidden or within 24 px of an edge**: that is exactly RISK-1
  (the panel narrows the canvas and a link at the outer part ends behind its edge). A link in view never moves.
- It is **nearest-edge, not centred**. The issue says "centre on", but centring a link the user is looking at would move the
  view on every click, which is what run 0018 and 0019 refused ("selecting must not jump the view"). A link that is not in
  view (the address of a shared link on a dense Map) ends near the edge it came from, visible.
- **One-shot.** A facet, a fold, Hide unlinked or any redraw of a link selected earlier does not pan (the flag is already
  consumed); selecting by a click in Elements does not set it (the panel is already there, nothing narrows). A restore from the
  address sets it in Elements too; a pan there takes the framing over (`moveDiagramBy`), so the element's Center framing becomes
  manual for that view when, and only when, the link was out of sight.
- A link larger than the view is anchored by the top-left of its box (the behaviour of `revealDiagramNode`); a Fit framing needs no pan.
Rejected: centring; scrolling the box of an element selection too (it is run 0018's RISK-1 for boxes; the issue lists the
link only, and a box click has the same one-line remedy if wanted: set the flag for it); revealing in the panel instead.

## DEC-4 — Parallel links: the index in the markup, the relationships in the selection (the wave's open question)

- **Markup.** A link and its caption of a pair that has **several drawn links** carry `data-nth="<position in the pair>"`, 0-based over the
  drawn links (`renderDiagramSvg` counts the drawn links per pair first). A link with no twin has no new attribute, so its markup, and the
  common case on a dense Map, is unchanged (CON-2).
- **Why not the label.** Two parallel links can have the same label or none (the kernel keeps them apart by their
  qualifiers or tags, or not at all); the label is the display of a link, not an identity. The position in `pair.links` is the
  only key that is always unique **at the moment of the click**.
- **Selection.** At the click, `selectLink` resolves the position against `diagramScene.links` and stores
  `via` = the keys (`relationshipKeyOf`: declaring, destination, label, qualifiers, tags — the key `relationshipsOfPair`
  already dedupes by) of the relationships of that link. It does **not** store the position: after a redraw (facet, fold,
  edit) the Nth link may be another one; the keys stay true or vanish. The pair stays the identity (TG-1).
- **Panel.** `renderLinkInspectionHtml`, when the pair has more than one link, replaces "N relationships are grouped in this
  link" by "N links join these two boxes, with M relationships in all." and, when the clicked link's relationships can be
  told from the others' (some, not all, are in `via`), adds "The relationships of the link you clicked are marked." and
  gives each such relationship a "Clicked link" text mark and `inspection-rel-marked` (accent border; the word is what
  carries it, not the colour). When they cannot be told apart (identical relationships on both links, or no `via`: a link
  restored from the address) nothing is marked, and the note is still honest. (`via` serves the panel only; which link the
  view is panned to is the position, DEC-3.)
- **Address.** Not carried: a shared address is "this connection", which is what the pair means.
Rejected: the position stored in the selection (drifts); the label (not an identity); marking in the drawing (the outline is
run 0019's, shared by the pair, and run 0025 is about to edit the same markup).

## DEC-5 — Stereotype badges in the header of an element, the name keeps its room

- **What.** `renderElementTitleHtml` gains `renderHeaderBadgesHtml(record)` after the kind: a
  `span.element-header-badges[role=group][aria-label="Stereotypes"]` around `stereotypeBadgesHtml(stereotypesOfRecord(record))`
  — the same markup and styles as the tree and the panel, only the styled stereotypes (nothing is rendered when there are
  none: the headers of an element with no styled stereotype are byte-identical to today). It is the title shared by
  Details and the three diagram tabs, which the header says is "the same on every tab"; the edit form header and the Map's
  header ("Map" and its subject) are not changed.
- **CTR-1 of run 0016 holds**: actions row, ids, `data-action`s, the container-query states, the "⋯" menu are untouched; the
  badges are on the label side.
- **Responsive.** ASM-3: the group is `display: flex; flex-wrap: wrap; gap: 0.25rem; flex: 0 100 auto; min-width: 0` (it gives
  up room 100 times faster than the name, which keeps `flex-shrink: 1`), one badge row high (`max-height: 1.1rem; overflow:
  hidden`), so badges that do not fit **as a whole** are clipped and the name keeps its room at the boundary of every state.
  The `gap: 0.75rem` of the label row is paid between flex items even when the group is squeezed to nothing: `margin-left:
  -0.5rem` gives most of it back (0.25 rem remains, between the kind and a visible badge, and as the cost at zero width), so the
  name keeps its 8 rem at the boundaries to within that 0.25 rem; the replica measured it (Verification). In the tight state (the
  label wraps onto several rows) the override is `max-height: none; max-width: 100%; flex: none; margin-left: 0`: all of them show,
  never wider than the row. Placement: the base rule sits next to `.element-header-label h2`, before the first `@container`
  (queries add no specificity); the override sits inside the existing 46rem block; both are outside the block `header.test.js`
  scans for theme tokens only (they hold no colour anyway). No new container query, no new colour (the
  badge rule is the existing one), the block test of tokens still holds. Hidden badges are still in the accessible tree; the
  group is named.
Rejected: a new "badges" state of the container queries (a fourth limit to keep true); putting them in the actions row (the
contract); `display: none` below a width (loses them exactly where Details has no panel).

# Repository Impact

- IMP-1 — `standalone.html` CSS: `.inspection-rel-marked`, `.inspection-rel-mark`, `.element-header-badges` (+ its tight override).
- IMP-2 — JS: `relationshipsOfLink`, `relationshipKeyOf`, `renderDeclaringElementHtml`, `renderRelationshipInspectionHtml` (3
  arguments), `renderLinkInspectionHtml`; `renderDiagramSvg` (`data-nth`); `selectLink` (`via`), the `select-link` case;
  `linkFromHash`, `restoreLinkFromHash`, `linkInRoute`, `currentRouteHash`, `applySelectionFromHashRef` / `selectFromHashRef`;
  `revealLinkAfterDrawing`, `revealSelectedLink`, `settleLinkSelection`, `showDiagramScene`; `renderHeaderBadgesHtml`,
  `renderElementTitleHtml`.
- IMP-3 — `src/test/javascript/viewpoint-kernel/inspection-navigation.test.js` (new), `inspection-links.test.js` (five
  assertions updated deliberately, never loosened: the path of a relationship as plain text (three), and the address of a link
  selection, which was pinned as "does not carry it" (two); header tests need no edit, their fixture element has no styled
  stereotype).
- IMP-4 — `src/doc/README.adoc`: `[[editor-inspection]]`.

# Canonical Impact

- CI-arc-1 — Not applicable. The repository declares no `arc` register (no `docs/CLAUDE.md`, no `docs/arc`); the change is
  the navigation of one panel of the standalone editor, no structure of the system changes.
- CI-dom-1 — Not applicable. No `dom` register is declared and no domain invariant becomes enforceable: nothing about the
  model, the manifests, the kernel or the address grammar of the CLI changes (the new parameters are the editor's own).

# Data Model and Contracts

- CTR-1 — Selection `link` gains the optional `via: string[]` (relationship keys). Everything else as in run 0019. A
  `via` never changes which pair is selected; readers that do not know it ignore it.
- CTR-2 — Address: `link-from` and `link-to`, both or none, after the other parameters of the perspective and before
  `story=`; only with a link selected where one can live (DEC-2).
- CTR-3 — Markup: `data-nth` on `.dg-link` and `.dg-label` of a pair with several drawn links; the declaring element is
  `button.relationship-link[data-action=goto-element][data-ref][data-layer]`; the header group is
  `span.element-header-badges[role=group]`.

# Interfaces and Behavior

- IF-1 — Click or Enter/Space on a declaring element: as a box (`goto-element`).
- IF-2 — Opening an address with a link: the panel waits, then shows the link or the address is cleaned.
- IF-3 — Click on a link of the Map: the panel opens; if the link would be behind its edge it is panned in once.

# Flows and Processing Logic

- FLOW-1 — Click on a link: pin the framing (Map, Center), `selectLink` (pair + `via`), flag the reveal (Map), render →
  scene → `reconcileLinkSelection` (panel filled) → `markLinkSelection` → `revealSelectedLink` → `syncHashFromState` (the
  address now has the link).
- FLOW-2 — Load/Back with a link: `applySelectionFromHashRef` → selection + flag → render (panel waits) → scene →
  reconcile: kept (panel filled, view revealed) or dropped (address cleaned).
- FLOW-3 — Declaring element: `goto-element` → push (address with the link) → element selected → Back restores the link.

# Reliability, Performance, and Scalability

The reveal reads the rectangles of one link; the pre-count of `data-nth` is one pass over the edges. No timer, no
observer. A very dense Map pays one attribute on parallel links only.

# Security and Privacy

The address values go through `URLSearchParams` (read) and `encodeURIComponent` (write); every value reaching the markup goes
through `escapeHtml` (the reference in the button, its label, its `data-*`). A hand-edited address can only select a pair
that the drawing then has or drops.

# Observability and Verification

New Node tests (`inspection-navigation.test.js`): the button (markup, layer, accessible name, plain text when the layer lacks
it, the click goes through `goto-element`); the address (written for Map and Elements, not for a link whose context is gone,
read back for both, lone/empty parameters ignored, an unknown pair dropped with the address cleaned, an old address
untouched, the Back round trip after `goto-element`, `hashchange` re-reads a changed link and ignores an equal one, special
characters in an id); the reveal (flag set by a click on the Map and by the address, one-shot, not set in Elements, consumed
by `showDiagramScene`, pans through `revealDiagramNode` only when outside, clicked link of several preferred); parallel links
(`data-nth` only on twins, `via` set from the click, never the position, the panel marks and says so, no mark when they cannot
be told apart or without `via`); the header (badges after the kind, before the tabs, same markup as the tree, nothing for an
element without styled stereotype, the group is named, in all four tabs, the CSS rules and the tight override, no fixed colour);
the existing header tests pass unchanged; the address guard is tested as a function of the state (Library, a leftover link).
Hand mutations of the new code (about thirty, one at a time, the file restored and hashed each time). Replica in the built-in browser
(real stylesheet, markup from the harness) for the header at several widths and the panel, light and dark: with a 40-character
name and four badges the name kept 10.4 rem in the compact state, 9.75 rem in the minimal one, and the tight state showed every
badge on its own row; the panel's mark has a contrast of 5.4 (light) and 7.2 (dark). It cannot confirm the real layout of the
Map pan, a screen reader or a real Back/Forward navigation (ASM-4).

# Deployment and Rollout

None beyond the file (the editor is one HTML file). Old addresses (no link parameters) read as before; an address with a link
opened by 0.10.0 ignores two parameters it does not know.

# Risks and Tradeoffs

- RISK-1 — `restoreLinkFromHash` selects before knowing the pair exists; a stale address flashes "Reading the link…". The
  panel is there for that state (run 0019 DEC-5); the flash is the cost of not computing a drawing for a parameter.
- RISK-2 — The folds of the Map are not in the address: a link between boxes that depend on the sender's folds is absent
  for the receiver and is dropped silently (their address is cleaned). A fold-aware address is a bigger change (deferred).
- RISK-3 — One scene per mount (`mountDiagramIfNeeded` shows the cached scene or computes one, never both), but a superseded
  mount (`seq`) shows none and leaves the request for the next; an error scene consumes it (and drops the link). Only a click or an
  address sets it, so a request cannot outlive its selection (`settleLinkSelection` clears it).
- RISK-4 — After the declaring-element click the focus is lost (the panel is replaced): same as the relationship buttons of
  Details; not made worse.
- RISK-5 — Run 0025 edits the same link markup and `markLinkSelection`: `data-nth` is additive and only on twins; `via` and the
  reveal do not touch the tab-stop model. Its tests of the exact opening tag of a link without twins stay valid.
- RISK-6 — The header badges clip rather than wrap in the full states: a reader of an element with many stereotypes sees the
  first ones; the panel and Details list all of them.

# Open Questions

- Q-1 — For the owner of tmorin/archicode#17 to confirm (not blocking): the issue says "centre on the selected link"; this design
  brings it into view by the least pan instead (DEC-3), because centring moves a link the user is looking at and runs 0018 and
  0019 refused a selection that jumps the view. If centring is wanted for a link that is out of sight, it is a one-function change
  in `revealSelectedLink`. Decided here, resolved by the run: the key of a link in the address (DEC-2), how parallel links are told
  apart (DEC-4).

# Deferred Work

- DEF-1 — Folds of the Map in the address (RISK-2).
- DEF-2 — Reveal a box selected from a link panel on the Map (the same flag, one line) if the field check asks for it.
- DEF-3 — A human look at the real page in Chromium (hash navigation, real layout): wave item W-5.

# File Placement and Frontmatter

`docs/wav/wav-005-follow-ups-and-field-check/run/run-0024-inspection-panel-navigation/tdd-0024-inspection-panel-navigation.md`.
