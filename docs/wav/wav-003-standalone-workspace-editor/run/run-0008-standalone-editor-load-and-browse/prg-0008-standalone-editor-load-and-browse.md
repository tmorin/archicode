---
type: prg
status: completed
date: 2026-10-04
related:
  - docs/wav/wav-003-standalone-workspace-editor/run/run-0008-standalone-editor-load-and-browse/prd-0008-standalone-editor-load-and-browse.md
  - docs/wav/wav-003-standalone-workspace-editor/run/run-0008-standalone-editor-load-and-browse/tdd-0008-standalone-editor-load-and-browse.md
  - docs/wav/wav-003-standalone-workspace-editor/run/run-0008-standalone-editor-load-and-browse/pln-0008-standalone-editor-load-and-browse.md
run: 8
wave: 003
---

# Progress Log: Standalone Editor — Load & Browse

## Log

- 2026-10-04: Run dispatched by `complete-wave` as wave 003's `W-1`
  (phase P1, no dependencies). Directory and status file (`status:
  proposed`) already existed on dispatch; invoking `complete-run` to take
  it through PRD/TDD/pln and implementation autonomously, per the wave's
  `delegation: standard` tier. Status set to `designing`. Document profile
  settled as `PRD+TDD+pln` (default for product-facing work — this run's
  scope is genuinely contestable UX: panel layout, what "dangling"
  resolution looks like, exact persistence semantics — not merely
  technical, so it doesn't fit `TDD+pln`'s infra-only bar).
- 2026-10-04: PRD drafted (`prd-0008-standalone-editor-load-and-browse.md`,
  9-section format, GOAL/US/AC/FR/NFR/Q/TC numbering). KDMLLC review
  dispatched to a `standard`-tier subagent; applied its S2/S3 findings
  directly: FR-6 rewritten to add the recursive nested-element reference
  rule (manifest-root pass + recursive `content.elements` walk, mirroring
  real `ElementIndexFactory`/`Workspace.Utilities.walkDown`) — without it
  AC-5/AC-6 would fail against `.custom`'s real nested containers; FR-8's
  application nesting chain fixed to drop a non-existent "component
  group" level (`Component` is always a leaf); FR-5/FR-9 clarified as
  non-recursive directory discovery, matching `ManifestParser`; added
  FR-16 for a baseline invalid-workspace/unparseable-manifest error state.
  Open questions Q-1 (FS Access API permission-regrant gesture
  requirement) and Q-2 (whether `.custom` has a real dangling reference)
  dispatched/resolved — see Findings.
