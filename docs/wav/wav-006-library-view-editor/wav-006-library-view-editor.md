---
type: wave
wave: 006
status: completed
date: 2026-10-13
related:
  - docs/wav/wav-006-library-view-editor/wbc-006-library-view-editor.md
  - docs/wav/wav-005-follow-ups-and-field-check/wav-005-follow-ups-and-field-check.md
  - docs/wav/wav-004-editor-workspace-experience/wav-004-editor-workspace-experience.md
  - CLAUDE.md
---

# Wave 006 — Library View Editor

## Purpose

When this wave is done, the page of a view in the Library of the standalone editor draws that view in its centre, from
the model, without changing what the Map and Elements show. Its right-hand panels show the attributes of the view and,
for a selected box or link, the inspection panel of the Map. The attributes of the view (viewpoint, element or pins,
facet, *Hide unlinked*, texts) can be changed on that page: the diagram follows, the change counts as an unsaved change
like any other, and nothing is written before *Save all changes*. The result has been seen in the real page, on a copy of
the user's workspace, with the view `authentication_token_validation`.

## Non-Goals

- Does not create views from scratch in the Library: a view is still created with *Name view…* on the Map or in
  Elements. The Library edits the views that exist.
- Does not change the view manifest format, `workspace.yaml`, the kernel contract or the CLI (`views generate`
  does not read anything new).
