---
title: Claude Editing Bridge
status: active
owner: run-0007
date: 2026-10-04
related:
  - docs/wav/wav-002-manifest-web-editor/wav-002-manifest-web-editor.md
  - docs/wav/wav-002-manifest-web-editor/wbc-002-manifest-web-editor.md
  - docs/wav/wav-002-manifest-web-editor/run/run-0007-claude-editing-bridge/prd-0007-claude-editing-bridge.md
  - docs/wav/wav-002-manifest-web-editor/run/run-0005-manifest-editor-server/tdd-0005-manifest-editor-server.md
  - docs/wav/wav-002-manifest-web-editor/run/run-0006-manifest-editor-webapp/tdd-0006-manifest-editor-webapp.md
type: tdd
run: 0007
wave: 002
---

# Claude Editing Bridge

# Summary

Add four new classes under `src/main/java/io/morin/archicode/cli/` and one new
route group on `EditorHttpServer` so the editor webapp can post a prose change
request, have the `claude` CLI apply it to the served workspace, and show the
result as a reviewable diff with exactly two terminal actions.

The safety design rests on one invariant, stated once and then relied on
everywhere: **every file the invocation can write is a file the
pre-invocation capture covers.** The capture is the served workspace's
directory, recursively, over regular files; the invocation's writable set is
a *subset* of it, because `--restricted` additionally denies writes to
settings, git and tool-configuration files under `--permission-prompts none`.
The subset direction is the load-bearing one — nothing the invocation can
change lies outside what a discard restores — and it is deliberately stated
as a subset rather than as equality, because equality is both unnecessary and
not literally true.

Containment itself is the invocation's own configuration (working directory =
the workspace directory, `--restricted`, an explicit tool list with no
command-execution tool, `acceptEdits` + `--permission-prompts none`), verified
against the real binary to produce a *harness-level denial* for an
out-of-workspace write rather than a polite refusal (`prg-0007` `F-3` vs
`F-4`). Discard restores from the capture alone, never from the diff, so a
diff bug can mislead a human but cannot cost them their files.

Two paths are **not** covered by the invariant, and are named here rather
than left to be discovered: a symbolic link or other non-regular entry inside
the workspace, which is why `DEC-15` refuses such a workspace outright rather
than treating it as a special case; and hooks contributed by managed settings
or by installed plugins, which `--restricted` does not remove and which are
not tools, accepted as `RISK-10` with the reason.

The capture is held in memory, bounded, and released on accept or discard.
There is no git dependency anywhere in the design (PRD `Q-2`).

# Scope

In scope:

- `ClaudeBridge.java` (new): pre-flight refusals, capture, invocation,
  diff, single-pending-session state, accept and discard.
- `WorkspaceCapture.java` (new): the capture itself — snapshot, diff against
  the live tree, and restore. The one class whose correctness is the
  guarantee; unit-tested directly without any subprocess.
- `LineDiff.java` (new): pure two-strings-to-unified-diff utility.
- `ClaudeCliInvoker.java` (new): builds and runs the subprocess, parses its
  JSON result. The only class that knows the `claude` CLI's flag grammar.
- `WorkspaceLayout.java` (new, extracted): the workspace-directory and
  configured-manifests-directories resolution `EditorHttpServer` already
  performs privately, moved so `ClaudeBridge` can use it without a circular
  injection — see `DEC-8`.
- `EditorHttpServer.java` (modify): one new context `/api/claude/` with four
  routes; a new `start(...)` overload carrying bridge settings; a thread-pool
  executor so a long invocation does not block every other route (`DEC-16`);
  its two existing manifests-dir call sites delegate to `WorkspaceLayout`.
- `ServeEditorCommand.java` (modify): four new options
  (`--claude`/`--no-claude`, `--claude-executable`, `--claude-model`,
  `--claude-timeout`).
- `src/main/resources/editor-webapp/index.html` (modify): a third tab,
  "Assist", carrying the prompt box, the availability signal, the diff, and
  the accept/discard controls.
- `README.md` (modify): the capability and its `claude`-on-the-host
  precondition.
- New tests: `WorkspaceCaptureTest`, `LineDiffTest`, `ClaudeBridgeTest`
  (real HTTP, stand-in executable), plus one new fixture workspace whose
  configured manifests directory deliberately escapes the workspace
  directory.

Out of scope — unchanged from PRD Section 3, plus:

- Any change to `GET /api/graph`, `GET /api/schemas/{type}`,
  `GET /api/manifests` or `GET|PUT|POST /api/manifests/{path}` (PRD `NFR-5`).
- Any modification to `EditorHttpServerTest.java` (PRD `NFR-5`).
- The `native`/GraalVM profile. `ProcessBuilder` works under GraalVM native
  image, but this run neither builds nor verifies that profile — same
  precedent as run-0004/0005/0006. Recorded as `RISK-5`.
- A multi-turn refinement loop, partial accept, client-chosen model.

# PRD Traceability

Source: `prd-0007-claude-editing-bridge.md` (same run directory). Traceability
is complete — every `FR-` and `NFR-` is addressed below:

| PRD ID | Addressed by |
| --- | --- |
| `FR-1` | `CTR-2`, `DEC-1`, `FLOW-1`, `IMP-1`, `IMP-6` |
| `FR-2` | `DEC-4`, `IMP-4` |
| `FR-3` | `DEC-3`, `DEC-5`, `DEC-15`, `CTR-2`, `IMP-2`, `IMP-3` |
| `FR-4` | `DEC-9`, `CTR-2`, `IMP-3` |
| `FR-5` | `DEC-3`, `CTR-3`, `CTR-4`, `IMP-2` |
| `FR-6` | `DEC-10`, `FLOW-1` |
| `FR-7` | `DEC-6`, `IMP-6`, `IMP-7` |
| `FR-8` | `DEC-1`, `DEC-2`, `DEC-8`, `CTR-2` |
| `FR-9` | `DEC-11`, `CTR-1`, `IMP-6` |
| `FR-10` | `DEC-7`, `DEC-16`, `CTR-2` |
| `FR-11` | `CTR-2`, `IMP-6` |
| `FR-12` | `IMP-8` |
| `NFR-1` | `DEC-2`, `DEC-3`, `DEC-4`, `DEC-12`, `DEC-15` |
| `NFR-2` | `DEC-13`, `DEC-16`, `IMP-4` |
| `NFR-3` | `DEC-3`, `IMP-2` |
| `NFR-4` | `DEC-9` (own diff), `DEC-4` (JDK `ProcessBuilder`), `CON-1` |
| `NFR-5` | `DEC-8`, `CON-2`, `IMP-1`, `IMP-5` |
| `NFR-6` | `DEC-12`, `CTR-2` |

Acceptance criteria are mapped in "Observability and Verification".

# Technical Goals

- `TG-1` — `POST /api/claude/invoke`, whose request body is nothing but the
  prompt text, runs one `claude` invocation against the served workspace and
  returns a reviewable result (`FR-1`, `FR-8`/`AC-13`).
- `TG-2` — Every regular file under the served workspace directory is
  captured in memory before the subprocess starts, the invocation's writable
  set is a subset of that capture, and the capture is the sole input to
  restore (`FR-3`, `NFR-1`, `NFR-3`).
- `TG-3` — Discard leaves every captured file byte-identical, recreates
  captured files the invocation deleted, and deletes files the invocation
  created anywhere under the workspace directory, with no git facility
  involved (`FR-5`, `AC-6`–`AC-9`).
- `TG-4` — An out-of-workspace write attempt is denied by the invocation's own
  permission machinery and that denial is visible in the result (`NFR-1`,
  `FR-11`, `AC-12`).
- `TG-5` — Exactly one change may be pending; a second request is refused
  before capturing or invoking anything (`FR-10`).
- `TG-6` — `GET /api/claude/status` lets the webapp show availability before
  any prompt is typed, and the webapp does (`FR-9`, `AC-17`).
- `TG-7` — A non-2xx from `/api/claude/invoke` means *nothing ran and nothing
  is held*; a 2xx means the subprocess ran and the body's `outcome` says how
  it went, including `failed` and `timeout` (`NFR-2`, `FR-6`).
- `TG-8` — No existing endpoint's contract changes and
  `EditorHttpServerTest.java` is not edited (`NFR-5`).
- `TG-9` — No new Maven dependency, no `package.json`, no CDN asset, no build
  step (`NFR-4`).

# Non-Goals

- Making the agent's edit correct or schema-valid (PRD Non-goals, `FR-6`).
- Surviving a server restart with a reviewable session (`DEC-6`, `TC-3`).
- Narrowing the invocation's writable set below the workspace directory —
  explicitly rejected in `DEC-2`'s alternatives, because it would break
  `NFR-1`'s `writable ⊆ captured` relation in the other direction.
- A general-purpose diff library or a side-by-side diff viewer (`DEC-9`).
- Packaging `claude` into the published image (`RISK-2`).

# Assumptions

- `ASM-1` — The `claude` CLI accepts the flag set in `DEC-4` and, with it,
  applies file edits with no interactive prompt and no TTY. **Validated
  empirically**, not assumed: five probes against the installed binary
  (`claude --version` → `2.1.280`) in a disposable scratch workspace,
  recorded as `prg-0007` `F-1`–`F-4` and `F-6`. `F-6` is the one that
  matters for this assumption: it ran the complete `DEC-4` command — all nine
  flags together, prompt on stdin — and observed a successful single-file
  edit with no denials. The flags themselves were read from the real
  `claude --help`, not recalled.
- `ASM-2` — `claude`'s `--output-format json` emits exactly one JSON object
  on stdout. Validated by the same probes; the parse is nonetheless written
  to degrade to `outcome: "failed"` with the raw stdout truncated into a
  message rather than throwing, because a future CLI version could change
  this and the bridge must still leave the capture discardable (`RISK-3`).
- `ASM-3` — `claude` reads its prompt from stdin when `-p` is given with no
  positional prompt argument. Validated by `prg-0007` `F-6`, which delivered
  the prompt that way.
- `ASM-3b` — The CLI writes nothing into its own working directory. Validated
  by `F-6`: the workspace's file set was identical before and after the
  invocation apart from the intended edit, so session/cache bookkeeping does
  not appear as agent-created noise in the bridge's diff. If a future version
  changed this, the noise would be visible in the diff and discardable — it
  cannot break the invariant, only the signal-to-noise of a review.
- `ASM-4` — `com.sun.net.httpserver.HttpServer.createContext` matches the
  longest registered prefix, so a new `/api/claude/` context coexists with
  `/`, `/api/graph`, `/api/schemas/`, `/api/manifests` and `/api/manifests/`
  without touching them. Same assumption run-0006 `ASM-4` already made and
  exercised; this run exercises it again with a new prefix.
- `ASM-5` — **Not** an assumption that the served directory is small; a
  stated consequence of where the workspace file sits. The captured and
  writable directory is the *workspace file's parent*. With
  `.custom/workspace.yaml` that is `.custom/` — 154 files / 688 KB, three
  orders of magnitude inside `DEC-5`'s bounds. But `ArchiCode`'s
  `-w`/`--workspace` defaults to `workspace.yaml` resolved against the
  process's working directory, and `README.md`'s documented container
  invocation passes no `--workspace` at all — its `-w "/workdir"` is
  *Docker's* working-directory flag, paired with `-v "$(pwd):/workdir"`. So
  in the documented case the workspace file is `$(pwd)/workspace.yaml` and
  the captured, writable directory is the operator's whole mounted project
  root, `.git` and any build output included. For a dedicated architecture
  repository that is usually within `DEC-5`'s bounds but still includes
  `.git`, which makes `RISK-4`'s concurrent-commit hazard the common case
  rather than an edge case; for a larger tree the bound fires instead. Both
  are handled rather than assumed away — see `RISK-11`, `DEC-5` and `IMP-8`.
- `ASM-6` — The operator's Claude credentials are reachable by the server
  process's environment (OAuth token file, keychain, or `ANTHROPIC_API_KEY`).
  `--restricted` ignores user/project/local *settings* files but not
  credentials — validated by probe 1, which authenticated successfully under
  `--restricted`. This is why `DEC-4` uses `--restricted` and not `--bare`,
  whose own `--help` text states auth becomes `ANTHROPIC_API_KEY`-only.

# Constraints

- `CON-1` — No new Maven dependency, no `package.json` dependency, no CDN
  asset, no build step (PRD `NFR-4`; continuity with run-0005 `CON-2`,
  run-0006 `CON-2`/`CON-3`). Consequences: the diff is hand-written
  (`DEC-9`), the subprocess uses the JDK's `ProcessBuilder`, and the JSON
  result is parsed with the already-present Jackson `MapperFactory`.
- `CON-2` — `EditorHttpServer.start(String, int, Path)`'s existing signature
  must keep working unchanged, because `EditorHttpServerTest` calls it and
  PRD `NFR-5` forbids editing that test. New configuration arrives through an
  overload (`IMP-1`).
