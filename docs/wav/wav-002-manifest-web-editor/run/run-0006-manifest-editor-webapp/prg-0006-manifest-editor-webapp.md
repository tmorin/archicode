---
type: prg
status: completed
date: 2026-10-04
related:
  - docs/wav/wav-002-manifest-web-editor/wav-002-manifest-web-editor.md
run: 0006
wave: 002
---

# Progress Log: Manifest Editor Webapp

## Log

- 2026-10-04: KDMLLC review of the TDD came back (agent `ac10108115b058cbe`):
  1×S2 (`F1`: `DEC-3`'s new listing handler reuses `resolveManifestsDirs`,
  which — unlike `ManifestParser.parse` — does not filter out configured
  `settings.manifests.paths` entries that don't exist on disk yet;
  `directory.listFiles()` on a non-existent path returns `null`, an
  unhandled-NPE/500 risk for the realistic "no manifest authored yet"
  case), 1×S1 (`F2`: "Current State" claimed `src/main/resources/` contains
  only `META-INF/services/`, omitting `application.properties`), 1×S0
  (`F3`: a cosmetic `app.*`/`env.*`/`platform.*` fixture-naming
  parenthetical in `DEC-2` listed `platform.*` as if it were a separate
  file-naming category, when it only ever appears as `app.platform.*`).
  Applied all three directly to the TDD: `DEC-3`'s Decision now requires
  the same `Files.isDirectory(...)` existence guard
  `isWithinConfiguredManifestsDir` already uses, applied per-directory
  before `listFiles`; "Current State" corrected; `DEC-2`'s parenthetical
  tightened to the real counts (15 `app.*`/10 `env.*`). This finding
  mattered for implementation, not just wording — folded into task-001's
  dispatch (sent as a follow-up instruction to the already-running
  subagent, since the TDD fix landed after dispatch).

- 2026-10-04: Run started via `complete-run`, dispatched by `complete-wave` for
  wave 002 phase P3 (W-3). Directory and status file already existed
  (`status: proposed`) when this session started; working directly in the
  repository's main worktree on `feat/manifest-web-editor` (no separate
  linked worktree for this wave, per the dispatch brief's disk-usage note).
  Document profile settled as `TDD+pln` (no PRD), matching run-0004/W-1 and
  run-0005/W-2's precedent: scope arrives already settled by the wave plan's
  W-3 phase-table row and the dispatch brief, but there are real design forks
  worth recording (static-serving mechanism, graph-rendering approach,
  manifest-tree/path↔reference mapping, YAML comment-preservation decision).
  Read `wav-002-manifest-web-editor.md` in full, `tdd-0005-manifest-editor-server.md`
  in full (run-0005/W-2's design, the server this run builds on), and the
  current `EditorHttpServer.java`/`ServeEditorCommand.java`/`EditorGroup.java`
  source. Confirmed again (same finding as run-0004/run-0005): no
  `docs/CLAUDE.md` register, no `docs/bkg/`/`docs/adr/`/`docs/arc/`/`docs/dom/`
  directories, no `tooling/docs/check-backlog.py` — Canonical Impact is "not
  applicable", no backlog admission test to run. Switched the shell to JDK 25
  (`JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem`) — the `sdk`
  shell function isn't available in a non-interactive bash, so `JAVA_HOME`/`PATH`
  are exported directly instead; the system default remained JDK 21.
- 2026-10-04: Drafted the TDD (`tdd-0006-manifest-editor-webapp.md`) directly
  (Stage 4), informed by reading `EditorHttpServer.java`/`GetGraphQuery.java`/
  `GetSchemasQuery.java`/`ManifestParser.java`/`Manifest.java`/`ManifestKind.java`/
  `AbstractElement.java`/`Relationship.java`/`MapperFormat.java`/`MapperFactory.java`
  in full: webapp bundle is one self-contained classpath resource,
  `src/main/resources/editor-webapp/index.html` (inline CSS/JS, no build
  step), served by a rewritten `handleRoot` (`DEC-1`) — deviates from the
  wave manifest's declared `likely_paths` (`tools/manifest-editor/webapp/**`)
  for the same reason run-0004/run-0005's own `DEC-1`s did (nothing in this
  build copies `tools/` onto the runtime classpath); dependency graph
  rendered as inline SVG with a fixed two-row (by `View.Layer`) layout, no
  external library/CDN (`DEC-2`); new `GET /api/manifests` listing endpoint
  (exact-path context, distinct from the existing `/api/manifests/`
  trailing-slash context — confirmed via JDK `HttpServer` prefix-matching
  semantics, `ASM-4`) reusing `resolveManifestsDirs`, tolerant of one
  unparseable file, doubling as the reference↔path lookup the graph view
  needs (`DEC-3`); manifest edit view is a raw-text editor over the full
  file bytes with `GET /api/schemas/manifest` surfaced as a read-only
  structural reference panel rather than a generated form, since the
  schema's `content` is `{"type": "any"}` and a generated form would look
  complete while silently omitting every `content` field for every
  `ManifestKind` (`DEC-4`); save errors rendered in a dedicated inline
  element, textarea left unchanged on failure, success re-fetches to
  refresh the baseline (`DEC-5`); the wave's open YAML-comment-preservation
  non-goal is resolved explicitly, not left open: no reformatting library is
  introduced, and the raw-text editing model preserves formatting/comments
  by construction since the file is never parsed and re-serialized (`DEC-6`)
  — this is a true statement about this run's one editing surface, not a
  general guarantee for any future structured/form editor (flagged as
  `RISK-3`).
