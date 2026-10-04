---
type: prg
status: active
date: 2026-10-04
related:
  - docs/wav/wav-002-manifest-web-editor/wav-002-manifest-web-editor.md
wave: 002
---

# Progress Log: Manifest Web Editor

## Log

- 2026-10-04: Wave drafted (`write-wave`). Confirmed via code survey that
  ArchiCode has no resolved-graph JSON output and no write-back path today
  (`query schemas` emits JSON Schema of the raw DTOs only; `query views`
  emits rendered `View` JSON; relationship `destination` resolution is
  lazy, only enforced when a viewpoint is built). This grounds W-1's scope.
- 2026-10-04: Refined `editor serve`'s invocation to match `README.md`'s
  existing `docker run` examples, which surfaced that the server has no
  loopback bind to rely on inside a container — host-side `-p` mapping is
  the real exposure boundary. Captured in the plan's Non-Goals and Risks.
- 2026-10-04: User approved the drafted wave at the review gate. Status
  moved `proposed` → `planned` on the business case and the plan
  (frontmatter and manifest). Ready for `complete-wave`.
- 2026-10-04: User set the delivery shape for this wave's execution: one
  branch and one pull request for the whole wave, exactly one commit per
  run on that branch, merged with GitHub's "rebase and merge" (confirmed
  via `gh repo view`: this repo only has `rebaseMergeAllowed: true`,
  `squashMergeAllowed`/`mergeCommitAllowed` are both `false`). Neither
  `complete-wave` nor `complete-run` manage branches/commits/PRs
  themselves, so whoever drives this wave's execution must do so
  deliberately: one commit per run, WIP commits squashed before moving to
  the next run, single PR opened once all four runs are committed.

