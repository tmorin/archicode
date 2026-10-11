---
title: Standalone Editor — Load & Browse
status: active
owner: run-0008
date: 2026-10-04
related:
  - docs/wav/wav-003-standalone-workspace-editor/wav-003-standalone-workspace-editor.md
  - docs/wav/wav-003-standalone-workspace-editor/run/run-0008-standalone-editor-load-and-browse/prd-0008-standalone-editor-load-and-browse.md
type: tdd
run: 8
wave: 003
---

# Standalone Editor — Load & Browse

# Summary

Ship `src/main/resources/editor-webapp/standalone.html` as a brand-new,
single, self-contained file (inline `<style>`/`<script>`, no build step, no
external network reference) that a person opens directly via `file://` in
a Chromium-based browser. It picks a workspace folder with
`showDirectoryPicker()`, persists the resulting
`FileSystemDirectoryHandle` in IndexedDB (via `structuredClone`-compatible
`put`, not `JSON.stringify`) so a later load re-requests permission on the
same handle instead of prompting a fresh picker, and provides an explicit
close action that discards the stored handle. It parses `workspace.yaml`
and every manifest file under `settings.manifests.paths` with a hand-
written YAML-subset parser (not a vendored third-party library — see
DEC-2) into an in-memory model that mirrors the real Java domain
(`Workspace`/`Settings`/`Manifest`/`Element`/`Relationship`), resolves
every relationship's `destination` against a recursively-built element
index (flagging unresolved ones as dangling), and renders a read-only
three-panel shell: a top panel (folder identity, close action), a left
panel (Settings entry; a two-branch, collapsible, clickable Elements tree;
a Files list), and a center panel that shows the current selection's
read-only detail (settings, raw YAML, or an element's qualitative/
quantitative information with a placeholder diagram area and clickable
relationship navigation).

# Scope

In scope: everything in PRD FR-1 through FR-16 — folder pick/persist/close,
workspace+manifest parsing, element indexing and relationship resolution
(including the recursive nested-element case), the three-panel read-only
shell, and the baseline parse-failure error state.

Out of scope: any edit/create/delete/save (W-3, W-4); real diagram
rendering (whole-wave non-goal); any browser without the File System
Access API; any change to wav-002's server-backed editor code.

# PRD Traceability

| PRD ID | TDD item |
|---|---|
| GOAL-1/US-1/AC-1–4 | DEC-1 (shell layout), IMP-1, FLOW-1 |
| GOAL-2/US-5/AC-11–12 | DEC-3 (IndexedDB handle persistence), DEC-4 (permission re-grant), FLOW-2, FLOW-3 |
| GOAL-3/US-2/AC-5–6 | DEC-5 (element index + dangling resolution), FLOW-4 |
| US-3/AC-7–8 | DEC-6 (element view), FLOW-5 |
| US-4/AC-9–10 | DEC-7 (settings/file views) |
| FR-1–3 | IMP-1, DEC-3, DEC-4 |
| FR-4–7 | DEC-2 (YAML parser), DEC-5, IMP-1 |
| FR-8–10 | DEC-1, DEC-5b (cross-manifest parent attachment), DEC-8 (tree nesting rules) |
| FR-11–12 | DEC-7 |
| FR-13–14 | DEC-6 |
| FR-15 | DEC-9 (in-memory-only navigation state) |
| FR-16 | DEC-10 (parse-failure error state) |
| NFR-1 | CON-1 |
| NFR-2 | Reliability/Performance/Scalability section, ASM-5 |
| NFR-3 | CON-2 |
| NFR-4 | DEC-6 (dangling badge, non-clickable) |
| TC-1 | DEC-5 |
| TC-2 | DEC-2 |
| TC-3 | DEC-3, CON-4 |
| TC-4 | DEC-11, ASM-1 |

# Technical Goals

- **TG-1**: A single HTML file, openable via `file://`, with zero external
  dependencies and zero build step.
