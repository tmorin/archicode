---
type: run
run: 0025
status: completed
wave: 005
---

# Run 0025: Diagram link tab stops

Wave 005 (`follow-ups-and-field-check`), run W-3, tmorin/archicode#17 item 4 ("Links are drawn before the boxes, so Tab visits
every link first on a dense map ... A roving tab stop could replace one stop per link without changing the selection").
Document profile: `single-document` (the scope is settled by the issue and the wave plan row W-3): this one document carries
scope, decisions, rejected alternatives, tasks, canonical impact, verification and findings. No PRD, TDD or pln.

## Scope

In: `src/main/resources/editor-webapp/standalone.html` (the markup of the links in `renderDiagramSvg`, the focus handler,
`handleDiagramKeydown`, `restoreDiagramFocus`/`diagramFocusTargetOf`, `showDiagramScene`, the group around the links),
`src/test/javascript/viewpoint-kernel/` (a new file `diagram-link-tab-stops.test.js`; three places of
`inspection-links.test.js` that pinned one tab stop per link, the arrow keys going on from a link's box, or the focus target
without `nth`, are updated deliberately, never loosened), and, outside `likely_paths`, the manual paragraphs `[[editor-inspection]]` and
`[[editor-keyboard]]` of `src/doc/README.adoc`.

Out: the boxes (still one tab stop each, arrow keys between boxes unchanged), the selection model (`{kind:'link', from, to,
layer, focal?, via?}`), the panel, the address, the Rust kernel and the base64 block.

## Current state

- Every `<g class="dg-link">` is `tabindex="0"`. The markup order is `compounds + edges + leaves + labels`, so the Tab order is
  the canvas, the compound boxes (with their fold buttons), then **every link**, then the leaf boxes: on a dense diagram a
  keyboard user crosses all the links before the first leaf (run 0019, RISK-1).
- The arrow keys from a focused link continue from the box it starts from (`diagramLinkStartOf`, run 0019): a way out of that
  order, not a way to move among links.
- The focus survives a redraw (`diagramFocusTargetOf` -> `pendingDiagramFocus` -> `restoreDiagramFocus`), but a link is found
  by `(from, to)` only: with parallel links it lands on the first twin (finding of run 0024). `data-nth` (run 0024, only on
  links that have a twin) says which one.

## Decisions

- **DEC-1 — One tab stop for the group of links (roving tabindex).** Exactly one link has `tabindex="0"`, the others `-1`.
  `syncLinkTabStop(canvas)` sets it after every drawing. The markup also gives `0` to the first link drawn and `-1` to the
  others, so a drawing is right as built (the sync only moves it); this is the default of DEC-2's last step. The canvas, the
  boxes and the fold buttons keep their tab stops. Tab order is unchanged (canvas, compounds, the one link stop, leaves) but
  crosses one stop for all the links; Shift+Tab from the first leaf comes back to it.
- **DEC-2 — Which link is the stop (one fallback rule).** The link the focus last rested on (`diagramLinkStop`, the key
  `{from, to, nth}`, `nth` = `data-nth` or null) if the drawing has it, the first link of that pair when its twin is gone or
  when it had none and has twins now (null matches only a link with no `data-nth`); else the first link of the selected
  pair; else the first link drawn. What is stored is what was chosen, so it is never a link the drawing lacks; a drawing with
  no link has no stop. The stop follows the **focus** (`focusin` on a link, which a click, an arrow key, Tab and the focus
  given back after a redraw all produce), not the selection, as the pattern says; a click on a link or on its caption also
  sets it (the `select-link` case), where a browser gives a link no focus. The stop is also forgotten where an address puts a
  selection in place (`restoreLinkFromHash`, past its early returns): the address moves the selection and not the focus, so
  the selected link, "else the first", is the stop then.
