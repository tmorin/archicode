---
type: wave
wave: 003
status: completed
date: 2026-10-04
related:
  - docs/wav/wav-003-standalone-workspace-editor/wbc-003-standalone-workspace-editor.md
  - CLAUDE.md
---

# Wave 003 — Standalone Workspace Editor

## Purpose

When this wave is done, `src/main/resources/editor-webapp/standalone.html`
is a single file a person can open directly from disk in a Chromium-based
browser — no server, no CLI invocation, no build step — presented as a
three-panel layout: a top bar showing the open folder's name and path with
a close action; a left panel that is pure navigation — a Settings entry, a
collapsible and clickable Elements tree (split into Applications and
Environments), and a Files list of the manifest files by relative path; and
a center panel whose content follows whatever is selected on the left — a
default workspace-wide overview with nothing selected, the clicked
element's **element view** (a read-only view with an empty, placeholder
diagram area — reproducing the generated PlantUML views dynamically is out
of scope for this wave — plus the element's qualitative and quantitative
information, including its relationships, each clickable to jump to the
destination element's own element view, and an edition view with forms to
update, add, or remove its details) for an Elements-tree item, a settings
form for the Settings entry, or a YAML editor on the raw file content for a
Files item. It remembers the workspace folder picked (reopening it
automatically on later visits, until explicitly closed), lets a person
browse the full element tree, navigate between elements by clicking a
relationship in an element's read-only information, edit any element's
details, the workspace's own settings, and a manifest's raw YAML, create a
new element into an existing or a brand-new manifest, and delete an element
with its relationships elsewhere cleaned up — with every edit saved back to
the same folder on disk.

## Non-Goals

- Does not support browsers without the File System Access API — Firefox
  and Safari cannot run this tool; it targets Chromium-based browsers
  (Chrome, Edge, Opera, Arc) only, and no fallback upload/download storage
  path is built for them.
- Does not add any backend, CLI command, or build step. The file ships as
  a plain static resource; it is not wired into `ServeEditorCommand`,
  `EditorHttpServer`, or any packaging step beyond being a resource on
  disk.
- Does not integrate with, depend on, replace, or modify the existing
  server-backed editor from `docs/wav/wav-002-manifest-web-editor`
  (`editor serve`, `EditorHttpServer`, `src/main/resources/editor-webapp/index.html`,
  the Claude-editing bridge). The two are independent surfaces by explicit
  decision; this wave touches none of that code.
- Does not add any AI-assisted or natural-language editing capability — a
  `file://` page cannot spawn a process, so there is no equivalent of
  wav-002's Claude bridge here.
- Does not add authentication, multi-user access, or any notion of a
  remote/shared workspace — it is a local, single-user tool operating on
  folders the browser's own permission picker grants to one person at a
  time.
- Does not render the element view's diagram area with any real content.
  Reproducing the overview/detailed/deep viewpoints dynamically, to match
  the existing generated PlantUML views, is explicitly out of scope for
  this wave — the diagram area ships as an inert placeholder, reserved for
  future work.
- Does not guarantee preservation of hand-authored YAML comments or
  formatting on save. Whether that is acceptable, or a format-preserving
  write path is required, is resolved in W-4's own PRD/TDD, not at the
  wave level.

## Wave Manifest

```yaml
wave_manifest:
  wave: 003
  slug: standalone-workspace-editor
  status: completed
  sources: []
  phases:
    - id: P1
      name: Load, Persist Folder Choice & Browse
      gate:
        criteria:
          - 'opening standalone.html via file:// and picking a workspace folder (e.g. .custom) shows that folder''s name and path in the top panel, and renders the left panel as pure navigation: an Elements tree as two collapsible, clickable branches (Applications and Environments) covering every element with every relationship destination resolved or explicitly flagged as dangling, a Files list of every manifest file by its relative path, and a Settings entry'
          - 'clicking an item in the left panel''s Applications or Environments branch shows that element''s read-only view in the center panel: an empty, placeholder diagram area (no viewpoint rendering); its qualitative information (name, description, tags, qualifiers, and its relationships, each clickable to navigate to the destination element''s own element view and update the left panel''s tree selection to match); and its quantitative information (e.g. relationship and child counts) — the edition view is not part of this phase'
          - 'clicking the left panel''s Settings entry shows the current workspace settings read-only in the center panel; clicking an item in the left panel''s Files list shows that manifest file''s raw YAML content read-only in the center panel'
          - 'reloading standalone.html in a fresh page load reopens the previously picked folder automatically, without a new directory-picker prompt, subject only to the browser re-confirming its own permission grant'
          - 'using the top panel''s close action clears the remembered folder, so the next reload shows the initial picker again instead of reopening it'
    - id: P2
      name: Editing Surfaces
      gate:
        criteria:
          - 'the element view gains an edition view, alongside the read-only view, with forms to update, add, or remove details for each element kind (person, system, container, component, solution, group, environment, node); editing, adding, or removing a detail through it updates the in-memory model and is reflected in the left panel''s Elements tree and in the read-only view''s information without a page reload'
          - 'the settings form shown in the center panel for the Settings entry becomes editable; changing a setting changes subsequent rendering that depends on it (e.g. the default synthetic relationship label) without a page reload'
          - 'the YAML editor shown in the center panel for a Files item becomes editable; a schema-valid edit re-parses into the in-memory model and is reflected in the left panel''s Elements tree and in that element''s element view without a page reload, and a schema-invalid edit is flagged without corrupting the in-memory model'
    - id: P3
      name: Create, Delete & Persistence
      gate:
        criteria: []
  runs:
    - id: W-1
      slug: standalone-editor-load-and-browse
      phase: P1
      depends_on: []
      run: 8
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
      focus: 'pick a workspace folder once, remember it (or forget it on request), and see the whole element tree resolved from it, with a placeholder diagram area and relationship-click navigation'
    - id: W-3
      slug: standalone-editor-editing-surfaces
      phase: P2
      depends_on: [W-1]
      run: 9
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
      focus: 'turn every read-only surface the center panel already has — element view, settings form, raw YAML file view — into something a person can actually edit, kept in sync with the in-memory model'
    - id: W-4
      slug: standalone-editor-create-delete-and-save
      phase: P3
      depends_on: [W-3]
      run: 10
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
      focus: 'create an element into an existing or new manifest, delete one without leaving dangling relationships elsewhere, and save it all back to disk'
```

