---
type: wave
wave: 004
status: in-progress
date: 2026-10-13
related:
  - docs/wav/wav-004-editor-workspace-experience/wbc-004-editor-workspace-experience.md
  - docs/wav/wav-003-standalone-workspace-editor/wav-003-standalone-workspace-editor.md
  - docs/run/run-0011-editor-ui-state-per-layer/run-0011-editor-ui-state-per-layer.md
  - CLAUDE.md
---

# Wave 004 — Editor Workspace Experience

## Purpose

When this wave is done, the standalone editor shows a workspace the way its author tagged it and stays usable at
any width. The boxes, tree rows, legend and SVG export carry the look of the stereotypes the workspace styles
(`styles.by-tags` / `by-qualifiers`), computed by the viewpoint kernel so that the CLI's PlantUML and the editor agree
(`rendering-stereotypes` is a whitespace-separated list). Selecting an element or a link opens a right-hand panel with
its data. The toolbars, the perspective switch and the centre-panel header are consistent and adapt to the panel
width, with a "⋯" menu for the rarely used actions. The interface can be light, dark or system, chosen in Settings and
remembered per browser. A workspace can carry a `settings.name`, shown in place of the folder name. Several folders are
remembered and listed when none is open.

## Non-Goals

- Does not compute a baseline-versus-target diff between two workspaces (no "removed" elements, no TOGAF gap
  analysis) and does not add a phase or lifecycle model to manifests. `new` / `changed` stay tags.
- Does not add a predefined "show only new and changed" lens: a facet already does it; revisit after W-6.
- Does not add a floating hover card on boxes or links; native tooltips stay as they are.
- Does not store the theme in `workspace.yaml`: it is a per-browser preference and never marks the workspace as
  modified.
- Does not support TOML or JSON manifests in the editor (already documented in the manual since `cb4b24b`).
- Does not close the unchecked points of GitHub issue tmorin/archicode#8 (visual check in a real browser, the
  dangling-reference fix end to end, the 0.6.0 published artifacts).
- Does not change `archicode editor serve`, except that it keeps hiding anything that needs a folder picker (the
  folder list of W-9, "Close folder").
- Does not rename or move existing `workspace.yaml` keys; `settings.name` is purely additive and optional.

## Wave Manifest

