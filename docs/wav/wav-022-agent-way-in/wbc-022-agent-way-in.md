---
type: wbc
wave: 022
status: proposed
date: 2026-10-23
related:
  - docs/wav/wav-021-story-player-and-release-binaries/wav-021-story-player-and-release-binaries.md
  - docs/wav/wav-021-story-player-and-release-binaries/prg-021-story-player-and-release-binaries.md
  - CLAUDE.md
---

# Wave 022 — An Agent's Way In — Business Case

## Context

Wave 021 was merged on 2026-10-23 (the story player, `--version`, the native binaries on the release page, the save that keeps quotes and comments). 0.19.0 is not cut: the author cuts it after the wave, and the first real run of the release job is that release (see the plan, Q2).

The backlog was reviewed on 2026-10-23, after wave 021. Eight issues are open:

| Issue | What | Review |
|---|---|---|
| #144 | Agent-friendly ArchiCode | The author decided on 2026-10-23 (D10 of wave 021) that wave 022 is its first three steps, in this order: a real schema of the manifest content, `archicode guide`, `archicode init`. `validate` that lists every problem, edit commands and an MCP server wait. **In this wave.** |
| #154 | Save: a block scalar that is a list item (`- \|`) makes every save write the emitter's text | Found by the generated test of wave 021, present on the tag 0.18.0, "likely cheap". **In this wave.** |
| #155 | Save: three layout losses (L2, L3, L4) | L2 (the first key of a list-item map changes, a block scalar on the second key is quoted) is a realistic edit: `relationships` and `uses` items are maps. L3 and L4 need a list of lists, which only a patch `value` can hold. **L2 in this wave, with #154; L3 and L4 stay pinned and #155 is rewritten to them.** |
| #143 | A view built on relationships | The author accepted the answers on 2026-10-23 (D11), for a wave after the player. It touches the kernel contract, the CLI, the editor and the player: a wave of its own, **wave 023**. |
| #135 | Import a Structurizr workspace | Planned after the agent work (D12), Structurizr first. Blocked by the author: it needs a public sample of a Structurizr JSON export under a licence the repository can carry. Wave 023 or 024. |
| #134 | Import a LikeC4 project | After #135, same prerequisite. |
| #65 | `plateau fold` | Rewritten on 2026-10-23: an analysis run first (several plateaus above, siblings, `--archive`), then code. Not ready for a wave. |
| #24 | A reading of N plateaus at once | Needs a mock-up or design note by the author. Not plannable. |

Nothing in the registers (`docs/bkg`, `docs/ana`) covers this: neither folder exists, and the sources are the GitHub issues.

What an agent has today, read from the code: `archicode query schemas manifest` prints an envelope whose `content` is `"type": "any"` (the field is an `ObjectNode`), so the schema says nothing about what a person, a system or a view holds; `query schemas workspace` is a real schema (11 KB). The kind of a manifest (`ManifestKind`) already knows the class of its content, and `READ_SCHEMA` in the editor already holds the keys, shapes and nesting of every type, cross-checked against the classes by `EditorReadSchemaTest`. There is no `init`, no guide, and the first error stops the load.

## Problems / Opportunities

An agent (a coding agent, an automation) that has to create or keep up a workspace must be told the shape of the files, the kinds, where each goes, how to check and draw, and how plateaus, views and stories work. The information exists in three places that an agent does not know about (the manual, `READ_SCHEMA`, the Java classes). The opportunity is to make the tool itself the way in: a schema it can write from, one command that prints what it needs to know, one command that starts a workspace that loads, all derived from the code so that they cannot drift.

The risk of this kind of work is the guide that is true on the day it is written. The wave is therefore as much about how each piece is proved as about the pieces: the plan has a validation architecture (one corpus of files, several independent checks, a scripted walk from nothing and one real cold-agent trial).

## Options & Recommendation

1. **The three steps of D10 in order, then a walk that proves them, the save fix, the manual** (recommended). Schema first because the guide is generated from it; the guide before `init` as the author ordered; a run that does nothing but use the three the way an agent would, because "tested the way an agent uses it" is the item of #144 no single step covers; #154 and #155 L2 as one small run because they share a cause in the save and no file with the rest.
2. **Add `validate` (every problem, JSON) in the same wave.** Rejected by the author (D10): it changes the stop-at-first-error loading model, which is the largest change of the backlog to the core, and the guide and the schema are useful without it.
3. **Start with the MCP server.** Rejected (D10): it needs the guide, the schema and `validate` to expose; building it first would freeze a shape that these runs decide.
4. **A hand-written guide, published on the site as `llms.txt` or `AGENTS.md`.** Rejected: cheap to write and it drifts the first time a class gains a key; this is exactly what #144's second open question asks to avoid. Publishing the generated guide on the site is possible later and needs no new thing from this wave.
5. **Put #143 in this wave.** Rejected: it is the kernel's contract, the editor and the player, a different kind of risk (`hard_judgment`), and sharing a wave with the agent work would put the byte-identity of every view and the generated schema in the same review.

## Vision

An agent given only the `archicode` binary can find out what it needs: `archicode query schemas manifest` describes the content of every kind with its nesting and id rules, `archicode guide` prints a versioned guide generated from that schema and the command list, in the jar and in the native binary, and `archicode init` writes a workspace that loads in both tools. Every claim of these is held by a test that reads the code, not by the wave's author; a scripted walk from an empty folder and one cold-agent trial show that the three are enough. The editor's save no longer loses all the comments of a file that holds `- |`, and keeps a block scalar when the first key of a list item changes. The manual and `CLAUDE.md` say what the tools do.
