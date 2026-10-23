---
type: wave
wave: 021
status: completed
date: 2026-10-23
related:
  - docs/wav/wav-021-story-player-and-release-binaries/wbc-021-story-player-and-release-binaries.md
  - docs/wav/wav-020-reading-a-story-and-name-fixes/wav-020-reading-a-story-and-name-fixes.md
  - docs/wav/wav-020-reading-a-story-and-name-fixes/prg-020-reading-a-story-and-name-fixes.md
  - CLAUDE.md
---

# Wave 021 — Story Player and Release Binaries

## Purpose

When this wave is done, *Play* on a story opens a modal that takes all the room and plays the story like slides, each step drawn for the plateau and comparison it names, with the editor behind it untouched and put back exactly as it was on close; the wave 020 reading mode is gone before anyone has it. The editor's save keeps the quotes and the comments it can keep, with a generated test as guard. The release pipeline builds the native `archicode` for Linux (amd64, arm64) and macOS (arm64), keeps it as an artifact of the workflow, and attaches it with its checksums to the release page, and `archicode --version` prints the version. The manual and `CLAUDE.md` say what the tools do.

## Non-Goals

- Does not cut a release: the author cuts 0.19.0 after this wave (decision D02), and the first real run of the release job is that release (see Risks).
- Does not build a Windows binary, a macOS Intel binary or a native OCI image: Windows waits for integration tests that pass on `windows-latest`; the JVM image stays the only image.
- Does not build the agent work (#144: schema of the manifest content, guide, `init`; `validate`, edit commands, MCP), the view on relationships (#143), the importers (#134, #135), `plateau fold` (#65) or the matrix of plateaus (#24): they are for waves 022 and later, #65 and #24 being rewritten first.
- Does not build a static export of a story (HTML or PDF for someone without the folder), a grid of thumbnails of the steps, or transitions.
- Does not change what the command line writes for a story, a view or a comparison: `--version` is the only new output.
- Does not edit a story in the player: it reads; *Edit story*, the page of a story and the story editor stay as they are.
- Does not touch a real workspace of the author, and does not close #153, #150, #151 and #149 by hand: the PR does.

## Decision Prerequisites

None open. The 14 decisions D01 to D14 were taken by the author on 2026-10-23, all with the recommendation, and no point settled by default was refused. They are restated below as plan decisions.

## Plan decisions

- **T1.** The byte-identity base is the tag `archicode-0.18.0` (a jar built from `git archive` outside the repository); 0.19.0 is not cut. The command line changes only by `--version` (W-4): `views generate`, `stories generate`, `query graph` and `diff` on every shipped workspace give the same files as the jar of the tag. The editor's save with no edit, and with edits other than those W-3 changes, writes the same bytes as the page of the tag (the node tests that run the page of the tag, skipping with a stated reason when it is absent).
- **T2 (D03, #153).** The wave 020 reading mode is removed in W-1: the *Read* buttons, `read=1`, `readingMode`, `renderReadingShellHtml`, `quietDiagramForReading`, `handleReadingKeydown` as it is, the reading CSS, `drawStepOfReadingAddress`. Kept and reused by the player: the live region outside `#app` (`announceReadingStep` becomes the player's announcer), the rule of the keys (a typing reader, a dialog, a modifier), `renderStoryStepMenuHtml`, `chooseStoryStep` as the player's menu. The tests of the reading mode are rewritten for the player, not kept.
- **T3 (D04).** *Play* only opens the modal. *Previous* and *Next* leave the story bar; the step menu and *Read* go with them (the menu lives in the player). The bar that *Show on diagram* (page Stories) raises over the editing diagram keeps what shows one step (title, "Step n of N", the words, *Edit text*, *Edit story*, *Leave story*, *Back to this step* when it applies). W-2 may keep one more control if a test of the bar needs it, and says so. The address of the bar (`story=`, `step=`) is as it was.
- **T4 (D05).** A step is drawn by a scene private to the player: the model of the plateau the step names (`at`, else the plateau drawn when *Play* was pressed, fixed at that moment) comes from `layerModelOf` (and `layerCache`), the comparison from the kernel's `compare` on the side, and the scene from the kernel's `compute`; `AppState.index`, `AppState.baseline`, `AppState.layers`, the selection, the page and the address are not touched, and `modelsChanged()` is not called. If W-1 finds that the editor's drawing code cannot run on a scene that is not the editor's (the caches keyed on the editor's state, `useDiagramHost`), it reports exactly what is entangled and stops: the author then decides between a larger refactor and drawing in the editor's state and putting it back (the option rejected in D05).
- **T5 (D06).** The player has an address: `play=<story>&step=n` beside the editor's own. Opening the player is an entry of the history, choosing another step is not (it replaces the entry), Back closes the player, Forward opens it again, and a link opens it at load for a reader who has the folder open (`archicode editor serve`, or a folder picked in the browser). An unknown story, a step that is none or a page that has no story leaves the player closed and the address is written back as it really is.
- **T6 (D07).** The slide holds: the diagram (zoom and pan), the words of the step, the plateau and the comparison the step names (said, not chosen), the key of a comparison, a step that cannot be drawn marked with its reason (the way on stays open), "Step n of N", *Previous*, *Next*, the menu of the steps, a *Full screen* button (the Fullscreen API; a refusal is tolerated and the modal stays), and the keys: Left and Right, Home and End, Escape (closes), the rule of the wave 020 keys. The modal covers the window (`inset: 0`), traps the focus, returns it to *Play* on close, is a dialog with a label and `aria-modal`, and announces the step through the live region.
- **T7 (D08, #150 and #151).** W-3 builds a generated test of the save (a seeded generator; the property is: every line the edit does not touch keeps its comment and its quotes, and the model read back is what the edit says) and fixes what it finds in the two issues: quotes follow the text of a scalar from the replaced subtree to the one written anew (the review found that #150 is the loss when a bracketed collection changes shape, not the "unstyled retry"), and a comment stays attached to its own item when an item of a list is removed. A reorder of items keeps its limit (pinned by `save-keeps-the-brackets.test.js`) unless the fix gives it for free, and the run says which. The seed and the number of cases are fixed so the test is the same on every machine and takes seconds.
- **T8 (D09, #149).** Targets: `linux-amd64`, `linux-arm64`, `macos-arm64`. Files `archicode-<version>-<os>-<arch>`, a `SHA256SUMS` file, notes by `gh release create --generate-notes` with a link to the block of the manual that says what changes. Each file is smoke-tested as published: `--version`, `views generate` on a shipped example, `editor serve` answering one request. The release job runs on a tag whose head commit message begins `chore(release)` (the condition of the Maven publish) with `contents: write`, and has a `workflow_dispatch` entry with a `tag` input that rebuilds and re-attaches to an existing release, and, with a draft flag, rehearses on a draft. Every tag publishes the website (`ci-build.yaml`, steps "Assemble website" and "Publish website"): no rehearsal with a test tag. The `Native` job runs on tags too, so the release job reuses its binary (`needs`) rather than building twice. The runner file is `target/archicode-<v>-runner` (the folder `archicode-<v>-native-image-source-jar` holds the `-runner.jar` it is made from; found by W-4), and the binary is about 68 MB.
- **T9 (V01).** `archicode --version` is built first (W-4): the command has no version option today, the smoke test needs it, and the version must work in the jar and in the native image (a resource, `reflect-config.json`).
- **T10.** All six runs are serialized, concurrency 1, as in the last three waves: W-1 to W-3 share `standalone.html` and the node tests, W-4 and W-5 share `ci-build.yaml`, every run shares `CLAUDE.md`.
- **T11.** The checks wave 020 could not make are checks of the gate of P0 where an agent can make them: the dark theme and a 360 px window in the built-in browser (`resize_window` with `colorScheme: dark` and `mobile`); a real phone, the File System Access path (a folder picked in the browser) and a screen reader are named as not verified in the Completion Criteria, for the author.

## Wave Manifest

```yaml
wave_manifest:
  wave: 021
  slug: story-player-and-release-binaries
  status: completed
  sources: []
  phases:
    - id: P0
      name: The story player
      gate:
        criteria:
          - 'each shipped story (`migration` of `domain_plateaus`; `fork_tour`, `order_journey`, `seller_journey` of the layered Brightcart) is played in the modal step by step (Next, Previous, keys) and from the menu, and the scene of every step has the same boxes and links as the editor draws for that step (same plateau, comparison and view), in a node test'
          - 'after playing and closing, `AppState.layers`, the selection, the perspective and the address of the editor are what they were before *Play* (a node test compares the state before and after, for a story with steps at other plateaus and compared), `modelsChanged()` was not called, and the files of the folder are byte for byte what they were'
          - '`grep -c "readingMode\|read=1\|renderReadingShellHtml\|quietDiagramForReading" src/main/resources/editor-webapp/standalone.html` prints 0; `Play` opens the modal; the bar over the editing diagram has no *Previous*, *Next* or *Read*; the editing layout is otherwise the one of the page of the tag (a test)'
          - 'the modal covers the window, traps the focus, returns it to *Play* on close and closes on Escape; `play=<story>&step=n` opens it at load, Back closes it, choosing a step adds no entry; an unknown story or step leaves it closed (node tests); in the built-in browser, in the dark scheme and at a 360 px window, the modal has no horizontal scroll and its text is readable (looked at and recorded in the run)'
          - '`./mvnw -o verify -DskipITs=false`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"` and `npx prettier --check "src/**/*.java"` pass'
    - id: P1
      name: The save and the binaries
      gate:
        criteria:
          - 'the generated test of the save (fixed seed, at least 1000 cases) passes, fails on the page of `archicode-0.18.0` for the shapes of #150 and #151, and shows no lost quote or comment on a line the edit did not touch; saving with edits other than those the run changes writes the bytes of the page of the tag'
          - '`archicode --version` prints the version from the jar and from the native runner (integration tests), and `views generate`, `stories generate`, `query graph` and `diff` on every shipped workspace are byte-identical to the jar of `archicode-0.18.0`'
          - 'the CI run of the pull request keeps the native binary as an artifact of the workflow (named with the version, the OS and the architecture, with its checksum); the release job exists, is conditioned on `chore(release)` tags and on `workflow_dispatch`, and a rehearsal on a draft release attached the three binaries and `SHA256SUMS` with each file smoke-tested as published (`--version`, `views generate` on an example, `editor serve` answering a request), or the run says why GitHub could not run it before the merge and what exactly the author runs after it'
          - '`./mvnw -o verify -DskipITs=false`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"` and `npx prettier --check "src/**/*.java"` pass'
    - id: P2
      name: The manual
      gate:
        criteria:
          - 'the manual builds; it tells the player (Play, the modal, the keys, full screen, `play=`, that closing changes nothing), no longer mentions the reading mode, `read=1` or the *Read* button, tells `--version` and the binaries of the release page with their checksums, and the block of what changes for a reader who knows 0.18.0 is reworded (the reading mode never shipped; the player replaces it)'
          - '`CLAUDE.md` and the limits no longer list #153, #150, #151 and #149 as open, and keep #144, #143, #134, #135, #65 and #24 open'
          - 'every example the manual ships is loaded by both tools; the views of every example are byte-identical to the jar of `archicode-0.18.0`'
          - '`./mvnw -o verify -DskipITs=false`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"` and `npx prettier --check "src/**/*.java"` pass'
  runs:
    - id: W-1
      slug: story-player-scene
      phase: P0
      depends_on: []
      run: 0152
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/**'
        - 'CLAUDE.md'
      focus: 'the reading mode of wave 020 is removed, and a step is drawn by a scene of its own that does not touch the editor (#153)'
    - id: W-2
      slug: story-player-modal
      phase: P0
      depends_on: [W-1]
      run: 0153
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/**'
        - 'CLAUDE.md'
      focus: 'Play opens a modal that fills the window and plays the story like slides, with a menu, keys, full screen and an address (#153)'
    - id: W-3
      slug: save-keeps-quotes-and-comments
      phase: P1
      depends_on: []
      run: 0154
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/**'
        - 'CLAUDE.md'
      focus: 'the save keeps the quotes and the comments of the lines an edit does not touch, guarded by a generated test (#150, #151)'
    - id: W-4
      slug: version-and-binary-artifact
      phase: P1
      depends_on: []
      run: 0155
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/cli/**'
        - 'src/main/resources/application.properties'
        - 'src/main/resources/META-INF/native-image/**'
        - 'pom.xml'
        - '.github/workflows/ci-build.yaml'
        - 'src/test/java/io/morin/archicode/**'
        - 'CLAUDE.md'
      focus: '`archicode --version` works in the jar and the native image, and the pipeline keeps the native binary as an artifact (#149)'
    - id: W-5
      slug: binaries-on-the-release-page
      phase: P1
      depends_on: [W-4]
      run: 0156
      delegation: hard_judgment
      delegation_reason: 'builds the job that publishes to the public release page: a live capability that only a real workflow run proves, and a public side effect'
      likely_paths:
        - '.github/**'
        - 'CLAUDE.md'
      focus: 'the release job attaches the three binaries and their checksums to the release page, smoke-tested as published (#149)'
    - id: W-6
      slug: manual-and-notes-021
      phase: P2
      depends_on: [W-2, W-3, W-5]
      run: 0157
      delegation: standard
      likely_paths:
        - 'src/doc/**'
        - 'src/site/**'
        - 'CLAUDE.md'
      focus: 'the manual and CLAUDE.md say what the tools do at the end of wave 021'
```

## Phase P0 — The story player

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-1 | — | `story-player-scene` | — | remove the reading mode and draw a step without the editor's state (#153) | T2 and T4: delete the reading mode (list in T2) and its tests; build the scene of a step from `layerModelOf` and the kernel's `compare` and `compute`, on the side, with no write to `AppState`, no `modelsChanged()`; a function that gives the scene of step n of a story for the home fixed at call time; report what is entangled if the editor's drawing cannot run on it | the grep of the gate prints 0; each shipped story's steps give scenes with the same boxes and links as the editor draws; `AppState` is the same before and after drawing a scene (a node test); the editing layout is the one of the tag, apart from the removed *Read* and the menu kept for now |
| W-2 | — | `story-player-modal` | W-1 | the modal (#153) | T3, T5, T6: *Play* opens the modal; *Previous*, *Next*, the bar's menu and *Read* leave the bar (T3); the slide, the menu of W-4 (wave 020) moved into it, keys, full screen, focus trap and return, announcer, address `play=`, dialog semantics; CSS that covers the window | the node tests of the gate; the editor's state before and after; the look in the built-in browser at wide, dark and 360 px; closes #153 |

**Gate:** the five criteria of P0 in the manifest.

## Phase P1 — The save and the binaries

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-3 | — | `save-keeps-quotes-and-comments` | — | #150 and #151 with a generated test | T7: a seeded generator of manifests (block and bracketed maps and lists, quoted and plain values, comments above and after, block scalars), random edits (set, add, remove, reorder), and the property; fix: quotes follow the scalar text into a re-emitted subtree, a comment stays with its item; the reorder limit stays or is lifted, said | the generated test passes and fails on the page of the tag for the two shapes; the existing save tests pass (those that pinned a loss are updated and listed); no byte of a save with other edits differs from the page of the tag; closes #150 and #151 |
| W-4 | — | `version-and-binary-artifact` | — | `--version` and the binary as an artifact (#149) | T9, T8: a Picocli version option reading the version from a resource, in the jar and in the native image (`reflect-config.json` if a class is added); a step of the `Native` job that uploads `archicode-<version>-<os>-<arch>` and its checksum; integration tests of `--version` | `--version` in the jar and the native runner; the other commands byte-identical to the tag; the CI run of the PR shows the artifact |
| W-5 | — | `binaries-on-the-release-page` | W-4 | the release job (#149) | T8: a job on `chore(release)` tags that needs `Build` and `Native` for the three targets (a matrix: `ubuntu-24.04`, an arm64 Linux runner, `macos-14`, to be confirmed against the runners the repository can use), names, `SHA256SUMS`, `gh release create --generate-notes`, the smoke test of each file as published, a `workflow_dispatch` with `tag` and `draft` inputs; a rehearsal on a draft | the three binaries and the checksums on a draft release, smoke-tested, or the stated reason and the author's command; the website steps unchanged; closes #149 |

**Gate:** the four criteria of P1 in the manifest.

## Phase P2 — The manual

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-6 | — | `manual-and-notes-021` | W-2, W-3, W-5 | the manual and `CLAUDE.md` say what the tools do | the player under Stories (replacing the reading mode: its section, the keys, the address, the small-screen text), `--version` and the release page with checksums (an install section), the save, the upgrade block reworded, the notes of `CLAUDE.md`, the open issues | the manual builds; the gate set after the last `.adoc` edit; no example changes |

**Gate:** the four criteria of P2 in the manifest.

## Dependency View

```
P0:  W-1 ──> W-2
P1:  W-3        W-4 ──> W-5          (W-3 and W-4 have no edge: serialized, not ordered)
P2:  W-6 <── (W-2, W-3, W-5)
     W-5 is hard_judgment
```

## Risks

- **Overlaps, all `serialize`.** The runs are dispatched one at a time, in the order W-1 to W-6. The pairs that share a path: W-1, W-2 and W-3 (`standalone.html` and the node tests of the page), W-4 and W-5 (`ci-build.yaml`), every run (`CLAUDE.md`), W-6 and every run (the manual).
- **Edges.** W-2 builds on the scene of W-1; W-5 needs the `--version` and the artifact of W-4; W-6 needs the player, the save and the release job. W-3 and W-4 need no edge.
- **W-1 may find that the editor's drawing is entangled with its state.** The diagram cache, `useDiagramHost` and the scene of the Map are keyed on the editor's state. T4 says what the run does then: it reports and stops, and the author decides. This is the one place where the wave may not reach its end.
- **W-2 is the widest edit.** It removes the reading mode, changes what *Play* does and the bar, and adds a modal and an address. The editing layout must be the one of the tag but for the removed buttons (a test), and the modal must write nothing and call no `modelsChanged()`.
- **W-3 touches the save.** A wrong splice loses the text of a file the author wrote. The generated test is the guard, the run compares every file it saves with the page of the tag line by line, and the block fallback stays wherever the fix is not safe. The generator may find more defects than the two issues: the run lists them, fixes those that share the cause, and files the others.
- **W-5 publishes.** It is `hard_judgment` (live capability, public side effect). GitHub may not let a workflow added on a branch be dispatched before the merge; the run then verifies everything else (syntax, the jobs of the pull request, the smoke test script run by hand on the CI artifact) and names the command the author runs after the merge on a draft. The first real run of the job is the release of 0.19.0: the `workflow_dispatch` with `tag` re-attaches the binaries to an existing release if that run fails, so a failed job never blocks the release.
- **Every tag publishes the website.** No rehearsal with a test tag; rehearse with `workflow_dispatch` and a draft release.
- **Runners.** The Linux arm64 and macOS arm64 runners must be usable by this repository (a public repository, hosted runners); the run confirms the labels and falls back to the targets it can build, saying so.
- **Timing tests.** `performance-budget` and `quiet-references` fail under load when two builds run together; the gate set runs one command at a time.
- **The size.** Six runs, one `hard_judgment`, one at a time.

## Completion Criteria

The three phase gates verified (they were); the verification set passes on the final tree; every shipped story is played in the modal in a test and playing writes nothing and leaves the editor as it was; every shipped example and fixture is loaded by the command line and the editor in a test; #153, #150, #151 and #149 are closed by their commits; #144, #143, #134, #135, #65 and #24 stay open. Named as not verified by the wave, for the author: a real phone (the modal, the picker, a finger on the diagram), the File System Access path (a folder picked in the browser), a screen reader on the announcement of a step, the rehearsal of the release job if GitHub could not run it before the merge, and the Native job of the final CI run.