- 2026-10-04: TDD drafted (`tdd-0008-standalone-editor-load-and-browse.md`),
  grounded directly against the real Java domain model (read `Manifest`,
  `ManifestParser`, `ManifestConverter`, `ManifestKind`, `Settings`,
  `AbstractElement`, `Relationship`, every application/technology element
  class and its `@JsonTypeInfo`/`@JsonSubTypes` marker interface,
  `ElementIndexUtilities`) and against every real file under
  `.custom/manifests/*.yaml`. KDMLLC review dispatched to a `standard`-
  tier subagent, which cross-checked the TDD's claims against that same
  Java source and fixtures; applied its one S3 and one S2 finding
  directly: DEC-5 was missing the rule for parsing a manifest's own
  `header.kind` (the fully-qualified `"archicode.morin.io/<id>"` string)
  into {category, root `kind`} — without it the design could not parse
  a single real `.custom` file; added a static mapping table mirroring
  `ManifestKind`'s ten constants, and split ASM-3 to name both `kind`
  vocabularies (manifest-root vs. nested) explicitly so they aren't
  conflated again. DEC-8 was missing the top-level `group` node's
  children-kind rule; added. Applied a cosmetic S0 fix (CTR-1 now notes
  `workspace.views`' intentional exclusion). TDD's own Open Questions
  section landed with none outstanding (PRD Q-1/Q-2 already closed).
- 2026-10-04: Stage 7 PRD/TDD consistency check run directly (this
  session's own integrative judgment over two documents it just wrote,
  not dispatched). Found and fixed one imprecise traceability mapping:
  the PRD Traceability table had bulk-mapped `NFR-1–4` to `CON-1–4`, but
  only `NFR-1`/`NFR-3` actually correspond to a `CON` item — `NFR-2` maps
  to the Reliability section/`ASM-5`, `NFR-4` to `DEC-6`. Corrected the
  table to map each `NFR`/`TC` individually rather than by range. No
  other inconsistency found; every PRD `FR`/`NFR`/`TC` traces to a real
  TDD item and no TDD assumption contradicts a PRD requirement.

- 2026-10-04: pln drafted (`pln-0008-standalone-editor-load-and-browse.md`,
  2 tasks: task-001 data engine, task-002 UI, strictly sequential — no
  parallel groups, matching the wave's own documented "largest concurrent
  batch: 1"). Noted the autonomy override explicitly in the plan's own
  text per `complete-run`'s instruction; no task carries `risk: critical`
  or `human_review: required`, so the override is not actually exercised.
  Run status set to `planned`. Stage 9 re-check (done directly, not
  dispatched): every `task_catalog` `source_requirements` entry traces to
  a real PRD/TDD ID (no invented scope); `likely_files` names the one new
  file the TDD's own File Placement section names. No blocking gaps
  carried forward.

- 2026-10-04: Run status set to `in-progress`; pln `execution_manifest`/
  `summary`/task-001 status set to `in_progress`. Dispatched task-001
  (data engine: YAML parser, FS Access + IndexedDB persistence,
  workspace/manifest parsing, `header.kind`-prefix mapping, recursive
  element indexing, relationship resolution) to a `standard`-tier
  `general-purpose` subagent per the Agent Assignment Plan. It created
  `src/main/resources/editor-webapp/standalone.html` with a temporary
  diagnostic UI (to be replaced by task-002) and reported running its own
  parser against the real `.custom` fixtures via Node (25/25 manifest
  files parsed, 37 application + 17 technology elements, 55
  relationships, 0 dangling). Independently re-verified myself (not
  trusting the self-report): extracted the file's `<script>` body, ran it
  in a Node `vm` context against the real `.custom/` directory on disk —
  confirmed the same counts (25 files, 37/17 elements, 55 relationships,
  0 dangling), confirmed 7 spot-checked references resolve
  (`platform.authx.backend/frontend/database`, `epr.mpi`, `helpspot`,
  `ref.swisscom.esc.k8s.authx.backend`, `ref.swisscom.esc.postgresql
  .authx`), and confirmed the element-record shape matches TDD CTR-1.
  Also independently exercised the dangling path: edited one in-memory
  relationship destination to a nonexistent id and re-ran
  `buildIndex`/`resolveRelationships` — correctly reported `dangling: 1`
  with that one relationship's `resolved: false` and all 54 others
  unaffected. task-001 marked `done`; dispatching task-002.

- 2026-10-04: Before dispatching task-002, cross-checked task-001's
  output against the real `WorkspaceFactory`/`ElementIndexFactory` Java
  source (specifically `ElementIndexFactory.create()`'s second loop,
  which attaches a manifest-root candidate under its resolved
  `header.parent` via `parent.getElements().add(...)`, falling back to a
  top-level root only when `header.parent` is absent or unresolved) and
  found a real gap: both TDD DEC-5/DEC-8 and task-001's `buildIndex`
  only recursed `content.elements` *within* a manifest file — they never
  attached a manifest-root element under a *different* file's element by
  `header.parent`. `.custom/manifests/app.platform.yaml` (`platform`,
  a solution) has no `content.elements` at all; `authx`/`iam`/`portal`/
  `scp`/`epracl`/`fhirvault`/`auditslogs` are each a wholly separate
  manifest file with `header.parent: "platform"`. Without this
  cross-manifest stitching, the Applications tree would have rendered
  those 7 systems as flat top-level siblings instead of nested under
  `platform` — a materially wrong tree shape, not a cosmetic gap. Fixed
  directly (not re-dispatched, since it is a well-scoped, mechanical
  correction to already-landed work, not fresh standard-sized scope):
  added TDD DEC-5b documenting the rule, and patched `buildIndex` in
  `standalone.html` with a second pass that attaches each candidate root
  under its resolved same-layer parent before computing the final
  top-level `rootsByCategory`. Independently re-verified against
  `.custom` via the same Node `vm` harness: application roots dropped
  from a flat 15 to the correct 8 top-level elements (`platform`,
  `patient`, `idp`, `helpspot`, `hcpro`, `collaborator`, `primarysys`,
  `epr`), with `platform` now correctly showing 7 children
  (`auditslogs`, `authx`, `epracl`, `fhirvault`, `iam`, `portal`, `scp`,
  each further nested down to their real containers); technology roots
  correctly reduced to 2 (`ref`, `epr`), with `ref` correctly nested
  `swisscom.esc.k8s.{authx,epracl,iam,scp}` and
  `swisscom.esc.postgresql.{iam,authx}` five and two levels deep
  respectively. Re-ran the dangling-synthetic-fixture check afterward —
  still correctly flags exactly one dangling relationship with the tree
  shape otherwise unaffected.

- 2026-10-04: Dispatched task-002 (three-panel read-only UI: top panel,
  left panel tree/files/settings, center panel settings/file/element
  views, relationship navigation, parse-failure error states) to a
  `standard`-tier `general-purpose` subagent, with the corrected ground
  truth about `AppState.workspace.*.elements` already being correctly
  cross-manifest-stitched (DEC-5b) so it would render `.children`
  directly rather than re-deriving nesting. It extended
  `standalone.html` (replacing the temporary diagnostic UI), reported
  running `node --check` on the extracted script and a manual
  mock-AppState browser test of its own.
  Independently re-verified myself with real end-to-end browser
  interaction (not just reading the code): opened the actual shipped
  file in this environment's Browser tool, injected the REAL `.custom`
  manifest content (all 25 files' raw YAML text, read directly off disk)
  through the page's own `parseYaml`/`buildIndex`/`resolveRelationships`
  functions (the actual shipped code executing in a real browser via its
  own JS engine, not my separate Node reimplementation), and drove the
  UI with real clicks: confirmed the Applications tree shows the correct
  8 top-level roots with `platform` correctly expandable to its 7 real
  children; clicked three levels deep (`platform` → `AuthX` →
  `AuthX Frontend`) and confirmed the element view's qualitative
  (id/name/description/qualifiers/tags) and quantitative (relationship/
  child counts) info matched the real manifest content; clicked a
  resolved relationship button (`platform.authx.frontend`'s `uses →
  platform.authx.backend`) and confirmed it navigated the center panel
  and highlighted the correct tree node (FR-14/FLOW-5 confirmed live);
  confirmed the Settings view's labeled fields match
  `.custom/workspace.yaml` exactly; confirmed a Files-list click shows
  the exact raw YAML text of `app.platform.authx.yaml`; then, via two
  further live mutations through the same loaded page, confirmed a
  deliberately-broken relationship destination renders as non-interactive
  text with a "DANGLING" badge (confirmed via accessibility-tree role:
  `generic`, not `button` — AC-6/NFR-4) and a deliberately-broken
  manifest file shows an `ERROR` badge in the Files list plus the parse
  error and raw text in the center panel without crashing the rest of
  the UI (FR-16/DEC-10). Both tasks marked `done`; pln's
  `execution_manifest.status` and `summary.status` updated to `done`
  once Stage 11's remaining checks (below) also pass.
- 2026-10-04: What this environment's Browser tool could NOT verify:
  the actual `showDirectoryPicker()` call and the IndexedDB
  persistence-across-reload flow (FR-1/FR-2/FR-3, AC-11/AC-12) — the
  File System Access API's folder picker is a native OS dialog that
  browser automation cannot drive, and this sandboxed preview also
  appears to serve local `file://` pages as a persistent in-memory
  snapshot rather than a page that fully resets on navigation (repeated
  `navigate`/`force` reloads to the same file did not reset `AppState`,
  which a genuine fresh load would). This is a real, structural
  limitation of the verification environment, not a gap in what was
  checked — task-001's own code for this flow was read in full and
  reasoned about against the MDN-documented `queryPermission`/
  `requestPermission` behavior (PRD Q-1/TDD DEC-4/CON-3), and is
  flagged explicitly in the final report as something only a human with
  a real Chromium browser can confirm interactively.

- 2026-10-04: Stage 11 repository-wide verification. `git status
  --porcelain` confirms only this run's own doc directory and
  `src/main/resources/editor-webapp/standalone.html` are touched — no
  wav-002 file (`index.html`, `EditorHttpServer`, etc.) and no Java
  source. `./mvnw verify` (run with `JAVA_HOME` explicitly pointed at
  the project's pinned `.sdkmanrc` Java 25 — the shell's default `java`
  was 21, which fails with `UnsupportedClassVersionError` against
  classes this repo's own `pom.xml` targets at 25) passes cleanly:
  144/144 tests, `BUILD SUCCESS`. `docs/bkg/` and
  `tooling/docs/check-backlog.py`, which `manage-runs`' close-out step
  and this skill's Stage 11 both reference, do not exist anywhere in
  this repository (confirmed by `find`/`ls`) — noted as not applicable
  rather than silently skipped. Re-checked every PRD AC-1 through AC-12
  against the implemented behavior directly: AC-1 through AC-10
  confirmed by live interaction in a real browser against real
  `.custom` data (see the task-002 verification entry above); AC-11/
  AC-12 confirmed only by reading `tryAutoReopen`/`reopenFolder`/
  `closeFolder`/`putStoredHandleRecord`/`deleteStoredHandleRecord`
  against the MDN-documented `queryPermission`/`requestPermission`
  contract (PRD Q-1/TDD DEC-4/CON-3) — genuine interactive confirmation
  of the folder-persistence-across-reload flow needs a human with a
  real Chromium browser, since this environment's browser automation
  cannot drive the native OS directory-picker dialog. pln's
  `execution_manifest.status` set to `done`; run status set to
  `completed`; PRD/TDD `status` moved `draft` → `active` (shipped, no
  superseding run); pln frontmatter `status` moved to `done`.
- 2026-10-04: Canonical impact discharge (TDD "Canonical Impact"
  section): `CI-arc-1` and `CI-dom-1` were both declared `None` with a
  stated reason at drafting time (a browser-side display mirror of
  existing Java domain concepts, no new enforced invariant) — an empty
  declaration discharges trivially, nothing further to do. No analysis
  (`docs/ana/`) is cited by this run's TDD or by wave 003's manifest
  `sources` (empty list) — nothing to consume/archive. No earlier run's
  PRD/TDD overlaps this run's scope (wave 003 is new; wave 002 is
  explicitly independent per both waves' own Non-Goals) — nothing to
  flip to `outdated`/`superseded`.

## Findings

- Q-1 (PRD): MDN + web.dev confirm `queryPermission()` needs no user
  gesture; `requestPermission()` requires one (a click handler). PRD FR-2
  resolved accordingly: silent reopen when already granted, one-click
  "reopen `<folder>`" affordance (not a new `showDirectoryPicker()` call)
  otherwise.
- Q-2 (PRD): Manual cross-check of every `destination:` string in
  `.custom/manifests/*.yaml` against every real element id/path found no
  genuinely dangling reference in that fixture today. AC-6's
  dangling-flagging path needs a deliberately-broken synthetic copy of
  `.custom` for manual verification, not `.custom` as-is.
- Domain-model grounding (via research subagent against the real Java
  source) that the TDD's data-model mirror must follow precisely:
  `Settings.manifests.paths` default `["manifests"]`;
  `relationships.default-synthetic-label` default `"uses"`;
  `ManifestKind`'s `kind` string is `"archicode.morin.io/" + name
  .toLowerCase().replace("_","-")`; `header.parent` makes a manifest's
  root reference `parent + "." + content.id`; relationship `destination`
  is always an absolute, dot-joined reference resolved by plain string
  matching against a recursively-built element index (no relative-path
  math) — confirmed via `ElementIndexUtilities`/`ElementIndex` and fixture
  files under `src/doc/examples/` and `src/test/workspaces/`.
- TDD KDMLLC review: the real blocking gap caught was that a manifest
  file's own `header.kind` is prefixed (`"archicode.morin.io/system"`),
  a different string shape from a *nested* element's bare `kind`
  (`"system"`) — the original TDD draft only documented the latter and
  implicitly assumed DEC-5/DEC-8 could switch on `header.kind` directly,
  which would have mis-parsed every real manifest file.
- Pre-existing, out-of-scope Java oddity noticed while grounding the TDD:
  `ManifestKind.SYSTEM_GROUP` is paired with `SolutionGroup.class` in
  `ManifestKind.java` (looks like a copy-paste bug against its sibling
  `CONTAINER_GROUP`/`SOLUTION_GROUP` entries). Does not affect this run
  (the JS mirror follows the `@JsonSubTypes` marker-interface nesting
  rules, not this field) — recorded here and flagged to the wave rather
  than fixed in this run's scope.

## Lessons Learnt

- Verifying a parser/indexer against real fixture *counts* (file count,
  element count, relationship count) is necessary but not sufficient —
  it caught nothing wrong with the flat-root bug above, because the
  total element count was identical whether or not cross-manifest
  nesting was stitched correctly. Only printing and visually inspecting
  the actual *tree shape* against the fixture caught it. When verifying
  a hierarchical structure, always render and eyeball the hierarchy
  itself, not just aggregate counts.
- A domain model with two differently-shaped `kind`/type-discriminator
  vocabularies at different nesting depths (manifest-root `header.kind`
  fully-qualified, vs. nested-element bare `kind`) is an easy thing for a
  design document to conflate when both are just called "kind" in prose.
  When mirroring a polymorphic Java model client-side, name every distinct
  discriminator vocabulary explicitly and show at least one concrete
  example of each, rather than describing them in one shared sentence.