- **DEC-3 — Keys.** On a focused link only (the handler covers the whole stage, so it tests `closest('.dg-link')`): Right and
  Down go to the next link, Left and Up to the previous, Home and End to the first and the last, in the order of the drawing
  (the order of the markup, which is the kernel's order of links as laid out), without wrap-around, and the press is
  swallowed at an end so nothing else reacts. Four arrows so that whichever axis the user thinks in works; the order is not
  spatial and the manual says so. Enter and Space keep their handler (placed before these keys) and select; Escape still
  leaves Maximize first, then deselects (the redraw gives the focus back to the same link); a selection on link A with the
  focus on link B is fine: the stop is B's, the selection A's. The focus handler pans the new link into view like for a box.
  Home and End on a box are not taken. ctrl, meta and alt are left to the browser, as before.
- **DEC-4 — How the arrows coexist with the boxes.** Nothing changes for a focused box or fold button: arrows go to the
  neighbouring box, spatially. What changes is the arrow key on a *link*: it used to jump to a box next to the link's start
  box (`diagramLinkStartOf`), now it moves among the links. The old behaviour existed only to get out of the links-first
  order; with one stop, one Tab does that, and one key with two meanings on one element would be unguessable.
  `diagramLinkStartOf` is removed with its test. Accepted consequence (RISK-1): nothing leads from a box to a link but Tab
  and Shift+Tab (Shift+Tab from the first leaf reaches the stop); a key on a box that focuses its first link is a scope
  decision left out (written up in the findings).
- **DEC-5 — Announcing it.** The links are wrapped in `<g class="dg-links" role="group" aria-label="Links: one tab stop, the arrow keys
  move between them">` (only when there are links; the exported SVG drops its role and label, as it drops `tabindex`). The
  canvas label, read on the canvas where arrows go to boxes, says nothing about it. The links keep `role="button"`,
  `aria-pressed` and their label; a screen reader in browse mode may still take the arrows (not checkable here).
- **DEC-6 — What does not change.** The selection model (still by pair; `nth` still only feeds `via` in `selectLink`, as run
  0024 made it), the panel, hover and focus lighting of the pair (`highlightDiagram`), the address.

### Rejected alternatives

- *Keep arrows as they were and use Home/End and Page Up/Down for links.* Keeps a shipped behaviour but the issue and the
  wave plan ask for arrow-key movement, and it leaves the standard keys of the pattern with no meaning.
- *Move the links after the boxes in the markup.* Changes drawing order (z-order: links over boxes), and a link still
  would be N stops.
- *Spatial arrows among links.* A link is a path, not a box: "the link to the right" is ambiguous, the cost is large, and the
  boxes already have the spatial model.
- *Wrap around at the ends.* A silent jump from the last link to the first is disorienting on a dense map.
- *`aria-activedescendant` on the group instead of moving the focus.* The links need real focus: `:focus-visible` outline,
  the pair lighting and the panning all hang on `focusin`.
- *Make the stop the selected link always.* The selection and the focus are two things; a user who arrows to look at the
  links would find the stop snapped back to the selected one.

## Tasks

1. [x] T-1 Markup: first link `tabindex="0"`, the others `-1`; the links in a labelled group.
2. [x] T-2 `diagramLinkStop`, `syncLinkTabStop`, called by `showDiagramScene` after `markLinkSelection`; `focusin` on a link
   and a click on a link move the stop; `restoreLinkFromHash` forgets it where it sets a selection.
3. [x] T-3 `handleDiagramKeydown`: link movement; remove `diagramLinkStartOf`.
4. [x] T-4 `nth` in `diagramFocusTargetOf` / `restoreDiagramFocus`.
5. [x] T-5 The group label; the manual (`[[editor-inspection]]`, `[[editor-keyboard]]`).
6. [x] T-6 Tests (new file; three places of `inspection-links.test.js` updated); mutation check by hand.
7. [x] T-7 Replica check (a compound, twins, six links) of the Tab order and the keys in the built-in browser.

## Risks

- RISK-1 — A user who relied on arrows from a link to reach boxes loses that; Tab replaces it (DEC-4). Recorded, stated in
  the manual.
- RISK-2 — `focusin` also fires for the restore after a redraw and for a click; both must leave exactly one `tabindex="0"`:
  the sync is idempotent and tested.
- RISK-3 — Real focus order cannot be exercised here with a real folder and a real diagram (no folder picker); a replica
  (the real markup of `renderDiagramSvg`, the real stylesheet and the real source of the new functions, with stubs around them)
  covers what a browser does with `tabindex` on SVG `<g>`.

## Canonical impact

None. The architecture and domain registers (`CI-arc`, `CI-dom`) do not exist for this repository's editor UI, and this run
changes the keyboard behaviour of one component of a single-file web page: no cross-cutting structure, no domain invariant,
no analysis fulfilled.

## Verification

- `node --test "src/test/javascript/**/*.test.js"`: 442 pass, 0 fail (baseline 424: one test removed, the arrow-from-a-link-to-its-box
  one; 19 added in `diagram-link-tab-stops.test.js`). They cover the markup (one stop, twins, group, boxes keep theirs), the
  stop (none remembered, selected, remembered over selected, a twin, disappearing, no link), the focus moving it, the keys
  (four arrows, Home, End, ends, swallowed, box unchanged, modifiers, Enter/Space/Escape handlers still there), the focus
  after a redraw (twin, twin gone, gained twins, pair gone), a click and an address, the sync order in `showDiagramScene`.
- `JAVA_HOME=.../25.0.4-tem ./mvnw test`: 111 tests, BUILD SUCCESS (no Java change; baseline 111).
- `src/main/rust/viewpoint-kernel/embed.sh --check`: exit 0 ("the committed WebAssembly is the one the sources build").
- Mutation check by hand (13 mutations of `standalone.html`, one at a time, file restored after each): first link not the
  stop, all links stops, sync ignoring the memory, ignoring the selection, sync not called, focus not moving the stop,
  twin ignored in the restore, wrap-around, next/previous inverted, no `preventDefault`, a click not setting the stop,
  an address keeping the stop, `nth` dropped from the key: each failed at least one test.
- Replica in the built-in browser (the real markup from `renderDiagramSvg` with a compound box, two parallel links and four
  other links; the real stylesheet and the real source of the new functions; stubs for the rest of the page): Tab order was
  before, canvas, compound box, **one** link, leaf box; arrows moved a>b #0 -> #1 -> b>a, End -> d>a, Right at the end did
  nothing, Home -> #0, Up at the start did nothing; Tab then Shift+Tab came back to the same link; Enter selected the pair
  (both twins `aria-pressed`); the focused link and its pair were lit. The server was started on port 8765 and killed by
  PID; no viewport emulation was used.
- Could not confirm: the real focus order in a real browser with a real diagram from a real folder (no folder picker); how a
  screen reader treats arrows inside the `role="group"` (browse mode may take them); focus restoration after a real redraw
  (the redraw is exercised on fakes); the manual build (`./mvnw` was not asked to build the Asciidoctor site).

## Findings

- F-1 — The Tab order was never "links before boxes" as a whole: compound boxes come before the links (their `<g>` is
  first), leaves after. The TDD of run 0019 and the issue say links first; the reviewer of this run's design caught it.
- F-2 — Nothing leads from a box to its links except Tab/Shift+Tab. If wanted, a key on a box that focuses its first
  link (or the link group) is a small follow-up (not filed by this run).
- F-3 — The arrow keys on a link no longer jump to a box (DEC-4): a deliberate change of run 0019's behaviour, in the manual.
- F-4 — Run 0024's finding is closed: the focus restore now tells twins apart (`data-nth`).
- F-5 — Design review (KDMLLC) findings applied: tab-order claim, one fallback rule, the caption click, where the address
  forgets the stop, the labelled group instead of a canvas-label sentence, Home/End scoping, one key helper
  (`diagramLinkKeyOf`) for the stop and the focus target.