```yaml
wave_manifest:
  wave: 004
  slug: editor-workspace-experience
  status: in-progress
  sources: []
  phases:
    - id: P1
      name: Foundations
      gate:
        criteria:
          - 'node --test "src/test/javascript/**/*.test.js" passes'
          - 'JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw test passes'
          - 'src/main/rust/viewpoint-kernel/embed.sh --check exits 0 and cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml passes'
          - 'a test shows that an element tagged rendering-stereotypes "external changed" gets both external and changed stereotypes in the generated PlantUML, in a stable order'
          - 'a test shows that settings.name is read, written back only when set, and that a workspace without it is unchanged'
          - 'a test shows that the stored theme choice sets data-theme on the root element and that system leaves it unset'
          - 'every run of the phase has status completed in its run-NNNN-*.md'
    - id: P2
      name: Rendering surface
      gate:
        criteria:
          - 'node --test "src/test/javascript/**/*.test.js" passes'
          - 'JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw test passes'
          - 'a test shows that a box tagged with a stereotype styled in styles.by-tags is drawn with that fill and stroke and a text badge, in the editor SVG and in the exported SVG'
          - 'tests assert, for each state of the centre header (full, compact, minimal), which controls are in the DOM and that the "⋯" menu holds Story, Download and Show on map / Open in Elements'
          - 'every run of the phase has status completed in its run-NNNN-*.md'
    - id: P3
      name: Inspection panel
      gate:
        criteria:
          - 'node --test "src/test/javascript/**/*.test.js" passes'
          - 'a test shows that selecting an element in the Map renders the right panel with its kind, reference, layer, tags and description, and that no panel is rendered with nothing selected'
          - 'a test shows that selecting a link renders the right panel with each declared relationship, its qualifiers and its tags'
          - 'every run of the phase has status completed in its run-NNNN-*.md'
    - id: P4
      name: Multiple folders
      gate:
        criteria:
          - 'node --test "src/test/javascript/**/*.test.js" passes'
          - 'JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw verify passes'
          - 'a test with a fake indexedDB shows that a record written by the previous schema is migrated, that two remembered folders are both listed when none is open, and that Remove deletes only the record'
          - 'every run of the phase has status completed in its run-NNNN-*.md'
  runs:
    - id: W-1
      slug: editor-toolbar-polish
      phase: P1
      depends_on: []
      run: '0012'
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
      focus: 'buttons groups, perspective switch and Close folder look and sit right'
    - id: W-5
      slug: kernel-stereotypes
      phase: P1
      depends_on: []
      run: '0013'
      delegation: standard
      likely_paths:
        - 'src/main/rust/viewpoint-kernel/**'
        - 'src/main/wasm/**'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/main/java/io/morin/archicode/viewpoint/**'
        - 'src/main/java/io/morin/archicode/rendering/plantuml/**'
        - 'src/test/java/**'
        - 'src/test/javascript/viewpoint-kernel/**'
        - 'src/doc/README.adoc'
      focus: 'the CLI and the editor read rendering-stereotypes the same way, from the kernel'
    - id: W-3
      slug: editor-theme-setting
      phase: P1
      depends_on: []
      run: '0014'
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
        - 'src/doc/README.adoc'
      focus: 'choose light, dark or system in Settings, remembered by the browser'
    - id: W-4
      slug: workspace-name
      phase: P1
      depends_on: []
      run: '0015'
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/resource/workspace/Settings.java'
        - 'src/test/java/**'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
        - 'src/doc/README.adoc'
        - 'src/doc/examples/domain_workspace/**'
      focus: 'give a workspace a name that the editor shows instead of the folder name'
    - id: W-2
      slug: center-header-responsive
      phase: P2
      depends_on: []
      run: '0016'
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
      focus: 'the header of the centre panel holds together whatever the width of the panel'
    - id: W-6
      slug: editor-applies-styles
      phase: P2
      depends_on: [W-3, W-5]
      run: '0017'
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
        - 'src/doc/README.adoc'
      focus: 'see in the editor what the workspace styled: new, changed, external'
    - id: W-7
      slug: inspection-panel-elements
      phase: P3
      depends_on: [W-2, W-6]
      run: null
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
      focus: 'read the data of the selected element in a right-hand panel without leaving the view'
    - id: W-8
      slug: inspection-panel-links
      phase: P3
      depends_on: [W-7]
      run: null
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
      focus: 'select a link and read its relationships and their tags'
    - id: W-9
      slug: multiple-folders
      phase: P4
      depends_on: [W-4]
      run: null
      delegation: hard_judgment
      delegation_reason: 'migrates the stored IndexedDB record of the remembered folder (data migration) and adds a delete action on remembered folders'
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
        - 'src/doc/README.adoc'
      focus: 'come back to any of the folders already opened, and forget the ones that are no longer wanted'
```