- Does not put diagrams on the Stories side (a step still names its view and offers *Show on diagram*).
- Does not remove *Open on diagram*; it stays as the way to explore a view with the Map's or Elements' own tools.
- Does not compute a baseline-versus-target diff (tmorin/archicode#18).
- Does not fix the open findings of the field check of wave 005 (manifests saved without their comments, narrow-width
  header overflow, etc.), unless a run of this wave meets one on its own path.
- Does not cut a release.

## Wave Manifest

```yaml
wave_manifest:
  wave: 006
  slug: library-view-editor
  status: completed
  sources: []
  phases:
    - id: P1
      name: See the view
      gate:
        criteria:
          - 'node --test "src/test/javascript/**/*.test.js" passes'
          - 'JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw test passes'
          - 'a test shows that the Library page of an Elements view puts a diagram canvas in the centre whose boxes and links are those the kernel computes for the element, viewpoint, facet, hide-unlinked and texts of the view, and that the page of a Map view draws the map of its pinned, hidden and opened elements'
          - 'a test shows that, after visiting the page of a view and going back to the Map and to Elements, their selection, pins, hidden and opened sets, facet, hide-unlinked, texts, tab and address are what they were before the visit'
          - 'a test shows that the page of a view that cannot be drawn (its element was deleted) keeps its message and has no canvas'
          - 'a test shows that the right-hand panel of the page lists the attributes of the view (viewpoint, layer, element or pins, facet, hide-unlinked, texts, the file that keeps it, the steps that show it) and, after a box or a link of the diagram is selected, the inspection panel of that element or link, without leaving the page'
          - 'every run of the phase has status completed in its run-NNNN-*.md'
    - id: P2
      name: Edit the view
      gate:
        criteria:
          - 'node --test "src/test/javascript/**/*.test.js" passes'
          - 'JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw test passes'
          - 'tests show that changing the viewpoint, the element (or the pins), the facet, hide-unlinked or a text from the panel redraws the diagram, marks the view modified, and writes nothing until Save all changes, after which the view manifest holds the new values and only that file changed'
          - 'a test shows that Cancel gives the edit up (the manifest in memory and the diagram are the saved ones again) and that a view edited into something that cannot be drawn says why instead of throwing'
          - 'a test shows that renaming an element still updates the views that point at it, and that the stories that show an edited view show the edited view'
          - 'the manual (src/doc/README.adoc, section editor-stories) describes the page of a view: the diagram, the panels and what can be edited'
          - 'every run of the phase has status completed in its run-NNNN-*.md'
    - id: P3
      name: Field check
      gate:
        criteria:
          - 'JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw test passes and node --test "src/test/javascript/**/*.test.js" passes'
          - 'the run document of W-4 lists each check made on the page of the view authentication_token_validation of a copy of the user workspace, in light and dark and at three widths, with what was observed, and names every finding as fixed (with its test) or open'
          - 'the run document of W-4 records the manifest file of that view in the copy before and after an edit and a save'
          - 'every run of the phase has status completed in its run-NNNN-*.md'
  runs:
    - id: W-1
      slug: library-view-diagram
      phase: P1
      depends_on: []
      run: '0027'
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
      focus: 'see a saved view drawn in the Library, where it is managed, without leaving it'
    - id: W-2
      slug: library-view-panels
      phase: P1
      depends_on: [W-1]
      run: '0028'
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
        - 'src/doc/README.adoc'
      focus: 'read the attributes of a view, and of the box or link selected in it, in the right-hand panel'
    - id: W-3
      slug: library-view-edit
      phase: P2
      depends_on: [W-2]
      run: '0029'
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
        - 'src/doc/README.adoc'
      focus: 'change a view by saying what it draws, and see the diagram follow'
    - id: W-4
      slug: library-view-field-check
      phase: P3
      depends_on: [W-3]
      run: '0030'
      delegation: standard
      likely_paths:
        - 'docs/wav/wav-006-library-view-editor/run/**'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
      focus: 'see the page of a real view in the real editor, light and dark, and fix what is clearly broken'
```

## Phase P1 — See the view

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-1 | 0027 | `library-view-diagram` | — | See a saved view drawn in the Library, where it is managed, without leaving it | `TDD+pln`. The centre of `#/library/views` draws the selected view (Elements viewpoints `overview`/`detailed`/`deep`, layer application or technology, and the Map) with the diagram canvas, its tools (zoom, centre, fit, PNG, SVG, hide unlinked, texts) and the facet of the view. The TDD decides how a third host of the diagram reads its inputs from the view instead of the global state of the Map and Elements (parametrise the pipeline, or give it a view-scoped copy of that state), under one constraint: visiting the page changes nothing the Map and Elements show. A view that cannot be drawn keeps its message. *Open on diagram*, *Rename*, *Delete* stay. | Node tests: the canvas and its scene for an Elements view and for a Map view; Map and Elements state, and the address, unchanged after a visit; the broken-view case; `./mvnw test` green |
| W-2 | 0028 | `library-view-panels` | W-1 | Read the attributes of a view, and of the box or link selected in it, in the right-hand panel | `TDD+pln`. The page gets a right-hand panel (resizable like the Map's, width remembered, absent while the viewport is too narrow or the diagram is maximized, as the Map's). It shows the attributes of the view (what it draws, viewpoint, layer, element or pins, facet, hide-unlinked, texts, the file that keeps it, the steps that show it: the facts now in the centre move here) and, when a box or a link of the diagram is selected, the inspection panel of the Map (`renderInspectionHtml`, link panel included). Selecting in the page does not leave it (the Map's rule "a click on a box moves to that element" does not apply here; the TDD decides how a reader still reaches the element). Manual updated. | Node tests: the attributes listed; box and link selection show the inspection and the link panel; selection stays on the page and in its address; the steps that show the view still lead to their story |

**Gate:** the checks listed under P1 in the manifest hold.

## Phase P2 — Edit the view

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-3 | 0029 | `library-view-edit` | W-2 | Change a view by saying what it draws, and see the diagram follow | `TDD+pln`. The attributes of the panel become controls: viewpoint (and layer), element (or the pinned, hidden and opened elements of a Map view), facet, *Hide unlinked*, the four texts. A change redraws the diagram, marks the view *modified* (the existing mechanism: `markEntryChanged`, written by *Save all changes*, given up by *Cancel*), and a value that makes the view undrawable says why. The toolbar of the diagram on this page acts on the view being edited, not on the Map's state. The TDD decides which attributes are edited by a field and which by the diagram itself (pins by the tree of the Map or by the chips), and whether a view that is only moved around (zoom, pan) is a change (it is not today). Manual updated. | Node tests: each attribute edit redraws and marks modified; nothing written before save, only the view's manifest after; Cancel; undrawable edit; element rename still updates views; a story step shows the edited view |

**Gate:** the checks listed under P2 in the manifest hold.

## Phase P3 — Field check

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-4 | 0030 | `library-view-field-check` | W-3 | See the page of a real view in the real editor, light and dark, and fix what is clearly broken | `single-document`, evidence run, as run 0026 of wave 005. Copy `/home/tibo/syncthing/tibo-work/archi` outside the repository (never write there), build the CLI of the branch, run `archicode editor serve` on the copy and drive the page in the built-in browser. Check on `#/library/views?view=authentication_token_validation` and on a Map view: centre diagram, right panel, selection of a box and of a link, each edit, the *modified* mark, save and cancel, the manifest file before and after, the page after a reload, the pages of the Map and Elements after a visit, light and dark, three widths, no console error. Findings are recorded; a clear regression is fixed with a test; anything else is written up as a finding (not filed by the run). | The run document: each check with what was observed and how, the manifest before and after, each finding fixed (with its test) or open |

**Gate:** the checks listed under P3 in the manifest hold.

## Risks

- **Every run edits `standalone.html`, the JS tests and (W-2, W-3) `src/doc/README.adoc`.** The four runs form a line
  (W-1 → W-2 → W-3 → W-4), so no two of them can share a batch and no overlap verdict is needed; the largest effective
  concurrency of any phase is one.
- **W-1 is the risky run.** The diagram code reads global state (`currentPerspective`, `AppState.selection`,
  `mapPinned`, `diagramFacet`, the texts, `diagramScene`, `diagramCache`) and ends each `render()` with
  `mountDiagramIfNeeded`. A host that borrows that state instead of getting its own would leave the Map and Elements
  changed after a visit; the P1 gate has a test for exactly that. The 442 existing node tests are the net under the
  Map and Elements.
- **`mountDiagramIfNeeded` supersedes any layout in flight at each render.** A page that is redrawn on every edit must
  not cancel its own diagram or leave a stale scene; W-1 and W-3 test the sequence "edit, edit, edit" with the fake
  kernel.
- **Saving a manifest rewrites the whole file and drops its YAML comments** (finding F-1 of the field check of wave 005,
  still open). W-3 makes view manifests editable from the page, so more people will save them this way. W-3 must not
  make it worse; W-4 records the file before and after. The fix is not in the scope of this wave.
- **The single verification the wave cannot do** is a real folder picker (served mode only, as in wave 005); W-4 says so.
- **The editing run is the part the request implies rather than states.** "Modify a view directly" is taken from the
  request's first sentence. If only the drawing and the panels are wanted, drop W-3 and its phase: W-4 then depends on
  W-2 and its "each edit" checks are left out. Nothing else changes.

### Open questions (answered by the run that owns them, not decided here)

- W-1: how the Library host gets its inputs (a parametrised pipeline or a view-scoped copy of the global state), and
  whether the diagram tools (fold/unfold, zoom, centre) belong to the page or to the view.
- W-2: "the attributes in the right-hand panels" is read as both the attributes of the view and the attributes of the
  selected element, stacked in one panel with the view first. If the user meant two separate panels side by side, the TDD
  says how; the content is the same.
- W-2: what a click on a box does on this page (select, as written here; open the element in Elements; both with a
  modifier key).
- W-3: which attributes are edited by a field and which by the diagram, and whether editing a Map view's pins, hidden and
  opened elements happens in the panel or on the diagram.
- W-4: which widths and which other views of the copy make a sufficient field check.

## Completion Criteria

- All three phase gates hold, run by run as they complete.
- Each of the four runs has a `run-NNNN-*.md` with `status: completed` and exactly one commit; the wave is one pull
  request.
- `JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw test` and `node --test "src/test/javascript/**/*.test.js"`
  pass on the wave branch.
- The page `#/library/views?view=authentication_token_validation` of the copy of the user's workspace draws the view in
  the centre and shows its attributes on the right, as recorded by the run document of W-4.

### Exceptions at close-out

- The wave pull request is not opened by `complete-wave` (an outward-facing step left to the operator): "the wave is one pull request" is not yet satisfied.
- The field check could not take screenshots in the built-in browser (pane hidden); the look was seen in screenshots by a headless Firefox. Chromium, Safari, a screenshot of *System* with the OS in dark, a mouse-picked datalist suggestion, a screen reader and a real folder picker are not verified.
- Nine findings of the field check are open and unfiled (see the progress log); one was fixed with a test.