- 2026-10-04: Dispatched a `standard`-tier `general-purpose` subagent for
  the TDD's KDMLLC review (agent `ac10108115b058cbe`). Drafted the pln
  (`pln-0006-manifest-editor-webapp.md`, Stage 8; Stage 6 had nothing to
  resolve — the TDD's own Open Questions section is empty; Stage 7's
  consistency check against the wave plan found no gaps, recorded in
  section 2 of the pln): 5 tasks, one parallel group
  (`task-001`/`task-002`/`task-003`). Unlike run-0004/run-0005's own plns
  (which executed every task inline, reasoning that the run-executor
  session is itself already one unit of delegation), this run actually
  dispatches `task-001` (`EditorHttpServer.java` + its test) and `task-002`
  (the webapp `index.html`) to `general-purpose` subagents in parallel,
  per `complete-run`'s Stage 10 text that dispatching a `standard`-tier task
  is not a style choice. `task-003` (one README sentence), `task-004`
  (verification) and `task-005` (bookkeeping) stay inline.
- 2026-10-04: This session was force-stopped mid-flight (a harness-level
  forced hand-back, not a run decision) while task-001/task-002 were still
  running in the background, and reported back to the orchestrator
  honestly as incomplete (run left at `status: in-progress`, nothing
  verified, no success claimed). Resumed on explicit instruction from the
  orchestrator to continue exactly the stated resume plan.
