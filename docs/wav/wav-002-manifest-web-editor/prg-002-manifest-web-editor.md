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

## Findings

- No `docs/CLAUDE.md` register declaration and no `docs/bkg/`/`docs/ana/`
  directories exist in this repository — `sources: []` in the manifest is
  not an oversight, there was nothing to cite.

## Lessons Learnt

