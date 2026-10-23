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
- 2026-10-23: dispatching W-1 (run 0158, `manifest-content-schema`; no dependency, first of the serialized runs), `standard` (`run-management:run-executor`, default model, effort medium), concurrency 1. The byte-identity base (the tag `archicode-0.19.0`, built from `git archive` in the scratchpad as `base-0.19.0-src`) is being built in the background.
- 2026-10-23: W-1 (run 0158, `standard`) verified from disk: status `completed`, profile `single-document`; only files inside `likely_paths` changed (the manifest classes gained three marker annotations `@Identifier`, `@Reference`, `@Required` in `resource/`, a new `manifest/ManifestSchema`, `GetSchemasQuery` returns the generated object, six classes in `reflect-config.json`, `CLAUDE.md`; tests `ManifestSchemaTest` (V1, golden `src/test/resources/schemas/manifest.schema.json`), `EditorReadSchemaTest` extended (V2), `ManifestCorpus`, `SchemaChecker`, `ManifestSchemaCorpusTest` (V3, 421 shipped manifests and the 93 cases of `negative-cases.json`, ten reasons in `not-expressible.json`), `SchemasIT` (V5)). The gate set was rerun by the orchestrator on the final tree (`gate-W1.log`): 1370 unit (2 skipped) + 33 integration tests, cargo 240, `embed.sh --check` 0, prettier clean, node 2562 with 2561 passing: the one failure is the timing assertion `it takes seconds` (60 s) of `generated: 2000 files` in `save-keeps-quotes-and-comments.test.js`, which took 68 s inside the full parallel run (load average 8 on 8 cores) and 12.5 s alone (the executor also saw it pass at `--test-concurrency=2`); no JavaScript or editor file was touched, so it is the wave 021 guard being load-sensitive, not a regression (see Findings). Identity against the jar of the tag: 308 commands over the 20 shipped workspaces, same exit codes, output and 15252 files, `--help` of the 14 commands, `query schemas workspace` equal to the base jar's. Built: `query schemas manifest` prints an envelope and a `kinds` map keyed by `header.kind`, each with `content`, `layer`, `holds`, `heldAtTheTop`, and `nested[<kind>]` for the elements (a union of pointers per parent; a node in a node is a pointer); Q1: the dialect is kept (no `oneOf`), the kinds sit side by side.

## Findings

- `query schemas manifest` describes `content` as `"type": "any"` (an `ObjectNode`); `ManifestKind` already knows the class of each kind's content, and `EditorReadSchemaTest` already cross-checks `READ_SCHEMA` against the classes: both are the base of W-1.
- The generator `jackson-module-jsonSchema` is an older dialect (`"required": true` on the property, no `oneOf`): see Q1.
- Carried from wave 021: `Build` has no `permissions:` block and the repository's default token is write-all (left alone, a follow-up for the author; not in this wave).

- The schema still types two things as `"type": "any"`: a patch `value` (legitimate) and the `properties` of a view. The second matters to an agent: the keys a map or a facetted view takes (`pinned`, `hidden`, `opened`, `facet`, `hide-unlinked`, `applications`, `relationships`) are not in the schema. W-2's guide must say them (from the editor's `VIEW_PROPERTY_ORDER` and the kernel), and W-4's walk must draw a map and a faceted view from the guide alone.
- `save-keeps-quotes-and-comments.test.js` (wave 021) asserts its 2000-file run finishes in 60 s: it takes 12 s alone and 68 s inside the full parallel node run on this 8-core machine. To file as an issue at the end of the wave (a load-sensitive guard; the property it checks is fine).

## Lessons Learnt

- Carried from wave 021: open the pull request as a draft as soon as a run adds a native resource; a tested script beats a long step; a run that adds a Java class needs `reflect-config.json` in its `likely_paths`; a manual test reads `.adoc`, so a docs-only run needs the whole verification set after its last edit.
