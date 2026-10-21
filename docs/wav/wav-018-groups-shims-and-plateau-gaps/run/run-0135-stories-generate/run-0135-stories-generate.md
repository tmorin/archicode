---
type: run
run: 0135
status: completed
profile: single-document
wave: 018
---

# Run 0135: stories-generate

Wave 018, W-8. Closes GitHub issue tmorin/archicode#109 (decision D6 of the author, 2026-10-21: a command of its own for the stories, `views generate` does not draw them; T5 of the wave plan).

## Scope

`archicode stories generate [--story <id>]...` draws the steps of the stories. A step is drawn like a view of the plateau it is told at (`at`, else the plateau chosen with `--plateau`, else `settings.current`) and, when it says `against`, like the views of a comparison of that plateau with the `against` one. Same loader (`WorkspaceFactory`, a plateau loaded once), same `PlateauComparer`/`createUnion`, same viewpoint factories and renderer as `views generate`. `views generate`, `query` and `diff` are not changed (T1).

## Decisions (what T5 left to this run; the alternative rejected)

- **Folders.** `<views.path>-stories/<story>/<NN>-<view>/`, then the folders the renderer always adds (`plantuml/<layer>/`). `<views.path>` is the views path of the settings (or `--output`) without the `-<plateau>` suffix a layered workspace adds; `NN` is the step number from 01, two digits; `<view>` is the id of the view a step names, else the viewpoint of the view it carries, whose file is `step_NN.puml` (the id the command gives the view). Rejected: a folder per plateau (`views-<plateau>-stories`): a story crosses plateaus; rejected: `<NN>-<name of the step>`: the name is free text.
- **No comparison files.** A comparison step writes the views of the comparison only; no `gap.md`/`gap.json` (the table belongs to `diff` and `views generate`, and one table per step would repeat). The warnings of the comparison (`replaces` ignored) and of the states written by hand are told as `views generate` tells them. Rejected: a table beside each comparison step.
- **Global views only.** The facets are not applied to a story (the editor plays a story with the facet the reader chose; a story names none). Rejected: one folder per facet.
- **Options.** `--story/-s` (repeatable, none = every story, drawn in the order of their ids), `--plateau`, `--engine/-e`, `--output/-o` (as `views generate`: the beginning of the folder name). No `--against`: the comparison is the step's own, and one flag for every step would contradict the ones that say their own. Rejected: `--against` as the default comparison of the steps that say none (a step that says no `against` is not a comparison, in the editor either).
- **`--plateau` stays required for a tree that forks**, as for every command that loads a plateau (`fork_tour` needs `--plateau`, a name of the tree, even if all its steps say `at`). Rejected: not loading the default plateau when every step names one (a second loading path, and a story with a step that says no `at` needs it).
- **Warnings (through `Warnings`, exit 0, the run goes on):** ``skip <story>/<n>: it names `x`, which the plateau `p` does not have`` (also the map forms of `views generate`: pinned only on missing entries, drawn without some entries; the code is shared: `ViewInPlateau`, extracted from `GenerateViewsCommand` with the same sentences, checked byte for byte), `skip <story>/<n>: it is told at the plateau `p` and compared with it: there is nothing to compare` (the last step of `fork_tour` with `--plateau saas`), `skip <story>/<n>: the view `v` is not declared`, `skip <story>/<n>: it names no view and carries no viewpoint`, the viewpoint the command line does not generate, `skip `<story>`: the story has no step`, `the workspace has no story: nothing is drawn`. The plateau named in the first sentence is the plateau the step is told at (the one the name was looked for in).
- **Errors:** an unknown `--story` is `error: no story `x` in the workspace (known: a, b)`, exit 1, before anything is loaded further or written (`ArchiCodeException`, the path of `ErrorOutput`).
- **Native.** Four classes added to `reflect-config.json` (`GenerateStoriesCommand`, its record `Compared`, `StoriesGroup`, `ViewInPlateau`), as `NativeReflectionConfigTest` demands. The Native job is not run here.

## What changed

- `cli/StoriesGroup`, `cli/GenerateStoriesCommand` (new), `cli/ViewInPlateau` (extracted from `GenerateViewsCommand.canBeDrawnInPlateau`, now a call), `cli/ArchiCode` (the group), `reflect-config.json`.
- Tests: `cli/GenerateStoriesTest` (6: `fork_tour` at `marketplace` with the seven steps and the `<<new>>` of the comparison, no-plateau steps and a map, the step compared with itself, a name a plateau lacks and an empty story, an unknown story, `migration` of `domain_plateaus`), `it/StoriesGenerateIT` (5, on the packaged jar).
- `CLAUDE.md`: the architecture line, the paragraph on the steps of a story, #109 out of the limits.

## Verification

- `./mvnw -o verify -DskipITs=false '-Dtest=!CustomRenderingTest' -Dsurefire.failIfNoSpecifiedTests=false`: 1093 unit tests (2 skipped, as before; 6 new), 26 integration tests (5 new), build success.
- `cargo test`: 230 passed. `embed.sh --check`: clean. `node --test`: 2197 of 2197. `npx prettier --check "src/**/*.java"`: clean.
- Identity (T1): the jar of HEAD (built before this change) and the jar of this tree ran `views generate` on each of the four plateaus of the layered Brightcart, on `domain_plateaus` and `domain_workspace`, `diff` on the four plateaus and `query views`: 3881 `.puml` files and the tables, `diff -r` empty, error output identical.
- Not verified: the Native job (the native image and `StoriesGenerateIT` on it); only `NativeReflectionConfigTest`.

## Canonical impact

`CLAUDE.md` (above). The manual (`src/doc/README.adoc`) still says the command line ignores the stories (`[[plateau-limits]]`, line about #109): W-9's.