- **TG-2**: An in-memory data model that mirrors the real Java domain
  model's field names, nesting rules, and reference/resolution semantics
  closely enough that a person familiar with the Java code recognizes it.
- **TG-3**: A folder-handle persistence mechanism that survives a full page
  reload and is explicitly revocable.
- **TG-4**: A read-only three-panel UI satisfying every P1 wave-gate
  criterion, verifiable by a manual `file://` walkthrough against
  `.custom`.

# Non-Goals

- Any framework, bundler, package manager, or CDN-hosted library.
- A general-purpose YAML parser; only the subset `.custom`'s real
  manifests use (see DEC-2, CON-5).
- Editing, creating, deleting, or persisting changes to any file.
- Reproducing real PlantUML viewpoint rendering.

# Assumptions

- **ASM-1**: The picked folder's own absolute OS path is never exposed by
  the File System Access API (confirmed via MDN:
  `FileSystemHandle.name`/`FileSystemDirectoryHandle.resolve()` — see
  PRD TC-4); the top panel's "path" is therefore the folder's `name` plus
  its identity as the browsing root, not a fabricated absolute path
  (DEC-11).
- **ASM-2**: `.custom` has no genuinely dangling relationship today (PRD
  Q-2); Stage 11 verification uses a deliberately-broken synthetic copy to
  exercise AC-6, not `.custom` as shipped.
- **ASM-3**: Two distinct, differently-shaped `kind` vocabularies exist and
  must not be confused: (a) a manifest's own `header.kind` is the
  fully-qualified `ManifestKind` id, `"archicode.morin.io/" + <id>` (e.g.
  `"archicode.morin.io/system"`, `"archicode.morin.io/person"` — confirmed
  against `ManifestKind.getId()` and live in every real file under
  `.custom/manifests/*.yaml`); (b) every element nested inside a
  manifest's `content.elements` carries its own *bare* `kind`
  discriminator string (`"system"`, `"group"`, `"solution"`, `"person"`,
  `"container"`, `"component"`, `"environment"`, `"node"` — confirmed
  against `ApplicationElement`/`SystemElement`/`ContainerElement`/
  `SolutionElement`/`TechnologyElement`/`EnvironmentElement`/
  `NodeElement`'s `@JsonTypeInfo(property = "kind")`, and visible in
  `.custom/manifests/app.platform.authx.yaml`'s nested
  `- kind: "container"` entries). The JS mirror parses (a) via DEC-5's
  prefix-stripping table and switches on (b) directly — never the other
  way around.
- **ASM-4**: The real `ManifestKind.SYSTEM_GROUP` enum constant is paired
  with `SolutionGroup.class` in `ManifestKind.java` (looks like an
  upstream copy-paste bug against `SYSTEM_GROUP`/`CONTAINER_GROUP`'s
  sibling entries), but every group kind's *functional* nesting rule is
  defined by the `@JsonSubTypes`-annotated marker interfaces, not by that
  pairing — `SystemElement`'s subtypes are `Container`/`SystemGroup`
  regardless. The JS mirror follows the marker-interface nesting rules
  (DEC-8), not the enum's `type` field, so this pre-existing Java-side
  oddity does not propagate into the mirror. Flagged to the wave as an
  out-of-scope finding (not this run's to fix).
- **ASM-5**: `.custom`'s manifest count (~24 files, under ~120 elements
  total) is representative of the realistic single-workspace scale this
  run must stay responsive at (NFR-2); no pagination/virtualization is
  designed for.

# Constraints

- **CON-1**: No external script/stylesheet/font/CDN reference (NFR-1) —
  verified by grep for `http://`/`https://`/`<link`/`<script src` in the
  shipped file.
- **CON-2**: Chromium-only; `showDirectoryPicker`/`indexedDB` absence is
  detected and surfaced as a plain message, not silently broken (NFR-3).
- **CON-3**: `requestPermission()` must only ever be called from inside a
  user-gesture event handler (click), never from a page-load callback
  (confirmed via MDN research, PRD Q-1) — DEC-4.
