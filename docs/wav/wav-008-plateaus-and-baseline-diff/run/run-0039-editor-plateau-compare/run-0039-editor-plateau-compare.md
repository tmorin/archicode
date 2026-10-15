---
type: run
run: 0039
status: completed
wave: 008
---

# Run 0039: Editor plateau compare

Wave 008 (`plateaus-and-baseline-diff`), item W-6 (phase P3). Focus: switch plateau and compare it with another one on the map,
with a legend I can read without colour. Document profile: `single-document`, with a TDD-lite section (the Decisions below), as
runs 0034 to 0038. The scope arrives settled (the W-6 row, runs 0035 to 0038 and the brief); the work is one file
(`standalone.html`) and its tests; there was no live alternative worth a PRD, a TDD or a pln. This file carries scope, decisions,
the interface for W-7, canonical impact, verification and findings. The Decisions were written as the work went (an earlier
executor of this wave died with code and no recorded reasons) and are in the order they were taken.

## Context

Run 0035 made the editor read one plateau into `AppState` and gave it the Plateau selector. Run 0036 built `compare` in the kernel,
run 0037 made `compute` draw the union (every item and link carries `change`, `natures`, `context`; the stereotypes `new`,
`changed`, `removed` and `contains-changes` are computed last), run 0038 gave the CLI its look (`ChangeMarks`: glyphs `+ ~ − ±`, line
styles, a legend) and found that the editor accepts a `baseline` key without checking it. Nothing in the editor called `compare`
yet. This run does: a second plateau is read (read-only), compared, laid out on the union and drawn in the language of the CLI.

## Scope