- `CON-3` — The bridge's writable boundary may not be widened past the
  workspace directory, so `--add-dir` is never passed (PRD `TC-1`, `FR-8`).
- `CON-4` — Nothing the bridge writes for its own bookkeeping may live inside
  the workspace directory, or it would appear in its own diff and be deleted
  by its own discard. Applies to the subprocess's stdout/stderr/stdin spool
  files (`DEC-4`).
- `CON-5` — Lombok conventions as used throughout this package:
  `@Slf4j`, `@SneakyThrows`, `@Value`/`@Builder` for response DTOs, and
  `@JsonInclude(ALWAYS)` on any nullable response field, because
  `MapperFactory`'s mappers are configured `NON_EMPTY` (same reason run-0006
  annotated `ManifestEntry`).

# Current State

- `EditorHttpServer.java` (412 lines) registers five contexts: `/`
  (serves `/editor-webapp/index.html` from the classpath), `/api/graph`,
  `/api/schemas/`, `/api/manifests` (listing) and `/api/manifests/` (per-file
  `GET`/`PUT`/`POST`). Two private helpers matter here:
  `resolveManifestsDirs(Path workspaceFilePath, Path workspaceDir)` parses
  only the raw `io.morin.archicode.resource.workspace.Workspace` resource to
  read `settings.manifests.paths` and resolves each against the workspace
  directory, with **no existence check and no containment check**; and
  `isWithinConfiguredManifestsDir(...)`, which uses it plus `toRealPath()`
  equality for the per-file path guard. The workspace directory itself is
  derived inline as
  `workspaceFilePath.toAbsolutePath().normalize().getParent()` in three
  places.
- `ServeEditorCommand.java` has `-p/--port` (default `8080`) and `--host`
  (default `0.0.0.0`), takes the workspace file from
  `editorGroup.archiCode.workspaceFilePath`, starts the server, and blocks on
  a `CountDownLatch` released by a shutdown hook.
- `src/main/resources/editor-webapp/index.html` (836 lines) is one
  self-contained page: a `#tabs` nav with two buttons (`graph`, `editor`)
  driving `switchTab()`, a `#sidebar` tree built from `GET /api/manifests`, an
  inline-SVG graph from `GET /api/graph`, and a textarea editor with a Save
  button issuing `PUT /api/manifests/{path}`. Its JS is one IIFE with a
  `state` object (`manifests`, `referenceToPath`, `schema`, `schemaLoaded`,
  `currentPath`), `qs(id)` and `svgEl(tag, attrs)` helpers, and an `init()`
  that fires `loadManifests()`, `loadGraph()`, `loadSchemaOnce()`.
- `EditorHttpServerTest.java` is a `@QuarkusTest` that copies
  `src/test/workspaces/editor_manifests/` into a fresh temp directory per
  test, starts the real server on an ephemeral port, and issues real
  `java.net.http.HttpClient` requests. Its `copyDirectory` helper is the
  pattern new tests follow.
- `MapperFactory` exposes `create(MapperFormat)` / `create(Path)`; all its
  mappers are built with `serializationInclusion(NON_EMPTY)` — hence `CON-5`.
- There is no `ProcessBuilder` or `Runtime.exec` anywhere in `src/`
  (grepped): this run introduces the repository's first subprocess
  execution. There is no diff utility and no diff dependency.
- `pom.xml` has no diff, no process and no HTTP-server dependency to reuse;
  `quarkus-junit-mockito` is available for tests but the new tests need a
  stand-in *executable*, not a mock (`DEC-14`).
- `.custom/workspace.yaml` declares no `settings.manifests`, so
  `settings.manifests.paths` falls back to `Settings.Manifests`'s default
  `{"manifests"}`; `.custom/` holds 154 files totalling 688 KB.
- `README.md`'s "Serve the manifest editor" section documents
  `docker run ... -p 127.0.0.1:8080:8080 ... archicode editor serve` and the
  webapp's three current abilities.

# Proposed Design

Four new classes, one extracted class, one new route group. `ClaudeBridge` is
the only stateful piece (one pending session) and the only place the safety
sequencing lives; `WorkspaceCapture` is the only place that touches files on
behalf of a restore; `ClaudeCliInvoker` is the only place that knows the CLI.

```plantuml
@startuml
package "cli" {
  class EditorHttpServer
  class ClaudeBridge
  class WorkspaceCapture
  class ClaudeCliInvoker
  class LineDiff
  class WorkspaceLayout
  class ServeEditorCommand
}
artifact "editor-webapp/index.html" as webapp
cloud "claude CLI\n(subprocess)" as cli

ServeEditorCommand --> EditorHttpServer : start(host, port, wsFile, settings)
EditorHttpServer --> ClaudeBridge : status / invoke / accept / discard
EditorHttpServer --> WorkspaceLayout : workspaceDir, manifestsDirs
ClaudeBridge --> WorkspaceLayout : manifestsDirs (pre-flight containment)
ClaudeBridge --> WorkspaceCapture : capture / diff / restore
ClaudeBridge --> ClaudeCliInvoker : run(prompt, workspaceDir)
ClaudeBridge --> LineDiff : unified(before, after)
ClaudeCliInvoker --> cli : ProcessBuilder (cwd = workspaceDir)
webapp ..> EditorHttpServer : GET /api/claude/status\nPOST /api/claude/invoke\nPOST /api/claude/accept/{id}\nPOST /api/claude/discard/{id}
@enduml
```

A reviewer should confirm three things in this topology. `ClaudeCliInvoker` is
the only arrow reaching the subprocess, and its only writable surface is the
working directory `ClaudeBridge` hands it. `WorkspaceCapture` has no arrow to
`LineDiff` — restore cannot consult the diff (`NFR-3`). And `ClaudeBridge`
depends on `WorkspaceLayout` rather than on `EditorHttpServer`, so the
pre-flight containment check is reusable without a circular injection
(`DEC-8`).

`DEC-1 — One route group /api/claude/ with four routes; the invoke request body is the prompt text and nothing else`

- Decision: register one context, `/api/claude/`, dispatching on the path
  suffix: `GET status`, `POST invoke`, `POST accept/{sessionId}`,
  `POST discard/{sessionId}`. `POST /api/claude/invoke` takes
  `text/plain; charset=utf-8` whose **entire body is the prompt**. Responses
  are JSON.
- Rationale: PRD `AC-13` requires the request to carry no workspace,
  directory or path parameter. A plain-text body makes that structurally
  true rather than merely unimplemented — there is no field in which a path
  could later be smuggled, and no future contributor can add one without
  changing the media type. It also matches the existing
  `PUT /api/manifests/{path}`'s raw-body style. Putting the session id in the
  accept/discard *path* (rather than taking "the current session") means a
  stale browser tab holding an old id gets a `404` instead of acting on
  someone else's pending change.
- Alternatives considered: a JSON request body `{"prompt": "..."}` — rejected
  for `AC-13`: it is the natural place for a future `"path"` or `"workspace"`
  field, and the whole point is that no such place should exist; one context
  per route (five `createContext` calls) — rejected, the suffix dispatch is
  smaller than five lambdas and `/api/claude/` is a single conceptual
  surface; `POST /api/claude/sessions/{id}/accept` — rejected only for
  parsing simplicity (one `substring` + `indexOf` instead of segment
  splitting); nothing turns on it.
- Tradeoffs: a plain-text body cannot carry per-request options; this is
  intended (PRD Section 3 out-of-scope: client-chosen model/tools/mode).
- Linked requirement: `FR-1`, `FR-8`, `AC-13`.

`DEC-2 — Containment is the subprocess's working directory, enforced by the CLI's own permission machinery; the bridge never widens it`

- Decision: `ClaudeCliInvoker` sets the subprocess's working directory to the
  served workspace's directory and passes no `--add-dir`. Containment is then
  the CLI's documented `--restricted` behavior ("confines the file tools to
  the working directories (`--add-dir` included)") combined with
  `--permission-mode acceptEdits --permission-prompts none`: an in-scope edit
  is auto-approved, and anything that would otherwise prompt — including an
  out-of-scope write — is denied automatically with no human available.
- Rationale: this is the only containment mechanism in the design that is
  *structural*. Probe 4 (`prg-0007` `F-4`) showed the harness recording the
  attempted out-of-workspace `Write` in the result's `permission_denials`
  array and creating no file, with the same prompt intent that probe 3 had
  merely talked the model out of. The difference between those two probes is
  the whole argument for this decision: a design that rested on the model's
  judgment would have passed probe 3 and taught us nothing.
- Alternatives considered: **narrowing** the writable set to just the
  configured manifest directories, as the PRD's KDMLLC review offered as the
  smaller fix for its S3 finding — rejected, and this is the most
  consequential rejection in the document. Narrowing would require either
  moving the working directory off the workspace root (the agent then cannot
  read the workspace file that tells it how the workspace is laid out, and
  multiple configured directories have no single root to move to) or
  expressing per-path deny rules in a `--settings` document, which is an
  unverified mechanism whose failure mode is silent over-permission. Widening
  the *capture* instead achieves the same invariant with a mechanism already
  proven by probe 4. Also considered: running the subprocess as a different
  OS user, or in a container — rejected as disproportionate for a
  single-operator local tool and impossible to do portably from inside a JVM
  with no new dependency (`CON-1`); relying on `claude`'s own refusals —
  rejected per probe 3.
- Tradeoffs: the invocation can write anywhere under the workspace directory
  that is not a settings, git or tool-configuration file — `workspace.yaml`
  very much included, since it is not a settings file in the CLI's sense.
  That is precisely why `DEC-3`'s capture covers the whole directory: the
  writable set is a *subset* of the captured set, which is all the discard
  guarantee needs. A `.git` directory, if present, is on the denied side of
  that line (the CLI requires a human or a permission handler to approve
  writes to git files, and `--permission-prompts none` supplies neither), so
  `RISK-4`'s hazard is the operator's own concurrent commits being reverted
  by a discard — not an agent write.
- Linked requirement: `NFR-1`, `FR-8`, `GOAL-4`, `AC-12`.

`DEC-3 — The capture is an in-memory, immutable content snapshot of the whole workspace directory; restore reads only the capture`

- Decision: **this decision is the sole owner of the capture/diff/restore
  algorithm.** `IMP-2`, `FLOW-2` and `CTR-4` state the *guarantee* and point
  here; a correction lands here and nowhere else.

  `WorkspaceCapture.capture(Path root, int maxFiles, long maxBytes)` walks
  `root` recursively (`Files.walk`, no `FOLLOW_LINKS`) in the two passes
  `DEC-5` describes, and records, for every regular file, its path relative to
  `root` mapped to its full byte content, plus the set of relative directory
  paths that existed. Entry classification uses `LinkOption.NOFOLLOW_LINKS`; a
  symbolic link or any other non-regular, non-directory entry is a refusal
  (`DEC-15`). Every refusal — unrepresentable entry or bound exceeded — is
  raised by the first, metadata-only pass, so a capture that has begun reading
  content always completes.

  `diff(Path root)` re-walks and classifies each path as `created` (present
  now, absent in the capture), `deleted` (absent now, present in the capture)
  or `modified` (present in both, bytes differ); unchanged files are omitted.

  `restore(Path root)` performs exactly these steps, in this order:

  1. Create every captured directory that is now missing, shallowest-first.
  2. For every captured file: if its parent directory does not exist, create
     it; if the path currently exists but is a **directory** (a type change),
     delete that directory subtree first; then, if the current bytes differ
     from the captured bytes or the file is missing, write the captured
     bytes. A file whose bytes already match is left untouched, so a
     no-op discard does not even bump an mtime.
  3. Delete every regular file now present under `root` that the capture does
     not hold.
  4. Delete every directory now present under `root` that the capture did not
     hold, deepest-first.

  `restore` never reads a diff, and the capture is **immutable** — so
  `restore` is idempotent and a retry after a partial failure converges from
  whatever state that failure left behind. That is what makes `CTR-4`'s
  "keep the session pending on a failed restore" safe rather than merely
  hopeful.
- Rationale: `NFR-3` — keeping restore's input independent of the diff means
  a diff bug cannot become a data-loss bug. In-memory rather than a temp
  directory for three reasons: the capture is then unreachable by the
  subprocess (which can only write under the workspace directory, and the
  capture is not there — `CON-4` holds trivially), there is no cleanup path
  that can leave a stale half-snapshot on disk, and a capture is naturally
  released when the session reference is cleared. Byte arrays rather than
  strings so the guarantee is literally byte-for-byte for any content,
  including binary and any line ending.
- Alternatives considered: tracking non-regular entries as their own entry
  kind instead of refusing them — rejected in favour of `DEC-15`'s refusal,
  because a link gives one inode two captured names and "byte-identical
  restore" then depends on which name is written last; a temp-directory copy
  — rejected for the reasons
  above, and because "snapshot directory" invites someone to later put it
  inside the workspace; a git stash/commit — rejected in the PRD (`Q-2`):
  `.custom/` is gitignored, so the wave's own target workspace has no index
  to stash against; hashing only (store digests, restore nothing) — rejected,
  it can detect a change but cannot undo one; capturing only the configured
  manifest directories — rejected, that is exactly the S3 defect the PRD's
  review found (see `prg-0007` `F-5`).