- 2026-10-04: `complete-wave` invoked. Set up delivery per the above: created
  worktree `.claude/worktrees/manifest-web-editor` on branch
  `feat/manifest-web-editor` (based on `origin/main`), with this wave's
  planning docs as that branch's first commit (`docs: plan wave 002 —
  manifest web editor`). All run work happens in this worktree; the
  orchestrating session (not the dispatched run-executor) will make the one
  commit per run, after verifying each run's result, so run-executors never
  touch git state themselves.
- 2026-10-04: Batch 1 (Phase P1) computed: W-1 `resolved-graph-query`, no
  unmet dependencies. Allocated run number 0004 (highest existing across
  `docs/run/` and `docs/wav/*/run/` was 0003, from wave 001) — directory
  `docs/wav/wav-002-manifest-web-editor/run/run-0004-resolved-graph-query/`
  created, status file written (`status: proposed`), manifest's `W-1.run`
  filled in. No same-batch overlap to check (batch size 1). Dispatching
  `run-executor` at the default model (tier: `standard`) for this one run;
  largest concurrency this batch: 1.

- 2026-10-04: W-1 (run 0004) returned `completed` (status file and pln's
  `execution_manifest.status: done`, 0 blocked tasks, 0 human review gates).
  Verified independently rather than trusting the subagent's report: built
  the real CLI (`./mvnw -q -DskipTests package`) and ran it directly
  (JDK 25, not the shell default JDK 21) — `query graph -w
  .custom/workspace.yaml` exited 0 with valid JSON (54 elements, 55
  relationships, matching the subagent's own count); `query graph -w
  src/test/workspaces/case_graph_dangling.yaml` exited 1 with
  `ArchiCodeException: unable to find the element sol.sys_missing`, thrown
  uncaught from `ElementIndex.getElementByReference`, the same path
  `views generate` already uses. Re-ran the full test suite independently
  (`./mvnw -q test`, exit 0). Confirmed via `git diff --stat` that this run
  touched nothing outside `src/main/java/io/morin/archicode/cli/**` and
  `src/test/**`, plus its own run directory — the diffs shown against
  `wav-002-manifest-web-editor.md`/`prg-002-manifest-web-editor.md` are
  this orchestrating session's own pre-dispatch edits, not the
  run-executor's. One named, accepted deviation from the declared
  `likely_paths` (`cli/query/**` in the manifest vs. the flat `cli/` the
  rest of the `query` subcommands actually live in — same parent
  directory, zero collision risk, documented in the run's TDD as `DEC-1`).
- 2026-10-04: Phase P1 gate verified against real evidence (both criteria
  checked above) — holds. Canonical discharge: TDD declares "not
  applicable — no canonical registers in this repository", a declared-none
  with a reason, which discharges trivially per the gate rules. No batch
  self-collision check needed (batch size 1). Advancing to Phase P2.
  Wave status moved `planned` -> `in-progress` (frontmatter, manifest, and
  the business case's frontmatter, mirrored).
- 2026-10-04: Per the user's explicit disk-usage concern (duplicate
  Maven/Quarkus `target/` per linked worktree, no parallel execution
  needed), wound down the linked worktree used for W-1
  (`.claude/worktrees/manifest-web-editor`) after committing its work, and
  moved the branch `feat/manifest-web-editor` into the main worktree
  (`/home/tibo/git-perso/archicode`) for the remaining runs. See
  memory note `feedback-wave-execution-worktree` for the standing rule this
  sets for future waves/runs in this repository.

- 2026-10-04: Batch 2 (Phase P2) computed: W-2 `manifest-editor-server`,
  dependency W-1 `completed`. Allocated run number 0005 — directory
  `docs/wav/wav-002-manifest-web-editor/run/run-0005-manifest-editor-server/`
  created, status file written (`status: proposed`), manifest's `W-2.run`
  filled in. No same-batch overlap (batch size 1). Execution now happens
  directly in the main worktree (`/home/tibo/git-perso/archicode`, on
  branch `feat/manifest-web-editor`) per the worktree-consolidation
  decision above — no new worktree created for this run. Dispatching
  `run-executor` at the default model (tier: `standard`); largest
  concurrency this batch: 1.

- 2026-10-04: W-2 (run 0005) returned `completed` (status file, pln
  `execution_manifest.status: done`, 0 blocked tasks, 0 human review
  gates — one task flagged `review_before` by the default autonomy policy
  for new unauthenticated network-facing + filesystem-write code, executed
  autonomously under `complete-run`'s explicit override since its TDD
  decisions (`DEC-4`/`DEC-5`) were mechanically verifiable). Verified
  independently: `./mvnw -q test` (94/94, exit 0) and
  `./mvnw -q -DskipTests package`, then ran the real server
  (`editor serve -w <scratch-copy-of-.custom>/workspace.yaml -p 8099`) and
  checked all three P2 gate criteria by hand with `curl` against a scratch
  copy of `.custom/` (never written to directly): `GET /api/graph` → 200,
  54 elements/55 relationships, matching W-1's own count; `GET
  /api/manifests/manifests/app.collaborator.yaml` → 200, byte-identical to
  the file on disk; a valid `PUT` of that same content → 200, file
  unchanged (md5 stable); an invalid `PUT` (missing `content.id`) → 400
  with a clear Jackson validation message, file untouched (md5 confirmed
  unchanged before/after). Confirmed via `git diff README.md` that the
  documented Docker invocation maps to `-p 127.0.0.1:8080:8080` by default,
  per the wave's Non-Goals/Risks requirement. `git status` confirms nothing
  outside this run's footprint changed and `.custom/` itself is clean.
  Deviation (declared and accepted, same reasoning as W-1): flat
  `cli/*.java` instead of `cli/editor/**`, and no `tools/manifest-editor/
  server/**` directory at all — pure CLI-embedded implementation.
- 2026-10-04: Phase P2 gate verified against real evidence (all three
  criteria checked above) — holds. Canonical discharge: TDD declares
  "not applicable — no canonical registers", a declared-none-with-reason,
  discharges trivially. No batch self-collision check needed (batch size
  1, same as P1). Advancing to Phase P3.

- 2026-10-04: Batch 3 (Phase P3) computed: W-3 `manifest-editor-webapp`,
  dependency W-2 `completed`. Allocated run number 0006 — directory
  `docs/wav/wav-002-manifest-web-editor/run/run-0006-manifest-editor-webapp/`
  created, status file written, manifest's `W-3.run` filled in. No
  same-batch overlap (batch size 1). Still in the main worktree, no linked
  worktree. Briefed the run with W-2's actual API shape (`GET /api/graph`,
  `GET /api/schemas/{type}`, `GET|PUT /api/manifests/{path}`) and flagged a
  real gap found while reviewing W-2's code: there is no "list manifest
  files" endpoint yet (root `/` only returns a placeholder string per
  W-2's own TDD, deferred on purpose to this run) — W-3 needs tree
  navigation, so it is in this run's scope to add a listing endpoint
  and/or static-bundle serving to `EditorHttpServer`, reusing its existing
  `resolveManifestsDirs` helper rather than re-deriving manifest-directory
  resolution. Dispatching `run-executor` at the default model (tier:
  `standard`); largest concurrency this batch: 1.

- 2026-10-04: W-3 (run 0006) hit a mechanical mid-flight stop (not a
  deliberate blocker) with two of its own dispatched subagents
  (`ab72c370a4917b237` backend, `aefe4d0eece29d2bc` frontend) not yet
  confirmed. Resumed the same `run-executor` agent via `SendMessage`
  rather than re-dispatching from scratch, per `complete-wave`'s own
  "resuming" guidance applied one level down — it kept the subagents'
  context and its own TDD/pln state. It returned `completed` on the
  second pass. pln `execution_manifest.status: done`, 5/5 tasks done, 0
  human review gates.
- 2026-10-04: Verified W-3 independently (never trusted either its first
  or second report): `./mvnw -q test` (97/97, exit 0); grepped
  `src/main/resources/editor-webapp/index.html` for any external
  `http(s)://` reference — only the SVG XML namespace URI, not a network
  call, confirming the no-CDN requirement. Packaged the real jar, ran
  `editor serve` against a scratch copy of `.custom/` (deleted after;
  `.custom/` itself untouched), and personally exercised every Phase P3
  gate criterion over HTTP: `GET /` serves the real webapp (tree-nav/graph
  markup present, not the old placeholder); `GET /api/manifests` lists all
  25 real files; `GET /api/graph` contains a genuine cross-manifest edge
  (`primarysys -> platform.fhirvault.backend`); edited
  `app.collaborator.yaml`'s content via `PUT`, reloaded via `GET`, saw the
  edit persisted; a payload missing `content.id` was rejected 400 with the
  file's md5 unchanged before/after. All three P3 criteria hold.
  Canonical discharge: declared-none-with-reason, same as W-1/W-2.
- 2026-10-04: Phase P3 gate verified — holds. Advancing to Phase P4 (final
  phase, no further gate).

## Findings

- No `docs/CLAUDE.md` register declaration and no `docs/bkg/`/`docs/ana/`
  directories exist in this repository — `sources: []` in the manifest is
  not an oversight, there was nothing to cite.

## Lessons Learnt

- A new `src/test/workspaces/<name>/` fixture directory named `case_*`
  silently matches an existing `.gitignore` rule written for generated
  `views generate` output comparison dirs (`case_a_yaml/`-style), so
  `git status` shows nothing for it even though it's a real, intended
  fixture. W-2/run-0005 hit this with `case_editor/` and renamed it to
  `editor_manifests/`. Future runs adding a new fixture directory under
  `src/test/workspaces/` should avoid the `case_` prefix unless it really
  is a `views generate` output-comparison fixture.
- A dispatched run-executor that hits a mechanical mid-flight stop with its
  own live subagents still unconfirmed should be resumed via `SendMessage`
  to that same agent, not replaced with a fresh dispatch — it keeps the
  subagents' results and its own TDD/pln state, and its own hand-back
  already states exactly what's left to verify. Worked cleanly for W-3's
  run 0006.
