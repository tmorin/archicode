---
title: Standalone Editor — Load & Browse
status: active
owner: run-0008
date: 2026-10-04
related:
  - docs/wav/wav-003-standalone-workspace-editor/wav-003-standalone-workspace-editor.md
  - docs/wav/wav-003-standalone-workspace-editor/wbc-003-standalone-workspace-editor.md
type: prd
run: 8
wave: 003
---

# Standalone Editor — Load & Browse

# 1. Context

ArchiCode models a workspace as a `workspace.yaml` plus a set of manifest
files under `settings.manifests.paths` (default `["manifests"]`), parsed
and resolved entirely by the Java CLI (`manifest/ManifestParser`,
`workspace/WorkspaceFactory`). The only existing editing surfaces are a
plain text editor on the raw YAML, and — from the unrelated, independent
wave `docs/wav/wav-002-manifest-web-editor` — a server-backed webapp that
requires running `editor serve`. Neither lets a person browse a workspace's
resolved element tree, with cross-manifest relationships followed, from a
double-clickable file with no process to start.

This run is wave 003's first and only phase-P1 run (`W-1`,
`standalone-editor-load-and-browse`). It delivers the foundation the wave's
later runs (`W-3` editing surfaces, `W-4` create/delete/save) build on: a
single `src/main/resources/editor-webapp/standalone.html` file, opened
directly via `file://` in a Chromium-based browser, that picks a workspace
folder once, remembers it across reloads (or forgets it on request), parses
and resolves the whole workspace client-side, and renders it read-only —
tree, files, settings, and per-element qualitative/quantitative information
with clickable relationship navigation, with an inert placeholder
diagram area. No edit/create/delete/save exists at this stage.

# 2. Problems

- A person wanting to browse a workspace's resolved tree today must either
  read raw YAML by hand (mentally resolving dot-joined cross-manifest
  references) or start a local server for a wave-002 feature unrelated to
  this one. There is no zero-install, no-process way to just look.
- Clicking from one element to a related element (e.g. `authx.backend` to
  `epracl.backend`) has no tool support short of regenerating PlantUML
  views and reading a static file; there is no interactive way to follow a
  relationship.
- Any browser-based tool that asks for folder access on every page load,
  with no memory of the last folder and no explicit "I'm done" action, is a
  worse experience than the text editor it is meant to augment for quick,
  offline use.
- Dangling relationship references (a `destination` that does not resolve
  to any known element) are silently rendered as a plain reference string
  today — nothing calls them out as broken.

# 3. Scope / Out of Scope

In scope:

- A single, self-contained `standalone.html` (all CSS/JS inlined, a
  vendored/inlined YAML parser, no external network dependency, no build
  step) that opens via `file://`.
- Picking a workspace folder via the File System Access API
  (`showDirectoryPicker()`), persisting the resulting directory handle in
  IndexedDB, and re-requesting permission on that same handle on a later
  page load instead of prompting a fresh picker.
- An explicit close action that discards the stored handle, returning the
  app to its initial picker state on the next reload.
- Parsing `workspace.yaml` and every manifest file under
  `settings.manifests.paths` (default `["manifests"]`) into an in-memory
  model mirroring the Java domain: `Workspace`/`Settings`/manifest
  `header`+`content`/`Element`(application: person, system, container,
  component, solution, group variants; technology: environment, node)/
  `Relationship`.
- Resolving every relationship's `destination` (an absolute, dot-joined
  reference from the root of its own layer — application or technology)
  against the in-memory element index, flagging any reference that does
  not resolve as dangling rather than silently rendering it.