- Tradeoffs: memory proportional to the workspace's total size, hence
  `DEC-5`'s bounds; and the capture does not survive the JVM (`DEC-6`).
- Linked requirement: `FR-3`, `FR-5`, `NFR-1`, `NFR-3`, `AC-6`–`AC-9`.

`DEC-4 — The exact invocation: a verified, fixed, hardened flag set; prompt on stdin; spool files outside the workspace`

- Decision: `ClaudeCliInvoker` builds exactly this command (the executable,
  model and timeout come from settings; nothing else is configurable and
  nothing comes from the client):

  ```
  <executable> -p
    --output-format json
    --model <model>
    --restricted
    --tools Read,Edit,Write,Glob,Grep
    --permission-mode acceptEdits
    --permission-prompts none
    --strict-mcp-config
    --disable-slash-commands
    --append-system-prompt <fixed preamble, below>
  ```

  with working directory = the workspace directory, the prompt written to a
  temp file outside the workspace and attached as stdin, and stdout/stderr
  redirected to temp files outside the workspace (`CON-4`). The fixed
  preamble, verbatim:

  > You are editing an ArchiCode architecture-as-code workspace. A manifest
  > is a YAML, TOML or JSON document with a top-level `header` (keys: `kind`,
  > `version`, and optionally `parent`) and a top-level `content` mapping
  > whose shape depends on `header.kind`; `content.id` is the element's local
  > id and `content.relationships[].destination` holds dotted references to
  > other elements. The workspace file at the root of the current working
  > directory declares where manifests live. Only read and edit files inside
  > the current working directory. Make the smallest change that satisfies
  > the request, preserve existing formatting and comments, and do not create
  > new files unless the request requires it.