In: `standalone.html` (the reading loop as a function of a folder, the baseline, the `baseline` check, the Compare to control, the
wrapper's `compare`, the union, the drawing of the four states, the legend, the export, the click on a removed box), the tests
under `src/test/javascript/viewpoint-kernel/`, the manual's editor parts, a look at the real page.
Out: the Changes panel, the before and after of the inspector, the Changes only filter, the wording-only toggle and the selection
in the URL (W-7); the Rust and the wasm; any Java.

## Decisions

Taken by the author (the brief; not reopened): the baseline is a plateau under the same root handle (no second picker), read-only,
never part of the edit/save/dirty machinery, re-read on demand and when the choice changes; Compare to is next to the Plateau
selector with `Nothing` (the default), each other plateau, and a shortcut for the plateau's own baseline; with `Nothing` the editor
draws exactly as today; the layout of a comparison is posed on the union; the four states are encoded with a glyph, a line style, a
text badge and a translucent tint, as defaults that the author's `styles.by-tags` entry of the same name overrides property by
property; removed is not the red dashed of a dangling reference; a legend under the diagram that says so; the export agrees with the
screen.

Taken by this run:

- **D1. The reading loop becomes `readManifestFolder(rootHandle, relDir)`** (a function of a folder: the files of one folder, the
  files the editor does not read, whether the folder exists). `loadWorkspace` calls it once per folder as before (one for a plateau,
  one per `manifests.paths` entry), so a workspace without plateaus reads exactly what it read. The baseline calls it for its own
  folder. The records it returns are fresh objects: the baseline's files are never the objects of `AppState.manifestFiles`.
- **D2. The baseline is `AppState.baseline`**, a structure of its own: `{ plateau, files, index, duplicates, problem }`, built with
  `buildIndex` and `resolveRelationships` on its files (sorted by path, as the plateau's own files are). It has no handle to write
  with, it is not in `manifestFiles`, not in `dirtyReferences`, and `countUnsavedChanges`, `saveAllChanges` and the tree never see it.
  It is read by `loadBaseline` when the workspace is loaded, when the plateau changes (`loadWorkspace` runs again), when Compare to
  changes, and by a *Reload* button next to the control (the only way to see a change made on disk to the baseline folder while the
  page stays open). What goes wrong is *reported* and never crashes (`loadBaselineSafely`): a reference declared twice in it (the header
  says nothing, the diagram says that nothing is drawn and names both files, as it does for the plateau itself, in the words of the
  command line), a folder that does not exist (told in the header; compared as empty, so everything is `new`), a manifest that does not
  parse (told in the header, because its elements would otherwise read as new), a folder the browser cannot list.
- **D3. Where Compare to lives and what it remembers.** In the header, right after the Plateau group, in the same
  `.plateau-switch` (the comparison, like the plateau, changes every perspective that draws a diagram): a labelled `<select>` (a
  list scales to many plateaus where a button group does not) with `Nothing`, then, when the plateau drawn has a baseline by the CLI's
  rule (the `baseline` key, else the previous plateau of the list), a shortcut labelled `Baseline: <name of that plateau>` whose
  value (`@baseline`) follows the plateau drawn, then each other plateau by name. It is shown when there are two plateaus or more. The
  default is `Nothing`. The choice is a choice of whoever looks (like the plateau): remembered per folder in this browser under
  `archicode-standalone-editor:compare:<folder id or name:...>` with the in-memory map as the fallback for a browser that refuses
  its storage, the same two-level memory as `rememberPlateauId`; a remembered id the workspace no longer has is ignored. A plateau is
  never compared with itself: when the choice names the plateau drawn (the plateau was the baseline and was chosen), the comparison is
  `Nothing` (the select shows it) without forgetting the choice, which comes back when the plateau drawn changes again. *Reload* sits
  next to the select while a comparison is on. The select is handled like the facet select (`input`), and keeps the focus across the redraw.
- **D4. `Nothing` is today's editor.** Every new code path is behind a comparison that is on; with `Nothing` the kernel input is the one
  it always was, the default look of the states is never applied, the legend is the old one, and a test pins the markup of ten drawings and
  the legend to hashes made from the code of the commit before this run.
- **D5. The kernel is called through the wrapper's new `compare`** (the ten lines of `compare.test.js`, with the version check; `compute`
  keeps its warnings). The wrapper is kept in a module variable (`loadedKernel`) once loaded, so that `buildKernelInput`, which is
  synchronous and called from many places, can build the union; the drawing waits for the kernel before it asks (`mountDiagramIfNeeded`
  loads it and mounts again). The union is built as in `change.test.js` (each union relationship nested under the element that
  declares it, same layer); the answer is cached under the text of the two inputs, so a redraw does not compare again and an edit of the
  plateau drawn is compared at once. An error of the kernel (a dangling `uses` in one plateau, for instance) is said on the diagram, and
  nothing is drawn from it.
- **D6. The `baseline` key is validated by `selectPlateau`** with the words of `Plateaus.java`: ``the plateau `x` names itself as its
  `baseline`: choose another plateau to compare it with`` and ``the plateau `x` has the `baseline` `y`, which is not in
  `settings.plateaus` (`a`, `b`)``, reported with the other problems, one per line, before anything is read. `plateauModel` carries
  `baseline` and `ownBaselineOf` is the CLI's rule.
- **D7. The layout is posed on the union.** A comparison is always drawn from `compute`'s answer on the union of the two plateaus, so
  ELK lays out the elements of both plateaus (the removed ones keep their place under their parent) and the layout does not depend on
  which plateau is `target` and which `base`: the union holds the same elements and relationships whichever way the pair is turned
  (only their state flips). The only thing that could still differ is a box's size, which the pill of `new` and the pill of `removed`
  would make differ; for the layout they take the room of the wider one (`roomBadges`), so no box changes size. So switching plateau under
  a Compare to that names the one left does not move a box. With `Nothing` the plateau is laid out alone, as today: the boxes then
  move when the comparison is turned off (the removed boxes leave and the others close the gap). That is the price of `Nothing` being
  exactly today's editor, and the author's own rule. **Measured on the real page:** the Map with `platform` open, to-be compared with as-is
  and then as-is compared with to-be: the same 29 boxes at the same position and size (29 of 29); comparison on, off, on: the same
  positions as the first time.
- **D8. A click on a removed box.** A removed element is not in the plateau drawn, so it has no entry to open (Elements, the tree, the
  address). Its box has its own action, `select-removed`, and a click (or Enter) shows a read-only panel on the right: name, a
  `removed` pill, kind, layer, the properties, the file it was declared in (in the other plateau's folder) and the relationships it
  declared, as plain text because they lead into the other plateau. The panel says that the element is only in the plateau compared
  with and that nothing in it is edited or saved; it has its own cross. On the Map the selection becomes empty (the panel is about this
  box), the box is outlined as a selected one and *Center* puts it in the middle; in Elements the element of the diagram stays the
  subject and its panel is replaced while the pick lasts; any other click replaces the pick (it is valid only while the page's selection
  is what it was, so there is no place to remember to clear it). On the page of a view in the Library the pick is the page's own selection
  (`baseline-element`). A removed container is opened on the Map like any box (the references the kernel may open include the union's).
  Not done (W-7's or later): a removed element is not listed in the tree, so it cannot be pinned or hidden from there; the full "what
  changed" panel is W-7's.
- **D9. The default look of the four states** (the glyphs and the words are those of `ChangeMarks`; the lines too, in the editor's own
  units). All of it is a *default style* of the stereotype of the same name, in the `--st-*` variables the editor already reads, so the
  author's `styles.by-tags` (or `by-qualifiers`) entry of the same name wins property by property (`line-color`, `line-thickness`,
  `line-style`, `background-color` for the tint, `font-color` for the title of a removed box):

  | state | glyph | box | link | pill | tint |
  |-------|-------|-----|------|------|------|
  | new | `+` | outline 3 px, solid | 3 px, solid | `new` | green, 16 % (8 % on a box that contains others) |
  | changed | `~` | outline 2 px, dotted (`2 3`) | 2 px, dotted | `changed` | orange |
  | removed | `−` | outline 2 px, dashed (`7 4`), title struck and grey | 1.6 px, dashed (`7 4`), grey | `removed` | grey |
  | contains changes | `±` | outline 1 px, dashed (`4 3`) | none | `contains-changes` | none (discreet, as the kernel meant it) |

  The glyph opens the title in bold (`dg-glyph`), outside the strike. The tint is a second rectangle laid over the box (`dg-tint`), not a
  fill, so the fill the author gave stays and the tint reads on a box inside a box of the same state; the pill carries the word (the
  box's `aria-label` says it too). The colours are theme variables `--chg-new`, `--chg-changed`, `--chg-removed`, `--chg-removed-text`,
  `--chg-contains`, written for the light theme and twice for the dark one like the others (test-checked, with a contrast check: 3:1 for
  a line, 4.5:1 for the grey title), and chosen to read on both backgrounds; the lines and the glyphs carry the meaning, the colours
  repeat it. A link that changed has an arrowhead of its state (in user-space units, so that a thick line does not give a huge head) and
  its caption opens with the glyph (alone, a little larger, when the captions are off, as on the Map by default). Red dashed is
  untouched and means a dangling reference. The default applies to a box only when the kernel says the state of *that* box (`change`, or
  the `contains-changes` marker last), never to an unchanged box that carries a hand-written `new` qualifier; the author's entry is
  applied as before. The state is the last stereotype, so its line overrides the line of the other stereotypes (as a later stereotype
  always does), and its tint is laid over the fill they gave. A focal box (Elements) or a selected one keeps its accent outline over the
  state's line, as it always won over a styled outline. A removed box is told what it was (name, kind, qualifiers, description) from the
  union (`tellRemovedItems`), since it is not in the plateau's index. The long labels are wrapped as before (the glyph is part of the
  first line).
- **D10. The legend.** The key under the diagram (`#diagram-legend`) gets, while a comparison is on, a group `Comparison` on its own
  line, after the existing samples: "<plateau> compared with <baseline>:" and, for each state, a sample of its box (the real classes and
  variables, so it follows an entry of the workspace's own), a sample of its link, the glyph, the word, how its line is drawn ("thick
  solid", "dotted", "dashed, struck title", "thin dashed: something inside changed") and how many boxes and links of that state the
  drawing shows, then the sentence "Red dashed is kept for dangling references (unknown elements)." (the editor calls a dangling
  reference an unknown element). The entries wrap in a narrow panel. The legend is for the screen only: the SVG and PNG exports have
  never carried the key (`diagramExportDocument` clones the drawing), and that rule is kept; what the export does carry is everything
  in the drawing, the glyphs, the struck titles, the pills, the tint and the lines (the export CSS repeats the rules, with the colours
  of the theme resolved, and defines the `--chg-*` variables on the root of the SVG for the boxes' inline variables).
  The status line of the diagram is unchanged (the counts of the states are in the key: a status line that says them is cut by its
  ellipsis).

## The interface for W-7

- `comparisonState()` is the one place that knows the comparison: `null` (nothing is compared), `{ pending }`, `{ problems }` or
  `{ base, target, layers, records, counts, changes }`. `counts` and `changes` are the kernel's table (run 0036): the Changes panel is
  `changes`, the inspector's before and after is the row of the element (`before`, `after`, `natures`), the relationships added or
  removed of an element are the union relationships with that `from`. `records` is the union element by `layer|reference`.
- `AppState.baseline.index` holds the baseline's own records (properties, relationships, source file): what a before-and-after panel reads.
- `only_changes` is not used by the editor yet: `buildKernelInput` takes it where `hide_unlinked` goes. The drawing already marks
  `context` items nowhere; a grey for them is one class in `renderDiagramSvg`.
- The pick of a removed box (`removedPick`, `baseline-element`) is the place a "what changed" panel for a removed element goes.
- A removed element is still not in the tree of the Map or of Elements.

## Canonical impact

None to canonical documents (`docs/` holds the run and wave records only). The manual (`src/doc/README.adoc`) gets a section
`editor-compare` under the editor's sections (Compare to, the read-only baseline, the states and their look, the legend, the removed
box, the `baseline` check, the export); the CLI parts are not touched. `CLAUDE.md`'s architecture paragraph could name the editor's
comparison; that is the orchestrator's call (as runs 0035 to 0038 said).

## Tasks

| Id | Task | Status |
|----|------|--------|
| T1 | Read the wave plan, runs 0034 to 0038, `standalone.html` (loader, selector, kernel wrapper, drawing, export, styles), the harness | done |
| T2 | `readManifestFolder`; the baseline (`loadBaseline`, read-only, duplicates, missing folder, unreadable manifests); the `baseline` check | done |
| T3 | Compare to: the control, the memory, `setCompareTo`, Reload | done |
| T4 | The wrapper's `compare`, `comparisonState`, the union, `buildKernelInput`, the wait for the kernel, the map's references | done |
| T5 | The four states: default look, glyph, struck title, pill, tint, links, arrowheads, the author's override | done |
| T6 | The legend, the export CSS | done |
| T7 | The click on a removed box and its panel | done |
| T8 | Tests (`plateau-compare.test.js`, 48) | done |
| T9 | The real page, light and dark, on a copy of the real pair | done |
| T10 | The manual | done |
| T11 | `node --test`, `./mvnw -o verify`, Prettier | done |

## Acceptance criteria (the W-6 row, the brief and the P3 gate)

- AC1. Two plateaus are read, the second read-only, re-read on demand and when the choice changes; a reference declared twice in it is
  reported: `the reading loop is a function of a folder`, `the baseline is kept apart`, `an element of the baseline is not editable`,
  `the baseline is read again on demand`, `a reference declared twice in the baseline is reported`, `a baseline folder that is not
  there`, `a manifest of the baseline that does not parse`, `a folder the browser cannot list`.
- AC2. The `baseline` key names a known plateau, with the CLI's words: the four `baseline` tests of section 1.
- AC3. Compare to: `Nothing` by default, the shortcut by the plateau's name, each other plateau, remembered per folder with the
  in-memory fallback: the tests of section 2. `Nothing` is today's markup: `with Nothing the drawing is byte for byte`, `turning the
  comparison on and off`, `the kernel input with Nothing`, and the 652 tests that existed.
- AC4. The comparison is drawn from `compare` and `compute` on the union, on the Map, the diagrams of Elements and the page of a view:
  `compare is called through the embedded module`, `the kernel input of a comparison is the union`, `the page of a view in the Library`.
- AC5. The four states are told without colour, on a box inside a box too, as defaults the author's style overrides: `the comparison draws
  the four states`, `a box inside a box of the same state`, `the links say their state`, `an entry of styles with the name of a state
  wins`, `the fill the author gave to another stereotype`, `a hand-written stereotype with the name of a state`, `the colours of the
  states are defined for the light theme, the system's dark and the forced dark`.
- AC6. The legend explains the four states and what red dashed is kept for: `the legend explains the four states`, `the legend sample
  follows the look the workspace gave a state`, `the key says, next to each state, how many boxes and links`.
- AC7. The export agrees with the screen: `the CSS of the export repeats the rules of the states`, `the page and the export agree on the
  lines of the states`, `the export of a comparison carries the glyphs...`.
- AC8. The layout is posed on the union and does not move a box when the pair is turned: `the layout graph is the same for the pair turned
  either way`, `a comparison lays out the elements of both plateaus`; and on the real page (D7).
- AC9. A click on a removed box: `a click on a removed box shows what the other plateau had`, `in Elements the element of the diagram stays
  the subject`, `the removed box that was clicked is outlined`, `Center puts the removed box...`.
- AC10. The real page in light and dark: see Verification.

## Review passes

Run inline (one document; no subagent dispatched, as in runs 0034 to 0038).

- **KDMLLC.** K: one function reads a folder (used by the plateau and the baseline), one function knows the comparison
  (`comparisonState`), the look of a state is a table and one merge (`changeDefaultVars`), the tint, the strike and the glyph are three
  small helpers; nothing was added to the Rust or the Java. D: the rules of the `baseline` key are written once per side with the same
  words, the colours of the states exist once (the variables), the lines of the states exist twice (the page and the export, as every
  other rule of the drawing) and a test compares them. M: each rule of the brief has a test (the AC list above), and every state is
  tested on a box, a box inside a box, a link, the legend and the export. L: no Changes panel, no `only_changes`, no URL state, no
  removed elements in the tree, no new kernel input. U: the decisions say why (the tint is an overlay so that the author's fill stays;
  the layout is on the union so that nothing moves). C: below.
- **C scan.** Claim "with Nothing the editor draws exactly as today": proven by hashes of ten drawings and of the legend made with the code
  before this run, by the on/off/on test, and by the 652 existing tests, all green. Claim "the baseline is never written": the files
  are not among `manifestFiles`, a save with a modified plateau writes only the plateau's files (test with the list of writes), the
  folder handle is the one the editor already held and no function of the baseline calls a write. Claim "the author's style wins property
  by property": tested for line colour and thickness (the dash stays the default), for a fill (the tint goes, the line stays the state's),
  and for the grey of a removed title. **A claim that is only partly true:** "the same look as the CLI": the glyphs, the words, the
  four line styles and the legend wording are the CLI's; the units are the editor's (px, a dash pattern) and the removed box has a tint
  where the CLI gives it a light grey fill; the author's `new` and `changed` styles show through in both. Claim "boxes do not jump when the
  pair is turned": true for the real pair (29 of 29), true by construction when the names are the same; a changed element's *name*
  is the one of the plateau drawn, so a rename changes the width of that box (the union is the same, the text is not): said in D7's measure.
- **Open questions.** None left. The default colours (green, orange, grey, blue-grey) are the CLI's Okabe-Ito family made darker or
  lighter for the page; the lines and the glyphs carry the meaning, the author can restyle by `styles.by-tags`.

## Verification

All with the repository's own commands. `JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem` for Maven.

### Results

- `node --test "src/test/javascript/**/*.test.js"`: 700 tests (652 before, plus the 48 of `plateau-compare.test.js`), 700 pass, 0 fail.
- `./mvnw -o verify`: BUILD SUCCESS, 237 tests, 0 failures, 0 errors (the Java was not touched; the asciidoctor step ran, the manual has the
  anchor `editor-compare`; its only errors are the PlantUML-diagram ones that exist without this run, and the two `possible invalid
  reference` infos, `changed` and `external`, of an existing sentence).
- `npx prettier --check "src/**/*.java"`: clean. `cargo test` and `embed.sh --check`: not run, the Rust and the wasm were not touched
  (`git diff --stat` on `src/main/rust` and `src/main/wasm` is empty).
- **The editor's own counts on the real pair** (the copies arranged as two plateaus, loaded by the editor's loader in the harness, then
  `setCompareTo`): elements **38 new, 26 changed (10 wording only), 5 removed**, relationships **71 new, 12 changed, 15 removed**, the
  counts of runs 0036 and 0038; 40 baseline files, 49 plateau files, 111 ms for the comparison.
- **The real page** (the built jar, `editor serve` on two copies of the real pair in the scratchpad, one with the author's `styles`, one
  with the `styles` taken out to see the defaults; the snap `firefox.geckodriver` driving a headless Firefox over WebDriver, a small
  script of this run; the theme set through the Settings key; the built-in browser pane was not used, its screenshot times out here).
  Every screenshot named here was opened and looked at. The originals (`as-is`, `to-be`) were only read: the `md5sum` of their 91 files is
  the same before and after; the servers were stopped.
  - *The header.* `Plateau [As is][To be]`, then `Compare to [Nothing ▾]`; with `Baseline: As is` chosen, a `Reload` button appears; at 500 px
    (the least the browser gives) the header wraps in three lines and the legend wraps by entry. The choice is in `localStorage`
    (`archicode-standalone-editor:compare:name:real2=@baseline`) and a reload of the page draws the comparison again.
  - *Light, the Map folded, with the author's styles.* `Acme Helpdesk` and `Acme Admin` have a thick green outline, a `+` and the pill `new`
    (the pill `changed` of the author's own tag stays before it: the state is last); `Customer`, `External`, `Partner System`, `Healthcare
    Professional` have a dotted brown outline, `~` and `changed`; `Staffer` is grey and dashed with `− ~~Staffer~~` and a
    `removed` pill; the new links are thick green with a `+` beside them, the changed ones dotted with `~`, the removed ones dashed grey
    with `−`, the arrowheads in the same colours. The author's fills (light green, light orange) show through, and the line of the state
    on top of them, which is the property-by-property rule at work. The key under the drawing lists the four states with a sample of each.
  - *Light, a box inside a box of the same state* (Elements, Deep of `platform.policy`, no author styles): `Policy` (new, the focal accent
    outline over it) contains `Policy Backend`, `Catalogue Job` and `Database`, each with its own thick green outline, `+`, `new` pill and
    tint; `Event Bus` (new) contains `Event Bus Channel` (new); `Audittrail` has the thin dashed outline, `±` and the
    pill `contains-changes`; `Access` (unchanged) is a plain box; link captions open with `+`.
  - *Light, the Map opened on `Shared Plan`, without styles*: the tints are visible (green on new, orange on changed, grey on removed)
    and nested tints read: `Blob Storage` is `− ~~Blob Storage~~`, grey, dashed, `removed`, on the orange tint of its parent.
  - *Dark, the same two views and the Map with the author's styles.* Green `#3ddc97`, orange `#ffb454` and grey `#a0a0a0` lines on the dark
    background read as well as in light; the pills and glyphs are readable; the author's light fills stay as the author gave them (theme
    independent, as they always were).
  - *A click on a removed box* (`Blob Storage`, light and dark): the panel on the right says `Blob Storage` with a `removed` pill,
    the note that it is only in `As is`, kind, layer, id, reference, name, description, qualifiers, tags, the source file
    `plateaus/10_as-is/app.platform.vault.yaml` and no relationships; the box is outlined as a selected one; the address stays `#/map`;
    *Center* puts it in the middle (measured: 474 of 474 px across, 316 of 342 down). With `Nothing` the panel is gone and the Map is the
    plain one (the old key, no marks).
  - *Switching.* Compare to `Nothing` and back: the same 29 boxes at the same positions as before. To-be compared with as-is and as-is
    compared with to-be (Map with `platform` open): the same 29 boxes at the same positions and sizes.
  - *The export.* The SVG that *SVG* downloads (taken from the blob, opened as an image in the browser, light and dark): the glyphs, the
    struck title, the pills, the tint, the dotted, dashed and thick lines and the arrowheads are there in both themes, with no key; the
    colours are the theme's.
  - *Nothing was written:* *Save all changes* stays disabled all through a comparison, and the manifests of both copies are still identical
    (`md5sum`) to the originals' manifests.
  - Not looked at: see below.

## Findings

- **For the wave (W-7, W-8).**
  - *The interface for W-7* is above: `comparisonState().changes` and `.counts` are the kernel's table; `AppState.baseline.index` the
    baseline's records. The inspector for a *changed* element has no state yet (the panel of a removed element is the only one that
    says it).
  - *The tree does not tell the states* (a new or changed element looks as it did; a removed one is not there): the Changes panel is the
    place, or a badge in the tree. A removed element cannot be pinned or hidden on the Map for that reason.
  - *The author's real `styles`* already style `new` and `changed` (tags written by hand, fills and a line colour): they win, property by
    property, and the default supplies the line style and thickness, so on the real data `new` boxes keep the author's green fill with a
    thick outline and `changed` boxes the author's orange with a dotted one. The author may want to drop those hand-written tags once the
    comparison tells it; they still work.
  - *A focal box and a selected box keep the accent outline*, so the state's line is not seen on the box that has the focus; the glyph, the
    pill and the key still say it.
  - *A changed element's name in the union is the plateau drawn's*; a renamed box is as wide as its new name. Said in D7.
  - *`only_changes`* and *wording only* are for W-7; the union is ready for the first (the kernel's option) and the table has `wording_only`
    for the second.
- **`CLAUDE.md`'s architecture paragraph** could name the editor's comparison (the orchestrator's call).
- **Files touched outside `likely_paths`:** none. `src/main/resources/editor-webapp/standalone.html`,
  `src/test/javascript/viewpoint-kernel/plateau-compare.test.js`, `src/doc/README.adoc` and `docs/**` of this run.
- **Not verified.**
  - The editor in Chromium, Edge or Safari (Firefox only), and the File System Access picker (served mode only: the second plateau was
    read through the server's handles, which answer the same calls; a picked folder of the browser was not tried).
  - The built-in browser pane (could not draw a screenshot).
  - The page of a view in the Library with a comparison on a real saved view (the real workspace has none that was opened; the recipe, the
    union and the removed box's selection are tested; the drawing is the one of the Map).
  - The PNG download (the SVG was taken from the page and drawn; the PNG is that SVG on a canvas, with the limits it always had).
  - Layout on the union for a pair of plateaus larger than the real one (about 170 elements; the comparison took 111 ms, the drawing of the
    fully unfolded Map of 81 items and 160 links drew within the 3 seconds the script waited, in Firefox; not timed more closely).
  - Windows or touch devices; a screen reader (the `aria-label` of a box and of a link says the state and the pills carry the word;
    nothing was listened to).
  - Colour-vision simulation: the colours were chosen for contrast and are never the only carrier; no simulator was run.
  - The ELK layout of a comparison in the node tests (the harness has no ELK: the graph is checked, the positions on the real page).
