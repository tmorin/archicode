---
type: wave
wave: 020
status: in-progress
date: 2026-10-22
related:
  - docs/wav/wav-020-reading-a-story-and-name-fixes/wbc-020-reading-a-story-and-name-fixes.md
  - docs/wav/wav-019-followups-of-wave-018/wav-019-followups-of-wave-018.md
  - docs/wav/wav-019-followups-of-wave-018/prg-019-followups-of-wave-018.md
  - CLAUDE.md
---

# Wave 020 — Reading a Story, and the Small Fixes

## Purpose

When this wave is done, the three open fixes (#147, #146, #145) are closed, and a story can be read in the editor in a mode of its own: the diagram, the words of the step, a menu that shows any step directly, *Previous* and *Next*, and none of the tools that edit (#142). A facet name that cannot be one folder is refused at load with one sentence in both tools; the failure to read the workspace file is a typed failure; the save keeps the brackets of a collection it changed. The manual and `CLAUDE.md` say what the tools do at the end of the wave.

## Non-Goals

- Does not build the view on relationships (#143): it has open questions that are the author's, and it should follow the reading mode. It stays open.
- Does not build the importers (#134, #135), `plateau merge` (#65), the matrix of N plateaus (#24) or the agent-friendly ArchiCode (#144); they stay open.
- Does not edit a story in the reading mode: the mode reads. *Edit text*, the page of the story and the story editor stay as they are, reached by leaving the mode.
- Does not let the reader choose a plateau or a comparison in the reading mode: the plateau and the comparison of a step are said on the step (see T4).
- Does not make the reading view a document that exists outside the editor: it is the editor in a mode, on a folder that is open. No export, no static page (see T6).
- Does not change what the command line writes for a story (`stories generate`) or for a view; the fixes change no output but the sentence of an error and the text of a saved file.
- Does not rename or edit anything in a real workspace of the author, nor cut a release.

## Decision Prerequisites

None open. #142 lists its form as "to settle before work starts"; the plan settles it below (T3 to T7) as plan decisions the author can reverse in review, as wave 019 did, rather than waiting.

## Plan decisions

Choices made by the plan, not by the author; each can be reversed by the author in review. The final report lists them.

- **T1.** The byte-identity base for P0 and P1 is the tag `archicode-0.18.0` (a jar built from `git archive` outside the repository). The command line is not changed by P1; P0 changes the text of one error (W-1: a facet name that is refused; W-2: the wording of the unreadable-file failure) and nothing else. A run that changes `src/main` compares `views generate`, `stories generate`, `query graph` and `diff` on every shipped workspace and says which files differ and why (expected: none, apart from the sentences of the errors the run adds).
- **T2 (#147).** A facet name that cannot be one folder name is **refused at load** with one `error:` line, in both tools, with the same sentence (a shared case in `negative-cases.json`, read by a Java test and a node test): an empty name, a name that is `.` or `..`, or that holds `/`, `\`, a NUL or a control character. The names Windows refuses (`<>:"|?*`, a trailing dot or space) are refused too, because a workspace is shared across systems. A name is not rewritten (rejected: replacing the characters, because two facets could then write in the same folder, and the folder would no longer say the name). The sentence names the facet and what to write. Every shipped example uses plain words, so no output changes.
- **T3 (#146).** A typed exception (or a flag carried by `ArchiCodeException`) says "the workspace file is missing or unreadable"; `ErrorOutput` and the landing page of the editor read the type, not the text. The sentence that says `workspace.yaml` is no longer the name stops being an exception to an equality test. The wording the user sees is unchanged; the change is visible only in the tests (a message that mentions `.archicode.yaml` for another reason is no longer reworded, and a test pins it).
- **T4 (#142, form).** The reading mode is **a mode of the editor, full screen, in the same page**: the Stories page and the bar of a story get a *Read* button; the mode hides the top bar's editing tools, the tree, the inspection, the forms, the band and the tool bars that edit, and keeps the diagram, the words of the step, the step menu, *Previous*/*Next*, the key of a comparison and a way back (*Edit*). The plateau and the comparison of a step are **named on the step** (the existing `stepPlateausHtml`), not chosen by the reader. Rejected: a modal (no room for the diagram and the menu, and it keeps the editor behind it as a distraction); a perspective beside Timeline, Stories, Files and Settings (it would be a place to go to, and a story is read from a step it is already on); a separate window (the editor needs the folder, which a second window does not have).
- **T5 (#142, behaviour).** In the reading mode the diagram keeps **zoom and pan only**: a click on an element selects nothing and opens no inspection (rejected: selecting, which would bring the inspection back). *Edit* leaves the mode and puts the reader back as they were (`storyHome`), on the same step. The keys are the arrows (previous and next), `Home` and `End` (first and last step), and `Escape` (leave), and they follow the rule `handleChangesKeydown` has for a reader who types (an input, a dialog open, a modifier key). Viewing writes nothing: no `modelsChanged()`, no file written, no change to a cache key; the mode is view state.
- **T6 (#142, address and sharing).** The mode is in the address (`read=1`, beside `story=` and `step=`, read by `applyDiagramParamsFromHash` the way the other view state is), so a link, Back and Forward land on the same step in the same mode, for a reader who has the folder open (`archicode editor serve`, or a folder opened in the browser). It does not make the page a static document: the editor reads a folder, so a link opens nothing for someone who has no folder. A static export of a story is a feature of its own and is not planned.
- **T7 (#142, the menu).** The menu lists the steps by number and by title (the label of the view the step names, else the first words of its text, else the viewpoint), says which steps cannot be drawn (the bar's `stepProblem`, with its sentence as the title), marks the step on screen and says "Step n of N". It is a control of the bar of a story first (W-4, in the editing layout, as the request says "a menu to jump to any step") and the reading mode reuses it (W-5). Choosing a step is `goToStoryStep`, so the plateau and the comparison of the step are drawn as for *Next*.
- **T8.** All six runs are serialized, concurrency 1, as in the last two waves: the five that touch `standalone.html` or the node tests would otherwise share files, and a wave this size gains nothing from parallelism.

## Wave Manifest

```yaml
wave_manifest:
  wave: 020
  slug: reading-a-story-and-name-fixes
  status: in-progress
  sources: []
  phases:
    - id: P0
      name: The small fixes
      gate:
        criteria:
          - 'a facet named `a/b`, `..`, `.`, empty, or holding a backslash, a NUL or a control character is refused at load by `views generate`, `stories generate`, `query graph` and `diff` with one `error:` line (exit 1), and by the editor with the same sentence; the cases are shared (`negative-cases.json`), read by a Java test and a node test; a facet with a plain word is drawn as before'
          - 'the wording of the failure to read the workspace file does not depend on matching `.archicode.yaml` in a message: `ErrorOutput` and the landing page read a typed failure; a test pins that a message which mentions the file for another reason is not reworded; the sentence for the former name `workspace.yaml` is still printed word for word by both tools'
          - 'an edit that changes a collection written in brackets (`qualifiers: [a, b]`, `tags: {zone: north}`) is saved with the brackets on the same line when the result fits, or the case that still falls back to a block is listed in the run with its reason; every line the edit did not touch is byte for byte as it was; the forms that were already kept (anchors, aliases, tags, multi-line text) are still kept; a comment inside the brackets is kept or the case is listed'
          - 'every shipped workspace gives byte-identical `views generate`, `stories generate`, `query graph` and `diff` with the jar of `archicode-0.18.0`'
          - '`./mvnw -o verify -DskipITs=false`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"` and `npx prettier --check "src/**/*.java"` pass'
    - id: P1
      name: Reading a story
      gate:
        criteria:
          - 'on every shipped story (`migration` of `domain_plateaus`; `fork_tour`, `order_journey`, `seller_journey` of the layered Brightcart) a node test walks the steps with the menu and with Previous/Next, in the editing layout and in the reading mode, and the plateau and the comparison drawn for each step are the ones `goToStoryStep` drew before'
          - 'in the reading mode no tree, inspection, form, band or editing tool bar is on screen; a click on an element selects nothing; Escape and *Edit* leave it on the same step with the plateau and comparison the reader had (`storyHome`); `read=1` in the address opens the mode on the step named by `step=`; a step that cannot be drawn is marked in the menu and says why'
          - 'viewing writes nothing: after a walk of each shipped story in both layouts, the files of the folder are byte for byte what they were and `modelsChanged()` was not called'
          - 'at 360 px wide the reading mode shows the diagram, the words and the menu without a horizontal scroll of the page (the measures of the small-screen section of the manual)'
          - '`./mvnw -o verify -DskipITs=false`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"` and `npx prettier --check "src/**/*.java"` pass'
    - id: P2
      name: The manual
      gate:
        criteria:
          - 'the manual builds, the description of walking a story under *Stories* tells the menu and the reading mode (its button, its keys, its address, what it hides and what it never does), the limits and `CLAUDE.md` no longer list #145, #146, #147 and #142 as open and keep #143, #134, #135, #65, #24 and #144 open, and the facet-name rule is told with its sentence where the facets are told'
          - 'every example the manual ships is loaded by both tools; the views of every example are byte-identical to the jar of `archicode-0.18.0`'
          - '`./mvnw -o verify -DskipITs=false`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"` and `npx prettier --check "src/**/*.java"` pass'
  runs:
    - id: W-1
      slug: facet-name-is-one-folder
      phase: P0
      depends_on: []
      run: 0146
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/resource/workspace/**'
        - 'src/main/java/io/morin/archicode/workspace/**'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/resources/brightcart/negative-cases.json'
        - 'src/test/java/io/morin/archicode/**'
        - 'src/test/javascript/**'
        - 'CLAUDE.md'
      focus: 'a facet name that cannot be one folder name is refused at load with one sentence, the same in both tools (#147)'
    - id: W-2
      slug: typed-unreadable-workspace-error
      phase: P0
      depends_on: []
      run: 0147
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/cli/**'
        - 'src/main/java/io/morin/archicode/workspace/**'
        - 'src/main/java/io/morin/archicode/ArchiCodeException.java'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/java/io/morin/archicode/**'
        - 'src/test/javascript/**'
        - 'CLAUDE.md'
      focus: 'the failure to read the workspace file is a typed failure, so no wording depends on a file name found in a message (#146)'
    - id: W-3
      slug: save-keeps-the-brackets
      phase: P0
      depends_on: []
      run: 0148
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/**'
        - 'CLAUDE.md'
      focus: 'a collection written in brackets that an edit changes is saved in brackets, on its line, when it fits (#145)'
    - id: W-4
      slug: story-step-menu
      phase: P1
      depends_on: [W-1, W-2, W-3]
      run: null
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/**'
        - 'CLAUDE.md'
      focus: 'show any step of a story straight from a menu on the bar, with the steps that cannot be drawn marked (#142, second request)'
    - id: W-5
      slug: story-reading-mode
      phase: P1
      depends_on: [W-4]
      run: null
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/**'
        - 'CLAUDE.md'
      focus: 'read a story in a full-screen mode with the editing tools out of the way, a step menu, an address and the keys (#142, first request)'
    - id: W-6
      slug: manual-and-notes-020
      phase: P2
      depends_on: [W-5]
      run: null
      delegation: standard
      likely_paths:
        - 'src/doc/**'
        - 'CLAUDE.md'
      focus: 'the manual and CLAUDE.md say what the tools do at the end of wave 020'
```

## Phase P0 — The small fixes

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-1 | — | `facet-name-is-one-folder` | — | a facet name is one folder name or is refused (#147) | T2: where `settings.facets` is read (`Settings`, `WorkspaceFactory`, `READ_SCHEMA` and `readObject` of the page) refuses a name that cannot be one folder with one sentence that names the facet; the cases are added to `negative-cases.json`; the folders `views generate` and `stories generate` write are unchanged for a plain name | the shared cases pass in Java and in node; a test per refused class of name (empty, `.`, `..`, `/`, `\`, control character, Windows-forbidden); every shipped workspace is byte-identical to `archicode-0.18.0`; closes #147 |
| W-2 | — | `typed-unreadable-workspace-error` | — | a typed failure for a missing or unreadable workspace file (#146) | T3: a typed exception (or a flag) raised where the file is read; `ErrorOutput` and the landing page of the editor (`FOLDER_UNREADABLE`, the line near `unreadable && folderName`) read the type; the equality exemption for `FORMER_NAME_SENTENCE` goes | tests: a missing file, a file the file system refuses, and a mention of `.archicode.yaml` in another message each give the wording they should, in the command line and in the editor; the output of every command on a good workspace is unchanged; closes #146 |
| W-3 | — | `save-keeps-the-brackets` | — | the line-preserving save keeps the brackets of a changed collection (#145) | read `patchYamlText` and the bracket helpers (`openDecoratedFlows`, `closeFlowLists`); write a changed `[a, b]` or `{k: v}` back in brackets on its line when it fits (one line, a width the file already uses), else as a block; a comment inside the brackets is kept or the case is listed; the anchors, aliases and tags kept by wave 019 stay | a node test per case (add, remove, reorder an item; an empty result; a long list that does not fit; a comment inside) that fails on the page of `archicode-0.18.0` where the brackets were lost and passes on this one; no existing save test changes except those that pinned the block as the rule, which are updated and listed; closes #145 |

**Gate:** the five criteria of P0 in the manifest.

## Phase P1 — Reading a story

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-4 | — | `story-step-menu` | W-1, W-2, W-3 | any step from a menu on the bar of a story (#142) | T7: a control on the bar (`renderStoryBarHtml` and its handler beside `story-bar-edit`) that lists the steps by number and title, marks the one on screen and the ones `stepProblem` refuses (with the sentence as the title), and calls `goToStoryStep`; keyboard: the control is a native list, usable by keys; no change to the address (`story=`, `step=` already carry the step) | a node test per shipped story: choosing step *n* from the menu draws what *Next* pressed *n − 1* times draws (same plateau, same comparison, same view); a step whose element is gone is marked and says why; nothing is written and no `modelsChanged()`; the bar of a story with one step and the story page are unchanged |
| W-5 | — | `story-reading-mode` | W-4 | the reading mode (#142) | T4 to T6: a *Read* button on the bar and on the Stories page; a mode flag (view state, reset with the folder, `resetUiState`) that hides the tree, the inspection, the forms, the band and the editing tool bars and keeps the diagram, the words, the menu of W-4, *Previous*/*Next*, the key of a comparison and the plateau and comparison named on the step; zoom and pan only; *Edit*, `Escape` and the keys (arrows, `Home`, `End`) through one listener that leaves alone a typing reader, a dialog and a modifier key; `read=1` in the address, read by `applyDiagramParamsFromHash` and written by `syncHashFromState`; the 360 px measures | node tests: every shipped story walked in the mode, step by step and from the menu; the elements on screen in the mode are exactly those listed; a click selects nothing; `read=1` opens the mode on `step=`; Back and Forward move between steps and modes; leaving puts the reader back (`storyHome`); the files written are byte for byte what they were; the diagram cache key and the comparison cache are untouched; a width-360 test has no horizontal scroll; closes #142 |

**Gate:** the five criteria of P1 in the manifest.

## Phase P2 — The manual

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-6 | — | `manual-and-notes-020` | W-5 | the manual and `CLAUDE.md` say what the tools do at the end of the wave | the menu and the reading mode under *Stories* (button, keys, address, what is hidden, what never happens, the phone); the facet-name rule and its sentence where the facets are told; the typed failure and the brackets of the save where they belong; the limits and the notes of `CLAUDE.md` (#145 to #147 and #142 out of the open list, #143 kept with the reason) | the manual builds; the manual's tests (`ManualExamplesTest`, `ShippedFilesTest`) pass; the gate set passes after the last edit of an `.adoc`; no example changes |

**Gate:** the three criteria of P2 in the manifest.

## Dependency View

```
P0:  W-1   W-2   W-3        (no edge among them: serialized, not ordered)
P1:  W-4 <── (W-1, W-2, W-3)
     W-5 <── W-4
P2:  W-6 <── W-5
```

## Risks

- **Overlaps, all `serialize`.** No `concurrent-safe` verdict is claimed; the runs are dispatched one at a time, in the order W-1 to W-6. The pairs that share a path: W-1, W-2, W-3, W-4 and W-5 (`standalone.html` and the node tests of the page), W-1 and W-2 (`src/main/java/.../workspace/**` and the Java tests), every run (`CLAUDE.md`), W-6 and every run (the manual).
- **Edges.** W-4 waits for the three fixes only so that no run of the page is in flight while the story is built on it (the edge costs nothing at concurrency 1, and keeps the P0 gate honest); W-5 needs the menu W-4 builds; W-6 needs the mode. W-1, W-2 and W-3 need no edge among themselves.
- **W-5 is the widest edit.** It hides most of the page and adds a mode to a 21,000-line file in which view state is easy to leak into model state. The mode is view state only: it must not call `modelsChanged()`, enter a cache key or write a file, and each shipped story is walked in a test that checks the folder byte for byte after the walk. The editing layout must be unchanged when the mode is off (a snapshot of the elements on screen before and after).
- **The form is a plan decision.** T4 to T7 settle what #142 left open; the author may prefer another form (a modal, a perspective). The cost of changing it is highest after W-5, so the author reviews T4 to T7 before the wave starts.
- **W-3 touches the save.** A wrong splice loses or corrupts the text of a file the author wrote. The run compares every file it saves with the original, line by line, and the block fallback stays wherever the brackets cannot be kept safely.
- **W-1 refuses names that load today.** A real workspace with a facet called `a/b` would stop loading; the facets of every shipped example are plain words, and the author's own workspaces are not read by the wave. The release notes block of the manual (W-6) tells it.
- **Timing tests.** `performance-budget` and `quiet-references` fail under load when two builds run together (wave 019); the gate set is run once at a time.
- **The size.** Six runs, all `standard`, none `hard_judgment`, one at a time.

## Completion Criteria

The three phase gates verified; `./mvnw -o verify -DskipITs=false`, `cargo test`, `embed.sh --check`, `node --test` and `npx prettier --check "src/**/*.java"` pass on the final tree; every shipped story is walked in the reading mode in a test and viewing writes nothing; every shipped example and fixture is loaded by the command line and the editor in a test; #145, #146, #147 and #142 are closed by their commits; #143, #134, #135, #65, #24 and #144 stay open; the real browser and the Native job are named as not verified by the wave if they are not.