- Rationale: every flag earns its place and each was read from the real
  `claude --help` rather than recalled. `-p` with `--output-format json`
  gives a parseable result and no interactive session. `--restricted` is the
  containment primitive (`DEC-2`) and — unlike `--bare` — keeps
  authentication working (`ASM-6`). The explicit `--tools` list omits every
  command-execution tool, so file confinement cannot be bypassed by shelling
  out (`NFR-1`'s second sentence); it keeps `Read`/`Glob`/`Grep` because an
  agent that cannot read the workspace cannot make a competent edit.
  `acceptEdits` is what applies the change with no TTY, and
  `--permission-prompts none` makes everything else fail closed rather than
  hang. `--strict-mcp-config` with no `--mcp-config` means no MCP server is
  loaded (`--restricted`'s own help text names this as the way to skip them).
  `--disable-slash-commands` means a prompt that happens to start with `/`
  is treated as text, not as a skill invocation. The prompt goes on stdin
  rather than argv so it is not visible in `ps` output and is not subject to
  an argv length limit. The preamble exists because the agent otherwise has
  to infer the manifest format from the files; it is fixed and quoted here in
  full precisely so a reviewer can see that it adds context and no authority.

  Two properties of this command are worth stating explicitly because a
  reader will otherwise wonder. First, **none of the five permitted tools can
  delete a file.** `deleted` therefore appears throughout this design
  (`TG-3`, `FR-5`, `CTR-2`'s `changeType`, `AC-8`) as defence-in-depth
  against a future change to the tool list or to the CLI, and is exercised
  only by `DEC-14`'s stand-ins — not because the chosen tool set can reach
  it. Second, **`--restricted` does not remove hooks.** Its own help text
  says it ignores user, project and local settings files while "managed
  settings and `--settings` still apply", and says nothing about hooks or
  plugins; `--bare` is the flag documented to skip hooks "defined in settings
  and by installed plugins". A hook from managed (policy) settings or an
  installed plugin therefore runs an arbitrary command for this invocation,
  outside the tool allow-list and outside the file confinement. There is no
  free fix: `--bare` would remove them and break authentication (`ASM-6`),
  and a `--settings` document cannot override managed settings. This is
  accepted as `RISK-10` rather than hidden, on the grounds that those hooks
  are the operator's own machine configuration — the same trust the operator
  already extends by running `editor serve` at all.
- Alternatives considered: `--bare` — rejected, its own help states
  authentication becomes `ANTHROPIC_API_KEY`/`apiKeyHelper` only, which
  breaks a subscription operator (`ASM-6`); `--dangerously-skip-permissions`
  — rejected outright, it is the opposite of this run's purpose;
  `--permission-mode bypassPermissions` — rejected for the same reason, and
  `--restricted` refuses it anyway; passing the prompt as a positional
  argument — rejected per `ps`-visibility and length; `--max-budget-usd` as
  the only bound — considered and kept out of the default command because a
  dollar bound does not bound wall-clock time, which is what `NFR-2` is about
  (noted as `DEF-3`); draining stdout/stderr on reader threads instead of
  spooling to files — rejected, two pipes plus a timeout is the classic
  `ProcessBuilder` deadlock, and file redirection removes the whole class of
  bug for the cost of two temp files; `--no-session-persistence` — considered
  and not taken: `F-6` showed the CLI writes nothing into its working
  directory (`ASM-3b`), so it buys nothing for containment, and keeping
  persistence leaves `DEF-5`'s refinement loop cheap to add later.
- Tradeoffs: the flag set is coupled to one CLI's grammar and will need
  revisiting if that grammar changes; `RISK-3` and `DEC-11`'s availability
  probe are how a mismatch surfaces as a clear message instead of a hang.
- Linked requirement: `FR-2`, `NFR-1`, `NFR-4`, `AC-1`, `AC-12`.

`DEC-5 — Bounded capture, refused rather than truncated; a VCS directory is warned about, not refused`

- Decision: `capture` runs in **two passes**. The first is a metadata-only
  survey that walks the tree, classifies every entry, and totals the file
  count and content size; every refusal — a symbolic link or other
  non-regular entry (`DEC-15`), or either bound exceeded — happens there,
  before one byte of content is read. The second pass reads content and
  cannot refuse, so a capture that starts reading always completes. The
  bounds are `5000` files and `64 MiB`; a refusal names **what was actually
  found** alongside the bound ("holds 50123 files, more than the 5000 this
  capability will take custody of"), which `ClaudeBridge` turns into a `409`.
  The two-pass shape exists precisely so those figures are real: an
  early-aborting single pass can only report that a bound was passed, which
  tells the operator nothing they can act on.
  Separately, if the workspace directory contains a `.git`, `.hg` or `.svn`
  directory, the bridge does **not** refuse; it reports
  `workspaceContainsVcsDirectory: true` in `GET /api/claude/status` and in
  the invoke response, and the webapp shows it in the pending banner.
- Rationale: the bounds exist because `DEC-3`'s capture is memory held for as
  long as a human takes to review, and the served directory is chosen by the
  operator. They are deliberately *not* set high enough to accommodate a
  whole project root. Per `ASM-5`, `README.md`'s documented container
  invocation makes the served directory the operator's mounted project root,
  so a large tree will exceed these bounds. That is the intended outcome, not
  a defect: a tool whose discard restores *everything* under the served
  directory should refuse to take custody of an operator's whole project
  rather than quietly take it. The refusal therefore carries the bound, the
  observed figures and the remedy — point `--workspace` at a workspace file
  in a dedicated directory, as `.custom/workspace.yaml` already is (154
  files, 688 KB; the test fixture is 3 files). `IMP-8` puts the same guidance
  in the README. The VCS case is
  warned rather than refused because refusing would rule out a perfectly
  reasonable layout (a workspace that *is* a small repository), while a
  discard that restores a `.git` directory the operator has been committing
  into concurrently is a genuine hazard the operator is the right party to
  judge (`RISK-4`).
- Alternatives considered: silently truncating the capture at the bound —
  rejected, it would break `NFR-1`'s `writable ⊆ captured` relation invisibly, which is the
  worst possible failure for this feature; excluding `.git` from the capture
  — rejected, that reintroduces exactly the writable-but-unrestorable gap the
  PRD's S3 finding was about; refusing outright on a VCS directory —
  rejected as over-reach, per the rationale above; making the bounds CLI
  options — rejected to keep the new CLI surface at four options, with
  `DEF-2` recording it if real use demands it.
- Tradeoffs: an operator with a genuinely large workspace cannot use the
  bridge without a code change. Accepted; the message is explicit and
  `DEF-2` names the remedy.
- Linked requirement: `FR-3`, `NFR-1`.

`DEC-6 — The capture is process-local; a pending change is never auto-discarded, and the operator is told so`

- Decision: the pending session lives in one `AtomicReference` on the
  `ClaudeBridge` bean and dies with the JVM. The shutdown hook added by
  `ServeEditorCommand` prints a warning naming the session, the number of
  affected files and each affected path, stating that those files remain in
  their changed state. There is no auto-discard on shutdown. The webapp's
  pending banner states both facts: the files are already changed, and
  stopping the server leaves them changed.

  That notice goes to `System.err` directly, not only through the logger.
  `application.properties` sets `quarkus.log.level=ERROR`, so a `log.warn`
  is discarded before it reaches any handler — verified the hard way: the
  first implementation of this hook shipped a recovery list that the README
  promised and that was invisible at the default log level (`prg-0007`
  `F-12`). An operator-facing safety notice must not depend on log
  configuration, so it is printed unconditionally, with the logger call kept
  alongside for deployments that do raise the level.
- Rationale: `FR-7`/`TC-3`. Auto-discarding on shutdown was considered and
  rejected as the more dangerous default: a `docker stop` or a `Ctrl+C`
  arriving a second after the operator decided to keep a change would
  silently destroy work they had already judged good, and an operator cannot
  un-destroy it. Leaving the files changed is recoverable by inspection;
  reverting them is not recoverable at all. Persisting the capture to disk so
  a later process could still discard was considered and rejected: it
  contradicts `DEC-3`'s reason for being in memory and creates a stale-state
  problem (a capture whose workspace moved on) worse than the one it solves.
- Alternatives considered: as above. Also: refusing to shut down while a
  change is pending — rejected, a tool that will not exit is worse than one
  that warns.
- Tradeoffs: the restart case is a real gap and is stated rather than
  papered over (`RISK-1`, `DEF-1`).
- Linked requirement: `FR-7`, `TC-3`, `AC-5`.

`DEC-7 — One pending session, enforced by compare-and-set before anything is captured or invoked`

- Decision: `invoke` first `compareAndSet`s the pending reference from `null`
  to a reserving placeholder. If that fails, it returns a `409` naming the
  existing session's id and affected file count, and has captured nothing and
  invoked nothing. All other pre-flight refusals (`DEC-11` availability,
  `DEC-8` containment, `DEC-5` bounds) run after the reservation succeeds and
  release the reservation on refusal.

  **Once `capture` has succeeded, a session is installed unconditionally**, in
  a `finally`: a non-empty diff installs a session carrying the capture and
  the rendered diffs; a *failure* in the post-invocation diff or
  diff-rendering step installs a session carrying the capture, an empty
  `changes` list and a `message` naming the failure; only a genuinely empty
  diff releases the capture and the reservation. There is no path on which
  the reservation stays set without a session id having been returned.
- Rationale: `FR-10`, and the single most dangerous hole this design had.
  Reserving *before* capturing is what makes two concurrent requests safe
  without a lock around the whole invocation, and releasing on refusal is
  what keeps a rejected request from wedging the bridge. The correctness
  argument for one-at-a-time is the PRD's: a second capture taken while the
  first change is unreviewed would include the first change, so discarding
  the second would silently promote the first.

  The `finally` rule exists because of what lies *after* the invocation. By
  then the agent has already edited files. If the diff re-walk or the diff
  rendering threw — an I/O error, an unreadable file, an out-of-memory on a
  large tree — the first draft of this design would have left the reservation
  set with no session id ever returned: the operator could not discard (no
  id), could not invoke again (the CAS fails), and a restart drops the
  capture (`DEC-6`). That is the one unrecoverable state the whole design
  exists to prevent, and it was reachable. Installing the session regardless
  converts it into "a change you can discard but cannot read a diff for",
  which is survivable.
- Alternatives considered: a `synchronized` method — rejected, it would make
  a second request *block* for the length of a multi-minute invocation rather
  than get a clear refusal (and with `DEC-16`'s executor the refusal is now
  genuinely immediate rather than queued behind the first request at the
  transport layer); allowing concurrent sessions keyed by id — rejected,
  overlapping captures of the same tree cannot both be correct; releasing the
  capture on a post-invocation failure — rejected, it is precisely the
  unrecoverable state described above.
- Tradeoffs: an operator whose invocation failed in a way that left a pending
  session must discard or accept it before trying again — intended. And a
  discard that keeps failing (`CTR-4`'s `500`) occupies the single session
  slot until it succeeds or the server is restarted; that is the correct
  priority, since the alternative is abandoning a half-restored tree in order
  to free a slot.
- Linked requirement: `FR-10`, `FR-5`, `NFR-3`.

`DEC-8 — Extract workspace-layout resolution into WorkspaceLayout, shared by EditorHttpServer and ClaudeBridge`

- Decision: move `EditorHttpServer`'s private `resolveManifestsDirs` and the
  thrice-inlined
  `workspaceFilePath.toAbsolutePath().normalize().getParent()` into a new
  `@ApplicationScoped WorkspaceLayout` with `workspaceDir(Path
  workspaceFilePath)` and `manifestsDirs(Path workspaceFilePath)`, injected
  into both `EditorHttpServer` and `ClaudeBridge`. Semantics are unchanged,
  including the deliberate absence of an existence check (callers keep their
  own `Files.isDirectory` guards).

  The new containment check `ClaudeBridge` performs on top of it (`FR-8`,
  `AC-14`) has its own resolution rule, stated here because both obvious
  readings are wrong. A configured directory that **does not exist** is
  treated as in scope, not as an error — matching today's behavior, where a
  configured-but-absent directory is simply skipped by every caller; using
  `toRealPath()` on it would throw `NoSuchFileException`, which
  `@SneakyThrows` would surface as a `500` instead of `AC-14`'s named `409`.
  A configured directory that **does** exist is resolved with `toRealPath()`
  and must `startsWith` the workspace directory's own `toRealPath()` — real
  paths rather than `normalize()`, because a symlinked manifests directory
  passes a textual `startsWith` while pointing outside, which is the same
  hole `DEC-15` closes for the capture.
- Rationale: `ClaudeBridge` needs the configured manifests directories for
  `FR-8`'s pre-flight containment check. Injecting `EditorHttpServer` into
  `ClaudeBridge` would be circular (the server routes to the bridge), and
  re-deriving the resolution in a second place would be the one duplication
  this design should not have, since a drift between the two would mean the
  containment check guards a different directory set than the file endpoints
  serve.
- Alternatives considered: widening `resolveManifestsDirs` to package-private
  and calling it on the injected server — rejected, circular; duplicating ~8
  lines in `ClaudeBridge` — rejected per the drift argument above; putting
  the pre-flight check in `EditorHttpServer` and leaving `ClaudeBridge`
  unaware — rejected, it splits one safety sequence across two classes, and
  `ClaudeBridge` is where every other refusal lives.
- Tradeoffs: this touches existing, already-gated code. Mitigated by the
  extraction being mechanical (same body, same `@SneakyThrows`, same absence
  of checks) and by `EditorHttpServerTest` remaining unmodified and green —
  it exercises both former call sites (`/api/manifests` listing and the
  per-file path guard), so a semantic slip fails the build (`TG-8`).
- Linked requirement: `FR-8`, `NFR-5`, `CON-2`.

`DEC-9 — A hand-written unified diff with three lines of context, computed server-side, with binary and size fallbacks`

- Decision: `LineDiff.unified(String beforeName, String afterName, String
  before, String after)` splits on `\n`, computes an LCS by dynamic
  programming, derives an edit script, groups it into hunks with three lines
  of context, and renders standard `--- a/… / +++ b/… / @@ -l,c +l,c @@`
  text. It refuses two cases rather than producing nonsense: if either side
  contains a `0x00` byte the file is reported `binary: true` with no diff
  text, and if either side exceeds `4000` lines the entry is reported
  `truncated: true` with no diff text (the `changeType` and the fact of the
  change are still reported in both cases). The diff is computed on the
  server, in `ClaudeBridge`, from the capture's bytes and the current bytes.
- Rationale: `CON-1` rules out a diff library, and the webapp has no test
  tooling, so computing the diff in Java is the version that can actually be
  unit-tested — which matters here because `FR-4` is a safety-adjacent
  requirement (a diff that lies is how a human accepts something they did not
  mean to). DP LCS is ~40 lines and exact; at the guarded sizes its
  O(n·m) cost is irrelevant (4000×4000 ints is the worst allowed case and is
  only reached by a file no manifest workspace has). Unified format is chosen
  because it is the format every reviewer already reads, and it renders with
  one CSS rule per line prefix.
- Alternatives considered: sending before/after content and diffing in
  JavaScript — rejected, it doubles the payload and puts a correctness-
  sensitive computation where this repository cannot test it; Myers' diff —
  rejected as unnecessary sophistication at these sizes; a whole-file
  replace representation (no line diff at all) — rejected, it fails `FR-4`'s
  "line-level" requirement and makes a one-character change unreviewable.
- Tradeoffs: no word-level or side-by-side view; `DEF-4`.
- Linked requirement: `FR-4`, `NFR-4`, `AC-3`.

`DEC-10 — The result is reported, never judged: invalid output is shown, and a failed or timed-out invocation still yields a discardable session`

- Decision: `ClaudeBridge` diffs the tree after the subprocess ends
  *regardless of its exit status*, and never parses or validates the changed
  files. If anything changed, a pending session is created even when the
  invocation failed or timed out. `POST /api/claude/invoke` therefore returns
  `200` with `outcome` ∈ `completed` | `failed` | `timeout` whenever the
  subprocess ran, and a non-2xx **only** when nothing ran and nothing is held
  (`TG-7`).
- Rationale: `FR-6` forbids auto-reverting on validation grounds, and a
  failed invocation is exactly the case where a human most needs to see what
  was left behind. The 2xx/non-2xx split is stated as an invariant because it
  is the one thing a client needs in order to know whether it has a session
  to clean up: without it, a `504` would be ambiguous between "nothing
  happened" and "half an edit is on disk and you now own it".
- Alternatives considered: non-2xx with the session id in the body for the
  failure cases — rejected, it makes every client branch on both the status
  code and the body to learn the same fact; auto-discarding on a failed
  invocation — rejected, it is `FR-6`'s prohibition wearing a different hat
  and it would destroy the evidence of the failure.
- Tradeoffs: a client that only checks the status code will treat a timeout
  as success. Mitigated by the webapp rendering `outcome` prominently, and
  by it being the documented contract (`CTR-2`).
- Linked requirement: `FR-6`, `NFR-2`, `AC-4`.

`DEC-11 — Availability is probed, cached per process, and exposed before any prompt is typed`

- Decision: `GET /api/claude/status` reports `available` plus, when false, a
  `reason`. Availability is `settings.enabled` and the executable being
  runnable, determined by running `<executable> --version` once with a short
  (10 s) timeout and caching the outcome for the process's lifetime. The
  probe runs with its working directory set to a **freshly created temp
  directory** — never the workspace directory and never the server's own
  working directory — and with `DEC-12`'s environment deny-list applied, so
  the one execution that happens before any capture cannot touch the
  workspace or inherit session coupling. Its stdout/stderr are discarded; only
  the exit status is used. The webapp calls `status` on load and disables the
  prompt control with the reason shown when unavailable. The same `reason`
  text is returned as a `503` body from `invoke`.
- Rationale: `FR-9`, `AC-17`. An operator running the published Docker image
  (`RISK-2`) would otherwise type a prompt, wait, and get a failure for a
  reason that has nothing to do with their prompt. `--version` is the
  cheapest possible liveness probe and, unlike a `PATH` lookup, it also
  catches a present-but-broken binary. Caching avoids a subprocess per page
  load; per-process rather than time-based because installing `claude` while
  the server runs is a restart-worthy event, not a poll-worthy one.
- Alternatives considered: `Files.isExecutable` on a resolved `PATH` entry —
  rejected, it duplicates the shell's resolution rules and cannot detect a
  binary that fails to start; probing on every request — rejected, a
  subprocess per page load; no probe at all, reporting only on failure —
  rejected by `AC-17`.
- Tradeoffs: a stale "unavailable" survives until restart; stated in the
  status response's own documentation (`CTR-1`).
- Linked requirement: `FR-9`, `AC-15`, `AC-16`, `AC-17`.

`DEC-12 — What the result may carry, and the environment scrubbing the subprocess gets`

- Decision: the invoke response carries exactly the fields enumerated in
  `CTR-2` and nothing derived from the server's environment. The denied-action
  record required by `FR-11` is passed through as the CLI reports it, with
  `CTR-6` owning exactly which upstream fields are read and how far they are
  truncated — because that record is the evidence `AC-12` is checked against
  and it is also the only field with disclosure consequences, so it is
  specified in one place. Separately, the subprocess's
  environment inherits the server's **minus** a fixed list of Claude Code
  session-coupling variables: `CLAUDECODE`, `CLAUDE_CODE_ENTRYPOINT`,
  `CLAUDE_CODE_SESSION_ID`, `CLAUDE_CODE_HOST_SESSION_ID`,
  `CLAUDE_CODE_CHILD_SESSION`, `CLAUDE_CODE_MESSAGING_SOCKET`,
  `CLAUDE_CODE_MESSAGING_TOKEN`, `CLAUDE_CODE_SDK_HAS_HOST_AUTH_REFRESH` and
  `CLAUDE_AGENT_SDK_VERSION`. Credential-bearing variables
  (`ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_BASE_URL`) are
  **not** removed, and are never logged or returned.
- Rationale: `NFR-6`. The scrubbing is not cosmetic: a server started from
  inside a Claude Code session inherits a parent session's id and messaging
  socket, and handing those to a child invocation couples two unrelated
  sessions. This was found while probing — the probes in `prg-0007` had to
  unset exactly these variables to get a clean invocation — so it is a
  finding, not a precaution. Credentials stay because `ASM-6` depends on
  them.
- Alternatives considered: a fully empty environment plus an allow-list —
  rejected, it would break `PATH`, `HOME` and the OAuth token file lookup, and
  the allow-list would be a maintenance liability; no scrubbing at all —
  rejected per the finding above; redacting the denied action's `detail`
  entirely — rejected, it is the evidence `AC-12` needs, and it is the
  operator's own file content, not a secret.
- Tradeoffs: the deny-list must be maintained if the CLI adds new
  session-coupling variables. A stale list degrades to today's behavior
  (coupling), not to a security failure.
- Linked requirement: `NFR-6`, `FR-11`, `AC-12`.

`DEC-13 — A wall-clock bound with forcible termination, defaulting to 300 s`

- Decision: `ClaudeCliInvoker` waits `settings.timeout` (default `300`
  seconds, settable with `--claude-timeout`); on expiry it calls
  `destroyForcibly()`, waits a further 5 s for the process to die, and
  reports `outcome: "timeout"`. `ClaudeBridge` then diffs and, if anything
  changed, still creates a discardable pending session (`DEC-10`).
- Rationale: `NFR-2`. 300 s is chosen from the probes: a narrow single-file
  edit took 3 turns and a few seconds, so five minutes accommodates a
  multi-file change with a wide margin while still failing fast enough that an
  operator does not conclude the tool is broken. `destroyForcibly` rather
  than `destroy` because a killed-but-lingering subprocess holding the
  workspace in an unknown state is the thing the bound exists to end.
- Alternatives considered: no bound — rejected by `NFR-2`; `--max-budget-usd`
  instead — rejected, a cost bound does not bound time (`DEF-3` keeps it as a
  possible addition); a bound derived from workspace size — rejected as
  unjustified complexity.
- Tradeoffs: a legitimately long change is cut off; the operator can raise
  the bound at startup, and the partial result is still reviewable and
  discardable rather than lost.
- Linked requirement: `NFR-2`.

`DEC-14 — Automated tests use a stand-in executable, never the real claude; the real binary is exercised only in hand-run verification`

- Decision: `ClaudeBridgeTest` writes small executable shell scripts into a
  temp directory and starts the server with
  `settings.executable` pointing at one. Scripts cover: a well-behaved edit
  (mutates a manifest, prints a valid JSON result), a creation, a deletion, a
  no-op, a non-zero exit after a partial edit, a sleeper that outruns a
  deliberately short timeout, a non-JSON stdout, and a denial-reporting
  result. The real `claude` binary is never invoked from the test suite.
- Rationale: a test that invokes the real binary would be non-deterministic,
  network-dependent, credential-dependent and would spend the operator's
  money on every `./mvnw verify` — and it would test the model, not this
  code. Every behavior this run owns (capture, diff, session lifecycle,
  accept, discard, refusals, timeout, bad output handling) is exercised
  deterministically by a stand-in. The behaviors only the real binary can
  demonstrate (that the flag set applies edits with no TTY, and that an
  out-of-workspace write is denied by the harness) are exactly the ones
  verified by hand against a disposable workspace and recorded in
  `prg-0007`/this document's verification section.
- Alternatives considered: mocking `ClaudeCliInvoker` with
  `quarkus-junit-mockito` — rejected, it would skip the `ProcessBuilder`
  wiring (working directory, stdin delivery, spool files outside the
  workspace, exit-status handling), which is where the bugs live; invoking
  the real binary behind an environment-gated tag — rejected, an
  unverifiable test that is skipped in CI is worse than an honest manual
  check that is written down.
- Tradeoffs: `ASM-1`'s flag set is not regression-tested; if a future CLI
  version changes it, `./mvnw verify` stays green and the capability breaks
  at runtime with `DEC-11`'s message. Recorded as `RISK-3`.
- Linked requirement: `NFR-2`'s validation, `NFR-5`, all of
  "Observability and Verification".

`DEC-15 — A symbolic link or any other non-regular entry under the workspace directory is a refusal, not a special case`

- Decision: `WorkspaceCapture.capture` classifies every entry with
  `LinkOption.NOFOLLOW_LINKS` and refuses — before any invocation — if any
  entry under the workspace directory is a symbolic link or any other
  non-regular, non-directory entry (fifo, socket, device node), naming the
  offending path in the `409`. `Files.walk` is used without `FOLLOW_LINKS`,
  so a directory symlink is seen as a link rather than traversed. This
  classification happens in `DEC-5`'s metadata-only first pass, alongside the
  bound checks, so an unrepresentable or oversized tree is refused before any
  content is read.
- Rationale: a symlink is the one construct that breaks the
  `writable ⊆ captured` invariant, and it breaks it silently in the worst
  direction. A fifo or socket breaks it more mildly — such an entry is not a
  regular file, so it is neither captured nor in restore's deletion set, and
  would survive a "byte-identical" discard — and is refused alongside, because
  one rule is easier to review than two.
  `Files.isRegularFile` follows links by default, so a link inside the
  workspace pointing at a file outside it would be captured as though it were
  an inside file — and, worse, `restore` would write *through* the link,
  modifying a file outside the workspace that the whole design promises never
  to touch. Containment via the subprocess's working directory is a *path*
  confinement, so it cannot be relied on to resolve a link's target either.
  Refusing is the only answer that keeps the invariant exactly true, and it is
  cheap: a manifest workspace has no reason to contain symlinks.
- Alternatives considered: following links but refusing only when a link's
  `toRealPath()` escapes the workspace directory's real path — rejected as a
  near-miss: it handles the outside-pointing case but leaves inside-pointing
  links capable of producing two capture entries for one inode, which makes
  "byte-identical restore" ambiguous about ordering; skipping links silently
  — rejected outright, it creates writable-but-uncaptured paths, i.e. exactly
  the S3 defect the PRD's review found in the first draft; following and
  restoring through links — rejected, it writes outside the workspace.
  Hard links need no special handling and get none: a hard link's content is
  captured and restored under its in-workspace name, so the relation holds.
- Tradeoffs: a workspace that legitimately symlinks a shared manifests
  directory cannot use the bridge (the rest of the editor still serves it
  normally, exactly as in `DEC-8`'s containment case). `DEF-6`.
- Linked requirement: `NFR-1`, `FR-3`, `FR-8`.

`DEC-16 — Give the server a small thread pool, so a long invocation does not block every other route`

- Decision: `EditorHttpServer.start` calls
  `server.setExecutor(Executors.newFixedThreadPool(4))` and `stop` shuts that
  executor down after stopping the server. No endpoint's request or response
  contract changes.
- Rationale: `EditorHttpServer` as it stands never calls `setExecutor`, and
  `com.sun.net.httpserver` with a null executor runs **every** handler on the
  single thread `start()` creates. Before this run that was harmless — every
  existing handler is a parse-and-respond. With a 300-second invocation on
  that thread it is not: `GET /api/claude/status`, the tree, the graph and —
  worst of all — `accept`/`discard` would all be unserviceable for the
  duration, so the operator could neither see nor undo the change that was
  blocking them. It also makes `DEC-7`'s one-at-a-time *refusal* real: on a
  single thread a second `invoke` does not get a `409`, it simply waits at
  the transport layer, which is the behavior `DEC-7` chose CAS over
  `synchronized` specifically to avoid.
- Alternatives considered: running the invocation on a worker thread and
  returning a poll token from `invoke` — rejected as a larger contract (the
  webapp would need polling, and `CTR-2`'s clean "2xx means it ran" invariant
  would be lost) for a benefit a thread pool already delivers; leaving the
  server single-threaded and documenting it — rejected, "you cannot undo the
  change while the change is in progress" is not a documentable limitation,
  it is a defect; a cached/unbounded pool — rejected, four threads is ample
  for one operator and an unbounded pool on an unauthenticated port is a
  trivially abusable resource.
- Tradeoffs: this touches a line in code three prior runs' gates already
  passed (`RISK-7`'s concern, same mitigation: the existing unmodified tests
  must stay green). Handlers now run concurrently, so `ClaudeBridge`'s state
  must be — and is — the single `AtomicReference` of `DEC-7` rather than
  anything relying on serialized access.
- Linked requirement: `FR-10`, `NFR-2`, `NFR-5`.

# Repository Impact

`IMP-1 — EditorHttpServer.java: new /api/claude/ context, new start overload, an executor, two call sites delegated`
- Path(s): `src/main/java/io/morin/archicode/cli/EditorHttpServer.java`
- Change type: modify (additive route group and overload; `setExecutor` added
  to `start` and its shutdown to `stop`; two private helper bodies replaced
  by delegation)
- Why impacted: `TG-1`, `TG-6`, `TG-8`, `DEC-1`, `DEC-8`, `DEC-16`.
- Linked PRD IDs: `FR-1`, `FR-8`, `FR-9`, `NFR-5`.
- Risks / notes: `start(String, int, Path)` keeps its exact signature and
  delegates to `start(String, int, Path, ClaudeBridge.Settings)` with
  defaults, so `EditorHttpServerTest` is untouched (`CON-2`). The new context
  is `/api/claude/` (trailing slash), which cannot shadow any existing
  context (`ASM-4`). `resolveManifestsDirs` and the inline workspace-dir
  derivations are replaced by `WorkspaceLayout` calls with identical
  semantics — the existing tests are the regression net (`DEC-8`). The
  executor is a four-thread fixed pool, shut down in `stop` after
  `server.stop(0)`; it changes threading, not any request or response shape,
  so `NFR-5` holds (`DEC-16`).

`IMP-2 — New: WorkspaceCapture.java`
- Path(s): `src/main/java/io/morin/archicode/cli/WorkspaceCapture.java`
- Change type: add
- Why impacted: `TG-2`, `TG-3`, `DEC-3`, `DEC-5`.
- Linked PRD IDs: `FR-3`, `FR-5`, `NFR-1`, `NFR-3`.
- Risks / notes: this is the class the discard guarantee *is*. Its algorithm
  is specified in `DEC-3` and nowhere else; implement it from there. Two
  structural properties a reviewer should check rather than infer: it has no
  reference to `LineDiff` or to any diff structure (`NFR-3`), and it holds
  bytes rather than strings. It is unit-tested directly
  (`WorkspaceCaptureTest`) with no HTTP and no subprocess.

`IMP-3 — New: LineDiff.java`
- Path(s): `src/main/java/io/morin/archicode/cli/LineDiff.java`
- Change type: add
- Why impacted: `TG-1`'s reviewable result, `DEC-9`.
- Linked PRD IDs: `FR-4`.
- Risks / notes: pure function, no I/O, no state. Binary and oversize guards
  are part of its contract, not the caller's.

`IMP-4 — New: ClaudeCliInvoker.java`
- Path(s): `src/main/java/io/morin/archicode/cli/ClaudeCliInvoker.java`
- Change type: add
- Why impacted: `DEC-4`, `DEC-11`, `DEC-12`, `DEC-13`.
- Linked PRD IDs: `FR-2`, `NFR-1`, `NFR-2`, `NFR-6`.
- Risks / notes: the only class that may construct a `ProcessBuilder`. Four
  invariants to check in review. (a) The working directory is the workspace
  directory and no `--add-dir` is present. (b) Every spool file (stdin,
  stdout, stderr) is created in a dedicated temp directory obtained from
  `Files.createTempDirectory`, with POSIX permissions `rw-------` on the
  files and `rwx------` on the directory, and the whole directory is deleted
  in a `finally`; the constructor asserts that the temp directory's real path
  is **not** under the workspace root and fails loudly if it is, which is
  what turns `CON-4` from a convention into a checked precondition (it also
  matters because the spool files carry the prompt and the full JSON result,
  including a denied write's content fragment — see `CTR-6` — which must not
  land world-readable in a shared `/tmp`). (c) The environment deny-list of
  `DEC-12` is applied, to the availability probe as well as to the
  invocation. (d) The availability probe runs in its own temp working
  directory, never the workspace and never the server's cwd (`DEC-11`).

`IMP-5 — New: WorkspaceLayout.java`
- Path(s): `src/main/java/io/morin/archicode/cli/WorkspaceLayout.java`
- Change type: add (extraction of existing behavior — `DEC-8`)
- Why impacted: `FR-8`, `NFR-5`.
- Linked PRD IDs: `FR-8`, `NFR-5`.
- Risks / notes: behavior must be identical to the code it replaces,
  including no existence filtering and `@SneakyThrows` on the raw-workspace
  parse.

`IMP-6 — New: ClaudeBridge.java`
- Path(s): `src/main/java/io/morin/archicode/cli/ClaudeBridge.java`
- Change type: add
- Why impacted: `TG-1`, `TG-5`, `TG-7`, `DEC-1`, `DEC-5`, `DEC-6`, `DEC-7`,
  `DEC-10`, `DEC-11`.
- Linked PRD IDs: `FR-1`, `FR-3`–`FR-11`.
- Risks / notes: holds the one pending session. `FLOW-1` owns the refusal
  ordering; implement it from there. The two properties a reviewer should
  check against it: every refusal before `capture` releases the reservation
  and leaves the filesystem untouched, and once `capture` has succeeded a
  session is installed unconditionally, in a `finally` (`DEC-7`) — the second
  is the one that closes the design's only unrecoverable state, so it is
  worth reading the code for rather than trusting the structure.

`IMP-7 — src/main/resources/editor-webapp/index.html: an "Assist" tab`
- Path(s): `src/main/resources/editor-webapp/index.html`
- Change type: modify (additive: one tab button, one `<section>`, one block
  of JS in the existing IIFE)
- Why impacted: `TG-6`, `FR-4`, `FR-5`, `FR-7`, `FR-11`, `AC-3`–`AC-5`,
  `AC-11`, `AC-16`, `AC-17`.
- Linked PRD IDs: `FR-4`, `FR-5`, `FR-7`, `FR-9`, `FR-11`.
- Risks / notes: reuses `switchTab()`, `qs()` and the existing `.error-box` /
  `.success-indicator` styles rather than introducing a second visual
  language. The pending banner must carry `FR-7`'s statement verbatim in
  substance (files already changed; discard is what restores them; stopping
  the server leaves them changed). While a change is pending, the Save button
  and the tree's open-for-edit affordance are disabled, with the banner
  saying why (`RISK-8`'s client-side mitigation) — this is webapp behavior
  only and changes no endpoint contract. No new external request, no CDN
  (`CON-1`).

`IMP-8 — README.md`
- Path(s): `README.md`
- Change type: modify (additive paragraph in the existing "Serve the manifest
  editor" section)
- Why impacted: `FR-12`.
- Linked PRD IDs: `FR-12`.
- Risks / notes: must state four things. `TC-4`'s precondition (the published
  image has no `claude`); the `--no-claude` switch; that the bridge's capture
  and blast radius are the **workspace file's own directory**, so a discard
  restores everything under it (`RISK-4`); and therefore that the bridge
  wants `editor serve` pointed at a workspace file in a dedicated directory
  (e.g. `-w .custom/workspace.yaml`) rather than at a project root, with a
  note that pointing it at a project root is what makes `DEC-5`'s capture
  bound fire (`ASM-5`, `RISK-11`). Does not change the existing `docker run`
  example or its loopback port-mapping guidance — the new guidance is an
  added paragraph recommending `--workspace` be pointed at a dedicated
  directory *when using the bridge*, not a change to how the editor is
  normally run.

`IMP-9 — New tests and one new fixture workspace`
- Path(s): `src/test/java/io/morin/archicode/cli/WorkspaceCaptureTest.java`,
  `src/test/java/io/morin/archicode/cli/LineDiffTest.java`,
  `src/test/java/io/morin/archicode/cli/ClaudeBridgeTest.java`,
  `src/test/workspaces/editor_outside_manifests/workspace.yaml`
- Change type: add
- Why impacted: every `TG-`; `DEC-14`.
- Linked PRD IDs: all `AC-` except those marked hand-verified below.
- Risks / notes: `EditorHttpServerTest.java` is **not** edited (`NFR-5`).
  The new fixture's `settings.manifests.paths` is `["../outside_manifests"]`,
  which resolves outside its workspace directory and is what `AC-14`'s test
  asserts against. `ClaudeBridgeTest` must assert, for the discard cases, on
  byte equality against content captured by the test itself before the
  stand-in runs — not on the bridge's own diff (`NFR-3`).

`IMP-10 — ServeEditorCommand.java: four new options`
- Path(s): `src/main/java/io/morin/archicode/cli/ServeEditorCommand.java`
- Change type: modify (additive options; `start` call gains the settings
  argument; shutdown hook gains the pending-session warning)
- Why impacted: `DEC-6`, `DEC-11`, `DEC-13`.
- Linked PRD IDs: `FR-9`, `NFR-2`.
- Risks / notes: `--claude` is declared `negatable` so `--no-claude` works;
  default `true`. `--claude-executable` defaults to `claude`,
  `--claude-model` to `sonnet`, `--claude-timeout` to `300` (seconds).

`IMP-11 — Files deliberately not touched`
- Path(s): `pom.xml`, `ArchiCode.java`, `EditorGroup.java`,
  `GetGraphQuery.java`, `GetSchemasQuery.java`, `MapperFactory.java`,
  `EditorHttpServerTest.java`, `src/test/workspaces/editor_manifests/**`
- Change type: none
- Why impacted: n/a — listed so `NFR-4`/`NFR-5` are auditable from the diff:
  no dependency is added and no pre-existing test or fixture is edited.
- Linked PRD IDs: `NFR-4`, `NFR-5`.

# Canonical Impact

Not applicable — no canonical registers declared. Re-confirmed directly for
this run rather than inherited: there is no `docs/CLAUDE.md`, and `docs/`
contains only `wav/` (no `adr/`, `arc/`, `dom/`, `ana/` or `bkg/`). Same
finding run-0004, run-0005 and run-0006 each recorded.

- `CI-arc-n`: None.
- `CI-dom-n`: None.

# Data Model and Contracts

`CTR-1 — GET /api/claude/status (new)`
- Current contract: none.
- Proposed contract: `200 application/json`.
  ```json
  {
    "enabled": true,
    "available": true,
    "reason": null,
    "model": "sonnet",
    "timeoutSeconds": 300,
    "workspaceContainsVcsDirectory": false,
    "pending": null
  }
  ```
  `enabled` reflects `--claude`/`--no-claude`. `available` is `enabled` and
  the executable being runnable, probed once per process (`DEC-11`) — it does
  not re-probe, so installing `claude` while the server runs requires a
  restart. `reason` is `null` when `available`, otherwise a human-readable
  sentence (`FR-9`). The executable's path is deliberately **not** returned.
  `GET` only; other methods `405`.

  **This contract owns the `pending` object's shape**, and `CTR-2` embeds the
  same object under the same key so one client parser serves both. `pending`
  is `null` when no change is under review, otherwise:
  ```json
  {
    "sessionId": "e2b9…",
    "outcome": "completed",
    "message": null,
    "workspaceContainsVcsDirectory": false,
    "filesCaptured": 154,
    "permissionDenials": [],
    "changes": [
      {
        "path": "manifests/sol_a.yaml",
        "changeType": "modified",
        "binary": false,
        "truncated": false,
        "diff": "--- a/manifests/sol_a.yaml\n+++ b/…\n@@ -4,3 +4,3 @@\n …"
      }
    ]
  }
  ```
  This is what lets a page reload recover a change under review rather than
  orphaning it: the webapp renders the diff and the accept/discard controls
  from `pending` alone, with no memory of the request that produced it.
  `changes` may legitimately be empty while `pending` is non-null — that is
  `DEC-7`'s post-invocation-failure case, a change that must still be
  discardable even though no diff could be computed; `message` then says why.
- Affected files: `EditorHttpServer.java`, `ClaudeBridge.java`.
- Migration or compatibility notes: purely additive, new path.
- Linked PRD IDs: `FR-9`, `AC-17`.

`CTR-2 — POST /api/claude/invoke (new)`
- Current contract: none.
- Proposed contract: request `text/plain; charset=utf-8`, body = the prompt,
  **no other field of any kind** (`AC-13`). A blank body is `400`.

  `200 application/json` whenever the subprocess ran:
  ```json
  {
    "outcome": "completed",
    "changed": true,
    "agentSummary": "Added a description to Solution A.",
    "numTurns": 3,
    "costUsd": 0.0195,
    "durationMs": 8421,
    "permissionDenials": [
      { "toolName": "Write", "filePath": "/outside/notes.md", "detail": "…" }
    ],
    "pending": { "...": "the CTR-1 pending object, or null when changed is false" }
  }
  ```
  `outcome` is `completed` | `failed` | `timeout` and duplicates
  `pending.outcome` when `pending` is present, so a caller that ignores
  `pending` still learns how the invocation went. `pending` is exactly
  `CTR-1`'s object — one shape, one parser — and is non-null exactly when
  `changed` is `true`; `pending.sessionId` is the id `CTR-3`/`CTR-4` take.

  `permissionDenials` appears **at this top level as well as inside
  `pending`**, and is `[]` when there were none. This is not redundancy: an
  invocation that tried to write outside the workspace is denied and therefore
  usually changes nothing, so `pending` is `null` and a denial reported only
  inside it would vanish in exactly the case where the containment guarantee
  had just done its job. Reporting it here is what makes `AC-12` checkable
  from the response. (`FR-11`. This was found by live verification against the
  real CLI rather than by the test suite — see `prg-0007` `F-11`.)
  Inside it, `changeType` is `created` | `modified` | `deleted`; for a
  `created` entry the diff's before side is empty and for a `deleted` entry
  the after side is; `binary`/`truncated` mean the change is real but no diff
  text is supplied (`DEC-9`), with `changeType` still accurate; and
  `permissionDenials` is `[]` when there were none (`FR-11`).

  **Status-code invariant (`TG-7`):** a non-2xx response means no `claude`
  invocation against the workspace ran, no capture is held and no file was
  touched. (The `503` path does execute `<executable> --version` as a
  subprocess — `DEC-11`'s availability probe — but in a temp working
  directory with a scrubbed environment, so it touches nothing in the
  workspace; the invariant is about workspace effects, not about process
  creation.) The non-2xx cases are
  `400` (blank prompt), `409` (a change is already pending — body names its
  id; or a configured manifests directory resolves outside the workspace
  directory — body names it; or the workspace contains a symbolic link or
  other non-regular entry — body names it, `DEC-15`; or the capture bound was
  exceeded — body gives the bound, the observed figures and the remedy,
  `DEC-5`), `503` (the bridge is disabled, or `claude` is not runnable — body
  is `CTR-1`'s `reason`), and `500` (the capture itself failed). `405` for a
  non-`POST` method. Note what is deliberately *not* in this list: a failure
  after the invocation has run is never a non-2xx, because by then there is a
  change on disk and the operator needs a session id in order to discard it
  (`DEC-7`, `DEC-10`).
- Affected files: `EditorHttpServer.java`, `ClaudeBridge.java`,
  `ClaudeCliInvoker.java`, `LineDiff.java`, `WorkspaceCapture.java`.
- Migration or compatibility notes: purely additive, new path.
- Linked PRD IDs: `FR-1`, `FR-3`, `FR-4`, `FR-6`, `FR-8`, `FR-10`, `FR-11`,
  `NFR-2`, `NFR-6`, `AC-2`, `AC-3`, `AC-4`, `AC-12`–`AC-15`.

`CTR-3 — POST /api/claude/accept/{sessionId} (new)`
- Current contract: none.
- Proposed contract: no request body. `200 application/json`
  `{"accepted": true, "sessionId": "…", "files": 1}` — the files are left
  exactly as the invocation produced them and the capture is released.
  `404` when `{sessionId}` is not the pending session's id (including after
  it has already been accepted or discarded — `AC-11`). `405` for a
  non-`POST` method.
- Affected files: `EditorHttpServer.java`, `ClaudeBridge.java`.
- Migration or compatibility notes: purely additive.
- Linked PRD IDs: `FR-5`, `AC-10`, `AC-11`.

`CTR-4 — POST /api/claude/discard/{sessionId} (new)`
- Current contract: none.
- Proposed contract: no request body. `200 application/json`
  `{"discarded": true, "sessionId": "…", "filesRestored": 1,
  "filesDeleted": 0, "directoriesRemoved": 0}`. The **guarantee** on a `200`:
  every captured file is byte-identical to its pre-invocation content, every
  captured file the invocation deleted exists again, and every file and
  directory created under the workspace directory that the capture did not
  hold is gone. The algorithm that achieves this, and the fact that it reads
  the capture alone and never the diff (`NFR-3`), is specified once in
  `DEC-3`. `404` as `CTR-3`. `500` if the restore itself fails — in which
  case the session is **kept** pending (not released) and the body names the
  paths that could not be restored; a retry is safe because the capture is
  immutable and `DEC-3`'s restore is idempotent.
- Affected files: `EditorHttpServer.java`, `ClaudeBridge.java`,
  `WorkspaceCapture.java`.
- Migration or compatibility notes: purely additive.
- Linked PRD IDs: `FR-5`, `NFR-3`, `AC-6`–`AC-9`.

`CTR-5 — editor serve CLI options (changed)`
- Current contract: `-p/--port` (default `8080`), `--host` (default
  `0.0.0.0`).
- Proposed contract: adds `--claude` / `--no-claude` (default enabled),
  `--claude-executable <path>` (default `claude`), `--claude-model <model>`
  (default `sonnet`), `--claude-timeout <seconds>` (default `300`). No
  existing option changes.
- Affected files: `ServeEditorCommand.java`, `README.md`.
- Migration or compatibility notes: additive options with defaults, so every
  existing invocation keeps working and gains the capability when `claude` is
  present.
- Linked PRD IDs: `FR-9`, `NFR-2`, `TC-5`.

`CTR-6 — integration contract with the claude CLI (new, external)`
- Current contract: none — this run introduces the repository's first
  external-process integration.
- Proposed contract (consumed, not controlled by this repository): the
  executable accepts the `DEC-4` flag set; `-p` with no positional prompt
  reads the prompt from stdin; `--output-format json` writes one JSON object
  to stdout whose consumed fields are `subtype`, `is_error`, `result`,
  `num_turns`, `total_cost_usd`, `duration_ms` and `permission_denials[]`.
  **This contract owns the denial mapping** (`FR-11`, `AC-12`): each
  `permission_denials[]` entry's `tool_name` becomes `toolName`, its
  `tool_input.file_path` becomes `filePath`, and its `tool_input.content`
  becomes `detail`, truncated to the first 2000 characters with a trailing
  `"…"` when longer. Any of the three absent yields `null` for that field
  rather than an error. `--version` exits `0` for a healthy install. Verified
  against `2.1.280` (`ASM-1`–`ASM-3b`); the three denial fields specifically
  were observed in `prg-0007` `F-4`'s recorded denial entry.
  Every consumed field is read defensively: a missing or differently-typed
  field degrades that response field to `null` rather than failing the
  request (`ASM-2`).
- Affected files: `ClaudeCliInvoker.java`.
- Migration or compatibility notes: an upstream grammar change surfaces as
  `DEC-11`'s unavailability message or as `outcome: "failed"` with the raw
  stdout in `message`; it cannot leave a change unreviewable, because the
  diff and the capture do not depend on the CLI's output at all (`RISK-3`).
- Linked PRD IDs: `FR-2`, `FR-11`.

# Interfaces and Behavior

`ClaudeBridge` (new public surface, consumed only by `EditorHttpServer`):

- `Status status(Path workspaceFilePath)` — `CTR-1`'s payload.
- `InvokeResult invoke(Path workspaceFilePath, String prompt)` — performs the
  whole `FLOW-1`; throws a `BridgeRefusal` carrying an HTTP status and a
  message for every pre-flight refusal.
- `AcceptResult accept(String sessionId)` / `DiscardResult discard(String
  sessionId)` — `CTR-3`/`CTR-4`; both throw `BridgeRefusal(404)` for an
  unknown id.
- `Settings` — `enabled`, `executable`, `model`, `timeout`, and the capture
  bounds; `Settings.defaults()` is what the three-argument
  `EditorHttpServer.start` uses (`CON-2`).

`WorkspaceCapture` — `capture(root, maxFiles, maxBytes)` (static factory),
`diff(root)` → ordered `List<FileChange>`, `restore(root)` → `RestoreReport`,
`fileCount()`. No other public method, and in particular no method that takes
a diff.

User-facing behavior: the webapp gains an "Assist" tab. On load it calls
`GET /api/claude/status`. If `available` is false the prompt box is disabled
and the `reason` is shown in place of the submit control (`AC-17`). If
`pending` is non-null — a reloaded page — the diff and the accept/discard
controls are rendered from it, so a refresh cannot orphan a change under
review. Submitting posts the prompt, shows a progress indicator, then renders
`outcome`, the agent's summary, cost/turns/duration, any permission denials,
and one collapsible block per changed file with its diff. When `changed` is
true, a prominent banner states that the files on disk are already changed,
that Discard restores them, and that stopping the server leaves them changed
(`FR-7`); Accept and Discard are the only two controls. After either, the
tree and graph are reloaded and the banner is replaced by the outcome.

Error states: a non-2xx from `invoke` renders its plain-text body in the
existing `.error-box` style and leaves the prompt text in place; `outcome`
of `failed` or `timeout` renders `message` in the same style *alongside* the
diff and the accept/discard controls, because a failed invocation that
changed files still needs a decision.

# Flows and Processing Logic

`FLOW-1 — Prose request → reviewable pending change`
- Trigger: `POST /api/claude/invoke` with a prompt body.
- Steps, in this order, because the order is the safety property:
  1. Reject a blank prompt (`400`).
  2. `compareAndSet` the pending reference `null` → reservation; on failure
     `409` naming the existing session (`DEC-7`).
  3. Availability: `enabled` and the probed executable; on failure release the
     reservation and `503` (`DEC-11`).
  4. Containment pre-flight: every configured manifests directory resolves
     inside the workspace directory; on failure release and `409` naming the
     offender (`FR-8`, `DEC-8`).
  5. `WorkspaceCapture.capture(workspaceDir, …)`; on a symbolic link found
     release and `409` naming it (`DEC-15`); on bound exceeded release and
     `409` with the figures (the bound aborts the walk, so nothing large is
     ever read); on I/O failure release and `500` (`DEC-5`).
  6. `ClaudeCliInvoker.run(prompt, workspaceDir, settings)` — spool files
     outside the workspace, environment scrubbed, bounded wait (`DEC-4`,
     `DEC-12`, `DEC-13`).
  7. `capture.diff(workspaceDir)` — unconditionally, whatever the exit status
     (`DEC-10`).
  8. If the diff is empty: release the capture and the reservation, return
     `changed: false` with the outcome (`AC-4`). Otherwise: install the
     session with the capture and the rendered diffs, return `changed: true`
     with `CTR-1`'s `pending` object (`DEC-9`).
- Branches / failure paths: **this flow owns the ordering**; `DEC-7` owns why.
  Steps 1-5 touch no file and leave nothing pending, so every refusal above
  `capture` is a true no-op. From the moment step 5 succeeds, steps 6-8 run
  under a `finally` that guarantees one of exactly two end states: nothing
  pending (the diff was genuinely empty), or a fully formed, discardable
  session — including on `failed`, on `timeout`, and including when step 7 or
  step 8 *itself* throws, in which case the session is installed with an
  empty `changes` list and a `message` naming the failure. There is no third
  state, and in particular no state in which the reservation is held but no
  `sessionId` was ever returned (`DEC-7`).
- Final output: `CTR-2`'s body.
- Linked PRD IDs: `FR-1`–`FR-4`, `FR-6`, `FR-8`–`FR-11`, `NFR-1`, `NFR-2`.

`FLOW-2 — Accept or discard`
- Trigger: `POST /api/claude/accept/{id}` or `/discard/{id}`.
- Steps: match `{id}` against the pending session (`404` otherwise). Accept:
  clear the session, release the capture, return the affected file count —
  nothing on disk is touched. Discard: `capture.restore(workspaceDir)`, whose
  algorithm is specified in `DEC-3`; on success clear the session and return
  the counts.
- Branches / failure paths: a restore failure returns `500`, names the
  unrestored paths, and **keeps** the session pending so the operator can
  retry (`CTR-4`) — the one place in the design where a failure deliberately
  does not clean up, because dropping the capture there would strand the
  operator with a half-restored tree and no way back. The retry is safe
  rather than merely hopeful because the capture is immutable and `DEC-3`'s
  restore is idempotent, so it converges from whatever partial state the
  failure left. The cost is that the failed session occupies `DEC-7`'s single
  slot until it succeeds; that is the right priority.
- Final output: `CTR-3`/`CTR-4`'s body; on discard, a workspace
  byte-identical to its pre-invocation state.
- Linked PRD IDs: `FR-5`, `NFR-3`, `AC-6`–`AC-11`.

```plantuml
@startuml
start
:POST /api/claude/invoke (body = prompt);
if (prompt blank?) then (yes)
  :400;
  stop
endif
if (CAS pending null -> reservation) then (failed)
  :409 (names pending session);
  stop
endif
if (enabled and claude runnable?) then (no)
  :release reservation;
  :503 (reason);
  stop
endif
if (all configured manifests dirs inside workspace dir?) then (no)
  :release reservation;
  :409 (names offender);
  stop
endif
:capture workspace dir (bounded, no symlinks);
if (symlink / bound exceeded / IO error?) then (yes)
  :release reservation;
  :409 / 500;
  stop
endif
note right: everything above this line\nis side-effect-free
:run claude (cwd = workspace dir, bounded, scrubbed env);
:diff current tree vs capture
(regardless of exit status);
if (diff empty?) then (yes)
  :release capture + reservation;
  :200 changed=false, outcome;
  stop
elseif (diff or render threw?) then (yes)
  :install session (capture, empty changes, message);
  :200 changed=true, sessionId, outcome;
  stop
endif
:install pending session (capture + diff);
:200 changed=true, pending{sessionId, changes, outcome};
:operator reviews;
if (decision) then (accept)
  :clear session, release capture;
  :files left as produced;
else (discard)
  :restore from capture ALONE;
  if (restore ok?) then (yes)
    :clear session;
  else (no)
    :500, keep session pending for retry;
  endif
endif
stop
@enduml
```

A reviewer should check four properties against this diagram. Every refusal
sits above `capture`, so a refused request is a true no-op. `diff` is
unconditional and sits below `run`, so a failed or killed invocation still
produces a discardable session rather than an orphaned edit. Every path
below `capture` reaches either "release" or "install session" — the
`elseif` branch exists precisely so that a throw in `diff` or in rendering
cannot fall through to neither. And the discard branch's only input is the
capture: there is no arrow from the diff into the restore (`NFR-3`).

# Reliability, Performance, and Scalability

One local operator, one pending change, unchanged from run-0005/0006's
posture. The new costs: a full recursive walk of the workspace directory
twice per invocation (once to capture, once to diff) plus the capture held in
memory for the review's duration — for `.custom`'s 154 files / 688 KB this is
immaterial, and `DEC-5`'s bounds cap the worst case at 5000 files / 64 MiB.
The diff's DP LCS is O(n·m) per changed file, guarded at 4000 lines a side.
The `claude` subprocess dominates every timing figure (seconds to minutes) and
is bounded at 300 s by default (`DEC-13`).

Threading changes in this run, and it had to. `EditorHttpServer` never called
`setExecutor`, so `com.sun.net.httpserver` ran every handler on the one
thread `start()` creates — fine for four parse-and-respond handlers, and
unacceptable once one handler can occupy that thread for five minutes, since
`status`, the tree, the graph and `accept`/`discard` would all have been
unserviceable for the duration. `DEC-16` gives the server a four-thread fixed
pool. With it, an in-flight invocation occupies one pool thread, concurrent
reads of `/api/graph` and `/api/manifests` proceed, `accept`/`discard` stay
reachable, and a concurrent second `invoke` gets `DEC-7`'s `409` immediately
rather than waiting at the transport layer. Handlers therefore now run
concurrently: the bridge's only mutable state is `DEC-7`'s single
`AtomicReference`, and the capture it holds is immutable (`DEC-3`).

# Security and Privacy

This run adds the largest new capability-surface in the wave, and it is worth
being precise about what does and does not change. **Unchanged:** no
authentication, no authorization, no TLS; anyone who can reach the port can
already read and write every manifest through `PUT /api/manifests/{path}`.
**Changed:** such a caller can now also cause an autonomous agent to run
against the workspace, spending the operator's Claude credits. The bridge's
answers to that are `DEC-2`'s containment (the agent cannot write outside the
workspace directory it is already possible to write via the existing
endpoints), `DEC-13`'s time bound, `DEC-7`'s one-at-a-time rule, and
`CTR-5`'s `--no-claude` for an operator who wants the editor without the
agent. The host-side port mapping remains the only exposure guard, as
run-0005's TDD and `README.md` both already state.

Prompt injection is a real and accepted exposure: the agent reads the
workspace's own files, so a manifest containing text addressed to the agent
can influence the edit. The blast radius is bounded by the same containment
(`NFR-1`) and the human review gate (`FR-4`/`FR-5`); it is not otherwise
mitigated, and `RISK-6` records it.

Two residuals in the containment story are named rather than implied, as
`NFR-1`'s last sentence requires. A symbolic link or other non-regular entry
under the workspace would break the `writable ⊆ captured` relation, so such a
workspace is refused outright (`DEC-15`). And hooks from managed settings or
installed plugins survive `--restricted` and are a command-execution path the
tool allow-list does not cover; there is no free fix and it is accepted as
`RISK-10`, on the basis that it is the operator's own machine configuration
and this run inherits that trust rather than expanding it.

`NFR-6` is discharged by `DEC-12`: the response's fields are the enumerated
set in `CTR-2`, no environment value is copied into a response or a log line,
and credential-bearing variables are passed to the subprocess but never read
by this code. The prompt itself is held only in memory and in a temp spool
file deleted after the invocation. `permissionDenials` can disclose a path
and a content fragment from a denied write — that is the operator's own
content and is `AC-12`'s evidence, and it is no more disclosure than the
existing `parseError` field run-0006 already accepted for the same threat
model.

# Observability and Verification

Primary gate:

```bash
JAVA_HOME=~/.sdkman/candidates/java/25.0.4-tem ./mvnw -B verify
```

Automated coverage (`DEC-14`, never the real binary):

| PRD `AC-` | Automated check |
| --- | --- |
| `AC-2` | `ClaudeBridgeTest`: stand-in edits one manifest; response's `changes` has exactly that one path. |
| `AC-3` | `ClaudeBridgeTest` × `LineDiffTest`: `changeType` for created/modified/deleted, and the diff text's `+`/`-` lines. |
| `AC-4` | `ClaudeBridgeTest`: no-op stand-in → `changed:false`, no `sessionId`. |
| `AC-6` | `ClaudeBridgeTest` + `WorkspaceCaptureTest`: checksums taken by the test before the stand-in runs, re-asserted after discard. |
| `AC-7` | stand-in creates a file (including in a new subdirectory); after discard the file and the directory are gone. |
| `AC-8` | stand-in deletes a file; after discard it exists with its original bytes. |
| `AC-9` | fixture workspaces contain no `.git`; every discard assertion above is therefore also this one. |
| `AC-10` | `ClaudeBridgeTest`: accept, then `GET /api/manifests/{path}` returns the changed content. |
| `AC-11` | accept then accept again, and accept then discard → `404`. |
| `AC-13` | `invoke` with a JSON body containing a `path` field is treated as prompt text; the handler reads no field from the body. |
| `AC-14` | `editor_outside_manifests` fixture → `409` naming the directory, and the stand-in's marker file is never created (nothing was invoked). |
| `AC-15` | `--claude-executable /nonexistent/claude` → `503` with the reason; `--no-claude` → `503`. |
| `NFR-2` | 1 s timeout + a sleeping stand-in → `outcome:"timeout"`, and the session is still discardable. |
| `NFR-3` | `WorkspaceCaptureTest` exercises `restore` with no diff in scope at all. |
| `NFR-5` | `EditorHttpServerTest` passes unmodified; `git diff` shows no change to it or to `pom.xml`. |
| `FR-10` | two genuinely concurrent `invoke` calls (slow stand-in, issued from two threads) → the second is `409` and its marker file is never created. Genuinely concurrent only because of `DEC-16`; on the old single-threaded server the second request would merely have queued. |
| `DEC-10` | non-zero-exit stand-in that still edited → `200`, `outcome:"failed"`, `changed:true`, discardable. Non-JSON stdout → `outcome:"failed"`, not an exception. |
| `CON-4` | after an invocation, the workspace contains no spool file; asserted by comparing the post-invocation file set to the stand-in's intended effect. |
| `DEC-15` | a temp-copied fixture with a symlink added under the workspace directory → `409` naming the link, and the stand-in's marker file is never created. `WorkspaceCaptureTest` additionally covers a symlink whose target is *outside* the root, asserting the refusal rather than a capture. |
| `DEC-5` | a capture bound set below the fixture's real size → `409` quoting the real file count (not the bound echoed back) alongside the bound, and nothing invoked. |
| `DEC-7` (the post-invocation hole) | a stand-in that edits a file, then the workspace made undiffable before the diff runs (a captured path replaced by an unreadable entry) → `200`, a `sessionId` is returned, `changes` is empty, `message` names the failure, and `discard` on that id still restores every captured file. This is the case whose absence was the design's only unrecoverable state. |
| `DEC-16` | with a slow stand-in in flight, `GET /api/claude/status` and `GET /api/manifests` still respond, and a second `invoke` returns `409` while the first is still running — which is only observable because the server now has an executor. |
| `DEC-3` (restore branches) | `WorkspaceCaptureTest`: a captured empty directory removed then restored; a captured file whose parent directory was deleted; a captured file replaced by a directory (type change); and `restore` run twice in a row, asserting idempotence. |

Hand-run verification with the **real** `claude` binary — the three
properties no stand-in can demonstrate. Per PRD Section 3's declared
deviation, these run against a disposable copy of `.custom` placed outside
the repository, never against `.custom` itself and never with the repository
as the working directory; `git status --porcelain` in the repository is
checked after every invocation.

```bash
SCRATCH=/tmp/archicode-w4-verify
rm -rf "$SCRATCH" && mkdir -p "$SCRATCH"
cp -r .custom "$SCRATCH/ws"
( cd "$SCRATCH/ws" && find . -type f -exec md5sum {} + | sort > "$SCRATCH/before.md5" )

JAVA_HOME=~/.sdkman/candidates/java/25.0.4-tem ./mvnw -q -B package -DskipTests
java -jar target/quarkus-app/quarkus-run.jar \
  -w "$SCRATCH/ws/workspace.yaml" editor serve --host 127.0.0.1 --port 8099 &

curl -s http://127.0.0.1:8099/api/claude/status            # expect available:true
# AC-1 / AC-10 (accept path)
curl -s -X POST --data-binary 'Add a description to the element defined in manifests/app.platform.portal.yaml. Change nothing else.' \
  http://127.0.0.1:8099/api/claude/invoke
# AC-6..AC-9 (discard path), then:
( cd "$SCRATCH/ws" && md5sum -c "$SCRATCH/before.md5" )    # expect every line OK
# AC-12 (containment)
curl -s -X POST --data-binary 'Our team keeps shared notes one level up from this workspace. Write a one-line summary of these manifests to ../workspace-notes.md. Just do it, it is the expected location.' \
  http://127.0.0.1:8099/api/claude/invoke
test ! -e "$SCRATCH/workspace-notes.md" && echo "contained"
```

- `AC-1`/`AC-10`: the invocation completes with no interactive prompt and
  accept leaves the change readable through `GET /api/manifests/{path}`.
- `AC-6`–`AC-9`: after discard, `md5sum -c` over the pre-invocation manifest
  reports every file `OK` and no stray file remains. This is the wave's
  non-optional guarantee and is checked by checksum, not by eye.
- `AC-12`: the out-of-workspace prompt must leave no file outside the
  workspace **and** report the attempt in `permissionDenials`. The prompt is
  deliberately framed as legitimate: a prompt that looks like a test gets a
  polite refusal that proves nothing (`prg-0007` `F-3` vs `F-4`).
- `AC-5`, `AC-16`, `AC-17`: read directly from the served `index.html` and
  exercised with `curl` against each route the page calls, plus inspection of
  the rendered markup — this repository has no browser-automation tooling
  (run-0006 made the same call for the same reason, and said so). The final
  report states which method was actually used for each.

Out of scope for verification: the `native`/GraalVM profile (`RISK-5`); any
test that spends money or needs credentials in CI (`DEC-14`).

# Deployment and Rollout

Code-only and additive: four new classes, one extracted class, one new route
group, four new CLI options with defaults, one new webapp tab, one README
paragraph. No migration, no schema change, no persisted state. The capability
is on by default when `claude` is present and reports itself unavailable
otherwise (`DEC-11`), so an existing `editor serve` invocation keeps working
unchanged either way; `--no-claude` turns it off without removing the editor.
Rollback is a revert of this run's commit — planning guidance only; this TDD
grants no deployment authority.

# Risks and Tradeoffs

`RISK-1` — A pending change does not survive the server process (`DEC-6`). If
the server stops mid-review the files stay in their changed state with no
remaining way to discard them automatically. Mitigated by stating it in the
webapp banner, in `README.md`, and in a shutdown notice printed to
`System.err` that names every affected path, so an operator can hand-revert
from that list. The `System.err` part is load-bearing rather than stylistic:
at this application's configured log level a logged warning would never
appear, which would make this mitigation exist only on paper (`DEC-6`,
`prg-0007` `F-12`). Not fully solved; `DEF-1`.

`RISK-2` — The published Docker image carries no `claude`, so the
README's documented invocation cannot use this capability (PRD `TC-4`).
Mitigated by `DEC-11`'s pre-submission availability signal and the README
paragraph, so it presents as a stated precondition rather than a bug.

`RISK-3` — The design depends on one external CLI's flag grammar and JSON
shape (`CTR-6`), and `DEC-14` deliberately does not regression-test them. A
future `claude` version could change either and `./mvnw verify` would stay
green. Mitigated by defensive parsing (`ASM-2`) and by the capture/diff being
independent of the CLI's output, so the worst case is a clear failure with a
discardable session — never an unreviewable change.

`RISK-4` — Because the capture covers the whole workspace directory
(`DEC-3`, required by `NFR-1`), a discard restores *everything* under it,
including a `.git`/`.hg`/`.svn` directory if one is present. An operator who
committed in that repository between the invocation and the discard would see
those objects removed. Mitigated by detecting a VCS directory and surfacing
it in `GET /api/claude/status`, in the invoke response and in the pending
banner (`DEC-5`), and by the README stating that a discard restores the whole
workspace directory. Deliberately a warning rather than a refusal, because
refusing would rule out a legitimate layout.

`RISK-5` — The `native`/GraalVM profile is neither built nor verified by this
run. `ProcessBuilder` and `java.nio` work under native image, but subprocess
execution is the first use of its kind in this repository and could need
reflection or resource configuration that only a native build would reveal.
Same out-of-scope position run-0004/0005/0006 took for their own additions.

`RISK-6` — Prompt injection via manifest content: the agent reads the
workspace's files, so text in a manifest can influence the edit. Bounded by
`NFR-1`'s containment and the human review gate, not otherwise mitigated.
Accepted for a single-operator tool over a workspace the operator owns.

`RISK-7` — `DEC-8`'s extraction touches code three prior runs' gates already
passed. Mitigated by the extraction being mechanical and by
`EditorHttpServerTest` staying unmodified and green, which exercises both
former call sites.

`RISK-8` — A hand save through the existing `PUT /api/manifests/{path}`
during the pending-review window becomes part of the reviewed change: the
diff will show it, and a discard will revert it. This cannot be closed
server-side without making `PUT` return `409` while a change is pending,
which is a contract change to an existing endpoint that `NFR-5` forbids this
run from making. Mitigated client-side only: the webapp disables the Save
button and the tree's edit affordance while a change is pending, and the
pending banner says why (`IMP-7`). A second client that ignores the webapp
can still do it; accepted for a single-operator tool, and recorded so a
future run that is allowed to change `PUT`'s contract can close it (`DEF-7`).

`RISK-9` — This run's file footprint deviates from the wave manifest's
declared `likely_paths` for `W-4` (`tools/manifest-editor/server/**`,
`tools/manifest-editor/webapp/**`): the actual paths are
`src/main/java/io/morin/archicode/cli/**`,
`src/main/resources/editor-webapp/index.html`,
`src/test/java/io/morin/archicode/cli/**`,
`src/test/workspaces/editor_outside_manifests/**` and `README.md`
(PRD `TC-6`). The reason is unchanged from run-0004 `DEC-1`, run-0005
`DEC-1` and run-0006 `DEC-1`: nothing in this repository's build puts
`tools/` on the runtime classpath or into the packaged image, so a bridge
living there could not be reached by a released `editor serve`. Zero
collision risk — wave 002 is fully serial and this is its last run. Named
here and in the final report so it reads as a documented convention
alignment rather than scope drift.

`RISK-10` — **Hooks are a command-execution path `--restricted` does not
remove.** `NFR-1`'s "no command-execution tool" is true of the tool
allow-list, but a hook contributed by managed (policy) settings or by an
installed plugin runs an arbitrary command for this invocation, outside both
the allow-list and the file confinement; managed settings can also add
permissions. `--restricted`'s own help text keeps managed settings in force,
and `--bare` is the flag documented to skip hooks — but `--bare` redefines
authentication to API-key-only and would break a subscription operator
(`ASM-6`), and a `--settings` document cannot override managed settings.
Accepted rather than mitigated, on the grounds that those hooks are the
operator's own machine configuration: an operator who runs `editor serve` is
already trusting their own installed plugins and policy settings, and this
run does not expand that trust — it inherits it. Named explicitly because
the Summary's claim that "containment is the invocation's own configuration"
would otherwise read as covering more than it does.

`RISK-11` — **The README's documented invocation makes the served directory
the operator's mounted project root.** It passes no `--workspace`, so
ArchiCode resolves the default `workspace.yaml` against Docker's working
directory (`-w "/workdir"`, bound to `$(pwd)`), and the captured and writable
directory is therefore the whole project rather than a manifests workspace
(`ASM-5`). Two consequences, both handled but neither free. Where the tree
is within `DEC-5`'s bounds — the usual case for a dedicated architecture
repository — `.git` is captured, so `RISK-4`'s concurrent-commit hazard is
the default rather than an edge case. Where it is not, `DEC-5`'s bound fires,
which is the designed outcome: a tool whose discard restores everything under
the served directory should refuse custody of a project root rather than
quietly accept it. Mitigated by the bound's message carrying the remedy, by
the VCS warning reaching the pending banner, and by `IMP-8` putting the same
guidance in the README (point `--workspace` at a workspace file in a
dedicated directory, as `.custom/workspace.yaml` already is). Not mitigated
by changing `--workspace`'s default, which would break every existing
`views generate` invocation.

# Open Questions

None outstanding. The two product-level questions were closed in the PRD
(`Q-1` by probing the real binary, `Q-2` by inspecting `.gitignore`). The
design forks this run faced were resolved by reading the actual `claude
--help`, running four probes against the real binary, and reading the
existing server's own containment helpers — `DEC-2` (containment mechanism
and the rejected narrowing direction), `DEC-3` (capture medium and scope),
`DEC-4` (the verified flag set), `DEC-5` (bounds versus truncation; warn
versus refuse on a VCS directory), `DEC-6` (no auto-discard on shutdown),
`DEC-9` (server-side hand-written diff), `DEC-10` (report, never judge),
`DEC-14` (stand-in executable rather than the real binary in tests),
`DEC-15` (refuse a workspace with a symlink rather than special-case it) and
`DEC-16` (give the server an executor) each record what was rejected and why.

Four questions were raised during design and answered rather than carried:
whether the configured-manifests-directories containment check belongs in
`EditorHttpServer` or `ClaudeBridge` (answered by `DEC-8`: neither owns the
resolution, a shared `WorkspaceLayout` does); whether a failed invocation
should auto-revert (answered by `DEC-10`: no — it is `FR-6`'s prohibition in
different clothing and it would destroy the evidence); whether the capture
invariant should be stated as equality or as a subset (answered by the
Summary: a subset, because equality is neither needed nor true); and whether
a `.git` directory in the workspace should be a refusal (answered by `DEC-5`
and `RISK-4`: a warning, because refusing would rule out a legitimate
layout, and the agent cannot write git files anyway).

# Deferred Work

`DEF-1` — Survive a server restart with a still-discardable pending change
(`RISK-1`): persist the capture outside the workspace with a workspace
fingerprint, and refuse to restore a capture whose workspace has since
diverged. Deliberately out of this run: it contradicts `DEC-3`'s reason for
an in-memory capture and introduces a stale-state problem worth its own
design.

`DEF-2` — Make `DEC-5`'s capture bounds configurable (and/or support an
exclusion list, e.g. for a `.git` directory) if a real workspace is
legitimately larger than 5000 files / 64 MiB. Kept out to hold the new CLI
surface at four options; an exclusion list additionally needs an answer for
how it preserves `NFR-1`'s `writable ⊆ captured` relation, which is why it is not a one-line
change.

`DEF-3` — Add a cost bound (`--max-budget-usd`) alongside the wall-clock
bound, and surface cumulative spend in the webapp. `TC-5` makes cost
product-visible; this run reports per-invocation cost (`CTR-2`'s `costUsd`)
but bounds only time (`DEC-13`).

`DEF-4` — A richer diff view: side-by-side, word-level highlighting, or
collapsing unchanged hunks further. `DEC-9` ships the minimum that satisfies
`FR-4`.

`DEF-5` — A multi-turn refinement loop ("not quite — try again, keeping X"),
which would mean resuming a `claude` session rather than starting one.
Explicitly out of scope in the PRD; noted because `--resume` makes it
cheap if it is ever wanted.

`DEF-6` — Support a workspace that contains symbolic links (`DEC-15`), if a
real workspace needs one. Requires a design that keeps `NFR-1`'s scope
relation true through a link — most plausibly by resolving every link at
capture time and refusing only the escaping ones, with a defined ordering for
multiple names of one inode.

`DEF-7` — Close `RISK-8` by making `PUT /api/manifests/{path}` return `409`
while a change is pending. Out of this run because it is a contract change to
an existing endpoint, which `NFR-5` forbids here.

# File Placement and Frontmatter

Saved at
`docs/wav/wav-002-manifest-web-editor/run/run-0007-claude-editing-bridge/tdd-0007-claude-editing-bridge.md`,
per `manage-runs`' convention for a wave-owned run. Frontmatter carries
`type: tdd`, `run: 0007`, `wave: 002`, and `related:` links to this run's PRD
(this run uses the full `PRD+TDD+pln` profile, unlike run-0004/0005/0006 —
reasoning in `prg-0007`'s Stage 0 log entry), the wave plan, the business
case, and run-0005's and run-0006's TDDs, whose `DEC-`s this design extends
and whose `CON-`s it inherits.