## Phase P1 — Load, Persist Folder Choice & Browse

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-1 | 0008 | `standalone-editor-load-and-browse` | — | pick a workspace folder once, remember it, and browse it in a three-panel shell | a single `standalone.html` (all CSS/JS inlined, no network dependency) that uses the File System Access API to pick a workspace folder, persists the resulting directory handle in IndexedDB so a later page load re-requests permission on the same handle instead of prompting a new picker; parses `workspace.yaml` and every manifest under `settings.manifests.paths` with a vendored (inlined) YAML parser into an in-memory model mirroring `Workspace`/`Settings`/`Manifest`/`Element`/`Relationship`; resolves the application (person/system/container/component/solution/group) and technology (environment/node) hierarchies and every relationship's cross-manifest `destination` reference, flagging any reference that does not resolve; renders a three-panel shell — a **top panel** showing the open folder's name and path plus a close action that discards the stored handle; a **left panel**, pure navigation, with a Settings entry, an Elements tree as two collapsible, clickable branches (Applications, Environments), and a Files list of every manifest file by its path relative to the workspace root; a **center panel**, read-only at this stage, whose content follows the left panel's selection — the Settings entry shows the current workspace settings, a Files item shows that manifest's raw YAML content, and an Elements-tree item shows that element's **element view**, limited for now to the read-only view: an empty, placeholder diagram area (no overview/detailed/deep rendering — reproducing the generated PlantUML views dynamically is out of scope for this wave), its qualitative information (`id`/`name`/`description`/`qualifiers`/`tags`, and its relationships, each clickable to navigate to the destination element's own element view and update the left panel's tree selection), and its quantitative information (e.g. relationship and child counts) — the edition view (W-3) does not exist yet | opening `standalone.html` via `file://` and picking `.custom` shows the folder's name and path in the top panel, renders the left panel's Elements tree (Applications and Environments, collapsible, clickable) with every relationship resolved or flagged dangling, and its Files list with every manifest's relative path; clicking the Settings entry shows the current settings in the center panel; clicking a Files item shows that file's raw YAML in the center panel; clicking an item in the Applications or Environments branch shows its element view's read-only information in the center panel, with an empty placeholder diagram area and its relationships listed and clickable to navigate to their destination's own element view; reloading the page reopens `.custom` automatically; using the top panel's close action and reloading shows the picker again |

**Gate:** all five P1 criteria hold, checked by the manual `file://` walkthrough above against `.custom`.

## Phase P2 — Editing Surfaces

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-3 | 0009 | `standalone-editor-editing-surfaces` | W-1 | turn every read-only center-panel surface into an editable one | turns the center panel's settings display (shown for the Settings entry) into an editable form (`settings.manifests.paths`, `settings.relationships.default-synthetic-label`, `settings.views.path`/`labels`/`properties`, `settings.facets.global-enabled`/`directory-name-template`/`customs`); adds an edition view, alongside the read-only view, to each element's element view — per-kind forms (person/system/container/component/solution/group/environment/node) to update, add, or remove `id`/`name`/`description`/`qualifiers`/`tags`, the source element's own relationships (`destination`/`label`/`qualifiers`/`tags`), and `node`'s `applications` field; turns the center panel's per-file raw YAML display (shown for a Files item) into a YAML text editor whose schema-valid changes re-parse into the same in-memory model; all three surfaces edit the same in-memory model only (no disk write yet), and an edit through any one of them is immediately visible in the left panel's Elements tree and in the other two surfaces for the same element/file | editing, adding, or removing a detail on an element of every kind through its edition view updates its tree node, its own read-only view, and the raw YAML shown for its manifest, without a reload; editing a workspace setting through the settings form changes dependent rendering (e.g. the synthetic relationship label) without a reload; editing a manifest's raw YAML directly re-parses and is reflected in the tree and in the affected elements' views; an invalid YAML edit is flagged without corrupting the in-memory model |