- **CON-4**: `FileSystemDirectoryHandle` must be stored via IndexedDB's
  structured-clone-based `put`, never `JSON.stringify` (it is not
  JSON-serializable) — DEC-3.
- **CON-5**: The vendored YAML parser only needs to support what
  `.custom`'s real manifests and `workspace.yaml` actually use: block
  mappings, block sequences (including sequences of maps), double- and
  single-quoted and plain scalars, comments (`#`), and YAML 1.1-style
  boolean literals (`yes`/`no`/`true`/`false`) since
  `app.platform.authx.yaml` uses `audit-event-publication: yes`. Anchors,
  aliases, multi-document streams, flow collections (`{}`/`[]`), and block
  scalars (`|`/`>`) are not required by any real fixture and are explicitly
  unsupported (DEC-2, Deferred Work).

# Current State

No `standalone.html` exists yet; `src/main/resources/editor-webapp/`
currently holds only wav-002's server-backed `index.html` and its assets,
which this run does not read, modify, or depend on. The Java domain model
this run mirrors lives under `src/main/java/io/morin/archicode/{manifest,
resource/{workspace,element}}/**`; this run does not modify any Java
source.

# Proposed Design

**DEC-1 — Single-file, vanilla-DOM, three-panel shell.** No framework. A
top-level `AppState` object (`{folder: {handle, name}|null, workspace,
manifestFiles: [{relPath, rawText, header, content, parsed, error}],
index: {application: Map, technology: Map}, selection:
{kind: 'none'|'settings'|'file'|'element', key}}`) is the single source of
truth; every render function reads from it and re-renders its own panel
region via `innerHTML` template strings plus one delegated `click`
listener per panel (no reactive framework). Rationale: the PRD's scope is
read-only this phase, so a full reactive re-render on every state change is
cheap and simple (KISS) — W-3's own TDD can revisit this if editable forms
need finer-grained updates.

**DEC-2 — Hand-written YAML-subset parser, not a vendored library.**
Resolves PRD TC-2. A general-purpose vendored parser (e.g. inlining a
minified js-yaml) would be hundreds of KB of opaque, unaudited text pasted
into a single HTML file for a feature set (anchors, flow collections,
multi-document, tags) nothing in this codebase's real manifests uses.
Instead, write a small (~150-250 line) recursive-descent parser scoped to
CON-5's subset: indentation-based block mappings/sequences, scalar type
coercion (quoted string, plain string, `true`/`false`/`yes`/`no` →
boolean, integer/decimal → number, `null`/`~`/empty → null), and `#`
comments. Verified directly against every real file under `.custom/
manifests/*.yaml` and `.custom/workspace.yaml` as part of Stage 11 (parse
each one, diff key structure against a manual reading). Rejected
alternative: `js-yaml` vendored inline — rejected per TC-2's own framing,
disproportionate to the actual format surface used.

**DEC-3 — IndexedDB handle persistence.** One database
(`archicode-standalone-editor`, version 1), one object store (`handles`,
no key path — `put(handleRecord, 'workspace')`), storing
`{handle: FileSystemDirectoryHandle}` directly (structured-clone-native;
browsers support cloning a `FileSystemDirectoryHandle` into IndexedDB per
the File System Access API spec). No `JSON.stringify` anywhere near the
handle (CON-4).

**DEC-4 — Permission re-grant flow (resolves PRD Q-1/FR-2).** On load: if
a handle is stored, call `handle.queryPermission({mode: 'read'})` (no
gesture needed). If `'granted'`, reopen immediately, no UI prompt. Else,
render the shell in a "click to reopen `<name>`" state (a single visible
button, not the full `showDirectoryPicker()` flow); only that button's
click handler calls `handle.requestPermission({mode: 'read'})` (CON-3). If
that still doesn't grant, or no handle is stored, fall back to the initial
"pick a folder" state (`showDirectoryPicker()` behind its own button,
itself a user gesture).

