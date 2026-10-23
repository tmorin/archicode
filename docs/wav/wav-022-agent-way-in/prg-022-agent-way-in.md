---
type: prg
status: active
date: 2026-10-23
related:
  - docs/wav/wav-022-agent-way-in/wav-022-agent-way-in.md
wave: 022
---

# Progress Log: agent-way-in

## Log

- 2026-10-23: wave 022 written (`write-wave`) after the merge of wave 021 (0.19.0 not cut), from a review of the eight open issues and the decisions already taken by the author on 2026-10-23 (D10, D11, D12 of wave 021). In: #144 (schema, guide, `init`), #154 and #155 L2 (the save). Out: #143 (wave 023), #135 and #134 (after the agent work, and they need a public sample of each format), #65 (an analysis run first), #24 (needs a mock-up). Six runs, none `hard_judgment`, concurrency 1. Not started: the wave waits for the author's review, and for the answer to Q2 (is 0.19.0 cut first?).

- 2026-10-23: 0.19.0 released (tag `archicode-0.19.0`, `main` at 0.20.0-SNAPSHOT) before the wave: Q2 resolved, T1's base is the tag. A `permissions:` block (contents and packages write) was added to the `Build` job first (commit cb4dead). The release job's first real run passed after a re-run of the macOS job (a 502 from repo.gradle.org).
- 2026-10-23: wave 022 starts (`complete-wave`, on the author's go). Branch `feat/wave-022-agent-way-in` rebased on `main` (3b3ae0d), main worktree, one PR for the wave, one commit per run, rebase-and-merge. Plan `in-progress`. All runs serialized (T7), concurrency 1; tiers: all six `standard` (`run-management:run-executor`, default model, `effort: medium`). Verification set per run and gate: `./mvnw -o verify -DskipITs=false '-Dtest=!CustomRenderingTest' -Dsurefire.failIfNoSpecifiedTests=false`, cargo, `embed.sh --check`, node, prettier, with JDK 25.

## Findings

- `query schemas manifest` describes `content` as `"type": "any"` (an `ObjectNode`); `ManifestKind` already knows the class of each kind's content, and `EditorReadSchemaTest` already cross-checks `READ_SCHEMA` against the classes: both are the base of W-1.
- The generator `jackson-module-jsonSchema` is an older dialect (`"required": true` on the property, no `oneOf`): see Q1.
- Carried from wave 021: `Build` has no `permissions:` block and the repository's default token is write-all (left alone, a follow-up for the author; not in this wave).

## Lessons Learnt

- Carried from wave 021: open the pull request as a draft as soon as a run adds a native resource; a tested script beats a long step; a run that adds a Java class needs `reflect-config.json` in its `likely_paths`; a manual test reads `.adoc`, so a docs-only run needs the whole verification set after its last edit.