**Gate:** all three P2 criteria hold, checked by editing one element of each kind through its form, one workspace setting, and one manifest's raw YAML directly, and observing the tree/view/rendering update live in each case.

## Phase P3 — Create, Delete & Persistence

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-4 | 0010 | `standalone-editor-create-delete-and-save` | W-3 | create, delete, and persist, for real | create a new element inside an existing manifest or into a brand-new one (synthesizing its `header`/`content` shape); delete an element, scanning the whole model for any relationship elsewhere whose `destination` resolves to the deleted element (or one of its former descendants) and removing or surfacing those for resolution so no dangling reference is silently saved; a save action that writes every changed manifest (and `workspace.yaml`, if its settings changed) back to the granted directory via the File System Access API, scoped to files under `settings.manifests.paths` plus `workspace.yaml` itself | creating an element into an existing manifest, saving, and reloading the folder shows it in the left panel's Elements tree, sourced from the correct file; creating one into a brand-new manifest, saving, and reloading shows it in the Elements tree, the new file's relative path in the left panel's Files list, and its content in that file's YAML view; deleting an element that other elements' relationships target (e.g. `platform.authx.backend` in `.custom`), saving, and reloading leaves no relationship pointing at the removed id and the reload completes without a parse error |

## Dependency View

```
W-1 -> W-3 -> W-4
```

`W-2` (a run to reproduce the generated PlantUML views dynamically in the
diagram area) was dropped from this wave's scope before execution started —
see the progress log. `W-` ids are never renumbered, so the sequence skips
it rather than closing the gap.

## Risks

- **This wave is fully serial.** Every phase holds exactly one run, and
  every run edits the same single file
  (`src/main/resources/editor-webapp/standalone.html`). There is never more
  than one run in a batch, so the same-batch path-overlap check has nothing
  to resolve — `likely_paths` are listed identically across all three
  remaining runs for `complete-wave`'s bookkeeping, not because any two
  runs could collide. Largest concurrent batch: 1.
- **Chromium-only by design.** The File System Access API — the only thing
  that makes "reopen the folder automatically" and "close the folder"
  possible — is not implemented in Firefox or Safari. This is recorded as
  a Non-Goal, not treated as a defect to work around; if that trade-off is
  rejected later, W-1's approach (and every run after it) would need to be
  redone against a different storage model.
- **Dynamic view rendering is deferred, not solved.** The element view's
  diagram area ships as an inert placeholder; reproducing the
  overview/detailed/deep viewpoints to match the existing generated
  PlantUML views (including the overview viewpoint's intricate
  natural-vs-synthetic link grooming) was dropped from this wave's scope
  — it was originally planned as a run between W-1 and W-3, dropped before
  execution started (see the progress log). A future wave taking this on
  should expect that grooming algorithm to need its own careful pinning
  against concrete `.custom` examples; it is not a small addition to W-1
  or W-3.
- **P3 is the first point real disk writes happen.** Saving overwrites
  manifest files the user granted access to; the mitigation is that the
  File System Access API itself scopes any write to the directory tree the
  user explicitly picked, and save is always an explicit action, never
  automatic. W-4's own PRD/TDD must still decide what "save" does if a file
  changed on disk since it was loaded (e.g. edited externally in the same
  session) — recorded as an open question for that run rather than guessed
  here.
- **Two editing surfaces, one model.** From P2 onward, the same manifest
  content is editable both through structured per-kind forms (the element
  view's edition view, and the settings form) and through direct raw YAML
  editing (a Files item's YAML editor). Both must stay consistent with the
  same in-memory model, so an edit through either one is visible in the
  other without a reload. W-3's own PRD/TDD owns the exact reconciliation
  mechanism (e.g. re-parse-on-valid-edit, debounce, conflict messaging on a
  malformed YAML edit); this wave does not prescribe one.

## Completion Criteria

- `standalone.html` ships as a single, dependency-free file that opens via
  `file://`, remembers a picked workspace folder across reloads, and can be
  explicitly closed.
- Opening a real workspace (`.custom`) renders its full element tree with
  cross-manifest relationships resolved, and dangling references are
  surfaced rather than silent.
- Clicking an element shows its element view: a read-only view (an empty,
  placeholder diagram area, plus its qualitative and quantitative
  information, including relationships each clickable to navigate to
  their destination's own element view) and an edition view.
- Every element kind can be updated, added to, or removed from through its
  edition view, the workspace's own settings can be edited through its
  form, and a manifest's raw YAML can be edited directly through its file
  view — all three live and consistent against the tree and each other.
- An element can be created into an existing or a brand-new manifest, and
  deleted without leaving a dangling relationship elsewhere in the saved
  model, with every change persisted back to the same folder on disk.