**DEC-5 — Element indexing and relationship resolution (resolves PRD
FR-6/FR-7, mirrors `ElementIndexFactory`/`ElementIndexUtilities`).**
First, parse `header.kind` (ASM-3's fully-qualified vocabulary — e.g.
`"archicode.morin.io/system"`): strip the `archicode.morin.io/` prefix and
map the remaining hyphenated id to `{category, rootKind}` via a static
table mirroring `ManifestKind`'s ten constants — `component`→
{application, `component`}, `container`→{application, `container`},
`container-group`→{application, `group`}, `person`→{application,
`person`}, `solution`→{application, `solution`}, `solution-group`→
{application, `group`}, `system`→{application, `system`}, `system-group`→
{application, `group`} (per ASM-4/DEC-8, the JS mirror follows the
marker-interface nesting rule here, not `ManifestKind.java`'s mispaired
`SYSTEM_GROUP(SolutionGroup.class, …)` type field), `environment`→
{technology, `environment`}, `node`→{technology, `node`}. `rootKind`
becomes the manifest-root element's own bare `kind` field (ASM-3's second
vocabulary) so DEC-8's tree-nesting switch treats a manifest-root element
identically to a nested one. Then, for each parsed manifest, compute its
root reference
(`header.parent ? header.parent + '.' + content.id : content.id`) exactly
as `ManifestParser.parse` does, index `content` (minus `elements`) at that
reference. Then recursively walk `content.elements` (if present): for each
nested element object, its reference is `parentReference + '.' +
nested.id`; index it, then recurse into *its* own `elements` array if
present (covers `container→component`, `node→node`, etc. at any depth).
Build two separate `Map<reference, elementRecord>` indexes — one for every
manifest whose `header.kind` is an application kind, one for technology —
matching the real code's category split (`Application.class` vs.
`Technology.class`). After indexing, walk every indexed element's
`relationships`; for each, look up `destination` in the *same-layer*
index (application relationships only ever resolve against the
application index, technology against technology — never cross-layer,
matching the real model: `Relationship` lives on `AbstractElement`
regardless of layer, but `destination` strings in `.custom` never cross
layers); mark `resolved: true/false` on the relationship record
accordingly.

