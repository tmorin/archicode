---
type: run
run: 0030
status: completed
wave: 006
---

# Run 0030: Library view field check

Document profile: `single-document`, an evidence run. Wave 006, item W-4 (phase P3). The page of a view in the Library
(`#/library/views?view=<id>`), as built by runs 0027 (diagram), 0028 (right-hand panel) and 0029 (edit), seen in the real editor
served by this branch (version shown by the page: `0.11.0-SNAPSHOT`), on a **copy** of the user's workspace, with the view
`authentication_token_validation`, in light and dark and at three widths. One defect was clear, small and certain, and is
fixed with a test (F-1); everything else is written up below as open.

## Scope

In: the page of `authentication_token_validation` and of a Map view; the centre diagram; the right panel; the selection of a
box and of a link; *Show in Elements*; each kind of edit; the *modified* marks; *Save all changes*; *Cancel*; a reload after a
save; the manifest files before and after; the Map and Elements pages after a visit; light, dark and system; 1400, 822 and 420
px; the header menu; the keyboard; a story step that shows an edited view; the console.

Out, and why:

- A real folder picker and the folder list (served mode has one folder; as in waves 005 and 006).
- A screen reader; Safari; a phone. The 420 px width is measured and looked at, but a phone is not a target of the editor.
- Picking a suggestion of the browser's `<datalist>` by mouse: the popup is native, is not drawn in a screenshot of the page,
  and the checks typed the whole reference and pressed Enter instead.
- The user's own workspace: never written (see Method, step 1 and the end of the manifest section).

## Method

1. The workspace `<real-workspace>` (45 files) was only **read**: `cp -r` into the session
   scratchpad, twice (a working copy and a pristine one to `diff` against). `md5sum` of its 45 files was taken at the start
   and again at the end: identical; `workspace.yaml` is from 2026-10-13 19:17, the view manifest from 2026-10-12, both before
   this session. Nothing of the copy or of a screenshot is in the repository.
2. `JAVA_HOME=.../25.0.4-tem ./mvnw -q -DskipTests package`, then `java -jar target/quarkus-app/quarkus-run.jar editor serve
   --host=127.0.0.1 -p 48130 -w <copy>/workspace.yaml` (loopback only; the token URL it printed was opened as is). Rebuilt and
   served again once, after the fix of F-1 (new token). Both servers stopped by PID (`ps` and `ss` show no process and no listener
   on 48130 afterwards).
3. **What could be seen, and how.** The built-in browser of the desktop app was fronted (`preview_start`, `tabs_select`,
   `resize_window`) and a screenshot tried three times (once after the navigation, once after a wait, once after a viewport change): each failed with "Screenshot timed out after 5s: the
   page did not finish rendering", the pane being reported hidden. So the pane was used only for what needs no pixels (rectangles,
   the *system* colour scheme by emulation, a second reading of the header icon). The look rests on **screenshots taken by a
   headless Firefox** (snap build 20260925, its own temporary profile, driven over WebDriver BiDi with a small script of this run:
   real pointer clicks, real key presses, `confirm()` accepted and logged, `log.entryAdded` collected), which draw the page for real;
   every screenshot named below was opened and looked at. Firefox is not Chromium: the CSS is the same, the pixels of native
   controls (select arrows, scrollbars) are Firefox's. Evidence kinds per line: *shot* (a screenshot), *measure* (a read of
   rectangles and computed styles from the page), *keys* (real key presses, then a read of `document.activeElement`), *text* (page
   text), *diff* (files on disk).
4. The theme was changed in Settings > Appearance with a real click on the radio (Light, Dark; key
   `archicode-standalone-editor:theme`); *System* was checked in the pane with `resize_window colorScheme`.
5. The copy has two views, both Elements views (`authentication_token_validation`, `audittrail_detailed_facet_audittrail`) and
   **no Map view**. A Map view was made on the copy with *Name view…* on the Map (three pins), as the brief allows, and is
   named `map_field_check`.
6. Cleanup: the headless Firefox was stopped by `systemctl --user stop` of its own scope (the user's Firefox, started earlier,
   was not touched), its profile and the screenshots were deleted, the pane's viewport emulation cleared and its tab closed.