## Phase P1 — Foundations

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-1 | 0012 | `editor-toolbar-polish` | — | Buttons groups, perspective switch and Close folder look and sit right | `single-document`. A hovered or focused button of a `.button-group` keeps its right border (`z-index` on `:hover` and `:focus-visible`, which fixes every group). The perspective tabs become a button group with `aria-pressed`. "Close folder" moves to the far right of the top bar, after "?". | Node tests assert the group markup (`aria-pressed` on the active perspective, order of the top-bar controls) and the CSS rule; existing tests updated |
| W-5 | 0013 | `kernel-stereotypes` | — | The CLI and the editor read `rendering-stereotypes` the same way, from the kernel | `single-document`, Rust + Java. The value is a whitespace-separated list (backward compatible). The kernel returns per item its stereotypes (qualifiers + split tag, stable order). `PlantumlUtilities.generateStereotypes` consumes them (no more `Collectors.toSet()`). `embed.sh` re-run. The manual documents `rendering-stereotypes` and `styles.by-tags`. | `cargo test`, `embed.sh --check`, a Java test and a node conformance test on `"external changed"`; `./mvnw test` green |
| W-3 | 0014 | `editor-theme-setting` | — | Choose light, dark or system in Settings, remembered by the browser | `single-document`. Section "Appearance (this browser)" with a light/dark/system radio list, stored in `localStorage` (every access in try/catch), never touching `workspace.yaml` or the Save state. The stylesheet moves from `prefers-color-scheme` alone to `:root[data-theme]` overrides (system = no attribute). CodeMirror theme and the SVG export follow. The stored choice is applied before the first paint. | Node tests for the radio, the attribute, the unavailable storage, the CodeMirror dark flag |
| W-4 | 0015 | `workspace-name` | — | Give a workspace a name that the editor shows instead of the folder name | `single-document`, Java + editor. Optional `name` in `settings` (`Settings.java`), read and written with the managed settings (omitted when empty), a "Name" field in Settings (section "Workspace", through Save). It replaces the folder name in the top bar, in the "Opening “x”…" messages and in the page title; the folder name becomes a tooltip. Manual and the `domain_workspace` example updated. | Java and node tests: round trip, absent key unchanged, display and tooltip |

**Gate:** the checks listed under P1 in the manifest hold.

## Phase P2 — Rendering surface

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-2 | 0016 | `center-header-responsive` | — | The header of the centre panel holds together whatever the width of the panel | `TDD+pln`. Container queries on the centre panel, three states (full, compact with icon-only controls carrying `title` and `aria-label`, minimal with a "⋯" menu reusing the `.help-menu` pattern). Decided by the user: the menu holds Story (`Name view…`, `Add to story…`), Download (PNG/SVG) and "Show on map" / "Open in Elements" (same slot in both perspectives); the Facet select stays visible. Removes the hidden-scroll strip. The TDD decides duplicate-versus-move of the controls and how the focus returns (`headerControlSelector`, focus after the add-to-story dialog). | DOM-level tests per state; the existing header tests updated deliberately; no `overflow-x:auto` strip left in `.element-header-actions` |
| W-6 | 0017 | `editor-applies-styles` | W-3, W-5 | See in the editor what the workspace styled: new, changed, external | `TDD+pln`. Fill and stroke from `styles.by-tags` / `by-qualifiers` on diagram boxes, a text badge (colour is never alone), the same in tree rows, in the legend and in the SVG export; readable text colour on custom fills in the dark theme (the TDD decides whether `styles` gets an optional dark variant). Reads the workspace mapping, nothing hard-coded; consumes the kernel stereotypes. Not to be confused with the existing `modified-dot` (unsaved changes). Manual updated. | Node tests: a styled stereotype yields its fill, stroke and badge in the SVG, the tree row, the legend and the export, in both themes |

**Gate:** the checks listed under P2 in the manifest hold.

## Phase P3 — Inspection panel

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-7 | — | `inspection-panel-elements` | W-2, W-6 | Read the data of the selected element in a right-hand panel without leaving the view | `TDD+pln`. A right panel (the shell already supports resizable right and bottom panels, none is used today) shown when an element is selected in the Map, and in the diagram tabs of Elements where the TDD finds it useful; it reuses `renderElementPropertiesHtml` and the badges of W-6. Click semantics unchanged. Nothing rendered with nothing selected. | Node tests: panel content for an element, absent without selection, resize handle and saved width |
| W-8 | — | `inspection-panel-links` | W-7 | Select a link and read its relationships and their tags | `TDD+pln`. A new selection kind `link`; a click on a diagram link selects it; the panel lists each declared relationship with label, qualifiers and tags (for instance `tcp-port`, `fhir-exchange`). | Node tests: selecting a link, the listed relationships and tags, selection cleared on navigation |