**DEC-5b — Cross-manifest parent attachment (resolves PRD FR-8's actual
tree shape; mirrors `ElementIndexFactory.create()`'s second loop,
verified directly against `.custom`).** `content.elements` recursion
(DEC-5) only covers nesting declared *inside the same manifest file*. In
`.custom`, most real nesting is cross-file instead: e.g.
`app.platform.yaml` (the `platform` solution) declares no
`content.elements` at all, while `app.platform.authx.yaml` (the `authx`
system) carries `header.parent: "platform"` and is a wholly separate
file — the real Java `ElementIndexFactory` attaches it as a child of
`platform` by looking up `header.parent` in the *already-built* index
and, if found, pushing the candidate element into that parent's own
mutable `elements` collection (`parent.getElements().add(...)`); if
`header.parent` is absent, or present but does not resolve to any
indexed element, the candidate stays a top-level root instead. The JS
mirror does the equivalent after DEC-5's indexing pass completes: for
every manifest-root `ElementRecord` whose originating `header.parent`
was set, look up that parent string in the *same-layer* index; if found,
push the record into the found parent's own `children` array (and do
*not* also list it in `workspace.application.elements`/
`workspace.technology.elements`); otherwise (no `header.parent`, or it
didn't resolve) leave it in that top-level array. `workspace.application
.elements`/`workspace.technology.elements` (CTR-1) therefore hold only
the roots that end up with no resolved parent — in `.custom` this is
`platform`, `patient`, `idp`, `helpspot`, `hcpro`, `collaborator`,
`primarysys`, `epr` (application) and `ref`, `epr` (technology) — not
one entry per manifest file. Every other manifest-root element (e.g.
`authx`, `iam`, `portal`, `scp`, `epracl`, `fhirvault`, `auditslogs`)
is reachable only by walking down from its resolved parent's `children`,
exactly as the real CLI's generated views show it.

**DEC-6 — Element view (read-only, resolves PRD FR-13/FR-14).** Center
panel for an Elements-tree selection renders, top to bottom: (a) an empty
`<div class="diagram-placeholder">` with fixed min-height and a static
"diagram view is not available in this phase" caption — never populated
with real SVG/PlantUML content (whole-wave non-goal); (b) qualitative
block — id, name, description, qualifiers (chips), tags (key/value list),
relationships (list of `label (qualifiers) → destination`, each as a
`<button>` if `resolved`, plain disabled text with a "dangling" badge
otherwise); (c) quantitative block — relationship count
(`relationships.length`), and, only for a parent kind (`system`,
`container`, `solution`, `group` variants, `environment`, `node`), direct
child count (`elements.length`). Clicking a resolved relationship's button
sets `AppState.selection` to that destination element and re-renders both
the center panel and the left panel's tree (expanding any collapsed
ancestor chain down to the new selection and marking it active) — FR-14.

**DEC-7 — Settings and Files views (resolves PRD FR-11/FR-12).** Settings
selection renders a read-only, labeled dump of
`settings.manifests.paths`, `settings.relationships.default-synthetic-
label`, `settings.views.{path,labels,properties}`, and
`settings.facets.{globalEnabled,directoryNameTemplate,customs}` — plain
labeled rows, not raw JSON, so field names read like the PRD's FR-12 list
rather than internal JS state. A Files selection renders that manifest's
original raw text (captured verbatim at parse time, never regenerated
from the parsed model, so round-tripping concerns don't arise this phase)
in a read-only `<pre>`/`<textarea readonly>`.

**DEC-8 — Tree nesting rules (resolves PRD FR-8, mirrors the
`@JsonTypeInfo`-annotated marker interfaces, not `ManifestKind`'s `type`
field per ASM-4).** Applications branch: top-level `Application.elements`
nodes are rendered by their own `kind` (`solution`, `system`, `group`,
`person`); a top-level `group` node's children come from its own
`elements`, the same kind set as `Application.elements` itself
(`solution`|`system`|`group`|`person` — `ApplicationGroup implements
Parent<ApplicationElement>`); a `solution`/`solution`-flavored `group` node's children come
from its own `elements` (kind `system`|`group`); a `system`/`system`-
flavored `group` node's children come from its own `elements` (kind
`container`|`group`); a `container`/`container`-flavored `group` node's
children come from its own `elements` (kind `component`|`group`);
`component`, `person` are always leaves. Environments branch:
`Technology.elements` (kind `environment`) → `Environment.elements` (kind
`node`) → `Node.elements` (kind `node`, recursively, since `Node`
implements both `EnvironmentElement` and `NodeElement`). A `group` node is
rendered as a plain collapsible tree node (no special visual kind label
beyond its own `name`/`id`, since the domain model does not distinguish
group levels at the UI's nesting-rendering concern).

**DEC-9 — In-memory-only navigation state (resolves PRD FR-15).** Only the
directory handle persists (DEC-3); `AppState.selection` always resets to
`'none'` (default workspace-wide view) on a fresh load, even when the
folder reopens automatically.

**DEC-10 — Parse-failure error state (resolves PRD FR-16).** Wrap each
manifest file's parse in a try/catch; a failure records
`{relPath, error: message}` in `AppState.manifestFiles` instead of
aborting the whole load, and the Files list marks that entry with an error
badge (clicking it shows the raw text plus the error message, not a
crash). A missing/unparseable `workspace.yaml` is fatal to the open
attempt: show a single visible error panel naming the file and reason,
leaving the top panel's picker/close actions available so the person can
try a different folder.

**DEC-11 — Top-panel "path" presentation (resolves PRD TC-4/ASM-1).** The
top panel shows the handle's `name` as the folder's identity (e.g.
`.custom`) and, immediately beside it, a literal `/` to represent the
folder's own root position — not a fabricated OS absolute path. A `title`
attribute tooltip states plainly that browsers do not expose an absolute
filesystem path. This satisfies the wave gate's "name and path" wording
without inventing data the platform cannot provide.

# Repository Impact

- **IMP-1**: Add `src/main/resources/editor-webapp/standalone.html` (new
  file). No existing file is modified; no Java source, `pom.xml`, or build
  config changes. No new Maven dependency (the file has none — it is a
  static classpath resource like wav-002's `index.html`, but unlike that
  one, nothing serves it — it is opened directly from the filesystem, so
  it does not even need `EditorHttpServer` routing).

# Canonical Impact

- **CI-arc-1**: None. This run adds a browser-side artifact that mirrors
  existing Java domain concepts for display purposes; it does not change,
  extend, or reinterpret the architecture those concepts describe.
- **CI-dom-1**: None. No enforced invariant is added, changed, or ratified
  — the client-side "dangling relationship" flag is a read-only UI signal,
  not a new validation rule enforced anywhere in the Java CLI or its
  schemas.

# Data Model and Contracts

- **CTR-1**: `AppState` shape (JS, in-memory only, never persisted beyond
  the folder handle):
  ```
  AppState = {
    folder: { handle: FileSystemDirectoryHandle, name: string } | null,
    permissionState: 'granted' | 'needs-click' | 'none',
    // `workspace.views` (Set<View>) is intentionally excluded from this
    // mirror — this phase renders no diagrams/viewpoints (whole-wave
    // non-goal), so there is nothing for it to drive.
    workspace: { application, technology, settings, styles, formatters } | null,
    manifestFiles: Array<{
      relPath: string, rawText: string,
      header: {kind, version, parent} | null,
      content: object | null,
      error: string | null
    }>,
    index: {
      application: Map<reference:string, ElementRecord>,
      technology: Map<reference:string, ElementRecord>
    },
    selection: { kind: 'none'|'settings'|'file'|'element', key: string | null },
    expanded: Set<reference:string>   // tree branch expand/collapse state
  }
  ElementRecord = {
    reference: string, kind: string, id, name, description,
    qualifiers: string[], tags: Record<string,string>,
    relationships: Array<{destination, label, qualifiers, tags, resolved: boolean}>,
    children: ElementRecord[], sourceFile: string
  }
  ```
- **CTR-2**: IndexedDB schema — database `archicode-standalone-editor`
  v1, object store `handles` (no keyPath), single record at key
  `'workspace'` holding `{handle: FileSystemDirectoryHandle}`.

# Interfaces and Behavior

- **IF-1**: Top panel — folder name + `/` (DEC-11), close button (visible
  only when a folder is open; calls `indexedDB` delete + resets
  `AppState` to initial), "pick a folder"/"click to reopen" button
  (visible only when no folder is open).
- **IF-2**: Left panel — Settings row (click → `selection =
  {kind:'settings'}`); Elements tree with two top-level collapsible
  headers "Applications"/"Environments", each toggling its own subtree's
  visibility independent of the other and of any deeper node's own
  expand state; Files list, one row per `manifestFiles` entry, click →
  `selection = {kind:'file', key: relPath}`.
- **IF-3**: Center panel — pure function of `selection`: `'none'` → a
  minimal workspace-wide placeholder (not specified further by the PRD,
  kept to a one-line "select an item on the left" message); `'settings'`
  → DEC-7's settings view; `'file'` → DEC-7's raw YAML view; `'element'`
  → DEC-6's element view.

# Flows and Processing Logic

- **FLOW-1 (open/parse)**: picker or reopen resolves a handle → read
  `workspace.yaml` (fatal error path per DEC-10 on failure) → for each
  `settings.manifests.paths` dir, list direct children matching
  `.yaml`/`.yml` → parse each (per-file error path per DEC-10) → build
  `manifestFiles` → build `index` (DEC-5) → render shell with `selection:
  {kind:'none'}`.
- **FLOW-2 (reload/reopen)**: page load → read IndexedDB → if handle
  present, `queryPermission` → `'granted'` → FLOW-1 immediately; else
  render "click to reopen" (DEC-4) → on click, `requestPermission` →
  success → FLOW-1; failure → initial picker state.
- **FLOW-3 (close)**: click → delete IndexedDB record → reset `AppState`
  → render initial picker state.
- **FLOW-4 (relationship resolution)**: after `index` is built, iterate
  every indexed element's `relationships`, set `resolved` per DEC-5's
  same-layer lookup.
- **FLOW-5 (relationship navigation)**: click a resolved relationship
  button in the element view → `selection = {kind:'element', key:
  destinationReference}` → expand every ancestor reference of that key in
  `AppState.expanded` → re-render left + center panels.

# Reliability/Performance/Scalability

Single-pass synchronous parse/index on open/reload; at `.custom`'s real
scale (ASM-5) this is expected to complete well under NFR-2's sub-second
bar on a typical laptop — no async chunking or web worker is designed for
this phase. A parse failure in one manifest never prevents the rest of the
workspace from loading (DEC-10).

# Security and Privacy

All data stays local to the browser tab; nothing is sent over the network
(CON-1). The File System Access API's own permission model (per-origin,
revocable, no absolute-path leakage — ASM-1) is the only access-control
layer; this run adds none of its own. The close action (FR-3) is the
user's explicit way to revoke the stored handle from this tool's own
IndexedDB record — it does not revoke the browser's own underlying grant,
which is the browser's business, not this app's.

# Observability and Verification

No logging/telemetry (a static local file has nowhere to send it). Manual
`file://` walkthrough against `.custom` (Stage 11) is this run's
verification method — see PRD's AC list and the wave's own P1 gate
criteria, which this TDD's DEC items are each traced to.

# Deployment and Rollout

None — a static resource added to the repository; nothing to deploy,
version, or roll back beyond a normal commit. Not wired into any Maven
packaging beyond being a file under `src/main/resources/editor-webapp/`.

# Risks and Tradeoffs

- **RISK-1**: A hand-written YAML-subset parser (DEC-2) could silently
  mis-parse a real file if `.custom` uses a YAML feature not covered by
  CON-5's enumerated subset. Mitigation: Stage 11 parses every real file
  under `.custom/manifests/*.yaml` and `.custom/workspace.yaml` and
  manually diffs the result against a human reading of each; any gap
  found there is fixed before sign-off, not deferred silently.
- **RISK-2**: `innerHTML`-template re-rendering (DEC-1) means every click
  rebuilds affected DOM subtrees instead of patching diffs; acceptable at
  this phase's data scale (ASM-5) and read-only interaction surface
  (NFR-2), but W-3's editable forms may need a different update
  granularity (noted for that run's own TDD, not re-solved here).
- **RISK-3**: Chromium-only (whole-wave accepted risk, not re-litigated
  here).

# Open Questions

None outstanding — PRD Q-1/Q-2 were resolved before this TDD was drafted
(see TDD DEC-4, DEC-11, ASM-1, ASM-2); TC-4's path-exposure question is
resolved by DEC-11.

# Deferred Work

- **DEF-1**: YAML anchors/aliases, multi-document streams, flow
  collections, and block scalars (`|`/`>`) — not needed by any real
  fixture today; add to the hand-written parser if a future manifest
  needs them (CON-5).
- **DEF-2**: Any async/chunked parsing for a workspace much larger than
  `.custom`'s real scale — out of scope until a concrete need appears
  (RISK-ASM-5).
- **DEF-3**: `ManifestKind.SYSTEM_GROUP`'s `type` field mismatch
  (ASM-4) — a pre-existing Java-side oddity, unrelated to this run's
  scope; flagged to the wave rather than fixed here.

# File Placement and Frontmatter

New file: `src/main/resources/editor-webapp/standalone.html`, exactly
where the wave manifest's `likely_paths` names it. No other file is
created or modified by this run.