- A three-panel read-only shell: top panel (open folder's name + path,
  close action), left panel (Settings entry; Elements tree as two
  collapsible branches, Applications and Environments; Files list by
  manifest path relative to the workspace root), center panel (follows the
  left panel's selection).
- Center panel content for each selection kind: Settings entry → current
  workspace settings, read-only; Files item → that manifest's raw YAML
  text, read-only; Elements-tree item → that element's read-only element
  view (empty placeholder diagram area; qualitative info — id, name,
  description, qualifiers, tags, relationships each clickable to navigate
  to the destination element's own element view and update the left
  panel's tree selection to match; quantitative info — e.g. relationship
  count, child-element count).

Out of scope (deferred to later wave-003 runs or explicitly non-goals of
the whole wave, not just this run):

- Any edition view, settings form, or YAML editor that actually changes
  the in-memory model (`W-3`).
- Create/delete of elements or manifests, and any write back to disk
  (`W-4`).
- Reproducing the generated overview/detailed/deep PlantUML viewpoints in
  the diagram area — ships as an inert placeholder for the whole wave.
- Any browser other than Chromium-based ones (Firefox/Safari lack the File
  System Access API — accepted non-goal, not a defect).
- Any integration with, or modification of, wav-002's server-backed editor
  (`editor serve`, `EditorHttpServer`, `index.html`) — fully independent
  code path.
- Authentication, multi-user access, or a remote/shared workspace notion.

# 4. Goals / Non-goals

- **GOAL-1**: A person can open `standalone.html` via `file://`, pick a
  real workspace folder, and see its full resolved element tree without
  running any process.
- **GOAL-2**: The picked folder persists across page reloads without a new
  picker prompt, and can be explicitly forgotten.
- **GOAL-3**: Every element's qualitative and quantitative information is
  browsable read-only, with relationships clickable to navigate the graph,
  including surfacing dangling references rather than hiding them.
- Non-goal: editing, creating, deleting, or saving anything (later runs).
- Non-goal: rendering real diagrams in the element view's diagram area
  (whole-wave non-goal).
- Non-goal: Firefox/Safari support.

# 5. User Stories

- **US-1**: As a person who just wants to look at a workspace, I open
  `standalone.html` from disk, pick the workspace's folder once, and see
  its elements organized as a navigable tree, without starting a server or
  reading raw YAML by hand.
  - AC-1: Picking a folder (e.g. `.custom`) shows that folder's name and
    its path in the top panel.
  - AC-2: The left panel renders an Elements tree as two collapsible,
    clickable branches, Applications and Environments, covering every
    element parsed from every manifest file.
  - AC-3: The left panel renders a Files list of every manifest file by
    its path relative to the workspace root.
  - AC-4: The left panel renders a Settings entry.
- **US-2**: As that same person, I want every relationship's destination
  resolved so I can trust the tree reflects reality, including being told
  when a reference is broken.
  - AC-5: Every relationship's `destination` that resolves to a known
    element is presented as resolved (not a bare string).
  - AC-6: Every relationship's `destination` that does not resolve to any
    known element is explicitly flagged as dangling, not silently
    rendered or dropped.
- **US-3**: As that person, I want to open an element and read everything
  about it, then jump to a related element without losing my place.
  - AC-7: Clicking an Applications or Environments tree item shows that
    element's read-only element view in the center panel: an empty
    placeholder diagram area, its qualitative information (name,
    description, tags, qualifiers, relationships), and its quantitative
    information (e.g. relationship count, child-element count).
  - AC-8: Clicking a relationship in that view navigates to the
    destination element's own element view and updates the left panel's
    tree selection to match. Clicking a relationship flagged dangling does
    not navigate (there is no destination element view to show).
- **US-4**: As that person, I want to read the workspace's settings and a
  manifest's raw content without leaving the tool.
  - AC-9: Clicking the Settings entry shows the current workspace settings
    read-only in the center panel.
  - AC-10: Clicking a Files item shows that manifest file's raw YAML
    content read-only in the center panel.
- **US-5**: As that person, I want the tool to remember which folder I was
  using, and to let me explicitly switch away from it.
  - AC-11: Reloading `standalone.html` in a fresh page load reopens the
    previously picked folder automatically, without a new
    directory-picker prompt, subject only to the browser re-confirming its
    own permission grant.
  - AC-12: Using the top panel's close action clears the remembered
    folder; the next reload shows the initial picker again instead of
    reopening it.

# 6. Functional requirements

- **FR-1 (P0)**: Provide a folder-picker action (initial state, no folder
  remembered) using `showDirectoryPicker()`; on success, persist the
  resulting `FileSystemDirectoryHandle` in IndexedDB.
- **FR-2 (P0)**: On every page load, if a directory handle is stored, call
  `queryPermission({mode: 'read'})` on it first (no user gesture needed for
  this call). If it reports `'granted'`, reopen the folder immediately with
  no picker and no extra click. If it reports anything else, render the
  shell in a "click to reopen `<folder name>`" state instead of the
  initial blank picker (`requestPermission()` needs a user-gesture-
  triggered call, per Q-1's resolution), and only call
  `requestPermission({mode: 'read'})` from that click's own handler. If
  no handle is stored, or re-request ultimately fails, fall back to the
  initial folder-picker state.
- **FR-3 (P0)**: Provide a close action in the top panel that removes the
  stored handle from IndexedDB and returns the app to the initial picker
  state.
- **FR-4 (P0)**: Parse `workspace.yaml` at the picked folder's root into an
  in-memory `Workspace` mirror (`application`, `technology`, `settings`
  with its documented defaults, `styles`, `formatters` — styles/formatters
  parsed but not rendered against, since this run has no diagram
  rendering).
- **FR-5 (P0)**: Discover every manifest file from the direct
  (non-recursive) contents of each path in `settings.manifests.paths`
  (default `["manifests"]`, resolved relative to the workspace root) with
  a `.yaml`/`.yml` extension — matching the real `ManifestParser`'s own
  non-recursive directory listing — and parse each one's `header` (`kind`,
  `version`, optional `parent`) and `content` into an in-memory `Element`
  mirror of the matching application or technology kind.
- **FR-6 (P0)**: Build each manifest's own top-level element's reference
  as `header.parent + "." + content.id` when `header.parent` is present,
  or `content.id` otherwise. Then, recursively for every element nested
  inside `content.elements` (at any depth, in either layer), build its
  reference as its parent element's own reference + `"." +` its own `id`.
  Index every element — manifest-root and nested alike — by its reference,
  separately for the application layer and the technology layer. (Mirrors
  the real indexing's two-step shape: a manifest-root pass plus a
  recursive descendant walk — see TDD for the Java precedent,
  `ElementIndexFactory`/`Workspace.Utilities.walkDown`.)
- **FR-7 (P0)**: Resolve every relationship's `destination` string against
  that index (application relationships against the application index,
  technology against the technology index); mark any relationship whose
  `destination` has no matching index entry as dangling.
- **FR-8 (P0)**: Render the left panel's Elements tree as two independently
  collapsible branches — Applications, Environments — reflecting each
  kind's real nesting (solution/group→system/group→container/group→
  component for application, where `component` is always a leaf — there
  is no "component group" kind in the domain model; environment→node→node,
  recursively, for technology), each node clickable.