**Gate:** the checks listed under P3 in the manifest hold.

## Phase P4 — Multiple folders

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-9 | — | `multiple-folders` | W-4 | Come back to any of the folders already opened, and forget the ones that are no longer wanted | `TDD+pln`. On load, the last folder is opened directly if its permission still holds (current behaviour). With no folder open (after "Close folder", or when a permission must be re-requested) the landing card lists every remembered folder, each with "Open" (a click is the user gesture the permission needs) and "Remove from the list" (the label says nothing is deleted on disk). New IndexedDB schema with migration of the single `workspace` record, de-duplication by `isSameEntry`, the workspace name of W-4 remembered with each folder (the `workspace.yaml` of a folder without permission cannot be read). Hidden in `archicode editor serve`. The test harness gets a fake `indexedDB`. Manual updated. | Node tests with the fake `indexedDB`: migration, listing, open, remove, no list in served mode |

**Gate:** the checks listed under P4 in the manifest hold.

## Dependency View

```
P1  W-1   W-5 ──┐   W-3 ──┐   W-4 ───────────────┐
                │         │                       │
P2  W-2         └──► W-6 ◄┘                       │
     │              │                             │
P3   └──► W-7 ◄─────┘                             │
            │                                     │
            └──► W-8                              │
P4                                    W-9 ◄───────┘
```

## Risks

- **Everything edits `standalone.html`.** Every pair of runs below shares it (and `src/test/javascript/viewpoint-kernel/**`); `embed.sh` also rewrites its base64 kernel block, so W-5 shares it too. Verdict for every overlapping pair, inside P1 (W-1/W-3/W-4/W-5) and inside P2 (W-2/W-6): **`serialize`**. Dependent pairs (W-6→W-7→W-8) are ordered by their edges. Dependencies leave up to four runs of P1 runnable in the same batch, but with this verdict the largest effective concurrency of a phase is one run.
- **`src/doc/README.adoc`** is shared by W-3, W-4, W-5, W-6, W-9: **`serialize`**, same reason.
- **W-2 changes tests that read the header markup as text** (regexes on `element-header-label` / `element-header-actions`, focus return to `[data-action="add-to-story"]`, `headerControlSelector`). It must update them deliberately, not loosen them.
- **W-5 changes the kernel contract and re-embeds the wasm.** The toolchain is pinned by `rust-toolchain.toml` and the `wasm32-unknown-unknown` target is installed here; a test checks that the CLI's `.wasm` and the editor's block come from the same build, and `embed.sh --check` is what CI runs.
- **No run can look at the page.** The editor needs the File System Access picker, so the runs verify the DOM and the CSS text only. A human look in a Chromium browser after the wave (also an unchecked point of issue #8) is recommended and is deliberately not a completion criterion: an unattended wave could not satisfy it.
- **Prerequisite:** PR tmorin/archicode#13 (run 0011) is merged into `main` before the wave branch is cut; otherwise the first run rebases over it.
- **W-9 is the only `hard_judgment` run** (it migrates a stored record and adds a delete action on remembered folders). A failed migration must leave the old record usable.

### Open questions (answered by the run that owns them, not decided here)

- W-2: the exact container breakpoints (the estimates are about 1150 px / 950 px / 700 px of centre-panel width), and duplicate-versus-move of the collapsed controls.
- W-6: whether `styles` gets an optional dark colour variant, or the editor derives a readable text colour.
- W-7: which diagram tabs of Elements show the panel (the Map does).

## Completion Criteria

- All four phase gates hold, run by run as they complete.
- Each of the nine runs has a `run-NNNN-*.md` with `status: completed` and exactly one commit; the wave is one pull request, rebased and merged.
- `JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw verify` and `node --test "src/test/javascript/**/*.test.js"` pass on the wave branch, and CI is green on the PR.
- The manual describes `rendering-stereotypes`, `styles.by-tags`, `settings.name`, the theme setting and the folder list.
