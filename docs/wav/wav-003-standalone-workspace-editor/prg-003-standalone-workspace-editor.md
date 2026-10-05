---
type: prg
status: completed
date: 2026-10-04
related:
  - docs/wav/wav-003-standalone-workspace-editor/wav-003-standalone-workspace-editor.md
wave: 003
---

# Progress Log: Standalone Workspace Editor

## Log

- 2026-10-04: Wave drafted and proposed. Confirmed with the user that this
  wave is fully independent of `docs/wav/wav-002-manifest-web-editor` (no
  shared code, no supersession).
- 2026-10-04: User specified the concrete UI layout — a top panel (open
  folder's name/path, close action), a left panel (workspace Settings
  entry, an Elements tree split into Applications/Environments, a Files
  view of manifest files by relative path), and a center panel (default
  overview view, or the selected element's view). Folded into W-1 (shell +
  read-only browse) and W-2 (what the center panel actually renders) scope
  and exit evidence.
- 2026-10-04: User refined the center panel further: clicking an Elements
  item shows an "element view" (read-only view with a switchable
  overview/detailed/deep diagram plus qualitative/quantitative info, and a
  separate edition view with forms); clicking Settings or a Files item
  also renders in the center panel (settings form; raw-YAML file editor),
  not inline in the left panel as first drafted. Renamed phase P3 to
  "Editing Surfaces" (slug `standalone-editor-editing-surfaces`) to cover
  all three now-editable surfaces (element edition forms, settings form,
  raw YAML editor) staying in sync with one in-memory model; added that
  sync requirement as a Risk for W-3's own TDD to resolve.
- 2026-10-04: User decided the diagram area should NOT reproduce the
  generated PlantUML views (overview/detailed/deep viewpoint grooming) —
  it ships as an inert placeholder instead. Dropped the dedicated `W-2`
  run and its `Dynamic Views & Navigation` phase entirely (before any
  execution started); element-to-element navigation moves to a clickable
  relationships list in the read-only view's qualitative information,
  folded into `W-1`. Renumbered the remaining phases (P2 = Editing
  Surfaces, P3 = Create/Delete/Persistence) and re-pointed `W-3`'s
  `depends_on` from `[W-2]` to `[W-1]`; `W-2` stays retired rather than
  reused, per the wave template's never-renumber rule for `W-` ids.
  Updated the business case's Vision/Problems accordingly.

- 2026-10-04: complete-wave invoked. Wave status set to `in-progress`.
  Batch 1 computed: `W-1` (`standalone-editor-load-and-browse`, phase P1,
  depends_on: none) — the only run with its dependencies satisfied.
  Allocated run number 0008, created
  `docs/wav/wav-003-standalone-workspace-editor/run/run-0008-standalone-editor-load-and-browse/`
  with its status file (`status: proposed`), and wrote `run: 8` back into
  the wave manifest. No same-batch overlap to check (batch size 1).
  Dispatching `W-1` → `run-0008` to a `run-executor` subagent at the
  default (`standard`) tier. Concurrency: 1.

- 2026-10-04: `W-1`/run-0008 reported complete. Verified from disk, not
  from the subagent's report: `run-0008-standalone-editor-load-and-browse.md`
  status is `completed`; its pln's `execution_manifest.status` is `done`
  (recommendation `proceed`, both tasks `done`); `git status` shows only
  the new `src/main/resources/editor-webapp/standalone.html` (1228 lines,
  no external `src=`/`href=` refs — confirmed self-contained) and this
  run's own directory touched — nothing outside `likely_paths`, no
  wav-002 or Java source touched. No same-batch overlap to check (batch
  size 1).