- **FR-9 (P0)**: Render the left panel's Files list with every manifest
  file's path relative to the workspace root, each entry clickable.
- **FR-10 (P0)**: Render a Settings entry in the left panel, clickable.
- **FR-11 (P0)**: Clicking a Files entry renders that file's raw YAML text
  read-only in the center panel.
- **FR-12 (P0)**: Clicking the Settings entry renders the current
  workspace settings read-only in the center panel (manifest paths,
  default synthetic relationship label, views path/labels/properties,
  facets).
- **FR-13 (P0)**: Clicking an Elements-tree item renders that element's
  read-only element view in the center panel: an empty placeholder diagram
  area; qualitative information (id, name, description, qualifiers, tags,
  relationships — each showing label/qualifiers/tags and whether it
  resolves or is dangling); quantitative information (relationship count,
  and for a parent kind, direct child-element count).
- **FR-14 (P0)**: In that element view, clicking a resolved relationship
  navigates the center panel to the destination element's own element view
  and updates the left panel's tree selection (expanding collapsed
  ancestors as needed) to match. Clicking a dangling relationship performs
  no navigation.
- **FR-15 (P1)**: Keep selection/navigation state only in memory (no
  persisted "last viewed element" across reloads) — only the folder handle
  itself persists.
- **FR-16 (P0)**: If the picked folder has no readable `workspace.yaml`, or
  any discovered manifest file fails to parse (invalid YAML, or a `header`
  whose `kind` is not a recognized application/technology kind), show a
  visible error state naming the offending file instead of a blank or
  broken shell; this does not require per-field schema validation
  (deferred), only a baseline "something failed to parse, here is what"
  signal.

