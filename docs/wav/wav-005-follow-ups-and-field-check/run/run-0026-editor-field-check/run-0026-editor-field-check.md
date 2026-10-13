---
type: run
run: 0026
status: completed
wave: 005
---

# Run 0026: Editor field check

Document profile: `single-document`, an evidence run. Wave 005, item W-5. Closes the "Visual check of the editor" and the
"Dangling-reference fix" items of tmorin/archicode#8 (written for 0.6.0, redone here for the editor of this branch, version
shown by the page: `0.11.0-SNAPSHOT`, after the runs 0021 to 0025). The run reads and measures; it fixes nothing (no finding
met the bar of "small, certain, and a regression of waves 004/005", see Findings) and changes no source file.

## Scope

In: the real editor, served by `archicode editor serve` of this branch on a **copy** of a real workspace, driven in the
built-in browser of the desktop app, in light and dark, at several widths; the dangling-reference fix end to end.

Out, and why:

- The folder list and the IndexedDB migration do not exist in served mode (the server has one folder; the manual says "there is
  no list and no *Close folder*"). The permission states of run 0023 need the File System Access API and a folder picker, which
  the served page does not use. Not reachable here; the third item of #16 stays open for a human on the published `/editor/`.
- The published page `/editor/` itself (it is stamped 0.10.0, run 0022); a real Chromium profile; a screen reader.
- The user's own workspace: never written. The original was only read (`cp -r` into the scratchpad); its modification times are
  from before this session (`stat` shows 19:17, the session started at about 20:20); `diff -r` of the original against the copy shows only the two manifests changed by the checks
  below, and `workspace.yaml` is identical to the original (it round-tripped through three saves).

## Method

1. `cp -r` of the workspace (45 files, 220 KB) into the session scratchpad. Nothing of it is in the repository.
2. `JAVA_HOME=.../25.0.4-tem ./mvnw -q -DskipTests package`, then `java -jar target/quarkus-app/quarkus-run.jar editor serve
   --host=127.0.0.1 -p 48099 -w <copy>/workspace.yaml` (bound to the loopback only; the token URL it printed was opened as is).
   Server PID 3604290, stopped by that PID once the main checks were done; started again once (PID 3623596, same options, a new
   token) for the dark screenshots of the Elements perspective, and stopped by that PID (`kill`, then `ps` and `ss` show no process
   and no listener on 48099 after each).
3. The page was driven with the browser tools. **Evidence kinds**, named per line below: *shot* (a screenshot), *text* (page
   text or the accessibility tree), *measure* (a `javascript_tool` read of computed styles, rectangles, `scrollWidth`,
   contrast computed with the WCAG formula), *keys* (real key presses followed by a read of `document.activeElement`).
4. How the browser behaves, so that a reader knows what the screenshots are worth: screenshots do work, but the pane is about
   822 px wide and scales a larger emulated viewport down, and the first capture after a change is sometimes a stale or partly
   painted frame (a second capture, or `tabs_select` first, gives the right one); `zoom` crops, it does not magnify. So wide
   layouts (1000 px and more) rest on *measure*, narrow ones (up to about 820 px) also on *shot*. Colour scheme was emulated with
   `resize_window colorScheme`; the Settings radio list was clicked for real (Dark) or, for the matrix, by a DOM `click()` on the
   radio (which fires the same `change` event a real click does; the first Dark choice used a real click and gave the same result). The localStorage key of the choice is `archicode-standalone-editor:theme`;
   it was left on `system`.
5. The workspace: 12 application items (32 with everything unfolded), 89 links when unfolded (15 folded), 9 environments, 41
   elements in the trees, the user's `styles.by-tags` for `external`, `new`, `changed`, 9 facets, `settings.name` already set.

## Checklist

"Expected" is what the manual, the CSS comments and the wave 004/005 run documents say. L = light, D = dark.

| # | Check | Expected | Observed | Evidence |
|---|-------|----------|----------|----------|
| 1 | Top bar, 1100 / 800 / 600 / 420 px | one row while it fits, then wraps; no horizontal overflow | 1100: one row (48 px). 800 and 600: name and perspective switch on row 1, Cancel / Save / `?` on row 2 right-aligned (77 px). 420: three rows (105 px). Document scroll width equals the viewport at all four; the header has no overflow | measure, shot at 420 |
| 2 | Button-group borders on hover | the hovered button's blue border sits above the neighbours' grey ones, no double line | hovered `Elements`: border `rgb(43,108,176)` on all four sides, `z-index: 2`, margin `-1px` overlapping its neighbours (which keep `z-index: auto`) | measure with a real pointer hover |
| 3 | Perspective switch | Map, Elements, Library, Files, Settings; the current one pressed | five buttons in one group, `aria-pressed` on the current one | text |
| 4 | *Close folder* in served mode | absent | absent from the header's DOM (header holds name, switch, Cancel, Save, `?` only) | text |
| 5 | Workspace name | `settings.name` replaces the folder name; the folder name becomes a tooltip; Save writes it; empty removes it | with the name set: label `CARA Platform rdm26`, tooltip `Folder: archi-copy`, page title `ArchiCode Editor CARA Platform rdm26`. Typed `Field check name`, Save: label, title and `workspace.yaml` follow (one line changed); emptied and Save: the `name:` line is gone and the label is the folder name followed by a slash (`archi-copy/`); typed the original back and Save: `workspace.yaml` is byte-identical to the original (`diff` empty). See F-5 for the tooltip without a name | measure, text, `diff` |
| 6 | Theme, Settings radios x OS scheme | Light/Dark force the theme, System follows the OS; remembered by the browser; no Save | all six combinations right (radio Light, Dark, System x OS light, dark): Light gives `light`, Dark gives `dark`, System gives the OS scheme (`data-theme` and the CodeMirror colours of check 7, read for each of the six); with the Dark radio the body is `rgb(30,30,30)` / text `rgb(232,232,232)` and the header `rgb(38,38,38)`; the choice is in localStorage and Save stays disabled | measure, shot (Dark radio) |
| 7 | Code editor theme (Files) | CodeMirror follows the theme | L: editor `rgb(255,255,255)` text `rgb(26,26,26)`, gutter `rgb(247,247,248)`. D: editor `rgb(30,30,30)` text `rgb(232,232,232)`, gutter `rgb(38,38,38)`, keys `rgb(156,220,254)`, strings `rgb(206,145,120)`. Same in the six combinations of check 6. CodeMirror loaded from the CDN (the machine has network) | measure, shot (D) |
| 8 | Help menu | shows the version; links to the manual | menu has Manual, Using the editor, The Map, Facets, Keyboard shortcuts and the sentence on the server and the CDN; footer `ArchiCode 0.11.0-SNAPSHOT · kernel contract 2`; all links `target=_blank`; readable in D | text, shot (D) |
| 9 | Manual links land on the right sections | every link's anchor exists in the manual, and its label matches the section | the page's link table (`DOC_LINKS`, `standalone.html` l.5206-5217) has ten keys: `manual` (base), `editor`, `elements`, `map`, `facets`, `keyboard`, `serve`, `workspace`, `viewpoints`, `settings`, `facetsConcept`. Seven appear in the UI of a served folder (collected from every perspective): Help menu (Manual, Using the editor `#editor`, The Map `#editor-map`, Facets `#editor-facets`, Keyboard shortcuts `#editor-keyboard`) and Settings (`#workspace` behind *Name*, `#technical-configuration` behind Paths, Default synthetic label and Views, `#facets` behind Facets). `elements`, `serve` and `viewpoints` (`#editor-elements`, `#serve-the-editor`, `#viewpoints`) were not met in any perspective visited; they were checked against the source only. All ten anchors exist as `[[...]]` in `src/doc/README.adoc` (headings: *Using the editor*, *Map*, *Facets* of the Editor chapter, *Workspace*, *Technical Configuration*, *Tackling view clutter* for `#facets`, as the labels say), and the base plus the seven UI anchors and `#editor-inspection` exist as `id="..."` in the HTML of the published 0.10.0 docs. Landing was not exercised by opening a link (the pane opens `_blank` links outside the page); this checks the targets, not the scroll | text, `grep`, `curl` |
| 10 | Styled boxes and badges | `external` light grey, `new` green, `changed` orange with the user's colours; two stereotypes on one box: the later wins property by property | `new`: fill `rgb(220,243,227)`, line `rgb(44,104,66)`; `changed`: `rgb(251,235,218)` / `rgb(158,74,23)`; `external` fill `rgb(211,211,211)`. A box tagged `external changed` (4 of the 12 on the folded Map) is drawn with changed's fill and line, and carries two badges, `external` grey and `changed` orange. Text contrast on every styled box and badge: 14.0 (external) to 18.0 (changed), in L and D; unstyled boxes 17.4 in L and 13.6 in D (the styled boxes keep the user's light fills in D; unstyled ones are `rgb(30,30,30)` with text `rgb(232,232,232)`) | measure, shot (L, D) |
| 11 | Tree rows and legend | badges in the rows; legend lists the styles in use | rows show `SOL/SYS/PRS` code, name, badges; the accessible name carries them (`Primary System, external, changed`); legend `direct / grouped / new / external / changed` | text, shot (L, D) |
| 12 | Inspection panel beside a wide Map | docks on the right at 288 px; the Map keeps the rest | at 1280 px: panel `x=992, w=288`; with an element selected it shows kind, layer, id, reference, name, description, qualifiers, tags (`rendering-stereotypes: external changed`), source file, and the stereotype badges in its title | shot, measure |
| 13 | Link panel and relationship tags | each relationship with label, path, qualifiers, tags; a button to its declaring element | link `admin -> platform` (2 relationships): `manages identities with`, qualifiers `VDI`, tags `tcp-port: 443`; the second `get insights on`, tags `none`. Link `primarysys -> platform` (3 relationships): two with `fhir-exchange: yes` and `tcp-port: 443`. Each relationship has a button `Open <owner>, the element that declares this relationship`; clicking it selected `admin` (address `#/map?ref=admin`) | text, shot (D, 820 px), real click |
| 14 | Link in the URL; reload; Back / Forward | `link-from` and `link-to` carried, restored on load and on history moves | selecting a link wrote `?link-from=admin&link-to=platform`; a reload (the session cookie let the page in) restored the selection and the panel; opening the declaring element then Back restored the link, Forward went back to the element. Same on an Elements tab (`...&tab=detailed&link-from=...&link-to=...`) | text, measure |
| 15 | Parallel links | told apart in the panel | none on the Map (folded or unfolded: 15 and 89 links, no `data-nth`). Found by sweeping the three diagram tabs of all 41 elements (123 diagrams, 937 links): 6 diagrams have a twin, e.g. `platform.auditevents` Detailed. Selecting the second twin by the keyboard: panel says "2 links join these two boxes, with 2 relationships in all. The relationships of the link you clicked are marked", the clicked one is marked `Clicked link`, the focus stayed on that twin after the redraw (`nth=1`); after a reload nothing is marked (by design, run 0024) | measure, keys |
| 16 | Roving tab stop of the links | one tab stop; arrows, Home, End; no wrap | Map folded (15 links) and unfolded (89): exactly one link with `tabindex=0`. Keys: Right x2 reached link 2, End link 14 (last), Down at the end stayed, Home link 0, Left at the start stayed, Tab left the group to the first box (`admin`), Shift+Tab came back to the same link. In the DOM the links group comes before the leaf boxes. The 123 diagrams of the sweep each had one stop; the group has `role=group`, label "Links: one tab stop, the arrow keys move between them" | keys, measure |
| 17 | Centre header, Map | full, compact and minimal ("⋯" menu) states at their widths; tight only where the header has tabs | centre width (px) and state: 1840 and 1440 full (labels shown, 48 px); 1140 compact (icons only); 740, 540, 356 minimal (the `⋯` button shown, 48 px, no overflow); the Map header has no tabs, so it never needs a second row (see the note under check 18). The `⋯` menu (1000 px): Name view..., Add to story..., Download PNG, SVG, drawn above the map, right-aligned | measure, shot |
| 18 | Centre header, Elements diagram tab (Detailed, panel always open) | same four states, name kept | centre 1348 compact; 948 minimal; 748, 548, 398 tight (two or three rows: label and badges, tabs, actions; 84, 112, 112 px); 248 tight, with the tab group running past the centre's edge; 156 and 68 the same, the name cut. Name and kind and badges were never cut above 398. Below about 17 rem the tab group overflows the centre: see F-2 | measure, shot (800) |

How the states map to the measured widths: the `.center-panel` has 1.75 rem (28 px) of padding on each side and the container queries are on its content box, at 16 px per rem: full above 1360 px of content (a centre of 1416 px or more), compact up to 1360, minimal up to 960 (a centre of 1016), tight up to 736 (a centre of 792). So 1840 and 1440 are full, 1348 and 1140 compact, 948 and 740 minimal on a header that has one row to spare; the 748, 548 and 398 centres of check 18 (content 692, 492, 342) are tight, 948 (content 892) minimal. On the Map the tight rule applies below a centre of 792 px but nothing needs a second row (no tab group), so 740, 540 and 356 show the minimal look on one row; the states were told apart by what is drawn (labels, the `⋯` button, the height), not by the query.
| 19 | Element header badges | on Details and on the three diagram tabs | `primarysys` (external, changed), `platform.authx` (changed), `artdecor` (external): the `Stereotypes` group, same badges and size on the four tabs, never clipped | measure |
| 20 | Dark mode, other surfaces | readable | Map, inspection and link panels, Files, help menu, Settings, Elements Details, Detailed tab and edit form all read well in D (screenshots at 820 to 1600 px); in D the `Deep` tab is cut at 820 px (F-2) | shot (D) |
| 21 | Console and network | no error | no console error or warning; one `PUT` per saved file; see F-6 for the log line | console, network |

## Dangling-reference fix, end to end

On the copy only. Before: `manifests/app.admin.yaml` copied aside; one line changed on disk with `sed`:

```
-    - destination: "platform.iam.backend"
+    - destination: "platform.iam.ghost"
```

Observed after a reload of the page (text, shot and measure of the DOM; each step below was read from the page): in Elements, Details of `CARA Admin` the relationship reads `-> platform.iam.ghost` with a red
`DANGLING` badge (grey text, not a link); on the Overview tab the diagram draws a red dashed box `platform.iam.ghost [unknown element]`
whose tooltip says "There is no element ... but "admin" has a relationship to it. Click to open "admin" and fix it." Clicking that box
(the "fix dangling" action) opens the **edit form of the owner** (`CARA Admin`), with the relationship destination field holding
`platform.iam.ghost` (a text field with a list of the 167 references of the workspace). It is not a one-click repair: the user types the right
destination. Typed `platform.iam.backend`: `Save all changes` and `Cancel` lit; clicked Save: the status says "Saved." and both buttons are disabled again.
After a reload: no ghost box, no `DANGLING` badge, the link `CARA Admin -> CARA Digital Platform: uses` is back.

What the page said it would write: the button title says "Applies what you typed, then writes it to disk"; the network log shows one `PUT
/api/fs/file?path=manifests/app.admin.yaml` and nothing else; the manual says only the files that changed are written.

The file, before (with the ghost, the copy as it was when the page was reloaded) and after Save, real `diff -u` output
(`snap-before/manifests/app.admin.yaml` against the file on disk; the diff header lines are left out). Evidence kind: `diff` of
the files on disk.

```diff
@@ -1,20 +1,20 @@
 header:
-  kind: "archicode.morin.io/person"
+  kind: archicode.morin.io/person
   version: "1"
 content:
-  id: "admin"
-  name: "CARA Admin"
-  description: "A collaborator of CARA configuring the Platform, its applications, and the users, roles and groups it recognises."
+  id: admin
+  name: CARA Admin
+  description: A collaborator of CARA configuring the Platform, its applications, and the users, roles and groups it recognises.
   tags:
-    rendering-stereotypes: "new"
+    rendering-stereotypes: new
   relationships:
-    - destination: "platform.iam.ghost"
-      label: "manages identities with"
+    - destination: platform.iam.backend
+      label: manages identities with
       qualifiers:
-        - "VDI"
+        - VDI
       tags:
         tcp-port: "443"
-    - destination: "platform.observability.console"
-      label: "get insights on"
+    - destination: platform.observability.console
+      label: get insights on
       qualifiers:
-        - "VDI"
+        - VDI
\ No newline at end of file
```

The semantic change is the destination line; the other ten changed lines are a **restyle**: every plain string loses its quotes
(`version: "1"` and `tcp-port: "443"` keep theirs, they need them), and the trailing newline of the file is gone. 11 lines of 20
differ in the text, 1 in the meaning. Every other file of the copy was byte-identical at this point (`md5sum` of the 45 files
taken before the page was reloaded and again after Save: only `app.admin.yaml` differs; this was taken before the comment test
below). A second check, with a comment added on disk to another manifest (`app.helpdesk.yaml`: a line `# field-check comment...` at
the top and a trailing `# trailing comment`) and a one-word edit from the page: both comments **disappeared** on Save (F-1; that
file is then the second one that differs). `workspace.yaml`, by contrast, round-tripped byte for byte through three saves (check 5).

## Findings

None is a clear regression of waves 004/005 that is small and certain, so none was fixed here (no source or test file changed). Each is
a candidate for a follow-up issue. Severity: M medium (can lose or surprise the user's data), L low (cosmetic, a limit or a
wording).

- **F-1 (M, pre-existing, not a regression): saving a manifest rewrites the whole file and drops its YAML comments.** Observed
  above: quotes removed on plain strings, trailing newline removed, and leading and trailing comments lost; only the edited
  element's file is touched, but a manifest kept in git shows a whole-file diff on the first save from the editor, and a comment
  is gone without notice. The manual (`[[editor-elements]]`) says nothing about comments. `workspace.yaml` is saved surgically
  (check 5), so the two paths differ. The emitter predates wave 004 (its tests, from wave 003, check that a file survives being
  written back, not that its text does). Options for the issue: keep comments and the quoting
  style (a document-preserving writer, as `workspace.yaml` already gets), or say so in the manual and in the Save tooltip.
- **F-2 (L, wave 004 claim): the centre header overflows when the centre is narrower than about 265 px.** The CSS comment says the header "holds together
  at any width of the panel". Measured on an Elements diagram tab with the panel open: the group Overview / Detailed / Deep is 209
  px wide, so at a centre of 248 px (an 800 px window with the tree and the panel open; the shots are at 820 px, centre about 265 px) it ends 65 px past the centre's right edge
  (`scrollWidth - clientWidth = 65`) and the `Deep` button lies outside the visible area (shot in D at 820 px: `Details`,
  `Overview`, `Detailed`, then the panel); at 156 px (700 px window) the name is cut to 100 px and the tabs spill
  157 px (`scrollWidth - clientWidth = 157`); the centre then scrolls horizontally. The limit is derived, not bisected: the panel has 28 px of padding on each side, the group is 209 px, so it stops fitting under 265 px; 398 px was fine and 248 px was not, nothing between was measured. A window narrower than
  about 850 px with both panels open is an edge case, hence L; letting the nested group wrap in the tight state would fix it.
- **F-3 (L, limit): at 420 px the tree rows lose their names.** The left panel keeps about 190 px; a row with two badges
  (`external changed`) leaves its name one letter wide and its Pin / Hide buttons are clipped (shot at 420). A phone is not a
  target of the editor (the manual does not claim it), so L.
- **F-4 (L, pre-existing, wording): the Settings help of the facets still shows the Jayway dialect.** The help text of a facet's
  `REMOVE` action (`facetsAction`, `standalone.html` line 5192) gives the example `$.application..relationships[?(@.qualifiers
  anyof ['oidc'])]`, which the engine of a97414b rewrites with a warning and the manual (`[[facets]]`) lists as the old form. A
  standard example is `...[?(@.qualifiers[?(@ == 'oidc')])]`. Text only.
- **F-5 (L, wording): the folder label's tooltip without a workspace name is jargon and wrong in served mode.** With no
  `settings.name` (`standalone.html` line 4965) the top-left label is `archi-copy/` and its tooltip reads "Browsers do not expose an absolute filesystem path for a
  picked folder (ASM-1/DEC-11) -- this shows the folder's own name ...": it names two internal design records and speaks of a
  "picked folder" when the folder is the server's. With a name the tooltip is `Folder: archi-copy`.
- **F-6 (L, debug leftover): `console.log` of the whole `AppState` on every load** (line 2522) ("ArchiCode standalone editor — AppState after
  load: {...}", once per load). Harmless, but it prints the workspace's content into the console of the user's browser.
- **F-7 (L, asymmetry): a dangling relationship is a link in the diagram but plain grey text in Details.** In the diagram the
  ghost box and its link are the way into the repair; in Details of the owner the relationship reads `-> platform.iam.ghost`
  with a `DANGLING` badge and cannot be clicked, so a user who reads the badge has to go to *Edit* by hand. The repair itself
  works (above).
- **Resolved after the close-out of the wave** (commits that follow it, outside any run, each with its tests): F-1 (a file is saved
  with its comments, blank lines, quotes and final line break kept, for the manifests and for `workspace.yaml`; a layout the
  editor does not write still falls back to the emitter's text, said in the manual), F-2 and F-3 (the tab group wraps in the
  tight state, the badges of a tree row give way before its name; measured again at a window of 420 px: no overflow, names of 56 to
  70 px), F-4, F-5 and F-6 (text and a debug line), F-7 (the dangling relationship of Details is a button to the edit form of
  its owner, which now also keeps the layer of the owner). From run 0022: F-1 (four examples of the manual did not load: `qualifier`,
  `Node` twice, and a view without `id`; a test now loads every example) and F-2 (an absolute `-o` is used as it is).
- **Not a finding:** a hash change typed into the address bar while the page was still loading dropped the selection (a test artefact: the same URL after the load worked).

Wave-level lessons for the orchestrator: (1) a screenshot of a wide emulated viewport in this pane is scaled and often stale on
the first capture: measure first, shoot narrow; (2) the sweep of all diagrams (123 diagrams in about 90 seconds) is a cheap way
to look for the data shapes the tests invented (parallel links existed only in diagrams, not in the Map).

## Canonical impact

None. The run reads and measures and writes only this document; it changes no architecture description and no domain
invariant, so there is no `CI-arc-n` or `CI-dom-n` item to discharge. Reason: no ArchiMate element, relationship or viewpoint is
added or altered, and no invariant is enforced by anything this run adds. No analysis (`docs/ana/`) was fulfilled.

## Review passes

- **KDMLLC review.** Run by a separate agent on the first draft (read-only, with the repository as referent). It found, and
  this document applied: the manual-link check counted seven anchors where the page has ten and claimed "landing" while showing
  only that anchors exist (check 9 reworded, all ten checked, landing stated as not exercised); the centre-header states were
  labelled without the padding and rem arithmetic (a note under check 18); counts that disagreed (8 Elements widths, three
  saves); the dangling "diff -u" was a hand summary (now the real output); the F-2 limit was inferred (now said so, and
  derived); the evidence kind of the dangling steps and the time of the `md5sum` were missing; label vs `archi-copy/`; the contrast range;
  a repeated "not findings" list, a repeated six-combination sentence and a bare timestamp (trimmed or explained). Not
  applied: trimming the Method legend and the C-scan bullet (they are short and a reader opening only the Review section
  needs them).
- **Open questions.** The wave's open question "how many widths and which workspace views make a sufficient field check" is
  answered: top bar at 4 widths, centre header at 6 (Map) and 8 (Elements) widths, the Map folded and unfolded, a sweep of every
  element's three diagram tabs, light and dark. Nothing is left open except what is out of reach (Scope).
- **C scan.** Each descriptive claim was read back against the page by a script or against the files by `diff` / `md5sum`
  (see the rows); the claims about the manual were checked against `src/doc/README.adoc` and the published HTML; F-4 and F-6
  against `standalone.html` (line 5192) and the console log.

## Tasks

| Task | Status |
|------|--------|
| 1 Copy the workspace outside the repository | done |
| 2 Build the CLI, serve the copy, record the PID | done (PIDs 3604290, then 3623596) |
| 3 Check list of the issue, light and dark | done (21 lines above) |
| 4 Dangling-reference fix, manifest before and after | done |
| 5 Findings recorded, clear regressions fixed | none met the bar; 7 recorded |
| 6 Stop the server by PID, reset the browser, run the suites | done |
| 7 KDMLLC review of this document | done |
| 8 One commit | done by the commit that carries this document |

## Verification

- `node --test "src/test/javascript/**/*.test.js"`: 442 pass, 0 fail (baseline 442; no code touched).
- `JAVA_HOME=.../25.0.4-tem ./mvnw test`: 111 tests, BUILD SUCCESS (baseline 111).
- `src/main/rust/viewpoint-kernel/embed.sh --check`: exit 0, "the committed WebAssembly is the one the sources build".
- `git status` before the commit: only this run directory, untracked. Nothing of the copy or any screenshot is in the repository.
- Cleanup: both servers stopped by PID (`ps` and `ss` show no process and no listener on 48099), viewport emulation cleared,
  colour scheme set back to light, the browser tabs closed, the copy stays in the scratchpad (outside the repository).
- Not confirmed: the folder list, the IndexedDB migration, the permission states, the published `/editor/` page (all out of reach
  of the served page); behaviour in Firefox or Safari (the pane is Chromium); a screen reader; byte-for-byte identity of what
  the user sees at a given pixel (screenshots were scaled by the pane).