- 2026-10-04: Checked in on both dispatched subagents. Both had completed
  task-001 and task-002 respectively (confirmed via their own
  `SubagentHandback` reports, cross-checked against the actual file diffs —
  not trusted on the self-report alone). `EditorHttpServer.java`: new
  exact-path `GET /api/manifests` context (separate from the existing
  `/api/manifests/` prefix context), `handleManifestsListing` reusing
  `resolveManifestsDirs`, with the `Files.isDirectory` missing-directory
  guard I'd sent as a follow-up after the KDMLLC review — confirmed present
  in the final diff. The subagent independently found and fixed a second
  issue on its own: `MapperFactory`'s mappers default to `NON_EMPTY` JSON
  inclusion, which would have silently omitted `reference`/`kind`/
  `parseError` instead of emitting a literal `null` as `CTR-1` specifies;
  fixed via `@JsonInclude(ALWAYS)` on those three fields in the new
  `ManifestEntry` model class. `handleRoot` rewritten to read the classpath
  resource `/editor-webapp/index.html`, with a `500` guard for a missing
  resource (exercised for real during the subagent's own development,
  before the parallel task's file landed). `src/main/resources/editor-webapp/index.html`
  (836 lines): tree nav, inline-SVG graph view (two rows by lowercased
  `layer`, one shared `<marker>` arrowhead, clickable nodes via the
  reference→path map), raw-text editor backed by a read-only schema
  reference panel, inline save-error surfacing. Both pre-existing test
  files' existing methods were left unmodified by both subagents.
- 2026-10-04: Independently re-verified both outputs myself rather than
  trusting either subagent's self-report: `./mvnw -q -DskipTests compile`
  clean; grepped `index.html` directly for `src=`/`href=` pointing at any
  `http(s)` URL (none found) and confirmed the only two `http://`
  occurrences are the mandatory SVG XML namespace URI, not a network
  reference; confirmed all `fetch(...)` call sites are exactly
  `/api/manifests`, `/api/graph`, `/api/schemas/manifest`,
  `/api/manifests/{path}` (GET and PUT), all relative; ran
  `./mvnw -q test -Dtest=EditorHttpServerTest` myself — 12/12 pass, per
  `target/surefire-reports/io.morin.archicode.cli.EditorHttpServerTest.txt`;
  ran the full suite — 97/97 pass (85 pre-existing + 9 run-0005
  `EditorHttpServerTest` cases, unmodified + 3 new run-0006 cases); ran
  `./mvnw verify` — exit 0.
- 2026-10-04: Completed task-003 (README.md: one additional sentence under
  the existing "Serve the manifest editor" section, noting `GET /` now
  serves the webapp — no change to the existing Docker invocation/port-
  mapping guidance).
- 2026-10-04: Completed task-004, the real manual walkthrough (not
  simulated): packaged the CLI (`./mvnw -q -DskipTests package`), copied
  `.custom/` to `/tmp/custom_verify_0006` (deleted afterward — `.custom/`
  itself confirmed untouched via `git status --short .custom`, same
  discipline run-0004/run-0005/run-0006's own TDD required), and ran
  `editor serve -w /tmp/custom_verify_0006/workspace.yaml --port 8099 --host 127.0.0.1`
  against it. Confirmed: (1) `GET /` returns the webapp (`<title>ArchiCode
  Manifest Editor</title>`, not the old placeholder); (2) `GET
  /api/manifests` lists all 25 real files with correct `path`/`reference`/
  `kind`; (3) `GET /api/graph` returns 54 elements/55 relationships,
  including the real cross-manifest edge `collaborator ->
  platform.portal.frontend`, and the listing's `reference: "collaborator"`
  entry maps to `path: "manifests/app.collaborator.yaml"` — the exact
  lookup the graph view's node-click handler needs; (4) edited
  `app.collaborator.yaml`'s `content.name` field and `PUT` it back — `200`,
  the scratch file on disk was updated, and a subsequent `GET` returned the
  edited content (the full edit→save→reload round trip, for real); (5)
  submitted a payload missing the required `content.id` field — `400` with
  the Jackson exception message as the body, and the file was
  byte-identical before/after via `diff`; read the webapp's own save-button
  JS directly (not inferred) and confirmed a non-2xx response is written
  into a dedicated, styled `#save-error`/`.error-box` element, the textarea
  is left untouched, and no success indicator is shown — `DEC-5`/`TG-3`'s
  contract, verified in the actual shipped code; (6) directly corrupted a
  different manifest file on disk (bypassing the API) and confirmed `GET
  /api/manifests` still returned all 25 entries, with the corrupted one
  flagged via a non-null `parseError` rather than failing the whole
  response (`DEC-3`/`RISK-4`), and confirmed the webapp's tree-rendering JS
  does flag a `parseError` entry visibly (`⚠` marker + distinct CSS class +
  tooltip) rather than hiding or crashing on it. Stopped the server
  (confirmed via `ps`/a failed `curl` against the port) and deleted the
  scratch directory afterward. No browser was actually driven — every check
  above is curl/HTTP-client-based against the real running server, plus
  direct reading of the served JS for the UI-side behavior a curl request
  can't exercise (DOM updates, click handlers) — stated plainly here per
  the TDD's own verification section, which anticipated this limitation (no
  browser-automation tooling exists in this repository).
- 2026-10-04: Completed task-005: ran `npx prettier --write "src/**/*.java"`
  (reformatted `EditorHttpServer.java` only; `EditorHttpServerTest.java`
  already matched); re-ran the full suite afterward — still 97/97. Closed
  out: `run-0006-manifest-editor-webapp.md` → `completed`;
  `pln-0006-manifest-editor-webapp.md` → `status: done`, every task `done`,
  `execution_manifest.status: done` with all three criteria marked `TRUE`
  against real, actually-run output (not inferred, not trusted from a
  subagent's self-report alone); `tdd-0006-manifest-editor-webapp.md` left
  at `status: active` (matching run-0004/run-0005's precedent — the TDD
  document itself isn't retired, only the run is closed). No `docs/bkg/`
  register exists in this repository (confirmed at run start, same as
  run-0004/run-0005), so there is no backlog admission test or expiry sweep
  to run, and `tooling/docs/check-backlog.py` does not exist either. No
  analysis (`ana-*`) was cited by this run's TDD or by wave 002's manifest
  `sources:` (empty list), so there is nothing to mark `consumed`.
  Canonical Impact was `Not applicable` from the TDD's own drafting (no
  `arc`/`dom` registers declared) — nothing to discharge. `git status
  --short` confirms this run touched exactly: `README.md` (modified, one
  sentence, as planned), `EditorHttpServer.java`/`EditorHttpServerTest.java`
  (modified, as planned), one new directory
  (`src/main/resources/editor-webapp/`, one file), and its own run
  directory — the two wave-level files that show as modified in `git
  status` (`wav-002-manifest-web-editor.md`, `prg-002-manifest-web-editor.md`)
  predate this run's start (confirmed against the dispatch brief's own git
  status snapshot) and were not written to by this session. No git commit
  was made (the wave's own convention: the orchestrating `complete-wave`
  session makes exactly one commit per run after independent verification)
  — everything above is left uncommitted in the working tree, per this
  run's explicit dispatch instructions.

## Lessons Learnt

- A raw-text editing model (never parsing a manifest into fields and
  re-serializing it) turned out to resolve two concerns at once for free:
  the wave's open YAML-comment-preservation non-goal, and the honesty
  problem of a schema-generated form that would silently omit every
  `content` field for every manifest kind. Worth remembering as a general
  pattern: when a schema is too shallow to validate or model content
  faithfully, the safest UI is often the one that doesn't pretend the
  schema covers more than it does.
- Dispatching the two independent, fully-TDD-specified implementation
  tasks (backend endpoint, frontend webapp) to parallel subagents — rather
  than executing everything inline, as run-0004/run-0005 both did on the
  grounds that the run-executor session is itself already one unit of
  delegation — worked cleanly here because the TDD had already pinned the
  exact contract (`CTR-1`) both sides needed to agree on, with no shared
  file between them. The one coordination point that mattered (a
  mid-flight TDD correction found by the KDMLLC review, after dispatch)
  was handled by sending a follow-up message to the already-running
  subagent rather than waiting for it to finish and re-dispatching — worth
  reusing this pattern when a review lands after dispatch.
- `MapperFactory`'s global `NON_EMPTY` JSON inclusion default is a trap for
  any new response contract that needs to distinguish "field is null" from
  "field is absent" (as `CTR-1` does, for `reference`/`kind`/`parseError`).
  The fix (`@JsonInclude(Include.ALWAYS)` on the specific fields) is cheap
  but easy to miss until a test actually asserts on the JSON shape — worth
  checking this default proactively the next time a new endpoint's
  contract relies on a literal `null` rather than key absence.
- A forced mid-flight hand-back (this session hit one before task-004) is
  recoverable cleanly as long as the hand-back states plainly what was and
  wasn't verified, rather than implying progress that wasn't checked —
  resuming and redoing the verification from scratch (not trusting the
  pre-stop state) caught nothing wrong here, but the discipline of
  re-verifying rather than assuming is what makes that confirmable rather
  than just asserted.