# 7. Non functional requirements

- **NFR-1**: The file is fully self-contained — no external script,
  stylesheet, font, or CDN reference — and works fully offline opened via
  `file://`.
- **NFR-2**: Parsing and rendering a workspace of `.custom`'s real size
  (~24 manifest files) completes without a visible freeze (sub-second on a
  typical laptop) on folder open and on reload.
- **NFR-3**: The tool is explicitly Chromium-only; no feature-detection
  fallback is required beyond a clear message if `showDirectoryPicker` or
  IndexedDB is unavailable.
- **NFR-4**: A dangling relationship reference must be visually
  distinguishable from a resolved one (not just present in a tooltip), per
  US-2's trust requirement.

# 8. Open Questions

- **Q-1 (resolved)**: Research against MDN's `FileSystemHandle
  .requestPermission()`/`.queryPermission()` docs and web.dev's File
  System Access API article confirms: `queryPermission()` needs no user
  gesture and can be called freely on page load; `requestPermission()`
  requires transient user activation (a click-handler call) and throws if
  called outside one. Resolved by FR-2: call `queryPermission()` first and
  reopen silently if already `'granted'`; otherwise show a one-click
  "reopen `<folder>`" affordance whose click handler calls
  `requestPermission()`. This still satisfies AC-11's "no new
  directory-picker prompt" — a one-click re-confirmation is not
  `showDirectoryPicker()` — and is exactly the "browser re-confirming its
  own permission grant" the wave gate's criterion anticipates.
- **Q-2 (resolved)**: Checked every `destination:` string against every
  element id/path actually present across `.custom/manifests/*.yaml`
  (manual grep cross-check, 2026-10-04) — every one of `.custom`'s real
  relationships resolves; there is no genuinely dangling reference in the
  fixture today. AC-6's dangling-flagging behavior therefore needs its own
  deliberately-broken synthetic fixture (a copy of `.custom` with one
  `destination` edited to a non-existent id) for manual verification in
  Stage 11, rather than relying on `.custom` as-is to exercise that path.

# 9. Technical Concerns

- **TC-1**: No per-kind JSON Schema exists server-side to borrow from for
  parsing/validation; this run's YAML→model mapping and reference
  resolution is independent client-side logic that must be kept
  consistent with the real Java domain model's field names and defaults
  (see TDD for the exact mirror).
- **TC-2**: A vendored YAML parser must be inlined (no bundler, no CDN);
  picking/trimming one small enough to paste inline while handling the
  real manifests' YAML features (block scalars, nested sequences/maps,
  booleans like `yes`/`no` in tags) is a design decision for the TDD.
- **TC-3**: `FileSystemDirectoryHandle` cannot itself be serialized to
  IndexedDB as plain JSON — it is a structured-cloneable object — the TDD
  must confirm the exact IndexedDB API usage (`structuredClone`-compatible
  `put`) rather than a `JSON.stringify` round-trip.
- **TC-4 (resolved)**: Researched against MDN (`FileSystemHandle.name`,
  `FileSystemDirectoryHandle.resolve()`) — by design, the File System
  Access API never exposes a picked folder's absolute OS filesystem path,
  only its own `.name` (the last path segment). "Path" in AC-1/the wave
  gate's top-panel criterion is therefore satisfied by the folder's `name`
  together with its relative-path identity as the browsing root (`./`) —
  not a fabricated absolute path. See TDD for the exact top-panel
  presentation decision.