- 2026-10-04: Phase P1 gate verified against the real file (code
  inspection, since the native directory-picker dialog itself cannot be
  driven by browser automation in this environment — same limitation the
  run-executor hit). All five criteria hold:
  1. Top panel, left-panel pure nav (Settings entry, Applications/
     Environments tree, Files list) — confirmed (`renderTopPanelHtml`,
     `renderTreeBranchHtml`, lines ~874-950).
  2. Element click → read-only view with placeholder diagram
     (`.diagram-placeholder`, "Diagram view is not available in this
     phase"), qualitative info with relationships rendered as a clickable
     `goto-element` button when resolved vs. a non-interactive
     `dangling`-badged span otherwise (confirmed `goto-element` handler
     also updates `AppState.selection` and expands tree ancestors — tree
     selection sync holds), and quantitative info — confirmed.
  3. Settings entry and Files items render read-only in the center panel
     (`renderSettingsViewHtml`, file-content view) — confirmed.
  4. Auto-reopen wiring (`tryAutoReopen` called from
     `DOMContentLoaded`, reading a stored handle and using
     `queryPermission`/`requestPermission` per the gesture-requirement
     research in the run's own PRD Q-1) — confirmed by code inspection;
     the actual cross-reload behavior needs a human with a real Chromium
     browser to confirm interactively (flagged by the run, not newly
     found here).
  5. Close action clears the stored handle (`closeFolder`, wired to the
     top panel's Close button) — confirmed.
  **Caveat on criterion 1 (not a failure):** the top panel shows the
  folder's *name*, not a filesystem *path* — the File System Access
  API's `FileSystemDirectoryHandle` does not expose an absolute path by
  design (a real, documented platform constraint, not a shortcut), and
  the run's TDD (ASM-1/DEC-11) substitutes the folder name plus a
  browsing-root indicator. Judged as satisfying this criterion's intent
  (visual confirmation of which folder is open); recorded here rather
  than silently treated as a literal pass.
- 2026-10-04: Canonical discharge for P1 checked: run-0008's TDD declares
  CI-arc-1 and CI-dom-1 both `None`, each with a stated reason (a
  browser-side display mirror changes no architecture, and the
  "dangling" flag is a read-only UI signal enforcing no new invariant).
  Both discharge trivially per the gate's own rule for a reasoned `none`.
  Gate holds. Advancing to phase P2.

## Findings

- From run-0008: the real Java `header.kind` string is prefixed
  (`"archicode.morin.io/system"`), a different shape from a *nested*
  element's bare `kind` (`"system"`) — worth remembering for any future
  run that parses manifest YAML client-side.
- From run-0008: `.custom/` as it exists today has no genuinely dangling
  relationship reference, so AC-6-style dangling-detection claims need a
  deliberately-broken synthetic fixture to verify, not `.custom` as-is.
- From run-0008: a pre-existing, out-of-scope Java bug was noticed and
  flagged via `spawn_task` (not fixed, not this wave's concern):
  `ManifestKind.SYSTEM_GROUP` appears paired with `SolutionGroup.class`
  in `ManifestKind.java` instead of `SystemGroup.class`.
- From run-0009, **corrected by run-0010**: `./mvnw test`/`verify`
  appeared to fail unconditionally in this sandbox (default JDK 21
  vs. this repo's pinned Java 25) — run-0010 showed this is conditional
  on whether `.sdkmanrc`'s JDK was sourced in that shell first, not a
  hard environment limitation: after sourcing it, `./mvnw -q test` ran
  clean (30/30 test classes, 0 failures). Future runs should source
  `.sdkmanrc` before any Maven invocation rather than assume the suite
  is unrunnable here.
- From run-0010: the delete-dangling scan deliberately covers
  `Relationship` objects only — a `node`'s `applications` array
  referencing a deleted application element is NOT cleaned up by delete.
  Accepted and documented (FR-12/DEF-2) since this wave's own phase-table
  wording said "relationship", not this field; worth a real fix if a
  future wave extends delete further.
- From run-0010: `.custom/` has no real group or person element nested
  under another group, so the nesting-level rule used by element
  creation (DEC-3) has zero real-fixture coverage — verified only against
  a constructed synthetic fixture. Flagged as a residual risk (RISK-1 in
  run-0010's TDD), same class of gap as run-0008's dangling-relationship
  fixture limitation.

## Lessons Learnt

- From run-0008: when verifying a hierarchical structure built from
  cross-file parent/child stitching, aggregate counts (file count,
  element count) can stay identical even when the tree shape is wrong —
  only rendering and eyeballing the actual hierarchy against the fixture
  caught a real flat-vs-nested bug here. Future runs touching the
  element tree should verify shape, not just counts.
- From run-0009: the Claude Browser pane cannot drive this app's real
  `file://` + File System Access API flow in this environment (the app's
  own feature-detection screen reports no support) — confirmed
  independently across both runs so far. Verification of UI behavior has
  used a Node `vm` harness that loads the real `<script>` body and drives
  it against the real `.custom` fixtures via an fs-backed
  `FileSystemDirectoryHandle` shim instead — adequate (it exercises the
  real, unmodified code), but not the live-browser click-through a human
  would eventually do. `W-4` (next) should plan for the same fallback
  rather than assume the Browser pane will work for this app, and this
  wave's final report to the user should say so plainly rather than
  imply a live-browser walkthrough happened.

## Log (continued)

- 2026-10-04: Batch 2 computed: `W-3` (`standalone-editor-editing-surfaces`,
  phase P2, depends_on: [W-1]) — now ready since W-1 is `completed`.
  `W-4` still blocked (depends on W-3). Allocated run number 0009,
  created
  `docs/wav/wav-003-standalone-workspace-editor/run/run-0009-standalone-editor-editing-surfaces/`
  with its status file (`status: proposed`), and wrote `run: 9` back
  into the wave manifest. No same-batch overlap to check (batch size 1).
  Dispatching `W-3` → `run-0009` to a `run-executor` subagent at the
  default (`standard`) tier. Concurrency: 1.
- 2026-10-04: `W-3`/run-0009's dispatch was forced to hand back mid-flight
  by a harness enforcement signal — a **mechanical** halt, not a
  deliberate blocker (no unmet gate, no escalation, nothing decided).
  Verified from disk: `run-0009-standalone-editor-editing-surfaces.md`
  status is `designing` (non-terminal); its directory holds a drafted
  PRD (`prd-0009-...md`) and an active `prg-0009-...md` with one Log
  entry (Stage 0 setup); no `pln` yet; `src/main/resources/editor-webapp/standalone.html`
  is confirmed unmodified from W-1/run-0008's shipped version (`git diff`
  empty for that path). A Stage 2 KDMLLC-review subagent it had dispatched
  was left in flight with its findings unrecoverable from this session.
  Re-dispatching a fresh `run-executor` for `W-3`/run-0009 with explicit
  instructions to **resume, not restart**: read the existing prd-0009 and
  prg-0009 first, treat the drafted PRD as real prior work rather than
  redrafting it, redispatch the lost KDMLLC review (or review it inline)
  rather than assuming its findings, then continue from Stage 3 onward.
  Concurrency: 1.
- 2026-10-04: `W-3`/run-0009's resumed dispatch reported complete.
  Verified from disk, not from the subagent's report:
  `run-0009-standalone-editor-editing-surfaces.md` status is `completed`;
  its pln's `execution_manifest.status` is `done` (6/6 tasks done, 0
  `human_required_tasks`); `git status` shows only
  `src/main/resources/editor-webapp/standalone.html` (grown 1228 → 2216
  lines) and this run's own directory — nothing outside `likely_paths`.
  No same-batch overlap to check (batch size 1).
- 2026-10-04: Phase P2 gate verified against the real file (code
  inspection — the live browser file://+File System Access flow is
  confirmed not drivable by automation in this environment, same
  limitation run-0008 hit; the run used a Node `vm` harness against the
  real functions and real `.custom` fixtures instead). All three
  criteria hold:
  1. `renderElementEditionFormHtml` is one shared template covering every
     kind's id/name/description/qualifiers/tags/relationships, plus a
     `node`-only `applications` block (`record.kind === 'node'` at
     line ~1803); every mutation commits via `commitElementEdit` —
     confirmed.
  2. Settings are editable via `commitSettingsEdit`
     (`data-action="save-settings"`); `defaultSyntheticLabel` is not
     just echoed back — it is read as the real fallback for any
     relationship with no explicit `label` (line ~673,
     `resolveRelationships`), so editing it changes relationship-list
     rendering for real, not just the settings panel's own display —
     confirmed, and non-trivial (the same substance-check applied to
     run-0008's "path" caveat; this one holds without caveat).
  3. Raw YAML is editable via `commitFileEdit`, which scratch-validates
     before ever touching live state and stores a rejected draft (with
     its error) in `rawYamlEditDraft` rather than mutating
     `AppState.manifestFiles` — confirmed; matches NFR-3.
  All three commit paths (`commitElementEdit`/`commitSettingsEdit`/
  `commitFileEdit`) converge on one `rebuildIndexAndRender()` — the "two
  editing surfaces, one model" risk from this wave's Risks section is
  resolved by construction, not just by claim.
- 2026-10-04: Canonical discharge for P2 checked: run-0009's TDD declares
  CI-arc-1 and CI-dom-1 both `None`, each with a stated reason (same
  pattern as run-0008). Both discharge trivially. Gate holds. Advancing
  to phase P3.
- 2026-10-04: Batch 3 computed: `W-4`
  (`standalone-editor-create-delete-and-save`, phase P3,
  depends_on: [W-3]) — now ready since W-3 is `completed`, and the last
  run in the wave. Allocated run number 0010, created
  `docs/wav/wav-003-standalone-workspace-editor/run/run-0010-standalone-editor-create-delete-and-save/`
  with its status file (`status: proposed`), and wrote `run: 10` back
  into the wave manifest. No same-batch overlap to check (batch size 1).
  Dispatching `W-4` → `run-0010` to a `run-executor` subagent at the
  default (`standard`) tier. Concurrency: 1.
- 2026-10-05: `W-4`/run-0010 reported complete. Verified from disk, not
  from the subagent's report: `run-0010-standalone-editor-create-delete-and-save.md`
  status is `completed`; its pln's `execution_manifest.status` is `done`
  (5/5 tasks done, 0 `human_required_tasks`); `git status` shows only
  `src/main/resources/editor-webapp/standalone.html` (grown 2216 → 3063
  lines) and this run's own directory — `git status`/`git diff` against
  `.custom/` are both empty, confirming the real fixture directory was
  never mutated despite this run doing real disk I/O during its own
  verification (it used a disposable temp copy, per its dispatch brief).
  No same-batch overlap to check (batch size 1, last batch in the wave).
- 2026-10-05: Phase P3 has no explicit gate (`gate.criteria: []`, last
  phase) — verified the WAVE'S Completion Criteria instead, against the
  real code:
  - `commitCreateTopLevelElement` (line ~1273) creates an element into an
    existing manifest (same-file child, via the existing
    `commitElementEdit`) or a brand-new one (standalone or
    cross-file-attached via `header.parent`) — confirmed.
  - `commitDeleteElement` (line ~1350) with `scanDanglingRelationshipsFor`
    computing every relationship elsewhere whose destination resolves
    into the deleted subtree, surfaced as an inline confirm/cancel before
    the delete and the affected relationships are removed together in
    one commit — confirmed. **Known, documented gap**: the scan covers
    `Relationship` objects only, not a `node`'s `applications` array
    referencing a deleted application element (the wave's own phase-table
    wording said "relationship", and the run's TDD states this
    narrower-than-ideal scope explicitly as FR-12/DEF-2 rather than
    missing it silently).
  - Save (`acquireReadWritePermission`, a `lastModified` staleness check
    that refuses the whole write on any conflict, `createWritable`/
    `removeEntry`, a new kebab-case `serializeSettingsToRaw` for
    `workspace.yaml`) — confirmed. Independently spot-checked the run's
    self-reported quoting-bug fix (`yamlStringNeedsQuoting`, line
    ~410-421): real and precisely targeted — a value shaped like
    `""%s""` (matching `.custom/workspace.yaml`'s own
    `formatters.*.qualifiers`) would otherwise have been misquoted on
    write and corrupted on the next read; the fix's own comment names the
    exact mechanism, not just "fixed a bug".
  All three Completion Criteria items hold. Canonical discharge: run-0010's
  TDD declares CI-arc-1/CI-dom-1 both `None`, with reasons — discharges
  trivially, same pattern as runs 0008/0009.
- 2026-10-05: **No run remains incomplete.** `W-1`/0008, `W-3`/0009,
  `W-4`/0010 are all `completed`; `W-2` was dropped from scope before any
  execution (recorded earlier in this log). Closing the wave out:
  `wav-003-standalone-workspace-editor.md` status set to `completed` in
  both frontmatter and manifest; `wbc-003-standalone-workspace-editor.md`
  status set to `completed`; this file's own status set to `completed`.
  `wave_manifest.sources` was empty from authoring (nothing in this
  repository's registers covered this goal) — nothing to move to
  `consumed`.
