---
type: run
run: 0163
status: completed
wave: 022
profile: single-document
---

# Run 0163: manual-and-notes-022

Wave 022, W-6 (P2 gate criteria 2 to 4; GitHub issues tmorin/archicode#144, #154, #155). Focus: the manual and `CLAUDE.md` say what the tools do at the end of wave 022. Docs only; no code, example or fixture changed.

## Scope and decisions

- Single-document profile: the work is prose; the review passes were inline (facts checked against the jar of this tree: `guide` first line `archicode guide <version>`, 24,291 bytes; `init` output and its `error:` line; `query schemas manifest` shape).
- Manual (`src/doc/README.adoc`): `[[manifest-schema]]` in Generate JSON Schemas (kinds, nested, dialect, the ten limits); `[[guide]]`; `[[init]]`; `[[upgrade-0-19]]` above `[[upgrade-0-18]]` (which is untouched); the limits of the save (`[[plateau-limits]]`): #154 and L2 removed, L3 and L4 kept, `- - |` and the folded block named as fallbacks.
- `CLAUDE.md`: open-issues sentence (#144 first three steps built), wave 022 pointers, "five layouts" made "the layouts".
- `src/site/index.html`: one sentence naming `init` and `guide`.

## Verification

Full set run after the last edit: Maven verify with ITs (BUILD SUCCESS; the first attempt failed `PlateauComparisonTest` because a scripted edit duplicated a manual region; repaired, re-run green), cargo 240 passed, `embed.sh --check` ok, node 2565 pass 0 fail, prettier ok. Generated page: 0 `Could not load PlantUML`, no `href="#..."` without an id, `guide`, `init`, `manifest-schema`, `upgrade-0-19`, `upgrade-0-18` present.

## Canonical impact

None beyond the manual and `CLAUDE.md`. No `dom` or `arc` packet.