## Checklist

L = light, D = dark. "Expected" is what the wave plan, the manual and runs 0027 to 0029 say. Unless a row says otherwise it was looked at in a screenshot at 1400 px in the theme named (or both when none is named) and, for the width-independent behaviour (edits, saves, keys), done once at 1400 px in the theme that was current at that moment (L until the first save and its restore, D afterwards; the code is the same in both). The three widths in both themes are checks 18, 20, 21 and 22. Order of the session: 1 to 7, then 8 to 12 and 14 (before any save), then 13 (the first save), then 16 to 24; the Map view of check 2 was made just before check 12.

| # | Check | Expected | Observed | Evidence |
|---|-------|----------|----------|----------|
| 1 | Centre diagram, `authentication_token_validation` (Elements view: facet `oidc`, hide-unlinked, labels off, wrap) | the diagram of the view in the centre, facet applied | `Detailed of platform.access through facet "oidc" — 13 items, 10 links (10 dashed: relationships grouped under an enclosing element). 2 unlinked boxes hidden.` The same sentence and boxes as *Open on diagram* gives in Elements (`#/elements?ref=platform.access&tab=detailed&facet=oidc&labels=0&wrap=1&hide-unlinked=1`). The diagram opens at 80 % with part out of view (status: "Fit shows all of it (45%)"), as Elements does (F-3) | shot L, D (1400), text |
| 2 | Centre diagram of a Map view | the map of the pinned, hidden and open elements | `map_field_check`: `Map of the workspace — 23 items, 43 links`, the same as the Map with the three pins | shot D, text |
| 3 | Right panel content | attributes of the view as fields, then the selection | Draws, Kept in (`manifests/view.authentication_token_validation.yaml`), Viewpoint, Layer, Element (with the element's name under it), Facet, Drawing (Hide unlinked, Labels, Qualifiers, Descriptions, Wrap), Shown in. Map view: Pinned, Hidden, Open as chips with an "Add an element…" field, Facet, Drawing | shot L, D |
| 4 | Select a box | the inspection of the element, the page and its address unchanged | click on `Auth`: SELECTED ELEMENT (kind, layer, id, reference, name, description, qualifiers, tags, source file, *Show in Elements*); address still `#/library/views?view=authentication_token_validation`; the other boxes are dimmed | shot L (1400), text |
| 5 | Select a link | the link panel | click on the link `Auth -> Access Backend`: SELECTED LINK, From, To, `RELATIONSHIPS 1` (`checks the passes issued by`, qualifiers `OIDC`, tags `gate-point: yes`, `tcp-port: 80`); the selected link is drawn blue; address unchanged | shot L, text |
| 6 | *Show in Elements* | leaves for the element; Back comes back | click: `#/elements?ref=platform.auth&tab=overview`, perspective Elements; browser Back: the Library page and its selection are back | text, shot |
| 7 | Keyboard on boxes and links | Enter selects, Escape clears | focus a box, Enter: SELECTED ELEMENT, focus stays on the box (class `dg-selected`); Escape: the section is gone, the focus stays on the box. Same for a link | keys |
| 8 | Edit: viewpoint | redraw, *modified*, nothing written | select + Up: `Overview ... 12 items`; Down: back to Detailed. Header badge `MODIFIED`, the list row `MODIFIED`, `Save all changes (1)`; `diff -r` of the copy against the pristine copy: no difference. A value put back keeps the view modified (F-6) | keys, shot L (Overview), diff |
| 9 | Edit: element | redraw | typed `platform.policy` + Enter: `4 items, 1 link`, "Draws" says `Policy — Detailed (facet oidc)`. Typed `nope.x` + Enter: the red line `"nope.x" is not an element of the application layer.` under the field and the drawing unchanged (D) | keys, shot L, D |
| 10 | Edit: facet | redraw | select + Down x4 from `oidc` to `policy`; at `main`: `9 items, 5 links` | keys, text |
| 11 | Edit: hide-unlinked, a text | panel and toolbar are the same edit | real click on the panel's *Hide unlinked*: the toolbar button un-presses; real click on the toolbar's button: the checkbox is checked again; the toolbar's *Labels* flips the panel's *Labels* | keys, text |
| 12 | Edit: a Map's pin lists | add with Enter, remove, refusal | added `platform.vault` to Pinned (`56 links`), `platform.aclsvc` to Hidden (`22 items`), `platform.policy` to Open (`25 items`); `platform.nope` refused with its reason under the field; × on the `platform.vault` chip removed it and cleared the refused text | keys, real click, shot D |
| 13 | *Save all changes* | writes only the view's file | Elements view: `diff` of the 45 files before and after: only `view.authentication_token_validation.yaml` (see the next section); Map view: only the new `view.map_field_check.yaml`; the button goes back to disabled, the badges go; a reload shows the saved values (`Deep ... policy`, Labels checked) | diff, text |
| 14 | *Cancel* | gives the edit up | with viewpoint, element and a text edited: click *Cancel*: `confirm` "Cancel and discard 1 modified item? The folder is read again from disk." accepted; values are the saved ones again (`detailed`, `platform.access`, `oidc`, 13 items), the page stays on the same view, the copy is byte-identical to the pristine one | keys, diff |
| 15 | A view edited into something undrawable | says why, Save not blocked, Cancel works | layer set to Technology: the list row shows `BROKEN` and `MODIFIED`, the centre says `This view has no element.` and shows `Draws (no element) — Deep (facet oidc)` and the same fields; the header keeps Rename and Delete; Cancel brought the view back | shot D, text |
| 16 | The Map and Elements pages after a visit | nothing moved | Map: three pins and a selected element `platform.vault`; one snapshot (address, chips, status, toolbar pressed states, panel text, facet) before the visit, a second after visiting the Map view's page, editing its three lists and saving, then clicking *Map*: **identical** (`diff` of the two JSON strings empty). Elements: `ref=platform.policy&tab=overview&facet=policy` with labels on: identical after a visit to the other view's page | measure |
| 17 | A story step that shows the edited view | the step shows the edited view | created `Token story` (real clicks), added the view as its step; on the page, viewpoint set to Overview (unsaved): *Shown in* lists `Token story — step 1`, its button leads to the story; *Show on diagram*: `Overview of platform.access ... 12 items, 10 links`, story bar `Step 1 of 1`. Cancel then dropped the story and the edit (`2 modified items`) | text, shot |
| 18 | Light and dark | readable | L and D at 1400, 822 and 420 px looked at (shots). Contrast measured on the page in both themes (WCAG ratio, threshold 4.5 for text): subject, labels, muted text 5.36 L / 5.31 D; field text 17.4 L / 13.6 D; `MODIFIED` badge 4.78 L / 9.76 D; red refusal 6.84 L / 5.45 D; toolbar button 5.42 L / 6.82 D. **Not readable in D (seen in the screenshots, not measured):** the titles of unstyled compound boxes drawn on a user-styled light fill (F-2) | shot, measure |
| 19 | *System* | follows the OS | pane, `colorScheme` emulated: OS dark gives `rgb(30,30,30)` body and `rgb(38,38,38)` right panel; OS light gives `rgb(255,255,255)` and `rgb(247,247,248)`; stored choice unset | measure |
| 20 | Width 1400 (centre 850 px; looked at before the fix of F-1, the icon again after it) | header in "minimal" state, panel at 288 px | header one row (48 px), `⋯` + Maximize; the menu has Download PNG / SVG, Open on diagram, Rename, Delete (readable L, D); no overflow of the document. The `⋯` icon was a 4.4 px sliver before the fix (F-1), 16 px after | shot, measure |
| 21 | Width 822 (centre 270 px, list 256, panel 288; before the fix of F-1, the icon measured again after it) | holds together | the header wraps to two rows (109 px, no overflow); the `⋯` menu opens under the button, 208 px wide, inside the window; the document does not scroll sideways (`scrollWidth` 822). The centre scrolls 87 px sideways (the status line and the legend), and the second row of the diagram toolbar starts 28 px left of the toolbar (`Labels` cut): F-4 | shot L, D, measure |
| 22 | Width 420 (centre 56 px, list 192, panel 224) | does not break | the centre is 56 px wide (196 to 252) and the right panel starts at x=200, inside it, so the content of the centre runs behind the panel (header overflow 68 px, document 424 px wide for a 420 px window); the Map has the identical geometry (centre 56, panel 224, document 424). Not usable, as on the Map: F-4 | shot L, D, measure |
| 23 | Keyboard: Tab order | into the panel | from the active list row: the two Library tabs, `⋯`, Maximize, the diagram (`role=img` canvas), its 13 boxes (2 compound and 11 leaf, in the order compounds, link, leaves) and its one link stop, the ten toolbar buttons, then Viewpoint, Layer, Element, Facet: the first field of the panel is reached by the 31st press of Tab from the active list row, the first press landing on the next row of the list (F-8) | keys |
| 24 | Console | no error | the `log.entryAdded` events of the whole session: none, apart from the three accepted `confirm()` prompts (one per *Cancel* click, checks 14, 15 and 17); the debug line of the whole `AppState` (finding F-6 of run 0026) is gone | BiDi log |

## Manifest of the view, before and after

The file of the view in the copy, `manifests/view.authentication_token_validation.yaml`. Real `cat` output; the files have no final
newline.

**Before** (md5 `86ff885d...`, identical to the user's original):

```yaml
header:
  kind: archicode.morin.io/view
  version: "1"
content:
  id: authentication_token_validation
  name: Authentication Token Validation
  viewpoint: detailed
  layer: application
  properties:
    element: platform.access
    facet: oidc
    hide-unlinked: true
    labels: false
    wrap: true
```

**After an edit and a save** (viewpoint Deep, element `platform.policy`, facet `policy`, *Hide unlinked* off, *Labels* on; one click on
*Save all changes (1)*; md5 `c6ac5d7e...`). `diff` of this file against the one above, and `diff` of the 45 files: only this
file differs.

```yaml
header:
  kind: archicode.morin.io/view
  version: "1"
content:
  id: authentication_token_validation
  name: Authentication Token Validation
  viewpoint: deep
  layer: application
  properties:
    element: platform.policy
    facet: policy
    wrap: true
```

`hide-unlinked: false` and `labels: true` are the defaults, so they are not written (the two lines are gone); the other lines,
the quoting and the missing final newline are untouched.

**After putting everything back** (the same attributes as the original, by the same fields, then Save; md5 `4106555c...`), the
only difference from the original is the order of two keys:

```diff
@@
     facet: oidc
+    wrap: true
     hide-unlinked: true
-    labels: false
-    wrap: true
+    labels: false
```

(`wrap`, which the first save kept, now comes first; the two properties that the first save dropped and the second wrote again, `hide-unlinked` and `labels`, come after it, in their original order: F-7.) The Map
view made for this run, after a *Name view…*, three edits of its lists and a save (`manifests/view.map_field_check.yaml`, md5
`45880776...`):

```yaml
header:
  kind: archicode.morin.io/view
  version: "1"
content:
  id: map_field_check
  name: Map field check
  viewpoint: map
  layer: application
  properties:
    pinned:
      - platform.policy
      - platform.access
      - platform.portal
    hidden:
      - platform.aclsvc
    opened:
      - platform.policy
```

At the end of the session `md5sum` of the copy against the 45 files of the original differs for one file (`view.authentication_token_validation.yaml`, the third state above) and has one file more (`view.map_field_check.yaml`); `view.audittrail_detailed_facet_audittrail.yaml`, the 42 other manifests and `workspace.yaml` are byte-identical to the original.

## Findings

Severity: M medium (a reader cannot read or lose something), L low (cosmetic, a limit or a wording). "Shared" means the Map and
Elements show the same thing, so it is not a regression of this wave.

- **F-1 (L, shared, FIXED with a test): the `⋯` button of every header drew its icon as a 4.4 px wide sliver.** The page-wide
  rule `.element-header button { padding: 0 0.8rem !important }` (specificity 0,1,1) beat `.header-more-button { padding: 0
  !important }` (0,1,0): the 2 rem button kept 25.6 px of padding, and its 16 px icon was squeezed to 4.4 px (measured by `getBoundingClientRect` in Firefox, 4.4 px, and in the pane's Chromium, 4.40625 px). The three dots read as a dash on the Library page, on Elements and on the
  Map in the "minimal" state. Fix: the rule is `.element-header .header-more-button` (0,2,0), in
  `src/main/resources/editor-webapp/standalone.html`. Test: `header.test.js`, "the ⋯ button keeps its 2rem and no padding: its rule is more specific than \".element-header button\", which has !important too"
  (fails on the old stylesheet, passes now); the existing test of the minimal state follows the new selector. Measured after
  the fix, in the real page: the icon is 16 x 16 px on the Library page at 1400 and 822 px and on the Map at 822 px (shot: three dots).
- **F-2 (M, pre-existing, shared, open): in dark mode the title of an unstyled compound box is unreadable when the box sits on a
  user-styled light fill.** The user's `changed` / `new` styles keep their light fills in dark (wave 005 check 10, by design),
  while an unstyled box is dark with light text: a compound box without a style, drawn inside one with, has its title in
  light text on the light fill. Seen on `Access Management` (the focal compound of the view) and `ACL Service` in the
  Library page, in Elements and on the Map in dark. A fix is a design choice (text colour of a title from the fill behind
  it, or a dark fill for the title band), not a small CSS correction.
- **F-3 (L, shared, open): a diagram opens at 80 % with part of it out of view** ("Fit shows all of it (45%)", 26 % for the Deep
  view). On a page whose centre is the diagram, *Fit* on first draw would show the whole view; Elements and the Map do the same.
- **F-4 (L, shared, open): below a centre of about 300 px the diagram toolbar and status overflow.** At 822 px (centre 270 px):
  the second row of the toolbar (`Labels ... Wrap`) starts 28 px left of the toolbar and is cut, the status line and legend make
  the centre scroll 87 px sideways. At 420 px the centre is 56 px, its content lies behind the right panel and the document is
  4 px wider than the window. The Map has the same geometry at both widths (measured). The page already narrows what it can
  (the `⋯` menu, Maximize); a phone is not a target.
- **F-5 (L, open): the name of a view in the Library list gives way to its badges.** With `MODIFIED` and `unused` the row reads
  `Authentic…`; with `BROKEN`, `MODIFIED` and `unused` it reads `Aut`. The wave-005 fix (badges give way before the name) was made
  for the tree rows only.
- **F-6 (L, existing mechanism, open): an edit that is put back leaves the view *modified*.** `markEntryChanged` sets a flag, not a
  comparison: `Save all changes` then writes a file with the same values (and F-7). By design of the mechanism, said here so that
  nobody expects the badge to clear itself.
- **F-7 (L, open): a property that an edit writes again goes after the ones that stayed** (above, `wrap` now precedes `hide-unlinked` and
  `labels`): harmless, and the file stays valid; a git diff of a view that was edited and put back shows moved lines.
- **F-8 (L, shared, open): the first field of the right panel takes 31 presses of Tab** from the list row: each of the 13 boxes of the
  diagram is a stop (the links are one roving stop), then the ten toolbar buttons. Elements and the Map have the same canvas
  and the same order, but there the panel is reached by the selection; here a keyboard user who wants to edit has to cross the
  diagram. A skip target (a landmark role on the panel is already there, `aria-label` "View and selection") or `F6`-style
  move would help; not small, not done.
- **F-9 (L, open): selecting a box or a link scrolls the right panel to the selection**, so the attributes of the view scroll up out of
  sight while the selection is open; the way back is to scroll or to close the selection with its ×.
- **F-10 (L, open, known from run 0029): a first edit typed in a field, followed by a click on a still-disabled *Save all changes*,
  needs a second click** (the disabled button takes no click; the edit lights it after the blur).
- **Observation, not a finding.** The address of
  the page keeps `ref=<element>` of the last Map selection while on the Library (`#/library/views?ref=platform.vault&view=...`),
  as on any perspective that does not own the selection.

## Canonical impact

None. The run changes one CSS selector and one test; no architecture description and no domain invariant is added or altered, so
there is no `CI-arc-n` or `CI-dom-n` item to discharge. Reason: no ArchiMate element, relationship or viewpoint is added or
altered, and no invariant is enforced by anything this run adds. No analysis (`docs/ana/`) was fulfilled.

## Review passes

- **KDMLLC review.** Run by a separate agent on the first draft (read-only, the repository as referent); result under "Review result" below.
- **Open questions.** The wave's question "which widths and which other views of the copy make a sufficient field check" is
  answered: 1400, 822 and 420 px in L and D; the second Elements view of the copy was not opened (it has the same shape as the
  first); a Map view was made, as the copy has none. Nothing else is left open except what Scope names.
- **C scan.** Each descriptive claim was read back against the page by a script or against the files by `diff` and `md5sum`;
  F-1's cause against `standalone.html` (the two rules) and the computed style of the button; the baseline numbers against the
  wave's progress log.

## Tasks

| Task | Status |
|------|--------|
| 1 Copy the workspace outside the repository (twice: working and pristine) | done |
| 2 Build the CLI, serve the copy, record the PID | done (two servers, both stopped by PID) |
| 3 Try to take screenshots in the built-in browser, say so if it cannot | done: cannot (3 failures); screenshots from a headless Firefox instead |
| 4 Checks 1 to 24 above, light and dark, three widths | done |
| 5 Manifest of the view before and after an edit and a save | done |
| 6 Findings: fix the clear one with a test, write up the rest | F-1 fixed; F-2 to F-8 open |
| 7 Suites, `embed.sh --check`, cleanup | done (Verification) |
| 8 KDMLLC review of this document | done (Review result) |
| 9 One commit | done by the commit that carries this document |

## Verification

- `node --test "src/test/javascript/**/*.test.js"`: 550 pass, 0 fail (baseline 549, plus the one test of F-1; one existing test
  of the same file edited, its selector).
- `JAVA_HOME=.../25.0.4-tem ./mvnw test`: 114 tests, BUILD SUCCESS (baseline 114).
- `src/main/rust/viewpoint-kernel/embed.sh --check`: exit 0, "the committed WebAssembly is the one the sources build".
- The new test fails against the stylesheet before the fix and passes after (run both ways).
- `git status` before the commit: `standalone.html`, `header.test.js` and this run's directory. Nothing of the copy or of a
  screenshot is in the repository; the copy stays in the scratchpad.
- Not confirmed, beyond Scope's "Out": the look in Chromium or Safari (screenshots are Firefox; the pane could not draw); the OS-dark
  case of *System* in a screenshot (measured only); the second Elements view of the copy; the page with a story that already
  existed (the story of check 17 was made for it).

## Review result

The review (13 findings: 5 at S2, 6 at S1, 2 at S0) found, and this document applied: the reference to this
section pointed nowhere (written); the theme-by-width coverage was only implied (a convention line before the table, and the
width-specific rows say so); the Tab count (31 presses from the active list row, the first landing on the next row of the list;
the sequence is stated in check 23); the manifest diff of the put-back state did not match the
mechanism (re-read from the file: `wrap` stayed, the two dropped keys came back after it; the diff and F-7 are corrected);
two observations that were real defects became F-9 and F-10; "3" versus "4" screenshot attempts (3); file counts
(45 against 45 plus one); the 56 + 192 + 224 arithmetic (the right panel starts inside the centre); a clash between two
"F-6" (renamed); the 4.5 threshold, "seen, not measured" for F-2 and which width rows precede the fix; the full test title; the
duplicated check 24 and the Tasks and "Not confirmed" lines that repeated other sections. Not applied: making the findings point
to checks instead of repeating their numbers (F-1 and F-4 are read alone by whoever files an issue; the numbers are short). The review confirmed the CSS story of F-1
(specificity (0,1,1) against (0,1,0), both `!important`; 32 - 25.6 - 2 = 4.4 px) and the 550 = 549 + 1 count.
